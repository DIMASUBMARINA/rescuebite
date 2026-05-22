require('dotenv').config();
const { notifySheltersOfFreeItems } = require('./src/services/shelters');
const { prisma } = require('./src/config/database');

async function trigger() {
  const freeItems = await prisma.inventory.findMany({
    where: { state: 'FREE' },
    include: { restaurant: true },
  });

  console.log(`Found ${freeItems.length} FREE items`);
  
  if (freeItems.length === 0) return;

  // Check shelters
  const shelters = await prisma.shelter.findMany({
    where: { isVerified: true },
    include: { user: true },
  });
  
  console.log(`Found ${shelters.length} verified shelters`);

  for (const item of freeItems) {
    console.log(`\nItem: ${item.name} at ${item.restaurant.businessName}`);
    console.log(`Restaurant location: ${item.restaurant.lat}, ${item.restaurant.lon}`);
    
    for (const shelter of shelters) {
      const { calculateDistance } = require('./src/utils/haversine');
      const distance = calculateDistance(
        Number(shelter.lat), Number(shelter.lon),
        Number(item.restaurant.lat), Number(item.restaurant.lon)
      );
      console.log(`  → Shelter "${shelter.shelterName}" at ${shelter.lat}, ${shelter.lon}: ${distance.toFixed(2)}km (verified: ${shelter.isVerified})`);
    }
  }

  console.log('\nCalling notifySheltersOfFreeItems...');
  await notifySheltersOfFreeItems(freeItems);
  
  // Check queue
  const queued = await prisma.emailQueue.findMany({
    where: { template: 'DONATION_ALERT' }
  });
  console.log(`\nEmails in queue: ${queued.length}`);
}

trigger().catch(console.error);