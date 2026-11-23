-- ============================================================================
-- AI Tutor: Public Assignment Cloud Sync & Incognito Student Access Migration
-- Idempotent & additive migration for Supabase PostgreSQL.
-- Preserves all existing tables/records and isolates student PINs & parent emails
-- from unauthenticated public reads (accessed only via server-side service_role).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lms_assignments (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  owner_email TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  grade_level TEXT NOT NULL DEFAULT 'unclassified',
  subject TEXT NOT NULL DEFAULT '',
  quiz_id TEXT NOT NULL DEFAULT '',
  quiz_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  assigned_students JSONB NOT NULL DEFAULT '[]'::jsonb,
  open_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  max_attempts INTEGER NOT NULL DEFAULT 1,
  grading_policy TEXT NOT NULL DEFAULT 'first',
  reveal_mode TEXT NOT NULL DEFAULT 'immediate',
  time_limit_minutes INTEGER NOT NULL DEFAULT 60,
  teacher_note TEXT NOT NULL DEFAULT '',
  notify_parent BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Additive guards in case table already existed
ALTER TABLE public.lms_assignments
  ADD COLUMN IF NOT EXISTS quiz_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.lms_assignments
  ADD COLUMN IF NOT EXISTS assigned_students JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.lms_assignments
  ADD COLUMN IF NOT EXISTS grade_level TEXT NOT NULL DEFAULT 'unclassified';
ALTER TABLE public.lms_assignments
  ADD COLUMN IF NOT EXISTS subject TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_lms_assignments_code_upper
  ON public.lms_assignments (UPPER(code));

CREATE TABLE IF NOT EXISTS public.lms_submissions (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL REFERENCES public.lms_assignments(id) ON DELETE CASCADE,
  assign_code TEXT NOT NULL DEFAULT '',
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL DEFAULT '',
  attempt_no INTEGER NOT NULL DEFAULT 1,
  score10 NUMERIC(4,1) NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  duration_sec INTEGER NOT NULL DEFAULT 0,
  tab_switches INTEGER NOT NULL DEFAULT 0,
  records JSONB NOT NULL DEFAULT '[]'::jsonb,
  parent_report_sent_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lms_submissions_assignment_student
  ON public.lms_submissions (assignment_id, student_id);

-- Row Level Security: protect raw assigned_students (PINs & parentEmail) from direct anon reads.
-- Server API (/api/lms/public-assignment, /api/lms/verify-pin, /api/lms/public-submit)
-- uses SUPABASE_SERVICE_ROLE_KEY to return sanitized public payloads.
ALTER TABLE public.lms_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lms_assignments_owner_all ON public.lms_assignments;
CREATE POLICY lms_assignments_owner_all
  ON public.lms_assignments
  FOR ALL
  TO authenticated
  USING (
    COALESCE(auth.jwt() ->> 'email', '') <> ''
    AND lower(auth.jwt() ->> 'email') = lower(owner_email)
  )
  WITH CHECK (
    COALESCE(auth.jwt() ->> 'email', '') <> ''
    AND lower(auth.jwt() ->> 'email') = lower(owner_email)
  );
