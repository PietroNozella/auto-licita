const BASE_URL = "https://pncp.gov.br/api/consulta"

import type {
  PaginaRetornoRecuperarCompraPublicacaoDTO,
  RecuperarCompraPublicacaoDTO,
  PncpSearchParams,
} from "@/types/pncp"

const MAX_CONCURRENCY = 3
const MAX_RETRIES = 2
const REQUEST_TIMEOUT_MS = 10_000

function aguardarNovaTentativa(ms: number, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted()
  return new Promise((resolve, reject) => {
    const cancelar = () => {
      clearTimeout(timer)
      reject(signal.reason)
    }
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", cancelar)
      resolve()
    }, ms)
    signal.addEventListener("abort", cancelar, { once: true })
  })
}

// Regra de correspondência única da busca manual e dos monitores: o item
// entra se qualquer termo aparecer no objeto, na informação complementar
// ou no nome do órgão.
export function itemContemAlgumTermo(
  item: RecuperarCompraPublicacaoDTO,
  termos: string[]
): boolean {
  const texto = `${item.objetoCompra ?? ""} ${item.informacaoComplementar ?? ""} ${item.orgaoEntidade?.razaoSocial ?? ""}`.toLowerCase()
  return termos.some((termo) => texto.includes(termo))
}

async function fetchFromPncp<T>(
  path: string,
  params: Record<string, string | number | undefined>,
  signal: AbortSignal
): Promise<T> {
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value))
    }
  }
  const url = `${BASE_URL}${path}?${searchParams.toString()}`

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    signal.throwIfAborted()
    try {
      const res = await fetch(url, {
        next: { revalidate: 300 },
        signal: AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]),
      })
      if (res.status === 204) {
        return { data: [], totalRegistros: 0, totalPaginas: 0, numeroPagina: 1, paginasRestantes: 0, empty: true } as unknown as T
      }
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Erro na fonte de dados: ${res.status} - ${text || res.statusText}`)
      }
      const data = await res.json()
      signal.throwIfAborted()
      return data
    } catch (error) {
      signal.throwIfAborted()
      if (attempt < MAX_RETRIES) {
        await aguardarNovaTentativa(1000 * (attempt + 1), signal)
        continue
      }
      throw error
    }
  }
  throw new Error("Todas as tentativas falharam")
}

async function buscarTodasModalidades(
  path: string,
  params: PncpSearchParams,
  signal: AbortSignal
): Promise<PaginaRetornoRecuperarCompraPublicacaoDTO> {
  // Executa com limite de concorrência para não sobrecarregar a API
  const results: PaginaRetornoRecuperarCompraPublicacaoDTO[] = []
  const falhas: string[] = []
  const queue = [...MODALIDADES]

  async function worker() {
    while (queue.length > 0) {
      signal.throwIfAborted()
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
        }, signal)
        results.push(r)
      } catch (error) {
        signal.throwIfAborted()
        const mensagem = error instanceof Error ? error.message : "Erro desconhecido"
        falhas.push(`modalidade ${m.id}: ${mensagem}`)
      }
    }
  }

  await Promise.all(Array.from({ length: MAX_CONCURRENCY }, () => worker()))

  // Todas as modalidades falharam: não é um resultado vazio, é indisponibilidade.
  if (results.length === 0 && falhas.length > 0) {
    throw new Error(`Fonte de dados indisponível: ${falhas[0]}`)
  }

  const seen = new Set<string>()
  const merged = results
    .flatMap((r) => r.data ?? [])
    .filter((item) => {
      if (seen.has(item.numeroControlePNCP)) return false
      seen.add(item.numeroControlePNCP)
      return true
    })
    .sort((a, b) => new Date(b.dataPublicacaoPncp).getTime() - new Date(a.dataPublicacaoPncp).getTime())

  // Cada resposta traz o total real da sua modalidade: a soma é o total do
  // período, mesmo exibindo só a primeira página (limite de tamanhoPagina).
  const totalRegistros = results.reduce((soma, r) => soma + (r.totalRegistros ?? 0), 0)
  const totalPaginas = results.reduce((maior, r) => Math.max(maior, r.totalPaginas ?? 1), 1)
  const paginasRestantes = results.reduce((maior, r) => Math.max(maior, r.paginasRestantes ?? 0), 0)

  return {
    data: merged,
    totalRegistros,
    totalPaginas,
    numeroPagina: params.pagina,
    paginasRestantes,
    empty: merged.length === 0,
    parcial: falhas.length > 0,
    modalidadesComFalha: falhas.length,
  }
}

export async function buscarContratacoesPorPublicacao(
  params: PncpSearchParams,
  signal: AbortSignal = AbortSignal.timeout(30_000)
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
    }, signal)
  }
  return buscarTodasModalidades("/v1/contratacoes/publicacao", params, signal)
}

export const MODALIDADES = [
  { id: 1, nome: "Leilão - Eletrônico" },
  { id: 2, nome: "Diálogo Competitivo" },
  { id: 3, nome: "Concurso" },
  { id: 4, nome: "Concorrência - Eletrônica" },
  { id: 5, nome: "Concorrência - Presencial" },
  { id: 6, nome: "Pregão - Eletrônico" },
  { id: 7, nome: "Pregão - Presencial" },
  { id: 8, nome: "Dispensa de Licitação" },
  { id: 9, nome: "Inexigibilidade" },
  { id: 10, nome: "Manifestação de Interesse" },
  { id: 11, nome: "Pré-qualificação" },
  { id: 12, nome: "Credenciamento" },
  { id: 13, nome: "Leilão - Presencial" },
]

export const UF_LIST = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
  "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
  "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]
