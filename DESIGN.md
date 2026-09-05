# Dirección de arte — Impresoras de matriz de punto

## Concepto

**El papel continuo es la pantalla.** No una textura de fondo ni un adorno retro: la
interfaz *es* una tira de papel de listado saliendo de una LX-300, y cada cosa que
aparece está impresa sobre ella.

Descarté la alternativa obvia —terminal de fósforo verde sobre negro— por dos razones.
Una temática: el objeto del TP es una impresora, no un CRT; el papel es el output real.
Otra práctica, que pesa más: se ve en un aula con luz. Tinta oscura sobre papel claro
gana sobre fósforo brillante sobre negro, en cualquier celular y con cualquier reflejo.

De ahí sale todo: bandas alternadas de papel pautado, líneas de corte perforadas, grilla
de caracteres, cinta de dos colores, densidades de impresión.

---

## Paleta

Cinco colores. Los nombres son los del objeto, no `primary` / `secondary`.

| Token | Hex | Qué es | Dónde |
| --- | --- | --- | --- |
| `papel` | `#F2F1EA` | papel de listado, blanco frío desaturado | fondo de todo |
| `banda` | `#D9E4D4` | la banda verde del papel pautado | filas alternadas, respuesta correcta |
| `tinta` | `#1B1A17` | negro de cinta fresca, cálido, nunca `#000` | texto, bloques sólidos |
| `cinta` | `#B4321F` | el rojo de la cinta bicolor negro/rojo | cronómetro, error, foco |
| `carbon` | `#625F55` | cinta gastada | texto secundario, filetes, perforado |

**Contraste medido** (WCAG, calculado — no estimado):

| | sobre `papel` | sobre `banda` |
| --- | --- | --- |
| `tinta` | 15.37 AAA | 13.26 AAA |
| `cinta` | 5.43 AA | 4.68 AA |
| `carbon` | 5.64 AA | 4.87 AA |

`papel` sobre `tinta` (botón invertido): 15.37 AAA. `papel` sobre `cinta`: 5.43 AA.
Todo pasa AA para texto normal. Mi primer valor de `carbon` (`#6E6B60`) daba 4.07 sobre
`banda` y lo bajé a `#625F55` por eso.

**No hay verde de "correcto" ni rojo de "error" aparte.** Una cinta bicolor tiene negro y
rojo, y eso alcanza: el verde es el del papel pautado, y hace doble trabajo como relleno
de la fila correcta.

**No hay modo oscuro.** El papel no tiene modo oscuro. Un solo tema, comprometido.

---

## Tipografía

Dos familias de la misma superfamilia, así el par se lee intencional y no aleatorio.

- **IBM Plex Mono** — todo lo que *imprime la máquina*: cronómetro, puntajes, letras de
  opción, números del ranking, encabezado del listado, etiquetas, estados.
  Linaje de época (IBM), pero legible de verdad, a diferencia de VT323 o Silkscreen.
- **IBM Plex Sans** — todo lo que *lee la persona*: enunciados de las preguntas y textos
  de las opciones. Buena altura de x, aperturas abiertas, cómoda en párrafo.

La regla es lo que hace que esto no sea decoración: **mono = salida de máquina, sans =
contenido humano.** La tipografía dice quién habla. Un enunciado largo en monoespaciada
a 15px en un celular es más lento de leer y más ancho, y acá hay 20 segundos por pantalla.

Descarté una bitmap/pixel para display: a tamaño chico en un celular se rompe, y el
efecto "puntos" lo consigo mejor dibujando puntos de verdad (SVG/CSS) en el único momento
donde importa, sin pagar una tercera fuente en datos móviles.

Números siempre `tabular-nums`: el cronómetro no puede bailar al bajar de 10 a 9.

---

## Layout

Una tira vertical de papel:

- **Canaleta izquierda de 16px** con la perforación de arrastre, altura completa. Es el
  signo más reconocible del papel continuo y cuesta poco ancho. Solo a la izquierda:
  dos bandas en un celular de 360px se comen el contenido.
- **Líneas de corte** arriba y abajo del viewport: filete punteado con muescas.
- **Sin tarjetas.** Las listas son filas con bandas alternadas y filetes de 1px.
  Radio máximo 2px. Cero sombras, cero gradientes.
- **Todo sobre la grilla de caracteres**: márgenes, letras de opción y columnas se alinean
  en unidades `ch`. Alineado a la izquierda, borde derecho irregular, como un listado.

### Login

```
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
∘  SISTEMAS DE COMPUTACION  TP·2026
∘  ═════════════════════════════════
∘
∘  IMPRESORAS DE
∘  MATRIZ DE PUNTO
∘
∘  Entrá con un apodo. Sin contraseña.
∘
∘  APODO
∘  ┌───────────────────────────────┐
∘  │ Martín▌                       │
∘  └───────────────────────────────┘
∘  20 caracteres máx.
∘
∘  ┌───────────────────────────────┐
∘  │████████ E N T R A R ███████████│
∘  └───────────────────────────────┘
∘
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

El cursor del input es un bloque `▌` parpadeante, no una barra fina.

### Pregunta

```
∘  P03/10  ●●●○○○○○○○      ███████ 14
∘  ═════════════════════════════════
∘
∘  ¿Qué parte de la impresora golpea
∘  la cinta entintada?
∘
∘  ░A░  Las agujas del cabezal
∘  ─────────────────────────────────
∘  ▒B▒  El rodillo de arrastre
∘  ─────────────────────────────────
∘  ░C░  La banda perforada
∘  ─────────────────────────────────
∘  ▒D▒  El tractor de papel
```

Opciones = filas pautadas de borde a borde, no botones flotantes. La letra va en un
bloque mono a la izquierda, sobre la grilla. El cronómetro es una barra de bloques que se
vacía, más los dígitos: se lee sin leer.

### Resultado de pregunta

```
∘  P03/10                   RESULTADO
∘  ═════════════════════════════════
∘
∘  ■ A  Las agujas del cabezal
∘       ▓▓▓ CORRECTA ▓▓▓
∘  ─────────────────────────────────
∘  ✗ B  E̶l̶ r̶o̶d̶i̶l̶l̶o̶ d̶e̶ a̶r̶r̶a̶s̶t̶r̶e̶
∘       tu respuesta
∘  ─────────────────────────────────
∘  · C  La banda perforada
∘  · D  El tractor de papel
∘
∘  ═════════════════════════════════
∘  +0 PTS               TOTAL  1 240
```

Tres estados, tres **densidades de impresión** — la diferencia se ve en blanco y negro:

| Estado | Color | Forma | Textura |
| --- | --- | --- | --- |
| correcta | relleno `banda` | bloque sólido `■` | doble golpe (bold) |
| tu respuesta, incorrecta | `cinta` | `✗` | sobreimpresión (tachado) |
| sin elegir / sin responder | `carbon` | punto `·` | modo borrador (filete punteado) |

### Ranking

```
∘  LISTADO FINAL         30 JUGADORES
∘  ═════════════════════════════════
∘  ░ 01  MARTÍN F.      8/10    9 420
∘  ▒ 02  ANA            8/10    9 105
∘  ░ 03  LU             7/10    8 330
∘  ▒ 04  FEDE           7/10    7 990
∘  ░ 05  CAMI           6/10    7 410
∘  ═════════════════════════════════
∘  █ 12  VOS            6/10    6 210
```

Es literalmente un listado impreso: papel pautado, números tabulares, columnas alineadas.
Tu fila queda fijada abajo con banda sólida, para no buscarte entre 30.

---

## Cuatro principios

1. **El papel es la pantalla, no un fondo.** Bandas alternadas, líneas de corte y canaleta
   perforada. Nada flota en una tarjeta con sombra: todo está impreso sobre la hoja.
2. **Mono es la máquina, sans es la persona.** Cronómetro, puntajes, letras y ranking en
   Plex Mono. Enunciados y opciones en Plex Sans. La tipografía dice quién habla.
3. **Dos colores de cinta, tres densidades de impresión.** El estado nunca depende solo
   del color: bloque sólido + banda para correcto, tachado rojo para incorrecto, punteado
   tenue para sin responder. Se distingue en escala de grises.
4. **Todo cae en la grilla de caracteres.** Márgenes, columnas y letras de opción en
   unidades `ch`, alineado a la izquierda con borde derecho irregular. Nada se centra
   "a ojo": una impresora no centra, avanza de a un carácter.

---

## El único momento de movimiento

**El cabezal cruza la línea y deja impresa la respuesta.** Al terminar una pregunta, un
bloque sólido barre horizontalmente la fila correcta de izquierda a derecha, ~450ms, y a
su paso el texto pasa de borrador a doble golpe. Una vez por pregunta, nada más.

El resto de la interfaz no se mueve: sin fades de entrada, sin hover animado, sin
transiciones de página. Con `prefers-reduced-motion` el resultado aparece impreso directo,
sin barrido.

(La animación de la sala de espera ya construida —el cabezal imprimiendo carácter por
carácter— sobrevive: es la misma idea y está en una pantalla donde la gente espera.)

---

## Accesibilidad

- Área táctil mínima **44×44px** en todo lo tocable, incluidas las filas de opción.
- **Foco visible**: contorno de 2px en `cinta` con 2px de separación, más un marcador `▸`
  al inicio de la fila — la posición del cabezal. Nunca `outline: none`.
- Todo estado tiene forma + textura además de color.
- `prefers-reduced-motion` respetado.
- `tabular-nums` en todo número que cambie.

---

## Autorrevisión

El encargo pedía revisar el plan y sacar lo genérico. El problema es que **ya escribí
código genérico** en el módulo anterior, antes de que existiera esta guía. Lo que cambia:

| Era esto (módulo 2) | Pasa a ser | Por qué |
| --- | --- | --- |
| acento azul `#1d4ed8` | `cinta` `#B4321F` | no hay un solo azul en una impresora de matriz de punto. Era el default del template. |
| `--paper: #fbf8ef`, crema | `papel` `#F2F1EA`, blanco frío + `banda` verde | el crema es el atajo genérico de "vintage". El papel de listado real es frío y pautado. |
| `rounded-xl border bg-surface` con sombra | filas pautadas, filetes de 1px, radio ≤2px | las tarjetas redondeadas idénticas son *el* look de quiz genérico. |
| eyebrow "SISTEMAS DE COMPUTACIÓN" en mayúsculas con `tracking-widest` | línea de encabezado de trabajo, mono, alineada izquierda, entre filetes | mismo contenido, pero un listado real arranca con una cabecera de job, no con un eyebrow centrado de landing page. |
| Geist Sans / Geist Mono | IBM Plex Sans / IBM Plex Mono | Geist es la tipografía por defecto de `create-next-app`. Plex tiene linaje IBM y la superfamilia hace que el par mono+sans se lea deliberado. |
| verde de éxito / rojo de error separados | `banda` + bloque sólido / `cinta` + tachado | dos colores de cinta es la restricción real del objeto, y fuerza que la forma cargue el significado. |
| `@media (prefers-color-scheme: dark)` con paleta oscura | eliminado, tema único | un modo oscuro "por las dudas" es relleno de template. El papel no tiene modo oscuro. |
| animaciones de entrada `motion` en cada sección | un solo barrido de cabezal | movimiento en todo = movimiento en nada. |

Lo que **no** cambia: la banda perforada y el cabezal que imprime carácter por carácter de
`DotMatrixPrinter` ya estaban en esta dirección. Se quedan.

---

## Estado de la implementación — hecha

- Tokens en `app/globals.css` (`@theme inline`) y clases `.papel-*` para canaleta,
  líneas de corte, filete doble y trama.
- Fuentes cambiadas a IBM Plex Sans / Mono en `app/layout.tsx`. `themeColor` único.
- `components/ui/`: `Paper`, `Button`, `Card`, `Input`, `Timer`, `ProgressDots`, `OptionRow`.
- `/styleguide` — **borrar antes del deploy.**
- Retrofit hecho: `JoinScreen`, `WaitingRoom`, `ConnectionBadge`, `GameGate`,
  `PlayScreen`, `DotMatrixPrinter`.

### Dos ajustes sobre el plan original

1. **Las opciones no llevan bandas alternadas**, aunque el wireframe las dibujaba con
   `░`/`▒`. Colisionaban con el estado "correcta", que se marca justamente rellenando la
   fila con `banda`: sobre filas ya pautadas no se distinguía. Las bandas alternadas
   quedan solo en el ranking, que es un listado de verdad. Las opciones van con filete
   simple.
2. **Se agregaron dos componentes** a los cinco pedidos: `Paper` (la hoja con canaleta y
   líneas de corte, que necesita toda pantalla) y `OptionRow` (donde viven los tres
   estados y el barrido del cabezal — los estados necesitaban un componente donde vivir).
