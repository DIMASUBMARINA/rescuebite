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

async function confirmReceipt(req, res, next) {
  try {
    const pickup = await sheltersService.confirmReceipt(req.userId, req.params.id);
    res.json({ status: 'success', data: pickup });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAvailableDonations, claimDonation, confirmReceipt };
