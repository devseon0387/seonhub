import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';

export async function GET() {
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

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다' }, { status: 500 });
    }

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // 전체 사용자 조회 (페이지네이션 처리)
    const allUsers: { id: string; lastSignInAt: string | null }[] = [];
    let page = 1;
    const perPage = 100;
    while (true) {
      const { data: { users }, error } = await adminSupabase.auth.admin.listUsers({ page, perPage });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      for (const u of users) {
        allUsers.push({ id: u.id, lastSignInAt: u.last_sign_in_at ?? null });
      }
      if (users.length < perPage) break;
      page++;
    }

    return NextResponse.json({ users: allUsers });
  } catch (err) {
    console.error('users-activity error:', err);
    return NextResponse.json({ error: '서버 내부 오류가 발생했습니다' }, { status: 500 });
  }
}
