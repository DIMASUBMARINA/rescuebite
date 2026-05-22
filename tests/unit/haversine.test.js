/**
 * Unit tests for the Haversine distance utility.
 * Used for shelter matching (10km radius).
 */
const haversine = require('../../src/utils/haversine');

// The function may be exported as default or named
const getDistance = typeof haversine === 'function' ? haversine : haversine.haversine || haversine.distance || haversine.default;

describe('haversine distance', () => {
  it('returns 0 for identical coordinates', () => {
    const dist = getDistance(43.238, 76.9286, 43.238, 76.9286);
    expect(dist).toBeCloseTo(0, 3);
  });

  it('returns a positive distance for different coordinates', () => {
    // Two points in Almaty — roughly 1-2km apart
    const dist = getDistance(43.238, 76.9286, 43.248, 76.9386);
    expect(dist).toBeGreaterThan(0);
  });

  it('calculates distance in kilometers (not meters)', () => {
    // Almaty city center to airport — approximately 18-22 km
    // Almaty center: ~43.238, 76.929
    // Almaty airport: ~43.354, 77.041
    const dist = getDistance(43.238, 76.929, 43.354, 77.041);
    expect(dist).toBeGreaterThan(10); // definitely more than 10km
    expect(dist).toBeLessThan(50);   // definitely less than 50km
  });

  it('is within 10km threshold for nearby shelter matching', () => {
    // Two points 500m apart — must be inside the 10km shelter radius
    const dist = getDistance(43.238, 76.9286, 43.243, 76.9286);
    expect(dist).toBeLessThan(10);
  });

  it('is outside 10km threshold for far shelter', () => {
    // Two points ~25km apart
    const dist = getDistance(43.238, 76.929, 43.450, 76.929);
    expect(dist).toBeGreaterThan(10);
  });

  it('is symmetric — distance(A→B) equals distance(B→A)', () => {
    const ab = getDistance(43.238, 76.929, 43.300, 77.000);
    const ba = getDistance(43.300, 77.000, 43.238, 76.929);
    expect(ab).toBeCloseTo(ba, 5);
  });

  it('handles negative latitude/longitude (Southern Hemisphere)', () => {
    // Sydney to Melbourne — ~715km
    const dist = getDistance(-33.8688, 151.2093, -37.8136, 144.9631);
    expect(dist).toBeGreaterThan(700);
    expect(dist).toBeLessThan(730);
  });
});
