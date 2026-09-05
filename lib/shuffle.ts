import type { Question } from "./types";

/** Fisher-Yates. `random` se inyecta para poder testear. */
export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Cuántas veces se reintenta el barajado antes de resignarse. */
const MAX_ATTEMPTS = 8;

/**
 * Baraja lo que hay que barajar antes de mandarle la pregunta al jugador.
 *
 *  - `order`: los ítems se cargan en el orden correcto en el admin, así que
 *    mostrarlos tal cual sería regalar la respuesta.
 *  - `match`: se baraja la columna derecha; la izquierda es el enunciado de
 *    cada par y conviene que quede estable.
 *
 * El resto no se toca: en `single` y `multiple` el orden de las opciones es una
 * decisión de quien escribió la pregunta.
 *
 * Se corre ANTES de `toPublicQuestion()` para poder mirar `answer` y evitar que
 * un barajado devuelva justo el orden correcto — con 4 ítems eso pasa 1 de cada
 * 24 veces, y es un punto regalado.
 */
export function shuffleForPlayer<T extends Question>(
  question: T,
  random: () => number = Math.random,
): T {
  // El cast es seguro: barajar nunca cambia `type`, así que el miembro del union
  // que entra es el mismo que sale. Se hace acá para que quien llama conserve el
  // tipo estrechado en vez de recibir el union entero.
  return shuffleQuestion(question, random) as T;
}

function shuffleQuestion(
  question: Question,
  random: () => number,
): Question {
  switch (question.type) {
    case "order": {
      if (question.payload.items.length < 2) return question;

      let items = shuffle(question.payload.items, random);
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const isCorrectOrder = items.every(
          (item, index) => item.id === question.answer.order[index],
        );
        if (!isCorrectOrder) break;
        items = shuffle(question.payload.items, random);
      }

      return { ...question, payload: { ...question.payload, items } };
    }

    case "match":
      return {
        ...question,
        payload: {
          ...question.payload,
          right: shuffle(question.payload.right, random),
        },
      };

    default:
      return question;
  }
}
