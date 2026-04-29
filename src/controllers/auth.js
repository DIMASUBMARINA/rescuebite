const authService = require('../services/auth');

async function register(req, res, next) {
  try {
    const { email, password, role, phone } = req.body;
    const result = await authService.register(email, password, role, phone);
    res.status(201).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken);
    res.json({ status: 'success', message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshAccessToken(refreshToken);
    res.json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, logout, refresh };