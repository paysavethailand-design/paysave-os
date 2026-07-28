# RFC-0002 — Partition-safe Foreign Key for Location Anomalies

- **Status:** OPEN — BLOCKS Stage 3.2 DDL generation
- **Scope:** Physical-key amendment only
- **Logical impact:** No table, relationship, domain or business-rule change proposed

## Conflict

`workforce.field_location_events` is approved as P01 monthly range partitioned with physical key `(occurred_at, id)` (`PAYSAVE_Physical_Schema_Specification_v1.0.md`, lines 874–891). `workforce.location_anomalies.location_event_id` is approved as a required FK to that parent (line 1905), but the child does not carry `occurred_at`.

PostgreSQL cannot enforce an FK to `id` alone because a unique/primary key on a partitioned table must include every partition-key column. The approved non-unique point-lookup index `(partner_id, id)` is not a legal referenced key.

## Decision options

1. **Recommended:** add physical shadow column `location_event_occurred_at timestamptz NOT NULL` to `workforce.location_anomalies` and enforce `(location_event_occurred_at, location_event_id) → workforce.field_location_events(occurred_at, id)`. This preserves the logical relationship and P01 profile but amends the approved physical column list.
2. Keep the parent unpartitioned until a later benchmark-approved migration. This changes the approved P01 physical profile.
3. Add a separate non-partitioned identity registry. Rejected unless the 161-table freeze is formally reopened.

## Required approval

Principal PostgreSQL Engineer and Architecture Decision Owner must choose option 1 or 2 before any M008/M018 FK DDL is generated.
