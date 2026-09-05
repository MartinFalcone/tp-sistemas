import clsx from "clsx";

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "id"> & {
  id: string;
  label: string;
  hint?: string;
  /** Mensaje de error. Si viene, el campo pasa a estado de error. */
  error?: string | null;
};

/**
 * Campo de texto de un formulario impreso.
 *
 * El valor va en mono: refuerza la grilla de caracteres y el cursor de bloque.
 * `text-base` explícito para los 16px que evitan el zoom automático de iOS —
 * las utilities de Tailwind le ganan a la regla de `globals.css`.
 *
 * El error no depende del color: además del rojo de cinta trae un `✗` y el
 * borde pasa a doble.
 */
export function Input({
  id,
  label,
  hint,
  error,
  className,
  ...props
}: InputProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block font-mono text-[0.6875rem] tracking-[0.14em] text-carbon uppercase"
      >
        {label}
      </label>

      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={clsx(
          "block w-full rounded-hoja bg-transparent px-3 py-2.5",
          "min-h-11 font-mono text-base text-tinta",
          "placeholder:text-carbon/60",
          // Cursor de bloque rojo, como el de una terminal. `caret-shape` es
          // progresivo: donde no está, queda la barra fina en rojo de cinta.
          "[caret-shape:block] caret-cinta",
          "disabled:opacity-45",
          error
            ? "border-2 border-cinta"
            : "border border-tinta focus:border-tinta",
          className,
        )}
        {...props}
      />

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="flex gap-1.5 text-sm text-cinta"
        >
          <span aria-hidden className="font-mono font-semibold">
            ✗
          </span>
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={hintId} className="text-sm text-carbon">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
