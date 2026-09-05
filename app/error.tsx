"use client";

import { ErrorScreen } from "@/components/ui/ErrorScreen";

/**
 * Error boundary de la raíz. Cubre `/` y cualquier segmento que no traiga el
 * suyo. Ver el porqué de cada decisión en `components/ui/ErrorScreen.tsx`.
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
      detalle="Algo falló al cargar la pantalla de ingreso. Recargá la página; si sigue igual, cerrá la pestaña y volvé a abrir el link."
      digest={error.digest}
      onReset={reset}
    />
  );
}
