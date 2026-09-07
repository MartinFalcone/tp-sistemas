"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { QuestionStage } from "@/components/questions/QuestionStage";
import { Button } from "@/components/ui/Button";
import { QuestionSkeleton } from "@/components/ui/Skeleton";
import {
  clearProgress,
  isFromRound,
  readProgress,
  writeProgress,
  type StoredProgress,
} from "@/lib/progress";
import { fetchJson, mensajeDeError } from "@/lib/fetchJson";
import { useAnswerQueue } from "@/lib/useAnswerQueue";
import {
  publicQuestionSchema,
  type AnswerResult,
  type PublicQuestion,
} from "@/lib/types";

import { FinishedScreen } from "./FinishedScreen";

/**
 * La partida.
 *
 * Cada jugador va a su ritmo por las preguntas activas. Las preguntas se traen
 * UNA sola vez al entrar: durante la partida no se vuelven a pedir, así un corte
 * de conexión no deja a nadie sin poder seguir.
 *
 * El progreso vive en `localStorage`, con el timestamp de cuándo empezó la
 * pregunta actual. Si el navegador se cierra, se retoma donde estaba y con el
 * tiempo que le quedaba, no con el cronómetro reiniciado.
 */
export function PlayScreen({
  playerId,
  startedAt,
  endsAt,
}: {
  playerId: string;
  /** Cuándo arrancó esta ronda (`game_state.started_at`). Identifica la partida. */
  startedAt: string | null;
  /** Deadline global de la partida (`game_state.ends_at`). */
  endsAt: string | null;
}) {
  const [questions, setQuestions] = useState<PublicQuestion[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [progress, setProgress] = useState<StoredProgress | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // -- Progreso guardado (solo después de montar: no hay localStorage en SSR) --
  //
  // Va ANTES de useAnswerQueue a propósito: los efectos corren en el orden en
  // que se declaran los hooks, y este borra el `localStorage` de la ronda
  // anterior antes de que la cola lo lea y lo vuelva a guardar.
  useEffect(() => {
    const stored = readProgress();
    if (isFromRound(stored, startedAt)) {
      setProgress(stored);
      return;
    }

    // Progreso de otra ronda: no sirve, y encima deja al celular arrancando en
    // "Terminaste". Se tira junto con la cola, cuyas respuestas son de una
    // partida que ya no corre.
    clearProgress();
    setProgress({
      index: 0,
      questionId: null,
      startedAt: Date.now(),
      gameStartedAt: startedAt,
    });
  }, [startedAt]);

  const { submit, pendingCount } = useAnswerQueue();

  // -- Las preguntas, una sola vez -------------------------------------------
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setLoadError(null);
      try {
        // Es el único pedido que no se repite solo: si falla, el alumno se queda
        // sin partida. Cuatro reintentos con backoff largo antes de rendirse.
        const body = await fetchJson<{ questions?: unknown[] }>("/api/questions", {
          timeoutMs: 10000,
          retries: 4,
          retryDelaysMs: [500, 1200, 2500, 4000],
          signal: controller.signal,
        });

        const raw = body?.questions ?? [];
        // El servidor ya sacó `answer`, así que se valida sin ese campo.
        const parsed = raw.flatMap((item) => {
          const question = publicQuestionSchema.safeParse(item);
          return question.success ? [question.data] : [];
        });

        if (cancelled) return;

        if (parsed.length === 0) {
          setLoadError(
            "La partida no tiene preguntas cargadas. Avisale al expositor.",
          );
          return;
        }

        setQuestions(parsed);
      } catch (error) {
        if (cancelled) return;
        setLoadError(mensajeDeError(error, "No se pudieron cargar las preguntas."));
      }
    }

    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [reloadToken]);

  // -- Sincronizar el progreso con la pregunta que toca ----------------------
  const current =
    questions && progress ? (questions[progress.index] ?? null) : null;

  // Si el progreso guardado apunta a otra pregunta (cambió el set, o es la
  // primera vez), se reinicia el cronómetro de esta.
  const syncedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!current || !progress) return;
    if (progress.questionId === current.id) return;
    if (syncedRef.current === current.id) return;

    syncedRef.current = current.id;
    const next = {
      index: progress.index,
      questionId: current.id,
      startedAt: Date.now(),
      gameStartedAt: progress.gameStartedAt,
    };
    writeProgress(next);
    setProgress(next);
  }, [current, progress]);

  const advance = useCallback(() => {
    setResult(null);
    setProgress((previous) => {
      if (!previous) return previous;
      const next = {
        index: previous.index + 1,
        questionId: null,
        startedAt: Date.now(),
        gameStartedAt: previous.gameStartedAt,
      };
      writeProgress(next);
      return next;
    });
  }, []);

  const handleAnswer = useCallback(
    async (response: unknown) => {
      if (!current || !progress) return;

      const elapsedMs = Math.max(0, Date.now() - progress.startedAt);
      const answer = await submit({
        playerId,
        questionId: current.id,
        response,
        elapsedMs,
      });

      // Si no se pudo enviar quedó encolada: el alumno sigue igual, sin
      // pantalla de resultado. Bloquearlo por una conexión mala sería peor.
      if (answer) setResult(answer);
      else advance();
    },
    [current, progress, playerId, submit, advance],
  );

  // -- Estados de carga ------------------------------------------------------
  if (loadError) {
    return (
      <Centered>
        <p className="text-cinta">{loadError}</p>
        <Button
          variant="outline"
          onClick={() => setReloadToken((token) => token + 1)}
        >
          Reintentar
        </Button>
      </Centered>
    );
  }

  if (!questions || !progress) {
    return <QuestionSkeleton />;
  }

  // -- Fin: por haber respondido todo, o por el deadline global --------------
  const globalDeadline = endsAt ? Date.parse(endsAt) : null;
  const timeIsUp = globalDeadline !== null && Date.now() >= globalDeadline;

  if (progress.index >= questions.length || timeIsUp) {
    return <FinishedScreen playerId={playerId} pendingCount={pendingCount} />;
  }

  if (!current) return <QuestionSkeleton />;

  // El cronómetro de la pregunta nunca puede pasarse del cierre de la partida.
  const questionDeadline = progress.startedAt + current.time_limit * 1000;
  const deadline =
    globalDeadline === null
      ? questionDeadline
      : Math.min(questionDeadline, globalDeadline);

  return (
    <>
      <QuestionStage
        key={current.id}
        question={current}
        index={progress.index + 1}
        total={questions.length}
        answered={progress.index}
        deadline={deadline}
        onAnswer={handleAnswer}
        result={result}
        onResultDone={advance}
      />

      {pendingCount > 0 ? (
        <p role="status" className="pt-2 font-mono text-[0.6875rem] text-cinta">
          {pendingCount} sin enviar · se reintenta solo
        </p>
      ) : null}
    </>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-center text-carbon">
      {children}
    </div>
  );
}
