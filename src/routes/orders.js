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
router.post('/:id/pay', verifyToken, requireRole('CONSUMER'), ordersController.pay);
router.post('/:id/cancel', verifyToken, requireRole('CONSUMER'), ordersController.cancel);
router.post('/:id/picked-up', verifyToken, requireRole('CONSUMER'), ordersController.markPickedUpByConsumer);
router.get('/my-orders', verifyToken, requireRole('CONSUMER'), ordersController.listByConsumer);  

router.get('/my-restaurant-orders', verifyToken, requireRole('RESTAURANT'), ordersController.listByRestaurant);
router.post('/:id/confirm', verifyToken, requireRole('RESTAURANT'), ordersController.confirmByRestaurant);
router.post('/:id/ready', verifyToken, requireRole('RESTAURANT'), ordersController.markReady);

module.exports = router;