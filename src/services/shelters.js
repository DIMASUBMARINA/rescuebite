const { prisma } = require('../config/database');
const { calculateDistance } = require('../utils/haversine');

async function findAvailableItems(userId, maxDistance = 10) {
  const shelter = await prisma.shelter.findUnique({
    where: { userId },
  });

  if (!shelter) {
    throw new Error('Shelter profile not found');
  }

  const items = await prisma.inventory.findMany({
    where: {
      state: 'FREE',
      quantity: { gt: prisma.inventory.fields.reservedQty },
    },
    include: {
      restaurant: {
        select: {
          businessName: true,
          address: true,
          lat: true,
          lon: true,
        },
      },
    },
  });

  const itemsWithDistance = items
    .map(item => {
      const distance = calculateDistance(
        Number(shelter.lat),
        Number(shelter.lon),
        Number(item.restaurant.lat),
        Number(item.restaurant.lon)
      );
      return { ...item, distance_km: distance };
    })
    .filter(item => item.distance_km <= maxDistance)
    .sort((a, b) => a.distance_km - b.distance_km);

  return itemsWithDistance;
}

async function claimItem(userId, inventoryId) {
  return prisma.$transaction(async (tx) => {
    const shelter = await tx.shelter.findUnique({
      where: { userId },
    });

    if (!shelter) {
      throw new Error('Shelter profile not found');
    }

    const shelterId = shelter.id;

    const item = await tx.inventory.findUnique({
      where: { id: inventoryId },
    });

    if (!item) {
      throw new Error('Item not available');
    }

    if (item.state !== 'FREE') {
      throw new Error('Item not available');
    }

    if (item.quantity <= item.reservedQty) {
      throw new Error('Item already claimed');
    }

    const existingClaim = await tx.claim.findUnique({
      where: { inventoryId },
    });

    if (existingClaim && existingClaim.status === 'CLAIMED') {
      throw new Error('Item already claimed by another shelter');
    }

    await tx.inventory.update({
      where: { id: inventoryId },
      data: { reservedQty: { increment: 1 } },
    });

    const claim = await tx.claim.create({
      data: {
        inventoryId,
        shelterId,
        status: 'CLAIMED',
        claimedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    await tx.pickup.create({
      data: {
        claimId: claim.id,
        status: 'UNASSIGNED',
      },
    });

    return claim;
  }, {
    isolationLevel: 'Serializable',
  });
}

module.exports = { findAvailableItems, claimItem };