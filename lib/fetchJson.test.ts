import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  fetchJson,
  HttpError,
  mensajeDeError,
  NetworkError,
  ShapeError,
} from "./fetchJson";

/** Respuesta OK con cuerpo JSON. */
function jsonOk(body: unknown) {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

/** Respuesta de error, con o sin `{ error }` del servidor. */
function jsonError(status: number, body?: unknown) {
  return {
    ok: false,
    status,
    text: async () => (body === undefined ? "" : JSON.stringify(body)),
  } as unknown as Response;
}

/** Reemplaza `fetch` y devuelve el espía para contar intentos. */
function stubFetch(impl: (url: string, init: RequestInit) => Promise<Response>) {
  const spy = vi.fn(impl);
  vi.stubGlobal("fetch", spy);
  return spy;
}

// Reintentos con espera de 1ms: se prueba la lógica, no el reloj.
const rapido = { retryDelaysMs: [1, 1] };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchJson", () => {
  it("devuelve el cuerpo parseado", async () => {
    stubFetch(async () => jsonOk({ status: "lobby" }));
    await expect(fetchJson("/api/state")).resolves.toEqual({ status: "lobby" });
  });

  it("valida con el schema y devuelve el dato tipado", async () => {
    stubFetch(async () => jsonOk({ n: 3 }));
    const schema = z.object({ n: z.number() });
    await expect(fetchJson("/x", { schema })).resolves.toEqual({ n: 3 });
  });

  it("una respuesta con forma inesperada es ShapeError y NO se reintenta", async () => {
    const spy = stubFetch(async () => jsonOk({ n: "tres" }));
    const schema = z.object({ n: z.number() });

    await expect(
      fetchJson("/x", { schema, retries: 3, ...rapido }),
    ).rejects.toBeInstanceOf(ShapeError);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("manda el body como JSON con su Content-Type", async () => {
    const spy = stubFetch(async () => jsonOk({}));
    await fetchJson("/api/join", { method: "POST", body: { nickname: "Ana" } });

    const init = spy.mock.calls[0][1];
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"nickname":"Ana"}');
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );
  });

  it("nunca cachea: toda respuesta tiene que ser la de ahora", async () => {
    const spy = stubFetch(async () => jsonOk({}));
    await fetchJson("/api/state");
    expect(spy.mock.calls[0][1].cache).toBe("no-store");
  });

  // -- Errores del servidor --------------------------------------------------

  it("un 4xx NO se reintenta", async () => {
    const spy = stubFetch(async () => jsonError(409, { error: "La partida cerró." }));

    await expect(
      fetchJson("/api/answer", { retries: 3, ...rapido }),
    ).rejects.toMatchObject({ status: 409, message: "La partida cerró." });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("prefiere el mensaje del servidor al genérico", async () => {
    stubFetch(async () => jsonError(400, { error: "Escribí un apodo para entrar." }));
    await expect(fetchJson("/api/join")).rejects.toThrow(
      "Escribí un apodo para entrar.",
    );
  });

  it("sin mensaje del servidor, usa uno en español según el estado", async () => {
    stubFetch(async () => jsonError(401));
    await expect(fetchJson("/api/admin/stats")).rejects.toThrow(
      /Se venció la sesión/,
    );
  });

  it("un 5xx sí se reintenta, y agota los intentos", async () => {
    const spy = stubFetch(async () => jsonError(503));

    await expect(
      fetchJson("/api/state", { retries: 2, ...rapido }),
    ).rejects.toBeInstanceOf(HttpError);
    expect(spy).toHaveBeenCalledTimes(3); // inicial + 2
  });

  it("un 5xx que se recupera devuelve el dato, sin que quien llama se entere", async () => {
    let intento = 0;
    const spy = stubFetch(async () => {
      intento++;
      return intento < 3 ? jsonError(500) : jsonOk({ ok: true });
    });

    await expect(
      fetchJson("/api/state", { retries: 3, ...rapido }),
    ).resolves.toEqual({ ok: true });
    expect(spy).toHaveBeenCalledTimes(3);
  });

  // -- Red -------------------------------------------------------------------

  it("un corte de red se reintenta y termina en NetworkError", async () => {
    const spy = stubFetch(async () => {
      throw new TypeError("Failed to fetch");
    });

    await expect(
      fetchJson("/api/state", { retries: 2, ...rapido }),
    ).rejects.toBeInstanceOf(NetworkError);
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it("un corte que se recupera al segundo intento no molesta a quien llama", async () => {
    let intento = 0;
    stubFetch(async () => {
      intento++;
      if (intento === 1) throw new TypeError("Failed to fetch");
      return jsonOk({ recuperado: true });
    });

    await expect(
      fetchJson("/api/answer", { retries: 2, ...rapido }),
    ).resolves.toEqual({ recuperado: true });
  });

  /*
   * El caso que motivó todo este módulo: un socket que queda colgado sin
   * resolver ni rechazar. Sin timeout, la promesa nunca termina y el `inFlight`
   * de useGameState se queda en true para siempre — el polling muere en
   * silencio. Acá se comprueba que el timeout lo convierte en un error normal.
   */
  it("un fetch que nunca responde se corta por timeout", async () => {
    stubFetch(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    );

    const empezo = Date.now();
    await expect(
      fetchJson("/api/state", { timeoutMs: 40, retries: 0 }),
    ).rejects.toBeInstanceOf(NetworkError);
    expect(Date.now() - empezo).toBeLessThan(2000);
  });

  it("el timeout también aplica a cada reintento por separado", async () => {
    const spy = stubFetch(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    );

    await expect(
      fetchJson("/x", { timeoutMs: 30, retries: 2, ...rapido }),
    ).rejects.toBeInstanceOf(NetworkError);
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it("si quien llama cancela, no se reintenta", async () => {
    const controller = new AbortController();
    const spy = stubFetch(async () => {
      controller.abort();
      throw new TypeError("Failed to fetch");
    });

    await expect(
      fetchJson("/x", { signal: controller.signal, retries: 3, ...rapido }),
    ).rejects.toBeTruthy();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("un cuerpo vacío no es un error", async () => {
    stubFetch(async () => ({ ok: true, status: 204, text: async () => "" }) as unknown as Response);
    await expect(fetchJson("/api/admin/logout", { method: "POST" })).resolves.toBeNull();
  });

  it("un cuerpo que no es JSON en una respuesta OK no explota", async () => {
    stubFetch(
      async () => ({ ok: true, status: 200, text: async () => "<html>" }) as unknown as Response,
    );
    await expect(fetchJson("/x")).resolves.toBeNull();
  });
});

describe("mensajeDeError", () => {
  it("usa el mensaje de los errores propios", () => {
    expect(mensajeDeError(new HttpError(409, "La partida cerró."))).toBe(
      "La partida cerró.",
    );
    expect(mensajeDeError(new NetworkError())).toMatch(/No hay conexión/);
    expect(mensajeDeError(new ShapeError())).toMatch(/inesperado/);
  });

  it("para cualquier otra cosa usa el fallback, nunca un texto en inglés", () => {
    expect(mensajeDeError(new Error("Failed to fetch"), "No se pudo entrar.")).toBe(
      "No se pudo entrar.",
    );
    expect(mensajeDeError("qué es esto")).toMatch(/Algo salió mal/);
  });
});
