const { prisma } = require('../config/database');

async function create(userId, inventoryId) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw`
      SELECT * FROM inventory
      WHERE id = ${inventoryId}
      FOR UPDATE
    `;

    if (!rows || rows.length === 0) {
      throw new Error('Item not available');
    }

    const item = rows[0];
    const available = Number(item.quantity) - Number(item.reserved_qty);
    
    // Handle possible case variations from raw query
    const itemState = String(item.state).toUpperCase();
    const purchasableStates = ['FRESH', 'DISCOUNTED'];
    
    if (!purchasableStates.includes(itemState) || available <= 0) {
      throw new Error('Item not available');
    }

    await tx.inventory.update({
      where: { id: inventoryId },
      data: { reservedQty: { increment: 1 } },
    });

    const reservedUntil = new Date(Date.now() + 10 * 60 * 1000);

    const order = await tx.order.create({
      data: {
        userId,
        inventoryId,
        status: 'PENDING',
        totalPrice: item.current_price,
        reservedUntil,
      },
    });

    return order;
  });
}

async function confirm(orderId, userId) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { inventory: true },
    });

    if (!order || order.userId !== userId) {
      throw new Error('Order not found');
    }

    if (order.status !== 'PENDING') {
      throw new Error('Order not pending');
    }

    if (order.reservedUntil < new Date()) {
      throw new Error('Reservation expired');
    }

    await tx.inventory.update({
      where: { id: order.inventoryId },
      data: {
        quantity: { decrement: 1 },
        reservedQty: { decrement: 1 },
      },
    });

    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: 'CONFIRMED' },
    });

    return updated;
  });
}

module.exports = { create, confirm };