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
    "Objeto": item.objetoCompra,
    "Órgão": item.orgaoEntidade?.razaoSocial,
    "CNPJ Órgão": item.orgaoEntidade?.cnpj,
    "Modalidade": item.modalidadeNome,
    "UF": item.unidadeOrgao?.ufSigla,
    "Município": item.unidadeOrgao?.municipioNome,
    "Valor Estimado": item.valorTotalEstimado,
    "Valor Homologado": item.valorTotalHomologado,
    "Número Controle PNCP": item.numeroControlePNCP,
    "Número Compra": item.numeroCompra,
    "Processo": item.processo,
    "Data Publicação": item.dataPublicacaoPncp,
    "Data Abertura": item.dataAberturaProposta,
    "Data Encerramento": item.dataEncerramentoProposta,
    "Link Edital": item.linkSistemaOrigem,
  }
}

export function ExportButton({ data }: ExportButtonProps) {
  const [copied, setCopied] = useState(false)
  const [showSheetModal, setShowSheetModal] = useState(false)
  const [sheetUrl, setSheetUrl] = useState("")
  const [sheetName, setSheetName] = useState("Licitações")
  const [exporting, setExporting] = useState(false)

  if (data.length === 0) return null

  async function exportCSV() {
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
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `licitacoes-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function copyJSON() {
    const rows = data.map(formatRow)
    await navigator.clipboard.writeText(JSON.stringify(rows, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function exportSheets() {
    if (!sheetUrl) return
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
      if (res.ok) {
        const result = await res.json()
        window.open(result.url, "_blank")
        setShowSheetModal(false)
      }
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-300 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          CSV
        </button>
        <button
          onClick={copyJSON}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-300 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
          JSON
        </button>
        <button
          onClick={() => setShowSheetModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-green-300 text-sm text-green-700 hover:bg-green-50 transition-colors"
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          Google Sheets
        </button>
      </div>

      {showSheetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Exportar para Google Sheets</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">
                  ID da planilha (URL)
                </label>
                <input
                  type="text"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full px-3 py-2 rounded-md border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">
                  Nome da aba
                </label>
                <input
                  type="text"
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6 justify-end">
              <button
                onClick={() => setShowSheetModal(false)}
                className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-800"
              >
                Cancelar
              </button>
              <button
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
