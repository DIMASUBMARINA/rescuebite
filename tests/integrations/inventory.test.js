const request = require('supertest');
const { app } = require('../../src/app');
const { prisma } = require('../../src/config/database');

describe('Inventory Integration', () => {
  let token, userId;

  beforeEach(async () => {
    await prisma.order.deleteMany();
    await prisma.inventory.deleteMany();
    await prisma.restaurant.deleteMany();
    await prisma.user.deleteMany();

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'rest@test.com', password: 'password123', role: 'RESTAURANT' });

    token = res.body.data.accessToken;
    userId = res.body.data.user.id;

    await prisma.restaurant.create({
      data: {
        userId,
        businessName: 'Test',
        address: 'Test',
        lat: 43.0,
        lon: 76.0,
        isVerified: true,
      },
    });
  });

  afterEach(async () => {
    await prisma.inventory.deleteMany();
    await prisma.restaurant.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('restaurant can create item', async () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app)
      .post('/api/v1/inventory')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Beshbarmak',
        originalPrice: 4500,
        quantity: 5,
        expiresAt: futureDate,
        ingredients: { meat: 'horse' },
        allergens: ['GLUTEN'],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Beshbarmak');
    expect(res.body.data.state).toBe('FRESH');
  });

  test('rejects item expiring < 2 hours', async () => {
    const nearFuture = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const res = await request(app)
      .post('/api/v1/inventory')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Bad Item',
        originalPrice: 1000,
        quantity: 1,
        expiresAt: nearFuture,
        ingredients: {},
      });

    expect(res.status).toBe(422);
  });

  test('consumer cannot create inventory', async () => {
    const consumer = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'consumer@test.com', password: 'password123', role: 'CONSUMER' });

    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app)
      .post('/api/v1/inventory')
      .set('Authorization', `Bearer ${consumer.body.data.accessToken}`)
      .send({
        name: 'Hack',
        originalPrice: 1000,
        quantity: 1,
        expiresAt: futureDate,
        ingredients: {},
      });

    expect(res.status).toBe(403);
  });

  test('lists inventory with pagination', async () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await request(app)
      .post('/api/v1/inventory')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Item 1',
        originalPrice: 1000,
        quantity: 1,
        expiresAt: futureDate,
        ingredients: {},
      });

    const res = await request(app)
      .get('/api/v1/inventory?page=1&perPage=10')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.meta.total).toBeGreaterThan(0);
  });
});