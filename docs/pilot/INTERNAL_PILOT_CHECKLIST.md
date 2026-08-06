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

| Gate                                     | Result               | Evidence / Notes |
| ---------------------------------------- | -------------------- | ---------------- |
| Authentication and session               | [ ] PASS [ ] FAIL    |                  |
| Admin and persona dashboards             | [ ] PASS [ ] FAIL    |                  |
| Business modules                         | [ ] PASS [ ] FAIL    |                  |
| Same-tenant authorization                | [ ] PASS [ ] FAIL    |                  |
| Cross-tenant isolation                   | [ ] PASS [ ] FAIL    |                  |
| Version and readiness                    | [ ] PASS [ ] FAIL    |                  |
| No real customer data used unnecessarily | [ ] CONFIRMED        |                  |
| Production untouched                     | [ ] CONFIRMED        |                  |
| Pilot decision                           | [ ] PROCEED [ ] HOLD |                  |

Pilot owner/signature:

Date/time:
