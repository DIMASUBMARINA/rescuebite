const { env } = require('../config/env');

function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.name === 'ZodError') {
    const issues = err.issues || err.errors || [];
    return res.status(422).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: 'Invalid request data',
      errors: issues.map(e => ({ 
        path: e.path || [], 
        message: e.message 
      })),
    });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({
      status: 'error',
      code: 'CONFLICT',
      message: 'Resource already exists',
      field: err.meta?.target?.[0],
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      status: 'error',
      code: 'NOT_FOUND',
      message: err.message || 'Resource not found',
    });
  }

  if (err.code === 'P2003') {
    return res.status(400).json({
      status: 'error',
      code: 'INVALID_REFERENCE',
      message: 'Referenced resource does not exist',
    });
  }

  if (err.message) {
    const statusMap = {
      'Email already exists': 409,
      'Invalid credentials': 401,
      'Authentication required': 401,
      'Insufficient permissions': 403,
      'Item not found': 404,
      'Order not found': 404,
      'Restaurant profile not found': 404,
      'Shelter profile not found': 404,
      'Shelter not found': 404,
      'Pickup not available': 409,
      'Item not available': 409,
      'Item already claimed': 409,
      'Cannot delete item with active orders or claims': 409,
      'Can only edit items in FRESH state': 422,
      'Expiration must be at least 2 hours from now': 422,
      'Reservation expired': 410,
      'Not authorized': 403,
      'Invalid status': 422,
      'SAFETY BLOCK': 400,
      'Restaurant profile already exists': 409,
      'Shelter profile already exists': 409,
      'Driver profile already exists': 409,
    };

    for (const [msg, status] of Object.entries(statusMap)) {
      if (err.message.includes(msg)) {
        return res.status(status).json({
          status: 'error',
          message: err.message,
        });
      }
    }
  }

  res.status(500).json({
    status: 'error',
    code: 'INTERNAL_ERROR',
    message: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    ...(env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

module.exports = { errorHandler };