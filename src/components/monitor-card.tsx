"use client"

import { useState } from "react"
import { CalendarDays, Pencil, Plus, Trash2 } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { MODALIDADES, UF_LIST } from "@/lib/pncp-api"
import { Modal } from "@/components/modal"
import type { Monitoramento } from "@/types/pncp"

export function MonitorCard({
  monitoramentos,
  loading,
  error,
  onRetry,
  selectedId,
  onSelect,
  unreadByMonitor,
  notificationsLoading,
  onCreated
}: {
  monitoramentos: Monitoramento[]
  loading: boolean
  error: boolean
  onRetry: () => void
  selectedId: string | null
  onSelect: (id: string) => void
  unreadByMonitor: Record<string, number> | null
  notificationsLoading: boolean
  onCreated: () => Promise<void>
}) {
  const [editor, setEditor] = useState<Monitoramento | "novo" | null>(null)
  const [nome, setNome] = useState("")
  const [palavras, setPalavras] = useState("")
  const [uf, setUf] = useState("")
  const [modalidadeId, setModalidadeId] = useState("")
  const [cnpj, setCnpj] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [excluirAlvo, setExcluirAlvo] = useState<Monitoramento | null>(null)
  const [novidades, setNovidades] = useState<Record<string, string>>({})
  const [erro, setErro] = useState("")
  const [erroEditor, setErroEditor] = useState("")
  const busy = salvando || actionId !== null

  function abrirEditor(monitor: Monitoramento | "novo") {
    setErroEditor("")
    const m = monitor === "novo" ? null : monitor
    setNome(m?.nome ?? "")
    setPalavras(m?.palavras_chave.join(", ") ?? "")
    setUf(m?.uf ?? "")
    setModalidadeId(m?.modalidade_id ? String(m.modalidade_id) : "")
    setCnpj(m?.cnpj_orgao ?? "")
    setEditor(monitor)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    const termos = palavras
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
    if (!nome.trim() || !termos.length) {
      setErroEditor("Informe um nome e pelo menos uma palavra-chave.")
      return
    }
    if (cnpj && cnpj.replace(/\D/g, "").length !== 14) {
      setErroEditor("Informe os 14 dígitos do CNPJ ou deixe o campo vazio.")
      return
    }
    setErroEditor("")
    setSalvando(true)
    const editando = editor && editor !== "novo"
    try {
      const res = await fetch(editando ? `/api/monitor?id=${editor.id}` : "/api/monitor", {
        method: editando ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          palavras_chave: termos,
          uf,
          modalidade_id: modalidadeId ? Number(modalidadeId) : null,
          cnpj_orgao: cnpj.replace(/\D/g, "")
        })
      })
      if (!res.ok) throw new Error()
      setEditor(null)
      await onCreated()
    } catch {
      setErroEditor("Não foi possível salvar o monitoramento. Confira os campos e tente novamente.")
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(m: Monitoramento) {
    setErro("")
    setActionId(m.id)
    try {
      const res = await fetch(`/api/monitor?id=${m.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      setExcluirAlvo(null)
      await onCreated()
    } catch {
      setErro("Não foi possível excluir o monitoramento. Tente novamente.")
    } finally {
      setActionId(null)
    }
  }

  async function toggleAtivo(m: Monitoramento) {
    setErro("")
    setActionId(m.id)
    try {
      const res = await fetch(`/api/monitor?id=${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: !m.ativo })
      })
      if (!res.ok) throw new Error()
      await onCreated()
    } catch {
      setErro("Não foi possível alterar o status. Tente novamente.")
    } finally {
      setActionId(null)
    }
  }

  async function verificar(m: Monitoramento) {
    setErro("")
    setActionId(m.id)
    try {
      const res = await fetch("/api/monitor/novidades-hoje", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: m.id })
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const aviso =
        data.truncado || data.parcial
          ? " Verificação incompleta; algumas publicações podem não ter sido consultadas."
          : ""
      setNovidades((prev) => ({
        ...prev,
        [m.id]: `${data.novos > 0 ? `${data.novos} novas publicações de hoje.` : "Nenhuma publicação nova de hoje."}${aviso}`
      }))
      await onCreated()
    } catch {
      setErro("Não foi possível verificar as novidades. Tente novamente.")
    } finally {
      setActionId(null)
    }
  }

  return (
    <section aria-label="Gerenciar monitoramentos" className="space-y-3">
      <button
        type="button"
        onClick={() => abrirEditor("novo")}
        disabled={busy}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Novo monitoramento
      </button>
      {erro && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {erro}
        </p>
      )}
      {loading ? (
        <p role="status" className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600">
          Carregando monitoramentos…
        </p>
      ) : error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p>Não foi possível carregar os monitoramentos.</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 min-h-11 rounded-lg border border-red-700 px-3 font-medium"
          >
            Tentar novamente
          </button>
        </div>
      ) : monitoramentos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-5 text-sm text-zinc-600">
          <h2 className="font-semibold text-zinc-800">Nenhum monitoramento criado</h2>
          <p className="mt-2">
            Crie o primeiro para acompanhar novas publicações por palavras-chave, UF e modalidade.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {monitoramentos.map((m) => (
            <article
              key={m.id}
              className={`rounded-xl border p-4 ${selectedId === m.id ? "border-blue-700 bg-blue-50/40" : "border-zinc-200 bg-white"}`}
            >
              <h2>
                <button
                  type="button"
                  onClick={() => onSelect(m.id)}
                  title={`Ver publicações de ${m.nome}`}
                  aria-pressed={selectedId === m.id}
                  className="min-h-11 w-full break-words text-left text-base font-semibold text-zinc-900"
                >
                  {m.nome}
                </button>
              </h2>
              <p className="mt-1 text-sm text-blue-800">
                {notificationsLoading
                  ? "Carregando novidades…"
                  : unreadByMonitor === null
                    ? "Novidades indisponíveis"
                    : `${unreadByMonitor[m.id] ?? 0} não lidas`}
              </p>
              <p className="mt-2 break-words text-sm text-zinc-600">
                {m.palavras_chave.join(", ") || "Todas as palavras"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span
                  className={`rounded-md px-2 py-1 font-medium ${m.ativo ? "bg-green-50 text-green-800" : "bg-zinc-100 text-zinc-700"}`}
                >
                  {m.ativo ? "Ativo" : "Pausado"}
                </span>
                <span className="rounded-md bg-zinc-100 px-2 py-1 text-zinc-700">
                  {m.uf || "Todas as UFs"}
                </span>
                <span className="rounded-md bg-zinc-100 px-2 py-1 text-zinc-700">
                  {MODALIDADES.find((mod) => mod.id === m.modalidade_id)?.nome ?? "Todas as modalidades"}
                </span>
              </div>
              {m.cnpj_orgao && <p className="mt-2 text-xs text-zinc-600">CNPJ: {m.cnpj_orgao}</p>}
              <p className="mt-3 text-xs text-zinc-600">
                {m.ultima_verificacao
                  ? `Última verificação: ${formatDate(m.ultima_verificacao)}`
                  : "Ainda não verificado"}
              </p>
              <div className="mt-3 flex flex-wrap gap-1 border-t border-zinc-200 pt-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => verificar(m)}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-blue-800 hover:bg-blue-50 disabled:opacity-50"
                >
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  {actionId === m.id ? "Aguarde…" : "Verificar hoje"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => toggleAtivo(m)}
                  aria-label={`${m.ativo ? "Pausar" : "Ativar"} monitoramento ${m.nome}`}
                  className="min-h-11 rounded-lg px-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
                >
                  {m.ativo ? "Pausar" : "Ativar"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => abrirEditor(m)}
                  aria-label={`Editar monitoramento ${m.nome}`}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setErro("")
                    setExcluirAlvo(m)
                  }}
                  aria-label={`Excluir monitoramento ${m.nome}`}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              {novidades[m.id] && (
                <p role="status" className="mt-2 text-sm text-blue-800">
                  {novidades[m.id]}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
      {editor && (
        <Modal
          titulo={editor === "novo" ? "Novo monitoramento" : "Editar monitoramento"}
          onClose={() => {
            if (!salvando) setEditor(null)
          }}
        >
          <form onSubmit={salvar} className="mt-4 space-y-4">
            {editor !== "novo" && (
              <p className="text-sm text-zinc-600">
                Os novos filtros valem nas próximas verificações. As publicações já salvas serão mantidas.
              </p>
            )}
            {erroEditor && (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
                {erroEditor}
              </p>
            )}
            <div>
              <label htmlFor="monitor-nome" className="mb-1 block text-sm font-medium text-zinc-700">
                Nome
              </label>
              <input
                id="monitor-nome"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: TI em São Paulo"
                className="min-h-11 w-full rounded-lg border border-zinc-500 px-3 text-base sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="monitor-palavras" className="mb-1 block text-sm font-medium text-zinc-700">
                Palavras-chave
              </label>
              <input
                id="monitor-palavras"
                required
                value={palavras}
                onChange={(e) => setPalavras(e.target.value)}
                placeholder="software, suporte, nuvem"
                aria-describedby="ajuda-palavras"
                className="min-h-11 w-full rounded-lg border border-zinc-500 px-3 text-base sm:text-sm"
              />
              <p id="ajuda-palavras" className="mt-1 text-xs text-zinc-600">
                Separe por vírgula. A busca considera qualquer uma das palavras.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="monitor-uf" className="mb-1 block text-sm font-medium text-zinc-700">
                  UF
                </label>
                <select
                  id="monitor-uf"
                  value={uf}
                  onChange={(e) => setUf(e.target.value)}
                  className="min-h-11 w-full rounded-lg border border-zinc-500 bg-white px-3 text-base sm:text-sm"
                >
                  <option value="">Todas</option>
                  {UF_LIST.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="monitor-modalidade" className="mb-1 block text-sm font-medium text-zinc-700">
                  Modalidade
                </label>
                <select
                  id="monitor-modalidade"
                  value={modalidadeId}
                  onChange={(e) => setModalidadeId(e.target.value)}
                  className="min-h-11 w-full rounded-lg border border-zinc-500 bg-white px-3 text-base sm:text-sm"
                >
                  <option value="">Todas</option>
                  {MODALIDADES.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="monitor-cnpj" className="mb-1 block text-sm font-medium text-zinc-700">
                CNPJ do órgão (opcional)
              </label>
              <input
                id="monitor-cnpj"
                inputMode="numeric"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="00.000.000/0000-00"
                className="min-h-11 w-full rounded-lg border border-zinc-500 px-3 text-base sm:text-sm"
              />
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={salvando}
                onClick={() => setEditor(null)}
                className="min-h-11 rounded-lg px-4 text-sm font-medium text-zinc-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="min-h-11 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {salvando ? "Salvando…" : editor === "novo" ? "Criar monitoramento" : "Salvar alterações"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {excluirAlvo && (
        <Modal
          titulo="Excluir monitoramento"
          onClose={() => {
            if (!actionId) setExcluirAlvo(null)
          }}
        >
          <p className="mt-3 text-sm text-zinc-600">
            Excluir “{excluirAlvo.nome}”? As publicações salvas neste monitoramento também serão removidas.
          </p>
          {erro && (
            <p role="alert" className="mt-3 text-sm text-red-800">
              {erro}
            </p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setExcluirAlvo(null)}
              className="min-h-11 rounded-lg px-4 text-sm text-zinc-700"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => excluir(excluirAlvo)}
              className="min-h-11 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Excluindo…" : "Excluir monitoramento"}
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}
