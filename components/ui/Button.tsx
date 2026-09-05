import clsx from "clsx";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "solid" | "outline" | "quiet";
  full?: boolean;
};

/**
 * Botón. El texto es chrome de máquina, así que va en mono y en mayúsculas.
 *
 * `min-h-11` son los 44px de área táctil mínima. El foco lo pinta la regla
 * global `:focus-visible` de globals.css, en rojo de cinta.
 */
export function Button({
  variant = "solid",
  full = false,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        "inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2.5",
        "rounded-hoja font-mono text-sm font-semibold tracking-[0.14em] uppercase",
        // El golpe de una tecla: baja 1px, sin sombras ni escalas.
        "transition-transform active:translate-y-px",
        "disabled:pointer-events-none disabled:opacity-45",
        full && "w-full",
        variant === "solid" && "bg-tinta text-papel",
        variant === "outline" && "border border-tinta bg-transparent text-tinta",
        variant === "quiet" &&
          "min-h-11 px-2 font-normal tracking-normal text-carbon normal-case underline underline-offset-4",
        className,
      )}
      {...props}
    />
  );
}
