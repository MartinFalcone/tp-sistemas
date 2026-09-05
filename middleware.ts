import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_COOKIE, verifySessionToken } from "@/lib/adminAuth";

/**
 * Protege todo `/admin/*` (menos el login) y todos los `/api/admin/*`.
 *
 * Corre en el runtime Edge, así que solo puede usar Web Crypto. Por eso la
 * verificación del token vive en `lib/adminAuth.ts` y no usa `node:crypto`.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // El login y su endpoint tienen que quedar afuera, o no se podría entrar.
  if (pathname === "/admin/login" || pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  const secret = process.env.ADMIN_PASSWORD;
  const isApi = pathname.startsWith("/api/");

  // Sin contraseña configurada no se abre el panel: es preferible un panel
  // inaccesible a uno abierto.
  if (!secret) {
    return isApi
      ? NextResponse.json(
          { error: "El panel no está configurado: falta ADMIN_PASSWORD." },
          { status: 503 },
        )
      : NextResponse.redirect(new URL("/admin/login?error=config", request.url));
  }

  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  if (await verifySessionToken(token, secret)) {
    return NextResponse.next();
  }

  if (isApi) {
    return NextResponse.json(
      { error: "Tu sesión venció. Volvé a entrar al panel." },
      { status: 401 },
    );
  }

  const login = new URL("/admin/login", request.url);
  // Para volver a donde estaba después de entrar.
  if (pathname !== "/admin") login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
