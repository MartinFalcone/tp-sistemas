import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./types";

/**
 * Cliente de Supabase con la secret key.
 *
 * Este módulo importa `server-only`: si algún componente cliente o cualquier
 * archivo con "use client" lo llega a importar, el build de Next falla en vez de
 * mandar la secret key al navegador.
 *
 * No usamos RLS ni auth de Supabase. Este cliente ignora RLS y puede hacer todo,
 * así que ninguna request de un jugador debe traducirse directo en una query:
 * todo pasa antes por validación con zod en un Route Handler.
 */

export type QuizSupabaseClient = SupabaseClient<Database>;

let cached: QuizSupabaseClient | null = null;

function readEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Falta la variable de entorno ${name}. ` +
        `Copiá .env.example a .env.local y completala (en Vercel, cargala en Project Settings -> Environment Variables).`,
    );
  }
  return value.trim();
}

/**
 * Devuelve el cliente admin, creándolo la primera vez.
 *
 * Es lazy a propósito: si tirara al importarse, un deploy sin las env vars
 * cargadas rompería el build entero en vez de fallar en la request que las usa.
 */
export function getSupabaseAdmin(): QuizSupabaseClient {
  if (typeof window !== "undefined") {
    // Red de contención por si alguien saltea `server-only` (por ejemplo con un
    // bundler distinto). La secret key no puede salir del servidor jamás.
    throw new Error(
      "getSupabaseAdmin() se llamó desde el navegador. El cliente admin es solo de servidor.",
    );
  }

  if (cached) return cached;

  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const secretKey = readEnv("SUPABASE_SECRET_KEY");

  cached = createClient<Database>(url, secretKey, {
    auth: {
      // No hay sesiones de usuario: la key es la identidad.
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: { "x-application-name": "quiz-matriz-de-punto" },
    },
  });

  return cached;
}

/** La password del panel de admin. Solo servidor. */
export function getAdminPassword(): string {
  return readEnv("ADMIN_PASSWORD");
}
