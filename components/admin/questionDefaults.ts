import {
  MAX_CHOICES,
  type Question,
  type QuestionInput,
  type QuestionType,
} from "@/lib/types";

/** Ids cortos y legibles, para que el JSON exportado se pueda leer a ojo. */
export const ID_POOL = ["a", "b", "c", "d", "e", "f"] as const;

export function nextId(used: string[]): string {
  const free = ID_POOL.find((id) => !used.includes(id));
  // Con el tope de 6 opciones nunca se agota, pero por las dudas.
  return free ?? `x${used.length + 1}`;
}

const COMMON = {
  prompt: "",
  hint: null,
  points: 1000,
  time_limit: 25,
  is_active: true,
} as const;

/** Una pregunta vacía pero ya válida en forma, para arrancar a editar. */
export function emptyQuestion(type: QuestionType): QuestionInput {
  switch (type) {
    case "single":
      return {
        ...COMMON,
        type,
        payload: {
          choices: [
            { id: "a", text: "" },
            { id: "b", text: "" },
          ],
        },
        answer: { choiceId: "a" },
      };
    case "multiple":
      return {
        ...COMMON,
        type,
        payload: {
          choices: [
            { id: "a", text: "" },
            { id: "b", text: "" },
          ],
        },
        answer: { choiceIds: ["a"] },
      };
    case "truefalse":
      return { ...COMMON, type, payload: {}, answer: { value: true } };
    case "order":
      return {
        ...COMMON,
        type,
        payload: {
          items: [
            { id: "a", text: "" },
            { id: "b", text: "" },
          ],
        },
        answer: { order: ["a", "b"] },
      };
    case "match":
      return {
        ...COMMON,
        type,
        payload: {
          left: [
            { id: "a", text: "" },
            { id: "b", text: "" },
          ],
          right: [
            { id: "a", text: "" },
            { id: "b", text: "" },
          ],
        },
        answer: { pairs: { a: "a", b: "b" } },
      };
    case "slider":
      return {
        ...COMMON,
        type,
        payload: { min: 0, max: 100, step: 1, unit: "" },
        answer: { value: 50, tolerance: 5 },
      };
    case "text":
      return {
        ...COMMON,
        type,
        payload: { placeholder: "" },
        answer: { accepted: [""] },
      };
  }
}

/** Saca los campos de fila y deja solo lo editable. */
export function toInput(question: Question): QuestionInput {
  const { id, order_index, created_at, ...input } = question;
  void id;
  void order_index;
  void created_at;
  return input as QuestionInput;
}

export { MAX_CHOICES };
