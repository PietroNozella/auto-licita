import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/supabase-server"
import Papa from "papaparse"

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }
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
