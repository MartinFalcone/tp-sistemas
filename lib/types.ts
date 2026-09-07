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

/**
 * El mismo union pero sin `answer`, para validar lo que llega del servidor al
 * cliente. No se puede derivar con `.omit()`: en zod 4 eso no existe sobre un
 * `discriminatedUnion`, hay que escribir los miembros.
 */
export const publicQuestionSchema = z.discriminatedUnion("type", [
  z.object({
    ...questionMetaShape,
    type: z.literal("single"),
    payload: singlePayloadSchema,
  }),
  z.object({
    ...questionMetaShape,
    type: z.literal("multiple"),
    payload: multiplePayloadSchema,
  }),
  z.object({
    ...questionMetaShape,
    type: z.literal("truefalse"),
    payload: truefalsePayloadSchema,
  }),
  z.object({
    ...questionMetaShape,
    type: z.literal("order"),
    payload: orderPayloadSchema,
  }),
  z.object({
    ...questionMetaShape,
    type: z.literal("match"),
    payload: matchPayloadSchema,
  }),
  z.object({
    ...questionMetaShape,
    type: z.literal("slider"),
    payload: sliderPayloadSchema,
  }),
  z.object({
    ...questionMetaShape,
    type: z.literal("text"),
    payload: textPayloadSchema,
  }),
]);

// Si los dos se separan, esto deja de compilar.
const _publicQuestionSchemaMatchesType: PublicQuestion = null as unknown as z.infer<
  typeof publicQuestionSchema
>;
void _publicQuestionSchemaMatchesType;

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

/** Una fila del ranking, tal como sale de `GET /api/ranking`. */
export const rankingRowSchema = z.object({
  /** Posición, empezando en 1. Los empates exactos comparten puesto. */
  position: z.number().int().positive(),
  playerId: z.uuid(),
  nickname: z.string().min(1),
  score: z.number().int(),
  correct: z.number().int().nonnegative(),
  answered: z.number().int().nonnegative(),
});
export type RankingRow = z.infer<typeof rankingRowSchema>;

/**
 * Lo que devuelve `GET /api/ranking`.
 *
 * Trae también `status` y `revealRanking` para que la página no tenga que
 * pollear `/api/state` en paralelo: con datos móviles malos, una request menos
 * por ciclo importa.
 */
export const rankingResponseSchema = z.object({
  rows: z.array(rankingRowSchema),
  totalQuestions: z.number().int().nonnegative(),
  status: gameStatusSchema,
  revealRanking: z.boolean(),
  /** true si la tabla viene vacía porque el expositor la tiene oculta. */
  hidden: z.boolean(),
});
export type RankingResponse = z.infer<typeof rankingResponseSchema>;

// ---------------------------------------------------------------------------
// Contratos de la API
//
// Los mensajes de error son los que ve el estudiante en el celular: dicen qué
// pasó y qué hacer. Se escriben acá una sola vez, no en cada pantalla.
// ---------------------------------------------------------------------------

export const NICKNAME_MAX_LENGTH = 20;

/**
 * Apodo del jugador. Recorta, colapsa espacios y valida.
 * Preserva mayúsculas y acentos: la versión normalizada para comparar es
 * `nickname_key`, que la calcula `normalizeNickname()`.
 */
export const nicknameSchema = z
  // El mensaje cubre también el caso de que falte el campo o no sea string:
  // ningún error de zod en inglés puede llegar a la pantalla del estudiante.
  .string({ error: "Escribí un apodo para entrar." })
  .transform((value) => value.replace(/\s+/gu, " ").trim())
  .refine((value) => value.length > 0, {
    message: "Escribí un apodo para entrar.",
  })
  .refine(([...chars]) => chars.length <= NICKNAME_MAX_LENGTH, {
    message: `El apodo no puede tener más de ${NICKNAME_MAX_LENGTH} caracteres. Probá con uno más corto.`,
  })
  // Caracteres de control y de formato (incluido el override de dirección, que
  // puede dar vuelta el texto del ranking). Los emoji comunes siguen pasando.
  .refine((value) => !/[\p{Cc}\p{Cf}]/u.test(value), {
    message:
      "El apodo tiene caracteres que no se pueden usar. Probá solo con letras y números.",
  });

export const joinRequestSchema = z.object({ nickname: nicknameSchema });
export type JoinRequest = z.input<typeof joinRequestSchema>;

export const joinResponseSchema = z.object({
  playerId: z.uuid(),
  nickname: z.string().min(1),
});
export type JoinResponse = z.infer<typeof joinResponseSchema>;

/** Cómo va un jugador. Solo se calcula si se pide con `?playerId=`. */
export const playerStandingSchema = z.object({
  totalScore: z.number().int(),
  /** Posición provisoria. null si `reveal_ranking` está apagado. */
  rank: z.number().int().positive().nullable(),
  totalPlayers: z.number().int().nonnegative(),
  answered: z.number().int().nonnegative(),
});
export type PlayerStanding = z.infer<typeof playerStandingSchema>;

/** Lo que devuelve `GET /api/state`. */
export const gameStateResponseSchema = z.object({
  status: gameStatusSchema,
  /**
   * Cuándo arrancó esta ronda. Cambia cada vez que el expositor toca
   * "Comenzar", así que identifica a la partida: el celular lo usa para saber
   * si lo que tiene guardado es de esta ronda o de la anterior.
   */
  startedAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  revealRanking: z.boolean(),
  playerCount: z.number().int().nonnegative(),
  /** Presente solo si se pasó `?playerId=`. */
  me: playerStandingSchema.nullable().optional(),
});
export type GameStateResponse = z.infer<typeof gameStateResponseSchema>;

/** Lo que devuelve `GET /api/questions`. */
export const questionsResponseSchema = z.object({
  questions: z.array(z.unknown()),
});

/** Forma única de los errores de la API. `error` se muestra tal cual. */
export type ApiError = { error: string };

// ---------------------------------------------------------------------------
// Autoría de preguntas (panel de admin)
//
// El mismo schema corre en el formulario y en el endpoint. Además de las formas,
// valida la coherencia entre `payload` y `answer`: que la opción correcta exista,
// que el orden sea una permutación de los ítems, que el valor del slider esté
// dentro del rango. Una pregunta incoherente pasa la validación de forma pero
// rompe la partida, y se carga el día anterior a la clase.
// ---------------------------------------------------------------------------

export const MIN_CHOICES = 2;
export const MAX_CHOICES = 6;

const authoringCommon = {
  prompt: z.string().trim().min(1, "Escribí el enunciado."),
  hint: z
    .string()
    .trim()
    .max(300, "La explicación no puede pasar de 300 caracteres.")
    .nullable(),
  points: z
    .number()
    .int()
    .min(0)
    .max(10000, "El puntaje máximo es 10000."),
  time_limit: z
    .number()
    .int()
    .min(5, "El tiempo mínimo es 5 segundos.")
    .max(300, "El tiempo máximo es 300 segundos."),
  is_active: z.boolean(),
};

const choicesSchema = z
  .array(optionSchema)
  .min(MIN_CHOICES, `Tenés que cargar al menos ${MIN_CHOICES} opciones.`)
  .max(MAX_CHOICES, `No puede haber más de ${MAX_CHOICES} opciones.`);

const questionInputUnion = z.discriminatedUnion("type", [
  z.object({
    ...authoringCommon,
    type: z.literal("single"),
    payload: z.object({ choices: choicesSchema }),
    answer: singleAnswerSchema,
  }),
  z.object({
    ...authoringCommon,
    type: z.literal("multiple"),
    payload: z.object({ choices: choicesSchema }),
    answer: multipleAnswerSchema,
  }),
  z.object({
    ...authoringCommon,
    type: z.literal("truefalse"),
    payload: truefalsePayloadSchema,
    answer: truefalseAnswerSchema,
  }),
  z.object({
    ...authoringCommon,
    type: z.literal("order"),
    payload: orderPayloadSchema,
    answer: orderAnswerSchema,
  }),
  z.object({
    ...authoringCommon,
    type: z.literal("match"),
    payload: matchPayloadSchema,
    answer: matchAnswerSchema,
  }),
  z.object({
    ...authoringCommon,
    type: z.literal("slider"),
    payload: sliderPayloadSchema,
    answer: sliderAnswerSchema,
  }),
  z.object({
    ...authoringCommon,
    type: z.literal("text"),
    payload: textPayloadSchema,
    answer: textAnswerSchema,
  }),
]);

const hasDuplicates = (values: string[]) => new Set(values).size !== values.length;

export const questionInputSchema = questionInputUnion.superRefine((q, ctx) => {
  const fail = (message: string, path: (string | number)[]) =>
    ctx.addIssue({ code: "custom", message, path });

  switch (q.type) {
    case "single": {
      const ids = q.payload.choices.map((choice) => choice.id);
      if (hasDuplicates(ids)) fail("Hay opciones con el mismo id.", ["payload"]);
      if (!ids.includes(q.answer.choiceId)) {
        fail("Marcá cuál es la opción correcta.", ["answer", "choiceId"]);
      }
      break;
    }

    case "multiple": {
      const ids = q.payload.choices.map((choice) => choice.id);
      if (hasDuplicates(ids)) fail("Hay opciones con el mismo id.", ["payload"]);
      if (q.answer.choiceIds.length === 0) {
        fail("Marcá al menos una opción correcta.", ["answer", "choiceIds"]);
      }
      if (hasDuplicates(q.answer.choiceIds)) {
        fail("Hay una opción correcta repetida.", ["answer", "choiceIds"]);
      }
      if (q.answer.choiceIds.some((id) => !ids.includes(id))) {
        fail("Hay una opción correcta que ya no existe.", ["answer", "choiceIds"]);
      }
      break;
    }

    case "order": {
      const ids = q.payload.items.map((item) => item.id);
      if (hasDuplicates(ids)) fail("Hay ítems con el mismo id.", ["payload"]);
      // El orden correcto tiene que usar todos los ítems, exactamente una vez.
      const sameLength = q.answer.order.length === ids.length;
      const samePermutation =
        sameLength &&
        !hasDuplicates(q.answer.order) &&
        q.answer.order.every((id) => ids.includes(id));
      if (!samePermutation) {
        fail(
          "El orden correcto tiene que incluir todos los ítems una sola vez.",
          ["answer", "order"],
        );
      }
      break;
    }

    case "match": {
      const leftIds = q.payload.left.map((item) => item.id);
      const rightIds = q.payload.right.map((item) => item.id);
      if (hasDuplicates(leftIds) || hasDuplicates(rightIds)) {
        fail("Hay ítems con el mismo id.", ["payload"]);
      }
      const pairKeys = Object.keys(q.answer.pairs);
      if (pairKeys.length !== leftIds.length) {
        fail("Cada ítem de la izquierda tiene que tener su par.", [
          "answer",
          "pairs",
        ]);
      }
      if (pairKeys.some((id) => !leftIds.includes(id))) {
        fail("Hay un par que apunta a un ítem de la izquierda que no existe.", [
          "answer",
          "pairs",
        ]);
      }
      if (
        Object.values(q.answer.pairs).some((id) => !rightIds.includes(id))
      ) {
        fail("Hay un par que apunta a un ítem de la derecha que no existe.", [
          "answer",
          "pairs",
        ]);
      }
      break;
    }

    case "slider": {
      const { min, max, step } = q.payload;
      if (min >= max) {
        fail("El mínimo tiene que ser menor que el máximo.", ["payload", "min"]);
      }
      if (step <= 0) fail("El paso tiene que ser mayor que 0.", ["payload", "step"]);
      if (q.answer.value < min || q.answer.value > max) {
        fail("El valor correcto tiene que estar dentro del rango.", [
          "answer",
          "value",
        ]);
      }
      if (q.answer.tolerance > max - min) {
        fail("La tolerancia es más grande que todo el rango.", [
          "answer",
          "tolerance",
        ]);
      }
      break;
    }

    case "text": {
      const cleaned = q.answer.accepted.map((value) => value.trim()).filter(Boolean);
      if (cleaned.length === 0) {
        fail("Cargá al menos una respuesta aceptada.", ["answer", "accepted"]);
      }
      if (hasDuplicates(cleaned.map((value) => value.toLowerCase()))) {
        fail("Hay respuestas aceptadas repetidas.", ["answer", "accepted"]);
      }
      break;
    }

    case "truefalse":
      break;
  }
});

export type QuestionInput = z.infer<typeof questionInputSchema>;

/** Body de `PATCH /api/admin/questions/reorder`. */
export const reorderSchema = z.object({
  ids: z.array(z.uuid()).min(1),
});

/** Body de `POST /api/admin/questions/import`. */
export const importSchema = z.object({
  questions: z.array(questionInputSchema).min(1, "El archivo no tiene preguntas."),
  /** true reemplaza todo; false agrega al final. */
  replace: z.boolean(),
});

/**
 * Lo que se manda cuando se acaba el tiempo sin responder.
 *
 * No coincide con ningún schema de `RESPONSE_SCHEMAS`, así que `grade()` lo
 * corrige como incorrecto (ratio 0) para los siete tipos, sin casos especiales.
 * Y como queda guardado tal cual en `answers.response`, después se puede
 * distinguir "se le acabó el tiempo" de "respondió mal".
 */
export const TIMEOUT_RESPONSE = { timedOut: true } as const;

/** Body de `POST /api/answer`. */
export const answerRequestSchema = z.object({
  playerId: z.uuid({ error: "Volvé a entrar con tu apodo." }),
  questionId: z.uuid({ error: "Esa pregunta no existe." }),
  response: z.unknown(),
  elapsedMs: z.number().nonnegative({
    error: "El tiempo de respuesta no es válido.",
  }),
});
export type AnswerRequest = z.infer<typeof answerRequestSchema>;

/**
 * Lo que el servidor devuelve después de corregir una respuesta.
 *
 * `correctAnswer` es la respuesta correcta ya formateada para mostrar: el
 * cliente nunca recibe el `answer` crudo, y esto solo llega después de haber
 * respondido.
 */
export const answerResultSchema = z.object({
  isCorrect: z.boolean(),
  ratio: z.number(),
  /** Puntos que sumó esta pregunta. */
  score: z.number().int(),
  correctAnswer: z.string(),
  /** La explicación de una línea, para aprender del error. */
  hint: z.string().nullable(),
  /** Puntaje acumulado después de esta pregunta. */
  totalScore: z.number().int(),
  /** Posición en el ranking. null si `reveal_ranking` está apagado. */
  rank: z.number().int().positive().nullable(),
  totalPlayers: z.number().int().nonnegative(),
});
export type AnswerResult = z.infer<typeof answerResultSchema>;

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
