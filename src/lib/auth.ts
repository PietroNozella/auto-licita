import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function getAuthClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase env vars não configuradas")
  }
  return createClient(supabaseUrl, supabaseAnonKey)
}
