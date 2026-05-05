const request = require('supertest');
const { app } = require('../../src/app');
const { prisma } = require('../../src/config/database');

describe('Orders Integration', () => {
  let restaurantToken, consumerToken, inventoryId;

  beforeEach(async () => {
    await prisma.order.deleteMany();
    await prisma.inventory.deleteMany();
    await prisma.claim.deleteMany();
    await prisma.pickup.deleteMany();
    await prisma.restaurant.deleteMany();
    await prisma.userAllergy.deleteMany();
    await prisma.user.deleteMany();

    const restaurantReg = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'rest@test.com', password: 'password123', role: 'RESTAURANT' });

    restaurantToken = restaurantReg.body.data.accessToken;

    const restaurantUser = await prisma.user.findUnique({ where: { email: 'rest@test.com' } });
    await prisma.restaurant.create({
      data: {
        userId: restaurantUser.id,
        businessName: 'Test Restaurant',
        address: 'Test St',
        lat: 43.0,
        lon: 76.0,
        isVerified: true,
      },
    });

    const consumerReg = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'consumer@test.com', password: 'password123', role: 'CONSUMER' });

    consumerToken = consumerReg.body.data.accessToken;

    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const item = await request(app)
      .post('/api/v1/inventory')
      .set('Authorization', `Bearer ${restaurantToken}`)
      .send({
        name: 'Test Item',
        originalPrice: 5000,
        quantity: 2,
        expiresAt: futureDate,
        ingredients: { flour: 'wheat' },
        allergens: ['GLUTEN'],
      });

    inventoryId = item.body.data.id;

    await prisma.inventory.update({
      where: { id: inventoryId },
      data: { state: 'DISCOUNTED' },
    });
  });

  afterEach(async () => {
    await prisma.order.deleteMany();
    await prisma.inventory.deleteMany();
    await prisma.restaurant.deleteMany();
    await prisma.userAllergy.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('consumer can purchase discounted item', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${consumerToken}`)
      .send({ inventoryId });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.reservationExpires).toBeDefined();
  });

  test('allergy block prevents unsafe purchase', async () => {
    await request(app)
      .put('/api/v1/users/me/allergies')
      .set('Authorization', `Bearer ${consumerToken}`)
      .send({ allergens: ['GLUTEN'] });

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${consumerToken}`)
      .send({ inventoryId });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('ALLERGY_SAFETY_BLOCK');
  });

  test('confirm order finalizes purchase', async () => {
    const order = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${consumerToken}`)
      .send({ inventoryId });

    const res = await request(app)
      .post(`/api/v1/orders/${order.body.data.id}/confirm`)
      .set('Authorization', `Bearer ${consumerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CONFIRMED');
  });

    test('overselling is impossible', async () => {
    // Set quantity to exactly 1 to force conflict
    await prisma.inventory.update({
      where: { id: inventoryId },
      data: { quantity: 1, reservedQty: 0 },
    });

    // Create second consumer
    const consumer2Reg = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'consumer2@test.com', password: 'password123', role: 'CONSUMER' });

    // Try both simultaneously
    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${consumerToken}`)
        .send({ inventoryId }),
      request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${consumer2Reg.body.data.accessToken}`)
        .send({ inventoryId }),
    ]);

    const statuses = [res1.status, res2.status];
    const successCount = statuses.filter(s => s === 201).length;
    
    // With quantity=1, only one should succeed
    expect(successCount).toBe(1);
  });
});