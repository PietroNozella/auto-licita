import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import { buscarNovosDoMonitor, persistirResultados } from "@/lib/monitor-check"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    // Verifica cron secret ou header do Vercel
    const isVercelCron = request.headers.get("x-vercel-cron") === "1"
    const authHeader = request.headers.get("authorization")
    const hasValidSecret = authHeader === `Bearer ${process.env.CRON_SECRET}`
    if (!isVercelCron && !hasValidSecret) {
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

    for (const monitor of monitoramentos) {
      // Busca licitações dos últimos 7 dias
      const dataInicio = new Date()
      dataInicio.setDate(dataInicio.getDate() - 7)
      const dataInicial = dataInicio.toISOString().split("T")[0].replace(/-/g, "")
      const dataFinal = new Date().toISOString().split("T")[0].replace(/-/g, "")

      const novos = await buscarNovosDoMonitor(supabase, monitor, { dataInicial, dataFinal })
      const gravados = await persistirResultados(supabase, monitor.id, novos)
      resultadosNovos.push(...gravados.map((g) => g.numero_controle_pncp as string))

      // Atualiza ultima_verificacao
      await supabase
        .from("monitoramentos")
        .update({ ultima_verificacao: new Date().toISOString() })
        .eq("id", monitor.id)
    }

    return NextResponse.json({
      message: "Verificação concluída",
      monitoramentosProcessados: monitoramentos.length,
      resultadosNovos: resultadosNovos.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
