const { calculateState, calculatePrice } = require('../../src/services/decayEngine');
const { FRESH, DISCOUNTED, FREE, EXPIRED } = require('../../src/utils/stateMachine');

describe('calculateState', () => {
  const now = new Date('2026-05-22T12:00:00Z');

  test('returns FRESH when >60% time remains', () => {
    const created = new Date(now.getTime() - 1 * 60 * 60 * 1000); 
    const expires = new Date(now.getTime() + 10 * 60 * 60 * 1000);
    expect(calculateState(created, expires, now)).toBe(FRESH);
  });

  test('returns DISCOUNTED when 20-60% time remains', () => {
    const created = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const expires = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    expect(calculateState(created, expires, now)).toBe(DISCOUNTED);
  });

  test('returns FREE when <20% time remains', () => {
    const created = new Date(now.getTime() - 9 * 60 * 60 * 1000);
    const expires = new Date(now.getTime() + 1 * 60 * 60 * 1000);
    expect(calculateState(created, expires, now)).toBe(FREE);
  });

  test('returns EXPIRED when past expiration', () => {
    const created = new Date(now.getTime() - 10 * 60 * 60 * 1000);
    const expires = new Date(now.getTime() - 1 * 60 * 60 * 1000);
    expect(calculateState(created, expires, now)).toBe(EXPIRED);
  });
});

describe('calculatePrice', () => {
  test('returns full price for FRESH', () => {
    expect(calculatePrice(1000, FRESH)).toBe(1000);
  });

  test('returns 50% for DISCOUNTED', () => {
    expect(calculatePrice(1000, DISCOUNTED)).toBe(500);
  });

  test('returns 0 for FREE', () => {
    expect(calculatePrice(1000, FREE)).toBe(0);
  });

  test('returns 0 for EXPIRED', () => {
    expect(calculatePrice(1000, EXPIRED)).toBe(0);
  });

  test('never returns negative', () => {
    expect(calculatePrice(-100, FRESH)).toBe(0);
  });
});