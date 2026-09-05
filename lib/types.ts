import { z } from "zod";

/**
 * Tipos y schemas de zod de todo el dominio del quiz.
 *
 * Nada de esto toca el servidor: se puede importar desde Server Components,
 * Route Handlers y componentes cliente por igual.
 *
 * La idea central es un discriminated union sobre `type`, para que al hacer
 * `switch (question.type)` TypeScript sepa exactamente qué forma tienen
 * `payload`, `answer` y la respuesta del jugador.
 */

// ---------------------------------------------------------------------------
// Tipos de pregunta
// ---------------------------------------------------------------------------

export const QUESTION_TYPES = [
  "single",
  "multiple",
  "truefalse",
  "order",
  "match",
  "slider",
  "text",
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

export const questionTypeSchema = z.enum(QUESTION_TYPES);

/** Etiquetas en español para el panel de admin. */
export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single: "Opción única",
  multiple: "Opción múltiple",
  truefalse: "Verdadero o falso",
  order: "Ordenar",
  match: "Unir con flechas",
  slider: "Deslizador",
  text: "Respuesta escrita",
};

// ---------------------------------------------------------------------------
// Piezas comunes
// ---------------------------------------------------------------------------

/** Una opción o ítem identificable dentro de un `payload`. */
export const optionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

export type Option = z.infer<typeof optionSchema>;

// ---------------------------------------------------------------------------
// payload + answer + response, por tipo de pregunta
//
// payload  -> lo que se le muestra al jugador
// answer   -> la respuesta correcta (SOLO servidor, nunca se serializa al cliente)
// response -> lo que manda el jugador
// ---------------------------------------------------------------------------

// -- single -----------------------------------------------------------------
export const singlePayloadSchema = z.object({
  choices: z.array(optionSchema).min(2),
});
export const singleAnswerSchema = z.object({ choiceId: z.string().min(1) });
export const singleResponseSchema = z.object({ choiceId: z.string().min(1) });

// -- multiple ---------------------------------------------------------------
export const multiplePayloadSchema = z.object({
  choices: z.array(optionSchema).min(2),
});
export const multipleAnswerSchema = z.object({
  choiceIds: z.array(z.string().min(1)),
});
export const multipleResponseSchema = z.object({
  choiceIds: z.array(z.string().min(1)),
});

// -- truefalse --------------------------------------------------------------
export const truefalsePayloadSchema = z.object({});
export const truefalseAnswerSchema = z.object({ value: z.boolean() });
export const truefalseResponseSchema = z.object({ value: z.boolean() });

// -- order ------------------------------------------------------------------
export const orderPayloadSchema = z.object({
  items: z.array(optionSchema).min(2),
});
export const orderAnswerSchema = z.object({
  order: z.array(z.string().min(1)),
});
export const orderResponseSchema = z.object({
  order: z.array(z.string().min(1)),
});

// -- match ------------------------------------------------------------------
export const matchPayloadSchema = z.object({
  left: z.array(optionSchema).min(1),
  right: z.array(optionSchema).min(1),
});
export const matchAnswerSchema = z.object({
  /** Mapa leftId -> rightId. */
  pairs: z.record(z.string().min(1), z.string().min(1)),
});
export const matchResponseSchema = z.object({
  pairs: z.record(z.string().min(1), z.string().min(1)),
});

// -- slider -----------------------------------------------------------------
export const sliderPayloadSchema = z.object({
  min: z.number(),
  max: z.number(),
  step: z.number().positive(),
  unit: z.string(),
});
export const sliderAnswerSchema = z.object({
  value: z.number(),
  /** Margen aceptado. Ver grade() para el decaimiento del crédito parcial. */
  tolerance: z.number().nonnegative(),
});
export const sliderResponseSchema = z.object({ value: z.number() });

// -- text -------------------------------------------------------------------
export const textPayloadSchema = z.object({ placeholder: z.string() });
export const textAnswerSchema = z.object({
  /** Variantes válidas. Se comparan normalizadas y con tolerancia a typos. */
  accepted: z.array(z.string().min(1)).min(1),
});
export const textResponseSchema = z.object({ text: z.string() });

// ---------------------------------------------------------------------------
// El union discriminado
// ---------------------------------------------------------------------------

/** Solo lo necesario para corregir: tipo, consigna y respuesta correcta. */
export const questionCoreSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("single"),
    payload: singlePayloadSchema,
    answer: singleAnswerSchema,
  }),
  z.object({
    type: z.literal("multiple"),
    payload: multiplePayloadSchema,
    answer: multipleAnswerSchema,
  }),
  z.object({
    type: z.literal("truefalse"),
    payload: truefalsePayloadSchema,
    answer: truefalseAnswerSchema,
  }),
  z.object({
    type: z.literal("order"),
    payload: orderPayloadSchema,
    answer: orderAnswerSchema,
  }),
  z.object({
    type: z.literal("match"),
    payload: matchPayloadSchema,
    answer: matchAnswerSchema,
  }),
  z.object({
    type: z.literal("slider"),
    payload: sliderPayloadSchema,
    answer: sliderAnswerSchema,
  }),
  z.object({
    type: z.literal("text"),
    payload: textPayloadSchema,
    answer: textAnswerSchema,
  }),
]);

/** `{ type, payload, answer }` — lo que consume grade(). */
export type QuestionCore = z.infer<typeof questionCoreSchema>;

/** Columnas de `questions` que no dependen del tipo. */
const questionMetaShape = {
  id: z.uuid(),
  order_index: z.number().int(),
  prompt: z.string().min(1),
  hint: z.string().nullable(),
  points: z.number().int().nonnegative(),
  time_limit: z.number().int().positive(),
  is_active: z.boolean(),
  created_at: z.string().nullable(),
};

/** Una fila de `questions` ya validada y tipada según su `type`. */
export const questionSchema = z.discriminatedUnion("type", [
  z.object({
    ...questionMetaShape,
    type: z.literal("single"),
    payload: singlePayloadSchema,
    answer: singleAnswerSchema,
  }),
  z.object({
    ...questionMetaShape,
    type: z.literal("multiple"),
    payload: multiplePayloadSchema,
    answer: multipleAnswerSchema,
  }),
  z.object({
    ...questionMetaShape,
    type: z.literal("truefalse"),
    payload: truefalsePayloadSchema,
    answer: truefalseAnswerSchema,
  }),
  z.object({
    ...questionMetaShape,
    type: z.literal("order"),
    payload: orderPayloadSchema,
    answer: orderAnswerSchema,
  }),
  z.object({
    ...questionMetaShape,
    type: z.literal("match"),
    payload: matchPayloadSchema,
    answer: matchAnswerSchema,
  }),
  z.object({
    ...questionMetaShape,
    type: z.literal("slider"),
    payload: sliderPayloadSchema,
    answer: sliderAnswerSchema,
  }),
  z.object({
    ...questionMetaShape,
    type: z.literal("text"),
    payload: textPayloadSchema,
    answer: textAnswerSchema,
  }),
]);

export type Question = z.infer<typeof questionSchema>;

// ---------------------------------------------------------------------------
// Respuestas del jugador
// ---------------------------------------------------------------------------

/** El schema de respuesta que corresponde a cada tipo de pregunta. */
export const RESPONSE_SCHEMAS = {
  single: singleResponseSchema,
  multiple: multipleResponseSchema,
  truefalse: truefalseResponseSchema,
  order: orderResponseSchema,
  match: matchResponseSchema,
  slider: sliderResponseSchema,
  text: textResponseSchema,
} as const;

export type ResponseFor<T extends QuestionType> = z.infer<
  (typeof RESPONSE_SCHEMAS)[T]
>;

/** Cualquier respuesta posible de un jugador. */
export type QuestionResponse = ResponseFor<QuestionType>;

// ---------------------------------------------------------------------------
// La versión pública de una pregunta (sin `answer`)
// ---------------------------------------------------------------------------

/** Omit que se distribuye sobre el union en vez de aplanarlo. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

/**
 * Una pregunta tal como la ve un jugador: idéntica pero sin `answer`.
 * Todo endpoint que devuelva preguntas a jugadores debe devolver esto.
 */
export type PublicQuestion = DistributiveOmit<Question, "answer">;

/** Saca `answer`. Usar SIEMPRE antes de responderle una pregunta a un jugador. */
export function toPublicQuestion(question: Question): PublicQuestion {
  const { answer, ...rest } = question;
  void answer; // se descarta a propósito: nunca sale del servidor
  return rest as PublicQuestion;
}

export function toPublicQuestions(questions: Question[]): PublicQuestion[] {
  return questions.map(toPublicQuestion);
}

// ---------------------------------------------------------------------------
// Resto del dominio
// ---------------------------------------------------------------------------

export const GAME_STATUSES = ["lobby", "running", "finished"] as const;
export type GameStatus = (typeof GAME_STATUSES)[number];
export const gameStatusSchema = z.enum(GAME_STATUSES);

export const playerSchema = z.object({
  id: z.uuid(),
  nickname: z.string().min(1),
  nickname_key: z.string().min(1),
  created_at: z.string().nullable(),
  last_seen_at: z.string().nullable(),
});
export type Player = z.infer<typeof playerSchema>;

export const answerRecordSchema = z.object({
  id: z.uuid(),
  player_id: z.uuid(),
  question_id: z.uuid(),
  response: z.unknown(),
  is_correct: z.boolean(),
  ratio: z.number(),
  score: z.number().int(),
  elapsed_ms: z.number().int(),
  created_at: z.string().nullable(),
});
export type AnswerRecord = z.infer<typeof answerRecordSchema>;

export const gameStateSchema = z.object({
  id: z.literal(1),
  status: gameStatusSchema,
  started_at: z.string().nullable(),
  ends_at: z.string().nullable(),
  reveal_ranking: z.boolean(),
  updated_at: z.string().nullable(),
});
export type GameState = z.infer<typeof gameStateSchema>;

/** Una fila del ranking final. */
export type RankingEntry = {
  player_id: string;
  nickname: string;
  score: number;
  correct: number;
  answered: number;
};

// ---------------------------------------------------------------------------
// Filas crudas de Postgres
//
// Lo que devuelve supabase-js antes de pasar por zod: payload, answer y response
// son jsonb, o sea `unknown` hasta que questionSchema.parse() los valida.
// ---------------------------------------------------------------------------

export type QuestionRow = {
  id: string;
  order_index: number;
  type: QuestionType;
  prompt: string;
  hint: string | null;
  payload: unknown;
  answer: unknown;
  points: number;
  time_limit: number;
  is_active: boolean;
  created_at: string | null;
};

export type PlayerRow = Player;

export type AnswerRow = {
  id: string;
  player_id: string;
  question_id: string;
  response: unknown;
  is_correct: boolean;
  ratio: number;
  score: number;
  elapsed_ms: number;
  created_at: string | null;
};

export type GameStateRow = {
  id: number;
  status: GameStatus;
  started_at: string | null;
  ends_at: string | null;
  reveal_ranking: boolean;
  updated_at: string | null;
};

/** Valida una fila cruda contra el union. Tira si el jsonb está mal formado. */
export function parseQuestionRow(row: QuestionRow): Question {
  return questionSchema.parse(row);
}

// ---------------------------------------------------------------------------
// Tipos de la base para createClient<Database>()
// ---------------------------------------------------------------------------

type Insertable<Row, Optional extends keyof Row> = Omit<Row, Optional> &
  Partial<Pick<Row, Optional>>;

export type Database = {
  public: {
    Tables: {
      questions: {
        Row: QuestionRow;
        Insert: Insertable<
          QuestionRow,
          "id" | "hint" | "points" | "time_limit" | "is_active" | "created_at"
        >;
        Update: Partial<QuestionRow>;
        Relationships: [];
      };
      players: {
        Row: PlayerRow;
        Insert: Insertable<PlayerRow, "id" | "created_at" | "last_seen_at">;
        Update: Partial<PlayerRow>;
        Relationships: [];
      };
      answers: {
        Row: AnswerRow;
        Insert: Insertable<
          AnswerRow,
          "id" | "ratio" | "score" | "elapsed_ms" | "created_at"
        >;
        Update: Partial<AnswerRow>;
        Relationships: [];
      };
      game_state: {
        Row: GameStateRow;
        Insert: Insertable<
          GameStateRow,
          "id" | "status" | "reveal_ranking" | "updated_at"
        >;
        Update: Partial<GameStateRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
