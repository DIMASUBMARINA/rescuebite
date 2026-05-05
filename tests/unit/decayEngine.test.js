const { calculateState, calculatePrice, getTimeInfo } = require('../../src/services/decayEngine');

describe('decayEngine', () => {
  const baseItem = {
    createdAt: new Date('2025-01-01T00:00:00Z'),
    expiresAt: new Date('2025-01-02T00:00:00Z'), 
    originalPrice: 10000,
  };

  describe('calculateState', () => {
    test('returns FRESH when >50% time remains', () => {
      const now = new Date('2025-01-01T10:00:00Z'); 
      expect(calculateState(baseItem, now)).toBe('FRESH');
    });

    test('returns DISCOUNTED when 20-50% time remains', () => {
      const now = new Date('2025-01-01T16:00:00Z'); 
      expect(calculateState(baseItem, now)).toBe('DISCOUNTED');
    });

    test('returns FREE when <20% time remains', () => {
      const now = new Date('2025-01-01T23:00:00Z');
      expect(calculateState(baseItem, now)).toBe('FREE');
    });

    test('returns EXPIRED when past expiry', () => {
      const now = new Date('2025-01-02T01:00:00Z');
      expect(calculateState(baseItem, now)).toBe('EXPIRED');
    });
  });

  describe('calculatePrice', () => {
    test('FRESH price = original', () => {
      expect(calculatePrice(baseItem, 'FRESH')).toBe(10000);
    });

    test('DISCOUNTED price = 50%', () => {
      expect(calculatePrice(baseItem, 'DISCOUNTED')).toBe(5000);
    });

    test('FREE price = 0', () => {
      expect(calculatePrice(baseItem, 'FREE')).toBe(0);
    });

    test('EXPIRED price = 0', () => {
      expect(calculatePrice(baseItem, 'EXPIRED')).toBe(0);
    });
  });

  describe('getTimeInfo', () => {
    test('returns correct time breakdown', () => {
      const now = new Date('2025-01-01T12:00:00Z'); 
      const info = getTimeInfo(baseItem, now);
      
      expect(info.totalMinutes).toBe(1440);
      expect(info.remainingMinutes).toBe(720);
      expect(info.elapsedMinutes).toBe(720);
      expect(info.percentRemaining).toBeCloseTo(0.5, 2);
    });
  });
});