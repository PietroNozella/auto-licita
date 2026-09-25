"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { AppNav } from "@/components/app-nav"
import { SearchForm } from "@/components/search-form"
import { ResultsTable } from "@/components/results-table"
import { ExportButton } from "@/components/export-button"
import { MonitorCard } from "@/components/monitor-card"
import { NotificationBadge } from "@/components/notification-badge"
import { MODALIDADES } from "@/lib/pncp-api"
import type { RecuperarCompraPublicacaoDTO, Monitoramento } from "@/types/pncp"
import { useAuth } from "@/components/auth-provider"
import { Bell, FileSearch, LogOut, User } from "lucide-react"

interface SearchParamsState {
  query: string
  dataInicial: string
  dataFinal: string
  modalidade: string
  uf: string
  cnpj: string
}

function comTracos(yyyymmdd: string): string {
  return yyyymmdd.length === 8
    ? `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`
    : yyyymmdd
}

// Restaura os campos do formulário a partir da URL (volta de /monitoramentos).
function lerBuscaDaUrl(): SearchParamsState | null {
  if (typeof window === "undefined") return null
  const sp = new URLSearchParams(window.location.search)
  if (!sp.has("q") && !sp.has("dataInicial")) return null
  return {
    query: sp.get("q") ?? "",
    dataInicial: sp.get("dataInicial") ?? "",
    dataFinal: sp.get("dataFinal") ?? "",
    modalidade: sp.get("modalidade") ?? "",
    uf: sp.get("uf") ?? "",
    cnpj: sp.get("cnpj") ?? "",
  }
}

export default function Dashboard() {
  const { user, logout } = useAuth()
  const [results, setResults] = useState<RecuperarCompraPublicacaoDTO[]>([])
  const [total, setTotal] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [monitoramentos, setMonitoramentos] = useState<Monitoramento[]>([])
  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(0)
  const [erro, setErro] = useState("")
  const [hasSearched, setHasSearched] = useState(false)
  const [searchVersion, setSearchVersion] = useState(0)
  const [ultimaBusca, setUltimaBusca] = useState<SearchParamsState | null>(null)
  const [totalRegistros, setTotalRegistros] = useState<number | null>(null)
  const [buscaInicial] = useState<SearchParamsState | null>(lerBuscaDaUrl)
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
      const res = await fetch("/api/monitor/resultados")
      if (!res.ok) return
      const data = await res.json()
      const resultados = (data.resultados ?? {}) as Record<string, Array<{ notificado?: boolean }>>
      const total = Object.values(resultados).flat().filter((r) => !r.notificado).length
      setNotificacoesNaoLidas(total)
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
    setUltimaBusca(params)
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
      setTotalRegistros(typeof data.totalRegistros === "number" ? data.totalRegistros : items.length)

      // Espelha a busca na URL para preservar os campos ao voltar de /monitoramentos.
      const urlParams = new URLSearchParams()
      if (params.query) urlParams.set("q", params.query)
      if (params.dataInicial) urlParams.set("dataInicial", comTracos(params.dataInicial))
      if (params.dataFinal) urlParams.set("dataFinal", comTracos(params.dataFinal))
      if (params.modalidade) urlParams.set("modalidade", params.modalidade)
      if (params.uf) urlParams.set("uf", params.uf)
      if (params.cnpj) urlParams.set("cnpj", params.cnpj)
      window.history.replaceState(null, "", `${window.location.pathname}?${urlParams.toString()}`)
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao buscar licitações")
      setResults([])
      setTotal(0)
      setTotalRegistros(null)
    } finally {
      setLoading(false)
    }
  }

  const modalidadeNome = ultimaBusca?.modalidade
    ? MODALIDADES.find((m) => String(m.id) === ultimaBusca.modalidade)?.nome ?? ultimaBusca.modalidade
    : ""

  return (
    <div className="min-h-screen bg-paper">
      <header className="bg-ink">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileSearch className="h-6 w-6 text-white" aria-hidden="true" />
            <div>
              <h1 className="text-xl font-bold text-white">Afero</h1>
              <p className="text-xs text-zinc-300">Busca e monitoramento de licitações</p>
            </div>
          </div>
          <div className="hidden md:block">
            <AppNav />
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/monitoramentos"
              aria-label={notificacoesNaoLidas > 0 ? `Ver ${notificacoesNaoLidas} notificações` : "Ver monitoramentos"}
              className="relative p-2 text-zinc-300 hover:text-white transition-colors"
            >
              <Bell className="h-5 w-5" aria-hidden="true" />
              <span className="absolute -top-0.5 -right-0.5">
                <NotificationBadge count={notificacoesNaoLidas} />
              </span>
            </Link>

            {user && (
              <div className="flex items-center gap-2 pl-3 border-l border-white/15">
                <User className="h-4 w-4 text-zinc-300" aria-hidden="true" />
                <span className="text-sm text-zinc-300 hidden sm:inline">{user.email}</span>
                <button
                  onClick={logout}
                  className="p-1.5 text-zinc-300 hover:text-red-300 transition-colors rounded-md hover:bg-white/10"
                  aria-label="Sair"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="border-t border-white/10 px-4 py-2 md:hidden">
          <AppNav />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <nav aria-label="Seções do dashboard" className="sticky top-0 z-10 -mx-4 bg-paper/95 px-4 py-2 backdrop-blur">
          <div className="flex gap-2">
            <a href="#buscar" className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 hover:border-blue-200 hover:text-blue-700">Buscar</a>
            <a href="#resultados" className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 hover:border-blue-200 hover:text-blue-700">Resultados</a>
            <a href="#monitores" className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 hover:border-blue-200 hover:text-blue-700">Monitoramentos</a>
          </div>
        </nav>
        <section id="buscar" className="scroll-mt-20 bg-white rounded-xl border border-zinc-200 p-4">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider">Buscar licitações</h2>
            <p className="text-sm text-zinc-500 mt-1">Consulte publicações por período, modalidade, UF ou órgão.</p>
          </div>
          <SearchForm onSearch={handleSearch} loading={loading} initial={buscaInicial ?? undefined} />
        </section>

        {erro && (
          <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            {erro}
          </div>
        )}

        <section id="resultados" className="scroll-mt-20 bg-white rounded-xl border border-zinc-200 p-4">
          <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider">Licitações encontradas</h2>
              <p className="text-sm text-zinc-500 mt-1">Resultados organizados para comparação rápida e ação direta.</p>
              {ultimaBusca && hasSearched && (
                <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Filtros aplicados">
                  {ultimaBusca.query && (
                    <span className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">“{ultimaBusca.query}”</span>
                  )}
                  {ultimaBusca.dataInicial && ultimaBusca.dataFinal && (
                    <span className="rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-600">
                      {comTracos(ultimaBusca.dataInicial)} a {comTracos(ultimaBusca.dataFinal)}
                    </span>
                  )}
                  {modalidadeNome && (
                    <span className="rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-600">{modalidadeNome}</span>
                  )}
                  {ultimaBusca.uf && (
                    <span className="rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-600">{ultimaBusca.uf}</span>
                  )}
                  {ultimaBusca.cnpj && (
                    <span className="rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-600">CNPJ {ultimaBusca.cnpj}</span>
                  )}
                </div>
              )}
            </div>
            <ExportButton data={results} />
          </div>
          <ResultsTable key={searchVersion} data={results} total={total} totalRegistros={totalRegistros ?? undefined} hasSearched={hasSearched} pageSize={8} />
        </section>

        <section id="monitores" className="scroll-mt-20 bg-white rounded-xl border border-zinc-200 p-4">
          <MonitorCard monitoramentos={monitoramentos} onCreated={() => {
            carregarMonitoramentos()
            carregarNotificacoes()
          }} />
        </section>
      </main>
    </div>
  )
}