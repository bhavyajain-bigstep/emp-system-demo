# Employee Leave & Attendance Management System

A full-stack HR platform for managing employees, departments, attendance, and leave workflows — a strict layered REST API (Routes → Middleware → Controllers → Services → Repositories → Models) with a modern React single-page application on top.

---

## Tech Stack

| Layer       | Technology            |
|-------------|------------------------|
| Runtime     | Node.js               |
| Language    | TypeScript            |
| Framework   | Express.js            |
| Database    | MongoDB               |
| ODM         | Mongoose              |
| Validation  | Zod                   |
| Auth        | JWT + bcrypt          |
| Security    | Helmet, CORS, rate limiting |
| Testing     | Jest + Supertest + mongodb-memory-server |
| Docs        | Swagger / OpenAPI     |
| Frontend    | React 19 + Vite + TypeScript + Tailwind CSS |
| Data fetching | TanStack Query + Axios |
| Charts      | Recharts              |
| Routing     | React Router          |

---

## Architecture

Every module follows the same layered flow — no exceptions:

```
HTTP Request
    ↓
Route
    ↓
Middleware (validation / auth / role)
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
- **Middleware** — cross-cutting concerns: validation, auth, role authorization, error handling.
- **Controllers** — thin. Read the request, call a service, return the response, forward errors to `next()`.
- **Services** — business logic and rules live here (duplicate checks, cross-entity validation, calculations, transactions).
- **Repositories** — the only layer that talks to Mongoose. No business decisions.
- **Models** — schema, types, enums, references, indexes, validation constraints.

---

## Project Structure

```text
backend/
├── src/
│   ├── config/
│   │   ├── db.ts                  # Mongoose connection lifecycle
│   │   ├── env.ts                 # Typed environment variable loader
│   │   └── swagger.ts             # OpenAPI spec assembly
│   │
│   ├── controllers/
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
│   │   └── app-error.ts           # Central AppError class
│   │
│   ├── middlewares/
│   │   ├── auth.middleware.ts     # JWT verification
│   │   ├── error.middleware.ts
│   │   ├── role.middleware.ts     # RBAC
│   │   └── validate.middleware.ts # Zod validation
│   │
│   ├── models/
│   │   ├── attendance.model.ts
│   │   ├── audit-log.model.ts
│   │   ├── department.model.ts
│   │   ├── employee.model.ts
│   │   ├── holiday.model.ts
│   │   ├── leave-balance.model.ts
│   │   ├── leave-request.model.ts
│   │   └── leave-type.model.ts
│   │
│   ├── repositories/
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
│   ├── services/
│   │   ├── attendance.service.ts
│   │   ├── audit-log.service.ts
│   │   ├── auth.service.ts
│   │   ├── department.service.ts
│   │   ├── employee.service.ts
│   │   ├── holiday.service.ts
│   │   ├── leave-balance.service.ts
│   │   ├── leave-day.service.ts       # working-day calculation
│   │   ├── leave-request.service.ts
│   │   ├── leave-type.service.ts
│   │   ├── notification.service.ts    # async notification abstraction
│   │   └── report.service.ts
│   │
│   ├── utils/
│   │   ├── jwt.ts
│   │   ├── transaction.ts             # transaction helper + standalone-DB fallback
│   │   └── timezone.util.ts
│   │
│   ├── validators/
│   │   ├── attendance.validator.ts
│   │   ├── auth.validator.ts
│   │   ├── department.validator.ts
│   │   ├── employee.validator.ts
│   │   ├── holiday.validator.ts
│   │   ├── leave-balance.validator.ts
│   │   ├── leave-request.validator.ts
│   │   └── leave-type.validator.ts
│   │
│   ├── types/
│   │   └── auth.types.ts
│   │
│   ├── app.ts                 # Express app: middleware, routes, error handler
│   └── server.ts              # Connects DB, then starts the HTTP server
│
├── tests/
│   ├── api.test.ts            # Employees, Leave, Attendance, Holiday, Reports
│   ├── audit-dashboard.test.ts# Audit trail, dashboard, cross-validation, atomicity
│   ├── auth.test.ts           # Login, token, RBAC
│   ├── global-setup.ts        # mongodb-memory-server (replica set)
│   ├── helpers.ts             # Seeders + JWT helpers
│   └── setup.ts               # Mongo connection + cleanup per test
│
├── package.json
├── jest.config.ts
└── tsconfig.json

frontend/
├── public/
│   └── favicon.svg            # PulseHR brand icon
├── src/
│   ├── components/
│   │   ├── layout/            # Sidebar (role-aware nav), topbar, app shell
│   │   ├── ui/                # Button, Card, Table, Modal, Badge, Toast, forms, feedback
│   │   └── guards.tsx         # RequireAuth / RequireRole / PublicOnly route guards
│   ├── context/auth.tsx       # Auth state, JWT + user persistence, hasRole
│   ├── lib/                   # Typed API client, endpoints, query client, utils
│   ├── pages/                 # Login, Dashboard, Attendance, Leaves, Approvals,
│   │                          # Balances, Holidays, Employees, Departments,
│   │                          # Leave Types, Reports, Audit Logs
│   ├── types/index.ts         # Shared domain types
│   ├── App.tsx                # Route table with guards (lazy-loaded pages)
│   ├── main.tsx               # Providers: Router, QueryClient, Auth, Toast
│   └── index.css              # Tailwind v4 theme (PulseHR design tokens)
├── index.html
├── package.json
├── vite.config.ts             # Dev proxy → localhost:5000, @ alias
└── tsconfig*.json

docs/
└── Database_Design.md
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

Create a `.env` file inside `backend/` (see `.env.example`):

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/leave_attendance_db
JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=1d
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
```

### 5. Verify it's up

```bash
curl http://localhost:5000/health
```

```json
{
  "success": true,
  "message": "Employee Leave Management API is running"
}
```

### 6. Seed data

Optional seed script (run once against your local DB):

```bash
npm run seed
```

Default seed credentials (all passwords `Password@123`):

| Email                  | Role    |
|------------------------|---------|
| `admin@example.com`    | ADMIN   |
| `hr@example.com`       | HR      |
| `manager@example.com`  | MANAGER |
| `employee@example.com` | EMPLOYEE |

### 7. Run tests

```bash
npm test   # runs against an in-memory MongoDB replica set
```

### 8. API docs

Swagger UI is served at `http://localhost:5000/api-docs`.

### 9. Run the frontend

With the backend running on `:5000` and MongoDB up:

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

The Vite dev server proxies `/api` and `/health` to the backend, so no CORS setup is needed. Build for production:

```bash
npm run build      # type-check + bundle to dist/
```

Sign in with any seed account (see step 6). UI access is role-aware:

| Page          | Roles                             |
|---------------|-----------------------------------|
| Dashboard     | Everyone                          |
| Attendance    | Everyone (team view for non-employees) |
| My Leaves     | Everyone                          |
| Leave Approvals | MANAGER, HR, ADMIN               |
| Leave Balances | Everyone (manage for HR/ADMIN)   |
| Holidays      | Everyone                          |
| Employees / Departments / Leave Types / Audit Logs | HR, ADMIN |
| Reports       | MANAGER, HR, ADMIN               |

---

## API Conventions

- All application routes are versioned under **`/api/v1`**. `/health` is the only exception.
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

---

## API Reference

### Auth

| Method | Endpoint                 | Auth | Description                          |
|--------|--------------------------|------|--------------------------------------|
| POST   | `/api/v1/auth/login`     | —    | Login with email + password, returns JWT |

Roles: `EMPLOYEE`, `MANAGER`, `HR`, `ADMIN`. Protected endpoints require `Authorization: Bearer <token>`.

### Employees

| Method | Endpoint                 | Auth         | Description                          |
|--------|--------------------------|--------------|--------------------------------------|
| GET    | `/api/v1/employees`      | HR, ADMIN    | List employees (paginated, filterable by `departmentId`, `status`) |
| GET    | `/api/v1/employees/:id`  | HR, ADMIN    | Get a single employee                |
| POST   | `/api/v1/employees`      | HR, ADMIN    | Create an employee                   |
| PATCH  | `/api/v1/employees/:id`  | HR, ADMIN    | Update an employee                   |

`departmentId` is required and must reference an existing department. `managerId` (optional) must reference an existing MANAGER/HR/ADMIN and cannot be the employee themselves. Responses never expose `passwordHash`.

### Departments

| Method | Endpoint                     | Auth      | Description                                      |
|--------|-------------------------------|-----------|--------------------------------------------------|
| GET    | `/api/v1/departments`         | HR, ADMIN | List departments (paginated, filterable by `status`) |
| GET    | `/api/v1/departments/:id`     | HR, ADMIN | Get a single department                          |
| POST   | `/api/v1/departments`         | HR, ADMIN | Create a department                              |
| PATCH  | `/api/v1/departments/:id`     | HR, ADMIN | Update a department                              |
| DELETE | `/api/v1/departments/:id`     | HR, ADMIN | Archive a department (soft delete; blocked if it still has active employees) |

A department's `managerId` must reference an Employee whose role is `MANAGER`, `HR`, or `ADMIN`.

### Leave Types

| Method | Endpoint                     | Auth      | Description               |
|--------|-------------------------------|-----------|---------------------------|
| GET    | `/api/v1/leave-types`         | any       | List active leave types   |
| POST   | `/api/v1/leave-types`         | HR, ADMIN | Create a leave type       |
| PATCH  | `/api/v1/leave-types/:id`     | HR, ADMIN | Update a leave type       |

### Leave Balances

| Method | Endpoint                                   | Auth                            | Description                          |
|--------|---------------------------------------------|---------------------------------|--------------------------------------|
| GET    | `/api/v1/leave-balances`                    | HR, ADMIN                       | List all balances                   |
| GET    | `/api/v1/leave-balances/my`                 | any                             | Current user's balances (year filter) |
| GET    | `/api/v1/leave-balances/employee/:employeeId` | owner, MANAGER (team), HR, ADMIN | Balances for one employee |
| GET    | `/api/v1/leave-balances/:id`                | owner, HR, ADMIN                | Single balance                      |
| POST   | `/api/v1/leave-balances`                    | HR, ADMIN                       | Allocate a balance                  |
| PATCH  | `/api/v1/leave-balances/:id`                | HR, ADMIN                       | Update an allocation                |

### Attendance

| Method | Endpoint                          | Auth   | Description                       |
|--------|------------------------------------|--------|-----------------------------------|
| POST   | `/api/v1/attendance/check-in`      | any    | Check in (duplicates rejected, 409) |
| POST   | `/api/v1/attendance/check-out`     | any    | Check out (computes half/full day)  |
| GET    | `/api/v1/attendance`               | any    | List attendance (paginated, filterable) |
| GET    | `/api/v1/attendance/summary`       | any    | Monthly summary (working days, present/late/half/leave/absent, %) |
| POST   | `/api/v1/attendance/:employeeId/check-in` | MANAGER, HR, ADMIN | Check in on behalf of a team member |

Late cutoff, minimum full-day minutes, and weekend days are configurable via env (`ATTENDANCE_LATE_CUTOFF_MINUTES`, `ATTENDANCE_MIN_MINUTES_FULL_DAY`, `ATTENDANCE_WEEKEND_DAYS`).

### Leaves

| Method | Endpoint                           | Auth                | Description                          |
|--------|-------------------------------------|---------------------|--------------------------------------|
| POST   | `/api/v1/leaves`                    | any (own)           | Create a leave request (validates notice, overlap, balance, max days) |
| GET    | `/api/v1/leaves/my`                 | any                 | Current user's leave requests        |
| GET    | `/api/v1/leaves/pending`            | MANAGER, HR, ADMIN  | Pending requests across org/team     |
| GET    | `/api/v1/leaves/:id`                | owner, HR, ADMIN    | Get a single request                 |
| PUT    | `/api/v1/leaves/:id/approve`        | manager, HR, ADMIN  | Approve (deducts balance atomically) |
| PUT    | `/api/v1/leaves/:id/reject`         | manager, HR, ADMIN  | Reject with reason                   |
| PUT    | `/api/v1/leaves/:id/cancel`         | owner, HR, ADMIN    | Cancel (restores balance if approved) |

Approval, rejection, and cancellation run inside **MongoDB transactions** so that status changes and balance mutations are atomic — a failed approval leaves both the request and the balance untouched.

### Holidays

| Method | Endpoint                  | Auth      | Description                    |
|--------|----------------------------|-----------|--------------------------------|
| GET    | `/api/v1/holidays`         | any       | List holidays (year/month filter) |
| POST   | `/api/v1/holidays`         | HR, ADMIN | Create a holiday (mandatory or optional) |
| DELETE | `/api/v1/holidays/:id`     | HR, ADMIN | Delete a holiday               |

### Reports

| Method | Endpoint                          | Auth                 | Description                          |
|--------|------------------------------------|----------------------|--------------------------------------|
| GET    | `/api/v1/reports/attendance`       | MANAGER, HR, ADMIN   | Attendance report (paginated, filterable) |
| GET    | `/api/v1/reports/attendance/export`| MANAGER, HR, ADMIN   | Attendance report as CSV             |
| GET    | `/api/v1/reports/leaves`           | MANAGER, HR, ADMIN   | Leave report (paginated, filterable) |
| GET    | `/api/v1/reports/leaves/export`    | MANAGER, HR, ADMIN   | Leave report as CSV                  |
| GET    | `/api/v1/reports/dashboard`        | any                  | Dashboard summary (scope-aware)      |

### Audit Logs

| Method | Endpoint            | Auth      | Description                              |
|--------|----------------------|-----------|------------------------------------------|
| GET    | `/api/v1/audit-logs` | HR, ADMIN | Audit trail (filterable by action/entity/actor/date, paginated) |

Key state changes (employee create/update, leave create/approve/reject/cancel, balance allocation) write to the audit trail. Approval/rejection/cancellation audit entries are written inside the same transaction as the change.

### Health

| Method | Endpoint   | Auth | Description  |
|--------|------------|------|--------------|
| GET    | `/health`  | —    | Liveness check |

---

## Business Rules Summary

- Leave balance is consumed **only on approval**, and restored on cancellation of an approved request.
- Working-day count excludes weekends and mandatory holidays per leave-type policy.
- Overlapping PENDING/APPROVED requests are rejected (`409`).
- Managers can only approve/reject requests from their direct reports; HR/ADMIN can approve/reject for anyone.
- Employees cannot approve/reject their own requests.
- Cancellation is subject to the leave type's `allowCancellation` rule.
- Department archiving is blocked while active employees reference it.

---

## Development Guidelines

- Keep business logic out of routes and controllers — it belongs in services.
- Keep raw Mongoose queries out of services — they belong in repositories.
- Use `AppError` for all expected/business errors so they're handled consistently by `error.middleware.ts`.
- Validate all request bodies with Zod before they reach a controller.
- Wrap multi-document mutations (approve/reject/cancel) in transactions with `ClientSession`.
- Never commit `.env`, secrets, or credentials.
- Prefer soft deactivation over hard deletes for entities that may be referenced elsewhere (departments, employees).

---

## Known Limitations

- Notifications are an in-process abstraction (`notification.service.ts`) — no external email/SMS provider is wired yet.
- `rejectedBy`/`rejectedAt`/`cancelledBy` were recently added to the schema; older documents may not have them set.
- Approval/rejection/cancellation use **MongoDB transactions** on deployments that support them (replica set / Atlas / tests). Against a standalone `mongod` (e.g. a default Homebrew install) the code auto-detects the lack of transaction support and falls back to non-transactional writes so dev still works — without atomicity guarantees.
- Tests run against an in-memory replica set; a local or remote MongoDB is only needed for `npm run dev` / `npm start`.

See `docs/Database_Design.md` for the schema design and roadmap.