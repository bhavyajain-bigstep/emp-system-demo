# Employee Leave & Attendance Management System
## MongoDB + Mongoose Database Design Specification

**Version:** 1.0  
**Date:** 17 August 2026  
**Backend:** Node.js + Express.js + TypeScript  
**Database:** MongoDB  
**ODM:** Mongoose

---

## 1. Purpose

This document defines the backend database design for the Employee Leave & Attendance Management System.

The implementation will use **MongoDB with Mongoose and TypeScript**.

This document is intended to be shared with the teammate responsible for designing and implementing the database.

It covers:

- Collections
- Fields
- Data types
- Relationships
- References
- Validation
- Indexes
- Business rules
- Leave workflow
- Attendance rules
- Timezone handling
- Transactions
- Audit requirements
- Sample documents
- Seed-data requirements

---

# 2. Technology & Design Principles

| Area | Decision |
|---|---|
| Database | MongoDB |
| ODM | Mongoose |
| Backend | Node.js + Express.js + TypeScript |
| IDs | MongoDB ObjectId |
| Authentication | JWT |
| Password storage | Password hash only |
| Timestamps | UTC |
| Timezone | IANA timezone, e.g. `Asia/Kolkata` |
| Validation | Mongoose + service-layer validation |
| Transactions | MongoDB transactions for multi-document state changes |

### General principles

1. Use `ObjectId` references for entities that are independently queried or have their own lifecycle.
2. Business rules should primarily be implemented in the **service layer**.
3. Mongoose validation and MongoDB indexes should provide an additional data-integrity layer.
4. Never store plaintext passwords.
5. Store timestamps in UTC.
6. Attendance and leave calculations must be timezone-aware.
7. Use MongoDB transactions whenever multiple documents must change atomically.
8. Avoid physically deleting important HR records.
9. Prefer `status: INACTIVE` for historical employee/department records.
10. Do not embed unlimited attendance or leave arrays inside Employee documents.

---

# 3. Proposed MongoDB Collections

| Collection | Purpose |
|---|---|
| `employees` | Employee identity, login, role, manager and department relationships |
| `departments` | Organizational departments and their managers |
| `attendance` | Daily attendance and check-in/check-out records |
| `leaveTypes` | Configurable leave categories and policies |
| `leaveBalances` | Employee leave allocation and usage |
| `leaveRequests` | Leave applications and approval workflow |
| `holidays` | Company holidays |
| `auditLogs` | Audit trail for important HR/security actions |

---

# 4. Relationship Model

```text
                    ┌──────────────┐
                    │ Department   │
                    └──────┬───────┘
                           │
                           │ departmentId
                           ▼
                    ┌──────────────┐
                    │   Employee   │
                    └──────┬───────┘
                           │
              ┌────────────┼─────────────┐
              │            │             │
              ▼            ▼             ▼
        Attendance    LeaveRequest   LeaveBalance
                            │             │
                            ▼             ▼
                       LeaveType      LeaveType

Employee ───────────────► AuditLog

Holiday ───────────────► Leave calculation
```

### Relationships

```text
Department 1 ───< Employee

Employee 1 ───< Attendance

Employee 1 ───< LeaveRequest

Employee 1 ───< LeaveBalance

LeaveType 1 ───< LeaveRequest

LeaveType 1 ───< LeaveBalance

Employee 1 ───< AuditLog

Employee 1 ───< Employee
          manager → direct reports
```

---

# 5. Employee Collection

**Collection:** `employees`

### Purpose

Stores employee profile, authentication metadata, organizational relationships, role and employment status.

### Fields

| Field | Type | Required | Constraints | Reference | Notes |
|---|---|---:|---|---|---|
| `_id` | ObjectId | Yes | Primary key | — | Mongoose default |
| `employeeCode` | String | Yes | Unique, trimmed | — | Human-readable employee identifier |
| `name` | String | Yes | Trimmed, length limit | — | Employee full/display name |
| `email` | String | Yes | Unique, lowercase | — | Login identifier |
| `passwordHash` | String | Yes | Never expose | — | bcrypt/bcryptjs hash |
| `role` | String | Yes | `EMPLOYEE`, `MANAGER`, `HR`, `ADMIN` | — | Authorization role |
| `managerId` | ObjectId | No | Must not self-reference | Employee | Direct manager |
| `departmentId` | ObjectId | No | Valid department | Department | Employee department |
| `joiningDate` | Date | Yes | Valid employment date | — | Used for eligibility |
| `status` | String | Yes | `ACTIVE`, `INACTIVE`, `SUSPENDED` | — | Employment/account status |
| `timezone` | String | Yes | IANA timezone | — | Example: `Asia/Kolkata` |
| `createdAt` | Date | Auto | UTC | — | Mongoose timestamp |
| `updatedAt` | Date | Auto | UTC | — | Mongoose timestamp |

### Indexes

```text
UNIQUE employeeCode

UNIQUE email

INDEX managerId

INDEX departmentId + status

INDEX status
```

### Rules

- `employeeCode` must be unique.
- Email must be normalized to lowercase.
- Password must never be stored as plaintext.
- `passwordHash` should preferably use `select: false`.
- Employee cannot change their own role.
- Employee should not be able to assign themselves as their own manager.
- Service layer should prevent manager hierarchy cycles.
- Employees should normally be deactivated instead of deleted.

---

# 6. Department Collection

**Collection:** `departments`

### Purpose

Stores organizational departments.

### Fields

| Field | Type | Required | Constraints | Reference | Notes |
|---|---|---:|---|---|---|
| `_id` | ObjectId | Yes | Primary key | — | Mongoose default |
| `name` | String | Yes | Unique, trimmed | — | Department name |
| `managerId` | ObjectId | No | Valid employee | Employee | Department manager |
| `status` | String | Yes | `ACTIVE`, `INACTIVE` | — | Department status |
| `createdAt` | Date | Auto | UTC | — | Mongoose timestamp |
| `updatedAt` | Date | Auto | UTC | — | Mongoose timestamp |

### Indexes

```text
UNIQUE normalized name

INDEX managerId

INDEX status
```

### Rules

- Two active departments should not have the same normalized name.
- Department manager should have an appropriate role.
- Inactive departments should normally remain for historical records.

---

# 7. Attendance Collection

**Collection:** `attendance`

### Purpose

Stores attendance records for employees.

### Fields

| Field | Type | Required | Constraints | Reference | Notes |
|---|---|---:|---|---|---|
| `_id` | ObjectId | Yes | Primary key | — | Mongoose default |
| `employeeId` | ObjectId | Yes | Required reference | Employee | Attendance owner |
| `date` | String | Yes | `YYYY-MM-DD` | — | Business/local attendance date |
| `checkIn` | Date | No | UTC timestamp | — | Actual check-in |
| `checkOut` | Date | No | UTC timestamp | — | Actual check-out |
| `status` | String | Yes | `PRESENT`, `LATE`, `ABSENT`, `ON_LEAVE`, `HALF_DAY` | — | Attendance status |
| `lateMinutes` | Number | No | >= 0 | — | Calculated lateness |
| `notes` | String | No | Length limit | — | Optional admin note |
| `createdAt` | Date | Auto | UTC | — | Mongoose timestamp |
| `updatedAt` | Date | Auto | UTC | — | Mongoose timestamp |

### Recommended representation of date

Use:

```text
date = "2026-08-17"
```

for the employee/company local business date.

Use UTC timestamps for actual events:

```text
checkIn  = 2026-08-17T04:00:00.000Z
checkOut = 2026-08-17T12:30:00.000Z
```

This separates:

- **What calendar day the attendance belongs to**
- **The exact moment the event happened**

### Critical index

```text
UNIQUE employeeId + date
```

This is extremely important.

It prevents:

```text
Employee EMP001
2026-08-17
```

from having two attendance documents.

### Additional indexes

```text
INDEX employeeId + date

INDEX date + status
```

### Rules

1. Employee cannot check in twice for the same business date.
2. Check-out requires a check-in.
3. Check-out must be after check-in.
4. Check-in/check-out timestamps are stored in UTC.
5. `date` is calculated using the applicable timezone.
6. Whether ABSENT documents are physically created or derived during reporting must be decided by the team.

---

# 8. LeaveType Collection

**Collection:** `leaveTypes`

### Purpose

Defines configurable leave categories and their policies.

Examples:

```text
Annual Leave
Sick Leave
Casual Leave
Maternity Leave
Paternity Leave
```

### Fields

| Field | Type | Required | Constraints | Reference | Notes |
|---|---|---:|---|---|---|
| `_id` | ObjectId | Yes | Primary key | — | Mongoose default |
| `name` | String | Yes | Unique, trimmed | — | Display name |
| `code` | String | Yes | Unique uppercase | — | Stable programmatic identifier |
| `annualQuota` | Number | Yes | >= 0 | — | Default allocation |
| `rules` | Object | Yes | Policy configuration | — | Leave policy |
| `status` | String | Yes | `ACTIVE`, `INACTIVE` | — | Policy status |
| `createdAt` | Date | Auto | UTC | — | Mongoose timestamp |
| `updatedAt` | Date | Auto | UTC | — | Mongoose timestamp |

### Recommended `rules`

```json
{
  "allowNegativeBalance": false,
  "excludeWeekends": true,
  "excludeMandatoryHolidays": true,
  "excludeOptionalHolidays": false,
  "allowHalfDay": false,
  "allowCancellation": true,
  "maxConsecutiveDays": 15,
  "minNoticeDays": 2
}
```

### Indexes

```text
UNIQUE code

UNIQUE normalized name

INDEX status
```

### Rules

- Inactive leave types should not accept new requests.
- Policy changes should not silently rewrite historical requests.
- Historical leave requests must remain understandable after policy changes.

---

# 9. LeaveBalance Collection

**Collection:** `leaveBalances`

### Purpose

Stores the leave balance for an employee and leave type for a specific year.

### Fields

| Field | Type | Required | Constraints | Reference | Notes |
|---|---|---:|---|---|---|
| `_id` | ObjectId | Yes | Primary key | — | Mongoose default |
| `employeeId` | ObjectId | Yes | Reference | Employee | Owner |
| `leaveTypeId` | ObjectId | Yes | Reference | LeaveType | Leave category |
| `year` | Number | Yes | Valid policy year | — | Example: 2026 |
| `allocated` | Number | Yes | >= 0 | — | Allocated days |
| `used` | Number | Yes | >= 0 | — | Used days |
| `adjustments` | Number | Yes | Default 0 | — | HR adjustment |
| `available` | Number | Yes | >= 0 unless policy allows negative | — | Remaining days |
| `createdAt` | Date | Auto | UTC | — | Mongoose timestamp |
| `updatedAt` | Date | Auto | UTC | — | Mongoose timestamp |

### Balance calculation

Recommended:

```text
available = allocated + adjustments - used
```

Example:

```text
allocated   = 20
adjustments = 2
used        = 5

available = 20 + 2 - 5
available = 17
```

### Critical index

```text
UNIQUE employeeId + leaveTypeId + year
```

### Additional indexes

```text
INDEX employeeId + year

INDEX leaveTypeId + year
```

### Rules

- One employee cannot have duplicate balances for the same leave type and year.
- `used` cannot become negative.
- Balance changes should happen through the service layer.
- Approval/cancellation balance changes should use MongoDB transactions.
- Define one source of truth for `available`.

---

# 10. LeaveRequest Collection

**Collection:** `leaveRequests`

### Purpose

Stores employee leave applications and approval workflow.

### Fields

| Field | Type | Required | Constraints | Reference | Notes |
|---|---|---:|---|---|---|
| `_id` | ObjectId | Yes | Primary key | — | Mongoose default |
| `employeeId` | ObjectId | Yes | Required reference | Employee | Applicant |
| `leaveTypeId` | ObjectId | Yes | Required reference | LeaveType | Leave category |
| `fromDate` | String | Yes | `YYYY-MM-DD` | — | Start date |
| `toDate` | String | Yes | `YYYY-MM-DD` | — | End date |
| `days` | Number | Yes | > 0 | — | Server-calculated business days |
| `reason` | String | Yes | Trimmed/length limit | — | Employee reason |
| `status` | String | Yes | `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED` | — | Workflow status |
| `approvedBy` | ObjectId | No | Reference | Employee | Approver |
| `approvedAt` | Date | No | UTC | — | Approval time |
| `rejectedBy` | ObjectId | No | Reference | Employee | Rejector |
| `rejectedAt` | Date | No | UTC | — | Rejection time |
| `rejectionReason` | String | No | Length limit | — | Rejection reason |
| `cancelledAt` | Date | No | UTC | — | Cancellation time |
| `cancelledBy` | ObjectId | No | Reference | Employee | Who cancelled |
| `createdAt` | Date | Auto | UTC | — | Mongoose timestamp |
| `updatedAt` | Date | Auto | UTC | — | Mongoose timestamp |

### Indexes

```text
INDEX employeeId + status

INDEX employeeId + fromDate + toDate

INDEX status + fromDate

INDEX approvedBy
```

### Important note about overlap

MongoDB indexes cannot directly enforce arbitrary date-range overlap.

Therefore overlap must be checked in the service layer.

Example:

```text
Existing approved leave:
20 Aug → 25 Aug

New request:
23 Aug → 27 Aug

Result:
REJECT
```

### Rules

1. `fromDate <= toDate`.
2. `days` must be calculated by the backend.
3. Never trust the `days` value supplied by the frontend.
4. Only `PENDING` requests can normally be approved/rejected.
5. Only the employee's manager or authorized HR/Admin can approve/reject.
6. Approved leave cannot overlap another approved leave for the same employee.
7. Approval and balance update must be atomic.
8. Rejection normally does not consume balance.
9. Cancellation must follow the defined restoration policy.
10. Approval/rejection/cancellation should generate audit logs.

---

# 11. Holiday Collection

**Collection:** `holidays`

### Purpose

Stores company holidays used by leave and attendance calculations.

### Fields

| Field | Type | Required | Constraints | Reference | Notes |
|---|---|---:|---|---|---|
| `_id` | ObjectId | Yes | Primary key | — | Mongoose default |
| `date` | String | Yes | `YYYY-MM-DD` | — | Calendar date |
| `name` | String | Yes | Trimmed | — | Holiday name |
| `type` | String | Yes | `MANDATORY`, `OPTIONAL` | — | Holiday type |
| `status` | String | Yes | `ACTIVE`, `INACTIVE` | — | Allows corrections |
| `createdAt` | Date | Auto | UTC | — | Mongoose timestamp |
| `updatedAt` | Date | Auto | UTC | — | Mongoose timestamp |

### Indexes

```text
UNIQUE date

INDEX date + type
```

### Rules

- Avoid duplicate holidays on the same date.
- Leave calculation should consult holiday rules from `LeaveType`.
- Optional holidays may be treated differently from mandatory holidays.

---

# 12. AuditLog Collection

**Collection:** `auditLogs`

### Purpose

Provides an immutable audit trail for important HR/security/workflow actions.

Examples:

```text
LEAVE_APPROVED
LEAVE_REJECTED
LEAVE_CANCELLED
EMPLOYEE_CREATED
EMPLOYEE_UPDATED
EMPLOYEE_DEACTIVATED
```

### Fields

| Field | Type | Required | Constraints | Reference | Notes |
|---|---|---:|---|---|---|
| `_id` | ObjectId | Yes | Primary key | — | Mongoose default |
| `actorId` | ObjectId | Yes | Reference | Employee | Person performing action |
| `action` | String | Yes | Controlled values | — | Action name |
| `entityType` | String | Yes | Controlled values | — | Affected entity |
| `entityId` | ObjectId | Yes | Entity ID | — | Affected record |
| `before` | Object | No | Snapshot | — | Previous state |
| `after` | Object | No | Snapshot | — | New state |
| `metadata` | Object | No | Structured JSON | — | Additional context |
| `createdAt` | Date | Auto | UTC | — | Event timestamp |

### Indexes

```text
INDEX actorId + createdAt

INDEX entityType + entityId + createdAt

INDEX action + createdAt
```

### Rules

- Audit logs should be append-only.
- Do not update audit records normally.
- Never store passwords, JWTs or other secrets.
- Metadata may contain a request/correlation ID.
- Do not use TTL unless HR/legal retention requirements explicitly permit it.

---

# 13. Embedded vs Referenced Data

## Use references for:

```text
Employee
Department
LeaveType
LeaveRequest
LeaveBalance
```

These entities are independently queried and have separate lifecycles.

## Embed:

```text
LeaveType.rules
AuditLog.metadata
AuditLog.before
AuditLog.after
```

These objects belong directly to their parent document.

## Do NOT embed:

```text
Employee.attendance[]
Employee.leaveRequests[]
Employee.leaveBalances[]
```

These arrays can grow significantly and would make updates and reporting inefficient.

---

# 14. Critical Index Summary

```text
employees
├── UNIQUE employeeCode
├── UNIQUE email
├── INDEX managerId
└── INDEX departmentId + status

departments
├── UNIQUE normalized name
├── INDEX managerId
└── INDEX status

attendance
├── UNIQUE employeeId + date
├── INDEX employeeId + date
└── INDEX date + status

leaveTypes
├── UNIQUE code
├── UNIQUE normalized name
└── INDEX status

leaveBalances
├── UNIQUE employeeId + leaveTypeId + year
├── INDEX employeeId + year
└── INDEX leaveTypeId + year

leaveRequests
├── INDEX employeeId + status
├── INDEX employeeId + fromDate + toDate
└── INDEX status + fromDate

holidays
├── UNIQUE date
└── INDEX date + type

auditLogs
├── INDEX actorId + createdAt
├── INDEX entityType + entityId + createdAt
└── INDEX action + createdAt
```

---

# 15. Critical Business Rules

These rules should be treated as the database/service contract.

### Attendance

1. An employee cannot check in twice without checking out.
2. An employee cannot have two attendance documents for the same business date.
3. Check-out requires check-in.
4. Check-out must occur after check-in.
5. Attendance date must be timezone-aware.
6. Actual timestamps should be stored in UTC.

### Leave

7. Leave request start date must not be after end date.
8. Leave days must be calculated server-side.
9. Leave cannot overlap approved leave.
10. Leave cannot exceed available balance unless policy allows negative balance.
11. Only the employee's manager or authorized HR/Admin can approve/reject.
12. Only pending requests can normally be approved/rejected.
13. Approval updates leave balance.
14. Rejection should not consume balance.
15. Cancellation follows the defined balance restoration rule.
16. Approval/rejection/cancellation should create an audit record.

### Employee

17. Employee email must be unique.
18. Employee code must be unique.
19. Employee cannot assign themselves as manager.
20. Employee roles must be protected by authorization.
21. Historical employee data should not normally be physically deleted.

---

# 16. MongoDB Transaction Requirements

Transactions are required whenever multiple documents must change together.

## Example: Approving Leave

The approval transaction should:

```text
1. Load LeaveRequest
       ↓
2. Verify status = PENDING
       ↓
3. Verify approver authorization
       ↓
4. Verify available balance
       ↓
5. Re-check approved leave overlap
       ↓
6. Update LeaveRequest → APPROVED
       ↓
7. Update LeaveBalance
       ↓
8. Insert AuditLog
       ↓
9. Commit transaction
```

If any operation fails:

```text
ABORT TRANSACTION
```

No partial state should remain.

For example, this must never happen:

```text
LeaveRequest = APPROVED
LeaveBalance = unchanged
```

---

# 17. Mongoose Schema Recommendations

Use:

```typescript
{
  timestamps: true
}
```

for most collections.

Recommended practices:

### Enums

Use enums for:

```text
Employee role
Employee status
Attendance status
Leave status
Leave type status
Holiday type
Holiday status
```

### Strings

Use:

```typescript
trim: true
```

where appropriate.

### Email

Normalize:

```text
lowercase
```

### Password

Use:

```typescript
select: false
```

for `passwordHash`.

### References

Use:

```typescript
type: Schema.Types.ObjectId,
ref: "Employee"
```

for relationships.

### Indexes

Define important indexes explicitly.

### Business validation

Do not rely solely on Mongoose validation for rules requiring queries across documents.

For example:

```text
"Does this leave overlap an existing approved leave?"
```

must be handled in the service layer.

---

# 18. Sample Documents

## Employee

```json
{
  "_id": "ObjectId",
  "employeeCode": "EMP001",
  "name": "Jayant Kaushik",
  "email": "jayant@example.com",
  "passwordHash": "<hash>",
  "role": "EMPLOYEE",
  "managerId": "ObjectId",
  "departmentId": "ObjectId",
  "joiningDate": "2026-01-10",
  "status": "ACTIVE",
  "timezone": "Asia/Kolkata",
  "createdAt": "UTC",
  "updatedAt": "UTC"
}
```

## Attendance

```json
{
  "_id": "ObjectId",
  "employeeId": "ObjectId",
  "date": "2026-08-17",
  "checkIn": "2026-08-17T04:00:00.000Z",
  "checkOut": "2026-08-17T12:30:00.000Z",
  "status": "PRESENT",
  "lateMinutes": 0
}
```

## LeaveRequest

```json
{
  "_id": "ObjectId",
  "employeeId": "ObjectId",
  "leaveTypeId": "ObjectId",
  "fromDate": "2026-08-20",
  "toDate": "2026-08-22",
  "days": 3,
  "reason": "Personal work",
  "status": "PENDING"
}
```

## LeaveBalance

```json
{
  "_id": "ObjectId",
  "employeeId": "ObjectId",
  "leaveTypeId": "ObjectId",
  "year": 2026,
  "allocated": 20,
  "used": 5,
  "adjustments": 0,
  "available": 15
}
```

---

# 19. Questions to Confirm Before Implementation

These decisions can affect the database design and should be agreed with the team.

1. Is the leave year the calendar year or a company-specific financial/HR year?
2. Should leave balance be deducted on approval or request creation?
3. Can employees cancel approved leave?
4. If cancellation is allowed, what is the cancellation deadline?
5. Can managers approve their own leave?
6. If not, who approves manager leave?
7. Can HR approve any employee's leave?
8. Are half-day leaves supported?
9. Are weekends always excluded?
10. Can weekends be configured per leave type?
11. Are mandatory holidays excluded automatically?
12. Are optional holidays excluded automatically?
13. Can employees apply for leave retrospectively?
14. What determines a late check-in?
15. What is the standard working time?
16. Should absent attendance records be physically created?
17. Or should absence be derived by reports?
18. Can employees change departments?
19. Can employees change managers?
20. Does historical manager/department data need to be preserved?
21. How long should audit logs be retained?
22. Is multi-company/tenant support required?
23. What is the default company timezone?
24. Can employees have a different timezone from the company?
25. What happens to unused leave at the end of the year?
26. Can leave balances be carried forward?
27. Can HR manually adjust leave balances?
28. Do different departments have different leave policies?

---

# 20. Recommended Database Implementation Order

Implement the schemas in this order:

```text
1. Department
       ↓
2. Employee
       ↓
3. LeaveType
       ↓
4. LeaveBalance
       ↓
5. Holiday
       ↓
6. Attendance
       ↓
7. LeaveRequest
       ↓
8. AuditLog
```

Then:

```text
9. Add indexes
       ↓
10. Add seed data
       ↓
11. Connect MongoDB
       ↓
12. Test relationships
       ↓
13. Implement service-layer business rules
       ↓
14. Implement transactions
```

---

# 21. Suggested Backend Folder Structure

After database design, the backend can follow:

```text
backend/
│
├── src/
│   │
│   ├── config/
│   │   ├── database.ts
│   │   └── env.ts
│   │
│   ├── controllers/
│   │
│   ├── errors/
│   │
│   ├── middlewares/
│   │
│   ├── models/
│   │   ├── employee.model.ts
│   │   ├── department.model.ts
│   │   ├── attendance.model.ts
│   │   ├── leave-type.model.ts
│   │   ├── leave-balance.model.ts
│   │   ├── leave-request.model.ts
│   │   ├── holiday.model.ts
│   │   └── audit-log.model.ts
│   │
│   ├── repositories/
│   │
│   ├── routes/
│   │
│   ├── services/
│   │
│   ├── types/
│   │
│   ├── utils/
│   │
│   ├── validators/
│   │
│   ├── app.ts
│   └── server.ts
│
├── .env
├── .env.example
├── .gitignore
├── package.json
└── tsconfig.json
```

---

# 22. Definition of Database Design Done

The database design is considered complete when:

- [ ] All required collections are defined.
- [ ] All fields have agreed types.
- [ ] Required/optional fields are decided.
- [ ] Enum values are decided.
- [ ] References are documented.
- [ ] Indexes are documented.
- [ ] Unique constraints are defined.
- [ ] Timezone strategy is finalized.
- [ ] Leave calculation rules are finalized.
- [ ] Leave balance lifecycle is finalized.
- [ ] Approval/rejection/cancellation rules are finalized.
- [ ] Audit requirements are finalized.
- [ ] Transaction requirements are identified.
- [ ] Seed data requirements are defined.
- [ ] Mongoose schemas can be implemented without major unresolved design questions.

---

# 23. Final Architecture Principle

The database should store **reliable state**, while the service layer should enforce **business behavior**.

For example:

```text
React UI
   ↓
REST API
   ↓
Controller
   ↓
Service
   ↓
Repository / Mongoose
   ↓
MongoDB
```

### Example leave approval

```text
Manager clicks "Approve"
          ↓
PUT /api/v1/leaves/:id/approve
          ↓
Authentication
          ↓
Authorization
          ↓
Validation
          ↓
Leave Service
          ↓
Check manager relationship
          ↓
Check leave status
          ↓
Check leave overlap
          ↓
Check leave balance
          ↓
MongoDB Transaction
     ┌────┴────┐
     ↓         ↓
LeaveRequest  LeaveBalance
     │
     ↓
AuditLog
     │
     ↓
Commit
     ↓
API Response
```

This separation is important because the frontend must never be trusted to enforce HR business rules.

---

# 24. Important Note

This is a **proposed v1 database design**.

Before freezing the Mongoose schemas, the team should confirm the questions in Section 19. Decisions such as:

- leave-year rules,
- half-day support,
- cancellation,
- holiday treatment,
- carry-forward,
- balance deduction timing,
- timezone handling,
- manager approval rules,

can directly affect the final database and service design.
