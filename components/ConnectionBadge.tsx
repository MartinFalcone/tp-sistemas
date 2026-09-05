"use client";

/**
 * Aviso discreto de que se cortó la conexión.
 *
 * No bloquea nada ni pide hacer nada: el polling reintenta solo cada 2 segundos.
 * Solo aparece para que nadie piense que la app se colgó.
 *
 * No depende del color: el bloque `▚` de trama lo hace visible en gris.
 */
export function ConnectionBadge({ connected }: { connected: boolean }) {
  if (connected) return null;

  return (
    <p
      role="status"
      className="flex shrink-0 items-center gap-1.5 font-mono text-[0.6875rem] tracking-[0.1em] text-cinta uppercase"
    >
      <span aria-hidden>▚</span>
      Sin conexión
    </p>
  );
}
