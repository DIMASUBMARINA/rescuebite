const VALID_ALLERGENS = [
  'GLUTEN', 'DAIRY', 'EGGS', 'FISH', 'SHELLFISH',
  'TREE_NUTS', 'PEANUTS', 'WHEAT', 'SOY', 'SESAME'
];

function checkAllergies(userAllergies, itemAllergens) {
  if (!userAllergies || !itemAllergens) {
    return { safe: true, conflicts: [] };
  }

  const conflicts = userAllergies.filter(allergen => 
    itemAllergens.includes(allergen)
  );

  return {
    safe: conflicts.length === 0,
    conflicts,
  };
}

function validateAllergenList(allergens) {
  if (!Array.isArray(allergens)) {
    throw new Error('Allergens must be an array');
  }
  
  for (const allergen of allergens) {
    if (!VALID_ALLERGENS.includes(allergen)) {
      throw new Error(`Invalid allergen: ${allergen}. Valid: ${VALID_ALLERGENS.join(', ')}`);
    }
  }
  
  return true;
}

module.exports = { checkAllergies, validateAllergenList, VALID_ALLERGENS };