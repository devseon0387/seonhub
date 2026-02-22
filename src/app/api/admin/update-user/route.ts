import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  // 요청자가 admin인지 확인
  const serverSupabase = await createServerClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const { data: profile } = await serverSupabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }

  const { userId, email, password, name } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: '유저 ID가 필요합니다' }, { status: 400 });
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // auth.users 이메일/비밀번호 업데이트
  const authUpdate: Record<string, string> = {};
  if (email) authUpdate.email = email;
  if (password) authUpdate.password = password;

  if (Object.keys(authUpdate).length > 0) {
    const { error } = await adminSupabase.auth.admin.updateUserById(userId, authUpdate);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // user_profiles 이름/이메일 업데이트
  const profileUpdate: Record<string, string> = {};
  if (name !== undefined) profileUpdate.name = name;
  if (email) profileUpdate.email = email;

  if (Object.keys(profileUpdate).length > 0) {
    await adminSupabase.from('user_profiles').update(profileUpdate).eq('id', userId);
  }

  return NextResponse.json({ ok: true });
}
