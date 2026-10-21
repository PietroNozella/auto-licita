"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const ITENS = [
  { href: "/", rotulo: "Busca" },
  { href: "/monitoramentos", rotulo: "Monitoramentos" }
]

export function AppNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Navegação principal" className="flex items-center gap-1">
      {ITENS.map((item) => {
        const ativo = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={ativo ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium transition-colors ${
              ativo ? "bg-white/15 text-white" : "text-zinc-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            {item.rotulo}
          </Link>
        )
      })}
    </nav>
  )
}
