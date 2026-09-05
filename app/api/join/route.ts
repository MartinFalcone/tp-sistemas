import { NextResponse } from "next/server";

import { normalizeNickname } from "@/lib/normalize";
import { containsProfanity } from "@/lib/profanity";
import { getSupabaseAdmin } from "@/lib/supabase";
import { joinRequestSchema, type ApiError, type JoinResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Código de Postgres para violación de constraint único. */
const UNIQUE_VIOLATION = "23505";

function fail(message: string, status: number) {
  return NextResponse.json<ApiError>({ error: message }, { status });
}

/**
 * POST /api/join — entra a la partida con un apodo.
 *
 * Si el `nickname_key` ya existe devuelve ese mismo jugador en vez de fallar:
 * alguien que recarga la página, se queda sin batería o cambia de red vuelve a
 * su misma partida con su mismo puntaje. Es la operación esperada, no un error.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("No se pudo leer el pedido. Recargá la página y probá de nuevo.", 400);
  }

  const parsed = joinRequestSchema.safeParse(body);
  if (!parsed.success) {
    // El primer mensaje ya está escrito para que lo lea el estudiante.
    const message =
      parsed.error.issues[0]?.message ?? "El apodo no es válido. Probá con otro.";
    return fail(message, 400);
  }

  const nickname = parsed.data.nickname;

  if (containsProfanity(nickname)) {
    return fail("Ese apodo no se puede usar acá. Elegí otro.", 400);
  }

  const nicknameKey = normalizeNickname(nickname);
  if (nicknameKey === "") {
    return fail("Escribí un apodo con al menos una letra o un número.", 400);
  }

  try {
    const db = getSupabaseAdmin();

    const existing = await db
      .from("players")
      .select("id, nickname")
      .eq("nickname_key", nicknameKey)
      .maybeSingle();

    if (existing.error) throw existing.error;

    if (existing.data) {
      await db
        .from("players")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", existing.data.id);

      return NextResponse.json<JoinResponse>({
        playerId: existing.data.id,
        nickname: existing.data.nickname,
      });
    }

    const created = await db
      .from("players")
      .insert({ nickname, nickname_key: nicknameKey })
      .select("id, nickname")
      .single();

    if (created.error) {
      // Dos personas con el mismo apodo tocando "Entrar" al mismo tiempo: el
      // segundo insert choca contra el índice único. No es un error para ellos.
      if (created.error.code === UNIQUE_VIOLATION) {
        const raced = await db
          .from("players")
          .select("id, nickname")
          .eq("nickname_key", nicknameKey)
          .maybeSingle();

        if (raced.data) {
          return NextResponse.json<JoinResponse>({
            playerId: raced.data.id,
            nickname: raced.data.nickname,
          });
        }
      }
      throw created.error;
    }

    return NextResponse.json<JoinResponse>({
      playerId: created.data.id,
      nickname: created.data.nickname,
    });
  } catch (error) {
    console.error("[/api/join]", error);
    return fail(
      "No se pudo entrar a la partida. Esperá unos segundos y tocá Entrar de nuevo.",
      500,
    );
  }
}
