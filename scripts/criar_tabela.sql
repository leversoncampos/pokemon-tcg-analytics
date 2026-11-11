-- ==================================
-- FASE 2 - TABELA "cartas" E SEGURANÇA
-- ==================================
-- Cria a tabela do projeto e define quem pode fazer o quê com ela.
-- Rodar uma única vez no SQL Editor do Supabase, ANTES da carga em Python.
--
-- Este script não insere nenhum dado (a inserção manual é proibida no
-- trabalho). Quem preenche a tabela é scripts/02_limpeza_e_carga.py.
--
-- Pode ser rodado de novo sem erro e sem apagar dados: não há DROP TABLE.

-- O begin/commit faz tudo acontecer de uma vez. Se qualquer comando falhar,
-- nada é aplicado, e não fica uma tabela criada pela metade ou sem proteção.
begin;


-- ==================================
-- 1. Criação da tabela
-- ==================================
-- São 10 colunas, dentro da regra de 8 a 10 do enunciado: identificadores
-- (id, nome), categorias (supertipo, tipo, raridade, colecao, editora,
-- especial), número (hp) e data (data_lancamento).
--
-- NOT NULL impede valor vazio. Só hp pode ser nulo, pois Treinador e Energia
-- não têm HP. Nas demais colunas, a limpeza preenche o que faltar (por
-- exemplo, 'Sem raridade'), então um nulo aqui indicaria erro na carga.

create table if not exists public.cartas (
    id               text    primary key,      -- ex.: 'base1-1'; base do upsert
    nome             text    not null,
    supertipo        text    not null,
    tipo             text    not null,
    hp               integer,                  -- nulo para quem não é Pokémon
    raridade         text    not null,
    colecao          text    not null,
    editora          text    not null,
    data_lancamento  date    not null,         -- date permite extrair o ano
    especial         boolean not null,

    -- ==================================
    -- 2. Regras de integridade (CHECK)
    -- ==================================
    -- As regras da limpeza valem também no banco: se o script Python tiver
    -- um erro, a carga falha com uma mensagem clara, em vez de gravar um dado
    -- errado que só apareceria depois, em um gráfico. Isso ajuda a comprovar
    -- a consistência dos dados, que é um critério de avaliação.

    -- Só valores traduzidos e conhecidos. Barra 'Trainer', por exemplo.
    constraint cartas_supertipo_valido
        check (supertipo in ('Pokémon', 'Treinador', 'Energia')),

    constraint cartas_editora_valida
        check (editora in ('WOTC', 'TPCI')),

    -- HP zero ou negativo não existe no jogo.
    -- Quando hp é nulo, o CHECK não é violado: nulo não é tratado como falso.
    constraint cartas_hp_positivo
        check (hp > 0),

    -- Todo Pokémon tem HP, e ninguém mais tem. Cobre os 39 fósseis e bonecas.
    constraint cartas_hp_so_em_pokemon
        check (
            (supertipo = 'Pokémon' and hp is not null)
            or (supertipo <> 'Pokémon' and hp is null)
        ),

    -- Quem não é Pokémon não tem tipo. Cobre as 3 Energias com tipo no CSV.
    constraint cartas_tipo_so_em_pokemon
        check (supertipo = 'Pokémon' or tipo = 'Sem tipo'),

    -- Só Pokémon pode ser especial. Cobre os 11 Treinadores 'TAG TEAM'.
    constraint cartas_especial_so_em_pokemon
        check (supertipo = 'Pokémon' or especial = false)
);

-- Não criamos outros índices: a chave primária já cria o de id, usado pelo
-- .order("id") da paginação, e os filtros do dashboard rodam no navegador,
-- sobre o array em memória, sem consultar o banco a cada clique.


-- ==================================
-- 3. Documentação no próprio banco
-- ==================================
-- Estes comentários aparecem no painel do Supabase.

comment on table public.cartas is
    'Cartas do Pokémon TCG (1999-2023), dataset do Kaggle. Carga via scripts/02_limpeza_e_carga.py.';
comment on column public.cartas.especial is
    'Pokémon com subtipo especial: EX, ex, GX, V, VMAX, VSTAR, TAG TEAM, MEGA, LEGEND, BREAK, Level-Up ou V-UNION.';
comment on column public.cartas.data_lancamento is
    'Data da COLEÇÃO, não da carta. Promos têm data única, embora saiam ao longo de anos.';


-- ==================================
-- 4. Permissões por papel (GRANT)
-- ==================================
-- O acesso passa por dois portões, e os dois precisam liberar:
--   1º GRANT: o papel pode usar este comando (SELECT, INSERT...) na tabela?
--   2º RLS:   quais linhas ele pode alcançar com esse comando?
--
-- Primeiro tiramos tudo e depois damos só o necessário, em vez de confiar
-- nas permissões padrão do projeto.

revoke all on table public.cartas from anon, authenticated, service_role;

-- anon: é o papel da chave pública, a que fica visível no JavaScript do
-- dashboard. Só pode ler.
grant select on table public.cartas to anon;

-- service_role: é o papel da chave secreta, usada só no script Python local.
-- O upsert precisa destes três comandos. Não damos DELETE: a carga não apaga.
grant select, insert, update on table public.cartas to service_role;

-- authenticated (usuário logado) fica sem nada: o projeto não tem login.


-- ==================================
-- 5. RLS (Row Level Security)
-- ==================================
-- Com o RLS ligado, a regra passa a ser "negar tudo": só o que uma política
-- liberar é permitido. O service_role ignora o RLS por natureza, por isso a
-- carga em Python funciona sem precisar de uma política de escrita.

alter table public.cartas enable row level security;

-- CREATE POLICY não aceita "if not exists". Removemos antes para este
-- script poder ser rodado de novo sem erro.
drop policy if exists "leitura_publica_cartas" on public.cartas;

-- for select: vale só para leitura.
-- to anon:    vale só para o papel da chave pública.
-- using (true): toda linha pode ser lida, pois os dados são públicos e o
-- dashboard precisa de todas.
-- Não existe política de INSERT, UPDATE ou DELETE. Assim, mesmo que alguém
-- copie a chave pública do navegador, não consegue alterar nada.
create policy "leitura_publica_cartas"
    on public.cartas
    for select
    to anon
    using (true);

commit;


-- ==================================
-- 6. Conferência (rodar depois, uma consulta por vez)
-- ==================================
-- Estão comentadas porque não fazem parte da criação. Para usar, selecione
-- a consulta no SQL Editor, tire os "--" e execute.

-- 6.1 As 10 colunas. Esperado: 10 linhas.
-- select column_name, data_type, is_nullable
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'cartas'
-- order by ordinal_position;

-- 6.2 RLS ligado. Esperado: rowsecurity = true.
-- select tablename, rowsecurity
-- from pg_tables
-- where schemaname = 'public' and tablename = 'cartas';

-- 6.3 Políticas. Esperado: só 1 linha, com cmd = SELECT e roles = {anon}.
-- select policyname, cmd, roles
-- from pg_policies
-- where schemaname = 'public' and tablename = 'cartas';

-- 6.4 Permissões. Esperado: anon = SELECT; service_role = SELECT, INSERT e
-- UPDATE; nenhuma linha para authenticated.
-- select grantee, privilege_type
-- from information_schema.role_table_grants
-- where table_schema = 'public' and table_name = 'cartas'
--   and grantee in ('anon', 'authenticated', 'service_role')
-- order by grantee, privilege_type;
