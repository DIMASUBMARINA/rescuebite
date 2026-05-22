const { prisma } = require('../config/database');
const { log } = require('./auditLogger');

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
      OR: [
        {
          type: 'SHELTER_DELIVERY',
          claim: {
            status: 'CLAIMED',
            expiresAt: { gt: now },
          },
        },
        {
          type: 'CONSUMER_DELIVERY',
          order: {
            status: 'PAID',
          },
        },
      ],
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
      order: {
        include: {
          inventory: {
            include: {
              restaurant: {
                select: { businessName: true, address: true, lat: true, lon: true },
              },
            },
          },
          user: {
            select: { email: true, phone: true },
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

    const updated = await tx.pickup.update({
      where: { id: pickupId },
      data: {
        driverId: driver.id,
        status: 'ASSIGNED',
        assignedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        entity: 'Pickup',
        entityId: pickupId,
        action: 'STATUS_CHANGE',
        field: 'status',
        oldValue: 'UNASSIGNED',
        newValue: 'ASSIGNED',
        changedBy: userId,
      },
    });

    return updated;
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

  return prisma.$transaction(async (tx) => {
    const updated = await tx.pickup.update({
      where: { id: pickupId },
      data: {
        status: 'IN_TRANSIT',
        pickedUpAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        entity: 'Pickup',
        entityId: pickupId,
        action: 'STATUS_CHANGE',
        field: 'status',
        oldValue: 'ASSIGNED',
        newValue: 'IN_TRANSIT',
        changedBy: userId,
      },
    });

    return updated;
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

  return prisma.$transaction(async (tx) => {
    await tx.pickup.update({
      where: { id: pickupId },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
      },
    });

    if (pickup.type === 'CONSUMER_DELIVERY' && pickup.orderId) {
      await tx.order.update({
        where: { id: pickup.orderId },
        data: { status: 'DELIVERED' },
      });
    }

    return tx.pickup.findUnique({
      where: { id: pickupId },
      include: { order: true, claim: true },
    });
  });
}

module.exports = { getAvailablePickups, claimPickup, markPickedUp, markDelivered };
