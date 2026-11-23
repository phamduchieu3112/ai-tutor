-- ============================================================================
-- AI Tutor: Vocab Studio Module Migration (Supabase PostgreSQL + RLS)
-- Creates vocab_decks, vocab_cards, and user_vocab_data with strict RLS
-- ensuring each authenticated user can only read/write their own vocabulary.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.vocab_decks (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at BIGINT NOT NULL DEFAULT 1,
  updated_at BIGINT NOT NULL DEFAULT 1,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS public.vocab_cards (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL DEFAULT '',
  deck_id TEXT NOT NULL DEFAULT 'deck-default',
  en TEXT NOT NULL,
  vi TEXT NOT NULL,
  ipa TEXT NOT NULL DEFAULT '',
  pos TEXT NOT NULL DEFAULT '',
  example TEXT NOT NULL DEFAULT '',
  audio_url TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL DEFAULT '',
  custom BOOLEAN NOT NULL DEFAULT FALSE,
  starred BOOLEAN NOT NULL DEFAULT FALSE,
  starred_at BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'learning', 'known')),
  srs JSONB NOT NULL DEFAULT '{"interval":0,"ease":2.5,"reps":0,"lapses":0,"dueDate":null}'::jsonb,
  deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at BIGINT NOT NULL DEFAULT 1,
  updated_at BIGINT NOT NULL DEFAULT 1,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS public.user_vocab_data (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL UNIQUE,
  decks JSONB NOT NULL DEFAULT '[]'::jsonb,
  words JSONB NOT NULL DEFAULT '[]'::jsonb,
  stats JSONB NOT NULL DEFAULT '{"streak":0,"lastStudyDate":null,"longestStreak":0,"daily":{},"updatedAt":0}'::jsonb,
  settings JSONB NOT NULL DEFAULT '{"direction":"vi-en","theme":"light","newWordsPerDay":10,"updatedAt":0}'::jsonb,
  updated_at BIGINT NOT NULL DEFAULT 0,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vocab_decks_user_id ON public.vocab_decks(user_id);
CREATE INDEX IF NOT EXISTS idx_vocab_cards_user_id ON public.vocab_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_vocab_cards_deck_id ON public.vocab_cards(user_id, deck_id);
CREATE INDEX IF NOT EXISTS idx_user_vocab_data_email ON public.user_vocab_data(user_email);

-- Enable Row Level Security (RLS)
ALTER TABLE public.vocab_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocab_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_vocab_data ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.vocab_decks FORCE ROW LEVEL SECURITY;
ALTER TABLE public.vocab_cards FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_vocab_data FORCE ROW LEVEL SECURITY;

-- Policies for vocab_decks: authenticated users can only access their own rows
DROP POLICY IF EXISTS vocab_decks_select_own ON public.vocab_decks;
CREATE POLICY vocab_decks_select_own
  ON public.vocab_decks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS vocab_decks_insert_own ON public.vocab_decks;
CREATE POLICY vocab_decks_insert_own
  ON public.vocab_decks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS vocab_decks_update_own ON public.vocab_decks;
CREATE POLICY vocab_decks_update_own
  ON public.vocab_decks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS vocab_decks_delete_own ON public.vocab_decks;
CREATE POLICY vocab_decks_delete_own
  ON public.vocab_decks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for vocab_cards: authenticated users can only access their own rows
DROP POLICY IF EXISTS vocab_cards_select_own ON public.vocab_cards;
CREATE POLICY vocab_cards_select_own
  ON public.vocab_cards
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS vocab_cards_insert_own ON public.vocab_cards;
CREATE POLICY vocab_cards_insert_own
  ON public.vocab_cards
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS vocab_cards_update_own ON public.vocab_cards;
CREATE POLICY vocab_cards_update_own
  ON public.vocab_cards
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS vocab_cards_delete_own ON public.vocab_cards;
CREATE POLICY vocab_cards_delete_own
  ON public.vocab_cards
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for user_vocab_data: authenticated users can only access their own snapshot
DROP POLICY IF EXISTS user_vocab_data_select_own ON public.user_vocab_data;
CREATE POLICY user_vocab_data_select_own
  ON public.user_vocab_data
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_vocab_data_insert_own ON public.user_vocab_data;
CREATE POLICY user_vocab_data_insert_own
  ON public.user_vocab_data
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_vocab_data_update_own ON public.user_vocab_data;
CREATE POLICY user_vocab_data_update_own
  ON public.user_vocab_data
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_vocab_data_delete_own ON public.user_vocab_data;
CREATE POLICY user_vocab_data_delete_own
  ON public.user_vocab_data
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
