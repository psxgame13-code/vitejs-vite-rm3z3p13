# Segurança do NEXO

Este arquivo descreve o que o MVP protege e o que fica de fora. Ele não substitui a revisão de um projeto real antes de receber dados de estudantes.

## Chaves

O navegador só recebe `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Com a chave anon, a pessoa ainda precisa de uma sessão, e o Postgres aplica as políticas de RLS.

`SUPABASE_SERVICE_ROLE_KEY` existe somente na Netlify, na função `netlify/functions/admin-users.ts`. Ela não tem prefixo `VITE_`, não entra no bundle e não volta no JSON da função. Se essa chave aparecer no GitHub, no StackBlitz ou no frontend, o projeto deve ser considerado exposto: gire a chave no Supabase e retire o commit.

O `.env` local fica fora do Git.

## Quem vê o quê

- Aluno: o próprio perfil, as próprias partidas, missões, médias e conquistas. O nome de exibição é o código interno.
- Professor: turmas em que está vinculado e os alunos dessas turmas.
- Direção: a própria escola.
- Secretaria: nenhuma linha de aluno. O painel chama só `network_overview`, `network_participation`, `network_school_pillars`, `network_cycle_pillars` e `network_interventions`. Grupo com menos de 5 alunos não é retornado.
- Administração: cadastro do município e a auditoria. Criar ou desativar uma pessoa passa pela função, que confere o token e exige papel `admin` ativo.

A rota do React esconde a tela, mas a proteção real é a política no banco. Abrir `/secretaria` com sessão de aluno não entrega os agregados.

## Conta e senha

A função cria o usuário com `email_confirm: true` e grava o perfil com a sessão do admin, para o gatilho enxergar quem fez a ação. Se o perfil falha, o usuário recém-criado é apagado.

Desativar uma conta marca `profiles.active` como falso e bloqueia o acesso no Auth. O login também recusa perfil inativo. Ninguém desativa a própria conta por essa função.

A senha `Nexo-teste-2026` é só do piloto. Antes de qualquer uso fora do teste, troque essas senhas ou apague o seed.

## Dados

Não há câmera, microfone, localização nem nome civil do aluno. O relatório CSV não exporta e-mail. Célula que começa com `=`, `+`, `-` ou `@` é neutralizada antes do download.

A auditoria guarda ação e resumo. Ela não deve receber senha, service_role nem e-mail.

A média de pilar só nasce com pelo menos duas tentativas de avaliação. Missão não entra nessa média. O texto dos painéis deixa claro que o número é apoio pedagógico, não diagnóstico.

## O que conferir num deploy

1. As onze migrações rodaram, e `supabase/tests/checks.sql` terminou com `NEXO ok`.
2. A Netlify tem as duas variáveis `VITE_` e as três variáveis de servidor.
3. O bundle publicado não contém a palavra `service_role` nem o valor da chave.
4. Com `NX-1001`, um pedido a `profiles` de outro aluno volta vazio.
5. Com `secretaria@nexo.local`, a tela de relatórios não lista código de aluno.
