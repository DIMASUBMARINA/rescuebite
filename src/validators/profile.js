const { z } = require('zod');

const restaurantSchema = z.object({
  businessName: z.string().min(1),
  address: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

const shelterSchema = z.object({
  shelterName: z.string().min(1),
  charityRegNo: z.string().optional(),
  address: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

const driverSchema = z.object({
  licenseNo: z.string().min(1),
  vehiclePlate: z.string().min(1),
});

module.exports = { restaurantSchema, shelterSchema, driverSchema };