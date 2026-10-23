"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { AppShell } from "@/components/app-shell"
import { SearchForm } from "@/components/search-form"
import { ResultsTable } from "@/components/results-table"
import { ExportButton } from "@/components/export-button"
import { MODALIDADES } from "@/lib/pncp-api"
import { buscarLoteLicitacoes, type FiltrosBusca } from "@/lib/busca-licitacoes"
import { paraDataIso } from "@/lib/utils"
import type { RecuperarCompraPublicacaoDTO, Monitoramento } from "@/types/pncp"

type Status = "idle" | "loading" | "success" | "error"

function lerBuscaDaUrl(): FiltrosBusca | null {
  if (typeof window === "undefined") return null
  const sp = new URLSearchParams(window.location.search)
  if (!sp.has("q") && !sp.has("dataInicial")) return null
  return {
    query: sp.get("q") ?? "",
    dataInicial: sp.get("dataInicial") ?? "",
    dataFinal: sp.get("dataFinal") ?? "",
    modalidade: sp.get("modalidade") ?? "",
    uf: sp.get("uf") ?? "",
    cnpj: sp.get("cnpj") ?? ""
  }
}

function dataFiltro(value: string) {
  return paraDataIso(value).split("-").reverse().join("/")
}

export default function Dashboard() {
  const [results, setResults] = useState<RecuperarCompraPublicacaoDTO[]>([])
  const [status, setStatus] = useState<Status>("idle")
  const [monitoramentos, setMonitoramentos] = useState<Monitoramento[]>([])
  const [monitorStatus, setMonitorStatus] = useState<Status>("loading")
  const [notificationStatus, setNotificationStatus] = useState<Status>("loading")
  const [unread, setUnread] = useState<number | null>(null)
  const [erro, setErro] = useState("")
  const [avisoBusca, setAvisoBusca] = useState("")
  const [proximaPagina, setProximaPagina] = useState<number | null>(null)
  const [paginaTentada, setPaginaTentada] = useState(1)
  const [registrosConsultados, setRegistrosConsultados] = useState(0)
  const [fonteParcial, setFonteParcial] = useState(false)
  const buscaController = useRef<AbortController | null>(null)
  const resultadosRef = useRef<HTMLElement>(null)
  const [searchVersion, setSearchVersion] = useState(0)
  const [ultimaBusca, setUltimaBusca] = useState<FiltrosBusca | null>(null)
  const [totalRegistros, setTotalRegistros] = useState<number | null>(null)
  const [buscaInicial, setBuscaInicial] = useState<FiltrosBusca | null>(null)
  const [formAberto, setFormAberto] = useState(true)

  const carregarMonitoramentos = useCallback(async () => {
    setMonitorStatus("loading")
    try {
      const res = await fetch("/api/monitor")
      if (!res.ok) throw new Error()
      setMonitoramentos(await res.json())
      setMonitorStatus("success")
    } catch {
      setMonitorStatus("error")
    }
  }, [])

  const carregarNotificacoes = useCallback(async () => {
    setNotificationStatus("loading")
    try {
      const res = await fetch("/api/monitor/resultados")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setUnread(
        Object.values(data.naoLidas as Record<string, number>).reduce((soma, count) => soma + count, 0)
      )
      setNotificationStatus("success")
    } catch {
      setNotificationStatus("error")
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      setBuscaInicial(lerBuscaDaUrl())
      void carregarMonitoramentos()
      void carregarNotificacoes()
    })
  }, [carregarMonitoramentos, carregarNotificacoes])
  useEffect(() => () => buscaController.current?.abort(), [])

  async function handleSearch(params: FiltrosBusca, paginaInicial = 1) {
    buscaController.current?.abort()
    const controller = new AbortController()
    buscaController.current = controller
    const continuacao = paginaInicial > 1
    setStatus("loading")
    setErro("")
    setAvisoBusca("")
    setUltimaBusca(params)
    setPaginaTentada(paginaInicial)
    if (!continuacao) {
      setResults([])
      setTotalRegistros(null)
      setRegistrosConsultados(0)
      setFonteParcial(false)
      setProximaPagina(null)
    }
    try {
      const data = await buscarLoteLicitacoes(params, paginaInicial, controller.signal)
      if (controller.signal.aborted) return
      const unicos = new Map((continuacao ? results : []).map((item) => [item.numeroControlePNCP, item]))
      for (const item of data.itens) unicos.set(item.numeroControlePNCP, item)
      setResults([...unicos.values()])
      setSearchVersion((version) => version + 1)
      setTotalRegistros((anterior) => Math.max(continuacao ? (anterior ?? 0) : 0, data.totalRegistros))
      setRegistrosConsultados((anterior) => (continuacao ? anterior : 0) + data.registrosConsultados)
      setProximaPagina(data.proximaPagina)
      setFonteParcial((anterior) => (continuacao && anterior) || data.parcial)
      if (data.erro)
        setAvisoBusca(
          "A consulta foi interrompida. Os resultados encontrados foram preservados. Continue a verificação para tentar novamente."
        )
      setStatus("success")
      setFormAberto(false)
      const urlParams = new URLSearchParams()
      for (const [key, value] of Object.entries(params))
        if (value)
          urlParams.set(key === "query" ? "q" : key, key.startsWith("data") ? paraDataIso(value) : value)
      window.history.replaceState(null, "", `${window.location.pathname}?${urlParams}`)
      requestAnimationFrame(() => {
        resultadosRef.current?.focus()
        resultadosRef.current?.scrollIntoView({ block: "start" })
      })
    } catch {
      if (controller.signal.aborted) return
      setStatus("error")
      setErro(
        continuacao
          ? "Não foi possível consultar mais publicações. Os resultados anteriores foram preservados."
          : "Não foi possível concluir a busca. Tente novamente com os mesmos filtros."
      )
    }
  }

  const loading = status === "loading"
  const iniciou = status !== "idle"
  const completouEtapa = totalRegistros !== null
  const buscaCompleta = completouEtapa && proximaPagina === null && !fonteParcial && !avisoBusca
  const modalidade = MODALIDADES.find((m) => String(m.id) === ultimaBusca?.modalidade)?.nome
  const ativos = monitoramentos.filter((m) => m.ativo).length
  const pausados = monitoramentos.length - ativos

  return (
    <AppShell
      unread={notificationStatus === "success" ? unread : null}
      notificationError={notificationStatus === "error"}
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Buscar licitações</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Encontre oportunidades e acompanhe os prazos de proposta.
        </p>
      </div>
      <section aria-label="Busca e filtros" className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
        {ultimaBusca && (
          <div
            className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${formAberto ? "mb-4 border-b border-zinc-200 pb-4" : ""}`}
          >
            <div className="min-w-0 text-sm text-zinc-700">
              <p className="break-words font-semibold">{ultimaBusca.query || "Todos os objetos"}</p>
              <p className="mt-1">
                Publicação: {dataFiltro(ultimaBusca.dataInicial)} a {dataFiltro(ultimaBusca.dataFinal)}
              </p>
              {(modalidade || ultimaBusca.uf || ultimaBusca.cnpj) && (
                <p className="mt-1 break-words text-zinc-600">
                  {[modalidade, ultimaBusca.uf, ultimaBusca.cnpj && `CNPJ ${ultimaBusca.cnpj}`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={() => setFormAberto(!formAberto)}
              aria-expanded={formAberto}
              aria-controls="formulario-busca"
              className="min-h-11 shrink-0 rounded-lg border border-zinc-500 px-4 text-sm font-medium text-zinc-700 disabled:opacity-50"
            >
              {formAberto ? "Recolher busca" : "Editar busca"}
            </button>
          </div>
        )}
        <div id="formulario-busca" hidden={!formAberto}>
          <SearchForm
            key={buscaInicial ? "restaurada" : "inicial"}
            onSearch={handleSearch}
            loading={loading}
            initial={buscaInicial ?? undefined}
          />
        </div>
      </section>
      {iniciou && (
        <section
          ref={resultadosRef}
          tabIndex={-1}
          aria-labelledby="titulo-resultados"
          className="scroll-mt-36 space-y-4 outline-none md:scroll-mt-24"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="titulo-resultados" className="text-lg font-semibold">
              {completouEtapa
                ? `${results.length} licitações encontradas`
                : loading
                  ? "Consultando publicações…"
                  : "Resultado da busca"}
            </h2>
            <ExportButton data={results} />
          </div>
          {erro && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              <p>{erro}</p>
              <button
                type="button"
                onClick={() => ultimaBusca && handleSearch(ultimaBusca, paginaTentada)}
                className="min-h-11 rounded-lg border border-red-700 px-3 font-medium"
              >
                Tentar novamente
              </button>
            </div>
          )}
          {(avisoBusca || fonteParcial) && (
            <div
              role="status"
              className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
            >
              {avisoBusca}
              {fonteParcial && (
                <p>Algumas modalidades não responderam. Refaça a busca para conferir o que ficou faltando.</p>
              )}
              {fonteParcial && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => ultimaBusca && handleSearch(ultimaBusca)}
                  className="mt-2 min-h-11 rounded-lg border border-amber-800 px-3 font-medium disabled:opacity-50"
                >
                  Refazer busca
                </button>
              )}
            </div>
          )}
          {completouEtapa && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-4">
              <p role="status" className="text-sm text-zinc-600">
                {registrosConsultados} de {totalRegistros} publicações verificadas.{" "}
                {loading
                  ? "Verificando mais publicações…"
                  : buscaCompleta
                    ? "Verificação concluída."
                    : "Verificação incompleta."}
              </p>
              {proximaPagina !== null && status !== "error" && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => ultimaBusca && handleSearch(ultimaBusca, proximaPagina)}
                  className="min-h-11 rounded-lg border border-blue-700 px-4 text-sm font-medium text-blue-800 hover:bg-blue-50 disabled:opacity-50"
                >
                  {loading ? "Verificando…" : "Verificar mais publicações"}
                </button>
              )}
            </div>
          )}
          {(status !== "error" || completouEtapa) && (
            <ResultsTable
              resetVersion={searchVersion}
              data={results}
              buscaCompleta={buscaCompleta}
              loading={loading}
              pageSize={8}
            />
          )}
        </section>
      )}
      <section
        aria-labelledby="resumo-monitores"
        className="flex flex-col gap-3 border-t border-zinc-300 pt-5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 id="resumo-monitores" className="text-base font-semibold">
            Monitoramentos
          </h2>
          {monitorStatus === "loading" ? (
            <p role="status" className="mt-1 text-sm text-zinc-600">
              Carregando monitoramentos…
            </p>
          ) : monitorStatus === "error" ? (
            <div role="alert" className="text-sm text-red-800">
              Não foi possível carregar os monitoramentos.{" "}
              <button type="button" onClick={carregarMonitoramentos} className="min-h-11 px-2 underline">
                Tentar novamente
              </button>
            </div>
          ) : (
            <p className="mt-1 text-sm text-zinc-600">
              {monitoramentos.length === 0
                ? "Crie um monitoramento para acompanhar novas publicações."
                : `${ativos} ${ativos === 1 ? "ativo" : "ativos"} · ${pausados} ${pausados === 1 ? "pausado" : "pausados"}`}
              {notificationStatus === "success" && unread !== null && unread > 0
                ? ` · ${unread} publicações não lidas`
                : ""}
            </p>
          )}
          {notificationStatus === "error" && (
            <p role="alert" className="text-sm text-red-800">
              Notificações indisponíveis.{" "}
              <button type="button" onClick={carregarNotificacoes} className="min-h-11 px-2 underline">
                Tentar novamente
              </button>
            </p>
          )}
        </div>
        <Link
          href="/monitoramentos"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-zinc-500 bg-white px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Gerenciar monitoramentos
        </Link>
      </section>
    </AppShell>
  )
}
