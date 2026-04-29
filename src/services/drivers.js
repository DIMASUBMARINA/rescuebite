const { prisma } = require('../config/database');

async function getAvailablePickups() {
  return prisma.pickup.findMany({
    where: { status: 'UNASSIGNED' },
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

async function claimPickup(pickupId, driverId) {
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
        driverId,
        status: 'ASSIGNED',
        assignedAt: new Date(),
      },
    });
  });
}

async function markPickedUp(pickupId, driverId) {
  const pickup = await prisma.pickup.findUnique({
    where: { id: pickupId },
  });

  if (!pickup || pickup.driverId !== driverId) {
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

async function markDelivered(pickupId, driverId) {
  const pickup = await prisma.pickup.findUnique({
    where: { id: pickupId },
  });

  if (!pickup || pickup.driverId !== driverId) {
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