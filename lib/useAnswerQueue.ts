"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { fetchJson, HttpError, ShapeError } from "./fetchJson";
import {
  readQueue,
  writeQueue,
  type QueuedAnswer,
} from "./progress";
import { answerResultSchema, type AnswerResult } from "./types";

/** Reintentos después del intento inicial, con la espera de `fetchJson`. */
const SUBMIT_RETRIES = 2;
/** Cada cuánto se vuelve a intentar lo que quedó encolado. */
const FLUSH_INTERVAL_MS = 5000;
/**
 * Enviar la respuesta es lo único que no se puede perder, así que se le da más
 * aire que a un poll antes de darla por caída.
 */
const SUBMIT_TIMEOUT_MS = 10000;

/** Un 4xx o una respuesta con forma rara no se arreglan reintentando. */
function esPermanente(error: unknown): boolean {
  return (
    (error instanceof HttpError && error.isPermanent) || error instanceof ShapeError
  );
}

function postAnswer(payload: QueuedAnswer, retries: number): Promise<AnswerResult> {
  return fetchJson("/api/answer", {
    method: "POST",
    body: payload,
    schema: answerResultSchema,
    timeoutMs: SUBMIT_TIMEOUT_MS,
    retries,
  });
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
      try {
        return await postAnswer(payload, SUBMIT_RETRIES);
      } catch (error) {
        // La partida cerró, la pregunta no existe, el jugador no existe:
        // reintentar no cambia nada y encolarlo tampoco.
        if (esPermanente(error)) return null;
      }

      // Se agotaron los intentos por red: queda encolada y el alumno sigue.
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
          // Sin reintentos internos: el intervalo de vaciado ES el reintento.
          await postAnswer(item, 0);
        } catch (error) {
          // Permanente: se saca de la cola, no se va a poder enviar nunca.
          if (!esPermanente(error)) return; // sigue sin conexión
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
