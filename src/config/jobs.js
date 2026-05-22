const cron = require('node-cron');
const { prisma } = require('./database');
const { calculateState, calculatePrice } = require('../services/decayEngine');
const { processQueue } = require('../services/email');

cron.schedule('*/30 * * * * *', async () => {
  try {
    const processed = await processQueue(10);
    if (processed > 0) {
      console.log(`[EMAIL WORKER] Processed ${processed} emails`);
    }
  } catch (err) {
    console.error('[EMAIL WORKER] Error:', err);
  }
});


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

    const newlyFreeItems = [];

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

        if (newState === 'FREE') {
          newlyFreeItems.push({
            ...item,
            state: newState,
            currentPrice: newPrice,
          });
        }

        console.log(`Item ${item.id}: ${item.state} → ${newState} (price: ${newPrice})`);
      }
    }

    if (newlyFreeItems.length > 0) {
      console.log(`Notifying shelters about ${newlyFreeItems.length} newly FREE items...`);
      await notifySheltersOfFreeItems(newlyFreeItems);
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

        await tx.auditLog.create({
          data: {
            entity: 'Order',
            entityId: order.id,
            action: 'STATUS_CHANGE',
            field: 'status',
            oldValue: 'PENDING',
            newValue: 'CANCELLED',
            changedBy: 'SYSTEM',
          },
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
            reservedQty: { decrement: 1 },
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

        await tx.auditLog.create({
          data: {
            entity: 'Claim',
            entityId: claim.id,
            action: 'STATUS_CHANGE',
            field: 'status',
            oldValue: 'CLAIMED',
            newValue: 'EXPIRED',
            changedBy: 'SYSTEM',
          },
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
      await prisma.$transaction(async (tx) => {
        await tx.pickup.update({
          where: { id: pickup.id },
          data: {
            status: 'UNASSIGNED',
            driverId: null,
            assignedAt: null,
          },
        });

        await tx.auditLog.create({
          data: {
            entity: 'Pickup',
            entityId: pickup.id,
            action: 'STATUS_CHANGE',
            field: 'status',
            oldValue: 'ASSIGNED',
            newValue: 'UNASSIGNED',
            changedBy: 'SYSTEM',
          },
        });
      });
    }
    const expiredConsumerPickups = await prisma.pickup.findMany({
      where: {
        status: 'ASSIGNED',
        type: 'CONSUMER_DELIVERY',
        assignedAt: { lt: new Date(now.getTime() - 15 * 60 * 1000) },
      },
      include: { order: true },
    });

    for (const pickup of expiredConsumerPickups) {
      await prisma.$transaction(async (tx) => {
        if (pickup.order) {
          await tx.order.update({
            where: { id: pickup.orderId },
            data: { status: 'PAID' },
          });
        }

        await tx.pickup.update({
          where: { id: pickup.id },
          data: {
            status: 'UNASSIGNED',
            driverId: null,
            assignedAt: null,
          },
        });
      });
    }
  });
}

module.exports = { startDecayJob, startTimeoutJobs };
