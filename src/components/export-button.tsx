"use client"

import { useState } from "react"
import { Download, FileSpreadsheet, Check, Copy } from "lucide-react"
import type { RecuperarCompraPublicacaoDTO } from "@/types/pncp"
import { dataSp } from "@/lib/utils"
import { Modal } from "@/components/modal"

interface ExportButtonProps {
  data: RecuperarCompraPublicacaoDTO[]
}

const sheetsEnabled = process.env.NEXT_PUBLIC_SHEETS_ENABLED === "true"

const EXPORT_HEADERS = [
  "Objeto",
  "Órgão",
  "CNPJ Órgão",
  "Modalidade",
  "UF",
  "Município",
  "Valor Estimado",
  "Valor Homologado",
  "Número de Controle",
  "Número Compra",
  "Processo",
  "Data Publicação",
  "Data Abertura",
  "Data Encerramento",
  "Link Edital"
]

function formatRow(item: RecuperarCompraPublicacaoDTO): Record<string, string | number | boolean | null> {
  return {
    Objeto: item.objetoCompra ?? null,
    Órgão: item.orgaoEntidade?.razaoSocial ?? null,
    "CNPJ Órgão": item.orgaoEntidade?.cnpj ?? null,
    Modalidade: item.modalidadeNome ?? null,
    UF: item.unidadeOrgao?.ufSigla ?? null,
    Município: item.unidadeOrgao?.municipioNome ?? null,
    "Valor Estimado": item.valorTotalEstimado ?? null,
    "Valor Homologado": item.valorTotalHomologado ?? null,
    "Número de Controle": item.numeroControlePNCP ?? null,
    "Número Compra": item.numeroCompra ?? null,
    Processo: item.processo ?? null,
    "Data Publicação": item.dataPublicacaoPncp ?? null,
    "Data Abertura": item.dataAberturaProposta ?? null,
    "Data Encerramento": item.dataEncerramentoProposta ?? null,
    "Link Edital": item.linkSistemaOrigem ?? null
  }
}

export function ExportButton({ data }: ExportButtonProps) {
  const [copied, setCopied] = useState(false)
  const [csvOk, setCsvOk] = useState(false)
  const [exportandoCSV, setExportandoCSV] = useState(false)
  const [showSheetModal, setShowSheetModal] = useState(false)
  const [sheetUrl, setSheetUrl] = useState("")
  const [sheetName, setSheetName] = useState("Licitações")
  const [exporting, setExporting] = useState(false)
  const [erro, setErro] = useState("")

  // Nome do arquivo no fuso de São Paulo (toISOString vira o dia às 21h BRT).
  const sufixoData = dataSp()

  if (data.length === 0) return null

  // Aceita ID puro ou URL completa da planilha.
  function extrairSpreadsheetId(valor: string): string {
    const m = valor.match(/\/d\/([a-zA-Z0-9-_]+)/)
    return m ? m[1] : valor.trim()
  }

  async function exportCSV() {
    setErro("")
    setCsvOk(false)
    setExportandoCSV(true)
    try {
      const rows = data.map(formatRow)
      const res = await fetch("/api/export/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headers: EXPORT_HEADERS,
          rows,
          filename: `licitacoes-${sufixoData}.csv`
        })
      })
      if (!res.ok) throw new Error("Não foi possível gerar o CSV.")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `licitacoes-${sufixoData}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setCsvOk(true)
      setTimeout(() => setCsvOk(false), 2000)
    } catch {
      setErro("Não foi possível gerar o CSV.")
    } finally {
      setExportandoCSV(false)
    }
  }

  async function copyJSON() {
    setErro("")
    try {
      const rows = data.map(formatRow)
      await navigator.clipboard.writeText(JSON.stringify(rows, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setErro("Não foi possível copiar o JSON.")
    }
  }

  async function exportSheets() {
    const spreadsheetId = extrairSpreadsheetId(sheetUrl)
    if (!spreadsheetId) return
    setErro("")
    setExporting(true)
    try {
      const rows = data.map(formatRow)
      const res = await fetch("/api/export/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spreadsheetId,
          sheetName,
          headers: EXPORT_HEADERS,
          rows
        })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? "Não foi possível exportar para o Google Sheets.")
      }
      const result = await res.json()
      window.open(result.url, "_blank")
      setShowSheetModal(false)
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao exportar para o Google Sheets.")
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={exportCSV}
          disabled={exportandoCSV}
          className="inline-flex items-center gap-1.5 px-3 min-h-11 py-2 rounded-md border border-zinc-500 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50"
        >
          {csvOk ? (
            <Check className="h-3.5 w-3.5 text-green-600" aria-hidden="true" />
          ) : (
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {exportandoCSV ? "Gerando..." : csvOk ? "Baixado" : "CSV"}
        </button>
        <details className="relative">
          <summary className="flex min-h-11 cursor-pointer items-center rounded-md px-3 text-sm text-zinc-600 hover:bg-zinc-100">
            Mais formatos
          </summary>
          <div className="absolute right-0 top-full z-20 mt-1 min-w-40 rounded-lg border border-zinc-200 bg-white p-2 shadow-md">
            <button
              type="button"
              onClick={copyJSON}
              className="inline-flex items-center gap-1.5 px-3 min-h-11 py-2 rounded-md border border-zinc-500 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-600" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {copied ? "Copiado" : "JSON"}
            </button>
          </div>
        </details>
        {sheetsEnabled && (
          <button
            type="button"
            onClick={() => {
              setErro("")
              setShowSheetModal(true)
            }}
            className="inline-flex items-center gap-1.5 px-3 min-h-11 py-2 rounded-md border border-green-300 text-sm text-green-700 hover:bg-green-50 transition-colors"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
            Google Sheets
          </button>
        )}
      </div>

      {!showSheetModal && erro && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {erro}
        </p>
      )}

      {showSheetModal && (
        <Modal titulo="Exportar para Google Sheets" onClose={() => setShowSheetModal(false)}>
          {erro && (
            <div
              role="alert"
              className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {erro}
            </div>
          )}
          <div className="mt-4 space-y-3">
            <div>
              <label htmlFor="sheet-url" className="block text-xs font-medium text-zinc-500 mb-1">
                ID da planilha ou URL
              </label>
              <input
                id="sheet-url"
                type="text"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="w-full px-3 py-2 rounded-md border border-zinc-500 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="sheet-name" className="block text-xs font-medium text-zinc-500 mb-1">
                Nome da aba
              </label>
              <input
                id="sheet-name"
                type="text"
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-zinc-500 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-6 justify-end">
            <button
              type="button"
              onClick={() => setShowSheetModal(false)}
              className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={exportSheets}
              disabled={!sheetUrl || exporting}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              {exporting ? "Exportando..." : "Exportar"}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
