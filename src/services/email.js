const { AgentMailClient } = require('agentmail');
const { env } = require('../config/env');

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

module.exports = { sendVerificationEmail };
