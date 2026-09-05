"use client";

/* PÁGINA TEMPORAL — se borra junto con app/styleguide/ antes del deploy. */

import { useCallback, useState } from "react";
import clsx from "clsx";

import { QuestionStage } from "@/components/questions/QuestionStage";
import { Button } from "@/components/ui/Button";
import {
  QUESTION_TYPE_LABELS,
  type AnswerResult,
  type PublicQuestion,
  type QuestionType,
} from "@/lib/types";

/** Campos de fila que toda pregunta necesita y que no hacen al ejemplo. */
const base = {
  order_index: 1,
  points: 1000,
  time_limit: 25,
  is_active: true,
  created_at: null,
} as const;

const SAMPLES: Record<QuestionType, PublicQuestion> = {
  single: {
    ...base,
    id: "00000000-0000-4000-8000-000000000001",
    type: "single",
    prompt: "¿Qué parte de la impresora golpea la cinta entintada?",
    hint: "El cabezal lleva las agujas: golpean la cinta contra el papel y cada impacto deja un punto.",
    payload: {
      choices: [
        { id: "a", text: "Las agujas del cabezal" },
        { id: "b", text: "El rodillo de arrastre" },
        { id: "c", text: "La banda perforada del papel" },
        { id: "d", text: "El tractor de papel" },
      ],
    },
  },
  multiple: {
    ...base,
    id: "00000000-0000-4000-8000-000000000002",
    type: "multiple",
    prompt: "¿Qué es cierto de una impresora de matriz de punto?",
    hint: "Es una impresora de impacto: por eso hace ruido y por eso puede copiar con papel carbónico.",
    payload: {
      choices: [
        { id: "a", text: "Imprime por impacto" },
        { id: "b", text: "Puede sacar copias con papel carbónico" },
        { id: "c", text: "Imprime fotos con calidad fotográfica" },
        { id: "d", text: "Es prácticamente silenciosa" },
      ],
    },
  },
  truefalse: {
    ...base,
    id: "00000000-0000-4000-8000-000000000003",
    type: "truefalse",
    prompt:
      "Una impresora de matriz de punto puede imprimir un original y sus copias en una sola pasada.",
    hint: "Sí: como imprime por impacto, la presión atraviesa el papel carbónico y marca las hojas de abajo.",
    payload: {},
  },
  order: {
    ...base,
    id: "00000000-0000-4000-8000-000000000004",
    type: "order",
    prompt: "Ordená los pasos de la impresión de una línea.",
    hint: "El papel recién avanza cuando la línea terminó de imprimirse.",
    payload: {
      items: [
        { id: "1", text: "Recibe los datos del buffer" },
        { id: "2", text: "Mueve el cabezal a la posición" },
        { id: "3", text: "Las agujas golpean la cinta" },
        { id: "4", text: "El rodillo avanza una línea" },
      ],
    },
  },
  match: {
    ...base,
    id: "00000000-0000-4000-8000-000000000005",
    type: "match",
    prompt: "Uní cada pieza con su función.",
    hint: "Más agujas es más resolución: 24 agujas dan la calidad casi carta (NLQ).",
    payload: {
      left: [
        { id: "l1", text: "Cabezal de 9 agujas" },
        { id: "l2", text: "Cabezal de 24 agujas" },
        { id: "l3", text: "Cinta entintada" },
      ],
      right: [
        { id: "r1", text: "Calidad borrador" },
        { id: "r2", text: "Calidad casi carta" },
        { id: "r3", text: "Aporta la tinta" },
      ],
    },
  },
  slider: {
    ...base,
    id: "00000000-0000-4000-8000-000000000006",
    type: "slider",
    prompt: "¿Cuántos caracteres por segundo imprimía una Epson LX-300 en borrador?",
    hint: "Unos 300 cps en modo borrador; en calidad casi carta bajaba a menos de la mitad.",
    payload: { min: 0, max: 500, step: 10, unit: "cps" },
  },
  text: {
    ...base,
    id: "00000000-0000-4000-8000-000000000007",
    type: "text",
    prompt: "¿Cómo se llama la pieza que lleva las agujas?",
    hint: "El cabezal de impresión: se desplaza por la línea golpeando la cinta.",
    payload: { placeholder: "Una palabra" },
  },
};

const CORRECT_TEXT: Record<QuestionType, string> = {
  single: "Las agujas del cabezal",
  multiple: "Imprime por impacto + Puede sacar copias con papel carbónico",
  truefalse: "Verdadero",
  order: "Buffer → cabezal → agujas → avance del papel",
  match: "9 agujas → borrador · 24 agujas → casi carta · cinta → tinta",
  slider: "300 cps",
  text: "Cabezal de impresión",
};

const TYPES = Object.keys(SAMPLES) as QuestionType[];

export function QuestionsDemo() {
  const [type, setType] = useState<QuestionType>("single");
  const [nextIsCorrect, setNextIsCorrect] = useState(true);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [round, setRound] = useState(0);
  const [deadline, setDeadline] = useState(
    () => Date.now() + SAMPLES.single.time_limit * 1000,
  );
  const [lastResponse, setLastResponse] = useState<string>("—");

  const question = SAMPLES[type];

  const restart = useCallback(
    (nextType: QuestionType) => {
      setType(nextType);
      setResult(null);
      setLastResponse("—");
      setRound((n) => n + 1);
      setDeadline(Date.now() + SAMPLES[nextType].time_limit * 1000);
    },
    [],
  );

  const handleAnswer = useCallback(
    (response: unknown) => {
      setLastResponse(JSON.stringify(response));
      // El servidor real corrige y devuelve esto. Acá se simula para poder ver
      // las dos pantallas de resultado en el celular.
      setResult({
        isCorrect: nextIsCorrect,
        ratio: nextIsCorrect ? 1 : 0,
        score: nextIsCorrect ? 850 : 0,
        totalScore: nextIsCorrect ? 3210 : 2360,
        position: nextIsCorrect ? 3 : 11,
        totalPlayers: 28,
        correctText: CORRECT_TEXT[type],
      });
    },
    [nextIsCorrect, type],
  );

  return (
    <section className="space-y-3">
      <h2 className="font-mono text-[0.6875rem] tracking-[0.14em] text-carbon uppercase">
        Componentes de respuesta
      </h2>

      <div className="grid grid-cols-2 gap-1">
        {TYPES.map((candidate) => (
          <button
            key={candidate}
            type="button"
            onClick={() => restart(candidate)}
            className={clsx(
              "min-h-11 border px-2 py-1 font-mono text-xs",
              candidate === type
                ? "border-tinta bg-tinta text-papel"
                : "border-tinta",
            )}
          >
            {QUESTION_TYPE_LABELS[candidate]}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => setNextIsCorrect((value) => !value)}
        >
          Simular: {nextIsCorrect ? "acierto" : "error"}
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => restart(type)}>
          Reiniciar
        </Button>
      </div>

      {/* Alto fijo para que se vea como en una pantalla de celular real. */}
      <div className="flex h-[32rem] flex-col border border-filete p-3">
        <QuestionStage
          key={`${type}-${round}`}
          question={question}
          index={3}
          total={10}
          answered={2}
          deadline={deadline}
          onAnswer={handleAnswer}
          result={result}
          onResultDone={() => restart(type)}
        />
      </div>

      <p className="font-mono text-[0.6875rem] break-all text-carbon">
        Último envío: {lastResponse}
      </p>
      <p className="font-mono text-[0.6875rem] text-carbon">
        Dejá correr el cronómetro hasta 0 para ver el envío automático
        (`{`{"timedOut":true}`}`), que puntúa 0 en los siete tipos.
      </p>
    </section>
  );
}
