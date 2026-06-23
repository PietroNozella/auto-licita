"use client"

import { useState } from "react"
import { Search, Filter } from "lucide-react"
import { cn } from "@/lib/utils"
import { MODALIDADES, UF_LIST } from "@/lib/pncp-api"

interface SearchFormProps {
  onSearch: (params: {
    query: string
    dataInicial: string
    dataFinal: string
    modalidade: string
    uf: string
    cnpj: string
  }) => void
  loading?: boolean
}

export function SearchForm({ onSearch, loading }: SearchFormProps) {
  const [query, setQuery] = useState("")
  const [dataInicial, setDataInicial] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split("T")[0]
  })
  const [dataFinal, setDataFinal] = useState(() => new Date().toISOString().split("T")[0])
  const [modalidade, setModalidade] = useState("")
  const [uf, setUf] = useState("")
  const [cnpj, setCnpj] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSearch({
      query,
      dataInicial: dataInicial.replace(/-/g, ""),
      dataFinal: dataFinal.replace(/-/g, ""),
      modalidade,
      uf,
      cnpj,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por objeto da licitação, palavra-chave..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Buscando..." : "Buscar"}
        </button>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "px-3 py-2.5 rounded-lg border text-sm transition-colors",
            showFilters
              ? "bg-blue-50 border-blue-300 text-blue-700"
              : "border-zinc-300 text-zinc-600 hover:bg-zinc-50"
          )}
        >
          <Filter className="h-4 w-4" />
        </button>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-zinc-50 rounded-lg border">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Data inicial</label>
            <input
              type="date"
              value={dataInicial}
              onChange={(e) => setDataInicial(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Data final</label>
            <input
              type="date"
              value={dataFinal}
              onChange={(e) => setDataFinal(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Modalidade</label>
            <select
              value={modalidade}
              onChange={(e) => setModalidade(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              {MODALIDADES.map((m) => (
                <option key={m.id} value={m.id}>{m.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">UF</label>
            <select
              value={uf}
              onChange={(e) => setUf(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              {UF_LIST.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="block text-xs font-medium text-zinc-500 mb-1">CNPJ do órgão (opcional)</label>
            <input
              type="text"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="00.000.000/0000-00"
              className="w-full px-3 py-2 rounded-md border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
    </form>
  )
}
