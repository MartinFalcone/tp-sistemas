import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { questionInputSchema, type ApiError } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/admin/questions/[id] — reemplaza el contenido de una pregunta. */
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;

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
    // `order_index` no se toca acá: lo maneja el endpoint de reordenar.
    const updated = await db
      .from("questions")
      .update(parsed.data)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (updated.error) throw updated.error;
    if (!updated.data) {
      return NextResponse.json<ApiError>(
        { error: "Esa pregunta ya no existe." },
        { status: 404 },
      );
    }

    return NextResponse.json({ question: updated.data });
  } catch (error) {
    console.error("[PATCH questions/id]", error);
    return NextResponse.json<ApiError>(
      { error: "No se pudo guardar la pregunta." },
      { status: 503 },
    );
  }
}

/**
 * DELETE /api/admin/questions/[id]
 *
 * Las respuestas ya dadas a esa pregunta se borran por cascada: es lo correcto,
 * porque el puntaje de una pregunta que ya no existe no debería seguir contando.
 */
export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;

  try {
    const db = getSupabaseAdmin();
    const deleted = await db
      .from("questions")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (deleted.error) throw deleted.error;
    if (!deleted.data) {
      return NextResponse.json<ApiError>(
        { error: "Esa pregunta ya no existe." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE questions/id]", error);
    return NextResponse.json<ApiError>(
      { error: "No se pudo borrar la pregunta." },
      { status: 503 },
    );
  }
}
