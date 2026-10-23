# NEXO

Plataforma web para missões curtas de foco, autorregulação, convivência e cultura digital, do 6º ao 9º ano. O aluno entra com um código interno. A secretaria vê só agregados da rede. O sistema não diagnostica emoção, transtorno ou condição psicológica.

Indicadores de apoio pedagógico, não substituem a avaliação do professor.

## O que este repositório contém

- Frontend em Vite, React 18, TypeScript, Tailwind, React Router e Recharts.
- Acesso ao Supabase só com a chave anon, no navegador.
- Função Netlify para criar e desativar pessoas. A chave service_role fica apenas no servidor.
- Migrações SQL com papéis, RLS, auditoria e as oito atividades.

Não há câmera, microfone, localização nem integração externa no MVP.

## Variáveis

No frontend, e no arquivo `.env` local:

    VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
    VITE_SUPABASE_ANON_KEY=sua_chave_anon

Na Netlify, além dessas duas, crie estas sem o prefixo `VITE_`:

    SUPABASE_URL=https://SEU_PROJETO.supabase.co
    SUPABASE_ANON_KEY=sua_chave_anon
    SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role

A service_role não pode ir para o Vite, para o StackBlitz público nem para o repositório. O arquivo `.env.example` lista só as variáveis do frontend.

## 1. Criar o projeto no Supabase

1. Crie um projeto novo em [supabase.com](https://supabase.com).
2. Em Authentication, Providers, deixe o provider Email ligado.
3. Anote a Project URL e a chave anon em Project Settings, API.
4. Guarde a service_role só para a Netlify.

## 2. Rodar as migrações

No SQL Editor, execute um arquivo por vez, nesta ordem, cada um inteiro:

1. `supabase/migrations/001_extensions_enums.sql`
2. `supabase/migrations/002_organizations.sql`
3. `supabase/migrations/003_profiles_membership.sql`
4. `supabase/migrations/004_curriculum_activities.sql`
5. `supabase/migrations/005_learning_records.sql`
6. `supabase/migrations/006_audit_log.sql`
7. `supabase/migrations/007_security_functions.sql`
8. `supabase/migrations/008_rls_policies.sql`
9. `supabase/migrations/009_aggregate_rpcs.sql`
10. `supabase/migrations/010_triggers.sql`
11. `supabase/migrations/011_seed.sql`
12. `supabase/migrations/012_school_rpcs.sql`
13. `supabase/migrations/013_trigger_helper_grants.sql`

Rode a 012 e a 013 depois do seed. A 012 cria as funções da tela da direção. A 013 corrige permissões que a 010 tirou demais: sem ela, escola, turma, vínculo e ativar/desativar falham no painel de administração.

O `011_seed.sql` cria o município, as escolas, as turmas, os usuários de teste e as partidas que alimentam os gráficos. Rode esse arquivo uma vez, num projeto vazio. Ele grava em `auth.users` e `auth.identities`.

Se o insert em `auth.identities` reclamar da coluna `provider_id`, o projeto está antigo demais para este MVP. Crie um projeto Supabase atual e rode a sequência de novo.

## 3. Subir no computador ou no StackBlitz

    npm install
    npm run dev

Copie `.env.example` para `.env` e preencha as duas variáveis antes de abrir o app. No StackBlitz, use o painel de secrets ou o arquivo `.env` com os mesmos nomes. Sem essas variáveis, a tela de entrada explica o que falta.

O build de publicação é o script `build` do `package.json`:

    npm run build

## 4. Enviar ao GitHub

    git init
    git add .
    git commit -m "MVP do NEXO"
    git branch -M main
    git remote add origin https://github.com/SEU_USUARIO/nexo.git
    git push -u origin main

Confira que `.env` não foi commitado. Ele está no `.gitignore`.

## 5. Publicar na Netlify

1. New site from Git e escolha o repositório.
2. Build command: `npm run build`.
3. Publish directory: `dist`.
4. Em Environment variables, cadastre as duas `VITE_` e as três variáveis de servidor listadas acima.
5. Faça o deploy.

O `netlify.toml` já publica `dist` e devolve `index.html` para as rotas do React. A função fica em `netlify/functions/admin-users.ts` e responde em `/.netlify/functions/admin-users`.

## 6. Testar

Senha de todas as contas de teste: `Nexo-teste-2026`.

| Entrada | Papel | O que conferir |
| --- | --- | --- |
| `NX-1001` | Aluno | Missões, uma partida e Meu progresso. O nome exibido é o código. |
| `prof.horizonte@nexo.local` | Professor | Turmas 6º A e 7º A, média e prioridade do mês. |
| `prof.litoral@nexo.local` | Professor | Turma 8º A. |
| `direcao.horizonte@nexo.local` | Direção | Só a EMEF Horizonte, alunos por código. |
| `direcao.litoral@nexo.local` | Direção | Só a EMEF Litoral. |
| `secretaria@nexo.local` | Secretaria | Agregados da rede. Nenhum código de aluno. |
| `admin@nexo.local` | Administração | Escolas, turmas, pessoas e auditoria. |

Há seis alunos em Horizonte (`NX-1001` a `NX-1006`) e cinco no Litoral (`NX-2001` a `NX-2005`). Os dois grupos passam de cinco alunos, então a comparação da secretaria não fica oculta.

No SQL Editor, estes resultados confirmam o seed:

    select count(*) from public.activities;
    select count(*) from public.profiles where role = 'student';
    select public.network_overview();

O esperado é 8 atividades, 11 alunos e uma linha da rede. `network_overview` rodada como postgres ignora o papel da secretaria; no app, entre com `secretaria@nexo.local` para ver o bloqueio de verdade.

Criar uma pessoa nova chama `create_profile_as_admin` com a service_role e só funciona no site publicado na Netlify, com a service_role configurada. No `npm run dev`, escola e turma ainda podem ser criadas pela sessão do admin. A pessoa nova depende da função.

## Papéis e dados

- Aluno vê as próprias missões, partidas, médias e conquistas.
- Professor vê as turmas vinculadas a ele.
- Direção vê a própria escola.
- Secretaria não lê tabela de aluno. Usa só `network_overview`, `network_participation`, `network_school_pillars`, `network_cycle_pillars` e `network_interventions`. Grupo com menos de 5 alunos não aparece.
- Administração cria escola e turma com a própria sessão. Criar ou desativar acesso passa pela função.

A média de um pilar só existe com pelo menos duas tentativas de avaliação. Missão e prática não entram nessa média. Não há ranking.

## As oito missões

Cada uma tem níveis 1, 2 e 3. A conta está em `src/lib/scoring.ts` e também no cadastro das atividades.

1. Encontre o intruso
2. Sequência
3. Organize seu dia
4. Agora ou depois
5. Conflito no intervalo
6. O outro lado
7. Golpe ou verdade?
8. Compartilho ou não?

Os relatórios CSV usam ponto e vírgula e UTF-8. Eles não exportam e-mail nem nome civil.