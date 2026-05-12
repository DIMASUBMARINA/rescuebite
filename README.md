# RescueBite

Dynamic Food Waste Recovery Platform for Almaty, Kazakhstan.

## Overview

RescueBite addresses the critical issue of food waste in Almaty, where restaurants discard approximately 40kg of edible food nightly. The platform creates a marketplace connecting four key stakeholders:

- **Restaurants** — List surplus food inventory before expiration
- **Consumers** — Purchase "almost-expired" meals at progressive discounts (50% off)
- **Shelters** — Claim free food (0 KZT) during the final 20% of shelf life
- **Drivers** — Volunteer to deliver donated food from restaurants to shelters

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 20 LTS |
| Framework | Express.js | 5.x |
| Database | PostgreSQL | 15+ |
| ORM | Prisma | 6.x |
| Validation | Zod | 4.x |
| Authentication | JWT (jsonwebtoken) | 9.x |
| Scheduler | node-cron | 4.x |
| Testing | Jest + Supertest | 30.x / 7.x |
| Documentation | Swagger UI + YAML | 5.x |

## Prerequisites

- Node.js 20+ installed
- PostgreSQL 15+ running locally or remotely
- npm (comes with Node.js)

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd rescuebite
npm install
```

### 2. Environment Configuration

Create `.env` file from the example template:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```env
DATABASE_URL="postgresql://postgres:123@localhost:5432/rescuebite"
JWT_SECRET="your-32-character-secret-key-here-12345"
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

Create `.env.test` for testing (separate database required):

```env
DATABASE_URL="postgresql://postgres:123@localhost:5432/rescuebite_test"
JWT_SECRET="test-secret-32-characters-long-12345"
PORT=3001
NODE_ENV=test
```

### 3. Database Setup

Run Prisma migrations to create the schema:

```bash
npx prisma migrate dev
npx prisma generate
```

For the test database:

```bash
# Create test database first (via psql or your DB client)
# CREATE DATABASE rescuebite_test;

set DATABASE_URL=postgresql://postgres:123@localhost:5432/rescuebite_test
npx prisma migrate deploy
```

### 4. Start the Server

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm start
```

The API will be available at `http://localhost:3000`

### 5. Access API Documentation

Swagger UI is automatically mounted at:

```
http://localhost:3000/api/docs
```

## Testing

All tests use a dedicated test database and are fully isolated from development data.

```bash
# Run all tests (unit + integration)
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Watch mode for development
npm run test:watch
```

Test results: **47 tests passing** (9 unit + 38 integration)

## Core Features

### 1. Inventory Decay Engine
Time-based state machine running via node-cron every 60 minutes:
```
FRESH (100% price) → DISCOUNTED (50%) → FREE (0 KZT) → EXPIRED
```
Price is calculated dynamically based on remaining shelf life.

### 2. Allergy Safety System (Life-Critical)
- Users declare allergens in their profile
- System blocks any purchase where `intersection(user_allergies, item_allergens)` is non-empty
- Enforced at middleware + service layer with parameterized Prisma queries
- All blocked transactions are audit-logged

### 3. Shelter Matching
- When items become FREE: find nearest verified shelter within 10km
- Uses Haversine formula for straight-line distance calculation
- 30-minute claim window (first-come-first-served)

### 4. Driver Claim System
- Drivers see unassigned pickup tasks
- First-come-first-served with database-level isolation
- 15-minute pickup timeout or returns to pool
- Manual delivery confirmation flow

### 5. Role-Based Access Control (RBAC)
Five distinct roles with middleware-enforced permissions:
- `CONSUMER` — purchase discounted food
- `RESTAURANT` — manage inventory listings
- `SHELTER` — claim free donations
- `DRIVER` — execute deliveries
- `ADMIN` — override inventory states (database-seeded only)

## Project Structure

```
rescuebite-backend/
├── prisma/
│   ├── schema.prisma          # Database models + enums
│   └── migrations/            # Generated migration files
├── src/
│   ├── config/
│   │   ├── env.js             # Strict environment validation (envalid)
│   │   ├── database.js        # PrismaClient singleton
│   │   └── jobs.js            # Cron jobs: decay engine, timeout handlers
│   ├── controllers/
│   │   ├── auth.js            # Register, login, logout, refresh
│   │   ├── users.js           # Profile CRUD, allergy management
│   │   ├── inventory.js       # Listing CRUD
│   │   ├── orders.js          # Purchase flow, confirmation
│   │   ├── shelters.js        # Donation claims
│   │   ├── drivers.js         # Pickup actions
│   │   └── admin.js           # State override
│   ├── middleware/
│   │   ├── auth.js            # JWT verification
│   │   ├── rbac.js            # Role requirement enforcement
│   │   ├── validation.js      # Zod schema wrapper
│   │   ├── allergyCheck.js    # Allergy safety block
│   │   ├── rateLimiter.js     # Auth endpoint rate limiting
│   │   └── errorHandler.js    # Standardized error responses
│   ├── routes/
│   │   ├── index.js           # Mounts all routes to /api/v1/*
│   │   ├── auth.js            # /auth/*
│   │   ├── users.js           # /users/*
│   │   ├── inventory.js       # /inventory/*
│   │   ├── orders.js          # /orders/*
│   │   ├── shelters.js        # /shelters/*
│   │   ├── drivers.js         # /drivers/*
│   │   ├── admin.js           # /admin/*
│   │   └── profile.js         # /profile/* (role-specific profile creation)
│   ├── services/
│   │   ├── auth.js            # Bcrypt + JWT logic
│   │   ├── users.js           # User CRUD, allergies
│   │   ├── inventory.js       # Listing logic
│   │   ├── orders.js          # Order creation with serializable transactions
│   │   ├── decayEngine.js     # Pure functions: calculateState, calculatePrice
│   │   ├── allergyGuard.js    # Pure function: checkAllergies
│   │   ├── shelters.js        # Haversine matching, claim processing
│   │   ├── drivers.js         # Pickup assignment
│   │   ├── pickups.js         # Pickup task management
│   │   ├── auditLogger.js     # Append-only audit log creation
│   │   └── admin.js           # State override logic
│   ├── utils/
│   │   ├── stateMachine.js    # State config: thresholds, multipliers
│   │   ├── haversine.js       # Distance calculation (km)
│   │   └── helpers.js         # Date utilities
│   └── app.js                 # Express init, middleware stack, route mounting
├── tests/
│   ├── unit/
│   │   ├── decayEngine.test.js
│   │   ├── allergyGuard.test.js
│   │   └── stateMachine.test.js
│   ├── integration/
│   │   ├── auth.test.js
│   │   ├── inventory.test.js
│   │   └── orders.test.js
│   └── setup.js               # Global test setup
├── .github/
│   └── workflows/
│       └── ci.yml             # GitHub Actions CI pipeline
├── openapi.yaml               # Swagger/OpenAPI specification
├── jest.config.js             # Jest configuration
├── .env.example               # Committed template with fake values
├── .env.test                  # Test configuration (gitignored)
├── .gitignore
├── package.json
└── README.md                  # This file
```

## API Endpoints

### Authentication
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/register` | `{email, password, role, phone?}` | Create account (role: CONSUMER, RESTAURANT, SHELTER, DRIVER) |
| POST | `/api/v1/auth/login` | `{email, password}` | Authenticate, receive tokens |
| POST | `/api/v1/auth/refresh` | `{refreshToken}` | Exchange refresh for new access token |
| POST | `/api/v1/auth/logout` | `{refreshToken}` | Revoke refresh token |

### Profile Management
| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/api/v1/profile/restaurant` | Bearer | RESTAURANT | Create restaurant profile |
| POST | `/api/v1/profile/shelter` | Bearer | SHELTER | Create shelter profile |
| POST | `/api/v1/profile/driver` | Bearer | DRIVER | Create driver profile |

### Core Business Logic
| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/api/v1/inventory` | Bearer | Any | List items (filter by state, paginated) |
| POST | `/api/v1/inventory` | Bearer | RESTAURANT | Create food listing |
| PATCH | `/api/v1/inventory/:id` | Bearer | RESTAURANT | Edit item (FRESH only) |
| DELETE | `/api/v1/inventory/:id` | Bearer | RESTAURANT | Delete item (no active orders) |
| POST | `/api/v1/orders` | Bearer | CONSUMER | Purchase item (allergy check enforced) |
| POST | `/api/v1/orders/:id/confirm` | Bearer | CONSUMER | Confirm purchase |
| GET | `/api/v1/shelters/available-donations` | Bearer | SHELTER | See FREE items within 10km |
| POST | `/api/v1/shelters/claims` | Bearer | SHELTER | Claim free food |
| GET | `/api/v1/drivers/available-pickups` | Bearer | DRIVER | See unassigned deliveries |
| POST | `/api/v1/drivers/pickups/:id/claim` | Bearer | DRIVER | Take delivery job |
| POST | `/api/v1/drivers/pickups/:id/mark-picked-up` | Bearer | DRIVER | Confirm collection |
| POST | `/api/v1/drivers/pickups/:id/mark-delivered` | Bearer | DRIVER | Confirm delivery |
| POST | `/api/v1/admin/inventory/:id/override-state` | Bearer | ADMIN | Override item state |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_SECRET` | Yes | — | 32+ character secret for JWT signing |
| `PORT` | No | 3000 | HTTP server port |
| `NODE_ENV` | No | development | Environment: development, test, production |
| `ALLOWED_ORIGINS` | No | * | CORS origins (comma-separated, no wildcard in prod) |

## Business Rules

| Rule | Description |
|------|-------------|
| R1 | Cannot purchase if allergens match |
| R2 | Can only edit inventory in FRESH state |
| R3 | Cannot delete if active orders/claims exist |
| R4 | Shelter claim window: 30 minutes |
| R5 | Driver pickup timeout: 15 minutes |
| R6 | Order reservation hold: 10 minutes |
| R7 | Expiration must be >= 2 hours from creation |
| R8 | Price floor at 0, no negatives |
| R9 | Quantity cannot go negative (serializable transactions) |
| R10 | Simultaneous claims use serializable isolation |
| R11 | All state transitions logged in AuditLog |

## Kazakhstan Context

- Aligns with **Environmental Code Article 351** (food waste landfill ban, 2021)
- **Kaspi.kz** would be the dominant payment method in production
- **Yandex Maps** preferred for geocoding over Google Maps
- Platform targets **351 restaurants** in Almaty per industry data

## License

ISC
