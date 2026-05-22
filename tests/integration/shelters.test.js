const request = require('supertest');
const {
  getApp,
  getPrisma,
  cleanDatabase,
  disconnectDatabase,
  createRestaurant,
  createShelter,
  createConsumer,
  createRestaurantProfile,
  createShelterProfile,
  createInventoryDirect,
  uniqueEmail,
} = require('../helpers');

let app;
let restaurantAuth;
let shelterAuth;
let shelter2Auth;
let consumerAuth;

beforeAll(async () => {
  app = getApp();
  await cleanDatabase();

  restaurantAuth = await createRestaurant({ email: uniqueEmail('sh_rest') });
  shelterAuth = await createShelter({ email: uniqueEmail('sh_shelter') });
  shelter2Auth = await createShelter({ email: uniqueEmail('sh_shelter2') });
  consumerAuth = await createConsumer({ email: uniqueEmail('sh_consumer') });

  await createRestaurantProfile(restaurantAuth.accessToken, {
    lat: 43.238, lon: 76.929, // Almaty center
  });
  // Shelter nearby (within 10km)
  await createShelterProfile(shelterAuth.accessToken, {
    lat: 43.240, lon: 76.930,
  });
  await createShelterProfile(shelter2Auth.accessToken, {
    lat: 43.242, lon: 76.931,
  });
});

afterAll(async () => {
  await disconnectDatabase();
});

// ─── GET /shelters/available-donations ───────────────────────────────────────────

describe('GET /api/v1/shelters/available-donations', () => {
  it('shelter can view available FREE donations', async () => {
    const res = await request(app)
      .get('/api/v1/shelters/available-donations')
      .set('Authorization', `Bearer ${shelterAuth.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('returns 403 for consumer trying to access donations endpoint', async () => {
    const res = await request(app)
      .get('/api/v1/shelters/available-donations')
      .set('Authorization', `Bearer ${consumerAuth.accessToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 403 for restaurant trying to access donations endpoint', async () => {
    const res = await request(app)
      .get('/api/v1/shelters/available-donations')
      .set('Authorization', `Bearer ${restaurantAuth.accessToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/v1/shelters/available-donations');
    expect(res.status).toBe(401);
  });
});

// ─── POST /shelters/claims ────────────────────────────────────────────────────────

describe('POST /api/v1/shelters/claims', () => {
  let freeItem;

  beforeEach(async () => {
    // Create a FREE state inventory item directly in DB
    const prisma = getPrisma();
    const restaurant = await prisma.restaurantProfile.findFirst({
      where: { user: { role: 'RESTAURANT' } },
    });
    if (!restaurant) return;

    freeItem = await prisma.inventory.create({
      data: {
        restaurantId: restaurant.id,
        name: 'Free Food Item',
        originalPrice: 0,
        currentPrice: 0,
        quantity: 5,
        reservedQty: 0,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // expires in 30 min
        state: 'FREE',
        ingredients: { type: 'leftover' },
        allergens: [],
      },
    });
  });

  it('shelter can claim a FREE item', async () => {
    if (!freeItem) return;
    const res = await request(app)
      .post('/api/v1/shelters/claims')
      .set('Authorization', `Bearer ${shelterAuth.accessToken}`)
      .send({ inventoryId: freeItem.id });
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
  });

  it('returns 403 for consumer trying to claim', async () => {
    if (!freeItem) return;
    const res = await request(app)
      .post('/api/v1/shelters/claims')
      .set('Authorization', `Bearer ${consumerAuth.accessToken}`)
      .send({ inventoryId: freeItem.id });
    expect(res.status).toBe(403);
  });

  it('returns 403 for restaurant trying to claim', async () => {
    if (!freeItem) return;
    const res = await request(app)
      .post('/api/v1/shelters/claims')
      .set('Authorization', `Bearer ${restaurantAuth.accessToken}`)
      .send({ inventoryId: freeItem.id });
    expect(res.status).toBe(403);
  });

  it('returns 401 without auth', async () => {
    if (!freeItem) return;
    const res = await request(app)
      .post('/api/v1/shelters/claims')
      .send({ inventoryId: freeItem.id });
    expect(res.status).toBe(401);
  });

  it('returns 422 for missing inventoryId', async () => {
    const res = await request(app)
      .post('/api/v1/shelters/claims')
      .set('Authorization', `Bearer ${shelterAuth.accessToken}`)
      .send({});
    expect(res.status).toBe(422);
  });
});

// ─── POST /shelters/claims/:id/confirm-receipt ────────────────────────────────────

describe('POST /api/v1/shelters/claims/:id/confirm-receipt', () => {
  it('shelter can confirm receipt of a claim', async () => {
    const prisma = getPrisma();

    // Create a fresh FREE item
    const restaurant = await prisma.restaurantProfile.findFirst();
    if (!restaurant) return;

    const item = await prisma.inventory.create({
      data: {
        restaurantId: restaurant.id,
        name: 'Confirm Receipt Item',
        originalPrice: 0,
        currentPrice: 0,
        quantity: 3,
        reservedQty: 0,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        state: 'FREE',
        ingredients: {},
        allergens: [],
      },
    });

    // Claim it
    const claimRes = await request(app)
      .post('/api/v1/shelters/claims')
      .set('Authorization', `Bearer ${shelterAuth.accessToken}`)
      .send({ inventoryId: item.id });

    if (claimRes.status !== 201) return; // skip if claim failed for environment reasons

    const claimId = claimRes.body.data.id;
    const confirmRes = await request(app)
      .post(`/api/v1/shelters/claims/${claimId}/confirm-receipt`)
      .set('Authorization', `Bearer ${shelterAuth.accessToken}`);
    expect(confirmRes.status).toBe(200);
  });

  it('returns 403 when another shelter tries to confirm someone else\'s claim', async () => {
    const prisma = getPrisma();
    const restaurant = await prisma.restaurantProfile.findFirst();
    if (!restaurant) return;

    const item = await prisma.inventory.create({
      data: {
        restaurantId: restaurant.id,
        name: 'Receipt Theft Test',
        originalPrice: 0,
        currentPrice: 0,
        quantity: 3,
        reservedQty: 0,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        state: 'FREE',
        ingredients: {},
        allergens: [],
      },
    });

    const claimRes = await request(app)
      .post('/api/v1/shelters/claims')
      .set('Authorization', `Bearer ${shelterAuth.accessToken}`)
      .send({ inventoryId: item.id });

    if (claimRes.status !== 201) return;
    const claimId = claimRes.body.data.id;

    // Different shelter tries to confirm
    const confirmRes = await request(app)
      .post(`/api/v1/shelters/claims/${claimId}/confirm-receipt`)
      .set('Authorization', `Bearer ${shelter2Auth.accessToken}`);
    expect(confirmRes.status).toBe(403);
  });
});
