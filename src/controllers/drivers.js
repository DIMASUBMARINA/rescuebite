const driversService = require('../services/drivers');

async function getAvailablePickups(req, res, next) {
  try {
    const pickups = await driversService.getAvailablePickups();
    res.json({ status: 'success', data: pickups });
  } catch (err) {
    next(err);
  }
}

async function claimPickup(req, res, next) {
  try {
    const pickup = await driversService.claimPickup(req.params.id, req.userId);
    res.json({
      status: 'success',
      data: pickup,
      mustPickUpBy: new Date(Date.now() + 15 * 60 * 1000),
    });
  } catch (err) {
    next(err);
  }
}

async function markPickedUp(req, res, next) {
  try {
    const pickup = await driversService.markPickedUp(req.params.id, req.userId);
    res.json({ status: 'success', data: pickup });
  } catch (err) {
    next(err);
  }
}

async function markDelivered(req, res, next) {
  try {
    const pickup = await driversService.markDelivered(req.params.id, req.userId);
    res.json({ status: 'success', data: pickup });
  } catch (err) {
    next(err);
  }
}

async function getMyPickups(req, res, next) {
  try {
    const pickups = await driversService.getMyPickups(req.userId);
    res.json({ status: 'success', data: pickups });
  } catch (err) {
    next(err);
  }
}


module.exports = { getAvailablePickups, claimPickup, markPickedUp, markDelivered, getMyPickups };