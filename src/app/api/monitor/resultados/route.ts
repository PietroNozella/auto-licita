import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"

export async function GET() {
  try {
    const supabase = await getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    // Busca monitoramentos do usuario
    const { data: monitoramentos, error: errMon } = await supabase
      .from("monitoramentos")
      .select("id, nome, ativo")
      .eq("user_id", user.id)
    if (errMon) throw errMon

    // Busca resultados de cada monitoramento
    const resultados: Record<string, unknown[]> = {}
    for (const m of monitoramentos ?? []) {
      const { data: items } = await supabase
        .from("resultados_licitacoes")
        .select("*")
        .eq("monitoramento_id", m.id)
        .order("data_publicacao", { ascending: false })
        .limit(100)
      if (items) resultados[m.id] = items
    }

    return NextResponse.json({ monitoramentos, resultados })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
