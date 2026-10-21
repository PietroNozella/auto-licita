import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    if (typeof password !== "string" || password.length < 6 || password.length > 1024) {
      return NextResponse.json({ error: "Use uma senha de 6 a 1024 caracteres." }, { status: 400 })
    }
    const supabase = await getSupabaseServer()
    const {
      data: { user },
      error: sessionError
    } = await supabase.auth.getUser()
    if (sessionError || !user)
      return NextResponse.json({ error: "Solicite um novo link de recuperação." }, { status: 401 })
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return NextResponse.json({ error: "Não foi possível atualizar a senha." }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar a senha." }, { status: 503 })
  }
}
