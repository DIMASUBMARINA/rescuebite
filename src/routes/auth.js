const router = require('express').Router();
const { authLimiter } = require('../middleware/rateLimiter');
const authController = require('../controllers/auth');

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);

module.exports = router;