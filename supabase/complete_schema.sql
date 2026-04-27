-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum for Roles
CREATE TYPE user_role AS ENUM ('Sales', 'Support', 'Manager', 'Administrator');

-- 1. Users Table
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'Sales',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Customers Table
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    company VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Active',
    type VARCHAR(50) DEFAULT 'Standard',
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Check-ins Table
CREATE TABLE public.check_ins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    notes TEXT,
    check_in_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Jobs Table
CREATE TABLE public.jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    value DECIMAL(12, 2) DEFAULT 0.00,
    stage VARCHAR(50) DEFAULT 'New',
    status VARCHAR(50) DEFAULT 'Pending',
    po_number VARCHAR(100),
    so_number VARCHAR(100),
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Support Tasks Table
CREATE TABLE public.support_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'Open',
    revision_count INTEGER DEFAULT 0,
    so_number VARCHAR(100),
    assigned_to UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Notifications Table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Price Lists Table
CREATE TABLE public.price_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    valid_to TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Price List Items Table
CREATE TABLE public.price_list_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    price_list_id UUID NOT NULL REFERENCES public.price_lists(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    unit_price DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Quotations Table
CREATE TABLE public.quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES public.customers(id),
    job_id UUID REFERENCES public.jobs(id),
    price_list_id UUID NOT NULL REFERENCES public.price_lists(id),
    status VARCHAR(50) DEFAULT 'Draft',
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    discount_type VARCHAR(20) DEFAULT 'None',
    discount_value DECIMAL(12, 2) DEFAULT 0.00,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    revision_count INTEGER DEFAULT 0,
    quotation_pdf_url VARCHAR(500),
    po_pdf_url VARCHAR(500),
    po_number VARCHAR(100) UNIQUE,
    so_number VARCHAR(100) UNIQUE,
    valid_until TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Quotation Items Table
CREATE TABLE public.quotation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
    price_list_item_id UUID NOT NULL REFERENCES public.price_list_items(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(12, 2) NOT NULL,
    discount_type VARCHAR(20) DEFAULT 'None',
    discount_value DECIMAL(12, 2) DEFAULT 0.00,
    final_line_price DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Approvals Table
CREATE TABLE public.approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_type VARCHAR(50) NOT NULL,
    reference_id UUID NOT NULL,
    requester_id UUID NOT NULL REFERENCES public.users(id),
    approver_id UUID REFERENCES public.users(id),
    status VARCHAR(50) DEFAULT 'Pending',
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Revision History Table
CREATE TABLE public.revision_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_type VARCHAR(50) NOT NULL,
    reference_id UUID NOT NULL,
    revision_number INTEGER NOT NULL,
    changed_by UUID NOT NULL REFERENCES public.users(id),
    action VARCHAR(50) NOT NULL,
    comments TEXT,
    previous_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- View: Deal Timeline
CREATE OR REPLACE VIEW public.deal_timeline AS
SELECT 
    j.id as job_id,
    'Check-in' as event_type,
    c.check_in_time as event_date,
    u.first_name || ' ' || u.last_name as actor,
    'Check-in logged at ' || c.location_lat || ',' || c.location_lng as details
FROM public.jobs j
JOIN public.check_ins c ON j.customer_id = c.customer_id
JOIN public.users u ON c.user_id = u.id

UNION ALL

SELECT 
    j.id as job_id,
    'Job Created' as event_type,
    j.created_at as event_date,
    u.first_name || ' ' || u.last_name as actor,
    'Job: ' || j.title as details
FROM public.jobs j
JOIN public.users u ON j.created_by = u.id

UNION ALL

SELECT 
    q.job_id as job_id,
    'Quotation ' || q.status as event_type,
    q.updated_at as event_date,
    u.first_name || ' ' || u.last_name as actor,
    'Quotation ' || q.quotation_number || ' updated' as details
FROM public.quotations q
JOIN public.users u ON q.created_by = u.id
WHERE q.job_id IS NOT NULL

UNION ALL

SELECT 
    q.job_id as job_id,
    'Revision: ' || rh.action as event_type,
    rh.created_at as event_date,
    u.first_name || ' ' || u.last_name as actor,
    rh.comments as details
FROM public.revision_history rh
JOIN public.quotations q ON rh.reference_id = q.id
JOIN public.users u ON rh.changed_by = u.id
WHERE rh.reference_type = 'Quotation' AND q.job_id IS NOT NULL;

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_modtime BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_customers_modtime BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_jobs_modtime BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_support_tasks_modtime BEFORE UPDATE ON public.support_tasks FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_price_lists_modtime BEFORE UPDATE ON public.price_lists FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_price_list_items_modtime BEFORE UPDATE ON public.price_list_items FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_quotations_modtime BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_approvals_modtime BEFORE UPDATE ON public.approvals FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revision_history ENABLE ROW LEVEL SECURITY;

-- Basic Example Policies
CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "All authenticated users can view customers" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Users can view their own check-ins" ON public.check_ins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view jobs" ON public.jobs FOR SELECT USING (true);
CREATE POLICY "Users can view their notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "All authenticated users can view active price lists" ON public.price_lists FOR SELECT USING (true);
CREATE POLICY "All authenticated users can view price list items" ON public.price_list_items FOR SELECT USING (true);
CREATE POLICY "Users can view quotations" ON public.quotations FOR SELECT USING (true);
CREATE POLICY "Users can view quotation items" ON public.quotation_items FOR SELECT USING (true);
CREATE POLICY "Users can view approvals" ON public.approvals FOR SELECT USING (true);
CREATE POLICY "Users can view revision history" ON public.revision_history FOR SELECT USING (true);
