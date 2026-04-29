const ordersService = require('../services/orders');

async function create(req, res, next) {
  try {
    const { inventoryId } = req.body;
    const order = await ordersService.create(req.userId, inventoryId);
    res.status(201).json({
      status: 'success',
      data: order,
      reservationExpires: order.reservedUntil,
    });
  } catch (err) {
    next(err);
  }
}

async function confirm(req, res, next) {
  try {
    const order = await ordersService.confirm(req.params.id, req.userId);
    res.json({ status: 'success', data: order });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, confirm };