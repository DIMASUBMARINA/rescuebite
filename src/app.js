const express = require('express');
const { env } = require('./config/env');
const { prisma } = require('./config/database');
const authRoutes = require('./routes/auth');  // ADD THIS LINE
const { verifyToken } = require('./middleware/auth');
const userRoutes = require('./routes/users');
const inventoryRoutes = require('./routes/inventory');
const { startDecayJob, startTimeoutJobs } = require('./config/jobs');
const orderRoutes = require('./routes/orders');
const { calculateState, calculatePrice, getTimeInfo } = require('./services/decayEngine');
const shelterRoutes = require('./routes/shelters');
const driverRoutes = require('./routes/drivers');

const app = express();

app.use(express.json());
app.use('/api/orders', orderRoutes);
app.use('/api/shelters', shelterRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/auth', authRoutes);  // NOW authRoutes is defined
app.use('/api/users', userRoutes);

app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected', env: env.NODE_ENV });
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

app.get('/api/test/decay/:id', async (req, res) => {
  const item = await prisma.inventory.findUnique({
    where: { id: req.params.id },
  });
  
  const now = new Date();
  const future = new Date(item.expiresAt);
  future.setHours(future.getHours() - 2); // Simulate 2 hours before expiry
  
  const state = calculateState(item, future);
  const price = calculatePrice(item, state);
  const info = getTimeInfo(item, future);
  
  res.json({
    item: {
      name: item.name,
      createdAt: item.createdAt,
      expiresAt: item.expiresAt,
    },
    simulatedTime: future,
    calculatedState: state,
    calculatedPrice: price,
    timeInfo: info,
  });
});

if (env.NODE_ENV !== 'test') {
  startDecayJob(60);    // Every 60 minutes
  startTimeoutJobs();    // Every minute
}

app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
});

module.exports = { app };