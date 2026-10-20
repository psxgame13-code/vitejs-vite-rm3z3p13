import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { AppShell } from '../../components/AppShell'
import { DataTable, type DataColumn } from '../../components/DataTable'
import { PedagogicalNotice } from '../../components/PedagogicalNotice'
import { useAuth } from '../../lib/auth'
import { ROLE_LABEL, loginEmail } from '../../lib/constants'
import { supabase } from '../../lib/supabase'
import type { AuditLog, UserRole } from '../../lib/types'

type SchoolRow = { id: string; name: string }
type ClassRow = { id: string; schoolId: string; name: string; grade: number; schoolYear: number }
type PersonRow = {
  id: string
  code: string
  name: string
  role: UserRole
  schoolId: string | null
  active: boolean
}

const ROLES: UserRole[] = ['student', 'teacher', 'principal', 'secretary', 'admin']

function formatWhen(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

async function postAdmin(token: string, body: Record<string, unknown>): Promise<string | null> {
  const response = await fetch('/.netlify/functions/admin-users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  const payload = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null
  if (!response.ok || !payload?.ok) {
    return payload?.message ?? 'A função de administração não concluiu o pedido.'
  }
  return null
}

export function AdminHome() {
  const { profile, session } = useAuth()
  const [schools, setSchools] = useState<SchoolRow[]>([])
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [people, setPeople] = useState<PersonRow[]>([])
  const [audit, setAudit] = useState<Pick<AuditLog, 'id' | 'action' | 'summary' | 'created_at'>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [schoolName, setSchoolName] = useState('')
  const [classSchoolId, setClassSchoolId] = useState('')
  const [className, setClassName] = useState('')
  const [grade, setGrade] = useState(6)
  const [schoolYear, setSchoolYear] = useState(new Date().getFullYear())
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('student')
  const [code, setCode] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [personSchoolId, setPersonSchoolId] = useState('')
  const [linkClassId, setLinkClassId] = useState('')
  const [linkPersonId, setLinkPersonId] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!profile || !supabase) return
    setLoading(true)
    setError(null)
    const [schoolResult, classResult, peopleResult, auditResult] = await Promise.all([
      supabase.from('schools').select('id, name').eq('active', true).order('name'),
      supabase.from('classes').select('id, school_id, name, grade, school_year').eq('active', true).order('grade'),
      supabase.from('profiles').select('id, internal_code, display_name, role, school_id, active').order('internal_code'),
      supabase.from('audit_log').select('id, action, summary, created_at').order('created_at', { ascending: false }).limit(20),
    ])
    if (schoolResult.error || classResult.error || peopleResult.error) {
      setError('Não foi possível carregar a administração.')
      setLoading(false)
      return
    }
    setSchools(schoolResult.data ?? [])
    setClasses(
      (classResult.data ?? []).map((row) => ({
        id: row.id,
        schoolId: row.school_id,
        name: row.name,
        grade: row.grade,
        schoolYear: row.school_year,
      })),
    )
    setPeople(
      (peopleResult.data ?? []).map((row) => ({
        id: row.id,
        code: row.internal_code,
        name: row.display_name,
        role: row.role as UserRole,
        schoolId: row.school_id,
        active: row.active,
      })),
    )
    setAudit(auditResult.error ? [] : (auditResult.data ?? []))
    setLoading(false)
  }, [profile])

  useEffect(() => {
    void load()
  }, [load])

  async function createSchool(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !profile?.municipality_id) return
    const name = schoolName.trim()
    if (name.length < 3) {
      setFormError('Informe o nome da escola.')
      return
    }
    setSaving(true)
    setFormError(null)
    const { error: insertError } = await supabase.from('schools').insert({
      municipality_id: profile.municipality_id,
      name,
    })
    setSaving(false)
    if (insertError) {
      setFormError('Não foi possível criar a escola.')
      return
    }
    setSchoolName('')
    await load()
  }

  async function createClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    if (!classSchoolId || className.trim().length < 1 || grade < 6 || grade > 9) {
      setFormError('Escolha a escola, o nome e um ano entre 6 e 9.')
      return
    }
    setSaving(true)
    setFormError(null)
    const { error: insertError } = await supabase.from('classes').insert({
      school_id: classSchoolId,
      name: className.trim(),
      grade,
      school_year: schoolYear,
    })
    setSaving(false)
    if (insertError) {
      setFormError('Não foi possível criar a turma.')
      return
    }
    setClassName('')
    await load()
  }

  async function createPerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session?.access_token) return
    const internalCode = code.trim().toUpperCase()
    const nextEmail = email.trim() ? loginEmail(email) : loginEmail(internalCode)
    if (!internalCode || password.length < 8 || !nextEmail) {
      setFormError('Código, e-mail e senha de pelo menos 8 caracteres são obrigatórios.')
      return
    }
    if (role === 'student' && !/^NX-[0-9]{4}$/.test(internalCode)) {
      setFormError('O código do aluno precisa ter o formato NX-0000.')
      return
    }
    if ((role === 'teacher' || role === 'principal' || role === 'student') && !personSchoolId) {
      setFormError('Esta pessoa precisa de uma escola.')
      return
    }
    setSaving(true)
    setFormError(null)
    const message = await postAdmin(session.access_token, {
      action: 'create-user',
      email: nextEmail,
      password,
      role,
      internalCode,
      displayName: role === 'student' ? internalCode : displayName.trim() || internalCode,
      schoolId: personSchoolId || null,
    })
    setSaving(false)
    if (message) {
      setFormError(message)
      return
    }
    setEmail('')
    setPassword('')
    setCode('')
    setDisplayName('')
    await load()
  }

  async function setActive(person: PersonRow) {
    if (!session?.access_token) return
    setSaving(true)
    setFormError(null)
    const message = await postAdmin(session.access_token, {
      action: 'set-active',
      userId: person.id,
      active: !person.active,
    })
    setSaving(false)
    if (message) {
      setFormError(message)
      return
    }
    await load()
  }

  async function linkPerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !linkClassId || !linkPersonId) return
    const person = people.find((item) => item.id === linkPersonId)
    if (!person) return
    setSaving(true)
    setFormError(null)
    const table = person.role === 'student' ? 'class_students' : 'class_teachers'
    const column = person.role === 'student' ? 'student_id' : 'teacher_id'
    const { error: insertError } = await supabase.from(table).insert({ class_id: linkClassId, [column]: person.id })
    setSaving(false)
    if (insertError) {
      setFormError('Não foi possível fazer o vínculo. Confira se o papel e a escola combinam.')
      return
    }
    setFormError(null)
  }

  if (!profile) return null

  const schoolColumns: DataColumn<SchoolRow>[] = [
    { key: 'name', header: 'Escola', render: (row) => row.name },
  ]
  const classColumns: DataColumn<ClassRow>[] = [
    { key: 'grade', header: 'Ano', render: (row) => `${row.grade}º` },
    { key: 'name', header: 'Turma', render: (row) => row.name },
    { key: 'year', header: 'Ano letivo', render: (row) => row.schoolYear },
    {
      key: 'school',
      header: 'Escola',
      render: (row) => schools.find((school) => school.id === row.schoolId)?.name ?? '—',
    },
  ]
  const peopleColumns: DataColumn<PersonRow>[] = [
    { key: 'code', header: 'Código', render: (row) => row.code },
    { key: 'name', header: 'Exibição', render: (row) => row.name },
    { key: 'role', header: 'Papel', render: (row) => ROLE_LABEL[row.role] },
    { key: 'active', header: 'Situação', render: (row) => (row.active ? 'Ativa' : 'Desativada') },
    {
      key: 'toggle',
      header: 'Ação',
      render: (row) => (
        <button className="nexo-btn-ghost" type="button" disabled={saving || row.id === profile.id} onClick={() => void setActive(row)}>
          {row.active ? 'Desativar' : 'Ativar'}
        </button>
      ),
    },
  ]
  const auditColumns: DataColumn<(typeof audit)[number]>[] = [
    { key: 'when', header: 'Quando', render: (row) => formatWhen(row.created_at) },
    { key: 'action', header: 'Ação', render: (row) => row.action },
    { key: 'summary', header: 'Resumo', render: (row) => row.summary },
  ]

  return (
    <AppShell>
      <div className="space-y-5">
        <header>
          <h1 className="text-2xl font-extrabold text-brand-900">Administração</h1>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Escolas e turmas usam a sua sessão. Criar ou desativar pessoa passa pela função do servidor, nunca pela chave service_role no navegador.
          </p>
        </header>
        <PedagogicalNotice />
        {loading ? <p className="text-sm font-bold text-brand-800">Carregando cadastros...</p> : null}
        {error ? <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800">{error}</p> : null}
        {formError ? <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800">{formError}</p> : null}

        <section className="grid gap-3 lg:grid-cols-2">
          <form className="nexo-card space-y-3" onSubmit={(event) => void createSchool(event)}>
            <h2 className="font-extrabold text-brand-900">Nova escola</h2>
            <input className="nexo-input" value={schoolName} onChange={(event) => setSchoolName(event.target.value)} placeholder="Nome da escola" />
            <button className="nexo-btn" type="submit" disabled={saving}>Criar escola</button>
          </form>
          <form className="nexo-card space-y-3" onSubmit={(event) => void createClass(event)}>
            <h2 className="font-extrabold text-brand-900">Nova turma</h2>
            <select className="nexo-input" value={classSchoolId} onChange={(event) => setClassSchoolId(event.target.value)}>
              <option value="">Escola</option>
              {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
            </select>
            <input className="nexo-input" value={className} onChange={(event) => setClassName(event.target.value)} placeholder="Nome da turma" />
            <div className="grid grid-cols-2 gap-2">
              <input className="nexo-input" type="number" min={6} max={9} value={grade} onChange={(event) => setGrade(Number(event.target.value))} />
              <input className="nexo-input" type="number" min={2024} max={2100} value={schoolYear} onChange={(event) => setSchoolYear(Number(event.target.value))} />
            </div>
            <button className="nexo-btn" type="submit" disabled={saving}>Criar turma</button>
          </form>
        </section>

        <DataTable caption="Escolas" columns={schoolColumns} rows={schools} rowKey={(row) => row.id} empty="Nenhuma escola cadastrada." />
        <DataTable caption="Turmas" columns={classColumns} rows={classes} rowKey={(row) => row.id} empty="Nenhuma turma cadastrada." />

        <form className="nexo-card space-y-3" onSubmit={(event) => void createPerson(event)}>
          <h2 className="font-extrabold text-brand-900">Nova pessoa</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="nexo-input" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Código interno" />
            <input className="nexo-input" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="E-mail, ou só o código do aluno" />
            <input className="nexo-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Senha inicial" />
            <input className="nexo-input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Nome de exibição da equipe" />
            <select className="nexo-input" value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
              {ROLES.map((item) => <option key={item} value={item}>{ROLE_LABEL[item]}</option>)}
            </select>
            <select className="nexo-input" value={personSchoolId} onChange={(event) => setPersonSchoolId(event.target.value)}>
              <option value="">Sem escola</option>
              {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
            </select>
          </div>
          <button className="nexo-btn" type="submit" disabled={saving}>Criar pessoa</button>
        </form>

        <DataTable caption="Pessoas" columns={peopleColumns} rows={people} rowKey={(row) => row.id} empty="Nenhuma pessoa cadastrada." />

        <form className="nexo-card space-y-3" onSubmit={(event) => void linkPerson(event)}>
          <h2 className="font-extrabold text-brand-900">Vincular à turma</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <select className="nexo-input" value={linkClassId} onChange={(event) => setLinkClassId(event.target.value)}>
              <option value="">Turma</option>
              {classes.map((item) => <option key={item.id} value={item.id}>{item.grade}º {item.name}</option>)}
            </select>
            <select className="nexo-input" value={linkPersonId} onChange={(event) => setLinkPersonId(event.target.value)}>
              <option value="">Professor ou aluno</option>
              {people.filter((item) => item.role === 'teacher' || item.role === 'student').map((item) => (
                <option key={item.id} value={item.id}>{item.code} · {ROLE_LABEL[item.role]}</option>
              ))}
            </select>
          </div>
          <button className="nexo-btn" type="submit" disabled={saving}>Vincular</button>
        </form>

        <DataTable caption="Auditoria recente" columns={auditColumns} rows={audit} rowKey={(row) => row.id} empty="Nenhum registro de auditoria." />
      </div>
    </AppShell>
  )
}