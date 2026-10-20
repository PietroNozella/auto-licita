import assert from "node:assert/strict"
import { mkdirSync, writeFileSync } from "node:fs"
import { carregarModulo } from "../tests/helpers/carregar-modulo.mjs"

const data = process.argv[2] ?? "20261019"
const base = "https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao"
const normalizar = (texto) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
const ids = (itens) => itens.map((item) => item.numeroControlePNCP).sort()
const cache = new Map()

// Cache apenas desta execução, para não repetir as mesmas consultas para cada palavra.
async function consultarFonte(url, options) {
  const chave = new URL(url).searchParams
  chave.sort()
  const key = chave.toString()
  if (!cache.has(key)) {
    const response = await fetch(url, { ...options, signal: options?.signal ?? AbortSignal.timeout(15_000) })
    const texto = await response.text()
    if (response.status !== 204 && !response.ok) throw new Error(`Fonte respondeu ${response.status}: ${texto.slice(0, 200)}`)
    cache.set(key, { texto, status: response.status })
  }
  const { texto, status } = cache.get(key)
  return new Response(status === 204 ? null : texto, { status, headers: { "Content-Type": "application/json" } })
}

async function referencia(cnpj = "", modalidade = "6", uf = "SP") {
  const itens = []
  let total = 0
  const modalidades = modalidade ? [modalidade] : Array.from({ length: 13 }, (_, i) => String(i + 1))
  for (const codigo of modalidades) {
    for (let pagina = 1; pagina <= 50; pagina++) {
      const params = new URLSearchParams({ dataInicial: data, dataFinal: data, codigoModalidadeContratacao: codigo, uf, pagina: String(pagina), tamanhoPagina: "50" })
      if (cnpj) params.set("cnpj", cnpj)
      const response = await consultarFonte(`${base}?${params}`)
      if (response.status === 204) break
      const body = await response.json()
      if (pagina === 1) total += body.totalRegistros
      itens.push(...body.data)
      if (body.paginasRestantes === 0) break
      assert.ok(pagina < 50, "A referência excede o limite do teste; escolha um período menor")
    }
  }
  assert.equal(itens.length, total, "A referência deve recuperar todas as páginas")
  return itens
}

const pncp = carregarModulo("src/lib/pncp-api.ts", {}, { fetch: consultarFonte })
const rota = carregarModulo("src/app/api/pncp/search/route.ts", {
  "next/server": { NextResponse: Response }, "@/lib/pncp-api": pncp,
})
const cliente = carregarModulo("src/lib/busca-licitacoes.ts")
const todos = await referencia()
assert.ok(todos.length > 50, "Escolha uma data com mais de uma página para testar a regressão")

const casos = [
  { query: "computador", cnpj: "" },
  { query: "escolar", cnpj: "" },
  { query: "INFORMÁTICA", cnpj: "" },
  { query: " limpeza\t escolar ", cnpj: "" },
  { query: "", cnpj: todos[0].orgaoEntidade.cnpj },
  { query: "", cnpj: todos[0].orgaoEntidade.cnpj, modalidade: "" },
  { query: "computador", cnpj: "", uf: "PR" },
].map((caso) => ({ modalidade: "6", uf: "SP", ...caso }))
const resultados = []
for (const caso of casos) {
  const universo = caso.cnpj || caso.modalidade !== "6" || caso.uf !== "SP"
    ? await referencia(caso.cnpj, caso.modalidade, caso.uf) : todos
  const palavras = normalizar(caso.query).trim().split(/\s+/).filter(Boolean)
  const esperados = universo.filter((item) => palavras.length === 0 || palavras.some((palavra) =>
    normalizar([item.objetoCompra, item.informacaoComplementar, item.orgaoEntidade?.razaoSocial].filter(Boolean).join(" ")).includes(palavra)))
  const obtidos = new Map()
  let pagina = 1
  let consultados = 0
  let lotes = 0
  do {
    const lote = await cliente.buscarLoteLicitacoes({ ...caso, dataInicial: data, dataFinal: data }, pagina,
      AbortSignal.timeout(30_000), (url) => rota.GET(new Request(`https://teste${url}`)))
    assert.equal(lote.parcial, false)
    assert.equal(lote.erro, undefined)
    for (const item of lote.itens) obtidos.set(item.numeroControlePNCP, item)
    consultados += lote.registrosConsultados
    pagina = lote.proximaPagina
    lotes++
  } while (pagina !== null && lotes < 20)
  assert.equal(pagina, null, "A busca deve chegar à última página")
  assert.deepEqual(ids([...obtidos.values()]), ids(esperados), "Os IDs retornados devem coincidir exatamente com a referência")
  assert.equal(consultados, universo.length)
  assert.ok(universo.every((item) => (!caso.modalidade || item.modalidadeId === Number(caso.modalidade)) && item.unidadeOrgao.ufSigla === caso.uf && item.dataPublicacaoPncp.startsWith(`${data.slice(0, 4)}-${data.slice(4, 6)}-${data.slice(6, 8)}`)))
  if (caso.cnpj) assert.ok(universo.every((item) => item.orgaoEntidade.cnpj === caso.cnpj))
  resultados.push({ ...caso, esperados: esperados.length, obtidos: obtidos.size, publicacoesConsultadas: consultados, lotes, aprovado: true })
}
mkdirSync("output", { recursive: true })
const relatorio = { executadoEm: new Date().toISOString(), data, modalidade: 6, uf: "SP", universo: todos.length, resultados }
writeFileSync("output/validacao-busca.json", JSON.stringify(relatorio, null, 2) + "\n")
console.log(JSON.stringify(relatorio, null, 2))
