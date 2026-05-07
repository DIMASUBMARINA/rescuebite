const { prisma } = require('../config/database');

async function overrideInventoryState(inventoryId, newState, reason, adminId, ipAddress) {
  const item = await prisma.inventory.findUnique({
    where: { id: inventoryId },
  });

  if (!item) {
    throw new Error('Item not found');
  }

  const oldState = item.state;

  await prisma.$transaction(async (tx) => {
    await tx.inventory.update({
      where: { id: inventoryId },
      data: { state: newState },
    });

    await tx.auditLog.create({
      data: {
        entity: 'Inventory',
        entityId: inventoryId,
        action: 'ADMIN_OVERRIDE',
        field: 'state',
        oldValue: oldState,
        newValue: newState,
        changedBy: adminId,
        ipAddress,
      },
    });

    await tx.auditLog.create({
      data: {
        entity: 'Inventory',
        entityId: inventoryId,
        action: 'ADMIN_OVERRIDE_REASON',
        field: 'reason',
        newValue: reason,
        changedBy: adminId,
        ipAddress,
      },
    });
  });

  return { id: inventoryId, oldState, newState, reason };
}

module.exports = { overrideInventoryState };