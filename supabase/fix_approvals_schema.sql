-- Add missing columns to approvals table (without foreign key to avoid auth sync issues)
ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS comments TEXT;

-- Drop foreign key constraint if it was already created
ALTER TABLE public.approvals DROP CONSTRAINT IF EXISTS approvals_approved_by_fkey;

-- Add missing columns to quotations table (without foreign key to avoid auth sync issues)
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS approved_by UUID;

-- Drop foreign key constraint if it was already created
ALTER TABLE public.quotations DROP CONSTRAINT IF EXISTS quotations_approved_by_fkey;
