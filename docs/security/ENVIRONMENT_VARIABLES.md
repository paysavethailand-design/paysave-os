# Environment Variables

## Policy

- Commit เฉพาะ `.env.example`; ห้าม commit `.env`, `.env.local` หรือ secret จริง
- ตัวแปร `NEXT_PUBLIC_*` ถูก bundle ไป Browser จึงห้ามเป็น secret
- Server secret อ่านผ่าน server-only config module และ validate ตอนเริ่มระบบ
- Production secret เก็บใน deployment secret manager ไม่เก็บใน Git/Markdown/Chat
- หมุน key และตรวจ log หาก secret เคยรั่ว

## Stage 1 variables

| Variable                               | Scope          | Required | เหตุผล                                     |
| -------------------------------------- | -------------- | -------: | ------------------------------------------ |
| `NEXT_PUBLIC_APP_URL`                  | Browser/Server |      Yes | canonical URL สำหรับ redirect และ metadata |
| `NEXT_PUBLIC_SUPABASE_URL`             | Browser/Server |      Yes | Supabase project endpoint; ไม่ใช่ secret   |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser        |      Yes | publishable key ที่ออกแบบให้ใช้ร่วมกับ RLS |
| `PAYSAVE_ENABLE_DESIGN_PREVIEW`        | Server         |       No | local QA only; default `false`             |

## Reserved server-only variables

ยังไม่ควรถูกอ่านใน Stage 1 จนกว่า adapter ที่เกี่ยวข้องได้รับอนุมัติ:

| Variable                    | Purpose                      | Rule                                                  |
| --------------------------- | ---------------------------- | ----------------------------------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin/background operation   | server-only; never in Next client bundle              |
| `DATABASE_URL`              | pooled PostgreSQL connection | server/worker only                                    |
| `DIRECT_URL`                | migrations/direct connection | CI/migration job only                                 |
| `WEBHOOK_SIGNING_SECRET`    | verify external webhook      | one secret per provider/environment                   |
| `OBSERVABILITY_DSN`         | error/trace backend          | server-only unless public DSN is explicitly supported |

## Environment tiers

- `local`: local URL, development Supabase project, synthetic data
- `test`: disposable DB, deterministic test secrets
- `staging`: production-like policies, isolated data
- `production`: least privilege, rotation, audit and backup enabled

ห้ามใช้ Production Service Role ใน local/test และห้าม reuse Database URL ข้าม environment
