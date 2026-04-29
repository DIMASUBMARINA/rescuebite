function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.userRole) {
      return res.status(401).json({ status: 'error', message: 'Authentication required' });
    }
    
    if (!allowedRoles.includes(req.userRole)) {
      return res.status(403).json({ 
        status: 'error', 
        message: 'Insufficient permissions',
        required: allowedRoles,
        current: req.userRole 
      });
    }
    
    next();
  };
}

module.exports = { requireRole };