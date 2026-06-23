"use client"

import { useState } from "react"
import { Search, SlidersHorizontal } from "lucide-react"
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
      <div className="grid gap-2 lg:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <label htmlFor="search-query" className="sr-only">Buscar licitações</label>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
          <input
            id="search-query"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por objeto, palavra-chave ou órgão"
            className="w-full rounded-lg border border-zinc-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Buscando..." : "Buscar"}
        </button>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          aria-label={showFilters ? "Ocultar filtros" : "Mostrar filtros"}
          aria-expanded={showFilters}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-colors",
            showFilters
              ? "border-blue-300 bg-blue-50 text-blue-700"
              : "border-zinc-300 text-zinc-600 hover:bg-zinc-50"
          )}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Filtros
        </button>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label htmlFor="data-inicial" className="mb-1 block text-xs font-medium text-zinc-500">Data inicial</label>
            <input
              id="data-inicial"
              type="date"
              value={dataInicial}
              onChange={(e) => setDataInicial(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="data-final" className="mb-1 block text-xs font-medium text-zinc-500">Data final</label>
            <input
              id="data-final"
              type="date"
              value={dataFinal}
              onChange={(e) => setDataFinal(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="modalidade" className="mb-1 block text-xs font-medium text-zinc-500">Modalidade</label>
            <select
              id="modalidade"
              value={modalidade}
              onChange={(e) => setModalidade(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              {MODALIDADES.map((m) => (
                <option key={m.id} value={m.id}>{m.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="uf" className="mb-1 block text-xs font-medium text-zinc-500">UF</label>
            <select
              id="uf"
              value={uf}
              onChange={(e) => setUf(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              {UF_LIST.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="cnpj" className="mb-1 block text-xs font-medium text-zinc-500">CNPJ do órgão</label>
            <input
              id="cnpj"
              type="text"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="00.000.000/0000-00"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
    </form>
  )
}