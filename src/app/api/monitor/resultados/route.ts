import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"

export async function GET(request: Request) {
  try {
    const supabase = await getSupabaseServer()
    const {
      data: { user }
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    const params = new URL(request.url).searchParams
    const monitorId = params.get("monitoramentoId")
    const pagina = Number(params.get("pagina") ?? "1")
    if (!Number.isSafeInteger(pagina * 100) || pagina < 1 || !Number.isInteger(pagina) || (pagina > 1 && !monitorId)) {
      return NextResponse.json({ error: "Página inválida" }, { status: 400 })
    }
    if (monitorId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(monitorId)) {
      return NextResponse.json({ error: "Monitoramento inválido" }, { status: 400 })
    }

    // Busca monitoramentos do usuario
    const { data: monitoramentos, error: errMon } = await supabase
      .from("monitoramentos")
      .select("id, nome, ativo")
      .eq("user_id", user.id)
    if (errMon) throw errMon
    const monitores = monitorId ? (monitoramentos ?? []).filter((m) => m.id === monitorId) : (monitoramentos ?? [])
    if (monitorId && monitores.length === 0) {
      return NextResponse.json({ error: "Monitoramento não encontrado" }, { status: 404 })
    }

    // Busca resultados de cada monitoramento
    const resultados: Record<string, unknown[]> = {}
    const naoLidas: Record<string, number> = {}
    const totais: Record<string, number> = {}
    for (const m of monitores) {
      const {
        data: items,
        count: total,
        error: errResultados
      } = await supabase
        .from("resultados_licitacoes")
        .select("*", { count: "exact" })
        .eq("monitoramento_id", m.id)
        .order("data_publicacao", { ascending: false, nullsFirst: false })
        .order("id", { ascending: false })
        .range((pagina - 1) * 100, pagina * 100 - 1)
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
