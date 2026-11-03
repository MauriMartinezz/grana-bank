import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/features/auth/session-cookie";

/**
 * Optimistic check: it only avoids rendering private screens for visitors with
 * no cookie. `getCurrentUser()` is what actually validates the session.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL("/ingresar", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/inicio",
    "/movimientos/:path*",
    "/transferir/:path*",
    "/servicios",
    "/recargas",
    "/tarjetas/:path*",
    "/dolares/:path*",
    "/perfil/:path*",
  ],
};
