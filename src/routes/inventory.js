const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const inventoryController = require('../controllers/inventory');

router.get('/', verifyToken, inventoryController.list);
router.post('/', verifyToken, requireRole('RESTAURANT'), inventoryController.create);
router.patch('/:id', verifyToken, requireRole('RESTAURANT'), inventoryController.update);
router.delete('/:id', verifyToken, requireRole('RESTAURANT'), inventoryController.remove);

module.exports = router;