-- Run this once in the Supabase SQL Editor (Dashboard → SQL)
-- Adds Tembo provider transaction id storage for deposits.

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS provider_ref TEXT;
