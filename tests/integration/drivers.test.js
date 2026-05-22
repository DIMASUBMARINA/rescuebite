const request = require('supertest');
const {
  getApp,
  getPrisma,
  cleanDatabase,
  disconnectDatabase,
  createRestaurant,
  createShelter,
  createDriver,
  createConsumer,
  createRestaurantProfile,
  createShelterProfile,
  createDriverProfile,
  uniqueEmail,
} = require('../helpers');

let app;
let restaurantAuth;
let shelterAuth;
let driverAuth;
let driver2Auth;
let consumerAuth;

beforeAll(async () => {
  app = getApp();
  await cleanDatabase();

  restaurantAuth = await createRestaurant({ email: uniqueEmail('drv_rest') });
  shelterAuth = await createShelter({ email: uniqueEmail('drv_shelter') });
  driverAuth = await createDriver({ email: uniqueEmail('drv_driver') });
  driver2Auth = await createDriver({ email: uniqueEmail('drv_driver2') });
  consumerAuth = await createConsumer({ email: uniqueEmail('drv_consumer') });

  await createRestaurantProfile(restaurantAuth.accessToken, { lat: 43.238, lon: 76.929 });
  await createShelterProfile(shelterAuth.accessToken, { lat: 43.240, lon: 76.931 });
  await createDriverProfile(driverAuth.accessToken);
  await createDriverProfile(driver2Auth.accessToken);
});

afterAll(async () => {
  await disconnectDatabase();
});

// ─── Helper: create a pickup task ─────────────────────────────────────────────────

async function createPickupTask() {
  const prisma = getPrisma();
  const restaurant = await prisma.restaurantProfile.findFirst();
  const shelter = await prisma.shelterProfile.findFirst();
  if (!restaurant || !shelter) return null;

  // Create FREE item
  const item = await prisma.inventory.create({
    data: {
      restaurantId: restaurant.id,
      name: 'Pickup Test Item',
      originalPrice: 0,
      currentPrice: 0,
      quantity: 2,
      reservedQty: 0,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      state: 'FREE',
      ingredients: {},
      allergens: [],
    },
  });

  // Create a claim
  const claim = await prisma.donationClaim.create({
    data: {
      inventoryId: item.id,
      shelterId: shelter.id,
      status: 'CLAIMED',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  });

  // Create pickup task
  const pickup = await prisma.pickupTask.create({
    data: {
      claimId: claim.id,
      status: 'UNASSIGNED',
    },
  });

  return pickup;
}

// ─── GET /drivers/available-pickups ──────────────────────────────────────────────

describe('GET /api/v1/drivers/available-pickups', () => {
  it('driver can view available pickups', async () => {
    const res = await request(app)
      .get('/api/v1/drivers/available-pickups')
      .set('Authorization', `Bearer ${driverAuth.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('returns 403 for consumer', async () => {
    const res = await request(app)
      .get('/api/v1/drivers/available-pickups')
      .set('Authorization', `Bearer ${consumerAuth.accessToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 403 for restaurant', async () => {
    const res = await request(app)
      .get('/api/v1/drivers/available-pickups')
      .set('Authorization', `Bearer ${restaurantAuth.accessToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/v1/drivers/available-pickups');
    expect(res.status).toBe(401);
  });
});

// ─── POST /drivers/pickups/:id/claim ─────────────────────────────────────────────

describe('POST /api/v1/drivers/pickups/:id/claim', () => {
  it('driver can claim an UNASSIGNED pickup task', async () => {
    const pickup = await createPickupTask();
    if (!pickup) return;

    const res = await request(app)
      .post(`/api/v1/drivers/pickups/${pickup.id}/claim`)
      .set('Authorization', `Bearer ${driverAuth.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('id');
  });

  it('second driver cannot claim an already-claimed pickup', async () => {
    const pickup = await createPickupTask();
    if (!pickup) return;

    // First driver claims it
    await request(app)
      .post(`/api/v1/drivers/pickups/${pickup.id}/claim`)
      .set('Authorization', `Bearer ${driverAuth.accessToken}`);

    // Second driver tries to claim the same one
    const res = await request(app)
      .post(`/api/v1/drivers/pickups/${pickup.id}/claim`)
      .set('Authorization', `Bearer ${driver2Auth.accessToken}`);
    expect(res.status).toBe(409);
  });

  it('returns 403 for consumer', async () => {
    const pickup = await createPickupTask();
    if (!pickup) return;

    const res = await request(app)
      .post(`/api/v1/drivers/pickups/${pickup.id}/claim`)
      .set('Authorization', `Bearer ${consumerAuth.accessToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 404 for nonexistent pickup', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000088';
    const res = await request(app)
      .post(`/api/v1/drivers/pickups/${fakeId}/claim`)
      .set('Authorization', `Bearer ${driverAuth.accessToken}`);
    expect(res.status).toBe(404);
  });
});

// ─── POST /drivers/pickups/:id/mark-picked-up ─────────────────────────────────────

describe('POST /api/v1/drivers/pickups/:id/mark-picked-up', () => {
  it('assigned driver can mark pickup as picked up', async () => {
    const pickup = await createPickupTask();
    if (!pickup) return;

    // Claim it
    await request(app)
      .post(`/api/v1/drivers/pickups/${pickup.id}/claim`)
      .set('Authorization', `Bearer ${driverAuth.accessToken}`);

    const res = await request(app)
      .post(`/api/v1/drivers/pickups/${pickup.id}/mark-picked-up`)
      .set('Authorization', `Bearer ${driverAuth.accessToken}`);
    expect(res.status).toBe(200);
  });

  it('returns 403 when unassigned driver tries to mark picked up', async () => {
    const pickup = await createPickupTask();
    if (!pickup) return;

    // Driver1 claims it
    await request(app)
      .post(`/api/v1/drivers/pickups/${pickup.id}/claim`)
      .set('Authorization', `Bearer ${driverAuth.accessToken}`);

    // Driver2 (not assigned) tries mark-picked-up
    const res = await request(app)
      .post(`/api/v1/drivers/pickups/${pickup.id}/mark-picked-up`)
      .set('Authorization', `Bearer ${driver2Auth.accessToken}`);
    expect(res.status).toBe(403);
  });
});

// ─── POST /drivers/pickups/:id/mark-delivered ─────────────────────────────────────

describe('POST /api/v1/drivers/pickups/:id/mark-delivered', () => {
  it('assigned driver can mark delivery as delivered after picking up', async () => {
    const pickup = await createPickupTask();
    if (!pickup) return;

    await request(app)
      .post(`/api/v1/drivers/pickups/${pickup.id}/claim`)
      .set('Authorization', `Bearer ${driverAuth.accessToken}`);

    await request(app)
      .post(`/api/v1/drivers/pickups/${pickup.id}/mark-picked-up`)
      .set('Authorization', `Bearer ${driverAuth.accessToken}`);

    const res = await request(app)
      .post(`/api/v1/drivers/pickups/${pickup.id}/mark-delivered`)
      .set('Authorization', `Bearer ${driverAuth.accessToken}`);
    expect(res.status).toBe(200);
  });

  it('returns 403 for unassigned driver trying to mark delivered', async () => {
    const pickup = await createPickupTask();
    if (!pickup) return;

    await request(app)
      .post(`/api/v1/drivers/pickups/${pickup.id}/claim`)
      .set('Authorization', `Bearer ${driverAuth.accessToken}`);

    const res = await request(app)
      .post(`/api/v1/drivers/pickups/${pickup.id}/mark-delivered`)
      .set('Authorization', `Bearer ${driver2Auth.accessToken}`);
    expect(res.status).toBe(403);
  });
});
