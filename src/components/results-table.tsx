import type { RecuperarCompraPublicacaoDTO } from "@/types/pncp"
import { formatCurrency, formatDate } from "@/lib/utils"
import { ExternalLink } from "lucide-react"

interface ResultsTableProps {
  data: RecuperarCompraPublicacaoDTO[]
  total?: number
}

export function ResultsTable({ data, total }: ResultsTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-400">
        <p className="text-lg">Nenhuma licitação encontrada</p>
        <p className="text-sm mt-1">Tente ajustar os filtros da busca</p>
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
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200">
              <th className="text-left py-3 px-4 font-medium text-zinc-500">Objeto</th>
              <th className="text-left py-3 px-4 font-medium text-zinc-500">Órgão</th>
              <th className="text-left py-3 px-4 font-medium text-zinc-500">Modalidade</th>
              <th className="text-left py-3 px-4 font-medium text-zinc-500">UF</th>
              <th className="text-right py-3 px-4 font-medium text-zinc-500">Valor Estimado</th>
              <th className="text-left py-3 px-4 font-medium text-zinc-500">Publicação</th>
              <th className="text-left py-3 px-4 font-medium text-zinc-500">Abertura</th>
              <th className="text-center py-3 px-4 font-medium text-zinc-500">Link</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.numeroControlePNCP} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                <td className="py-3 px-4 max-w-xs">
                  <p className="truncate font-medium text-zinc-800" title={item.objetoCompra}>
                    {item.objetoCompra}
                  </p>
                  {item.numeroCompra && (
                    <p className="text-xs text-zinc-400 mt-0.5">{item.numeroCompra}</p>
                  )}
                </td>
                <td className="py-3 px-4">
                  <p className="truncate max-w-[200px]" title={item.orgaoEntidade?.razaoSocial}>
                    {item.orgaoEntidade?.razaoSocial}
                  </p>
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                    {item.modalidadeNome}
                  </span>
                </td>
                <td className="py-3 px-4 text-zinc-600">{item.unidadeOrgao?.ufSigla}</td>
                <td className="py-3 px-4 text-right font-mono text-sm">
                  {item.valorTotalEstimado ? formatCurrency(item.valorTotalEstimado) : "-"}
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
                      title="Abrir edital"
                    >
                      <ExternalLink className="h-4 w-4" />
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
