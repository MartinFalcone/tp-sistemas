import clsx from "clsx";

/**
 * Esqueletos de carga.
 *
 * Por qué esqueletos y no un spinner a pantalla completa: un spinner tapa todo,
 * no dice cuánto falta y hace que cada demora se sienta igual de larga. Un
 * esqueleto con la forma de lo que viene deja la pantalla armada, evita el salto
 * de layout cuando llegan los datos, y con una conexión lenta se lee como
 * "está llegando" en vez de "se colgó".
 *
 * Visualmente no es un shimmer gris importado de otra app: es la grilla de
 * agujas sin imprimir (`.papel-puntos`), o sea papel en blanco esperando al
 * cabezal. La animación de respiración la apaga sola el bloque global de
 * `prefers-reduced-motion`.
 *
 * Todos llevan `aria-hidden`: quien usa lector de pantalla escucha el
 * `role="status"` de la pantalla que los contiene, no doce cajas vacías.
 */

export function SkeletonBar({
  className,
  width,
}: {
  className?: string;
  /** Ej: "70%". Variar los anchos evita que parezca una tabla de verdad. */
  width?: string;
}) {
  return (
    <div
      aria-hidden
      style={width ? { width } : undefined}
      className={clsx("papel-puntos h-3 rounded-hoja", className)}
    />
  );
}

/** Un renglón de opción: el alto real de un target táctil, para no saltar. */
export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={clsx(
        "flex min-h-14 items-center gap-3 border border-filete px-3",
        className,
      )}
    >
      <div className="papel-puntos size-5 shrink-0 rounded-hoja" />
      <SkeletonBar width="72%" />
    </div>
  );
}

/**
 * Lo que se ve mientras bajan las preguntas: la misma estructura que
 * `QuestionShell` — cabecera, enunciado, cuatro opciones.
 */
export function QuestionSkeleton() {
  return (
    <div role="status" aria-label="Cargando la pregunta" className="flex flex-1 flex-col">
      <div className="mb-5 space-y-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <SkeletonBar width="7rem" className="h-2.5" />
          <SkeletonBar width="3.5rem" className="h-2.5" />
        </div>
        <div aria-hidden className="papel-doble-filete" />
      </div>

      <div className="space-y-2">
        <SkeletonBar width="100%" className="h-4" />
        <SkeletonBar width="82%" className="h-4" />
      </div>

      <div className="mt-7 space-y-2.5">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>

      <p className="mt-6 text-center font-mono text-[0.6875rem] tracking-[0.14em] text-carbon uppercase">
        Cargando…
      </p>
    </div>
  );
}

/** Filas del ranking, con el ancho decreciente de una tabla ordenada. */
export function RankingSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Cargando el ranking" className="space-y-2">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          aria-hidden
          className="flex items-center gap-3 border-b border-filete py-2.5"
        >
          <div className="papel-puntos size-6 shrink-0 rounded-hoja" />
          <SkeletonBar width={`${Math.max(28, 62 - index * 6)}%`} />
          <SkeletonBar width="3rem" className="ml-auto" />
        </div>
      ))}
    </div>
  );
}

/** Para las tablas del panel, que el expositor mira desde la notebook. */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Cargando" className="space-y-2">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          aria-hidden
          className="flex items-center gap-3 border-b border-filete py-2"
        >
          <SkeletonBar width="1.5rem" className="h-2.5" />
          <SkeletonBar width={`${Math.max(30, 55 - index * 4)}%`} className="h-2.5" />
          <SkeletonBar width="3rem" className="ml-auto h-2.5" />
        </div>
      ))}
    </div>
  );
}
