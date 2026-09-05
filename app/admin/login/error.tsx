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
      titulo="No se pudo mostrar el login"
      detalle="Recargá la página. Si el problema sigue, revisá que ADMIN_PASSWORD esté cargada en el entorno."
      digest={error.digest}
      onReset={reset}
    />
  );
}
