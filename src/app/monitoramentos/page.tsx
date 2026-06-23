"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
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
    carregarDados()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function marcarLida(id: string) {
    setErro("")
    setMarcandoId(id)
    try {
      // Atualiza via API monitor PATCH
      const res = await fetch(`/api/monitor/resultados/marcar-lida`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error("Erro ao marcar como lida.")
      await carregarDados()
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao marcar resultado como lido.")
    } finally {
      setMarcandoId(null)
    }
  }

  const activeResults = activeTab ? resultados.get(activeTab) ?? [] : []

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" aria-label="Voltar para o dashboard" className="text-zinc-400 hover:text-zinc-600 transition-colors">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <h1 className="text-lg font-bold text-zinc-800">Monitoramentos</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {erro && (
          <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {erro}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center text-sm text-zinc-400">
            Carregando monitoramentos...
          </div>
        ) : monitoramentos.length === 0 ? (
          <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center">
            <p className="text-zinc-400">Nenhum monitoramento criado ainda.</p>
            <Link href="/" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
              Criar no dashboard
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 space-y-1" role="tablist" aria-label="Monitoramentos">
              {monitoramentos.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === m.id}
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
                  <span className="text-[10px] text-zinc-400">
                    {resultados.get(m.id)?.length ?? 0} resultados
                  </span>
                </button>
              ))}
            </div>

            <div className="lg:col-span-3">
              {activeResults.length === 0 ? (
                <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center">
                  <p className="text-zinc-400">Nenhum resultado encontrado para este monitoramento.</p>
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
                          <div className="flex flex-wrap gap-2 mt-2 text-xs text-zinc-400">
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
                              className="px-2 py-1 text-[10px] rounded bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50 transition-colors"
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
