-- Theories: tags TEXT[] → TEXT (JSON-stringified, 기존 프로젝트 패턴 매칭)
-- 이유: src/lib/local-db/db.ts 의 encodeRow 가 JS 배열/객체를 자동 JSON.stringify 하는
-- 레거시 직렬화 패턴을 사용. 진짜 Postgres TEXT[]/JSONB 에 직접 넣으면 "malformed array literal" 발생.

ALTER TABLE theories ALTER COLUMN tags DROP DEFAULT;
ALTER TABLE theories ALTER COLUMN tags TYPE TEXT USING tags::text;

-- Theory queries: filter JSONB → TEXT (JSON-stringified)
ALTER TABLE theory_queries ALTER COLUMN filter DROP NOT NULL;
ALTER TABLE theory_queries ALTER COLUMN filter DROP DEFAULT;
ALTER TABLE theory_queries ALTER COLUMN filter TYPE TEXT USING filter::text;
