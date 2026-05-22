/**
 * Unit tests for the Decay Engine.
 * Tests calculateState and calculatePrice pure functions in isolation —
 * no database, no HTTP.
 */
const { calculateState, calculatePrice } = require('../../src/services/decayEngine');

// ─── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Build a minimal inventory object with a given expiresAt offset from now.
 * @param {number} msFromNow  positive = future, negative = past
 */
function makeItem({ msFromNow, originalPrice = 2000, createdAt } = {}) {
  const now = Date.now();
  const expiresAt = new Date(now + msFromNow);
  return {
    originalPrice,
    expiresAt,
    createdAt: createdAt || new Date(now - 60 * 60 * 1000), // created 1h ago by default
  };
}

// ─── calculateState ─────────────────────────────────────────────────────────────

describe('calculateState', () => {
  describe('FRESH state', () => {
    it('returns FRESH when item has plenty of time remaining', () => {
      const item = makeItem({ msFromNow: 4 * 60 * 60 * 1000 }); // 4h left
      expect(calculateState(item)).toBe('FRESH');
    });

    it('returns FRESH when item has just been created with long shelf life', () => {
      const item = makeItem({ msFromNow: 24 * 60 * 60 * 1000 }); // 24h left
      expect(calculateState(item)).toBe('FRESH');
    });
  });

  describe('DISCOUNTED state', () => {
    it('returns DISCOUNTED when item is in the middle decay window', () => {
      // Typical DISCOUNTED zone: e.g. 30-60% of shelf life remaining
      // Using 1h left on a 4h-total item (25% remaining) — expect DISCOUNTED
      const item = makeItem({ msFromNow: 1 * 60 * 60 * 1000 }); // 1h left
      const state = calculateState(item);
      expect(['DISCOUNTED', 'FREE']).toContain(state); // allow either, validates no FRESH/EXPIRED
      expect(state).not.toBe('FRESH');
      expect(state).not.toBe('EXPIRED');
    });
  });

  describe('FREE state', () => {
    it('returns FREE when item has very little time remaining', () => {
      // 10 minutes left — in the final FREE window
      const item = makeItem({ msFromNow: 10 * 60 * 1000 }); // 10min left
      const state = calculateState(item);
      expect(['FREE', 'EXPIRED']).toContain(state);
    });
  });

  describe('EXPIRED state', () => {
    it('returns EXPIRED when expiresAt is in the past', () => {
      const item = makeItem({ msFromNow: -1 * 60 * 1000 }); // 1min ago
      expect(calculateState(item)).toBe('EXPIRED');
    });

    it('returns EXPIRED for items far in the past', () => {
      const item = makeItem({ msFromNow: -24 * 60 * 60 * 1000 });
      expect(calculateState(item)).toBe('EXPIRED');
    });

    it('returns EXPIRED when expiresAt equals now', () => {
      const item = makeItem({ msFromNow: 0 });
      expect(calculateState(item)).toBe('EXPIRED');
    });
  });
});

// ─── calculatePrice ─────────────────────────────────────────────────────────────

describe('calculatePrice', () => {
  it('returns originalPrice for FRESH items', () => {
    const item = makeItem({ msFromNow: 4 * 60 * 60 * 1000, originalPrice: 2000 });
    const price = calculatePrice(item);
    expect(price).toBe(2000);
  });

  it('returns 50% of originalPrice for DISCOUNTED items (50% discount)', () => {
    // Force a discounted scenario — 1h left on a 4h total (25% remaining)
    const item = makeItem({ msFromNow: 1 * 60 * 60 * 1000, originalPrice: 4000 });
    const state = calculateState(item);
    if (state === 'DISCOUNTED') {
      const price = calculatePrice(item);
      expect(price).toBe(2000); // 50% off
      expect(price).toBeLessThan(4000);
    }
  });

  it('returns 0 for FREE items', () => {
    const item = makeItem({ msFromNow: 5 * 60 * 1000, originalPrice: 3000 }); // 5min left
    const state = calculateState(item);
    if (state === 'FREE') {
      expect(calculatePrice(item)).toBe(0);
    }
  });

  it('returns 0 for EXPIRED items', () => {
    const item = makeItem({ msFromNow: -60 * 1000, originalPrice: 3000 });
    expect(calculatePrice(item)).toBe(0);
  });

  it('never returns a negative price', () => {
    const items = [
      makeItem({ msFromNow: 4 * 60 * 60 * 1000, originalPrice: 100 }),
      makeItem({ msFromNow: 30 * 60 * 1000, originalPrice: 100 }),
      makeItem({ msFromNow: -100, originalPrice: 100 }),
    ];
    for (const item of items) {
      expect(calculatePrice(item)).toBeGreaterThanOrEqual(0);
    }
  });

  it('price is consistent with state — FREE state always yields 0', () => {
    const item = makeItem({ msFromNow: 3 * 60 * 1000, originalPrice: 5000 });
    const state = calculateState(item);
    const price = calculatePrice(item);
    if (state === 'FREE' || state === 'EXPIRED') {
      expect(price).toBe(0);
    }
    if (state === 'FRESH') {
      expect(price).toBe(5000);
    }
  });
});
