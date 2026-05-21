const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { prisma } = require('../config/database');
const { env } = require('../config/env');
const { sendVerificationEmail } = require('./email');

const SALT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;

function generateAccessToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.role },
    env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

async function createRefreshToken(userId) {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await prisma.refreshToken.create({
    data: { token, userId, expiresAt },
  });

  return token;
}

async function createVerificationToken(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + VERIFICATION_TOKEN_EXPIRY_HOURS);

  await prisma.emailVerificationToken.create({
    data: { token, userId, expiresAt },
  });

  return token;
}

async function register(email, password, role, phone) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('Email already exists');

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { email, passwordHash, role, phone },
  });

  const verificationToken = await createVerificationToken(user.id);
  sendVerificationEmail(email, verificationToken).catch((err) => {
    console.error('Failed to send verification email:', err);
  });

  const accessToken = generateAccessToken(user);
  const refreshToken = await createRefreshToken(user.id);

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
    message: 'Registration successful. Please check your email to verify your account.',
  };
}

async function verifyEmail(token) {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!record) throw new Error('Invalid verification token');
  if (record.usedAt) throw new Error('Verification token has already been used');
  if (record.expiresAt < new Date()) throw new Error('Verification token has expired');

  const [, user] = await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: { isVerified: true },
    }),
  ]);

  return { user: sanitizeUser(user) };
}

async function resendVerificationEmail(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');
  if (user.isVerified) throw new Error('Email is already verified');

  await prisma.emailVerificationToken.updateMany({
    where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });

  const token = await createVerificationToken(userId);
  await sendVerificationEmail(user.email, token);

  return { message: 'Verification email sent. Please check your inbox.' };
}

async function login(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('Invalid credentials');

  if (user.isSuspended) {
    throw new Error('Your account has been suspended. Contact admin.');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error('Invalid credentials');

  const accessToken = generateAccessToken(user);
  const refreshToken = await createRefreshToken(user.id);

  const result = { user: sanitizeUser(user), accessToken, refreshToken };

  if (!user.isVerified) {
    result.warning = 'Email not verified. Some features may be restricted.';
  }

  return result;
}

async function logout(refreshToken) {
  await prisma.refreshToken.updateMany({
    where: { token: refreshToken },
    data: { revokedAt: new Date() },
  });
}

async function refreshAccessToken(refreshToken) {
  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });

  if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt < new Date()) {
    throw new Error('Invalid or expired refresh token');
  }

  const accessToken = generateAccessToken(tokenRecord.user);
  return { accessToken };
}

function sanitizeUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

module.exports = { register, login, logout, refreshAccessToken, verifyEmail, resendVerificationEmail };
