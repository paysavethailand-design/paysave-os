CREATE SCHEMA tenant;
CREATE SCHEMA iam;

CREATE TABLE tenant.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  status text NOT NULL,
  deleted_at timestamptz
);
CREATE TABLE iam.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES tenant.partners(id),
  code text NOT NULL,
  status text NOT NULL,
  deleted_at timestamptz,
  UNIQUE (partner_id, code),
  UNIQUE (partner_id, id)
);
CREATE TABLE iam.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE
);
CREATE TABLE iam.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES tenant.partners(id),
  role_id uuid NOT NULL,
  permission_id uuid NOT NULL REFERENCES iam.permissions(id),
  effect text NOT NULL,
  UNIQUE (partner_id, role_id, permission_id),
  FOREIGN KEY (partner_id, role_id) REFERENCES iam.roles(partner_id, id)
);
INSERT INTO tenant.partners(code,status) VALUES ('RC_STAGING','active'),('OTHER_STAGING','active');
INSERT INTO iam.roles(partner_id,code,status)
SELECT id,'admin','active' FROM tenant.partners
UNION ALL
SELECT id,'partner','active' FROM tenant.partners WHERE code='RC_STAGING'
UNION ALL
SELECT id,'supervisor','active' FROM tenant.partners WHERE code='RC_STAGING'
UNION ALL
SELECT id,'agent','active' FROM tenant.partners WHERE code='RC_STAGING';
INSERT INTO iam.permissions(code) VALUES
  ('assets.read'), ('assets.manage'),
  ('cases.read'), ('cases.manage'),
  ('assignments.read'), ('assignments.manage'),
  ('partners.read'), ('partners.manage'),
  ('customers.read'), ('customers.manage'),
  ('reports.read'), ('payments.read'), ('commission.read'),
  ('users.read'), ('users.manage'),
  ('roles.read'), ('roles.manage'),
  ('permissions.read'), ('permissions.manage'),
  ('platform.manage');

\ir ../migrations/managed_staging/20260805_admin_active_tenant_access.sql
\ir ../migrations/managed_staging/20260805_admin_active_tenant_access.sql

DO $$
DECLARE
  v_target integer;
  v_other integer;
  v_non_admin integer;
  v_platform integer;
BEGIN
  SELECT count(*) INTO v_target
  FROM iam.role_permissions rp
  JOIN iam.roles r ON r.id=rp.role_id AND r.partner_id=rp.partner_id
  JOIN tenant.partners p ON p.id=rp.partner_id
  WHERE p.code='RC_STAGING' AND r.code='admin' AND rp.effect='allow';
  IF v_target <> 19 THEN
    RAISE EXCEPTION 'target admin expected exactly 19 source-approved allows, found %',v_target;
  END IF;

  SELECT count(*) INTO v_other
  FROM iam.role_permissions rp JOIN tenant.partners p ON p.id=rp.partner_id
  WHERE p.code='OTHER_STAGING';
  IF v_other <> 0 THEN RAISE EXCEPTION 'cross-tenant role mappings changed'; END IF;

  SELECT count(*) INTO v_non_admin
  FROM iam.role_permissions rp JOIN iam.roles r ON r.id=rp.role_id AND r.partner_id=rp.partner_id
  WHERE r.code IN ('partner','supervisor','agent');
  IF v_non_admin <> 0 THEN RAISE EXCEPTION 'non-admin role mappings changed'; END IF;

  SELECT count(*) INTO v_platform
  FROM iam.role_permissions rp
  JOIN iam.roles r ON r.id=rp.role_id AND r.partner_id=rp.partner_id
  JOIN iam.permissions permission ON permission.id=rp.permission_id
  WHERE r.code='admin' AND permission.code='platform.manage';
  IF v_platform <> 0 THEN RAISE EXCEPTION 'platform.manage was unexpectedly granted'; END IF;
END
$$;

SELECT 'MANAGED_STAGING_ADMIN_ACCESS_PASS' AS result;
