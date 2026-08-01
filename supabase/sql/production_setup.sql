-- Consolidated Production Setup SQL for PAYSAVE OS
-- Generated from existing migrations only (no new schema, no business logic changes)
-- Design Freeze v5 respected
-- Execute once in Supabase SQL Editor or via CLI

BEGIN;

-- =============================================
-- 1. EXTENSIONS
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================
-- 2. FUNCTIONS (before tables and triggers)
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (table_name, record_id, action, actor_id, old_data, new_data, created_at)
    VALUES (TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), TG_OP, current_setting('app.current_user_id', true)::uuid, row_to_json(OLD), row_to_json(NEW), NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 3. TABLES (create without FK first for dependency order)
-- =============================================
CREATE TABLE IF NOT EXISTS partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    tax_id TEXT UNIQUE,
    contact_email TEXT,
    contact_phone TEXT,
    address TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    partner_id UUID,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('EXECUTIVE', 'ADMIN', 'PARTNER', 'FIELD', 'FINANCE', 'CSR', 'SYSTEM')),
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recovery_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_number TEXT NOT NULL UNIQUE,
    partner_id UUID NOT NULL,
    assigned_employee_id UUID,
    status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_VERIFICATION', 'RESOLVED', 'CLOSED_SUCCESSFUL', 'CLOSED_FAILED', 'ESCALATED')),
    priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    amount_due NUMERIC(15,2),
    due_date DATE,
    province TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS case_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    status TEXT DEFAULT 'PENDING'
);

CREATE TABLE IF NOT EXISTS recovery_evidences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('PHOTO_REFERENCE', 'DOCUMENT_REFERENCE', 'NOTE', 'RECEIPT_REFERENCE')),
    description TEXT,
    reference TEXT,
    captured_at TIMESTAMPTZ,
    captured_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID,
    employee_id UUID,
    partner_id UUID,
    amount NUMERIC(15,2) NOT NULL,
    status TEXT DEFAULT 'PENDING',
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID,
    type TEXT NOT NULL,
    title TEXT,
    message TEXT,
    status TEXT DEFAULT 'PENDING',
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID,
    type TEXT,
    content JSONB,
    generated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category TEXT NOT NULL CHECK (category IN ('BUG', 'FEATURE_REQUEST', 'IMPROVEMENT', 'QUESTION')),
    priority TEXT NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'NEW',
    user_id UUID,
    user_role TEXT,
    url TEXT,
    browser_info TEXT,
    device_info TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS outbox_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aggregate_type TEXT NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'PENDING'
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL,
    actor_id UUID,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deployments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version TEXT,
    environment TEXT,
    status TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    deployed_by UUID
);

CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status TEXT DEFAULT 'OPEN',
    owner_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 4. FOREIGN KEYS (after all tables)
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_employees_partner') THEN
    ALTER TABLE employees ADD CONSTRAINT fk_employees_partner FOREIGN KEY (partner_id) REFERENCES partners(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_recovery_cases_partner') THEN
    ALTER TABLE recovery_cases ADD CONSTRAINT fk_recovery_cases_partner FOREIGN KEY (partner_id) REFERENCES partners(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_recovery_cases_employee') THEN
    ALTER TABLE recovery_cases ADD CONSTRAINT fk_recovery_cases_employee FOREIGN KEY (assigned_employee_id) REFERENCES employees(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_case_assignments_case') THEN
    ALTER TABLE case_assignments ADD CONSTRAINT fk_case_assignments_case FOREIGN KEY (case_id) REFERENCES recovery_cases(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_case_assignments_employee') THEN
    ALTER TABLE case_assignments ADD CONSTRAINT fk_case_assignments_employee FOREIGN KEY (employee_id) REFERENCES employees(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_recovery_evidences_case') THEN
    ALTER TABLE recovery_evidences ADD CONSTRAINT fk_recovery_evidences_case FOREIGN KEY (case_id) REFERENCES recovery_cases(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_recovery_evidences_employee') THEN
    ALTER TABLE recovery_evidences ADD CONSTRAINT fk_recovery_evidences_employee FOREIGN KEY (captured_by) REFERENCES employees(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_commissions_case') THEN
    ALTER TABLE commissions ADD CONSTRAINT fk_commissions_case FOREIGN KEY (case_id) REFERENCES recovery_cases(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_commissions_employee') THEN
    ALTER TABLE commissions ADD CONSTRAINT fk_commissions_employee FOREIGN KEY (employee_id) REFERENCES employees(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_commissions_partner') THEN
    ALTER TABLE commissions ADD CONSTRAINT fk_commissions_partner FOREIGN KEY (partner_id) REFERENCES partners(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_notifications_employee') THEN
    ALTER TABLE notifications ADD CONSTRAINT fk_notifications_employee FOREIGN KEY (recipient_id) REFERENCES employees(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_reports_case') THEN
    ALTER TABLE reports ADD CONSTRAINT fk_reports_case FOREIGN KEY (case_id) REFERENCES recovery_cases(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_reports_employee') THEN
    ALTER TABLE reports ADD CONSTRAINT fk_reports_employee FOREIGN KEY (generated_by) REFERENCES employees(id);
  END IF;
END $$;

-- =============================================
-- 5. INDEXES (after tables)
-- =============================================
CREATE INDEX IF NOT EXISTS idx_recovery_cases_partner_id ON recovery_cases(partner_id);
CREATE INDEX IF NOT EXISTS idx_recovery_cases_status ON recovery_cases(status);
CREATE INDEX IF NOT EXISTS idx_recovery_cases_province ON recovery_cases(province);
CREATE INDEX IF NOT EXISTS idx_case_assignments_case_id ON case_assignments(case_id);
CREATE INDEX IF NOT EXISTS idx_recovery_evidences_case_id ON recovery_evidences(case_id);
CREATE INDEX IF NOT EXISTS idx_commissions_case_id ON commissions(case_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox_messages(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);

-- =============================================
-- 6. VIEWS (after FKs)
-- =============================================
CREATE OR REPLACE VIEW recovery_case_summary AS
SELECT 
    rc.id,
    rc.contract_number,
    rc.status,
    rc.province,
    p.name AS partner_name,
    e.full_name AS assigned_employee,
    rc.amount_due,
    rc.created_at
FROM recovery_cases rc
LEFT JOIN partners p ON p.id = rc.partner_id
LEFT JOIN employees e ON e.id = rc.assigned_employee_id;

-- =============================================
-- 7. MATERIALIZED VIEWS (after Views)
-- =============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_kpi_summary AS
SELECT 
    COUNT(*) FILTER (WHERE status IN ('NEW', 'ASSIGNED', 'IN_PROGRESS')) AS open_cases,
    COUNT(*) FILTER (WHERE status = 'CLOSED_SUCCESSFUL') AS successful_closures,
    SUM(amount_due) AS total_outstanding,
    COUNT(DISTINCT partner_id) AS active_partners
FROM recovery_cases;

CREATE INDEX IF NOT EXISTS idx_mv_kpi_summary ON mv_kpi_summary (open_cases);

-- =============================================
-- 8. TRIGGERS (after Tables)
-- =============================================
DROP TRIGGER IF EXISTS update_recovery_cases_updated_at ON recovery_cases;
CREATE TRIGGER update_recovery_cases_updated_at
BEFORE UPDATE ON recovery_cases
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS audit_recovery_cases ON recovery_cases;
CREATE TRIGGER audit_recovery_cases
AFTER INSERT OR UPDATE OR DELETE ON recovery_cases
FOR EACH ROW EXECUTE FUNCTION log_audit();

DROP TRIGGER IF EXISTS audit_commissions ON commissions;
CREATE TRIGGER audit_commissions
AFTER INSERT OR UPDATE OR DELETE ON commissions
FOR EACH ROW EXECUTE FUNCTION log_audit();

-- =============================================
-- 9. RLS POLICIES (after Tables)
-- =============================================
ALTER TABLE IF EXISTS partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS recovery_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS recovery_evidences ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS incidents ENABLE ROW LEVEL SECURITY;

-- Policies (recreated safely)
DROP POLICY IF EXISTS "partners_select_authenticated" ON partners;
CREATE POLICY "partners_select_authenticated" ON partners
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "employees_select_own_or_admin" ON employees;
CREATE POLICY "employees_select_own_or_admin" ON employees
FOR SELECT TO authenticated USING (user_id = auth.uid() OR role = 'ADMIN' OR role = 'EXECUTIVE');

DROP POLICY IF EXISTS "recovery_cases_select_assigned" ON recovery_cases;
CREATE POLICY "recovery_cases_select_assigned" ON recovery_cases
FOR SELECT TO authenticated USING (
    assigned_employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR partner_id IN (SELECT partner_id FROM employees WHERE user_id = auth.uid())
    OR (SELECT role FROM employees WHERE user_id = auth.uid()) IN ('ADMIN', 'EXECUTIVE', 'FINANCE')
);

DROP POLICY IF EXISTS "recovery_cases_update_field_admin" ON recovery_cases;
CREATE POLICY "recovery_cases_update_field_admin" ON recovery_cases
FOR UPDATE TO authenticated USING (
    (SELECT role FROM employees WHERE user_id = auth.uid()) IN ('ADMIN', 'FIELD')
    AND assigned_employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "evidences_select_assigned" ON recovery_evidences;
CREATE POLICY "evidences_select_assigned" ON recovery_evidences
FOR SELECT TO authenticated USING (
    case_id IN (SELECT id FROM recovery_cases WHERE assigned_employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()))
);

DROP POLICY IF EXISTS "evidences_insert_field" ON recovery_evidences;
CREATE POLICY "evidences_insert_field" ON recovery_evidences
FOR INSERT TO authenticated WITH CHECK (
    (SELECT role FROM employees WHERE user_id = auth.uid()) = 'FIELD'
);

DROP POLICY IF EXISTS "commissions_select_finance" ON commissions;
CREATE POLICY "commissions_select_finance" ON commissions
FOR SELECT TO authenticated USING (
    (SELECT role FROM employees WHERE user_id = auth.uid()) IN ('FINANCE', 'ADMIN', 'EXECUTIVE')
);

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications
FOR SELECT TO authenticated USING (recipient_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "feedback_select_all_authenticated" ON feedback;
CREATE POLICY "feedback_select_all_authenticated" ON feedback
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "feedback_insert_authenticated" ON feedback;
CREATE POLICY "feedback_insert_authenticated" ON feedback
FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "audit_logs_select_admin" ON audit_logs;
CREATE POLICY "audit_logs_select_admin" ON audit_logs
FOR SELECT TO authenticated USING ((SELECT role FROM employees WHERE user_id = auth.uid()) = 'ADMIN');

DROP POLICY IF EXISTS "deployments_select_admin" ON deployments;
CREATE POLICY "deployments_select_admin" ON deployments FOR SELECT TO authenticated USING ((SELECT role FROM employees WHERE user_id = auth.uid()) IN ('ADMIN', 'EXECUTIVE'));

DROP POLICY IF EXISTS "incidents_select_all" ON incidents;
CREATE POLICY "incidents_select_all" ON incidents FOR SELECT TO authenticated USING (true);

-- =============================================
-- 10. STORAGE SQL (after Schema)
-- =============================================
-- Note: Buckets should be created via Supabase Dashboard or `supabase storage create`
-- Policies for storage.objects

DROP POLICY IF EXISTS "evidence_upload_field" ON storage.objects;
CREATE POLICY "evidence_upload_field" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'evidence' AND
    (SELECT role FROM employees WHERE user_id = auth.uid()) = 'FIELD'
);

DROP POLICY IF EXISTS "evidence_select_assigned" ON storage.objects;
CREATE POLICY "evidence_select_assigned" ON storage.objects
FOR SELECT TO authenticated USING (
    bucket_id = 'evidence' AND
    auth.uid() IN (SELECT user_id FROM employees WHERE id IN (SELECT captured_by FROM recovery_evidences))
);

DROP POLICY IF EXISTS "documents_select_assigned" ON storage.objects;
CREATE POLICY "documents_select_assigned" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "reports_select_finance_admin" ON storage.objects;
CREATE POLICY "reports_select_finance_admin" ON storage.objects
FOR SELECT TO authenticated USING (
    bucket_id = 'reports' AND
    (SELECT role FROM employees WHERE user_id = auth.uid()) IN ('FINANCE', 'ADMIN', 'EXECUTIVE')
);

DROP POLICY IF EXISTS "exports_select_own" ON storage.objects;
CREATE POLICY "exports_select_own" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'exports');

DROP POLICY IF EXISTS "profile_images_public_read" ON storage.objects;
CREATE POLICY "profile_images_public_read" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'profile-images');

DROP POLICY IF EXISTS "profile_images_upload_authenticated" ON storage.objects;
CREATE POLICY "profile_images_upload_authenticated" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'profile-images' AND owner = auth.uid());

-- =============================================
-- 11. REFERENCE SEED (after all schema)
-- =============================================
-- Partners (25) - use ON CONFLICT
INSERT INTO partners (id, name, tax_id, contact_email, status) VALUES
('11111111-1111-1111-1111-111111111111', 'Alpha Partners Co., Ltd.', '0105551234567', 'contact@alphapartners.co.th', 'ACTIVE'),
('22222222-2222-2222-2222-222222222222', 'Beta Recovery Services', '0105552345678', 'info@betarecovery.co.th', 'ACTIVE'),
('33333333-3333-3333-3333-333333333333', 'Gamma Financial Group', '0105553456789', 'support@gammagroup.co.th', 'ACTIVE'),
('44444444-4444-4444-4444-444444444444', 'Delta Credit Solutions', '0105554567890', 'hello@deltacredit.co.th', 'ACTIVE'),
('55555555-5555-5555-5555-555555555555', 'Epsilon Asset Management', '0105555678901', 'team@epsilon.co.th', 'ACTIVE'),
('66666666-6666-6666-6666-666666666666', 'Zeta Partners Thailand', '0105556789012', 'contact@zetathailand.co.th', 'ACTIVE'),
('77777777-7777-7777-7777-777777777777', 'Eta Recovery Experts', '0105557890123', 'info@etaexperts.co.th', 'ACTIVE'),
('88888888-8888-8888-8888-888888888888', 'Theta Finance Corp', '0105558901234', 'support@thetafinance.co.th', 'ACTIVE'),
('99999999-9999-9999-9999-999999999999', 'Iota Credit Agency', '0105559012345', 'hello@iota.co.th', 'ACTIVE'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Kappa Solutions Ltd', '0105550123456', 'contact@kappa.co.th', 'ACTIVE'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Lambda Partners', '0105551234568', 'info@lambdapartners.co.th', 'ACTIVE'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Mu Recovery Services', '0105552345679', 'support@murecovery.co.th', 'ACTIVE'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Nu Financial', '0105553456780', 'team@nu.co.th', 'ACTIVE'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Xi Credit Group', '0105554567891', 'info@xi.co.th', 'ACTIVE'),
('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Omicron Partners', '0105555678902', 'contact@omicron.co.th', 'ACTIVE'),
('10101010-1010-1010-1010-101010101010', 'Pi Asset Recovery', '0105556789013', 'hello@pi.co.th', 'ACTIVE'),
('20202020-2020-2020-2020-202020202020', 'Rho Finance', '0105557890124', 'support@rho.co.th', 'ACTIVE'),
('30303030-3030-3030-3030-303030303030', 'Sigma Solutions', '0105558901235', 'info@sigma.co.th', 'ACTIVE'),
('40404040-4040-4040-4040-404040404040', 'Tau Credit', '0105559012346', 'contact@tau.co.th', 'ACTIVE'),
('50505050-5050-5050-5050-505050505050', 'Upsilon Partners', '0105550123457', 'team@upsilon.co.th', 'ACTIVE'),
('60606060-6060-6060-6060-606060606060', 'Phi Recovery', '0105551234569', 'support@phi.co.th', 'ACTIVE'),
('70707070-7070-7070-7070-707070707070', 'Chi Financial', '0105552345670', 'info@chi.co.th', 'ACTIVE'),
('80808080-8080-8080-8080-808080808080', 'Psi Asset Management', '0105553456781', 'hello@psi.co.th', 'ACTIVE'),
('90909090-9090-9090-9090-909090909090', 'Omega Group Thailand', '0105554567892', 'contact@omega.co.th', 'ACTIVE'),
('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a0a0a0', 'Final Partners Ltd', '0105555678903', 'team@final.co.th', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- Employees (50) - simplified DO block (after partners)
DO $$
DECLARE
  i INT;
  pid UUID;
  r TEXT;
BEGIN
  FOR i IN 1..50 LOOP
    pid := (SELECT id FROM partners ORDER BY random() LIMIT 1);
    r := CASE (i % 7) 
      WHEN 0 THEN 'ADMIN'
      WHEN 1 THEN 'FIELD'
      WHEN 2 THEN 'FINANCE'
      WHEN 3 THEN 'CSR'
      WHEN 4 THEN 'PARTNER'
      WHEN 5 THEN 'EXECUTIVE'
      ELSE 'SYSTEM' END;
    INSERT INTO employees (id, full_name, email, phone, role, partner_id, status)
    VALUES (
      ('e' || LPAD(i::text, 7, '0') || '-0000-0000-0000-000000000000')::uuid,
      'Employee ' || i,
      'emp' || i || '@paysave-demo.co.th',
      '08' || LPAD(i::text, 7, '0'),
      r,
      pid,
      'ACTIVE'
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;

-- Recovery Cases (1200)
INSERT INTO recovery_cases (id, contract_number, partner_id, assigned_employee_id, status, priority, amount_due, province, description)
SELECT 
  ('c' || LPAD(s::text, 7, '0') || '-0000-0000-0000-000000000000')::uuid,
  'RC' || LPAD(s::text, 7, '0'),
  (SELECT id FROM partners ORDER BY random() LIMIT 1),
  (SELECT id FROM employees WHERE role = 'FIELD' ORDER BY random() LIMIT 1),
  (ARRAY['NEW','ASSIGNED','IN_PROGRESS','RESOLVED','CLOSED_SUCCESSFUL'])[1 + (s % 5)],
  (ARRAY['LOW','MEDIUM','HIGH','CRITICAL'])[1 + (s % 4)],
  (random() * 150000 + 5000)::numeric(15,2),
  (ARRAY['Bangkok', 'Chiang Mai', 'Phuket', 'Khon Kaen', 'Nakhon Ratchasima', 'Udon Thani', 'Chonburi', 'Rayong', 'Songkhla', 'Surat Thani'])[1 + (s % 10)],
  'Demo recovery case #' || s
FROM generate_series(1,1200) s
ON CONFLICT (id) DO NOTHING;

-- Commissions (300)
INSERT INTO commissions (case_id, employee_id, partner_id, amount, status)
SELECT 
  (SELECT id FROM recovery_cases ORDER BY random() LIMIT 1),
  (SELECT id FROM employees WHERE role = 'FIELD' ORDER BY random() LIMIT 1),
  (SELECT id FROM partners ORDER BY random() LIMIT 1),
  (random() * 15000 + 1000)::numeric(15,2),
  (ARRAY['PENDING','PAID'])[1 + (s % 2)]
FROM generate_series(1,300) s
ON CONFLICT (id) DO NOTHING;

-- Notifications (400)
INSERT INTO notifications (recipient_id, type, title, message, status)
SELECT 
  (SELECT id FROM employees ORDER BY random() LIMIT 1),
  (ARRAY['CASE_ASSIGNED','PAYMENT_RECEIVED','SLA_ALERT','FEEDBACK_RECEIVED'])[1 + (s % 4)],
  'Notification ' || s,
  'Demo notification message for case activity.',
  'PENDING'
FROM generate_series(1,400) s
ON CONFLICT (id) DO NOTHING;

-- Reports (150)
INSERT INTO reports (case_id, type, content, generated_by)
SELECT 
  (SELECT id FROM recovery_cases ORDER BY random() LIMIT 1),
  (ARRAY['MONTHLY','SLA','COMMISSION','SUMMARY'])[1 + (s % 4)],
  '{"summary": "Demo report content"}'::jsonb,
  (SELECT id FROM employees WHERE role IN ('ADMIN','FINANCE') ORDER BY random() LIMIT 1)
FROM generate_series(1,150) s
ON CONFLICT (id) DO NOTHING;

-- Feedback (100)
INSERT INTO feedback (category, priority, title, description, status, user_role)
SELECT 
  (ARRAY['BUG','FEATURE_REQUEST','IMPROVEMENT','QUESTION'])[1 + (s % 4)],
  (ARRAY['LOW','MEDIUM','HIGH','CRITICAL'])[1 + (s % 4)],
  'Feedback item ' || s,
  'This is a demo feedback entry from pilot testing.',
  'NEW',
  (ARRAY['FIELD','PARTNER','ADMIN'])[1 + (s % 3)]
FROM generate_series(1,100) s
ON CONFLICT (id) DO NOTHING;

COMMIT;