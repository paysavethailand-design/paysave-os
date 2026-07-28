# PAYSAVE OS — Stage 3.2 Physical Schema Implementation Readiness Report v1.0

> **Stage:** 3.2 — Physical Schema Implementation preflight  
> **Verdict:** FAIL — SQL generation is blocked  
> **Gate state:** NOT OPENED for acceptance  
> **Decision boundary:** Stage 3.1 approval is recorded; this report does not revoke or rewrite Logical Architecture  
> **Generated SQL:** None  
> **Backend / Frontend / API / Deployment:** None

## 1. Scope verified

- Frozen domains: 21
- Frozen tables: 161 unique tables
- Frozen ERD relationships: 217
- Physical columns in approved Stage 3.1 artifact: 1,832
- Source physical field mappings covered: 1,225 / 1,225
- Per-table RLS requirements present: 161 / 161
- Per-table index contracts present: 161 / 161
- Ciphertext columns: 13; key-version companion structurally present: 13 / 13
- Existing `database/migrations/0001_*` and `0002_*` remain frozen v1.1 drafts and are not used as v2.1 implementation.

## 2. Pre-SQL checks

| Check                    | Result   | Evidence / reason                                                                                                                                                                        |
| ------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Constraint Completeness  | **FAIL** | `accuracy_meters` has an invalid 0..1 score constraint; AI rating scale is not approved; nullable ciphertext/key-version pairing is unresolved; P02 index names nonexistent `changed_at` |
| FK Integrity             | **FAIL** | A required FK targets a P01 partitioned table without carrying the partition key; mixed global/tenant catalog references cannot be enforced by the approved one-pattern composite FK     |
| Index Coverage           | **FAIL** | 161 contracts exist, but `audit.entity_history` P02 key/index references nonexistent `changed_at` instead of `occurred_at`                                                               |
| RLS Coverage             | **FAIL** | Requirements exist for every table, but the v2.1 JWT/session claim, global authority, service bypass and actor-mapping contract is not frozen                                            |
| Encryption Coverage      | **FAIL** | Engineering Blueprint §8.1 requires six owner-approved cryptography decisions before sensitive-column DDL; decision references are absent                                                |
| Performance Risk         | **FAIL** | Required partition benchmark/capacity evidence is absent; no benchmark artifact exists under `docs/`                                                                                     |
| PostgreSQL Best Practice | **FAIL** | PostgreSQL cannot reference `field_location_events.id` uniquely across monthly partitions when the parent key is `(occurred_at,id)`                                                      |

## 3. Blocking findings

### P0-1 — Unenforceable partitioned FK

- Parent: `workforce.field_location_events`, P01, key candidate `(occurred_at,id)`.
- Child: `workforce.location_anomalies.location_event_id` without parent `occurred_at`.
- PostgreSQL requires referenced uniqueness to include the partition key.
- Resolution: RFC-0002.

### P0-2 — Cryptography acceptance packet absent

Engineering Blueprint v1.0 §8.1 explicitly prohibits acceptance of sensitive-column DDL until KMS, cipher-envelope, keyed digest, rotation, emergency access and backup/archive crypto references are owner-approved.

- Resolution: RFC-0003.

### P0-3 — Mixed global/tenant integrity contradiction

`master_data.catalogs` permits a global row (`owner_partner_id IS NULL`) but requires a tenant-owned `workflow.business_objects` reference. Mixed catalog-item references also need a direct FK plus scope-integrity enforcement rather than a single tenant-composite FK.

- Resolution: RFC-0004.

### P0-4 — Runtime RLS/global audit authority undefined

The schema requires fail-closed policies and separately audited global authority, but the authoritative v2.1 claims, roles, bypass and global audit destination are absent. `audit.audit_events.partner_id` cannot represent a global event without violating its NOT NULL contract or using a prohibited sentinel tenant.

- Resolution: RFC-0005.

### P0-5 — Deterministic checks and benchmark evidence incomplete

The current physical constraint text cannot be translated safely for GPS accuracy and AI feedback rating. Partition lock evidence required by Architecture Freeze is also absent.

- Resolution: RFC-0006 and RFC-0001.

## 4. RFC register

| RFC      | Subject                                       | Status         |
| -------- | --------------------------------------------- | -------------- |
| RFC-0001 | P02 entity-history timestamp correction       | OPEN           |
| RFC-0002 | Partition-safe location-event FK              | OPEN — blocker |
| RFC-0003 | Cryptography decision packet                  | OPEN — blocker |
| RFC-0004 | Mixed global/tenant reference integrity       | OPEN — blocker |
| RFC-0005 | RLS identity and global audit contract        | OPEN — blocker |
| RFC-0006 | Constraint corrections and partition evidence | OPEN — blocker |

## 5. Migration disposition

M001–M020 were **not generated** because the mandatory pre-SQL checks did not pass. Generating partial SQL would either omit required FK/RLS/encryption controls or silently alter the approved Physical Specification.

After the Decision Owners resolve RFC-0001 through RFC-0006, rerun the complete preflight. Only a PASS authorizes generation and disposable PostgreSQL execution testing of:

- M001 Foundation through M018 Warehouse
- M019 RLS
- M020 Seed structure
- forward-only rollback/compensation plan
- migration replay/idempotency test
- constraint/FK/RLS/partition/audit verification

## 6. Gate statement

```text
Stage 3.2 Implementation Readiness: FAIL — BLOCKED BY RFC
Physical Schema Implementation Report: NOT CREATED
Physical Schema Gate Review: NOT OPENED
Deployment: BLOCKED
```

This is an evidence-based stop, not a self-approval and not a Logical Architecture change.
