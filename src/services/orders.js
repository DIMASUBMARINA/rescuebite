const { prisma } = require('../config/database');

async function create(userId, inventoryId) {
  return prisma.$transaction(async (tx) => {
    // Lock inventory row
    const item = await tx.inventory.findUnique({
      where: { id: inventoryId },
    });

    if (!item || item.state !== 'DISCOUNTED' || item.quantity <= item.reservedQty) {
      throw new Error('Item not available');
    }

    // Reserve inventory
    await tx.inventory.update({
      where: { id: inventoryId },
      data: { reservedQty: { increment: 1 } },
    });

    // Create order with 10-minute reservation
    const reservedUntil = new Date(Date.now() + 10 * 60 * 1000);

    const order = await tx.order.create({
      data: {
        userId,
        inventoryId,
        status: 'PENDING',
        totalPrice: item.currentPrice,
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

    // Finalize order
    await tx.inventory.update({
      where: { id: order.inventoryId },
      data: {
        quantity: { decrement: 1 },
        reservedQty: { decrement: 1 },
      },
    });

    await tx.order.update({
      where: { id: orderId },
      data: { status: 'CONFIRMED' },
    });

    return { ...order, status: 'CONFIRMED' };
  });
}

module.exports = { create, confirm };