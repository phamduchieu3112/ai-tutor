-- ============================================================================
-- AI Tutor: Strict Zero-Exposure Row Level Security (RLS) Migration (Supabase)
-- Stores encrypted System Default AI API Keys, Audit Logs, and Rate Limits.
-- ALL client access (anon & authenticated JWT) is explicitly DENIED.
-- Only the backend server using SUPABASE_SERVICE_ROLE_KEY may read/write.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.system_ai_keys (
  id TEXT PRIMARY KEY,
  account_label TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('gemini', 'groq', 'openrouter', 'openai', 'deepseek')),
  masked_key TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  ciphertext TEXT NOT NULL,
  iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  key_version TEXT NOT NULL DEFAULT 'v1',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'healthy' CHECK (status IN ('healthy', 'cooldown', 'invalid')),
  cooldown_until BIGINT NOT NULL DEFAULT 0,
  usage_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT DEFAULT '',
  last_tested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.system_ai_audit_logs (
  id TEXT PRIMARY KEY,
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_proxy_rate_limits (
  bucket_key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  expires_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.system_ai_env_state (
  id TEXT PRIMARY KEY,
  state_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.system_ai_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_ai_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_proxy_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_ai_env_state ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners if non-superuser, while service_role bypasses RLS
ALTER TABLE public.system_ai_keys FORCE ROW LEVEL SECURITY;
ALTER TABLE public.system_ai_audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ai_proxy_rate_limits FORCE ROW LEVEL SECURITY;
ALTER TABLE public.system_ai_env_state FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_all_client_system_ai_keys ON public.system_ai_keys;
CREATE POLICY deny_all_client_system_ai_keys
  ON public.system_ai_keys
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (FALSE)
  WITH CHECK (FALSE);

DROP POLICY IF EXISTS deny_all_client_system_ai_audit_logs ON public.system_ai_audit_logs;
CREATE POLICY deny_all_client_system_ai_audit_logs
  ON public.system_ai_audit_logs
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (FALSE)
  WITH CHECK (FALSE);

DROP POLICY IF EXISTS deny_all_client_ai_proxy_rate_limits ON public.ai_proxy_rate_limits;
CREATE POLICY deny_all_client_ai_proxy_rate_limits
  ON public.ai_proxy_rate_limits
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (FALSE)
  WITH CHECK (FALSE);

DROP POLICY IF EXISTS deny_all_client_system_ai_env_state ON public.system_ai_env_state;
CREATE POLICY deny_all_client_system_ai_env_state
  ON public.system_ai_env_state
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (FALSE)
  WITH CHECK (FALSE);

REVOKE ALL ON TABLE public.system_ai_keys FROM anon, authenticated;
REVOKE ALL ON TABLE public.system_ai_audit_logs FROM anon, authenticated;
REVOKE ALL ON TABLE public.ai_proxy_rate_limits FROM anon, authenticated;
REVOKE ALL ON TABLE public.system_ai_env_state FROM anon, authenticated;
