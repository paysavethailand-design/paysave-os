# PAYSAVE OS — Staging Environment Checklist

สถานะ: **HOLD / REVIEW ONLY**  
หลักการ: Isolated Staging, synthetic/anonymized data, separate credentials, no Production access

## Environment Identity

- [ ] Staging owner และ technical owner ระบุชื่อ
- [ ] Staging canonical URL ได้รับอนุมัติและไม่ใช่ Production domain
- [ ] Supabase/PostgreSQL project แยกจาก Production ทาง account/project/network/credentials
- [ ] Production data และ Production credential ถูกห้ามด้วย policy และ access control
- [ ] Data seed เป็น synthetic หรือ anonymized พร้อมเจ้าของการอนุมัติ
- [ ] Region/timezone/DNS/TLS ownership ถูกบันทึก

## Runtime Variables

| Name                                   | Classification                                    | Staging rule                                            | Status              |
| -------------------------------------- | ------------------------------------------------- | ------------------------------------------------------- | ------------------- |
| `NEXT_PUBLIC_APP_URL`                  | Required public/build-time                        | Staging URL เท่านั้น                                    | PENDING VALUE/OWNER |
| `NEXT_PUBLIC_SUPABASE_URL`             | Required public/build-time                        | Isolated Staging project, HTTPS                         | PENDING VALUE/OWNER |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Required public/build-time                        | Publishable key ของ Staging เท่านั้น; ไม่ถือเป็น secret | PENDING VALUE/OWNER |
| `PAYSAVE_ENABLE_DESIGN_PREVIEW`        | Optional server feature flag                      | ต้องเป็น `false` สำหรับ shared Staging                  | READY POLICY        |
| `PAYSAVE_FIELD_ENCRYPTION_KEY`         | Required server secret for encrypted-field routes | Separate Staging key; secret-manager injection only     | BLOCKED             |
| `PAYSAVE_FIELD_ENCRYPTION_KEY_VERSION` | Required key metadata                             | Numeric version; rotate together with key               | BLOCKED             |
| `PORT`                                 | Runtime                                           | `3000` ตาม manifest                                     | READY POLICY        |
| `NODE_ENV`                             | Runtime                                           | `production` เพื่อ production-like behavior             | READY POLICY        |

Reserved variables (`DATABASE_URL`, `DIRECT_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WEBHOOK_SIGNING_SECRET`, `OBSERVABILITY_DSN`) ต้องคง **not configured** จน adapter/owner/use case ได้รับอนุมัติ ห้าม reuse จาก Production

## Secret and Access Controls

- [x] `.dockerignore` กัน `.env` และ `.env.*` จาก build context
- [x] Public variables ถูกแยกจาก server secret ใน config modules
- [x] Field-encryption key มี format validation และไม่ export ผ่าน Edge barrel
- [ ] Secret-manager provider และ Staging namespace ถูกเลือก
- [ ] Secret owner/custodian/consumer/rotation/expiry ระบุครบ
- [ ] Runtime identity ใช้ least privilege และไม่มี human-shared token
- [ ] Access audit, break-glass และ revocation procedure ผ่าน review
- [ ] Secret scanning/log redaction ถูกทดสอบด้วย synthetic canary

## Container and Runtime

- [x] Canonical Dockerfile: `docker/Dockerfile`
- [x] Base image pin by digest
- [x] Runtime non-root UID/GID 10001
- [x] Port 3000 และ telemetry disabled
- [ ] Root `Dockerfile` ถูก retire หรือแก้ drift
- [x] Local canonical image build ผ่านจาก final tree
- [x] Local container ตอบ `/login` HTTP 200, reports `paysave` UID/GID 10001 และ reaches Docker `healthy`
- [ ] Dedicated `/healthz`, `/readyz`, `/version` contracts มีและทดสอบแล้ว
- [ ] Resource requests/limits, restart policy, termination grace และ read-only filesystem policy ระบุ

## Database and Data Safety

- [x] Manifest กำหนด PostgreSQL 17
- [x] Database changes unauthorized; M017–M020 blocked
- [x] Existing local disposable PostgreSQL backup/restore evidence และ rollback guard ถูก review แล้ว; ไม่ใช้แทน Staging drill
- [ ] Isolated Staging database/project ถูก provision โดยไม่ใช้ Production
- [ ] M001–M016 baseline identity และ migration ledger ถูก verify
- [ ] RLS/Auth/RBAC/tenant-isolation tests ผ่านใน Staging
- [ ] Backup/PITR policy เปิดใช้งานและ provider evidence แนบ
- [ ] Restore drill ผ่านด้วย synthetic data และบันทึก actual RPO/RTO

## Network and External Services

- [ ] TLS certificate/expiry monitor พร้อม
- [ ] Ingress/egress allowlist และ private administration path พร้อม
- [ ] External integrations ใช้ sandbox/staging endpoints เท่านั้น
- [ ] Webhook signing secrets แยก provider/environment
- [ ] Rate limit, timeout, retry และ circuit-breaker policy ผ่าน test
- [ ] ไม่มี Production endpoint ใน runtime configuration

## Gate

Staging deployment review เริ่มได้ต่อเมื่อรายการ BLOCKED/PENDING ที่เกี่ยวกับ environment identity, secrets, health, backup/restore, monitoring และ rollback มี evidence ครบ และ CTO อนุมัติ exact manifest digest
