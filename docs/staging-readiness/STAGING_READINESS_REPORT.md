# PAYSAVE OS — Staging Readiness Report

- **ตรวจเมื่อ:** 2026-07-23 10:24 +07
- **ขอบเขต:** Production-like Staging แบบแยกจาก Production
- **สถานะ:** **HOLD — NOT READY FOR STAGING DEPLOYMENT**
- **ข้อห้าม:** เอกสารชุดนี้ไม่อนุญาตให้ Deploy, ใช้ Production data, Production credentials หรือ Production endpoints

## Executive Decision

Repository มีฐาน CI/CD แบบ fail-closed, immutable artifact manifest, canonical container build, non-root runtime, masked audit log และ no-deploy evidence workflow แต่ยังไม่มี environment-specific Staging configuration, dedicated readiness endpoint, secret-manager evidence, backup/restore drill, monitoring backend, dashboards, alert routing หรือ rollback rehearsal จึงยังไม่พร้อม Deploy ไป Staging

## Readiness Matrix

| Area                  | Evidence                                                                                                                     | Status               |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| Environment variables | มี Zod validation สำหรับ public config, design-preview flag และ field-encryption key                                         | PARTIAL              |
| Secrets management    | มี policy ห้าม commit secret และ `.dockerignore` กัน `.env*`; ยังไม่มี secret-manager/rotation/access evidence               | BLOCKED              |
| Docker                | `docker/Dockerfile` pin base digest, run non-root UID 10001, remove npm/npx runtime tooling; stale root `Dockerfile` retired | PASS LOCALLY         |
| Deployment manifest   | มี template แบบ build-once/promote-by-digest, `deploy=false`, Staging data isolation                                         | PASS FOR REVIEW ONLY |
| Health check          | Container probe `/healthz`; `/healthz`, config-only `/readyz`, `/version` และ `/metrics` ผ่าน local verification             | PASS LOCALLY         |
| Backup policy         | มี approved target และ existing local disposable PostgreSQL backup evidence; ไม่มี Staging provider evidence                 | PARTIAL              |
| Restore procedure     | มี governance runbook และ existing local isolated restore evidence; ไม่มี provider-specific Staging drill/evidence           | BLOCKED              |
| Monitoring            | มี structured audit/event logs และ correlation ID; ไม่มี backend/dashboard/SLO evidence                                      | BLOCKED              |
| Logging               | JSON audit masking และ unhandled route error มี correlation ID; ไม่มี retention/access/aggregation evidence                  | PARTIAL              |
| Alerting              | ไม่มี alert routes, thresholds, test notification หรือ on-call evidence                                                      | BLOCKED              |
| Feature flags         | มี `PAYSAVE_ENABLE_DESIGN_PREVIEW`, validate และ default false                                                               | PASS WITH CONDITION  |
| CI eligibility        | Dependency audit ยัง fail-closed จาก residual High vulnerability                                                             | BLOCKED              |

## Confirmed Controls

- Canonical CI build ใช้ `docker/Dockerfile`
- Local canonical image build ผ่านจาก final tree; `/healthz`, `/readyz` และ `/version` ตอบ HTTP 200 และ Docker health เป็น `healthy`
- Node 22 และ PostgreSQL 17 ถูกกำหนดใน manifest
- Container runtime ใช้ user `paysave` UID/GID 10001 ไม่ใช่ root
- Base image ใน canonical Dockerfile pin ด้วย SHA-256 digest
- `.dockerignore` ไม่ส่ง `.env`/`.env.*` เข้า build context ยกเว้น `.env.example`
- Local image metadata/history scan ไม่พบ server secret names ถูก bake ใน image
- Existing local PostgreSQL 17 evidence ระบุ backup/restore บน disposable isolated database และ rollback guard ผ่าน; ไม่นับแทน Staging drill
- CD workflow เป็น manual evidence gate เท่านั้น มี `DEPLOYMENT_ENABLED=false` และ permissions แบบ read-only
- Deployment manifest ตั้ง `releaseEligibility=blocked`, `promotion.deploy=false`, `productionDataAllowed=false` สำหรับ Staging
- Secret/PII-like metadata ถูก redact ก่อนออกจาก `ConsoleAuditSink`
- Feature preview fail-closed เป็น `false`

## Blocking Findings

1. **ไม่มี Staging environment จริงที่พิสูจน์แล้ว** — ไม่มี URL/project/secret-manager references/owner evidence ที่อนุมัติ และห้ามนำ Production มาใช้แทน
2. **ไม่มี dedicated readiness contract** — `/login` พิสูจน์เพียง HTTP render ไม่พิสูจน์ Supabase, database, encryption key, migrations หรือ dependencies
3. **Secrets lifecycle ยังไม่พร้อม** — ไม่มี provider, owner, least-privilege access, rotation date, expiry, break-glass และ access-audit evidence
4. **Backup/restore ยังไม่ถึง Staging operational evidence** — มี local disposable backup/restore evidence แต่ไม่มี Staging PITR configuration, protected restore-point evidence, quarterly Staging restore drill หรือ actual RPO/RTO measurement
5. **Observability/alerting ไม่ครบ** — vendor ยังไม่เลือก, ไม่มี metrics/traces/dashboard/threshold/route/on-call และ test alert
6. **Staging rollback ยังไม่ rehearsed** — local candidate→previous rehearsal ผ่าน แต่ยังไม่มี approved previous Staging digest, timing, config rollback proof และ sign-off
7. **Dockerfile drift ปิดแล้วใน source tree** — stale root `Dockerfile` retired; canonical `docker/Dockerfile` build/run/health และ Trivy local scan ผ่าน
8. **CI release eligibility ยัง blocked ด้วย external evidence** — dependency audit ปัจจุบันผ่าน 0 vulnerabilities แต่ machine Beta Gate ยังคง HOLD

## Backup and Restore Policy Baseline

อ้างอิง Architecture Freeze เท่านั้น ไม่ใช่ผลทดสอบจริง:

- Production target: RPO ≤ 5 นาที, DR-A RTO ≤ 4 ชั่วโมง
- PITR recovery window ≥ 7 วัน
- Protected daily restore points: 35 วัน
- Protected monthly restore points: 12 เดือน
- Restore drill: รายไตรมาส
- Backup ที่ไม่เคย restore สำเร็จไม่นับเป็น operational evidence

Staging ต้องพิสูจน์ขั้นตอนเดียวกันด้วย isolated/synthetic data ก่อนเสนอ Production Gate

## Evidence Index

- Environment validation: `apps/web/src/shared/config/env.ts:3-10,23-56`
- Field-encryption secret validation: `apps/web/src/shared/config/field-encryption-env.ts:4-10,24-40`
- Secret/build-context exclusion: `.dockerignore:16-18`
- Canonical container: `docker/Dockerfile:1-47`
- Retired duplicate root container definition: verified absent; `docker/Dockerfile` is canonical
- Fail-closed manifest validator: `scripts/ci/validate-deployment-manifest.mjs:13-67`
- CI dependency gate/Docker build: `.github/workflows/ci.yml:157-209`
- No-deploy evidence workflow: `.github/workflows/cd.yml:1-96`
- Masked audit logging: `packages/observability/src/audit-sink.ts:13-43`
- Backup/restore policy: `docs/architecture/PAYSAVE_Architecture_Freeze_Report_v1.0.md:71-83`
- Existing rollback governance: `docs/release-management/ROLLBACK_RUNBOOK_v1.0.md:85-177`
- Local disposable DB backup/restore evidence: `docs/database/PAYSAVE_Local_Database_Verification_Sprint_Report_v1.0.md:107-145`
- Local DB verification/rollback guard: `scripts/ci/verify-database.sh:39-55,64-93`

## Required Closure Before Staging Deployment Review

- ระบุ isolated Staging URL, Supabase project และ secret manager โดยยืนยันว่าไม่ใช่ Production
- เติม secret references/owners/rotation/access evidence โดยไม่บันทึกค่า
- เพิ่ม dedicated liveness/readiness/version endpoints และ dependency-aware checks
- เลือก log/metric/trace backend; สร้าง dashboard, thresholds, alert routes และทดสอบ notification
- เปิด backup/PITR ตาม policy และทำ restore drill ใน isolated Staging พร้อมวัด RPO/RTO
- rehearse application/config rollback ด้วย immutable previous artifact
- ลบหรือแก้ Dockerfile drift และยืนยัน canonical path
- ปิด CI dependency audit blocker หรือรับความเสี่ยงตามกระบวนการ CTO ที่ fail-closed

## Independent Review Notes (Non-Blocking)

- `scripts/ci/check-no-deploy.mjs` ปัจจุบันเป็น substring-based YAML guard; ผ่านตาม policy ปัจจุบัน แต่ควรเสริม schema/required-job policy check ในอนาคต
- `apps/web/.env.example` พิสูจน์เฉพาะชื่อและรูปแบบ placeholder ไม่ใช่หลักฐาน runtime secret injection

## Decision

**ไม่ Deploy และไม่ใช้ Production** เอกสารและ manifest พร้อมสำหรับ CTO Review เท่านั้น
