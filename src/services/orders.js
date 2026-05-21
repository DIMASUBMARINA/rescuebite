const { prisma } = require('../config/database');
const { calculateDistance } = require('../utils/haversine');

async function create(userId, inventoryId, deliveryData = null) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.inventory.findUnique({
      where: { id: inventoryId },
      include: { restaurant: true },
    });

    if (!item) {
      throw new Error('Item not available');
    }

    const available = Number(item.quantity) - Number(item.reservedQty);
    const purchasableStates = ['FRESH', 'DISCOUNTED'];
    
    if (!purchasableStates.includes(item.state) || available <= 0) {
      throw new Error('Item not available');
    }

    let totalPrice = Number(item.currentPrice);
    let isDelivery = false;
    let deliveryFee = null;
    let deliveryAddress = null;
    let deliveryLat = null;
    let deliveryLon = null;

    if (deliveryData && deliveryData.address) {
      isDelivery = true;
      deliveryAddress = deliveryData.address;
      deliveryLat = deliveryData.lat;
      deliveryLon = deliveryData.lon;

      const distance = calculateDistance(
        Number(item.restaurant.lat),
        Number(item.restaurant.lon),
        deliveryData.lat,
        deliveryLon
      );

      deliveryFee = Math.round(500 + distance * 100);
      totalPrice += deliveryFee;
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
        totalPrice,
        reservedUntil,
        isDelivery,
        deliveryAddress,
        deliveryLat,
        deliveryLon,
        deliveryFee,
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

async function pay(orderId, userId) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
    });

    if (!order || order.userId !== userId) {
      throw new Error('Order not found');
    }

    if (order.status !== 'PENDING') {
      throw new Error('Order not pending payment');
    }

    if (order.reservedUntil < new Date()) {
      throw new Error('Reservation expired');
    }

    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: 'PAID' },
    });

    if (order.isDelivery) {
      await tx.pickup.create({
        data: {
          orderId: order.id,
          type: 'CONSUMER_DELIVERY',
          status: 'UNASSIGNED',
        },
      });
    }

    return updated;
  });
}

async function confirmByRestaurant(orderId, userId) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { inventory: true },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    const restaurant = await tx.restaurant.findUnique({
      where: { userId },
    });

    if (!restaurant || order.inventory.restaurantId !== restaurant.id) {
      throw new Error('Not authorized');
    }

    if (order.status !== 'PAID') {
      throw new Error('Order not paid');
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

async function markReady(orderId, userId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { inventory: true },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { userId },
  });

  if (!restaurant || order.inventory.restaurantId !== restaurant.id) {
    throw new Error('Not authorized');
  }

  if (order.status !== 'CONFIRMED') {
    throw new Error('Order not confirmed');
  }

  return prisma.order.update({
    where: { id: orderId },
    data: { status: 'READY_FOR_PICKUP' },
  });
}

async function markPickedUpByConsumer(orderId, userId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order || order.userId !== userId) {
    throw new Error('Order not found');
  }

  if (order.status !== 'READY_FOR_PICKUP') {
    throw new Error('Order not ready for pickup');
  }

  return prisma.order.update({
    where: { id: orderId },
    data: { status: 'COMPLETED' },
  });
}

async function cancel(orderId, userId) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { inventory: true },
    });

    if (!order || order.userId !== userId) {
      throw new Error('Order not found');
    }

    if (order.status !== 'PENDING') {
      throw new Error('Can only cancel pending orders');
    }

    await tx.inventory.update({
      where: { id: order.inventoryId },
      data: { reservedQty: { decrement: 1 } },
    });

    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    });

    return updated;
  });
}

async function listByRestaurant(userId) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { userId },
  });

  if (!restaurant) {
    throw new Error('Restaurant profile not found');
  }

  return prisma.order.findMany({
    where: {
      inventory: {
        restaurantId: restaurant.id,
      },
    },
    include: {
      user: {
        select: { email: true, phone: true },
      },
      inventory: {
        select: { name: true, originalPrice: true, currentPrice: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function listByConsumer(userId) {
  return prisma.order.findMany({
    where: { userId },
    include: {
      inventory: {
        select: { name: true, originalPrice: true, currentPrice: true, state: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}



module.exports = { create, confirm, cancel, pay, confirmByRestaurant, markReady, markPickedUpByConsumer, listByRestaurant, listByConsumer };
