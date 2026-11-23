-- ============================================================================
-- AI Tutor: Creator Studio Quizzes Persistence & Ownership-Aware RLS Migration
-- Additive & idempotent migration for Supabase PostgreSQL.
-- Preserves all existing tables/records and enforces Public/Private visibility.
--
-- Rollback instructions (manual, non-destructive):
--   DROP POLICY IF EXISTS creator_quizzes_select ON public.creator_quizzes;
--   DROP POLICY IF EXISTS creator_quizzes_insert ON public.creator_quizzes;
--   DROP POLICY IF EXISTS creator_quizzes_update ON public.creator_quizzes;
--   DROP POLICY IF EXISTS creator_quizzes_delete ON public.creator_quizzes;
--   (Do NOT drop public.creator_quizzes in production without a verified backup.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.creator_quizzes (
  id TEXT PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_email TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  tag TEXT NOT NULL DEFAULT 'Tổng hợp',
  share_code TEXT UNIQUE,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  extra_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Additive column guards in case table already existed with an earlier schema
ALTER TABLE public.creator_quizzes
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.creator_quizzes
  ADD COLUMN IF NOT EXISTS share_code TEXT;

ALTER TABLE public.creator_quizzes
  ADD COLUMN IF NOT EXISTS extra_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS idx_creator_quizzes_share_code
  ON public.creator_quizzes(share_code)
  WHERE share_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_creator_quizzes_owner_id
  ON public.creator_quizzes(owner_id);

CREATE INDEX IF NOT EXISTS idx_creator_quizzes_owner_email
  ON public.creator_quizzes(owner_email);

CREATE INDEX IF NOT EXISTS idx_creator_quizzes_public_updated
  ON public.creator_quizzes(is_public, updated_at DESC);

-- Enable and force Row Level Security (service_role bypasses RLS as designed)
ALTER TABLE public.creator_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_quizzes FORCE ROW LEVEL SECURITY;

-- SELECT: Public quizzes readable by everyone (anon + authenticated);
--         Private quizzes readable only by their owner.
DROP POLICY IF EXISTS creator_quizzes_select ON public.creator_quizzes;
CREATE POLICY creator_quizzes_select
  ON public.creator_quizzes
  FOR SELECT
  TO anon, authenticated
  USING (
    is_public = TRUE
    OR (auth.uid() IS NOT NULL AND auth.uid() = owner_id)
  );

-- INSERT: Authenticated users can create only their own quizzes.
DROP POLICY IF EXISTS creator_quizzes_insert ON public.creator_quizzes;
CREATE POLICY creator_quizzes_insert
  ON public.creator_quizzes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- UPDATE: Only the owner can update their own quizzes.
DROP POLICY IF EXISTS creator_quizzes_update ON public.creator_quizzes;
CREATE POLICY creator_quizzes_update
  ON public.creator_quizzes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- DELETE: Only the owner can delete their own quizzes.
DROP POLICY IF EXISTS creator_quizzes_delete ON public.creator_quizzes;
CREATE POLICY creator_quizzes_delete
  ON public.creator_quizzes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);
