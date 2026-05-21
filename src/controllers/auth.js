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

async function verifyEmail(req, res, next) {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ status: 'error', message: 'Verification token is required' });
    }
    const result = await authService.verifyEmail(token);
    res.json({ status: 'success', data: result, message: 'Email verified successfully' });
  } catch (err) {
    next(err);
  }
}

async function resendVerification(req, res, next) {
  try {
    const result = await authService.resendVerificationEmail(req.userId);
    res.json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, logout, refresh, verifyEmail, resendVerification };
