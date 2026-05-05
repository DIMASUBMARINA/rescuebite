const request = require('supertest');
const { app } = require('../../src/app');
const { prisma } = require('../../src/config/database');

describe('Auth Integration', () => {
  beforeEach(async () => {
    await prisma.refreshToken.deleteMany();
    await prisma.order.deleteMany();
    await prisma.inventory.deleteMany();
    await prisma.claim.deleteMany();
    await prisma.pickup.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.userAllergy.deleteMany();
    await prisma.driver.deleteMany();
    await prisma.shelter.deleteMany();
    await prisma.restaurant.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/v1/auth/register', () => {
    test('creates user and returns tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          role: 'CONSUMER',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.email).toBe('test@example.com');
    });

    test('rejects duplicate email', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'dup@example.com', password: 'password123', role: 'CONSUMER' });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'dup@example.com', password: 'password123', role: 'CONSUMER' });

      expect(res.status).toBe(409);
    });

    test('rejects weak password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'weak@example.com', password: '123', role: 'CONSUMER' });

      expect(res.status).toBe(422);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    test('returns tokens for valid credentials', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'login@example.com', password: 'password123', role: 'CONSUMER' });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'login@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
    });

    test('rejects invalid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'bad@example.com', password: 'wrong' });

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
        .send({ email: 'consumer@example.com', password: 'password123', role: 'CONSUMER' });

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