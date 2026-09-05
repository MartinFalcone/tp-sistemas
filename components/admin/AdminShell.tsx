"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";

/**
 * Marco del panel.
 *
 * No usa `<Paper>`: esta pantalla la mira el expositor desde la notebook y
 * necesita ancho. Mantiene la paleta y las tipografías, pero con densidad de
 * herramienta, no de juego. Igual funciona en el celular, porque puede pasar que
 * haya que tocar algo desde el teléfono en el medio de la clase.
 */
const TABS = [
  { href: "/admin", label: "Partida" },
  { href: "/admin/preguntas", label: "Preguntas" },
  { href: "/admin/respuestas", label: "Respuestas" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 py-4">
      <header className="mb-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-mono text-[0.6875rem] tracking-[0.14em] text-carbon uppercase">
            Panel · Impresoras de matriz de punto
          </p>
          <button
            type="button"
            onClick={logout}
            className="min-h-11 font-mono text-[0.6875rem] tracking-[0.14em] text-carbon uppercase underline underline-offset-4"
          >
            Cerrar sesión
          </button>
        </div>

        <nav className="mt-2 flex gap-1 papel-doble-filete pt-2">
          {TABS.map((tab) => {
            const active =
              tab.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={clsx(
                  "min-h-11 border px-3 py-2 font-mono text-sm",
                  active
                    ? "border-tinta bg-tinta text-papel"
                    : "border-filete text-carbon",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {children}
    </div>
  );
}

/** Bloque de sección del panel. */
export function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6 papel-doble-filete pt-3">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-mono text-[0.6875rem] tracking-[0.14em] text-carbon uppercase">
          {title}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}
