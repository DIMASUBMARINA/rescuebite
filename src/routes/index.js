const express = require('express');
const authRoutes = require('./auth');
const userRoutes = require('./users');
const inventoryRoutes = require('./inventory');
const orderRoutes = require('./orders');
const shelterRoutes = require('./shelters');
const driverRoutes = require('./drivers');
const adminRoutes = require('./admin');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/orders', orderRoutes);
router.use('/shelters', shelterRoutes);
router.use('/drivers', driverRoutes);
router.use('/admin', adminRoutes);

module.exports = router;