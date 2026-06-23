"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { SearchForm } from "@/components/search-form"
import { ResultsTable } from "@/components/results-table"
import { ExportButton } from "@/components/export-button"
import { MonitorCard } from "@/components/monitor-card"
import { NotificationBadge } from "@/components/notification-badge"
import type { RecuperarCompraPublicacaoDTO, Monitoramento } from "@/types/pncp"
import { Bell, FileSearch } from "lucide-react"

interface SearchParamsState {
  query: string
  dataInicial: string
  dataFinal: string
  modalidade: string
  uf: string
  cnpj: string
}

export default function Dashboard() {
  const [results, setResults] = useState<RecuperarCompraPublicacaoDTO[]>([])
  const [total, setTotal] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [monitoramentos, setMonitoramentos] = useState<Monitoramento[]>([])
  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(0)
  const [erro, setErro] = useState("")
  const [hasSearched, setHasSearched] = useState(false)
  const [searchVersion, setSearchVersion] = useState(0)
  const mounted = useRef(false)

  const carregarMonitoramentos = useCallback(async () => {
    try {
      const res = await fetch("/api/monitor")
      if (res.ok) {
        const data = await res.json()
        setMonitoramentos(data)
      }
    } catch {
      // Mantém o dashboard utilizável mesmo se os monitoramentos falharem.
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
      // Mantém o dashboard utilizável mesmo se as notificações falharem.
    }
  }, [])

  useEffect(() => {
    if (mounted.current) return
    mounted.current = true
    carregarMonitoramentos()
    carregarNotificacoes()
  }, [carregarMonitoramentos, carregarNotificacoes])

  async function handleSearch(params: SearchParamsState) {
    setLoading(true)
    setErro("")
    setHasSearched(true)
    setSearchVersion((version) => version + 1)
    try {
      const searchParams = new URLSearchParams()
      searchParams.set("tipo", "publicacao")
      searchParams.set("dataInicial", params.dataInicial)
      searchParams.set("dataFinal", params.dataFinal)
      searchParams.set("pagina", "1")
      searchParams.set("tamanhoPagina", "50")
      if (params.modalidade) searchParams.set("codigoModalidadeContratacao", params.modalidade)
      if (params.uf) searchParams.set("uf", params.uf)
      if (params.cnpj) searchParams.set("cnpj", params.cnpj)

      const res = await fetch(`/api/pncp/search?${searchParams.toString()}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Erro na busca")
      }
      const data = await res.json()

      let items = data.data ?? []
      if (params.query.trim()) {
        const palavras = params.query.toLowerCase().split(" ").filter(Boolean)
        items = items.filter((item: RecuperarCompraPublicacaoDTO) => {
          const texto = `${item.objetoCompra ?? ""} ${item.informacaoComplementar ?? ""} ${item.orgaoEntidade?.razaoSocial ?? ""}`.toLowerCase()
          return palavras.some((palavra) => texto.includes(palavra))
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
            <FileSearch className="h-6 w-6 text-blue-600" aria-hidden="true" />
            <div>
              <h1 className="text-lg font-bold text-zinc-800">Automação de Licitações</h1>
              <p className="text-xs text-zinc-400">PNCP - Portal Nacional de Contratações Públicas</p>
            </div>
          </div>
          <button
            onClick={carregarNotificacoes}
            aria-label="Atualizar notificações"
            className="relative p-2 text-zinc-500 hover:text-zinc-700 transition-colors"
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
            <span className="absolute -top-0.5 -right-0.5">
              <NotificationBadge count={notificacoesNaoLidas} />
            </span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <section className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider">Buscar licitações</h2>
            <p className="text-sm text-zinc-500 mt-1">Consulte publicações do PNCP por período, modalidade, UF ou órgão.</p>
          </div>
          <SearchForm onSearch={handleSearch} loading={loading} />
        </section>

        {erro && (
          <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            {erro}
          </div>
        )}

        <section className="bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider">Licitações encontradas</h2>
              <p className="text-sm text-zinc-500 mt-1">Resultados organizados para comparação rápida e ação direta.</p>
            </div>
            <ExportButton data={results} />
          </div>
          <ResultsTable key={searchVersion} data={results} total={total} hasSearched={hasSearched} pageSize={8} />
        </section>

        <section className="bg-white rounded-xl border border-zinc-200 p-4">
          <MonitorCard monitoramentos={monitoramentos} onCreated={() => {
            carregarMonitoramentos()
            carregarNotificacoes()
          }} />
        </section>
      </main>
    </div>
  )
}