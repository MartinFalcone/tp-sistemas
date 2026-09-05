"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { QRCodeSVG } from "qrcode.react";

import { Button } from "@/components/ui/Button";
import { Panel } from "./AdminShell";
import type { AdminStats } from "@/app/api/admin/stats/route";
import type { ApiError, GameStatus } from "@/lib/types";

const POLL_MS = 3000;
const DURATIONS = [5, 10, 15, 20, 30, 45] as const;

const STATUS_LABEL: Record<GameStatus, string> = {
  lobby: "Sala abierta",
  running: "Partida en curso",
  finished: "Partida cerrada",
};

export function GameControl() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [minutes, setMinutes] = useState<number | null>(15);
  const [confirmText, setConfirmText] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/stats", { cache: "no-store" });
      if (!response.ok) throw new Error();
      setStats(await response.json());
    } catch {
      // Un poll que falla no borra los contadores que ya teníamos.
    }
  }, []);

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    void loadRef.current();
    const timer = setInterval(() => void loadRef.current(), POLL_MS);
    return () => clearInterval(timer);
  }, []);

  async function act(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const failure: ApiError = await response.json().catch(() => ({
          error: "No se pudo aplicar el cambio.",
        }));
        setError(failure.error);
        return;
      }
      setConfirmText("");
      await load();
    } catch {
      setError("No hay conexión con el servidor. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  const state = stats?.state;
  const status = state?.status;
  const joinUrl = origin || "";

  return (
    <>
      {error ? (
        <p
          role="alert"
          className="mb-4 border border-cinta px-3 py-2 text-sm text-cinta"
        >
          {error}
        </p>
      ) : null}

      <Panel
        title="Estado"
        action={
          state?.ends_at ? (
            <span className="font-mono text-xs text-carbon">
              cierra {new Date(state.ends_at).toLocaleTimeString("es-AR")}
            </span>
          ) : null
        }
      >
        <p
          className={clsx(
            "mb-4 border px-4 py-3 font-mono text-2xl font-semibold uppercase",
            status === "running"
              ? "border-tinta bg-banda"
              : status === "finished"
                ? "border-tinta bg-tinta text-papel"
                : "border-filete",
          )}
        >
          {status ? STATUS_LABEL[status] : "Cargando…"}
        </p>

        <div className="grid gap-2 sm:grid-cols-3">
          <Button
            variant={status === "lobby" ? "solid" : "outline"}
            disabled={busy}
            onClick={() => act({ action: "open" })}
          >
            Abrir sala
          </Button>

          <div className="flex gap-1">
            <select
              value={minutes === null ? "" : String(minutes)}
              onChange={(event) =>
                setMinutes(
                  event.target.value === "" ? null : Number(event.target.value),
                )
              }
              aria-label="Duración de la partida"
              className="min-h-11 w-[7.5rem] shrink-0 rounded-hoja border border-tinta bg-transparent px-2 font-mono text-sm"
            >
              {DURATIONS.map((value) => (
                <option key={value} value={value}>
                  {value} min
                </option>
              ))}
              <option value="">sin límite</option>
            </select>
            <Button
              className="flex-1"
              variant={status === "running" ? "solid" : "outline"}
              disabled={busy}
              onClick={() => act({ action: "start", minutes })}
            >
              Iniciar
            </Button>
          </div>

          <Button
            variant={status === "finished" ? "solid" : "outline"}
            disabled={busy}
            onClick={() => act({ action: "close" })}
          >
            Cerrar partida
          </Button>
        </div>

        <label className="mt-4 flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={state?.reveal_ranking ?? false}
            disabled={busy || !state}
            onChange={(event) =>
              act({ action: "reveal", value: event.target.checked })
            }
            className="size-5 accent-[var(--tinta)]"
          />
          Los jugadores ven el ranking durante la partida
        </label>
      </Panel>

      <Panel title="En vivo">
        <div className="grid grid-cols-3 gap-2 font-mono">
          <Counter label="Jugadores" value={stats?.players} />
          <Counter label="Activos (2 min)" value={stats?.activePlayers} />
          <Counter label="Respuestas" value={stats?.answers} />
        </div>

        {stats && stats.questions.length > 0 ? (
          <table className="mt-4 w-full font-mono text-sm">
            <thead>
              <tr className="border-b border-tinta text-left text-[0.6875rem] tracking-[0.14em] text-carbon uppercase">
                <th className="py-1 pr-2">#</th>
                <th className="py-1 pr-2">Pregunta</th>
                <th className="py-1 pr-2 text-right">Resp.</th>
                <th className="py-1 text-right">Aciertos</th>
              </tr>
            </thead>
            <tbody>
              {stats.questions.map((question, index) => (
                <tr
                  key={question.id}
                  className={clsx(
                    "border-b border-filete",
                    index % 2 === 1 && "bg-banda",
                    !question.isActive && "opacity-45",
                  )}
                >
                  <td className="py-1.5 pr-2 tabular-nums">{index + 1}</td>
                  <td className="max-w-0 truncate py-1.5 pr-2 font-sans">
                    {question.prompt}
                  </td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">
                    {question.answered}
                  </td>
                  <td
                    className={clsx(
                      "py-1.5 text-right font-semibold tabular-nums",
                      // Menos de la mitad: eso es lo que hay que volver a explicar.
                      question.rate !== null && question.rate < 0.5 && "text-cinta",
                    )}
                  >
                    {question.rate === null
                      ? "—"
                      : `${Math.round(question.rate * 100)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </Panel>

      <Panel
        title="Para proyectar"
        action={
          <a
            href="/ranking?tv=1"
            target="_blank"
            rel="noreferrer"
            className="min-h-11 font-mono text-sm underline underline-offset-4"
          >
            Ranking en modo proyector ↗
          </a>
        }
      >
        <div className="flex flex-col items-center gap-3 border border-filete py-6">
          {joinUrl ? (
            <>
              <QRCodeSVG
                value={joinUrl}
                size={240}
                bgColor="#f2f1ea"
                fgColor="#1b1a17"
                level="M"
              />
              <p className="px-4 text-center font-mono text-xl break-all sm:text-3xl">
                {joinUrl.replace(/^https?:\/\//, "")}
              </p>
            </>
          ) : (
            <p className="text-carbon">Cargando la URL…</p>
          )}
        </div>
      </Panel>

      <Panel title="Zona peligrosa">
        <p className="mb-2 text-sm text-carbon">
          Borra todos los jugadores y todas las respuestas, y vuelve la partida a
          la sala. <strong>Las preguntas no se tocan.</strong>
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            placeholder="Escribí BORRAR"
            aria-label="Confirmación"
            className="min-h-11 flex-1 rounded-hoja border border-cinta bg-transparent px-3 font-mono text-base"
          />
          <Button
            variant="outline"
            className="border-cinta text-cinta"
            disabled={busy || confirmText !== "BORRAR"}
            onClick={() => act({ action: "reset", confirm: confirmText })}
          >
            Reiniciar todo
          </Button>
        </div>
      </Panel>
    </>
  );
}

function Counter({ label, value }: { label: string; value?: number }) {
  return (
    <div className="border border-filete px-3 py-2">
      <p className="text-[0.6875rem] tracking-[0.14em] text-carbon uppercase">
        {label}
      </p>
      <p className="text-3xl font-semibold tabular-nums">
        {value === undefined ? "—" : value}
      </p>
    </div>
  );
}
