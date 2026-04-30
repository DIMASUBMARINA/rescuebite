const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const { env } = require('./config/env');
const { prisma } = require('./config/database');
const { startDecayJob, startTimeoutJobs } = require('./config/jobs');
const { errorHandler } = require('./middleware/errorHandler');
const apiRoutes = require('./routes');

const app = express();

const { calculateState, calculatePrice, getTimeInfo } = require('./services/decayEngine');

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

// CORS — no wildcard in production
app.use(cors({
  origin: env.NODE_ENV === 'production' ? process.env.ALLOWED_ORIGINS?.split(',') || [] : '*',
  credentials: true,
}));

app.use(express.json());

// Swagger UI
const swaggerDocument = YAML.load(path.join(__dirname, '../openapi.yaml'));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Mount all API routes under /api/v1
app.use('/api/v1', apiRoutes);

// Health check
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected', env: env.NODE_ENV });
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ status: 'error', code: 'NOT_FOUND', message: 'Endpoint not found' });
});

// Global error handler — MUST be last
app.use(errorHandler);

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

if (env.NODE_ENV !== 'test') {
  startDecayJob(60);
  startTimeoutJobs();
  app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
  });
}

module.exports = { app };