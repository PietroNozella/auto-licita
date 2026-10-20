import type { SupabaseClient } from "@supabase/supabase-js"
import { dataSp } from "@/lib/utils"
import { buscarContratacoesPorPublicacao, itemContemAlgumTermo } from "./pncp-api"
import type { RecuperarCompraPublicacaoDTO } from "@/types/pncp"

export interface MonitorFiltros {
  id: string
  palavras_chave: string[] | null
  uf: string | null
  modalidade_id: number | null
  cnpj_orgao: string | null
}

// Formato aceito pela API do PNCP (yyyymmdd), no fuso de São Paulo.
export function hojeYyyymmdd(): string {
  return dataSp().replace(/-/g, "")
}

export function yyyymmddDiasAtras(dias: number): string {
  return dataSp(dias).replace(/-/g, "")
}

interface JanelaBusca {
  dataInicial: string
  dataFinal: string
  tamanhoPagina?: number
  maxPaginas?: number
  signal?: AbortSignal
}

export interface ResultadoBuscaMonitor {
  itens: RecuperarCompraPublicacaoDTO[]
  /** true quando havia mais páginas e o limite de páginas foi atingido. */
  truncado: boolean
  /** true quando alguma modalidade falhou e o resultado está incompleto. */
  parcial: boolean
}

// Busca itens novos para um monitoramento sem gravar: pagina, filtra por
// palavras-chave e exclui o que já está registrado para este monitor.
export async function buscarNovosDoMonitor(
  supabase: SupabaseClient,
  monitor: MonitorFiltros,
  janela: JanelaBusca
): Promise<ResultadoBuscaMonitor> {
  const tamanhoPagina = janela.tamanhoPagina ?? 50
  const maxPaginas = janela.maxPaginas ?? 10
  const signal = janela.signal ?? AbortSignal.timeout(30_000)

  const itens: RecuperarCompraPublicacaoDTO[] = []
  let truncado = false
  let parcial = false

  for (let pagina = 1; pagina <= maxPaginas; pagina++) {
    signal.throwIfAborted()
    const response = await buscarContratacoesPorPublicacao({
      dataInicial: janela.dataInicial,
      dataFinal: janela.dataFinal,
      codigoModalidadeContratacao: monitor.modalidade_id ?? undefined,
      uf: monitor.uf ?? undefined,
      // A API consultada só opera com 14 dígitos; dados antigos podem ter máscara.
      cnpj: monitor.cnpj_orgao ? monitor.cnpj_orgao.replace(/\D/g, "") : undefined,
      pagina,
      tamanhoPagina,
    }, signal)
    signal.throwIfAborted()
    if (response.parcial) parcial = true
    itens.push(...(response.data ?? []))
    if ((response.paginasRestantes ?? 0) <= 0) break
    if (pagina === maxPaginas) truncado = true
  }

  // Mesma regra da busca manual: divide em palavras (OR) e inclui o nome do órgão.
  const termos = (monitor.palavras_chave ?? [])
    .flatMap((p) => p.toLowerCase().split(/\s+/).filter(Boolean))
  const filtrados = termos.length > 0
    ? itens.filter((item) => itemContemAlgumTermo(item, termos))
    : itens
  if (filtrados.length === 0) return { itens: [], truncado, parcial }

  const { data: existentes, error: erroExistentes } = await supabase
    .from("resultados_licitacoes")
    .select("numero_controle_pncp")
    .eq("monitoramento_id", monitor.id)
    .in("numero_controle_pncp", filtrados.map((item) => item.numeroControlePNCP))
    .abortSignal(signal)
    .retry(false)
  signal.throwIfAborted()
  if (erroExistentes) throw erroExistentes
  const vistos = new Set((existentes ?? []).map((e) => e.numero_controle_pncp as string))
  return {
    itens: filtrados.filter((item) => !vistos.has(item.numeroControlePNCP)),
    truncado,
    parcial,
  }
}

// Persiste os itens e retorna as linhas gravadas; duplicatas são ignoradas.
// Estado de leitura vive em resultados_licitacoes.notificado (marcar-lida).
export async function persistirResultados(
  supabase: SupabaseClient,
  monitoramentoId: string,
  itens: RecuperarCompraPublicacaoDTO[],
  signal: AbortSignal = AbortSignal.timeout(30_000)
): Promise<Record<string, unknown>[]> {
  const gravados: Record<string, unknown>[] = []
  for (const item of itens) {
    signal.throwIfAborted()
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
      .abortSignal(signal)
      .retry(false)
      .single()

    signal.throwIfAborted()
    if (error) {
      // Conflito neste monitor é duplicata esperada (ex.: duas verificações
      // simultâneas); qualquer outro erro precisa chegar ao chamador.
      if ((error as { code?: string }).code === "23505") continue
      throw new Error(`Falha ao gravar resultado ${item.numeroControlePNCP}: ${error.message}`)
    }
    if (!inserted) {
      throw new Error(`Falha ao gravar resultado ${item.numeroControlePNCP}: retorno vazio`)
    }

    gravados.push(inserted as Record<string, unknown>)
  }
  return gravados
}
