-- ============================================================================
-- Quiz "Impresoras de matriz de punto" — esquema completo
-- Pegar en el SQL Editor de Supabase y ejecutar.
--
-- Es idempotente: se puede correr varias veces sin romper nada ni perder datos.
-- Para empezar de cero, descomentar el bloque RESET de abajo.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- RESET (destructivo — borra todas las preguntas, jugadores y respuestas)
-- ---------------------------------------------------------------------------
-- drop table if exists public.answers    cascade;
-- drop table if exists public.questions  cascade;
-- drop table if exists public.players    cascade;
-- drop table if exists public.game_state cascade;

-- gen_random_uuid() es nativo desde Postgres 13, pero lo dejamos explícito.
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- questions
-- ---------------------------------------------------------------------------
create table if not exists public.questions (
  id          uuid primary key default gen_random_uuid(),
  order_index int  not null,
  type        text not null
              check (type in ('single','multiple','truefalse','order','match','slider','text')),
  prompt      text not null,
  hint        text,
  payload     jsonb not null,   -- opciones, ítems, rangos según el tipo
  answer      jsonb not null,   -- respuesta correcta según el tipo (NUNCA sale al cliente)
  points      int  not null default 1000,
  time_limit  int  not null default 25 check (time_limit > 0),  -- segundos
  is_active   boolean not null default true,
  created_at  timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- players
-- ---------------------------------------------------------------------------
create table if not exists public.players (
  id           uuid primary key default gen_random_uuid(),
  nickname     text not null,
  -- nickname normalizado (minúsculas, sin acentos, espacios colapsados).
  -- Lo calcula el servidor con normalizeNickname() de lib/normalize.ts.
  nickname_key text not null unique,
  created_at   timestamptz default now(),
  last_seen_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- answers
-- ---------------------------------------------------------------------------
create table if not exists public.answers (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references public.players(id)   on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  response    jsonb not null,
  is_correct  boolean not null,
  ratio       real not null default 0 check (ratio >= 0 and ratio <= 1),  -- crédito parcial
  score       int  not null default 0,
  elapsed_ms  int  not null default 0 check (elapsed_ms >= 0),
  created_at  timestamptz default now(),
  unique (player_id, question_id)   -- una sola respuesta por pregunta y jugador
);

-- ---------------------------------------------------------------------------
-- game_state — una sola fila, id = 1
-- ---------------------------------------------------------------------------
create table if not exists public.game_state (
  id             int primary key default 1 check (id = 1),
  status         text not null default 'lobby'
                 check (status in ('lobby','running','finished')),
  started_at     timestamptz,
  ends_at        timestamptz,
  -- si el ranking es visible para los jugadores mientras la partida corre
  reveal_ranking boolean not null default true,
  updated_at     timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------
create index if not exists answers_player_id_idx   on public.answers (player_id);
create index if not exists answers_question_id_idx on public.answers (question_id);
create index if not exists questions_order_idx     on public.questions (order_index);

-- ---------------------------------------------------------------------------
-- updated_at automático en game_state
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists game_state_set_updated_at on public.game_state;
create trigger game_state_set_updated_at
  before update on public.game_state
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Fila inicial de game_state
-- ---------------------------------------------------------------------------
insert into public.game_state (id) values (1)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Cerrojo de acceso
--
-- No usamos RLS con políticas ni auth de Supabase: todo el acceso es server-side
-- con la secret key, que ignora RLS por completo.
--
-- Pero las tablas de `public` quedan expuestas por PostgREST a los roles `anon` y
-- `authenticated`. Como el proyecto se despliega en una URL pública, activamos RLS
-- SIN NINGUNA POLÍTICA: eso deja a esos roles con cero acceso (ni lectura ni
-- escritura) y no afecta en nada a nuestro cliente admin.
--
-- Sin esto, cualquiera con la anon key podría leer la tabla `questions` — es decir,
-- las respuestas correctas — antes de jugar.
-- ---------------------------------------------------------------------------
alter table public.questions  enable row level security;
alter table public.players    enable row level security;
alter table public.answers    enable row level security;
alter table public.game_state enable row level security;
