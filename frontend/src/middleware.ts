import { NextRequest, NextResponse } from "next/server";

/**
 * Protected route prefixes that require an authenticated session.
 * Guests are immediately 302-redirected to /login.
 */
const PROTECTED_PREFIXES = ["/studio", "/admin", "/billing", "/dashboard"];

/**
 * Admin-only route prefixes.
 * Authenticated non-admin users are redirected to /studio.
 */
const ADMIN_PREFIXES = ["/admin"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const token = request.cookies.get("token")?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl, 302);
  }

  // Admin-only enforcement: parse user cookie to check is_admin flag.
  const isAdminRoute = ADMIN_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (isAdminRoute) {
    const userCookie = request.cookies.get("user")?.value;
    let isAdmin = false;
    if (userCookie) {
      try {
        const user = JSON.parse(decodeURIComponent(userCookie));
        isAdmin = Boolean(user?.is_admin);
      } catch {
        isAdmin = false;
      }
    }
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/studio", request.url), 302);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico
     * - API routes (handled by FastAPI backend)
     * - login / register pages themselves
     */
    "/((?!_next/static|_next/image|favicon.ico|login|register|api/).*)",
  ],
};
