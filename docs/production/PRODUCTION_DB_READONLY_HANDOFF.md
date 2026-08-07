# PAYSAVE OS Production DB Read-only Handoff

Baseline source revision: `76021586e830127b98ae2175681cf7e374adc99f`

## Purpose

Use [PRODUCTION_DB_READONLY_PREFLIGHT.sql](./PRODUCTION_DB_READONLY_PREFLIGHT.sql) to collect Production database ledger and readiness evidence before any Production migration plan is written.

This handoff is read-only. It does not authorize migration apply, data mutation, RLS changes, grants, deployment, or Production release.

## Owner Checks Before Running

1. Confirm the Supabase project name and project ref in the SQL console are the intended Production project.
2. Confirm the connected role is approved for read-only inspection.
3. Confirm this is not Managed Staging and not any local/disposable database.
4. Run the SQL exactly as provided unless a separate review approves edits.
5. Do not run any Apply migration immediately after this preflight.

## What The SQL Checks

- PostgreSQL identity, expected schemas, and migration ledger presence.
- `iam.permissions` contract for `reports.read`, `payments.read`, and `commission.read`.
- Production tenant list and active admin roles without assuming `RC_STAGING`.
- Admin role allow/deny permissions, duplicate mappings, and grants outside the approved admin set.
- Inventory RLS, update policies, direct `authenticated` update privilege, Inventory RPC existence, function security mode, and execute grants.
- Auth and tenant-isolation dependencies such as `admin.authorized_partner(uuid)` and IAM membership/role tables.
- A final migration comparison summary using `PRESENT`, `MISSING`, `DIFFERENT`, or `UNKNOWN`.

## Safety Contract

- The SQL starts with `BEGIN` and `SET TRANSACTION READ ONLY`.
- The SQL uses catalog inspection and `SELECT` statements only.
- The SQL ends with `ROLLBACK`.
- The SQL must not be modified to add `INSERT`, `UPDATE`, `DELETE`, DDL, `GRANT`, `REVOKE`, or any state-changing function call.
- Do not use `service_role` to bypass user authorization or RLS for application acceptance.
- Do not capture or share secrets, tokens, cookies, customer records, or PII.

## Expected Follow-up

Return the query output to the engineering owner for analysis. The next step is a Production DB ledger diff and a production-specific migration plan if gaps are confirmed.

The Managed Staging files below are not production migrations and must not be applied directly to Production:

- `database/migrations/managed_staging/20260805_000_missing_permission_catalog.sql`
- `database/migrations/managed_staging/20260805_admin_active_tenant_access.sql`
- `database/migrations/managed_staging/20260805_inventory_save_rpc.sql`
