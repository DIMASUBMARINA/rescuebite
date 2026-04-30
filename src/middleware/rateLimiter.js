const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    code: 'RATE_LIMITED',
    message: 'Too many attempts, please try again later.',
  },
});

module.exports = { authLimiter };