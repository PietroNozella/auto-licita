import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import { buscarNovosDoMonitor, persistirResultados, hojeYyyymmdd, yyyymmddDiasAtras } from "@/lib/monitor-check"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(request: Request) {
  try {
    // A Vercel envia Authorization: Bearer <CRON_SECRET> nas chamadas do cron
    const secret = process.env.CRON_SECRET
    const authHeader = request.headers.get("authorization")
    if (!secret || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // O mesmo orçamento cobre a consulta, as tentativas e a persistência.
    const signal = AbortSignal.timeout(45_000)
    const supabase = getSupabaseAdmin()

    // Busca todos os monitoramentos ativos
    const { data: monitoramentos, error: errMonitor } = await supabase
      .from("monitoramentos")
      .select("*")
      .eq("ativo", true)
      .order("ultima_verificacao", { ascending: true, nullsFirst: true })
      .abortSignal(signal)
      .retry(false)

    if (errMonitor) throw errMonitor
    if (!monitoramentos || monitoramentos.length === 0) {
      return NextResponse.json({ message: "Nenhum monitoramento ativo" })
    }

    const resultadosNovos: string[] = []
    const detalhesFalhas: string[] = []
    const detalhesTruncados: string[] = []
    const detalhesParciais: string[] = []

    // Janela comum a todos os monitoramentos (datas no fuso de São Paulo)
    const dataInicial = yyyymmddDiasAtras(7)
    const dataFinal = hojeYyyymmdd()
    let monitoramentosProcessados = 0

    // Um monitoramento com falha não bloqueia os demais
    for (const monitor of monitoramentos) {
      if (signal.aborted) break
      monitoramentosProcessados++
      try {
        const { itens, truncado, parcial } = await buscarNovosDoMonitor(supabase, monitor, {
          dataInicial,
          dataFinal,
          tamanhoPagina: 50,
          maxPaginas: 10,
          signal,
        })
        if (truncado) detalhesTruncados.push(monitor.id)
        if (parcial) detalhesParciais.push(monitor.id)
        const gravados = await persistirResultados(supabase, monitor.id, itens, signal)
        resultadosNovos.push(...gravados.map((g) => g.numero_controle_pncp as string))

        // Atualiza ultima_verificacao
        signal.throwIfAborted()
        const { error: erroAtualizacao } = await supabase
          .from("monitoramentos")
          .update({ ultima_verificacao: new Date().toISOString() })
          .eq("id", monitor.id)
          .abortSignal(signal)
          .retry(false)
        if (erroAtualizacao) throw erroAtualizacao
      } catch (error) {
        const message = signal.aborted
          ? "Tempo limite da verificação atingido"
          : error instanceof Error ? error.message : "Erro desconhecido"
        detalhesFalhas.push(`${monitor.id}: ${message}`)
      }
    }

    return NextResponse.json({
      message: signal.aborted ? "Verificação interrompida por tempo limite" : "Verificação concluída",
      monitoramentosProcessados,
      monitoramentosPendentes: monitoramentos.length - monitoramentosProcessados,
      resultadosNovos: resultadosNovos.length,
      falhas: detalhesFalhas.length,
      truncados: detalhesTruncados.length,
      parciais: detalhesParciais.length,
      ...(detalhesFalhas.length > 0 ? { detalhes: detalhesFalhas } : {}),
      ...(detalhesTruncados.length > 0 ? { detalhesTruncados } : {}),
      ...(detalhesParciais.length > 0 ? { detalhesParciais } : {}),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
