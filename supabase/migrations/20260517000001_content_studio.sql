-- Content Studio: projects.format + project_uploads
-- 영상 제작 프로젝트를 롱폼/숏폼으로 분류, 숏폼은 다중 플랫폼 업로드/조회수 추적

-- 1) projects.format ----------------------------------------------------------
-- 'longform' | 'shortform' (NULL = 비-영상 프로젝트)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS format TEXT;

CREATE INDEX IF NOT EXISTS idx_projects_format ON projects(format);

-- 2) project_uploads ----------------------------------------------------------
-- 한 프로젝트(=한 영상)가 여러 플랫폼에 업로드된 결과
-- platform: 'youtube' | 'instagram' | 'tiktok' | 'naver_clip' | 'daangn_story'
CREATE TABLE IF NOT EXISTS project_uploads (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  url TEXT,
  published_at TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  last_synced_at TEXT,
  note TEXT,
  created_at TEXT DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  updated_at TEXT DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
);

CREATE INDEX IF NOT EXISTS idx_project_uploads_project ON project_uploads(project_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_project_uploads_project_platform
  ON project_uploads(project_id, platform);

-- updated_at 트리거 (기존 update_updated_at 함수 재사용)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_project_uploads_updated_at') THEN
    CREATE TRIGGER trg_project_uploads_updated_at
      BEFORE UPDATE ON project_uploads
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- RLS
ALTER TABLE project_uploads ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'project_uploads_all' AND tablename = 'project_uploads'
  ) THEN
    CREATE POLICY "project_uploads_all" ON project_uploads
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
