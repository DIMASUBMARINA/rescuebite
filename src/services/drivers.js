const { prisma } = require('../config/database');

async function getDriverByUserId(userId) {
  const driver = await prisma.driver.findUnique({ where: { userId } });
  if (!driver) throw new Error('Driver profile not found');
  return driver;
}

async function getAvailablePickups() {
  const now = new Date();
  
  return prisma.pickup.findMany({
    where: {
      status: 'UNASSIGNED',
      claim: {
        status: 'CLAIMED',
        expiresAt: { gt: now },
      },
    },
    include: {
      claim: {
        include: {
          inventory: {
            include: {
              restaurant: {
                select: { businessName: true, address: true, lat: true, lon: true },
              },
            },
          },
          shelter: {
            select: { shelterName: true, address: true, lat: true, lon: true },
          },
        },
      },
    },
  });
}

async function claimPickup(pickupId, userId) {
  const driver = await getDriverByUserId(userId);

  return prisma.$transaction(async (tx) => {
    const pickup = await tx.pickup.findUnique({
      where: { id: pickupId },
    });

    if (!pickup || pickup.status !== 'UNASSIGNED') {
      throw new Error('Pickup not available');
    }

    return tx.pickup.update({
      where: { id: pickupId },
      data: {
        driverId: driver.id,
        status: 'ASSIGNED',
        assignedAt: new Date(),
      },
    });
  });
}

async function markPickedUp(pickupId, userId) {
  const driver = await getDriverByUserId(userId);

  const pickup = await prisma.pickup.findUnique({
    where: { id: pickupId },
  });

  if (!pickup || pickup.driverId !== driver.id) {
    throw new Error('Not authorized');
  }

  if (pickup.status !== 'ASSIGNED') {
    throw new Error('Invalid status');
  }

  return prisma.pickup.update({
    where: { id: pickupId },
    data: {
      status: 'IN_TRANSIT',
      pickedUpAt: new Date(),
    },
  });
}

async function markDelivered(pickupId, userId) {
  const driver = await getDriverByUserId(userId);

  const pickup = await prisma.pickup.findUnique({
    where: { id: pickupId },
  });

  if (!pickup || pickup.driverId !== driver.id) {
    throw new Error('Not authorized');
  }

  if (pickup.status !== 'IN_TRANSIT') {
    throw new Error('Invalid status');
  }

  return prisma.pickup.update({
    where: { id: pickupId },
    data: {
      status: 'DELIVERED',
      deliveredAt: new Date(),
    },
  });
}

module.exports = { getAvailablePickups, claimPickup, markPickedUp, markDelivered };