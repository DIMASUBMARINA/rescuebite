const { checkAllergies, validateAllergenList, VALID_ALLERGENS } = require('../../src/services/allergyGuard');

describe('allergyGuard', () => {
  describe('checkAllergies', () => {
    test('returns safe when no conflicts', () => {
      const result = checkAllergies(['GLUTEN'], ['DAIRY', 'EGGS']);
      expect(result.safe).toBe(true);
      expect(result.conflicts).toEqual([]);
    });

    test('returns unsafe with conflicts', () => {
      const result = checkAllergies(['GLUTEN', 'DAIRY'], ['GLUTEN', 'EGGS']);
      expect(result.safe).toBe(false);
      expect(result.conflicts).toEqual(['GLUTEN']);
    });

    test('returns safe when user has no allergies', () => {
      const result = checkAllergies([], ['GLUTEN', 'DAIRY']);
      expect(result.safe).toBe(true);
    });

    test('returns safe when item has no allergens', () => {
      const result = checkAllergies(['GLUTEN'], []);
      expect(result.safe).toBe(true);
    });

    test('handles null inputs as safe', () => {
      expect(checkAllergies(null, ['GLUTEN']).safe).toBe(true);
      expect(checkAllergies(['GLUTEN'], null).safe).toBe(true);
    });
  });

  describe('validateAllergenList', () => {
    test('accepts valid allergens', () => {
      expect(validateAllergenList(['GLUTEN', 'DAIRY'])).toBe(true);
    });

    test('rejects invalid allergen', () => {
      expect(() => validateAllergenList(['GLUTEN', 'INVALID'])).toThrow('Invalid allergen');
    });

    test('rejects non-array', () => {
      expect(() => validateAllergenList('GLUTEN')).toThrow('Allergens must be an array');
    });
  });
});