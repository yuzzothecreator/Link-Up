-- Drop existing views if any
DROP VIEW IF EXISTS public.business_profiles CASCADE;
DROP VIEW IF EXISTS public.financial_profiles CASCADE;

-- 1. profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  phone TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'borrower',
  is_phone_verified BOOLEAN NOT NULL DEFAULT false,
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  onboarding_step TEXT NOT NULL DEFAULT 'kyc',
  date_of_birth TEXT,
  gender TEXT,
  nida_number TEXT,
  region TEXT,
  district TEXT,
  business_name TEXT,
  business_type TEXT,
  business_location TEXT,
  years_in_operation INTEGER,
  daily_income NUMERIC,
  mobile_money_provider TEXT,
  mobile_money_number TEXT,
  bank_account TEXT,
  nida_normalized TEXT,
  nida_verification_status TEXT NOT NULL DEFAULT 'unverified',
  nida_verified_at TIMESTAMPTZ,
  nida_provider_ref TEXT,
  password_hash TEXT
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nida_normalized TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nida_verification_status TEXT DEFAULT 'unverified';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nida_verified_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nida_provider_ref TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 2. otp_codes Table
CREATE TABLE IF NOT EXISTS public.otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  full_name TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed BOOLEAN NOT NULL DEFAULT false,
  attempts INTEGER NOT NULL DEFAULT 0
);

-- 3. wallets Table
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  balance NUMERIC NOT NULL DEFAULT 0
);

-- 4. trust_scores Table
CREATE TABLE IF NOT EXISTS public.trust_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  score INTEGER NOT NULL,
  risk_level TEXT NOT NULL,
  breakdown JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. groups Table
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  invite_code TEXT UNIQUE NOT NULL
);

-- 6. loans Table
CREATE TABLE IF NOT EXISTS public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  borrower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  term_days INTEGER NOT NULL,
  purpose TEXT NOT NULL,
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  interest_rate NUMERIC NOT NULL,
  interest_amount NUMERIC NOT NULL,
  total_repayment NUMERIC NOT NULL,
  amount_repaid NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
);

-- 7. transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reference TEXT UNIQUE,
  provider_ref TEXT,
  description TEXT
);

-- Existing databases: ensure provider_ref exists
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS provider_ref TEXT;

-- 8. documents Table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  reference TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  verified_at TIMESTAMPTZ
);

-- 9. notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'sms',
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL
);

-- 10. assets Table
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  estimated_value NUMERIC NOT NULL,
  proof_document_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
);

-- 11. financial_records Table
CREATE TABLE IF NOT EXISTS public.financial_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  record_type TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  record_date DATE NOT NULL
);

-- 12. group_members Table
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'active'
);

-- 13. group_wallets Table
CREATE TABLE IF NOT EXISTS public.group_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE UNIQUE NOT NULL,
  balance NUMERIC NOT NULL DEFAULT 0
);

-- 14. business_profiles View
CREATE OR REPLACE VIEW public.business_profiles AS
SELECT 
  id as id,
  id as user_id, 
  business_type, 
  business_location as location, 
  daily_income, 
  business_name 
FROM public.profiles;

-- 15. financial_profiles View
CREATE OR REPLACE VIEW public.financial_profiles AS
SELECT 
  id as id,
  id as user_id, 
  mobile_money_provider, 
  mobile_money_number, 
  bank_account 
FROM public.profiles;

-- Enable RLS & RLS policies
-- Note: In this application, actions run through service role client which bypasses RLS.
-- However, we still configure RLS to keep the schema clean.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_wallets ENABLE ROW LEVEL SECURITY;

-- Statement imports (mobile money / bank CSV scanning)
CREATE TABLE IF NOT EXISTS public.statement_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL,
  file_name TEXT,
  status TEXT NOT NULL DEFAULT 'processed',
  row_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  error TEXT
);

CREATE TABLE IF NOT EXISTS public.imported_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  import_id UUID REFERENCES public.statement_imports(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,
  record_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  reference TEXT,
  raw_hash TEXT NOT NULL,
  UNIQUE (user_id, raw_hash)
);

ALTER TABLE public.statement_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imported_transactions ENABLE ROW LEVEL SECURITY;
