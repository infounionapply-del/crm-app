-- Fix missing columns for frontend logic
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS details JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::jsonb;

-- Relax restrictions that are blocking the frontend saves
ALTER TABLE public.quotations ALTER COLUMN price_list_id DROP NOT NULL;
ALTER TABLE public.jobs ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.quotations ALTER COLUMN created_by DROP NOT NULL;
