# Backend Improvement Guide

## Purpose

This guide turns the current backend from a solid foundation (roughly 6–7/10 overall) into a high-quality, internship-ready backend (target: 9+/10) through small, reviewable phases.

Work through **one phase at a time**. Each phase has a clear objective, bounded work, and completion checks. Do not start a later phase until the current phase is validated and committed locally.

Scope: backend only. The frontend is intentionally out of scope.

## Current Baseline

- TypeScript build passes.
- Unit tests currently cover JWT configuration, role middleware, and pagination.
- Authentication, direct-report authorization, transactional leave approval/cancellation, pagination, and streamed CSV exports exist.
- The layered structure is Routes → Middleware → Controllers → Services → Repositories → Models.
- The main remaining risks are incomplete tests, inconsistent layer boundaries, report-query cost, operational maturity, and documentation coverage.

## Working Rules for Every Phase

1. Create a focused local branch: `improve/<phase-name>`.
2. Make only changes that belong to that phase.
3. Keep the MongoDB persisted schema unchanged unless a separate, reviewed migration is explicitly approved.
4. Run at least `npm run build`, `npm test`, and `git diff --check` before committing.
5. Record changed behavior and validation evidence in the PR/commit description.
6. Prefer a small helper or focused test over broad rewrites.

---

## Phase 1 — Architecture and API Boundaries

### Goal

Make ownership, authorization, and data-access responsibilities predictable in every feature module.

### Why first

Performance, testability, and safety all improve when request flow and module boundaries are consistent.

### TODO

- [ ] Define an authorization matrix in `docs/` for every endpoint: role, ownership rule, manager/team rule, and HR/Admin override.
- [ ] Review every route against that matrix. Include employee, attendance, leave, leave balance, leave type, holiday, department, and report routes.
- [ ] Move remaining direct Mongoose model calls out of controllers and into repositories or narrowly scoped authorization/query services.
- [ ] Keep controllers limited to request parsing, calling a service, and forming responses.
- [ ] Standardize ownership checks through `authorization.service.ts`; avoid one-off role comparisons.
- [ ] Ensure manager access always means **direct reports only** unless an endpoint explicitly documents another scope.
- [ ] Decide and document the department lifecycle behavior. Current schema cannot represent an archived department; do not add fields without a separate schema-migration decision.
- [ ] Add route-level API versioning checks: every application API must remain under `/api/v1`.
- [ ] Extract bulky Swagger blocks only if it improves maintainability without losing generated documentation.

### Completion checks

- Every endpoint has a documented actor/access rule.
- No controller contains database queries.
- Authorization behavior is consistent for list, detail, update, and workflow actions.
- No schema change is introduced accidentally.

### Expected score impact

Architecture: 6.5 → 8.0+; maintainability and security also improve.

---

## Phase 2 — Performance

### Goal

Keep ordinary API requests efficient as employee, attendance, and leave data grows.

### TODO

- [ ] Inventory each list/report query: filters, sorting, populated relations, pagination, and expected data volume.
- [ ] Use `lean()` for read-only repository/report queries where Mongoose document methods are not needed.
- [ ] Select only fields required by each response; avoid returning emails or internal fields unless needed.
- [ ] Inspect query plans with MongoDB `explain()` using realistic filters for attendance, leave requests, balances, and reports.
- [ ] Verify indexes support actual report filters and sort order. Do not add/drop indexes casually in production; document the rollout.
- [ ] Keep pagination bounded and verify no endpoint permits unbounded `limit` values.
- [ ] Keep CSV exports streaming and measure memory usage with representative large datasets.
- [ ] Avoid repeated employee lookups within loops; batch IDs or use aggregation only where it clearly reduces query count.
- [ ] Add performance test fixtures for at least hundreds of attendance/leave records.

### Completion checks

- List/report endpoints have a documented maximum page size.
- High-traffic read paths use projections and `lean()` appropriately.
- Query-plan evidence exists for the main attendance and leave report filters.
- Exports do not build the complete CSV in memory.

### Expected score impact

Performance: 6.5 → 8.5+.

---

## Phase 3 — Audit Logging and Error Handling

### Goal

Make failures actionable and sensitive workflow changes traceable without leaking secrets.

### TODO

- [ ] Define an audit-event catalog: employee changes, leave create/approve/reject/cancel, balance changes, leave policy changes, holidays, and authentication failures.
- [ ] Make audit logging resilient but observable: it may not block a successful user action, but failures must be visible through structured logs/metrics.
- [ ] Add request correlation IDs and include them in application/error logs and API error responses where appropriate.
- [ ] Replace ad-hoc `console.log/error` calls with a small structured logger abstraction.
- [ ] Separate operational logs from audit logs; never log passwords, password hashes, JWTs, or authorization headers.
- [ ] Normalize error codes and messages for validation, authentication, authorization, conflicts, missing records, and transaction failures.
- [ ] Validate query and route parameters as well as request bodies.
- [ ] Add a transaction error policy: transient transaction errors may retry; client-visible errors must remain consistent.
- [ ] Confirm streamed-response errors are logged even after response headers are sent.

### Completion checks

- Every important state change emits one documented audit event.
- Logs are structured, secret-safe, and correlate to a request.
- Error responses have stable codes and do not expose internals.
- Invalid query parameters return a validation error rather than reaching database code.

### Expected score impact

Error handling: 7.5 → 9.0+; operational readiness rises significantly.

---

## Phase 4 — Maintainability and Readability

### Goal

Reduce repetition and make business rules easier for another intern or reviewer to change safely.

### TODO

- [ ] Introduce shared request helpers for pagination, ObjectId validation, and authenticated-user extraction where repetition remains.
- [ ] Split long leave workflow functions into named private helpers: load request, authorize approver, verify balance, execute transaction, write audit event, notify.
- [ ] Use explicit request/response DTO types for public API data, especially Employee responses.
- [ ] Standardize naming (`checkInAt` vs. check-in terminology, `MONGO_URI`, error codes, service method names).
- [ ] Remove dead code, outdated comments, and documentation that contradict current behavior.
- [ ] Configure ESLint and Prettier with scripts, then format incrementally rather than as a noisy repository-wide rewrite.
- [ ] Keep Swagger route descriptions aligned with actual authorization and response behavior.
- [ ] Add concise module-level comments only where a rule is non-obvious (transactions, timezone handling, leave balance semantics).

### Completion checks

- New contributors can trace a feature from route to repository without hidden behavior.
- Business rules have a single authoritative implementation.
- Lint and formatting checks run locally.
- Public responses are represented by explicit safe DTOs.

### Expected score impact

Maintainability/readability: 6.5 → 9.0+.

---

## Phase 5 — Scalability and Operational Readiness

### Goal

Ensure the API can run reliably with more users, data, and concurrent requests.

### TODO

- [ ] Confirm the API has no process-local business state and can run multiple instances safely.
- [ ] Document MongoDB requirements for transactions: replica set deployment and transaction retry behavior.
- [ ] Add graceful shutdown handling for HTTP server and MongoDB connection; stop accepting new requests before closing resources.
- [ ] Add readiness and liveness endpoints with clear behavior when the database is unavailable.
- [ ] Add request size limits and review JSON/body parser limits.
- [ ] Review rate limits: retain strict limits for authentication and consider targeted limits for expensive report/export endpoints.
- [ ] Define export limits and an escalation path to background jobs/object storage only when export volume justifies it.
- [ ] Add metrics for request latency, error rate, database operation duration, export duration, and transaction retries.
- [ ] Create a reproducible local deployment path (for example Docker Compose) only after the application behavior is stable.

### Completion checks

- Shutdown does not interrupt in-flight database work unnecessarily.
- Production transaction prerequisites are documented and validated.
- Health/readiness semantics are documented.
- Expensive routes have explicit resource limits and observability.

### Expected score impact

Scalability: 5.5 → 8.5+.

---

## Phase 6 — Testing: Unit, Integration, and API Workflows

### Goal

Create confidence in business rules and authorization boundaries, not just compilation.

### Test Pyramid

| Level | Focus | Examples |
|---|---|---|
| Unit | Pure rules and small services | timezone date helpers, leave-day calculation, pagination, JWT, authorization decisions |
| Service/database integration | Database behavior and transactions | leave balance deduction/restoration, overlap detection, unique constraints |
| API integration | Full route/middleware/controller workflow | login, validation, RBAC, IDOR prevention, leave approval |

### TODO

- [ ] Add a shared test setup using a MongoDB replica set compatible with transactions (for example `MongoMemoryReplSet`).
- [ ] Seed isolated test data for employee, manager, HR/admin, department, leave type, balance, attendance, and leave request cases.
- [ ] Unit-test leave-day calculation across weekends, mandatory holidays, timezones, half-day rules, and invalid date ranges.
- [ ] Unit-test authorization helper behavior for employee/self, manager/direct report, manager/non-report, HR, and admin.
- [ ] API-test login success, bad password, inactive account, missing token, malformed token, and expired token.
- [ ] API-test every role boundary: employee cannot access others, manager cannot access another manager’s team, HR/admin overrides work.
- [ ] API-test attendance double check-in, checkout without check-in, repeated checkout, and manager visibility.
- [ ] API-test leave overlap, insufficient balance, approval, rejection, cancellation, and balance restoration.
- [ ] API-test transaction failure/retry behavior using a replica-set test database.
- [ ] API-test pagination bounds, CSV headers/content type, and streamed report authorization.
- [ ] Add coverage thresholds only after meaningful coverage exists; start with critical services and workflows.
- [ ] Add CI only after tests are stable locally.

### Completion checks

- Tests cover all critical business rules and role boundaries.
- At least one API test exercises every major feature group.
- Transactional workflows run against a transaction-capable test MongoDB setup.
- `npm test` is reliable from a clean checkout.

### Expected score impact

Testing: current 3/10 → 9.0+.

---

## Suggested Milestones

1. **Milestone A — Safe API boundaries:** Finish Phases 1 and 3 authorization/error items.
2. **Milestone B — Efficient workflows:** Finish Phase 2, then measure reports and exports.
3. **Milestone C — Maintainable production base:** Finish Phases 4 and 5.
4. **Milestone D — Defensible final review:** Finish Phase 6 and update README, Swagger, Postman collection, and deployment documentation.

## Final Quality Gate

Before calling the backend “good state,” verify:

- [ ] Build, lint, unit tests, and API integration tests pass from a clean checkout.
- [ ] Swagger describes every implemented endpoint accurately.
- [ ] A Postman collection demonstrates employee, manager, and HR journeys.
- [ ] Seed users and credentials are documented safely.
- [ ] All sensitive fields are excluded from responses/logs.
- [ ] Authorization tests demonstrate no horizontal or manager-scope privilege escalation.
- [ ] Leave balance transitions are transactionally verified.
- [ ] README documents local setup, production environment requirements, and the test commands.
