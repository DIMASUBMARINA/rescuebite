const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validate } = require('../middleware/validation');
const { z } = require('zod');

// Validation schemas
const restaurantSchema = z.object({
  businessName: z.string().min(1),
  address: z.string().min(1),
  lat: z.number(),
  lon: z.number(),
});

const shelterSchema = z.object({
  shelterName: z.string().min(1),
  charityRegNo: z.string().optional(),
  address: z.string().min(1),
  lat: z.number(),
  lon: z.number(),
});

const driverSchema = z.object({
  licenseNo: z.string().min(1),
  vehiclePlate: z.string().min(1),
});

// Controllers inline (simple, no separate files needed)
const { prisma } = require('../config/database');

router.post(
  '/restaurant',
  verifyToken,
  requireRole('RESTAURANT'),
  validate(restaurantSchema),
  async (req, res, next) => {
    try {
      const existing = await prisma.restaurant.findUnique({ where: { userId: req.userId } });
      if (existing) throw new Error('Restaurant profile already exists');

      const profile = await prisma.restaurant.create({
        data: {
          userId: req.userId,
          businessName: req.body.businessName,
          address: req.body.address,
          lat: req.body.lat,
          lon: req.body.lon,
          isVerified: false,
        },
      });
      res.status(201).json({ status: 'success', data: profile });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/shelter',
  verifyToken,
  requireRole('SHELTER'),
  validate(shelterSchema),
  async (req, res, next) => {
    try {
      const existing = await prisma.shelter.findUnique({ where: { userId: req.userId } });
      if (existing) throw new Error('Shelter profile already exists');

      const profile = await prisma.shelter.create({
        data: {
          userId: req.userId,
          shelterName: req.body.shelterName,
          charityRegNo: req.body.charityRegNo || null,
          address: req.body.address,
          lat: req.body.lat,
          lon: req.body.lon,
          isVerified: false,
        },
      });
      res.status(201).json({ status: 'success', data: profile });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/driver',
  verifyToken,
  requireRole('DRIVER'),
  validate(driverSchema),
  async (req, res, next) => {
    try {
      const existing = await prisma.driver.findUnique({ where: { userId: req.userId } });
      if (existing) throw new Error('Driver profile already exists');

      const profile = await prisma.driver.create({
        data: {
          userId: req.userId,
          licenseNo: req.body.licenseNo,
          vehiclePlate: req.body.vehiclePlate,
          isActive: true,
        },
      });
      res.status(201).json({ status: 'success', data: profile });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;