"use client";

import { useEffect, useRef, useState } from "react";

import { fetchJson } from "./fetchJson";
import { gameStateResponseSchema, type GameStateResponse } from "./types";

export type UseGameState = {
  /** Último estado conocido. Se mantiene aunque se corte la conexión. */
  state: GameStateResponse | null;
  /** false si el último intento falló. Se reintenta en el próximo ciclo. */
  connected: boolean;
  /** true hasta que termina el primer intento, haya salido bien o mal. */
  loading: boolean;
};

/**
 * Consulta /api/state cada `intervalMs`.
 *
 * Pensado para datos móviles malos: un fetch que falla no rompe nada ni borra el
 * estado que ya teníamos, solo baja `connected`. El próximo ciclo reintenta.
 */
export function useGameState(
  intervalMs = 2000,
  /**
   * Si viene, la respuesta agrega `me` con el puntaje y la posición provisoria.
   * Lo pide solo la pantalla de "Terminaste": calcularlo es agregar todas las
   * respuestas de todos, y no vale la pena pagarlo en cada poll de la partida.
   */
  playerId?: string,
): UseGameState {
  const [state, setState] = useState<GameStateResponse | null>(null);
  const [connected, setConnected] = useState(true);
  const [loading, setLoading] = useState(true);

  // Con mala conexión una request puede tardar más que el intervalo. Sin esto se
  // acumularían pedidos encima de pedidos.
  //
  // Esta guarda es también la razón por la que el timeout de `fetchJson` no es
  // opcional: un fetch que no resuelve nunca dejaría `inFlight` en true para
  // siempre y el polling moriría en silencio, con la pantalla congelada en el
  // último estado conocido y sin siquiera bajar `connected`.
  const inFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function poll() {
      if (inFlight.current) return;
      inFlight.current = true;

      try {
        const url = playerId
          ? `/api/state?playerId=${encodeURIComponent(playerId)}`
          : "/api/state";

        // Sin reintentos acá: el próximo ciclo del intervalo ES el reintento, y
        // encadenar esperas adentro solo desincronizaría el polling.
        const next = await fetchJson(url, {
          schema: gameStateResponseSchema,
          signal: controller.signal,
          timeoutMs: 6000,
          retries: 0,
        });

        if (cancelled) return;
        setState(next);
        setConnected(true);
      } catch {
        // Incluye el abort del cleanup, que se descarta con `cancelled`.
        if (!cancelled) setConnected(false);
      } finally {
        inFlight.current = false;
        if (!cancelled) setLoading(false);
      }
    }

    void poll();
    const timer = setInterval(() => void poll(), intervalMs);

    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(timer);
    };
  }, [intervalMs, playerId]);

  return { state, connected, loading };
}
