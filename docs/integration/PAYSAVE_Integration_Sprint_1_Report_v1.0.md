# PAYSAVE OS — Integration Sprint #1 Report

**Sprint:** Integration Sprint #1  
**Version:** 1.0  
**Date:** 2026-07-22  
**Objective:** เชื่อม Frontend Sprint #1–#2 กับ Backend Sprint #1  
**Environment:** Staging Only  
**Production:** Not accessed / Not changed / Not deployed  
**Status:** **REJECTED BY CTO — LOCAL RUNTIME INTEGRATION PROHIBITED**

## 1. Executive Verdict

Integration Sprint #1 ยังไม่สามารถเริ่มการเชื่อมต่อจริงหรือประกาศ PASS ได้โดยไม่ละเมิดข้อกำหนดและ architecture contracts ปัจจุบัน

สาเหตุหลักมีสองกลุ่ม:

1. **Staging foundation ยังไม่มีและ Staging Gate ยังไม่ผ่าน**
2. **Frontend Mock Repository contracts ไม่ตรงกับ REST API contracts ที่ Backend Sprint #1 ส่งมอบ**

การสร้าง adapter ที่ไม่สามารถเรียก Staging จริง หรือการประกอบข้อมูล Dashboard/Recovery จาก endpoint คนละ domain ด้วยข้อมูลจำลอง จะไม่ถือเป็นการ Replace Mock Repository และไม่ใช่หลักฐานของ Login/JWT/Session/RBAC/CRUD จริง

ไม่มี Product source file ถูกแก้ในรอบ preflight นี้ รายงานนี้เป็น artifact เดียวที่สร้างขึ้นเพื่อขอ CTO decision

### Superseding CTO decision

The earlier Option A decision is superseded. CTO approved the **Local PostgreSQL Environment** only for a separate **Local Database Verification Sprint** and rejected the Local Runtime Integration Sprint because the production authentication architecture uses Supabase Auth.

Explicitly prohibited:

- creating or changing Authentication;
- creating a new Repository;
- creating a separate Runtime;
- changing Session;
- changing JWT;
- changing RLS Design.

Permitted Local PostgreSQL scope only:

- migration verification;
- performance benchmark;
- backup and restore;
- query-plan inspection and `EXPLAIN ANALYZE`;
- index verification.

Integration Sprint #1 is therefore closed without Product source changes. Work returns to **Stage 4.0 — Staging Database Integration** only when Supabase Staging is ready.

### Historical CTO Gate decision (superseded)

CTO selected **Decision A — Full Objective**:

- provision isolated Staging;
- add Dashboard and Recovery REST contracts;
- permit internal login composition changes while preserving visible UI, component public contracts, route URLs and state-management libraries.

The authorization removes the contract/scope decision blocker. Execution remains blocked by the external Staging prerequisite because no authenticated Supabase CLI/session, Staging project, project configuration or secure environment handoff is available. A credential-handoff request was issued and received no response within the allowed wait window.

No unused REST adapter or partial UI switch was created after the timeout. This avoids a repository state that appears integrated but cannot be exercised against its approved target.

## 2. Requirement Preservation Check

| Requirement                                      | Preflight result                                |
| ------------------------------------------------ | ----------------------------------------------- |
| Do NOT change UI                                 | Preserved; no UI file changed                   |
| Do NOT change Components                         | Preserved; no component changed                 |
| Do NOT change Routing                            | Preserved; no route changed                     |
| Do NOT change State Management                   | Preserved; React Query/RHF contracts unchanged  |
| Staging Only                                     | Preserved; no Production access                 |
| No Production                                    | Preserved                                       |
| Replace Mock Repository with REST API Repository | **BLOCKED by contract mismatch**                |
| Verify Login/JWT/Session/RBAC/CRUD               | **BLOCKED by missing live Staging environment** |

## 3. Actual Frontend Mock Repository Inventory

### Frontend Sprint #1

`MockDashboardRepository` implements:

```ts
getDashboard(persona): Promise<DashboardModel>
```

It supplies:

- persona-specific KPI cards
- trend data
- distribution data
- activity rows

### Frontend Sprint #2

`MockRecoveryRepository` implements:

```ts
listCases();
getCase(caseId);
listAgents();
assignCase(caseId, agentId);
addContactAttempt(caseId, input);
createPromiseToPay(caseId, input);
recordFieldVisit(caseId, input);
resolveApproval(caseId, input);
```

### Login

`/login` renders `MockLoginForm`. The form does not use a repository and currently redirects to `/dashboard/executive` after a local delay.

The existing real authentication implementation is separate:

- Route: `/sign-in`
- Mechanism: Supabase `signInWithPassword`
- Session refresh: Supabase SSR middleware
- JWT verification: `supabase.auth.getClaims()` followed by `parsePaysaveClaims`

Changing `/login` from mock login to real login requires changing component behavior or routing/composition. Both are prohibited by the current instruction.

## 4. Backend Sprint #1 REST Inventory

OpenAPI server base: `/api/v1`

| Scope    | Endpoints                                                                       | Authentication/RBAC                  |
| -------- | ------------------------------------------------------------------------------- | ------------------------------------ |
| Session  | `GET /sessions/me`, `DELETE /sessions/me`                                       | Verified Supabase JWT                |
| User     | `GET/POST /users`, `GET/PATCH/DELETE /users/{id}`                               | `users.read`, `users.manage`         |
| Partner  | `GET/POST /partners`, `GET/PATCH/DELETE /partners/{id}`                         | `partners.read`, `partners.manage`   |
| Customer | `GET/POST /customers`, `GET/PATCH/DELETE /customers/{id}`                       | `customers.read`, `customers.manage` |
| Asset    | `GET/POST /assets`, `GET/PATCH/DELETE /assets/{id}`, `POST /assets/{id}/status` | `assets.read`, `assets.manage`       |

Authentication is not exposed as a REST login endpoint. It is performed directly against Supabase Auth by the server action used by `/sign-in`.

The Backend Sprint #1 application repositories are already Supabase infrastructure adapters used behind Route Handlers. Replacing those server repositories with REST repositories would make Route Handlers call their own endpoints recursively and is therefore architecturally invalid.

## 5. Contract Gap Matrix

| Frontend contract                         | Required REST capability                       | Backend Sprint #1 status                         | Result                              |
| ----------------------------------------- | ---------------------------------------------- | ------------------------------------------------ | ----------------------------------- |
| Dashboard KPI/trend/distribution/activity | Dashboard read model endpoint                  | Not delivered; Dashboard explicitly out of scope | BLOCKED                             |
| Recovery case list/detail                 | Recovery Case endpoints                        | Not delivered; Recovery explicitly out of scope  | BLOCKED                             |
| Agent list and assignment                 | Assignment endpoints                           | Not delivered                                    | BLOCKED                             |
| Contact Attempt                           | Recovery contact endpoint                      | Not delivered                                    | BLOCKED                             |
| Promise To Pay                            | PTP endpoint                                   | Not delivered                                    | BLOCKED                             |
| Field Visit/GPS                           | Visit endpoint                                 | Not delivered                                    | BLOCKED                             |
| Approval                                  | Approval endpoint                              | Not delivered                                    | BLOCKED                             |
| Document Viewer                           | Document metadata/content endpoint             | Not delivered                                    | BLOCKED                             |
| `/login` real authentication              | Login contract without route/component changes | Existing real auth is at `/sign-in`              | BLOCKED                             |
| Session                                   | `/api/v1/sessions/me`                          | Delivered in code                                | Ready for Staging verification only |
| User CRUD                                 | `/api/v1/users*`                               | Delivered in code                                | Ready for Staging verification only |
| Partner CRUD                              | `/api/v1/partners*`                            | Delivered in code                                | Ready for Staging verification only |
| Customer CRUD                             | `/api/v1/customers*`                           | Delivered in code                                | Ready for Staging verification only |
| Asset CRUD/status                         | `/api/v1/assets*`                              | Delivered in code                                | Ready for Staging verification only |

The entity CRUD endpoints cannot replace Dashboard or Recovery repositories because they do not provide equivalent data or workflow semantics. Synthesizing the missing fields with mock constants would violate the Replace Mock Repository requirement.

## 6. Staging Readiness Evidence

### Runtime configuration

The required environment variables are not configured in the current execution environment:

```text
NEXT_PUBLIC_APP_URL=MISSING
NEXT_PUBLIC_SUPABASE_URL=MISSING
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=MISSING
PAYSAVE_FIELD_ENCRYPTION_KEY=MISSING
PAYSAVE_FIELD_ENCRYPTION_KEY_VERSION=MISSING
```

No local Staging environment file exists:

```text
apps/web/.env=ABSENT
apps/web/.env.local=ABSENT
apps/web/.env.staging=ABSENT
apps/web/.env.staging.local=ABSENT
```

No secret values were read or recorded.

### Staging target

Architecture target:

```text
https://staging-app.paysave.site
```

Live preflight result:

```text
DNS: unresolved
HTTPS status: 000
```

### Governing project evidence

`docs/backend/BACKEND_SPRINT_1_TEST_REPORT_v1.0.md` states:

- Code Backend Gate: PASS
- Live Staging Database Integration Gate: NOT RUN
- Migration execution on Staging or Production: NOT CLAIMED

`docs/backend/BACKEND_SPRINT_1_REPORT_v1.0.md` states:

- Dashboard and Recovery modules were outside Backend Sprint #1
- Supabase project provisioning was outside Backend Sprint #1
- Live Staging/PostgreSQL integration was not run

`docs/architecture/HOSTING_DATABASE_BLUEPRINT_v1.md` Gate C remains open for:

- isolated Supabase Staging
- migration runtime test
- RLS isolation tests
- Staging deployment and auth E2E
- backup/restore and rollback drill

## 7. Verification Status

| Verification                     | Status             | Reason                                                                   |
| -------------------------------- | ------------------ | ------------------------------------------------------------------------ |
| Login                            | NOT RUN            | Staging Auth unavailable; `/login` is mock while real auth is `/sign-in` |
| JWT                              | NOT RUN            | No Staging issuer/project or test identity                               |
| Session                          | CODE CONTRACT ONLY | Route exists; live cookie/token lifecycle not verified                   |
| RBAC                             | CODE CONTRACT ONLY | Unit/route tests exist; live claims/RLS/tenant denial not verified       |
| User CRUD                        | CODE CONTRACT ONLY | No Staging database/auth context                                         |
| Partner CRUD                     | CODE CONTRACT ONLY | No Staging database/auth context                                         |
| Customer CRUD                    | CODE CONTRACT ONLY | No Staging database/auth context                                         |
| Asset CRUD/status                | CODE CONTRACT ONLY | No Staging database/auth context                                         |
| Dashboard repository replacement | BLOCKED            | No Backend Dashboard REST contract                                       |
| Recovery repository replacement  | BLOCKED            | No Backend Recovery REST contract                                        |

`CODE CONTRACT ONLY` must not be interpreted as live integration evidence.

## 8. CTO Decisions Required

### Decision A — Full Objective

Authorize and deliver:

1. Isolated Supabase Staging and Staging web runtime
2. M001–M016 Staging migration and seed
3. Synthetic test identities with JWT custom claims and RBAC matrix
4. Dashboard REST read-model contract equivalent to `DashboardRepository`
5. Recovery REST contract equivalent to `RecoveryRepository`
6. Approval to change login composition/behavior while keeping visual UI, component public API, route URL and state-management approach unchanged

This is the only option that can satisfy the full stated objective without fake/mixed mock results.

### Decision B — Narrow Integration Scope

Limit Integration Sprint #1 to:

- existing `/sign-in`
- Session
- User
- Partner
- Customer
- Asset

Explicitly defer:

- `/login`
- Dashboard Mock Repository
- Recovery Mock Repository

This allows live Staging verification of the Backend Sprint #1 scope but does **not** satisfy the original “connect Frontend Sprint #1–#2 / Replace Mock Repository” objective.

### Decision C — Permit Compatibility Changes

Keep visible UI, URLs and state-management libraries unchanged, but authorize internal component/composition changes needed to:

- make `/login` submit real credentials
- select REST adapters through composition/environment
- display API error/loading states through existing component contracts

Dashboard and Recovery REST endpoints are still required.

## 9. Required Staging Inputs

Provide through Deployment Secret Manager or local ignored environment configuration, never in Git/Markdown/Chat:

- Staging application URL
- Staging Supabase URL
- Staging publishable key
- Staging field-encryption key and version
- Synthetic admin/read-only/forbidden test identities
- Redirect/callback allowlist confirmation
- Approved test-data cleanup policy

Credentials, passwords, private keys and JWT values must not be sent in this report or committed to the repository.

## 10. Production Safety

- Production DNS, application, database and credentials were not accessed
- No Production deployment occurred
- No migration was run
- No CRUD write was sent to any external environment
- No user data or credentials were created

## 10.1 Independent Read-only Review Reconciliation

Two independent read-only audits completed after the initial preflight. They did not modify files and concurred with the principal blockers:

- `/login` and the default root flow are mock-only;
- the real Supabase authentication flow currently lives at `/sign-in` plus `/auth/callback`;
- Session/User/Partner/Customer/Asset Route Handlers and permission guards exist;
- Recovery has no corresponding Backend Sprint #1 API contract;
- live Staging evidence is absent.

The review added three P1 contract/readiness items:

1. OpenAPI does not declare `401` and `403` responses consistently on every operation protected by `requireApiAuth` or `requireApiPermission`. A generated REST client could therefore under-model authentication and authorization failures.
2. `/auth/callback` is part of the authentication lifecycle but is not documented in the current OpenAPI/integration contract. It need not be represented as a business CRUD endpoint, but its redirect, error and session-cookie behavior must be documented and tested in the Staging E2E contract.
3. No project-owned Dockerfile, CI workflow or Staging deployment manifest was found. The Staging deployment/release mechanism remains an external prerequisite and must be evidenced before the Staging Gate can pass.

One reviewer could not inspect the JWT implementation deeply enough and marked it for confirmation. Direct parent verification resolved that uncertainty: `get-auth-context.ts` and `update-session.ts` call `supabase.auth.getClaims()` and pass verified claims through `parsePaysaveClaims()`. This is a valid code-level trust boundary, but issuer/audience/expiry, refresh, revocation and custom-claim behavior still require live Staging tests.

## 11. Final Gate Result

**Integration Sprint #1: REJECTED BY CTO — LOCAL RUNTIME INTEGRATION NOT AUTHORIZED**

No local authentication, repository, session, JWT, RLS-design or runtime substitute may be implemented. The only currently authorized execution scope is Local Database Verification. Stage 4.0 may resume when Supabase Staging is ready.

This is a correctness and safety block, not a code-quality failure.
