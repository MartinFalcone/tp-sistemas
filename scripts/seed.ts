/**
 * Carga las preguntas reales del TP.
 *
 *   npx tsx scripts/seed.ts
 *
 * Borra TODAS las preguntas que había y deja estas 12, con `order_index` 1..12.
 * Como `answers.question_id` es `on delete cascade`, borrar las preguntas borra
 * también las respuestas que ya se hubieran dado. Los jugadores quedan, pero sin
 * respuestas: para una limpieza completa antes de la clase, usá "Reiniciar todo"
 * en /admin.
 *
 * Cada pregunta se valida con `questionInputSchema` ANTES de tocar la base, que es
 * el mismo schema que usan el formulario del admin y `POST /api/admin/questions`.
 * Si una sola está mal armada, el script no escribe nada.
 *
 * Sobre los ids de `order` y `match`: son slugs semánticos y NO ordinales
 * ("motor", "tractor"...) en vez de "1".."5". El `payload` viaja al celular, así
 * que unos ids numerados en el orden correcto serían la respuesta servida en el
 * JSON, por más que `lib/shuffle.ts` baraje lo que se muestra.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { questionInputSchema, type Database, type QuestionInput } from "../lib/types";

// ---------------------------------------------------------------------------
// Las preguntas
// ---------------------------------------------------------------------------

const QUESTIONS: QuestionInput[] = [
  {
    type: "single",
    prompt:
      "¿Qué componente del cabezal golpea la cinta entintada para formar los caracteres?",
    hint: "Son agujas de acero: un solenoide las dispara y cada impacto deja un punto.",
    points: 1000,
    time_limit: 20,
    is_active: true,
    payload: {
      choices: [
        { id: "agujas", text: "Agujas" },
        { id: "toberas", text: "Toberas" },
        { id: "tambor", text: "Un tambor fotosensible" },
        { id: "laser", text: "Un láser" },
      ],
    },
    answer: { choiceId: "agujas" },
  },

  {
    type: "truefalse",
    prompt: "La impresora de matriz de punto es una impresora de impacto.",
    hint: "Hay golpe físico contra el papel, y por eso hace ruido y saca copias.",
    points: 1000,
    time_limit: 15,
    is_active: true,
    payload: {},
    answer: { value: true },
  },

  {
    type: "order",
    prompt: "Ordená el proceso de impresión de un carácter.",
    hint: "Primero llegan los datos, después se posiciona el cabezal, y recién al final avanza el papel.",
    points: 1000,
    time_limit: 45,
    is_active: true,
    payload: {
      items: [
        { id: "datos", text: "La placa controladora recibe los datos" },
        { id: "motor", text: "El motor paso a paso desplaza el carro con el cabezal" },
        { id: "solenoides", text: "Los solenoides disparan las agujas correspondientes" },
        { id: "impacto", text: "Las agujas golpean la cinta entintada contra el papel" },
        { id: "tractor", text: "El tractor avanza el papel una línea" },
      ],
    },
    answer: { order: ["datos", "motor", "solenoides", "impacto", "tractor"] },
  },

  {
    type: "match",
    prompt: "Uní cada componente con su función.",
    hint: "El cabezal golpea, la cinta entinta, el motor posiciona, el tractor arrastra y el buffer espera.",
    points: 1000,
    time_limit: 60,
    is_active: true,
    payload: {
      left: [
        { id: "cabezal", text: "Cabezal de impresión" },
        { id: "cinta", text: "Cinta entintada" },
        { id: "motor", text: "Motor paso a paso" },
        { id: "tractor", text: "Tractor de arrastre" },
        { id: "buffer", text: "Buffer" },
      ],
      right: [
        { id: "fn-agujas", text: "Contiene las agujas y los solenoides" },
        { id: "fn-tinta", text: "Aporta la tinta que se transfiere al papel" },
        { id: "fn-carro", text: "Desplaza el carro con precisión posición a posición" },
        { id: "fn-papel", text: "Hace avanzar el papel continuo por sus perforaciones" },
        { id: "fn-datos", text: "Almacena temporalmente los datos recibidos de la computadora" },
      ],
    },
    answer: {
      pairs: {
        cabezal: "fn-agujas",
        cinta: "fn-tinta",
        motor: "fn-carro",
        tractor: "fn-papel",
        buffer: "fn-datos",
      },
    },
  },

  {
    // Reformulada: ver NOTAS al pie. Preguntar por "una NLQ típica" y esperar 24
    // era técnicamente incorrecto y además chocaba con la pregunta 12.
    type: "slider",
    prompt:
      "¿Cuántas agujas tiene el cabezal de una impresora de matriz de punto de alta calidad, como las de la serie Epson LQ?",
    hint: "24 agujas. Las económicas traían 9; duplicar la cantidad de agujas es lo que da el modo Letter Quality.",
    points: 1000,
    time_limit: 25,
    is_active: true,
    payload: { min: 6, max: 36, step: 1, unit: "agujas" },
    answer: { value: 24, tolerance: 0 },
  },

  {
    type: "multiple",
    prompt:
      "¿Cuáles son ventajas de la matriz de punto frente a una impresora láser o de chorro de tinta?",
    hint: "Gana en multicopia, costo y robustez. En resolución y en ruido pierde.",
    points: 1000,
    time_limit: 35,
    is_active: true,
    payload: {
      choices: [
        { id: "multicopia", text: "Permite imprimir formularios multicopia con papel carbónico" },
        { id: "costo", text: "Bajo costo por página" },
        { id: "robustez", text: "Gran robustez en ambientes industriales" },
        { id: "resolucion", text: "Mayor resolución gráfica" },
        { id: "silencio", text: "Funcionamiento silencioso" },
      ],
    },
    answer: { choiceIds: ["multicopia", "costo", "robustez"] },
  },

  {
    type: "single",
    prompt: "¿Cuál era la interfaz de conexión clásica de estas impresoras con la PC?",
    hint: "El puerto paralelo Centronics: un conector ancho de 36 pines que mandaba 8 bits a la vez.",
    points: 1000,
    time_limit: 20,
    is_active: true,
    payload: {
      choices: [
        { id: "centronics", text: "Puerto paralelo Centronics" },
        { id: "usbc", text: "USB-C" },
        { id: "sata", text: "SATA" },
        { id: "ps2", text: "PS/2" },
      ],
    },
    answer: { choiceId: "centronics" },
  },

  {
    type: "text",
    prompt:
      "¿Qué significa la sigla NLQ, usada para describir un modo de impresión de mayor calidad?",
    hint: "Near Letter Quality: casi la calidad de una máquina de escribir, lograda pasando el cabezal más de una vez.",
    points: 1000,
    time_limit: 35,
    is_active: true,
    payload: { placeholder: "En inglés o traducido" },
    answer: {
      accepted: [
        "near letter quality",
        "calidad casi de carta",
        "casi calidad de carta",
        "calidad cercana a la de una carta",
        "calidad cercana a máquina de escribir",
      ],
    },
  },

  {
    type: "single",
    prompt: "¿Por qué la matriz de punto sigue usándose hoy en bancos, aduanas y logística?",
    hint: "Es la única tecnología común que imprime el original y sus copias de una sola pasada.",
    points: 1000,
    time_limit: 25,
    is_active: true,
    payload: {
      choices: [
        {
          id: "copias",
          text: "Porque es la única tecnología común que imprime varias copias de un formulario de una sola pasada",
        },
        { id: "rapida", text: "Porque imprime más rápido que una impresora láser" },
        { id: "resolucion", text: "Porque tiene mejor resolución que una impresora láser" },
        { id: "sin-luz", text: "Porque funciona sin conexión a la red eléctrica" },
      ],
    },
    answer: { choiceId: "copias" },
  },

  {
    type: "truefalse",
    prompt:
      "Una matriz de 9 agujas puede formar caracteres con mejor definición que una de 24 agujas.",
    hint: "Es al revés: más agujas son puntos más chicos y juntos, o sea trazos más definidos.",
    points: 1000,
    time_limit: 15,
    is_active: true,
    payload: {},
    answer: { value: false },
  },

  {
    type: "multiple",
    prompt: "¿Cuáles de estos son consumibles o partes de desgaste de una matriz de punto?",
    hint: "El tóner es de la láser y el cartucho líquido es de la de chorro de tinta: ninguno de los dos existe acá.",
    points: 1000,
    time_limit: 30,
    is_active: true,
    payload: {
      choices: [
        { id: "cinta", text: "Cinta entintada" },
        { id: "agujas", text: "Agujas del cabezal" },
        { id: "rodillo", text: "Rodillo (platen)" },
        { id: "toner", text: "Tóner" },
        { id: "cartucho", text: "Cartucho de tinta líquida" },
      ],
    },
    answer: { choiceIds: ["cinta", "agujas", "rodillo"] },
  },

  {
    type: "order",
    prompt: "Ordená de menor a mayor calidad de impresión los modos típicos.",
    hint: "Draft es una sola pasada rápida; cada modo superior agrega pasadas y define mejor el trazo.",
    points: 1000,
    time_limit: 25,
    is_active: true,
    payload: {
      items: [
        { id: "draft", text: "Draft" },
        { id: "nlq", text: "Near Letter Quality (NLQ)" },
        { id: "lq", text: "Letter Quality (LQ)" },
      ],
    },
    answer: { order: ["draft", "nlq", "lq"] },
  },
];

// ---------------------------------------------------------------------------
// Entorno
//
// Un script suelto no pasa por Next, así que nadie le carga `.env.local`. Se lee
// a mano, y lo que ya esté en `process.env` gana: así se puede apuntar a otra
// base sin editar el archivo.
// ---------------------------------------------------------------------------

function loadEnv(name: string): string {
  if (process.env[name]) return process.env[name] as string;

  try {
    const file = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of file.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      if (trimmed.slice(0, eq).trim() !== name) continue;
      return trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    // Cae en el error de abajo, que dice qué hacer.
  }

  console.error(
    `\nFalta ${name}.\nCargala en .env.local o pasala por entorno antes de correr el script.\n`,
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------

async function main() {
  // 1. Validar TODO antes de tocar la base. Es el mismo schema que el del admin,
  //    así que una pregunta que pasa acá se puede editar después sin sorpresas.
  const problems: string[] = [];
  QUESTIONS.forEach((question, index) => {
    const parsed = questionInputSchema.safeParse(question);
    if (parsed.success) return;
    for (const issue of parsed.error.issues) {
      problems.push(
        `  #${index + 1} "${question.prompt.slice(0, 40)}…" → ${issue.path.join(".")}: ${issue.message}`,
      );
    }
  });

  if (problems.length > 0) {
    console.error("\nHay preguntas mal armadas. No se escribió nada:\n");
    console.error(problems.join("\n"));
    process.exit(1);
  }
  console.log(`Las ${QUESTIONS.length} preguntas pasan la validación del admin.`);

  const db = createClient<Database>(
    loadEnv("NEXT_PUBLIC_SUPABASE_URL"),
    loadEnv("SUPABASE_SECRET_KEY"),
    { auth: { persistSession: false } },
  );

  // 2. No pisar una partida en curso: borrar las preguntas la dejaría sin nada
  //    que mostrar a mitad de camino.
  const { data: state, error: stateError } = await db
    .from("game_state")
    .select("status")
    .eq("id", 1)
    .single();

  if (stateError) {
    console.error(`\nNo se pudo leer game_state: ${stateError.message}\n`);
    process.exit(1);
  }
  if (state.status === "running") {
    console.error(
      "\nLa partida está EN CURSO. Cerrala desde /admin antes de recargar las preguntas.\n",
    );
    process.exit(1);
  }

  // 3. Borrar lo que había. Arrastra las respuestas por el cascade del FK.
  const { count: previous } = await db
    .from("questions")
    .select("id", { count: "exact", head: true });

  const { error: deleteError } = await db
    .from("questions")
    .delete()
    .not("id", "is", null);

  if (deleteError) {
    console.error(`\nNo se pudieron borrar las preguntas: ${deleteError.message}\n`);
    process.exit(1);
  }
  console.log(`Borradas ${previous ?? 0} preguntas anteriores (y sus respuestas).`);

  // 4. Insertar.
  const rows = QUESTIONS.map((question, index) => ({
    order_index: index + 1,
    type: question.type,
    prompt: question.prompt,
    hint: question.hint,
    payload: question.payload,
    answer: question.answer,
    points: question.points,
    time_limit: question.time_limit,
    is_active: question.is_active,
  }));

  const { error: insertError } = await db.from("questions").insert(rows);
  if (insertError) {
    console.error(`\nNo se pudieron insertar las preguntas: ${insertError.message}\n`);
    process.exit(1);
  }

  // 5. Releer y mostrar lo que quedó, que es lo único que prueba algo.
  const { data: stored, error: readError } = await db
    .from("questions")
    .select("order_index, type, prompt, points, time_limit, is_active")
    .order("order_index");

  if (readError || !stored) {
    console.error(`\nSe insertaron, pero no se pudieron releer: ${readError?.message}\n`);
    process.exit(1);
  }

  console.log(`\n${stored.length} preguntas cargadas:\n`);
  for (const row of stored) {
    console.log(
      `  ${String(row.order_index).padStart(2)}. [${row.type.padEnd(9)}] ` +
        `${row.time_limit}s  ${row.prompt.slice(0, 58)}`,
    );
  }

  const seconds = stored.reduce((total, row) => total + row.time_limit, 0);
  const types = new Set(stored.map((row) => row.type));
  console.log(
    `\nTipos distintos: ${types.size}/7. ` +
      `Techo de tiempo si alguien agota el reloj en todas: ${Math.ceil(seconds / 60)} min.`,
  );
}

main().catch((error) => {
  console.error("\nError inesperado:", error);
  process.exit(1);
});

// ---------------------------------------------------------------------------
// NOTAS sobre cambios de redacción
//
// Pregunta 5 (slider). Venía como "¿Cuántas agujas tiene el cabezal de una
// impresora de calidad NLQ típica?" con 24 como respuesta. NLQ era justamente el
// modo con el que las máquinas de 9 agujas simulaban buena calidad pasando el
// cabezal dos veces con un pequeño desplazamiento; las de 24 agujas se vendían
// como LQ (Letter Quality), un escalón arriba. Con la redacción original, la
// respuesta técnicamente defendible era 9, y además contradecía la pregunta 12,
// que pone NLQ por debajo de LQ. Ahora pregunta por el cabezal de alta calidad
// (serie LQ), donde 24 es la respuesta correcta y consistente.
//
// Pregunta 9 (single). El enunciado traía sólo la opción correcta, así que se
// escribieron tres distractores plausibles (velocidad, resolución, alimentación).
// ---------------------------------------------------------------------------
