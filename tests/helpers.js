const request = require('supertest');
const bcrypt = require('bcryptjs');

// Lazy-load to avoid init before env is set
let _app, _prisma;
const getApp = () => {
  if (!_app) _app = require('../src/app');
  return _app;
};
const getPrisma = () => {
  if (!_prisma) _prisma = require('../src/config/database');
  return _prisma.prisma || _prisma;
};

// ─── DB Helpers ────────────────────────────────────────────────────────────────

/**
 * Wipe all tables in the correct FK order.
 * Call in beforeEach or beforeAll of integration tests.
 */
async function cleanDatabase() {
  const prisma = getPrisma();
  await prisma.auditLog.deleteMany();
  await prisma.emailQueue.deleteMany();
  await prisma.pickupTask.deleteMany();
  await prisma.donationClaim.deleteMany();
  await prisma.order.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.driverProfile.deleteMany();
  await prisma.shelterProfile.deleteMany();
  await prisma.restaurantProfile.deleteMany();
  await prisma.consumerProfile.deleteMany();
  await prisma.user.deleteMany();
}

/**
 * Disconnect Prisma after all tests in a suite.
 */
async function disconnectDatabase() {
  const prisma = getPrisma();
  await prisma.$disconnect();
}

// ─── User / Auth Helpers ────────────────────────────────────────────────────────

/**
 * Register a user via HTTP (returns full response body).
 */
async function registerUser({ email, password = 'TestPass123!', role = 'CONSUMER', phone = null }) {
  const app = getApp();
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password, role, ...(phone ? { phone } : {}) });
  return res;
}

/**
 * Register + return { user, accessToken, refreshToken }.
 */
async function createAuthenticatedUser(overrides = {}) {
  const defaults = {
    email: `user_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
    password: 'TestPass123!',
    role: 'CONSUMER',
  };
  const data = { ...defaults, ...overrides };
  const res = await registerUser(data);
  if (res.status !== 201) throw new Error(`Registration failed: ${JSON.stringify(res.body)}`);
  return { ...res.body.data, rawPassword: data.password };
}

/**
 * Create a CONSUMER user and return { user, accessToken, refreshToken }.
 */
async function createConsumer(overrides = {}) {
  return createAuthenticatedUser({ role: 'CONSUMER', ...overrides });
}

/**
 * Create a RESTAURANT user and return auth data.
 */
async function createRestaurant(overrides = {}) {
  return createAuthenticatedUser({ role: 'RESTAURANT', ...overrides });
}

/**
 * Create a SHELTER user and return auth data.
 */
async function createShelter(overrides = {}) {
  return createAuthenticatedUser({ role: 'SHELTER', ...overrides });
}

/**
 * Create a DRIVER user and return auth data.
 */
async function createDriver(overrides = {}) {
  return createAuthenticatedUser({ role: 'DRIVER', ...overrides });
}

/**
 * Create an ADMIN user directly in the DB (admins can't register via HTTP).
 */
async function createAdmin(overrides = {}) {
  const prisma = getPrisma();
  const password = overrides.password || 'AdminPass123!';
  const hashedPassword = await bcrypt.hash(password, 10);
  const email = overrides.email || `admin_${Date.now()}@test.com`;
  const user = await prisma.user.create({
    data: { email, password: hashedPassword, role: 'ADMIN' },
  });
  const app = getApp();
  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password });
  return { ...loginRes.body.data, rawPassword: password };
}

// ─── Inventory Helpers ──────────────────────────────────────────────────────────

/**
 * Create a FRESH inventory item as the given restaurant user.
 * hoursUntilExpiry defaults to 4 (well within FRESH zone).
 */
async function createInventoryItem(accessToken, overrides = {}) {
  const app = getApp();
  const hoursUntilExpiry = overrides.hoursUntilExpiry || 4;
  delete overrides.hoursUntilExpiry;

  const expiresAt = new Date(Date.now() + hoursUntilExpiry * 60 * 60 * 1000).toISOString();
  const defaults = {
    name: 'Test Beshbarmak',
    originalPrice: 2000,
    quantity: 10,
    expiresAt,
    ingredients: { meat: 'lamb', noodles: 'wheat' },
    allergens: ['GLUTEN'],
  };
  const res = await request(app)
    .post('/api/v1/inventory')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ ...defaults, ...overrides });
  if (res.status !== 201) throw new Error(`Inventory creation failed: ${JSON.stringify(res.body)}`);
  return res.body.data;
}

/**
 * Directly insert an inventory item via Prisma (bypasses HTTP validation).
 * Useful for creating items in specific states (FREE, EXPIRED) for testing.
 */
async function createInventoryDirect(restaurantUserId, overrides = {}) {
  const prisma = getPrisma();
  const restaurant = await prisma.restaurantProfile.findUnique({
    where: { userId: restaurantUserId },
  });
  if (!restaurant) throw new Error('Restaurant profile not found — create profile first');

  const hoursUntilExpiry = overrides.hoursUntilExpiry || 4;
  delete overrides.hoursUntilExpiry;

  const expiresAt = new Date(Date.now() + hoursUntilExpiry * 60 * 60 * 1000);
  return prisma.inventory.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Direct Test Item',
      originalPrice: 2000,
      currentPrice: 2000,
      quantity: 10,
      reservedQty: 0,
      expiresAt,
      state: 'FRESH',
      ingredients: { meat: 'lamb' },
      allergens: [],
      ...overrides,
    },
  });
}

// ─── Restaurant Profile Helper ──────────────────────────────────────────────────

/**
 * Create a restaurant profile for a restaurant user.
 * Many inventory endpoints require a restaurant profile to exist.
 */
async function createRestaurantProfile(accessToken, overrides = {}) {
  const app = getApp();
  const res = await request(app)
    .post('/api/v1/profile/restaurant')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      businessName: 'Test Beshbarmak Restaurant',
      address: 'ul. Abay 10, Almaty',
      lat: 43.238,
      lon: 76.9286,
      phone: '+77071234567',
      ...overrides,
    });
  return res;
}

/**
 * Create a shelter profile for a shelter user.
 */
async function createShelterProfile(accessToken, overrides = {}) {
  const app = getApp();
  const res = await request(app)
    .post('/api/v1/profile/shelter')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      shelterName: 'Test Shelter Almaty',
      address: 'ul. Seifullin 5, Almaty',
      lat: 43.240,
      lon: 76.930,
      contactPerson: 'Test Contact',
      phone: '+77071234568',
      ...overrides,
    });
  return res;
}

/**
 * Create a driver profile for a driver user.
 */
async function createDriverProfile(accessToken, overrides = {}) {
  const app = getApp();
  const res = await request(app)
    .post('/api/v1/profile/driver')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      vehicleType: 'CAR',
      vehicleNumber: 'AAA001',
      phone: '+77071234569',
      ...overrides,
    });
  return res;
}

/**
 * Short unique email generator.
 */
function uniqueEmail(prefix = 'user') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@test.com`;
}

module.exports = {
  getApp,
  getPrisma,
  cleanDatabase,
  disconnectDatabase,
  registerUser,
  createAuthenticatedUser,
  createConsumer,
  createRestaurant,
  createShelter,
  createDriver,
  createAdmin,
  createInventoryItem,
  createInventoryDirect,
  createRestaurantProfile,
  createShelterProfile,
  createDriverProfile,
  uniqueEmail,
};
