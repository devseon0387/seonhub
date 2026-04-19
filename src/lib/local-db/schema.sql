-- SEON Hub local SQLite schema
-- 배열/JSON은 TEXT(JSON 문자열)로 저장, shim에서 자동 parse/stringify

CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  role TEXT DEFAULT 'viewer',
  approved INTEGER DEFAULT 0,
  password_hash TEXT,
  needs_password_change INTEGER DEFAULT 0,
  tutorial_done TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS custom_roles (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS checklists (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  text TEXT,
  completed INTEGER DEFAULT 0,
  reminder_time TEXT,
  notified INTEGER DEFAULT 0,
  repeat_type TEXT,
  repeat_days TEXT,
  linked_episode_id TEXT,
  linked_episode_title TEXT,
  linked_episode_number INTEGER,
  linked_project_id TEXT,
  linked_project_title TEXT,
  linked_client_name TEXT,
  linked_partner_id TEXT,
  linked_partner_name TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

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
  created_at TEXT DEFAULT (datetime('now'))
);

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
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'video',
  description TEXT,
  client TEXT,
  client_id TEXT,
  partner_id TEXT,
  partner_ids TEXT,
  manager_ids TEXT,
  category TEXT,
  channels TEXT,
  status TEXT DEFAULT 'planning',
  total_amount REAL DEFAULT 0,
  partner_payment REAL DEFAULT 0,
  management_fee REAL DEFAULT 0,
  margin_rate REAL DEFAULT 0,
  work_content TEXT,
  tags TEXT,
  thumbnail_url TEXT,
  video_url TEXT,
  completed_at TEXT,
  work_type_costs TEXT,
  meta TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

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
  assignee_ids TEXT,
  budget_total REAL DEFAULT 0,
  budget_partner REAL DEFAULT 0,
  budget_management REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

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
  assignee_ids TEXT,
  budget_total REAL DEFAULT 0,
  budget_partner REAL DEFAULT 0,
  budget_management REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS episodes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  episode_number INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  client TEXT,
  client_id TEXT,
  work_content TEXT,
  work_items TEXT,
  status TEXT DEFAULT 'waiting',
  assignee TEXT,
  manager TEXT,
  start_date TEXT,
  end_date TEXT,
  due_date TEXT,
  budget_total REAL DEFAULT 0,
  budget_partner REAL DEFAULT 0,
  budget_management REAL DEFAULT 0,
  work_steps TEXT,
  work_budgets TEXT,
  payment_due_date TEXT,
  payment_status TEXT DEFAULT 'pending',
  invoice_date TEXT,
  invoice_status TEXT DEFAULT 'pending',
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trash (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  data TEXT NOT NULL,
  original_project_id TEXT,
  deleted_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS portfolio_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  client TEXT,
  partner_id TEXT,
  category TEXT,
  display_order INTEGER DEFAULT 0,
  completed_at TEXT,
  tags TEXT,
  youtube_url TEXT,
  is_published INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inquiries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  project_type TEXT,
  budget TEXT,
  message TEXT,
  references_links TEXT,
  portfolio_references TEXT,
  referral_source TEXT,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  page_path TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  amount REAL DEFAULT 0,
  currency TEXT DEFAULT 'KRW',
  category TEXT,
  payment_type TEXT,
  expense_date TEXT,
  next_renewal_date TEXT,
  status TEXT DEFAULT 'active',
  cancel_reason TEXT,
  description TEXT,
  spender_name TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sent_emails (
  id TEXT PRIMARY KEY,
  sender_id TEXT,
  sender_email TEXT,
  "to" TEXT,
  cc TEXT,
  bcc TEXT,
  subject TEXT,
  content TEXT,
  status TEXT DEFAULT 'sent',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS app_updates (
  id TEXT PRIMARY KEY,
  app TEXT NOT NULL,
  date TEXT,
  title TEXT,
  body TEXT,
  tags TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS strategy_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS strategy_docs (
  id TEXT PRIMARY KEY,
  group_id TEXT,
  title TEXT,
  emoji TEXT,
  content TEXT,
  pinned INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  endpoint TEXT UNIQUE,
  p256dh TEXT,
  auth TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_episodes_project ON episodes(project_id);
CREATE INDEX IF NOT EXISTS idx_sprints_project ON sprints(project_id);
CREATE INDEX IF NOT EXISTS idx_content_items_project ON content_items(project_id);
CREATE INDEX IF NOT EXISTS idx_checklists_user ON checklists(user_id);
CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_strategy_docs_group ON strategy_docs(group_id);
