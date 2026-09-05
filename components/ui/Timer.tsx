import clsx from "clsx";

const URGENT_MS = 5_000;
/** Cantidad de bloques de la barra. La barra se vacía de a un bloque, no continuo. */
const SEGMENTS = 20;

/**
 * Cronómetro: una barra de bloques que se vacía, más los dígitos.
 *
 * Es presentacional a propósito — no tiene reloj adentro. El módulo del juego le
 * pasa `remainingMs` y así el tiempo lo manda el servidor, no el celular.
 *
 * La urgencia no depende del color: además de pasar a rojo de cinta, la barra se
 * llena de trama diagonal y aparece un `!`. Se lee en escala de grises.
 */
export function Timer({
  remainingMs,
  totalMs,
  className,
}: {
  remainingMs: number;
  totalMs: number;
  className?: string;
}) {
  const safeTotal = totalMs > 0 ? totalMs : 1;
  const remaining = Math.max(0, Math.min(remainingMs, safeTotal));
  const seconds = Math.ceil(remaining / 1000);
  const urgent = remaining <= URGENT_MS;

  // Se redondea a bloques enteros: una impresora avanza de a pasos.
  const filled = Math.ceil((remaining / safeTotal) * SEGMENTS);
  const width = `${(filled / SEGMENTS) * 100}%`;

  return (
    <div
      className={clsx("flex items-center gap-2", className)}
      role="timer"
      aria-label={`Quedan ${seconds} segundos`}
    >
      <div
        aria-hidden
        className="relative h-4 min-w-0 flex-1 overflow-hidden border border-tinta"
      >
        <div
          className={clsx(
            "absolute inset-y-0 left-0 transition-[width] duration-200 ease-linear",
            urgent ? "papel-trama bg-cinta" : "bg-tinta",
          )}
          style={{ width }}
        />
        {/* Divisiones de bloque, encima del relleno. */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(to right, transparent 0 calc(100%/${SEGMENTS} - 1px), var(--papel) calc(100%/${SEGMENTS} - 1px) calc(100%/${SEGMENTS}))`,
          }}
        />
      </div>

      <p
        aria-hidden
        className={clsx(
          "w-[3.5ch] shrink-0 text-right font-mono text-xl font-semibold tabular-nums",
          urgent ? "text-cinta" : "text-tinta",
        )}
      >
        {urgent ? "!" : ""}
        {seconds}
      </p>
    </div>
  );
}
