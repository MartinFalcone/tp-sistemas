"use client";

import type { z } from "zod";

/**
 * El único fetch del cliente.
 *
 * Todo pedido del navegador pasa por acá para que tres cosas sean imposibles de
 * olvidar en una pantalla suelta:
 *
 *  1. **Timeout.** Es lo más importante de este archivo. Con datos móviles un
 *     socket puede quedar colgado sin resolver ni rechazar: el `fetch` no
 *     termina nunca. Sin timeout, un poll con guarda de "ya hay uno en vuelo" se
 *     queda trabado para siempre y la pantalla se congela en el último estado
 *     conocido — sin error, sin aviso, sin reintento. Un `AbortController` con
 *     reloj lo convierte en un error normal, que sí se reintenta.
 *  2. **Reintento con backoff**, solo para lo que puede mejorar solo: cortes de
 *     red, timeouts y 5xx. Un 4xx es una decisión del servidor y reintentarlo es
 *     gastar batería.
 *  3. **Mensaje en español**, listo para mostrar. Si el servidor mandó
 *     `{ error }`, gana ese texto, que es el que explica qué hacer.
 */

/** El servidor contestó, pero con un código de error. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }

  /** Un 4xx no se arregla reintentando: falta un dato o la partida cerró. */
  get isPermanent(): boolean {
    return this.status >= 400 && this.status < 500;
  }
}

/** No hubo respuesta: sin red, DNS caído, o se agotó el timeout. */
export class NetworkError extends Error {
  constructor(message = "No hay conexión con el servidor.") {
    super(message);
    this.name = "NetworkError";
  }
}

/** El cuerpo llegó, pero no es lo que esperábamos. Tampoco se reintenta. */
export class ShapeError extends Error {
  constructor(message = "El servidor respondió algo inesperado.") {
    super(message);
    this.name = "ShapeError";
  }
}

export type FetchJsonOptions<T> = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  /** Se serializa a JSON y se manda con el Content-Type correspondiente. */
  body?: unknown;
  /** Corte por pedido. Por defecto 8 s: más que eso, en el aula, ya es un corte. */
  timeoutMs?: number;
  /** Reintentos DESPUÉS del intento inicial. 0 = un solo intento. */
  retries?: number;
  /** Espera antes de cada reintento. Se recorta o repite según `retries`. */
  retryDelaysMs?: number[];
  /** Para cancelar desde afuera (cleanup de un efecto, cambio de pantalla). */
  signal?: AbortSignal;
  /** Si viene, la respuesta se valida y se devuelve tipada. */
  schema?: z.ZodType<T>;
};

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_RETRY_DELAYS_MS = [600, 1800];

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new NetworkError("Cancelado."));
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new NetworkError("Cancelado."));
      },
      { once: true },
    );
  });

/**
 * Un intento: fetch con reloj propio, encadenado a la señal de afuera.
 *
 * No se usa `AbortSignal.any` ni `AbortSignal.timeout`: son recientes y esto
 * corre en los celulares que haya en el aula, no en los que nos gustaría.
 */
async function attempt<T>(
  url: string,
  options: FetchJsonOptions<T>,
): Promise<T> {
  const { method = "GET", body, timeoutMs = DEFAULT_TIMEOUT_MS, signal, schema } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const forward = () => controller.abort();
  signal?.addEventListener("abort", forward, { once: true });

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      cache: "no-store",
      signal: controller.signal,
      ...(body === undefined
        ? {}
        : {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
    });
  } catch {
    // Se cortó la red, o venció el timeout: el AbortController los une en uno.
    // Si el que abortó fue quien llama, el error se descarta arriba igual.
    throw new NetworkError();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", forward);
  }

  // Un 204 o un cuerpo vacío no son un error: hay endpoints que no devuelven nada.
  const text = await response.text().catch(() => "");
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const fromServer = (parsed as { error?: unknown } | null)?.error;
    throw new HttpError(
      response.status,
      typeof fromServer === "string" && fromServer.trim() !== ""
        ? fromServer
        : mensajePorEstado(response.status),
    );
  }

  if (!schema) return parsed as T;

  const validated = schema.safeParse(parsed);
  if (!validated.success) throw new ShapeError();
  return validated.data;
}

/** Un texto en español para cuando el servidor no mandó el suyo. */
function mensajePorEstado(status: number): string {
  if (status === 401 || status === 403) {
    return "Se venció la sesión. Volvé a entrar.";
  }
  if (status === 404) return "No se encontró lo que se pidió.";
  if (status === 409) return "La partida no está en el estado necesario para esto.";
  if (status >= 500) {
    return "El servidor tuvo un problema. Se reintenta solo en unos segundos.";
  }
  return "No se pudo completar el pedido.";
}

/**
 * Pide JSON con timeout y reintentos.
 *
 * Lanza `HttpError`, `NetworkError` o `ShapeError`; el `.message` de los tres ya
 * está en español y se puede mostrar tal cual.
 */
export async function fetchJson<T = unknown>(
  url: string,
  options: FetchJsonOptions<T> = {},
): Promise<T> {
  const {
    retries = 0,
    retryDelaysMs = DEFAULT_RETRY_DELAYS_MS,
    signal,
  } = options;

  let last: unknown;

  for (let intento = 0; intento <= retries; intento++) {
    try {
      return await attempt<T>(url, options);
    } catch (error) {
      last = error;

      // Quien llama canceló (se desmontó la pantalla): no hay nada que reintentar.
      if (signal?.aborted) throw error;

      // Un 4xx o una respuesta con forma equivocada no cambian por insistir.
      if (error instanceof HttpError && error.isPermanent) throw error;
      if (error instanceof ShapeError) throw error;

      if (intento < retries) {
        const espera =
          retryDelaysMs[Math.min(intento, retryDelaysMs.length - 1)] ?? 1000;
        await sleep(espera, signal);
      }
    }
  }

  throw last;
}

/** El texto a mostrar para cualquier error que salga de `fetchJson`. */
export function mensajeDeError(
  error: unknown,
  fallback = "Algo salió mal. Probá de nuevo.",
): string {
  if (
    error instanceof HttpError ||
    error instanceof NetworkError ||
    error instanceof ShapeError
  ) {
    return error.message;
  }
  return fallback;
}
