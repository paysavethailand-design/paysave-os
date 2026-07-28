# docs

Enterprise documentation and decision records.

- `architecture/` — system context, containers, modules, data flow, and scalability design.
- `business-architecture/` — workflow coverage, capability gaps, business events, permissions, and stage validation reports.
- `adr/` — Architecture Decision Records with context, decision, and consequences.
- `api/` — internal API, partner API, webhook, and event contracts.
- `backend/` — backend sprint delivery reports, verified test evidence, limitations, and approval gates.
- `database/` — ERD, data dictionary, indexing, partitioning, and retention design.
- `security/` — threat models, RBAC/ABAC, RLS, PII, and incident controls.
- `deployment/` — environments, CI/CD, migrations, rollback, backup, and disaster recovery.
- `runbooks/` — operational and incident-response procedures.
- `product/` — approved scope, workflows, terminology, and acceptance criteria.
- `plans/` — approval-gated implementation plans with verification steps.
- `standards/` — coding, naming, testing, and review conventions.

Start with `architecture/FOUNDATION_ARCHITECTURE.md` for the Stage 1 boundary map.
The verified current tree is documented in `architecture/ARCHITECTURE_TREE.md`.
The proposed Hostinger, `app.paysave.site`, Supabase, scaling, backup, and production-gate design is documented in `architecture/HOSTING_DATABASE_BLUEPRINT_v1.md`.
Stage 2.6 Logical Database Design v2.1 and ADR-0002 were accepted on 2026-07-21. The canonical artifacts are `database/PAYSAVE_Recovery_Database_Design_v2.1.md`, `database/PAYSAVE_Recovery_ERD_v2.1.mmd`, `database/PAYSAVE_Recovery_ERD_v2.1.svg` and `database/PAYSAVE_Database_Gate_Review_v2.1.md`. Stage 2.7 passed on 2026-07-21; ownership, classification, lifecycle, continuity, performance, capacity, reference-data and dependency contracts are frozen by `architecture/PAYSAVE_Architecture_Freeze_Report_v1.0.md`. Stage 3.0 Physical Blueprint is complete and recorded in `database/PAYSAVE_Engineering_Blueprint_v1.0.md`. Stage 3.1 Physical Schema Specification in `database/PAYSAVE_Physical_Schema_Specification_v1.0.md` was accepted by the Decision Owner on 2026-07-21. Stage 3.2 executable PostgreSQL migrations Batch #1–#5 are approved as implementation contracts. Backend Sprint #1 Code Gate passed on 2026-07-22; Live Staging Database Integration and deployment remain separate pending gates. Version 2.0 remains the superseded 67-table baseline for traceability.
Stage 2.5 business validation is documented in `business-architecture/PAYSAVE_Business_Architecture_Validation_v1.0.md`.
The initial Stage 3.3 report records the pre-Batch #1 state. Overall 161-table verification remains blocked until later approved batches exist; RFC-0007 remains the full-program prerequisite record. No deployment was performed.
Migration Batches #1–#5 are approved as Backend Sprint #1 contracts. Migration Batch #5 implements and verifies M014–M016 only; see `database/PAYSAVE_Migration_Batch_5_Report_v1.0.md`. Approval is not evidence that migrations were executed in a live Staging or Production environment. Migration Batch #6 was stopped before implementation after a mechanical 161-table catalog diff found 25 omitted prior-contract tables and additional FK/cost/seed/security blockers; see `database/PAYSAVE_Migration_Batch_6_CTO_Final_Gate_Blocker_Report_v1.0.md`. M017–M020 were not created. Backend Sprint #1 results are recorded in `backend/BACKEND_SPRINT_1_REPORT_v1.0.md` and `backend/BACKEND_SPRINT_1_TEST_REPORT_v1.0.md`.
