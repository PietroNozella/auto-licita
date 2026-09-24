import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServer, getUserId } from "@/lib/supabase-server"

export async function GET() {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }
    const supabase = await getSupabaseServer()
    const { data, error } = await supabase
      .from("monitoramentos")
      .select("*")
      .eq("user_id", userId)
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
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }
    const supabase = await getSupabaseServer()
    const body = await request.json()
    const nome = typeof body.nome === "string" ? body.nome.trim() : ""
    if (!nome) {
      return NextResponse.json({ error: "nome é obrigatório" }, { status: 400 })
    }
    const { data, error } = await supabase
      .from("monitoramentos")
      .insert({
        user_id: userId,
        nome,
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
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }
    const supabase = await getSupabaseServer()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "id é obrigatório" }, { status: 400 })
    }
    const body = await request.json()
    const update: Record<string, unknown> = {}
    if (body.nome !== undefined) update.nome = body.nome
    if (body.palavras_chave !== undefined) update.palavras_chave = body.palavras_chave
    if (body.uf !== undefined) update.uf = body.uf
    if (body.modalidade_id !== undefined) update.modalidade_id = body.modalidade_id
    if (body.cnpj_orgao !== undefined) update.cnpj_orgao = body.cnpj_orgao
    if (body.ativo !== undefined) update.ativo = body.ativo
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "nenhum campo válido para atualizar" }, { status: 400 })
    }
    const { data, error } = await supabase
      .from("monitoramentos")
      .update(update)
      .eq("id", id)
      .eq("user_id", userId)
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
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }
    const supabase = await getSupabaseServer()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "id é obrigatório" }, { status: 400 })
    }
    const { error } = await supabase
      .from("monitoramentos")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
