# PAYSAVE OS — Staging Monitoring Checklist

สถานะ: **BLOCKED — observability contracts มีบางส่วน แต่ operational monitoring/alerting ยังไม่พร้อม**

## Health and Availability

- [x] Container มี HTTP health probe ที่ `/login`
- [ ] เพิ่ม dedicated `/healthz` สำหรับ process liveness
- [ ] เพิ่ม dedicated `/readyz` สำหรับ config/dependency readiness
- [ ] เพิ่ม `/version` หรือ equivalent เพื่อรายงาน release version/source revision/artifact digest โดยไม่เปิด secret
- [ ] Readiness ตรวจ isolated Staging dependencies โดย timeout สั้นและไม่ mutate data
- [ ] Synthetic monitor ตรวจ TLS, ingress, login render และ critical read-only flow
- [ ] Health probe failure ถูกเชื่อมกับ restart/alert policy

`/login` ปัจจุบันพิสูจน์เพียงว่า Next.js ตอบ HTTP ไม่ใช่หลักฐานว่า Supabase, database, encryption key หรือ tenant controls พร้อม

## Logging

- [x] Audit events เป็น structured JSON line
- [x] Correlation ID ถูกสร้าง/ส่งผ่าน API responses และ error logs
- [x] Metadata keys ที่คล้าย password/secret/token/PII ถูก redact
- [x] Unhandled route errors ไม่ส่ง internal details กลับ client
- [ ] เลือก centralized log backend และ Staging project/index
- [ ] กำหนด retention, access roles, encryption และ deletion/legal-hold policy
- [ ] ทดสอบว่า secret/PII synthetic canary ไม่ปรากฏใน logs
- [ ] บันทึก release version/environment/service/correlation ID ในทุก operational event
- [ ] กำหนด log volume/rate limit และ failure behavior เมื่อ backend unavailable

## Metrics

- [ ] Availability/error rate by route/status
- [ ] Latency p50/p95/p99 for critical API classes
- [ ] Container CPU/memory/restart/health status
- [ ] PostgreSQL connections, saturation, locks, storage growth and backup freshness
- [ ] Supabase/auth failure and refresh rates
- [ ] Tenant-denial/cross-tenant security signals
- [ ] Queue/job/webhook metrics เมื่อ adapters ถูกเปิด
- [ ] Release marker annotation by artifact digest

Architecture performance/capacity numbersเป็น targets ไม่ใช่ observed thresholds จนกว่าจะ benchmark ใน Staging

## Tracing

- [ ] Trace backend/vendor/data residency ผ่าน Security review
- [ ] HTTP/database/external dependency spans พร้อม correlation ID
- [ ] Sampling policy แยก success/error/security events
- [ ] Trace attributes ไม่มี token, secret, raw PII หรือ sensitive payload
- [ ] Trace-to-log linkage ทดสอบได้

## Dashboards

- [ ] Staging overview: availability, error, latency, saturation, current release
- [ ] Auth/RBAC/RLS/tenant isolation signals
- [ ] Database health, backup freshness และ restore-point age
- [ ] Container health/restarts/resource saturation
- [ ] Security/audit anomalies
- [ ] Dashboard owner, URL/reference, access role และ review date ถูกบันทึก

## Alerting

- [ ] ระบุ actionable thresholds และ observation windows จาก Staging baseline
- [ ] Sev-1/Sev-2 routing, primary/secondary on-call และ escalation chain
- [ ] Alert สำหรับ readiness down, sustained 5xx, latency, saturation, TLS expiry, backup stale/failed, restore-point gap, secret expiry และ auth anomaly
- [ ] Deduplication, suppression, maintenance window และ alert storm control
- [ ] Test alert ส่งถึงปลายทางจริงของ Staging และ acknowledgement ถูกบันทึก
- [ ] Runbook link แนบกับทุก alert
- [ ] Alert resolution/recovery notification ทดสอบแล้ว

## Feature Flags

- [x] `PAYSAVE_ENABLE_DESIGN_PREVIEW` validate ด้วย enum และ default false
- [x] Canonical container runtime ตั้ง flag เป็น false
- [ ] Shared Staging configuration ยืนยันค่า false
- [ ] Flag change มี owner, approval, audit record และ rollback value
- [ ] ห้ามใช้ flag เพื่อ bypass auth/RBAC/RLS, migration, backup หรือ security gate
- [ ] หากเพิ่ม provider ภายหลัง ต้องมี stale-flag cleanup และ fail-closed behavior

## Gate

Monitoring Gate ผ่านเมื่อ health/readiness contracts, backend, dashboards, thresholds, alert routing, on-call และ synthetic alert test มี evidence ครบ โดยไม่เชื่อม Production
