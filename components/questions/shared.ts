import type {
  PublicQuestion,
  QuestionType,
  ResponseFor,
} from "@/lib/types";

/**
 * La interfaz que cumplen los siete componentes de respuesta.
 *
 * `question` viene estrechado por `type`, así que cada componente ve exactamente
 * el `payload` que le corresponde. Es una `PublicQuestion`: nunca trae `answer`.
 */
export type QuestionComponentProps<T extends QuestionType> = {
  question: Extract<PublicQuestion, { type: T }>;
  onSubmit: (response: ResponseFor<T>) => void;
  disabled?: boolean;
};

/**
 * Formas de las opciones.
 *
 * Cada opción tiene una forma distinta además del color, para que se distingan
 * en escala de grises, con daltonismo, y para que el expositor pueda decir
 * "la del rombo" en voz alta sin ambigüedad. El nombre va en el `aria-label`.
 */
export const OPTION_SHAPES = [
  { glyph: "▲", name: "triángulo" },
  { glyph: "◆", name: "rombo" },
  { glyph: "●", name: "círculo" },
  { glyph: "■", name: "cuadrado" },
  { glyph: "▬", name: "barra" },
  { glyph: "✚", name: "cruz" },
] as const;

export function optionShape(index: number): { glyph: string; name: string } {
  return OPTION_SHAPES[index % OPTION_SHAPES.length];
}

/** Formas para etiquetar los pares ya unidos en `match`. */
export function pairShape(index: number): { glyph: string; name: string } {
  return optionShape(index);
}
