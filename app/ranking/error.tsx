"use client";

import { ErrorScreen } from "@/components/ui/ErrorScreen";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorScreen
      titulo="No se pudo mostrar el ranking"
      detalle="Los puntajes están guardados; esto es solo la pantalla. Recargá la página."
      digest={error.digest}
      onReset={reset}
    />
  );
}
