"use client";

import type { PublicQuestion, QuestionResponse } from "@/lib/types";

import { MatchQuestion } from "./MatchQuestion";
import { MultipleQuestion } from "./MultipleQuestion";
import { OrderQuestion } from "./OrderQuestion";
import { SingleQuestion } from "./SingleQuestion";
import { SliderQuestion } from "./SliderQuestion";
import { TextQuestion } from "./TextQuestion";
import { TrueFalseQuestion } from "./TrueFalseQuestion";

/**
 * Elige el componente según `question.type`.
 *
 * El `switch` sobre el union discriminado hace que TypeScript estreche
 * `question` en cada rama, así que cada componente recibe exactamente su
 * `payload` sin un solo cast. Si algún día se agrega un tipo nuevo a
 * `QUESTION_TYPES` y se olvida acá, el build falla.
 */
export function QuestionRenderer({
  question,
  onSubmit,
  disabled = false,
}: {
  question: PublicQuestion;
  onSubmit: (response: QuestionResponse) => void;
  disabled?: boolean;
}) {
  switch (question.type) {
    case "single":
      return (
        <SingleQuestion
          question={question}
          onSubmit={onSubmit}
          disabled={disabled}
        />
      );
    case "multiple":
      return (
        <MultipleQuestion
          question={question}
          onSubmit={onSubmit}
          disabled={disabled}
        />
      );
    case "truefalse":
      return (
        <TrueFalseQuestion
          question={question}
          onSubmit={onSubmit}
          disabled={disabled}
        />
      );
    case "order":
      return (
        <OrderQuestion
          question={question}
          onSubmit={onSubmit}
          disabled={disabled}
        />
      );
    case "match":
      return (
        <MatchQuestion
          question={question}
          onSubmit={onSubmit}
          disabled={disabled}
        />
      );
    case "slider":
      return (
        <SliderQuestion
          question={question}
          onSubmit={onSubmit}
          disabled={disabled}
        />
      );
    case "text":
      return (
        <TextQuestion
          question={question}
          onSubmit={onSubmit}
          disabled={disabled}
        />
      );
  }
}
