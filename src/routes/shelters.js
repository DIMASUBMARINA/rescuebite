const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const sheltersController = require('../controllers/shelters');

router.get('/available-donations', verifyToken, requireRole('SHELTER'), sheltersController.getAvailableDonations);
router.post('/claims', verifyToken, requireRole('SHELTER'), sheltersController.claimDonation);
router.get('/my-claims', verifyToken, requireRole('SHELTER'), sheltersController.getMyClaims); // ADD THIS
router.post('/claims/:id/confirm-receipt', verifyToken, requireRole('SHELTER'), sheltersController.confirmReceipt);

module.exports = router;