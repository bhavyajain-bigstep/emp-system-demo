# Employee Leave & Attendance Management System

A backend-first REST API for managing employees, departments, attendance, and leave workflows for an HR organization — built with a strict layered architecture (Routes → Middleware → Controllers → Services → Repositories → Models), JWT-based authentication, role-based authorization, structured audit logging, and request correlation tracking.

> Frontend is intentionally not part of this repo yet. This is a backend-only project.

---

## Tech Stack

| Layer             | Technology                          |
|-------------------|--------------------------------------|
| Runtime           | Node.js (LTS)                        |
| Language          | TypeScript                           |
| Framework         | Express.js 5                         |
| Database          | MongoDB                              |
| ODM               | Mongoose                             |
| Validation        | Zod                                  |
| Authentication    | JWT + bcrypt-ts                      |
| Authorization     | Role-based access control (RBAC)     |
| Security          | Helmet, CORS, rate limiting          |
| Logging           | Structured JSON logger with correlation IDs |
| Testing           | Jest                                 |
| Docs              | Swagger / OpenAPI (`/api-docs`)      |

---

## Architecture

Every module follows the same layered flow — no exceptions:

```
HTTP Request
    ↓
Route
    ↓
Middleware (correlation → authentication → authorization → validation)
    ↓
Controller
    ↓
Service
    ↓
Repository
    ↓
Mongoose Model
    ↓
MongoDB
```

**Responsibilities**

- **Routes** — HTTP method, URL, middleware order, controller mapping. No business logic.
- **Middleware** — cross-cutting concerns: correlation tracking, authentication, authorization (RBAC), request validation, error handling.
- **Controllers** — thin. Read the request, call a service, return the response, forward errors to `next()`.
- **Services** — business logic and rules live here (duplicate checks, cross-entity validation, calculations).
- **Repositories** — the only layer that talks to Mongoose. No business decisions.
- **Models** — schema, types, enums, references, indexes, validation constraints.

---

## Project Structure

```text
backend/
├── src/
│   ├── config/
│   │   ├── db.ts              # Mongoose connection lifecycle
│   │   ├── env.ts             # Typed environment variable loader
│   │   └── swagger.ts         # Swagger/OpenAPI definition
│   │
│   ├── controllers/           # Thin HTTP layer
│   │   ├── attendance.controller.ts
│   │   ├── audit-log.controller.ts
│   │   ├── auth.controller.ts
│   │   ├── department.controller.ts
│   │   ├── employee.controller.ts
│   │   ├── holiday.controller.ts
│   │   ├── leave-balance.controller.ts
│   │   ├── leave-request.controller.ts
│   │   ├── leave-type.controller.ts
│   │   └── report.controller.ts
│   │
│   ├── errors/
│   │   └── app-error.ts       # Central AppError class
│   │
│   ├── middlewares/
│   │   ├── auth.middleware.ts        # JWT authentication
│   │   ├── correlation.middleware.ts # Request correlation IDs
│   │   ├── error.middleware.ts       # Central error handling
│   │   ├── role.middleware.ts        # RBAC authorization
│   │   └── validate.middleware.ts    # Zod validation
│   │
│   ├── models/
│   │   ├── attendance.model.ts
│   │   ├── audit-log.model.ts
│   │   ├── department.model.ts
│   │   ├── employee.model.ts
│   │   ├── holiday.model.ts
│   │   ├── leave-balance.model.ts
│   │   ├── leave-request.model.ts
│   │   ├── leave-type.model.ts
│   │   └── user.model.ts
│   │
│   ├── repositories/          # Only layer that uses Mongoose
│   │   ├── attendance.repository.ts
│   │   ├── audit-log.repository.ts
│   │   ├── department.repository.ts
│   │   ├── employee.repository.ts
│   │   ├── holiday.repository.ts
│   │   ├── leave-balance.repository.ts
│   │   ├── leave-request.repository.ts
│   │   └── leave-type.repository.ts
│   │
│   ├── routes/
│   │   ├── attendance.route.ts
│   │   ├── audit-log.routes.ts
│   │   ├── auth.routes.ts
│   │   ├── department.routes.ts
│   │   ├── employee.routes.ts
│   │   ├── holiday.routes.ts
│   │   ├── leave-balance.routes.ts
│   │   ├── leave-request.routes.ts
│   │   ├── leave-type.routes.ts
│   │   └── report.routes.ts
│   │
│   ├── services/              # Business logic
│   │   ├── attendance.service.ts
│   │   ├── audit-log.service.ts
│   │   ├── auth.service.ts
│   │   ├── authorization.service.ts
│   │   ├── department.service.ts
│   │   ├── employee.service.ts
│   │   ├── holiday.service.ts
│   │   ├── leave-balance.service.ts
│   │   ├── leave-day.service.ts
│   │   ├── leave-request.service.ts
│   │   ├── leave-type.service.ts
│   │   ├── notification.service.ts
│   │   └── report.service.ts
│   │
│   ├── utils/
│   │   ├── jwt.ts             # JWT signing/verification
│   │   ├── leave-date.util.ts
│   │   ├── logger.ts          # Structured logger with correlation IDs
│   │   ├── pagination.util.ts
│   │   ├── password.ts        # bcrypt helpers
│   │   └── timezone.util.ts
│   │
│   ├── validators/            # Zod request schemas
│   │
│   ├── app.ts                 # Express app: middleware, routes, error handler
│   └── server.ts              # Connects DB, then starts the HTTP server
│
├── tests/
│   └── unit/                  # Jest unit tests
│
├── package.json
├── jest.config.ts
└── tsconfig.json

docs/
├── AUTHORIZATION_MATRIX.md    # Per-endpoint auth rules (Phase 1)
├── Backend_Improvement_Guide.md
├── Database_Design.md
└── blockers.md                # Known issues & future optimizations (Phase 2)
```

---

## Getting Started

### Prerequisites

- Node.js (LTS)
- MongoDB running locally (or a connection string to a remote instance)

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment variables

Create a `.env` file inside `backend/`:

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/leave_attendance_db
JWT_SECRET=your-secret-key

# Attendance policy (optional, with defaults)
ATTENDANCE_LATE_CUTOFF_MINUTES=570      # 9:30 AM
ATTENDANCE_MIN_MINUTES_FULL_DAY=240    # 4 hours
ATTENDANCE_WEEKEND_DAYS=0,6            # Sun, Sat
```

All variables have safe local-dev fallbacks (see `src/config/env.ts`), so the app will boot without a `.env` file — but don't rely on that outside local development.

### 3. Start MongoDB (macOS / Homebrew example)

```bash
brew services start mongodb-community
brew services list | grep mongodb   # verify it's running
```

### 4. Run the API

```bash
npm run dev      # development, with auto-restart
npm run build    # compile TypeScript → dist/
npm start        # run compiled build
npm run seed     # seed sample data
npm test         # run unit tests
```

### 5. Verify it's up

```bash
curl http://localhost:5000/api/v1/health
```

```json
{
  "success": true,
  "message": "Employee Leave Management API is running"
}
```

---

## API Conventions

- All application routes are versioned under **`/api/v1`**.
- Success responses:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

- Paginated collection responses additionally include:

```json
{
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

- Error responses:

```json
{
  "success": false,
  "message": "Something went wrong",
  "error": {
    "code": "ERROR_CODE"
  }
}
```

- Every response includes an `X-Correlation-ID` header. Supply the same header on a subsequent request to trace related operations in logs.

---

## Logging & Observability

The API uses a structured JSON logger with correlation IDs:

- Each request gets a unique correlation ID (generated or taken from `X-Correlation-ID` header).
- The correlation ID is logged on every entry (`Request received`, `Request completed`, `Unhandled error`).
- All audit events include the correlation ID so admins can trace who-did-what across services.
- Sensitive fields (`password`, `passwordHash`, `token`, `authorization`, `apiKey`, etc.) are automatically redacted.

In production, all logs are JSON. In development, they are pretty-printed.

---

## API Reference

> Full Swagger/OpenAPI documentation is served at `/api-docs`.
> See `docs/AUTHORIZATION_MATRIX.md` for per-endpoint role and ownership rules.

### Health

| Method | Endpoint          | Auth | Description        |
|--------|--------------------|------|---------------------|
| GET    | `/api/v1/health`   | —    | Liveness check       |

### Authentication

| Method | Endpoint                  | Description                                |
|--------|---------------------------|--------------------------------------------|
| POST   | `/api/v1/auth/login`      | Email + password login, returns JWT         |

### Employees

| Method | Endpoint                   | Access                                                       |
|--------|------------------------------|--------------------------------------------------------------|
| GET    | `/api/v1/employees`         | HR or ADMIN only                                              |
| GET    | `/api/v1/employees/:id`     | HR/ADMIN: any. Manager: direct reports. Employee: self only. |
| POST   | `/api/v1/employees`         | HR or ADMIN only                                              |
| PATCH  | `/api/v1/employees/:id`     | HR or ADMIN only                                              |

### Departments

| Method | Endpoint                     | Access                |
|--------|--------------------------------|------------------------|
| GET    | `/api/v1/departments`         | Any authenticated      |
| GET    | `/api/v1/departments/:id`     | Any authenticated      |
| POST   | `/api/v1/departments`         | HR or ADMIN            |
| PATCH  | `/api/v1/departments/:id`     | HR or ADMIN            |
| DELETE | `/api/v1/departments/:id`     | HR or ADMIN (soft archive) |

### Attendance

| Method | Endpoint                                              | Access                              |
|--------|--------------------------------------------------------|--------------------------------------|
| POST   | `/api/v1/attendance/check-in`                          | Self only; HR/Admin override         |
| POST   | `/api/v1/attendance/check-out`                         | Self only; HR/Admin override         |
| POST   | `/api/v1/attendance/:employeeId/check-in`              | HR/Admin override                    |
| POST   | `/api/v1/attendance/:employeeId/check-out`             | HR/Admin override                    |
| GET    | `/api/v1/attendance`                                   | Employee: self. Manager: team. HR/Admin: all. |
| GET    | `/api/v1/attendance/summary`                           | Self or direct report; HR/Admin override |
| GET    | `/api/v1/attendance/:employeeId/summary`               | Self or direct report; HR/Admin override |

### Leave Types

| Method | Endpoint                     | Access           |
|--------|--------------------------------|-------------------|
| GET    | `/api/v1/leave-types`         | Any authenticated |
| POST   | `/api/v1/leave-types`         | HR or ADMIN       |
| PATCH  | `/api/v1/leave-types/:id`     | HR or ADMIN       |
| DELETE | `/api/v1/leave-types/:id`     | HR or ADMIN (soft delete) |

### Leave Balances

| Method | Endpoint                              | Access                              |
|--------|----------------------------------------|--------------------------------------|
| GET    | `/api/v1/leave-balances`               | Self only; HR/Admin override         |
| GET    | `/api/v1/leave-balances/:employeeId`   | Self or direct report; HR/Admin override |
| GET    | `/api/v1/leave-balances/balance/:id`   | Self or direct report; HR/Admin override |
| POST   | `/api/v1/leave-balances`               | HR or ADMIN                          |
| PATCH  | `/api/v1/leave-balances/:id`           | HR or ADMIN                          |

### Leave Requests

| Method | Endpoint                          | Access                                                         |
|--------|------------------------------------|-----------------------------------------------------------------|
| POST   | `/api/v1/leaves`                   | Any authenticated (creates for self)                            |
| GET    | `/api/v1/leaves/my`                | Self only                                                       |
| GET    | `/api/v1/leaves/pending`           | MANAGER: filtered to direct reports. HR/ADMIN: full queue.     |
| GET    | `/api/v1/leaves/:id`               | Self, the requester's manager, HR or ADMIN                      |
| PUT    | `/api/v1/leaves/:id/approve`       | MANAGER: only if actor is the requester's manager. HR/ADMIN: any. |
| PUT    | `/api/v1/leaves/:id/reject`        | MANAGER: only if actor is the requester's manager. HR/ADMIN: any. |
| PUT    | `/api/v1/leaves/:id/cancel`        | Self (only on own request), HR/Admin override                  |

### Holidays

| Method | Endpoint            | Access           |
|--------|---------------------|-------------------|
| GET    | `/api/v1/holidays`  | Any authenticated |
| POST   | `/api/v1/holidays`  | HR or ADMIN       |
| PATCH  | `/api/v1/holidays/:id` | HR or ADMIN   |
| DELETE | `/api/v1/holidays/:id` | HR or ADMIN   |

### Reports

| Method | Endpoint                                       | Access                                          |
|--------|-------------------------------------------------|--------------------------------------------------|
| GET    | `/api/v1/reports/attendance`                   | MANAGER: direct reports only. HR/ADMIN: any.     |
| GET    | `/api/v1/reports/attendance/export`            | MANAGER: direct reports only. HR/ADMIN: any.     |
| GET    | `/api/v1/reports/leave`                        | MANAGER: direct reports only. HR/ADMIN: any.     |
| GET    | `/api/v1/reports/leave/export`                 | MANAGER: direct reports only. HR/ADMIN: any.     |

### Audit Logs

| Method | Endpoint                          | Access       |
|--------|------------------------------------|---------------|
| GET    | `/api/v1/audit-logs`               | HR or ADMIN   |
| GET    | `/api/v1/audit-logs/:id`           | HR or ADMIN   |

`GET /api/v1/audit-logs` supports filtering by: `eventType`, `actorId`, `entityType`, `entityId`, `fromDate`, `toDate`.

---

## Audit Event Catalog

Every meaningful state change emits an audit event. The full list lives in `AuditEventType` (see `backend/src/services/audit-log.service.ts`):

- **Employee**: `EMPLOYEE_CREATED`, `EMPLOYEE_UPDATED`, `EMPLOYEE_STATUS_CHANGED`, `EMPLOYEE_DELETED`
- **Department**: `DEPARTMENT_CREATED`, `DEPARTMENT_UPDATED`, `DEPARTMENT_ARCHIVED`
- **Leave Type**: `LEAVE_TYPE_CREATED`, `LEAVE_TYPE_UPDATED`, `LEAVE_TYPE_DELETED`
- **Leave Balance**: `LEAVE_BALANCE_CREATED`, `LEAVE_BALANCE_UPDATED`, `LEAVE_BALANCE_DEDUCTED`, `LEAVE_BALANCE_RESTORED`
- **Leave Request**: `LEAVE_REQUEST_CREATED`, `LEAVE_REQUEST_APPROVED`, `LEAVE_REQUEST_REJECTED`, `LEAVE_REQUEST_CANCELLED`
- **Attendance**: `ATTENDANCE_CHECK_IN`, `ATTENDANCE_CHECK_OUT`, `ATTENDANCE_RECORD_UPDATED`
- **Holiday**: `HOLIDAY_CREATED`, `HOLIDAY_UPDATED`, `HOLIDAY_DELETED`
- **Auth**: `AUTH_LOGIN_SUCCESS`, `AUTH_LOGIN_FAILED`, `AUTH_TOKEN_REFRESHED`, `AUTH_UNAUTHORIZED_ACCESS`

Each audit entry includes the actor, entity, before/after values, metadata, correlation ID, and timestamp. Sensitive fields are stripped before persistence.

---

## Backend Improvement Roadmap

The backend was improved through 6 documented phases. See `docs/Backend_Improvement_Guide.md` for the full guide.

| Phase | Focus                            | Status     |
|-------|----------------------------------|------------|
| 1     | Architecture and API boundaries  | Complete   |
| 2     | Performance (lean, projections)  | Complete   |
| 3     | Audit logging and error handling | Complete   |
| 4     | Maintainability                  | Pending    |
| 5     | Scalability / operational        | Pending    |
| 6     | Testing                          | In progress (unit tests in place, integration tests pending) |

Known follow-ups and blockers are tracked in `docs/blockers.md`.

---

## Development Guidelines

- Keep business logic out of routes and controllers — it belongs in services.
- Keep raw Mongoose queries out of services — they belong in repositories.
- Use `AppError` for all expected/business errors so they're handled consistently by `error.middleware.ts`.
- Validate all request bodies with Zod before they reach a controller.
- Never commit `.env`, secrets, or credentials.
- Prefer soft deactivation over hard deletes for entities that may be referenced elsewhere (departments, employees).
- Use the structured logger (`utils/logger.ts`) for any diagnostic or operational output — avoid raw `console.log`.
- Emit audit events through `logAuditEvent` for any meaningful state change.
- Always pass Mongoose documents through `toPlainObject` before storing in audit `oldValue`/`newValue`.

---

## Testing

```bash
cd backend
npm test
```

Current coverage (Jest unit tests):

- JWT token generation and verification
- Role middleware authorization decisions
- Pagination helper bounds
- Logger structured output and sensitive-key redaction

Integration/API tests are planned as part of Phase 6. See `docs/Backend_Improvement_Guide.md`.
