import type { RecuperarCompraPublicacaoDTO } from "@/types/pncp"
import { instantePrazo } from "@/lib/prazo"

export type OrdemResultados = "publicacao" | "encerramento" | "valor"

export function ordenarLicitacoes(data: RecuperarCompraPublicacaoDTO[], ordem: OrdemResultados, now: number) {
  return [...data].sort((a, b) => {
    if (ordem === "valor")
      return (b.valorTotalEstimado ?? -Infinity) - (a.valorTotalEstimado ?? -Infinity) || 0
    if (ordem === "encerramento") {
      const prazoA = instantePrazo(a.dataEncerramentoProposta)
      const prazoB = instantePrazo(b.dataEncerramentoProposta)
      if (prazoA === null || prazoB === null) return prazoA === prazoB ? 0 : prazoA === null ? 1 : -1
      const encerradoA = prazoA <= now
      const encerradoB = prazoB <= now
      if (encerradoA !== encerradoB) return encerradoA ? 1 : -1
      return encerradoA ? prazoB - prazoA : prazoA - prazoB
    }
    return (b.dataPublicacaoPncp ?? "").localeCompare(a.dataPublicacaoPncp ?? "")
  })
}
