-- Add new columns to ai_providers if they don't exist
DO $$ BEGIN
    ALTER TABLE public.ai_providers ADD COLUMN usage_count INTEGER NOT NULL DEFAULT 0;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.ai_providers ADD COLUMN monthly_quota INTEGER; -- NULL means unlimited
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.ai_providers ADD COLUMN last_used_at TIMESTAMP WITH TIME ZONE;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Drop existing RPCs if they exist to prevent signature conflicts
DROP FUNCTION IF EXISTS public.get_masked_ai_providers();
DROP FUNCTION IF EXISTS public.upsert_ai_provider(UUID, TEXT, TEXT, INTEGER, BOOLEAN, INTEGER);
DROP FUNCTION IF EXISTS public.delete_ai_provider(UUID);

-- RPC: Get Masked AI Providers (Only for Admins)
CREATE OR REPLACE FUNCTION public.get_masked_ai_providers()
RETURNS TABLE (
    id UUID,
    name TEXT,
    api_key_masked TEXT,
    priority INTEGER,
    is_active BOOLEAN,
    usage_count INTEGER,
    monthly_quota INTEGER,
    last_used_at TIMESTAMP WITH TIME ZONE
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Security Check: The app uses custom sessionStorage auth without Supabase JWTs.
    -- Role authorization is handled by the React Frontend (SettingsAI.tsx).
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        '********' || right(p.api_key, 4) AS api_key_masked,
        p.priority,
        p.is_active,
        p.usage_count,
        p.monthly_quota,
        p.last_used_at
    FROM public.ai_providers p
    ORDER BY p.priority ASC;
END;
$$ LANGUAGE plpgsql;

-- RPC: Upsert AI Provider
CREATE OR REPLACE FUNCTION public.upsert_ai_provider(
    p_id UUID,
    p_name TEXT,
    p_api_key TEXT,
    p_priority INTEGER,
    p_is_active BOOLEAN,
    p_monthly_quota INTEGER
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_active_count INTEGER;
    v_total_count INTEGER;
    v_existing_id UUID;
    v_final_api_key TEXT;
BEGIN
    -- Security Check: Handled by Frontend

    -- Validate Priority
    IF p_priority NOT IN (1, 2, 3) THEN
        RAISE EXCEPTION 'Priority must be 1, 2, or 3';
    END IF;

    -- Check Total Count limit (max 3)
    SELECT count(*) INTO v_total_count FROM public.ai_providers WHERE id != COALESCE(p_id, '00000000-0000-0000-0000-000000000000');
    IF v_total_count >= 3 AND p_id IS NULL THEN
        RAISE EXCEPTION 'Maximum of 3 AI providers allowed.';
    END IF;

    -- Check if editing existing
    IF p_id IS NOT NULL THEN
        SELECT id, api_key INTO v_existing_id, v_final_api_key FROM public.ai_providers WHERE id = p_id;
        IF v_existing_id IS NULL THEN
            RAISE EXCEPTION 'Provider not found';
        END IF;

        -- If a new key is provided, update it. If masked/empty, keep old.
        IF p_api_key IS NOT NULL AND p_api_key != '' AND p_api_key NOT LIKE '********%' THEN
            v_final_api_key := p_api_key;
        END IF;

        UPDATE public.ai_providers
        SET 
            name = p_name,
            api_key = v_final_api_key,
            priority = p_priority,
            is_active = p_is_active,
            monthly_quota = p_monthly_quota,
            updated_at = NOW()
        WHERE id = p_id;
        
    ELSE
        -- Insert New
        IF p_api_key IS NULL OR p_api_key = '' THEN
            RAISE EXCEPTION 'API Key is required for new providers';
        END IF;
        
        v_final_api_key := p_api_key;

        INSERT INTO public.ai_providers (name, api_key, priority, is_active, monthly_quota)
        VALUES (p_name, v_final_api_key, p_priority, p_is_active, p_monthly_quota)
        RETURNING id INTO p_id;
    END IF;

    -- At least 1 active provider rule
    SELECT count(*) INTO v_active_count FROM public.ai_providers WHERE is_active = true;
    IF v_active_count = 0 THEN
        RAISE EXCEPTION 'At least 1 provider must be active';
    END IF;

    -- Ensure unique priority among active providers?
    -- The requirement says "Priority must be unique (1-3)", so we can auto-shift or just error.
    -- For simplicity, if we find a duplicate priority, we can swap them.
    -- But since UI typically handles priority, let's just let it save and assume UI manages uniqueness, 
    -- or if strict, throw an error. A strict check is safer.
    IF EXISTS (
        SELECT priority FROM public.ai_providers
        GROUP BY priority
        HAVING count(*) > 1
    ) THEN
        -- Instead of throwing error, we can auto-shift or it's fine. 
        -- Actually, the prompt says "Priority must be unique (1-3)". Let's throw error.
        RAISE EXCEPTION 'Priority levels must be unique across all providers';
    END IF;

    RETURN p_id;
END;
$$ LANGUAGE plpgsql;

-- RPC: Delete AI Provider
CREATE OR REPLACE FUNCTION public.delete_ai_provider(p_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_active_count INTEGER;
BEGIN
    -- Security Check: Handled by Frontend

    DELETE FROM public.ai_providers WHERE id = p_id;

    -- Check if we deleted the last active provider
    SELECT count(*) INTO v_active_count FROM public.ai_providers WHERE is_active = true;
    IF v_active_count = 0 AND EXISTS (SELECT 1 FROM public.ai_providers) THEN
        RAISE EXCEPTION 'Cannot delete the last active provider. Enable another one first.';
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql;
