-- Seed script for trustLink sample credentials

-- Clean up existing seed data if any
DELETE FROM public.trust_scores WHERE user_id IN ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33');
DELETE FROM public.wallets WHERE user_id IN ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33');
DELETE FROM public.profiles WHERE id IN ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33');

-- 1. Create Profiles
INSERT INTO public.profiles (
  id, 
  phone, 
  full_name, 
  role, 
  is_phone_verified,
  onboarding_complete, 
  onboarding_step,
  business_name,
  business_type,
  business_location,
  years_in_operation,
  daily_income,
  mobile_money_provider,
  mobile_money_number,
  nida_number
) VALUES 
-- Admin Profile
(
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  '+255711111111',
  'Admin User',
  'admin',
  true,
  true,
  'complete',
  'TrustLink Admin Corp',
  'Services',
  'Dar es Salaam',
  5,
  150000,
  'mpesa',
  '+255711111111',
  '19900101-12345-00001-11'
),
-- Borrower Profile
(
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  '+255722222222',
  'Borrower User',
  'borrower',
  true,
  true,
  'complete',
  'Mangi General Store',
  'Retail',
  'Arusha',
  3,
  75000,
  'tigopesa',
  '+255722222222',
  '19930505-12345-00002-22'
),
-- Lender Profile
(
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  '+255733333333',
  'Lender User',
  'lender',
  true,
  true,
  'complete',
  'Biashara Capital',
  'Finance',
  'Mwanza',
  10,
  500000,
  'airtelmoney',
  '+255733333333',
  '19850808-12345-00003-33'
);

-- 2. Create Wallets
INSERT INTO public.wallets (user_id, balance) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 1000000), -- Admin starts with 1,000,000 TZS
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 5000),     -- Borrower starts with 5,000 TZS
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 5000000);  -- Lender starts with 5,000,000 TZS

-- 3. Create Trust Scores
INSERT INTO public.trust_scores (user_id, score, risk_level, breakdown) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 950, 'low', '{"savings": 95, "documents": 95, "repayment": 95, "accountAge": 95, "transactions": 95}'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 550, 'medium', '{"savings": 50, "documents": 60, "repayment": 70, "accountAge": 40, "transactions": 50}'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 850, 'low', '{"savings": 85, "documents": 90, "repayment": 80, "accountAge": 90, "transactions": 85}');
