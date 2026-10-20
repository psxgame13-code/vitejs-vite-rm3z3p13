import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

function looksLikeServiceRole(key: string): boolean {
  const payload = key.split('.')[1]
  if (!payload) return false

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const json = JSON.parse(atob(normalized)) as { role?: string }
    return json.role === 'service_role'
  } catch {
    return false
  }
}

function configError(): string | null {
  if (!url || !anonKey) {
    return 'Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente.'
  }

  if (looksLikeServiceRole(anonKey)) {
    return 'A chave colada é service_role. Use apenas a chave anon no frontend.'
  }

  return null
}

export const supabaseConfigError = configError()

export const supabase: SupabaseClient | null = supabaseConfigError
  ? null
  : createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: 'nexo-auth',
      },
    })

export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(supabaseConfigError ?? 'Supabase não configurado.')
  }

  return supabase
}