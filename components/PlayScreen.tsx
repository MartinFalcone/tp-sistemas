"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { QuestionStage } from "@/components/questions/QuestionStage";
import { Button } from "@/components/ui/Button";
import {
  readProgress,
  writeProgress,
  type StoredProgress,
} from "@/lib/progress";
import { useAnswerQueue } from "@/lib/useAnswerQueue";
import {
  publicQuestionSchema,
  type AnswerResult,
  type ApiError,
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
  endsAt,
}: {
  playerId: string;
  /** Deadline global de la partida (`game_state.ends_at`). */
  endsAt: string | null;
}) {
  const [questions, setQuestions] = useState<PublicQuestion[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [progress, setProgress] = useState<StoredProgress | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const { submit, pendingCount } = useAnswerQueue();

  // -- Progreso guardado (solo después de montar: no hay localStorage en SSR) --
  useEffect(() => {
    setProgress(
      readProgress() ?? { index: 0, questionId: null, startedAt: Date.now() },
    );
  }, []);

  // -- Las preguntas, una sola vez -------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadError(null);
      try {
        const response = await fetch("/api/questions", { cache: "no-store" });
        const body: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            (body as ApiError | null)?.error ??
              "No se pudieron cargar las preguntas.",
          );
        }

        const raw = (body as { questions?: unknown[] } | null)?.questions ?? [];
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
        setLoadError(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar las preguntas.",
        );
      }
    }

    void load();
    return () => {
      cancelled = true;
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
    return <Centered>Cargando las preguntas…</Centered>;
  }

  // -- Fin: por haber respondido todo, o por el deadline global --------------
  const globalDeadline = endsAt ? Date.parse(endsAt) : null;
  const timeIsUp = globalDeadline !== null && Date.now() >= globalDeadline;

  if (progress.index >= questions.length || timeIsUp) {
    return <FinishedScreen playerId={playerId} pendingCount={pendingCount} />;
  }

  if (!current) return <Centered>Cargando…</Centered>;

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
