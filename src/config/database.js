const { PrismaClient } = require('@prisma/client');
const { env } = require('./env');

const prisma = new PrismaClient();

module.exports = { prisma };