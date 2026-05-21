const rateLimit = require('express-rate-limit');
const { env } = require('../config/env');

const authLimiter = env.NODE_ENV === 'test' 
  ? (req, res, next) => next() 
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 20,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        status: 'error',
        code: 'RATE_LIMITED',
        message: 'Too many attempts, please try again later.',
      },
    });

module.exports = { authLimiter };