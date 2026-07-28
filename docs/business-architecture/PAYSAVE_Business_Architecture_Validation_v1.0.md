# PAYSAVE OS — Stage 2.5 Business Architecture Validation Report v1.0

> **Status:** Closed — P0 remediation completed in Logical Database Design v2.1; historical validation record  
> **Historical verdict against v2.0:** `passed: false` — Logical Database Design v2.0 ยังไม่รองรับ Business Process ครบทุก Workflow  
> **Reviewed source:** `docs/database/PAYSAVE_Recovery_Database_Design_v2.0.md` และ `PAYSAVE_Recovery_ERD_v2.0.mmd`  
> **Scope:** Business architecture validation only  
> **Out of scope:** SQL, API, Frontend, Business Logic implementation และการแก้ Database Design v2.0
>
> **Closure note (2026-07-21):** รายงานนี้เป็น historical validation input. P0 gaps ถูกปิดใน Logical Database Design v2.1 และ Database Gate v2.1 ได้รับอนุมัติแล้ว; ใช้ `../database/PAYSAVE_Recovery_Database_Design_v2.1.md` และ `../architecture/PAYSAVE_Architecture_Freeze_Report_v1.0.md` เป็นสถานะ governance ปัจจุบัน.

## 1. Executive summary

Logical Database Design v2.0 รองรับแกนหลักของ Partner, Customer, Case, Agent, Assignment, Visit, GPS, Payment, KPI, Commission, Document, Notification และ Case Timeline ได้ระดับหนึ่ง แต่ยังไม่ครบสำหรับ Enterprise Field Recovery Process เพราะ:

1. **Approval workflow ไม่มี Domain/Entity/Aggregate โดยตรง**
2. **AI governance workflow ไม่มี Model/Prompt/Request/Result/Human Review/Feedback**
3. **Report workflow ไม่มี Definition/Run/Export/Subscription/Snapshot/Data Lineage**
4. Payment มี Reconciliation Batch แต่ไม่มี Reconciliation Item ที่เชื่อม Payment
5. Visit ไม่มี Contact Attempt, Checklist และ Promise-to-Pay ซึ่งเป็นผลลัพธ์สำคัญของ Field Recovery
6. GPS ไม่มี Tracking Session, Device, Consent/Legal Basis และ Anomaly/Spoof Detection record
7. Commission ไม่มี Payout/Disbursement lifecycle
8. Permission model มีโครง RBAC แต่ยังไม่มี Workflow Permission Catalog และ Resource Scope ที่อนุมัติ
9. Generic Audit/Entity History รองรับพื้นฐาน แต่บาง workflow ต้องมี Domain-specific immutable history
10. ยังไม่มี Approved BPMN/SOP, Status Transition Catalog และ Role Matrix เพื่อยืนยันว่า Workflow ที่ตรวจตรงกับกระบวนการจริง 100%

ดังนั้น **ยังไม่ควรเปลี่ยน ADR-0002 เป็น Accepted หรือเข้าสู่ Physical Schema/DDL** จนกว่า P0 gaps และ Business Decisions ในรายงานนี้จะได้รับการยืนยัน

---

## 2. Validation basis and limitation

ไม่พบ Approved Business Process/BPMN/SOP ใน `docs/product/` หรือเอกสาร Workflow เฉพาะของ PAYSAVE การตรวจรอบนี้จึงใช้:

- 16 Workflows ที่ผู้ใช้ระบุ
- Logical Database Design v2.0 จำนวน 67 ตาราง
- Canonical enterprise Field Recovery lifecycle ด้านล่าง

```text
Partner onboard
  → User/Membership/Role/Branch scope
  → Customer/Contract intake
  → Case open/triage/approve
  → Assign Agent/Team
  → Agent accept/reject/reassign
  → Tracking session/GPS
  → Visit/contact/checklist/outcome/evidence
  → Promise-to-pay or Payment
  → Reconcile/approve/reverse if needed
  → KPI event/result
  → Commission run/approval/payout
  → Notification/Timeline/Audit
  → Report/AI-assisted review
  → Case close/reopen
```

ถ้ากระบวนการจริงต่างจาก lifecycle นี้ ต้องปรับ Business Validation ก่อน Database Gate

---

## 3. Coverage summary

| Workflow     | Current coverage                               | Verdict      | Main gap                                                  |
| ------------ | ---------------------------------------------- | ------------ | --------------------------------------------------------- |
| Case         | Core entities present                          | Partial      | SLA/escalation/related case; physical asset conditional   |
| Partner      | Partner/setting/branch/integration present     | Partial      | Agreement/SLA/contact/lifecycle history                   |
| Customer     | Identity/contact/address present               | Partial      | Consent/relationship/merge/status history                 |
| Agent        | Agent/team/membership present                  | Partial      | Availability/skill/device/status history                  |
| Assignment   | Assignment/status history present              | Partial      | Accept/reject/handoff/escalation events                   |
| GPS          | Location points present                        | Partial      | Tracking session/device/privacy/anomaly                   |
| Visit        | Visit/outcome/location present                 | Partial      | Checklist/contact attempt/PTP/participant                 |
| KPI          | Definition/version/target/event/result present | Partial      | Approval/freeze/reopen/target history                     |
| Commission   | Plan/version/run/item/adjustment present       | Partial      | Approval and payout lifecycle                             |
| Payment      | Payment/allocation/status/reversal present     | Partial      | Provider transaction/reconciliation item/dispute/approval |
| Document     | Attachment/version/typed links present         | Partial      | Scan/legal hold/access grant/disposition                  |
| Notification | Template/preference/request/delivery present   | Partial      | Routing/subscription/template approval/escalation         |
| Approval     | Not modeled                                    | Missing — P0 | Entire aggregate and events                               |
| Timeline     | Case timeline present                          | Partial      | Visibility/correlation/redaction/cross-workflow contract  |
| AI           | Not modeled                                    | Missing — P0 | Entire governed AI lifecycle                              |
| Report       | Not modeled                                    | Missing — P0 | Definition/run/export/subscription/snapshot               |

---

# 4. Workflow validation

## 4.1 Case

**Current support:** `recovery.cases`, `case_statuses`, `case_status_history`, `case_external_references`, `case_notes`, `tags`, `case_tags`, `case_timeline_events`

| Check                | Finding                                                                                                                     | Severity                      |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Missing Entity       | ไม่มี SLA/escalation record และ related-case hierarchy; ถ้า Recovery หมายถึงทรัพย์สินจริง ยังไม่มี Asset/Collateral/Custody | P1; Asset = Business Decision |
| Missing Relationship | Case ไม่มี parent/related case, escalation owner หรือ explicit approval link                                                | P1                            |
| Missing Event        | ต้องมี `case.opened`, `triaged`, `priority_changed`, `escalated`, `closed`, `reopened`, `cancelled`                         | P1                            |
| Missing Aggregate    | Case aggregate มีแล้ว; Case Escalation และ Asset/Custody อาจเป็น aggregate เพิ่ม                                            | P1/Decision                   |
| Missing Audit        | Generic audit รองรับ แต่ close/reopen/priority override ต้องบันทึก reason + actor + approval reference                      | P1                            |
| Missing History      | Status history มีแล้ว; priority/SLA/owner history ยังไม่มีแบบ domain-specific                                               | P1                            |
| Missing Permission   | ต้องมี case.read/create/update/assign/close/reopen/escalate/view_sensitive                                                  | P0 catalog                    |
| Future Scalability   | Cases benchmark-gated ถูกต้อง; ต้องเพิ่ม queue aging/SLA query profile และ archive policy                                   | P1                            |

**Business verdict:** Partial

## 4.2 Partner

**Current support:** `tenant.partners`, `partner_settings`, `branches`, `platform.partner_integrations`

| Check                | Finding                                                                                         | Severity   |
| -------------------- | ----------------------------------------------------------------------------------------------- | ---------- |
| Missing Entity       | Partner contact, agreement, service level, business calendar และ data-retention policy ยังไม่มี | P1         |
| Missing Relationship | Agreement/SLA ยังไม่เชื่อม Partner → Case priority/KPI/commission/retention                     | P1         |
| Missing Event        | `partner.onboarded`, `activated`, `suspended`, `agreement_changed`, `integration_changed`       | P1         |
| Missing Aggregate    | Partner aggregate มีแล้ว; Agreement/SLA ควรเป็น child หรือ aggregate ตาม versioning             | P1         |
| Missing Audit        | Settings/integration/retention change ต้องมี before/after + approver                            | P1         |
| Missing History      | ไม่มี partner status history และ agreement version history                                      | P1         |
| Missing Permission   | partner.read/manage/settings/manage_branch/manage_integration/view_billing                      | P0 catalog |
| Future Scalability   | ต้องรองรับ partner-specific config version, data residency และ workload quota                   | P2         |

**Business verdict:** Partial

## 4.3 Customer

**Current support:** `crm.customers`, `customer_identifiers`, `customer_contacts`, `customer_addresses`

| Check                | Finding                                                                                                   | Severity   |
| -------------------- | --------------------------------------------------------------------------------------------------------- | ---------- |
| Missing Entity       | Consent/legal basis, customer relationship, merge/dedup record และ status history ยังไม่มี                | P0/P1      |
| Missing Relationship | ไม่มี guarantor/related party/employer/authorized contact relation                                        | P1         |
| Missing Event        | `customer.created`, `updated`, `merged`, `consent_changed`, `contact_verified`, `marked_deceased/blocked` | P1         |
| Missing Aggregate    | Customer aggregate มีแล้ว; Merge Record/Consent เป็น child ที่ต้อง immutable                              | P1         |
| Missing Audit        | PII read มี data_access_events; PII change/merge ต้องเก็บ reason/source                                   | P1         |
| Missing History      | ไม่มี customer status/contact/address history แบบค้นย้อนหลังง่าย                                          | P1         |
| Missing Permission   | customer.read/create/update/merge/view_sensitive/export_sensitive                                         | P0 catalog |
| Future Scalability   | ต้องมี tenant-scoped dedup hash, merge survivor strategy และ PII retention                                | P1         |

**Business verdict:** Partial

## 4.4 Agent

**Current support:** `workforce.agents`, `teams`, `team_members`, IAM membership/role/branch scope

| Check                | Finding                                                                                                      | Severity   |
| -------------------- | ------------------------------------------------------------------------------------------------------------ | ---------- |
| Missing Entity       | Agent availability/capacity, skills/certification, device registration และ status history ยังไม่มี           | P1         |
| Missing Relationship | Agent ไม่มี supervisor hierarchy แบบ effective-dated และ device/tracking-session link                        | P1         |
| Missing Event        | `agent.activated`, `suspended`, `availability_changed`, `team_joined`, `device_bound`                        | P1         |
| Missing Aggregate    | Agent profile มีแล้ว; Device/Availability ควรเป็น child; Team aggregate มีแล้ว                               | P1         |
| Missing Audit        | Agent status, branch/team/role change ต้องมี actor/reason                                                    | P1         |
| Missing History      | Team membership มี valid range; Agent status/skill/device history ยังไม่มี                                   | P1         |
| Missing Permission   | agent.read/manage/assign/view_performance/manage_device                                                      | P0 catalog |
| Future Scalability   | Availability/capacity ต้อง query ตาม partner/branch/team และมี snapshot ไม่คำนวณจาก 10M assignments ทุกครั้ง | P1         |

**Business verdict:** Partial

## 4.5 Assignment

**Current support:** `assignments`, `assignment_statuses`, `assignment_status_history`

| Check                | Finding                                                                                                    | Severity    |
| -------------------- | ---------------------------------------------------------------------------------------------------------- | ----------- |
| Missing Entity       | Handoff/reassignment link, assignment event/reason และ escalation record ยังไม่มี                          | P0/P1       |
| Missing Relationship | Assignment ใหม่ไม่ชี้ assignment ก่อนหน้า; ไม่มี assigned_by/accepted_by explicit lifecycle                | P1          |
| Missing Event        | `assignment.created`, `accepted`, `rejected`, `reassigned`, `started`, `overdue`, `completed`, `cancelled` | P0          |
| Missing Aggregate    | Assignment aggregate มีแล้ว; Handoff เป็น child/event                                                      | P1          |
| Missing Audit        | Reassign/override/due-date change ต้องมี reason + actor + approval                                         | P1          |
| Missing History      | Status history มีแล้ว; assignee/team/due-date history ต้องตรวจย้อนหลังได้                                  | P1          |
| Missing Permission   | assignment.create/accept/reject/reassign/override/complete                                                 | P0 catalog  |
| Future Scalability   | Active assignment uniqueness ต้องอนุมัติ; queue index รองรับแต่ escalation/SLA query ยังขาด                | P0 decision |

**Business verdict:** Partial

## 4.6 GPS

**Current support:** `workforce.field_location_events`

| Check                | Finding                                                                                                    | Severity   |
| -------------------- | ---------------------------------------------------------------------------------------------------------- | ---------- |
| Missing Entity       | Tracking session, registered device, consent/legal basis, geofence และ location anomaly/spoof record ไม่มี | P0         |
| Missing Relationship | GPS point ผูก visit/agent แต่ไม่ผูก tracking session/device/policy                                         | P0         |
| Missing Event        | `tracking.started`, `location.recorded`, `geofence.entered/exited`, `anomaly_detected`, `tracking.stopped` | P1         |
| Missing Aggregate    | Tracking Session aggregate ไม่มี                                                                           | P0         |
| Missing Audit        | การเปิดดู live/history/export GPS ต้องลง data-access audit                                                 | P0 policy  |
| Missing History      | Location เป็น append-only แล้ว; session/device/policy history ยังไม่มี                                     | P1         |
| Missing Permission   | gps.record/view_live/view_history/export/manage_retention                                                  | P0 catalog |
| Future Scalability   | Monthly partition เหมาะสม; ต้องมี sampling policy, compression/archive และ late-event handling             | P1         |

**Business verdict:** Partial — privacy blocker

## 4.7 Visit

**Current support:** `field_visits`, `field_visit_outcomes`, location events, visit attachments

| Check                | Finding                                                                                                                        | Severity   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| Missing Entity       | Visit checklist/task, participant, contact attempt, Promise-to-Pay และ follow-up commitment ไม่มี                              | P0         |
| Missing Relationship | Outcome JSON ยังไม่เชื่อม PTP/payment/customer contact/document requirement แบบ relational                                     | P0         |
| Missing Event        | `visit.scheduled`, `started`, `arrived`, `contacted`, `no_contact`, `outcome_recorded`, `ptp_created`, `completed`, `reopened` | P0         |
| Missing Aggregate    | Visit aggregate มีแล้ว; PromiseToPay ควรเป็น aggregate เพราะมี lifecycle และ breach                                            | P0         |
| Missing Audit        | Outcome correction/reopen/evidence deletion ต้องมี reason + approval                                                           | P1         |
| Missing History      | Outcome append-only ดี; schedule/time/participant/checklist history ยังไม่ชัด                                                  | P1         |
| Missing Permission   | visit.schedule/start/complete/reopen/record_outcome/create_ptp                                                                 | P0 catalog |
| Future Scalability   | Outcome JSON ต้องมี schema version แต่ field ที่ใช้รายงาน/KPI ต้อง normalize                                                   | P1         |

**Business verdict:** Partial — core field workflow gap

## 4.8 KPI

**Current support:** definitions, versions, targets, events, period results

| Check                | Finding                                                                                                          | Severity   |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------- |
| Missing Entity       | Result approval/finalization history และ target revision history ไม่มีโดยตรง                                     | P1         |
| Missing Relationship | KPI event เชื่อม case/agent แต่ไม่เชื่อม assignment/visit/payment allocation ที่เป็น source ทุกชนิด              | P1         |
| Missing Event        | `kpi.definition_published`, `target_set/revised`, `event_recorded`, `result_calculated`, `finalized`, `reopened` | P1         |
| Missing Aggregate    | KPI Definition aggregate มีแล้ว; Period Result finalization ต้องมี approval boundary                             | P1         |
| Missing Audit        | Manual KPI correction/reopen ต้องเก็บ reason + approver                                                          | P0         |
| Missing History      | Definition version มี; target/result status history ยังขาด                                                       | P1         |
| Missing Permission   | kpi.manage_definition/set_target/view_team/view_all/finalize/reopen                                              | P0 catalog |
| Future Scalability   | Event partitionดี; ต้องมี idempotent source event และ incremental period result                                  | P1         |

**Business verdict:** Partial

## 4.9 Commission

**Current support:** plans, versions, runs, items, adjustments

| Check                | Finding                                                                                                 | Severity   |
| -------------------- | ------------------------------------------------------------------------------------------------------- | ---------- |
| Missing Entity       | Commission approval steps, payout/disbursement, payout status/history และ payroll/export batch ไม่มี    | P0         |
| Missing Relationship | Adjustment มี approved_by แต่ไม่มี Approval Request; Item ไม่มี payout link                             | P0         |
| Missing Event        | `commission.run_started`, `calculated`, `reviewed`, `approved`, `adjusted`, `payable`, `paid`, `voided` | P0         |
| Missing Aggregate    | Commission Plan/Run มี; Commission Payout aggregate ไม่มี                                               | P0         |
| Missing Audit        | Finalize/reopen/adjust/approve/pay ต้อง immutable และอ้าง approval decision                             | P0         |
| Missing History      | Plan version มี; run/item/payout status history ยังไม่ครบ                                               | P1         |
| Missing Permission   | commission.plan/run/review/approve/adjust/payout/view_own/view_all                                      | P0 catalog |
| Future Scalability   | Commission item อาจโตตาม payment; partition/read model ต้อง benchmark และ freeze result snapshot        | P1         |

**Business verdict:** Partial — approval/payout blocker

## 4.10 Payment

**Current support:** statuses, payments, allocations, status history, reversals, reconciliation batches

| Check                | Finding                                                                                                          | Severity   |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------- |
| Missing Entity       | Payment method/channel, provider transaction, reconciliation item, dispute/chargeback และ approval request ไม่มี | P0         |
| Missing Relationship | Reconciliation batch ไม่เชื่อม payment ผ่าน item; reversal ไม่เชื่อม approval/document evidence โดยตรง           | P0         |
| Missing Event        | `payment.received`, `verified`, `allocated`, `reconciled`, `failed`, `disputed`, `reversed`, `refunded`          | P0         |
| Missing Aggregate    | Payment aggregate มี; Reconciliation Batch incomplete; Dispute อาจเป็น aggregate                                 | P0         |
| Missing Audit        | Verify/allocate/reconcile/reverse ต้องมี actor/reason/approval                                                   | P0         |
| Missing History      | Status history มี; allocation correction/reconciliation/dispute history ยังไม่มี                                 | P1         |
| Missing Permission   | payment.record/verify/allocate/reconcile/reverse/refund/view_sensitive                                           | P0 catalog |
| Future Scalability   | Idempotencyดี; provider webhook ordering, duplicate settlement และ large reconciliation batch ต้องออกแบบ         | P1         |

**Business verdict:** Partial — reconciliation integrity blocker

## 4.11 Document

**Current support:** attachment metadata/version และ explicit case/visit/payment/commission links

| Check                | Finding                                                                                                                   | Severity   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Missing Entity       | Malware scan result, legal hold, access grant/share, retention/disposition event และ signature/verification ไม่มี         | P0/P1      |
| Missing Relationship | Attachment ไม่มี uploader membership/scan policy/legal-hold link ที่ตรวจ tenant ได้ชัด                                    | P1         |
| Missing Event        | `document.uploaded`, `scan_passed/failed`, `classified`, `linked`, `viewed`, `legal_hold_applied`, `archived`, `disposed` | P1         |
| Missing Aggregate    | Attachment aggregate มีแล้ว; Legal Hold อาจเป็น aggregate cross-document                                                  | P1         |
| Missing Audit        | View/download/export/delete sensitive document ต้องลง data-access audit                                                   | P0 policy  |
| Missing History      | Version มี; classification/access/retention/legal-hold history ยังไม่มี                                                   | P1         |
| Missing Permission   | document.upload/view/download/view_sensitive/delete/legal_hold/share                                                      | P0 catalog |
| Future Scalability   | Object storage metadataดี; ต้องมี checksum dedup, lifecycle job และ orphan-object reconciliation                          | P1         |

**Business verdict:** Partial

## 4.12 Notification

**Current support:** templates, preferences, notifications, recipients, deliveries

| Check                | Finding                                                                                                               | Severity   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------- |
| Missing Entity       | Event routing rule, subscription, escalation policy และ template approval history ไม่มี                               | P1         |
| Missing Relationship | Event type เป็นค่าใน notification แต่ยังไม่มี approved event contract/routing relation                                | P1         |
| Missing Event        | `notification.requested`, `scheduled`, `sent`, `delivered`, `failed`, `retry_scheduled`, `cancelled`, `dead_lettered` | P1         |
| Missing Aggregate    | Notification aggregate มีแล้ว; Routing Policy อาจเป็น versioned config                                                | P1         |
| Missing Audit        | Manual resend/cancel/template publish ต้องมี audit                                                                    | P1         |
| Missing History      | Delivery attempts append-onlyดี; template/preference history ยังไม่ครบ                                                | P1         |
| Missing Permission   | notification.send/cancel/resend/manage_template/view_delivery/manage_preference                                       | P0 catalog |
| Future Scalability   | Monthly delivery partitionดี; ต้องมี dead-letter, provider quota และ fan-out strategy                                 | P1         |

**Business verdict:** Partial — core delivery covered

## 4.13 Approval

**Current support:** ไม่มี Approval Domain; มีเพียง field เช่น `approved_by` บางตารางและ generic audit

| Check                | Finding                                                                                                                     | Severity   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Missing Entity       | Approval policy/version, request, step, decision, delegation, escalation และ event ไม่มี                                    | P0 blocker |
| Missing Relationship | ไม่มี explicit link จาก Case/Payment/Reversal/KPI/Commission/Document/AI ไป Approval Request                                | P0 blocker |
| Missing Event        | `approval.requested`, `step_assigned`, `approved`, `rejected`, `returned`, `delegated`, `expired`, `escalated`, `cancelled` | P0 blocker |
| Missing Aggregate    | ApprovalRequest aggregate ไม่มี                                                                                             | P0 blocker |
| Missing Audit        | Decision ต้อง immutable พร้อม actor, role, reason, timestamp, before/after และ separation-of-duties evidence                | P0 blocker |
| Missing History      | ไม่มี step/decision/delegation history                                                                                      | P0 blocker |
| Missing Permission   | approval.request/approve/reject/return/delegate/admin/view                                                                  | P0 blocker |
| Future Scalability   | ต้องรองรับ parallel/sequential steps, quorum, timeout, delegation และ partition/archive                                     | P1         |

**Business verdict:** Missing — must design before Database Gate

## 4.14 Timeline

**Current support:** `recovery.case_timeline_events`, generic outbox/audit

| Check                | Finding                                                                                            | Severity         |
| -------------------- | -------------------------------------------------------------------------------------------------- | ---------------- |
| Missing Entity       | ไม่มี event contract/catalog, redaction record และ visibility policy/version                       | P1               |
| Missing Relationship | source_type/source_id เป็น generic reference ไม่มี FK; ต้องกำหนด source contract และ orphan policy | P1               |
| Missing Event        | Timeline ต้องรับ event จาก assignment/visit/GPS/PTP/payment/document/approval/AI/notification/case | P0 event catalog |
| Missing Aggregate    | Timeline เป็น projection ถูกต้อง ไม่ควรเป็น source aggregate                                       | Pass             |
| Missing Audit        | Redact/hide/correct timeline ต้อง audit และห้ามแก้ source event                                    | P1               |
| Missing History      | Timeline append-onlyดี; projection rebuild/version checkpoint ยังไม่มี                             | P1               |
| Missing Permission   | timeline.view_internal/view_sensitive/redact/export                                                | P0 catalog       |
| Future Scalability   | Monthly partitionดี; ต้องมี correlation_id, causation_id, idempotency_key และ rebuild watermark    | P1               |

**Business verdict:** Partial

## 4.15 AI

**Current support:** ไม่มี AI Domain

| Check                | Finding                                                                                                                              | Severity   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| Missing Entity       | Model registry/version, prompt version, AI request, input reference, result/recommendation, human review, feedback, usage/cost ไม่มี | P0 blocker |
| Missing Relationship | AI outputไม่เชื่อม Case/Customer/Assignment/Visit/Document และ approval/human reviewer                                               | P0 blocker |
| Missing Event        | `ai.requested`, `completed`, `failed`, `reviewed`, `accepted`, `rejected`, `overridden`, `feedback_recorded`                         | P0 blocker |
| Missing Aggregate    | AIRequest/Recommendation aggregate ไม่มี                                                                                             | P0 blocker |
| Missing Audit        | ต้องเก็บ model/prompt version, input/output hash, confidence, actor, reason และ human decision; ห้ามเก็บ chain-of-thought            | P0 blocker |
| Missing History      | ไม่มี model/prompt/result/review history                                                                                             | P0 blocker |
| Missing Permission   | ai.invoke/review/accept/admin/view_sensitive/use_customer_data                                                                       | P0 blocker |
| Future Scalability   | ต้อง partition request/result, retention by sensitivity, cost quota, async batch และ model deprecation                               | P1         |

**Business verdict:** Missing — must design before Database Gate if AI is in scope

## 4.16 Report

**Current support:** KPI period results มีข้อมูลสรุปบางส่วน แต่ไม่มี Reporting Domain

| Check                | Finding                                                                                                       | Severity   |
| -------------------- | ------------------------------------------------------------------------------------------------------------- | ---------- |
| Missing Entity       | Report definition/version, run, export, subscription, metric snapshot และ data lineage ไม่มี                  | P0 blocker |
| Missing Relationship | ไม่มี report→partner/owner/permission/snapshot/export/storage link                                            | P0 blocker |
| Missing Event        | `report.requested`, `started`, `generated`, `failed`, `exported`, `subscription_triggered`, `expired`         | P0 blocker |
| Missing Aggregate    | ReportDefinition และ ReportRun aggregates ไม่มี                                                               | P0 blocker |
| Missing Audit        | Export/download/schedule/report-with-PII ต้อง audit                                                           | P0 blocker |
| Missing History      | ไม่มี report definition/filter/version/run/export history                                                     | P0 blocker |
| Missing Permission   | report.view/create/manage/export_sensitive/schedule/admin                                                     | P0 blocker |
| Future Scalability   | ห้าม query 10M casesตรงทุก report; ต้องมี read model/snapshot/materialized view และ future warehouse boundary | P0/P1      |

**Business verdict:** Missing — must design before Database Gate

---

# 5. Missing business event catalog

`platform.outbox_events` และ `case_timeline_events` เป็นที่เก็บ/ส่ง event ได้ แต่ยังไม่มี **approved event contract catalog** ราย Workflow

ขั้นต่ำต้องกำหนดต่อ event:

- event name และ version
- aggregate type/id
- partner_id
- occurred_at
- correlation_id และ causation_id
- idempotency key
- actor/system identity
- payload classification และ schema version
- timeline visibility
- retention class

Event groups ที่ต้องมี:

| Workflow     | Minimum events                                                                     |
| ------------ | ---------------------------------------------------------------------------------- |
| Case         | opened, triaged, status_changed, escalated, closed, reopened                       |
| Partner      | onboarded, activated, suspended, agreement_changed                                 |
| Customer     | created, merged, consent_changed, contact_verified                                 |
| Agent        | activated, availability_changed, team_changed, device_bound                        |
| Assignment   | created, accepted, rejected, reassigned, overdue, completed                        |
| GPS          | tracking_started, location_recorded, anomaly_detected, tracking_stopped            |
| Visit        | scheduled, started, contacted/no_contact, outcome_recorded, ptp_created, completed |
| KPI          | definition_published, target_set, event_recorded, result_finalized                 |
| Commission   | run_started, calculated, approved, adjusted, paid                                  |
| Payment      | received, verified, allocated, reconciled, disputed, reversed                      |
| Document     | uploaded, scan_result, linked, viewed, legal_hold, disposed                        |
| Notification | requested, delivered, failed, retry, dead_lettered                                 |
| Approval     | requested, approved, rejected, delegated, expired, escalated                       |
| Timeline     | projected, redacted, rebuild_completed                                             |
| AI           | requested, completed, reviewed, accepted/rejected, feedback                        |
| Report       | requested, generated, failed, exported, subscription_triggered                     |

---

# 6. Permission validation

Current design มี `iam.permissions`, roles, role_permissions, membership_roles และ branch scopes แต่ยังไม่มี Approved Permission Catalog จึงไม่สามารถพิสูจน์ Separation of Duties ได้

## Required permission families

```text
partner.*
customer.*
case.*
agent.*
assignment.*
gps.*
visit.*
kpi.*
commission.*
payment.*
document.*
notification.*
approval.*
timeline.*
ai.*
report.*
```

## Required scope dimensions

- own user
- own assignment
- own team
- selected branches
- entire partner
- global platform administration
- sensitive-data classification

## Separation-of-duties rules requiring approval

1. ผู้สร้าง Payment/Reversal ไม่ควรอนุมัติรายการเดียวกันเอง
2. ผู้สร้าง Commission Run ไม่ควรเป็นผู้ Finalize/Approve คนเดียวกัน
3. Agent ไม่ควรแก้ KPI/Commission result ของตนเอง
4. ผู้ Upload Document ไม่ควรเปลี่ยน Scan Result หรือ Legal Hold เอง
5. AI recommendation ห้ามเปลี่ยน Case/Payment/Commission โดยไม่มี Human Permission/Approval ตาม policy
6. Report export ที่มี PII/GPS ต้องใช้สิทธิ์แยกจาก report view

---

# 7. Candidate model additions — validation only

รายการนี้เป็น Candidate สำหรับ Stage 2.6/Database Design Revision ยังไม่ได้เพิ่มเข้า 67-table catalog

## P0 — required before Physical Schema

### Workflow/Approval

- approval policies and versions
- approval requests
- approval steps
- immutable decisions
- delegation/escalation history
- explicit subject links for payment, commission, case, document and AI

### Field Operations

- tracking sessions and agent devices
- location consent/legal basis and anomaly records
- visit checklists/contact attempts
- Promise-to-Pay aggregate and status history
- assignment handoff/reassignment lineage

### Finance/Performance

- reconciliation items linked to payment
- payment provider transactions/methods
- commission payouts and payout history
- approval links for reversal, reconciliation, KPI finalization and commission finalization

### AI

- model/prompt versions
- request/input references/result
- human review/decision/feedback
- sensitivity, usage and cost metadata

### Reporting

- report definitions/versions
- report runs/exports/subscriptions
- metric snapshots/read models
- data lineage and sensitive-export audit

### Permission/Event Governance

- approved permission catalog and role matrix
- versioned business event contract catalog

## P1 — important before Production

- partner agreement/SLA/contact/status history
- customer consent/relationship/merge history
- agent skills/availability/status history
- case SLA/escalation/related-case model
- document scan/legal hold/access/disposition
- notification routing/subscription/template approval
- timeline correlation/causation/visibility/redaction/rebuild

## Conditional decision

ถ้า PAYSAVE Recover ทรัพย์สินจริง เช่น รถหรืออุปกรณ์ ต้องเพิ่ม:

- Asset/Collateral aggregate
- Asset ownership/identifier/location
- Case-asset relation
- Inspection/condition history
- Custody/possession/handover chain
- Recovery/disposition status and evidence

ถ้าเป็น Debt/Payment Recovery เท่านั้น ไม่ควรเพิ่ม Asset Domain

---

# 8. Priority and gate decision

## P0 blockers

1. Approval Domain missing
2. AI Domain missingตาม workflow ที่ร้องขอ
3. Reporting Domain missing
4. Visit/Field Recovery ไม่มี Promise-to-Pay และ Contact Attempt
5. GPS ไม่มี Tracking Session/Device/Privacy Governance
6. Payment Reconciliation Batch ไม่มี Reconciliation Item
7. Commission ไม่มี Payout lifecycle
8. Permission Catalog/Role Matrix ยังไม่อนุมัติ
9. Business Event Catalog ยังไม่กำหนด
10. Approved real BPMN/SOP และ Status Transition Matrix ยังไม่มี

## P0 severity rationale

| P0 gap                 | เหตุผลที่ Block Database Gate                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Approval               | ไม่สามารถบังคับ maker-checker, separation of duties, delegation หรือพิสูจน์ decision trail ได้                               |
| AI                     | ไม่มี model/prompt/input/output/human-review lineage ทำให้ไม่สามารถกำกับ recommendation ที่กระทบลูกค้า/เคสได้                |
| Report                 | ไม่มี resource permission, data lineage และ export audit; การ query OLTP 10M cases โดยตรงเสี่ยงทั้งข้อมูลรั่วและ performance |
| Payment reconciliation | Batch ที่ไม่มี item link ไม่สามารถพิสูจน์ว่า Payment ใด matched/unmatched/exception ได้                                      |
| Visit/PTP              | ไม่สามารถติดตามคำมั่นชำระ, due date, fulfillment หรือ breach ซึ่งเป็นผลลัพธ์หลักของ Field Recovery                           |
| GPS tracking session   | ไม่สามารถกำหนดช่วงติดตาม, device, consent/legal basis หรือหยุด tracking อย่างตรวจสอบย้อนหลังได้                              |
| Commission payout      | ไม่สามารถแยก calculated → approved → payable → paid และป้องกันจ่ายซ้ำได้                                                     |
| Permission catalog     | มี RBAC structure แต่ยังพิสูจน์ least privilege, branch scope และ separation of duties ราย workflow ไม่ได้                   |
| Event catalog          | Outbox/Timeline มี storage แต่ยังไม่มี event contract/version/idempotency ที่ทำให้ทุก workflow เชื่อมกันอย่าง deterministic  |

## Implementation-state gate

Migration `0001/0002` รุ่น v1.1 เป็น **Superseded / Frozen** และไม่ใช่ implementation ของ Logical Design v2.0 เนื่องจาก key strategy ไม่ตรงกัน จึงห้ามใช้ migration เดิมเพื่ออ้างว่าช่องว่าง Stage 2.5 ถูก implement แล้ว และยังห้ามสร้าง migration v2.0 จนกว่า Business Validation, Database Design Revision และ Database Gate จะผ่าน

## P1 gaps

- Partner agreement/SLA/history
- Customer consent/merge/history
- Agent availability/skill/device history
- Assignment handoff/escalation
- Document scan/legal hold/disposition
- Notification routing/subscription
- Timeline visibility/correlation/rebuild

## Gate verdict

```text
Historical Stage 2.5 verdict at review date: FAILED — remediation required
Historical ADR-0002 state at review date: Proposed
Historical Physical Schema/DDL state: BLOCKED
Current closure: P0 gaps remediated in v2.1; Database Gate and ADR-0002 accepted 2026-07-21
```

Failure ในที่นี้หมายถึง **พบช่องว่างที่ต้องออกแบบเพิ่ม** ไม่ได้หมายความว่า 67-table design เดิมผิดทั้งหมด Core design เดิมยังใช้เป็นฐานได้ แต่ต้อง Revision หลัง Business Decisions ได้รับอนุมัติ

---

# 9. Business decisions required

- [ ] PAYSAVE เป็น Debt Recovery, Asset Recovery หรือรองรับทั้งสองแบบ
- [ ] ยืนยัน Case statuses และ allowed transitions
- [ ] ยืนยัน Assignment accept/reject/reassign/escalate rules
- [ ] ยืนยัน Visit outcomes, Contact Attempt และ Promise-to-Pay lifecycle
- [ ] ยืนยัน GPS consent, tracking hours, device policy และ retention
- [ ] ยืนยัน Payment verification, reconciliation, dispute และ reversal approval
- [ ] ยืนยัน KPI target/result finalization และ reopen policy
- [ ] ยืนยัน Commission review/approval/payout process
- [ ] ยืนยัน Approval workflows, quorum, delegation และ separation of duties
- [ ] ยืนยัน Document scan, legal hold, access และ disposal
- [ ] ยืนยัน Notification routing/escalation/channel policy
- [ ] ยืนยัน Timeline visibility/redaction policy
- [ ] ยืนยัน AI use cases, human-in-the-loop และ prohibited automation
- [ ] ยืนยัน Report catalog, PII export และ schedule/subscription policy
- [ ] ยืนยัน Resource Scope/Role Matrix ต่อ Workflow
- [ ] อนุมัติ Business Event Catalog approach

---

# 10. Recommended next stage

หลังอนุมัติรายงานนี้ ให้ทำ **Stage 2.6 — Logical Database Design Revision** เท่านั้น:

1. ยืนยัน Business Decisions
2. เพิ่มเฉพาะ P0 entities/relationships/events/permissions ที่อนุมัติ
3. ปรับ Domain Model, Aggregate Map, Table Catalog และ ERD
4. ทำ Business Validation ซ้ำ
5. จึงกลับไปขอ Database Gate Approval

ยังไม่ควรสร้าง SQL, API, Frontend หรือ Business Logic ใน Stage 2.5/2.6
