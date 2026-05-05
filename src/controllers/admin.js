const adminService = require('../services/admin');

async function overrideState(req, res, next) {
  try {
    const { id } = req.params;
    const { state, reason } = req.body;
    
    const result = await adminService.overrideInventoryState(
      id,
      state,
      reason,
      req.userId,
      req.ip
    );

    res.json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { overrideState };