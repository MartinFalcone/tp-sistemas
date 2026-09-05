import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

/*
 * Mono = lo que imprime la maquina (cronometro, puntajes, letras, ranking).
 * Sans = lo que lee la persona (enunciados y opciones).
 * Misma superfamilia, para que el par se lea intencional. Ver DESIGN.md.
 */

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

/*
 * De dónde sale la URL absoluta que necesitan las etiquetas de OpenGraph.
 *
 * En Vercel sale sola de VERCEL_PROJECT_PRODUCTION_URL, así que no hay que
 * cargar nada a mano para que el link se vea bien en WhatsApp. Se puede pisar
 * con NEXT_PUBLIC_SITE_URL si algun dia hay dominio propio.
 */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

const TITULO = "Quiz — Impresoras de matriz de punto";
const DESCRIPCION =
  "Entrá con un apodo y respondé 12 preguntas sobre impresoras de matriz de punto. Sistemas de Computación.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: TITULO,
    // Cada pantalla pone lo suyo y esto le agrega el contexto.
    template: "%s — Impresoras de matriz de punto",
  },
  description: DESCRIPCION,
  applicationName: "Quiz de matriz de punto",
  // Es una actividad de una clase, no una página que valga la pena indexar.
  robots: { index: false, follow: false },
  // Agregado a la pantalla de inicio en iOS: barra de estado integrada al papel.
  appleWebApp: {
    capable: true,
    title: "Quiz matriz de punto",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false, date: false, address: false, email: false },
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "Sistemas de Computación",
    title: TITULO,
    description: DESCRIPCION,
    // La imagen la genera app/opengraph-image.tsx; Next la enlaza solo.
  },
  twitter: { card: "summary_large_image", title: TITULO, description: DESCRIPCION },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Un solo tema: el papel no tiene modo oscuro.
  themeColor: "#f2f1ea",
  /*
   * NO va `maximumScale: 1`.
   *
   * Estaba desde el primer día para evitar el zoom automático que hace iOS
   * Safari al enfocar un campo. Pero eso ya lo resuelve, y mejor, la regla de
   * `font-size: max(16px, 1rem)` sobre inputs en globals.css: iOS solo hace
   * zoom si el campo mide menos de 16px.
   *
   * Con el problema resuelto por otro lado, bloquear la escala solo dejaba
   * afuera a quien necesita agrandar la pantalla para leer — y Lighthouse lo
   * marcaba como falla de accesibilidad. En un aula, con proyector y reflejo,
   * poder hacer pinch para agrandar una pregunta es una función, no un lujo.
   */
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body
        className={`${plexSans.variable} ${plexMono.variable} min-h-dvh overflow-x-hidden overscroll-y-none antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
