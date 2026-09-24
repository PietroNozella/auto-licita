import type { SupabaseClient } from "@supabase/supabase-js"
import { buscarContratacoesPorPublicacao } from "./pncp-api"
import type { RecuperarCompraPublicacaoDTO } from "@/types/pncp"

export interface MonitorFiltros {
  id: string
  palavras_chave: string[] | null
  uf: string | null
  modalidade_id: number | null
  cnpj_orgao: string | null
}

interface JanelaBusca {
  dataInicial: string
  dataFinal: string
  tamanhoPagina?: number
  maxPaginas?: number
}

// Busca itens novos para um monitoramento sem gravar: pagina, filtra por
// palavras-chave e exclui o que já está registrado para este monitor.
export async function buscarNovosDoMonitor(
  supabase: SupabaseClient,
  monitor: MonitorFiltros,
  janela: JanelaBusca
): Promise<RecuperarCompraPublicacaoDTO[]> {
  const tamanhoPagina = janela.tamanhoPagina ?? 50
  const maxPaginas = janela.maxPaginas ?? 5

  const itens: RecuperarCompraPublicacaoDTO[] = []
  for (let pagina = 1; pagina <= maxPaginas; pagina++) {
    const response = await buscarContratacoesPorPublicacao({
      dataInicial: janela.dataInicial,
      dataFinal: janela.dataFinal,
      codigoModalidadeContratacao: monitor.modalidade_id ?? undefined,
      uf: monitor.uf ?? undefined,
      cnpj: monitor.cnpj_orgao ?? undefined,
      pagina,
      tamanhoPagina,
    })
    const dados = response.data ?? []
    itens.push(...dados)
    if (dados.length < tamanhoPagina) break
  }

  const palavrasChave = monitor.palavras_chave ?? []
  const filtrados = palavrasChave.length > 0
    ? itens.filter((item) => {
        const texto = `${item.objetoCompra ?? ""} ${item.informacaoComplementar ?? ""}`.toLowerCase()
        return palavrasChave.some((palavra: string) => texto.includes(palavra.toLowerCase()))
      })
    : itens
  if (filtrados.length === 0) return []

  const { data: existentes } = await supabase
    .from("resultados_licitacoes")
    .select("numero_controle_pncp")
    .eq("monitoramento_id", monitor.id)
    .in("numero_controle_pncp", filtrados.map((item) => item.numeroControlePNCP))
  const vistos = new Set((existentes ?? []).map((e) => e.numero_controle_pncp as string))
  return filtrados.filter((item) => !vistos.has(item.numeroControlePNCP))
}

// Persiste os itens e retorna as linhas gravadas. Conflito global sem a
// migration 003 (edital já vinculado a outro monitor) é pulado sem erro.
export async function persistirResultados(
  supabase: SupabaseClient,
  monitoramentoId: string,
  itens: RecuperarCompraPublicacaoDTO[]
): Promise<Record<string, unknown>[]> {
  const gravados: Record<string, unknown>[] = []
  for (const item of itens) {
    const { data: inserted, error } = await supabase
      .from("resultados_licitacoes")
      .insert({
        numero_controle_pncp: item.numeroControlePNCP,
        monitoramento_id: monitoramentoId,
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
      })
      .select()
      .single()

    if (error || !inserted) continue

    gravados.push(inserted as Record<string, unknown>)
    await supabase.from("notificacoes").insert({
      resultado_id: (inserted as { id: string }).id,
    })
  }
  return gravados
}
