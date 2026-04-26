-- ============================================================================
-- SEON Hub (hype5-erp) — Consolidated Postgres schema for Supabase
-- ----------------------------------------------------------------------------
-- This single file recreates the full database schema from a fresh empty
-- Supabase project. It folds in:
--   * src/lib/local-db/schema.sql (SQLite source-of-truth)
--   * supabase/migrations/20260306165245_add_tutorial_done_column.sql
--   * supabase/migrations/20260307000001_client_id_fk.sql
--   * supabase/migrations/20260307000002_add_indexes.sql
--   * supabase/migrations/20260307000003_updated_at_trigger.sql
--   * supabase/migrations/20260328000001_create_expenses_table.sql
--   * supabase/migrations/20260328000002_expenses_subscription_fields.sql
--   * supabase/migrations/20260406000001_create_app_updates_table.sql
--   * supabase/migrations/20260412000001_create_push_subscriptions.sql
--
-- Conservative type-conversion policy:
--   * id (TEXT PRIMARY KEY) — kept as TEXT because the app supplies UUID
--     strings explicitly via crypto.randomUUID(); we don't want gen_random_uuid
--     defaults to fight with that.
--   * BOOL_COLUMNS (approved/needs_password_change/completed/notified/
--     is_published/pinned) — kept as INTEGER. The app's encodeRow() in
--     src/lib/local-db/db.ts coerces booleans to 1/0 before write, and decodes
--     `v === 1 || v === true`. Switching to BOOLEAN would break .eq(col, 1)
--     filters.
--   * JSON_COLUMNS (per src/lib/local-db/db.ts JSON_COLUMNS map) — kept as
--     TEXT, because encodeRow() JSON.stringify()'s before insert and
--     decodeRow() JSON.parse()'s after select. Exception: tutorial_done is
--     JSONB per the 20260306165245 migration that was applied in production
--     (the app stringifies it; Postgres will still parse the JSON string into
--     jsonb on insert).
--   * timestamp columns stored as TEXT in SQLite (ISO strings) — kept as
--     TEXT to avoid any client-side serialization mismatch. Only the
--     migration-introduced fields (expenses, push_subscriptions, partners
--     updated_at) use TIMESTAMPTZ as the migrations defined.
--
-- Idempotent: safe to re-run. CREATE TABLE / ALTER TABLE ADD COLUMN /
-- CREATE INDEX all use IF NOT EXISTS. Triggers and policies guarded with
-- DO $$ EXISTS-checks. NEVER DROP TABLE.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Extensions
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. updated_at trigger function (used by many tables below)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 2. Tables
-- ----------------------------------------------------------------------------

-- user_profiles ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  role TEXT DEFAULT 'viewer',
  approved INTEGER DEFAULT 0,
  password_hash TEXT,
  needs_password_change INTEGER DEFAULT 0,
  tutorial_done JSONB DEFAULT '{}'::jsonb,
  created_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS tutorial_done JSONB DEFAULT '{}'::jsonb;

-- custom_roles ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS custom_roles (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
);

-- checklists ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS checklists (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  text TEXT,
  completed INTEGER DEFAULT 0,
  reminder_time TEXT,
  notified INTEGER DEFAULT 0,
  repeat_type TEXT,
  repeat_days TEXT,             -- JSON-stringified array (app-managed)
  linked_episode_id TEXT,
  linked_episode_title TEXT,
  linked_episode_number INTEGER,
  linked_project_id TEXT,
  linked_project_title TEXT,
  linked_client_name TEXT,
  linked_partner_id TEXT,
  linked_partner_name TEXT,
  created_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
);

-- partners --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS partners (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  partner_type TEXT,
  role TEXT DEFAULT 'partner',
  position TEXT,
  job_title TEXT,
  job_rank TEXT,
  status TEXT DEFAULT 'active',
  generation INTEGER,
  bank TEXT,
  bank_account TEXT,
  profile_image TEXT,
  created_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- clients ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  address TEXT,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  updated_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
);

-- projects --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'video',
  description TEXT,
  client TEXT,
  client_id TEXT REFERENCES clients(id),
  partner_id TEXT,
  partner_ids TEXT,             -- JSON-stringified array
  manager_ids TEXT,             -- JSON-stringified array
  category TEXT,
  channels TEXT,                -- JSON-stringified array (app-managed)
  status TEXT DEFAULT 'planning',
  total_amount REAL DEFAULT 0,
  partner_payment REAL DEFAULT 0,
  management_fee REAL DEFAULT 0,
  margin_rate REAL DEFAULT 0,
  work_content TEXT,            -- JSON
  tags TEXT,                    -- JSON
  thumbnail_url TEXT,
  video_url TEXT,
  completed_at TEXT,
  work_type_costs TEXT,         -- JSON
  meta TEXT,                    -- JSON
  created_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  updated_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
);
-- Migration 20260307000001 fold-in: ensure client_id and channels exist
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_id TEXT REFERENCES clients(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS channels TEXT;

-- sprints ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sprints (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  sprint_number INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'planning',
  start_date TEXT,
  end_date TEXT,
  goal TEXT,
  issue_count INTEGER DEFAULT 0,
  completed_issue_count INTEGER DEFAULT 0,
  assignee_ids TEXT,            -- JSON
  budget_total REAL DEFAULT 0,
  budget_partner REAL DEFAULT 0,
  budget_management REAL DEFAULT 0,
  created_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  updated_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
);

-- content_items ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_items (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  item_number INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft',
  platform TEXT DEFAULT 'other',
  content_kind TEXT,
  publish_date TEXT,
  published_at TEXT,
  published_url TEXT,
  view_count INTEGER DEFAULT 0,
  assignee_ids TEXT,            -- JSON
  budget_total REAL DEFAULT 0,
  budget_partner REAL DEFAULT 0,
  budget_management REAL DEFAULT 0,
  created_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  updated_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
);

-- episodes --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS episodes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  episode_number INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  client TEXT,
  client_id TEXT REFERENCES clients(id),
  work_content TEXT,            -- JSON
  work_items TEXT,              -- JSON
  status TEXT DEFAULT 'waiting',
  assignee TEXT,
  manager TEXT,
  start_date TEXT,
  end_date TEXT,
  due_date TEXT,
  budget_total REAL DEFAULT 0,
  budget_partner REAL DEFAULT 0,
  budget_management REAL DEFAULT 0,
  work_steps TEXT,              -- JSON
  work_budgets TEXT,            -- JSON
  payment_due_date TEXT,
  payment_status TEXT DEFAULT 'pending',
  invoice_date TEXT,
  invoice_status TEXT DEFAULT 'pending',
  completed_at TEXT,
  created_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  updated_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
);
-- Migration 20260307000001 fold-in: ensure client_id exists
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS client_id TEXT REFERENCES clients(id);

-- trash -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trash (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  data TEXT NOT NULL,           -- JSON-stringified payload
  original_project_id TEXT,
  deleted_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
);

-- portfolio_items -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS portfolio_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  client TEXT,
  partner_id TEXT,
  category TEXT,
  display_order INTEGER DEFAULT 0,
  completed_at TEXT,
  tags TEXT,                    -- JSON
  youtube_url TEXT,
  is_published INTEGER DEFAULT 0,
  created_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  updated_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
);

-- inquiries -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inquiries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  project_type TEXT,
  budget TEXT,
  message TEXT,
  references_links TEXT,        -- JSON
  portfolio_references TEXT,    -- JSON
  referral_source TEXT,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  updated_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
);

-- feedback --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  page_path TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
);

-- expenses --------------------------------------------------------------------
-- Reconciles SQLite schema.sql (TEXT id, currency, payment_type,
-- next_renewal_date, etc.) with PG migrations 20260328000001/000002.
-- We use the union of columns. id is TEXT to match the app convention; the
-- migration's gen_random_uuid() default is approximated by a TEXT default.
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'KRW',
  category TEXT NOT NULL DEFAULT '기타',
  payment_type TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_renewal_date TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  cancel_reason TEXT,
  description TEXT,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  spender_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'KRW';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_type TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS next_renewal_date TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS spender_name TEXT;

-- sent_emails -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sent_emails (
  id TEXT PRIMARY KEY,
  sender_id TEXT,
  sender_email TEXT,
  "to" TEXT,                    -- JSON
  cc TEXT,                      -- JSON
  bcc TEXT,                     -- JSON
  subject TEXT,
  content TEXT,
  status TEXT DEFAULT 'sent',
  created_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
);

-- app_updates -----------------------------------------------------------------
-- Reconciles SQLite (app/date/title/body/tags) with PG migration
-- 20260406000001 (app/version/title/date/tag/changes). We keep both shapes
-- as additive columns so either client code path works.
CREATE TABLE IF NOT EXISTS app_updates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  app TEXT NOT NULL,
  version TEXT,
  date DATE DEFAULT CURRENT_DATE,
  title TEXT,
  body TEXT,
  tag TEXT CHECK (tag IS NULL OR tag IN ('latest', 'major')),
  tags TEXT,                    -- JSON (legacy SQLite shape)
  changes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE app_updates ADD COLUMN IF NOT EXISTS version TEXT;
ALTER TABLE app_updates ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE app_updates ADD COLUMN IF NOT EXISTS tag TEXT;
ALTER TABLE app_updates ADD COLUMN IF NOT EXISTS tags TEXT;
ALTER TABLE app_updates ADD COLUMN IF NOT EXISTS changes JSONB DEFAULT '[]'::jsonb;

-- strategy_groups -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS strategy_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT,
  created_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  updated_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
);

-- strategy_docs ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS strategy_docs (
  id TEXT PRIMARY KEY,
  group_id TEXT REFERENCES strategy_groups(id) ON DELETE SET NULL,
  title TEXT,
  emoji TEXT,
  content TEXT,
  pinned INTEGER DEFAULT 0,
  created_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  updated_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
);

-- push_subscriptions ----------------------------------------------------------
-- Reconciles SQLite (TEXT user_id) with PG migration 20260412000001
-- (UUID user_id REFERENCES auth.users). We use TEXT for user_id since the
-- SQLite path uses string ids; if you want auth.users FK enforcement, add
-- it manually after first deploy.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- ----------------------------------------------------------------------------
-- 3. Indexes (SQLite + migration 20260307000002)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_episodes_project ON episodes(project_id);
CREATE INDEX IF NOT EXISTS idx_episodes_project_id ON episodes(project_id);
CREATE INDEX IF NOT EXISTS idx_sprints_project ON sprints(project_id);
CREATE INDEX IF NOT EXISTS idx_content_items_project ON content_items(project_id);
CREATE INDEX IF NOT EXISTS idx_checklists_user ON checklists(user_id);
CREATE INDEX IF NOT EXISTS idx_checklists_user_id ON checklists(user_id);
CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_strategy_docs_group ON strategy_docs(group_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_client_name ON projects(client);
CREATE INDEX IF NOT EXISTS idx_trash_deleted_at ON trash(deleted_at);
CREATE INDEX IF NOT EXISTS idx_app_updates_app_date ON app_updates(app, date DESC);

-- ----------------------------------------------------------------------------
-- 4. updated_at triggers (migration 20260307000003 + expenses)
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_projects_updated_at') THEN
    CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_clients_updated_at') THEN
    CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON clients
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_episodes_updated_at') THEN
    CREATE TRIGGER trg_episodes_updated_at BEFORE UPDATE ON episodes
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_portfolio_updated_at') THEN
    CREATE TRIGGER trg_portfolio_updated_at BEFORE UPDATE ON portfolio_items
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_inquiries_updated_at') THEN
    CREATE TRIGGER trg_inquiries_updated_at BEFORE UPDATE ON inquiries
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_partners_updated_at') THEN
    CREATE TRIGGER trg_partners_updated_at BEFORE UPDATE ON partners
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_expenses_updated_at') THEN
    CREATE TRIGGER trg_expenses_updated_at BEFORE UPDATE ON expenses
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. RLS + permissive policies (per migrations)
-- The app accesses Supabase via the service_role key; RLS-on with permissive
-- policies matches what was deployed. Tighten later if you switch to anon key.
-- ----------------------------------------------------------------------------
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'expenses_all' AND tablename = 'expenses') THEN
    CREATE POLICY "expenses_all" ON expenses FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE app_updates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all' AND tablename = 'app_updates') THEN
    CREATE POLICY "service_role_all" ON app_updates FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'push_subscriptions_all' AND tablename = 'push_subscriptions') THEN
    -- Permissive policy because user_id is TEXT (not auth.uid() comparable
    -- when using service_role). If you later migrate user_id to UUID with
    -- auth.users FK, replace with the migration's auth.uid() = user_id rule.
    CREATE POLICY "push_subscriptions_all" ON push_subscriptions FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- End of full_schema.postgres.sql
-- ============================================================================
