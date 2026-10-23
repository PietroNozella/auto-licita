"use client"

import { useState } from "react"
import Link from "next/link"
import { AlertCircle, Eye, EyeOff } from "lucide-react"
import { AuthLayout } from "@/components/auth-layout"
import { traduzirErroAuth } from "@/lib/auth-erros"

const signupEnabled = process.env.NEXT_PUBLIC_SIGNUP_ENABLED === "true"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(traduzirErroAuth(data.error ?? "Erro ao fazer login"))
      window.location.replace("/")
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao fazer login")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Entrar na sua conta" description="Acesse suas buscas e acompanhe seus monitoramentos.">
      <form onSubmit={handleSubmit} className="space-y-5">
        {erro && (
          <div
            role="alert"
            className="flex items-start gap-2 text-sm text-red-700 bg-red-50 rounded-lg p-3"
          >
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-zinc-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            autoComplete="email"
            required
            className="w-full px-3 py-2.5 rounded-lg border border-zinc-500 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-medium text-zinc-700">
            Senha
          </label>
          <div className="relative">
            <input
              id="password"
              type={mostrarSenha ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha"
              autoComplete="current-password"
              required
              className="w-full px-3 py-2.5 pr-11 rounded-lg border border-zinc-500 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setMostrarSenha(!mostrarSenha)}
              aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
              className="absolute right-0 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded text-zinc-600"
            >
              {mostrarSenha ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        <Link
          href="/recuperar-senha"
          className="inline-flex min-h-11 items-center text-sm font-medium text-blue-700 hover:underline"
        >
          Esqueci minha senha
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="min-h-11 w-full py-2.5 bg-ink text-white rounded-lg text-sm font-medium hover:bg-ink-hover disabled:opacity-50 transition-colors"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        {signupEnabled && (
          <p className="text-center text-sm text-zinc-500">
            Não tem conta?{" "}
            <Link href="/cadastro" className="text-blue-600 hover:underline">
              Cadastre-se
            </Link>
          </p>
        )}
      </form>
    </AuthLayout>
  )
}
