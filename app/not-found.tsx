import Link from "next/link";

import { Paper, PaperHeader } from "@/components/ui/Paper";

export const metadata = { title: "No existe" };

/**
 * 404.
 *
 * El caso real no es alguien explorando la app: es alguien que tipeó la URL a
 * mano en el celular porque no le enganchó el QR, y se comió una letra. Por eso
 * el texto apunta a eso y el botón lleva al ingreso, que es a donde quería ir.
 *
 * Server Component: no necesita estado, y así no suma JS a una pantalla que en
 * el mejor de los casos nadie ve.
 */
export default function NotFound() {
  return (
    <Paper className="justify-center gap-6">
      <PaperHeader left="Error 404" right="Impresoras de matriz de punto" />

      <div className="space-y-3">
        <h1 className="font-mono text-2xl leading-tight font-semibold uppercase">
          Esta página no existe
        </h1>
        <p className="text-carbon">
          Puede que hayas tipeado mal la dirección. Volvé al ingreso y entrá con
          tu apodo, o escaneá otra vez el código QR que está proyectado.
        </p>
      </div>

      <Link
        href="/"
        className="inline-flex min-h-11 w-full items-center justify-center rounded-hoja bg-tinta px-4 py-2.5 font-mono text-sm font-semibold tracking-[0.14em] text-papel uppercase"
      >
        Ir al ingreso
      </Link>
    </Paper>
  );
}
