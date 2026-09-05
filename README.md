# Quiz — Impresoras de matriz de punto

Juego de preguntas y respuestas para el aula, sobre impresoras de matriz de punto
(**Sistemas de Computación**). Los estudiantes entran desde el celular con un apodo,
responden 12 preguntas con tiempo límite y al final se proyecta el ranking.

Pensado para usarse **un solo día**, con ~30 celulares y datos móviles posiblemente
malos. Todo lo demás es consecuencia de eso.

- **Documentación técnica y decisiones:** [`CLAUDE.md`](CLAUDE.md)
- **Identidad visual:** [`DESIGN.md`](DESIGN.md)

---

## Checklist del día de la exposición

Lo único que hay que seguir con la clase adelante. Del panel: **`/admin`**.

| # | Paso | Dónde |
| --- | --- | --- |
| 1 | Entrar al panel con la contraseña | `/admin/login` |
| 2 | Verificar que dice **12 preguntas · 12 activas** | `/admin/preguntas` |
| 3 | **Abrir sala** | `/admin` |
| 4 | **Proyectar el QR** y leer la URL en voz alta | `/admin`, abajo de todo |
| 5 | Esperar a que el contador **JUGADORES** llegue a los que haya en el aula | `/admin` |
| 6 | Elegir los minutos (**15** anda bien para 12 preguntas) y tocar **Iniciar** | `/admin` |
| 7 | Mientras juegan, mirar los contadores en vivo y los aciertos por pregunta | `/admin` |
| 8 | Cuando terminaron todos (o se acabó el tiempo), **Cerrar partida** | `/admin` |
| 9 | Abrir **Ranking en modo proyector** y proyectarlo | `/ranking?tv=1` |

### Cosas que conviene saber antes

- **El QR se arma con la URL que tengas en la barra de direcciones.** Abrí el panel
  en la URL pública de Vercel, no en `localhost`, o el QR no le va a servir a nadie.
- **No hace falta esperar a nadie para iniciar.** El que llega tarde entra igual: al
  poner su apodo cae directo en la primera pregunta.
- **Si alguien recarga o se queda sin batería, no pierde nada.** Vuelve a entrar con
  el mismo apodo y retoma donde estaba, con su puntaje.
- **Cada uno avanza a su ritmo**, no hay preguntas sincronizadas. El cronómetro que
  manda es el de cada pregunta, más el cierre general de la partida.
- **"Los jugadores ven el ranking durante la partida"** (la casilla del panel) está
  en verdadero. Si preferís que sea sorpresa, destildala antes de iniciar: con la
  partida cerrada el ranking se ve igual.
- **Reiniciar todo** borra jugadores y respuestas, pero **nunca las preguntas**. Está
  ahí por si querés hacer un ensayo y arrancar limpio.

---

## Correr en local

Requiere **Node 20 o superior** (probado en 24).

```bash
npm install
npm run dev          # http://localhost:3000
```

### Probarlo desde el celular en la misma red

`next dev` escucha en todas las interfaces, así que alcanza con la IP de la máquina:

```bash
# Windows
ipconfig                     # buscá la IPv4, ej. 192.168.100.16
# macOS / Linux
ipconfig getifaddr en0
```

Después, desde el celular (conectado al **mismo WiFi**): `http://192.168.100.16:3000`.

Abrí el panel en `http://192.168.100.16:3000/admin`, **no** en `localhost`, para que el
QR apunte a una dirección que el celular pueda resolver. En Windows, la primera vez
Defender puede pedir permiso para que Node acepte conexiones entrantes: hay que darle.

### Comandos

```bash
npm run dev            # desarrollo (Turbopack)
npm run build          # build de producción (webpack, el estable)
npm run start          # servir el build
npm run lint           # ESLint
npm test               # tests unitarios (vitest, una pasada)
npm run test:watch     # vitest en watch

npm run seed           # recarga las 12 preguntas del TP (borra las que haya)
npm run check:bundle   # busca secretos en .next/static — correr después de build
```

---

## Variables de entorno

Copiá [`.env.example`](.env.example) a `.env.local` y completá los tres valores.
`.env.local` está en `.gitignore` y no se commitea nunca.

| Variable | Ámbito | De dónde sale |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | público | Supabase → Project Settings → Data API → **Project URL** |
| `SUPABASE_SECRET_KEY` | **solo servidor** | Supabase → Project Settings → API Keys → **Secret key** (`sb_secret_…`) |
| `ADMIN_PASSWORD` | **solo servidor** | la inventás vos; es la del panel |

Tres reglas que no se negocian:

- **`SUPABASE_SECRET_KEY` ignora RLS**: quien la tenga puede leer y escribir todo,
  incluidas las respuestas correctas. Solo se lee desde código de servidor
  (`lib/supabase.ts`, que importa `server-only`: si un componente cliente lo importa,
  el build falla).
- **Ninguna variable secreta lleva el prefijo `NEXT_PUBLIC_`.** Next inyecta al bundle
  del navegador únicamente las que lo tienen. `npm run check:bundle` lo verifica.
- **Sin `ADMIN_PASSWORD` el panel no abre**, ni con la contraseña correcta. Es
  preferible un panel inaccesible a uno abierto.

---

## Preparar la base en Supabase

Se hace una sola vez, a mano.

1. Crear un proyecto en [supabase.com](https://supabase.com) (el plan gratis alcanza
   de sobra: son 30 personas durante una hora).
2. En el panel de Supabase, ir a **SQL Editor** → **New query**.
3. Pegar **todo** el contenido de [`supabase/schema.sql`](supabase/schema.sql) y darle
   **Run**. El script es idempotente: se puede correr de nuevo sin romper nada.
4. Verificar que quedaron las 4 tablas (`questions`, `players`, `answers`,
   `game_state`) en **Table Editor**, y que `game_state` tiene una fila con `id = 1`.

> El script **activa RLS sin ninguna política** en las cuatro tablas. Es a propósito:
> así los roles `anon` y `authenticated` de PostgREST quedan con cero acceso. Sin eso,
> cualquiera con la clave pública podría leer `questions` — o sea, las respuestas
> correctas — antes de jugar. El acceso de la app va todo por el servidor con la
> secret key, que ignora RLS.
>
> Arriba de todo del archivo hay un bloque **RESET** comentado, por si querés empezar
> de cero. Borra las tablas enteras: no lo corras con las preguntas ya cargadas.

### Cargar las preguntas

```bash
npm run seed
```

Deja las 12 preguntas del TP con `order_index` 1..12. Antes de tocar la base valida
las 12 con el mismo schema que usa el panel de admin, así que si alguna está mal
armada no escribe nada. Y se niega a correr con la partida en curso.

Ojo: **borra las preguntas que hubiera**, y con ellas las respuestas ya dadas (por el
`on delete cascade` del FK). Los jugadores quedan.

Después se pueden editar desde `/admin/preguntas` sin volver a tocar el script.

---

## Deploy en Vercel

### 1. Subir el repo a GitHub

```bash
git push -u origin main
```

### 2. Importar en Vercel

1. Entrar a [vercel.com/new](https://vercel.com/new) con la cuenta de GitHub.
2. Buscar el repo **`tp-sistemas`** y darle **Import**. Si no aparece, hay que darle
   permiso a Vercel sobre el repo desde *Adjust GitHub App Permissions*.
3. Vercel detecta Next.js solo. **No cambies nada** de Framework Preset, Build Command
   ni Output Directory.

### 3. Cargar las tres variables de entorno

Antes de darle **Deploy**, abrí **Environment Variables** y cargá las tres, una por
una, con el mismo nombre y valor que tenés en `.env.local`:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_SECRET_KEY` | `sb_secret_…` |
| `ADMIN_PASSWORD` | la que elijas |

Dejá los tres entornos tildados (Production, Preview, Development). **No** hay que
marcar nada como "Sensitive" para que funcione, pero si lo hacés, mejor.

Si te olvidás de alguna, el deploy igual va a andar pero la app va a devolver 503 con
un mensaje claro; se agregan después en **Settings → Environment Variables** y hay que
**redeployar** para que las tome.

### 4. Deploy

Darle **Deploy** y esperar. Al terminar, Vercel da una URL tipo
`https://tp-sistemas.vercel.app`.

### 5. Verificar antes de la clase

1. Abrir la URL: tiene que aparecer la pantalla de ingreso.
2. Entrar a `/admin/login` con `ADMIN_PASSWORD`.
3. Confirmar en `/admin/preguntas` que están las 12.
4. Pegar el link en un chat de WhatsApp y ver que la vista previa muestre la imagen
   del papel continuo.

---

## Cómo está armado

| | |
| --- | --- |
| **Framework** | Next.js 15 (App Router) + React 19 + TypeScript |
| **Estilos** | Tailwind CSS v4 (tokens vía `@theme` en `app/globals.css`) |
| **Base** | Supabase (PostgreSQL), todo el acceso desde el servidor |
| **Validación** | zod, en el borde de cada Route Handler |
| **Tests** | vitest |

Tres reglas de arquitectura, explicadas en `CLAUDE.md`:

- **La corrección y el puntaje se calculan siempre en el servidor.** El cliente manda
  su respuesta y nada más: nunca manda puntaje, y nunca recibe el campo `answer` antes
  de responder.
- **Las mutaciones van por Route Handlers en `/app/api`.** No se escribe a Supabase
  desde el navegador.
- **Nada se rompe con conexión mala.** Todo fetch del cliente tiene timeout y
  reintentos (`lib/fetchJson.ts`), las respuestas que no se pueden enviar quedan en
  cola y se reintentan solas, y un pedido que falla nunca cambia de pantalla ni borra
  el último estado conocido.

---

## Créditos

Tipografía **IBM Plex Sans** e **IBM Plex Mono**, de IBM, bajo
[SIL Open Font License 1.1](https://github.com/IBM/plex/blob/master/LICENSE.txt). El
archivo en `assets/` se usa solo para generar la imagen de vista previa del link
durante el build.
