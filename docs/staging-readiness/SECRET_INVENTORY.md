# PAYSAVE OS — Staging Secret Inventory

**สำคัญ:** เอกสารนี้บันทึกเฉพาะชื่อ/ประเภท/เจ้าของที่ต้องกำหนด ไม่เก็บค่า secret, fingerprint ที่ย้อนกลับได้, token, password หรือ connection string

## Active Runtime Inventory

| Name                                   | Secret?            | Scope                     | Required                       | Storage/Injection                         | Owner             | Rotation          | Status              |
| -------------------------------------- | ------------------ | ------------------------- | ------------------------------ | ----------------------------------------- | ----------------- | ----------------- | ------------------- |
| `NEXT_PUBLIC_APP_URL`                  | No                 | Browser/server build-time | Yes                            | CI build variable                         | Platform          | On domain change  | PENDING             |
| `NEXT_PUBLIC_SUPABASE_URL`             | No                 | Browser/server build-time | Yes                            | CI build variable                         | Platform/Data     | On project change | PENDING             |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | No                 | Browser                   | Yes                            | CI build variable                         | Platform/Data     | Provider policy   | PENDING             |
| `PAYSAVE_ENABLE_DESIGN_PREVIEW`        | No                 | Server feature flag       | No                             | Runtime config                            | Application Owner | On policy change  | Must remain `false` |
| `PAYSAVE_FIELD_ENCRYPTION_KEY`         | **Yes**            | Server-only runtime       | Yes for encrypted-field routes | Secret manager reference; never build ARG | Security Owner    | Policy pending    | BLOCKED             |
| `PAYSAVE_FIELD_ENCRYPTION_KEY_VERSION` | Sensitive metadata | Server-only runtime       | Yes with key                   | Secret/config manager                     | Security Owner    | With key rotation | BLOCKED             |

## CI/CD Identity Inventory

| Name                      | Secret?                       | Source                   | Permissions                             | Rule                                     |
| ------------------------- | ----------------------------- | ------------------------ | --------------------------------------- | ---------------------------------------- |
| `GITHUB_TOKEN`            | Yes, ephemeral                | GitHub Actions generated | `actions: read`, `contents: read` in CD | ห้าม persist/reuse outside run           |
| Artifact/package SHA-256  | No                            | CI-generated             | Evidence only                           | Verify before approval; not a credential |
| Approval ticket reference | No, may be sensitive metadata | Manual workflow input    | Evidence only                           | No secret values in ticket field         |

## Reserved — Not Authorized for Current Staging Runtime

| Name                        | Purpose                          | Activation gate                                                    |
| --------------------------- | -------------------------------- | ------------------------------------------------------------------ |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin/background Supabase access | Approved server adapter, least privilege, owner and audit evidence |
| `DATABASE_URL`              | Pooled PostgreSQL connection     | Approved data adapter and isolated Staging database                |
| `DIRECT_URL`                | Migration/direct connection      | Approved migration job only; never application runtime             |
| `WEBHOOK_SIGNING_SECRET`    | Verify external webhook          | Provider-specific Staging integration approval                     |
| `OBSERVABILITY_DSN`         | Error/trace backend              | Approved vendor, data-classification and sampling policy           |

## Local-only Variables — Forbidden as Staging Credentials

- `PAYSAVE_LOCAL_DB_NAME`
- `PAYSAVE_LOCAL_DB_OWNER`
- `PAYSAVE_LOCAL_DB_PASSWORD`
- `PAYSAVE_LOCAL_DB_PORT`

ตัวแปรกลุ่มนี้เป็น local PostgreSQL compose เท่านั้น ห้าม copy ค่าไป Staging และห้ามถือ `.env.local-db` เป็น secret source ของ Staging

## Required Secret Metadata Before Gate

สำหรับ secret ทุกตัวต้องมี evidence ต่อไปนี้โดยไม่เปิดเผยค่า:

- [ ] Environment = Staging และ namespace/project แยก Production
- [ ] Secret-manager provider/reference ID
- [ ] Owner, custodian และ runtime consumer
- [ ] Created/last rotated/next rotation dates
- [ ] Rotation and revocation procedure
- [ ] Least-privilege access policy และ audit-log location
- [ ] Break-glass approver และ expiry
- [ ] Injection phase: build-time หรือ runtime (server secret ต้อง runtime)
- [ ] Log masking test และ incident response owner
- [ ] Confirmation ว่าไม่อยู่ใน Git, image layers, artifact, Markdown หรือ chat

## Current Decision

Local canonical image metadata/history scan ไม่พบชื่อ server secrets ใน image ENV/history แต่ Secret inventory ยัง **BLOCKED** เพราะ provider/owner/rotation/access evidence ยังไม่ถูกกำหนด เอกสารนี้ไม่อนุญาตให้สร้างหรือเปิดเผยค่า secret
