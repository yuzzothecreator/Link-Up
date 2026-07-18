-- Password auth for daily login (OTP still used for phone proof + reset).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS password_hash TEXT;
