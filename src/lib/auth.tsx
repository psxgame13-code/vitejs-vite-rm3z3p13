import type { Session, User } from '@supabase/supabase-js'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { loginEmail } from './constants'
import { supabase, supabaseConfigError } from './supabase'
import type { Profile } from './types'

type AuthState = {
  loading: boolean
  session: Session | null
  user: User | null
  profile: Profile | null
  configError: string | null
  error: string | null
  signIn: (identifier: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

const PROFILE_COLUMNS =
  'id, role, school_id, municipality_id, internal_code, display_name, active, created_at, updated_at'

async function loadProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return (data as Profile | null) ?? null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [booting, setBooting] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(supabaseConfigError)

  const applyProfile = useCallback(async (userId: string) => {
    if (!supabase) return
    setProfileLoading(true)
    try {
      const next = await loadProfile(userId)
      if (!next) {
        setProfile(null)
        setError('Perfil não encontrado. Peça ajuda à administração.')
        await supabase.auth.signOut()
        return
      }
      if (!next.active) {
        setProfile(null)
        setError('Esta conta está desativada.')
        await supabase.auth.signOut()
        return
      }
      setProfile(next)
      setError(null)
    } catch {
      setProfile(null)
      setError('Não foi possível carregar o perfil.')
    } finally {
      setProfileLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!supabase) {
      setBooting(false)
      return
    }

    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      setSession(data.session)
      setBooting(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (!nextSession) setProfile(null)
    })

    return () => {
      alive = false
      data.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (booting) return
    const userId = session?.user.id
    if (!userId) {
      setProfile(null)
      setProfileLoading(false)
      return
    }
    void applyProfile(userId)
  }, [applyProfile, booting, session?.user.id])

  const signIn = useCallback(async (identifier: string, password: string) => {
    if (!supabase) {
      setError(supabaseConfigError)
      throw new Error(supabaseConfigError ?? 'Supabase não configurado.')
    }
    setError(null)
    const email = loginEmail(identifier)
    const { error: signError } = await supabase.auth.signInWithPassword({ email, password })
    if (signError) {
      const message = 'Código ou senha não conferem.'
      setError(message)
      throw new Error(message)
    }
  }, [])

  const signOut = useCallback(async () => {
    setProfile(null)
    setError(null)
    if (!supabase) return
    await supabase.auth.signOut()
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!session?.user.id) return
    await applyProfile(session.user.id)
  }, [applyProfile, session?.user.id])

  const value = useMemo<AuthState>(
    () => ({
      loading: booting || profileLoading,
      session,
      user: session?.user ?? null,
      profile,
      configError: supabaseConfigError,
      error,
      signIn,
      signOut,
      refreshProfile,
    }),
    [booting, error, profile, profileLoading, refreshProfile, session, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth precisa ficar dentro de AuthProvider.')
  }
  return value
}