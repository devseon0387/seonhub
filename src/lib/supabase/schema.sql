-- =============================================
-- VIDEO MOMENT - Supabase Schema
-- Supabase 대시보드 > SQL Editor에서 실행
-- =============================================

-- 파트너
create table if not exists partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  company text,
  partner_type text, -- 'freelancer' | 'business'
  role text not null default 'partner',
  status text not null default 'active',
  generation int,
  bank text,
  bank_account text,
  profile_image text,
  created_at timestamptz default now()
);

-- 클라이언트
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_person text,
  email text,
  phone text,
  company text,
  address text,
  status text not null default 'active',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 프로젝트
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  client text,
  partner_id text,                     -- 파트너 ID (uuid 문자열)
  status text not null default 'planning',
  total_amount numeric default 0,
  partner_payment numeric default 0,
  management_fee numeric default 0,
  margin_rate numeric default 0,
  work_content text[],
  tags text[],
  thumbnail_url text,
  video_url text,
  completed_at timestamptz,
  work_type_costs jsonb,               -- 작업별 비용 정보 (복잡한 중첩 데이터)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 회차
create table if not exists episodes (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,            -- 프로젝트 ID
  episode_number int not null,
  title text not null,
  description text,
  client text,
  work_content text[],
  work_items jsonb,                    -- 작업 항목 상세 (EpisodeWorkItem[])
  status text not null default 'waiting',
  assignee text,                       -- 담당자 파트너 ID
  manager text,                        -- 매니저 ID
  start_date text,
  end_date text,
  due_date text,
  budget_total numeric default 0,
  budget_partner numeric default 0,
  budget_management numeric default 0,
  work_steps jsonb,                    -- 작업 단계 (Record<WorkContentType, WorkStep[]>)
  work_budgets jsonb,                  -- 작업별 예산 (Record<WorkContentType, WorkTypeBudget>)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 휴지통
create table if not exists trash (
  id uuid primary key default gen_random_uuid(),
  type text not null,                  -- 'project' | 'episode' | 'client' | 'partner'
  data jsonb not null,                 -- 원본 데이터 전체
  original_project_id text,            -- 회차의 경우 원래 프로젝트 ID
  deleted_at timestamptz default now()
);

-- 포트폴리오 항목
create table if not exists portfolio_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  client text,
  partner_id text,
  completed_at text,
  tags text[] default '{}',
  youtube_url text,
  is_published boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── RLS 활성화 ───────────────────────────────────────────

alter table partners enable row level security;
alter table clients enable row level security;
alter table projects enable row level security;
alter table episodes enable row level security;
alter table trash enable row level security;
alter table portfolio_items enable row level security;

-- ─── 정책: 로그인 사용자 전체 접근 허용 ────────────────────

create policy "auth_all_partners" on partners
  for all using (auth.role() = 'authenticated');

create policy "auth_all_clients" on clients
  for all using (auth.role() = 'authenticated');

create policy "auth_all_projects" on projects
  for all using (auth.role() = 'authenticated');

create policy "auth_all_episodes" on episodes
  for all using (auth.role() = 'authenticated');

create policy "auth_all_trash" on trash
  for all using (auth.role() = 'authenticated');

create policy "auth_all_portfolio" on portfolio_items
  for all using (auth.role() = 'authenticated');
