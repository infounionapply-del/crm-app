-- 🧩 DATABASE TABLES

-- Create Enums
DO $$ BEGIN
    CREATE TYPE conversation_type AS ENUM ('direct', 'group');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE member_role AS ENUM ('admin', 'member');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. conversations Table
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type conversation_type NOT NULL DEFAULT 'direct',
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. conversation_members Table
CREATE TABLE IF NOT EXISTS public.conversation_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role member_role NOT NULL DEFAULT 'member',
    UNIQUE (conversation_id, user_id)
);

-- 3. messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text', -- 'text' | 'image'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 🔐 ENABLE RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 🔐 RLS POLICIES

-- conversations
CREATE POLICY "User can SELECT only if user is in conversation_members"
ON public.conversations FOR SELECT
USING (
  id IN (
    SELECT conversation_id FROM public.conversation_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert conversations"
ON public.conversations FOR INSERT
WITH CHECK (true);

-- conversation_members
CREATE POLICY "User can SELECT only rows where user_id = auth.uid()"
ON public.conversation_members FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert members"
ON public.conversation_members FOR INSERT
WITH CHECK (true);

-- messages
CREATE POLICY "SELECT messages where they are a member of the conversation"
ON public.messages FOR SELECT
USING (
  conversation_id IN (
    SELECT conversation_id FROM public.conversation_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "INSERT only if sender_id = auth.uid()"
ON public.messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid() AND
  conversation_id IN (
    SELECT conversation_id FROM public.conversation_members WHERE user_id = auth.uid()
  )
);

-- ⚡ REALTIME
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Add 'messages' table to supabase_realtime publication
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

-- 📦 STORAGE
-- Create bucket: chat-images
-- Public or signed URL access, Do NOT allow public access (Private bucket)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-images', 'chat-images', false) 
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload chat images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-images' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can read chat images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-images' AND 
  auth.role() = 'authenticated'
);
