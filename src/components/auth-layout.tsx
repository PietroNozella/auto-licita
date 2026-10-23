import type { ReactNode } from "react"
import Link from "next/link"
import { Brand } from "@/components/brand"

export function AuthLayout({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-paper px-4 py-10 text-zinc-800 sm:py-16">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <Link href="/" aria-label="Afero" className="inline-flex rounded-lg">
            <Brand large />
          </Link>
        </div>
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <header className="mb-7 space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
            <p className="text-sm leading-relaxed text-zinc-600">{description}</p>
          </header>
          {children}
        </section>
        <p className="mt-6 text-center text-xs leading-relaxed text-zinc-600">
          Busca e monitoramento de licitações públicas.
        </p>
      </div>
    </main>
  )
}
