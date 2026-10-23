import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"

export async function POST() {
  try {
    const supabase = await getSupabaseServer()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Não foi possível sair. Tente novamente." }, { status: 503 })
  }
}
