const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { allergyCheck } = require('../middleware/allergyCheck');
const { validate } = require('../middleware/validation');
const { createOrderSchema } = require('../validators/orders');
const ordersController = require('../controllers/orders');

router.post(
  '/',
  verifyToken,
  requireRole('CONSUMER'),
  allergyCheck,
  validate(createOrderSchema),
  ordersController.create
);
router.post('/:id/confirm', verifyToken, requireRole('CONSUMER'), ordersController.confirm);
router.post('/:id/cancel', verifyToken, requireRole('CONSUMER'), ordersController.cancel);
router.post('/:id/pay', verifyToken, requireRole('CONSUMER'), ordersController.pay);

module.exports = router;