"use client"

import Link from "next/link"
import { Bell, LogOut } from "lucide-react"
import { AppNav } from "@/components/app-nav"
import { Brand } from "@/components/brand"
import { NotificationBadge } from "@/components/notification-badge"
import { useAuth } from "@/components/auth-provider"

export function AppShell({
  children,
  unread,
  notificationError = false
}: {
  children: React.ReactNode
  unread: number | null
  notificationError?: boolean
}) {
  const { user, loading, loggingOut, logoutError, logout } = useAuth()
  const notificationLabel = notificationError
    ? "Notificações indisponíveis. Ver monitoramentos"
    : unread === null
      ? "Carregando notificações. Ver monitoramentos"
      : `${unread} publicações não lidas. Ver monitoramentos`

  return (
    <div className="min-h-screen bg-paper text-zinc-800">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3"
      >
        Ir para o conteúdo
      </a>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-ink text-white">
        <div className="mx-auto flex min-h-18 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:gap-10 lg:px-8">
          <Link href="/" aria-label="Afero — buscar licitações">
            <Brand inverse />
          </Link>
          <div className="hidden md:ml-5 md:block lg:ml-0">
            <AppNav />
          </div>
          <div className="ml-auto flex items-center gap-1 sm:gap-3">
            <Link
              href="/monitoramentos"
              aria-label={notificationLabel}
              title={notificationLabel}
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-lg text-zinc-200 hover:bg-white/10"
            >
              <Bell className="h-5 w-5" aria-hidden="true" />
              {unread !== null && !notificationError && (
                <span className="absolute -right-1 top-0">
                  <NotificationBadge count={unread} />
                </span>
              )}
              {notificationError && (
                <span
                  className="absolute right-0 top-0 rounded-full bg-amber-200 px-1.5 text-xs font-bold text-ink"
                  aria-hidden="true"
                >
                  !
                </span>
              )}
            </Link>
            <div className="flex items-center gap-1 border-l border-white/20 pl-2">
              <span className="hidden w-40 truncate text-sm text-zinc-200 lg:block" title={user?.email}>
                {loading ? "Carregando conta…" : (user?.email ?? "Conta")}
              </span>
              <button
                type="button"
                onClick={logout}
                disabled={loading || loggingOut || !user}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-zinc-200 hover:bg-white/10 disabled:opacity-50"
                aria-label={loggingOut ? "Saindo…" : "Sair"}
              >
                <LogOut className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 px-4 py-2 md:hidden">
          <div className="mx-auto max-w-7xl">
            <AppNav />
          </div>
        </div>
      </header>
      <main id="conteudo" className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-9 lg:px-8">
        {logoutError && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {logoutError}
          </p>
        )}
        {children}
      </main>
    </div>
  )
}
