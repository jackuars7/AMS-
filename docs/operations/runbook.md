# Operational Runbook & Observability Guide

## 1. Local Development & Deployment Runbook

### Prerequisites
- Node.js 20+
- npm 10+

### Execution Commands
```bash
# Install dependencies
npm install

# Run linting and TypeScript verification
npm run lint

# Run automated test suite (policy, RBAC, connector, blocking tests)
npm test

# Run development server (binds to 0.0.0.0:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

---

## 2. Observability & Health Monitoring

The system exposes structured telemetry and health endpoints:

* **Health Check**: `GET /api/health` returns status of the core engine, memory usage, and database store.
* **OpenAPI 3.1 Spec**: `GET /api/docs/openapi.json` returns complete API contracts and schemas.
* **Connector Observability**:
  * `GET /api/v1/connectors` returns real-time status of all external media connectors (`ACTIVE`, `DEGRADED`, `CIRCUIT_OPEN`), error rates, rate limit utilization, and average latency.
* **Operational Queues**:
  * `GET /api/v1/work-items/summary` returns queue depth across `assigned`, `unassigned`, `awaiting_review`, `overdue`, and `escalated`.
