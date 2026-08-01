-- 20260801_000004_seed_reference.sql
-- Reference seed data for Supabase (apply after schema)

-- Partners (25)
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
('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a0a0a0', 'Final Partners Ltd', '0105555678903', 'team@final.co.th', 'ACTIVE');

-- Employees (50) - simplified for demo
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
      ('e' || LPAD(i::text, 8, '0') || '-0000-0000-0000-000000000000')::uuid,
      'Employee ' || i,
      'emp' || i || '@paysave-demo.co.th',
      '08' || LPAD(i::text, 8, '0'),
      r,
      pid,
      'ACTIVE'
    );
  END LOOP;
END $$;

-- Recovery Cases (1200)
INSERT INTO recovery_cases (id, contract_number, partner_id, assigned_employee_id, status, priority, amount_due, province, description)
SELECT 
  ('c' || LPAD(s::text, 8, '0') || '-0000-0000-0000-000000000000')::uuid,
  'RC' || LPAD(s::text, 7, '0'),
  (SELECT id FROM partners ORDER BY random() LIMIT 1),
  (SELECT id FROM employees WHERE role = 'FIELD' ORDER BY random() LIMIT 1),
  (ARRAY['NEW','ASSIGNED','IN_PROGRESS','RESOLVED','CLOSED_SUCCESSFUL'])[1 + (s % 5)],
  (ARRAY['LOW','MEDIUM','HIGH','CRITICAL'])[1 + (s % 4)],
  (random() * 150000 + 5000)::numeric(15,2),
  (ARRAY['Bangkok', 'Chiang Mai', 'Phuket', 'Khon Kaen', 'Nakhon Ratchasima', 'Udon Thani', 'Chonburi', 'Rayong', 'Songkhla', 'Surat Thani'])[1 + (s % 10)],
  'Demo recovery case #' || s
FROM generate_series(1,1200) s;

-- Commissions (300)
INSERT INTO commissions (case_id, employee_id, partner_id, amount, status)
SELECT 
  (SELECT id FROM recovery_cases ORDER BY random() LIMIT 1),
  (SELECT id FROM employees WHERE role = 'FIELD' ORDER BY random() LIMIT 1),
  (SELECT id FROM partners ORDER BY random() LIMIT 1),
  (random() * 15000 + 1000)::numeric(15,2),
  (ARRAY['PENDING','PAID'])[1 + (s % 2)]
FROM generate_series(1,300) s;

-- Notifications (400)
INSERT INTO notifications (recipient_id, type, title, message, status)
SELECT 
  (SELECT id FROM employees ORDER BY random() LIMIT 1),
  (ARRAY['CASE_ASSIGNED','PAYMENT_RECEIVED','SLA_ALERT','FEEDBACK_RECEIVED'])[1 + (s % 4)],
  'Notification ' || s,
  'Demo notification message for case activity.',
  'PENDING'
FROM generate_series(1,400) s;

-- Reports (150)
INSERT INTO reports (case_id, type, content, generated_by)
SELECT 
  (SELECT id FROM recovery_cases ORDER BY random() LIMIT 1),
  (ARRAY['MONTHLY','SLA','COMMISSION','SUMMARY'])[1 + (s % 4)],
  '{"summary": "Demo report content"}'::jsonb,
  (SELECT id FROM employees WHERE role IN ('ADMIN','FINANCE') ORDER BY random() LIMIT 1)
FROM generate_series(1,150) s;

-- Feedback (100)
INSERT INTO feedback (category, priority, title, description, status, user_role)
SELECT 
  (ARRAY['BUG','FEATURE_REQUEST','IMPROVEMENT','QUESTION'])[1 + (s % 4)],
  (ARRAY['LOW','MEDIUM','HIGH','CRITICAL'])[1 + (s % 4)],
  'Feedback item ' || s,
  'This is a demo feedback entry from pilot testing.',
  'NEW',
  (ARRAY['FIELD','PARTNER','ADMIN'])[1 + (s % 3)]
FROM generate_series(1,100) s;