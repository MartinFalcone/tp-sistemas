# Quiz — Impresoras de matriz de punto

## Contexto

Aplicación web **mobile-first** para un juego de preguntas y respuestas que se usa
**una sola vez, en el aula**, después de una exposición sobre "Impresoras de matriz
de punto" en la materia **Sistemas de Computación**.

Condiciones reales de uso, que mandan sobre cualquier decisión de diseño:

- ~30 estudiantes entran desde su **celular** a una URL de Vercel.
- Entran **solo con un apodo**, sin contraseña ni registro.
- Responden entre **8 y 12 preguntas** con **tiempo límite**.
- Al terminar se muestra un **ranking** con los resultados.
- El expositor tiene un **panel de admin** para editar preguntas y controlar la partida.
- Se usa **un solo día**, con **conexión de datos móviles posiblemente mala**.

Consecuencias prácticas:

- Todo entra en una pantalla de celular; nada de scroll horizontal, targets grandes.
- Tolerar latencia y cortes: reintentos, estados de carga claros, nada que se rompa
  si una request tarda 5 segundos.
- No hace falta escalar ni persistir a largo plazo: una partida, un día.
- Simplicidad > completitud. No construir lo que no se va a usar ese día.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (config vía `@theme` en `app/globals.css`, sin `tailwind.config`)
- **Supabase** (`@supabase/supabase-js`) como base de datos
- **zod** para validación
- **clsx** para clases condicionales
- **framer-motion** para animaciones (timer, transición entre preguntas, ranking)
- **ESLint** (`eslint-config-next`)
- Deploy en **Vercel**
- Sin carpeta `src/`; alias de imports `@/*` → raíz del proyecto

## Convenciones

- **Server Components por defecto.** `"use client"` solo donde hace falta estado,
  efectos o eventos del navegador (timer, formularios interactivos).
- **Las mutaciones van por Route Handlers en `/app/api`.** Nada de escribir a Supabase
  desde el cliente.
- **Toda entrada se valida con zod** en el borde del servidor (body de los Route
  Handlers, params). Nunca confiar en el cliente.
- **`SUPABASE_SECRET_KEY` / service role nunca se expone al cliente.** Solo se lee en
  código de servidor. Ninguna variable secreta lleva el prefijo `NEXT_PUBLIC_`; lo
  único público es `NEXT_PUBLIC_SUPABASE_URL`.
- El cliente de Supabase con clave secreta vive en un módulo server-only
  (`lib/supabase/server.ts` cuando se cree) y no se importa desde componentes cliente.
- El panel de admin se protege con `ADMIN_PASSWORD` (solo servidor).
- Mobile-first: escribir los estilos para pantalla chica y recién ahí agregar `sm:`/`md:`.
- Inputs con `font-size` ≥ 16px para que iOS no haga zoom automático (ya forzado en
  `app/globals.css`).
- Textos de UI en **español**.

## Variables de entorno

Ver `.env.example`. `.env.local` está en `.gitignore`; `.env.example` sí se commitea.

| Variable | Ámbito | Uso |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | público | URL del proyecto Supabase |
| `SUPABASE_SECRET_KEY` | **solo servidor** | acceso a la base desde Route Handlers |
| `ADMIN_PASSWORD` | **solo servidor** | login del panel de admin |

## Comandos

```bash
npm run dev     # desarrollo (Turbopack)
npm run build   # build de producción
npm run start   # servir el build
npm run lint    # ESLint
```

Nota: `build` usa el bundler estable (webpack), no Turbopack, para no depender de un
bundler en beta en el único día que la app tiene que funcionar.

## Estado del proyecto

Esta sección se actualiza en **cada paso**.

### Paso 1 — Scaffolding ✅

- Proyecto Next.js 15.5 creado con App Router, TypeScript, Tailwind v4, ESLint,
  sin `src/`, alias `@/*`.
- Instaladas las dependencias: `@supabase/supabase-js`, `zod`, `clsx`, `framer-motion`.
- `.env.example` y `.env.local` (placeholders) creados; `.gitignore` ajustado para
  ignorar `.env*` pero **no** `.env.example`.
- Layout raíz configurado para mobile: `lang="es"`, viewport con `maximumScale: 1` y
  `viewport-fit=cover`, `themeColor` para light/dark, sin scroll horizontal, safe-area
  insets y `font-size` mínimo de 16px en inputs.
- Assets de ejemplo de create-next-app eliminados; `app/page.tsx` es un placeholder.
- Git inicializado con commit inicial.

### Pendiente

- [ ] Esquema de base en Supabase (partida, preguntas, jugadores, respuestas).
- [ ] Cliente de Supabase server-only + schemas de zod compartidos.
- [ ] Pantalla de ingreso con apodo.
- [ ] Pantalla de juego con timer.
- [ ] Ranking final.
- [ ] Panel de admin (login, CRUD de preguntas, control de la partida).
