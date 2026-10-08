import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// Next 16: proxy.ts reemplaza a middleware.ts. Las rutas /api validan sesión por su cuenta.
export async function proxy(request: NextRequest) {
  const isLogin = request.nextUrl.pathname === "/login";
  const authed = await verifySession(request.cookies.get(SESSION_COOKIE)?.value).catch(() => false);

  if (isLogin && authed) return NextResponse.redirect(new URL("/", request.url));
  if (!isLogin && !authed) {
    const url = new URL("/login", request.url);
    if (request.nextUrl.pathname !== "/") url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
