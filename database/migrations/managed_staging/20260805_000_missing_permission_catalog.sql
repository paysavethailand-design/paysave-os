-- Managed Staging prerequisite for tenant-admin access.
-- Data-only catalog seed: no tenant, role, or role-permission grants.
BEGIN;

DO $$
DECLARE
  v_missing_columns text;
  v_duplicate_codes text;
  v_conflicting_codes text;
  v_required_count integer;
BEGIN
  IF to_regclass('iam.permissions') IS NULL THEN
    RAISE EXCEPTION 'required table iam.permissions is missing';
  END IF;

  WITH required_columns(column_name) AS (
    VALUES ('code'), ('resource'), ('action'), ('created_at'), ('updated_at')
  )
  SELECT string_agg(required_columns.column_name, ', ' ORDER BY required_columns.column_name)
    INTO v_missing_columns
  FROM required_columns
  LEFT JOIN information_schema.columns c
    ON c.table_schema = 'iam'
   AND c.table_name = 'permissions'
   AND c.column_name = required_columns.column_name
  WHERE c.column_name IS NULL;

  IF v_missing_columns IS NOT NULL THEN
    RAISE EXCEPTION 'required iam.permissions columns are missing: %', v_missing_columns;
  END IF;

  WITH required(code) AS (
    VALUES ('reports.read'), ('payments.read'), ('commission.read')
  )
  SELECT string_agg(code, ', ' ORDER BY code)
    INTO v_duplicate_codes
  FROM (
    SELECT p.code
    FROM iam.permissions p
    JOIN required ON required.code = p.code
    GROUP BY p.code
    HAVING count(*) > 1
  ) duplicate;

  IF v_duplicate_codes IS NOT NULL THEN
    RAISE EXCEPTION 'permission catalog code duplicates exist: %', v_duplicate_codes;
  END IF;

  WITH required(code, resource, action) AS (
    VALUES
      ('reports.read', 'reports', 'read'),
      ('payments.read', 'payments', 'read'),
      ('commission.read', 'commission', 'read')
  )
  SELECT string_agg(required.code, ', ' ORDER BY required.code)
    INTO v_conflicting_codes
  FROM required
  JOIN iam.permissions p ON p.code = required.code
  WHERE p.resource IS DISTINCT FROM required.resource
     OR p.action IS DISTINCT FROM required.action;

  IF v_conflicting_codes IS NOT NULL THEN
    RAISE EXCEPTION 'permission catalog rows conflict with expected resource/action: %',
      v_conflicting_codes;
  END IF;

  WITH required(code, resource, action) AS (
    VALUES
      ('reports.read', 'reports', 'read'),
      ('payments.read', 'payments', 'read'),
      ('commission.read', 'commission', 'read')
  )
  INSERT INTO iam.permissions (code, resource, action, created_at, updated_at)
  SELECT required.code, required.resource, required.action, now(), now()
  FROM required
  WHERE NOT EXISTS (
    SELECT 1
    FROM iam.permissions p
    WHERE p.code = required.code
  );

  WITH required(code, resource, action) AS (
    VALUES
      ('reports.read', 'reports', 'read'),
      ('payments.read', 'payments', 'read'),
      ('commission.read', 'commission', 'read')
  )
  SELECT count(*)
    INTO v_required_count
  FROM iam.permissions p
  JOIN required
    ON required.code = p.code
   AND required.resource = p.resource
   AND required.action = p.action;

  IF v_required_count <> 3 THEN
    RAISE EXCEPTION 'expected exactly 3 missing permission catalog rows, found %',
      v_required_count;
  END IF;
END
$$;

COMMIT;
