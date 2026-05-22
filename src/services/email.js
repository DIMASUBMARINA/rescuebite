const { AgentMailClient } = require('agentmail');
const { env } = require('../config/env');
const { prisma } = require('../config/database');
const axios = require('axios');
const AGENTMAIL_BASE_URL = 'https://api.agentmail.to/v0';
const AGENTMAIL_API_KEY = process.env.AGENTMAIL_API_KEY;
const AGENTMAIL_INBOX_ID = process.env.AGENTMAIL_INBOX_ID;

let client;
let inboxId;

function getClient() {
  if (!client) {
    client = new AgentMailClient({ apiKey: env.AGENTMAIL_API_KEY });
  }
  return client;
}

async function getInboxId() {
  if (inboxId) return inboxId;

  if (env.AGENTMAIL_INBOX_ID) {
    inboxId = env.AGENTMAIL_INBOX_ID;
    return inboxId;
  }

  const agentmail = getClient();
  const inbox = await agentmail.inboxes.create({ username: 'rescuebite-noreply' });
  inboxId = inbox.inboxId;
  console.log(`Created AgentMail inbox: ${inboxId} — add AGENTMAIL_INBOX_ID=${inboxId} to .env`);
  return inboxId;
}

async function sendVerificationEmail(toEmail, token) {
  const agentmail = getClient();
  const from = await getInboxId();
  const verifyUrl = `${env.APP_BASE_URL}/api/v1/auth/verify-email?token=${token}`;

  await agentmail.inboxes.messages.send(from, {
    to: toEmail,
    subject: 'Verify your RescueBite email address',
    text: [
      'Welcome to RescueBite!',
      '',
      'Please verify your email address by clicking the link below:',
      verifyUrl,
      '',
      'This link expires in 24 hours.',
      '',
      'If you did not create an account, you can safely ignore this email.',
    ].join('\n'),
    html: `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #2d7a2d;">Welcome to RescueBite!</h2>
  <p>Please verify your email address to activate your account.</p>
  <a href="${verifyUrl}"
     style="display:inline-block; padding:12px 24px; background:#2d7a2d; color:#fff;
            text-decoration:none; border-radius:4px; font-weight:bold; margin:16px 0;">
    Verify Email Address
  </a>
  <p style="color:#666; font-size:13px;">This link expires in 24 hours.</p>
  <p style="color:#666; font-size:13px;">
    Or copy and paste this URL into your browser:<br>
    <a href="${verifyUrl}" style="color:#2d7a2d;">${verifyUrl}</a>
  </p>
  <hr style="border:none; border-top:1px solid #eee; margin:24px 0;">
  <p style="color:#999; font-size:12px;">
    If you did not create a RescueBite account, you can safely ignore this email.
  </p>
</body>
</html>`,
  });
}

async function sendEmail(to, subject, html) {
  try {
    const response = await axios.post(
      `${AGENTMAIL_BASE_URL}/inboxes/${encodeURIComponent(AGENTMAIL_INBOX_ID)}/messages/send`,
      {
        to: [to],
        subject,
        html,
        text: 'Plain text fallback',
      },
      {
        headers: {
          'Authorization': `Bearer ${AGENTMAIL_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`[EMAIL SENT] To: ${to} | MessageId: ${response.data.message_id || response.data.id}`);
    return { messageId: response.data.message_id || response.data.id };
    
  } catch (err) {
    console.error(`[EMAIL FAILED] To: ${to} | Status: ${err.response?.status} | Error:`, err.response?.data || err.message);
    throw new Error(err.response?.data?.message || err.response?.data?.error || 'Failed to send email');
  }
}

async function queueEmail({ to, template, subject, data }) {
  return prisma.emailQueue.create({
    data: {
      to,
      template,
      subject,
      data: JSON.stringify(data),
      status: 'QUEUED',
    },
  });
}

async function processQueue(batchSize = 10) {
  const jobs = await prisma.emailQueue.findMany({
    where: {
      status: { in: ['QUEUED', 'RETRY'] },
      retryCount: { lt: 3 },
    },
    orderBy: { createdAt: 'asc' },
    take: batchSize,
  });

  for (const job of jobs) {
    try {
      const data = JSON.parse(job.data);
      let html = '';

      switch (job.template) {
        case 'ORDER_READY':
          html = buildOrderReadyEmail(data);
          break;
        case 'DONATION_ALERT':
          html = buildDonationAlertEmail(data);
          break;
        case 'ORDER_CANCELLED':
          html = buildOrderCancelledEmail(data);
          break;
        default:
          throw new Error(`Unknown template: ${job.template}`);
      }

      await sendEmail(job.to, job.subject, html);

      await prisma.$transaction([
        prisma.emailQueue.update({
          where: { id: job.id },
          data: { status: 'SENT', sentAt: new Date() },
        }),
        prisma.emailLog.create({
          data: {
            to: job.to,
            template: job.template,
            subject: job.subject,
            data: job.data,
            status: 'SENT',
            sentAt: new Date(),
          },
        }),
      ]);

    } catch (err) {
      console.error(`[EMAIL WORKER] Failed to send email ${job.id}:`, err.message);
      
      await prisma.emailQueue.update({
        where: { id: job.id },
        data: {
          status: 'RETRY',
          retryCount: { increment: 1 },
          error: err.message,
        },
      });
    }
  }

  return jobs.length;
}

function buildOrderReadyEmail({ orderId, itemName, quantity, totalPrice, restaurantName, restaurantAddress, isDelivery, driverName, driverPhone }) {
  const pickupSection = isDelivery
    ? `<p>🚚 <strong>Driver ${driverName}</strong> is on the way!</p>
       <p>Driver contact: ${driverPhone}</p>`
    : `<p>📍 <strong>Pickup at:</strong><br/>${restaurantName}<br/>${restaurantAddress}</p>
       <p>Show this order ID when collecting: <strong>#${orderId.slice(-8).toUpperCase()}</strong></p>`;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #28a745;">Your order is ready!</h2>
      <p>Hi there,</p>
      <p>Great news! Your RescueBite order has been confirmed and is ready.</p>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Order #${orderId.slice(-8).toUpperCase()}</h3>
        <p><strong>${quantity}x</strong> ${itemName}</p>
        <p><strong>Total:</strong> ${totalPrice} KZT</p>
      </div>
      
      ${pickupSection}
      
      <p style="margin-top: 30px;">Thank you for fighting food waste with RescueBite! 🌍</p>
    </div>
  `;
}

function buildDonationAlertEmail({ items, shelterName, claimDeadline }) {
  const itemsList = items.map(item => 
    `<li><strong>${item.quantity}x</strong> ${item.name} at ${item.restaurantName} (${item.distance}km away)</li>`
  ).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc3545;">🍽️ Free food available now!</h2>
      <p>Hi ${shelterName},</p>
      <p>Food items near you are about to expire and are now available for FREE pickup. Claim within 30 minutes!</p>
      
      <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
        <h3>Available Items</h3>
        <ul>${itemsList}</ul>
        <p><strong>⏰ Claim before:</strong> ${new Date(claimDeadline).toLocaleString()}</p>
      </div>
      
      <a href="#" style="display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">
        Claim Food Now
      </a>
      
      <p style="margin-top: 30px; color: #666; font-size: 12px;">
        Don't let good food go to waste. These items will be discarded if not claimed.
      </p>
    </div>
  `;
}

function buildOrderCancelledEmail({ orderId, itemName, quantity, reason, totalPrice }) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc3545;">Order Cancelled</h2>
      <p>Hi there,</p>
      <p>Your RescueBite order has been cancelled.</p>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Order #${orderId.slice(-8).toUpperCase()}</h3>
        <p><strong>${quantity}x</strong> ${itemName}</p>
        <p><strong>Total:</strong> ${totalPrice} KZT</p>
        <p><strong>Reason:</strong> ${reason}</p>
      </div>
      
      <p>The reserved items have been returned to inventory.</p>
      <p><a href="#" style="color: #007bff;">Browse available items →</a></p>
    </div>
  `;
}


module.exports = { sendVerificationEmail, queueEmail, processQueue };
