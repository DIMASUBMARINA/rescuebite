const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validate } = require('../middleware/validation');
const { z } = require('zod');
const adminController = require('../controllers/admin');

const overrideSchema = z.object({
  state: z.enum(['FRESH', 'DISCOUNTED', 'FREE', 'EXPIRED']),
  reason: z.string().min(1, 'Reason is required'),
});

router.post(
  '/inventory/:id/override-state',
  verifyToken,
  requireRole('ADMIN'),
  validate(overrideSchema),
  adminController.overrideState
);
router.get('/users', verifyToken, requireRole('ADMIN'), adminController.listUsers);
router.post('/users/:id/suspend', verifyToken, requireRole('ADMIN'), adminController.suspendUser);
router.post('/users/:id/unsuspend', verifyToken, requireRole('ADMIN'), adminController.unsuspendUser);

module.exports = router;

module.exports = router;