-- Managed Staging only: paysave-staging (Supabase project rptqfhtanjtrxtfbgrkb)
-- Forward-only, transactional, replay-safe Inventory Save hotfix.
-- Direct table UPDATE stays revoked; authenticated callers receive EXECUTE only
-- on a tenant-authorized, optimistic-locking RPC.
BEGIN;

DO $$
BEGIN
  IF to_regclass('asset.assets') IS NULL THEN
    RAISE EXCEPTION 'required table asset.assets is missing';
  END IF;
  IF to_regprocedure('admin.authorized_partner(uuid)') IS NULL THEN
    RAISE EXCEPTION 'required function admin.authorized_partner(uuid) is missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname='asset'
      AND tablename='assets'
      AND cmd='UPDATE'
      AND qual='admin.authorized_partner(partner_id)'
      AND with_check='admin.authorized_partner(partner_id)'
  ) THEN
    RAISE EXCEPTION 'required tenant-scoped UPDATE policy on asset.assets is missing or changed';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION asset.update_asset_inventory_fields(
  p_asset_id uuid,
  p_partner_id uuid,
  p_expected_version_no integer,
  p_display_ref text,
  p_set_current_owner boolean,
  p_current_owner_customer_id uuid
)
RETURNS SETOF asset.assets
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path=pg_catalog
AS $$
DECLARE
  v_after asset.assets%ROWTYPE;
  v_current_version integer;
BEGIN
  IF p_expected_version_no IS NULL OR p_expected_version_no < 1 THEN
    RAISE EXCEPTION 'Invalid expected asset version' USING ERRCODE='22023';
  END IF;

  -- Fail closed on a missing/lost user JWT, inactive membership, or tenant mismatch.
  -- No service_role exception exists in this function.
  IF NOT admin.authorized_partner(p_partner_id) THEN
    RAISE EXCEPTION 'Inventory update is not authorized for partner' USING ERRCODE='PT403';
  END IF;

  UPDATE asset.assets
     SET display_ref = CASE WHEN p_display_ref IS NULL THEN display_ref ELSE p_display_ref END,
         current_owner_customer_id = CASE
           WHEN p_set_current_owner THEN p_current_owner_customer_id
           ELSE current_owner_customer_id
         END,
         version_no = version_no + 1
   WHERE id = p_asset_id
     AND partner_id = p_partner_id
     AND version_no = p_expected_version_no
   RETURNING * INTO v_after;

  IF FOUND THEN
    RETURN NEXT v_after;
    RETURN;
  END IF;

  SELECT version_no
    INTO v_current_version
    FROM asset.assets
   WHERE id = p_asset_id
     AND partner_id = p_partner_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Asset not found in authorized partner scope' USING ERRCODE='PT404';
  END IF;

  RAISE EXCEPTION 'Asset version conflict' USING ERRCODE='PT409';
END;
$$;

REVOKE ALL ON FUNCTION asset.update_asset_inventory_fields(uuid,uuid,integer,text,boolean,uuid)
  FROM PUBLIC;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    RAISE EXCEPTION 'required Supabase role authenticated is missing';
  END IF;

  GRANT USAGE ON SCHEMA asset TO authenticated;
  GRANT EXECUTE ON FUNCTION asset.update_asset_inventory_fields(uuid,uuid,integer,text,boolean,uuid)
    TO authenticated;

  -- Preserve the Stage 4.3.2 control: callers cannot bypass the guarded RPC.
  REVOKE UPDATE ON asset.assets FROM authenticated;
END $$;

COMMENT ON FUNCTION asset.update_asset_inventory_fields(uuid,uuid,integer,text,boolean,uuid)
IS 'Managed-staging Inventory Save RPC: user-JWT tenant authorization, atomic ID+partner+version predicates, exactly one returned DB row.';

COMMIT;
