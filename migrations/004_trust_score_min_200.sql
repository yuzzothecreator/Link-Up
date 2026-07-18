-- Lower all marketplace product Trust Score gates to 200.
-- Run in Supabase SQL Editor if products were already seeded with higher scores.

UPDATE public.loan_products
SET required_trust_score = 200
WHERE required_trust_score > 200;
