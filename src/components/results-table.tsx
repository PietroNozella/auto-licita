"use client"

import { useMemo, useState } from "react"
import type { RecuperarCompraPublicacaoDTO } from "@/types/pncp"
import { formatCurrency, formatDate, formatDateShort } from "@/lib/utils"
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, Landmark, MapPin } from "lucide-react"

interface ResultsTableProps {
  data: RecuperarCompraPublicacaoDTO[]
  total?: number
  hasSearched?: boolean
  pageSize?: number
}

function getEstimatedValue(item: RecuperarCompraPublicacaoDTO) {
  return item.valorTotalEstimado != null ? formatCurrency(item.valorTotalEstimado) : "Valor não informado"
}

function getDateLabel(dateString?: string) {
  return dateString ? formatDateShort(dateString) : "Não informado"
}

function getPageItems(data: RecuperarCompraPublicacaoDTO[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize
  return data.slice(start, start + pageSize)
}

export function ResultsTable({ data, total, hasSearched = true, pageSize = 8 }: ResultsTableProps) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageItems = useMemo(() => getPageItems(data, currentPage, pageSize), [data, currentPage, pageSize])
  const startItem = data.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, data.length)

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/70 px-4 py-12 text-center">
        <p className="text-base font-medium text-zinc-600">
          {hasSearched ? "Nenhuma licitação encontrada" : "Faça uma busca para listar licitações"}
        </p>
        <p className="text-sm text-zinc-400 mt-1">
          {hasSearched ? "Tente ajustar os filtros da busca" : "Use palavra-chave, período e filtros para consultar o PNCP"}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 border-b border-zinc-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-500">
          Exibindo <span className="font-medium text-zinc-700">{startItem}-{endItem}</span> de{" "}
          <span className="font-medium text-zinc-700">{total ?? data.length}</span> licitação{(total ?? data.length) !== 1 ? "ões" : ""}
        </p>
        {totalPages > 1 && (
          <p className="text-xs text-zinc-400">Página {currentPage} de {totalPages}</p>
        )}
      </div>

      <div className="space-y-3">
        {pageItems.map((item) => (
          <article key={item.numeroControlePNCP} className="rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-blue-200 hover:bg-blue-50/20">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">{item.modalidadeNome}</span>
                  {item.unidadeOrgao?.ufSigla && (
                    <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      {item.unidadeOrgao.ufSigla}
                    </span>
                  )}
                  {item.situacaoCompraNome && (
                    <span className="rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-600">{item.situacaoCompraNome}</span>
                  )}
                </div>

                <h3 className="mt-3 text-base font-semibold leading-snug text-zinc-800">
                  {item.objetoCompra}
                </h3>

                <div className="mt-3 flex flex-col gap-1.5 text-sm text-zinc-500 sm:flex-row sm:flex-wrap sm:gap-x-4">
                  <span className="inline-flex items-center gap-1.5">
                    <Landmark className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                    {item.orgaoEntidade?.razaoSocial ?? "Órgão não informado"}
                  </span>
                  {item.unidadeOrgao?.municipioNome && (
                    <span>{item.unidadeOrgao.municipioNome}</span>
                  )}
                  {item.numeroCompra && <span className="font-mono text-xs">Compra {item.numeroCompra}</span>}
                </div>
              </div>

              <div className="grid shrink-0 grid-cols-2 gap-3 rounded-lg bg-zinc-50 p-3 text-sm lg:w-80">
                <div>
                  <p className="text-xs text-zinc-400">Valor estimado</p>
                  <p className="mt-1 font-mono font-semibold text-zinc-800">{getEstimatedValue(item)}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Publicação</p>
                  <p className="mt-1 text-zinc-700">{getDateLabel(item.dataPublicacaoPncp)}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Abertura</p>
                  <p className="mt-1 text-zinc-700">{getDateLabel(item.dataAberturaProposta)}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Encerramento</p>
                  <p className="mt-1 text-zinc-700">{getDateLabel(item.dataEncerramentoProposta)}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 border-t border-zinc-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                Atualizado em {item.dataAtualizacao ? formatDate(item.dataAtualizacao) : "data não informada"}
              </div>
              {item.linkSistemaOrigem && (
                <a
                  href={item.linkSistemaOrigem}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-md border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                  aria-label={`Abrir edital de ${item.objetoCompra}`}
                >
                  Abrir edital
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              )}
            </div>
          </article>
        ))}
      </div>

      {totalPages > 1 && (
        <nav className="flex flex-col gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-between" aria-label="Paginação de licitações">
          <p className="text-sm text-zinc-500">
            {data.length} resultado{data.length !== 1 ? "s" : ""} nesta busca
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Anterior
            </button>
            <span className="min-w-20 text-center text-sm text-zinc-500">
              {currentPage}/{totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Próxima
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </nav>
      )}
    </div>
  )
}