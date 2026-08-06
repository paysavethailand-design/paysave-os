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
  code text NOT NULL UNIQUE,
  resource text NOT NULL,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
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
INSERT INTO iam.permissions(code,resource,action) VALUES
  ('assets.read','assets','read'), ('assets.manage','assets','manage'),
  ('cases.read','cases','read'), ('cases.manage','cases','manage'),
  ('assignments.read','assignments','read'), ('assignments.manage','assignments','manage'),
  ('partners.read','partners','read'), ('partners.manage','partners','manage'),
  ('customers.read','customers','read'), ('customers.manage','customers','manage'),
  ('users.read','users','read'), ('users.manage','users','manage'),
  ('roles.read','roles','read'), ('roles.manage','roles','manage'),
  ('permissions.read','permissions','read'), ('permissions.manage','permissions','manage'),
  ('platform.manage','platform','manage');

\ir ../migrations/managed_staging/20260805_000_missing_permission_catalog.sql
\ir ../migrations/managed_staging/20260805_000_missing_permission_catalog.sql

DO $$
DECLARE
  v_catalog integer;
  v_tenants integer;
  v_roles integer;
  v_grants integer;
BEGIN
  SELECT count(*) INTO v_catalog
  FROM iam.permissions p
  WHERE (p.code,p.resource,p.action) IN (
    ('reports.read','reports','read'),
    ('payments.read','payments','read'),
    ('commission.read','commission','read')
  );
  IF v_catalog <> 3 THEN
    RAISE EXCEPTION 'missing permission catalog expected exactly 3 rows, found %', v_catalog;
  END IF;

  SELECT count(*) INTO v_tenants FROM tenant.partners;
  IF v_tenants <> 2 THEN RAISE EXCEPTION 'tenant rows changed during catalog seed'; END IF;

  SELECT count(*) INTO v_roles FROM iam.roles;
  IF v_roles <> 5 THEN RAISE EXCEPTION 'role rows changed during catalog seed'; END IF;

  SELECT count(*) INTO v_grants FROM iam.role_permissions;
  IF v_grants <> 0 THEN RAISE EXCEPTION 'role permission rows changed during catalog seed'; END IF;
END
$$;

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
