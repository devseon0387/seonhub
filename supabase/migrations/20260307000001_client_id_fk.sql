-- 1) projects에 client_id 컬럼 추가
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);

-- 2) 기존 데이터 마이그레이션 (이름 기반 매칭)
UPDATE projects p SET client_id = c.id FROM clients c WHERE p.client = c.name AND p.client_id IS NULL;

-- 3) episodes에도 client_id 추가
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
UPDATE episodes e SET client_id = c.id FROM clients c WHERE e.client = c.name AND e.client_id IS NULL;

-- 4) projects에 channels 컬럼 추가
ALTER TABLE projects ADD COLUMN IF NOT EXISTS channels text[];

-- 5) partners에 updated_at 컬럼 추가
ALTER TABLE partners ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
