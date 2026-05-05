const { prisma } = require('../src/config/database');

beforeAll(async () => {
  // Complete wipe before any tests run
  await prisma.$executeRaw`TRUNCATE TABLE 
    "orders", 
    "inventory", 
    "claims", 
    "pickups", 
    "waste_logs", 
    "audit_logs", 
    "user_allergies", 
    "refresh_tokens", 
    "drivers", 
    "shelters", 
    "restaurants", 
    "users" 
    CASCADE`;
});

afterAll(async () => {
  await prisma.$disconnect();
});