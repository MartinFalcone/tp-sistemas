import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase";
import {
  questionInputSchema,
  questionSchema,
  type ApiError,
  type Question,
} from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/admin/questions — todas las preguntas, CON `answer`.
 *
 * Es el único endpoint que devuelve la respuesta correcta, y está detrás del
 * middleware de admin. El de los jugadores (`/api/questions`) nunca la manda.
 */
export async function GET() {
  try {
    const db = getSupabaseAdmin();
    const rows = await db
      .from("questions")
      .select("*")
      .order("order_index", { ascending: true });

    if (rows.error) throw rows.error;

    // Las mal formadas se devuelven igual, marcadas: si se ocultaran, el admin
    // no podría arreglar justamente la que está rota.
    const questions: (Question | { id: string; broken: true; raw: unknown })[] =
      rows.data.map((row) => {
        const parsed = questionSchema.safeParse(row);
        return parsed.success
          ? parsed.data
          : { id: row.id, broken: true as const, raw: row };
      });

    return NextResponse.json(
      { questions },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[GET /api/admin/questions]", error);
    return NextResponse.json<ApiError>(
      { error: "No se pudieron cargar las preguntas." },
      { status: 503 },
    );
  }
}

/** POST /api/admin/questions — crea una pregunta al final de la lista. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiError>(
      { error: "No se pudo leer el pedido." },
      { status: 400 },
    );
  }

  const parsed = questionInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiError>(
      { error: parsed.error.issues[0]?.message ?? "La pregunta no es válida." },
      { status: 400 },
    );
  }

  try {
    const db = getSupabaseAdmin();

    // Va al final: se busca el mayor order_index actual.
    const last = await db
      .from("questions")
      .select("order_index")
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last.error) throw last.error;

    const created = await db
      .from("questions")
      .insert({
        ...parsed.data,
        order_index: (last.data?.order_index ?? 0) + 1,
      })
      .select("*")
      .single();

    if (created.error) throw created.error;

    return NextResponse.json({ question: created.data }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/questions]", error);
    return NextResponse.json<ApiError>(
      { error: "No se pudo guardar la pregunta." },
      { status: 503 },
    );
  }
}
