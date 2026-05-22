const request = require('supertest');
const app = require('../../src/app');
const { prisma } = require('../setup');

describe('POST /api/v1/auth/register', () => {
  test('creates a new consumer user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'consumer@test.com',
        password: 'password123',
        role: 'CONSUMER'
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body.user.email).toBe('consumer@test.com');
    expect(res.body.user.role).toBe('CONSUMER');
  });

  test('rejects duplicate email', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'dup@test.com', password: 'pass123', role: 'CONSUMER' });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'dup@test.com', password: 'pass123', role: 'CONSUMER' });

    expect(res.status).toBe(409);
  });

  test('rejects invalid role', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'bad@test.com', password: 'pass123', role: 'HACKER' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/auth/login', () => {
  test('returns tokens for valid credentials', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'login@test.com', password: 'mypassword', role: 'CONSUMER' });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'login@test.com', password: 'mypassword' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
  });

  test('rejects wrong password', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'wrong@test.com', password: 'rightpass', role: 'CONSUMER' });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'wrong@test.com', password: 'badpass' });

    expect(res.status).toBe(401);
  });
});