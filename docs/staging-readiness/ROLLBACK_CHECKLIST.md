# PAYSAVE OS — Staging Rollback Checklist

สถานะ: **NOT REHEARSED / NO EXECUTION AUTHORIZATION**  
เอกสารนี้เป็น checklist สำหรับ CTO Review ไม่ใช่คำสั่ง Deploy, rollback หรือ restore

## Scope and Authority

- [ ] Change/experiment ID และ Staging owner ระบุ
- [ ] Exact release version, source revision, package SHA-256 และ image digest ระบุ
- [ ] Previous known-good artifact/config digest ระบุและยัง retrievable
- [ ] Confirm target = isolated Staging และไม่มี Production data/credentials
- [ ] Rollback executor, validator, Database Owner, Security Owner และ decision authority ระบุ
- [ ] No database change: `changeAuthorized=false`, `migrationsIncluded=false`

## Pre-Rehearsal Safety

- [x] Existing local disposable PostgreSQL backup/restore evidence และ rollback guard ถูก review แล้ว; ไม่ถือเป็น Staging rehearsal
- [ ] CI gates ผ่านและ artifact `releaseEligibility=passed` สำหรับ exact digest
- [ ] Package checksum/SBOM/manifest verify ผ่าน
- [ ] Canonical image `docker/Dockerfile` run as non-root และ healthy
- [ ] Current/previous application และ configuration compatibility matrix พร้อม
- [ ] Synthetic test data และ expected counts พร้อม
- [ ] Logs/metrics/alerts/incident channel พร้อมก่อน rehearsal
- [ ] Backup/PITR restore point ของ isolated Staging ยืนยันโดย provider evidence
- [ ] Write containment method ได้รับอนุมัติ แต่ยังไม่ execute

## Application Rollback Rehearsal

- [ ] Record initial artifact/config identity และ health baseline
- [ ] Promote exact candidate by digest; no rebuild
- [ ] Run liveness/readiness/version and critical read-only smoke checks
- [ ] Simulate approved rollback trigger โดยไม่ใช้ Production
- [ ] Select previous immutable artifact by recorded digest
- [ ] Restore previous approved config references โดยไม่เปิดเผยค่า secret
- [ ] Wait for explicit readiness; ห้ามใช้ sleep เป็นหลักฐาน
- [ ] Verify release identity, health, auth/session, RBAC/RLS denial และ critical workflows
- [ ] Reconcile synthetic writes/events/audit trail
- [ ] Record elapsed rollback time and result

## Configuration Rollback

- [ ] Config digest/versioning พร้อม
- [ ] Previous secret **references** พร้อม; ไม่มีค่าใน artifact/log
- [ ] Feature flag previous value และ owner ระบุ
- [ ] Restart/reload semantics ถูกทดสอบ
- [ ] Invalid/missing configuration fail-closed
- [ ] Post-rollback config and secret-reference audit ผ่าน

## Database and Restore Boundaries

- [x] M001–M016 เป็น approved baseline ใน manifest
- [x] M017–M020 ถูก block
- [ ] Migration ledger ของ isolated Staging ถูก verify
- [ ] PITR window ≥ 7 วัน, daily 35 วัน, monthly 12 เดือน มี provider evidence
- [ ] Provider-specific restore procedure ระบุ owner/permissions/target isolation
- [ ] Restore ลง isolated target ใหม่ ไม่ทับ source ระหว่าง drill
- [ ] Validate schema, migration state, RLS, FK/integrity, critical counts, encryption access และ tenant boundaries
- [ ] Measure actual RPO/RTO; เปรียบเทียบกับ policy target โดยไม่ fabricate result
- [ ] Reconciliation/replay procedure ผ่านด้วย synthetic data

ห้ามรัน ad hoc DDL/SQL, reverse migration หรือ PITR จากเอกสารนี้

## Rollback Triggers to Approve

- [ ] Readiness/dependency unavailable
- [ ] Sustained error/latency/saturation เกิน threshold และ window ที่อนุมัติจาก Staging baseline
- [ ] Auth/RBAC/RLS/tenant-isolation failure
- [ ] Secret/config/artifact identity mismatch
- [ ] Data corruption, duplicate business effect หรือ audit-chain gap
- [ ] Monitoring/alerting unavailable ระหว่าง change window

## Evidence Record

- [ ] Exact before/candidate/after artifact digests
- [ ] Config reference digests; no secret values
- [ ] Start/end timestamps and elapsed time
- [ ] Trigger, decision authority, executor, validator
- [ ] Health/smoke/security/integrity outputs
- [ ] Actual RPO/RTO and any breach
- [ ] Missing/replayed/reconciled synthetic records
- [ ] Alert/incident timeline and final decision

## Gate

Rollback Gate ยัง **BLOCKED** จน application/config rollback และ isolated database restore drill ผ่านจริง มี evidence และ independent validation; ห้ามใช้ Production เพื่อเติมหลักฐาน
