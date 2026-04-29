const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { allergyCheck } = require('../middleware/allergyCheck');
const ordersController = require('../controllers/orders');

router.post('/', verifyToken, requireRole('CONSUMER'), allergyCheck, ordersController.create);
router.post('/:id/confirm', verifyToken, requireRole('CONSUMER'), ordersController.confirm);

module.exports = router;