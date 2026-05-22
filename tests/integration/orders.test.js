const request = require('supertest');
const app = require('../../src/app');

async function createUser(role) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ 
      email: `${role.toLowerCase()}${Date.now()}@test.com`, 
      password: 'pass123', 
      role 
    });
  return res.body;
}

async function createRestaurant() {
  const user = await createUser('RESTAURANT');
  await request(app)
    .post('/api/v1/profile/restaurant')
    .set('Authorization', `Bearer ${user.accessToken}`)
    .send({
      name: 'Test Restaurant',
      address: 'Test St',
      latitude: 43.2380,
      longitude: 76.8829
    });
  return user;
}

async function createInventoryItem(token) {
  const res = await request(app)
    .post('/api/v1/inventory')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Lagman',
      description: 'Noodle soup',
      originalPrice: 1500,
      quantity: 10,
      allergens: ['gluten'],
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
    });
  return res.body;
}

describe('Order Flow', () => {
  test('consumer can place an order', async () => {
    const restaurant = await createRestaurant();
    const item = await createInventoryItem(restaurant.accessToken);
    const consumer = await createUser('CONSUMER');

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${consumer.accessToken}`)
      .send({
        inventoryId: item.id,
        quantity: 2
      });

    expect(res.status).toBe(201);
    expect(res.body.totalPrice).toBe(3000);
    expect(res.body.status).toBe('PENDING');
  });

  test('blocks order with allergy conflict', async () => {
    const restaurant = await createRestaurant();
    const item = await createInventoryItem(restaurant.accessToken);
    const consumer = await createUser('CONSUMER');

    await request(app)
      .patch('/api/v1/users/allergies')
      .set('Authorization', `Bearer ${consumer.accessToken}`)
      .send({ allergens: ['gluten'] });

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${consumer.accessToken}`)
      .send({
        inventoryId: item.id,
        quantity: 1
      });

    expect(res.status).toBe(403);
    expect(res.body.message.toLowerCase()).toContain('allerg');
  });

  test('prevents ordering more than available', async () => {
    const restaurant = await createRestaurant();
    const item = await createInventoryItem(restaurant.accessToken);
    const consumer = await createUser('CONSUMER');

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${consumer.accessToken}`)
      .send({
        inventoryId: item.id,
        quantity: 999
      });

    expect(res.status).toBe(400);
  });
});