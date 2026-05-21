const { prisma } = require('../config/database');

async function create(userId, inventoryId) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.inventory.findUnique({
      where: { id: inventoryId },
    });

    if (!item) {
      throw new Error('Item not available');
    }

    const available = Number(item.quantity) - Number(item.reservedQty);
    const purchasableStates = ['FRESH', 'DISCOUNTED'];

    if (!purchasableStates.includes(item.state) || available <= 0) {
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
        totalPrice: item.currentPrice,
        reservedUntil,
      },
    });

    await tx.auditLog.create({
      data: {
        entity: 'Order',
        entityId: order.id,
        action: 'STATUS_CHANGE',
        field: 'status',
        oldValue: null,
        newValue: 'PENDING',
        changedBy: userId,
      },
    });

    return order;
  }, {
    isolationLevel: 'Serializable',
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

    await tx.auditLog.create({
      data: {
        entity: 'Order',
        entityId: orderId,
        action: 'STATUS_CHANGE',
        field: 'status',
        oldValue: 'PENDING',
        newValue: 'CONFIRMED',
        changedBy: userId,
      },
    });

    return updated;
  });
}

module.exports = { create, confirm };
