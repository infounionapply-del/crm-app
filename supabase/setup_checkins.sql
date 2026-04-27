-- 1. Create check_ins table
DROP TABLE IF EXISTS public.check_ins CASCADE;

CREATE TABLE public.check_ins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    sales_rep_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    gps_location TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can access check-ins" ON public.check_ins FOR ALL USING (auth.role() = 'authenticated');

-- 2. Configure Supabase Realtime
-- Drop and recreate the realtime publication to include our core tables
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;

ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quotations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.approvals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.check_ins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales_targets;

-- Set replica identity to full so we get OLD and NEW records in realtime payloads
ALTER TABLE public.jobs REPLICA IDENTITY FULL;
ALTER TABLE public.quotations REPLICA IDENTITY FULL;
ALTER TABLE public.approvals REPLICA IDENTITY FULL;
ALTER TABLE public.customers REPLICA IDENTITY FULL;
ALTER TABLE public.check_ins REPLICA IDENTITY FULL;
