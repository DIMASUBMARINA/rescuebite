const { STATES, getStateConfig, canTransition, canEdit } = require('../../src/utils/stateMachine');

describe('stateMachine', () => {
  describe('STATES config', () => {
    test('has all required states', () => {
      expect(STATES).toHaveProperty('FRESH');
      expect(STATES).toHaveProperty('DISCOUNTED');
      expect(STATES).toHaveProperty('FREE');
      expect(STATES).toHaveProperty('EXPIRED');
    });

    test('FRESH has correct properties', () => {
      expect(STATES.FRESH.multiplier).toBe(1.0);
      expect(STATES.FRESH.threshold).toBe(0.5);
      expect(STATES.FRESH.canEdit).toBe(true);
      expect(STATES.FRESH.nextState).toBe('DISCOUNTED');
    });

    test('DISCOUNTED has correct properties', () => {
      expect(STATES.DISCOUNTED.multiplier).toBe(0.5);
      expect(STATES.DISCOUNTED.canEdit).toBe(false);
    });

    test('FREE has zero multiplier', () => {
      expect(STATES.FREE.multiplier).toBe(0.0);
    });

    test('EXPIRED has no next state', () => {
      expect(STATES.EXPIRED.nextState).toBeNull();
    });
  });

  describe('getStateConfig', () => {
    test('returns config for valid state', () => {
      expect(getStateConfig('FRESH')).toEqual(STATES.FRESH);
    });

    test('returns undefined for invalid state', () => {
      expect(getStateConfig('INVALID')).toBeUndefined();
    });
  });

  describe('canTransition', () => {
    test('FRESH → DISCOUNTED is valid', () => {
      expect(canTransition('FRESH', 'DISCOUNTED')).toBe(true);
    });

    test('FRESH → FREE is invalid', () => {
      expect(canTransition('FRESH', 'FREE')).toBe(false);
    });

    test('DISCOUNTED → FREE is valid', () => {
      expect(canTransition('DISCOUNTED', 'FREE')).toBe(true);
    });

    test('EXPIRED → anything is invalid', () => {
      expect(canTransition('EXPIRED', 'FRESH')).toBe(false);
    });
  });

  describe('canEdit', () => {
    test('FRESH is editable', () => {
      expect(canEdit('FRESH')).toBe(true);
    });

    test('DISCOUNTED is not editable', () => {
      expect(canEdit('DISCOUNTED')).toBe(false);
    });

    test('FREE is not editable', () => {
      expect(canEdit('FREE')).toBe(false);
    });
  });
});