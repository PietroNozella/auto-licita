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
    const palavras = Array.isArray(body.palavras_chave)
      ? body.palavras_chave.filter((p: unknown) => typeof p === "string")
      : []
    // A API consultada só opera com 14 dígitos; máscara é limpa na gravação.
    const cnpjOrgao = typeof body.cnpj_orgao === "string"
      ? body.cnpj_orgao.replace(/\D/g, "") || null
      : null
    const { data, error } = await supabase
      .from("monitoramentos")
      .insert({
        user_id: userId,
        nome,
        palavras_chave: palavras,
        uf: typeof body.uf === "string" && body.uf ? body.uf : null,
        modalidade_id: typeof body.modalidade_id === "number" ? body.modalidade_id : null,
        cnpj_orgao: cnpjOrgao,
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
    if (typeof body.nome === "string" && body.nome.trim()) update.nome = body.nome.trim()
    if (Array.isArray(body.palavras_chave)) {
      update.palavras_chave = body.palavras_chave.filter((p: unknown) => typeof p === "string")
    }
    if (typeof body.uf === "string") update.uf = body.uf || null
    if (typeof body.modalidade_id === "number") update.modalidade_id = body.modalidade_id
    if (typeof body.cnpj_orgao === "string") {
      update.cnpj_orgao = body.cnpj_orgao.replace(/\D/g, "") || null
    }
    if (typeof body.ativo === "boolean") update.ativo = body.ativo
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
