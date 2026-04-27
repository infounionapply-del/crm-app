-- 1. Create company_settings table
CREATE TABLE IF NOT EXISTS public.company_settings (
    id INT PRIMARY KEY DEFAULT 1,
    pdf_settings JSONB DEFAULT '{}'::jsonb,
    company_details JSONB DEFAULT '{}'::jsonb,
    system_preferences JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure there is a row with ID 1
INSERT INTO public.company_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 2. Add preferences column to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

-- 3. Setup RLS for company_settings
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can view company settings" ON public.company_settings FOR SELECT USING (true);
CREATE POLICY "All authenticated users can update company settings" ON public.company_settings FOR UPDATE USING (true);

-- 4. Add triggers for updated_at on company_settings
CREATE TRIGGER update_company_settings_modtime
    BEFORE UPDATE ON public.company_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
