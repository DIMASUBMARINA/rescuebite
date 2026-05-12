const cron = require('node-cron');
const { prisma } = require('./database');
const { calculateState, calculatePrice } = require('../services/decayEngine');

function startDecayJob(intervalMinutes = 60) {
  console.log(`Starting decay job (every ${intervalMinutes} minutes)`);
  
  runDecayCycle();
  
  cron.schedule(`*/${intervalMinutes} * * * *`, () => {
    console.log('Running scheduled decay cycle...');
    runDecayCycle();
  });
}

async function runDecayCycle() {
  const now = new Date();
  
  try {
    const items = await prisma.inventory.findMany({
      where: {
        state: { not: 'EXPIRED' },
      },
    });
    
    console.log(`Checking ${items.length} items for state transitions`);
    
    for (const item of items) {
      const newState = calculateState(item, now);
      
      if (newState !== item.state) {
        const newPrice = calculatePrice(item, newState);
        
        await prisma.$transaction(async (tx) => {
          await tx.inventory.update({
            where: { id: item.id },
            data: {
              state: newState,
              currentPrice: newPrice,
            },
          });
          
          await tx.auditLog.create({
            data: {
              entity: 'Inventory',
              entityId: item.id,
              action: 'STATE_CHANGE',
              field: 'state',
              oldValue: item.state,
              newValue: newState,
              changedBy: 'SYSTEM',
            },
          });

          if (newState === 'EXPIRED') {
            await tx.wasteLog.create({
              data: {
                restaurantId: item.restaurantId,
                inventoryId: item.id,
                quantity: item.quantity - item.reservedQty,
                disposalMethod: 'COMPOST',
                loggedAt: now,
              },
            });
          }
        });
        
        console.log(`Item ${item.id}: ${item.state} → ${newState} (price: ${newPrice})`);
      }
    }
  } catch (err) {
    console.error('Decay cycle error:', err);
  }
}

function startTimeoutJobs() {
  cron.schedule('* * * * *', async () => {
    const now = new Date();
    
    const expiredOrders = await prisma.order.findMany({
      where: {
        status: 'PENDING',
        reservedUntil: { lt: now },
      },
    });
    
    for (const order of expiredOrders) {
      await prisma.$transaction(async (tx) => {
        await tx.inventory.update({
          where: { id: order.inventoryId },
          data: { reservedQty: { decrement: 1 } },
        });
        
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'CANCELLED' },
        });
      });
    }
    
    const expiredClaims = await prisma.claim.findMany({
      where: {
        status: 'CLAIMED',
        expiresAt: { lt: now },
      },
    });
    
    for (const claim of expiredClaims) {
      await prisma.$transaction(async (tx) => {
        await tx.inventory.update({
          where: { id: claim.inventoryId },
          data: { 
            state: 'FREE',
            reservedQty: { decrement: 1 } 
          },
        });
        
        await tx.claim.update({
          where: { id: claim.id },
          data: { status: 'EXPIRED' },
        });

        await tx.pickup.updateMany({
          where: { claimId: claim.id },
          data: { status: 'CANCELLED' },
        });
      });
    }

    const expiredPickups = await prisma.pickup.findMany({
      where: {
        status: 'ASSIGNED',
        assignedAt: { lt: new Date(now.getTime() - 15 * 60 * 1000) },
      },
    });

    for (const pickup of expiredPickups) {
      await prisma.pickup.update({
        where: { id: pickup.id },
        data: {
          status: 'UNASSIGNED',
          driverId: null,
          assignedAt: null,
        },
      });
    }
  });
}

module.exports = { startDecayJob, startTimeoutJobs };