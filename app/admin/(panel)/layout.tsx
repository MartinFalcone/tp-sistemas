import { AdminShell } from "@/components/admin/AdminShell";

export const metadata = { title: "Panel — Impresoras de matriz de punto" };

/**
 * Envuelve solo el panel. `/admin/login` queda afuera del grupo, así no muestra
 * la navegación ni el botón de cerrar sesión a quien todavía no entró.
 */
export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
