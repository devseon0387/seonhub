import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const { userId, name, email } = await req.json();

  if (!userId || !email) {
    return NextResponse.json({ error: '필수 정보가 누락되었습니다' }, { status: 400 });
  }

  // service_role 키로 RLS 우회
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { error } = await adminSupabase.from('user_profiles').upsert({
    id: userId,
    name: name || null,
    email,
    role: 'pending',
    approved: false,
  }, { onConflict: 'id' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
