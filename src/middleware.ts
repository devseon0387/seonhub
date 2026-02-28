import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 세션 토큰 자동 갱신 (IMPORTANT: getUser 호출 필수)
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  // /signup 접근 시 /login으로 리다이렉트
  if (pathname.startsWith('/signup')) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/api/auth') || pathname.startsWith('/api/mcp') || pathname.startsWith('/api/strategy');
  const isApiRoute = pathname.startsWith('/api/');

  if (!user && !isAuthPage) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  // 인증된 사용자가 대시보드에 접근할 때 승인 여부 및 비밀번호 변경 확인
  if (user && !isAuthPage && !isApiRoute) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('approved, role, needs_password_change')
      .eq('id', user.id)
      .single();

    // 프로필이 없거나 미승인 비관리자 → 로그인 페이지로
    if (!profile || (profile.role !== 'admin' && profile.approved !== true)) {
      // 세션 쿠키 제거
      await supabase.auth.signOut();
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      return NextResponse.redirect(loginUrl);
    }

    // 비밀번호 변경이 필요한 경우 → /change-password로 강제 이동
    if (profile.needs_password_change === true && !pathname.startsWith('/change-password')) {
      const cpUrl = request.nextUrl.clone();
      cpUrl.pathname = '/change-password';
      return NextResponse.redirect(cpUrl);
    }
  }

  if (user && isAuthPage) {
    // 승인된 사용자만 대시보드로 리다이렉트
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('approved, role')
      .eq('id', user.id)
      .single();

    if (profile && (profile.role === 'admin' || profile.approved === true)) {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = '/management';
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
