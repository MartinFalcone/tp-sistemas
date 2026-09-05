/**
 * Busca secretos en lo que se le sirve al navegador.
 *
 *   npm run build && npx tsx scripts/check-bundle.ts
 *
 * `.next/static` es literalmente lo que baja un celular: si un secreto está
 * ahí, está publicado. Next solo inyecta al bundle del cliente las variables
 * `NEXT_PUBLIC_*`, así que esto no debería fallar nunca — pero es una garantía
 * que cuesta dos segundos y cubre el día que alguien renombre una variable a
 * `NEXT_PUBLIC_` sin pensarlo.
 *
 * Distingue dos cosas que no son lo mismo:
 *
 *  - **El valor** de un secreto en el bundle: eso es una filtración y corta.
 *  - **El nombre** de la variable: puede aparecer legítimamente en un mensaje
 *    de error ("falta ADMIN_PASSWORD en el entorno"). Se avisa, no se corta.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const STATIC_DIR = resolve(process.cwd(), ".next/static");

/** Las variables que NUNCA pueden salir del servidor. */
const SECRETOS = ["SUPABASE_SECRET_KEY", "ADMIN_PASSWORD"] as const;

function cargarEnv(): Record<string, string> {
  const env: Record<string, string> = { ...process.env } as Record<string, string>;
  try {
    for (const linea of readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split(
      /\r?\n/,
    )) {
      const limpia = linea.trim();
      if (!limpia || limpia.startsWith("#") || !limpia.includes("=")) continue;
      const eq = limpia.indexOf("=");
      const clave = limpia.slice(0, eq).trim();
      // Lo que ya esté en el entorno gana, igual que en el seed.
      if (!env[clave]) {
        env[clave] = limpia.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // Sin .env.local se sigue con lo que haya en el entorno.
  }
  return env;
}

function listar(dir: string): string[] {
  const salida: string[] = [];
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) salida.push(...listar(ruta));
    else salida.push(ruta);
  }
  return salida;
}

function main() {
  let existe = true;
  try {
    statSync(STATIC_DIR);
  } catch {
    existe = false;
  }
  if (!existe) {
    console.error("\nNo hay .next/static. Corré `npm run build` primero.\n");
    process.exit(1);
  }

  const env = cargarEnv();

  // Un secreto vacío haría que el escaneo pase sin haber probado nada.
  const objetivos: { nombre: string; valor: string }[] = [];
  for (const nombre of SECRETOS) {
    const valor = env[nombre];
    if (!valor || valor.length < 4) {
      console.error(
        `\n${nombre} no está cargada (o es demasiado corta). El escaneo no probaría nada: abortado.\n`,
      );
      process.exit(1);
    }
    objetivos.push({ nombre, valor });
  }

  const archivos = listar(STATIC_DIR);
  console.log(`Archivos que se le sirven al navegador: ${archivos.length}\n`);

  let filtraciones = 0;
  let avisos = 0;

  for (const { nombre, valor } of objetivos) {
    const conValor = archivos.filter((f) => readFileSync(f).includes(valor));
    if (conValor.length > 0) {
      filtraciones++;
      console.log(`  FILTRADO  el VALOR de ${nombre} está en:`);
      for (const f of conValor) console.log(`            ${f}`);
    } else {
      console.log(`  OK        el valor de ${nombre} no aparece en ningún archivo`);
    }

    const conNombre = archivos.filter((f) =>
      readFileSync(f, "utf8").includes(nombre),
    );
    if (conNombre.length > 0) {
      avisos++;
      console.log(
        `  AVISO     el NOMBRE ${nombre} aparece en ${conNombre.length} archivo(s) — ` +
          `revisá que sea solo texto de un mensaje de error`,
      );
    }
  }

  console.log(
    filtraciones === 0
      ? `\nSIN SECRETOS EN EL BUNDLE DEL CLIENTE${avisos > 0 ? " (con avisos)" : ""}`
      : `\n${filtraciones} SECRETO(S) FILTRADO(S) — NO DEPLOYAR`,
  );
  process.exit(filtraciones === 0 ? 0 : 1);
}

main();
