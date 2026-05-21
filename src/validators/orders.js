const { z } = require('zod');

const createOrderSchema = z.object({
  inventoryId: z.string().uuid(),
  deliveryAddress: z.string().optional(),
  deliveryLat: z.number().min(-90).max(90).optional(),
  deliveryLon: z.number().min(-180).max(180).optional(),
}).refine((data) => {
  if (data.deliveryAddress) {
    return data.deliveryLat !== undefined && data.deliveryLon !== undefined;
  }
  return true;
}, { message: 'Delivery lat/lon required when address provided' });

module.exports = { createOrderSchema };