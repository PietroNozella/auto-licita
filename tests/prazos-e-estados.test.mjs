import assert from "node:assert/strict"
import { test } from "node:test"
import { createClient } from "@supabase/supabase-js"
import { carregarModulo } from "./helpers/carregar-modulo.mjs"

const prazo = carregarModulo("src/lib/prazo.ts")
const ordenar = carregarModulo("src/lib/ordenar-licitacoes.ts", { "@/lib/prazo": prazo }).ordenarLicitacoes
const now = Date.parse("2026-10-20T12:00:00-03:00")

test("prazo interpreta offset, Brasília e data sem horário sem antecipar encerramento", () => {
  assert.equal(prazo.instantePrazo("2026-10-20T13:00:00"), Date.parse("2026-10-20T16:00:00Z"))
  assert.equal(prazo.instantePrazo("2026-10-20T13:00:00Z"), Date.parse("2026-10-20T13:00:00Z"))
  assert.equal(prazo.instantePrazo("2026-10-20"), Date.parse("2026-10-20T23:59:59-03:00"))
  assert.equal(prazo.resumoPrazo("2026-10-20T12:00:00-03:00", now).label, "Prazo encerrado")
  assert.equal(prazo.resumoPrazo("2026-10-20T12:01:00-03:00", now).label, "Encerra em 1 h")
  assert.equal(prazo.resumoPrazo("inválida", now).label, "Prazo não informado")
  assert.equal(prazo.resumoPrazo(null, now).label, "Prazo não informado")
})

test("ordenação prioriza próximos prazos abertos e mantém encerrados e ausentes identificáveis", () => {
  const itens = [
    { numeroControlePNCP: "sem-prazo", valorTotalEstimado: null },
    {
      numeroControlePNCP: "encerrado",
      dataEncerramentoProposta: "2026-10-19T10:00:00-03:00",
      valorTotalEstimado: 0
    },
    {
      numeroControlePNCP: "amanhã",
      dataEncerramentoProposta: "2026-10-21T10:00:00-03:00",
      valorTotalEstimado: 200
    },
    {
      numeroControlePNCP: "hoje",
      dataEncerramentoProposta: "2026-10-20T13:00:00-03:00",
      valorTotalEstimado: 100
    }
  ]
  assert.deepEqual(
    Array.from(ordenar(itens, "encerramento", now), (r) => r.numeroControlePNCP),
    ["hoje", "amanhã", "encerrado", "sem-prazo"]
  )
  assert.deepEqual(
    Array.from(ordenar(itens, "valor", now), (r) => r.numeroControlePNCP),
    ["amanhã", "hoje", "encerrado", "sem-prazo"]
  )
  assert.equal(itens[0].numeroControlePNCP, "sem-prazo")
})

function rotaResultados(falhar = false) {
  const client = createClient("https://teste.supabase.co", "chave-teste", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (url, options) => {
        if (String(url).includes("/monitoramentos?"))
          return Response.json([{ id: "monitor-1", nome: "TI", ativo: true }])
        if (falhar) return Response.json({ message: "Banco indisponível", code: "XX000" }, { status: 500 })
        if (options.method === "HEAD") return new Response(null, { headers: { "content-range": "0-0/101" } })
        return Response.json([{ id: "resultado-1", notificado: false }], {
          headers: { "content-range": "0-0/150" }
        })
      }
    }
  })
  client.auth.getUser = async () => ({ data: { user: { id: "usuario-1" } }, error: null })
  return carregarModulo("src/app/api/monitor/resultados/route.ts", {
    "next/server": { NextResponse: Response },
    "@/lib/supabase-server": { getSupabaseServer: async () => client }
  })
}

test("falha no banco de publicações retorna erro em vez de histórico vazio", async () => {
  const response = await rotaResultados(true).GET(new Request("https://teste/api/monitor/resultados"))
  assert.equal(response.status, 500)
  assert.ok((await response.json()).error)
})

test("contagens incluem histórico além dos resultados exibidos", async () => {
  const response = await rotaResultados().GET(new Request("https://teste/api/monitor/resultados"))
  const data = await response.json()
  assert.equal(response.status, 200)
  assert.equal(data.naoLidas["monitor-1"], 101)
  assert.equal(data.totais["monitor-1"], 150)
  assert.equal(data.resultados["monitor-1"].length, 1)
})

test("recuperação gera callback fixo e trata código expirado", async () => {
  let redirectTo
  const route = carregarModulo("src/app/api/auth/recuperar-senha/route.ts", {
    "next/server": { NextResponse: Response },
    "@/lib/supabase-server": {
      getSupabaseServer: async () => ({
        auth: {
          resetPasswordForEmail: async (_, options) => {
            redirectTo = options.redirectTo
            return { error: null }
          },
          exchangeCodeForSession: async () => ({ error: new Error("expired") })
        }
      })
    }
  })
  const res = await route.POST(
    new Request("https://afero.example/api/auth/recuperar-senha", {
      method: "POST",
      body: JSON.stringify({ email: "teste@example.test" })
    })
  )
  assert.equal(res.status, 200)
  assert.equal(redirectTo, "https://afero.example/api/auth/recuperar-senha")
  const callback = await route.GET({
    nextUrl: new URL("https://afero.example/api/auth/recuperar-senha?code=expirado"),
    url: "https://afero.example/api/auth/recuperar-senha?code=expirado"
  })
  assert.equal(callback.headers.get("location"), "https://afero.example/recuperar-senha?erro=link")
})

test("redefinição exige sessão validada antes de alterar a senha", async () => {
  let changed = false
  const route = carregarModulo("src/app/api/auth/redefinir-senha/route.ts", {
    "next/server": { NextResponse: Response },
    "@/lib/supabase-server": {
      getSupabaseServer: async () => ({
        auth: {
          getUser: async () => ({ data: { user: null }, error: null }),
          updateUser: async () => {
            changed = true
            return { error: null }
          }
        }
      })
    }
  })
  const res = await route.POST(
    new Request("https://afero.example/api/auth/redefinir-senha", {
      method: "POST",
      body: JSON.stringify({ password: "senha-de-teste" })
    })
  )
  assert.equal(res.status, 401)
  assert.equal(changed, false)
})

test("edição remove filtro de modalidade e preserva o monitoramento existente", async () => {
  let gravado
  let filtros
  const client = createClient("https://teste.supabase.co", "chave-teste", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (url, options) => {
        assert.equal(options.method, "PATCH")
        gravado = JSON.parse(options.body)
        filtros = new URL(url).searchParams
        return Response.json({ id: "monitor-1", ...gravado })
      }
    }
  })
  const route = carregarModulo("src/app/api/monitor/route.ts", {
    "next/server": { NextResponse: Response },
    "@/lib/supabase-server": {
      getSupabaseServer: async () => client,
      getUserId: async () => "usuario-1"
    }
  })
  const res = await route.PATCH(
    new Request("https://afero.example/api/monitor?id=monitor-1", {
      method: "PATCH",
      body: JSON.stringify({ nome: "TI", modalidade_id: null, uf: "" })
    })
  )
  assert.equal(res.status, 200)
  assert.equal(gravado.modalidade_id, null)
  assert.equal(gravado.uf, null)
  assert.equal(filtros.get("id"), "eq.monitor-1")
  assert.equal(filtros.get("user_id"), "eq.usuario-1")
  assert.equal((await res.json()).id, "monitor-1")
})

test("callback válido estabelece sessão e permite redefinir a senha", async () => {
  let codigo
  let senha
  const deps = {
    "next/server": { NextResponse: Response },
    "@/lib/supabase-server": {
      getSupabaseServer: async () => ({
        auth: {
          exchangeCodeForSession: async (code) => {
            codigo = code
            return { error: null }
          },
          getUser: async () => ({ data: { user: { id: "usuario-1" } }, error: null }),
          updateUser: async ({ password }) => {
            senha = password
            return { error: null }
          }
        }
      })
    }
  }
  const callback = carregarModulo("src/app/api/auth/recuperar-senha/route.ts", deps)
  const res = await callback.GET({
    nextUrl: new URL("https://afero.example/api/auth/recuperar-senha?code=valido"),
    url: "https://afero.example/api/auth/recuperar-senha?code=valido"
  })
  assert.equal(codigo, "valido")
  assert.equal(res.headers.get("location"), "https://afero.example/redefinir-senha")
  const reset = carregarModulo("src/app/api/auth/redefinir-senha/route.ts", deps)
  const response = await reset.POST(
    new Request("https://afero.example/api/auth/redefinir-senha", {
      method: "POST",
      body: JSON.stringify({ password: "nova-senha-teste" })
    })
  )
  assert.equal(response.status, 200)
  assert.equal(senha, "nova-senha-teste")
})
