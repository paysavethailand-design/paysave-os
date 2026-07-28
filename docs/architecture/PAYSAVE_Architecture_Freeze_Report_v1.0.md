# PAYSAVE OS — Architecture Freeze Report v1.0

> **Stage:** 2.7 — Architecture Freeze  
> **Status:** Accepted — Logical Architecture Frozen 2026-07-21  
> **Prepared by:** Enterprise Chief Architect  
> **Freeze date:** 2026-07-21  
> **Database Gate:** v2.1 Approved by Decision Owner  
> **Scope:** Logical Architecture and governance contracts only  
> **Prohibited:** SQL, DDL, Migration, API, Frontend and Business Logic

## 1. Executive decision

Database Gate v2.1 is accepted. This report freezes ownership, information governance, lifecycle, continuity, security, performance, capacity, reference-data and dependency contracts for all 21 logical domains before physical schema work begins.

The freeze fixes logical boundaries and service objectives; it does not claim that runtime controls, provider capacity, restore drills or load tests already exist. Stage 3 may choose physical keys, indexes, partitions and storage details only within these frozen contracts or raise a new ADR.

## 2. Freeze boundary

**Frozen:** 21-domain map, 161-table logical catalog, aggregate ownership, tenant boundary, cross-domain subject identity, versioned control planes, event contracts, classification floors, retention classes, continuity objectives, security boundaries, performance budgets, capacity bands, naming rules and allowed dependency directions.

**Not frozen here:** physical PostgreSQL data types beyond accepted logical semantics, exact index/constraint syntax, partition count, provider tier, query plans, deployment topology, runtime policy implementation and application contracts.

### Authoritative inputs

- `../database/PAYSAVE_Recovery_Database_Design_v2.1.md` — accepted 21-domain/161-table Logical Design
- `../database/PAYSAVE_Recovery_ERD_v2.1.mmd` — accepted detailed relationship source
- `../database/PAYSAVE_Database_Gate_Review_v2.1.md` — accepted Database Gate evidence
- `../adr/0002-postgresql-multitenant-database-design.md` — accepted tenant and integrity decision
- `HOSTING_DATABASE_BLUEPRINT_v1.md` — continuity, security and capacity targets adopted here; its overall hosting/production state remains Draft until operational gates pass
- `../standards/NAMING_CONVENTIONS.md` — naming authority

## 3. Frozen governance classes

### 3.1 Data classification

| Class | Meaning      | Minimum handling                                                                                                                          |
| ----- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| C1    | Public       | Approved public information only                                                                                                          |
| C2    | Internal     | Authenticated workforce; tenant/control-plane scope enforced                                                                              |
| C3    | Confidential | Need-to-know, tenant/branch/team scope, export audited                                                                                    |
| C4    | Restricted   | Financial, legal, security, precise location, evidence or high-impact decision data; least privilege, encryption and sensitive-read audit |

### 3.2 PII classification

| Class | Meaning                                                                                        |
| ----- | ---------------------------------------------------------------------------------------------- |
| P0    | No personal data                                                                               |
| P1    | Indirect/pseudonymous identifiers or actor references                                          |
| P2    | Direct personal/contact/employment data                                                        |
| P3    | Sensitive/high-risk identity, finance, precise location, evidence, decision or behavioral data |

A domain receives the highest class of any record it controls. Field-level classification in Stage 3 may lower access for individual columns but may not downgrade this domain baseline without Architecture and Security approval.

### 3.3 Retention classes

| Class | Frozen policy                                                                                                                                                                                                                                |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RT-01 | Control/knowledge versions: active life plus 7 years after retirement/supersession; personal identity profile is minimized or anonymized 2 years after offboarding when no overriding duty exists, while grant/access evidence follows RT-04 |
| RT-02 | Customer/case/operational record: active relationship/case plus 7 years after closure, then anonymize or dispose when no overriding obligation exists                                                                                        |
| RT-03 | Financial, approval, payout, asset custody and legal evidence: 10 years after settlement, closure or disposition                                                                                                                             |
| RT-04 | Audit/security/access evidence: immutable for 7 years                                                                                                                                                                                        |
| RT-05 | Precise GPS: 90 days hot and no more than 365 days total unless linked to dispute, investigation or legal hold; session/legal-basis evidence 7 years                                                                                         |
| RT-06 | Communication payload: shortest practical period, maximum 180 days by default; delivery metadata 2 years; business evidence inherits its subject policy                                                                                      |
| RT-07 | AI request/input/result/review: 2 years by default; linked case/evidence inherits the longer subject policy; model/prompt governance versions 7 years                                                                                        |
| RT-08 | Report artifact: 1 year by default; financial/legal report inherits RT-03; export/download audit inherits RT-04                                                                                                                              |
| RT-09 | Versioned master/control-plane contract: active life plus 7 years after supersession/retirement                                                                                                                                              |
| RT-10 | Published outbox/idempotency runtime record: 90 days after terminal state; dead-letter evidence 1 year; event contract itself uses RT-09                                                                                                     |

**Mandatory overrides:** legal hold, active dispute, investigation and regulatory preservation suspend deletion. Retention time is measured from the latest applicable closure event. Disposal must be authorized, logged and verifiable. These are enterprise policy baselines; a later Legal decision may extend them but may not shorten Restricted/financial/evidence retention without a new Architecture Decision.

### 3.4 Backup / continuity classes

The PostgreSQL system of record has a frozen **production target of RPO ≤ 5 minutes and RTO ≤ 4 hours**. Domain classes define recovery-validation priority, not separate backup islands.

| Class | Domain recovery objective                                                                                                  |
| ----- | -------------------------------------------------------------------------------------------------------------------------- |
| DR-A  | Restore and validate in the first recovery wave; target service RTO ≤ 4 hours                                              |
| DR-B  | Restore with the same database; validate/release within 8 hours                                                            |
| DR-C  | Rebuildable/derived workload; metadata and lineage restored with the database, derived service may recover within 24 hours |

Private object storage must be recoverable consistently with document/report/AI metadata. DR-A evidence objects inherit RPO ≤ 5 minutes and RTO ≤ 4 hours; rebuildable DR-C artifacts may recover within 24 hours. Recovery must detect and reconcile orphaned metadata or objects.

The minimum backup policy is PITR with a recovery window of at least 7 days, protected daily restore points retained 35 days and monthly restore points retained 12 months. Business-record retention is satisfied by governed primary/archive records, not by keeping expired backups indefinitely. Restore drills are quarterly; a backup not proven by restore is not accepted as operational evidence. Provider tier, storage versioning and restore automation are Stage 3/operations obligations; a provider that cannot meet these targets is not eligible for Production.

### 3.5 Performance budgets

Budgets are database contribution targets under representative staging load; they are not production claims.

| Class | Budget                                                                                                                                  |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------- |
| PB1   | Critical OLTP: point read p95 ≤ 100 ms; transactional commit p95 ≤ 250 ms                                                               |
| PB2   | Operational query: bounded list/read p95 ≤ 300 ms; mutation p95 ≤ 500 ms                                                                |
| PB3   | Control/reference: lookup p95 ≤ 100 ms cached or ≤ 250 ms database; publish transaction p95 ≤ 1 s                                       |
| PB4   | High-volume append: append p95 ≤ 200 ms; bounded range query p95 ≤ 500 ms                                                               |
| PB5   | Async/analytical: metadata/job acknowledgement p95 ≤ 1 s; generation/inference is asynchronous and may not full-scan OLTP synchronously |

### 3.6 Capacity bands

| Band | Planning envelope                                   | Required treatment                                                                                                    |
| ---- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| CP1  | Below 1 million active/control rows                 | Non-partitioned by default; cache immutable published versions where useful                                           |
| CP2  | 1–10 million rows                                   | Indexed/keyset access and monthly growth forecast                                                                     |
| CP3  | 10–100 million rows                                 | Benchmark partition alternatives, tenant-skew test, archive forecast and 30% free-capacity alert                      |
| CP4  | Above 100 million facts or high object/event volume | Append-optimized path, lifecycle archive, object storage where applicable, per-partner skew and write-rate monitoring |

These bands are planning envelopes, not promises. Stage 3 must benchmark representative cardinality, top-tenant skew, write bursts, index size, connection pool and restore duration before locking any physical partition choice.

For CP3/CP4 domains, Stage 3 must record 12- and 36-month row/object/byte forecasts, top-tenant share, sustained/peak write rate and archive volume, then test at least twice the projected peak. Capacity action begins at 70% consumed capacity; crossing 80% without an approved scale or archive action is a release blocker. The accepted 10,000-user/10-million-case objective remains a design target until this evidence exists.

## 4. Domain governance matrix A — Ownership and classification

**Accountability:** Domain Ownership defines the authoritative business boundary. Business Owner approves meaning, purpose, lifecycle, retention and reference values. Technical Owner protects the logical contract, integrity, security and performance budget. Named assignees are maintained operationally; the role remains accountable through personnel changes.

| ID  | Domain / schema                                | Domain ownership                                                         | Business Owner                                       | Technical Owner                          | Data Classification | PII Classification |
| --- | ---------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------- | ---------------------------------------- | ------------------- | ------------------ |
| D01 | Tenant/Partner (`tenant`)                      | Tenant identity, settings and branch boundary                            | Partner Governance Director                          | Tenant Platform Lead                     | C3                  | P2                 |
| D02 | Identity & Access (`iam`)                      | Identity, membership, role, permission scope and SoD                     | Chief Information Security Officer                   | Identity & Security Platform Lead        | C4                  | P3                 |
| D03 | Customer (`crm`)                               | Customer identity/contact golden operational record                      | Customer Operations Director / Data Protection Owner | CRM Domain Lead                          | C4                  | P3                 |
| D04 | Recovery Case & Contract (`recovery`)          | Contract, case and recovery lifecycle                                    | Head of Recovery Operations                          | Recovery Domain Lead                     | C4                  | P3                 |
| D05 | Workforce & Field Operations (`workforce`)     | Agent, assignment, field visit, tracking and PTP                         | Field Operations Director                            | Workforce Domain Lead                    | C4                  | P3                 |
| D06 | Payment & Reconciliation (`finance`)           | Payment, allocation, provider reconciliation and dispute                 | Chief Financial Officer / Finance Operations Owner   | Finance Domain Lead                      | C4                  | P3                 |
| D07 | KPI, Commission & Payout (`performance`)       | KPI, commission, adjustment and payout                                   | People & Performance Director / Compensation Owner   | Performance Domain Lead                  | C4                  | P3                 |
| D08 | Document & Evidence (`document_store`)         | Document metadata, version, scan, evidence link and legal hold           | Legal and Compliance Records Owner                   | Document Platform Lead                   | C4                  | P3                 |
| D09 | Communication Delivery (`communication`)       | Notification recipient and delivery lifecycle                            | Customer Communication Operations Director           | Messaging & Integration Lead             | C4                  | P3                 |
| D10 | Audit, History & Data Access (`audit`)         | Immutable audit, entity history and sensitive access evidence            | Chief Risk and Compliance Officer                    | Security Data & Observability Lead       | C4                  | P3                 |
| D11 | Outbox, Idempotency & Integration (`platform`) | Outbox, idempotency and integration runtime facts                        | Chief Technology Officer / Platform Operations Owner | Platform Engineering Lead                | C4                  | P3                 |
| D12 | Master Data (`master_data`)                    | Versioned enterprise/partner reference catalogs                          | Enterprise Data Governance Council                   | Data Platform Lead                       | C2                  | P1                 |
| D13 | Workflow (`workflow`)                          | Workflow definition, instance and work-item lifecycle                    | Enterprise Process Owner / COO                       | Workflow Platform Lead                   | C4                  | P3                 |
| D14 | Approval & Decision (`approval`)               | Approval policy, request, step, decision and delegation                  | Chief Risk and Control Officer                       | Approval Platform Lead                   | C4                  | P3                 |
| D15 | Service Level Management (`sla`)               | SLA policy, timer, pause, breach and escalation                          | Service Operations Director                          | Reliability Platform Lead                | C3                  | P2                 |
| D16 | Knowledge Management (`knowledge`)             | Knowledge space, article, immutable version and evidence                 | Knowledge Management Director                        | Knowledge Platform Lead                  | C4                  | P3                 |
| D17 | AI Governance & Workload (`ai`)                | AI model/prompt governance, request lineage and HITL                     | AI Governance Council / Chief Risk Officer           | AI/ML Platform Lead                      | C4                  | P3                 |
| D18 | Reporting & Export (`report`)                  | Report definition, run, source, snapshot, artifact and export            | Management Reporting and Data Governance Owner       | Reporting Platform Lead                  | C4                  | P3                 |
| D19 | Recovered Asset (`asset`)                      | Recovered physical asset identity, ownership, inspection and status      | Asset Recovery Director                              | Asset Domain Lead                        | C4                  | P3                 |
| D20 | Physical Custody Warehouse (`warehouse`)       | Facility, receipt, position, movement, handover and disposition custody  | Custody and Warehouse Operations Director            | Warehouse Domain Lead                    | C4                  | P3                 |
| D21 | Enterprise Event Catalog (`event_catalog`)     | Versioned event/schema, publisher, subscriber and compatibility contract | Enterprise Architecture Review Board                 | Enterprise Integration Architecture Lead | C2                  | P1                 |

## 5. Domain governance matrix B — Lifecycle, retention, continuity and security

| ID  | Data Lifecycle                                                                                                                                | Retention Policy                                               | Backup / RPO / RTO                   | Security boundary                                                                                                                                                    |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D01 | Partner onboarded → configured → active/suspended → retired; branch history retained                                                          | RT-01                                                          | DR-A                                 | Global administration plus partner boundary; branch change requires privileged audit                                                                                 |
| D02 | User created → membership/role/scope granted → reviewed → revoked; decisions immutable                                                        | RT-01 + RT-04                                                  | DR-A                                 | Global identity separated from partner membership; MFA for privileged roles; least privilege, SoD and grant/revoke audit                                             |
| D03 | Customer identified → verified/updated → related cases active → relationship ended → restricted/anonymized when eligible                      | RT-02                                                          | DR-A                                 | Partner + branch/case purpose; restricted sensitive read/export; deterministic protected lookup for exact identifiers                                                |
| D04 | Contract/case intake → assignment/work → resolution/closure → reopen only by governed transition → archive                                    | RT-02; financial/legal evidence RT-03                          | DR-A                                 | Partner + branch + assignment; governed state transitions; closure/reopen and sensitive notes audited                                                                |
| D05 | Agent activated → assigned → visit/tracking/PTP → handoff/completion → evidence retention; precise GPS expires early                          | RT-02 + RT-05                                                  | DR-A                                 | Partner + supervisor/assignment; tracking requires active session, registered device and legal basis; export separate permission                                     |
| D06 | Payment initiated → provider fact → allocation → reconciliation/dispute/reversal → settled/closed; originals never overwritten                | RT-03                                                          | DR-A                                 | Partner + finance role; maker-checker for settlement/reversal/dispute; immutable originals and amount/currency controls                                              |
| D07 | Definition versioned → target/event/result → commission run → adjustment/approval → payout/closure                                            | RT-03                                                          | DR-B                                 | Partner + management/compensation scope; formula version immutable; maker-checker for adjustments and payout                                                         |
| D08 | Upload/quarantine → scan/classify → available/restricted → linked evidence → legal hold or expiry → verified disposal                         | Inherited subject retention; RT-03/RT-04; legal hold overrides | DR-A + object-store consistency      | Partner-prefixed private storage; short-lived access; scan quarantine; legal hold; sensitive download audited                                                        |
| D09 | Notification requested → recipient resolved → queued/sent/retried/dead-lettered → payload minimized/expired                                   | RT-06                                                          | DR-B                                 | Partner + consent/purpose/channel; payload inherits source classification, is minimized and protected; retry does not bypass policy                                  |
| D10 | Append-only event captured → protected → reviewed/exported by authority → archived → disposed only after policy/hold                          | RT-04                                                          | DR-A                                 | Append-only write path; compliance/security read only; no source cascade; tamper-evident evidence and export audit                                                   |
| D11 | Command key/outbox fact created → published/retried → acknowledged/dead-lettered → operational expiry                                         | RT-10                                                          | DR-B                                 | Server-only integration boundary; payload inherits source classification and must be minimized/encrypted; signed/idempotent commands and producer/consumer allowlist |
| D12 | Catalog drafted → reviewed → published immutable → superseded/retired; mappings versioned                                                     | RT-09                                                          | DR-B                                 | Global or partner owner; draft/publish maker-checker; published versions immutable; global review separate from tenant approval                                      |
| D13 | Definition drafted/versioned/published → instance started → work items/transitions → completed/cancelled; history append-only                 | RT-09 for definitions; subject retention for instances         | DR-A                                 | Partner + subject scope; task data inherits subject classification and avoids copied PII; privileged override/cancel audited; no direct cross-domain state write     |
| D14 | Policy versioned/published → request/steps → decisions/delegation/escalation → approved/rejected/expired; evidence immutable                  | RT-03/RT-04; inherits subject when longer                      | DR-A                                 | Partner + subject scope; maker-checker/quorum/SoD; self-approval prohibited; delegation bounded and auditable                                                        |
| D15 | Policy published → timer started → pause/resume → met/breached/escalated → closed; clock reconstruction retained                              | RT-09 for policies; subject retention for instances            | DR-B                                 | Partner + subject/team/branch; manual pause/override separate permission and reason; escalation auditable                                                            |
| D16 | Space/article drafted → version reviewed/published immutable → cited/used → superseded/retired                                                | RT-01; linked evidence inherits subject retention              | DR-B                                 | Partner + space/classification; publish/retire controlled; restricted content read audited; evidence links resolvable                                                |
| D17 | Model/prompt approved and versioned → request/input/result → human review/override/feedback → expiry; no autonomous approval                  | RT-07                                                          | DR-C; lineage/control versions DR-B  | Global model governance separated from partner workload; input/output class enforced; HITL required; no autonomous approval                                          |
| D18 | Definition versioned → run/source snapshot → artifact/export → expiry; sensitive download audited                                             | RT-08                                                          | DR-C; financial/legal artifacts DR-A | Partner + owner/team/branch/classification; export/download separate permission; snapshot lineage and redaction required                                             |
| D19 | Asset registered/identified → ownership/case linked → inspected/recovered → custody transferred → disposed/returned; evidence reconstructable | RT-03                                                          | DR-A                                 | Partner + case/branch; protected identifiers; custody/status changes approved and evidenced                                                                          |
| D20 | Facility/bin active → receipt → placement/movement/handover → disposition authorization → release/closure; movement immutable                 | RT-03                                                          | DR-A                                 | Partner + facility/branch; facility-scoped access; movement append-only; handover/disposition maker-checker                                                          |
| D21 | Definition/schema drafted → compatibility review → published immutable → producer/subscriber bound → deprecated/retired                       | RT-09                                                          | DR-B                                 | Global control plane with optional partner binding; compatibility review required; published schemas immutable; publisher allowlist                                  |

## 6. Domain governance matrix C — Performance, capacity, reference data and naming

| ID  | Performance Budget | Capacity Planning | Reference Data                                                                | Naming Standard Compliance                                                                          |
| --- | ------------------ | ----------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| D01 | PB1                | CP1               | country, timezone, currency, branch type                                      | PASS — `tenant` and catalog objects use approved snake_case/plural/FK/timestamp conventions         |
| D02 | PB1                | CP2               | permission codes, role types, scope types, SoD rule types                     | PASS — `iam` and catalog objects use approved snake_case/plural/FK/timestamp conventions            |
| D03 | PB1                | CP3               | customer type, identifier type, contact type, consent/legal-basis type        | PASS — `crm` and catalog objects use approved snake_case/plural/FK/timestamp conventions            |
| D04 | PB1                | CP4               | case/contract status, reason, outcome, closure type                           | PASS — `recovery` and catalog objects use approved snake_case/plural/FK/timestamp conventions       |
| D05 | PB2/PB4            | CP4               | assignment/visit/PTP status, checklist, device, geofence and outcome codes    | PASS — `workforce` and catalog objects use approved snake_case/plural/FK/timestamp conventions      |
| D06 | PB1/PB4            | CP4               | currency, payment method/status, provider, reconciliation/dispute codes       | PASS — `finance` and catalog objects use approved snake_case/plural/FK/timestamp conventions        |
| D07 | PB2/PB4            | CP3               | KPI/commission type, payout status, adjustment reason                         | PASS — `performance` and catalog objects use approved snake_case/plural/FK/timestamp conventions    |
| D08 | PB2                | CP4               | document/evidence type, classification, MIME policy, scan status, hold reason | PASS — `document_store` and catalog objects use approved snake_case/plural/FK/timestamp conventions |
| D09 | PB4                | CP4               | channel, template, delivery/failure/consent codes                             | PASS — `communication` and catalog objects use approved snake_case/plural/FK/timestamp conventions  |
| D10 | PB4                | CP4               | audit action, access reason, severity, retention class                        | PASS — `audit` and catalog objects use approved snake_case/plural/FK/timestamp conventions          |
| D11 | PB4                | CP4               | integration, delivery, idempotency and error category codes                   | PASS — `platform` and catalog objects use approved snake_case/plural/FK/timestamp conventions       |
| D12 | PB3                | CP1               | canonical enterprise reference catalogs and external mappings                 | PASS — `master_data` and catalog objects use approved snake_case/plural/FK/timestamp conventions    |
| D13 | PB2/PB4            | CP4               | definition/state/transition/action/assignment codes                           | PASS — `workflow` and catalog objects use approved snake_case/plural/FK/timestamp conventions       |
| D14 | PB1/PB4            | CP3               | decision, quorum, escalation, delegation and rejection reason codes           | PASS — `approval` and catalog objects use approved snake_case/plural/FK/timestamp conventions       |
| D15 | PB2/PB4            | CP3               | service calendar, target, clock, pause and breach severity codes              | PASS — `sla` and catalog objects use approved snake_case/plural/FK/timestamp conventions            |
| D16 | PB3                | CP2               | space, tag, content classification, authoritative-source type                 | PASS — `knowledge` and catalog objects use approved snake_case/plural/FK/timestamp conventions      |
| D17 | PB5                | CP3               | model/provider/capability/risk class, prompt purpose, review outcome          | PASS — `ai` and catalog objects use approved snake_case/plural/FK/timestamp conventions             |
| D18 | PB5                | CP3               | report/output/schedule/classification/redaction codes                         | PASS — `report` and catalog objects use approved snake_case/plural/FK/timestamp conventions         |
| D19 | PB1/PB4            | CP3               | asset type, identifier, condition, status, ownership and disposition codes    | PASS — `asset` and catalog objects use approved snake_case/plural/FK/timestamp conventions          |
| D20 | PB1/PB4            | CP3               | facility/zone/bin, movement, handover, position and disposition codes         | PASS — `warehouse` and catalog objects use approved snake_case/plural/FK/timestamp conventions      |
| D21 | PB3                | CP1               | event name/version, schema, publisher, subscriber and compatibility status    | PASS — `event_catalog` and catalog objects use approved snake_case/plural/FK/timestamp conventions  |

## 7. Reference Data governance

1. Each Domain Business Owner owns **meaning, allowed values, lifecycle and effective date** of its reference data.
2. Master Data owns the shared publication/version/localization/external-mapping mechanism; it does not own another domain’s semantics.
3. Published versions are immutable. Consumers pin a version or effective-date resolution rule; silent overwrite is prohibited.
4. Domain-local lifecycle states remain in the owning versioned definition when they control behavior (Workflow, Approval, SLA, AI, Report, Event Catalog).
5. External provider codes map through versioned mappings; raw external codes may not become ungoverned enterprise truth.
6. Global control-plane publication uses global IAM review/audit. Partner-owned publication uses partner-scoped approval and SoD.

## 8. Naming Standard compliance

- Schemas, tables, columns and logical constraint/index names use `snake_case`.
- Tables use plural nouns; PK is `id`; FK is `<entity>_id`; timestamps use `*_at`; booleans use `is_`/`has_`.
- Domain events use a lowercase dotted namespace with at least two segments and a past-tense event verb at the end, for example `case.opened` or `workflow.instance.completed`; permission codes use `domain.resource.action`.
- Version tables use `*_versions`; append-only histories use `*_history`; typed links state both ends explicitly.
- Mermaid aliases normalize `communication → COMM`, `document_store → DOCUMENT`, `master_data → MASTER_DATA`, and `event_catalog → EVENT_CATALOG`.
- Mechanical catalog review found no duplicate logical table names and no schema/table convention violation in the 161-table catalog.
- Approved grammatical exceptions: `workforce.promises_to_pay` is a plural noun phrase whose final token is infinitive `pay`; `ai.feedback` is an uncountable collective noun. Neither is a singular aggregate-table exception.

## 9. Cross-domain Dependency Matrix

Row = consuming domain; column = providing domain. `F<n>` means the detailed ERD contains _n_ explicit cross-domain logical relationships from the consumer to the provider. `—` means no direct frozen FK dependency.

| Consumer \ Provider | D01 | D02 | D03 | D04 | D05 | D06 | D07 | D08 | D09 | D10 | D11 | D12 | D13 | D14 | D15 | D16 | D17 | D18 | D19 | D20 | D21 |
| ------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| D01                 | ●   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   |
| D02                 | F3  | ●   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   |
| D03                 | F1  | —   | ●   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   |
| D04                 | F2  | —   | F2  | ●   | —   | —   | —   | —   | —   | —   | —   | —   | F1  | —   | —   | —   | —   | —   | —   | —   | F1  |
| D05                 | F2  | F1  | —   | F2  | ●   | —   | —   | —   | —   | —   | —   | —   | F2  | —   | —   | —   | —   | —   | —   | —   | —   |
| D06                 | F1  | —   | F1  | F2  | —   | ●   | —   | —   | —   | —   | —   | F1  | F3  | F2  | —   | —   | —   | —   | —   | —   | —   |
| D07                 | —   | —   | —   | F1  | F3  | —   | ●   | —   | —   | —   | —   | —   | F4  | F4  | —   | —   | —   | —   | —   | —   | —   |
| D08                 | —   | —   | —   | F1  | F1  | F1  | F1  | ●   | —   | —   | —   | —   | F1  | —   | —   | —   | —   | —   | F1  | —   | —   |
| D09                 | —   | F2  | —   | —   | —   | —   | —   | —   | ●   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | F1  |
| D10                 | —   | —   | —   | —   | —   | —   | —   | —   | —   | ●   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   |
| D11                 | F3  | —   | —   | —   | —   | —   | —   | —   | —   | —   | ●   | —   | —   | —   | —   | —   | —   | —   | —   | —   | F1  |
| D12                 | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | ●   | F1  | —   | —   | —   | —   | —   | —   | —   | —   |
| D13                 | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | ●   | —   | —   | —   | —   | —   | —   | —   | —   |
| D14                 | —   | F2  | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | F2  | ●   | —   | —   | —   | —   | —   | —   | —   |
| D15                 | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | F2  | —   | ●   | —   | —   | —   | —   | —   | —   |
| D16                 | —   | —   | —   | —   | —   | —   | —   | F1  | —   | —   | —   | —   | F1  | —   | —   | ●   | —   | —   | —   | —   | —   |
| D17                 | —   | —   | —   | —   | —   | —   | —   | F1  | —   | —   | —   | —   | F3  | —   | —   | F1  | ●   | —   | —   | —   | —   |
| D18                 | —   | —   | —   | —   | —   | —   | —   | F1  | —   | —   | —   | —   | F2  | —   | —   | —   | —   | ●   | —   | —   | —   |
| D19                 | —   | —   | —   | F1  | —   | —   | —   | —   | —   | —   | —   | —   | F1  | —   | —   | —   | —   | —   | ●   | —   | —   |
| D20                 | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | F1  | F1  | —   | —   | —   | —   | F5  | ●   | —   |
| D21                 | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | —   | ●   |

### Mandatory cross-cutting dependency rules

- Business domains publish only events registered in D21 Event Catalog; runtime delivery uses D11 Platform Outbox.
- Security-relevant mutation and sensitive read evidence flows to D10 Audit without granting Audit ownership of source state.
- Shared code values resolve through D12 Master Data or the owning versioned control plane; loose unversioned strings are not enterprise reference data.
- Approval/Workflow/SLA-capable roots bind to D13 `workflow.business_objects`; critical subject links may not use unconstrained `type + id`.
- D08 Document stores evidence metadata/object references; ownership and lifecycle remain with the linked subject domain.
- D18 Report and D17 AI are consumers of authoritative snapshots/references and may not become sources of truth for operational state.

### Direct dependency register

- **D01 tenant:** No direct cross-domain FK provider; cross-cutting event/audit/reference rules still apply.
- **D02 iam:** D01 tenant (F3)
- **D03 crm:** D01 tenant (F1)
- **D04 recovery:** D01 tenant (F2), D03 crm (F2), D13 workflow (F1), D21 event_catalog (F1)
- **D05 workforce:** D01 tenant (F2), D02 iam (F1), D04 recovery (F2), D13 workflow (F2)
- **D06 finance:** D01 tenant (F1), D03 crm (F1), D04 recovery (F2), D12 master_data (F1), D13 workflow (F3), D14 approval (F2)
- **D07 performance:** D04 recovery (F1), D05 workforce (F3), D13 workflow (F4), D14 approval (F4)
- **D08 document_store:** D04 recovery (F1), D05 workforce (F1), D06 finance (F1), D07 performance (F1), D13 workflow (F1), D19 asset (F1)
- **D09 communication:** D02 iam (F2), D21 event_catalog (F1)
- **D10 audit:** No direct cross-domain FK provider; cross-cutting event/audit/reference rules still apply.
- **D11 platform:** D01 tenant (F3), D21 event_catalog (F1)
- **D12 master_data:** D13 workflow (F1)
- **D13 workflow:** No direct cross-domain FK provider; cross-cutting event/audit/reference rules still apply.
- **D14 approval:** D02 iam (F2), D13 workflow (F2)
- **D15 sla:** D13 workflow (F2)
- **D16 knowledge:** D08 document_store (F1), D13 workflow (F1)
- **D17 ai:** D08 document_store (F1), D13 workflow (F3), D16 knowledge (F1)
- **D18 report:** D08 document_store (F1), D13 workflow (F2)
- **D19 asset:** D04 recovery (F1), D13 workflow (F1)
- **D20 warehouse:** D13 workflow (F1), D14 approval (F1), D19 asset (F5)
- **D21 event_catalog:** No direct cross-domain FK provider; cross-cutting event/audit/reference rules still apply.

## 10. Architecture Freeze change control

After acceptance, changes to Domain ownership, classification floor, retention class, RPO/RTO, security boundary, aggregate ownership, cross-domain dependency direction or reference-data authority require a new ADR and Architecture Review. Stage 3 may elaborate physical implementation but may not contradict this report.

Role-based owners are frozen because people may change. Named assignees must be maintained in the operational RACI/on-call register before production; reassignment does not alter the architecture contract.

## 11. Stage 3 entry obligations

- Produce physical schema design mapped one-to-one to the 161-table logical catalog.
- Demonstrate tenant-aware integrity, access isolation, encryption and sensitive-read audit controls.
- Prove index/partition choices with representative data, top-tenant skew and query-plan evidence.
- Verify provider backup/PITR tier and complete restore drills against the frozen RPO/RTO.
- Define deletion/archive jobs from the frozen retention classes with legal-hold precedence.
- Reconcile object storage restore/versioning with database metadata.
- Keep legacy v1.1 migrations frozen; no earlier draft becomes active implicitly.

## 12. Mechanical validation evidence

| Check                                                      | Result                                                  |
| ---------------------------------------------------------- | ------------------------------------------------------- |
| Domain IDs in Ownership/Classification matrix              | 21/21, D01–D21 unique                                   |
| Domain IDs in Lifecycle/Retention/DR/Security matrix       | 21/21, same set                                         |
| Domain IDs in Performance/Capacity/Reference/Naming matrix | 21/21, same set                                         |
| Cross-domain matrix                                        | 21 consumers × 21 providers                             |
| Accepted Logical Table Catalog                             | 161 tables                                              |
| Accepted detailed ERD                                      | 161 entities, 217 relationships, 0 undefined references |
| Explicit cross-domain relationship instances               | 78; matrix `F<n>` sum = 78                              |
| Enterprise event codes                                     | 114 unique; lowercase dotted namespace, 2–4 segments    |
| Governance classes                                         | 10 retention, 3 continuity, 5 performance, 4 capacity   |
| Required dimensions                                        | 14/14 present                                           |
| Prohibited executable implementation                       | None                                                    |

## 13. Freeze Review Checklist

- [x] All 21 domains have Domain Ownership, Business Owner and Technical Owner.
- [x] All 21 domains have Data and PII classifications.
- [x] All 21 domains have lifecycle, retention, continuity and security boundaries.
- [x] All 21 domains have performance budget, capacity band, reference data and naming result.
- [x] Cross-domain matrix matches the accepted ERD and contains no undefined domain.
- [x] Database Gate and ADR pointers are updated from Proposed to Accepted.
- [x] No prohibited implementation artifact is present.
- [x] Independent review found no architectural P0 blocker; status/pointer findings were remediated before freeze.

### Independent review record

- Enterprise Architecture review: PASS; 21 domains × 14 dimensions, ownership, reference-data and Stage 3 separation are coherent.
- Security/Privacy/Records/Resilience review: final post-remediation PASS; no logical P0 blocker. Runtime RLS, encryption, restore proof and load evidence remain Stage 3/Production gates.
- Artifact Consistency review: final post-remediation PASS; 21/21 domain IDs, 14/14 dimensions, 78/78 cross-domain relationships and authoritative status pointers reconcile.
- Post-remediation mechanical validation: PASS — 161 tables/entities, 217 ERD relationships, 0 undefined references and 114 unique event codes.

```text
Architecture Freeze Report v1.0: PASSED — ACCEPTED 2026-07-21
Logical Architecture: FROZEN
Stage 3 Physical Schema: AUTHORIZED
Executable migration/deployment: BLOCKED until Stage 3 design and verification gates pass
```
