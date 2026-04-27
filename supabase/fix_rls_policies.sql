-- Fix RLS Policies for Users to allow full management by authenticated users
-- Drop ALL policies we are about to create to avoid "already exists" errors
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "All authenticated users can view all users" ON public.users;
DROP POLICY IF EXISTS "All authenticated users can insert users" ON public.users;
DROP POLICY IF EXISTS "All authenticated users can update users" ON public.users;
DROP POLICY IF EXISTS "All authenticated users can delete users" ON public.users;

-- Create comprehensive policies for users
CREATE POLICY "All authenticated users can view all users" ON public.users FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "All authenticated users can insert users" ON public.users FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "All authenticated users can update users" ON public.users FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "All authenticated users can delete users" ON public.users FOR DELETE USING (auth.role() = 'authenticated');


-- Fix RLS Policies for Customers
DROP POLICY IF EXISTS "All authenticated users can view customers" ON public.customers;
DROP POLICY IF EXISTS "All authenticated users can insert customers" ON public.customers;
DROP POLICY IF EXISTS "All authenticated users can update customers" ON public.customers;
DROP POLICY IF EXISTS "All authenticated users can delete customers" ON public.customers;

CREATE POLICY "All authenticated users can view customers" ON public.customers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "All authenticated users can insert customers" ON public.customers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "All authenticated users can update customers" ON public.customers FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "All authenticated users can delete customers" ON public.customers FOR DELETE USING (auth.role() = 'authenticated');


-- Fix RLS Policies for Jobs
DROP POLICY IF EXISTS "Users can view jobs" ON public.jobs;
DROP POLICY IF EXISTS "All authenticated users can view jobs" ON public.jobs;
DROP POLICY IF EXISTS "All authenticated users can insert jobs" ON public.jobs;
DROP POLICY IF EXISTS "All authenticated users can update jobs" ON public.jobs;
DROP POLICY IF EXISTS "All authenticated users can delete jobs" ON public.jobs;

CREATE POLICY "All authenticated users can view jobs" ON public.jobs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "All authenticated users can insert jobs" ON public.jobs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "All authenticated users can update jobs" ON public.jobs FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "All authenticated users can delete jobs" ON public.jobs FOR DELETE USING (auth.role() = 'authenticated');


-- Fix RLS Policies for Quotations
DROP POLICY IF EXISTS "Users can view quotations" ON public.quotations;
DROP POLICY IF EXISTS "All authenticated users can view quotations" ON public.quotations;
DROP POLICY IF EXISTS "All authenticated users can insert quotations" ON public.quotations;
DROP POLICY IF EXISTS "All authenticated users can update quotations" ON public.quotations;
DROP POLICY IF EXISTS "All authenticated users can delete quotations" ON public.quotations;

CREATE POLICY "All authenticated users can view quotations" ON public.quotations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "All authenticated users can insert quotations" ON public.quotations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "All authenticated users can update quotations" ON public.quotations FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "All authenticated users can delete quotations" ON public.quotations FOR DELETE USING (auth.role() = 'authenticated');


-- Fix RLS Policies for Quotation Items
DROP POLICY IF EXISTS "Users can view quotation items" ON public.quotation_items;
DROP POLICY IF EXISTS "All authenticated users can view quotation items" ON public.quotation_items;
DROP POLICY IF EXISTS "All authenticated users can insert quotation items" ON public.quotation_items;
DROP POLICY IF EXISTS "All authenticated users can update quotation items" ON public.quotation_items;
DROP POLICY IF EXISTS "All authenticated users can delete quotation items" ON public.quotation_items;

CREATE POLICY "All authenticated users can view quotation items" ON public.quotation_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "All authenticated users can insert quotation items" ON public.quotation_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "All authenticated users can update quotation items" ON public.quotation_items FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "All authenticated users can delete quotation items" ON public.quotation_items FOR DELETE USING (auth.role() = 'authenticated');
