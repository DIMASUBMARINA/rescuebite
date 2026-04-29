const { prisma } = require('../config/database');

async function findAvailableItems(shelterId, maxDistance = 10) {
  // Get shelter location
  const shelter = await prisma.shelter.findUnique({
    where: { userId },
  });


  if (!shelter) {
    throw new Error('Shelter not found');
  }

  // Find FREE items with Haversine distance
  const items = await prisma.$queryRaw`
    SELECT 
      i.*,
      r.business_name as restaurant_name,
      r.address as restaurant_address,
      r.lat as restaurant_lat,
      r.lon as restaurant_lon,
      6371 * acos(
        cos(radians(${shelter.lat})) * 
        cos(radians(r.lat)) * 
        cos(radians(r.lon) - radians(${shelter.lon})) + 
        sin(radians(${shelter.lat})) * 
        sin(radians(r.lat))
      ) AS distance_km
    FROM inventory i
    JOIN restaurants r ON i.restaurant_id = r.id
    WHERE i.state = 'FREE'
      AND i.quantity > i.reserved_qty
    HAVING distance_km <= ${maxDistance}
    ORDER BY distance_km ASC
  `;

  return items;
}

async function claimItem(userId, inventoryId) {
  return prisma.$transaction(async (tx) => {
    // Find shelter by userId first!
    const shelter = await tx.shelter.findUnique({
      where: { userId },
    });

    if (!shelter) {
      throw new Error('Shelter profile not found');
    }

    const shelterId = shelter.id; // This is the real Shelter ID

    // Lock inventory row
    const item = await tx.inventory.findUnique({
      where: { id: inventoryId },
    });

    if (!item || item.state !== 'FREE') {
      throw new Error('Item not available');
    }

    if (item.quantity <= item.reservedQty) {
      throw new Error('Item already claimed');
    }

    // Check if already claimed
    const existingClaim = await tx.claim.findUnique({
      where: { inventoryId },
    });

    if (existingClaim && existingClaim.status === 'CLAIMED') {
      throw new Error('Item already claimed by another shelter');
    }

    // Reserve inventory
    await tx.inventory.update({
      where: { id: inventoryId },
      data: { reservedQty: { increment: 1 } },
    });

    // Create claim with 30-minute window
    const claim = await tx.claim.create({
      data: {
        inventoryId,
        shelterId, // Now using correct Shelter ID
        status: 'CLAIMED',
        claimedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    // Create pickup task
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