import clsx from "clsx";

/**
 * La hoja de papel continuo: el contenedor de toda pantalla.
 *
 * Canaleta de arrastre perforada a la izquierda (16px, solo un lado: dos bandas
 * en un celular de 360px se comen el contenido) y líneas de corte arriba y abajo.
 */
export function Paper({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <div aria-hidden className="papel-corte" />

      <div className="flex flex-1 items-stretch">
        <div aria-hidden className="papel-canaleta w-4 shrink-0" />

        <main
          className={clsx(
            "flex min-w-0 flex-1 flex-col px-4 py-5",
            "pb-[max(1.25rem,env(safe-area-inset-bottom))]",
            className,
          )}
        >
          {children}
        </main>
      </div>

      <div aria-hidden className="papel-corte" />
    </div>
  );
}

/**
 * Cabecera de trabajo del listado: lo que una impresora emite arriba de todo.
 * Mono, alineada a la izquierda, entre filetes. No es un eyebrow centrado.
 */
export function PaperHeader({
  left,
  right,
}: {
  left: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="flex items-baseline justify-between gap-3 font-mono text-[0.6875rem] tracking-[0.14em] text-carbon uppercase">
        <span className="min-w-0 truncate">{left}</span>
        {right ? <span className="shrink-0">{right}</span> : null}
      </div>
      <div aria-hidden className="papel-doble-filete mt-1.5" />
    </div>
  );
}
