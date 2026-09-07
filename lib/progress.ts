"use client";

/**
 * Progreso de la partida guardado en el celular.
 *
 * Dos claves:
 *  - `quiz.progress`: en qué pregunta va y cuándo la empezó.
 *  - `quiz.queue`: respuestas que no se pudieron enviar todavía.
 *
 * Se guarda `startedAt` y no "cuánto tiempo queda" a propósito. Si solo
 * guardáramos el índice, cerrar y reabrir el navegador reiniciaría el
 * cronómetro de la pregunta, y eso es una forma trivial de conseguir el puntaje
 * de velocidad completo. Con el timestamp, el tiempo sigue corriendo.
 *
 * Todos los accesos van con try/catch: en incógnito o con las cookies
 * bloqueadas, `localStorage` tira excepción y no puede tumbar la partida.
 */

export const PROGRESS_STORAGE_KEY = "quiz.progress";
export const QUEUE_STORAGE_KEY = "quiz.queue";

export type StoredProgress = {
  /** Índice de la pregunta actual, empezando en 0. */
  index: number;
  /** Id de esa pregunta, para detectar si cambió el set de preguntas. */
  questionId: string | null;
  /** Timestamp en ms en que se mostró la pregunta. */
  startedAt: number;
  /**
   * El `started_at` de la partida a la que pertenece este progreso.
   *
   * `undefined` es progreso de una versión anterior, que no lo guardaba: se
   * descarta, que es exactamente lo que hay que hacer con él.
   */
  gameStartedAt?: string | null;
};

export type QueuedAnswer = {
  playerId: string;
  questionId: string;
  response: unknown;
  elapsedMs: number;
};

function readJson<T>(key: string, isValid: (value: unknown) => boolean): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValid(parsed)) {
      window.localStorage.removeItem(key);
      return null;
    }
    return parsed as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Sin storage la partida sigue; solo se pierde el reanudar.
  }
}

export function readProgress(): StoredProgress | null {
  return readJson<StoredProgress>(PROGRESS_STORAGE_KEY, (value) => {
    if (typeof value !== "object" || value === null) return false;
    const candidate = value as Record<string, unknown>;
    return (
      typeof candidate.index === "number" &&
      Number.isInteger(candidate.index) &&
      candidate.index >= 0 &&
      typeof candidate.startedAt === "number" &&
      Number.isFinite(candidate.startedAt) &&
      (candidate.questionId === null || typeof candidate.questionId === "string")
    );
  });
}

export function writeProgress(progress: StoredProgress): void {
  writeJson(PROGRESS_STORAGE_KEY, progress);
}

/**
 * ¿Este progreso es de la ronda que está corriendo ahora?
 *
 * El expositor abre y cierra la partida varias veces: un ensayo, después la
 * real. Sin esta comprobación, el celular que ya terminó una ronda arranca la
 * siguiente directo en "Terminaste", porque su índice quedó apuntando más allá
 * de la última pregunta y nada lo vuelve a poner en cero.
 *
 * `game_state.started_at` se reescribe en cada "Comenzar", así que alcanza con
 * guardarlo al lado del progreso y comparar. Es una decisión del servidor: no
 * depende de que el celular haya visto la transición a la sala de espera, y
 * funciona igual si estuvo apagado durante el reinicio.
 */
export function isFromRound(
  progress: StoredProgress | null,
  gameStartedAt: string | null,
): progress is StoredProgress {
  return (
    progress !== null &&
    progress.gameStartedAt !== undefined &&
    progress.gameStartedAt === gameStartedAt
  );
}

export function readQueue(): QueuedAnswer[] {
  const queue = readJson<QueuedAnswer[]>(QUEUE_STORAGE_KEY, (value) =>
    Array.isArray(value) &&
    value.every((item) => {
      if (typeof item !== "object" || item === null) return false;
      const candidate = item as Record<string, unknown>;
      return (
        typeof candidate.playerId === "string" &&
        typeof candidate.questionId === "string" &&
        typeof candidate.elapsedMs === "number"
      );
    }),
  );
  return queue ?? [];
}

export function writeQueue(queue: QueuedAnswer[]): void {
  writeJson(QUEUE_STORAGE_KEY, queue);
}

/** Se llama al cerrar la partida, para no arrastrar basura a una próxima. */
export function clearProgress(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PROGRESS_STORAGE_KEY);
    window.localStorage.removeItem(QUEUE_STORAGE_KEY);
  } catch {
    // Nada que hacer.
  }
}
