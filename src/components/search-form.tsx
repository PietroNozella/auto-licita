"use client"

import { useRef, useState } from "react"
import { Search, SlidersHorizontal } from "lucide-react"
import { dataSp, paraDataIso } from "@/lib/utils"
import { MODALIDADES, UF_LIST } from "@/lib/pncp-api"
import type { FiltrosBusca } from "@/lib/busca-licitacoes"

function mascararCnpj(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
}

export function SearchForm({
  onSearch,
  loading,
  initial
}: {
  onSearch: (params: FiltrosBusca) => void
  loading?: boolean
  initial?: FiltrosBusca
}) {
  const [query, setQuery] = useState(initial?.query ?? "")
  const [dataInicial, setDataInicial] = useState(() =>
    initial?.dataInicial ? paraDataIso(initial.dataInicial) : dataSp(30)
  )
  const [dataFinal, setDataFinal] = useState(() =>
    initial?.dataFinal ? paraDataIso(initial.dataFinal) : dataSp()
  )
  const [modalidade, setModalidade] = useState(initial?.modalidade ?? "")
  const [uf, setUf] = useState(initial?.uf ?? "")
  const [cnpj, setCnpj] = useState(() => mascararCnpj(initial?.cnpj ?? ""))
  const [cnpjTouched, setCnpjTouched] = useState(false)
  const cnpjRef = useRef<HTMLInputElement>(null)
  const [showFilters, setShowFilters] = useState(Boolean(initial?.modalidade || initial?.uf || initial?.cnpj))
  const filtrosAtivos = [modalidade, uf, cnpj].filter(Boolean).length
  const cnpjInvalido = cnpj.length > 0 && cnpj.replace(/\D/g, "").length !== 14
  const periodo = [7, 30, 90].find((days) => dataInicial === dataSp(days) && dataFinal === dataSp())

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (cnpjInvalido) {
      setCnpjTouched(true)
      setShowFilters(true)
      requestAnimationFrame(() => cnpjRef.current?.focus())
      return
    }
    onSearch({
      query,
      dataInicial: dataInicial.replace(/-/g, ""),
      dataFinal: dataFinal.replace(/-/g, ""),
      modalidade,
      uf,
      cnpj: cnpj.replace(/\D/g, "")
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <label htmlFor="search-query" className="sr-only">
            Objeto, palavra-chave ou órgão
          </label>
          <Search
            className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500"
            aria-hidden="true"
          />
          <input
            id="search-query"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Objeto, palavra-chave ou órgão"
            className="w-full rounded-lg border border-zinc-500 bg-white py-3 pl-10 pr-3 text-base sm:text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="min-h-11 rounded-lg bg-blue-700 px-6 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Buscando…" : "Buscar licitações"}
        </button>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          aria-expanded={showFilters}
          aria-controls="filtros-adicionais"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-zinc-500 px-4 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Filtros{filtrosAtivos > 0 ? ` (${filtrosAtivos})` : ""}
        </button>
      </div>
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium text-zinc-700">Período de publicação</legend>
        <div className="flex flex-wrap gap-2">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              type="button"
              aria-pressed={periodo === days}
              onClick={() => {
                setDataInicial(dataSp(days))
                setDataFinal(dataSp())
              }}
              className={`min-h-11 rounded-lg border px-3 text-sm ${periodo === days ? "border-blue-700 bg-blue-50 font-medium text-blue-800" : "border-zinc-500 text-zinc-700 hover:bg-zinc-50"}`}
            >
              Últimos {days} dias
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:max-w-lg sm:grid-cols-2">
          <div>
            <label htmlFor="data-inicial" className="mb-1 block text-sm text-zinc-600">
              De
            </label>
            <input
              id="data-inicial"
              type="date"
              required
              max={dataFinal}
              value={dataInicial}
              onChange={(e) => setDataInicial(e.target.value)}
              className="min-h-11 w-full min-w-0 rounded-lg border border-zinc-500 bg-white px-3 text-base sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="data-final" className="mb-1 block text-sm text-zinc-600">
              Até
            </label>
            <input
              id="data-final"
              type="date"
              required
              min={dataInicial}
              value={dataFinal}
              onChange={(e) => setDataFinal(e.target.value)}
              className="min-h-11 w-full min-w-0 rounded-lg border border-zinc-500 bg-white px-3 text-base sm:text-sm"
            />
          </div>
        </div>
      </fieldset>
      {showFilters && (
        <div id="filtros-adicionais" className="grid gap-3 border-t border-zinc-200 pt-4 sm:grid-cols-3">
          <div>
            <label htmlFor="modalidade" className="mb-1 block text-sm text-zinc-600">
              Modalidade
            </label>
            <select
              id="modalidade"
              value={modalidade}
              onChange={(e) => setModalidade(e.target.value)}
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
          <div>
            <label htmlFor="uf" className="mb-1 block text-sm text-zinc-600">
              UF
            </label>
            <select
              id="uf"
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
            <label htmlFor="cnpj" className="mb-1 block text-sm text-zinc-600">
              CNPJ do órgão
            </label>
            <input
              ref={cnpjRef}
              id="cnpj"
              type="text"
              inputMode="numeric"
              value={cnpj}
              onChange={(e) => setCnpj(mascararCnpj(e.target.value))}
              onBlur={() => setCnpjTouched(true)}
              placeholder="00.000.000/0000-00"
              aria-invalid={cnpjTouched && cnpjInvalido}
              aria-describedby={cnpjTouched && cnpjInvalido ? "cnpj-erro" : undefined}
              className="min-h-11 w-full rounded-lg border border-zinc-500 bg-white px-3 text-base sm:text-sm"
            />
            {cnpjTouched && cnpjInvalido && (
              <p id="cnpj-erro" className="mt-1 text-sm text-red-700">
                Informe os 14 dígitos do CNPJ.
              </p>
            )}
          </div>
        </div>
      )}
    </form>
  )
}
