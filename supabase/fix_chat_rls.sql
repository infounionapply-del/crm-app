-- ============================================
-- FIX: Disable RLS on chat tables
-- Reason: App uses custom auth (not Supabase Auth),
-- so auth.uid() is always NULL, causing infinite
-- recursion in RLS policies.
-- Authorization is handled at the application layer.
-- ============================================

-- 1. Drop all existing policies on conversations
DROP POLICY IF EXISTS "User can SELECT only if user is in conversation_members" ON public.conversations;
DROP POLICY IF EXISTS "Users can insert conversations" ON public.conversations;

-- 2. Drop all existing policies on conversation_members
DROP POLICY IF EXISTS "User can SELECT only rows where user_id = auth.uid()" ON public.conversation_members;
DROP POLICY IF EXISTS "Users can insert members" ON public.conversation_members;

-- 3. Drop all existing policies on messages
DROP POLICY IF EXISTS "SELECT messages where they are a member of the conversation" ON public.messages;
DROP POLICY IF EXISTS "INSERT only if sender_id = auth.uid()" ON public.messages;

-- 4. Disable RLS on all chat tables
ALTER TABLE public.conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;

-- 5. Add updated_at column to conversations if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'conversations'
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.conversations ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 6. Add file_url column to messages if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'messages'
        AND column_name = 'file_url'
    ) THEN
        ALTER TABLE public.messages ADD COLUMN file_url TEXT;
    END IF;
END $$;

-- 7. Ensure realtime is enabled for messages
ALTER TABLE public.messages REPLICA IDENTITY FULL;

DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

-- 8. Ensure realtime is enabled for conversations
ALTER TABLE public.conversations REPLICA IDENTITY FULL;

DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;
END $$;
