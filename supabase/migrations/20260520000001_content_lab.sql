-- Content Lab: 이론(논문) + 증거 연결 + 조건 질의
-- 콘텐츠/기획/마케팅 통찰을 논문 형식으로 축적, Content Studio 데이터로 실증 검증

-- 1) theories ----------------------------------------------------------------
-- 한 이론 = 한 논문. 상태: hypothesis(가설) | testing(검증중) | validated(입증) | refuted(반증) | archived
CREATE TABLE IF NOT EXISTS theories (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'hypothesis',
  template TEXT,                -- 'performance' | 'planning' | 'marketing' | 'empty' 등
  -- 메타
  tags TEXT[] DEFAULT '{}',
  author_id TEXT,
  -- 본문 섹션 (Phase A: 텍스트, Phase C: Tiptap JSON)
  abstract TEXT,
  hypothesis TEXT,
  background TEXT,
  method TEXT,
  analysis TEXT,
  conclusion TEXT,
  implications TEXT,
  references_text TEXT,
  -- 자유 본문(나중에 노션식으로 확장 시 메인 영역)
  body TEXT,
  -- 타임스탬프
  created_at TEXT DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  updated_at TEXT DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
);

CREATE INDEX IF NOT EXISTS idx_theories_status ON theories(status);
CREATE INDEX IF NOT EXISTS idx_theories_updated ON theories(updated_at DESC);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_theories_updated_at') THEN
    CREATE TRIGGER trg_theories_updated_at
      BEFORE UPDATE ON theories
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

ALTER TABLE theories ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='theories_all' AND tablename='theories') THEN
    CREATE POLICY "theories_all" ON theories FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 2) theory_evidence ---------------------------------------------------------
-- 수동으로 연결한 프로젝트 = 증거
-- role: 'supports' (지지) | 'refutes' (반증) | 'neutral' (중립/관찰)
CREATE TABLE IF NOT EXISTS theory_evidence (
  id TEXT PRIMARY KEY,
  theory_id TEXT NOT NULL REFERENCES theories(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'supports',
  note TEXT,
  created_at TEXT DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
);

CREATE INDEX IF NOT EXISTS idx_theory_evidence_theory ON theory_evidence(theory_id);
CREATE INDEX IF NOT EXISTS idx_theory_evidence_project ON theory_evidence(project_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_theory_evidence_theory_project
  ON theory_evidence(theory_id, project_id);

ALTER TABLE theory_evidence ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='theory_evidence_all' AND tablename='theory_evidence') THEN
    CREATE POLICY "theory_evidence_all" ON theory_evidence FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 3) theory_queries ----------------------------------------------------------
-- 조건 질의 (Phase B 자동 evidence 수집용)
-- filter JSON: { format?: 'longform'|'shortform', tags?: string[], platforms?: string[], minViews?: number ... }
CREATE TABLE IF NOT EXISTS theory_queries (
  id TEXT PRIMARY KEY,
  theory_id TEXT NOT NULL REFERENCES theories(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'supports',
  label TEXT,
  filter JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TEXT DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
);

CREATE INDEX IF NOT EXISTS idx_theory_queries_theory ON theory_queries(theory_id);

ALTER TABLE theory_queries ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='theory_queries_all' AND tablename='theory_queries') THEN
    CREATE POLICY "theory_queries_all" ON theory_queries FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
