"use client"

import { useState } from "react"
import { Plus, Trash2, Clock } from "lucide-react"
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-600 uppercase tracking-wider">Monitoramentos</h3>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          aria-expanded={showForm}
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Novo
        </button>
      </div>

      {erro && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </p>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-2">
          <label htmlFor="monitor-nome" className="sr-only">Nome do monitoramento</label>
          <input
            id="monitor-nome"
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome do monitoramento"
            required
            className="w-full px-3 py-2 rounded-md border border-blue-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <label htmlFor="monitor-palavras" className="sr-only">Palavras-chave</label>
          <input
            id="monitor-palavras"
            type="text"
            value={palavras}
            onChange={(e) => setPalavras(e.target.value)}
            placeholder="Palavras-chave separadas por vírgula"
            required
            className="w-full px-3 py-2 rounded-md border border-blue-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label htmlFor="monitor-uf" className="sr-only">UF</label>
            <select id="monitor-uf" value={uf} onChange={(e) => setUf(e.target.value)} className="px-3 py-2 rounded-md border border-blue-200 text-sm">
              <option value="">Todas UF</option>
              {UF_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <label htmlFor="monitor-modalidade" className="sr-only">Modalidade</label>
            <select id="monitor-modalidade" value={modalidadeId} onChange={(e) => setModalidadeId(e.target.value)} className="px-3 py-2 rounded-md border border-blue-200 text-sm">
              <option value="">Todas modalidades</option>
              {MODALIDADES.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </div>
          <button
            type="submit"
            disabled={salvando}
            className="w-full py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {salvando ? "Salvando..." : "Criar Monitoramento"}
          </button>
        </form>
      )}

      {monitoramentos.length === 0 && !showForm && (
        <p className="text-sm text-zinc-400 text-center py-4">
          Nenhum monitoramento ativo. Crie um para receber notificações de novas licitações.
        </p>
      )}

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {monitoramentos.map((m) => (
          <div
            key={m.id}
            className={`p-3 rounded-lg border transition-colors ${
              m.ativo ? "bg-white border-zinc-200" : "bg-zinc-50 border-zinc-200 opacity-60"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-800 truncate">{m.nome}</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {m.palavras_chave.join(", ")}
                </p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {m.uf && <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500">{m.uf}</span>}
                  {m.modalidade_id && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500">
                      {MODALIDADES.find((mod) => mod.id === m.modalidade_id)?.nome}
                    </span>
                  )}
                </div>
                {m.ultima_verificacao && (
                  <p className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    Verificado em {formatDateShort(m.ultima_verificacao)}
                  </p>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleAtivo(m)}
                  disabled={actionId === m.id}
                  aria-label={`${m.ativo ? "Pausar" : "Ativar"} monitoramento ${m.nome}`}
                  className={`px-2 py-1 text-[10px] rounded transition-colors disabled:opacity-50 ${
                    m.ativo
                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                      : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                  }`}
                >
                  {m.ativo ? "Ativo" : "Pausado"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(m)}
                  disabled={actionId === m.id}
                  aria-label={`Excluir monitoramento ${m.nome}`}
                  className="p-1 text-zinc-400 hover:text-red-600 disabled:opacity-50 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
