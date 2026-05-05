const { prisma } = require('../src/config/database');

afterAll(async () => {
  await prisma.$disconnect();
});