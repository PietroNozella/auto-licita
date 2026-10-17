"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { AppNav } from "@/components/app-nav"
import type { Monitoramento, ResultadoLicitacao } from "@/types/pncp"
import { formatCurrency, formatDateShort } from "@/lib/utils"
import { ArrowLeft, Eye, EyeOff } from "lucide-react"

export default function MonitoramentosPage() {
  const [monitoramentos, setMonitoramentos] = useState<Monitoramento[]>([])
  const [resultados, setResultados] = useState<Map<string, ResultadoLicitacao[]>>(new Map())
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState("")
  const [marcandoId, setMarcandoId] = useState<string | null>(null)

  const carregarDados = useCallback(async () => {
    setErro("")
    setLoading(true)
    try {
      const res = await fetch("/api/monitor/resultados")
      if (!res.ok) throw new Error("Não foi possível carregar os monitoramentos.")
      const data = await res.json()
      setMonitoramentos(data.monitoramentos ?? [])
      setActiveTab((current) =>
        current && data.monitoramentos?.some((m: Monitoramento) => m.id === current)
          ? current
          : data.monitoramentos?.[0]?.id ?? null
      )
      const mapa = new Map<string, ResultadoLicitacao[]>()
      for (const m of data.monitoramentos ?? []) {
        if (data.resultados?.[m.id]) {
          mapa.set(m.id, data.resultados[m.id])
        }
      }
      setResultados(mapa)
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao carregar monitoramentos.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Adia a carga inicial para fora do corpo do effect e evita setState síncrono no mount.
    queueMicrotask(() => {
      void carregarDados()
    })
  }, [carregarDados])

  async function marcarLida(id: string) {
    setErro("")
    setMarcandoId(id)
    try {
      const res = await fetch(`/api/monitor/resultados/marcar-lida`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Erro ao marcar como lida.")
      }
      // Atualiza o item localmente: sem recarregar a grade nem perder o contexto.
      setResultados((prev) => {
        const proximo = new Map(prev)
        for (const [monitorId, lista] of proximo) {
          if (lista.some((r) => r.id === id)) {
            proximo.set(monitorId, lista.map((r) => (r.id === id ? { ...r, notificado: true } : r)))
          }
        }
        return proximo
      })
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao marcar resultado como lido.")
    } finally {
      setMarcandoId(null)
    }
  }

  const activeResults = activeTab ? resultados.get(activeTab) ?? [] : []

  return (
    <div className="min-h-screen bg-paper">
      <header className="bg-ink">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" aria-label="Voltar para o dashboard" className="text-zinc-300 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <h1 className="text-xl font-bold text-white">Monitoramentos</h1>
          <div className="ml-auto hidden md:block">
            <AppNav />
          </div>
        </div>
        <div className="border-t border-white/10 px-4 py-2 md:hidden">
          <div className="max-w-5xl mx-auto">
            <AppNav />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {erro && (
          <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {erro}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center text-sm text-zinc-500">
            Carregando monitoramentos...
          </div>
        ) : monitoramentos.length === 0 ? (
          <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center">
            <p className="text-zinc-500">Nenhum monitoramento criado ainda.</p>
            <Link href="/" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
              Criar no dashboard
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div
              className="lg:col-span-1 space-y-1"
              role="tablist"
              aria-label="Monitoramentos"
              aria-orientation="vertical"
              onKeyDown={(e) => {
                if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return
                const abas = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
                const atual = abas.indexOf(document.activeElement as HTMLButtonElement)
                if (atual === -1) return
                e.preventDefault()
                const destino =
                  e.key === "Home" ? 0
                  : e.key === "End" ? abas.length - 1
                  : e.key === "ArrowDown" || e.key === "ArrowRight" ? Math.min(abas.length - 1, atual + 1)
                  : Math.max(0, atual - 1)
                const alvo = abas[destino]
                alvo.click()
                alvo.focus()
              }}
            >
              {monitoramentos.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  id={`aba-${m.id}`}
                  role="tab"
                  aria-selected={activeTab === m.id}
                  aria-controls="painel-resultados"
                  tabIndex={activeTab === m.id ? 0 : -1}
                  onClick={() => setActiveTab(m.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeTab === m.id
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{m.nome}</span>
                    {m.ativo ? (
                      <Eye className="h-3.5 w-3.5 text-green-500 shrink-0" aria-hidden="true" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5 text-zinc-300 shrink-0" aria-hidden="true" />
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-500">
                    {resultados.get(m.id)?.length ?? 0} resultados
                  </span>
                </button>
              ))}
            </div>

            <div
              className="lg:col-span-3"
              id="painel-resultados"
              role="tabpanel"
              aria-labelledby={`aba-${activeTab ?? ""}`}
            >
              {activeResults.length === 0 ? (
                <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center">
                  <p className="text-zinc-500">Nenhum resultado encontrado para este monitoramento.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeResults.map((r) => (
                    <div
                      key={r.id}
                      className={`bg-white rounded-xl border p-4 transition-colors ${
                        r.notificado ? "border-zinc-200" : "border-blue-300 bg-blue-50/30"
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-800">{r.objeto_compra}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">{r.orgao_nome}</p>
                          <div className="flex flex-wrap gap-2 mt-2 text-xs text-zinc-500">
                            <span>{r.uf}</span>
                            <span>{r.modalidade_nome}</span>
                            {r.valor_total_estimado != null && (
                              <span className="font-mono">{formatCurrency(r.valor_total_estimado)}</span>
                            )}
                            <span>{r.data_publicacao ? formatDateShort(r.data_publicacao) : ""}</span>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {!r.notificado && (
                            <button
                              type="button"
                              onClick={() => marcarLida(r.id)}
                              disabled={marcandoId === r.id}
                              className="rounded bg-blue-100 px-3 py-2.5 text-xs font-medium text-blue-700 hover:bg-blue-200 disabled:opacity-50 transition-colors"
                            >
                              {marcandoId === r.id ? "Marcando..." : "Marcar lida"}
                            </button>
                          )}
                        </div>
                      </div>
                      {r.link && (
                        <a
                          href={r.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                        >
                          Ver edital original →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
