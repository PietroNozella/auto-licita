import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"

export async function GET() {
  try {
    const supabase = await getSupabaseServer()
    const {
      data: { user }
    } = await supabase.auth.getUser()
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
    const naoLidas: Record<string, number> = {}
    const totais: Record<string, number> = {}
    for (const m of monitoramentos ?? []) {
      const {
        data: items,
        count: total,
        error: errResultados
      } = await supabase
        .from("resultados_licitacoes")
        .select("*", { count: "exact" })
        .eq("monitoramento_id", m.id)
        .order("data_publicacao", { ascending: false })
        .limit(100)
      if (errResultados) throw errResultados
      const { count, error: errContagem } = await supabase
        .from("resultados_licitacoes")
        .select("id", { count: "exact", head: true })
        .eq("monitoramento_id", m.id)
        .eq("notificado", false)
      if (errContagem) throw errContagem
      if (items) resultados[m.id] = items
      naoLidas[m.id] = count ?? 0
      totais[m.id] = total ?? 0
    }

    return NextResponse.json({ monitoramentos, resultados, naoLidas, totais })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
