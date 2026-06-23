import type { RecuperarCompraPublicacaoDTO } from "@/types/pncp"
import { formatCurrency, formatDate } from "@/lib/utils"
import { ExternalLink } from "lucide-react"

interface ResultsTableProps {
  data: RecuperarCompraPublicacaoDTO[]
  total?: number
  hasSearched?: boolean
}

function getEstimatedValue(item: RecuperarCompraPublicacaoDTO) {
  return item.valorTotalEstimado != null ? formatCurrency(item.valorTotalEstimado) : "-"
}

export function ResultsTable({ data, total, hasSearched = true }: ResultsTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-400">
        <p className="text-lg text-zinc-500">
          {hasSearched ? "Nenhuma licitação encontrada" : "Faça uma busca para listar licitações"}
        </p>
        <p className="text-sm mt-1">
          {hasSearched ? "Tente ajustar os filtros da busca" : "Use palavra-chave, período e filtros para consultar o PNCP"}
        </p>
      </div>
    )
  }

  return (
    <div>
      {total !== undefined && (
        <p className="text-sm text-zinc-500 mb-3">
          {total} licitação{total !== 1 ? "ões" : ""} encontrada{total !== 1 ? "s" : ""}
        </p>
      )}

      <div className="space-y-3 md:hidden">
        {data.map((item) => (
          <article key={item.numeroControlePNCP} className="rounded-lg border border-zinc-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-medium text-zinc-800">{item.objetoCompra}</h3>
                <p className="text-xs text-zinc-500 mt-1">{item.orgaoEntidade?.razaoSocial ?? "Órgão não informado"}</p>
              </div>
              {item.linkSistemaOrigem && (
                <a
                  href={item.linkSistemaOrigem}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-blue-600 hover:text-blue-800"
                  aria-label={`Abrir edital de ${item.objetoCompra}`}
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500">
              <span className="rounded bg-blue-50 px-2 py-0.5 font-medium text-blue-700">{item.modalidadeNome}</span>
              <span>{item.unidadeOrgao?.ufSigla ?? "UF não informada"}</span>
              <span className="font-mono">{getEstimatedValue(item)}</span>
              <span>{item.dataPublicacaoPncp ? formatDate(item.dataPublicacaoPncp) : "Sem publicação"}</span>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200">
              <th scope="col" className="text-left py-3 px-4 font-medium text-zinc-500">Objeto</th>
              <th scope="col" className="text-left py-3 px-4 font-medium text-zinc-500">Órgão</th>
              <th scope="col" className="text-left py-3 px-4 font-medium text-zinc-500">Modalidade</th>
              <th scope="col" className="text-left py-3 px-4 font-medium text-zinc-500">UF</th>
              <th scope="col" className="text-right py-3 px-4 font-medium text-zinc-500">Valor Estimado</th>
              <th scope="col" className="text-left py-3 px-4 font-medium text-zinc-500">Publicação</th>
              <th scope="col" className="text-left py-3 px-4 font-medium text-zinc-500">Abertura</th>
              <th scope="col" className="text-center py-3 px-4 font-medium text-zinc-500">Link</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.numeroControlePNCP} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                <td className="py-3 px-4 max-w-xs">
                  <p className="truncate font-medium text-zinc-800" title={item.objetoCompra ?? undefined}>
                    {item.objetoCompra}
                  </p>
                  {item.numeroCompra && (
                    <p className="text-xs text-zinc-400 mt-0.5">{item.numeroCompra}</p>
                  )}
                </td>
                <td className="py-3 px-4">
                  <p className="truncate max-w-[200px]" title={item.orgaoEntidade?.razaoSocial ?? undefined}>
                    {item.orgaoEntidade?.razaoSocial ?? "-"}
                  </p>
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                    {item.modalidadeNome}
                  </span>
                </td>
                <td className="py-3 px-4 text-zinc-600">{item.unidadeOrgao?.ufSigla ?? "-"}</td>
                <td className="py-3 px-4 text-right font-mono text-sm">
                  {getEstimatedValue(item)}
                </td>
                <td className="py-3 px-4 text-zinc-600 text-xs">
                  {item.dataPublicacaoPncp ? formatDate(item.dataPublicacaoPncp) : "-"}
                </td>
                <td className="py-3 px-4 text-zinc-600 text-xs">
                  {item.dataAberturaProposta ? formatDate(item.dataAberturaProposta) : "-"}
                </td>
                <td className="py-3 px-4 text-center">
                  {item.linkSistemaOrigem && (
                    <a
                      href={item.linkSistemaOrigem}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800"
                      aria-label={`Abrir edital de ${item.objetoCompra}`}
                      title="Abrir edital"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
