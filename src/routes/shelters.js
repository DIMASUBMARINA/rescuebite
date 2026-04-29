const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const sheltersController = require('../controllers/shelters');

router.get('/available-donations', verifyToken, requireRole('SHELTER'), sheltersController.getAvailableDonations);
router.post('/claims', verifyToken, requireRole('SHELTER'), sheltersController.claimDonation);

module.exports = router;