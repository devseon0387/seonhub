-- 앱 업데이트 내역 테이블 (ERP/비봇 릴리즈 노트)
CREATE TABLE IF NOT EXISTS app_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  app TEXT NOT NULL CHECK (app IN ('erp', 'bibot')),
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  tag TEXT CHECK (tag IN ('latest', 'major', NULL)),
  changes JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_app_updates_app_date ON app_updates (app, date DESC);

-- RLS 비활성화 (service_role로만 접근)
ALTER TABLE app_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON app_updates FOR ALL USING (true) WITH CHECK (true);
