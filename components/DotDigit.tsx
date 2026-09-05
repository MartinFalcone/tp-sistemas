import clsx from "clsx";

/**
 * Un dígito dibujado con una matriz de puntos de 5×7, como los formaba un
 * cabezal de 7 agujas.
 *
 * Los puntos apagados se dibujan igual, apenas visibles: así se ve la grilla de
 * agujas y no solo el número. Es la diferencia entre "un número con estilo
 * retro" y "un número impreso por esta máquina".
 */

const GLYPHS: Record<string, string[]> = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
};

export function DotDigit({
  value,
  dotSize,
  className,
  faint = false,
}: {
  /** Un solo carácter, 0–9. */
  value: string;
  /** Lado de cada punto, en px. */
  dotSize: number;
  className?: string;
  /** Tinta gastada, para el segundo y el tercer puesto. */
  faint?: boolean;
}) {
  const glyph = GLYPHS[value];
  if (!glyph) return null;

  const gap = Math.max(1, Math.round(dotSize / 5));

  return (
    <span
      aria-hidden
      className={clsx("inline-grid shrink-0", className)}
      style={{
        gridTemplateColumns: `repeat(5, ${dotSize}px)`,
        gridTemplateRows: `repeat(7, ${dotSize}px)`,
        gap: `${gap}px`,
      }}
    >
      {glyph.flatMap((row, y) =>
        [...row].map((cell, x) => (
          <span
            key={`${x}-${y}`}
            className={
              cell === "1"
                ? faint
                  ? "bg-carbon"
                  : "bg-tinta"
                : // El punto apagado: la aguja que no golpeó.
                  "bg-carbon/12"
            }
            style={{ borderRadius: Math.max(1, Math.round(dotSize / 6)) }}
          />
        )),
      )}
    </span>
  );
}

/** Un número entero completo, dígito por dígito. */
export function DotNumber({
  value,
  dotSize,
  faint = false,
}: {
  value: number;
  dotSize: number;
  faint?: boolean;
}) {
  return (
    <span
      aria-hidden
      className="inline-flex items-start"
      style={{ gap: `${dotSize}px` }}
    >
      {[...String(value)].map((digit, index) => (
        <DotDigit
          key={index}
          value={digit}
          dotSize={dotSize}
          faint={faint}
        />
      ))}
    </span>
  );
}
