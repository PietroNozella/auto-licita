import { NextRequest, NextResponse } from "next/server"
import { buscarContratacoesPorPublicacao } from "@/lib/pncp-api"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dataInicial = searchParams.get("dataInicial") ?? ""
    const dataFinal = searchParams.get("dataFinal") ?? ""
    const pagina = parseInt(searchParams.get("pagina") ?? "1", 10)
    const tamanhoPagina = parseInt(searchParams.get("tamanhoPagina") ?? "50", 10)

    if (!/^\d{8}$/.test(dataInicial) || !/^\d{8}$/.test(dataFinal)) {
      return NextResponse.json({ error: "dataInicial e dataFinal devem usar AAAAMMDD" }, { status: 400 })
    }
    if (!Number.isInteger(pagina) || pagina < 1) {
      return NextResponse.json({ error: "pagina inválida" }, { status: 400 })
    }
    if (!Number.isInteger(tamanhoPagina) || tamanhoPagina < 1 || tamanhoPagina > 500) {
      return NextResponse.json({ error: "tamanhoPagina inválido" }, { status: 400 })
    }

    // Máscara é aceita na entrada; a API consultada só opera com dígitos.
    const cnpj = (searchParams.get("cnpj") ?? "").replace(/\D/g, "") || undefined

    const data = await buscarContratacoesPorPublicacao({
      dataInicial,
      dataFinal,
      codigoModalidadeContratacao: searchParams.get("codigoModalidadeContratacao")
        ? parseInt(searchParams.get("codigoModalidadeContratacao")!, 10)
        : undefined,
      uf: searchParams.get("uf") ?? undefined,
      cnpj,
      pagina,
      tamanhoPagina,
    })

    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
