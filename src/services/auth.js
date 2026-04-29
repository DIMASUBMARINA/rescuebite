const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { prisma } = require('../config/database');
const { env } = require('../config/env');

const SALT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

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

async function register(email, password, role, phone) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('Email already exists');

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  
  const user = await prisma.user.create({
    data: { email, passwordHash, role, phone },
  });

  const accessToken = generateAccessToken(user);
  const refreshToken = await createRefreshToken(user.id);

  return { user: sanitizeUser(user), accessToken, refreshToken };
}

async function login(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('Invalid credentials');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error('Invalid credentials');

  const accessToken = generateAccessToken(user);
  const refreshToken = await createRefreshToken(user.id);

  return { user: sanitizeUser(user), accessToken, refreshToken };
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

module.exports = { register, login, logout, refreshAccessToken };