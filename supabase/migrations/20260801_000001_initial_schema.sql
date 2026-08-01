-- 20260801_000001_initial_schema.sql
-- PAYSAVE OS Production Supabase Migration
-- Full schema based on domain models

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Functions
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

-- Tables
CREATE TABLE partners (
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

CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    partner_id UUID REFERENCES partners(id),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('EXECUTIVE', 'ADMIN', 'PARTNER', 'FIELD', 'FINANCE', 'CSR', 'SYSTEM')),
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE recovery_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_number TEXT NOT NULL UNIQUE,
    partner_id UUID NOT NULL REFERENCES partners(id),
    assigned_employee_id UUID REFERENCES employees(id),
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

CREATE TABLE case_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES recovery_cases(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    status TEXT DEFAULT 'PENDING'
);

CREATE TABLE recovery_evidences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES recovery_cases(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('PHOTO_REFERENCE', 'DOCUMENT_REFERENCE', 'NOTE', 'RECEIPT_REFERENCE')),
    description TEXT,
    reference TEXT,
    captured_at TIMESTAMPTZ,
    captured_by UUID REFERENCES employees(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES recovery_cases(id),
    employee_id UUID REFERENCES employees(id),
    partner_id UUID REFERENCES partners(id),
    amount NUMERIC(15,2) NOT NULL,
    status TEXT DEFAULT 'PENDING',
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID REFERENCES employees(id),
    type TEXT NOT NULL,
    title TEXT,
    message TEXT,
    status TEXT DEFAULT 'PENDING',
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES recovery_cases(id),
    type TEXT,
    content JSONB,
    generated_by UUID REFERENCES employees(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE feedback (
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

CREATE TABLE outbox_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aggregate_type TEXT NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'PENDING'
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL,
    actor_id UUID,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE deployments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version TEXT,
    environment TEXT,
    status TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    deployed_by UUID
);

CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status TEXT DEFAULT 'OPEN',
    owner_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Triggers
CREATE TRIGGER update_recovery_cases_updated_at
BEFORE UPDATE ON recovery_cases
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER audit_recovery_cases
AFTER INSERT OR UPDATE OR DELETE ON recovery_cases
FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER audit_commissions
AFTER INSERT OR UPDATE OR DELETE ON commissions
FOR EACH ROW EXECUTE FUNCTION log_audit();

-- Indexes
CREATE INDEX idx_recovery_cases_partner_id ON recovery_cases(partner_id);
CREATE INDEX idx_recovery_cases_status ON recovery_cases(status);
CREATE INDEX idx_recovery_cases_province ON recovery_cases(province);
CREATE INDEX idx_case_assignments_case_id ON case_assignments(case_id);
CREATE INDEX idx_recovery_evidences_case_id ON recovery_evidences(case_id);
CREATE INDEX idx_commissions_case_id ON commissions(case_id);
CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX idx_outbox_status ON outbox_messages(status);
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);

-- Views
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

-- Materialized View for KPIs
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_kpi_summary AS
SELECT 
    COUNT(*) FILTER (WHERE status IN ('NEW', 'ASSIGNED', 'IN_PROGRESS')) AS open_cases,
    COUNT(*) FILTER (WHERE status = 'CLOSED_SUCCESSFUL') AS successful_closures,
    SUM(amount_due) AS total_outstanding,
    COUNT(DISTINCT partner_id) AS active_partners
FROM recovery_cases;

CREATE INDEX idx_mv_kpi_summary ON mv_kpi_summary (open_cases);