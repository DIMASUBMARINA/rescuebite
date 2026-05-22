const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validate } = require('../middleware/validation');
const { z } = require('zod');
const adminController = require('../controllers/admin');
const { getPendingDocuments, reviewDocument } = require('../services/verification');


const overrideSchema = z.object({
  state: z.enum(['FRESH', 'DISCOUNTED', 'FREE', 'EXPIRED']),
  reason: z.string().min(1, 'Reason is required'),
});

router.get('/verification/pending', verifyToken, requireRole('ADMIN'), async (req, res) => {
  const docs = await getPendingDocuments();
  res.json({ status: 'success', data: docs });
});

router.post('/verification/:id/review', verifyToken, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { status, note } = req.body; 
    
    const doc = await reviewDocument(req.params.id, req.userId, status, note);
    
    res.json({
      status: 'success',
      message: `Document ${status.toLowerCase()}`,
      data: doc,
    });
  } catch (err) {
    next(err);
  }
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