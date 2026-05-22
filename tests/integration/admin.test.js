const request = require('supertest');
const {
  getApp,
  getPrisma,
  cleanDatabase,
  disconnectDatabase,
  createAdmin,
  createConsumer,
  createRestaurant,
  createRestaurantProfile,
  createInventoryItem,
  uniqueEmail,
} = require('../helpers');

let app;
let adminAuth;
let consumerAuth;
let restaurantAuth;

beforeAll(async () => {
  app = getApp();
  await cleanDatabase();

  adminAuth = await createAdmin({ email: uniqueEmail('adm_admin') });
  consumerAuth = await createConsumer({ email: uniqueEmail('adm_consumer') });
  restaurantAuth = await createRestaurant({ email: uniqueEmail('adm_rest') });

  await createRestaurantProfile(restaurantAuth.accessToken);
});

afterAll(async () => {
  await disconnectDatabase();
});

// ─── GET /admin/users ────────────────────────────────────────────────────────────

describe('GET /api/v1/admin/users', () => {
  it('admin can list all users', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminAuth.accessToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    // Should have at least the users we created
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
  });

  it('returns 403 for consumer trying to list users', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${consumerAuth.accessToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 403 for restaurant trying to list users', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${restaurantAuth.accessToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/v1/admin/users');
    expect(res.status).toBe(401);
  });
});

// ─── POST /admin/users/:id/suspend ───────────────────────────────────────────────

describe('POST /api/v1/admin/users/:id/suspend', () => {
  it('admin can suspend a user', async () => {
    // Create a fresh user to suspend
    const target = await createConsumer({ email: uniqueEmail('suspend_target') });
    const targetId = target.user.id;

    const res = await request(app)
      .post(`/api/v1/admin/users/${targetId}/suspend`)
      .set('Authorization', `Bearer ${adminAuth.accessToken}`);
    expect(res.status).toBe(200);

    // Verify the user is actually suspended in DB
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { id: targetId } });
    expect(user.isSuspended).toBe(true);
  });

  it('suspended user cannot log in', async () => {
    const email = uniqueEmail('suspended_login');
    const password = 'TestPass123!';
    const target = await createConsumer({ email, password });
    const targetId = target.user.id;

    // Admin suspends
    await request(app)
      .post(`/api/v1/admin/users/${targetId}/suspend`)
      .set('Authorization', `Bearer ${adminAuth.accessToken}`);

    // Try to login
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password });
    expect(loginRes.status).toBe(403);
  });

  it('returns 403 for non-admin trying to suspend', async () => {
    const target = await createConsumer({ email: uniqueEmail('protect_me') });
    const res = await request(app)
      .post(`/api/v1/admin/users/${target.user.id}/suspend`)
      .set('Authorization', `Bearer ${consumerAuth.accessToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 404 for nonexistent user', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000077';
    const res = await request(app)
      .post(`/api/v1/admin/users/${fakeId}/suspend`)
      .set('Authorization', `Bearer ${adminAuth.accessToken}`);
    expect(res.status).toBe(404);
  });
});

// ─── POST /admin/users/:id/unsuspend ─────────────────────────────────────────────

describe('POST /api/v1/admin/users/:id/unsuspend', () => {
  it('admin can unsuspend a previously suspended user', async () => {
    const target = await createConsumer({ email: uniqueEmail('unsuspend_me') });
    const targetId = target.user.id;

    // Suspend first
    await request(app)
      .post(`/api/v1/admin/users/${targetId}/suspend`)
      .set('Authorization', `Bearer ${adminAuth.accessToken}`);

    // Then unsuspend
    const res = await request(app)
      .post(`/api/v1/admin/users/${targetId}/unsuspend`)
      .set('Authorization', `Bearer ${adminAuth.accessToken}`);
    expect(res.status).toBe(200);

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { id: targetId } });
    expect(user.isSuspended).toBe(false);
  });
});

// ─── POST /admin/inventory/:id/override-state ────────────────────────────────────

describe('POST /api/v1/admin/inventory/:id/override-state', () => {
  let itemId;

  beforeAll(async () => {
    const item = await createInventoryItem(restaurantAuth.accessToken, {
      name: 'Admin Override Item',
      allergens: [],
    });
    itemId = item.id;
  });

  it('admin can override inventory state to DISCOUNTED', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/inventory/${itemId}/override-state`)
      .set('Authorization', `Bearer ${adminAuth.accessToken}`)
      .send({ state: 'DISCOUNTED' });
    expect(res.status).toBe(200);
    expect(res.body.data.state).toBe('DISCOUNTED');
  });

  it('admin can override inventory state to FREE', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/inventory/${itemId}/override-state`)
      .set('Authorization', `Bearer ${adminAuth.accessToken}`)
      .send({ state: 'FREE' });
    expect(res.status).toBe(200);
    expect(res.body.data.state).toBe('FREE');
  });

  it('returns 400 or 422 for invalid state value', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/inventory/${itemId}/override-state`)
      .set('Authorization', `Bearer ${adminAuth.accessToken}`)
      .send({ state: 'MAGICAL' });
    expect([400, 422]).toContain(res.status);
  });

  it('returns 403 for non-admin', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/inventory/${itemId}/override-state`)
      .set('Authorization', `Bearer ${consumerAuth.accessToken}`)
      .send({ state: 'FREE' });
    expect(res.status).toBe(403);
  });

  it('returns 404 for nonexistent inventory item', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000066';
    const res = await request(app)
      .post(`/api/v1/admin/inventory/${fakeId}/override-state`)
      .set('Authorization', `Bearer ${adminAuth.accessToken}`)
      .send({ state: 'FREE' });
    expect(res.status).toBe(404);
  });
});

// ─── POST /admin/process-emails ──────────────────────────────────────────────────

describe('POST /api/v1/admin/process-emails', () => {
  it('admin can trigger manual email queue processing', async () => {
    const res = await request(app)
      .post('/api/v1/admin/process-emails')
      .set('Authorization', `Bearer ${adminAuth.accessToken}`);
    expect([200, 202]).toContain(res.status);
  });

  it('returns 403 for non-admin', async () => {
    const res = await request(app)
      .post('/api/v1/admin/process-emails')
      .set('Authorization', `Bearer ${consumerAuth.accessToken}`);
    expect(res.status).toBe(403);
  });
});
