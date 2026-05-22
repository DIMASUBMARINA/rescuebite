const request = require('supertest');
const {
  getApp,
  getPrisma,
  cleanDatabase,
  disconnectDatabase,
  createRestaurant,
  createConsumer,
  createInventoryItem,
  createRestaurantProfile,
  uniqueEmail,
} = require('../helpers');

let app;
let restaurantAuth;
let consumerAuth;
let consumer2Auth;

beforeAll(async () => {
  app = getApp();
  await cleanDatabase();

  restaurantAuth = await createRestaurant({ email: uniqueEmail('ord_rest') });
  consumerAuth = await createConsumer({ email: uniqueEmail('ord_consumer') });
  consumer2Auth = await createConsumer({ email: uniqueEmail('ord_consumer2') });

  await createRestaurantProfile(restaurantAuth.accessToken);
});

afterAll(async () => {
  await disconnectDatabase();
});

// ─── POST /orders ────────────────────────────────────────────────────────────────

describe('POST /api/v1/orders', () => {
  it('consumer can create an order for a FRESH item', async () => {
    const item = await createInventoryItem(restaurantAuth.accessToken, { allergens: [] });
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${consumerAuth.accessToken}`)
      .send({ inventoryId: item.id });
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.status).toBe('PENDING');
  });

  it('returns reservationExpires in the response', async () => {
    const item = await createInventoryItem(restaurantAuth.accessToken, { allergens: [] });
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${consumerAuth.accessToken}`)
      .send({ inventoryId: item.id });
    expect(res.status).toBe(201);
    // reservationExpires either on top-level or inside data
    const hasReservation =
      res.body.reservationExpires || res.body.data?.reservedUntil;
    expect(hasReservation).toBeTruthy();
  });

  it('blocks order when item allergens match consumer allergies (allergy safety)', async () => {
    const prisma = getPrisma();

    // Give the consumer a GLUTEN allergy
    await request(app)
      .put('/api/v1/users/me/allergies')
      .set('Authorization', `Bearer ${consumerAuth.accessToken}`)
      .send({ allergens: ['GLUTEN'] });

    // Create item with GLUTEN
    const item = await createInventoryItem(restaurantAuth.accessToken, { allergens: ['GLUTEN'] });

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${consumerAuth.accessToken}`)
      .send({ inventoryId: item.id });

    expect(res.status).toBe(400);

    // Clean up — remove allergy for subsequent tests
    await request(app)
      .put('/api/v1/users/me/allergies')
      .set('Authorization', `Bearer ${consumerAuth.accessToken}`)
      .send({ allergens: [] });
  });

  it('returns 403 for RESTAURANT trying to create an order', async () => {
    const item = await createInventoryItem(restaurantAuth.accessToken, { allergens: [] });
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${restaurantAuth.accessToken}`)
      .send({ inventoryId: item.id });
    expect(res.status).toBe(403);
  });

  it('returns 401 without authentication', async () => {
    const item = await createInventoryItem(restaurantAuth.accessToken, { allergens: [] });
    const res = await request(app)
      .post('/api/v1/orders')
      .send({ inventoryId: item.id });
    expect(res.status).toBe(401);
  });

  it('returns 404 or 400 for nonexistent inventoryId', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000099';
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${consumerAuth.accessToken}`)
      .send({ inventoryId: fakeId });
    expect([400, 404]).toContain(res.status);
  });

  it('returns 422 for missing inventoryId', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${consumerAuth.accessToken}`)
      .send({});
    expect(res.status).toBe(422);
  });
});

// ─── POST /orders/:id/pay ─────────────────────────────────────────────────────────

describe('POST /api/v1/orders/:id/pay', () => {
  it('consumer can pay for a PENDING order', async () => {
    const item = await createInventoryItem(restaurantAuth.accessToken, { allergens: [] });
    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${consumer2Auth.accessToken}`)
      .send({ inventoryId: item.id });

    const orderId = orderRes.body.data.id;
    const payRes = await request(app)
      .post(`/api/v1/orders/${orderId}/pay`)
      .set('Authorization', `Bearer ${consumer2Auth.accessToken}`);
    expect(payRes.status).toBe(200);
  });

  it('returns 403 when another consumer tries to pay for the order', async () => {
    const item = await createInventoryItem(restaurantAuth.accessToken, { allergens: [] });
    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${consumer2Auth.accessToken}`)
      .send({ inventoryId: item.id });

    const orderId = orderRes.body.data.id;
    const payRes = await request(app)
      .post(`/api/v1/orders/${orderId}/pay`)
      .set('Authorization', `Bearer ${consumerAuth.accessToken}`); // different consumer
    expect(payRes.status).toBe(403);
  });
});

// ─── POST /orders/:id/confirm ─────────────────────────────────────────────────────

describe('POST /api/v1/orders/:id/confirm', () => {
  it('restaurant can confirm an order', async () => {
    const item = await createInventoryItem(restaurantAuth.accessToken, { allergens: [] });

    // Consumer places and pays order
    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${consumerAuth.accessToken}`)
      .send({ inventoryId: item.id });
    const orderId = orderRes.body.data.id;

    await request(app)
      .post(`/api/v1/orders/${orderId}/pay`)
      .set('Authorization', `Bearer ${consumerAuth.accessToken}`);

    // Restaurant confirms
    const confirmRes = await request(app)
      .post(`/api/v1/orders/${orderId}/confirm`)
      .set('Authorization', `Bearer ${restaurantAuth.accessToken}`);
    expect(confirmRes.status).toBe(200);
  });

  it('returns 403 when consumer tries to confirm', async () => {
    const item = await createInventoryItem(restaurantAuth.accessToken, { allergens: [] });
    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${consumerAuth.accessToken}`)
      .send({ inventoryId: item.id });
    const orderId = orderRes.body.data.id;

    const confirmRes = await request(app)
      .post(`/api/v1/orders/${orderId}/confirm`)
      .set('Authorization', `Bearer ${consumerAuth.accessToken}`);
    expect(confirmRes.status).toBe(403);
  });
});

// ─── POST /orders/:id/cancel ──────────────────────────────────────────────────────

describe('POST /api/v1/orders/:id/cancel', () => {
  it('consumer can cancel a PENDING order', async () => {
    const item = await createInventoryItem(restaurantAuth.accessToken, { allergens: [] });
    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${consumerAuth.accessToken}`)
      .send({ inventoryId: item.id });
    const orderId = orderRes.body.data.id;

    const cancelRes = await request(app)
      .post(`/api/v1/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${consumerAuth.accessToken}`);
    expect(cancelRes.status).toBe(200);
  });

  it('returns 403 when another consumer tries to cancel', async () => {
    const item = await createInventoryItem(restaurantAuth.accessToken, { allergens: [] });
    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${consumerAuth.accessToken}`)
      .send({ inventoryId: item.id });
    const orderId = orderRes.body.data.id;

    const cancelRes = await request(app)
      .post(`/api/v1/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${consumer2Auth.accessToken}`);
    expect(cancelRes.status).toBe(403);
  });
});

// ─── GET /orders/my-orders ────────────────────────────────────────────────────────

describe('GET /api/v1/orders/my-orders', () => {
  it('consumer can list their own orders', async () => {
    const res = await request(app)
      .get('/api/v1/orders/my-orders')
      .set('Authorization', `Bearer ${consumerAuth.accessToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('returns 403 for restaurant trying to access consumer orders endpoint', async () => {
    const res = await request(app)
      .get('/api/v1/orders/my-orders')
      .set('Authorization', `Bearer ${restaurantAuth.accessToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/v1/orders/my-orders');
    expect(res.status).toBe(401);
  });
});

// ─── GET /orders/my-restaurant-orders ────────────────────────────────────────────

describe('GET /api/v1/orders/my-restaurant-orders', () => {
  it('restaurant can list their orders', async () => {
    const res = await request(app)
      .get('/api/v1/orders/my-restaurant-orders')
      .set('Authorization', `Bearer ${restaurantAuth.accessToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('returns 403 for consumer trying to access restaurant orders endpoint', async () => {
    const res = await request(app)
      .get('/api/v1/orders/my-restaurant-orders')
      .set('Authorization', `Bearer ${consumerAuth.accessToken}`);
    expect(res.status).toBe(403);
  });
});
