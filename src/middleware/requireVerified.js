const { prisma } = require('../config/database');

/**
 * Middleware that blocks requests from users whose email is not yet verified.
 * Must be used AFTER verifyToken.
 */
async function requireVerified(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { isVerified: true },
    });

    if (!user || !user.isVerified) {
      return res.status(403).json({
        status: 'error',
        message: 'Email not verified. Please verify your email address to continue.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireVerified };
