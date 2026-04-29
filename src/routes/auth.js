const router = require('express').Router();
const { validate } = require('../middleware/validation');
const { authLimiter } = require('../middleware/rateLimiter');
const { registerSchema, loginSchema, refreshSchema } = require('../validators/auth');
const authController = require('../controllers/auth');

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/logout', validate(refreshSchema), authController.logout);
router.post('/refresh', validate(refreshSchema), authController.refresh);

module.exports = router;