# PAYSAVE OS Internal Pilot Checklist

## Pilot Context

- Merge commit: `81ba1c80ce594b4ce15fba97319f7dfa0a3d0d81`
- Managed Staging preview: <https://paysave-os-dmxbfayh4-paysave-v1.vercel.app>
- Test environment: Managed Staging only
- Test data: Synthetic or approved test data only; do not use unnecessary real customer data
- Prohibited actions: Production deployment, migration apply, RLS bypass, or use of `service_role`

## Test Record

| Field               | Value             |
| ------------------- | ----------------- |
| Test date/time      |                   |
| Tester              |                   |
| Tenant              |                   |
| Test accounts/roles |                   |
| Browser/device      |                   |
| Overall result      | [ ] PASS [ ] FAIL |

## 1. Login, Logout, And Session Refresh

**Test steps**

1. Open the preview in a new private browser session and sign in with an approved Managed Staging test account.
2. Confirm the user lands on the expected persona dashboard without a redirect loop.
3. Refresh the browser on the dashboard and on one authorized module page.
4. Leave the session idle long enough to exercise the configured refresh behavior, then navigate to another authorized page.
5. Sign out, use Back, and directly revisit the last protected URL.

**Expected result:** Login creates one valid tenant-scoped session. Refresh preserves the authenticated session without duplicate login or unexpected `401/403`. Logout invalidates access, and protected URLs redirect to authentication.

- Result: [ ] PASS [ ] FAIL
- URL(s):
- Correlation ID(s):
- Notes:

## 2. Admin Dashboard

**Test steps**

1. Sign in as the Managed Staging admin for the test tenant.
2. Open the admin dashboard and each visible navigation destination.
3. Refresh one destination and open it again by direct URL.

**Expected result:** Dashboard and authorized destinations render successfully, navigation remains tenant-scoped, and no unexpected `403` occurs.

- Result: [ ] PASS [ ] FAIL
- URL(s):
- Correlation ID(s):
- Notes:

## 3. Inventory Create, Read, Edit, And Save

**Test steps**

1. Open Inventory and record the initial test item count or identifier.
2. Create one clearly labeled synthetic inventory item with non-sensitive values.
3. Read the new item from the list and detail view.
4. Edit one non-key field and save.
5. Refresh and confirm the saved value persists; clean up only if an approved application workflow exists.

**Expected result:** Create, read, edit, and save complete without authorization bypass. The item remains in the active tenant and is not visible from another tenant.

- Result: [ ] PASS [ ] FAIL
- URL(s):
- Correlation ID(s):
- Notes:

## 4. Recovery Cases

**Test steps**

1. Open Recovery Cases from navigation and by direct URL.
2. Open an approved synthetic case and exercise available read/update actions without changing real customer data.
3. Refresh the list and detail views.

**Expected result:** Authorized data loads for the active tenant only. Actions complete successfully, or any error is fail-closed and displays a usable Correlation ID.

- Result: [ ] PASS [ ] FAIL
- URL(s):
- Correlation ID(s):
- Notes:

## 5. Assignments

**Test steps**

1. Open Assignments from navigation and by direct URL.
2. View an approved synthetic assignment and perform one permitted test update if available.
3. Refresh and confirm the resulting state.

**Expected result:** Only active-tenant assignments are visible. Permitted actions persist, and denied or failed actions return a clear error with a Correlation ID.

- Result: [ ] PASS [ ] FAIL
- URL(s):
- Correlation ID(s):
- Notes:

## 6. Partner Dashboard

**Test steps**

1. Open the Partner Dashboard as admin, then repeat with the approved partner test account.
2. Verify visible widgets, links, and data belong to the active tenant.
3. Open the route directly and refresh it.

**Expected result:** Admin and partner access follow the defined permission model. No role bypass or cross-tenant data is exposed.

- Result: [ ] PASS [ ] FAIL
- URL(s):
- Correlation ID(s):
- Notes:

## 7. Field Dashboard

**Test steps**

1. Open the Field Dashboard as admin, then repeat with the approved field persona test account.
2. Verify available tasks, metrics, and links.
3. Open the route directly and refresh it.

**Expected result:** Authorized personas can open the dashboard; unauthorized actions remain denied. All displayed data is tenant-scoped.

- Result: [ ] PASS [ ] FAIL
- URL(s):
- Correlation ID(s):
- Notes:

## 8. Reports

**Test steps**

1. As admin, open `/business/reports` through navigation and by direct URL.
2. Run or view an approved report using synthetic Managed Staging data.
3. Repeat direct-URL access with a test account that lacks `reports.read`.

**Expected result:** An account with `reports.read` can access reports. An account without it is denied explicitly; no wildcard or role bypass grants access.

- Result: [ ] PASS [ ] FAIL
- URL(s):
- Correlation ID(s):
- Notes:

## 9. Payments

**Test steps**

1. As admin, open `/business/payments` through navigation and by direct URL.
2. View approved synthetic payment records without initiating a real transaction.
3. Repeat direct-URL access with a test account that lacks `payments.read`.

**Expected result:** An account with `payments.read` can view active-tenant test records. An account without it is denied explicitly, and no real payment is created.

- Result: [ ] PASS [ ] FAIL
- URL(s):
- Correlation ID(s):
- Notes:

## 10. Commission

**Test steps**

1. As admin, open `/business/commission` through navigation and by direct URL.
2. View approved synthetic commission data without triggering a real payout.
3. Repeat direct-URL access with a test account that lacks `commission.read`.

**Expected result:** An account with `commission.read` can view active-tenant test data. An account without it is denied explicitly, and no payout is created.

- Result: [ ] PASS [ ] FAIL
- URL(s):
- Correlation ID(s):
- Notes:

## 11. Same-Tenant Access

**Test steps**

1. Sign in with each approved test role for the same tenant: admin, partner, supervisor, and agent.
2. Open only the routes expected for that role and inspect representative records.
3. Confirm direct URLs enforce the same permissions as navigation.

**Expected result:** Each role sees only explicitly permitted routes and records in its active tenant. No role receives permissions merely because another role in the tenant has them.

- Result: [ ] PASS [ ] FAIL
- URL(s):
- Correlation ID(s):
- Notes:

## 12. Cross-Tenant Denial

**Test steps**

1. Use two approved synthetic tenants and test accounts with known tenant ownership.
2. While signed in to tenant A, attempt to open a known tenant B record using its direct URL or identifier through normal application requests.
3. Repeat on representative Inventory, Recovery Case, and Assignment records where test fixtures permit.

**Expected result:** Every cross-tenant request is denied or returns no record without revealing sensitive existence or content. RLS remains enforced, and no `service_role` or bypass mechanism is used.

- Result: [ ] PASS [ ] FAIL
- URL(s):
- Correlation ID(s):
- Notes:

## 13. Version Endpoint

**Test steps**

1. Open `<preview>/version` using an account authorized for the protected preview.
2. Record the HTTP status and full commit identifier shown by the endpoint.

**Expected result:** HTTP `200`; the response identifies merge commit `81ba1c80ce594b4ce15fba97319f7dfa0a3d0d81`.

- Result: [ ] PASS [ ] FAIL
- URL: <https://paysave-os-dmxbfayh4-paysave-v1.vercel.app/version>
- Correlation ID(s):
- Notes:

## 14. Readiness Endpoint

**Test steps**

1. Open `<preview>/readyz` using an account authorized for the protected preview.
2. Record the HTTP status and readiness response.

**Expected result:** HTTP `200`; the response reports the application as ready without exposing secrets or environment values.

- Result: [ ] PASS [ ] FAIL
- URL: <https://paysave-os-dmxbfayh4-paysave-v1.vercel.app/readyz>
- Correlation ID(s):
- Notes:

## Pilot Sign-Off

## Automated Pilot Result - 06 Aug 2026

- Preview: <https://paysave-os-dmxbfayh4-paysave-v1.vercel.app>
- Tested source revision: `81ba1c80ce594b4ce15fba97319f7dfa0a3d0d81`
- Browser session: Owner-authenticated PAYSAVE Admin in Demo workspace
- Overall result: FAIL

| Module / Check              | Status     | URL                                 | Correlation ID | Notes                                                                                                                                                                     |
| --------------------------- | ---------- | ----------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login                       | NOT TESTED | `/dashboard/admin`                  | N/A            | Owner completed login manually as required; credentials and session data were not inspected.                                                                              |
| Session refresh             | PASS       | `/dashboard/admin`                  | N/A            | Browser refresh preserved the authenticated admin dashboard without a loop or unexpected authorization response.                                                          |
| Admin Dashboard             | PASS       | `/dashboard/admin`                  | N/A            | Loaded after direct navigation and refresh.                                                                                                                               |
| Partner Dashboard           | PASS       | `/dashboard/partner`                | N/A            | Loaded for admin without unexpected `403` or `/unauthorized`.                                                                                                             |
| Field Dashboard             | PASS       | `/dashboard/field`                  | N/A            | Loaded for admin without unexpected `403` or `/unauthorized`.                                                                                                             |
| Inventory list/detail       | PASS       | `/inventory`                        | N/A            | Inventory list and synthetic `LIVE-TEST` detail loaded.                                                                                                                   |
| Inventory edit/save/refresh | PASS       | `/inventory`                        | N/A            | Renamed the synthetic test reference to `RC-CONC-daa14f6ef64ec645-PILOT-TEST`; save completed and the value persisted after refresh.                                      |
| Recovery Cases              | FAIL       | `/recovery/cases`                   | N/A            | `โหลด Recovery Cases ไม่สำเร็จ` / `Mock Repository ไม่ตอบกลับ`; Retry returned the same failure. Screenshot capture was unavailable.                                      |
| Assignments                 | FAIL       | `/recovery/assignments`             | N/A            | Main content did not finish loading during the observation window; no actionable error or Correlation ID was rendered. Screenshot capture was unavailable.                |
| Reports                     | PASS       | `/business/reports`                 | N/A            | Direct URL loaded the tenant-scoped application read model without unexpected denial.                                                                                     |
| Payments                    | PASS       | `/business/payments`                | N/A            | Direct URL loaded successfully; no real payment action was performed.                                                                                                     |
| Commission                  | PASS       | `/business/commission`              | N/A            | Direct URL loaded successfully; no real payout action was performed.                                                                                                      |
| Direct URL access           | PASS       | Dashboard and business routes above | N/A            | Authorized direct routes loaded without unexpected `403`, `/unauthorized`, or redirect loop.                                                                              |
| Same-tenant access          | PASS       | Routes above                        | N/A            | Current admin account saw only the active Demo workspace data exposed by each route.                                                                                      |
| Cross-tenant denial         | NOT TESTED | N/A                                 | N/A            | No approved synthetic second-tenant account was available; no account or tenant was created.                                                                              |
| `/version`                  | PASS       | `/version`                          | N/A            | Returned source revision `81ba1c80ce594b4ce15fba97319f7dfa0a3d0d81`.                                                                                                      |
| `/readyz`                   | PASS       | `/readyz`                           | N/A            | Returned `status: ready`; all seven dependency checks reported `ok: true`.                                                                                                |
| Logout                      | FAIL       | `/dashboard/admin`                  | N/A            | Activating `ออกจากระบบ` did not leave the protected page. Direct navigation to `/dashboard/admin` still rendered the admin dashboard. Screenshot capture was unavailable. |

### Failed Steps

1. Recovery Cases: Opened the route and activated Retry. The page continued to report `Mock Repository ไม่ตอบกลับ`.
2. Assignments: Opened the route and waited beyond the normal page-load interval. Main assignment content never rendered.
3. Logout: Activated the account-menu logout control, then revisited the protected admin route. The authenticated dashboard remained accessible.

### Evidence

- Recovery Cases screenshot path: unavailable because browser screenshot capture failed.
- Assignments screenshot path: unavailable because browser screenshot capture failed.
- Logout screenshot path: unavailable because browser screenshot capture failed.
- No password, cookie, token, session value, secret, or environment value was read or recorded.
- No migration was applied and Production was not accessed.

| Gate                                     | Result     | Evidence / Notes                                        |
| ---------------------------------------- | ---------- | ------------------------------------------------------- |
| Authentication and session               | FAIL       | Logout did not invalidate protected-route access.       |
| Admin and persona dashboards             | PASS       | Admin, Partner, and Field loaded for the current admin. |
| Business modules                         | FAIL       | Recovery Cases and Assignments failed.                  |
| Same-tenant authorization                | PASS       | Current tenant only.                                    |
| Cross-tenant isolation                   | NOT TESTED | No approved synthetic second-tenant account.            |
| Version and readiness                    | PASS       | Merge commit and ready dependencies confirmed.          |
| No real customer data used unnecessarily | PASS       | Synthetic Inventory test record used.                   |
| Production untouched                     | PASS       | Preview and Managed Staging only.                       |
| Pilot decision                           | FAIL       | Hold for owner review of failed workflows.              |

Pilot owner/signature:

Date/time:

## Pilot Blocker Fix Live Verification - 07 Aug 2026

- Branch: `codex/fix-pilot-recovery-observability`
- Source revision: `098b19af1cb9eff850e69ab69fa6a3d8fa6b7950`
- Preview: <https://paysave-os-ewwpt81i8-paysave-v1.vercel.app>
- Browser session: Owner-authenticated PAYSAVE Admin in Managed Staging preview
- Overall result: PASS for the blocker-fix evidence and reliability scope
- Production touched: NO
- Migration applied: NO

| Module / Check | Status     | URL                     | Correlation ID | Notes                                                                                                                                         |
| -------------- | ---------- | ----------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Recovery Cases | PASS       | `/recovery/cases`       | N/A            | The page loaded successfully. Current runtime displays mock recovery cases; the previous stale `Mock Repository` failure was not reproduced.  |
| Assignments    | PASS       | `/recovery/assignments` | N/A            | The page reached a terminal empty state and explicitly displayed `ยังไม่มีข้อมูลพนักงาน`; no workforce repository or fake agents were added.  |
| Logout         | PASS       | `/dashboard/admin`      | N/A            | Sign-out returned to the sign-in experience. Revisiting and refreshing `/dashboard/admin` redirected to `/sign-in?next=%2Fdashboard%2Fadmin`. |
| `/version`     | PASS       | `/version`              | N/A            | Returned source revision `098b19af1cb9eff850e69ab69fa6a3d8fa6b7950`.                                                                          |
| `/readyz`      | PASS       | `/readyz`               | N/A            | Returned `status: ready`; dependency checks reported `ok: true`.                                                                              |
| Cross-tenant   | NOT TESTED | N/A                     | N/A            | Functional cross-tenant denial is not considered passed until an approved synthetic second-tenant test account is available.                  |

### Functional Pilot Gaps Remaining

1. Cross-tenant functional denial remains `NOT TESTED` until Owner provides an approved synthetic second-tenant account and fixtures.
2. Recovery currently renders mock recovery cases; this is accepted for the blocker-fix evidence pass but remains a pilot fact to preserve.
3. Assignments currently renders the explicit empty state `ยังไม่มีข้อมูลพนักงาน`; this is accepted for the blocker-fix evidence pass and confirms no fake workforce data was introduced.
