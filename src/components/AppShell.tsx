import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { NAV_BY_ROLE, ROLE_LABEL } from '../lib/constants'

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth()
  if (!profile) return null

  const items = NAV_BY_ROLE[profile.role]

  return (
    <div className="min-h-screen">
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className="border-b border-brand-100 bg-white/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-800 font-extrabold text-white">
              N
            </span>
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-brand-900">NEXO</p>
              <p className="truncate text-xs text-slate-500">
                {ROLE_LABEL[profile.role]} · {profile.display_name}
              </p>
            </div>
          </div>
          <button className="nexo-btn-ghost shrink-0" type="button" onClick={() => void signOut()}>
            Sair
          </button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3" aria-label="Seções">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={items.some((other) => other.to.startsWith(`${item.to}/`))}
              className={({ isActive }) =>
                `min-h-[44px] whitespace-nowrap rounded-2xl px-3 py-2 text-sm font-extrabold ${
                  isActive ? 'bg-brand-800 text-white' : 'bg-brand-50 text-brand-800'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main id="conteudo" className="mx-auto w-full max-w-6xl px-4 py-6">
        {children}
      </main>
    </div>
  )
}