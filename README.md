# Spreadsheet

A real-time collaborative spreadsheet application built with React, TypeScript, and WebSockets.

## Development Setup

### Local Development

#### Setup

1. **Copy environment file:**

   ```bash
   cp .env.local.example .env.local
   source .env.local
   ```

2. **Start Redis and RedisInsight:**

   ```bash
   docker compose -f compose.dev.yml up -d
   ```

3. **Start backend (in separate terminal):**

   ```bash
   cd server
   npm install
   npm run dev
   ```

4. **Start frontend (in separate terminal):**
   ```bash
   npm install
   npm run dev
   ```

#### Access

- Frontend: http://localhost:5173
- Backend API: http://localhost:4000
- RedisInsight: http://localhost:5540
- Redis: localhost:6379

#### Stop Services

```bash
docker compose -f compose.dev.yml down
```

### Production Deployment

1. **Build and publish images:**

   ```bash
   source .env && ./scripts/publish.sh
   ```

2. **Deploy to production:**
   ```bash
   source .env && ./scripts/deploy.sh
   ```

The production deployment uses `compose.prod.yml` which includes all services (nginx, frontend, backend, redis, redisinsight).
