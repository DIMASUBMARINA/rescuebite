const { prisma } = require('../config/database');

async function findAvailableItems(userId, maxDistance = 10) {
  const shelter = await prisma.shelter.findUnique({
    where: { userId },
  });

  if (!shelter) {
    throw new Error('Shelter profile not found');
  }

  const items = await prisma.$queryRaw`
    SELECT * FROM (
      SELECT 
        i.*,
        r.business_name as restaurant_name,
        r.address as restaurant_address,
        r.lat as restaurant_lat,
        r.lon as restaurant_lon,
        6371 * acos(
          cos(radians(${shelter.lat}::numeric)) * 
          cos(radians(r.lat::numeric)) * 
          cos(radians(r.lon::numeric) - radians(${shelter.lon}::numeric)) + 
          sin(radians(${shelter.lat}::numeric)) * 
          sin(radians(r.lat::numeric))
        ) AS distance_km
      FROM inventory i
      JOIN restaurants r ON i.restaurant_id = r.id
      WHERE i.state = 'FREE'
        AND i.quantity > i.reserved_qty
    ) sub
    WHERE distance_km <= ${maxDistance}
    ORDER BY distance_km ASC
  `;

  return items;
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

    if (!item || item.state !== 'FREE') {
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
  });
}

module.exports = { findAvailableItems, claimItem };