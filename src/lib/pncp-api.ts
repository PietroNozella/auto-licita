const BASE_URL = "https://pncp.gov.br/api/consulta"

import type {
  PaginaRetornoRecuperarCompraPublicacaoDTO,
  RecuperarCompraPublicacaoDTO,
  PncpSearchParams,
} from "@/types/pncp"

const MAX_CONCURRENCY = 3
const MAX_RETRIES = 2

async function fetchFromPncp<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value))
    }
  }
  const url = `${BASE_URL}${path}?${searchParams.toString()}`

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, { next: { revalidate: 300 } })
      if (res.status === 204) {
        return { data: [], totalRegistros: 0, totalPaginas: 0, numeroPagina: 1, paginasRestantes: 0, empty: true } as unknown as T
      }
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Erro na PNCP API: ${res.status} - ${text || res.statusText}`)
      }
      return res.json()
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
        continue
      }
      throw error
    }
  }
  throw new Error("Todas as tentativas falharam")
}

async function buscarTodasModalidades<T>(
  path: string,
  params: PncpSearchParams
): Promise<PaginaRetornoRecuperarCompraPublicacaoDTO> {
  // Executa com limite de concorrência para não sobrecarregar a API
  const results: PaginaRetornoRecuperarCompraPublicacaoDTO[] = []
  const queue = [...MODALIDADES]

  async function worker() {
    while (queue.length > 0) {
      const m = queue.shift()!
      try {
        const r = await fetchFromPncp<PaginaRetornoRecuperarCompraPublicacaoDTO>(path, {
          dataInicial: params.dataInicial,
          dataFinal: params.dataFinal,
          codigoModalidadeContratacao: m.id,
          uf: params.uf,
          codigoMunicipioIbge: params.codigoMunicipioIbge,
          cnpj: params.cnpj,
          codigoUnidadeAdministrativa: params.codigoUnidadeAdministrativa,
          pagina: params.pagina,
          tamanhoPagina: params.tamanhoPagina ?? 50,
        })
        results.push(r)
      } catch {
        // Se uma modalidade falhar, pula silenciosamente
      }
    }
  }

  await Promise.all(Array.from({ length: MAX_CONCURRENCY }, () => worker()))

  const seen = new Set<string>()
  const merged = results
    .flatMap((r) => r.data ?? [])
    .filter((item) => {
      if (seen.has(item.numeroControlePNCP)) return false
      seen.add(item.numeroControlePNCP)
      return true
    })
    .sort((a, b) => new Date(b.dataPublicacaoPncp).getTime() - new Date(a.dataPublicacaoPncp).getTime())

  return {
    data: merged,
    totalRegistros: merged.length,
    totalPaginas: 1,
    numeroPagina: params.pagina,
    paginasRestantes: 0,
    empty: merged.length === 0,
  }
}

export async function buscarContratacoesPorPublicacao(
  params: PncpSearchParams
): Promise<PaginaRetornoRecuperarCompraPublicacaoDTO> {
  if (params.codigoModalidadeContratacao) {
    return fetchFromPncp<PaginaRetornoRecuperarCompraPublicacaoDTO>("/v1/contratacoes/publicacao", {
      dataInicial: params.dataInicial,
      dataFinal: params.dataFinal,
      codigoModalidadeContratacao: params.codigoModalidadeContratacao,
      uf: params.uf,
      cnpj: params.cnpj,
      pagina: params.pagina,
      tamanhoPagina: params.tamanhoPagina ?? 50,
    })
  }
  return buscarTodasModalidades("/v1/contratacoes/publicacao", params)
}

export async function buscarContratacoesComPropostaAberta(
  dataFinal: string,
  params?: Partial<PncpSearchParams>
): Promise<PaginaRetornoRecuperarCompraPublicacaoDTO> {
  return fetchFromPncp<PaginaRetornoRecuperarCompraPublicacaoDTO>("/v1/contratacoes/proposta", {
    dataFinal,
    codigoModalidadeContratacao: params?.codigoModalidadeContratacao,
    uf: params?.uf,
    codigoMunicipioIbge: params?.codigoMunicipioIbge,
    cnpj: params?.cnpj,
    pagina: params?.pagina ?? 1,
    tamanhoPagina: params?.tamanhoPagina ?? 50,
  })
}

export async function buscarContratacoesPorAtualizacao(
  params: PncpSearchParams
): Promise<PaginaRetornoRecuperarCompraPublicacaoDTO> {
  if (params.codigoModalidadeContratacao) {
    return fetchFromPncp<PaginaRetornoRecuperarCompraPublicacaoDTO>("/v1/contratacoes/atualizacao", {
      dataInicial: params.dataInicial,
      dataFinal: params.dataFinal,
      codigoModalidadeContratacao: params.codigoModalidadeContratacao,
      uf: params.uf,
      cnpj: params.cnpj,
      pagina: params.pagina,
      tamanhoPagina: params.tamanhoPagina ?? 50,
    })
  }
  return buscarTodasModalidades("/v1/contratacoes/atualizacao", params)
}

export async function buscarDetalheContratacao(
  cnpj: string,
  ano: number,
  sequencial: number
): Promise<RecuperarCompraPublicacaoDTO> {
  return fetchFromPncp<RecuperarCompraPublicacaoDTO>(`/v1/orgaos/${cnpj}/compras/${ano}/${sequencial}`, {})
}

export const MODALIDADES = [
  { id: 1, nome: "Dispensa Eletrônica" },
  { id: 2, nome: "Dispensa" },
  { id: 3, nome: "Inexigibilidade" },
  { id: 4, nome: "Leilão" },
  { id: 5, nome: "Concorrência Eletrônica" },
  { id: 6, nome: "Concorrência Presencial" },
  { id: 7, nome: "Pregão Eletrônico" },
  { id: 8, nome: "Pregão Presencial" },
  { id: 9, nome: "Concurso" },
  { id: 10, nome: "Chamamento Público" },
  { id: 11, nome: "Pré-qualificação" },
  { id: 12, nome: "Proposta" },
  { id: 13, nome: "Credenciamento" },
  { id: 14, nome: "Diálogo Competitivo" },
  { id: 15, nome: "Sistema de Registro de Preços" },
  { id: 16, nome: "Cotação Eletrônica" },
]

export const UF_LIST = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
  "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
  "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]
