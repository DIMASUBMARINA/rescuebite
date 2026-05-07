const { prisma } = require('../config/database');

const VALID_STATES = ['FRESH', 'DISCOUNTED', 'FREE', 'EXPIRED'];

async function list({ state, page, perPage }) {
  const where = {};
  if (state && VALID_STATES.includes(state)) {
    where.state = state;
  }

  const [items, total] = await Promise.all([
    prisma.inventory.findMany({
      where,
      skip: (page - 1) * perPage,
      take: perPage,
      orderBy: { createdAt: 'desc' },
      include: { restaurant: { select: { businessName: true, lat: true, lon: true } } },
    }),
    prisma.inventory.count({ where }),
  ]);

  return {
    items,
    meta: {
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    },
  };
}

async function create(userId, data) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { userId },
  });

  if (!restaurant) {
    throw new Error('Restaurant profile not found');
  }

  const expiresAt = new Date(data.expiresAt);
  const now = new Date();
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  if (expiresAt < twoHoursLater) {
    throw new Error('Expiration must be at least 2 hours from now');
  }

  return prisma.inventory.create({
    data: {
      restaurantId: restaurant.id,
      name: data.name,
      description: data.description,
      originalPrice: data.originalPrice,
      currentPrice: data.originalPrice,
      quantity: data.quantity,
      expiresAt,
      ingredients: data.ingredients,
      allergens: data.allergens || [],
    },
  });
}

async function update(id, userId, data) {
  const restaurant = await prisma.restaurant.findUnique({ where: { userId } });
  const item = await prisma.inventory.findUnique({ where: { id } });

  if (!item || item.restaurantId !== restaurant.id) {
    throw new Error('Item not found or not owned by you');
  }

  if (item.state !== 'FRESH') {
    throw new Error('Can only edit items in FRESH state');
  }

  return prisma.inventory.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      originalPrice: data.originalPrice,
      quantity: data.quantity,
      ingredients: data.ingredients,
      allergens: data.allergens,
    },
  });
}

async function remove(id, userId) {
  const restaurant = await prisma.restaurant.findUnique({ where: { userId } });
  const item = await prisma.inventory.findUnique({
    where: { id },
    include: { order: true, claim: true },
  });

  if (!item || item.restaurantId !== restaurant.id) {
    throw new Error('Item not found or not owned by you');
  }

  if (item.order || item.claim) {
    throw new Error('Cannot delete item with active orders or claims');
  }

  await prisma.inventory.delete({ where: { id } });
}


module.exports = { list, create, update, remove };