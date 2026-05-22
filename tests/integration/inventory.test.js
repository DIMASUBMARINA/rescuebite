const request = require('supertest');
const app = require('../../src/app');
const { prisma } = require('../setup');

async function createUser(role) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email: `${role.toLowerCase()}${Date.now()}@test.com`, password: 'pass123', role });
  return res.body;
}

describe('Inventory CRUD', () => {
  let restaurant, token;

  beforeEach(async () => {
    const user = await createUser('RESTAURANT');
    restaurant = user.user;
    token = user.accessToken;
    
    await request(app)
      .post('/api/v1/profile/restaurant')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Restaurant',
        address: 'Test St 1',
        latitude: 43.2380,
        longitude: 76.8829
      });
  });

  test('creates inventory item', async () => {
    const res = await request(app)
      .post('/api/v1/inventory')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Beshbarmak',
        description: 'Traditional Kazakh dish',
        originalPrice: 2500,
        quantity: 5,
        allergens: [],
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Beshbarmak');
    expect(res.body.currentPrice).toBe(2500); 
  });

  test('lists inventory items', async () => {
    await request(app)
      .post('/api/v1/inventory')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Item 1',
        originalPrice: 1000,
        quantity: 1,
        allergens: [],
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
      });

    const res = await request(app)
      .get('/api/v1/inventory')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
  });

  test('blocks non-restaurant from creating', async () => {
    const consumer = await createUser('CONSUMER');
    
    const res = await request(app)
      .post('/api/v1/inventory')
      .set('Authorization', `Bearer ${consumer.accessToken}`)
      .send({
        name: 'Hacked Item',
        originalPrice: 1,
        quantity: 1,
        allergens: [],
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
      });

    expect(res.status).toBe(403);
  });
});