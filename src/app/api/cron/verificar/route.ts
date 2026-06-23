import { NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"
import { buscarContratacoesPorPublicacao } from "@/lib/pncp-api"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    // Verifica cron secret para segurança
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const supabase = getSupabase()

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

      const response = await buscarContratacoesPorPublicacao({
        dataInicial,
        dataFinal,
        codigoModalidadeContratacao: monitor.modalidade_id ?? -1,
        uf: monitor.uf ?? undefined,
        cnpj: monitor.cnpj_orgao ?? undefined,
        pagina: 1,
        tamanhoPagina: 50,
      })

      if (!response.data || response.data.length === 0) continue

      // Filtra por palavras-chave
      const palavrasChave = monitor.palavras_chave ?? []
      const filtrados = palavrasChave.length > 0
        ? response.data.filter((item) => {
            const texto = `${item.objetoCompra ?? ""} ${item.informacaoComplementar ?? ""}`.toLowerCase()
            return palavrasChave.some((palavra: string) => texto.includes(palavra.toLowerCase()))
          })
        : response.data

      if (filtrados.length === 0) continue

      // Insere no banco (ignora duplicatas)
      for (const item of filtrados) {
        const { data: inserted, error: errInsert } = await supabase
          .from("resultados_licitacoes")
          .upsert({
            numero_controle_pncp: item.numeroControlePNCP,
            monitoramento_id: monitor.id,
            objeto_compra: item.objetoCompra,
            orgao_nome: item.orgaoEntidade?.razaoSocial,
            orgao_cnpj: item.orgaoEntidade?.cnpj,
            uf: item.unidadeOrgao?.ufSigla,
            modalidade_nome: item.modalidadeNome,
            valor_total_estimado: item.valorTotalEstimado,
            data_publicacao: item.dataPublicacaoPncp,
            data_abertura_proposta: item.dataAberturaProposta,
            data_encerramento_proposta: item.dataEncerramentoProposta,
            link: item.linkSistemaOrigem,
            notificado: false,
          }, {
            onConflict: "numero_controle_pncp",
            ignoreDuplicates: false,
          })
          .select()
          .single()

        if (!errInsert && inserted) {
          resultadosNovos.push(item.numeroControlePNCP)
          await supabase.from("notificacoes").insert({
            resultado_id: inserted.id,
          })
        }
      }

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
