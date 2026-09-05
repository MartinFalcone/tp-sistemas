/**
 * Autenticación del panel de admin.
 *
 * Usa Web Crypto (`crypto.subtle`) y no `node:crypto` a propósito: el middleware
 * de Next corre en el runtime Edge, donde `node:crypto` no existe. Web Crypto
 * funciona igual en el middleware, en los Route Handlers y en Node.
 *
 * No importa `server-only` porque el middleware tiene que poder usarlo. Igual no
 * hay riesgo de filtrar la contraseña: Next solo inyecta al bundle del cliente
 * las variables con prefijo `NEXT_PUBLIC_`, y `ADMIN_PASSWORD` no lo tiene, así
 * que en el navegador queda `undefined`.
 */

export const ADMIN_COOKIE = "quiz.admin";
export const ADMIN_SESSION_HOURS = 12;

const MAX_AGE_SECONDS = ADMIN_SESSION_HOURS * 60 * 60;
const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(value: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

async function hmacHex(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
}

/**
 * Comparación en tiempo constante.
 *
 * Recorre siempre el largo mayor y acumula las diferencias con OR, para no
 * cortar en el primer carácter distinto. La diferencia de largo también entra en
 * el acumulador.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/**
 * Compara la contraseña tipeada con la real.
 *
 * Se comparan los digests SHA-256, no los textos: así la comparación siempre
 * recorre 64 caracteres y ni el tiempo ni el largo dicen nada de la contraseña.
 */
export async function passwordMatches(
  candidate: string,
  expected: string,
): Promise<boolean> {
  const [a, b] = await Promise.all([
    sha256Hex(candidate),
    sha256Hex(expected),
  ]);
  return timingSafeEqual(a, b);
}

/**
 * Token de sesión: `vencimiento.firma`.
 *
 * La firma es un HMAC del vencimiento con `ADMIN_PASSWORD` como clave, así que
 * nadie puede fabricar uno ni estirarle la validez sin conocer la contraseña.
 * No hay estado en la base: la cookie se valida sola.
 */
export async function createSessionToken(
  secret: string,
  now: number = Date.now(),
): Promise<string> {
  const expiresAt = now + MAX_AGE_SECONDS * 1000;
  const signature = await hmacHex(String(expiresAt), secret);
  return `${expiresAt}.${signature}`;
}

export async function verifySessionToken(
  token: string | undefined | null,
  secret: string,
  now: number = Date.now(),
): Promise<boolean> {
  if (!token) return false;

  const separator = token.lastIndexOf(".");
  if (separator <= 0) return false;

  const expiresAt = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  const expiresAtMs = Number(expiresAt);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= now) return false;

  const expected = await hmacHex(expiresAt, secret);
  return timingSafeEqual(signature, expected);
}

/** Opciones de la cookie de sesión. */
export const adminCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
  // En producción va sobre HTTPS (Vercel); en local, http.
  secure: process.env.NODE_ENV === "production",
} as const;

/**
 * Lee `ADMIN_PASSWORD`. Tira con un mensaje claro si falta, para que no se
 * despliegue un panel sin contraseña por accidente.
 */
export function readAdminPassword(): string {
  const value = process.env.ADMIN_PASSWORD;
  if (!value || value.trim() === "") {
    throw new Error(
      "Falta la variable de entorno ADMIN_PASSWORD. Sin ella el panel de admin no puede protegerse.",
    );
  }
  return value.trim();
}
