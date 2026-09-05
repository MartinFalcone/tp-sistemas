import type { Question } from "./types";

/**
 * Convierte la respuesta correcta de una pregunta en texto legible.
 *
 * Solo se usa en el servidor, y solo DESPUÉS de que el jugador respondió: es lo
 * que se le manda como `correctAnswer`. El `answer` crudo no sale nunca.
 *
 * Es pura, así que se puede testear sin base.
 */
export function describeAnswer(question: Question): string {
  switch (question.type) {
    case "single": {
      const choice = question.payload.choices.find(
        (option) => option.id === question.answer.choiceId,
      );
      return choice?.text ?? "(la opción correcta ya no existe)";
    }

    case "multiple": {
      const texts = question.answer.choiceIds.map(
        (id) =>
          question.payload.choices.find((option) => option.id === id)?.text ??
          id,
      );
      return texts.length > 0 ? texts.join(" + ") : "(ninguna)";
    }

    case "truefalse":
      return question.answer.value ? "Verdadero" : "Falso";

    case "order": {
      const texts = question.answer.order.map(
        (id) =>
          question.payload.items.find((item) => item.id === id)?.text ?? id,
      );
      return texts.join(" → ");
    }

    case "match": {
      const pairs = Object.entries(question.answer.pairs).map(
        ([leftId, rightId]) => {
          const left =
            question.payload.left.find((item) => item.id === leftId)?.text ??
            leftId;
          const right =
            question.payload.right.find((item) => item.id === rightId)?.text ??
            rightId;
          return `${left} → ${right}`;
        },
      );
      return pairs.join(" · ");
    }

    case "slider": {
      const { value, tolerance } = question.answer;
      const unit = question.payload.unit ? ` ${question.payload.unit}` : "";
      return tolerance > 0
        ? `${value}${unit} (±${tolerance})`
        : `${value}${unit}`;
    }

    case "text":
      // La primera variante es la canónica; el resto son sinónimos aceptados.
      return question.answer.accepted[0] ?? "";
  }
}
