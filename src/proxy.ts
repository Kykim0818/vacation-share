import { auth } from "@/lib/auth/config";
import { NextResponse } from "next/server";

/**
 * Next.js 16 Proxy (구 middleware)
 * - 미인증 사용자를 /login으로 리디렉트
 * - /login, /api/auth/* 경로는 인증 불필요
 */
export const proxy = auth((req) => {
  const isAuthenticated = !!req.auth;
  const { pathname } = req.nextUrl;

  // 인증 불필요 경로
  const isPublicPath =
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth");

  if (!isAuthenticated && !isPublicPath) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 이미 로그인된 사용자가 /login 접근 시 홈으로
  if (isAuthenticated && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * 다음 경로는 제외:
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
