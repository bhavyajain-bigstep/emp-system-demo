# Blockers & Follow-ups

This document tracks known issues, architectural debt, and future optimizations across the backend phases. Update it whenever a blocker is resolved or a new one is discovered.

---

## Architectural Violations (Phase 1 Compliance)

### leave-request.service.ts - Direct Mongoose Model Calls
The leave-request service still contains direct Mongoose calls that bypass the repository layer:

**Remaining direct calls (approximate line numbers):**
- `Employee.findById()` — employee existence checks (~7 occurrences in create/approve/reject/cancel flows)
- `LeaveType.findById()` — leave type existence checks (~3 occurrences)
- `LeaveRequest.findById().session()` — transactional reads (2 occurrences; repository wrapper `findLeaveRequestByIdWithSession` already exists)

**Repository functions already available:**
- `findEmployeeByIdLean()` — for existence checks
- `findLeaveTypeById()` — for existence checks
- `findLeaveRequestByIdWithSession()` — for transactional reads

**Action needed:** Refactor `leave-request.service.ts` to use repository functions. This is a large refactor (~789 lines) and must be done carefully to preserve transaction semantics (approve and cancel run inside MongoDB sessions).

**Severity:** Medium. Functionally correct today; violates the documented layer boundary and Phase 1 acceptance criteria.

---

## Database Index Improvements

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
1. `{ employeeId: 1, status: 1, createdAt: -1 }` — for employee leave history queries.
2. `{ status: 1, createdAt: 1 }` — for pending queue (currently served by `status + fromDate`; createdAt may be more accurate for FIFO ordering).
3. `{ employeeId: 1, fromDate: 1, status: 1 }` — for overlap detection (covers employeeId + fromDate + status filter).

### Attendance Collection
Current index: `{ employeeId: 1, date: 1 }` unique. Sufficient for the current attendance queries.

### Employee Collection
Current indexes: `departmentId`, `managerId`, `status`.

**Recommended addition:**
- `{ managerId: 1, status: 1 }` — for manager team queries that filter by active status.

### LeaveBalance Collection
Current index: `{ employeeId: 1, leaveTypeId: 1, year: 1 }` unique. Sufficient.

### Holiday Collection
Current index: `{ date: 1 }`. Sufficient.

---

## Performance Optimizations

### 1. Aggregation Pipeline for Reports
The report service currently fetches employee IDs first, then queries attendance/leave with `$in`. For very large datasets, consider a single aggregation pipeline:

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

This avoids the two-query pattern but requires careful authorization handling.

### 2. Cursor-based Pagination
For very large datasets, offset pagination (`skip/limit`) becomes slow. Consider cursor-based pagination using `_id` or `createdAt` as the cursor for audit logs and report endpoints.

### 3. Read Replicas
For production, configure MongoDB read preferences to route report and audit-log queries to secondary replicas.

### 4. Caching Layer
Add Redis caching for:
- Leave type list (rarely changes)
- Holiday list for current year
- Employee manager relationships (for repeated authz checks)

### 5. Database Connection Pooling
Verify MongoDB connection pool size matches expected concurrent requests.

### 6. Audit Log Partitioning
Audit logs grow unbounded. Consider TTL indexing (e.g., retain 12 months) or partition by month.

---

## Phase Status

| Phase | Focus                            | Status     | Commit        |
|-------|----------------------------------|------------|---------------|
| 1     | Architecture and API boundaries  | Complete   | `b4e49c5`     |
| 2     | Performance (lean, projections)  | Complete   | `a3c0de9`     |
| 3     | Audit logging and error handling | Complete   | `056cf9c`     |
| 4     | Maintainability (helpers, DTOs)  | Pending    | —             |
| 5     | Scalability / operational        | Pending    | —             |
| 6     | Testing (unit + integration)     | In progress (unit tests in place; integration tests pending) | — |

### Phase 4 Follow-ups
- Standardize request helpers (`getPagination`, ObjectId validation, authenticated-user extraction)
- Split long leave workflow functions into named private helpers (load, authorize, verify balance, transaction, audit, notify)
- Use explicit DTO types for public API responses, especially Employee
- Configure ESLint and Prettier scripts
- Align Swagger descriptions with actual authorization behavior

### Phase 5 Follow-ups
- Document MongoDB transaction prerequisites (replica set, retry behavior)
- Add graceful shutdown handling for HTTP server and MongoDB
- Add readiness/liveness endpoints (`/health` exists; consider `/ready` separately)
- Add metrics for request latency, error rate, DB operation duration
- Review rate limits for expensive report/export endpoints
- Create Docker Compose local deployment path
