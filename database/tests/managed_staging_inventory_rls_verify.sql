\set ON_ERROR_STOP on

CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA admin;
CREATE SCHEMA tenant;
CREATE SCHEMA iam;
CREATE SCHEMA asset;

CREATE TABLE tenant.partners (
  id uuid PRIMARY KEY,
  code text NOT NULL UNIQUE
);
CREATE TABLE iam.users (
  id uuid PRIMARY KEY,
  auth_subject text NOT NULL UNIQUE
);
CREATE TABLE iam.memberships (
  id uuid PRIMARY KEY,
  partner_id uuid NOT NULL REFERENCES tenant.partners(id),
  user_id uuid NOT NULL REFERENCES iam.users(id),
  status text NOT NULL,
  deleted_at timestamptz
);
CREATE TABLE asset.assets (
  id uuid PRIMARY KEY,
  partner_id uuid NOT NULL REFERENCES tenant.partners(id),
  asset_type_id uuid NOT NULL,
  business_object_id uuid NOT NULL,
  display_ref text NOT NULL CHECK (btrim(display_ref) <> ''),
  current_status_code varchar(100) NOT NULL,
  current_owner_customer_id uuid,
  version_no integer NOT NULL CHECK (version_no > 0),
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp()
);

CREATE FUNCTION admin.current_claims()
RETURNS jsonb LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb)
$$;
CREATE FUNCTION admin.current_partner_id()
RETURNS uuid LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
  SELECT NULLIF(admin.current_claims() #>> '{paysave,active_partner_id}','')::uuid
$$;
CREATE FUNCTION admin.current_auth_subject()
RETURNS text LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
  SELECT NULLIF(admin.current_claims()->>'sub','')
$$;
CREATE FUNCTION admin.authorized_partner(p_partner_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog
SET row_security=off
AS $$
  SELECT p_partner_id IS NOT NULL
    AND p_partner_id=admin.current_partner_id()
    AND EXISTS (
      SELECT 1
      FROM iam.memberships m
      JOIN iam.users u ON u.id=m.user_id
      WHERE m.partner_id=p_partner_id
        AND u.auth_subject=admin.current_auth_subject()
        AND m.status='active'
        AND m.deleted_at IS NULL
    )
$$;

ALTER TABLE asset.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset.assets FORCE ROW LEVEL SECURITY;
CREATE POLICY assets_read ON asset.assets
  FOR SELECT USING (admin.authorized_partner(partner_id));
CREATE POLICY assets_update ON asset.assets
  FOR UPDATE USING (admin.authorized_partner(partner_id))
  WITH CHECK (admin.authorized_partner(partner_id));
GRANT EXECUTE ON FUNCTION admin.current_claims(),admin.current_partner_id(),admin.current_auth_subject(),admin.authorized_partner(uuid)
  TO PUBLIC;
GRANT USAGE ON SCHEMA asset TO authenticated;
GRANT SELECT ON asset.assets TO authenticated;
REVOKE UPDATE ON asset.assets FROM authenticated;

INSERT INTO tenant.partners(id,code) VALUES
  ('00000000-0000-7000-8000-000000000001','RC_STAGING'),
  ('00000000-0000-7000-8000-000000000002','OTHER_STAGING');
INSERT INTO iam.users(id,auth_subject) VALUES
  ('00000000-0000-7000-8000-000000000101','rc-admin-sub');
INSERT INTO iam.memberships(id,partner_id,user_id,status) VALUES
  ('00000000-0000-7000-8000-000000000201','00000000-0000-7000-8000-000000000001','00000000-0000-7000-8000-000000000101','active');
INSERT INTO asset.assets(id,partner_id,asset_type_id,business_object_id,display_ref,current_status_code,version_no) VALUES
  ('00000000-0000-7000-8000-000000000301','00000000-0000-7000-8000-000000000001','00000000-0000-7000-8000-000000000401','00000000-0000-7000-8000-000000000501','RC-BEFORE','active',1),
  ('00000000-0000-7000-8000-000000000302','00000000-0000-7000-8000-000000000002','00000000-0000-7000-8000-000000000402','00000000-0000-7000-8000-000000000502','OTHER-BEFORE','active',1);

\ir ../migrations/managed_staging/20260805_inventory_save_rpc.sql

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='asset' AND tablename='assets' AND cmd='UPDATE'
      AND qual='admin.authorized_partner(partner_id)'
      AND with_check='admin.authorized_partner(partner_id)'
  ) THEN
    RAISE EXCEPTION 'tenant-scoped UPDATE USING/WITH CHECK policy missing';
  END IF;
  IF NOT has_function_privilege(
    'authenticated',
    'asset.update_asset_inventory_fields(uuid,uuid,integer,text,boolean,uuid)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'authenticated lacks RPC execute grant';
  END IF;
  IF has_table_privilege('authenticated','asset.assets','UPDATE') THEN
    RAISE EXCEPTION 'authenticated must not receive direct table UPDATE';
  END IF;
  IF has_function_privilege(
    'service_role',
    'asset.update_asset_inventory_fields(uuid,uuid,integer,text,boolean,uuid)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'service_role must not execute Inventory Save RPC';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) acl
    WHERE n.nspname='asset'
      AND p.proname='update_asset_inventory_fields'
      AND acl.grantee=0
      AND acl.privilege_type='EXECUTE'
  ) THEN
    RAISE EXCEPTION 'PUBLIC must not execute Inventory Save RPC';
  END IF;
END $$;

SET ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"rc-admin-sub","role":"authenticated","paysave":{"active_partner_id":"00000000-0000-7000-8000-000000000001","tenant_scope":"active","permissions":["assets.read","assets.manage"]}}',
  false
);

DO $$
DECLARE
  v_row asset.assets%ROWTYPE;
  v_denied boolean := false;
  v_conflict boolean := false;
  v_direct_denied boolean := false;
BEGIN
  SELECT * INTO v_row
  FROM asset.update_asset_inventory_fields(
    '00000000-0000-7000-8000-000000000301',
    '00000000-0000-7000-8000-000000000001',
    1,
    'RC-AFTER',
    false,
    NULL
  );
  IF v_row.display_ref <> 'RC-AFTER' OR v_row.version_no <> 2 THEN
    RAISE EXCEPTION 'same-tenant Inventory Save did not persist exactly once';
  END IF;

  BEGIN
    PERFORM asset.update_asset_inventory_fields(
      '00000000-0000-7000-8000-000000000302',
      '00000000-0000-7000-8000-000000000002',
      1,
      'CROSS-TENANT-MUTATION',
      false,
      NULL
    );
  EXCEPTION WHEN SQLSTATE 'PT403' THEN
    v_denied := true;
  END;
  IF NOT v_denied THEN
    RAISE EXCEPTION 'cross-tenant RPC was not denied';
  END IF;

  BEGIN
    PERFORM asset.update_asset_inventory_fields(
      '00000000-0000-7000-8000-000000000301',
      '00000000-0000-7000-8000-000000000001',
      1,
      'STALE-WRITE',
      false,
      NULL
    );
  EXCEPTION WHEN SQLSTATE 'PT409' THEN
    v_conflict := true;
  END;
  IF NOT v_conflict THEN
    RAISE EXCEPTION 'stale expected version was not denied';
  END IF;

  BEGIN
    UPDATE asset.assets
       SET display_ref='DIRECT-BYPASS'
     WHERE id='00000000-0000-7000-8000-000000000301';
  EXCEPTION WHEN insufficient_privilege THEN
    v_direct_denied := true;
  END;
  IF NOT v_direct_denied THEN
    RAISE EXCEPTION 'authenticated direct table UPDATE bypass remains open';
  END IF;
END $$;
RESET ROLE;

DO $$
BEGIN
  IF (SELECT display_ref FROM asset.assets WHERE id='00000000-0000-7000-8000-000000000301') <> 'RC-AFTER' THEN
    RAISE EXCEPTION 'same-tenant persistence readback failed';
  END IF;
  IF (SELECT version_no FROM asset.assets WHERE id='00000000-0000-7000-8000-000000000301') <> 2 THEN
    RAISE EXCEPTION 'same-tenant version increment readback failed';
  END IF;
  IF (SELECT display_ref FROM asset.assets WHERE id='00000000-0000-7000-8000-000000000302') <> 'OTHER-BEFORE' THEN
    RAISE EXCEPTION 'cross-tenant row changed';
  END IF;
END $$;

SELECT 'MANAGED_STAGING_INVENTORY_RLS_PASS' AS result;
