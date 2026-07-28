# Stage 4.0 Phase B — Migration Verification Report

- **Observed at (UTC):** 2026-07-23T11:00:55Z
- **Environment:** `paysave-staging`
- **Project Ref:** `rptqfhtanjtrxtfbgrkb`
- **Approved range:** M001–M016 only
- **Canonical migration edits:** None
- **Verdict:** **M001–M016 APPLIED AND REPLAYED; RUNTIME COMPATIBILITY BLOCKER REMAINS**

## Preflight

| Check                                        |     Result |
| -------------------------------------------- | ---------: |
| Exact linked project ref                     |       PASS |
| Remote application schema count before apply |          0 |
| Remote migration ledger before apply         |          0 |
| Approved migration files                     |      16/16 |
| Source/package SHA-256 byte identity         | 16/16 PASS |
| Pre-apply schema snapshot                    |       PASS |

## Apply result

M001–M016 ถูก Apply ทีละ transaction ผ่าน Supabase Management API เนื่องจาก native `db push --dry-run` ค้างที่ login-role network path. ใช้ standard `supabase_migrations.schema_migrations` ledger formatจาก Supabase CLI 2.109.1 และหยุดทันทีเมื่อเกิด error

- Apply: **16/16 PASS**
- Ledger: **16/16 PASS**
- Local/Remote migration versions: **match 16/16**

## Remote structure after apply

| Metric                       | Count |
| ---------------------------- | ----: |
| Approved application schemas |    22 |
| Tables                       |   114 |
| RLS-enabled tables           |   107 |
| RLS policies                 |   342 |
| Migration ledger rows        |    16 |

## Replay verification

- Replay exact byte-identical M001–M016: **16/16 PASS**
- Post-replay object counts: unchanged
- Post-apply schema SHA-256: `0bee774d309696b0fe94a4c8d357cc58ad661dd76483b8dd7b3cd04708300565`
- Post-replay schema SHA-256: same
- Byte comparison: **IDENTICAL**

Evidence:

- `artifacts/staging-integration/phase-b/migration-package-manifest.json`
- `artifacts/staging-integration/phase-b/migration-list-after-apply.log`
- `artifacts/staging-integration/phase-b/remote-structure-after-apply.json`
- `artifacts/staging-integration/phase-b/post-apply-schema.sql`
- `artifacts/staging-integration/phase-b/post-replay-schema.sql`
- `artifacts/staging-integration/phase-b/replay-schema-sha256.txt`

## Blocking Supabase compatibility defect

`admin.uuid_v7()` เรียก `public.gen_random_bytes(16)` แต่ Supabase ติดตั้ง `pgcrypto` ใน schema `extensions` ทำให้ runtime call ล้มเหลว:

- Explicit verification: `UUID_V7_COMPATIBILITY=FAIL_PUBLIC_PGCRYPTO_SCHEMA`
- Columns using `admin.uuid_v7()` default: **121**
- Effect: inserts that rely on generated UUID failก่อน RLS evaluation

ตามกฎ **ห้ามแก้ migration/schema** จึงไม่ได้ patch function หรือสร้าง compatibility shim

## Decision

Migration apply/replay ผ่าน แต่ Stage 4.0 ยัง **HOLD** เพราะ approved schema มี runtime compatibility defect ที่ต้องส่งกลับให้ CTO/Database Change Authority ตัดสินใจแก้ผ่าน migration ที่ได้รับอนุมัติใหม่
