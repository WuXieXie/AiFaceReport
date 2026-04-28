import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/session', '/api/auth/logout'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow root redirect
  if (pathname === '/') {
    return NextResponse.next();
  }

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.match(/\.\w+$/)) {
    return NextResponse.next();
  }

  const token = req.cookies.get('token')?.value;
  const isApiRoute = pathname.startsWith('/api/');

  if (!token) {
    if (isApiRoute) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-change-me');
    const { payload } = await jwtVerify(token, secret);

    // Check admin routes (pages and APIs)
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
      if (payload.type !== 'admin') {
        if (isApiRoute) {
          return NextResponse.json({ error: '无权访问' }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    // Check dashboard routes (pages and APIs)
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/dashboard') || pathname.startsWith('/api/analysis')) {
      if (payload.type !== 'employee' && payload.type !== 'admin') {
        if (isApiRoute) {
          return NextResponse.json({ error: '无权访问' }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/login', req.url));
      }
    }

    return NextResponse.next();
  } catch {
    if (isApiRoute) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 });
    }
    const response = NextResponse.redirect(new URL('/login', req.url));
    response.cookies.delete('token');
    return response;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|uploads).*)'],
};
