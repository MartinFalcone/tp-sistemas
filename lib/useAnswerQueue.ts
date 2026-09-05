"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  readQueue,
  writeQueue,
  type QueuedAnswer,
} from "./progress";
import { answerResultSchema, type AnswerResult } from "./types";

/** Espera entre reintentos: dos reintentos después del intento inicial. */
const RETRY_DELAYS_MS = [600, 1800];
/** Cada cuánto se vuelve a intentar lo que quedó encolado. */
const FLUSH_INTERVAL_MS = 5000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Un 4xx no se arregla reintentando; un 5xx o un corte de red sí. */
class PermanentError extends Error {}

async function postAnswer(payload: QueuedAnswer): Promise<AnswerResult> {
  const response = await fetch("/api/answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status >= 400 && response.status < 500) {
      throw new PermanentError(`HTTP ${response.status}`);
    }
    throw new Error(`HTTP ${response.status}`);
  }

  const parsed = answerResultSchema.safeParse(await response.json());
  if (!parsed.success) throw new PermanentError("Respuesta inesperada");
  return parsed.data;
}

export type UseAnswerQueue = {
  /**
   * Envía una respuesta. Devuelve el resultado, o null si no se pudo y quedó
   * encolada — en ese caso el alumno tiene que poder seguir igual.
   */
  submit: (payload: QueuedAnswer) => Promise<AnswerResult | null>;
  /** Cuántas respuestas están esperando para enviarse. */
  pendingCount: number;
};

/**
 * Envío de respuestas con reintentos y cola.
 *
 * Con datos móviles malos, perder una respuesta es peor que perder tiempo: se
 * intenta tres veces (inicial + 2 reintentos con backoff) y, si aun así falla,
 * la respuesta queda encolada en `localStorage` y el alumno pasa a la siguiente
 * pregunta. La cola se vacía sola en segundo plano.
 *
 * Que `/api/answer` sea idempotente es lo que hace esto seguro: reenviar la
 * misma respuesta no duplica ni pisa nada.
 */
export function useAnswerQueue(): UseAnswerQueue {
  const [pending, setPending] = useState<QueuedAnswer[]>([]);
  const pendingRef = useRef<QueuedAnswer[]>([]);

  // La cola se lee después de montar: en el servidor no hay localStorage.
  useEffect(() => {
    const stored = readQueue();
    pendingRef.current = stored;
    setPending(stored);
  }, []);

  const persist = useCallback((queue: QueuedAnswer[]) => {
    pendingRef.current = queue;
    writeQueue(queue);
    setPending(queue);
  }, []);

  const submit = useCallback(
    async (payload: QueuedAnswer): Promise<AnswerResult | null> => {
      for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
        try {
          return await postAnswer(payload);
        } catch (error) {
          // La partida cerró, la pregunta no existe, el jugador no existe:
          // reintentar no cambia nada y encolarlo tampoco.
          if (error instanceof PermanentError) return null;
          if (attempt < RETRY_DELAYS_MS.length) {
            await sleep(RETRY_DELAYS_MS[attempt]);
          }
        }
      }

      persist([...pendingRef.current, payload]);
      return null;
    },
    [persist],
  );

  // Vaciado en segundo plano de lo que quedó encolado.
  useEffect(() => {
    if (pending.length === 0) return;

    let cancelled = false;

    async function flush() {
      for (const item of [...pendingRef.current]) {
        if (cancelled) return;
        try {
          await postAnswer(item);
        } catch (error) {
          // Permanente: se saca de la cola, no se va a poder enviar nunca.
          if (!(error instanceof PermanentError)) return; // sigue sin conexión
        }
        if (cancelled) return;
        persist(pendingRef.current.filter((queued) => queued !== item));
      }
    }

    const timer = setInterval(() => void flush(), FLUSH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pending.length, persist]);

  return { submit, pendingCount: pending.length };
}
