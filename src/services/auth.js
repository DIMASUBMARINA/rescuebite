const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const { env } = require('../config/env');

const SALT_ROUNDS = 10;

async function register(email, password, role, phone) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error('Email already exists');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role,
      phone,
    },
  });

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  return { user, token };
}

async function login(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new Error('Invalid credentials');
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  return { user, token };
}

module.exports = { register, login };