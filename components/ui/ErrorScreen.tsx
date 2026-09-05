"use client";

import { Button } from "./Button";
import { Paper, PaperHeader } from "./Paper";

/**
 * Lo que se ve cuando una pantalla se rompe de verdad.
 *
 * Reglas, todas pensadas para el aula y no para un dashboard:
 *
 *  - **Dice qué hacer, no qué pasó.** "Recargá la página" es accionable;
 *    "Application error: a client-side exception has occurred" no lo es, y es
 *    exactamente lo que muestra Next si esta pantalla no existiera.
 *  - **Dos salidas**, porque `reset()` re-renderiza el árbol sin recargar y a
 *    veces no alcanza: si el error vino de un chunk que bajó cortado, hace falta
 *    la recarga completa.
 *  - **Tranquiliza sobre el progreso**, que es lo que el alumno va a querer
 *    saber. Y es cierto: el avance vive en `localStorage` y las respuestas ya
 *    enviadas están en la base.
 *  - **No muestra el stack.** El `digest` sí, chiquito, porque es lo único que
 *    sirve para cruzar el error con los logs de Vercel si algo pasa en vivo.
 */
export function ErrorScreen({
  titulo = "Se rompió esta pantalla",
  detalle,
  digest,
  onReset,
}: {
  titulo?: string;
  detalle: string;
  digest?: string;
  onReset?: () => void;
}) {
  return (
    <Paper className="justify-center gap-6">
      <PaperHeader left="Error" right="Impresoras de matriz de punto" />

      <div className="space-y-3">
        <h1 className="font-mono text-2xl leading-tight font-semibold uppercase">
          {titulo}
        </h1>
        <p className="text-carbon">{detalle}</p>
      </div>

      <div className="space-y-3">
        {onReset ? (
          <Button full onClick={onReset}>
            Reintentar
          </Button>
        ) : null}
        <Button
          full={!onReset}
          variant={onReset ? "outline" : "solid"}
          onClick={() => window.location.reload()}
        >
          Recargar la página
        </Button>
      </div>

      {digest ? (
        <p className="font-mono text-[0.6875rem] text-carbon">
          Código del error: {digest}
        </p>
      ) : null}
    </Paper>
  );
}
