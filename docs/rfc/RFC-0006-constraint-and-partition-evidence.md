# RFC-0006 — Constraint Corrections and Partition Evidence

- **Status:** OPEN — BLOCKS final Stage 3.2 DDL generation
- **Logical impact:** None

## Deterministic constraint gaps

1. `workforce.field_location_events.accuracy_meters` is physically described with a `0..1` score/confidence constraint. Accuracy in meters is not a normalized score and valid readings commonly exceed 1 meter. Proposed correction: non-negative `numeric(7,4)` with a separately approved operational upper bound, if any.
2. `ai.feedback.rating` says “approved bounded scale” but no approved rating range is recorded. A check constraint cannot be generated without inventing a business rule.
3. Four nullable GPS ciphertext columns have NOT NULL key-version companions. Approve either paired nullability with an iff check or require location ciphertext for every location row/address where applicable.
4. `audit.entity_history` references nonexistent `changed_at` in its P02 key/index contract; RFC-0001 proposes `occurred_at`.

## Performance evidence gap

Architecture Freeze v1.0 requires representative benchmark evidence before locking physical partition choices. No benchmark artifact exists under `docs/`. Required evidence: projected 12/36-month volume, top-tenant skew, sustained/peak writes, index size, partition-pruning plans, retention detach test and restore sample.

## Required approval

Principal PostgreSQL Engineer, AI owner, Workforce/GPS owner and Architecture Decision Owner must approve the corrected checks and benchmark evidence before migrations are generated.
