# Role-Based Access Control (RBAC) Matrix

## Overview

This document consolidates all role-based authorization rules across the backend and frontend for the Employee Leave & Attendance Management System.

---

## Roles Definition

| Role | Description | Hierarchy |
|------|-------------|-----------|
| **EMPLOYEE** | Regular employee, basic self-service | Lowest |
| **MANAGER** | People manager, approves team leaves | ↑ |
| **HR** | Human Resources, org-wide access | ↑ |
| **ADMIN** | System administrator, full access | Highest |

---

## Backend Authorization

### Middleware Chain
```
Request → authenticate (JWT) → authorize(roles...) → validate(schema) → Controller
```

### Route-Level Authorization (`app.ts` + route files)

| Module | Endpoint | Method | Required Roles | Notes |
|--------|----------|--------|----------------|-------|
| **Auth** | `/auth/login` | POST | Public | No auth required |
| | `/auth/refresh` | POST | Cookie-based | Refresh token in HttpOnly cookie |
| | `/auth/logout` | POST | Authenticated | Clears refresh token |
| **Employees** | `/employees` | GET | HR, ADMIN | List all |
| | `/employees` | POST | HR, ADMIN | Create |
| | `/employees/:id` | GET | All* | *Self or team (see below) |
| | `/employees/:id` | PATCH | HR, ADMIN | Update |
| **Departments** | `/departments` | GET | All authenticated | List |
| | `/departments` | POST | HR, ADMIN | Create |
| | `/departments/:id` | GET | All authenticated | View |
| | `/departments/:id` | PATCH | HR, ADMIN, **Dept Manager** | Update (NEW) |
| | `/departments/:id` | DELETE | HR, ADMIN | Delete |
| **Leave Types** | `/leave-types` | GET | HR, ADMIN | List |
| | `/leave-types` | POST | HR, ADMIN | Create |
| | `/leave-types/:id` | GET | HR, ADMIN | View |
| | `/leave-types/:id` | PATCH | HR, ADMIN | Update |
| | `/leave-types/:id` | DELETE | HR, ADMIN | Delete |
| **Leave Balances** | `/leave-balances` | GET | HR, ADMIN | List all |
| | `/leave-balances/my` | GET | All | Own balances |
| | `/leave-balances/employee/:id` | GET | HR, ADMIN, Self | View specific |
| | `/leave-balances` | POST | HR, ADMIN | Create |
| | `/leave-balances/:id` | PATCH | HR, ADMIN | Update allocation |
| **Leave Requests** | `/leaves` | POST | All | Create own request |
| | `/leaves/my` | GET | All | Own requests |
| | `/leaves/pending` | GET | MANAGER, HR, ADMIN | Approval queue |
| | `/leaves/:id` | GET | All* | *Self, team, HR, ADMIN |
| | `/leaves/:id/approve` | PUT | MANAGER, HR, ADMIN | Approve (see rules) |
| | `/leaves/:id/reject` | PUT | MANAGER, HR, ADMIN | Reject (see rules) |
| | `/leaves/:id/cancel` | PUT | All* | *Owner, HR, ADMIN |
| **Attendance** | `/attendance/check-in` | POST | All | Own check-in |
| | `/attendance/check-out` | POST | All | Own check-out |
| | `/attendance` | GET | All* | *Self, team, HR, ADMIN |
| | `/attendance/summary` | GET | All* | *Self, team, HR, ADMIN |
| **Holidays** | `/holidays` | GET | All | View |
| | `/holidays` | POST | HR, ADMIN | Create |
| | `/holidays/:id` | PATCH | HR, ADMIN | Update |
| | `/holidays/:id` | DELETE | HR, ADMIN | Delete |
| **Reports** | `/reports/attendance` | GET | MANAGER, HR, ADMIN | |
| | `/reports/leaves` | GET | MANAGER, HR, ADMIN | |
| | `/reports/dashboard` | GET | MANAGER, HR, ADMIN | |
| **Audit Logs** | `/audit-logs` | GET | HR, ADMIN | Read-only |

---

### Leave Approval Authorization Logic (Backend)

**File:** `src/services/leave-request.service.ts:388-406`

```typescript
const isHR = approver.role === "HR" || approver.role === "ADMIN";

const isManager = employee.managerId && 
                  employee.managerId.toString() === approverId;

if (!isHR && !isManager) {
  throw new AppError("You are not authorized to approve this leave request", 403);
}
```

| Scenario | Who Can Approve/Reject |
|----------|------------------------|
| Employee has `managerId` set | **HR, ADMIN, or that specific manager** (via `employee.managerId`) |
| Employee has NO `managerId` (null) | **Only HR or ADMIN** |
| Department manager (`department.managerId`) | ❌ **NOT used for leave approval** |

**Key Rules:**
- ❌ **Self-approval blocked** - Cannot approve own leave
- ✅ **HR/ADMIN** - Can approve ANY employee's leave
- ✅ **Direct Manager** - Only if `employee.managerId === approverId`
- ❌ **Skip-level manager** - Not supported
- ❌ **Department manager** - Not used (stored but not enforced)

---

### Employee View Authorization (Backend)

**File:** `src/controllers/employee.controller.ts:83-98`

```typescript
// EMPLOYEE can only view self
if (req.user?.role === "EMPLOYEE" && req.user.userId !== targetId) {
  throw new AppError("You do not have permission to view this employee", 403);
}

// MANAGER can view self + direct reports
if (req.user?.role === "MANAGER" && req.user.userId !== targetId) {
  const managerId = employee.managerId?.toString();
  if (managerId !== req.user.userId) {
    throw new AppError("You can only view members of your team", 403);
  }
}
```

| Role | Can View |
|------|----------|
| EMPLOYEE | Self only |
| MANAGER | Self + direct reports (via `employee.managerId`) |
| HR | All |
| ADMIN | All |

---

### Report Access Authorization (Backend)

**File:** `src/services/report.service.ts:37-80`

```typescript
// MANAGER role - can view themselves and direct reports
const teamMembers = await Employee.find({
  $or: [{ managerId: auth.userId }, { _id: auth.userId }],
});
```

| Role | Report Scope |
|------|--------------|
| EMPLOYEE | ❌ No access to `/reports/*` endpoints |
| MANAGER | Self + direct reports (via `Employee.managerId`) |
| HR | All employees |
| ADMIN | All employees |

---

### Department Manager Authorization (NEW)

**File:** `src/middlewares/department-manager.middleware.ts`

```typescript
const isDepartmentManager = department.managerId && 
                            department.managerId.toString() === req.user!.userId;
```

| Operation | HR/ADMIN | Department Manager | Others |
|-----------|----------|-------------------|--------|
| PATCH `/departments/:id` | ✅ | ✅ | ❌ |
| POST `/departments` | ✅ | ❌ | ❌ |
| DELETE `/departments/:id` | ✅ | ❌ | ❌ |

**Note:** `Department.managerId` is ONLY used for department updates. Not used for leave approvals or reports.

---

## Frontend Authorization

### Route Guards (`App.tsx`)

| Route | Guard | Allowed Roles |
|-------|-------|---------------|
| `/login` | `PublicOnly` | Unauthenticated only |
| `/dashboard` | `RequireAuth` | All authenticated |
| `/attendance` | `RequireAuth` | All |
| `/leaves` | `RequireAuth` | All |
| `/leave-balances` | `RequireAuth` | All |
| `/holidays` | `RequireAuth` | All |
| `/leaves/approvals` | `RequireRole(["MANAGER","HR","ADMIN"])` | Manager+ |
| `/reports` | `RequireRole(["MANAGER","HR","ADMIN"])` | Manager+ |
| `/employees` | `RequireRole(["HR","ADMIN"])` | HR, ADMIN |
| `/departments` | `RequireRole(["HR","ADMIN"])` | HR, ADMIN |
| `/leave-types` | `RequireRole(["HR","ADMIN"])` | HR, ADMIN |
| `/audit-logs` | `RequireRole(["HR","ADMIN"])` | HR, ADMIN |

### Frontend API Calls (`lib/endpoints.ts`)

| API Object | Functions | Called By |
|------------|-----------|-----------|
| `authApi` | `login()` | LoginPage |
| `employeeApi` | `list`, `get`, `create`, `update` | EmployeesPage (HR/ADMIN) |
| `departmentApi` | `list`, `create`, `update`, `remove` | DepartmentsPage (HR/ADMIN/DeptMgr) |
| `leaveTypeApi` | `list`, `create`, `update` | LeaveTypesPage (HR/ADMIN) |
| `leaveBalanceApi` | `listAll`, `listMine`, `listByEmployee`, `create`, `update` | LeaveBalancesPage, Dashboard |
| `attendanceApi` | `checkIn`, `checkOut`, `today`, `list`, `summary` | AttendancePage, Dashboard |
| `leaveApi` | `create`, `listMine`, `listPending`, `get`, `approve`, `reject`, `cancel` | LeavesPage, LeaveApprovalsPage |
| `holidayApi` | `list`, `create`, `remove` | HolidaysPage |
| `reportApi` | `attendance`, `attendanceCsv`, `leaves`, `leavesCsv`, `dashboard` | ReportsPage, Dashboard |
| `auditLogApi` | `list` | AuditLogsPage |

---

### UI Role-Specific Features

#### Dashboard (`pages/dashboard.tsx`)

| Role | View |
|------|------|
| **EMPLOYEE** | Personal: today's check-in, my balances, upcoming holidays |
| **MANAGER/HR/ADMIN** | Org-wide: active employees, pending leaves, attendance today, charts |

#### Leaves Page (`pages/leaves.tsx`)

| Role | Features |
|------|----------|
| All | View own requests, apply for leave, cancel (PENDING/APPROVED) |

#### Leave Approvals (`pages/leave-approvals.tsx`)

| Role | Features |
|------|----------|
| **MANAGER** | View team's pending requests, approve/reject |
| **HR/ADMIN** | View ALL pending requests, approve/reject |

#### Leave Balances (`pages/leave-balances.tsx`)

| Role | Features |
|------|----------|
| **EMPLOYEE** | View own balances |
| **MANAGER** | View own balances |
| **HR/ADMIN** | View all, create, update allocations |

#### Reports (`pages/reports.tsx`)

| Role | Features |
|------|----------|
| **MANAGER** | Team/org attendance & leave reports, CSV export |
| **HR/ADMIN** | All reports, CSV export |

---

## Summary Matrix

### CRUD Operations by Role

| Resource | EMPLOYEE | MANAGER | HR | ADMIN |
|----------|----------|---------|-----|-------|
| **Employees** | | | | |
| Create | ❌ | ❌ | ✅ | ✅ |
| Read (all) | ❌ | Team only | ✅ | ✅ |
| Read (self) | ✅ | ✅ | ✅ | ✅ |
| Update | ❌ | ❌ | ✅ | ✅ |
| Delete | ❌ | ❌ | ❌ | ❌* |
| **Departments** | | | | |
| Create | ❌ | ❌ | ✅ | ✅ |
| Read | ✅ | ✅ | ✅ | ✅ |
| Update | ❌ | Dept Mgr only | ✅ | ✅ |
| Delete | ❌ | ❌ | ✅ | ✅ |
| **Leave Types** | | | | |
| Create | ❌ | ❌ | ✅ | ✅ |
| Read | ✅ | ✅ | ✅ | ✅ |
| Update | ❌ | ❌ | ✅ | ✅ |
| Delete | ❌ | ❌ | ✅ | ✅ |
| **Leave Balances** | | | | |
| Create | ❌ | ❌ | ✅ | ✅ |
| Read (own) | ✅ | ✅ | ✅ | ✅ |
| Read (all) | ❌ | ❌ | ✅ | ✅ |
| Update | ❌ | ❌ | ✅ | ✅ |
| **Leave Requests** | | | | |
| Create (own) | ✅ | ✅ | ✅ | ✅ |
| Read (own) | ✅ | ✅ | ✅ | ✅ |
| Read (team) | ❌ | ✅ | ✅ | ✅ |
| Read (all) | ❌ | ❌ | ✅ | ✅ |
| Approve | ❌ | Team only | ✅ | ✅ |
| Reject | ❌ | Team only | ✅ | ✅ |
| Cancel (own) | ✅ | ✅ | ✅ | ✅ |
| Cancel (other) | ❌ | ❌ | ✅ | ✅ |
| **Attendance** | | | | |
| Check-in/out (own) | ✅ | ✅ | ✅ | ✅ |
| View (own) | ✅ | ✅ | ✅ | ✅ |
| View (team) | ❌ | ✅ | ✅ | ✅ |
| View (all) | ❌ | ❌ | ✅ | ✅ |
| **Holidays** | | | | |
| View | ✅ | ✅ | ✅ | ✅ |
| Create | ❌ | ❌ | ✅ | ✅ |
| Update | ❌ | ❌ | ✅ | ✅ |
| Delete | ❌ | ❌ | ✅ | ✅ |
| **Reports** | | | | |
| View | ❌ | ✅ | ✅ | ✅ |
| Export CSV | ❌ | ✅ | ✅ | ✅ |
| **Audit Logs** | | | | |
| View | ❌ | ❌ | ✅ | ✅ |

*Employees are deactivated (status=INACTIVE), not deleted.

---

## Key Implementation Details

### 1. Two Manager Concepts (Critical)

| Concept | Field | Used For |
|---------|-------|----------|
| **Direct Manager** | `Employee.managerId` | Leave approval, report access, employee view |
| **Department Manager** | `Department.managerId` | Department updates ONLY |

These are **completely separate** - an employee's direct manager may be different from their department's manager.

### 2. Authorization Enforcement Layers

```
Frontend (Route Guards)
    ↓
Backend (Middleware: authorize())
    ↓
Service Layer (Business Logic Checks)
    ↓
Database (RLS not used - enforced in services)
```

### 3. Token Payload (JWT)

```typescript
// src/utils/jwt.ts - generateAccessToken()
{
  userId: string,
  employeeCode: string,
  role: EmployeeRole,
  departmentId?: string,
  managerId?: string  // Employee's direct manager
}
```

### 4. Refresh Token Flow

- Access Token: 15min, in localStorage, sent in Authorization header
- Refresh Token: 7 days, HttpOnly cookie, sent automatically with `/auth/refresh`
- Rotation: New refresh token issued on each use (stored hashed in DB)

---

## Future Considerations

1. **Department Manager Expansion** - Could extend to:
   - Department-level leave approvals
   - Department budget ownership
   - Department reporting

2. **Skip-Level Approval** - For when manager is on leave

3. **Delegation** - Temporary approval rights

4. **Resource-Level Permissions** - More granular than role-based

5. **Audit Log Retention Policy** - Currently unlimited

---

## Files Reference

### Backend
- `src/middlewares/auth.middleware.ts` - JWT verification
- `src/middlewares/role.middleware.ts` - Role authorization
- `src/middlewares/department-manager.middleware.ts` - Dept manager check
- `src/services/leave-request.service.ts` - Leave approval logic
- `src/services/report.service.ts` - Report access logic
- `src/controllers/employee.controller.ts` - Employee view logic
- `src/routes/*.routes.ts` - Route-level middleware application

### Frontend
- `src/components/guards.tsx` - Route guards
- `src/context/auth.tsx` - Auth state + role checks
- `src/App.tsx` - Route definitions with guards
- `src/pages/*.tsx` - Page-level role-specific UI