import { Suspense } from "react";

import { LoginForm } from "@/components/admin/LoginForm";
import { Paper, PaperHeader } from "@/components/ui/Paper";

export const metadata = { title: "Panel · Acceso" };

export default function LoginPage() {
  return (
    // El formulario usa useSearchParams, asi que se renderiza recien en el
    // cliente. Sin fallback la pantalla quedaria en blanco mientras baja el JS.
    <Suspense
      fallback={
        <Paper className="justify-center gap-6">
          <PaperHeader left="Panel de admin" right="Acceso" />
          <p className="text-carbon">Cargando…</p>
        </Paper>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
