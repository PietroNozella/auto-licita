"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import type { User } from "@supabase/supabase-js"

interface AuthContextType {
  user: User | null
  loading: boolean
  loggingOut: boolean
  logoutError: string
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loggingOut: false,
  logoutError: "",
  logout: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState("")
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    fetch("/api/auth/usuario")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const logout = useCallback(async () => {
    setLoggingOut(true)
    setLogoutError("")
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" })
      if (!res.ok) throw new Error()
      setUser(null)
      setLeaving(true)
      window.location.replace("/login")
    } catch {
      setLogoutError("Não foi possível sair. Tente novamente.")
      setLoggingOut(false)
    }
  }, [])

  if (leaving) {
    return <p role="status" className="p-6 text-sm text-zinc-700">Saindo da sua conta…</p>
  }

  return (
    <AuthContext.Provider value={{ user, loading, loggingOut, logoutError, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
