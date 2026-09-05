import clsx from "clsx";

/**
 * "Card" es en realidad una HOJA.
 *
 * El principio 1 de DESIGN.md rechaza las tarjetas flotantes: nada de radios
 * grandes, sombras suaves ni fondos elevados. Un bloque de listado se separa del
 * resto con un filete doble arriba y uno simple abajo, y nada más.
 */
export function Card({
  title,
  meta,
  children,
  className,
}: {
  /** Cabecera del bloque, en mono. Opcional. */
  title?: React.ReactNode;
  /** Dato alineado a la derecha de la cabecera (total, contador, estado). */
  meta?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={clsx(
        "papel-doble-filete border-b border-filete py-4",
        className,
      )}
    >
      {title ? (
        <header className="mb-3 flex items-baseline justify-between gap-3 font-mono text-[0.6875rem] tracking-[0.14em] text-carbon uppercase">
          <span className="min-w-0 truncate">{title}</span>
          {meta ? (
            <span className="shrink-0 tabular-nums">{meta}</span>
          ) : null}
        </header>
      ) : null}

      {children}
    </section>
  );
}
