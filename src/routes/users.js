const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const usersController = require('../controllers/users');

router.get('/me', verifyToken, usersController.getProfile);
router.patch('/me', verifyToken, usersController.updateProfile);
router.get('/me/allergies', verifyToken, usersController.getAllergies);
router.put('/me/allergies', verifyToken, usersController.updateAllergies);

module.exports = router;