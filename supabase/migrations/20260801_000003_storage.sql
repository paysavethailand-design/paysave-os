-- 20260801_000003_storage.sql
-- Storage Buckets and Policies for PAYSAVE

-- Note: Buckets should be created via Supabase Dashboard or CLI `supabase storage create`
-- Here we define policies for the buckets

-- Buckets to create (manual or via script):
-- evidence (private)
-- documents (private)
-- reports (private)
-- exports (private)
-- profile-images (public)

-- Example policies for storage.objects

-- Evidence bucket - only assigned field can upload/view
CREATE POLICY "evidence_upload_field" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'evidence' AND
    (SELECT role FROM employees WHERE user_id = auth.uid()) = 'FIELD'
);

CREATE POLICY "evidence_select_assigned" ON storage.objects
FOR SELECT TO authenticated USING (
    bucket_id = 'evidence' AND
    auth.uid() IN (SELECT user_id FROM employees WHERE id IN (SELECT captured_by FROM recovery_evidences))
);

-- Documents
CREATE POLICY "documents_select_assigned" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'documents');

-- Reports
CREATE POLICY "reports_select_finance_admin" ON storage.objects
FOR SELECT TO authenticated USING (
    bucket_id = 'reports' AND
    (SELECT role FROM employees WHERE user_id = auth.uid()) IN ('FINANCE', 'ADMIN', 'EXECUTIVE')
);

-- Exports
CREATE POLICY "exports_select_own" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'exports');

-- Profile images public
CREATE POLICY "profile_images_public_read" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'profile-images');

CREATE POLICY "profile_images_upload_authenticated" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'profile-images' AND owner = auth.uid());