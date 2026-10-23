import assert from "node:assert/strict"
import { test } from "node:test"
import { createClient } from "@supabase/supabase-js"
import { carregarModulo } from "./helpers/carregar-modulo.mjs"

const item = {
  numeroControlePNCP: "12345678000190-1-000001/2026",
  objetoCompra: "Equipamentos",
  dataPublicacaoPncp: "2026-10-20",
}
const parametros = { dataInicial: "20261020", dataFinal: "20261020", pagina: 1 }
const monitores = ["primeiro", "segundo", "terceiro"].map((id) => ({
  id, palavras_chave: [], modalidade_id: 6, uf: null, cnpj_orgao: null,
}))
const respostaPncp = (data = []) => Response.json({ data, paginasRestantes: 0 })

function aguardarCancelamento(signal) {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted()
    signal.addEventListener("abort", () => reject(signal.reason), { once: true })
  })
}

function carregarMonitor(pncp) {
  return carregarModulo("src/lib/monitor-check.ts", {
    "@/lib/utils": { dataSp: () => "2026-10-20" },
    "./pncp-api": { extrairTermosBusca: carregarModulo("src/lib/pncp-api.ts").extrairTermosBusca, ...pncp },
  })
}

function bancoSimulado(fetch) {
  return createClient("https://teste.supabase.co", "chave-de-teste", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch },
  })
}

test("cancela consulta em andamento sem iniciar novas tentativas", async () => {
  const controller = new AbortController()
  let consultas = 0
  const pncp = carregarModulo("src/lib/pncp-api.ts", {}, {
    fetch: (_, { signal }) => {
      consultas++
      queueMicrotask(() => controller.abort())
      return aguardarCancelamento(signal)
    },
  })
  await assert.rejects(
    pncp.buscarContratacoesPorPublicacao({ ...parametros, codigoModalidadeContratacao: 6 }, controller.signal),
    { name: "AbortError" }
  )
  assert.equal(consultas, 1)
})

test("cancelamento interrompe também a espera entre tentativas", async () => {
  const controller = new AbortController()
  let consultas = 0
  const pncp = carregarModulo("src/lib/pncp-api.ts", {}, {
    fetch: async () => {
      consultas++
      setTimeout(() => controller.abort(), 0)
      throw new Error("Fonte indisponível")
    },
  })
  await assert.rejects(
    pncp.buscarContratacoesPorPublicacao({ ...parametros, codigoModalidadeContratacao: 6 }, controller.signal),
    { name: "AbortError" }
  )
  assert.equal(consultas, 1)
})

test("leitura do corpo da resposta respeita o cancelamento", async () => {
  const controller = new AbortController()
  const pncp = carregarModulo("src/lib/pncp-api.ts", {}, {
    fetch: async (_, { signal }) => ({
      status: 200,
      ok: true,
      json: () => {
        queueMicrotask(() => controller.abort())
        return aguardarCancelamento(signal)
      },
    }),
  })
  await assert.rejects(
    pncp.buscarContratacoesPorPublicacao({ ...parametros, codigoModalidadeContratacao: 6 }, controller.signal),
    { name: "AbortError" }
  )
})

test("cancelamento em todas as modalidades não vira resultado vazio ou parcial", async () => {
  const controller = new AbortController()
  let consultas = 0
  const pncp = carregarModulo("src/lib/pncp-api.ts", {}, {
    fetch: (_, { signal }) => {
      consultas++
      queueMicrotask(() => controller.abort())
      return aguardarCancelamento(signal)
    },
  })
  await assert.rejects(pncp.buscarContratacoesPorPublicacao(parametros, controller.signal), { name: "AbortError" })
  assert.equal(consultas, 3)
})

test("prazo já esgotado não consulta a fonte nem o banco", async () => {
  const controller = new AbortController()
  controller.abort()
  const monitor = carregarMonitor({ buscarContratacoesPorPublicacao: () => assert.fail("Consulta indevida") })
  await assert.rejects(monitor.buscarNovosDoMonitor({}, monitores[0], {
    ...parametros, signal: controller.signal,
  }), { name: "AbortError" })
})

test("consulta de duplicatas usa o mesmo sinal e não ignora cancelamento", async () => {
  const controller = new AbortController()
  const monitor = carregarMonitor({ buscarContratacoesPorPublicacao: async () => ({ data: [item], paginasRestantes: 0 }) })
  const banco = bancoSimulado((_, { signal }) => {
    assert.equal(signal, controller.signal)
    queueMicrotask(() => controller.abort())
    return aguardarCancelamento(signal)
  })
  await assert.rejects(monitor.buscarNovosDoMonitor(banco, monitores[0], {
    ...parametros, signal: controller.signal,
  }), { name: "AbortError" })
})

test("persistência é cancelada em andamento e não inicia o próximo insert", async () => {
  const controller = new AbortController()
  let gravacoes = 0
  const banco = bancoSimulado((_, { signal }) => {
    gravacoes++
    assert.equal(signal, controller.signal)
    queueMicrotask(() => controller.abort())
    return aguardarCancelamento(signal)
  })
  const monitor = carregarMonitor({})
  await assert.rejects(monitor.persistirResultados(banco, "primeiro", [item, item], controller.signal), { name: "AbortError" })
  assert.equal(gravacoes, 1)
})

test("duplicatas continuam sendo ignoradas e outros erros são propagados", async () => {
  const monitor = carregarMonitor({})
  const duplicata = bancoSimulado(async () => Response.json({ code: "23505", message: "Duplicata" }, { status: 409 }))
  assert.equal((await monitor.persistirResultados(duplicata, "primeiro", [item])).length, 0)
  const bloqueado = bancoSimulado(async () => Response.json({ code: "42501", message: "RLS" }, { status: 403 }))
  await assert.rejects(monitor.persistirResultados(bloqueado, "primeiro", [item]), /RLS/)
})

test("cron mantém só o monitor concluído como verificado e informa os restantes", async () => {
  const controller = new AbortController()
  const atualizados = []
  const statusSalvos = []
  const sinaisBanco = []
  let consultas = 0
  const banco = bancoSimulado(async (url, options) => {
    sinaisBanco.push(options.signal)
    if (options.method === "PATCH") {
      const body = JSON.parse(options.body)
      statusSalvos.push(body.status_verificacao_automatica)
      if (body.ultima_verificacao) atualizados.push(new URL(url).searchParams.get("id"))
      return new Response(null, { status: 204 })
    }
    const ordem = new URL(url).searchParams.get("order")
    assert.equal(ordem, "ultima_verificacao.asc.nullsfirst")
    return Response.json(monitores)
  })
  const pncp = carregarModulo("src/lib/pncp-api.ts", {}, {
    fetch: (_, { signal }) => {
      consultas++
      if (consultas === 1) return Promise.resolve(respostaPncp())
      queueMicrotask(() => controller.abort())
      return aguardarCancelamento(signal)
    },
  })
  const cron = carregarModulo("src/app/api/cron/verificar/route.ts", {
    "next/server": { NextResponse: Response },
    "@/lib/supabase": { getSupabaseAdmin: () => banco },
    "@/lib/monitor-check": carregarMonitor(pncp),
  }, {
    AbortSignal: { timeout: (ms) => ms === 3_000 ? AbortSignal.timeout(ms) : controller.signal },
    process: { env: { CRON_SECRET: "teste" } },
  })
  const response = await cron.GET(new Request("https://teste/api/cron/verificar", {
    headers: { authorization: "Bearer teste" },
  }))
  const body = await response.json()
  assert.equal(response.status, 200)
  assert.equal(consultas, 2)
  assert.deepEqual(atualizados, ["eq.primeiro"])
  assert.ok(sinaisBanco.slice(0, -1).every((signal) => signal === controller.signal))
  assert.notEqual(sinaisBanco.at(-1), controller.signal)
  assert.deepEqual(statusSalvos, ["completa", "erro"])
  assert.equal(body.monitoramentosProcessados, 2)
  assert.equal(body.monitoramentosPendentes, 1)
  assert.equal(body.falhas, 1)
  assert.match(body.message, /interrompida/)
})

for (const resultado of [
  { truncado: true, parcial: false },
  { truncado: false, parcial: true },
  { truncado: false, parcial: false },
]) {
  test(`cron persiste completude (truncado=${resultado.truncado}, parcial=${resultado.parcial})`, async () => {
    const atualizacoes = []
    const banco = bancoSimulado(async (_, options) => {
      if (options.method === "PATCH") {
        atualizacoes.push(JSON.parse(options.body))
        return new Response(null, { status: 204 })
      }
      return Response.json([monitores[0]])
    })
    const cron = carregarModulo("src/app/api/cron/verificar/route.ts", {
      "next/server": { NextResponse: Response },
      "@/lib/supabase": { getSupabaseAdmin: () => banco },
      "@/lib/monitor-check": {
        hojeYyyymmdd: () => "20261023",
        yyyymmddDiasAtras: () => "20261016",
        buscarNovosDoMonitor: async () => ({ itens: [], ...resultado }),
        persistirResultados: async () => [],
      },
    }, { process: { env: { CRON_SECRET: "teste" } } })
    const response = await cron.GET(new Request("https://teste/api/cron/verificar", {
      headers: { authorization: "Bearer teste" },
    }))
    const body = await response.json()
    assert.equal(response.status, 200)
    assert.equal(atualizacoes.length, 1)
    assert.equal(atualizacoes[0].status_verificacao_automatica,
      resultado.truncado || resultado.parcial ? "incompleta" : "completa")
    assert.ok(atualizacoes[0].ultima_verificacao)
    assert.equal(body.truncados, Number(resultado.truncado))
    assert.equal(body.parciais, Number(resultado.parcial))
  })
}

test("verificação manual retorna 504 e não atualiza a data se a gravação excede o prazo", async () => {
  const controller = new AbortController()
  let atualizacoes = 0
  const banco = bancoSimulado((_, options) => {
    assert.equal(options.signal, controller.signal)
    if (options.method === "POST") {
      queueMicrotask(() => controller.abort())
      return aguardarCancelamento(options.signal)
    }
    if (options.method === "PATCH") atualizacoes++
    return Promise.resolve(Response.json(options.headers.Accept?.includes("object") ? monitores[0] : []))
  })
  const pncp = carregarModulo("src/lib/pncp-api.ts", {}, { fetch: async () => respostaPncp([item]) })
  const route = carregarModulo("src/app/api/monitor/novidades-hoje/route.ts", {
    "next/server": { NextResponse: Response },
    "@/lib/supabase-server": {
      getSupabaseServer: async () => ({
        from: banco.from.bind(banco),
        auth: { getUser: async () => ({ data: { user: { id: "usuario" } } }) },
      }),
    },
    "@/lib/monitor-check": carregarMonitor(pncp),
  }, { AbortSignal: { timeout: () => controller.signal } })
  const response = await route.POST(new Request("https://teste/api/monitor/novidades-hoje", {
    method: "POST", body: JSON.stringify({ id: "primeiro" }),
  }))
  assert.equal(response.status, 504)
  assert.equal(atualizacoes, 0)
  assert.match((await response.json()).error, /tempo/)
})
