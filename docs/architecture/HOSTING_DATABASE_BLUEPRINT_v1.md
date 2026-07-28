# PAYSAVE OS — Hosting & Database Blueprint v1

> **สถานะ:** Draft for approval — ห้าม Deploy Production และห้ามรัน Migration จากเอกสารนี้
>
> **วันที่:** 2026-07-20
>
> **ขอบเขต:** `app.paysave.site` และ PAYSAVE OS ในกลุ่ม `-5450289715` เท่านั้น

## 1. ข้อสรุปสำหรับผู้บริหาร

โครงสร้างที่แนะนำสำหรับระยะแรกคือ:

- `www.paysave.site` และ `paysave.site` เป็น Homepage เดิม **ห้ามแก้ไข**
- `app.paysave.site` เป็น PAYSAVE OS แยก Website/Deployment ออกจาก Homepage
- Host เว็บแอปด้วย **Hostinger Node.js** เมื่อยืนยันว่าแพ็กเกจปัจจุบันรองรับ Node.js Runtime และ Environment Variables
- ใช้ **Supabase Managed PostgreSQL** สำหรับ Database, Auth และ Private Storage
- ไม่ใช้ฐานข้อมูล MySQL/MariaDB ของ Shared Hosting เพราะโค้ดปัจจุบันพึ่ง PostgreSQL, RLS, Supabase Auth Hook, Partitioning และ PostgreSQL Extensions
- ใช้ Modular Monolith ต่อในช่วงเริ่มต้น ไม่แยก Microservices ก่อนมีข้อมูลด้านภาระงานจริง
- แยก Environment เป็น `local`, `staging`, `production` และแยก Supabase Project คนละชุดโดยเด็ดขาด

สถาปัตยกรรมนี้เริ่มได้เร็ว แต่ยังย้าย Web Runtime ไป Vercel, Cloud Run หรือ VPS ได้ในอนาคต โดยไม่ต้องย้ายโดเมนหรือออกแบบฐานข้อมูลใหม่ทั้งหมด

## 2. ข้อเท็จจริงที่ตรวจสอบแล้ว

### Application

- Stack ปัจจุบัน: Next.js 15, React 19, TypeScript, Supabase SSR/Auth และ PostgreSQL
- มี Route พื้นฐานแล้ว: `/sign-in`, `/auth/callback`, `/unauthorized`, `/`
- หน้า `/` มี Server-side Authentication Guard
- Production build ผ่านเมื่อ 2026-07-20

### Hostinger API v1.8.1

API มีความสามารถที่เกี่ยวข้องกับแผนนี้:

- สร้างและจัดการ Subdomain
- ดูและสร้าง Website
- Deploy Node.js build จาก Archive
- ดู Build Logs
- Restart Node.js Server
- ตรวจและ Patch Node.js Vulnerabilities
- จัดการ Cron Jobs และ Hosting Database

ข้อจำกัดของแพ็กเกจ Hostinger ในบัญชีจริง เช่น RAM, CPU, Concurrent Processes, Build Timeout และ Node.js Availability **ยังต้องตรวจหลังจากเปลี่ยน Token ที่เปิดเผยแล้ว** จึงยังไม่ควรยืนยัน Capacity เชิงตัวเลข

### Current Database Draft

มี Migration draft แล้ว:

- `database/migrations/0001_paysave_recovery_foundation.sql`
- `database/migrations/0002_authentication_rbac.sql`

มี Tenant Boundary ด้วย `partner_id`, tenant-aware foreign keys, append-only audit, hash/range partitions และ fail-closed RLS แต่ยังไม่พร้อม Production เพราะยังขาด Policy และ Operational Controls

## 3. Target Architecture

```text
Internet
  |
  +--> paysave.site / www.paysave.site
  |      └── Homepage เดิม (แยก deployment, ห้ามแก้)
  |
  +--> app.paysave.site
         └── Hostinger CDN / TLS
              └── Next.js Node.js Runtime
                   ├── Server Components / Server Actions
                   ├── Auth & Permission Guards
                   ├── Feature Application Services
                   └── Supabase Clients
                        ├── Supabase Auth
                        ├── PostgreSQL + RLS
                        ├── Private Storage
                        └── Scheduled/Background Operations
```

### Boundary ที่ห้ามข้าม

1. Deployment ของ `app.paysave.site` ต้องไม่เขียนไฟล์ทับ Document Root ของ Homepage
2. ห้ามใช้ Cookie Domain เป็น `.paysave.site`; ใช้ Host-only Cookie สำหรับ `app.paysave.site`
3. ห้ามนำ Hostinger API Token, Supabase Service Role หรือ Database URL ไปไว้ใน Browser Bundle
4. ห้ามอ่านข้อมูลโดยไม่มี `partner_id`/Tenant Context ที่ตรวจจาก Server
5. ห้ามเชื่อมข้อมูลข้ามกลุ่มหรือข้าม Partner โดยไม่มีการอนุมัติเป็นลายลักษณ์อักษร

## 4. Hosting Plan Analysis

### ทางเลือก A — Hostinger Node.js + Supabase (แนะนำสำหรับ Phase 1)

**เหมาะกับ:** เปิดระบบชุดแรก ผู้ใช้ยังไม่มาก และต้องการใช้ Hosting เดิม

**ข้อดี**

- แยก Subdomain ได้โดยไม่แตะ Homepage
- Hostinger API รองรับ Archive Deploy, Build Logs และ Restart
- ค่าใช้จ่ายและ Operational Complexity ต่ำกว่าดูแล VPS เอง
- Supabase รับภาระ Auth, PostgreSQL, Storage และ Backup

**ข้อจำกัด/ความเสี่ยง**

- Capacity และ High Availability ขึ้นกับแพ็กเกจ Hostinger จริง
- Shared Node.js Hosting อาจจำกัด Worker ระยะยาวและงาน Background หนัก
- Rollback ต้องออกแบบ Release Archive และ Deployment Record เพิ่มเอง
- ต้องยืนยันว่า Next.js SSR, Middleware และ Environment Variables ทำงานครบกับแพ็กเกจจริง

**เงื่อนไขผ่าน**

- Staging deploy สำเร็จ
- `/sign-in`, callback, middleware และ authenticated SSR ผ่าน End-to-End Test
- Restart แล้ว Session ยังทำงานถูกต้อง
- Health check, log, rollback และ backup restore drill ผ่าน

### ทางเลือก B — Vercel/Cloud Runtime + Supabase

**เหมาะกับ:** ต้องการ Next.js deployment ที่จัดการง่าย, autoscale และ preview deployment

**ข้อดี**

- รองรับ Next.js โดยตรง
- Preview ต่อ Pull Request และ rollback ง่าย
- Scale Web Request ได้สะดวกกว่า Shared Hosting

**ข้อเสีย**

- เพิ่มผู้ให้บริการและค่าใช้จ่าย
- Background job และ network egress ต้องออกแบบแยก
- ต้องควบคุม region ให้ใกล้ Database

**บทบาทในอนาคต:** เป็นเส้นทางย้าย Web Runtime โดย DNS ยังอยู่ Hostinger และ Database ยังอยู่ Supabase

### ทางเลือก C — Hostinger VPS + Managed Supabase

**เหมาะกับ:** มี Worker หนัก, Integration จำนวนมาก, ต้องการ Container หรือ Process Control

**ข้อดี**

- ควบคุม Node.js, Docker, Queue Worker และ Observability ได้มาก
- แยก Web/Worker ได้เมื่อระบบโต

**ข้อเสีย**

- ต้องดูแล OS patch, firewall, process supervision, backup config และ incident response
- ความเสี่ยงและงานดูแลสูงกว่า Managed Node.js

**เกณฑ์พิจารณาย้าย:** งาน Background เริ่มรบกวน Web, ต้องใช้ persistent worker, ต้องกำหนด resource ชัดเจน หรือข้อจำกัด Shared Hosting ถูกชนจริง

### ทางเลือก D — VPS + Self-host PostgreSQL (ไม่แนะนำใน Phase 1)

ไม่แนะนำเพราะทีมต้องรับผิดชอบ HA, PITR, replication, encryption, monitoring, upgrade และ disaster recovery เองทั้งหมด ประโยชน์ยังไม่คุ้มความเสี่ยงในระยะเริ่มต้น

## 5. Environment & Domain Plan

| Environment | Web URL                    | Database/Auth               | ข้อมูล                | วัตถุประสงค์                 |
| ----------- | -------------------------- | --------------------------- | --------------------- | ---------------------------- |
| Local       | `http://localhost:3000`    | Local/disposable Supabase   | Synthetic only        | พัฒนาและ Unit Test           |
| Staging     | `staging-app.paysave.site` | Supabase Staging Project    | Synthetic/Masked only | Migration, E2E, Restore Test |
| Production  | `app.paysave.site`         | Supabase Production Project | Production            | ผู้ใช้จริง                   |

กฎ:

- ห้ามใช้ Production Database URL ใน Local หรือ Staging
- Redirect URL ของ Supabase ต้อง Whitelist แบบเจาะจงต่อ Environment
- Production Preview Route ต้องปิด
- Secret ทุกตัวเก็บใน Deployment Secret Manager ไม่เก็บใน Git, Markdown หรือ Chat
- API Token และรหัสผ่านที่เคยส่งผ่านแชตต้องเปลี่ยนก่อนเริ่ม Deploy

## 6. Deployment Pipeline

### Phase 1 Pipeline

```text
Source
  -> dependency install with lockfile
  -> architecture check
  -> lint + typecheck + unit/integration tests
  -> production build
  -> dependency audit
  -> immutable release archive + checksum
  -> deploy to staging
  -> smoke/E2E/security tests
  -> manual approval
  -> deploy same archive to production
  -> health check
  -> record release + rollback pointer
```

### Rollback

- เก็บ Release Archive ที่ผ่านการทดสอบอย่างน้อยชุดปัจจุบันและชุดก่อนหน้า
- Application rollback ใช้ Artifact เดิม ไม่ rebuild ระหว่างเหตุการณ์
- Database migration ต้อง Forward-compatible ก่อน deploy application
- Migration ที่ทำลายข้อมูลใช้ Expand → Migrate → Contract ไม่ลบคอลัมน์ใน release เดียว
- ทุก release ต้องระบุ Migration Version และ Environment Variable Version

### Health Checks

ควรมี endpoint server-only ที่ตรวจ:

- Process พร้อมตอบ request
- Environment variables ครบ แต่ไม่เผยค่า
- Database ping แบบ least privilege
- Build/release identifier

Health endpoint ห้ามเผย stack trace, secret, user count หรือข้อมูลธุรกิจ

## 7. Database Strategy

### Decision

ใช้ **Supabase Managed PostgreSQL** เป็น System of Record เพราะสอดคล้องกับ implementation ปัจจุบัน:

- Supabase Auth และ SSR cookie session
- Custom Access Token Hook
- PostgreSQL schemas และ extensions
- Row Level Security
- PostgreSQL partitioning
- Private Storage และ Signed URL

ฐานข้อมูล Hostinger Shared Hosting ไม่ควรใช้เป็นฐานหลักของ PAYSAVE OS เพราะจะทำให้ต้องเปลี่ยน SQL dialect, Auth integration, RLS และ migration design จำนวนมาก

### Logical Domains

Logical Domain Catalog ที่ยอมรับแล้วมี 21 Domain และ 161 Logical Tables ตาม `../database/PAYSAVE_Recovery_Database_Design_v2.1.md`. Ownership, classification, lifecycle, retention, continuity, security, performance, capacity, reference-data และ dependency contracts ของทุก Domain อยู่ใน `PAYSAVE_Architecture_Freeze_Report_v1.0.md`; เอกสาร Hosting นี้ไม่ทำสำเนา Catalog เพื่อหลีกเลี่ยง governance drift.

### Tenant Isolation

- `partner_id` เป็น Tenant Boundary ของข้อมูลธุรกิจ
- Foreign key สำคัญใช้ `(partner_id, id)` เพื่อบล็อก cross-tenant reference
- JWT claim ระบุ Active Partner แต่ทุก query ยังต้องตรวจ RLS ฝั่ง Database
- Super Admin ไม่ควร bypass ด้วยชื่อ Role อย่างเดียว ต้องใช้ permission และ audit ทุกครั้ง
- ถ้าผู้ใช้ทำงานหลาย Partner ให้เปลี่ยน Active Partner ผ่าน Server action ที่ตรวจ membership แล้วออก token/session ใหม่

### RLS Strategy — Blocker ก่อน Production

RLS ปัจจุบันเปิดแบบ fail-closed แต่ยังไม่มี Access Policy จึงต้องจัดทำ migration แยกหลัง Role Matrix ได้รับอนุมัติ

Policy ต้องครอบคลุมอย่างน้อย:

1. Tenant membership ที่ active
2. Active partner ตรงกับแถวข้อมูล
3. Permission code ของ operation
4. Branch scope สำหรับบทบาทที่จำกัดสาขา
5. Assignment scope สำหรับ Agent
6. Append-only และ immutable states
7. Test ปฏิเสธ cross-partner, cross-branch และ unassigned-agent access

### Connection Management

- Web Runtime ใช้ Supabase pooled connection/SDK ตาม request pattern
- Migration ใช้ Direct Connection แยกจาก Runtime Pool
- ห้ามเปิด remote database ให้ทุก IP
- กำหนด statement timeout และ transaction timeout ตาม workload
- ห้ามถือ transaction ข้าม external API call

### Data Growth

โครงสร้างปัจจุบันออกแบบ Hash Partition 32 ส่วนสำหรับตารางปริมาณสูง และ Monthly Partition สำหรับ History/Audit แต่คำว่า “รองรับ 10M+” ยังเป็นเพียง design target จนกว่าจะผ่าน load test

แนวทาง:

- ใช้ cursor pagination แทน offset ขนาดใหญ่
- วัด query จริงด้วย `EXPLAIN (ANALYZE, BUFFERS)`
- สร้าง partition maintenance job ก่อนเดือนใหม่
- แจ้งเตือนเมื่อ Default Partition เริ่มมีข้อมูล
- Archive log/history ตาม retention ที่อนุมัติ
- เพิ่ม read replica เฉพาะเมื่อรายงานกระทบ workload หลักจริง
- ไม่เพิ่ม Redis/Queue/Microservice จนมี metric ยืนยันคอขวด

## 8. PII, Documents and Encryption

### PII

- ข้อมูลบัตรประชาชน โทรศัพท์ ที่อยู่ และข้อมูลการเงินต้องมี Data Classification
- ค่าที่ค้นหา exact match ใช้ keyed HMAC/deterministic lookup hash ไม่ใช้ hash ธรรมดาที่เดาง่าย
- Ciphertext ใช้ envelope encryption; Key อยู่ใน KMS/Secret Manager นอก Browser และไม่บันทึกในฐานข้อมูลเดียวกับ ciphertext แบบ plaintext
- จำกัดการถอดรหัสตาม permission และ audit ทุกครั้งที่อ่านข้อมูลสำคัญ
- Log ห้ามมี PII, token, password หรือเอกสาร

### Documents

- ใช้ Supabase Storage แบบ Private Bucket
- Object path ต้องมี tenant prefix ที่ตรวจแล้ว
- ให้ Browser เข้าถึงด้วย Signed URL อายุสั้น
- ตรวจ MIME, ขนาด, checksum และ malware ก่อนสถานะ `available`
- กำหนด retention และ legal hold ก่อนเปิดใช้งานจริง

## 9. Backup & Disaster Recovery

### Frozen architecture targets

- Production target: RPO ไม่เกิน 5 นาทีเมื่อเปิด PITR
- Production target: RTO ไม่เกิน 4 ชั่วโมง
- Staging ไม่เก็บ Production PII

### Required Controls

- เปิด Supabase backup/PITR ตามระดับบริการที่รองรับ
- ทำ Restore Drill ไปยัง Staging/Isolated Project ตามรอบ
- สำรอง Storage metadata และยืนยันว่า Object restore สอดคล้องกับ Database
- เก็บ migration และ release artifact แบบ versioned
- บันทึก restore owner, ขั้นตอนตัดระบบ, verification query และ rollback decision
- Backup ที่ไม่เคยทดสอบ restore ยังไม่นับว่าใช้งานได้

## 10. Background Jobs and Integrations

### Phase 1

- งานสั้นและ scheduled ใช้ Supabase scheduled function/cron หรือ Hostinger Cron เรียก endpoint ที่ลงลายเซ็นและ idempotent
- ห้ามใช้ public URL ที่ไม่มี signature
- ทุก job มี idempotency key, retry policy, dead-letter/error record และ correlation ID

### Future

เมื่อมีงาน import, notification หรือ calculation หนัก:

- แยก Worker Process บน VPS/Cloud Runtime
- ใช้ queue ที่มี durable delivery
- Web request สร้าง job แล้วตอบกลับ ไม่รอ process หนัก
- ยังใช้ Database/Domain Contract เดิมเพื่อลดการแตก service ก่อนจำเป็น

## 11. Observability and Security

ต้องมี:

- Structured logs พร้อม release ID, trace/correlation ID และ partner context ที่ไม่เปิด PII
- Error tracking และ alert เฉพาะเหตุสำคัญ
- Audit event สำหรับ login, access denied, role change, sensitive read, payment/status mutation และ export
- Rate limiting และ bot protection ที่ sign-in
- MFA บังคับสำหรับ Super Admin/Admin
- CSP, HSTS, secure cookies, CSRF-safe mutation และ redirect allowlist
- Dependency/vulnerability scan ก่อน deploy
- Uptime check จากภายนอกสำหรับ `app.paysave.site`

## 12. Capacity & Evolution Triggers

ไม่ย้ายสถาปัตยกรรมด้วยการคาดเดา ให้ย้ายเมื่อมีสัญญาณจริง:

| Trigger                                     | Action                                           |
| ------------------------------------------- | ------------------------------------------------ |
| Web latency/error เพิ่มเพราะ shared runtime | ย้าย Next.js ไป managed cloud/VPS                |
| Background job แย่ง resource กับ web        | แยก Worker                                       |
| รายงานทำให้ primary DB ช้า                  | optimize/index ก่อน แล้วพิจารณา read replica     |
| ตาราง history โตและ retention หมดอายุ       | archive/drop old partitions ตาม policy           |
| Connection saturation                       | ตรวจ pooling/query/transaction ก่อนเพิ่ม compute |
| ทีมหลายชุดชน feature boundary               | แยก service เฉพาะ domain ที่ contract เสถียร     |
| Region latency สูง                          | วาง Web และ DB region ใกล้กันก่อนเพิ่ม cache     |

## 13. Current Blockers

1. Hostinger API Token และรหัสผ่านที่ส่งในแชตต้อง rotate; เปิด 2FA
2. ต้องยืนยันแพ็กเกจ Hostinger จริงว่ารองรับ Node.js SSR และ resource เพียงพอ
3. RLS Policies ยังไม่มี
4. PII Encryption/KMS implementation ยังไม่ผ่านการตรวจ
5. Backup/PITR และ restore drill ยังไม่ตั้งค่า
6. Database rollback/expand-contract runbook ยังไม่มี
7. 10M-row claim ยังไม่ผ่าน representative load test
8. ยังไม่มี CI/CD, immutable release, health check และ deployment rollback ที่พิสูจน์แล้ว

## 14. Approval Gates

### Gate A — Architecture

- [x] ยอมรับ Modular Monolith — Architecture Gate Approved 2026-07-20
- [ ] ยอมรับ `app.paysave.site` แยก deployment จาก Homepage
- [ ] ยอมรับ Hostinger Node.js + Supabase เป็น Phase 1
- [ ] ยอมรับ Staging แยกจาก Production

### Gate B — Database Governance

- [x] ยืนยัน Partner เป็น Tenant หลัก — Database Gate v2.1 Approved 2026-07-21
- [x] อนุมัติ Role/Permission/Branch/Assignment Boundary — Database Gate v2.1
- [x] อนุมัติ Status Lifecycle หลัก — Logical Architecture v2.1
- [x] อนุมัติ PII classification/encryption boundary และ retention classes — Architecture Freeze v1.0
- [x] อนุมัติ Audit/Log/Document retention classes — Architecture Freeze v1.0
- [x] อนุมัติ Production target RPO ≤ 5 นาที / RTO ≤ 4 ชั่วโมง — Architecture Freeze v1.0

### Gate C — Staging

- [ ] Rotate credentials และตั้ง Secret Manager
- [ ] สร้าง isolated Supabase Staging
- [ ] Migration runtime test ผ่านบน DB ว่าง
- [ ] RLS isolation tests ผ่าน
- [ ] Staging deploy และ E2E auth ผ่าน
- [ ] Backup restore/rollback drill ผ่าน

### Gate D — Production

- [ ] Security review ผ่าน
- [ ] Load test ตาม workload จริงผ่าน
- [ ] Monitoring/alert/on-call owner พร้อม
- [ ] Production change window และ rollback owner พร้อม
- [ ] BB อนุมัติ Production deployment โดยชัดแจ้ง

## 15. Recommended Delivery Phases

1. **Architecture freeze:** ผ่านแล้ว 2026-07-21; Stage 3 Physical Schema Design ได้รับอนุญาตตาม `PAYSAVE_Architecture_Freeze_Report_v1.0.md`
2. **Security rotation:** เปลี่ยน Hostinger credentials/token และเปิด 2FA
3. **Staging foundation:** สร้าง `staging-app.paysave.site` + Supabase Staging
4. **Database hardening:** ตรวจ migration, สร้าง RLS policy draft/test, encryption/retention design
5. **Auth E2E:** provision test users, MFA admin, callback/redirect/session/revocation tests
6. **Deployment automation:** immutable archive, build logs, health check, rollback
7. **First business module:** เริ่มด้วย TDD หลัง Database/API Blueprint ของโมดูลนั้นได้รับอนุมัติ
8. **Production readiness:** restore drill, load/security tests, monitoring และ final approval

## 16. Recommendation

อนุมัติแนวทาง **Hostinger Node.js สำหรับ `app.paysave.site` + Supabase Managed PostgreSQL/Auth/Storage** เป็น Phase 1 โดยมีเงื่อนไขว่า:

- Homepage อยู่คนละ deployment และไม่ถูกแตะ
- ต้องพิสูจน์ Node.js/SSR บน Staging ก่อน
- ต้องปิด RLS, PII, Backup/Restore และ Rollback blockers ก่อน Production
- ออกแบบให้ Web Runtime ย้ายผู้ให้บริการได้ แต่ Database contract และ domain boundary ไม่ผูกกับ Hostinger

แนวทางนี้สมดุลที่สุดระหว่างความเร็ว ค่าใช้จ่าย ความปลอดภัย และความสามารถในการขยายในอนาคต โดยยังไม่สร้างความซับซ้อนแบบ Microservices หรือ Self-hosted Database เร็วเกินไป
