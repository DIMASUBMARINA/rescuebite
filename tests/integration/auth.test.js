const request = require('supertest');
const {
  getApp,
  cleanDatabase,
  disconnectDatabase,
  registerUser,
  createConsumer,
  uniqueEmail,
} = require('../helpers');

let app;

beforeAll(async () => {
  app = getApp();
  await cleanDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

// ─── POST /auth/register ────────────────────────────────────────────────────────

describe('POST /api/v1/auth/register', () => {
  it('registers a CONSUMER and returns tokens', async () => {
    const res = await registerUser({ email: uniqueEmail('consumer'), role: 'CONSUMER' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data.user.role).toBe('CONSUMER');
    expect(res.body.data.user).not.toHaveProperty('password');
  });

  it('registers a RESTAURANT user', async () => {
    const res = await registerUser({ email: uniqueEmail('restaurant'), role: 'RESTAURANT' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('RESTAURANT');
  });

  it('registers a SHELTER user', async () => {
    const res = await registerUser({ email: uniqueEmail('shelter'), role: 'SHELTER' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('SHELTER');
  });

  it('registers a DRIVER user', async () => {
    const res = await registerUser({ email: uniqueEmail('driver'), role: 'DRIVER' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('DRIVER');
  });

  it('rejects duplicate email with 409', async () => {
    const email = uniqueEmail('dup');
    await registerUser({ email, role: 'CONSUMER' });
    const res = await registerUser({ email, role: 'CONSUMER' });
    expect(res.status).toBe(409);
  });

  it('rejects missing email with 422', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ password: 'TestPass123!', role: 'CONSUMER' });
    expect(res.status).toBe(422);
  });

  it('rejects weak password with 422', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: uniqueEmail(), password: '123', role: 'CONSUMER' });
    expect(res.status).toBe(422);
  });

  it('rejects invalid role with 422', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: uniqueEmail(), password: 'TestPass123!', role: 'SUPERUSER' });
    expect(res.status).toBe(422);
  });

  it('rejects missing role with 422', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: uniqueEmail(), password: 'TestPass123!' });
    expect(res.status).toBe(422);
  });
});

// ─── POST /auth/login ───────────────────────────────────────────────────────────

describe('POST /api/v1/auth/login', () => {
  const email = uniqueEmail('login');
  const password = 'LoginPass456!';

  beforeAll(async () => {
    await registerUser({ email, password, role: 'CONSUMER' });
  });

  it('logs in with correct credentials and returns tokens', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data.user.email).toBe(email);
  });

  it('rejects wrong password with 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'WrongPassword1!' });
    expect(res.status).toBe(401);
  });

  it('rejects nonexistent email with 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ghost@nowhere.com', password });
    expect(res.status).toBe(401);
  });

  it('rejects missing password with 422', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email });
    expect(res.status).toBe(422);
  });

  it('rejects missing email with 422', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ password });
    expect(res.status).toBe(422);
  });
});

// ─── POST /auth/refresh ─────────────────────────────────────────────────────────

describe('POST /api/v1/auth/refresh', () => {
  let refreshToken;

  beforeAll(async () => {
    const res = await registerUser({ email: uniqueEmail('refresh'), role: 'CONSUMER' });
    refreshToken = res.body.data.refreshToken;
  });

  it('returns a new access token for a valid refresh token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
  });

  it('rejects an invalid refresh token with 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'not-a-real-token' });
    expect(res.status).toBe(401);
  });

  it('rejects missing refreshToken with 422', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({});
    expect(res.status).toBe(422);
  });
});

// ─── POST /auth/logout ──────────────────────────────────────────────────────────

describe('POST /api/v1/auth/logout', () => {
  it('logs out successfully and returns 200', async () => {
    const regRes = await registerUser({ email: uniqueEmail('logout'), role: 'CONSUMER' });
    const { refreshToken } = regRes.body.data;

    const res = await request(app)
      .post('/api/v1/auth/logout')
      .send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
  });

  it('after logout, refresh token is revoked (cannot refresh again)', async () => {
    const regRes = await registerUser({ email: uniqueEmail('logout2'), role: 'CONSUMER' });
    const { refreshToken } = regRes.body.data;

    // Logout
    await request(app).post('/api/v1/auth/logout').send({ refreshToken });

    // Try to refresh with the now-revoked token
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });
    expect(res.status).toBe(401);
  });

  it('rejects missing refreshToken with 422', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .send({});
    expect(res.status).toBe(422);
  });
});

// ─── GET /users/me ──────────────────────────────────────────────────────────────

describe('GET /api/v1/users/me', () => {
  let accessToken;

  beforeAll(async () => {
    const res = await createConsumer({ email: uniqueEmail('me') });
    accessToken = res.accessToken;
  });

  it('returns the current user profile', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('email');
    expect(res.body.data).not.toHaveProperty('password');
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', 'Bearer fake.token.here');
    expect(res.status).toBe(401);
  });
});
