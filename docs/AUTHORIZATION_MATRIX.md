# API Authorization Matrix

This document is the source of truth for who can call what. Every endpoint in
`backend/src/routes/*.ts` must map to exactly one row here. If you add an
endpoint, add a row here in the same change.

Roles are stored on the `Employee` document:

- `EMPLOYEE` — regular employee
- `MANAGER` — direct manager of one or more employees
- `HR` — HR staff
- `ADMIN` — full access (HR staff with admin privileges)

Conventions:

- **Self** — the authenticated actor (`req.user.userId`) is the target.
- **Direct report** — `target.managerId === actor.id`.
- **Team** — the set of `actor`'s direct reports.
- **HR/Admin override** — HR and Admin bypass self/manager checks.

Authorization decisions live in `src/services/authorization.service.ts`.
Controllers must call into that service and must not do ad-hoc role
comparisons or `Employee.findById(...).managerId` checks.

## Endpoints

| Method | Path                                              | Auth rule                                                                           |
|--------|---------------------------------------------------|--------------------------------------------------------------------------------------|
| POST   | `/api/v1/auth/login`                              | Public                                                                              |
| GET    | `/api/v1/health`                                  | Public                                                                              |
| GET    | `/api/v1/employees`                               | HR or ADMIN only                                                                    |
| GET    | `/api/v1/employees/:id`                           | HR or ADMIN override, otherwise self or direct report of actor                       |
| POST   | `/api/v1/employees`                               | HR or ADMIN only                                                                    |
| PATCH  | `/api/v1/employees/:id`                           | HR or ADMIN only                                                                    |
| GET    | `/api/v1/departments`                             | Any authenticated user                                                              |
| GET    | `/api/v1/departments/:id`                         | Any authenticated user                                                              |
| POST   | `/api/v1/departments`                             | HR or ADMIN only                                                                    |
| PATCH  | `/api/v1/departments/:id`                         | HR or ADMIN only                                                                    |
| DELETE | `/api/v1/departments/:id`                         | HR or ADMIN only (soft archive; blocked if active employees remain)                 |
| POST   | `/api/v1/attendance/check-in`                     | Self only; HR/Admin override                                                        |
| POST   | `/api/v1/attendance/check-out`                    | Self only; HR/Admin override                                                        |
| POST   | `/api/v1/attendance/:employeeId/check-in`         | HR/Admin only (admin override path)                                                 |
| POST   | `/api/v1/attendance/:employeeId/check-out`        | HR/Admin only (admin override path)                                                 |
| GET    | `/api/v1/attendance`                              | EMPLOYEE: self only. MANAGER: self + direct reports only (HR/Admin override)         |
| GET    | `/api/v1/attendance/summary`                      | Self or direct report; HR/Admin override                                            |
| GET    | `/api/v1/attendance/:employeeId/summary`          | Self or direct report; HR/Admin override                                            |
| GET    | `/api/v1/leave-types`                             | Any authenticated user                                                              |
| POST   | `/api/v1/leave-types`                             | HR or ADMIN only                                                                    |
| PATCH  | `/api/v1/leave-types/:id`                         | HR or ADMIN only                                                                    |
| DELETE | `/api/v1/leave-types/:id`                         | HR or ADMIN only (soft delete)                                                      |
| GET    | `/api/v1/leave-balances`                          | Self only; HR/Admin override                                                        |
| POST   | `/api/v1/leave-balances`                          | HR or ADMIN only                                                                    |
| PATCH  | `/api/v1/leave-balances/:id`                      | HR or ADMIN only                                                                    |
| POST   | `/api/v1/leaves`                                  | Any authenticated user (creates for self)                                           |
| GET    | `/api/v1/leaves/my`                               | Self only                                                                            |
| GET    | `/api/v1/leaves/pending`                          | MANAGER: filtered to direct reports. HR/ADMIN: full queue.                          |
| GET    | `/api/v1/leaves/:id`                              | Self, the requester's manager, HR or ADMIN                                          |
| PUT    | `/api/v1/leaves/:id/approve`                      | MANAGER: only if actor is the requester's manager. HR/ADMIN: any.                   |
| PUT    | `/api/v1/leaves/:id/reject`                       | MANAGER: only if actor is the requester's manager. HR/ADMIN: any.                   |
| PUT    | `/api/v1/leaves/:id/cancel`                       | Self (only on own request), HR/Admin override                                       |
| GET    | `/api/v1/holidays`                                | Any authenticated user                                                              |
| POST   | `/api/v1/holidays`                                | HR or ADMIN only                                                                    |
| PATCH  | `/api/v1/holidays/:id`                            | HR or ADMIN only                                                                    |
| DELETE | `/api/v1/holidays/:id`                            | HR or ADMIN only                                                                    |
| GET    | `/api/v1/reports/attendance`                      | MANAGER: direct reports only. HR/ADMIN: any employee.                               |
| GET    | `/api/v1/reports/attendance/export`               | MANAGER: direct reports only. HR/ADMIN: any employee.                               |
| GET    | `/api/v1/reports/leave`                           | MANAGER: direct reports only. HR/ADMIN: any employee.                               |
| GET    | `/api/v1/reports/leave/export`                    | MANAGER: direct reports only. HR/ADMIN: any employee.                               |

## Department lifecycle

`Department.status` is `ACTIVE` or `ARCHIVED`. There is no separate
"deleted" status and no hard delete path. Archive is blocked if the
department still has any `Employee` with `status === "ACTIVE"`. The
existing `countActiveEmployeesInDepartment` repository function is the
single source of truth for that check.
