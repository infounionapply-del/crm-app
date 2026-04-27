-- 1. Setup Sales Targets
DROP TABLE IF EXISTS public.sales_targets CASCADE;

CREATE TABLE public.sales_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sales_rep_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    target DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sales_rep_id, month)
);

-- Trigger for sales_targets updated_at
CREATE TRIGGER update_sales_targets_modtime BEFORE UPDATE ON public.sales_targets FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- RLS for sales_targets
ALTER TABLE public.sales_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can view sales targets" ON public.sales_targets FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "All authenticated users can insert sales targets" ON public.sales_targets FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "All authenticated users can update sales targets" ON public.sales_targets FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "All authenticated users can delete sales targets" ON public.sales_targets FOR DELETE USING (auth.role() = 'authenticated');


-- 2. Setup Products (Replaces Price Lists for simpler UI logic)
DROP TABLE IF EXISTS public.products CASCADE;

CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    current_price DECIMAL(12, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Draft',
    effective_date VARCHAR(20),
    history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for products updated_at
CREATE TRIGGER update_products_modtime BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- RLS for products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can view products" ON public.products FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "All authenticated users can insert products" ON public.products FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "All authenticated users can update products" ON public.products FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "All authenticated users can delete products" ON public.products FOR DELETE USING (auth.role() = 'authenticated');


-- 3. Setup Approvals (Matches Approvals.tsx UI)
DROP TABLE IF EXISTS public.approvals CASCADE;

CREATE TABLE public.approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL,
    reference VARCHAR(100) NOT NULL,
    customer VARCHAR(255) NOT NULL,
    requester VARCHAR(255) NOT NULL,
    amount VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for approvals updated_at
CREATE TRIGGER update_approvals_modtime BEFORE UPDATE ON public.approvals FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- RLS for approvals
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can view approvals" ON public.approvals FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "All authenticated users can insert approvals" ON public.approvals FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "All authenticated users can update approvals" ON public.approvals FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "All authenticated users can delete approvals" ON public.approvals FOR DELETE USING (auth.role() = 'authenticated');

-- Insert Initial Mock Data for Products so UI isn't empty
INSERT INTO public.products (id, sku, name, category, current_price, status, effective_date, history) VALUES
('11111111-1111-1111-1111-111111111111', 'ENT-LIC-1Y', 'Enterprise License (1 Year)', 'Software', 45000, 'Active', '2024-01-01', '[{"version": 2, "price": 45000, "date": "2024-01-01", "status": "Active", "approvedBy": "Manager"}]'::jsonb),
('22222222-2222-2222-2222-222222222222', 'CLD-STP', 'Cloud Setup Service', 'Service', 15000, 'Active', '2024-02-15', '[{"version": 1, "price": 15000, "date": "2024-02-15", "status": "Active", "approvedBy": "Manager"}]'::jsonb),
('33333333-3333-3333-3333-333333333333', 'SEC-AUD', 'Security Audit', 'Service', 12000, 'Pending Approval', '-', '[{"version": 2, "price": 12000, "date": "2024-10-25", "status": "Pending Approval", "approvedBy": null}]'::jsonb);

-- Insert Initial Mock Data for Approvals so UI isn't empty
INSERT INTO public.approvals (id, type, reference, customer, requester, amount, status, details) VALUES
('44444444-4444-4444-4444-444444444444', 'Quotation', 'QT-2024-001', 'TechCorp Industries', 'Sarah Jenkins', '$45,000', 'Pending', 'Requesting approval for a 10% discount on the enterprise license renewal.'),
('55555555-5555-5555-5555-555555555555', 'Discount', 'JOB-2024-002', 'Global Logistics', 'Michael Chen', '15% Off', 'Pending', 'Customer requested a volume discount for the cloud infrastructure setup.'),
('66666666-6666-6666-6666-666666666666', 'Credit Limit', 'CUS-004', 'Apex Manufacturing', 'David Wilson', '$100,000', 'Approved', 'Increasing credit limit to accommodate upcoming Q4 orders.');
