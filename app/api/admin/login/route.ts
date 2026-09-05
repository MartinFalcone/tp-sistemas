import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ADMIN_COOKIE,
  adminCookieOptions,
  createSessionToken,
  passwordMatches,
  readAdminPassword,
} from "@/lib/adminAuth";
import type { ApiError } from "@/lib/types";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ password: z.string() });

/** POST /api/admin/login — cambia la contraseña por una cookie firmada. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiError>(
      { error: "No se pudo leer el pedido." },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiError>(
      { error: "Escribí la contraseña." },
      { status: 400 },
    );
  }

  let secret: string;
  try {
    secret = readAdminPassword();
  } catch (error) {
    console.error("[/api/admin/login]", error);
    return NextResponse.json<ApiError>(
      { error: "El panel no está configurado: falta ADMIN_PASSWORD." },
      { status: 503 },
    );
  }

  if (!(await passwordMatches(parsed.data.password, secret))) {
    // Sin pistas: ni "muy corta" ni "casi". Y sin decir si el panel existe.
    return NextResponse.json<ApiError>(
      { error: "Contraseña incorrecta." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, await createSessionToken(secret), adminCookieOptions);
  return response;
}
