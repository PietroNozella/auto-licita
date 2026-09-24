"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const ITENS = [
  { href: "/", rotulo: "Dashboard" },
  { href: "/monitoramentos", rotulo: "Monitoramentos" },
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
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              ativo
                ? "bg-blue-50 text-blue-700"
                : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
            }`}
          >
            {item.rotulo}
          </Link>
        )
      })}
    </nav>
  )
}
