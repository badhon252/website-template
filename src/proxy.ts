import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV !== "production";
  const apiOrigin = process.env.NEXT_PUBLIC_API_URL
    ? new URL(process.env.NEXT_PUBLIC_API_URL).origin
    : "";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Radix and motion components use inline style attributes.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://img.freepik.com https://res.cloudinary.com https://api.dicebear.com",
    "font-src 'self'",
    `connect-src 'self' ${apiOrigin}${isDev ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(!isDev ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  let response: NextResponse;
  const { pathname } = request.nextUrl;
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    const token = await getToken({ req: request });
    if (!token || token.error === "RefreshAccessTokenError") {
      const callbackUrl = encodeURIComponent(pathname);
      response = NextResponse.redirect(
        new URL(`/login?callbackUrl=${callbackUrl}`, request.url),
      );
    } else if (token.role?.toUpperCase() !== "ADMIN") {
      response = NextResponse.redirect(new URL("/", request.url));
    } else {
      response = NextResponse.next({ request: { headers: requestHeaders } });
    }
  } else {
    response = NextResponse.next({ request: { headers: requestHeaders } });
  }
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|assets|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
