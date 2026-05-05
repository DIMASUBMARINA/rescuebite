const { prisma } = require('../config/database');

async function createRestaurant(userId, data) {
  const existing = await prisma.restaurant.findUnique({ where: { userId } });
  if (existing) throw new Error('Restaurant profile already exists');

  return prisma.restaurant.create({
    data: {
      userId,
      businessName: data.businessName,
      address: data.address,
      lat: data.lat,
      lon: data.lon,
      isVerified: false,
    },
  });
}

async function createShelter(userId, data) {
  const existing = await prisma.shelter.findUnique({ where: { userId } });
  if (existing) throw new Error('Shelter profile already exists');

  return prisma.shelter.create({
    data: {
      userId,
      shelterName: data.shelterName,
      charityRegNo: data.charityRegNo || null,
      address: data.address,
      lat: data.lat,
      lon: data.lon,
      isVerified: false,
    },
  });
}

async function createDriver(userId, data) {
  const existing = await prisma.driver.findUnique({ where: { userId } });
  if (existing) throw new Error('Driver profile already exists');

  return prisma.driver.create({
    data: {
      userId,
      licenseNo: data.licenseNo,
      vehiclePlate: data.vehiclePlate,
      isActive: true,
    },
  });
}

module.exports = { createRestaurant, createShelter, createDriver };