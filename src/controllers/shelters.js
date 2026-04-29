const sheltersService = require('../services/shelters');

async function getAvailableDonations(req, res, next) {
  try {
    const items = await sheltersService.findAvailableItems(req.userId);
    res.json({ status: 'success', data: items });
  } catch (err) {
    next(err);
  }
}

async function claimDonation(req, res, next) {
  try {
    const { inventoryId } = req.body;
    // req.userId is from JWT (User ID), service will find Shelter ID
    const claim = await sheltersService.claimItem(req.userId, inventoryId);
    res.status(201).json({
      status: 'success',
      data: claim,
      claimExpiresAt: claim.expiresAt,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAvailableDonations, claimDonation };