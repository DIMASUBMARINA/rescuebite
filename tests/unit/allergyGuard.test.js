const { checkAllergies } = require('../../src/services/allergyGuard');

describe('checkAllergies', () => {
  test('returns safe when no user allergies', () => {
    expect(checkAllergies([], ['peanuts', 'gluten'])).toEqual({ safe: true });
  });

  test('returns safe when no item allergens', () => {
    expect(checkAllergies(['peanuts'], [])).toEqual({ safe: true });
  });

  test('blocks when allergens match', () => {
    expect(checkAllergies(['peanuts', 'dairy'], ['peanuts', 'shellfish']))
      .toEqual({ safe: false, blocked: ['peanuts'] });
  });

  test('blocks multiple matches', () => {
    expect(checkAllergies(['peanuts', 'dairy', 'gluten'], ['dairy', 'gluten']))
      .toEqual({ safe: false, blocked: ['dairy', 'gluten'] });
  });

  test('is case sensitive', () => {
    expect(checkAllergies(['Peanuts'], ['peanuts'])).toEqual({ safe: true });
  });
});