import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { importSchema, type ApiError } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/questions/import — restaura un backup.
 *
 * Cada pregunta pasa por el mismo `questionInputSchema` que el formulario, así
 * que un JSON editado a mano con un `answer` que apunta a una opción inexistente
 * se rechaza ENTERO antes de tocar la base. Nunca queda importado a medias.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiError>(
      { error: "El archivo no es un JSON válido." },
      { status: 400 },
    );
  }

  const parsed = importSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    // El path es ["questions", indice, ...]: se traduce a "pregunta N".
    const index = typeof issue?.path[1] === "number" ? issue.path[1] : null;
    const where = index === null ? "" : ` (pregunta ${index + 1})`;
    return NextResponse.json<ApiError>(
      { error: `${issue?.message ?? "El archivo no es válido."}${where}` },
      { status: 400 },
    );
  }

  try {
    const db = getSupabaseAdmin();

    if (parsed.data.replace) {
      const cleared = await db.from("questions").delete().not("id", "is", null);
      if (cleared.error) throw cleared.error;
    }

    const last = await db
      .from("questions")
      .select("order_index")
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last.error) throw last.error;

    const base = last.data?.order_index ?? 0;
    const rows = parsed.data.questions.map((question, index) => ({
      ...question,
      order_index: base + index + 1,
    }));

    const inserted = await db.from("questions").insert(rows).select("id");
    if (inserted.error) throw inserted.error;

    return NextResponse.json({ imported: inserted.data.length });
  } catch (error) {
    console.error("[POST questions/import]", error);
    return NextResponse.json<ApiError>(
      { error: "No se pudo importar." },
      { status: 503 },
    );
  }
}
