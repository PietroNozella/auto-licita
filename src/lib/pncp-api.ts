const BASE_URL = "https://pncp.gov.br/api/consulta"

import type {
  PaginaRetornoRecuperarCompraPublicacaoDTO,
  RecuperarCompraPublicacaoDTO,
  PncpSearchParams,
} from "@/types/pncp"

async function fetchFromPncp<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value))
    }
  }
  const url = `${BASE_URL}${path}?${searchParams.toString()}`
  const res = await fetch(url, {
    next: { revalidate: 300 },
  })
  if (!res.ok) {
    throw new Error(`Erro na PNCP API: ${res.status} ${res.statusText} - ${await res.text()}`)
  }
  return res.json()
}

export async function buscarContratacoesPorPublicacao(
  params: PncpSearchParams
): Promise<PaginaRetornoRecuperarCompraPublicacaoDTO> {
  return fetchFromPncp<PaginaRetornoRecuperarCompraPublicacaoDTO>("/v1/contratacoes/publicacao", {
    dataInicial: params.dataInicial,
    dataFinal: params.dataFinal,
    codigoModalidadeContratacao: params.codigoModalidadeContratacao ?? -1,
    codigoModoDisputa: params.codigoModoDisputa,
    uf: params.uf,
    codigoMunicipioIbge: params.codigoMunicipioIbge,
    cnpj: params.cnpj,
    codigoUnidadeAdministrativa: params.codigoUnidadeAdministrativa,
    pagina: params.pagina,
    tamanhoPagina: params.tamanhoPagina ?? 50,
  })
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
  return fetchFromPncp<PaginaRetornoRecuperarCompraPublicacaoDTO>("/v1/contratacoes/atualizacao", {
    dataInicial: params.dataInicial,
    dataFinal: params.dataFinal,
    codigoModalidadeContratacao: params.codigoModalidadeContratacao ?? -1,
    codigoModoDisputa: params.codigoModoDisputa,
    uf: params.uf,
    codigoMunicipioIbge: params.codigoMunicipioIbge,
    cnpj: params.cnpj,
    codigoUnidadeAdministrativa: params.codigoUnidadeAdministrativa,
    pagina: params.pagina,
    tamanhoPagina: params.tamanhoPagina ?? 50,
  })
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
