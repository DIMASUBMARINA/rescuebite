const { z } = require('zod');

const createOrderSchema = z.object({
  inventoryId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(10).default(1),  
  deliveryAddress: z.string().optional(),
  deliveryLat: z.coerce.number().min(-90).max(90).optional(),   
  deliveryLon: z.coerce.number().min(-180).max(180).optional(), 
}).refine((data) => {
  if (data.deliveryAddress) {
    return data.deliveryLat !== undefined && data.deliveryLon !== undefined;
  }
  return true;
}, { message: 'Delivery lat/lon required when address provided' });

module.exports = { createOrderSchema };