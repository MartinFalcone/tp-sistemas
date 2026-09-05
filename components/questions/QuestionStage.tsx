"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  TIMEOUT_RESPONSE,
  type AnswerResult,
  type PublicQuestion,
  type QuestionResponse,
} from "@/lib/types";

import { QuestionRenderer } from "./QuestionRenderer";
import { QuestionResult } from "./QuestionResult";
import { QuestionShell } from "./QuestionShell";

/** Cuánto se ve la pantalla de resultado antes de seguir sola. */
export const RESULT_MS = 2500;

export type StageResponse = QuestionResponse | typeof TIMEOUT_RESPONSE;

/**
 * Arma una pregunta completa: enunciado + cronómetro + componente, después el
 * envío, después el resultado.
 *
 * No habla con la red: `onAnswer` se la deja al padre, que es quien sabe de
 * reintentos y de conexiones malas. Acá solo se maneja qué se ve en pantalla.
 */
export function QuestionStage({
  question,
  index,
  total,
  answered,
  deadline,
  onAnswer,
  result,
  onResultDone,
  resultMs = RESULT_MS,
}: {
  question: PublicQuestion;
  index: number;
  total: number;
  answered: number;
  deadline: number | null;
  onAnswer: (response: StageResponse) => void;
  /** Lo que devolvió el servidor. null mientras no llegó. */
  result: AnswerResult | null;
  onResultDone: () => void;
  resultMs?: number;
}) {
  const [submitted, setSubmitted] = useState(false);

  // Pregunta nueva, tablero limpio.
  useEffect(() => {
    setSubmitted(false);
  }, [question.id]);

  const submit = useCallback(
    (response: StageResponse) => {
      // Una sola respuesta por pregunta: el timeout y un toque pueden llegar
      // casi juntos, y la base tiene un unique (player_id, question_id).
      setSubmitted((already) => {
        if (already) return already;
        onAnswer(response);
        return true;
      });
    },
    [onAnswer],
  );

  const submitRef = useRef(submit);
  submitRef.current = submit;

  /** Se acabó el tiempo: se manda una respuesta que puntúa 0 en los 7 tipos. */
  const handleTimeout = useCallback(() => {
    submitRef.current(TIMEOUT_RESPONSE);
  }, []);

  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(onResultDone, resultMs);
    return () => clearTimeout(timer);
  }, [result, resultMs, onResultDone]);

  if (result) {
    return (
      <QuestionResult
        result={result}
        hint={question.hint}
        durationMs={resultMs}
      />
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 text-center">
        <p className="font-mono text-sm tracking-[0.14em] text-carbon uppercase">
          Enviando tu respuesta…
        </p>
        <p className="text-sm text-carbon">
          Si la conexión está lenta puede tardar unos segundos. No cierres esta
          pantalla.
        </p>
      </div>
    );
  }

  return (
    <QuestionShell
      index={index}
      total={total}
      answered={answered}
      prompt={question.prompt}
      deadline={deadline}
      timeLimitMs={question.time_limit * 1000}
      onTimeout={handleTimeout}
    >
      <QuestionRenderer question={question} onSubmit={submit} />
    </QuestionShell>
  );
}
