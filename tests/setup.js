const path = require('path');

// Force load .env.test BEFORE anything else
require('dotenv').config({ path: path.join(__dirname, '../.env.test') });

const { prisma } = require('../src/config/database');

beforeAll(async () => {
  // Safety check: ensure we're on test DB
  const result = await prisma.$queryRaw`SELECT current_database()`;
  const dbName = result[0].current_database;
  
  if (!dbName.includes('test')) {
    throw new Error(`FATAL: Tests must run on a test database, not "${dbName}". Create .env.test with a test DB.`);
  }
  
  console.log('Test database:', dbName);

  // Clean all tables
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