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
let restaurantAuth;   // { user, accessToken, refreshToken }
let restaurant2Auth;
let consumerAuth;

beforeAll(async () => {
  app = getApp();
  await cleanDatabase();

  // Create users
  restaurantAuth = await createRestaurant({ email: uniqueEmail('inv_rest') });
  restaurant2Auth = await createRestaurant({ email: uniqueEmail('inv_rest2') });
  consumerAuth = await createConsumer({ email: uniqueEmail('inv_consumer') });

  // Create restaurant profiles (required to create inventory)
  await createRestaurantProfile(restaurantAuth.accessToken);
  await createRestaurantProfile(restaurant2Auth.accessToken);
});

afterAll(async () => {
  await disconnectDatabase();
});

// ─── GET /inventory ─────────────────────────────────────────────────────────────

describe('GET /api/v1/inventory', () => {
  beforeAll(async () => {
    // Seed a few items
    await createInventoryItem(restaurantAuth.accessToken, { name: 'Beshbarmak', allergens: ['GLUTEN'] });
    await createInventoryItem(restaurantAuth.accessToken, { name: 'Lagman', allergens: ['GLUTEN', 'EGGS'] });
  });

  it('returns paginated inventory list', async () => {
    const res = await request(app)
      .get('/api/v1/inventory')
      .set('Authorization', `Bearer ${consumerAuth.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toHaveProperty('total');
    expect(res.body.meta).toHaveProperty('page');
    expect(res.body.meta).toHaveProperty('perPage');
  });

  it('returns 401 without authentication', async () => {
    const res = await request(app).get('/api/v1/inventory');
    expect(res.status).toBe(401);
  });

  it('supports pagination via page and perPage query params', async () => {
    const res = await request(app)
      .get('/api/v1/inventory?page=1&perPage=1')
      .set('Authorization', `Bearer ${consumerAuth.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(1);
    expect(res.body.meta.perPage).toBe(1);
  });

  it('filters by state query param', async () => {
    const res = await request(app)
      .get('/api/v1/inventory?state=FRESH')
      .set('Authorization', `Bearer ${consumerAuth.accessToken}`);
    expect(res.status).toBe(200);
    for (const item of res.body.data) {
      expect(item.state).toBe('FRESH');
    }
  });

  it('returns empty array for a state with no items', async () => {
    const res = await request(app)
      .get('/api/v1/inventory?state=EXPIRED')
      .set('Authorization', `Bearer ${consumerAuth.accessToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ─── POST /inventory ─────────────────────────────────────────────────────────────

describe('POST /api/v1/inventory', () => {
  const validPayload = () => ({
    name: 'Samsa Fresh',
    originalPrice: 800,
    quantity: 20,
    expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    ingredients: { dough: 'wheat', filling: 'lamb' },
    allergens: ['GLUTEN'],
  });

  it('creates an inventory item as RESTAURANT user', async () => {
    const res = await request(app)
      .post('/api/v1/inventory')
      .set('Authorization', `Bearer ${restaurantAuth.accessToken}`)
      .send(validPayload());
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.name).toBe('Samsa Fresh');
    expect(res.body.data.state).toBe('FRESH');
  });

  it('returns 403 for CONSUMER trying to create inventory', async () => {
    const res = await request(app)
      .post('/api/v1/inventory')
      .set('Authorization', `Bearer ${consumerAuth.accessToken}`)
      .send(validPayload());
    expect(res.status).toBe(403);
  });

  it('returns 401 without authentication', async () => {
    const res = await request(app)
      .post('/api/v1/inventory')
      .send(validPayload());
    expect(res.status).toBe(401);
  });

  it('rejects expiresAt less than 2 hours from now with 422', async () => {
    const res = await request(app)
      .post('/api/v1/inventory')
      .set('Authorization', `Bearer ${restaurantAuth.accessToken}`)
      .send({
        ...validPayload(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min = too soon
      });
    expect(res.status).toBe(422);
  });

  it('rejects missing required field "name" with 422', async () => {
    const payload = validPayload();
    delete payload.name;
    const res = await request(app)
      .post('/api/v1/inventory')
      .set('Authorization', `Bearer ${restaurantAuth.accessToken}`)
      .send(payload);
    expect(res.status).toBe(422);
  });

  it('rejects negative originalPrice with 422', async () => {
    const res = await request(app)
      .post('/api/v1/inventory')
      .set('Authorization', `Bearer ${restaurantAuth.accessToken}`)
      .send({ ...validPayload(), originalPrice: -100 });
    expect(res.status).toBe(422);
  });

  it('rejects quantity of 0 or less with 422', async () => {
    const res = await request(app)
      .post('/api/v1/inventory')
      .set('Authorization', `Bearer ${restaurantAuth.accessToken}`)
      .send({ ...validPayload(), quantity: 0 });
    expect(res.status).toBe(422);
  });

  it('accepts items with no allergens', async () => {
    const res = await request(app)
      .post('/api/v1/inventory')
      .set('Authorization', `Bearer ${restaurantAuth.accessToken}`)
      .send({ ...validPayload(), allergens: [] });
    expect(res.status).toBe(201);
  });
});

// ─── PATCH /inventory/:id ─────────────────────────────────────────────────────────

describe('PATCH /api/v1/inventory/:id', () => {
  let itemId;

  beforeEach(async () => {
    const item = await createInventoryItem(restaurantAuth.accessToken, { name: 'Patchable Item' });
    itemId = item.id;
  });

  it('updates the item as the owner restaurant', async () => {
    const res = await request(app)
      .patch(`/api/v1/inventory/${itemId}`)
      .set('Authorization', `Bearer ${restaurantAuth.accessToken}`)
      .send({ name: 'Updated Item Name', quantity: 5 });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated Item Name');
    expect(res.body.data.quantity).toBe(5);
  });

  it('returns 403 when another restaurant tries to edit the item', async () => {
    const res = await request(app)
      .patch(`/api/v1/inventory/${itemId}`)
      .set('Authorization', `Bearer ${restaurant2Auth.accessToken}`)
      .send({ name: 'Stolen Edit' });
    expect(res.status).toBe(403);
  });

  it('returns 403 when consumer tries to edit inventory', async () => {
    const res = await request(app)
      .patch(`/api/v1/inventory/${itemId}`)
      .set('Authorization', `Bearer ${consumerAuth.accessToken}`)
      .send({ name: 'Consumer Edit' });
    expect(res.status).toBe(403);
  });

  it('returns 404 for nonexistent item', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000001';
    const res = await request(app)
      .patch(`/api/v1/inventory/${fakeId}`)
      .set('Authorization', `Bearer ${restaurantAuth.accessToken}`)
      .send({ name: 'Ghost Item' });
    expect(res.status).toBe(404);
  });

  it('returns 401 without authentication', async () => {
    const res = await request(app)
      .patch(`/api/v1/inventory/${itemId}`)
      .send({ name: 'Unauthorized Edit' });
    expect(res.status).toBe(401);
  });
});

// ─── DELETE /inventory/:id ────────────────────────────────────────────────────────

describe('DELETE /api/v1/inventory/:id', () => {
  it('deletes a FRESH item with no active orders', async () => {
    const item = await createInventoryItem(restaurantAuth.accessToken, { name: 'Delete Me' });
    const res = await request(app)
      .delete(`/api/v1/inventory/${item.id}`)
      .set('Authorization', `Bearer ${restaurantAuth.accessToken}`);
    expect(res.status).toBe(204);
  });

  it('returns 403 when another restaurant tries to delete the item', async () => {
    const item = await createInventoryItem(restaurantAuth.accessToken, { name: 'Protected Item' });
    const res = await request(app)
      .delete(`/api/v1/inventory/${item.id}`)
      .set('Authorization', `Bearer ${restaurant2Auth.accessToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 404 for nonexistent item', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000002';
    const res = await request(app)
      .delete(`/api/v1/inventory/${fakeId}`)
      .set('Authorization', `Bearer ${restaurantAuth.accessToken}`);
    expect(res.status).toBe(404);
  });

  it('returns 401 without authentication', async () => {
    const item = await createInventoryItem(restaurantAuth.accessToken, { name: 'Auth Delete' });
    const res = await request(app).delete(`/api/v1/inventory/${item.id}`);
    expect(res.status).toBe(401);
  });
});
