import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (typeof email !== "string" || !email.trim() || email.length > 254 || !email.includes("@")) {
      return NextResponse.json({ error: "Informe um email válido." }, { status: 400 })
    }
    const supabase = await getSupabaseServer()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: new URL("/api/auth/recuperar-senha", request.url).toString()
    })
    if (error) return NextResponse.json({ error: "Não foi possível enviar a recuperação." }, { status: 503 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Não foi possível solicitar a recuperação." }, { status: 503 })
  }
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  if (code) {
    try {
      const supabase = await getSupabaseServer()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) return NextResponse.redirect(new URL("/redefinir-senha", request.url))
    } catch {
      /* O usuário recebe uma ação para solicitar outro link. */
    }
  }
  return NextResponse.redirect(new URL("/recuperar-senha?erro=link", request.url))
}
