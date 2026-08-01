-- 20260801_000002_rls.sql
-- RLS Policies for PAYSAVE OS

-- Enable RLS
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_evidences ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- Policies

-- Partners: authenticated can read
CREATE POLICY "partners_select_authenticated" ON partners
FOR SELECT TO authenticated USING (true);

-- Employees: users can see their own or admin
CREATE POLICY "employees_select_own_or_admin" ON employees
FOR SELECT TO authenticated USING (user_id = auth.uid() OR role = 'ADMIN' OR role = 'EXECUTIVE');

-- Recovery Cases
CREATE POLICY "recovery_cases_select_assigned" ON recovery_cases
FOR SELECT TO authenticated USING (
    assigned_employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR partner_id IN (SELECT partner_id FROM employees WHERE user_id = auth.uid())
    OR (SELECT role FROM employees WHERE user_id = auth.uid()) IN ('ADMIN', 'EXECUTIVE', 'FINANCE')
);

CREATE POLICY "recovery_cases_update_field_admin" ON recovery_cases
FOR UPDATE TO authenticated USING (
    (SELECT role FROM employees WHERE user_id = auth.uid()) IN ('ADMIN', 'FIELD')
    AND assigned_employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
);

-- Evidences
CREATE POLICY "evidences_select_assigned" ON recovery_evidences
FOR SELECT TO authenticated USING (
    case_id IN (SELECT id FROM recovery_cases WHERE assigned_employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()))
);

CREATE POLICY "evidences_insert_field" ON recovery_evidences
FOR INSERT TO authenticated WITH CHECK (
    (SELECT role FROM employees WHERE user_id = auth.uid()) = 'FIELD'
);

-- Commissions
CREATE POLICY "commissions_select_finance" ON commissions
FOR SELECT TO authenticated USING (
    (SELECT role FROM employees WHERE user_id = auth.uid()) IN ('FINANCE', 'ADMIN', 'EXECUTIVE')
);

-- Notifications
CREATE POLICY "notifications_select_own" ON notifications
FOR SELECT TO authenticated USING (recipient_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

-- Feedback
CREATE POLICY "feedback_select_all_authenticated" ON feedback
FOR SELECT TO authenticated USING (true);

CREATE POLICY "feedback_insert_authenticated" ON feedback
FOR INSERT TO authenticated WITH CHECK (true);

-- Audit logs read only for admin
CREATE POLICY "audit_logs_select_admin" ON audit_logs
FOR SELECT TO authenticated USING ((SELECT role FROM employees WHERE user_id = auth.uid()) = 'ADMIN');

-- Go Live tables
CREATE POLICY "deployments_select_admin" ON deployments FOR SELECT TO authenticated USING ((SELECT role FROM employees WHERE user_id = auth.uid()) IN ('ADMIN', 'EXECUTIVE'));
CREATE POLICY "incidents_select_all" ON incidents FOR SELECT TO authenticated USING (true);