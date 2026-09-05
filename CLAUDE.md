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
- El cliente de Supabase con clave secreta vive en `lib/supabase.ts`, que importa
  `server-only`: si un componente cliente lo importa, el build falla (verificado).
- El panel de admin se protege con `ADMIN_PASSWORD` (solo servidor).
- **La corrección y el puntaje se calculan SIEMPRE en el servidor.** El cliente manda
  su respuesta y nada más: nunca manda puntaje, y nunca recibe `answer` antes de
  responder. Todo endpoint que devuelva preguntas a un jugador pasa por
  `toPublicQuestion()`, que borra el campo `answer`.
- **La identidad visual está en `DESIGN.md` y no se improvisa.** Antes de escribir una
  pantalla nueva, leerlo. Resumen operativo:
  - Tokens: `papel`, `banda`, `tinta`, `cinta`, `carbon`, `filete`. No hay otros colores.
  - `font-mono` (IBM Plex Mono) para lo que imprime la máquina: cronómetro, puntajes,
    letras de opción, ranking, etiquetas. `font-sans` (IBM Plex Sans) para lo que lee la
    persona: enunciados y opciones.
  - Nada de sombras, gradientes ni radios grandes: radio máximo `rounded-hoja` (2px).
  - Un solo tema. No hay modo oscuro.
  - Todo estado se distingue **sin depender del color**: forma + textura además del color.
  - Componentes base en `components/ui/`. Toda pantalla se envuelve en `<Paper>`.
  - Las opciones se identifican por **forma** (▲ ◆ ● ■ ▬ ✚), no por letra ni por color:
    se distinguen con daltonismo y el expositor puede decir "la del rombo" en voz alta.
    El nombre de la forma va en el `aria-label`.
- Mobile-first: escribir los estilos para pantalla chica y recién ahí agregar `sm:`/`md:`.
- Inputs con `font-size` ≥ 16px para que iOS no haga zoom automático (ya forzado en
  `app/globals.css`).
- Textos de UI en **español**.

## Capa de datos

### Base (`supabase/schema.sql`)

Se pega y se ejecuta a mano en el SQL Editor de Supabase. Es idempotente y trae un
bloque RESET comentado arriba de todo.

| Tabla | Para qué |
| --- | --- |
| `questions` | preguntas: `type`, `payload`, `answer` (jsonb), `points`, `time_limit` |
| `players` | jugadores: `nickname` + `nickname_key` único (normalizado) |
| `answers` | una respuesta por jugador y pregunta (`unique (player_id, question_id)`) |
| `game_state` | una sola fila con `id = 1`: `status`, `started_at`, `ends_at`, `reveal_ranking` |

No usamos RLS con políticas ni auth de Supabase: todo el acceso es server-side con la
secret key, que ignora RLS. Pero el script **activa RLS sin ninguna política** en las
cuatro tablas, para que los roles `anon` y `authenticated` de PostgREST queden con cero
acceso. Sin eso, cualquiera con la anon key podría leer `questions` — o sea, las
respuestas correctas — antes de jugar.

### Módulos

| Archivo | Qué expone |
| --- | --- |
| `lib/types.ts` | discriminated union sobre `type` + schemas de zod, `PublicQuestion`, `toPublicQuestion()`, tipos `Database` para supabase-js |
| `lib/supabase.ts` | **server-only**: `getSupabaseAdmin()` (lazy, memoizado) y `getAdminPassword()` |
| `lib/scoring.ts` | `grade(question, response)` y `computeScore({...})`, puras |
| `lib/normalize.ts` | `normalizeAnswerText()`, `normalizeNickname()`, `levenshtein()` |
| `lib/profanity.ts` | `containsProfanity()` — lista corta, dos niveles |
| `lib/player.ts` | jugador en `localStorage` (cliente) |
| `lib/useGameState.ts` | polling de `/api/state` (cliente) |

Por tipo de pregunta, `payload` es lo que ve el jugador, `answer` la respuesta correcta
(solo servidor) y `response` lo que manda el jugador:

| Tipo | `payload` | `answer` | `response` |
| --- | --- | --- | --- |
| `single` | `{ choices: [{id,text}] }` | `{ choiceId }` | `{ choiceId }` |
| `multiple` | `{ choices: [{id,text}] }` | `{ choiceIds: [] }` | `{ choiceIds: [] }` |
| `truefalse` | `{}` | `{ value: boolean }` | `{ value: boolean }` |
| `order` | `{ items: [{id,text}] }` | `{ order: [id,...] }` | `{ order: [id,...] }` |
| `match` | `{ left: [...], right: [...] }` | `{ pairs: {leftId: rightId} }` | `{ pairs: {...} }` |
| `slider` | `{ min, max, step, unit }` | `{ value, tolerance }` | `{ value }` |
| `text` | `{ placeholder }` | `{ accepted: [string,...] }` | `{ text }` |

### Rutas

| Ruta | Qué es |
| --- | --- |
| `/` | ingreso con apodo (`components/JoinScreen.tsx`) |
| `/jugar` | despacha según `game_state.status` (`components/GameGate.tsx`) |
| `POST /api/join` | `{ nickname }` → `{ playerId, nickname }` |
| `GET /api/state` | `{ status, endsAt, revealRanking, playerCount }` |

`/api/join` es **idempotente por apodo**: si el `nickname_key` ya existe devuelve
ese mismo jugador en vez de fallar. Alguien que recarga, se queda sin batería o
cambia de red vuelve a su misma partida con su puntaje. Si dos personas mandan el
mismo apodo a la vez, el segundo insert choca con el índice único (`23505`) y se
resuelve releyendo la fila.

El jugador se guarda en `localStorage` bajo `quiz.player` (`lib/player.ts`), con
todos los accesos en try/catch: en incógnito o con cookies bloqueadas
`localStorage` tira excepción y eso no puede tumbar la pantalla.

### Reglas del cliente con conexión mala

Esto no es opcional: la clase corre con datos móviles.

- `useGameState()` (`lib/useGameState.ts`) consulta `/api/state` cada 2 s. Un
  fetch que falla **no** cambia de pantalla ni borra el último estado conocido:
  solo baja `connected`, y el próximo ciclo reintenta. Sin backoff, sin modales.
- Un flag `inFlight` evita que se acumulen pedidos cuando una request tarda más
  que el intervalo.
- `<ConnectionBadge>` es el único aviso: un pill chico que dice "Sin conexión,
  reintentando". No bloquea nada.
- Toda pantalla que dependa de `localStorage` renderiza un estado de carga hasta
  que corre el efecto — leerlo durante el render del servidor rompe la
  hidratación, y dejar el markup vacío deja la pantalla en blanco mientras baja
  el JS.
- **Todos los mensajes de error dicen qué pasó y qué hacer**, y están en español.
  Ningún error de zod en inglés puede llegar a la pantalla: `nicknameSchema` trae
  su propio mensaje incluso para "no es un string".

### Reglas de corrección (`grade`)

Devuelve `{ isCorrect, ratio }`, con `isCorrect === (ratio === 1)`. Una respuesta mal
formada es incorrecta, nunca una excepción: `grade()` valida `response` con zod adentro.

- **single / truefalse**: acierto o error.
- **multiple**: `(aciertos − falsos positivos) / cantidad de correctas`, mínimo 0.
  Los ids repetidos se deduplican para que no inflen el puntaje.
- **order**: ítems en la posición correcta, dividido por el más largo entre la respuesta
  y la esperada (mandar ítems de más diluye el ratio en vez de regalar un 100%).
- **match**: proporción de pares correctos sobre los pares esperados.
- **slider**: 1 si `|valor − correcto| <= tolerancia`; después decae lineal hasta 0 al
  doble de la tolerancia. Con `tolerance: 0` exige el valor exacto.
- **text**: se normaliza (minúsculas, sin acentos, sin puntuación, espacios colapsados)
  y se compara contra `accepted`. Además tolera typos por distancia de Levenshtein, con
  un margen que **escala con el largo** de la respuesta esperada: 0 ediciones hasta 3
  caracteres, 1 hasta 6, 2 de ahí en adelante. Un tope fijo de 2 daría por buena `"12"`
  cuando la correcta es `"10"`.

Puntaje (`computeScore`), estilo Kahoot — mitad acierto, mitad velocidad:

```
score = round(points * ratio * (0.5 + 0.5 * max(0, 1 - elapsedMs / timeLimitMs)))
```

`ratio = 0` da 0 puntos por rápido que se haya respondido.

## Variables de entorno

Ver `.env.example`. `.env.local` está en `.gitignore`; `.env.example` sí se commitea.

| Variable | Ámbito | Uso |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | público | URL del proyecto Supabase |
| `SUPABASE_SECRET_KEY` | **solo servidor** | acceso a la base desde Route Handlers |
| `ADMIN_PASSWORD` | **solo servidor** | login del panel de admin |

## Comandos

```bash
npm run dev         # desarrollo (Turbopack)
npm run build       # build de producción
npm run start       # servir el build
npm run lint        # ESLint
npm test            # tests unitarios (vitest, una pasada)
npm run test:watch  # vitest en watch
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

### Paso 2 — Base de datos y capa de datos ✅

- `supabase/schema.sql` con las 4 tablas, índices, trigger de `updated_at`, la fila
  inicial de `game_state` y RLS activado sin políticas. **Falta ejecutarlo a mano en el
  SQL Editor de Supabase.**
- `lib/types.ts`: discriminated union sobre `type` con schemas de zod para los 7 tipos
  de pregunta, `PublicQuestion` + `toPublicQuestion()`, y el tipo `Database` para tener
  queries de supabase-js tipadas.
- `lib/supabase.ts`: `getSupabaseAdmin()` con `server-only`, lazy y memoizado, con error
  claro si faltan las env vars.
- `lib/scoring.ts`: `grade()` y `computeScore()`, puras y sin I/O.
- `lib/normalize.ts`: normalización de texto y apodos + Levenshtein.
- `lib/scoring.test.ts`: 58 tests con vitest, incluyendo casos borde (división por cero,
  ids repetidos, respuestas basura, tolerancia 0, typos en respuestas cortas).
- Se subió `@types/node` de v20 a v24 porque vitest 5 lo pide como peer.

### Paso 3 — Ingreso de los estudiantes ✅

- `POST /api/join` y `GET /api/state` (ambos `force-dynamic`, sin caché).
- `/` con el formulario de apodo, detección de jugador guardado ("Seguís como X"
  + Continuar + Cambiar de nombre) y redirección a `/jugar`.
- `/jugar` con polling cada 2 s: `lobby` → sala de espera, `running` →
  placeholder del juego, `finished` → redirige a `/ranking`.
- `lib/profanity.ts` con filtro de apodos en dos niveles.
- Animación temática: `components/DotMatrixPrinter.tsx`, papel continuo con banda
  perforada y un cabezal que imprime el texto carácter por carácter. El cabezal
  se posiciona en unidades `ch`, que en monoespaciada es exactamente un carácter.
- Tokens de color en `app/globals.css` (`surface`, `border`, `muted`, `accent`,
  `danger`, `paper`) para light y dark, más un bloque global de
  `prefers-reduced-motion`.
- 75 tests en total (se sumaron los de apodo y filtro de insultos).

Probado contra el server de desarrollo: los 400 de validación, el body no-JSON,
el 503 de `/api/state` y el SSR de las dos pantallas. **Los caminos que tocan la
base (jugador existente, carrera por el mismo apodo, `playerCount`) todavía no se
probaron contra una base real** — falta ejecutar el schema y cargar las env vars.

### Paso 4 — Identidad visual ✅

Plan completo en `DESIGN.md` (concepto, paleta con contrastes medidos, tipografía,
wireframes, principios y autorrevisión).

- Concepto: **el papel continuo es la pantalla.** Canaleta de arrastre perforada, líneas
  de corte, papel pautado, cinta bicolor negro/rojo.
- Tokens y clases `.papel-*` en `app/globals.css`; IBM Plex Sans/Mono en `app/layout.tsx`.
- `components/ui/`: `Paper`, `Button`, `Card`, `Input`, `Timer`, `ProgressDots`, `OptionRow`.
- Un solo momento de movimiento: el cabezal barre la fila correcta al revelar el resultado
  (`OptionRow reveal`), 450ms. Respeta `prefers-reduced-motion`.
- Área táctil mínima de 44px (`min-h-11`) y `:focus-visible` global en rojo de cinta.
- Retrofit de todo el módulo anterior a la nueva identidad. El azul, las tarjetas
  redondeadas, el crema y el modo oscuro que venían del template ya no están.
- `/styleguide` para revisar en el celular.

### Paso 5 — Componentes de respuesta ✅

`components/questions/`, un componente por tipo, todos con la misma interfaz
`{ question, onSubmit, disabled }`. `question` es una `PublicQuestion` estrechada por
`type`, así que cada uno ve su `payload` sin un solo cast.

| Archivo | Qué hace |
| --- | --- |
| `QuestionRenderer` | el `switch` sobre `type`; si se agrega un tipo y falta acá, el build falla |
| `QuestionShell` | número, enunciado, `ProgressDots`, `Timer` y el slot |
| `QuestionStage` | arma shell + renderer + envío + resultado. No habla con la red |
| `QuestionResult` | la pantalla de resultado de 2,5 s |
| `ChoiceButton` | opción de 56px para `single` y `multiple` |
| `shared.ts` | la interfaz común y las formas de las opciones |

Decisiones que importan:

- **El cronómetro se calcula contra un `deadline` (timestamp), no descontando de un
  contador.** No acumula deriva, y si el celular suspende la pantalla, al volver muestra
  el tiempo real. En la partida el `deadline` lo fija el servidor: el celular no decide
  cuánto tiempo tuvo.
- **Al llegar a 0 se envía `TIMEOUT_RESPONSE` (`{ timedOut: true }`).** No coincide con
  ningún schema de respuesta, así que `grade()` lo corrige como incorrecto en los siete
  tipos sin casos especiales, y queda guardado en `answers.response` para poder
  distinguir después "se le acabó el tiempo" de "respondió mal". Hay test.
- **`QuestionStage` garantiza una sola respuesta por pregunta:** el timeout y un toque
  pueden llegar casi juntos, y la base tiene `unique (player_id, question_id)`.
- **`order` usa flechas, no drag.** En un celular el drag pelea contra el scroll y contra
  el gesto de "atrás" del borde. Cada movimiento se anuncia en un `aria-live`.
- **`match` etiqueta los pares con formas, no con colores.** Seis colores distinguibles
  en un celular con reflejo no existen, y dejarían afuera a quien tenga daltonismo.
- **El `hint` de la pregunta se muestra solo al errar**, y ocupa más lugar que el puntaje:
  es una exposición académica, lo que importa es que entiendan el error.

### Pendiente

- [ ] Conectar el juego: endpoints de preguntas y de respuesta, y la pantalla que use
      `QuestionStage` (hoy `components/PlayScreen.tsx` es un placeholder).
- [ ] **Borrar `app/styleguide/` antes del deploy.**
- [ ] Ejecutar `supabase/schema.sql` en el proyecto de Supabase y cargar las env vars reales.
- [ ] `/ranking` — todavía no existe; `/jugar` ya redirige ahí cuando el estado es `finished`.
- [ ] Pantalla de juego con timer (reemplaza `components/PlayScreen.tsx`).
- [ ] Endpoints de preguntas y de respuesta (con `toPublicQuestion()`).
- [ ] Panel de admin (login, CRUD de preguntas, control de la partida).
