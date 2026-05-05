const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { restaurantSchema, shelterSchema, driverSchema } = require('../validators/profile');
const profileController = require('../controllers/profile');
const { z } = require('zod');

// Dynamic validation based on role would need middleware, but for simplicity:
// We'll validate in the controller or use a union schema

// Actually, let's use a simple approach - validate all possible fields
const profileSchema = z.object({
  businessName: z.string().optional(),
  shelterName: z.string().optional(),
  charityRegNo: z.string().optional(),
  address: z.string().optional(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  licenseNo: z.string().optional(),
  vehiclePlate: z.string().optional(),
}).refine((data) => {
  // At least one profile-specific field must be present
  return data.businessName || data.shelterName || data.licenseNo;
}, { message: 'Profile data required' });

router.post('/create-profile', verifyToken, profileController.createProfile);

module.exports = router;