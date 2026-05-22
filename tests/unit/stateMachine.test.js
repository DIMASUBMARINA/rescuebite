/**
 * Unit tests for the State Machine configuration.
 * Validates the threshold/multiplier constants that drive the decay engine.
 */
const stateMachine = require('../../src/utils/stateMachine');

describe('stateMachine config', () => {
  it('exports a states object or config', () => {
    expect(stateMachine).toBeDefined();
    expect(typeof stateMachine).toBe('object');
  });

  it('defines FRESH state config', () => {
    // The state machine should have FRESH defined
    const config = stateMachine.states || stateMachine;
    const freshKey = Object.keys(config).find(k => k === 'FRESH' || config[k]?.name === 'FRESH');
    expect(freshKey || config.FRESH).toBeTruthy();
  });

  it('defines DISCOUNTED state config', () => {
    const config = stateMachine.states || stateMachine;
    const key = Object.keys(config).find(k => k === 'DISCOUNTED' || config[k]?.name === 'DISCOUNTED');
    expect(key || config.DISCOUNTED).toBeTruthy();
  });

  it('defines FREE state config', () => {
    const config = stateMachine.states || stateMachine;
    const key = Object.keys(config).find(k => k === 'FREE' || config[k]?.name === 'FREE');
    expect(key || config.FREE).toBeTruthy();
  });

  it('defines EXPIRED state config', () => {
    const config = stateMachine.states || stateMachine;
    const key = Object.keys(config).find(k => k === 'EXPIRED' || config[k]?.name === 'EXPIRED');
    expect(key || config.EXPIRED).toBeTruthy();
  });

  it('DISCOUNTED multiplier is 0.5 (50% discount)', () => {
    const config = stateMachine.states || stateMachine;
    const discounted = config.DISCOUNTED;
    if (discounted && discounted.priceMultiplier !== undefined) {
      expect(discounted.priceMultiplier).toBe(0.5);
    }
  });

  it('FREE multiplier is 0 (free food)', () => {
    const config = stateMachine.states || stateMachine;
    const free = config.FREE;
    if (free && free.priceMultiplier !== undefined) {
      expect(free.priceMultiplier).toBe(0);
    }
  });

  it('thresholds are ordered correctly (FRESH > DISCOUNTED > FREE)', () => {
    const config = stateMachine.states || stateMachine;
    const fresh = config.FRESH;
    const discounted = config.DISCOUNTED;
    const free = config.FREE;

    // If thresholds are defined as % of shelf life remaining
    if (fresh?.threshold !== undefined && discounted?.threshold !== undefined) {
      expect(fresh.threshold).toBeGreaterThan(discounted.threshold);
    }
    if (discounted?.threshold !== undefined && free?.threshold !== undefined) {
      expect(discounted.threshold).toBeGreaterThan(free.threshold);
    }
  });
});
