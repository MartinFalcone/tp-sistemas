"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { motion, useReducedMotion } from "framer-motion";

import { DotNumber } from "@/components/DotDigit";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { Paper, PaperHeader } from "@/components/ui/Paper";
import { readStoredPlayer } from "@/lib/player";
import {
  rankingResponseSchema,
  type RankingResponse,
  type RankingRow,
} from "@/lib/types";

const POLL_MS = 3000;
/** Una vez por sesión: la revelación del podio no se repite al recargar. */
const REVEALED_KEY = "quiz.podium-revealed";
const SWEEP_MS = 500;

export function RankingScreen({ tv }: { tv: boolean }) {
  const [data, setData] = useState<RankingResponse | null>(null);
  const [connected, setConnected] = useState(true);
  const [meId, setMeId] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    if (tv) return;
    setMeId(readStoredPlayer()?.playerId ?? null);
  }, [tv]);

  // -- Polling: se corta cuando la partida terminó -------------------------
  const finished = data?.status === "finished";

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    let timer: ReturnType<typeof setInterval> | null = null;
    let inFlight = false;

    async function poll() {
      if (inFlight) return;
      inFlight = true;
      try {
        const response = await fetch(`/api/ranking${tv ? "?tv=1" : ""}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const parsed = rankingResponseSchema.safeParse(await response.json());
        if (!parsed.success) throw new Error("Respuesta inesperada");
        if (cancelled) return;

        setData(parsed.data);
        setConnected(true);

        // Ya no hay nada más que esperar.
        if (parsed.data.status === "finished" && timer) {
          clearInterval(timer);
          timer = null;
        }
      } catch {
        // Un fetch que falla no borra la tabla que ya teníamos.
        if (!cancelled) setConnected(false);
      } finally {
        inFlight = false;
      }
    }

    void poll();
    timer = setInterval(() => void poll(), POLL_MS);

    return () => {
      cancelled = true;
      controller.abort();
      if (timer) clearInterval(timer);
    };
  }, [tv]);

  // -- La revelación del podio, una sola vez --------------------------------
  useEffect(() => {
    if (!finished) return;
    try {
      if (window.sessionStorage.getItem(REVEALED_KEY)) return;
      window.sessionStorage.setItem(REVEALED_KEY, "1");
    } catch {
      // Sin sessionStorage se revela igual; solo se repetiría al recargar.
    }
    setReveal(true);
  }, [finished]);

  const rows = data?.rows ?? [];
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <Paper size={tv ? "tv" : "phone"} className="gap-5">
      <PaperHeader
        left={finished ? "Listado final" : "Ranking en curso"}
        right={
          <span className="flex items-center gap-2">
            {data ? `${rows.length} jugadores` : ""}
            <ConnectionBadge connected={connected} />
          </span>
        }
      />

      {!data ? (
        <Centered tv={tv}>Cargando el ranking…</Centered>
      ) : data.hidden ? (
        <Centered tv={tv}>El ranking se muestra al final.</Centered>
      ) : rows.length === 0 ? (
        <Centered tv={tv}>Todavía nadie respondió.</Centered>
      ) : (
        <>
          <Podium
            rows={podium}
            totalQuestions={data.totalQuestions}
            meId={meId}
            tv={tv}
            reveal={reveal}
          />

          {rest.length > 0 ? (
            <ol className="font-mono">
              {rest.map((row) => (
                <ListRow
                  key={row.playerId}
                  row={row}
                  totalQuestions={data.totalQuestions}
                  isMe={row.playerId === meId}
                  tv={tv}
                />
              ))}
            </ol>
          ) : null}

          {!tv && meId ? (
            <PinnedMe
              rows={rows}
              meId={meId}
              totalQuestions={data.totalQuestions}
            />
          ) : null}
        </>
      )}
    </Paper>
  );
}

// ---------------------------------------------------------------------------
// Podio
// ---------------------------------------------------------------------------

function Podium({
  rows,
  totalQuestions,
  meId,
  tv,
  reveal,
}: {
  rows: RankingRow[];
  totalQuestions: number;
  meId: string | null;
  tv: boolean;
  reveal: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const animate = reveal && !reduceMotion;

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row, index) => {
        // Se imprime de abajo hacia arriba: el primer puesto, último.
        const delay = animate ? (rows.length - 1 - index) * SWEEP_MS : 0;

        const content = (
          <PodiumRow
            row={row}
            totalQuestions={totalQuestions}
            isMe={row.playerId === meId}
            tv={tv}
          />
        );

        if (!animate) return <div key={row.playerId}>{content}</div>;

        return (
          <motion.div
            key={row.playerId}
            initial={{ clipPath: "inset(0 100% 0 0)" }}
            animate={{ clipPath: "inset(0 0% 0 0)" }}
            transition={{
              duration: SWEEP_MS / 1000,
              ease: "linear",
              delay: delay / 1000,
            }}
          >
            {content}
          </motion.div>
        );
      })}
    </div>
  );
}

function PodiumRow({
  row,
  totalQuestions,
  isMe,
  tv,
}: {
  row: RankingRow;
  totalQuestions: number;
  isMe: boolean;
  tv: boolean;
}) {
  const first = row.position === 1;
  const dotSize = tv ? (first ? 14 : 10) : first ? 7 : 5;

  return (
    <div
      data-player={row.playerId}
      className={clsx(
        "flex items-center gap-3 border px-3",
        tv ? "gap-6 py-5" : "py-3",
        first ? "border-tinta bg-banda" : "border-filete",
        isMe && "border-2 border-cinta",
      )}
    >
      <DotNumber value={row.position} dotSize={dotSize} faint={!first} />

      <div className="min-w-0 flex-1">
        <p
          className={clsx(
            "truncate font-semibold",
            tv
              ? first
                ? "text-5xl"
                : "text-4xl"
              : first
                ? "text-xl"
                : "text-lg",
          )}
        >
          {row.nickname}
          {isMe ? <span className="ml-2 text-cinta">· vos</span> : null}
        </p>
        <p
          className={clsx(
            "font-mono text-carbon tabular-nums",
            tv ? "text-2xl" : "text-xs",
          )}
        >
          {row.correct}/{totalQuestions} correctas
        </p>
      </div>

      <p
        className={clsx(
          "shrink-0 font-mono font-semibold tabular-nums",
          tv ? (first ? "text-6xl" : "text-5xl") : first ? "text-2xl" : "text-xl",
        )}
      >
        {row.score}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resto de la tabla
// ---------------------------------------------------------------------------

function ListRow({
  row,
  totalQuestions,
  isMe,
  tv,
}: {
  row: RankingRow;
  totalQuestions: number;
  isMe: boolean;
  tv: boolean;
}) {
  return (
    <li
      data-player={row.playerId}
      className={clsx(
        "flex items-center gap-3 border-b border-filete px-2 tabular-nums",
        tv ? "py-3 text-3xl" : "py-2 text-sm",
        // Bandas alternadas del papel pautado.
        row.position % 2 === 0 && "bg-banda",
        isMe && "border-y-2 border-cinta bg-papel",
      )}
    >
      <span className={clsx("shrink-0 text-carbon", tv ? "w-[3ch]" : "w-[2ch]")}>
        {row.position}
      </span>
      <span className="min-w-0 flex-1 truncate font-semibold">
        {row.nickname}
        {isMe ? <span className="ml-2 text-cinta">· vos</span> : null}
      </span>
      <span className={clsx("shrink-0 text-carbon", tv ? "text-2xl" : "text-xs")}>
        {row.correct}/{totalQuestions}
      </span>
      <span className={clsx("shrink-0 text-right", tv ? "w-[7ch]" : "w-[5ch]")}>
        {row.score}
      </span>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Fila fija del jugador
// ---------------------------------------------------------------------------

/**
 * La fila del jugador, fijada al pie mientras la suya no esté a la vista.
 *
 * Con 30 personas nadie quiere scrollear buscándose, y menos si quedó 24º.
 */
function PinnedMe({
  rows,
  meId,
  totalQuestions,
}: {
  rows: RankingRow[];
  meId: string;
  totalQuestions: number;
}) {
  const [visible, setVisible] = useState(true);
  const me = rows.find((row) => row.playerId === meId);

  useEffect(() => {
    if (!me) return;
    const node = document.querySelector<HTMLElement>(`[data-player="${meId}"]`);
    if (!node) {
      setVisible(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.5 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [me, meId, rows]);

  if (!me || visible) return null;

  return (
    <div className="sticky bottom-0 -mx-4 mt-auto border-t-2 border-tinta bg-tinta px-4 py-2 text-papel">
      <p className="flex items-center gap-3 font-mono text-sm tabular-nums">
        <span className="w-[2ch] shrink-0">{me.position}</span>
        <span className="min-w-0 flex-1 truncate font-semibold">
          {me.nickname} · vos
        </span>
        <span className="shrink-0 text-xs opacity-70">
          {me.correct}/{totalQuestions}
        </span>
        <span className="w-[5ch] shrink-0 text-right font-semibold">
          {me.score}
        </span>
      </p>
    </div>
  );
}

function Centered({
  children,
  tv,
}: {
  children: React.ReactNode;
  tv: boolean;
}) {
  return (
    <div
      className={clsx(
        "flex flex-1 items-center justify-center text-center text-carbon",
        tv ? "text-4xl" : "",
      )}
    >
      {children}
    </div>
  );
}
