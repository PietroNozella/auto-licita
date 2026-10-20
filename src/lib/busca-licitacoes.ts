import type { PaginaRetornoRecuperarCompraPublicacaoDTO, RecuperarCompraPublicacaoDTO } from "@/types/pncp"

export interface FiltrosBusca {
  query: string
  dataInicial: string
  dataFinal: string
  modalidade: string
  uf: string
  cnpj: string
}

export interface LoteBusca {
  itens: RecuperarCompraPublicacaoDTO[]
  registrosConsultados: number
  totalRegistros: number
  proximaPagina: number | null
  parcial: boolean
  erro?: string
}

// Cada lote limita o tempo de espera; a continuação mantém os mesmos filtros.
export async function buscarLoteLicitacoes(
  filtros: FiltrosBusca,
  paginaInicial: number,
  signal: AbortSignal,
  consultar: typeof fetch = fetch
): Promise<LoteBusca> {
  const itens = new Map<string, RecuperarCompraPublicacaoDTO>()
  let registrosConsultados = 0
  let totalRegistros = 0
  let parcial = false
  let pagina = paginaInicial

  for (let indice = 0; indice < 3; indice++, pagina++) {
    signal.throwIfAborted()
    const params = new URLSearchParams({
      dataInicial: filtros.dataInicial,
      dataFinal: filtros.dataFinal,
      pagina: String(pagina),
      tamanhoPagina: "50",
    })
    if (filtros.query.trim()) params.set("q", filtros.query)
    if (filtros.modalidade) params.set("codigoModalidadeContratacao", filtros.modalidade)
    if (filtros.uf) params.set("uf", filtros.uf)
    if (filtros.cnpj) params.set("cnpj", filtros.cnpj)

    try {
      const res = await consultar(`/api/pncp/search?${params}`, { signal })
      const data = await res.json()
      signal.throwIfAborted()
      if (!res.ok) throw new Error(data.error ?? "Não foi possível concluir a busca")
      const resultado = data as PaginaRetornoRecuperarCompraPublicacaoDTO
      for (const item of resultado.data ?? []) itens.set(item.numeroControlePNCP, item)
      registrosConsultados += resultado.registrosConsultados ?? resultado.data.length
      totalRegistros = Math.max(totalRegistros, resultado.totalRegistros ?? 0)
      parcial ||= resultado.parcial === true
      if (resultado.paginasRestantes <= 0) {
        return { itens: [...itens.values()], registrosConsultados, totalRegistros, proximaPagina: null, parcial }
      }
    } catch (error) {
      signal.throwIfAborted()
      if (indice === 0) throw error
      return {
        itens: [...itens.values()], registrosConsultados, totalRegistros, proximaPagina: pagina, parcial,
        erro: error instanceof Error ? error.message : "Não foi possível concluir a busca",
      }
    }
  }
  return { itens: [...itens.values()], registrosConsultados, totalRegistros, proximaPagina: pagina, parcial }
}
