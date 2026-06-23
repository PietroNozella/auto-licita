"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { FileSearch, AlertCircle, CheckCircle } from "lucide-react"

export default function CadastroPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [erro, setErro] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro("")
    setSuccess("")

    if (password !== confirmPassword) {
      setErro("Senhas não conferem")
      return
    }
    if (password.length < 6) {
      setErro("Senha deve ter no mínimo 6 caracteres")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erro ao cadastrar")

      setSuccess("Conta criada com sucesso! Redirecionando para o login...")
      setTimeout(() => router.push("/login"), 1500)
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao cadastrar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <FileSearch className="h-10 w-10 text-blue-600 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-zinc-800">Criar Conta</h1>
          <p className="text-sm text-zinc-400 mt-1">Cadastre-se para usar o dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4">
          {erro && (
            <div role="alert" className="flex items-start gap-2 text-sm text-red-700 bg-red-50 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{erro}</span>
            </div>
          )}
          {success && (
            <div role="alert" className="flex items-start gap-2 text-sm text-green-700 bg-green-50 rounded-lg p-3">
              <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-zinc-600 mb-1">Nome (opcional)</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-600 mb-1">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-600 mb-1">Senha</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
              className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-600 mb-1">Confirmar senha</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a senha"
              required
              minLength={6}
              className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !!success}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Cadastrando..." : "Criar Conta"}
          </button>

          <p className="text-center text-sm text-zinc-400">
            Já tem conta?{" "}
            <Link href="/login" className="text-blue-600 hover:underline">Fazer login</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
