"use client";

import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";

import { Panel } from "./AdminShell";

type AnswerRow = {
  id: string;
  playerId: string;
  nickname: string;
  questionId: string;
  response: unknown;
  isCorrect: boolean;
  ratio: number;
  score: number;
  elapsedMs: number;
  createdAt: string | null;
};

type QuestionRef = {
  id: string;
  order_index: number;
  prompt: string;
  type: string;
};

/**
 * Qué respondió cada uno.
 *
 * La respuesta se muestra en crudo (el JSON que mandó el celular) a propósito:
 * traducirla a texto por tipo sería otra capa que puede mentir, y acá lo que
 * importa es ver exactamente qué llegó.
 */
export function AnswersAdmin() {
  const [rows, setRows] = useState<AnswerRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRef[]>([]);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (questionId: string) => {
    setLoading(true);
    try {
      const url = questionId
        ? `/api/admin/answers?questionId=${encodeURIComponent(questionId)}`
        : "/api/admin/answers";
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const body = (await response.json()) as {
        rows: AnswerRow[];
        questions: QuestionRef[];
      };
      setRows(body.rows);
      setQuestions(body.questions);
      setError(null);
    } catch {
      setError("No se pudieron cargar las respuestas. Probá de nuevo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(filter);
  }, [load, filter]);

  const correct = rows.filter((row) => row.isCorrect).length;

  return (
    <Panel
      title={
        loading
          ? "Cargando…"
          : `${rows.length} respuestas · ${correct} correctas`
      }
      action={
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          aria-label="Filtrar por pregunta"
          className="min-h-11 max-w-full rounded-hoja border border-tinta bg-transparent px-2 text-sm"
        >
          <option value="">Todas las preguntas</option>
          {questions.map((question, index) => (
            <option key={question.id} value={question.id}>
              {index + 1}. {question.prompt.slice(0, 50)}
            </option>
          ))}
        </select>
      }
    >
      {error ? (
        <p role="alert" className="border border-cinta px-3 py-2 text-sm text-cinta">
          {error}
        </p>
      ) : rows.length === 0 && !loading ? (
        <p className="text-carbon">Todavía nadie respondió.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] font-mono text-sm">
            <thead>
              <tr className="border-b border-tinta text-left text-[0.6875rem] tracking-[0.14em] text-carbon uppercase">
                <th className="py-1 pr-2">Jugador</th>
                {!filter ? <th className="py-1 pr-2">Preg.</th> : null}
                <th className="py-1 pr-2">Respondió</th>
                <th className="py-1 pr-2">Bien</th>
                <th className="py-1 pr-2 text-right">Puntos</th>
                <th className="py-1 text-right">Tiempo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const questionIndex = questions.findIndex(
                  (question) => question.id === row.questionId,
                );
                return (
                  <tr
                    key={row.id}
                    className={clsx(
                      "border-b border-filete align-top",
                      index % 2 === 1 && "bg-banda",
                    )}
                  >
                    <td className="py-1.5 pr-2 font-semibold">{row.nickname}</td>
                    {!filter ? (
                      <td className="py-1.5 pr-2 tabular-nums">
                        {questionIndex >= 0 ? questionIndex + 1 : "?"}
                      </td>
                    ) : null}
                    <td className="max-w-[16rem] py-1.5 pr-2 break-all text-carbon">
                      {formatResponse(row.response)}
                    </td>
                    <td
                      className={clsx(
                        "py-1.5 pr-2 font-semibold",
                        row.isCorrect ? "text-tinta" : "text-cinta",
                      )}
                    >
                      {/* Forma además de color, igual que en el juego. */}
                      {row.isCorrect ? "■ sí" : "✗ no"}
                      {!row.isCorrect && row.ratio > 0
                        ? ` (${Math.round(row.ratio * 100)}%)`
                        : ""}
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">
                      {row.score}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">
                      {(row.elapsedMs / 1000).toFixed(1)}s
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

/** Compacta el JSON de la respuesta para que entre en una celda. */
function formatResponse(response: unknown): string {
  if (response === null || response === undefined) return "—";
  if (typeof response === "object") {
    const record = response as Record<string, unknown>;
    if (record.timedOut === true) return "se quedó sin tiempo";
    if (typeof record.text === "string") return record.text || "(vacío)";
    if (typeof record.value === "boolean") return record.value ? "V" : "F";
    if (typeof record.value === "number") return String(record.value);
    if (typeof record.choiceId === "string") return record.choiceId;
    if (Array.isArray(record.choiceIds)) return record.choiceIds.join(", ");
    if (Array.isArray(record.order)) return record.order.join(" → ");
    if (record.pairs && typeof record.pairs === "object") {
      return Object.entries(record.pairs as Record<string, string>)
        .map(([left, right]) => `${left}→${right}`)
        .join(" ");
    }
  }
  return JSON.stringify(response);
}
