ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS cancel_reason text;
ALTER TABLE public.expenses DROP COLUMN IF EXISTS is_active;
