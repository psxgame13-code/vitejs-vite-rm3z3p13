import { PEDAGOGICAL_NOTICE } from '../lib/constants'

export function PedagogicalNotice() {
  return (
    <p
      className="rounded-2xl bg-amber-50 px-3 py-2 text-sm font-bold leading-5 text-amber-950 ring-1 ring-amber-100"
      role="note"
    >
      {PEDAGOGICAL_NOTICE}
    </p>
  )
}