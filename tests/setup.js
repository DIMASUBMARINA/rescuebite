const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env.test') });

const { prisma } = require('../src/config/database');

beforeAll(async () => {
  const result = await prisma.$queryRaw`SELECT current_database()`;
  const dbName = result[0].current_database;
  
  if (!dbName.includes('test')) {
    throw new Error(`FATAL: Tests must run on a test database, not "${dbName}". Create .env.test with a test DB.`);
  }
  
  console.log('Test database:', dbName);

  await prisma.$executeRaw`TRUNCATE TABLE 
    "orders", 
    "inventory", 
    "claims", 
    "pickups", 
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