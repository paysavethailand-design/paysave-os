# RFC-0001 — Correct P02 Entity-History Physical Key Timestamp

- **Status:** OPEN — Stage 3.2 implementation clarification
- **Scope:** Physical specification correction only; no Logical Architecture, table, relationship, domain or business-rule change
- **Affected table:** `audit.entity_history`
- **Controlling artifacts:** Physical Schema Specification v1.0; Engineering Blueprint v1.0; ADR-0002

## Problem

The approved `audit.entity_history` column contract contains `occurred_at`, while its generated P02 index-contract text names `changed_at`, which is not a physical column of that table.

## Proposed correction

Use `occurred_at` wherever the P02 physical primary-key/index template refers to the event timestamp:

- physical key candidate: `(partner_id, entity_type, entity_id, occurred_at, id)`
- entity-history keyset index: `(partner_id, entity_type, entity_id, occurred_at DESC, id DESC)`
- hash partition key remains `(partner_id, entity_type, entity_id)`

## Impact

- Logical table count: unchanged at 161
- Relationships: unchanged
- Domain ownership: unchanged
- Business rules: unchanged
- Data type/nullability: unchanged
- Migration implementation uses the existing approved `occurred_at` column and records this RFC in the Stage 3.2 report.

## Decision requested at Physical Schema Gate

Accept this as correction of a non-existent physical column reference. No deployment is authorized by this RFC.
