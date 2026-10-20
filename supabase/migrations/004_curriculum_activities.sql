-- Catálogo pedagógico: 4 pilares, 8 habilidades e 8 atividades.
-- A nota de uma tentativa sai só da fórmula abaixo. Vai de 0 a 100.

create table public.pillars (
  id uuid primary key default gen_random_uuid(),
  key public.pillar_key not null unique,
  name text not null,
  description text not null,
  sort_order smallint not null unique,
  created_at timestamptz not null default now(),
  constraint pillars_sort_order_range check (sort_order between 1 and 4)
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  pillar_id uuid not null references public.pillars (id) on delete restrict,
  slug text not null unique,
  name text not null,
  description text not null,
  created_at timestamptz not null default now(),
  constraint skills_slug_format check (slug ~ '^[a-z0-9-]{3,64}$'),
  constraint skills_id_pillar_unique unique (id, pillar_id)
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  pillar_id uuid not null references public.pillars (id) on delete restrict,
  skill_id uuid not null,
  slug text not null unique,
  title text not null,
  summary text not null,
  criteria jsonb not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activities_slug_format check (slug ~ '^[a-z0-9-]{3,64}$'),
  constraint activities_skill_fk foreign key (skill_id) references public.skills (id) on delete restrict,
  constraint activities_same_pillar foreign key (skill_id, pillar_id)
    references public.skills (id, pillar_id),
  constraint activities_criteria_shape check (
    criteria ->> 'version' = '1'
    and jsonb_typeof(criteria -> 'formula') = 'string'
    and (criteria ->> 'score_min')::numeric = 0
    and (criteria ->> 'score_max')::numeric = 100
    and jsonb_exists(criteria, 'levels')
  )
);

create index skills_pillar_id_idx on public.skills (pillar_id);
create index activities_pillar_id_idx on public.activities (pillar_id);
create index activities_skill_id_idx on public.activities (skill_id);

comment on table public.activities is
  'Oito missões. Uma tentativa isolada não define o pilar; o painel agrega várias.';
comment on column public.activities.criteria is
  'Contrato da nota, níveis 1 a 3. O código do jogo tem de seguir esta fórmula.';

insert into public.pillars (key, name, description, sort_order)
values
  (
    'focus',
    'Foco',
    'Atenção, memória de trabalho e percepção de padrões. Indicador de apoio pedagógico, não é diagnóstico.',
    1
  ),
  (
    'self_regulation',
    'Autorregulação',
    'Planejar, esperar e escolher com calma. Indicador de apoio pedagógico, não é diagnóstico.',
    2
  ),
  (
    'emotional_intelligence',
    'Inteligência emocional',
    'Conviver, escutar e olhar outro ponto de vista. Não avalia emoção, transtorno ou personalidade.',
    3
  ),
  (
    'digital_culture',
    'Cultura digital',
    'Reconhecer golpe, privacidade e compartilhamento responsável. Indicador de apoio pedagógico.',
    4
  );

insert into public.skills (pillar_id, slug, name, description)
select p.id, v.slug, v.name, v.description
from (
  values
    ('focus'::public.pillar_key, 'attention', 'Atenção seletiva', 'Achar o que muda mesmo com distração.'),
    ('focus'::public.pillar_key, 'working-memory', 'Memória de trabalho', 'Guardar e repetir uma sequência curta.'),
    ('self_regulation'::public.pillar_key, 'planning', 'Planejamento', 'Ordenar tarefas dentro de um tempo.'),
    ('self_regulation'::public.pillar_key, 'impulse-control', 'Espera combinada', 'Comparar uma recompensa agora com outra maior depois.'),
    ('emotional_intelligence'::public.pillar_key, 'conflict', 'Cuidado no conflito', 'Escolher um caminho sem humilhar ninguém.'),
    ('emotional_intelligence'::public.pillar_key, 'perspective', 'Perspectiva', 'Reconhecer o que a outra pessoa pode estar vendo.'),
    ('digital_culture'::public.pillar_key, 'scam-detection', 'Sinais de golpe', 'Separar mensagem confiável de mensagem suspeita.'),
    ('digital_culture'::public.pillar_key, 'sharing', 'Compartilhar com critério', 'Checar antes de espalhar uma notícia.')
) as v(pillar_key, slug, name, description)
join public.pillars p on p.key = v.pillar_key;

insert into public.activities (pillar_id, skill_id, slug, title, summary, criteria)
select p.id, s.id, v.slug, v.title, v.summary, v.criteria
from (
  values
    (
      'attention',
      'find-intruder',
      'Encontre o intruso',
      'Achar o elemento diferente numa grade de figuras.',
      $crit${
        "version": "1",
        "score_min": 0,
        "score_max": 100,
        "formula": "3 rodadas. Cada erro vale 0. Cada acerto vale 1, salvo corte de tempo. Nivel 1: 4 casas e sem corte. Nivel 2: 6 casas; acerto acima de 12000 ms vale 0.5. Nivel 3: 9 casas; acerto acima de 8000 ms vale 0.5. score = round(100 * soma / 3).",
        "levels": {
          "1": {"rounds": 3, "cells": 4, "time_cut_ms": null, "slow_points": 1},
          "2": {"rounds": 3, "cells": 6, "time_cut_ms": 12000, "slow_points": 0.5},
          "3": {"rounds": 3, "cells": 9, "time_cut_ms": 8000, "slow_points": 0.5}
        }
      }$crit$::jsonb
    ),
    (
      'working-memory',
      'sequence-memory',
      'Memória de sequência',
      'Ver uma sequência e repetir na mesma ordem.',
      $crit${
        "version": "1",
        "score_min": 0,
        "score_max": 100,
        "formula": "Uma sequencia por tentativa. Tamanho 3 no nivel 1, 4 no nivel 2 e 5 no nivel 3. Uma posicao só conta se o item for o esperado naquela ordem. score = round(100 * posicoes certas / tamanho). O tempo e registrado e nao muda a nota.",
        "levels": {
          "1": {"length": 3},
          "2": {"length": 4},
          "3": {"length": 5}
        }
      }$crit$::jsonb
    ),
    (
      'planning',
      'organize-day',
      'Organize seu dia',
      'Colocar as tarefas na ordem combinada, com tempo limitado.',
      $crit${
        "version": "1",
        "score_min": 0,
        "score_max": 100,
        "formula": "score_posicao = round(100 * tarefas na posicao esperada / quantidade). A ordem esperada e a do conteudo daquele nivel. Se o tempo passar do limite, score = greatest(0, score_posicao - 10). Nivel 1: 4 tarefas e 90000 ms. Nivel 2: 5 tarefas e 75000 ms. Nivel 3: 5 tarefas e 60000 ms.",
        "levels": {
          "1": {"tasks": 4, "limit_ms": 90000, "overtime_penalty": 10},
          "2": {"tasks": 5, "limit_ms": 75000, "overtime_penalty": 10},
          "3": {"tasks": 5, "limit_ms": 60000, "overtime_penalty": 10}
        }
      }$crit$::jsonb
    ),
    (
      'impulse-control',
      'now-or-later',
      'Agora ou depois',
      'Escolher entre uma recompensa imediata e outra maior mais tarde.',
      $crit${
        "version": "1",
        "score_min": 0,
        "score_max": 100,
        "formula": "3 escolhas. A opcao marcada como later vale 1 e a marcada como now vale 0. score = round(100 * later / 3). Nao ha punicao moral: o feedback explica o plano. O nivel so aumenta o atrativo da recompensa imediata. A chave later permanece o criterio.",
        "levels": {
          "1": {"choices": 3},
          "2": {"choices": 3},
          "3": {"choices": 3}
        }
      }$crit$::jsonb
    ),
    (
      'conflict',
      'recess-conflict',
      'Conflito no recreio',
      'Escolher como agir num conflito, sem uma emoção única certa.',
      $crit${
        "version": "1",
        "score_min": 0,
        "score_max": 100,
        "formula": "2 cenas. score = round(media dos points da opcao escolhida). Rubrica fixa: 100 considera a outra pessoa e nao humilha; 50 evita o dano mas nao cuida da situacao; 0 agride, exclui ou aumenta o conflito. Nao existe emocao correta.",
        "rubric": {
          "100": "Considera a outra pessoa e busca um caminho sem humilhacao.",
          "50": "Evita o dano imediato, mas nao cuida da situacao.",
          "0": "Agride, exclui ou aumenta o conflito."
        },
        "levels": {
          "1": {"scenes": 2},
          "2": {"scenes": 2},
          "3": {"scenes": 2}
        }
      }$crit$::jsonb
    ),
    (
      'perspective',
      'other-viewpoint',
      'Outro ponto de vista',
      'Responder reconhecendo o que a outra pessoa pode estar vivendo.',
      $crit${
        "version": "1",
        "score_min": 0,
        "score_max": 100,
        "formula": "2 cenas. score = round(media dos points da opcao escolhida). Rubrica fixa: 100 reconhece o ponto de vista da outra pessoa antes de reagir; 50 responde com respeito mas so a partir de si; 0 desqualifica ou zomba. Nao ha sentimento unico certo.",
        "rubric": {
          "100": "Reconhece o ponto de vista da outra pessoa antes de reagir.",
          "50": "Responde com respeito, mas so a partir de si.",
          "0": "Desqualifica ou zomba da outra pessoa."
        },
        "levels": {
          "1": {"scenes": 2},
          "2": {"scenes": 2},
          "3": {"scenes": 2}
        }
      }$crit$::jsonb
    ),
    (
      'scam-detection',
      'scam-or-truth',
      'Golpe ou verdade?',
      'Classificar mensagens suspeitas e mensagens plausíveis.',
      $crit${
        "version": "1",
        "score_min": 0,
        "score_max": 100,
        "formula": "4 mensagens. Classificacao correta vale 1 e a incorreta vale 0. score = round(100 * acertos / 4). O tempo e registrado e nao muda a nota. Nivel 1 e obvio, nivel 2 e misto, nivel 3 imita recado de escola.",
        "levels": {
          "1": {"messages": 4},
          "2": {"messages": 4},
          "3": {"messages": 4}
        }
      }$crit$::jsonb
    ),
    (
      'sharing',
      'share-or-not',
      'Compartilhar ou não?',
      'Decidir se uma notícia deve ser checada, guardada ou compartilhada.',
      $crit${
        "version": "1",
        "score_min": 0,
        "score_max": 100,
        "formula": "3 itens. score = round(media dos points da opcao escolhida). Compartilhar sem criterio vale 0. Quando o item pede verificacao, checar a fonte vale 100 e nao compartilhar vale 50. Quando o item e claramente falso, nao compartilhar vale 100 e checar vale 70. O conteudo de cada nivel traz os points de cada opcao.",
        "levels": {
          "1": {"items": 3},
          "2": {"items": 3},
          "3": {"items": 3}
        }
      }$crit$::jsonb
    )
) as v(skill_slug, slug, title, summary, criteria)
join public.skills s on s.slug = v.skill_slug
join public.pillars p on p.id = s.pillar_id;

revoke all on table public.pillars from anon, authenticated, public;
revoke all on table public.skills from anon, authenticated, public;
revoke all on table public.activities from anon, authenticated, public;

grant select, insert, update, delete on table public.pillars to authenticated, service_role;
grant select, insert, update, delete on table public.skills to authenticated, service_role;
grant select, insert, update, delete on table public.activities to authenticated, service_role;