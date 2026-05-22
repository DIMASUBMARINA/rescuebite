const haversine = require('../../src/utils/haversine');

describe('haversine', () => {
  test('calculates distance between Almaty points', () => {
    const dist = haversine(43.2380, 76.8829, 43.1566, 76.9394);
    expect(dist).toBeGreaterThan(9);
    expect(dist).toBeLessThan(11);
  });

  test('returns 0 for same coordinates', () => {
    expect(haversine(43.0, 76.0, 43.0, 76.0)).toBe(0);
  });

  test('returns distance in kilometers', () => {
    const dist = haversine(43.0, 76.0, 43.9, 76.0);
    expect(dist).toBeGreaterThan(99);
    expect(dist).toBeLessThan(101);
  });
});