"use client";

/**
 * Marcador de posición del juego.
 *
 * TODO(paso 5): acá va la pantalla de preguntas con el timer. Por ahora solo
 * confirma que la partida arrancó, para que el estudiante no quede mirando la
 * sala de espera sin entender qué pasó.
 */
export function PlayScreen() {
  return (
    <div className="flex flex-1 flex-col justify-center gap-2">
      <h1 className="font-mono text-2xl font-semibold uppercase">
        La partida arrancó.
      </h1>
      <p className="text-carbon">
        La pantalla de preguntas todavía no está construida.
      </p>
    </div>
  );
}
