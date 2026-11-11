# Evolução do Pokémon TCG (1999–2023): dashboard interativo

Dashboard web que lê **17.172 cartas** do Pokémon Trading Card Game direto de um banco Supabase,
em tempo real, e mostra 3 indicadores e 7 gráficos que recalculam com filtros.

Trabalho da disciplina **Tópicos Especiais em Informática** da **Fatec Lins**.

## Pergunta central

> **As cartas de Pokémon estão ficando mais fortes e mais raras com o tempo — e por quê?**

O fenômeno é conhecido como *power creep*. A força de uma carta é medida pelo HP (pontos de vida).
As conclusões abaixo dizem que os dados são **consistentes com** cada explicação, não que a provam.

## Principais achados

Valores do painel sem filtros, com as coleções de promos fora das contas (ver "Limitações").

- **Em 25 anos, o HP médio das cartas Pokémon quase dobrou** (+95,8% entre 1999 e 2023).
- **As cartas especiais explicam a maior parte do crescimento do HP, mas não todo; as normais também
  cresceram.** As especiais (ex, EX, GX, V, VMAX, VSTAR e outras) responderam por 57% do ganho de HP
  entre 1999 e 2022.
- **As especiais ficaram mais comuns:** passaram de 4% para até 32% dos Pokémon por ano.
- **Recuo em 2023:** o HP médio caiu de 143,1 para 126,1 porque a fatia de especiais caiu de 32,2%
  para 20,1%, e não porque as cartas ficaram mais fracas.
- **Mais cartas por ano:** a média subiu de 433 cartas por ano (1999–2006) para 1.059 (2017–2023).
- **Mais raridades:** as cartas raras foram de 21% para 40% do total, e as faixas Secreta/Ilustração
  foram de 0,8% para 10,0%.
- **As 10 coleções com maior HP médio são todas de 2019 em diante.**
- **A troca de editora não explica o aumento.** Em 2003, as cartas normais tinham 68,2 de HP na
  Wizards of the Coast e 64,8 na The Pokémon Company International; o salto só aparece em 2007.

## Tecnologias

| Parte | Tecnologia |
|---|---|
| Limpeza e carga dos dados | Python 3.12, pandas, python-dotenv, supabase-py |
| Banco de dados na nuvem | Supabase (PostgreSQL), com RLS de somente leitura para o público |
| Dashboard | HTML, CSS e JavaScript puro |
| Gráficos | Chart.js 4 |
| Acesso ao banco no navegador | Supabase JS v2, com paginação em blocos de 1.000 (`.range()` + `.order("id")`) |

## Estrutura de pastas

```
dashboard-pokemon-tcg/
├── README.md
├── requirements.txt          bibliotecas Python
├── .env.example              modelo do arquivo de credenciais
├── dados/                    o CSV do Kaggle fica aqui (não vai para o git)
├── scripts/
│   ├── 01_exploracao.py              exploração e relatório de qualidade dos dados
│   ├── criar_tabela.sql              tabela "cartas", RLS e permissões
│   ├── 02_limpeza_e_carga.py         limpeza e carga no Supabase em lotes (upsert)
│   └── 03_teste_escrita_bloqueada.py prova que a chave pública não escreve no banco
├── web/
│   ├── index.html            estrutura do dashboard
│   ├── style.css             visual e responsividade
│   └── script.js             consulta ao banco, KPIs, gráficos e filtros
├── docs/                     material da apresentação e evidências
└── referencias/
    └── dicionario-de-dados.txt
```

## Tabela `cartas` no Supabase

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | text (chave primária) | id original da carta |
| `nome` | text | nome da carta |
| `supertipo` | text | Pokémon, Treinador ou Energia |
| `tipo` | text | primeiro tipo da carta; quem não é Pokémon fica `Sem tipo` |
| `hp` | integer (aceita nulo) | só Pokémon têm HP |
| `raridade` | text | raridade original; vazio vira `Sem raridade` |
| `colecao` | text | coleção; `Shiny Vault` é separada em 2019 e 2021 |
| `editora` | text | WOTC ou TPCI |
| `data_lancamento` | date | data de lançamento da coleção (AAAA-MM-DD) |
| `especial` | boolean | Pokémon com subtipo especial (EX, ex, GX, V, VMAX, VSTAR, TAG TEAM, MEGA, LEGEND, BREAK, Level-Up, V-UNION) |

## Problemas de qualidade tratados

A numeração é a mesma usada nos comentários dos scripts.

1. `release_date` no formato americano `M/D/AAAA`: convertida para `AAAA-MM-DD`.
2. `types` e `subtypes` guardados como texto de lista Python: lidos com `ast.literal_eval`.
3. `generation` com espaço sobrando (`'Fourth '`): removido com `strip()`.
4. Nulos em `hp`, `types`, `rarity` e `subtypes`: todos em Treinadores e Energias, exceto `rarity`,
   que vira `Sem raridade`.
5. 103 cartas com 2 tipos: fica o primeiro.
6. 32 raridades diferentes: agrupadas em faixas no dashboard.
7. A data é da coleção, não da carta: as 1.100 cartas das coleções `Black Star Promos` têm uma data
   única, embora saiam ao longo de anos. Ficam no banco, mas fora das contas por padrão (filtro
   "Incluir promos").
8. 11 Treinadores com subtipo `TAG TEAM`: `especial` vale só para Pokémon.
9. 39 Treinadores com HP: `hp` fica nulo para quem não é Pokémon.
10. 3 Energias com tipo: viram `Sem tipo`.
11. `Shiny Vault` junta 2 coleções: separada em `Shiny Vault (2019)` e `Shiny Vault (2021)`.
12. Raridades com nomes novos em 2023 (`Rare Ultra` e `Ultra Rare`): a análise usa as faixas.
13. 19,5% dos Pokémon repetem outra carta (variantes e reimpressões): os gráficos contam impressões.
14. O dicionário de dados erra a descrição de `regulationMark` (coluna não usada).
15. 3 repetições em coleção + número são cartas diferentes, com ids distintos (não é erro).

## Como rodar

### 1. Baixar o CSV

Baixe o dataset no Kaggle (link em "Fonte dos dados") e coloque o arquivo
`pokemon-tcg-data-master 1999-2023.csv` dentro da pasta `dados/`.

### 2. Instalar as bibliotecas Python

```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
```

### 3. Criar o `.env`

Copie `.env.example` para um arquivo chamado `.env` e preencha com os dados do seu projeto Supabase
(Project Settings): a URL e a **chave secreta**. O `.env` fica só na sua máquina e nunca vai para o git.

### 4. Criar a tabela

No painel do Supabase, abra o **SQL Editor**, cole o conteúdo de `scripts/criar_tabela.sql` e execute.
O script cria a tabela `cartas`, liga o RLS e deixa o público só com permissão de leitura.

### 5. Carregar os dados

```bash
python scripts/01_exploracao.py                 # opcional: relatório da exploração
python scripts/02_limpeza_e_carga.py --simular  # limpa e valida, sem enviar nada
python scripts/02_limpeza_e_carga.py            # carga real (pode rodar de novo sem duplicar)
```

Ao final, o script conta os registros no banco. O esperado é **17.172 cartas**.

### 6. Abrir o dashboard

Em `web/script.js`, confira `SUPABASE_URL` e `SUPABASE_KEY`: a chave deve ser a **pública**
(`sb_publishable_...`), nunca a secreta. A chave pública pode ficar no código porque o RLS só permite
leitura.

Abra `web/index.html` no navegador, ou sirva a pasta localmente:

```bash
python -m http.server 8000 --directory web
```

e acesse `http://localhost:8000`.

### 7. (Opcional) Testar a segurança

```bash
python scripts/03_teste_escrita_bloqueada.py
```

O script tenta inserir, alterar e apagar com a chave pública; o banco deve recusar as 3 tentativas
(erro 42501).

## Consistência dos dados

- O dashboard mostra o total de cartas no banco (`count: 'exact'`) ao lado do total carregado pela
  paginação: 17.172 × 17.172.
- Os valores da tela foram conferidos contra um cálculo independente em Python, a partir do CSV, em
  13 combinações de filtros.

## Limitações

- A força das cartas é medida só pelo HP.
- A data é a da coleção; por isso as promos ficam fora das contas por padrão.
- Reimpressões e variantes são contadas como cartas.
- O ano de 2023 vai até 03/11/2023, último lançamento do dataset.
- Não há dados de preço: a hipótese do mercado colecionador é consistente com os dados, mas não
  comprovada.

## Fonte dos dados

**Pokemon TCG All Cards 1999 - 2023**, publicado por adampq no Kaggle:
https://www.kaggle.com/datasets/adampq/pokemon-tcg-all-cards-1999-2023

Usado aqui apenas para fins acadêmicos, conforme a licença indicada na página do dataset.
O CSV não é redistribuído neste repositório.

Pokémon e os nomes relacionados são marcas registradas de seus respectivos donos (Nintendo,
Creatures, GAME FREAK e The Pokémon Company). Este é um trabalho acadêmico, sem fins comerciais e sem
vínculo com essas empresas; o dashboard não usa logos, artes de cartas nem imagens de personagens.

## Autores

- Leverson Campos
- Pedro Oliveira
