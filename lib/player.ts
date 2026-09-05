"use client";

/**
 * El jugador guardado en el celular.
 *
 * No hay contraseñas ni sesiones: el `playerId` que devuelve /api/join se guarda
 * en localStorage y con eso alcanza. Si alguien recarga o se queda sin batería,
 * vuelve a su misma partida.
 *
 * Todos los accesos van con try/catch: en modo incógnito, con las cookies
 * bloqueadas o con poco espacio, localStorage tira excepción en vez de fallar
 * silencioso, y eso no puede tumbar la pantalla.
 */

export const PLAYER_STORAGE_KEY = "quiz.player";

export type StoredPlayer = {
  playerId: string;
  nickname: string;
};

function isStoredPlayer(value: unknown): value is StoredPlayer {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.playerId === "string" &&
    candidate.playerId !== "" &&
    typeof candidate.nickname === "string" &&
    candidate.nickname !== ""
  );
}

/** Devuelve el jugador guardado, o null si no hay o está corrupto. */
export function readStoredPlayer(): StoredPlayer | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(PLAYER_STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isStoredPlayer(parsed)) {
      // Basura de una versión anterior: se limpia y se arranca de nuevo.
      window.localStorage.removeItem(PLAYER_STORAGE_KEY);
      return null;
    }

    return { playerId: parsed.playerId, nickname: parsed.nickname };
  } catch {
    return null;
  }
}

export function writeStoredPlayer(player: StoredPlayer): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(player));
  } catch {
    // Sin storage el juego igual funciona hasta que se recargue la página.
  }
}

export function clearStoredPlayer(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PLAYER_STORAGE_KEY);
  } catch {
    // Nada que hacer.
  }
}
