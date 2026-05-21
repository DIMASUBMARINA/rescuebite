const ordersService = require('../services/orders');

async function create(req, res, next) {
  try {
    const { inventoryId, deliveryAddress, deliveryLat, deliveryLon } = req.body;
    
    const deliveryData = deliveryAddress ? {
      address: deliveryAddress,
      lat: deliveryLat,
      lon: deliveryLon,
    } : null;

    const order = await ordersService.create(req.userId, inventoryId, deliveryData);
    
    res.status(201).json({
      status: 'success',
      data: order,
      reservationExpires: order.reservedUntil,
      ...(order.isDelivery && {
        deliveryFee: order.deliveryFee,
        totalWithDelivery: order.totalPrice,
      }),
    });
  } catch (err) {
    next(err);
  }
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

    if (!['PENDING', 'PAID'].includes(order.status)) {
      throw new Error('Order cannot be confirmed');
    }

    if (order.reservedUntil < new Date()) {
      throw new Error('Reservation expired');
    }

    if (order.status === 'PENDING') {
      await tx.inventory.update({
        where: { id: order.inventoryId },
        data: {
          quantity: { decrement: 1 },
          reservedQty: { decrement: 1 },
        },
      });
    }

    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: 'CONFIRMED' },
    });

    return updated;
  });
}

async function cancel(req, res, next) {
  try {
    const order = await ordersService.cancel(req.params.id, req.userId);
    res.json({ status: 'success', data: order });
  } catch (err) {
    next(err);
  }
}

async function pay(req, res, next) {
  try {
    const order = await ordersService.pay(req.params.id, req.userId);
    res.json({ 
      status: 'success', 
      data: order,
      message: 'Mock payment successful. No actual charge processed.' 
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, confirm, cancel, pay };