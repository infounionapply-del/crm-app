-- 1. Fix RLS Policies (Already executed successfully in previous run)

-- 2. Create the Auth User (admin@example.com / password123)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    new_user_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
    INSERT INTO auth.users (
        id, instance_id, role, aud, email, encrypted_password, 
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
        created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
        new_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 
        'admin@example.com', crypt('password123', gen_salt('bf')), 
        now(), '{"provider":"email","providers":["email"]}', '{}', 
        now(), now(), '', '', '', ''
    ) ON CONFLICT (id) DO UPDATE SET 
        confirmation_token = '', 
        email_change = '', 
        email_change_token_new = '', 
        recovery_token = '';

    INSERT INTO auth.identities (
        id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
        uuid_generate_v4(), new_user_id::text, new_user_id, format('{"sub":"%s","email":"%s"}', new_user_id::text, 'admin@example.com')::jsonb, 'email', now(), now(), now()
    ) ON CONFLICT DO NOTHING;
END $$;

-- 3. Seed data
-- Users
INSERT INTO public.users (id, email, password_hash, first_name, last_name, role)
VALUES 
('11111111-1111-1111-1111-111111111111', 'admin@example.com', 'dummy', 'Admin', 'User', 'Administrator'),
('22222222-2222-2222-2222-222222222222', 'sarah@example.com', 'dummy', 'Sarah', 'Jenkins', 'Sales')
ON CONFLICT (id) DO NOTHING;

-- Customers
INSERT INTO public.customers (id, name, created_by)
VALUES 
('c0000000-0000-0000-0000-000000000001', 'TechCorp Industries', '11111111-1111-1111-1111-111111111111'),
('c0000000-0000-0000-0000-000000000002', 'Global Logistics', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- Price Lists & Items
INSERT INTO public.price_lists (id, name, version, is_active, created_by)
VALUES ('d0000000-0000-0000-0000-000000000001', 'Standard 2024', '1.0', true, '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.price_list_items (id, price_list_id, sku, product_name, unit_price)
VALUES 
('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'ITEM-001', 'Enterprise License', 45000.00),
('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'ITEM-002', 'Cloud Setup', 15000.00)
ON CONFLICT (id) DO NOTHING;

-- Jobs
INSERT INTO public.jobs (id, customer_id, title, value, stage, created_by)
VALUES
('f0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Q1 Enterprise License Renewal', 45000.00, 'Negotiating', '22222222-2222-2222-2222-222222222222'),
('f0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'Cloud Infrastructure Setup', 120000.00, 'Assigned', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO NOTHING;

-- Quotations
INSERT INTO public.quotations (id, quotation_number, customer_id, job_id, price_list_id, status, subtotal, total_amount, created_by)
VALUES
('a0000000-0000-0000-0000-000000000001', 'QT-690001', 'c0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Pending Approval', 45000.00, 45000.00, '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quotation_items (id, quotation_id, price_list_item_id, quantity, unit_price, final_line_price)
VALUES
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 1, 45000.00, 45000.00)
ON CONFLICT (id) DO NOTHING;
