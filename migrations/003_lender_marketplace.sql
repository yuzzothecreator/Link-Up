-- Link-Up multi-provider lending marketplace
-- Run once in Supabase SQL Editor after migrations 001 and 002.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('borrower', 'lender', 'admin'));

CREATE TABLE IF NOT EXISTS public.provider_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  provider_type TEXT NOT NULL
    CHECK (provider_type IN ('bank', 'telecom', 'microfinance', 'sacco', 'fintech')),
  license_number TEXT,
  logo_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'suspended')),
  UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS public.provider_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  organization_id UUID NOT NULL
    REFERENCES public.provider_organizations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL
    CHECK (role IN ('organization_admin', 'underwriter', 'viewer', 'auditor')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('invited', 'active', 'suspended')),
  UNIQUE (organization_id, profile_id)
);

CREATE TABLE IF NOT EXISTS public.loan_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  organization_id UUID NOT NULL
    REFERENCES public.provider_organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  min_amount NUMERIC NOT NULL CHECK (min_amount > 0),
  max_amount NUMERIC NOT NULL CHECK (max_amount >= min_amount),
  min_term_days INTEGER NOT NULL CHECK (min_term_days > 0),
  max_term_days INTEGER NOT NULL CHECK (max_term_days >= min_term_days),
  base_interest_rate NUMERIC NOT NULL CHECK (base_interest_rate >= 0),
  required_trust_score INTEGER NOT NULL DEFAULT 200
    CHECK (required_trust_score BETWEEN 0 AND 1000),
  required_scopes TEXT[] NOT NULL DEFAULT ARRAY[
    'identity.summary',
    'trust_score.summary',
    'cashflow.aggregates',
    'loan_history'
  ],
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'paused', 'retired')),
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS public.loan_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  borrower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL
    REFERENCES public.provider_organizations(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES public.loan_products(id) ON DELETE RESTRICT,
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  term_days INTEGER NOT NULL CHECK (term_days > 0),
  purpose TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN (
      'draft', 'submitted', 'under_review', 'offered', 'accepted',
      'rejected', 'withdrawn', 'expired', 'funded'
    )),
  trust_score_snapshot INTEGER,
  risk_level_snapshot TEXT,
  decided_at TIMESTAMPTZ,
  decided_by UUID REFERENCES public.profiles(id)
);

CREATE TABLE IF NOT EXISTS public.customer_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  borrower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL
    REFERENCES public.provider_organizations(id) ON DELETE CASCADE,
  application_id UUID NOT NULL
    REFERENCES public.loan_applications(id) ON DELETE CASCADE,
  scopes TEXT[] NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'loan underwriting',
  status TEXT NOT NULL DEFAULT 'granted'
    CHECK (status IN ('granted', 'revoked', 'expired')),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '90 days'),
  revoked_at TIMESTAMPTZ,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (borrower_id, organization_id, application_id)
);

CREATE TABLE IF NOT EXISTS public.lender_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  application_id UUID NOT NULL
    REFERENCES public.loan_applications(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL
    REFERENCES public.provider_organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  term_days INTEGER NOT NULL CHECK (term_days > 0),
  interest_rate NUMERIC NOT NULL CHECK (interest_rate >= 0),
  fees NUMERIC NOT NULL DEFAULT 0 CHECK (fees >= 0),
  total_repayment NUMERIC NOT NULL CHECK (total_repayment >= amount),
  conditions TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'withdrawn')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.financial_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  connection_type TEXT NOT NULL CHECK (connection_type IN ('bank', 'mobile_money')),
  provider TEXT NOT NULL,
  account_mask TEXT,
  access_mode TEXT NOT NULL DEFAULT 'statement_upload'
    CHECK (access_mode IN ('statement_upload', 'provider_api')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending', 'active', 'revoked', 'error')),
  last_synced_at TIMESTAMPTZ,
  consent_expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.data_access_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_profile_id UUID REFERENCES public.profiles(id),
  organization_id UUID REFERENCES public.provider_organizations(id),
  borrower_id UUID REFERENCES public.profiles(id),
  application_id UUID REFERENCES public.loan_applications(id),
  action TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS application_id UUID
    REFERENCES public.loan_applications(id),
  ADD COLUMN IF NOT EXISTS organization_id UUID
    REFERENCES public.provider_organizations(id),
  ADD COLUMN IF NOT EXISTS product_id UUID
    REFERENCES public.loan_products(id);

CREATE INDEX IF NOT EXISTS provider_members_profile_idx
  ON public.provider_members(profile_id, status);
CREATE INDEX IF NOT EXISTS loan_applications_borrower_idx
  ON public.loan_applications(borrower_id, created_at DESC);
CREATE INDEX IF NOT EXISTS loan_applications_org_idx
  ON public.loan_applications(organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS consents_application_idx
  ON public.customer_consents(application_id, status);
CREATE INDEX IF NOT EXISTS audit_borrower_idx
  ON public.data_access_audit(borrower_id, occurred_at DESC);

ALTER TABLE public.provider_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lender_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_access_audit ENABLE ROW LEVEL SECURITY;

-- Seed representative products. Replace license numbers/details with contracted providers.
INSERT INTO public.provider_organizations (name, provider_type, status)
VALUES
  ('Link-Up Partner Bank', 'bank', 'active'),
  ('Link-Up Mobile Finance', 'telecom', 'active'),
  ('Link-Up SME Microfinance', 'microfinance', 'active')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.loan_products (
  organization_id, name, description, min_amount, max_amount,
  min_term_days, max_term_days, base_interest_rate, required_trust_score
)
SELECT id, 'SME Working Capital', 'Short-term working capital for verified small businesses.',
       50000, 5000000, 30, 365, 12, 200
FROM public.provider_organizations WHERE name = 'Link-Up Partner Bank'
ON CONFLICT (organization_id, name) DO NOTHING;

INSERT INTO public.loan_products (
  organization_id, name, description, min_amount, max_amount,
  min_term_days, max_term_days, base_interest_rate, required_trust_score
)
SELECT id, 'Mobile Business Advance', 'Fast mobile-money based business advance.',
       10000, 1000000, 7, 90, 15, 200
FROM public.provider_organizations WHERE name = 'Link-Up Mobile Finance'
ON CONFLICT (organization_id, name) DO NOTHING;

INSERT INTO public.loan_products (
  organization_id, name, description, min_amount, max_amount,
  min_term_days, max_term_days, base_interest_rate, required_trust_score
)
SELECT id, 'Micro Enterprise Loan', 'Flexible finance for micro and small enterprises.',
       20000, 3000000, 14, 180, 14, 200
FROM public.provider_organizations WHERE name = 'Link-Up SME Microfinance'
ON CONFLICT (organization_id, name) DO NOTHING;

-- Attach existing seeded lender profiles to the first organization for development.
INSERT INTO public.provider_members (organization_id, profile_id, role, status)
SELECT o.id, p.id, 'underwriter', 'active'
FROM public.provider_organizations o
JOIN public.profiles p ON p.role = 'lender'
WHERE o.name = 'Link-Up Partner Bank'
ON CONFLICT (organization_id, profile_id) DO NOTHING;
