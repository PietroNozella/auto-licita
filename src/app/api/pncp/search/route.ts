import { NextRequest, NextResponse } from "next/server"
import {
  buscarContratacoesPorPublicacao,
  buscarContratacoesComPropostaAberta,
  buscarContratacoesPorAtualizacao,
  buscarDetalheContratacao,
} from "@/lib/pncp-api"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get("tipo") ?? "publicacao"
    const dataInicial = searchParams.get("dataInicial") ?? ""
    const dataFinal = searchParams.get("dataFinal") ?? ""
    const pagina = parseInt(searchParams.get("pagina") ?? "1")
    const tamanhoPagina = parseInt(searchParams.get("tamanhoPagina") ?? "50")

    const params = {
      dataInicial,
      dataFinal,
      codigoModalidadeContratacao: searchParams.get("codigoModalidadeContratacao")
        ? parseInt(searchParams.get("codigoModalidadeContratacao")!)
        : undefined,
      uf: searchParams.get("uf") ?? undefined,
      cnpj: searchParams.get("cnpj") ?? undefined,
      pagina,
      tamanhoPagina,
    }

    let data
    switch (tipo) {
      case "abertas":
        data = await buscarContratacoesComPropostaAberta(dataFinal || dataInicial, params)
        break
      case "atualizacao":
        data = await buscarContratacoesPorAtualizacao({
          ...params,
          codigoModalidadeContratacao: params.codigoModalidadeContratacao ?? -1,
        })
        break
      case "detalhe": {
        const cnpj = searchParams.get("cnpj") ?? ""
        const ano = parseInt(searchParams.get("ano") ?? "0")
        const sequencial = parseInt(searchParams.get("sequencial") ?? "0")
        if (!cnpj || !ano || !sequencial) {
          return NextResponse.json(
            { error: "cnpj, ano e sequencial sao obrigatorios para detalhe" },
            { status: 400 }
          )
        }
        data = await buscarDetalheContratacao(cnpj, ano, sequencial)
        break
      }
      default:
        data = await buscarContratacoesPorPublicacao({
          ...params,
          codigoModalidadeContratacao: params.codigoModalidadeContratacao ?? -1,
        })
    }

    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
