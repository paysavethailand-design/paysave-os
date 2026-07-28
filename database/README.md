# database

Owns version-controlled PostgreSQL and Supabase assets.

- `migrations/` — ordered, reviewable schema changes.
- `schemas/` — domain schema definitions and ownership documentation.
- `functions/` — reviewed PostgreSQL functions and RPC definitions.
- `policies/` — Row Level Security policies kept separate for security review.
- `seeds/` — deterministic non-production reference data.
- `fixtures/` — synthetic test data only; never production PII.
- `tests/` — constraints, migrations, functions, tenant isolation, and RLS tests.

Database changes must be migration-driven and tested in staging before production.

## Architecture Freeze safety gate

- Accepted Logical Design: `../docs/database/PAYSAVE_Recovery_Database_Design_v2.1.md`.
- Accepted Database Gate: `../docs/database/PAYSAVE_Database_Gate_Review_v2.1.md`.
- Accepted Stage 2.7 governance/freeze: `../docs/architecture/PAYSAVE_Architecture_Freeze_Report_v1.0.md`.
- `migrations/0001_*` and `0002_*` are frozen legacy drafts from v1.1. They are not the v2.1 UUID-primary-key implementation and must not be run on production.
- Architecture Freeze Report v1.0 and Stage 3.1 Physical Schema Specification are accepted. The earlier pre-SQL readiness findings and RFC-0001 through RFC-0006 remain traceable in `../docs/database/PAYSAVE_Physical_Schema_Implementation_Readiness_Report_v1.0.md`; the Decision Owner subsequently authorized controlled Database Engineering Sprint batches. Existing v1.1 drafts never become the v2.1 implementation implicitly; API, Backend, Frontend and deployment remain blocked.
- The initial Stage 3.3 report in `../docs/database/PAYSAVE_Database_Verification_Report_v1.0.md` records the pre-Batch #1 state. Overall 161-table verification remains blocked until later approved batches exist; Batch #1 has its own executed verification report below.
- Migration Batches #1–#5 are approved as implementation contracts. M001–M016 represent 114 logical-root tables (16 + 14 + 37 + 32 + 15); the full 161-table Logical Design includes 47 tables that do not yet have authorized M017+ migrations.
- Local PostgreSQL 17 is available on this Mac through `docker/postgres.local.yml`; operational instructions are in `local/README.md`. M001–M016 and the Backend Sprint #1 permission catalog were applied and replay-verified locally. This is not Production deployment.
