-- Storage Setup for PAYSAVE OS
-- Dedicated file for Supabase Storage only
-- Run in Supabase SQL Editor
-- Idempotent and safe to re-run
-- Uses latest Supabase supported syntax

BEGIN;

-- =============================================
-- 1. CREATE BUCKETS (if not exists)
-- =============================================
-- evidence (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('evidence', 'evidence', false, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;

-- documents (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('documents', 'documents', false, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;

-- reports (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('reports', 'reports', false, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;

-- exports (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('exports', 'exports', false, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;

-- profile-images (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('profile-images', 'profile-images', true, 5242880, NULL)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 2. STORAGE POLICIES
-- =============================================

-- Enable RLS on storage.objects (if not already)
-- (Usually enabled by default in Supabase)

-- ---------------------------------------------
-- Service Role: Full access (standard)
-- ---------------------------------------------
DROP POLICY IF EXISTS "service_role_full_access" ON storage.objects;
CREATE POLICY "service_role_full_access"
ON storage.objects
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_buckets_full" ON storage.buckets;
CREATE POLICY "service_role_buckets_full"
ON storage.buckets
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ---------------------------------------------
-- Authenticated users policies
-- ---------------------------------------------

-- Evidence bucket
DROP POLICY IF EXISTS "evidence_select_authenticated" ON storage.objects;
CREATE POLICY "evidence_select_authenticated"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'evidence');

DROP POLICY IF EXISTS "evidence_insert_field" ON storage.objects;
CREATE POLICY "evidence_insert_field"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'evidence' 
  AND (SELECT role FROM employees WHERE user_id = auth.uid()) = 'FIELD'
);

DROP POLICY IF EXISTS "evidence_update_field" ON storage.objects;
CREATE POLICY "evidence_update_field"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'evidence' 
  AND (SELECT role FROM employees WHERE user_id = auth.uid()) = 'FIELD'
);

-- Documents bucket
DROP POLICY IF EXISTS "documents_select_authenticated" ON storage.objects;
CREATE POLICY "documents_select_authenticated"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_insert_authenticated" ON storage.objects;
CREATE POLICY "documents_insert_authenticated"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_update_authenticated" ON storage.objects;
CREATE POLICY "documents_update_authenticated"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'documents');

-- Reports bucket
DROP POLICY IF EXISTS "reports_select_finance_admin" ON storage.objects;
CREATE POLICY "reports_select_finance_admin"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'reports' 
  AND (SELECT role FROM employees WHERE user_id = auth.uid()) IN ('FINANCE', 'ADMIN', 'EXECUTIVE')
);

DROP POLICY IF EXISTS "reports_insert_finance_admin" ON storage.objects;
CREATE POLICY "reports_insert_finance_admin"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'reports' 
  AND (SELECT role FROM employees WHERE user_id = auth.uid()) IN ('FINANCE', 'ADMIN', 'EXECUTIVE')
);

-- Exports bucket
DROP POLICY IF EXISTS "exports_select_authenticated" ON storage.objects;
CREATE POLICY "exports_select_authenticated"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'exports');

DROP POLICY IF EXISTS "exports_insert_authenticated" ON storage.objects;
CREATE POLICY "exports_insert_authenticated"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'exports');

-- Profile Images (public bucket)
DROP POLICY IF EXISTS "profile_images_public_read" ON storage.objects;
CREATE POLICY "profile_images_public_read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-images');

DROP POLICY IF EXISTS "profile_images_upload_authenticated" ON storage.objects;
CREATE POLICY "profile_images_upload_authenticated"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-images');

DROP POLICY IF EXISTS "profile_images_update_authenticated" ON storage.objects;
CREATE POLICY "profile_images_update_authenticated"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-images');

DROP POLICY IF EXISTS "profile_images_delete_authenticated" ON storage.objects;
CREATE POLICY "profile_images_delete_authenticated"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'profile-images');

COMMIT;