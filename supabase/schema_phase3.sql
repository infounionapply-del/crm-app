-- Phase 3 Schema Updates

-- Price Lists Table (Version Control)
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

-- Price List Items Table (Products/Services)
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

-- Quotations Table
CREATE TABLE public.quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES public.customers(id),
    job_id UUID REFERENCES public.jobs(id), -- Optional link to a Job
    price_list_id UUID NOT NULL REFERENCES public.price_lists(id),
    status VARCHAR(50) DEFAULT 'Draft', -- Draft, Pending Approval, Approved, Sent, Accepted, Rejected
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    discount_type VARCHAR(20) DEFAULT 'None', -- None, Percentage, Fixed
    discount_value DECIMAL(12, 2) DEFAULT 0.00,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    valid_until TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Quotation Items Table
CREATE TABLE public.quotation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
    price_list_item_id UUID NOT NULL REFERENCES public.price_list_items(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(12, 2) NOT NULL, -- Snapshot of price at the time of quotation
    discount_type VARCHAR(20) DEFAULT 'None', -- None, Percentage, Fixed
    discount_value DECIMAL(12, 2) DEFAULT 0.00,
    final_line_price DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add triggers for updated_at
CREATE TRIGGER update_price_lists_modtime
    BEFORE UPDATE ON public.price_lists
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_price_list_items_modtime
    BEFORE UPDATE ON public.price_list_items
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_quotations_modtime
    BEFORE UPDATE ON public.quotations
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Row Level Security (RLS)
ALTER TABLE public.price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

-- Example Policies
CREATE POLICY "All authenticated users can view active price lists" ON public.price_lists FOR SELECT USING (true);
CREATE POLICY "All authenticated users can view price list items" ON public.price_list_items FOR SELECT USING (true);
CREATE POLICY "Users can view quotations for their customers" ON public.quotations FOR SELECT USING (true);
CREATE POLICY "Users can view quotation items" ON public.quotation_items FOR SELECT USING (true);
