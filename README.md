# Employee Leave & Attendance Management System

A backend-first REST API for managing employees, departments, attendance, and leave workflows for an HR organization — built with a strict layered architecture (Routes → Middleware → Controllers → Services → Repositories → Models).

> Frontend is intentionally not part of this repo yet. This is a backend-only project.

---

## Tech Stack

| Layer          | Technology              |
|----------------|--------------------------|
| Runtime        | Node.js                  |
| Language       | TypeScript                |
| Framework      | Express.js                |
| Database       | MongoDB                   |
| ODM            | Mongoose                  |
| Validation     | Zod                       |
| Auth (planned) | JWT + bcrypt-ts           |
| Security       | Helmet, CORS              |
| Testing (planned) | Jest + Supertest       |
| Docs (planned) | Swagger / OpenAPI, Postman |

---

## Architecture

Every module follows the same layered flow — no exceptions:

```
HTTP Request
    ↓
Route
    ↓
Middleware (validation / auth, where applicable)
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
- **Middleware** — cross-cutting concerns: validation, auth, error handling.
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
│   │   └── env.ts             # Typed environment variable loader
│   │
│   ├── controllers/
│   │   ├── employee.controller.ts
│   │   └── department.controller.ts
│   │
│   ├── errors/
│   │   └── app-error.ts       # Central AppError class
│   │
│   ├── middlewares/
│   │   ├── validate.middleware.ts
│   │   └── error.middleware.ts
│   │
│   ├── models/
│   │   ├── employee.model.ts
│   │   ├── department.model.ts
│   │   └── user.model.ts      # currently unused — see Known Gaps
│   │
│   ├── repositories/
│   │   ├── employee.repository.ts
│   │   └── department.repository.ts
│   │
│   ├── routes/
│   │   ├── employee.routes.ts
│   │   └── department.routes.ts
│   │
│   ├── services/
│   │   ├── employee.service.ts
│   │   └── department.service.ts
│   │
│   ├── validators/
│   │   ├── employee.validator.ts
│   │   └── department.validator.ts
│   │
│   ├── app.ts                 # Express app: middleware, routes, error handler
│   └── server.ts              # Connects DB, then starts the HTTP server
│
├── package.json
└── tsconfig.json

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

Create a `.env` file inside `backend/`:

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/leave_attendance_db
JWT_SECRET=your-secret-key
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

- All application routes are versioned under **`/api/v1`**. `/api/v1/health` is the only exception.
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

### Health

| Method | Endpoint          | Auth | Description        |
|--------|--------------------|------|---------------------|
| GET    | `/api/v1/health`   | —    | Liveness check       |

### Employees

| Method | Endpoint                   | Description                          |
|--------|------------------------------|----------------------------------------|
| GET    | `/api/v1/employees`         | List employees (paginated, filterable by `departmentId`, `status`) |
| GET    | `/api/v1/employees/:id`     | Get a single employee                |
| POST   | `/api/v1/employees`         | Create an employee                   |
| PATCH  | `/api/v1/employees/:id`     | Update an employee                   |

`role` (`EMPLOYEE` \| `MANAGER` \| `HR` \| `ADMIN`) is a field on the Employee document itself — there is no separate admin/HR table. Managers are Employee records too, referenced via `managerId`.

### Departments

| Method | Endpoint                     | Description                                             |
|--------|--------------------------------|-------------------------------------------------------------|
| GET    | `/api/v1/departments`         | List departments (paginated, filterable by `status`)        |
| GET    | `/api/v1/departments/:id`     | Get a single department                                    |
| POST   | `/api/v1/departments`         | Create a department                                          |
| PATCH  | `/api/v1/departments/:id`     | Update a department                                          |
| DELETE | `/api/v1/departments/:id`     | Archive a department (soft delete; blocked if it still has active employees) |

A department's `managerId` must reference an Employee whose role is `MANAGER`, `HR`, or `ADMIN`.

> Auth/RBAC middleware does not exist in this repo yet, so all endpoints above are currently unauthenticated. See **Known Gaps**.

---

## Known Gaps / In Progress

- **Authentication & RBAC** — `auth.middleware.ts`, `role.middleware.ts`, login endpoint, and JWT issuance are being built separately and are not yet wired into any route. Every endpoint listed above is open until that lands.
- **`user.model.ts`** — currently an empty file, not used anywhere. All auth-relevant fields (`passwordHash`, `role`) live on `Employee`.
- **Employee ↔ Department cross-validation** — Employee creation/update does not yet verify that a supplied `departmentId` exists.
- Not implemented yet: Attendance, LeaveType, LeaveBalance, LeaveRequest, Holiday, Reports, AuditLog, Notification abstraction, CSV export, Swagger/OpenAPI, Postman collection, seed data, tests.

See `docs/Database_Design.md` for the full planned schema and roadmap.

---

## Development Guidelines

- Keep business logic out of routes and controllers — it belongs in services.
- Keep raw Mongoose queries out of services — they belong in repositories.
- Use `AppError` for all expected/business errors so they're handled consistently by `error.middleware.ts`.
- Validate all request bodies with Zod before they reach a controller.
- Never commit `.env`, secrets, or credentials.
- Prefer soft deactivation over hard deletes for entities that may be referenced elsewhere (departments, employees).