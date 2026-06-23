import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    const { id } = await request.json()
    if (!id) {
      return NextResponse.json({ error: "id é obrigatório" }, { status: 400 })
    }

    // Busca os IDs dos monitoramentos do usuario
    const { data: monIds, error: errMon } = await supabase
      .from("monitoramentos")
      .select("id")
      .eq("user_id", user.id)
    if (errMon) throw errMon
    if (!monIds || monIds.length === 0) {
      return NextResponse.json({ error: "Nenhum monitoramento encontrado" }, { status: 404 })
    }

    const { error } = await supabase
      .from("resultados_licitacoes")
      .update({ notificado: true })
      .eq("id", id)
      .in("monitoramento_id", monIds.map((m) => m.id))

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
