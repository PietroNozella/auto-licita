"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { SearchForm } from "@/components/search-form"
import { ResultsTable } from "@/components/results-table"
import { ExportButton } from "@/components/export-button"
import { MonitorCard } from "@/components/monitor-card"
import { NotificationBadge } from "@/components/notification-badge"
import type { RecuperarCompraPublicacaoDTO, Monitoramento } from "@/types/pncp"
import { Bell, FileSearch } from "lucide-react"

export default function Dashboard() {
  const [results, setResults] = useState<RecuperarCompraPublicacaoDTO[]>([])
  const [total, setTotal] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [monitoramentos, setMonitoramentos] = useState<Monitoramento[]>([])
  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(0)
  const [erro, setErro] = useState("")
  const mounted = useRef(false)

  const carregarMonitoramentos = useCallback(async () => {
    try {
      const res = await fetch("/api/monitor")
      if (res.ok) {
        const data = await res.json()
        setMonitoramentos(data)
      }
    } catch {
      // Silencioso
    }
  }, [])

  const carregarNotificacoes = useCallback(async () => {
    try {
      const { getSupabase } = await import("@/lib/supabase")
      const { count } = await getSupabase()
        .from("notificacoes")
        .select("*", { count: "exact", head: true })
        .eq("lida", false)
      setNotificacoesNaoLidas(count ?? 0)
    } catch {
      // Silencioso
    }
  }, [])

  useEffect(() => {
    if (mounted.current) return
    mounted.current = true
    carregarMonitoramentos()
    carregarNotificacoes()
  }, [carregarMonitoramentos, carregarNotificacoes])

  async function handleSearch(params: {
    query: string
    dataInicial: string
    dataFinal: string
    modalidade: string
    uf: string
    cnpj: string
  }) {
    setLoading(true)
    setErro("")
    try {
      const searchParams = new URLSearchParams()
      searchParams.set("tipo", "publicacao")
      searchParams.set("dataInicial", params.dataInicial)
      searchParams.set("dataFinal", params.dataFinal)
      searchParams.set("pagina", "1")
      if (params.modalidade) searchParams.set("codigoModalidadeContratacao", params.modalidade)
      if (params.uf) searchParams.set("uf", params.uf)
      if (params.cnpj) searchParams.set("cnpj", params.cnpj)

      const res = await fetch(`/api/pncp/search?${searchParams.toString()}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Erro na busca")
      }
      const data = await res.json()

      // Filtra por palavra-chave se houver query
      let items = data.data ?? []
      if (params.query.trim()) {
        const q = params.query.toLowerCase()
        items = items.filter((item: RecuperarCompraPublicacaoDTO) => {
          const texto = `${item.objetoCompra ?? ""} ${item.informacaoComplementar ?? ""} ${item.orgaoEntidade?.razaoSocial ?? ""}`.toLowerCase()
          return q.split(" ").every((palavra) => texto.includes(palavra))
        })
      }

      setResults(items)
      setTotal(items.length)
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao buscar licitações")
      setResults([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileSearch className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-lg font-bold text-zinc-800">Automação de Licitações</h1>
              <p className="text-xs text-zinc-400">PNCP - Portal Nacional de Contratações Públicas</p>
            </div>
          </div>
          <button
            onClick={carregarNotificacoes}
            className="relative p-2 text-zinc-500 hover:text-zinc-700 transition-colors"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute -top-0.5 -right-0.5">
              <NotificationBadge count={notificacoesNaoLidas} />
            </span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Monitoramentos */}
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-zinc-200 p-4 sticky top-6">
              <MonitorCard monitoramentos={monitoramentos} onCreated={() => {
                carregarMonitoramentos()
                carregarNotificacoes()
              }} />
            </div>
          </aside>

          {/* Conteúdo Principal */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-xl border border-zinc-200 p-4">
              <SearchForm onSearch={handleSearch} loading={loading} />
            </div>

            {erro && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                {erro}
              </div>
            )}

            <div className="bg-white rounded-xl border border-zinc-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-zinc-600 uppercase tracking-wider">Resultados</h2>
                <ExportButton data={results} />
              </div>
              <ResultsTable data={results} total={total} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
