import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"
import { buscarNovosDoMonitor, hojeYyyymmdd, persistirResultados } from "@/lib/monitor-check"

export const maxDuration = 60

// Verificação manual do dia: busca só o que publicou hoje para um
// monitoramento do usuário e persiste os novos (idempotente via dedup).
export async function POST(request: NextRequest) {
  const signal = AbortSignal.timeout(30_000)
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
      .abortSignal(signal)
      .retry(false)
      .single()
    signal.throwIfAborted()
    if (errMonitor || !monitor) {
      return NextResponse.json({ error: "Monitoramento não encontrado" }, { status: 404 })
    }

    const hoje = hojeYyyymmdd()
    const { itens, truncado, parcial } = await buscarNovosDoMonitor(
      supabase,
      monitor,
      { dataInicial: hoje, dataFinal: hoje, maxPaginas: 5, signal }
    )
    const gravados = await persistirResultados(supabase, monitor.id, itens, signal)

    signal.throwIfAborted()
    const { error: erroAtualizacao } = await supabase
      .from("monitoramentos")
      .update({ ultima_verificacao: new Date().toISOString() })
      .eq("id", monitor.id)
      .abortSignal(signal)
      .retry(false)
    if (erroAtualizacao) throw erroAtualizacao

    return NextResponse.json({ novos: gravados.length, truncado, parcial, resultados: gravados })
  } catch (error) {
    if (signal.aborted) {
      return NextResponse.json(
        { error: "A verificação excedeu o tempo disponível. Tente novamente." },
        { status: 504 }
      )
    }
    const message = error instanceof Error ? error.message : "Erro interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
