import { NextRequest, NextResponse } from "next/server"
import { buscarContratacoesPorPublicacao, extrairTermosBusca, itemContemAlgumTermo, MODALIDADES, UF_LIST } from "@/lib/pncp-api"

function dataValida(valor: string): boolean {
  if (!/^\d{8}$/.test(valor)) return false
  const iso = `${valor.slice(0, 4)}-${valor.slice(4, 6)}-${valor.slice(6, 8)}`
  const data = new Date(`${iso}T00:00:00Z`)
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === iso
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dataInicial = searchParams.get("dataInicial") ?? ""
    const dataFinal = searchParams.get("dataFinal") ?? ""
    const pagina = Number(searchParams.get("pagina") ?? "1")
    const tamanhoPagina = Number(searchParams.get("tamanhoPagina") ?? "50")
    const modalidade = searchParams.get("codigoModalidadeContratacao")
    const codigoModalidadeContratacao = modalidade ? Number(modalidade) : undefined
    const uf = searchParams.get("uf")?.toUpperCase() || undefined

    if (!dataValida(dataInicial) || !dataValida(dataFinal)) {
      return NextResponse.json({ error: "Informe datas válidas no formato AAAAMMDD" }, { status: 400 })
    }
    if (dataInicial > dataFinal) {
      return NextResponse.json({ error: "A data inicial deve ser anterior ou igual à data final" }, { status: 400 })
    }
    if (!Number.isInteger(pagina) || pagina < 1) {
      return NextResponse.json({ error: "pagina inválida" }, { status: 400 })
    }
    if (!Number.isInteger(tamanhoPagina) || tamanhoPagina < 1 || tamanhoPagina > 50) {
      return NextResponse.json({ error: "tamanhoPagina deve estar entre 1 e 50" }, { status: 400 })
    }
    if (codigoModalidadeContratacao !== undefined && !MODALIDADES.some((m) => m.id === codigoModalidadeContratacao)) {
      return NextResponse.json({ error: "Modalidade inválida" }, { status: 400 })
    }
    if (uf && !UF_LIST.includes(uf)) {
      return NextResponse.json({ error: "UF inválida" }, { status: 400 })
    }

    // Máscara é aceita na entrada; a API consultada só opera com dígitos.
    const cnpj = (searchParams.get("cnpj") ?? "").replace(/\D/g, "") || undefined
    if (cnpj && cnpj.length !== 14) {
      return NextResponse.json({ error: "O CNPJ do órgão deve conter 14 dígitos" }, { status: 400 })
    }

    const data = await buscarContratacoesPorPublicacao({
      dataInicial,
      dataFinal,
      codigoModalidadeContratacao,
      uf,
      cnpj,
      pagina,
      tamanhoPagina,
    }, AbortSignal.any([request.signal, AbortSignal.timeout(25_000)]))

    const termos = extrairTermosBusca(searchParams.get("q") ?? "")
    const itens = data.data ?? []
    return NextResponse.json({
      ...data,
      data: termos.length > 0 ? itens.filter((item) => itemContemAlgumTermo(item, termos)) : itens,
      registrosConsultados: itens.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
