"use client";

/**
 * Marcador de posición del juego.
 *
 * TODO(paso 4): acá va la pantalla de preguntas con el timer. Por ahora solo
 * confirma que la partida arrancó, para que el estudiante no quede mirando la
 * sala de espera sin entender qué pasó.
 */
export function PlayScreen() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <h1 className="text-2xl font-semibold">La partida arrancó.</h1>
      <p className="text-muted">
        La pantalla de preguntas todavía no está construida.
      </p>
    </div>
  );
}
