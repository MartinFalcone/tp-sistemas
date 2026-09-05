import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { reorderSchema, type ApiError } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/questions/reorder — body `{ ids: [...] }` en el orden nuevo.
 *
 * Se reasigna `order_index` de a uno. Con ~12 preguntas son 12 updates: no vale
 * la pena una transacción ni un RPC. Si alguno falla se avisa cuántos, para que
 * el admin recargue en vez de quedarse con un orden a medias sin saberlo.
 */
export async function PATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiError>(
      { error: "No se pudo leer el pedido." },
      { status: 400 },
    );
  }

  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiError>(
      { error: "La lista de preguntas no es válida." },
      { status: 400 },
    );
  }

  try {
    const db = getSupabaseAdmin();

    const results = await Promise.all(
      parsed.data.ids.map((id, index) =>
        db.from("questions").update({ order_index: index + 1 }).eq("id", id),
      ),
    );

    const failed = results.filter((result) => result.error);
    if (failed.length > 0) {
      console.error("[reorder]", failed.map((result) => result.error));
      return NextResponse.json<ApiError>(
        {
          error: `Quedaron ${failed.length} preguntas sin reordenar. Recargá y probá de nuevo.`,
        },
        { status: 503 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PATCH questions/reorder]", error);
    return NextResponse.json<ApiError>(
      { error: "No se pudo reordenar." },
      { status: 503 },
    );
  }
}
