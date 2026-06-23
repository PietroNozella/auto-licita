import { NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function GET() {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from("monitoramentos")
      .select("*")
      .order("created_at", { ascending: false })
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const body = await request.json()
    const { data, error } = await supabase
      .from("monitoramentos")
      .insert({
        nome: body.nome,
        palavras_chave: body.palavras_chave ?? [],
        uf: body.uf ?? null,
        modalidade_id: body.modalidade_id ?? null,
        cnpj_orgao: body.cnpj_orgao ?? null,
      })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "id é obrigatório" }, { status: 400 })
    }
    const body = await request.json()
    const { data, error } = await supabase
      .from("monitoramentos")
      .update(body)
      .eq("id", id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "id é obrigatório" }, { status: 400 })
    }
    const { error } = await supabase.from("monitoramentos").delete().eq("id", id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
