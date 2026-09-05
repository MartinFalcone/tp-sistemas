import clsx from "clsx";

/**
 * Avance por las preguntas, como puntos de una matriz.
 *
 * Los tres estados se distinguen por FORMA y TAMAÑO, no por color:
 *   respondida  ->  cuadrado sólido
 *   actual      ->  cuadrado hueco, más grande, borde grueso
 *   pendiente   ->  punto chico
 */
export function ProgressDots({
  total,
  current,
  answered,
  className,
}: {
  total: number;
  /** Pregunta actual, empezando en 1. */
  current: number;
  /** Cuántas ya se respondieron. */
  answered: number;
  className?: string;
}) {
  return (
    <div
      className={clsx("flex items-center gap-1", className)}
      role="img"
      aria-label={`Pregunta ${current} de ${total}, ${answered} respondidas`}
    >
      {Array.from({ length: total }, (_, index) => {
        const isCurrent = index === current - 1;
        const isAnswered = index < answered;

        return (
          <span
            key={index}
            aria-hidden
            className={clsx(
              "block shrink-0",
              isCurrent
                ? "size-2.5 border-2 border-tinta"
                : isAnswered
                  ? "size-2 bg-tinta"
                  : "size-1 bg-carbon/50",
            )}
          />
        );
      })}
    </div>
  );
}
