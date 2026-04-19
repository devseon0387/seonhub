import { NextResponse, type NextRequest } from 'next/server';
import { verifySession, AUTH_COOKIE } from '@/lib/local-db/session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const user = await verifySession(token);

  if (pathname.startsWith('/signup')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith('/api/mcp')) {
    const apiKey = request.headers.get('x-api-key');
    const expectedKey = process.env.API_SECRET_KEY;
    if (!expectedKey || apiKey !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next({ request });
  }

  if (pathname.startsWith('/api/strategy')) {
    const apiKey = request.headers.get('x-api-key');
    const expectedKey = process.env.API_SECRET_KEY;
    if (apiKey && expectedKey && apiKey === expectedKey) return NextResponse.next({ request });
    if (user) return NextResponse.next({ request });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/api/auth') || pathname.startsWith('/api/local-db');

  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && pathname.startsWith('/login')) {
    const url = request.nextUrl.clone();
    url.pathname = '/management';
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest\\.json|sw\\.js|icons/.*|opengraph-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|html)$).*)',
  ],
};
