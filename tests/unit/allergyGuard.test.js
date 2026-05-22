/**
 * Unit tests for the AllergyGuard service.
 * This is a life-critical safety feature — test coverage must be thorough.
 */
const { checkAllergies } = require('../../src/services/allergyGuard');

describe('checkAllergies', () => {
  // ─── No conflict ─────────────────────────────────────────────────────────────

  it('returns false (safe) when user has no allergies', () => {
    expect(checkAllergies([], ['GLUTEN', 'DAIRY'])).toBe(false);
  });

  it('returns false (safe) when item has no allergens', () => {
    expect(checkAllergies(['GLUTEN', 'DAIRY'], [])).toBe(false);
  });

  it('returns false (safe) when both lists are empty', () => {
    expect(checkAllergies([], [])).toBe(false);
  });

  it('returns false (safe) when no overlap exists', () => {
    expect(checkAllergies(['FISH', 'SHELLFISH'], ['GLUTEN', 'DAIRY'])).toBe(false);
  });

  it('returns false when user allergies are completely disjoint from item allergens', () => {
    const userAllergens = ['PEANUTS', 'TREE_NUTS'];
    const itemAllergens = ['GLUTEN', 'WHEAT', 'SOY'];
    expect(checkAllergies(userAllergens, itemAllergens)).toBe(false);
  });

  // ─── Conflict found ───────────────────────────────────────────────────────────

  it('returns true (blocked) when there is one matching allergen', () => {
    expect(checkAllergies(['GLUTEN'], ['GLUTEN', 'DAIRY'])).toBe(true);
  });

  it('returns true (blocked) when there are multiple matching allergens', () => {
    expect(checkAllergies(['GLUTEN', 'DAIRY'], ['GLUTEN', 'DAIRY', 'EGGS'])).toBe(true);
  });

  it('returns true (blocked) when ALL user allergens match item allergens', () => {
    expect(checkAllergies(['PEANUTS', 'TREE_NUTS'], ['PEANUTS', 'TREE_NUTS'])).toBe(true);
  });

  it('returns true (blocked) when only one of many user allergens matches', () => {
    const userAllergens = ['EGGS', 'FISH', 'WHEAT'];
    const itemAllergens = ['WHEAT']; // only WHEAT matches
    expect(checkAllergies(userAllergens, itemAllergens)).toBe(true);
  });

  // ─── All allergen types ───────────────────────────────────────────────────────

  const allAllergens = ['GLUTEN', 'DAIRY', 'EGGS', 'FISH', 'SHELLFISH', 'TREE_NUTS', 'PEANUTS', 'WHEAT', 'SOY', 'SESAME'];

  it.each(allAllergens)(
    'correctly detects conflict for allergen %s',
    (allergen) => {
      expect(checkAllergies([allergen], [allergen])).toBe(true);
      expect(checkAllergies([allergen], [])).toBe(false);
    }
  );

  // ─── Edge cases ───────────────────────────────────────────────────────────────

  it('is case-sensitive — mismatched case does not trigger a block', () => {
    // Allergens should always be uppercase per the schema enum
    // If someone passes lowercase, it should NOT match
    const result = checkAllergies(['gluten'], ['GLUTEN']);
    // The function should treat these as different strings
    expect(result).toBe(false);
  });

  it('handles duplicate allergens in user list without false positives', () => {
    expect(checkAllergies(['GLUTEN', 'GLUTEN'], ['DAIRY'])).toBe(false);
  });

  it('handles duplicate allergens in item list without false positives', () => {
    expect(checkAllergies(['DAIRY'], ['DAIRY', 'DAIRY'])).toBe(true);
  });
});
