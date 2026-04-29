const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const driversController = require('../controllers/drivers');

router.get('/available-pickups', verifyToken, requireRole('DRIVER'), driversController.getAvailablePickups);
router.post('/pickups/:id/claim', verifyToken, requireRole('DRIVER'), driversController.claimPickup);
router.post('/pickups/:id/mark-picked-up', verifyToken, requireRole('DRIVER'), driversController.markPickedUp);
router.post('/pickups/:id/mark-delivered', verifyToken, requireRole('DRIVER'), driversController.markDelivered);

module.exports = router;