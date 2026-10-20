import type { CycleKind, PillarKey, UserRole } from './types';

export const EMAIL_DOMAIN = 'nexo.local';
export const STUDENT_CODE_PATTERN = /^NX-[0-9]{4}$/i;
export const MIN_GROUP_SIZE = 5;
export const MIN_ATTEMPTS_FOR_SCORE = 2;

export const PEDAGOGICAL_NOTICE =
  'Indicadores de apoio pedagógico, não substituem a avaliação do professor.';

export const ROUTES = {
  login: '/entrar',
  student: '/aluno',
  studentProgress: '/aluno/progresso',
  mission: '/aluno/missao/:missionId',
  missionResult: '/aluno/missao/:missionId/resultado',
  teacher: '/professor',
  teacherClass: '/professor/turmas/:classId',
  teacherStudent: '/professor/alunos/:studentId',
  principal: '/direcao',
  secretary: '/secretaria',
  admin: '/admin',
  reports: '/relatorios',
} as const;

export const ROLE_HOME: Record<UserRole, string> = {
  student: ROUTES.student,
  teacher: ROUTES.teacher,
  principal: ROUTES.principal,
  secretary: ROUTES.secretary,
  admin: ROUTES.admin,
};

export const ROLE_LABEL: Record<UserRole, string> = {
  student: 'Aluno',
  teacher: 'Professor',
  principal: 'Direção',
  secretary: 'Secretaria',
  admin: 'Administração',
};

export type NavItem = {
  to: string;
  label: string;
};

export const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  student: [
    { to: ROUTES.student, label: 'Missões' },
    { to: ROUTES.studentProgress, label: 'Meu progresso' },
  ],
  teacher: [
    { to: ROUTES.teacher, label: 'Minhas turmas' },
    { to: ROUTES.reports, label: 'Relatórios' },
  ],
  principal: [
    { to: ROUTES.principal, label: 'Escola' },
    { to: ROUTES.reports, label: 'Relatórios' },
  ],
  secretary: [
    { to: ROUTES.secretary, label: 'Rede' },
    { to: ROUTES.reports, label: 'Relatórios' },
  ],
  admin: [
    { to: ROUTES.admin, label: 'Administração' },
    { to: ROUTES.reports, label: 'Relatórios' },
  ],
};

export const PILLARS: {
  key: PillarKey;
  name: string;
  color: string;
}[] = [
  { key: 'focus', name: 'Foco', color: '#0f766e' },
  { key: 'self_regulation', name: 'Autorregulação', color: '#b45309' },
  {
    key: 'emotional_intelligence',
    name: 'Inteligência emocional',
    color: '#7c3aed',
  },
  { key: 'digital_culture', name: 'Cultura digital', color: '#0369a1' },
];

export const CYCLE_LABEL: Record<CycleKind, string> = {
  initial: 'Inicial',
  intermediate: 'Intermediária',
  final: 'Final',
};

export const DIFFICULTY_LABEL: Record<1 | 2 | 3, string> = {
  1: 'Nível 1',
  2: 'Nível 2',
  3: 'Nível 3',
};

export const THERMOMETER_BANDS = [
  {
    id: 'inicio',
    label: 'Início',
    min: 0,
    max: 39,
    hint: 'Ainda cabe mais prática neste pilar.',
  },
  {
    id: 'desenvolvimento',
    label: 'Em desenvolvimento',
    min: 40,
    max: 69,
    hint: 'A prática está crescendo.',
  },
  {
    id: 'consistente',
    label: 'Consistente',
    min: 70,
    max: 100,
    hint: 'O esforço aparece com frequência.',
  },
] as const;

export const LEVELS = [
  { level: 1 as const, min: 0 },
  { level: 2 as const, min: 50 },
  { level: 3 as const, min: 120 },
  { level: 4 as const, min: 220 },
];

export const ACTIVITY_SLUGS = [
  'find-intruder',
  'sequence-memory',
  'organize-day',
  'now-or-later',
  'recess-conflict',
  'other-viewpoint',
  'scam-or-truth',
  'share-or-not',
] as const;

export type ActivitySlug = (typeof ACTIVITY_SLUGS)[number];

export function loginEmail(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return '';
  if (trimmed.includes('@')) return trimmed;
  return `${trimmed}@${EMAIL_DOMAIN}`;
}

export function pillarByKey(key: PillarKey) {
  return PILLARS.find((pillar) => pillar.key === key) ?? PILLARS[0];
}
