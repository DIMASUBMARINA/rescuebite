const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const { env } = require('../config/env');

async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'error', message: 'No token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, isSuspended: true },
    });

    if (!user) {
      return res.status(401).json({ status: 'error', message: 'User not found' });
    }

    if (user.isSuspended) {
      return res.status(403).json({ 
        status: 'error', 
        code: 'ACCOUNT_SUSPENDED',
        message: 'Your account has been suspended. Contact admin.' 
      });
    }

    req.userId = user.id;
    req.userRole = user.role;
    next();
  } catch (err) {
    return res.status(401).json({ status: 'error', message: 'Invalid or expired token' });
  }
}

module.exports = { verifyToken };