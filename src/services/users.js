const { prisma } = require('../config/database');

const VALID_ALLERGENS = [
  'GLUTEN', 'DAIRY', 'EGGS', 'FISH', 'SHELLFISH',
  'TREE_NUTS', 'PEANUTS', 'WHEAT', 'SOY', 'SESAME'
];

async function getById(id) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      allergies: true,
      restaurant: true,
      shelter: true,
      driver: true,
    },
  });
}

async function update(id, data) {
  return prisma.user.update({
    where: { id },
    data,
  });
}

async function getAllergies(userId) {
  const allergies = await prisma.userAllergy.findMany({
    where: { userId },
  });
  return allergies.map(a => a.allergen);
}

async function updateAllergies(userId, allergens) {
  for (const allergen of allergens) {
    if (!VALID_ALLERGENS.includes(allergen)) {
      throw new Error(`Invalid allergen: ${allergen}`);
    }
  }

  await prisma.userAllergy.deleteMany({
    where: { userId },
  });

  await prisma.userAllergy.createMany({
    data: allergens.map(allergen => ({ userId, allergen })),
  });

  return getAllergies(userId);
}

module.exports = { getById, update, getAllergies, updateAllergies };