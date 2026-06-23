"use client"

import { useState } from "react"
import { BellRing, Clock, Plus, Trash2 } from "lucide-react"
import { formatDateShort } from "@/lib/utils"
import { MODALIDADES, UF_LIST } from "@/lib/pncp-api"
import type { Monitoramento } from "@/types/pncp"

interface MonitorCardProps {
  monitoramentos: Monitoramento[]
  onCreated: () => void
}

export function MonitorCard({ monitoramentos, onCreated }: MonitorCardProps) {
  const [showForm, setShowForm] = useState(false)
  const [nome, setNome] = useState("")
  const [palavras, setPalavras] = useState("")
  const [uf, setUf] = useState("")
  const [modalidadeId, setModalidadeId] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [erro, setErro] = useState("")

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim() || !palavras.trim()) return
    setErro("")
    setSalvando(true)
    try {
      const res = await fetch("/api/monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          palavras_chave: palavras.split(",").map((p) => p.trim()).filter(Boolean),
          uf: uf || null,
          modalidade_id: modalidadeId ? parseInt(modalidadeId, 10) : null,
        }),
      })
      if (!res.ok) throw new Error("Não foi possível criar o monitoramento.")
      setNome("")
      setPalavras("")
      setUf("")
      setModalidadeId("")
      setShowForm(false)
      onCreated()
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao criar monitoramento.")
    } finally {
      setSalvando(false)
    }
  }

  async function handleDelete(monitoramento: Monitoramento) {
    const confirmed = window.confirm(`Excluir o monitoramento "${monitoramento.nome}"?`)
    if (!confirmed) return
    setErro("")
    setActionId(monitoramento.id)
    try {
      const res = await fetch(`/api/monitor?id=${monitoramento.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Não foi possível excluir o monitoramento.")
      onCreated()
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao excluir monitoramento.")
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
        body: JSON.stringify({ ativo: !m.ativo }),
      })
      if (!res.ok) throw new Error("Não foi possível atualizar o monitoramento.")
      onCreated()
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao atualizar monitoramento.")
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-blue-600" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider">Agendar monitoramento</h2>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Crie alertas por palavras-chave para acompanhar novas publicações automaticamente.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          aria-expanded={showForm}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Novo agendamento
        </button>
      </div>

      {erro && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </p>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="grid gap-3 rounded-lg border border-blue-200 bg-blue-50/70 p-4 lg:grid-cols-[1fr_1.5fr_120px_220px_auto] lg:items-end">
          <div>
            <label htmlFor="monitor-nome" className="mb-1 block text-xs font-medium text-zinc-500">Nome</label>
            <input
              id="monitor-nome"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: TI em SP"
              required
              className="w-full rounded-md border border-blue-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="monitor-palavras" className="mb-1 block text-xs font-medium text-zinc-500">Palavras-chave</label>
            <input
              id="monitor-palavras"
              type="text"
              value={palavras}
              onChange={(e) => setPalavras(e.target.value)}
              placeholder="software, suporte, nuvem"
              required
              className="w-full rounded-md border border-blue-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="monitor-uf" className="mb-1 block text-xs font-medium text-zinc-500">UF</label>
            <select id="monitor-uf" value={uf} onChange={(e) => setUf(e.target.value)} className="w-full rounded-md border border-blue-200 px-3 py-2 text-sm">
              <option value="">Todas</option>
              {UF_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="monitor-modalidade" className="mb-1 block text-xs font-medium text-zinc-500">Modalidade</label>
            <select id="monitor-modalidade" value={modalidadeId} onChange={(e) => setModalidadeId(e.target.value)} className="w-full rounded-md border border-blue-200 px-3 py-2 text-sm">
              <option value="">Todas</option>
              {MODALIDADES.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </div>
          <button
            type="submit"
            disabled={salvando}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {salvando ? "Salvando..." : "Agendar"}
          </button>
        </form>
      )}

      {monitoramentos.length === 0 && !showForm ? (
        <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/70 px-4 py-8 text-center">
          <p className="text-sm text-zinc-500">Nenhum monitoramento ativo.</p>
          <p className="mt-1 text-sm text-zinc-400">Crie um agendamento para receber notificações de novas licitações.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {monitoramentos.map((m) => (
            <article
              key={m.id}
              className={`rounded-lg border p-4 transition-colors ${
                m.ativo ? "border-zinc-200 bg-white" : "border-zinc-200 bg-zinc-50 opacity-70"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-zinc-800">{m.nome}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{m.palavras_chave.join(", ")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(m)}
                  disabled={actionId === m.id}
                  aria-label={`Excluir monitoramento ${m.nome}`}
                  className="shrink-0 rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className={`rounded px-2 py-1 text-xs font-medium ${m.ativo ? "bg-green-50 text-green-700" : "bg-zinc-100 text-zinc-500"}`}>
                  {m.ativo ? "Ativo" : "Pausado"}
                </span>
                {m.uf && <span className="rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-600">{m.uf}</span>}
                {m.modalidade_id && (
                  <span className="rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-600">
                    {MODALIDADES.find((mod) => mod.id === m.modalidade_id)?.nome}
                  </span>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-zinc-100 pt-3">
                <p className="flex items-center gap-1 text-xs text-zinc-400">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {m.ultima_verificacao ? `Verificado em ${formatDateShort(m.ultima_verificacao)}` : "Ainda não verificado"}
                </p>
                <button
                  type="button"
                  onClick={() => toggleAtivo(m)}
                  disabled={actionId === m.id}
                  aria-label={`${m.ativo ? "Pausar" : "Ativar"} monitoramento ${m.nome}`}
                  className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  {m.ativo ? "Pausar" : "Ativar"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}