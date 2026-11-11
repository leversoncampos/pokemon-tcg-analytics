# ==================================
# FASE 1 - EXPLORAÇÃO DOS DADOS
# ==================================
# Objetivo: conhecer o CSV ANTES de limpar ou carregar qualquer coisa.
# Toda decisão da limpeza (Fase 3) precisa ter uma evidência aqui.
#
# Este script SÓ LÊ o CSV: não altera o original, não grava arquivos
# e não acessa o Supabase. Pode ser rodado quantas vezes for preciso.
#
# Como rodar (a partir da pasta do projeto):
#     python scripts/01_exploracao.py

import ast
import re
import sys
from pathlib import Path

import pandas as pd

# ==================================
# Configurações
# ==================================

# O Windows costuma usar uma codificação antiga no terminal, que quebra ao
# imprimir "Pokémon". Forçamos UTF-8 para o relatório sair legível.
sys.stdout.reconfigure(encoding="utf-8")

# Sem isto, o pandas esconde colunas e linhas de tabelas grandes com "..."
# e o relatório ficaria incompleto.
pd.set_option("display.width", 140)
pd.set_option("display.max_columns", 30)
pd.set_option("display.max_rows", 200)

# Montamos o caminho a partir do local deste arquivo (e não da pasta atual)
# para o script funcionar de qualquer lugar de onde for chamado.
PASTA_PROJETO = Path(__file__).resolve().parent.parent
CAMINHO_CSV = PASTA_PROJETO / "dados" / "pokemon-tcg-data-master 1999-2023.csv"

# Lista INICIAL de subtipos "especiais", mantida aqui como ponto de partida da
# auditoria: a Seção 8 confere se ela está completa. A decisão final acrescentou
# V-UNION (ver README.md); o efeito disso aparece no Teste 2 da Seção 9.
SUBTIPOS_ESPECIAIS = {
    "EX", "ex", "GX", "V", "VMAX", "VSTAR", "TAG TEAM",
    "MEGA", "LEGEND", "BREAK", "Level-Up",
}

# Trecho que identifica as coleções de promos no nome da coleção. A Seção 7.11
# mostra por que elas precisam de cuidado nas análises por ano.
TEXTO_PROMOS = "Black Star Promos"


# ==================================
# Funções auxiliares
# ==================================

def titulo(texto):
    """Imprime um cabeçalho de seção para o relatório ficar fácil de ler."""
    print()
    print("=" * 74)
    print(texto)
    print("=" * 74)


def subtitulo(texto):
    """Imprime um cabeçalho menor, para separar partes de uma seção."""
    print()
    print(f"--- {texto} ---")


def contagem_com_percentual(serie):
    """Conta os valores de uma coluna e mostra quanto cada um representa.

    Usamos dropna=False porque os nulos também são informação: escondê-los
    daria a falsa impressão de que a coluna está completa.
    """
    quantidade = serie.value_counts(dropna=False)
    percentual = (quantidade / len(serie) * 100).round(2)
    return pd.DataFrame({"qtd": quantidade, "%": percentual})


def texto_para_lista(valor):
    """Converte "['Fire']" (texto) na lista real ['Fire'].

    O CSV guarda listas Python como texto. Usamos ast.literal_eval, e não
    eval, porque ele só aceita valores literais: nunca executa código que
    estivesse escondido no arquivo.

    Valor nulo vira lista vazia: assim o resto do código sempre recebe uma
    lista e não precisa tratar nulo em todo lugar.
    """
    if pd.isna(valor):
        return []
    return ast.literal_eval(valor)


# ==================================
# 1. Carregar o CSV
# ==================================

titulo("1. CARREGAMENTO DO CSV")

df = pd.read_csv(CAMINHO_CSV)

print(f"Arquivo: {CAMINHO_CSV.name}")
print(f"Linhas:  {df.shape[0]:,}".replace(",", "."))
print(f"Colunas: {df.shape[1]}")
print()
print("Colunas e tipos que o pandas detectou:")
print(df.dtypes.to_string())


# ==================================
# 2. Nulos por coluna
# ==================================
# Nulo não é sempre erro. Precisamos saber QUANTOS são e, depois, DE QUEM
# são (a Seção 6 cruza com o supertipo) para decidir como tratar cada um.

titulo("2. NULOS POR COLUNA")

nulos = pd.DataFrame({
    "nulos": df.isna().sum(),
    "%": (df.isna().mean() * 100).round(2),
}).sort_values("nulos", ascending=False)

print(nulos.to_string())


# ==================================
# 3. IDs duplicados
# ==================================
# O id será a chave primária no Supabase e a base do upsert. Se houvesse
# repetição, cartas diferentes se sobrescreveriam e a contagem final
# ficaria menor do que a do CSV, sem nenhum erro aparecer.

titulo("3. IDs DUPLICADOS")

print(f"IDs duplicados:           {df['id'].duplicated().sum()}")
print(f"IDs nulos:                {df['id'].isna().sum()}")
print(f"Linhas 100% idênticas:    {df.duplicated().sum()}")

# O id pode ser único mesmo com a carta repetida. Por isso conferimos também
# a combinação coleção + número, que identifica a carta "no mundo real".
print(f"Repetidas em set+set_num: {df.duplicated(subset=['set', 'set_num']).sum()}")


# ==================================
# 4. Datas
# ==================================
# Convertemos com o formato EXPLÍCITO (%m/%d/%Y). Se deixássemos o pandas
# adivinhar, uma data como 1/9/1999 poderia virar 1º de setembro. Com
# errors="coerce", o que não puder ser lido vira nulo e pode ser contado.

titulo("4. DATAS")

df["data"] = pd.to_datetime(df["release_date"], format="%m/%d/%Y", errors="coerce")
df["ano"] = df["data"].dt.year

print(f"Exemplo original:       {df['release_date'].iloc[0]}")
print(f"Datas que não converteram: {df['data'].isna().sum()}")
print(f"Primeira data: {df['data'].min().date()}")
print(f"Última data:   {df['data'].max().date()}")

# Prova do formato: em M/D/AAAA o primeiro número nunca passa de 12, e o
# segundo às vezes passa. Se fosse D/M, seria o contrário.
partes = df["release_date"].str.split("/", expand=True).astype(int)
print(f"Maior valor na 1ª posição: {partes[0].max()} (mês, se for M/D/AAAA)")
print(f"Maior valor na 2ª posição: {partes[1].max()} (dia, se for M/D/AAAA)")

subtitulo("Cartas, coleções e raridades por ano")
# Esta tabela já é a base da hipótese 2 (modelo de negócio): mais cartas,
# mais coleções e mais raridades diferentes a cada ano?
por_ano = df.groupby("ano").agg(
    cartas=("id", "count"),
    colecoes=("set", "nunique"),
    raridades_diferentes=("rarity", "nunique"),
)
print(por_ano.to_string())

# Um ano incompleto distorce a comparação com os demais.
ultimo_ano = df["ano"].max()
print(f"\nÚltimo lançamento de {ultimo_ano}: {df['data'].max().date()}")


# ==================================
# 5. Distribuições das categorias
# ==================================
# Mostram quais valores existem de fato. É aqui que aparecem erros de
# digitação, espaços sobrando e categorias que precisam ser agrupadas.

titulo("5. DISTRIBUIÇÕES")

# Convertemos as listas de texto já aqui, pois o "primeiro tipo" depende disso.
df["lista_tipos"] = df["types"].apply(texto_para_lista)
df["lista_subtipos"] = df["subtypes"].apply(texto_para_lista)

# Regra do projeto: carta com 2 tipos fica com o primeiro; sem tipo = 'Sem tipo'.
df["primeiro_tipo"] = df["lista_tipos"].apply(
    lambda tipos: tipos[0] if tipos else "Sem tipo"
)

for coluna in ["supertype", "publisher", "generation", "primeiro_tipo"]:
    subtitulo(coluna)
    print(contagem_com_percentual(df[coluna]).to_string())

subtitulo("rarity (todos os valores)")
print(contagem_com_percentual(df["rarity"]).to_string())


# ==================================
# 6. Conferência dos problemas de qualidade conhecidos
# ==================================
# Cada item abaixo testa um problema já listado, com um número que comprova.
# Assim a limpeza da Fase 3 ataca o que existe, não o que supomos existir.

titulo("6. CONFERÊNCIA DOS PROBLEMAS JÁ LISTADOS")

subtitulo("6.1 Datas em M/D/AAAA")
padrao_americano = df["release_date"].str.fullmatch(r"\d{1,2}/\d{1,2}/\d{4}")
print(f"Linhas no padrão M/D/AAAA: {padrao_americano.sum()} de {len(df)}")

subtitulo("6.2 Listas guardadas como texto")
# Se fosse uma lista de verdade, o tipo em Python seria list, não str.
print(f"Tipo Python de 'types':    {type(df['types'].dropna().iloc[0]).__name__}")
print(f"Tipo Python de 'subtypes': {type(df['subtypes'].dropna().iloc[0]).__name__}")
print(f"Exemplo de types:    {df['types'].dropna().iloc[0]!r}")
print(f"Exemplo de subtypes: {df['subtypes'].dropna().iloc[0]!r}")
print("Todas foram convertidas sem erro (senão o script teria parado na Seção 5).")

subtitulo("6.3 Espaço sobrando em generation")
print(sorted(df["generation"].dropna().unique()))
sobrando = df[df["generation"] != df["generation"].str.strip()]
print(f"Linhas com espaço sobrando: {len(sobrando)}")
print(f"Valores afetados: {sobrando['generation'].unique().tolist()}")

subtitulo("6.4 Nulos de hp, types, rarity e subtypes por supertipo")
# Se os nulos estão concentrados em Treinador/Energia, são "esperados".
# Um Pokémon sem HP, por outro lado, seria um erro de verdade.
for coluna in ["hp", "types", "rarity", "subtypes"]:
    print(f"\n{coluna}:")
    tabela = df.groupby("supertype")[coluna].agg(
        nulos=lambda serie: serie.isna().sum(),
        preenchidos="count",
    )
    print(tabela.to_string())

subtitulo("6.5 Cartas com mais de um tipo")
qtd_tipos = df["lista_tipos"].apply(len)
print(qtd_tipos.value_counts().sort_index().to_string())
print("\nCombinações (com 2 tipos):")
print(df.loc[qtd_tipos == 2, "types"].value_counts().head(10).to_string())

subtitulo("6.6 Raridades")
print(f"Valores diferentes de rarity: {df['rarity'].nunique()}")
# Se minúsculas ou espaços "fundissem" valores, seriam a mesma raridade
# escrita de formas diferentes.
normalizadas = df["rarity"].dropna().str.strip().str.lower().nunique()
print(f"Após normalizar maiúsculas/espaços: {normalizadas}")


# ==================================
# 7. Auditoria: procurando problemas NOVOS
# ==================================
# A lista inicial de problemas traz o que já se conhecia. Aqui testamos o que ainda NÃO foi
# verificado, porque um dado errado passa despercebido até virar um gráfico
# errado na frente do professor.

titulo("7. AUDITORIA: PROBLEMAS NÃO LISTADOS")

subtitulo("7.1 Cartas não-Pokémon com HP")
# A lista inicial supõe que Treinador/Energia não têm HP. Se alguma tiver, ela
# entraria nas médias de HP caso a regra fosse só "hp não nulo".
sem_ser_pokemon = df[(df["supertype"] != "Pokémon") & df["hp"].notna()]
print(f"Total: {len(sem_ser_pokemon)}")
print(sem_ser_pokemon.groupby(["supertype", "name"]).size()
      .sort_values(ascending=False).head(12).to_string())

subtitulo("7.2 Cartas não-Pokémon com tipo")
com_tipo = df[(df["supertype"] != "Pokémon") & (df["lista_tipos"].apply(len) > 0)]
print(f"Total: {len(com_tipo)}")
print(com_tipo[["id", "name", "supertype", "types", "hp"]].head(8).to_string())

subtitulo("7.3 Subtipos especiais em cartas que não são Pokémon")
# Risco: um Treinador pode ter subtipo 'TAG TEAM'. Sem cuidado, ele seria
# marcado como especial e distorceria o % de especiais.
marcada_especial = df["lista_subtipos"].apply(
    lambda subtipos: any(s in SUBTIPOS_ESPECIAIS for s in subtipos)
)
print(df.loc[marcada_especial, "supertype"].value_counts().to_string())

subtitulo("7.4 Valores de HP")
print(df["hp"].describe().round(1).to_string())
print(f"\nHP que não é múltiplo de 10: {(df['hp'].dropna() % 10 != 0).sum()}")
maior = df.loc[df["hp"] == df["hp"].max(), ["name", "set", "ano", "hp"]]
print("\nCartas com o maior HP:")
print(maior.head(5).to_string())

subtitulo("7.5 Editora x tempo")
# Serve para a hipótese 3: as eras WOTC e TPCI são separadas ou se misturam?
print(df.groupby("publisher")["data"].agg(["min", "max", "count"]).to_string())
sets_duas_editoras = df.groupby("set")["publisher"].nunique()
print(f"Coleções com 2 editoras: {(sets_duas_editoras > 1).sum()}")

subtitulo("7.6 Coleções com mais de uma data")
datas_por_set = df.groupby("set")["data"].nunique()
print(f"Total de coleções:         {len(datas_por_set)}")
print(f"Coleções com 2+ datas:     {(datas_por_set > 1).sum()}")
print(datas_por_set[datas_por_set > 1].to_string())

subtitulo("7.7 Reimpressões")
# Mesmo nome + mesmo HP + mesmos ataques em cartas diferentes = a mesma carta
# impressa de novo. Isso conta como lançamento, mas não é um Pokémon "novo".
pokemons = df[df["supertype"] == "Pokémon"]
reimpressas = pokemons.duplicated(subset=["name", "hp", "attacks"], keep="first")
print(f"Pokémon idênticos a outro anterior: {reimpressas.sum()} "
      f"({reimpressas.mean() * 100:.1f}% dos Pokémon)")
# Separar os dois casos importa: na mesma coleção é variante de arte; em outra
# coleção é reimpressão. Nenhum dos dois traz um Pokémon realmente novo.
mesma_colecao = pokemons.duplicated(subset=["name", "hp", "attacks", "set"], keep="first")
print(f"  na mesma coleção (variantes): {mesma_colecao.sum()}")
print(f"  em outra coleção (reimpressão): {(reimpressas & ~mesma_colecao).sum()}")
print("Por ano (top 8):")
print(pokemons[reimpressas].groupby("ano").size()
      .sort_values(ascending=False).head(8).to_string())

subtitulo("7.8 Nulos de rarity: de onde vêm")
print(df[df["rarity"].isna()].groupby("set").size()
      .sort_values(ascending=False).head(12).to_string())

subtitulo("7.9 Nulos de subtypes: de onde vêm")
print(df[df["subtypes"].isna()].groupby(["supertype", "ano"]).size()
      .sort_values(ascending=False).head(10).to_string())

subtitulo("7.10 Texto mal codificado e espaços")
# 'Ã' e '�' são sinais clássicos de acento quebrado por codificação errada.
for coluna in ["name", "set", "supertype", "rarity", "publisher"]:
    texto = df[coluna].dropna()
    quebrados = texto.str.contains("Ã|�", regex=True).sum()
    espacos = (texto != texto.str.strip()).sum()
    print(f"{coluna:<10} acentos quebrados: {quebrados:>4} | espaços sobrando: {espacos:>4}")

subtitulo("7.11 Data da coleção x data da carta (promos)")
# A release_date pertence à COLEÇÃO, não à carta. Isso é inofensivo numa coleção
# normal, lançada de uma vez. Mas as promos saem aos poucos, durante anos, e
# mesmo assim têm uma data só: a do início. Todas caem num único ano.
df["promo"] = df["set"].str.contains(TEXTO_PROMOS)
print(f"Cartas em coleções de promos: {df['promo'].sum()}")
print(df[df["promo"]].groupby("set")["data"].agg(["min", "nunique", "count"])
      .sort_values("min").to_string())

# Prova 1: mecânicas "antes de existirem". Comparamos o ano de estreia de cada
# uma nas coleções normais com as datas que aparecem nas promos.
print("\nEstreia de cada mecânica: coleções normais x promos")
com_subtipo = df[df["supertype"] == "Pokémon"].explode("lista_subtipos")
for mecanica in ["TAG TEAM", "V", "VMAX", "VSTAR", "V-UNION"]:
    linhas = com_subtipo[com_subtipo["lista_subtipos"] == mecanica]
    normais = linhas[~linhas["promo"]]
    if len(normais) > 0:
        estreia = normais["ano"].min()
        adiantadas = (linhas["promo"] & (linhas["ano"] < estreia)).sum()
    else:
        estreia = "nunca"
        adiantadas = len(linhas)
    print(f"  {mecanica:<9} estreia em coleção normal: {estreia} | "
          f"promos datadas antes disso: {adiantadas}")

# Prova 2: a marca de regulamento muda com o tempo, e o CSV a registra carta a
# carta. Uma coleção com marcas D, E e F foi lançada ao longo de vários anos.
print("\nMarca de regulamento por ano, SEM promos:")
print(pd.crosstab(df.loc[~df["promo"], "regulationMark"], df.loc[~df["promo"], "ano"]).to_string())
print("\nMarca de regulamento em SWSH Black Star Promos (data única no CSV):")
swsh = df[df["set"] == "SWSH Black Star Promos"]
print(pd.crosstab(swsh["regulationMark"].fillna("sem marca"), swsh["ano"]).to_string())

print("\nCartas por ano, com e sem promos:")
print(pd.DataFrame({
    "com_promos": df.groupby("ano").size(),
    "sem_promos": df[~df["promo"]].groupby("ano").size(),
}).T.to_string())

subtitulo("7.12 Repetições de set+set_num e coleção com 2 datas")
# As 3 repetições da Seção 3: cartas diferentes com o mesmo número? Como o id é
# único, não há perda de dados, mas precisamos saber o motivo.
repetidas = df[df.duplicated(subset=["set", "set_num"], keep=False)]
print(repetidas[["id", "name", "set", "set_num"]].to_string())
# 'Shiny Vault' reúne duas coleções diferentes sob o mesmo nome. Num filtro ou
# agrupamento por coleção, elas se misturariam.
print("\nA coleção com 2 datas:")
print(df[df["set"] == "Shiny Vault"].groupby(["release_date", "series"]).size().to_string())

subtitulo("7.13 Nomes de raridade antigos x novos")
# A contagem de raridades por ano sobe, mas parte disso pode ser só troca de
# nome: 2023 mistura a nomenclatura antiga com a nova da série Scarlet & Violet.
print("Raridades que estrearam em 2023:")
estreia_raridade = df.groupby("rarity")["ano"].min()
print(sorted(estreia_raridade[estreia_raridade == 2023].index))
print("\nNome antigo x nome novo por ano:")
print(pd.crosstab(
    df.loc[df["rarity"].isin(["Rare Ultra", "Ultra Rare"]), "ano"],
    df.loc[df["rarity"].isin(["Rare Ultra", "Ultra Rare"]), "rarity"],
).loc[2021:].to_string())


# ==================================
# 8. Revisão da lista de subtipos especiais
# ==================================
# A lista inicial de subtipos foi um palpite. Aqui comparamos, para cada
# subtipo de Pokémon, o HP médio e os anos em que ele apareceu. Um subtipo
# de HP alto fora da lista pode ser uma mecânica especial que esquecemos.

titulo("8. REVISÃO DOS SUBTIPOS ESPECIAIS (só cartas Pokémon)")

# explode() cria uma linha para cada subtipo da carta, o que permite agrupar.
# Uma mesma carta aparece em mais de uma linha aqui, o que é o esperado.
pokemons = df[df["supertype"] == "Pokémon"].copy()
por_subtipo = pokemons.explode("lista_subtipos")

resumo_subtipos = por_subtipo.groupby("lista_subtipos").agg(
    cartas=("id", "count"),
    hp_medio=("hp", "mean"),
    primeiro_ano=("ano", "min"),
    ultimo_ano=("ano", "max"),
).round(1).sort_values("hp_medio", ascending=False)
resumo_subtipos["na_lista"] = resumo_subtipos.index.isin(SUBTIPOS_ESPECIAIS)
print(resumo_subtipos.to_string())

subtitulo("Conferência pelo NOME da carta")
# O subtipo pode estar errado ou faltando. O nome da carta mostra a mecânica
# ("Charizard ex", "Lugia LV.X"), então serve de segunda fonte.
padrao_nome = re.compile(
    r"(?:[ -]ex\b|[ -]EX\b|[ -]GX\b|\bVMAX\b|\bVSTAR\b|\bV$|\bLV\.X\b|\bBREAK\b|\bLEGEND\b|^M )"
)
pokemons["nome_de_especial"] = pokemons["name"].str.contains(padrao_nome)
pokemons["especial"] = pokemons["lista_subtipos"].apply(
    lambda subtipos: any(s in SUBTIPOS_ESPECIAIS for s in subtipos)
)
print(pd.crosstab(pokemons["nome_de_especial"], pokemons["especial"]).to_string())

divergentes = pokemons[pokemons["nome_de_especial"] & ~pokemons["especial"]]
print(f"\nNome de especial, mas fora da lista: {len(divergentes)}")
print(divergentes[["name", "set", "ano", "hp", "subtypes"]].head(12).to_string())

divergentes = pokemons[~pokemons["nome_de_especial"] & pokemons["especial"]]
print(f"\nNa lista, mas o nome não indica: {len(divergentes)}")
if len(divergentes) > 0:
    print(divergentes[["name", "set", "ano", "hp", "subtypes"]].head(12).to_string())

subtitulo("Subtipos fora da lista: o HP deles é mesmo alto?")
# A tabela acima engana: Tera tem HP alto, mas pode ser só porque toda carta
# Tera também é ex. Por isso olhamos as cartas "puras", que NÃO têm nenhum
# subtipo da lista. Elas é que mudariam o resultado se entrassem na lista.
CANDIDATOS = [
    "V-UNION", "Eternamax", "Tera", "Radiant", "Prism Star", "Prime",
    "Star", "SP", "Ultra Beast", "Team Plasma", "Ancient", "Future",
    "Single Strike", "Rapid Strike", "Fusion Strike", "Restored", "Baby",
]
for candidato in CANDIDATOS:
    cartas = pokemons[pokemons["lista_subtipos"].apply(lambda subtipos: candidato in subtipos)]
    puras = cartas[~cartas["especial"]]
    hp_puras = f"{puras['hp'].mean():.1f}" if len(puras) else "-"
    print(f"{candidato:<14} cartas: {len(cartas):>3} | já especiais: "
          f"{cartas['especial'].sum():>3} | puras: {len(puras):>3} | HP das puras: {hp_puras}")


# ==================================
# 9. HP médio e % de especiais por ano
# ==================================
# Este é o coração da pergunta central. Separamos normais de especiais porque
# a média geral sozinha não diz se TODAS as cartas ficaram mais fortes ou se
# só entraram mais cartas especiais na conta.

titulo("9. HP MÉDIO E % DE ESPECIAIS POR ANO (só Pokémon com HP)")

# Só Pokémon: as cartas não-Pokémon com HP (Seção 7.1) não devem contar.
com_hp = pokemons[pokemons["hp"].notna()].copy()
com_hp["promo"] = com_hp["set"].str.contains(TEXTO_PROMOS)


def resumo_por_ano(cartas, marca_especial):
    """Monta a tabela anual.

    Virou função para repetir a MESMA conta nos testes abaixo: mudamos só a
    entrada, e qualquer diferença no resultado vem da entrada.
    marca_especial é uma coluna True/False dizendo quais cartas são especiais.
    """
    marca = marca_especial.loc[cartas.index]
    resumo = pd.DataFrame({
        "cartas": cartas.groupby("ano").size(),
        "especiais": marca.groupby(cartas["ano"]).sum(),
        "hp_geral": cartas.groupby("ano")["hp"].mean(),
        "hp_normais": cartas[~marca].groupby("ano")["hp"].mean(),
        "hp_especiais": cartas[marca].groupby("ano")["hp"].mean(),
    })
    resumo["%_especiais"] = resumo["especiais"] / resumo["cartas"] * 100
    return resumo


evolucao = resumo_por_ano(com_hp, com_hp["especial"])
print(evolucao.round(1).to_string())

subtitulo("Teste 1: e sem as coleções de promos?")
# Teste de sensibilidade: refazemos a conta sem as cartas de data não confiável
# (Seção 7.11). Se um resultado muda pouco, ele é sólido; se muda muito, dependia
# daquelas cartas.
sem_promos = com_hp[~com_hp["promo"]]
evolucao_sem_promos = resumo_por_ano(sem_promos, sem_promos["especial"])
comparacao = pd.DataFrame({
    "cartas_com": evolucao["cartas"],
    "cartas_sem": evolucao_sem_promos["cartas"],
    "hp_com": evolucao["hp_geral"],
    "hp_sem": evolucao_sem_promos["hp_geral"],
    "%esp_com": evolucao["%_especiais"],
    "%esp_sem": evolucao_sem_promos["%_especiais"],
}).round(1)
print(comparacao.loc[2003:].to_string())

subtitulo("Teste 2: e se a lista de especiais mudasse?")
# Mesma ideia, agora variando a lista. Lista A = incluir só o V-UNION.
# Lista B = incluir também as cartas raras de HP modesto da Seção 8.
def marcar_especiais(lista):
    """Devolve True/False por carta, usando a lista de subtipos recebida."""
    return com_hp["lista_subtipos"].apply(lambda subtipos: any(s in lista for s in subtipos))


lista_a = SUBTIPOS_ESPECIAIS | {"V-UNION"}
lista_b = lista_a | {"Prime", "Star", "Prism Star", "Radiant", "SP"}
evolucao_a = resumo_por_ano(com_hp, marcar_especiais(lista_a))
evolucao_b = resumo_por_ano(com_hp, marcar_especiais(lista_b))
sensibilidade = pd.DataFrame({
    "%esp_atual": evolucao["%_especiais"],
    "%esp_A": evolucao_a["%_especiais"],
    "%esp_B": evolucao_b["%_especiais"],
    "hp_esp_atual": evolucao["hp_especiais"],
    "hp_esp_A": evolucao_a["hp_especiais"],
    "hp_esp_B": evolucao_b["hp_especiais"],
}).round(1)
print(sensibilidade.loc[2003:].to_string())


# ==================================
# 10. Hipótese 3: WOTC x TPCI
# ==================================
# Comparar editoras sem controlar o tempo engana: a TPCI publicou nos anos
# mais recentes, quando tudo já tinha HP maior. Olhamos os mesmos indicadores
# do gráfico-radar planejado e, depois, só as cartas normais.

titulo("10. PERFIL POR EDITORA (só Pokémon com HP)")

perfil = com_hp.groupby("publisher").agg(
    cartas=("id", "count"),
    anos_ativos=("ano", "nunique"),
    hp_medio=("hp", "mean"),
    pct_especiais=("especial", lambda serie: serie.mean() * 100),
)
perfil["cartas_por_ano"] = perfil["cartas"] / perfil["anos_ativos"]
perfil["hp_medio_normais"] = com_hp[~com_hp["especial"]].groupby("publisher")["hp"].mean()
print(perfil.round(1).to_string())
print("\nObs.: o % de especiais da WOTC é zero por construção: as primeiras cartas")
print("especiais saíram depois da última coleção da WOTC. Não é uma comparação justa.")

subtitulo("Transição: HP das NORMAIS por editora, ano a ano")
# Se a troca de editora mudasse o HP, veríamos um salto em 2003. Aqui comparamos
# as duas editoras no mesmo ano, o que elimina o efeito do tempo.
transicao = com_hp[~com_hp["especial"] & com_hp["ano"].between(2001, 2007)]
print(transicao.groupby(["ano", "publisher"])["hp"].agg(["mean", "count"]).round(1).to_string())


# ==================================
# 11. Conferência dos achados preliminares
# ==================================
# Coloca lado a lado o que a lista inicial afirma e o que os dados mostram.

titulo("11. ACHADOS PRELIMINARES x DADOS")

hp_1999 = evolucao.loc[1999, "hp_geral"]
hp_2022 = evolucao.loc[2022, "hp_geral"]
print(f"HP geral 1999:        {hp_1999:.1f}   (preliminar: 62)")
print(f"HP geral 2022:        {hp_2022:.1f}  (preliminar: 143)")
print(f"Crescimento 99-22:    {(hp_2022 / hp_1999 - 1) * 100:+.1f}% (preliminar: +130%)")
print(f"Normais 1999:         {evolucao.loc[1999, 'hp_normais']:.1f}   (preliminar: 63)")
print(f"Normais 2020-2023:    {evolucao.loc[2020:2023, 'hp_normais'].round(1).tolist()}"
      f"  (preliminar: ~93-99)")
print(f"Especiais 2005:       {evolucao.loc[2005, 'hp_especiais']:.1f}  (preliminar: 115)")
print(f"Especiais 2023:       {evolucao.loc[2023, 'hp_especiais']:.1f}  (preliminar: 260)")
print(f"% especiais 2010:     {evolucao.loc[2010, '%_especiais']:.1f}%  (preliminar: 5%)")
print(f"% especiais 2022:     {evolucao.loc[2022, '%_especiais']:.1f}% (preliminar: 32%)")
print(f"% especiais 2023:     {evolucao.loc[2023, '%_especiais']:.1f}% (preliminar: 21%)")

subtitulo("Teste: a queda de 2023 vem da proporção de especiais?")
# Refazemos a média de 2023 usando os HPs de 2023, mas com a proporção de
# especiais de 2022. Se a média sobe de volta ao nível de 2022, a proporção
# explica a queda. É uma média ponderada: normais x peso + especiais x peso.
peso_2022 = evolucao.loc[2022, "%_especiais"] / 100
simulada = (
    evolucao.loc[2023, "hp_normais"] * (1 - peso_2022)
    + evolucao.loc[2023, "hp_especiais"] * peso_2022
)
print(f"HP geral real de 2022:  {hp_2022:.1f}")
print(f"HP geral real de 2023:  {evolucao.loc[2023, 'hp_geral']:.1f}")
print(f"2023 com a proporção de 2022: {simulada:.1f}")

subtitulo("Quanto do crescimento vem das normais?")
# Se as normais sozinhas cresceram bem menos que a média geral, o restante
# do crescimento vem das especiais (hipótese 1).
normais_1999 = evolucao.loc[1999, "hp_normais"]
normais_2022 = evolucao.loc[2022, "hp_normais"]
print(f"Crescimento das normais 1999-2022: {(normais_2022 / normais_1999 - 1) * 100:+.1f}%")
print(f"Crescimento da média geral:        {(hp_2022 / hp_1999 - 1) * 100:+.1f}%")

# Divide o ganho em HP: o que as normais teriam dado sozinhas (sem especiais, a
# média geral seria igual à das normais) e o que sobra, vindo das especiais.
ganho_total = hp_2022 - hp_1999
ganho_normais = normais_2022 - normais_1999
ganho_especiais = ganho_total - ganho_normais
print(f"Ganho total 1999-2022:  {ganho_total:.1f} HP")
print(f"  vindo das normais:    {ganho_normais:.1f} HP ({ganho_normais / ganho_total * 100:.0f}%)")
print(f"  vindo das especiais:  {ganho_especiais:.1f} HP ({ganho_especiais / ganho_total * 100:.0f}%)")

subtitulo("Valores esperados nos KPIs do dashboard, sem filtros")
# Calculamos aqui para conferir o dashboard depois: a tela deve mostrar estes
# mesmos números. O filtro "Incluir promos" começa desligado, então o padrão é
# a coluna "sem promos".
# O KPI 3 compara o primeiro e o último ano do período. O último é 2023 (que
# caiu), e não 2022, por isso ele fica abaixo do crescimento citado na análise.
sem_promos_hp = evolucao_sem_promos["hp_geral"]
hp_2023 = evolucao.loc[2023, "hp_geral"]
print(f"{'':<34}{'sem promos':>12}{'com promos':>12}")
print(f"{'KPI 1 - Total de cartas':<34}{(~df['promo']).sum():>12}{len(df):>12}")
print(f"{'KPI 2 - HP médio':<34}{sem_promos['hp'].mean():>12.1f}{com_hp['hp'].mean():>12.1f}")
print(f"{'KPI 3 - Crescimento 1999-2023':<34}"
      f"{(sem_promos_hp[2023] / sem_promos_hp[1999] - 1) * 100:>+11.1f}%"
      f"{(hp_2023 / hp_1999 - 1) * 100:>+11.1f}%")
print(f"{'Só referência: 1999-2022':<34}"
      f"{(sem_promos_hp[2022] / sem_promos_hp[1999] - 1) * 100:>+11.1f}%"
      f"{(hp_2022 / hp_1999 - 1) * 100:>+11.1f}%")

print()
print("Fim do relatório. O CSV original não foi alterado.")
