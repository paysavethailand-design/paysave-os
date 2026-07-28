# RFC-0007 — Stage 3.3 Verification Prerequisite: Missing M001–M020

- **Status:** OPEN — BLOCKS Database Verification
- **Scope:** Verification prerequisite only
- **Schema change:** None

## Problem

Stage 3.3 requires execution, replay, rollback, referential-integrity, index, query-plan, RLS, encryption and trigger tests against the Stage 3.2 implementation. The repository currently contains no M001–M020 migration files and no Stage 3.2 rollback/compensation artifacts.

The only SQL files under `database/migrations/` are:

- `0001_paysave_recovery_foundation.sql`
- `0002_authentication_rbac.sql`

`database/README.md` explicitly classifies both as frozen v1.1 legacy drafts that are not the v2.1 UUID-primary-key implementation. Running them would verify the wrong schema and could not provide Stage 3.3 evidence.

## Dependency

M001–M020 generation remains blocked by RFC-0001 through RFC-0006. Those RFCs must be decided first.

## Required remediation

1. Resolve RFC-0001 through RFC-0006.
2. Generate and review M001–M020 plus forward-only rollback/compensation plans.
3. Add Stage 3.2 verification fixtures for FK, index, RLS, encryption-envelope, audit and partition behavior.
4. Re-run Stage 3.3 on disposable PostgreSQL 16 and 17 databases from empty state.
5. Replay all migrations and execute the rollback/compensation drill.

## Acceptance evidence

- all 20 migrations discovered in order
- clean-database apply PASS
- second apply/replay PASS without object drift or data loss
- rollback/compensation PASS
- catalog checks for 161 tables and approved constraints/indexes/policies/triggers
- representative `EXPLAIN (ANALYZE, BUFFERS)` evidence
- positive and negative tenant-isolation tests
- ciphertext/key-version and keyed-lookup tests without plaintext
- audit immutability and updated-at trigger tests

No schema is modified by this RFC.
