import { createClient } from '@supabase/supabase-js'
import type { Handler } from '@netlify/functions'

type UserRole = 'student' | 'teacher' | 'principal' | 'secretary' | 'admin'

type CreateBody = {
  action: 'create-user'
  email: string
  password: string
  role: UserRole
  internalCode: string
  displayName: string
  schoolId: string | null
}

type ActiveBody = {
  action: 'set-active'
  userId: string
  active: boolean
}

const ROLES: UserRole[] = ['student', 'teacher', 'principal', 'secretary', 'admin']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function json(statusCode: number, message: string, ok: boolean) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ok ? { ok: true } : { ok: false, message }),
  }
}

function isRole(value: unknown): value is UserRole {
  return typeof value === 'string' && ROLES.includes(value as UserRole)
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, 'Use POST.', false)

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anonKey || !serviceKey) {
    return json(500, 'No servidor, defina SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY.', false)
  }

  const token = event.headers.authorization?.replace(/^Bearer\s+/i, '').trim()
  if (!token) return json(401, 'Sessão ausente.', false)

  let body: CreateBody | ActiveBody
  try {
    body = JSON.parse(event.body ?? '') as CreateBody | ActiveBody
  } catch {
    return json(400, 'Pedido inválido.', false)
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const authUser = await admin.auth.getUser(token)
  if (authUser.error || !authUser.data.user) return json(401, 'Sessão inválida.', false)

  const actorResult = await admin
    .from('profiles')
    .select('id, role, municipality_id, active')
    .eq('id', authUser.data.user.id)
    .maybeSingle()
  const actor = actorResult.data
  if (actorResult.error || !actor || actor.role !== 'admin' || !actor.active || !actor.municipality_id) {
    return json(403, 'Somente a administração ativa pode fazer isso.', false)
  }

  if (body.action === 'set-active') {
    if (!UUID.test(body.userId) || typeof body.active !== 'boolean') {
      return json(400, 'Informe a pessoa e a situação.', false)
    }
    if (body.userId === actor.id) return json(400, 'Você não pode desativar a própria conta.', false)

    const profileUpdate = await userClient.from('profiles').update({ active: body.active }).eq('id', body.userId)
    if (profileUpdate.error) return json(400, 'Não foi possível atualizar a situação.', false)

    const ban = await admin.auth.admin.updateUserById(body.userId, {
      ban_duration: body.active ? 'none' : '876000h',
    })
    if (ban.error) return json(400, 'A situação mudou no perfil, mas o acesso não foi bloqueado.', false)
    return json(200, '', true)
  }

  if (body.action !== 'create-user') return json(400, 'Ação desconhecida.', false)

  if (
    typeof body.internalCode !== 'string' ||
    typeof body.email !== 'string' ||
    (body.displayName != null && typeof body.displayName !== 'string') ||
    (body.schoolId != null && typeof body.schoolId !== 'string')
  ) {
    return json(400, 'Pedido inválido.', false)
  }

  const internalCode = body.internalCode.trim().toUpperCase()
  const email = body.email.trim().toLowerCase()
  const schoolId = body.schoolId || null
  if (!isRole(body.role) || passwordTooShort(body.password) || !email.includes('@')) {
    return json(400, 'Papel, e-mail ou senha inválidos.', false)
  }
  if (!/^[A-Z0-9-]{4,32}$/.test(internalCode)) return json(400, 'Código interno inválido.', false)
  if (body.role === 'student' && !/^NX-[0-9]{4}$/.test(internalCode)) {
    return json(400, 'O código do aluno precisa ter o formato NX-0000.', false)
  }
  if ((body.role === 'student' || body.role === 'teacher' || body.role === 'principal') && !schoolId) {
    return json(400, 'Esta pessoa precisa de uma escola.', false)
  }
  if ((body.role === 'secretary' || body.role === 'admin') && schoolId) {
    return json(400, 'Secretaria e administração não ficam presas a uma escola.', false)
  }
  if (schoolId && !UUID.test(schoolId)) return json(400, 'Escola inválida.', false)

  if (schoolId) {
    const school = await admin.from('schools').select('id, municipality_id').eq('id', schoolId).maybeSingle()
    if (school.error || !school.data || school.data.municipality_id !== actor.municipality_id) {
      return json(400, 'A escola não pertence ao seu município.', false)
    }
  }

  const created = await admin.auth.admin.createUser({
    email,
    password: body.password,
    email_confirm: true,
  })
  if (created.error || !created.data.user) {
    const taken = created.error?.message.toLowerCase().includes('already')
    return json(400, taken ? 'Este e-mail já está em uso.' : 'Não foi possível criar o acesso.', false)
  }

  const displayName = body.role === 'student' ? internalCode : (body.displayName ?? '').trim() || internalCode
  // A tabela profiles não aceita INSERT pela sessão do navegador. O cadastro passa
  // pela função create_profile_as_admin (só service_role), que confere o admin e
  // grava o autor na auditoria.
  const profileInsert = await admin.rpc('create_profile_as_admin', {
    p_actor: actor.id,
    p_user_id: created.data.user.id,
    p_role: body.role,
    p_school_id: schoolId,
    p_municipality_id: actor.municipality_id,
    p_internal_code: internalCode,
    p_display_name: displayName,
  })

  if (profileInsert.error) {
    // Sem perfil, o acesso recém-criado não pode ficar solto no Auth.
    await admin.auth.admin.deleteUser(created.data.user.id)
    const duplicated = profileInsert.error.code === '23505'
    return json(
      400,
      duplicated
        ? 'Este código interno já está em uso.'
        : 'O acesso foi cancelado porque o perfil não pôde ser gravado.',
      false,
    )
  }

  return json(200, '', true)
}

function passwordTooShort(value: unknown): boolean {
  return typeof value !== 'string' || value.length < 8
}