"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { RecuperarCompraPublicacaoDTO } from "@/types/pncp"
import { formatCurrency, formatDate, formatDateShort } from "@/lib/utils"
import { ordenarLicitacoes, type OrdemResultados } from "@/lib/ordenar-licitacoes"
import { Deadline } from "@/components/deadline"
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react"

function dataLabel(value?: string) {
  return value && !Number.isNaN(Date.parse(value)) ? formatDateShort(value) : "Não informada"
}

export function ResultsTable({
  data,
  buscaCompleta = true,
  loading = false,
  pageSize = 8,
  resetVersion = 0
}: {
  data: RecuperarCompraPublicacaoDTO[]
  buscaCompleta?: boolean
  loading?: boolean
  pageSize?: number
  resetVersion?: number
}) {
  const [pagination, setPagination] = useState({ page: 1, version: resetVersion })
  const page = pagination.version === resetVersion ? pagination.page : 1
  const [ordem, setOrdem] = useState<OrdemResultados>("publicacao")
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])
  const inicioRef = useRef<HTMLDivElement>(null)
  const ordenados = useMemo(() => ordenarLicitacoes(data, ordem, now), [data, ordem, now])
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageItems = ordenados.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  function mudarPagina(next: number) {
    setPagination({ page: next, version: resetVersion })
    requestAnimationFrame(() => {
      inicioRef.current?.focus()
      inicioRef.current?.scrollIntoView({ block: "start" })
    })
  }

  if (data.length === 0)
    return (
      <div role="status" className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center">
        <p className="font-medium text-zinc-700">
          {loading
            ? "Consultando publicações…"
            : buscaCompleta
              ? "Nenhuma licitação encontrada"
              : "Nenhuma correspondência nas publicações verificadas"}
        </p>
        <p className="mt-2 text-sm text-zinc-600">
          {loading
            ? "Aguarde a conclusão desta etapa."
            : buscaCompleta
              ? "Tente ajustar o período ou os filtros."
              : "Continue a verificação para consultar as publicações restantes."}
        </p>
      </div>
    )

  return (
    <div className="space-y-3" aria-busy={loading}>
      <div ref={inicioRef} tabIndex={-1} className="scroll-mt-36 outline-none md:scroll-mt-24">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p role="status" className="text-sm text-zinc-600">
            Exibindo {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, data.length)} de{" "}
            {data.length} resultados
          </p>
          <div className="flex items-center gap-2">
            <label htmlFor="ordem-resultados" className="text-sm text-zinc-600">
              Ordenar por
            </label>
            <select
              id="ordem-resultados"
              value={ordem}
              onChange={(e) => {
                setOrdem(e.target.value as OrdemResultados)
                setPagination({ page: 1, version: resetVersion })
              }}
              className="min-h-11 rounded-lg border border-zinc-500 bg-white px-3 text-sm"
            >
              <option value="publicacao">Publicação recente</option>
              <option value="encerramento">Encerramento próximo</option>
              <option value="valor">Maior valor estimado</option>
            </select>
          </div>
        </div>
        {!buscaCompleta && (
          <p className="mt-2 text-xs text-zinc-600">
            A ordenação considera apenas os resultados já encontrados.
          </p>
        )}
      </div>
      <div
        className="hidden grid-cols-[minmax(0,1fr)_9rem_11rem_8rem] gap-5 px-4 text-xs font-semibold text-zinc-600 lg:grid"
        aria-hidden="true"
      >
        <span>Objeto e órgão</span>
        <span>Valor estimado</span>
        <span>Encerramento da proposta</span>
        <span>Ação</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        {pageItems.map((item) => (
          <article key={item.numeroControlePNCP} className="border-b border-zinc-200 p-4 last:border-b-0">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_9rem_11rem_8rem] lg:gap-5">
              <div className="min-w-0">
                <h3 className="line-clamp-3 text-base font-semibold leading-snug text-zinc-900">
                  {item.objetoCompra}
                </h3>
                <p className="mt-1 text-sm text-zinc-600">
                  {item.orgaoEntidade?.razaoSocial ?? "Órgão não informado"}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-600">
                  {item.unidadeOrgao?.ufSigla && (
                    <span>
                      {[item.unidadeOrgao.municipioNome, item.unidadeOrgao.ufSigla]
                        .filter(Boolean)
                        .join(" / ")}
                    </span>
                  )}
                  {item.modalidadeNome && (
                    <span className="rounded bg-zinc-100 px-2 py-0.5">{item.modalidadeNome}</span>
                  )}
                  {item.situacaoCompraNome && <span>{item.situacaoCompraNome}</span>}
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs text-zinc-600 lg:sr-only">Valor estimado</p>
                <p className="text-sm font-semibold tabular-nums text-zinc-800">
                  {item.valorTotalEstimado != null
                    ? formatCurrency(item.valorTotalEstimado)
                    : "Não informado"}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs text-zinc-600 lg:sr-only">Encerramento da proposta</p>
                <Deadline value={item.dataEncerramentoProposta} />
              </div>
              <div>
                {item.linkSistemaOrigem ? (
                  <a
                    href={item.linkSistemaOrigem}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-blue-700 px-3 text-sm font-medium text-blue-800 hover:bg-blue-50"
                    aria-label={`Abrir edital de ${item.objetoCompra}`}
                  >
                    Abrir edital
                    <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </a>
                ) : (
                  <p className="text-sm text-zinc-600">Link não informado</p>
                )}
              </div>
            </div>
            <details className="mt-2 text-sm text-zinc-600">
              <summary className="w-fit cursor-pointer py-3 font-medium text-zinc-700">
                Detalhes da licitação
              </summary>
              <p className="max-w-4xl whitespace-pre-line break-words">{item.objetoCompra}</p>
              {item.informacaoComplementar && (
                <p className="mt-2 max-w-4xl whitespace-pre-line break-words">
                  {item.informacaoComplementar}
                </p>
              )}
              <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt>Publicação</dt>
                  <dd className="mt-1 text-zinc-800">{dataLabel(item.dataPublicacaoPncp)}</dd>
                </div>
                <div>
                  <dt>Abertura da proposta</dt>
                  <dd className="mt-1 text-zinc-800">{dataLabel(item.dataAberturaProposta)}</dd>
                </div>
                <div>
                  <dt>Última atualização</dt>
                  <dd className="mt-1 text-zinc-800">
                    {item.dataAtualizacao && !Number.isNaN(Date.parse(item.dataAtualizacao))
                      ? formatDate(item.dataAtualizacao)
                      : "Não informada"}
                  </dd>
                </div>
                <div>
                  <dt>Número de controle PNCP</dt>
                  <dd className="mt-1 break-all text-zinc-800">{item.numeroControlePNCP}</dd>
                </div>
              </dl>
            </details>
          </article>
        ))}
      </div>
      {totalPages > 1 && (
        <nav
          aria-label="Páginas dos resultados encontrados"
          className="flex items-center justify-between gap-2"
        >
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => mudarPagina(currentPage - 1)}
            className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-zinc-500 bg-white px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Anterior
          </button>
          <span className="text-sm tabular-nums text-zinc-600">
            Página {currentPage} de {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => mudarPagina(currentPage + 1)}
            className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-zinc-500 bg-white px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            Próxima
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </nav>
      )}
    </div>
  )
}
