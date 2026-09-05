"use client";

import { ErrorScreen } from "@/components/ui/ErrorScreen";

/**
 * Error boundary de la partida: el más importante de los cinco, porque es el
 * único que se puede romper con 30 personas mirando.
 *
 * El mensaje promete que no se perdió nada, y es verdad: el avance está en
 * `localStorage` (`quiz.progress`) y las respuestas ya enviadas están en la
 * base. Recargar retoma en la misma pregunta y con el tiempo que quedaba.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorScreen
      titulo="Se cortó la partida"
      detalle="Recargá la página: volvés a la misma pregunta y no perdés lo que ya respondiste. Si no vuelve, avisale al expositor."
      digest={error.digest}
      onReset={reset}
    />
  );
}
