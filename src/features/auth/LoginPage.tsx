import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { ROLE_HOME } from '../../lib/constants'

export function LoginPage() {
  const { loading, profile, configError, error, signIn } = useAuth()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && profile) {
    return <Navigate to={ROLE_HOME[profile.role]} replace />
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!identifier.trim() || !password) {
      setLocalError('Preencha o código e a senha.')
      return
    }
    setLocalError(null)
    setSubmitting(true)
    try {
      await signIn(identifier, password)
    } catch {
      setLocalError(null)
    } finally {
      setSubmitting(false)
    }
  }

  const message = localError ?? error

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-10">
      <section className="nexo-card w-full">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-800 text-lg font-extrabold text-white">
            N
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-brand-900">NEXO</h1>
            <p className="text-sm text-slate-600">
              Missões de foco, autorregulação, convivência e cultura digital.
            </p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="nexo-label" htmlFor="identifier">
              Código ou e-mail
            </label>
            <input
              id="identifier"
              className="nexo-input"
              autoComplete="username"
              autoCapitalize="characters"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="NX-0000"
              disabled={Boolean(configError) || submitting}
            />
          </div>
          <div>
            <label className="nexo-label" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              className="nexo-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={Boolean(configError) || submitting}
            />
          </div>

          {configError ? (
            <p className="rounded-2xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">
              {configError}
            </p>
          ) : null}
          {message && !configError ? (
            <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800" role="alert">
              {message}
            </p>
          ) : null}

          <button className="nexo-btn w-full" type="submit" disabled={Boolean(configError) || submitting}>
            {submitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="mt-4 text-xs leading-5 text-slate-500">
          Aluno entra com o código da escola. A equipe entra com o e-mail. O NEXO não usa câmera,
          microfone nem localização.
        </p>
      </section>
    </main>
  )
}