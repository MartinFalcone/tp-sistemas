"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";

import { Button } from "@/components/ui/Button";
import { fetchJson, mensajeDeError } from "@/lib/fetchJson";
import {
  QUESTION_TYPE_LABELS,
  questionSchema,
  type Question,
  type QuestionInput,
  type QuestionType,
} from "@/lib/types";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Panel } from "./AdminShell";
import { QuestionForm } from "./QuestionForm";
import { emptyQuestion, toInput } from "./questionDefaults";

type Editing =
  | { mode: "create"; draft: QuestionInput }
  | { mode: "edit"; id: string; draft: QuestionInput }
  | null;

export function QuestionsAdmin() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [broken, setBroken] = useState<string[]>([]);
  const [editing, setEditing] = useState<Editing>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const body = await fetchJson<{ questions: unknown[] }>(
        "/api/admin/questions",
        { timeoutMs: 12000, retries: 2 },
      );

      const parsed: Question[] = [];
      const brokenIds: string[] = [];
      for (const item of body.questions) {
        const question = questionSchema.safeParse(item);
        if (question.success) parsed.push(question.data);
        else brokenIds.push((item as { id?: string }).id ?? "?");
      }
      setQuestions(parsed);
      setBroken(brokenIds);
      setError(null);
    } catch {
      setError("No se pudieron cargar las preguntas. Recargá la página.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function call(
    url: string,
    init: { method: "POST" | "PATCH" | "DELETE"; body?: unknown },
    successMessage: string,
  ): Promise<boolean> {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fetchJson(url, { ...init, timeoutMs: 12000, retries: 2 });
      setNotice(successMessage);
      await load();
      return true;
    } catch (error) {
      setError(mensajeDeError(error, "No se pudo completar la acción."));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function save(draft: QuestionInput) {
    if (!editing) return;
    const ok =
      editing.mode === "create"
        ? await call(
            "/api/admin/questions",
            { method: "POST", body: draft },
            "Pregunta creada.",
          )
        : await call(
            `/api/admin/questions/${editing.id}`,
            { method: "PATCH", body: draft },
            "Pregunta guardada.",
          );
    if (ok) setEditing(null);
  }

  async function toggleActive(question: Question) {
    await call(
      `/api/admin/questions/${question.id}`,
      {
        method: "PATCH",
        body: {
          ...toInput(question),
          is_active: !question.is_active,
        },
      },
      question.is_active ? "Pregunta desactivada." : "Pregunta activada.",
    );
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;

    const reordered = [...questions];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved);
    // Optimista: la lista salta enseguida y el servidor confirma después.
    setQuestions(reordered);

    await call(
      "/api/admin/questions/reorder",
      {
        method: "PATCH",
        body: { ids: reordered.map((q) => q.id) },
      },
      "Orden actualizado.",
    );
  }

  async function duplicate(question: Question) {
    const copy = toInput(question);
    await call(
      "/api/admin/questions",
      {
        method: "POST",
        body: {
          ...copy,
          prompt: `${copy.prompt} (copia)`,
          is_active: false,
        },
      },
      "Pregunta duplicada, desactivada por las dudas.",
    );
  }

  async function remove(question: Question) {
    const confirmed = window.confirm(
      `¿Borrar esta pregunta?\n\n"${question.prompt}"\n\nTambién se borran las respuestas que ya se dieron. No se puede deshacer.`,
    );
    if (!confirmed) return;
    await call(
      `/api/admin/questions/${question.id}`,
      { method: "DELETE" },
      "Pregunta borrada.",
    );
  }

  function exportJson() {
    const payload = questions.map(toInput);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const stamp = new Date().toISOString().slice(0, 10);
    link.download = `preguntas-${stamp}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importJson(file: File) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      setError("Ese archivo no es un JSON válido.");
      return;
    }

    const replace = window.confirm(
      "Aceptar = REEMPLAZAR todas las preguntas actuales.\nCancelar = agregar las del archivo al final.",
    );

    await call(
      "/api/admin/questions/import",
      {
        method: "POST",
        body: { questions: parsed, replace },
      },
      replace ? "Preguntas reemplazadas." : "Preguntas agregadas.",
    );
  }

  const activeCount = questions.filter((question) => question.is_active).length;

  return (
    <>
      {error ? (
        <p role="alert" className="mb-3 border border-cinta px-3 py-2 text-sm text-cinta">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="mb-3 border border-filete bg-banda px-3 py-2 text-sm">
          {notice}
        </p>
      ) : null}
      {broken.length > 0 ? (
        <p className="mb-3 border border-cinta px-3 py-2 text-sm text-cinta">
          Hay {broken.length} pregunta(s) mal cargada(s) en la base que no se
          pueden mostrar acá. Los jugadores tampoco las van a ver. Ids:{" "}
          {broken.join(", ")}
        </p>
      ) : null}

      {editing ? (
        <Panel
          title={editing.mode === "create" ? "Pregunta nueva" : "Editando"}
        >
          <QuestionForm
            initial={editing.draft}
            saving={busy}
            onSave={save}
            onCancel={() => setEditing(null)}
          />
        </Panel>
      ) : (
        <Panel
          title={`${questions.length} preguntas · ${activeCount} activas`}
          action={
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() =>
                  setEditing({ mode: "create", draft: emptyQuestion("single") })
                }
              >
                Nueva
              </Button>
              <Button
                variant="outline"
                onClick={exportJson}
                disabled={questions.length === 0}
              >
                Exportar
              </Button>
              <Button variant="outline" onClick={() => fileInput.current?.click()}>
                Importar
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void importJson(file);
                }}
              />
            </div>
          }
        >
          {loading ? (
            <TableSkeleton rows={6} />
          ) : questions.length === 0 ? (
            <p className="text-carbon">
              Todavía no hay preguntas. Creá la primera o importá un backup.
            </p>
          ) : (
            <ol>
              {questions.map((question, index) => (
                <li
                  key={question.id}
                  className={clsx(
                    "flex flex-wrap items-center gap-2 border-b border-filete py-2",
                    index % 2 === 1 && "bg-banda",
                    !question.is_active && "opacity-55",
                  )}
                >
                  <span className="w-[2ch] shrink-0 font-mono text-sm tabular-nums">
                    {index + 1}
                  </span>

                  <div className="min-w-[12rem] flex-1">
                    <p className="truncate">{question.prompt || "(sin enunciado)"}</p>
                    <p className="font-mono text-[0.6875rem] text-carbon">
                      {QUESTION_TYPE_LABELS[question.type as QuestionType]} ·{" "}
                      {question.points} pts · {question.time_limit}s
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={busy || index === 0}
                      aria-label={`Subir la pregunta ${index + 1}`}
                      className="min-h-11 w-11 border border-filete font-mono disabled:opacity-30"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={busy || index === questions.length - 1}
                      aria-label={`Bajar la pregunta ${index + 1}`}
                      className="min-h-11 w-11 border border-filete font-mono disabled:opacity-30"
                    >
                      ▼
                    </button>

                    <label className="flex min-h-11 items-center gap-1 px-1 font-mono text-[0.6875rem] text-carbon uppercase">
                      <input
                        type="checkbox"
                        checked={question.is_active}
                        disabled={busy}
                        onChange={() => toggleActive(question)}
                        className="size-5 accent-[var(--tinta)]"
                      />
                      activa
                    </label>

                    <Button
                      variant="outline"
                      onClick={() =>
                        setEditing({
                          mode: "edit",
                          id: question.id,
                          draft: toInput(question),
                        })
                      }
                    >
                      Editar
                    </Button>
                    <Button
                      variant="quiet"
                      disabled={busy}
                      onClick={() => duplicate(question)}
                    >
                      Duplicar
                    </Button>
                    <Button
                      variant="quiet"
                      className="text-cinta"
                      disabled={busy}
                      onClick={() => remove(question)}
                    >
                      Borrar
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      )}
    </>
  );
}
