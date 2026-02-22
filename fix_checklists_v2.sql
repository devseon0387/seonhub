-- checklists 테이블 재생성 (user_id FK 제약 없이)
drop table if exists checklists;

create table checklists (
  id              uuid primary key default gen_random_uuid(),
  user_id         text not null default 'local',
  text            text not null,
  completed       boolean not null default false,
  reminder_time   text,
  notified        boolean not null default false,
  repeat_type     text,
  repeat_days     int[],
  linked_episode_id     text,
  linked_episode_title  text,
  linked_episode_number int,
  linked_project_id     text,
  linked_project_title  text,
  linked_client_name    text,
  linked_partner_id     text,
  linked_partner_name   text,
  created_at      timestamptz default now()
);

alter table checklists enable row level security;
create policy "allow_all_checklists" on checklists for all using (true) with check (true);
