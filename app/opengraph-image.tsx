import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

/**
 * La imagen que se ve cuando el link se pega en WhatsApp.
 *
 * Importa más de lo que parece: el link se comparte una sola vez, a treinta
 * personas, y la miniatura es lo único que van a ver antes de decidir si tocan.
 * Una vista previa vacía parece un link roto o spam.
 *
 * Es la misma hoja de papel continuo que el resto de la app: canaleta perforada
 * a la izquierda, líneas de corte, filete doble y la cinta bicolor. Ver
 * DESIGN.md.
 *
 * La tipografía va vendorizada en `assets/` en vez de bajarse de Google Fonts al
 * generar la imagen: una dependencia de red en tiempo de render es justo lo que
 * no queremos el día que esto tiene que funcionar.
 *
 * Esta ruta no tiene parámetros, así que Next la prerenderiza: el PNG se arma
 * una sola vez durante `next build` y después se sirve como archivo estático. El
 * `readFile` corre en la máquina que buildea, nunca en producción.
 */

export const alt =
  "Quiz sobre impresoras de matriz de punto — Sistemas de Computación";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAPEL = "#f2f1ea";
const BANDA = "#d9e4d4";
const TINTA = "#1b1a17";
const CINTA = "#b4321f";
const CARBON = "#625f55";
/** El mismo filete tenue del resto de la app, ya resuelto: Satori no hace color-mix. */
const FILETE = "rgba(98, 95, 85, 0.4)";

export default async function OpengraphImage() {
  const mono = await readFile(
    join(process.cwd(), "assets", "IBMPlexMono-SemiBold.ttf"),
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: PAPEL,
          color: TINTA,
          fontFamily: "Plex",
        }}
      >
        {/* Canaleta de arrastre: el signo más reconocible del papel continuo. */}
        <div
          style={{
            width: 74,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-around",
            borderRight: `1px solid ${FILETE}`,
            paddingTop: 18,
            paddingBottom: 18,
          }}
        >
          {Array.from({ length: 13 }, (_, i) => (
            <div
              key={i}
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                border: `2px solid ${FILETE}`,
              }}
            />
          ))}
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 68px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 25,
              letterSpacing: 6,
              color: CARBON,
            }}
          >
            <span>SISTEMAS DE COMPUTACION</span>
            <span>TP · 2026</span>
          </div>
          {/* El filete doble, apilado a mano: Satori no soporta border-style double. */}
          <div style={{ display: "flex", flexDirection: "column", marginTop: 16, marginBottom: 52 }}>
            <div style={{ height: 3, background: TINTA }} />
            <div style={{ height: 3, background: PAPEL }} />
            <div style={{ height: 3, background: TINTA }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", fontSize: 92, lineHeight: 1.03 }}>
            <span>IMPRESORAS DE</span>
            <span>MATRIZ DE PUNTO</span>
          </div>

          {/* La cinta bicolor: negro y rojo, en la proporción real del carrete. */}
          <div style={{ display: "flex", marginTop: 48, marginBottom: 40 }}>
            <div style={{ width: 250, height: 16, background: TINTA }} />
            <div style={{ width: 84, height: 16, background: CINTA }} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <div
              style={{
                display: "flex",
                background: BANDA,
                border: `2px solid ${TINTA}`,
                padding: "14px 26px",
                fontSize: 32,
              }}
            >
              12 PREGUNTAS
            </div>
            <span style={{ fontSize: 32, color: CARBON }}>
              Entrá con un apodo desde el celular
            </span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Plex", data: mono, style: "normal", weight: 600 }],
    },
  );
}
