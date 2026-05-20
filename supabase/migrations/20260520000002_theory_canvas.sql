-- Theory 캔버스(다이어그램) 영역 추가
-- canvas: Excalidraw scene JSON 문자열
ALTER TABLE theories ADD COLUMN IF NOT EXISTS canvas TEXT;
