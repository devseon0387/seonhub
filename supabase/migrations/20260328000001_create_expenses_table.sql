-- 지출(expenses) 테이블 생성
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT '기타',
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  description text,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  spender_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- updated_at 자동 갱신 트리거 (기존 update_updated_at 함수 재사용)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_expenses_updated_at') THEN
    CREATE TRIGGER trg_expenses_updated_at
      BEFORE UPDATE ON public.expenses
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'expenses_all' AND tablename = 'expenses') THEN
    CREATE POLICY "expenses_all" ON public.expenses
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
