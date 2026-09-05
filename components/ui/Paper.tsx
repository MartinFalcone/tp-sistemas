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
  size = "phone",
}: {
  children: React.ReactNode;
  className?: string;
  /** "tv" es el modo proyector: hoja ancha y todo más grande. */
  size?: "phone" | "tv";
}) {
  const tv = size === "tv";

  return (
    <div
      className={clsx(
        "mx-auto flex min-h-dvh w-full flex-col",
        tv ? "max-w-6xl" : "max-w-md",
      )}
    >
      <div aria-hidden className="papel-corte" />

      <div className="flex flex-1 items-stretch">
        <div
          aria-hidden
          className={clsx("papel-canaleta shrink-0", tv ? "w-6" : "w-4")}
        />

        <main
          className={clsx(
            "flex min-w-0 flex-1 flex-col",
            tv ? "px-6 py-6" : "px-4 py-5",
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
