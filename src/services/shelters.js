const { prisma } = require('../config/database');
const { calculateDistance } = require('../utils/haversine');
const { queueEmail } = require('./email');

async function notifySheltersOfFreeItems(freeItems) {
  const shelters = await prisma.shelter.findMany({
    where: { isVerified: true },
    include: { user: true },
  });

  for (const shelter of shelters) {
    const nearbyItems = freeItems.filter(item => {
      const distance = calculateDistance(
        Number(shelter.lat), Number(shelter.lon),
        Number(item.restaurant.lat), Number(item.restaurant.lon)
      );
      return distance <= 10;
    });

    if (nearbyItems.length === 0) continue;

    await queueEmail({
      to: shelter.user.email,
      template: 'DONATION_ALERT',
      subject: '🍽️ Free food available near you!',
      data: {
        items: nearbyItems.map(item => ({
          name: item.name,
          quantity: item.quantity - item.reservedQty,
          restaurantName: item.restaurant.businessName,
          distance: calculateDistance(
            Number(shelter.lat), Number(shelter.lon),
            Number(item.restaurant.lat), Number(item.restaurant.lon)
          ).toFixed(1),
        })),
        shelterName: shelter.shelterName,
        claimDeadline: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
  }
}

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
    .filter(item => item.quantity > item.reservedQty)
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

async function confirmReceipt(userId, claimId) {
  const shelter = await prisma.shelter.findUnique({
    where: { userId },
  });

  if (!shelter) {
    throw new Error('Shelter profile not found');
  }

  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    include: { pickup: true },
  });

  if (!claim) {
    throw new Error('Claim not found');
  }

  if (claim.shelterId !== shelter.id) {
    throw new Error('Not authorized');
  }

  if (!claim.pickup) {
    throw new Error('No pickup associated with this claim');
  }

  if (claim.pickup.status !== 'DELIVERED') {
    throw new Error('Delivery not yet marked as delivered by driver');
  }

  return prisma.$transaction(async (tx) => {
    const pickup = await tx.pickup.update({
      where: { id: claim.pickup.id },
      data: { status: 'COMPLETED' },
    });

    await tx.auditLog.create({
      data: {
        entity: 'Pickup',
        entityId: pickup.id,
        action: 'RECEIPT_CONFIRMED',
        field: 'status',
        oldValue: 'DELIVERED',
        newValue: 'COMPLETED',
        changedBy: userId,
      },
    });

    return pickup;
  });
}

module.exports = { findAvailableItems, claimItem, confirmReceipt, notifySheltersOfFreeItems };
