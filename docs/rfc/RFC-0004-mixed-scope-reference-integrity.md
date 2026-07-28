# RFC-0004 — Mixed Global/Tenant Reference Integrity

- **Status:** OPEN — BLOCKS M002 and deferred FK DDL
- **Logical impact:** No table/relationship/domain addition proposed

## Conflict A — global catalog points to tenant-only identity

`master_data.catalogs.owner_partner_id` is nullable for approved global rows, while `business_object_id` is NOT NULL and references tenant-owned `workflow.business_objects`, whose `partner_id` is required. A global catalog therefore cannot satisfy the approved “no tenant subject reference attached to a global row” rule.

## Conflict B — mixed-scope parent cannot use one tenant-composite FK

Tenant rows in `finance.payments` and `master_data.external_mappings` may reference `master_data.catalog_items`, whose owner can be global (`owner_partner_id IS NULL`) or tenant-owned. A strict `(partner_id, item_id) → (owner_partner_id, id)` FK rejects valid global items, while a nullable composite FK skips integrity for global hierarchy rows.

## Proposed physical amendment

1. Make `master_data.catalogs.business_object_id` nullable only for global rows and add a scope-consistency check requiring a business object for tenant-owned rows.
2. Keep a direct FK to each mixed-scope parent `id`, then use an approved scope-integrity trigger to require `parent.owner_partner_id IS NULL OR parent.owner_partner_id = child.partner_id`.
3. Apply the same global/tenant ownership-consistency rule through catalog → version → item → localization.

## Required approval

Architecture Decision Owner and Security/RLS reviewer must approve the physical nullability and FK+trigger pattern before DDL generation.
