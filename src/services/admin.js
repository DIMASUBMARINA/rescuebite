const { prisma } = require('../config/database');
const { log: auditLog } = require('./auditLogger');

async function listUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      phone: true,
      isVerified: true,
      isSuspended: true,
      createdAt: true,
      restaurant: { select: { businessName: true } },
      shelter: { select: { shelterName: true } },
      driver: { select: { licenseNo: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function suspendUser(userId, adminId, ipAddress) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.role === 'ADMIN') {
    throw new Error('Cannot suspend admin accounts');
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isSuspended: true },
  });

  await auditLog({
    entity: 'User',
    entityId: userId,
    action: 'SUSPEND',
    field: 'isSuspended',
    oldValue: 'false',
    newValue: 'true',
    changedBy: adminId,
    ipAddress,
  });

  return { id: userId, email: user.email, isSuspended: true };
}

async function unsuspendUser(userId, adminId, ipAddress) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isSuspended: false },
  });

  await auditLog({
    entity: 'User',
    entityId: userId,
    action: 'UNSUSPEND',
    field: 'isSuspended',
    oldValue: 'true',
    newValue: 'false',
    changedBy: adminId,
    ipAddress,
  });

  return { id: userId, email: user.email, isSuspended: false };
}

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

module.exports = { overrideInventoryState, listUsers, suspendUser, unsuspendUser };