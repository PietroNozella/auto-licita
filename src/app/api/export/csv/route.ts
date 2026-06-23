import { NextRequest, NextResponse } from "next/server"
import Papa from "papaparse"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { headers, rows, filename } = body

    if (!headers || !rows) {
      return NextResponse.json(
        { error: "headers e rows são obrigatórios" },
        { status: 400 }
      )
    }

    const data = rows.map((row: Record<string, unknown>) => {
      const obj: Record<string, unknown> = {}
      for (const h of headers) {
        obj[h] = row[h] ?? ""
      }
      return obj
    })

    const csv = Papa.unparse(data)
    const nomeArquivo = filename ?? "licitacoes.csv"

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
