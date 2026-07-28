# Stage 4.0 Phase B — JWT, RLS & Cross-tenant Verification Report

- **Observed at (UTC):** 2026-07-23T11:00:55Z
- **Environment:** `paysave-staging`
- **Project Ref:** `rptqfhtanjtrxtfbgrkb`
- **Verdict:** **RLS/CROSS-TENANT PASS AT DATABASE CLAIM LAYER; VALID SUPABASE JWT VERIFICATION BLOCKED**

## Database claim contract tested

Approved claim shape:

- `sub`
- `paysave.active_partner_id`
- `paysave.tenant_scope`

Transaction-isolated synthetic fixtures were used and rolled back.

| Assertion                                      |      Result |
| ---------------------------------------------- | ----------: |
| Missing claims fail closed                     |        PASS |
| Tenant A sees only Tenant A                    |        PASS |
| Tenant B sees only Tenant B                    |        PASS |
| Cross-tenant read blocked                      |        PASS |
| Cross-tenant insert blocked                    |        PASS |
| Cross-tenant update blocked                    |        PASS |
| Explicit global scope sees both fixtures       |        PASS |
| Synthetic partner/user/membership/role cleanup | 0 leftovers |

Evidence:

- `artifacts/staging-integration/phase-b/jwt-rls-cross-tenant-transaction.sql`
- `artifacts/staging-integration/phase-b/jwt-rls-cross-tenant-result.json`
- `artifacts/staging-integration/phase-b/jwt-rls-cleanup-verification.json`
- `artifacts/staging-integration/phase-b/final-test-hygiene.json`

## Supabase Auth/JWT boundary

- Auth health with publishable key: HTTP 200
- Invalid JWT rejected by REST: HTTP 401
- Invalid JWT rejected by Auth user endpoint: HTTP 403
- Auth settings: signup enabled, `mailer_autoconfirm=false`
- Auth users after testing: 0

## Blockers

1. ไม่มี authorized pre-created test identity/access token
2. Public signup จะส่ง confirmation email; ไม่สร้าง external/spam identity
3. New Supabase secret keyไม่ได้รับ GoTrue Admin authorization (403)
4. Legacy service-role valueไม่ถูกเปิดเผยผ่าน Management API และไม่ได้ร้องขอ/บันทึก
5. Approved M001–M016 มี `custom_access_token_hook` references = 0
6. `iam.custom_access_token_hook` อยู่เฉพาะ legacy `database/migrations/0002_authentication_rbac.sql` ซึ่งอยู่นอก approved range และไม่ได้ Apply
7. ไม่มี evidence ว่า Supabase-issued JWT ใส่ root-level `paysave` claim shapeที่ RLS functionsต้องการ

## Decision

RLS logic และ negative cross-tenant isolation ผ่านใน trusted database claim context แต่ JWT end-to-end ยัง **BLOCKED** จน CTO จัดเตรียม dedicated Staging test identity/token issuance path หรือ approved custom access-token hook โดยไม่ส่ง credentialผ่าน chat/report
