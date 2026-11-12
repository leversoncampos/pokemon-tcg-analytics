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
  cresceram.** As especiais (ex, EX, GX, V, VMAX, VSTAR e outras) responderam por 54% do ganho de HP
  entre 1999 e 2023, o mesmo período do crescimento de +95,8%. Sem as especiais, a média de 2023
  seria 92,5 HP, e não 126,1.
- **No mesmo período (2004–2023), as especiais mais que dobraram de HP (+127%) e as normais subiram
  41%.** O período começa no primeiro ano em que as duas séries têm 30 cartas ou mais (em 2003 havia
  só 24 especiais).
- **As especiais ficaram mais comuns:** passaram de 4% para até 32% dos Pokémon por ano.
- **Recuo em 2023 (ano parcial, até 03/11):** o HP médio caiu de 143,1 para 126,1, principalmente
  porque a fatia de especiais caiu de 32,2% para 20,1%. Com a fatia de 2022, a média de 2023 seria
  146,2. As normais também caíram um pouco (98,4 → 92,5).
- **Mais cartas por ano:** a média subiu de 433 cartas por ano (1999–2006) para 1.059 (2017–2023).
- **Mais raridades:** as cartas raras foram de 21% para 40% do total, e as faixas Secreta/Ilustração
  foram de 0,8% para 10,0%.
- **As 10 coleções com maior HP médio são todas de 2019 em diante.**
- **Coleções com mais especiais têm HP médio maior, mesmo dentro de cada era:** r = 0,91 entre o %
  de especiais e o HP médio das 110 coleções com 50 Pokémon ou mais (0,74, 0,91 e 0,83 dentro de
  cada era). Os dados são consistentes com as especiais como causa, mas não provam.
- **Da era 1999–2006 para a 2017–2023, tudo cresceu, e as especiais, 5 vezes:** HP médio ×1,9,
  HP máximo ×1,7, cartas por ano ×2,4, % de raras ×1,9 e % de especiais ×5,2.
- **A troca de editora não explica o aumento.** Em 2003, as cartas normais tinham 68,2 de HP na
  Wizards of the Coast e 64,8 na The Pokémon Company International; o salto só aparece em 2007.

## Os 7 gráficos (7 tipos distintos)

A tela conta a história em 3 partes. Cada gráfico tem um título-conclusão calculado dos dados e,
embaixo, um subtítulo que começa pelo tipo do gráfico e diz a base da conta.

| Parte | Gráfico | Tipo (Chart.js) | Mensagem sem filtros |
|---|---|---|---|
| O HP subiu | HP médio por ano, normais × especiais | **linha** (`line`) | As especiais mais que dobraram de HP; as normais subiram 41% |
| O HP subiu | Top 10 coleções por HP médio | **barras horizontais** (`bar`, `indexAxis: "y"`) | As 10 coleções mais fortes são todas de 2019 em diante |
| Por quê | % de especiais por ano | **área** (`line` com `fill`) | E ficaram mais comuns: de 4% para até 32% dos Pokémon |
| Por quê | Ganho de HP: 1º ano → normais → especiais → último ano | **cascata** (`bar` com barras flutuantes `[início, fim]`) | Dos 61,7 HP ganhos de 1999 a 2023, 33,6 (54%) vieram das especiais |
| Por quê | Coleções: data × HP médio, tamanho = nº de Pokémon, cor = % de especiais | **bolhas** (`bubble`) | Coleções com mais especiais têm HP médio maior, mesmo dentro de cada era |
| O que mais mudou | Cartas impressas por ano e média de cada era | **colunas + linha** (misto `bar` + `line`) | A média de cartas impressas por ano mais que dobrou: 433 (1999–2006) → 1.059 (2017–2023) |
| O que mais mudou | Raridade de cada era | **barras 100% empilhadas** (`bar`, `stacked`) | As raras foram de 21% para 40% das cartas, e metade delas são especiais |

Nenhum plugin externo: a cascata, a área e as bolhas são recursos nativos do Chart.js 4, e as
anotações (rótulos diretos, médias, mecânicas) são plugins pequenos escritos em `web/script.js`.

## Interações

Toda interação só muda os filtros e chama `aplicarFiltros()`: os 7 gráficos e os 3 indicadores
sempre se recalculam juntos.

- **Etiquetas dos filtros ativos** ("Período: 2017–2023 ×"): o × remove só aquele filtro.
- **Filtros no endereço (#)**, com o botão "Copiar link desta visão". Exemplos: `#promos=1`,
  `#de=2017`, `#tipo=Water`. Cada valor é conferido contra as opções dos próprios campos; valores
  inválidos são ignorados e nada do endereço entra na página como HTML.
- **Clique numa coleção** (bolha ou barra do ranking): abre um painel com data, nº de Pokémon, HP
  médio e máximo, % de especiais e posição. Só mostra; não muda os filtros.
- **Clique numa era** (coluna das barras 100% ou do gráfico de cartas por ano): o período vira
  aquela era, como nos atalhos do topo.

## Tecnologias

| Parte | Tecnologia |
|---|---|
| Limpeza e carga dos dados | Python 3.12, pandas, python-dotenv, supabase-py |
| Banco de dados na nuvem | Supabase (PostgreSQL), com RLS de somente leitura para o público |
| Dashboard | HTML, CSS e JavaScript puro |
| Gráficos | Chart.js 4 |
| Acesso ao banco no navegador | Supabase JS v2, com paginação em blocos de 1.000 (`.range()` + `.order("id")`) |
| Conferência dos números da tela | Node.js (controla o Chrome) + pandas |

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
│   ├── 03_teste_escrita_bloqueada.py prova que a chave pública não escreve no banco
│   ├── 04_conferencia_tela.mjs       lê o que o dashboard mostra em 14 combinações de filtros
│   ├── 04_conferencia_python.py      confere a tela contra um cálculo independente em Python
│   └── 05_varredura_filtros.mjs      aplica todas as 7.800 combinações de filtros e procura tela quebrada
├── web/
│   ├── index.html            estrutura do dashboard
│   ├── style.css             visual e responsividade
│   └── script.js             consulta ao banco, KPIs, gráficos e filtros
├── docs/                     material da apresentação e evidências (ver "Evidências")
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

### 8. (Opcional) Conferir os números da tela

Prova que o que o dashboard mostra bate com um cálculo feito à parte, em Python. Precisa do
**Node.js 22 ou mais novo**, do **Google Chrome** e do CSV em `dados/`. Nenhum dos dois scripts usa
chave: a página usa a própria chave pública, e o Python lê só o CSV.

```bash
node scripts/04_conferencia_tela.mjs           # parte 1: abre o dashboard e salva a tela em JSON
python scripts/04_conferencia_python.py        # parte 2: refaz as contas e compara
```

- A parte 1 abre `web/index.html` no Chrome sem janela, espera as 17.172 cartas chegarem do Supabase,
  aplica 14 combinações de filtros e salva os textos e os dados dos 7 gráficos em
  `conferencia-tela.json`, na pasta temporária do sistema. Também avisa se houver erro de JavaScript.
- A parte 2 limpa o CSV com as mesmas funções de `02_limpeza_e_carga.py`, refaz cada conta com pandas
  e compara com a tela: KPIs, os dados dos 7 gráficos (inclusive cada bolha e a correlação r da
  nota) e o texto dos títulos 1, 2, 3 e 6. O esperado é **3.186 checagens iguais, 0 divergências**.
- Opcional: a parte 1 também tira prints e diz se a página rola para o lado. Passe o arquivo de saída
  e pares de print e largura:
  `node scripts/04_conferencia_tela.mjs tela.json print-1920.png 1920 print-375.png 375`
  (depois, `python scripts/04_conferencia_python.py tela.json`).
- Se o Chrome estiver instalado em outro lugar, informe o caminho na variável de ambiente `CHROME`.

Para testar todas as combinações de filtros (leva alguns minutos):

```bash
node scripts/05_varredura_filtros.mjs
```

Ele aplica os 325 períodos possíveis × 12 opções de tipo × promos ligadas e desligadas (7.800
combinações) e confere que nenhum texto mostra NaN, Infinity, undefined ou null, que todo gráfico
vazio tem título descritivo e que os anos citados nos títulos estão dentro do período. Também testa
a troca rápida de filtros, a rolagem lateral em 375, 768, 1366 e 1920 px e as interações (22 testes:
etiquetas, endereço com valores válidos e inválidos, link aberto do zero, painel da coleção e clique
na era). O esperado é "Nenhum problema encontrado."

## Consistência dos dados

- O dashboard mostra o total de cartas no banco (`count: 'exact'`) ao lado do total carregado pela
  paginação: 17.172 × 17.172.
- Os valores da tela são conferidos contra um cálculo independente em Python, a partir do CSV, em
  14 combinações de filtros: 3.186 checagens, 0 divergências (ver "Conferir os números da tela").
- `scripts/05_varredura_filtros.mjs` aplica todas as 7.800 combinações de filtros (cada par De/Até ×
  cada tipo × promos) e não encontra texto quebrado, título errado em gráfico vazio nem erro na página;
  as 22 checagens de interação passam.

## Filtros

Período (De/Até e atalhos por era), tipo e "Incluir promos". Todos os indicadores e os 7 gráficos
recalculam a cada mudança.

- **Tipo:** usa o 1º tipo da carta (103 cartas têm 2 tipos) e, por isso, mostra só Pokémon.
  Com um tipo escolhido, o ranking aceita coleções com 20 Pokémon do tipo ou mais (sem tipo, 50).
- **Incluir promos:** desligado por padrão, porque as promos têm uma só data por coleção.
- Uma comparação só vira título-conclusão se cada lado tiver 30 cartas ou mais; abaixo disso, o
  título fica descritivo e avisa "amostra pequena". Gráfico sem dados mostra uma mensagem no lugar.

## Evidências

A pasta `docs/` reúne os prints usados na apresentação:

- `docs/conferencia-tabela.png`, `docs/conferencia-rls.png`, `docs/conferencia-politica.png` e
  `docs/conferencia-permissoes.png`: as 4 consultas de conferência de `scripts/criar_tabela.sql` no
  SQL Editor do Supabase.
- `docs/total-no-banco.png`: o fim de `scripts/02_limpeza_e_carga.py` com as 17.172 cartas no banco.
- `docs/teste-escrita-bloqueada.png`: a saída de `scripts/03_teste_escrita_bloqueada.py` (erro 42501).
- `docs/consistencia-painel.png`: o cartão de consistência do painel (17.172 × 17.172 × 17.172).
- `docs/conferencia-tela.png`: a saída de `scripts/04_conferencia_python.py` (0 divergências).

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
