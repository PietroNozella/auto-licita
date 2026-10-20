import assert from "node:assert/strict"
import { test } from "node:test"
import { carregarModulo } from "./helpers/carregar-modulo.mjs"

const pncp = carregarModulo("src/lib/pncp-api.ts")
const cliente = carregarModulo("src/lib/busca-licitacoes.ts")
const filtros = { query: "computador", dataInicial: "20261019", dataFinal: "20261019", modalidade: "6", uf: "SP", cnpj: "" }
const item = { numeroControlePNCP: "licitacao-1", objetoCompra: "Aquisição de equipamentos de informática", dataPublicacaoPncp: "2026-10-19" }

function carregarRota(consultar) {
  return carregarModulo("src/app/api/pncp/search/route.ts", {
    "next/server": { NextResponse: Response },
    "@/lib/pncp-api": { ...pncp, buscarContratacoesPorPublicacao: consultar },
  })
}

test("palavras-chave ignoram acentos e caixa, em todos os campos pesquisados", () => {
  assert.equal(pncp.itemContemAlgumTermo(item, ["INFORMATICA"]), true)
  assert.equal(pncp.itemContemAlgumTermo({ informacaoComplementar: "Manutenção preventiva" }, ["manutencao"]), true)
  assert.equal(pncp.itemContemAlgumTermo({ orgaoEntidade: { razaoSocial: "Fundação Municipal" } }, ["fundacao"]), true)
  assert.equal(pncp.itemContemAlgumTermo(item, ["merenda"]), false)
  assert.equal(pncp.itemContemAlgumTermo(item, [" "]), false)
})

test("espaços, tabulações e separadores não criam termos vazios; regra continua sendo qualquer palavra", () => {
  const termos = pncp.extrairTermosBusca("  ESCOLAR\t informática, limpeza; ")
  assert.equal(JSON.stringify(termos), JSON.stringify(["escolar", "informatica", "limpeza"]))
  assert.equal(pncp.itemContemAlgumTermo(item, termos), true)
})

test("API combina período, modalidade, UF, CNPJ e palavras sem perder metadados de paginação", async () => {
  let recebidos
  const rota = carregarRota(async (params, signal) => {
    recebidos = params
    assert.ok(signal instanceof AbortSignal)
    return { data: [item, { ...item, numeroControlePNCP: "outro", objetoCompra: "Serviço de limpeza" }],
      totalRegistros: 51, paginasRestantes: 1, numeroPagina: 1 }
  })
  const response = await rota.GET(new Request("https://teste/api/pncp/search?dataInicial=20261019&dataFinal=20261019&codigoModalidadeContratacao=6&uf=sp&cnpj=45.331.188/0001-99&q=INFORMATICA"))
  const body = await response.json()
  assert.equal(response.status, 200)
  assert.equal(recebidos.uf, "SP")
  assert.equal(recebidos.cnpj, "45331188000199")
  assert.equal(recebidos.codigoModalidadeContratacao, 6)
  assert.equal(recebidos.dataInicial, "20261019")
  assert.equal(recebidos.dataFinal, "20261019")
  assert.equal(body.data.length, 1)
  assert.equal(body.data[0].numeroControlePNCP, item.numeroControlePNCP)
  assert.equal(body.registrosConsultados, 2)
  assert.equal(body.totalRegistros, 51)
  assert.equal(body.paginasRestantes, 1)
})

test("filtros inválidos são recusados antes de consultar a fonte", async () => {
  const rota = carregarRota(() => assert.fail("Não deveria consultar a fonte"))
  for (const parametro of ["dataInicial=20260230", "dataInicial=20261020", "uf=XX", "cnpj=123", "codigoModalidadeContratacao=99", "codigoModalidadeContratacao=6abc", "pagina=1abc", "tamanhoPagina=51"]) {
    const params = new URLSearchParams({ dataInicial: "20261019", dataFinal: "20261019" })
    const [chave, valor] = parametro.split("=")
    params.set(chave, valor)
    const response = await rota.GET(new Request(`https://teste/api/pncp/search?${params}`))
    assert.equal(response.status, 400, parametro)
  }
})

test("lote não encerra por falta de palavras na primeira página e permite consultar as restantes", async () => {
  const paginas = []
  const consultar = async (url) => {
    const params = new URL(url, "https://teste").searchParams
    const pagina = Number(params.get("pagina"))
    paginas.push(pagina)
    assert.equal(params.get("q"), filtros.query)
    assert.equal(params.get("uf"), "SP")
    assert.equal(params.get("codigoModalidadeContratacao"), "6")
    return Response.json({ data: pagina === 4 ? [item] : [], registrosConsultados: pagina === 4 ? 1 : 50,
      totalRegistros: 151, paginasRestantes: 4 - pagina })
  }
  const primeiro = await cliente.buscarLoteLicitacoes(filtros, 1, new AbortController().signal, consultar)
  assert.equal(primeiro.itens.length, 0)
  assert.equal(primeiro.registrosConsultados, 150)
  assert.equal(primeiro.proximaPagina, 4)
  const restante = await cliente.buscarLoteLicitacoes(filtros, primeiro.proximaPagina, new AbortController().signal, consultar)
  assert.equal(restante.itens[0].numeroControlePNCP, item.numeroControlePNCP)
  assert.equal(restante.proximaPagina, null)
  assert.deepEqual(paginas, [1, 2, 3, 4])
})

test("falha numa página preserva resultados anteriores e retoma a própria página que falhou", async () => {
  const resultado = await cliente.buscarLoteLicitacoes(filtros, 1, new AbortController().signal, async (url) => {
    if (new URL(url, "https://teste").searchParams.get("pagina") === "2") throw new Error("Falha de rede")
    return Response.json({ data: [item], registrosConsultados: 50, totalRegistros: 80, paginasRestantes: 1 })
  })
  assert.equal(resultado.itens.length, 1)
  assert.equal(resultado.proximaPagina, 2)
  assert.match(resultado.erro, /Falha de rede/)
})

test("lote preserva a indicação de fonte parcial e remove itens repetidos", async () => {
  const resultado = await cliente.buscarLoteLicitacoes(filtros, 1, new AbortController().signal, async (url) => {
    const pagina = Number(new URL(url, "https://teste").searchParams.get("pagina"))
    return Response.json({ data: [item], registrosConsultados: 1, totalRegistros: 2, paginasRestantes: 2 - pagina, parcial: pagina === 1 })
  })
  assert.equal(resultado.itens.length, 1)
  assert.equal(resultado.parcial, true)
  assert.equal(resultado.proximaPagina, null)
})
