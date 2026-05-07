const request = require('supertest');
const { app } = require('../../src/app');
const { prisma } = require('../../src/config/database');

function uniqueEmail(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}@test.com`;
}

describe('Orders Integration', () => {
  let restaurantToken, consumerToken, inventoryId;

  beforeEach(async () => {
    const restEmail = uniqueEmail('rest');
    const restaurantReg = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: restEmail, password: 'password123', role: 'RESTAURANT' });

    restaurantToken = restaurantReg.body.data.accessToken;

    const restaurantUser = await prisma.user.findUnique({ where: { email: restEmail } });
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

    const consumerEmail = uniqueEmail('consumer');
    const consumerReg = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: consumerEmail, password: 'password123', role: 'CONSUMER' });

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
    await prisma.inventory.update({
      where: { id: inventoryId },
      data: { quantity: 1, reservedQty: 0 },
    });

    const consumer2Email = uniqueEmail('consumer2');
    const consumer2Reg = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: consumer2Email, password: 'password123', role: 'CONSUMER' });

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

    const successCount = [res1.status, res2.status].filter(s => s === 201).length;
    expect(successCount).toBe(1);
  });
});