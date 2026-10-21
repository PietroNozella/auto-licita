"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ExternalLink } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { MonitorCard } from "@/components/monitor-card"
import { Deadline } from "@/components/deadline"
import type { Monitoramento, ResultadoLicitacao } from "@/types/pncp"
import { formatCurrency, formatDateShort } from "@/lib/utils"

type Status = "loading" | "success" | "error"

export default function MonitoramentosPage() {
  const [monitoramentos, setMonitoramentos] = useState<Monitoramento[]>([])
  const [resultados, setResultados] = useState<Record<string, ResultadoLicitacao[]>>({})
  const [naoLidas, setNaoLidas] = useState<Record<string, number>>({})
  const [totais, setTotais] = useState<Record<string, number>>({})
  const [activeId, setActiveId] = useState<string | null>(null)
  const [monitorStatus, setMonitorStatus] = useState<Status>("loading")
  const [resultStatus, setResultStatus] = useState<Status>("loading")
  const [erroAcao, setErroAcao] = useState("")
  const [marcandoId, setMarcandoId] = useState<string | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  const carregarMonitores = useCallback(async () => {
    setMonitorStatus("loading")
    try {
      const res = await fetch("/api/monitor")
      if (!res.ok) throw new Error()
      const data: Monitoramento[] = await res.json()
      setMonitoramentos(data)
      setActiveId((current) => (data.some((m) => m.id === current) ? current : (data[0]?.id ?? null)))
      setMonitorStatus("success")
    } catch {
      setMonitorStatus("error")
    }
  }, [])

  const carregarResultados = useCallback(async () => {
    setResultStatus("loading")
    try {
      const res = await fetch("/api/monitor/resultados")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setResultados(data.resultados ?? {})
      setNaoLidas(data.naoLidas ?? {})
      setTotais(data.totais ?? {})
      setResultStatus("success")
    } catch {
      setResultStatus("error")
    }
  }, [])

  const recarregar = useCallback(async () => {
    await Promise.all([carregarMonitores(), carregarResultados()])
  }, [carregarMonitores, carregarResultados])

  useEffect(() => {
    queueMicrotask(() => {
      void recarregar()
    })
  }, [recarregar])

  async function marcarLida(r: ResultadoLicitacao) {
    setErroAcao("")
    setMarcandoId(r.id)
    try {
      const res = await fetch("/api/monitor/resultados/marcar-lida", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id })
      })
      if (!res.ok) throw new Error()
      setResultados((prev) => ({
        ...prev,
        [r.monitoramento_id]: (prev[r.monitoramento_id] ?? []).map((item) =>
          item.id === r.id ? { ...item, notificado: true } : item
        )
      }))
      setNaoLidas((prev) => ({
        ...prev,
        [r.monitoramento_id]: Math.max(0, (prev[r.monitoramento_id] ?? 0) - 1)
      }))
    } catch {
      setErroAcao("Não foi possível marcar a publicação como lida. Tente novamente.")
    } finally {
      setMarcandoId(null)
    }
  }

  function selecionar(id: string) {
    setActiveId(id)
    setErroAcao("")
    requestAnimationFrame(() => {
      headingRef.current?.focus()
      headingRef.current?.scrollIntoView({ block: "start" })
    })
  }

  const selected = monitoramentos.find((m) => m.id === activeId)
  const activeResults = activeId ? (resultados[activeId] ?? []) : []
  const unread =
    resultStatus === "success" ? Object.values(naoLidas).reduce((sum, count) => sum + count, 0) : null

  return (
    <AppShell unread={unread} notificationError={resultStatus === "error"}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Monitoramentos</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Gerencie seus filtros e acompanhe as publicações encontradas.
        </p>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <MonitorCard
          monitoramentos={monitoramentos}
          loading={monitorStatus === "loading"}
          error={monitorStatus === "error"}
          onRetry={carregarMonitores}
          selectedId={activeId}
          onSelect={selecionar}
          unreadByMonitor={resultStatus === "success" ? naoLidas : null}
          notificationsLoading={resultStatus === "loading"}
          onCreated={recarregar}
        />
        <section aria-labelledby="titulo-publicacoes" className="min-w-0 space-y-4">
          <h2
            ref={headingRef}
            tabIndex={-1}
            id="titulo-publicacoes"
            className="scroll-mt-36 break-words text-lg font-semibold outline-none md:scroll-mt-24"
          >
            {selected ? `Publicações de ${selected.nome}` : "Publicações encontradas"}
          </h2>
          {selected && (
            <p className="text-sm text-zinc-600">
              {selected.ativo ? "Monitoramento ativo" : "Monitoramento pausado"}
              {resultStatus === "success" && ` · ${naoLidas[selected.id] ?? 0} não lidas`}
            </p>
          )}
          {erroAcao && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {erroAcao}
            </p>
          )}
          {resultStatus === "loading" ? (
            <p role="status" className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
              Carregando publicações…
            </p>
          ) : resultStatus === "error" ? (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <p>
                Não foi possível carregar as publicações e suas contagens. Seus monitoramentos podem continuar
                sendo gerenciados.
              </p>
              <button
                type="button"
                onClick={carregarResultados}
                className="mt-2 min-h-11 rounded-lg border border-red-700 px-3 font-medium"
              >
                Tentar novamente
              </button>
            </div>
          ) : monitorStatus === "success" && !selected ? (
            <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-600">
              Após criar um monitoramento, as novas publicações aparecerão aqui.
            </p>
          ) : selected && activeResults.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-600">
              Nenhuma publicação salva neste monitoramento. Use “Verificar hoje” para consultar as novidades
              do dia.
            </p>
          ) : (
            selected && (
              <>
                {(totais[selected.id] ?? 0) > activeResults.length && (
                  <p className="text-sm text-zinc-600">
                    Exibindo as {activeResults.length} publicações mais recentes de {totais[selected.id]}. A
                    contagem de não lidas inclui todo o histórico.
                  </p>
                )}
                <div className="space-y-3">
                  {activeResults.map((r) => (
                    <article
                      key={r.id}
                      className={`rounded-xl border bg-white p-4 ${r.notificado ? "border-zinc-200" : "border-blue-400"}`}
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        {!r.notificado && (
                          <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-800">
                            Nova
                          </span>
                        )}
                        <span className="text-xs text-zinc-600">
                          {r.uf} · {r.modalidade_nome}
                        </span>
                      </div>
                      <h3 className="break-words text-base font-semibold leading-snug text-zinc-900">
                        {r.objeto_compra}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-600">{r.orgao_nome}</p>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs text-zinc-600">Encerramento da proposta</p>
                          <div className="mt-1">
                            <Deadline value={r.data_encerramento_proposta} />
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-600">Valor estimado</p>
                          <p className="mt-1 text-sm font-semibold tabular-nums">
                            {r.valor_total_estimado != null
                              ? formatCurrency(r.valor_total_estimado)
                              : "Não informado"}
                          </p>
                          <p className="mt-2 text-xs text-zinc-600">
                            Publicação:{" "}
                            {r.data_publicacao ? formatDateShort(r.data_publicacao) : "Não informada"}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-col gap-2 border-t border-zinc-200 pt-3 sm:flex-row sm:justify-end">
                        {!r.notificado && (
                          <button
                            type="button"
                            onClick={() => marcarLida(r)}
                            disabled={marcandoId !== null}
                            className="min-h-11 rounded-lg border border-zinc-500 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                          >
                            {marcandoId === r.id ? "Marcando…" : "Marcar como lida"}
                          </button>
                        )}
                        {r.link && (
                          <a
                            href={r.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Abrir edital de ${r.objeto_compra}`}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-blue-700 px-3 text-sm font-medium text-blue-800 hover:bg-blue-50"
                          >
                            Abrir edital
                            <ExternalLink className="h-4 w-4" aria-hidden="true" />
                          </a>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )
          )}
        </section>
      </div>
    </AppShell>
  )
}
