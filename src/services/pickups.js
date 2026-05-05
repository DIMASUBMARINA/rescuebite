const { prisma } = require('../config/database');

async function createPickupTask(claimId) {
  return prisma.pickup.create({
    data: {
      claimId,
      status: 'UNASSIGNED',
    },
  });
}

async function getPickupById(pickupId) {
  return prisma.pickup.findUnique({
    where: { id: pickupId },
    include: {
      claim: {
        include: {
          inventory: true,
          shelter: true,
        },
      },
      driver: true,
    },
  });
}

async function timeoutExpired(pickupId) {
  const pickup = await prisma.pickup.findUnique({
    where: { id: pickupId },
  });

  if (!pickup || pickup.status !== 'ASSIGNED' || !pickup.assignedAt) {
    return false;
  }

  const timeoutMs = 15 * 60 * 1000; // 15 minutes
  return Date.now() - new Date(pickup.assignedAt).getTime() > timeoutMs;
}

module.exports = { createPickupTask, getPickupById, timeoutExpired };