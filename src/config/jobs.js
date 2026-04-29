const cron = require('node-cron');
const { prisma } = require('./database');
const { calculateState, calculatePrice } = require('../services/decayEngine');

function startDecayJob(intervalMinutes = 60) {
  console.log(`Starting decay job (every ${intervalMinutes} minutes)`);
  
  // Run immediately on startup
  runDecayCycle();
  
  // Schedule recurring runs
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
          // Update inventory
          await tx.inventory.update({
            where: { id: item.id },
            data: {
              state: newState,
              currentPrice: newPrice,
            },
          });
          
          // Log to audit
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
        });
        
        console.log(`Item ${item.id}: ${item.state} → ${newState} (price: ${newPrice})`);
      }
    }
  } catch (err) {
    console.error('Decay cycle error:', err);
  }
}

function startTimeoutJobs() {
  // Check expired reservations every minute
  cron.schedule('* * * * *', async () => {
    const now = new Date();
    
    // Release expired order reservations
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
    
    // Check expired shelter claims
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
          data: { state: 'FREE' },
        });
        
        await tx.claim.update({
          where: { id: claim.id },
          data: { status: 'EXPIRED' },
        });
      });
    }
  });
}

module.exports = { startDecayJob, startTimeoutJobs };