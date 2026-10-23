import assert from "node:assert/strict"
import { test } from "node:test"
import { createClient } from "@supabase/supabase-js"
import { carregarModulo } from "./helpers/carregar-modulo.mjs"

for (const falha of ["retornada", "excecao", null]) {
  test(`logout trata ${falha ?? "sucesso"} sem informar saída indevida`, async () => {
    const route = carregarModulo("src/app/api/auth/logout/route.ts", {
      "next/server": { NextResponse: Response },
      "@/lib/supabase-server": {
        getSupabaseServer: async () => ({ auth: { signOut: async () => {
          if (falha === "excecao") throw new Error("Sem conexão")
          return { error: falha ? new Error("Falha na revogação") : null }
        } } }),
      },
    })
    const response = await route.POST()
    const data = await response.json()
    assert.equal(response.status, falha ? 503 : 200)
    assert.equal(data.success, falha ? undefined : true)
    if (falha) assert.match(data.error, /Tente novamente/)
  })
}

const monitorId = "00000000-0000-4000-8000-000000000001"
const registros = Array.from({ length: 150 }, (_, i) => ({ id: `resultado-${i}`, notificado: i < 100 }))

function rotaHistorico(usuario = "usuario-1") {
  const consultas = []
  const banco = createClient("https://teste.supabase.co", "teste", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (url, options) => {
      const consulta = new URL(url)
      consultas.push(consulta)
      if (consulta.pathname.endsWith("/monitoramentos")) {
        assert.equal(consulta.searchParams.get("user_id"), "eq.usuario-1")
        return Response.json([{ id: monitorId }])
      }
      assert.equal(consulta.searchParams.get("monitoramento_id"), `eq.${monitorId}`)
      if (options.method === "HEAD") {
        return new Response(null, { headers: { "content-range": "*/50" } })
      }
      assert.equal(consulta.searchParams.get("order"), "data_publicacao.desc.nullslast,id.desc")
      const inicio = Number(consulta.searchParams.get("offset") ?? 0)
      const tamanho = Number(consulta.searchParams.get("limit"))
      return Response.json(registros.slice(inicio, inicio + tamanho), {
        headers: { "content-range": `${inicio}-${Math.min(149, inicio + tamanho - 1)}/150` },
      })
    } },
  })
  banco.auth.getUser = async () => ({ data: { user: usuario ? { id: usuario } : null } })
  const route = carregarModulo("src/app/api/monitor/resultados/route.ts", {
    "next/server": { NextResponse: Response },
    "@/lib/supabase-server": { getSupabaseServer: async () => banco },
  })
  return { route, consultas }
}

test("histórico permite acessar e identificar as não lidas além das 100 primeiras", async () => {
  const { route } = rotaHistorico()
  const primeira = await (await route.GET(new Request("https://teste/api/monitor/resultados"))).json()
  const segunda = await (await route.GET(new Request(`https://teste/api/monitor/resultados?monitoramentoId=${monitorId}&pagina=2`))).json()
  assert.equal(primeira.resultados[monitorId].length, 100)
  assert.equal(segunda.resultados[monitorId].length, 50)
  assert.equal(segunda.resultados[monitorId][0].id, "resultado-100")
  assert.ok(segunda.resultados[monitorId].every((item) => !item.notificado))
  assert.equal(segunda.naoLidas[monitorId], 50)
  assert.equal(segunda.totais[monitorId], 150)
})

test("paginação recusa monitoramento de outro usuário sem consultar suas publicações", async () => {
  const { route, consultas } = rotaHistorico()
  const response = await route.GET(new Request("https://teste/api/monitor/resultados?monitoramentoId=00000000-0000-4000-8000-000000000002&pagina=2"))
  assert.equal(response.status, 404)
  assert.ok(consultas.every((url) => url.pathname.endsWith("/monitoramentos")))
})

test("histórico recusa sessão ausente e parâmetros de paginação inválidos", async () => {
  const { route, consultas } = rotaHistorico(null)
  assert.equal((await route.GET(new Request("https://teste/api/monitor/resultados"))).status, 401)
  assert.equal(consultas.length, 0)
  for (const params of ["pagina=0", "pagina=1.5", "pagina=2", "pagina=Infinity", "monitoramentoId=invalido"]) {
    const autenticada = rotaHistorico()
    const response = await autenticada.route.GET(new Request(`https://teste/api/monitor/resultados?${params}`))
    assert.equal(response.status, 400)
    assert.equal(autenticada.consultas.length, 0)
  }
})
