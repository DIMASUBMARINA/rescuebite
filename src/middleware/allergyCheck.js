const { prisma } = require('../config/database');
const { checkAllergies } = require('../services/allergyGuard');

async function allergyCheck(req, res, next) {
  try {
    const { inventoryId } = req.body;
    
    if (!inventoryId) {
      return res.status(400).json({ status: 'error', message: 'inventoryId required' });
    }

    const userAllergies = await prisma.userAllergy.findMany({
      where: { userId: req.userId },
    });
    const userAllergenList = userAllergies.map(a => a.allergen);

    const item = await prisma.inventory.findUnique({
      where: { id: inventoryId },
      select: { allergens: true, name: true, state: true },
    });

    if (!item) {
      return res.status(404).json({ status: 'error', message: 'Item not found' });
    }

    if (item.state !== 'DISCOUNTED') {
      return res.status(400).json({ status: 'error', message: 'Item not available for purchase' });
    }

    const result = checkAllergies(userAllergenList, item.allergens);

    if (!result.safe) {
      return res.status(400).json({
        status: 'error',
        code: 'ALLERGY_SAFETY_BLOCK',
        message: `SAFETY BLOCK: Item contains ${result.conflicts.join(', ')} which you declared as allergen`,
        conflicts: result.conflicts,
        itemName: item.name,
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { allergyCheck };