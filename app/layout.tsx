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

export const metadata: Metadata = {
  title: "Quiz — Impresoras de matriz de punto",
  description:
    "Juego de preguntas y respuestas sobre impresoras de matriz de punto (Sistemas de Computación).",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  // Un solo tema: el papel no tiene modo oscuro.
  themeColor: "#f2f1ea",
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
