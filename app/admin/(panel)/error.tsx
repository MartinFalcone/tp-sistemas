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
      titulo="Se rompió el panel"
      detalle="La partida sigue como estaba: esto es solo el panel. Recargá la página. Si tampoco entra, la sesión pudo haber vencido — volvé a /admin/login."
      digest={error.digest}
      onReset={reset}
    />
  );
}
