"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Brand } from "@/components/brand"

export function PasswordRecoveryForm({ reset = false }: { reset?: boolean }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("erro")) {
      queueMicrotask(() => setError("O link de recuperação é inválido ou expirou. Solicite um novo link."))
    }
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (reset && password !== confirmation) {
      setError("As senhas não conferem.")
      return
    }
    setLoading(true)
    try {
      const res = await fetch(reset ? "/api/auth/redefinir-senha" : "/api/auth/recuperar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reset ? { password } : { email })
      })
      if (!res.ok) {
        setError(
          res.status === 401
            ? "Sua sessão de recuperação expirou. Solicite um novo link."
            : "Não foi possível concluir a solicitação. Tente novamente em alguns instantes."
        )
        return
      }
      setSuccess(true)
    } catch {
      setError("Não foi possível conectar. Confira sua conexão e tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Brand large />
          <h1 className="mt-5 text-xl font-semibold text-zinc-900">
            {reset ? "Definir nova senha" : "Recuperar sua senha"}
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            {reset ? "Escolha uma nova senha para sua conta." : "Receba um link de recuperação no seu email."}
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
              {error}
            </p>
          )}
          {success ? (
            <div role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
              {reset
                ? "Senha atualizada. Você já pode entrar com a nova senha."
                : "Se houver uma conta com este email, você receberá um link de recuperação. Confira também a pasta de spam."}
            </div>
          ) : (
            <>
              {reset ? (
                <>
                  <div>
                    <label htmlFor="nova-senha" className="mb-1 block text-sm font-medium text-zinc-700">
                      Nova senha
                    </label>
                    <input
                      id="nova-senha"
                      type="password"
                      required
                      minLength={6}
                      maxLength={1024}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      aria-describedby="ajuda-senha"
                      className="min-h-11 w-full rounded-lg border border-zinc-500 px-3 text-base sm:text-sm"
                    />
                    <p id="ajuda-senha" className="mt-1 text-xs text-zinc-600">
                      Use pelo menos 6 caracteres.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="confirmar-senha" className="mb-1 block text-sm font-medium text-zinc-700">
                      Confirmar nova senha
                    </label>
                    <input
                      id="confirmar-senha"
                      type="password"
                      required
                      minLength={6}
                      maxLength={1024}
                      autoComplete="new-password"
                      value={confirmation}
                      onChange={(e) => setConfirmation(e.target.value)}
                      className="min-h-11 w-full rounded-lg border border-zinc-500 px-3 text-base sm:text-sm"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label htmlFor="email-recuperacao" className="mb-1 block text-sm font-medium text-zinc-700">
                    Email
                  </label>
                  <input
                    id="email-recuperacao"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="min-h-11 w-full rounded-lg border border-zinc-500 px-3 text-base sm:text-sm"
                  />
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="min-h-11 w-full rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {loading ? "Enviando…" : reset ? "Salvar nova senha" : "Enviar link de recuperação"}
              </button>
            </>
          )}
          {reset && !success && (
            <Link
              href="/recuperar-senha"
              className="inline-flex min-h-11 items-center text-sm font-medium text-blue-700 hover:underline"
            >
              Solicitar novo link
            </Link>
          )}
          <Link
            href="/login"
            className="inline-flex min-h-11 w-full items-center justify-center text-sm font-medium text-blue-700 hover:underline"
          >
            Voltar para o login
          </Link>
        </form>
      </div>
    </div>
  )
}
