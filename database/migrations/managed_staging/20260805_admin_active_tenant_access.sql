BEGIN;

DO $$
DECLARE
  v_partner_count integer;
  v_role_count integer;
  v_missing_codes text;
BEGIN
  IF to_regclass('tenant.partners') IS NULL
     OR to_regclass('iam.roles') IS NULL
     OR to_regclass('iam.permissions') IS NULL
     OR to_regclass('iam.role_permissions') IS NULL THEN
    RAISE EXCEPTION 'required tenant/IAM tables are missing';
  END IF;

  SELECT count(*) INTO v_partner_count
  FROM tenant.partners
  WHERE code = 'RC_STAGING' AND status = 'active' AND deleted_at IS NULL;
  IF v_partner_count <> 1 THEN
    RAISE EXCEPTION 'expected exactly one active RC_STAGING partner, found %', v_partner_count;
  END IF;

  SELECT count(*) INTO v_role_count
  FROM iam.roles r
  JOIN tenant.partners p ON p.id = r.partner_id
  WHERE p.code = 'RC_STAGING'
    AND r.code = 'admin'
    AND r.status = 'active'
    AND r.deleted_at IS NULL;
  IF v_role_count <> 1 THEN
    RAISE EXCEPTION 'expected exactly one active RC_STAGING admin role, found %', v_role_count;
  END IF;

  WITH required(code) AS (
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
  )
  SELECT string_agg(required.code, ', ' ORDER BY required.code)
    INTO v_missing_codes
  FROM required
  LEFT JOIN iam.permissions p ON p.code = required.code
  WHERE p.id IS NULL;

  IF v_missing_codes IS NOT NULL THEN
    RAISE EXCEPTION 'required permission catalog rows are missing: %', v_missing_codes;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM tenant.partners p
    JOIN iam.roles r ON r.partner_id = p.id
    JOIN iam.role_permissions rp ON rp.partner_id = p.id AND rp.role_id = r.id
    JOIN iam.permissions permission ON permission.id = rp.permission_id
    WHERE p.code = 'RC_STAGING'
      AND r.code = 'admin'
      AND lower(rp.effect) = 'deny'
      AND permission.code IN (
        'assets.read', 'assets.manage', 'cases.read', 'cases.manage',
        'assignments.read', 'assignments.manage', 'partners.read', 'partners.manage',
        'customers.read', 'customers.manage', 'reports.read', 'payments.read',
        'commission.read', 'users.read', 'users.manage', 'roles.read', 'roles.manage',
        'permissions.read', 'permissions.manage'
      )
  ) THEN
    RAISE EXCEPTION 'explicit deny exists for a required RC_STAGING admin permission';
  END IF;
END
$$;

WITH required(code) AS (
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
), target AS (
  SELECT p.id AS partner_id, r.id AS role_id
  FROM tenant.partners p
  JOIN iam.roles r ON r.partner_id = p.id
  WHERE p.code = 'RC_STAGING'
    AND p.status = 'active'
    AND p.deleted_at IS NULL
    AND r.code = 'admin'
    AND r.status = 'active'
    AND r.deleted_at IS NULL
)
INSERT INTO iam.role_permissions (partner_id, role_id, permission_id, effect)
SELECT target.partner_id, target.role_id, permission.id, 'allow'
FROM target
CROSS JOIN required
JOIN iam.permissions permission ON permission.code = required.code
ON CONFLICT (partner_id, role_id, permission_id) DO NOTHING;

DO $$
DECLARE
  v_allowed_count integer;
  v_total_allowed_count integer;
BEGIN
  SELECT count(DISTINCT permission.code)
    INTO v_allowed_count
  FROM tenant.partners p
  JOIN iam.roles r ON r.partner_id = p.id
  JOIN iam.role_permissions rp ON rp.partner_id = p.id AND rp.role_id = r.id
  JOIN iam.permissions permission ON permission.id = rp.permission_id
  WHERE p.code = 'RC_STAGING'
    AND r.code = 'admin'
    AND lower(rp.effect) = 'allow'
    AND permission.code IN (
      'assets.read', 'assets.manage', 'cases.read', 'cases.manage',
      'assignments.read', 'assignments.manage', 'partners.read', 'partners.manage',
      'customers.read', 'customers.manage', 'reports.read', 'payments.read',
      'commission.read', 'users.read', 'users.manage', 'roles.read', 'roles.manage',
      'permissions.read', 'permissions.manage'
    );

  IF v_allowed_count <> 19 THEN
    RAISE EXCEPTION 'RC_STAGING admin permission readback expected 19 allows, found %', v_allowed_count;
  END IF;

  SELECT count(*)
    INTO v_total_allowed_count
  FROM tenant.partners p
  JOIN iam.roles r ON r.partner_id = p.id
  JOIN iam.role_permissions rp ON rp.partner_id = p.id AND rp.role_id = r.id
  WHERE p.code = 'RC_STAGING'
    AND r.code = 'admin'
    AND lower(rp.effect) = 'allow';

  IF v_total_allowed_count <> 19 THEN
    RAISE EXCEPTION
      'RC_STAGING admin must have exactly the 19 source-approved allows; total allows found %',
      v_total_allowed_count;
  END IF;
END
$$;

COMMIT;
