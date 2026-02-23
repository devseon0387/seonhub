import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
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

    const { name, email, role, password } = await req.json();
    if (!email || !password || !name) {
      return NextResponse.json({ error: '이름, 이메일, 비밀번호는 필수입니다' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: '비밀번호는 6자 이상이어야 합니다' }, { status: 400 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다' }, { status: 500 });
    }

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // auth 유저 생성
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    const userId = authData.user.id;

    // user_profiles에 upsert
    const { error: profileError } = await adminSupabase
      .from('user_profiles')
      .upsert({
        id: userId,
        name: name.trim(),
        email,
        role: role || 'manager',
        approved: true,
        needs_password_change: true,
      }, { onConflict: 'id' });

    if (profileError) {
      return NextResponse.json({ error: '프로필 생성 실패: ' + profileError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, userId });
  } catch (err) {
    return NextResponse.json({ error: '서버 내부 오류: ' + String(err) }, { status: 500 });
  }
}
