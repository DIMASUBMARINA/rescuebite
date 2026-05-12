const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { allergyCheck } = require('../middleware/allergyCheck');
const ordersController = require('../controllers/orders');

router.post('/', verifyToken, requireRole('CONSUMER'), allergyCheck, ordersController.create);
router.post('/:id/confirm', verifyToken, requireRole('CONSUMER'), ordersController.confirm);
router.post('/:id/cancel', verifyToken, requireRole('CONSUMER'), ordersController.cancel);

module.exports = router;