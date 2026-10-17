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

    const supabase = getSupabaseAdmin()

    // Busca todos os monitoramentos ativos
    const { data: monitoramentos, error: errMonitor } = await supabase
      .from("monitoramentos")
      .select("*")
      .eq("ativo", true)

    if (errMonitor) throw errMonitor
    if (!monitoramentos || monitoramentos.length === 0) {
      return NextResponse.json({ message: "Nenhum monitoramento ativo" })
    }

    const resultadosNovos: string[] = []
    const detalhesFalhas: string[] = []

    // Janela comum a todos os monitoramentos (datas no fuso de São Paulo)
    const dataInicial = yyyymmddDiasAtras(7)
    const dataFinal = hojeYyyymmdd()

    // Um monitoramento com falha não bloqueia os demais
    for (const monitor of monitoramentos) {
      try {
        const novos = await buscarNovosDoMonitor(supabase, monitor, {
          dataInicial,
          dataFinal,
          tamanhoPagina: 50,
          maxPaginas: 1,
        })
        const gravados = await persistirResultados(supabase, monitor.id, novos)
        resultadosNovos.push(...gravados.map((g) => g.numero_controle_pncp as string))

        // Atualiza ultima_verificacao
        await supabase
          .from("monitoramentos")
          .update({ ultima_verificacao: new Date().toISOString() })
          .eq("id", monitor.id)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro desconhecido"
        detalhesFalhas.push(`${monitor.id}: ${message}`)
      }
    }

    return NextResponse.json({
      message: "Verificação concluída",
      monitoramentosProcessados: monitoramentos.length,
      resultadosNovos: resultadosNovos.length,
      falhas: detalhesFalhas.length,
      ...(detalhesFalhas.length > 0 ? { detalhes: detalhesFalhas } : {}),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
