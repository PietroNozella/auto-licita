import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"
import { buscarNovosDoMonitor, persistirResultados } from "@/lib/monitor-check"

// Verificação manual do dia: busca no PNCP só o que publicou hoje para um
// monitoramento do usuário e persiste os novos (idempotente via dedup).
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

    const { data: monitor, error: errMonitor } = await supabase
      .from("monitoramentos")
      .select("id, palavras_chave, uf, modalidade_id, cnpj_orgao")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()
    if (errMonitor || !monitor) {
      return NextResponse.json({ error: "Monitoramento não encontrado" }, { status: 404 })
    }

    const hoje = new Date().toISOString().split("T")[0].replace(/-/g, "")
    const novos = await buscarNovosDoMonitor(
      supabase,
      monitor,
      { dataInicial: hoje, dataFinal: hoje, maxPaginas: 3 }
    )
    const gravados = await persistirResultados(supabase, monitor.id, novos)

    await supabase
      .from("monitoramentos")
      .update({ ultima_verificacao: new Date().toISOString() })
      .eq("id", monitor.id)

    return NextResponse.json({ novos: gravados.length, resultados: gravados })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
