-- Run in Supabase SQL Editor after deploying identity + statement features.

-- NIDA verification fields on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nida_normalized TEXT,
  ADD COLUMN IF NOT EXISTS nida_verification_status TEXT NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS nida_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS nida_provider_ref TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_nida_normalized_unique
  ON public.profiles (nida_normalized)
  WHERE nida_normalized IS NOT NULL;

-- Statement imports + scanned rows (separate from wallet transactions)
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

CREATE INDEX IF NOT EXISTS imported_transactions_user_date_idx
  ON public.imported_transactions (user_id, record_date DESC);

ALTER TABLE public.statement_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imported_transactions ENABLE ROW LEVEL SECURITY;
