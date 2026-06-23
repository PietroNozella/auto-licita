"use client"

import { AuthProvider } from "@/components/auth-provider"

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}
