"use client";

import { useState } from "react";

import { QuestionRenderer } from "@/components/questions/QuestionRenderer";
import { QuestionShell } from "@/components/questions/QuestionShell";
import { Button } from "@/components/ui/Button";
import {
  MAX_CHOICES,
  MIN_CHOICES,
  QUESTION_TYPE_LABELS,
  QUESTION_TYPES,
  questionInputSchema,
  type Option,
  type PublicQuestion,
  type QuestionInput,
  type QuestionType,
} from "@/lib/types";
import { emptyQuestion, nextId } from "./questionDefaults";

/**
 * Formulario de una pregunta. Cambia de forma según el tipo.
 *
 * Valida con `questionInputSchema`, el MISMO schema que corre en el endpoint:
 * no hay dos definiciones de qué es una pregunta válida que se puedan
 * desincronizar.
 */
export function QuestionForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: QuestionInput;
  onSave: (question: QuestionInput) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState<QuestionInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  const patch = (changes: Partial<QuestionInput>) => {
    setDraft((current) => ({ ...current, ...changes }) as QuestionInput);
    setError(null);
  };

  function changeType(type: QuestionType) {
    // Cambiar de tipo tira payload y answer: no hay traducción sensata entre,
    // por ejemplo, un slider y un match. Se conservan los campos comunes.
    const fresh = emptyQuestion(type);
    setDraft({
      ...fresh,
      prompt: draft.prompt,
      hint: draft.hint,
      points: draft.points,
      time_limit: draft.time_limit,
      is_active: draft.is_active,
    } as QuestionInput);
    setError(null);
    setPreview(false);
  }

  function submit() {
    const parsed = questionInputSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisá los campos.");
      return;
    }
    onSave(parsed.data);
  }

  return (
    <div className="border border-tinta p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tipo">
          <select
            value={draft.type}
            onChange={(event) => changeType(event.target.value as QuestionType)}
            className="min-h-11 w-full rounded-hoja border border-tinta bg-transparent px-2 text-base"
          >
            {QUESTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {QUESTION_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Puntos">
            <NumberInput
              value={draft.points}
              onChange={(points) => patch({ points })}
            />
          </Field>
          <Field label="Segundos">
            <NumberInput
              value={draft.time_limit}
              onChange={(time_limit) => patch({ time_limit })}
            />
          </Field>
        </div>
      </div>

      <Field label="Enunciado" className="mt-3">
        <textarea
          value={draft.prompt}
          onChange={(event) => patch({ prompt: event.target.value })}
          rows={2}
          className="w-full rounded-hoja border border-tinta bg-transparent px-3 py-2 text-base"
        />
      </Field>

      <Field
        label="Explicación (se muestra al responder)"
        className="mt-3"
      >
        <textarea
          value={draft.hint ?? ""}
          onChange={(event) =>
            patch({ hint: event.target.value.trim() === "" ? null : event.target.value })
          }
          rows={2}
          placeholder="Por qué es esa la respuesta"
          className="w-full rounded-hoja border border-tinta bg-transparent px-3 py-2 text-base"
        />
      </Field>

      <div className="mt-4 papel-doble-filete pt-3">
        <TypeFields draft={draft} setDraft={setDraft} clearError={() => setError(null)} />
      </div>

      <label className="mt-3 flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={draft.is_active}
          onChange={(event) => patch({ is_active: event.target.checked })}
          className="size-5 accent-[var(--tinta)]"
        />
        Activa (entra en la partida)
      </label>

      {error ? (
        <p role="alert" className="mt-3 border border-cinta px-3 py-2 text-sm text-cinta">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={submit} disabled={saving}>
          {saving ? "Guardando…" : "Guardar"}
        </Button>
        <Button variant="outline" onClick={() => setPreview((value) => !value)}>
          {preview ? "Ocultar vista previa" : "Vista previa"}
        </Button>
        <Button variant="quiet" onClick={onCancel}>
          Cancelar
        </Button>
      </div>

      {preview ? <Preview draft={draft} /> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vista previa
// ---------------------------------------------------------------------------

/**
 * Renderiza la pregunta con los MISMOS componentes que ve el estudiante.
 * Si se ve bien acá, se ve bien en el celular.
 */
function Preview({ draft }: { draft: QuestionInput }) {
  const parsed = questionInputSchema.safeParse(draft);

  if (!parsed.success) {
    return (
      <p className="mt-4 border border-filete px-3 py-2 text-sm text-carbon">
        Completá los campos para ver la vista previa:{" "}
        {parsed.error.issues[0]?.message}
      </p>
    );
  }

  const question = {
    ...parsed.data,
    id: "00000000-0000-4000-8000-000000000000",
    order_index: 1,
    created_at: null,
  } as unknown as PublicQuestion;

  return (
    <div className="mt-4 border border-filete p-3">
      <p className="mb-2 font-mono text-[0.6875rem] tracking-[0.14em] text-carbon uppercase">
        Así la ve el estudiante
      </p>
      <div className="mx-auto flex h-[30rem] max-w-md flex-col border border-filete p-3">
        <QuestionShell
          index={1}
          total={10}
          answered={0}
          prompt={question.prompt}
          deadline={null}
          timeLimitMs={question.time_limit * 1000}
          onTimeout={() => {}}
        >
          <QuestionRenderer question={question} onSubmit={() => {}} />
        </QuestionShell>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Campos por tipo
// ---------------------------------------------------------------------------

function TypeFields({
  draft,
  setDraft,
  clearError,
}: {
  draft: QuestionInput;
  setDraft: (updater: (current: QuestionInput) => QuestionInput) => void;
  clearError: () => void;
}) {
  const update = (next: QuestionInput) => {
    setDraft(() => next);
    clearError();
  };

  switch (draft.type) {
    case "single":
    case "multiple": {
      const multi = draft.type === "multiple";
      const choices = draft.payload.choices;
      const selected = multi
        ? (draft as Extract<QuestionInput, { type: "multiple" }>).answer.choiceIds
        : [(draft as Extract<QuestionInput, { type: "single" }>).answer.choiceId];

      const setChoices = (next: Option[]) => {
        // Al borrar una opción hay que soltar la marca de correcta que la usaba.
        const ids = next.map((choice) => choice.id);
        if (multi) {
          const current = draft as Extract<QuestionInput, { type: "multiple" }>;
          update({
            ...current,
            payload: { choices: next },
            answer: {
              choiceIds: current.answer.choiceIds.filter((id) => ids.includes(id)),
            },
          });
        } else {
          const current = draft as Extract<QuestionInput, { type: "single" }>;
          update({
            ...current,
            payload: { choices: next },
            answer: {
              choiceId: ids.includes(current.answer.choiceId)
                ? current.answer.choiceId
                : (ids[0] ?? ""),
            },
          });
        }
      };

      const toggle = (id: string) => {
        if (multi) {
          const current = draft as Extract<QuestionInput, { type: "multiple" }>;
          const has = current.answer.choiceIds.includes(id);
          update({
            ...current,
            answer: {
              choiceIds: has
                ? current.answer.choiceIds.filter((value) => value !== id)
                : [...current.answer.choiceIds, id],
            },
          });
        } else {
          update({
            ...(draft as Extract<QuestionInput, { type: "single" }>),
            answer: { choiceId: id },
          });
        }
      };

      return (
        <div className="space-y-2">
          <Legend>
            Opciones — marcá {multi ? "las correctas" : "la correcta"}
          </Legend>
          {choices.map((choice, index) => (
            <div key={choice.id} className="flex items-center gap-2">
              <input
                type={multi ? "checkbox" : "radio"}
                name="correcta"
                checked={selected.includes(choice.id)}
                onChange={() => toggle(choice.id)}
                aria-label={`Opción ${index + 1} correcta`}
                className="size-5 shrink-0 accent-[var(--tinta)]"
              />
              <input
                value={choice.text}
                onChange={(event) =>
                  setChoices(
                    choices.map((item) =>
                      item.id === choice.id
                        ? { ...item, text: event.target.value }
                        : item,
                    ),
                  )
                }
                placeholder={`Opción ${index + 1}`}
                className="min-h-11 flex-1 rounded-hoja border border-tinta bg-transparent px-2 text-base"
              />
              <button
                type="button"
                onClick={() =>
                  setChoices(choices.filter((item) => item.id !== choice.id))
                }
                disabled={choices.length <= MIN_CHOICES}
                aria-label={`Quitar opción ${index + 1}`}
                className="min-h-11 w-11 shrink-0 border border-filete font-mono disabled:opacity-30"
              >
                ×
              </button>
            </div>
          ))}
          <Button
            variant="outline"
            disabled={choices.length >= MAX_CHOICES}
            onClick={() =>
              setChoices([
                ...choices,
                { id: nextId(choices.map((c) => c.id)), text: "" },
              ])
            }
          >
            Agregar opción
          </Button>
        </div>
      );
    }

    case "truefalse": {
      const current = draft;
      return (
        <div className="space-y-2">
          <Legend>Respuesta correcta</Legend>
          <div className="flex gap-2">
            {[true, false].map((value) => (
              <Button
                key={String(value)}
                variant={current.answer.value === value ? "solid" : "outline"}
                onClick={() => update({ ...current, answer: { value } })}
              >
                {value ? "Verdadero" : "Falso"}
              </Button>
            ))}
          </div>
        </div>
      );
    }

    case "order": {
      const current = draft;
      const items = current.payload.items;

      const setItems = (next: Option[]) =>
        update({
          ...current,
          payload: { items: next },
          // El orden correcto ES el orden en que están cargados acá.
          answer: { order: next.map((item) => item.id) },
        });

      const move = (from: number, to: number) => {
        if (to < 0 || to >= items.length) return;
        const next = [...items];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        setItems(next);
      };

      return (
        <div className="space-y-2">
          <Legend>
            Ítems en el orden CORRECTO — al jugador se le muestran barajados
          </Legend>
          {items.map((item, index) => (
            <div key={item.id} className="flex items-center gap-2">
              <span className="w-[2ch] shrink-0 font-mono text-sm tabular-nums">
                {index + 1}
              </span>
              <input
                value={item.text}
                onChange={(event) =>
                  setItems(
                    items.map((current2) =>
                      current2.id === item.id
                        ? { ...current2, text: event.target.value }
                        : current2,
                    ),
                  )
                }
                placeholder={`Paso ${index + 1}`}
                className="min-h-11 flex-1 rounded-hoja border border-tinta bg-transparent px-2 text-base"
              />
              <button
                type="button"
                onClick={() => move(index, index - 1)}
                disabled={index === 0}
                aria-label={`Subir el paso ${index + 1}`}
                className="min-h-11 w-11 shrink-0 border border-filete font-mono disabled:opacity-30"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => move(index, index + 1)}
                disabled={index === items.length - 1}
                aria-label={`Bajar el paso ${index + 1}`}
                className="min-h-11 w-11 shrink-0 border border-filete font-mono disabled:opacity-30"
              >
                ▼
              </button>
              <button
                type="button"
                onClick={() => setItems(items.filter((i) => i.id !== item.id))}
                disabled={items.length <= 2}
                aria-label={`Quitar el paso ${index + 1}`}
                className="min-h-11 w-11 shrink-0 border border-filete font-mono disabled:opacity-30"
              >
                ×
              </button>
            </div>
          ))}
          <Button
            variant="outline"
            disabled={items.length >= MAX_CHOICES}
            onClick={() =>
              setItems([...items, { id: nextId(items.map((i) => i.id)), text: "" }])
            }
          >
            Agregar paso
          </Button>
        </div>
      );
    }

    case "match": {
      const current = draft;
      const { left, right } = current.payload;

      const setPair = (leftId: string, rightId: string) =>
        update({
          ...current,
          answer: { pairs: { ...current.answer.pairs, [leftId]: rightId } },
        });

      const addPair = () => {
        const id = nextId(left.map((item) => item.id));
        update({
          ...current,
          payload: {
            left: [...left, { id, text: "" }],
            right: [...right, { id, text: "" }],
          },
          answer: { pairs: { ...current.answer.pairs, [id]: id } },
        });
      };

      const removePair = (id: string) => {
        const pairs = { ...current.answer.pairs };
        delete pairs[id];
        update({
          ...current,
          payload: {
            left: left.filter((item) => item.id !== id),
            right: right.filter((item) => item.id !== id),
          },
          answer: { pairs },
        });
      };

      return (
        <div className="space-y-2">
          <Legend>
            Pares — la columna derecha se baraja al mostrarse al jugador
          </Legend>
          {left.map((item, index) => (
            <div key={item.id} className="flex flex-wrap items-center gap-2">
              <input
                value={item.text}
                onChange={(event) =>
                  update({
                    ...current,
                    payload: {
                      left: left.map((l) =>
                        l.id === item.id ? { ...l, text: event.target.value } : l,
                      ),
                      right,
                    },
                  })
                }
                placeholder={`Izquierda ${index + 1}`}
                className="min-h-11 min-w-0 flex-1 rounded-hoja border border-tinta bg-transparent px-2 text-base"
              />
              <span aria-hidden className="font-mono">
                →
              </span>
              <input
                value={
                  right.find((r) => r.id === current.answer.pairs[item.id])?.text ??
                  ""
                }
                onChange={(event) => {
                  const targetId = current.answer.pairs[item.id] ?? item.id;
                  update({
                    ...current,
                    payload: {
                      left,
                      right: right.map((r) =>
                        r.id === targetId ? { ...r, text: event.target.value } : r,
                      ),
                    },
                  });
                  setPair(item.id, targetId);
                }}
                placeholder={`Derecha ${index + 1}`}
                className="min-h-11 min-w-0 flex-1 rounded-hoja border border-tinta bg-transparent px-2 text-base"
              />
              <button
                type="button"
                onClick={() => removePair(item.id)}
                disabled={left.length <= 2}
                aria-label={`Quitar el par ${index + 1}`}
                className="min-h-11 w-11 shrink-0 border border-filete font-mono disabled:opacity-30"
              >
                ×
              </button>
            </div>
          ))}
          <Button
            variant="outline"
            disabled={left.length >= MAX_CHOICES}
            onClick={addPair}
          >
            Agregar par
          </Button>
        </div>
      );
    }

    case "slider": {
      const current = draft;
      return (
        <div className="space-y-2">
          <Legend>Rango y valor correcto</Legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Field label="Mínimo">
              <NumberInput
                value={current.payload.min}
                onChange={(min) =>
                  update({ ...current, payload: { ...current.payload, min } })
                }
              />
            </Field>
            <Field label="Máximo">
              <NumberInput
                value={current.payload.max}
                onChange={(max) =>
                  update({ ...current, payload: { ...current.payload, max } })
                }
              />
            </Field>
            <Field label="Paso">
              <NumberInput
                value={current.payload.step}
                onChange={(step) =>
                  update({ ...current, payload: { ...current.payload, step } })
                }
              />
            </Field>
            <Field label="Unidad">
              <input
                value={current.payload.unit}
                onChange={(event) =>
                  update({
                    ...current,
                    payload: { ...current.payload, unit: event.target.value },
                  })
                }
                placeholder="cps"
                className="min-h-11 w-full rounded-hoja border border-tinta bg-transparent px-2 text-base"
              />
            </Field>
            <Field label="Correcto">
              <NumberInput
                value={current.answer.value}
                onChange={(value) =>
                  update({ ...current, answer: { ...current.answer, value } })
                }
              />
            </Field>
            <Field label="Tolerancia">
              <NumberInput
                value={current.answer.tolerance}
                onChange={(tolerance) =>
                  update({ ...current, answer: { ...current.answer, tolerance } })
                }
              />
            </Field>
          </div>
        </div>
      );
    }

    case "text": {
      const current = draft;
      const accepted = current.answer.accepted;

      const setAccepted = (next: string[]) =>
        update({ ...current, answer: { accepted: next } });

      return (
        <div className="space-y-2">
          <Legend>
            Respuestas aceptadas — se comparan sin acentos ni mayúsculas y con
            tolerancia a errores de tipeo
          </Legend>
          {accepted.map((value, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                value={value}
                onChange={(event) =>
                  setAccepted(
                    accepted.map((item, i) =>
                      i === index ? event.target.value : item,
                    ),
                  )
                }
                placeholder={index === 0 ? "Respuesta principal" : "Sinónimo"}
                className="min-h-11 flex-1 rounded-hoja border border-tinta bg-transparent px-2 text-base"
              />
              <button
                type="button"
                onClick={() => setAccepted(accepted.filter((_, i) => i !== index))}
                disabled={accepted.length <= 1}
                aria-label={`Quitar la respuesta ${index + 1}`}
                className="min-h-11 w-11 shrink-0 border border-filete font-mono disabled:opacity-30"
              >
                ×
              </button>
            </div>
          ))}
          <Button variant="outline" onClick={() => setAccepted([...accepted, ""])}>
            Agregar sinónimo
          </Button>
          <Field label="Placeholder del campo">
            <input
              value={current.payload.placeholder}
              onChange={(event) =>
                update({ ...current, payload: { placeholder: event.target.value } })
              }
              className="min-h-11 w-full rounded-hoja border border-tinta bg-transparent px-2 text-base"
            />
          </Field>
        </div>
      );
    }
  }
}

// ---------------------------------------------------------------------------

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block font-mono text-[0.6875rem] tracking-[0.14em] text-carbon uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}

function Legend({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[0.6875rem] tracking-[0.14em] text-carbon uppercase">
      {children}
    </p>
  );
}

function NumberInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : ""}
      onChange={(event) => {
        const parsed = Number(event.target.value);
        onChange(Number.isFinite(parsed) ? parsed : 0);
      }}
      className="min-h-11 w-full rounded-hoja border border-tinta bg-transparent px-2 text-base tabular-nums"
    />
  );
}
