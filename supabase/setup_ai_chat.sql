-- Add 'ai' to conversation_type enum
-- In PostgreSQL, ALTER TYPE ADD VALUE cannot run inside a transaction block in older versions,
-- so we wrap it properly or just run it directly.
DO $$ BEGIN
    ALTER TYPE conversation_type ADD VALUE 'ai';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ai_providers Table
CREATE TABLE IF NOT EXISTS public.ai_providers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    api_key TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 10,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on ai_providers
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;

-- Security Policies for ai_providers
-- Only Service Role or specific admins can access.
-- Standard users cannot see the API keys.
CREATE POLICY "Only service_role can access ai_providers"
ON public.ai_providers FOR ALL
USING (auth.role() = 'service_role' OR auth.role() = 'superuser');

-- For standard authenticated users, DENY ALL (which is the default when RLS is enabled and no policy is created for 'authenticated' role).

-- Insert Dummy AI Agent User into public.users if it doesn't exist
-- Note: Adjust columns based on your exact `users` table schema.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'ai@crm.local') THEN
        INSERT INTO public.users (id, email, first_name, last_name, role)
        VALUES (gen_random_uuid(), 'ai@crm.local', 'AI', 'Assistant', 'AI');
    END IF;
EXCEPTION
    WHEN others THEN null;
END $$;
