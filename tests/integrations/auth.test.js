const request = require('supertest');
const { app } = require('../../src/app');

function uniqueEmail(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}@test.com`;
}

describe('Auth Integration', () => {
  describe('POST /api/v1/auth/register', () => {
    test('creates user and returns tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail('user'),
          password: 'password123',
          role: 'CONSUMER',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    test('rejects duplicate email', async () => {
      const email = uniqueEmail('dup');
      await request(app)
        .post('/api/v1/auth/register')
        .send({ email, password: 'password123', role: 'CONSUMER' });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email, password: 'password123', role: 'CONSUMER' });

      expect(res.status).toBe(409);
    });

    test('rejects weak password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: uniqueEmail('weak'), password: '123', role: 'CONSUMER' });

      expect(res.status).toBe(422);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    test('returns tokens for valid credentials', async () => {
      const email = uniqueEmail('login');
      const password = 'password123';
      await request(app)
        .post('/api/v1/auth/register')
        .send({ email, password, role: 'CONSUMER' });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
    });

    test('rejects invalid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail('bad'), password: 'wrong' });

      expect(res.status).toBe(401);
    });
  });

  describe('Token protection', () => {
    test('GET /api/v1/users/me rejects missing token', async () => {
      const res = await request(app).get('/api/v1/users/me');
      expect(res.status).toBe(401);
    });

    test('GET /api/v1/users/me rejects invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });
  });

  describe('RBAC', () => {
    test('consumer cannot access restaurant endpoint', async () => {
      const reg = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: uniqueEmail('consumer'), password: 'password123', role: 'CONSUMER' });

      const res = await request(app)
        .post('/api/v1/inventory')
        .set('Authorization', `Bearer ${reg.body.data.accessToken}`)
        .send({
          name: 'Test',
          originalPrice: 1000,
          quantity: 1,
          expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
          ingredients: {},
        });

      expect(res.status).toBe(403);
    });
  });
});