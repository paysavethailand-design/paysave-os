# PAYSAVE OS — Stage 4.2 Inventory Lifecycle & Sales Dashboard Plan

- Authorization: CTO Authorized
- Scope: application/API/UI/tests only
- Safety: no Production access, no deploy, no Production schema change
- Compatibility: additive routes and repository reads; preserve existing authentication and current API payloads

## Metric and lifecycle contract

### Inventory lifecycle codes

`received → inspection → ready_for_sale → reserved → sold → delivered → closed`

Allowed compatibility paths:

- `received → ready_for_sale` (inspection completed in the intake flow)
- `ready_for_sale → sold` (sale without reservation)
- `reserved → ready_for_sale` (reservation released)

Existing non-inventory asset statuses remain supported. Strict transition validation activates when the current or target status belongs to the inventory lifecycle.

### Timeline

Every item timeline returns:

- status (`toStatusCode`)
- user (`changedBy`)
- date/time (`changedAt`)
- action/reason (`reasonCode`)

The immutable `asset.asset_status_history` table is authoritative for transitions. The asset creation row supplies a clearly identified initial `received` event when the item was created in `received` state.

### Inventory dashboard

- Total Stock: items not in `sold`, `delivered`, `closed`, or legacy `retired`
- Ready for Sale: current status `ready_for_sale`
- Reserved: current status `reserved`
- Sold Today: transitions to `sold` during the current UTC reporting day
- Dead Stock: open inventory at least 90 days old
- Aging: buckets `0–30`, `31–60`, `61–90`, `90+` days from `created_at`

### Sales dashboard

Sales are authoritative transitions to `sold` from `asset.asset_status_history`.

- Daily Sales: sold transition count for the current UTC day
- Monthly Sales: sold transition count for the current UTC month
- Sales by Brand: asset type name/code used as the existing schema’s product-brand dimension
- Sales by Buyer: asset current owner customer ID (stable, non-PII key)
- Sales by Employee: `changed_by` user ID from the sold transition

Counts are used because the frozen schema contains no approved sale-price/amount column. No amount is fabricated.

## Vertical implementation slices (TDD)

1. Lifecycle policy
   - Add pure status constants and transition guard.
   - RED: accepted path, invalid skip, reservation release, legacy compatibility.
   - GREEN: enforce in `changeAssetStatus` before repository mutation/audit.

2. Timeline query
   - Extend the Asset repository port additively with history read.
   - Add Supabase adapter query and row mapping.
   - Add `GET /api/v1/assets/:assetId/history`, guarded by `assets.read`.

3. Dashboard projection
   - Add a read-only inventory analytics port/model and pure projector.
   - Read `assets`, `asset_types`, and `asset_status_history`; tenant-scope every query.
   - Add `GET /api/v1/inventory/dashboard`, guarded by `assets.read`, `no-store`.

4. Dashboard UI
   - Add authenticated `/inventory` page using the existing AppShell/Card/Badge/Table patterns.
   - Add permission-filtered Inventory navigation.
   - Render Inventory and Sales dashboard sections and lifecycle reference.

5. End-to-end integration test
   - Use an in-memory repository plus RecordingAuditSink.
   - Execute `received → ready_for_sale → sold → delivered → closed` through the real application command.
   - Assert five states, four immutable history transitions, and one audit event per transition.
   - Assert dashboard totals equal the final repository/history state.

## Verification gates

- Focused lifecycle, repository, route, dashboard, UI/navigation, and integration tests
- Full workspace tests
- Architecture checker
- Typecheck
- Lint
- Format check
- Production build

## Explicit non-goals

- No Production deployment
- No Production/Staging data mutation
- No schema or migration edit unless implementation proves existing tables are insufficient
- No monetary sales KPI without an approved authoritative sales amount field
- No replacement of Supabase Auth/session/JWT/RLS behavior
