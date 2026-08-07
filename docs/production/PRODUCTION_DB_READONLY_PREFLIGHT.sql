-- PAYSAVE OS Production DB Read-only Preflight
-- Baseline source revision: 76021586e830127b98ae2175681cf7e374adc99f
--
-- Owner instructions:
-- 1. Confirm the Supabase project name/ref is the intended Production project before running.
-- 2. Run only in a SQL console/session that does not auto-commit writes outside this script.
-- 3. This script is read-only: it uses catalog inspection and SELECT statements only.
-- 4. Do not run any Apply migration from this output without a separate approved change window.

\set ON_ERROR_STOP on

BEGIN;
SET TRANSACTION READ ONLY;

SELECT
  'database_identity' AS section,
  current_database() AS database_name,
  current_user AS current_user_name,
  version() AS postgres_version;

WITH expected_schema(schema_name) AS (
  VALUES
    ('tenant'),
    ('iam'),
    ('asset'),
    ('admin'),
    ('auth'),
    ('supabase_migrations')
)
SELECT
  'schema_presence' AS section,
  expected_schema.schema_name,
  CASE WHEN n.oid IS NULL THEN 'MISSING' ELSE 'PRESENT' END AS status
FROM expected_schema
LEFT JOIN pg_namespace n ON n.nspname = expected_schema.schema_name
ORDER BY expected_schema.schema_name;

WITH candidate_ledgers(schema_name, table_name) AS (
  VALUES
    ('supabase_migrations', 'schema_migrations'),
    ('public', 'schema_migrations'),
    ('public', 'knex_migrations'),
    ('public', 'drizzle_migrations')
)
SELECT
  'migration_ledger_presence' AS section,
  candidate_ledgers.schema_name,
  candidate_ledgers.table_name,
  CASE WHEN c.oid IS NULL THEN 'MISSING' ELSE 'PRESENT' END AS status
FROM candidate_ledgers
LEFT JOIN pg_namespace n ON n.nspname = candidate_ledgers.schema_name
LEFT JOIN pg_class c
  ON c.relnamespace = n.oid
 AND c.relname = candidate_ledgers.table_name
 AND c.relkind IN ('r', 'p')
ORDER BY candidate_ledgers.schema_name, candidate_ledgers.table_name;

WITH required_permissions(code, expected_resource, expected_action) AS (
  VALUES
    ('reports.read', 'reports', 'read'),
    ('payments.read', 'payments', 'read'),
    ('commission.read', 'commission', 'read')
),
permission_rows AS (
  SELECT p.code, p.resource, p.action, count(*) AS row_count
  FROM iam.permissions p
  JOIN required_permissions rp ON rp.code = p.code
  WHERE to_regclass('iam.permissions') IS NOT NULL
  GROUP BY p.code, p.resource, p.action
)
SELECT
  'iam_permission_catalog_contract' AS section,
  rp.code,
  rp.expected_resource,
  rp.expected_action,
  COALESCE(sum(pr.row_count), 0)::integer AS matching_code_rows,
  CASE
    WHEN COALESCE(sum(pr.row_count), 0) = 0 THEN 'MISSING'
    WHEN COALESCE(sum(pr.row_count), 0) > 1 THEN 'DIFFERENT'
    WHEN bool_and(pr.resource = rp.expected_resource AND pr.action = rp.expected_action) THEN 'PRESENT'
    ELSE 'DIFFERENT'
  END AS status,
  string_agg(
    format('%s/%s x%s', pr.resource, pr.action, pr.row_count),
    ', '
    ORDER BY pr.resource, pr.action
  ) AS observed_contracts
FROM required_permissions rp
LEFT JOIN permission_rows pr ON pr.code = rp.code
GROUP BY rp.code, rp.expected_resource, rp.expected_action
ORDER BY rp.code;

SELECT
  'production_tenants' AS section,
  p.code,
  p.status,
  CASE WHEN p.deleted_at IS NULL THEN false ELSE true END AS is_deleted
FROM tenant.partners p
WHERE to_regclass('tenant.partners') IS NOT NULL
ORDER BY p.code;

SELECT
  'active_admin_roles' AS section,
  p.code AS tenant_code,
  p.status AS tenant_status,
  r.id AS role_id,
  r.code AS role_code,
  r.status AS role_status
FROM iam.roles r
JOIN tenant.partners p ON p.id = r.partner_id
WHERE to_regclass('iam.roles') IS NOT NULL
  AND to_regclass('tenant.partners') IS NOT NULL
  AND r.code = 'admin'
  AND r.status = 'active'
  AND r.deleted_at IS NULL
  AND p.deleted_at IS NULL
ORDER BY p.code, r.id;

WITH admin_roles AS (
  SELECT p.id AS partner_id, p.code AS tenant_code, r.id AS role_id
  FROM iam.roles r
  JOIN tenant.partners p ON p.id = r.partner_id
  WHERE r.code = 'admin'
    AND r.status = 'active'
    AND r.deleted_at IS NULL
    AND p.deleted_at IS NULL
)
SELECT
  'admin_role_allow_permissions' AS section,
  ar.tenant_code,
  permission.code AS permission_code,
  count(*) AS mapping_rows
FROM admin_roles ar
JOIN iam.role_permissions rp
  ON rp.partner_id = ar.partner_id
 AND rp.role_id = ar.role_id
JOIN iam.permissions permission ON permission.id = rp.permission_id
WHERE lower(rp.effect) = 'allow'
GROUP BY ar.tenant_code, permission.code
ORDER BY ar.tenant_code, permission.code;

WITH admin_roles AS (
  SELECT p.id AS partner_id, p.code AS tenant_code, r.id AS role_id
  FROM iam.roles r
  JOIN tenant.partners p ON p.id = r.partner_id
  WHERE r.code = 'admin'
    AND r.status = 'active'
    AND r.deleted_at IS NULL
    AND p.deleted_at IS NULL
)
SELECT
  'admin_role_deny_permissions' AS section,
  ar.tenant_code,
  permission.code AS permission_code,
  count(*) AS mapping_rows
FROM admin_roles ar
JOIN iam.role_permissions rp
  ON rp.partner_id = ar.partner_id
 AND rp.role_id = ar.role_id
JOIN iam.permissions permission ON permission.id = rp.permission_id
WHERE lower(rp.effect) = 'deny'
GROUP BY ar.tenant_code, permission.code
ORDER BY ar.tenant_code, permission.code;

SELECT
  'role_permission_duplicate_mappings' AS section,
  p.code AS tenant_code,
  r.code AS role_code,
  permission.code AS permission_code,
  count(*) AS mapping_rows,
  CASE WHEN count(*) > 1 THEN 'DIFFERENT' ELSE 'PRESENT' END AS status
FROM iam.role_permissions rp
JOIN iam.roles r
  ON r.partner_id = rp.partner_id
 AND r.id = rp.role_id
JOIN tenant.partners p ON p.id = rp.partner_id
JOIN iam.permissions permission ON permission.id = rp.permission_id
GROUP BY p.code, r.code, permission.code
HAVING count(*) > 1
ORDER BY p.code, r.code, permission.code;

WITH approved_admin_permission(code) AS (
  VALUES
    ('assets.read'), ('assets.manage'),
    ('cases.read'), ('cases.manage'),
    ('assignments.read'), ('assignments.manage'),
    ('partners.read'), ('partners.manage'),
    ('customers.read'), ('customers.manage'),
    ('reports.read'), ('payments.read'), ('commission.read'),
    ('users.read'), ('users.manage'),
    ('roles.read'), ('roles.manage'),
    ('permissions.read'), ('permissions.manage')
),
admin_roles AS (
  SELECT p.id AS partner_id, p.code AS tenant_code, r.id AS role_id
  FROM iam.roles r
  JOIN tenant.partners p ON p.id = r.partner_id
  WHERE r.code = 'admin'
    AND r.status = 'active'
    AND r.deleted_at IS NULL
    AND p.deleted_at IS NULL
)
SELECT
  'admin_role_excess_allow_permissions' AS section,
  ar.tenant_code,
  permission.code AS permission_code,
  count(*) AS mapping_rows,
  'DIFFERENT' AS status
FROM admin_roles ar
JOIN iam.role_permissions rp
  ON rp.partner_id = ar.partner_id
 AND rp.role_id = ar.role_id
JOIN iam.permissions permission ON permission.id = rp.permission_id
LEFT JOIN approved_admin_permission approved ON approved.code = permission.code
WHERE lower(rp.effect) = 'allow'
  AND approved.code IS NULL
GROUP BY ar.tenant_code, permission.code
ORDER BY ar.tenant_code, permission.code;

SELECT
  'inventory_assets_rls' AS section,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  CASE
    WHEN c.oid IS NULL THEN 'MISSING'
    WHEN c.relrowsecurity THEN 'PRESENT'
    ELSE 'DIFFERENT'
  END AS status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'asset'
  AND c.relname = 'assets'
  AND c.relkind IN ('r', 'p');

SELECT
  'inventory_update_policies' AS section,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'asset'
  AND tablename = 'assets'
  AND cmd = 'UPDATE'
ORDER BY policyname;

SELECT
  'inventory_authenticated_direct_update' AS section,
  CASE
    WHEN to_regclass('asset.assets') IS NULL THEN 'UNKNOWN'
    WHEN has_table_privilege('authenticated', 'asset.assets', 'UPDATE') THEN 'DIFFERENT'
    ELSE 'PRESENT'
  END AS status,
  CASE
    WHEN to_regclass('asset.assets') IS NULL THEN NULL
    ELSE has_table_privilege('authenticated', 'asset.assets', 'UPDATE')
  END AS authenticated_has_direct_update;

SELECT
  'inventory_rpc_function' AS section,
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  pg_get_userbyid(p.proowner) AS function_owner,
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS security_mode,
  CASE
    WHEN p.oid IS NULL THEN 'MISSING'
    WHEN p.prosecdef THEN 'PRESENT'
    ELSE 'DIFFERENT'
  END AS status
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'asset'
  AND p.proname = 'update_asset_inventory_fields'
ORDER BY arguments;

WITH target_function AS (
  SELECT p.oid
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'asset'
    AND p.proname = 'update_asset_inventory_fields'
    AND pg_get_function_identity_arguments(p.oid) =
      'p_asset_id uuid, p_partner_id uuid, p_expected_version_no integer, p_display_ref text, p_set_current_owner boolean, p_current_owner_customer_id uuid'
)
SELECT
  'inventory_rpc_execute_grants' AS section,
  role_name,
  CASE
    WHEN NOT EXISTS (SELECT 1 FROM target_function) THEN 'UNKNOWN'
    WHEN has_function_privilege(
      role_name,
      'asset.update_asset_inventory_fields(uuid,uuid,integer,text,boolean,uuid)',
      'EXECUTE'
    ) THEN 'PRESENT'
    ELSE 'MISSING'
  END AS execute_grant_status,
  CASE
    WHEN EXISTS (SELECT 1 FROM target_function) THEN has_function_privilege(
      role_name,
      'asset.update_asset_inventory_fields(uuid,uuid,integer,text,boolean,uuid)',
      'EXECUTE'
    )
    ELSE NULL
  END AS has_execute
FROM (VALUES ('authenticated'), ('PUBLIC'), ('service_role')) AS roles(role_name)
ORDER BY role_name;

WITH expected_functions(schema_name, function_name) AS (
  VALUES
    ('admin', 'current_claims'),
    ('admin', 'current_partner_id'),
    ('admin', 'current_auth_subject'),
    ('admin', 'authorized_partner')
)
SELECT
  'auth_claim_helper_functions' AS section,
  ef.schema_name,
  ef.function_name,
  CASE WHEN p.oid IS NULL THEN 'MISSING' ELSE 'PRESENT' END AS status,
  CASE WHEN p.oid IS NULL THEN NULL WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS security_mode,
  pg_get_function_identity_arguments(p.oid) AS arguments
FROM expected_functions ef
LEFT JOIN pg_namespace n ON n.nspname = ef.schema_name
LEFT JOIN pg_proc p
  ON p.pronamespace = n.oid
 AND p.proname = ef.function_name
ORDER BY ef.schema_name, ef.function_name, arguments;

WITH expected_tables(schema_name, table_name) AS (
  VALUES
    ('tenant', 'partners'),
    ('iam', 'users'),
    ('iam', 'memberships'),
    ('iam', 'roles'),
    ('iam', 'permissions'),
    ('iam', 'role_permissions')
)
SELECT
  'auth_tenant_dependency_tables' AS section,
  et.schema_name,
  et.table_name,
  CASE WHEN c.oid IS NULL THEN 'MISSING' ELSE 'PRESENT' END AS status
FROM expected_tables et
LEFT JOIN pg_namespace n ON n.nspname = et.schema_name
LEFT JOIN pg_class c
  ON c.relnamespace = n.oid
 AND c.relname = et.table_name
 AND c.relkind IN ('r', 'p')
ORDER BY et.schema_name, et.table_name;

WITH check_items(check_name, status, detail) AS (
  SELECT
    'permission_catalog_reports_payments_commission',
    CASE
      WHEN count(*) FILTER (
        WHERE code = 'reports.read' AND resource = 'reports' AND action = 'read'
      ) = 1
       AND count(*) FILTER (
        WHERE code = 'payments.read' AND resource = 'payments' AND action = 'read'
      ) = 1
       AND count(*) FILTER (
        WHERE code = 'commission.read' AND resource = 'commission' AND action = 'read'
      ) = 1
      THEN 'PRESENT'
      ELSE 'DIFFERENT'
    END,
    format('matching rows=%s', count(*))
  FROM iam.permissions
  WHERE code IN ('reports.read', 'payments.read', 'commission.read')
  UNION ALL
  SELECT
    'inventory_rpc_expected_signature',
    CASE
      WHEN to_regprocedure('asset.update_asset_inventory_fields(uuid,uuid,integer,text,boolean,uuid)') IS NULL
      THEN 'MISSING'
      ELSE 'PRESENT'
    END,
    'asset.update_asset_inventory_fields(uuid,uuid,integer,text,boolean,uuid)'
  UNION ALL
  SELECT
    'asset_assets_rls_enabled',
    CASE
      WHEN to_regclass('asset.assets') IS NULL THEN 'MISSING'
      WHEN EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'asset'
          AND c.relname = 'assets'
          AND c.relrowsecurity
      ) THEN 'PRESENT'
      ELSE 'DIFFERENT'
    END,
    'asset.assets relrowsecurity'
  UNION ALL
  SELECT
    'authenticated_direct_asset_update_closed',
    CASE
      WHEN to_regclass('asset.assets') IS NULL THEN 'UNKNOWN'
      WHEN has_table_privilege('authenticated', 'asset.assets', 'UPDATE') THEN 'DIFFERENT'
      ELSE 'PRESENT'
    END,
    'authenticated UPDATE privilege on asset.assets'
  UNION ALL
  SELECT
    'authorized_partner_helper',
    CASE
      WHEN to_regprocedure('admin.authorized_partner(uuid)') IS NULL THEN 'MISSING'
      ELSE 'PRESENT'
    END,
    'admin.authorized_partner(uuid)'
)
SELECT
  'migration_comparison_summary' AS section,
  check_name,
  status,
  detail
FROM check_items
ORDER BY check_name;

ROLLBACK;
