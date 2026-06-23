"use client"

import { useState } from "react"
import { Download, FileSpreadsheet, Check, Copy } from "lucide-react"
import type { RecuperarCompraPublicacaoDTO } from "@/types/pncp"

interface ExportButtonProps {
  data: RecuperarCompraPublicacaoDTO[]
}

const EXPORT_HEADERS = [
  "Objeto",
  "Órgão",
  "CNPJ Órgão",
  "Modalidade",
  "UF",
  "Município",
  "Valor Estimado",
  "Valor Homologado",
  "Número Controle PNCP",
  "Número Compra",
  "Processo",
  "Data Publicação",
  "Data Abertura",
  "Data Encerramento",
  "Link Edital",
]

function formatRow(item: RecuperarCompraPublicacaoDTO): Record<string, string | number | boolean | null> {
  return {
    "Objeto": item.objetoCompra ?? null,
    "Órgão": item.orgaoEntidade?.razaoSocial ?? null,
    "CNPJ Órgão": item.orgaoEntidade?.cnpj ?? null,
    "Modalidade": item.modalidadeNome ?? null,
    "UF": item.unidadeOrgao?.ufSigla ?? null,
    "Município": item.unidadeOrgao?.municipioNome ?? null,
    "Valor Estimado": item.valorTotalEstimado ?? null,
    "Valor Homologado": item.valorTotalHomologado ?? null,
    "Número Controle PNCP": item.numeroControlePNCP ?? null,
    "Número Compra": item.numeroCompra ?? null,
    "Processo": item.processo ?? null,
    "Data Publicação": item.dataPublicacaoPncp ?? null,
    "Data Abertura": item.dataAberturaProposta ?? null,
    "Data Encerramento": item.dataEncerramentoProposta ?? null,
    "Link Edital": item.linkSistemaOrigem ?? null,
  }
}

export function ExportButton({ data }: ExportButtonProps) {
  const [copied, setCopied] = useState(false)
  const [showSheetModal, setShowSheetModal] = useState(false)
  const [sheetUrl, setSheetUrl] = useState("")
  const [sheetName, setSheetName] = useState("Licitações")
  const [exporting, setExporting] = useState(false)
  const [erro, setErro] = useState("")

  if (data.length === 0) return null

  async function exportCSV() {
    setErro("")
    const rows = data.map(formatRow)
    const res = await fetch("/api/export/csv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        headers: EXPORT_HEADERS,
        rows,
        filename: `licitacoes-${new Date().toISOString().split("T")[0]}.csv`,
      }),
    })
    if (!res.ok) {
      setErro("Não foi possível gerar o CSV.")
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `licitacoes-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
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
    if (!sheetUrl) return
    setErro("")
    setExporting(true)
    try {
      const rows = data.map(formatRow)
      const res = await fetch("/api/export/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spreadsheetId: sheetUrl,
          sheetName,
          headers: EXPORT_HEADERS,
          rows,
        }),
      })
      if (!res.ok) throw new Error("Não foi possível exportar para o Google Sheets.")
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-300 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          CSV
        </button>
        <button
          type="button"
          onClick={copyJSON}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-300 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-600" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
          {copied ? "Copiado" : "JSON"}
        </button>
        <button
          type="button"
          onClick={() => setShowSheetModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-green-300 text-sm text-green-700 hover:bg-green-50 transition-colors"
        >
          <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
          Google Sheets
        </button>
      </div>

      {erro && <p role="alert" className="mt-2 text-sm text-red-600">{erro}</p>}

      {showSheetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-sheets-title"
            className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
          >
            <h3 id="export-sheets-title" className="text-lg font-semibold mb-4">Exportar para Google Sheets</h3>
            <div className="space-y-3">
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
                  className="w-full px-3 py-2 rounded-md border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 rounded-md border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {exporting ? "Exportando..." : "Exportar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
