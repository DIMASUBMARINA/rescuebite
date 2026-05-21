const adminService = require('../services/admin');

async function listUsers(req, res, next) {
  try {
    const users = await adminService.listUsers();
    res.json({ status: 'success', data: users });
  } catch (err) {
    next(err);
  }
}

async function suspendUser(req, res, next) {
  try {
    const result = await adminService.suspendUser(req.params.id, req.userId, req.ip);
    res.json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

async function unsuspendUser(req, res, next) {
  try {
    const result = await adminService.unsuspendUser(req.params.id, req.userId, req.ip);
    res.json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}


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

module.exports = { overrideState, listUsers, suspendUser, unsuspendUser };