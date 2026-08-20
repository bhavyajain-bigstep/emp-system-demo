# Phase 2 Blockers & Follow-ups

## Architectural Violations (Phase 1 Compliance)

### leave-request.service.ts - Direct Mongoose Model Calls
The leave-request service contains extensive business logic with direct model calls that should be moved to repositories:

**Remaining direct calls:**
- Line 76: `Employee.findById()` - employee existence check
- Line 89: `LeaveType.findById()` - leave type existence check
- Line 360: `Employee.findById()` - in approve flow
- Line 373: `Employee.findById()` - in approve flow
- Line 410: `LeaveType.findById()` - in cancel flow
- Line 569: `Employee.findById()` - in reject flow
- Line 574: `Employee.findById()` - in reject flow
- Line 711: `LeaveType.findById()` - in another flow
- Line 728: `Employee.findById()` - in another flow

**Repository functions now available:**
- `findEmployeeByIdLean()` - for existence checks
- `findLeaveTypeById()` - for existence checks
- `findLeaveRequestByIdWithSession()` - for transactional reads

**Action needed:** Refactor leave-request.service.ts to use repository functions instead of direct model calls. This is a large refactor (~777 lines) and should be done carefully to preserve transaction semantics.

---

## Database Index Improvements (Post-Phase 2)

### LeaveRequest Collection
Current indexes:
- `employeeId` (single)
- `leaveTypeId` (single)
- `fromDate` (single)
- `toDate` (single)
- `status` (single)
- `{ employeeId: 1, fromDate: 1, toDate: 1 }` (compound)
- `{ status: 1, fromDate: 1 }` (compound)

**Recommended additions:**
1. `{ employeeId: 1, status: 1, createdAt: -1 }` - for employee leave history queries
2. `{ status: 1, createdAt: 1 }` - for pending queue (already have status+fromDate, but createdAt may be better for queue ordering)
3. `{ employeeId: 1, fromDate: 1, status: 1 }` - for overlap detection (covers employeeId + fromDate + status filter)

### Attendance Collection
Current index: `{ employeeId: 1, date: 1 }` unique - good for all attendance queries

### Employee Collection
Current indexes:
- `departmentId`
- `managerId`
- `status`

**Recommended additions:**
- `{ managerId: 1, status: 1 }` - for manager team queries with status filter

### LeaveBalance Collection
Current index: `{ employeeId: 1, leaveTypeId: 1, year: 1 }` unique - good

### Holiday Collection
Current index: `{ date: 1 }` - good

---

## Performance Optimizations (Post-Phase 2)

### 1. Aggregation Pipeline for Reports
The current report service fetches employee IDs first, then queries attendance/leave. For large datasets, consider a single aggregation pipeline:

```javascript
Attendance.aggregate([
  { $match: { date: { $gte: from, $lte: to } } },
  { $lookup: { from: "employees", localField: "employeeId", foreignField: "_id", as: "emp" } },
  { $unwind: "$emp" },
  { $match: { "emp._id": { $in: allowedIds } } },
  { $sort: { date: -1 } },
  { $skip: skip },
  { $limit: limit },
  { $project: { ... } }
])
```

This avoids the two-query pattern but requires careful handling of authorization.

### 2. Cursor-based Pagination
For very large datasets, offset pagination (`skip/limit`) becomes slow. Consider cursor-based pagination using `_id` or `createdAt` as cursor.

### 3. Read Replicas
For production, configure MongoDB read preferences to route report queries to secondary replicas.

### 4. Caching
Add Redis caching for:
- Leave type list (rarely changes)
- Holiday list for current year
- Employee manager relationships (for authz checks)

### 5. Database Connection Pooling
Verify MongoDB connection pool size matches expected concurrent requests.

---

## Phase 2 Completion Status

**Completed:**
- Added `.lean()` to all read-only repository queries
- Moved report queries from service to repositories (`findAttendanceReportPage`, `findLeaveReportPage`)
- Added employee repository helpers (`findEmployeeIdsByFilter`, `findManagerTeamAndSelfIds`, `findDirectReportIds`, `getEmployeeManagerId`)
- Added holiday repository functions (`findMandatoryHolidaysInRange`, `findHolidaysInRange`)
- Added leave-type repository with lean()
- Updated report service to use repositories with Promise.all for parallel queries
- Updated attendance service to use holiday repository
- Updated leave-day service to use holiday repository
- Updated leave-balance service to use employee/leave-type repositories
- Updated authorization service to use employee repository
- Build passes, tests pass

**Deferred to later phases:**
- Full refactor of leave-request.service.ts to remove all direct model calls
- Database index additions (require migration planning)
- Aggregation pipeline optimization for reports
- Cursor-based pagination
- Redis caching layer