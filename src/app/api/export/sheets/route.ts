import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/supabase-server"
import { exportarParaSheets } from "@/lib/google-sheets"

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }
    const body = await request.json()
    const { spreadsheetId, sheetName, headers, rows } = body

    if (!spreadsheetId || !sheetName || !headers || !rows) {
      return NextResponse.json(
        { error: "spreadsheetId, sheetName, headers e rows são obrigatórios" },
        { status: 400 }
      )
    }

    const url = await exportarParaSheets(spreadsheetId, sheetName, headers, rows)
    return NextResponse.json({ url })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
