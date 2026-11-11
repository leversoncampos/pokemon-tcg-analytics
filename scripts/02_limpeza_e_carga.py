# ==================================
# FASE 3 - LIMPEZA E CARGA NO SUPABASE
# ==================================
# Lê o CSV original, aplica as regras aprovadas (ver README.md), valida o
# resultado e envia as cartas para a tabela "cartas" do Supabase.
#
# O CSV original nunca é alterado: toda a limpeza acontece em memória.
#
# Como rodar (a partir da pasta do projeto):
#     python scripts/02_limpeza_e_carga.py --simular    (não envia nada)
#     python scripts/02_limpeza_e_carga.py              (carga real)
#
# Rodar a carga real 2 vezes não duplica nada: o upsert usa o id para decidir
# entre inserir uma carta nova e atualizar uma existente.

import argparse
import ast
import json
import os
import sys
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv

# ==================================
# Configurações
# ==================================

# Mesmo motivo da exploração: o terminal do Windows quebra "Pokémon" sem isto.
sys.stdout.reconfigure(encoding="utf-8")

# Caminhos a partir deste arquivo, para funcionar de qualquer pasta.
PASTA_PROJETO = Path(__file__).resolve().parent.parent
CAMINHO_CSV = PASTA_PROJETO / "dados" / "pokemon-tcg-data-master 1999-2023.csv"
CAMINHO_ENV = PASTA_PROJETO / ".env"

NOME_TABELA = "cartas"

# Enviar 17 mil linhas de uma vez seria um pedido enorme, com risco de estourar
# o tempo limite. Em lotes de 500, cada pedido é pequeno, e uma falha aponta
# exatamente onde a carga parou.
TAMANHO_LOTE = 500

# Lista final aprovada na Fase 1. O V-UNION entrou por ter HP alto; Prime, Star,
# SP, Radiant e Prism Star ficaram fora por terem HP modesto.
SUBTIPOS_ESPECIAIS = {
    "EX", "ex", "GX", "V", "VMAX", "VSTAR", "TAG TEAM",
    "MEGA", "LEGEND", "BREAK", "Level-Up", "V-UNION",
}

# Tradução exigida pelo CHECK do SQL. Um valor fora deste dicionário vira nulo
# e é barrado na validação, em vez de ser gravado sem tradução.
TRADUCAO_SUPERTIPO = {
    "Pokémon": "Pokémon",
    "Trainer": "Treinador",
    "Energy": "Energia",
}

# Valores permitidos, iguais aos dos CHECK de scripts/criar_tabela.sql.
SUPERTIPOS_VALIDOS = {"Pokémon", "Treinador", "Energia"}
EDITORAS_VALIDAS = {"WOTC", "TPCI"}
SEM_TIPO = "Sem tipo"
SEM_RARIDADE = "Sem raridade"

# Ordem das 10 colunas, igual à da tabela no Supabase.
COLUNAS_TABELA = [
    "id", "nome", "supertipo", "tipo", "hp", "raridade",
    "colecao", "editora", "data_lancamento", "especial",
]

# Só estas colunas podem ser nulas no banco.
COLUNAS_ACEITAM_NULO = {"hp"}


# ==================================
# Funções auxiliares
# ==================================

def titulo(texto):
    """Imprime um cabeçalho para o relatório ficar fácil de ler."""
    print()
    print("=" * 74)
    print(texto)
    print("=" * 74)


def texto_para_lista(valor):
    """Converte "['Fire']" (texto) na lista real ['Fire'].

    ast.literal_eval só aceita valores literais: ao contrário de eval, nunca
    executa código. Nulo vira lista vazia para o resto do código sempre
    receber uma lista.
    """
    if pd.isna(valor):
        return []
    return ast.literal_eval(valor)


def tem_subtipo_especial(subtipos):
    """Diz se a lista de subtipos da carta contém algum subtipo especial."""
    return any(subtipo in SUBTIPOS_ESPECIAIS for subtipo in subtipos)


# ==================================
# 1. Leitura do CSV
# ==================================

def ler_csv():
    """Lê o CSV original. Só leitura: o arquivo não é alterado."""
    titulo("1. LEITURA DO CSV")
    original = pd.read_csv(CAMINHO_CSV)
    print(f"Arquivo: {CAMINHO_CSV.name}")
    print(f"Linhas: {len(original)} | Colunas: {original.shape[1]}")
    return original


# ==================================
# 2. Limpeza
# ==================================
# Cada passo corresponde a um problema numerado no README.md e imprime quantas
# cartas foram afetadas, para que a limpeza possa ser comprovada.

def limpar(original):
    """Aplica as regras aprovadas e devolve uma tabela com as 10 colunas."""
    titulo("2. LIMPEZA")

    # Trabalhamos numa cópia para manter o original intacto e poder comparar
    # o antes e o depois no resumo.
    df = original.copy()

    # A partir daqui, várias regras dependem de saber quem é Pokémon.
    eh_pokemon = df["supertype"] == "Pokémon"

    # Problema 1: data americana M/D/AAAA vira AAAA-MM-DD, o formato do tipo
    # date. O formato explícito evita ler 1/9/1999 como 1º de setembro.
    datas = pd.to_datetime(df["release_date"], format="%m/%d/%Y", errors="coerce")
    df["data_lancamento"] = datas.dt.strftime("%Y-%m-%d")
    print(f"Datas convertidas para AAAA-MM-DD:          {datas.notna().sum()}")

    # Problema 2: listas guardadas como texto viram listas de verdade.
    lista_tipos = df["types"].apply(texto_para_lista)
    lista_subtipos = df["subtypes"].apply(texto_para_lista)
    print(f"Textos de 'types' convertidos em lista:     {df['types'].notna().sum()}")
    print(f"Textos de 'subtypes' convertidos em lista:  {df['subtypes'].notna().sum()}")

    # Problema 3: 'generation' não vai para a tabela, mas tratamos mesmo assim
    # para o resumo comprovar a correção.
    afetadas = (df["generation"] != df["generation"].str.strip()).sum()
    df["generation"] = df["generation"].str.strip()
    print(f"Espaços removidos de 'generation':          {afetadas}")

    # Problemas 5 e 10: fica o primeiro tipo, e só Pokémon tem tipo. Isso cobre
    # as 103 cartas com 2 tipos e as 3 Energias que têm tipo no CSV.
    primeiro_tipo = lista_tipos.apply(lambda tipos: tipos[0] if tipos else SEM_TIPO)
    df["tipo"] = primeiro_tipo.where(eh_pokemon, SEM_TIPO)
    print(f"Cartas com 2 tipos (fica o primeiro):       {(lista_tipos.apply(len) == 2).sum()}")
    print(f"Não-Pokémon com tipo (viram '{SEM_TIPO}'):    "
          f"{(~eh_pokemon & df['types'].notna()).sum()}")

    # Problema 9: where mantém o valor quando a condição é verdadeira e, nas
    # outras linhas, coloca nulo. Tira o HP dos fósseis e bonecas.
    print(f"Não-Pokémon com HP (viram nulo):            "
          f"{(~eh_pokemon & df['hp'].notna()).sum()}")
    df["hp"] = df["hp"].where(eh_pokemon)

    # Problema 4: raridade nula ganha um rótulo explícito para o gráfico.
    print(f"Raridades nulas (viram '{SEM_RARIDADE}'):     {df['rarity'].isna().sum()}")
    df["raridade"] = df["rarity"].fillna(SEM_RARIDADE)

    # Problema 8: especial exige as duas condições. Sem o eh_pokemon, 11
    # Treinadores com subtipo 'TAG TEAM' seriam marcados.
    tem_subtipo = lista_subtipos.apply(tem_subtipo_especial)
    df["especial"] = tem_subtipo & eh_pokemon
    print(f"Treinadores que NÃO viraram especiais:      {(tem_subtipo & ~eh_pokemon).sum()}")

    # Problema 11: 'Shiny Vault' reúne 2 coleções. O ano da data as separa.
    shiny_vault = df["set"] == "Shiny Vault"
    df["colecao"] = df["set"]
    df.loc[shiny_vault, "colecao"] = "Shiny Vault (" + datas[shiny_vault].dt.year.astype(str) + ")"
    print(f"Cartas de 'Shiny Vault' separadas por ano:  {shiny_vault.sum()}")

    # Traduz o supertipo e renomeia o restante para os nomes da tabela.
    df["supertipo"] = df["supertype"].map(TRADUCAO_SUPERTIPO)
    df = df.rename(columns={"name": "nome", "publisher": "editora"})

    # Decisão da Fase 1: nenhuma carta é excluída. As 1.100 promos ficam no
    # banco, e quem as esconde é o filtro "Incluir promos" do dashboard.
    promos = df["set"].str.contains("Black Star Promos").sum()
    print(f"Promos mantidas no banco:                   {promos}")

    return df[COLUNAS_TABELA]


# ==================================
# 3. Resumo antes x depois
# ==================================

def imprimir_resumo(original, cartas):
    """Compara o CSV com a tabela limpa: é a evidência do tratamento."""
    titulo("3. RESUMO ANTES x DEPOIS DA LIMPEZA")

    # Cada linha: o que medimos, valor no CSV e valor após a limpeza.
    resumo = [
        ("Linhas", len(original), len(cartas)),
        ("Colunas", original.shape[1], cartas.shape[1]),
        ("Cartas com HP", original["hp"].notna().sum(), cartas["hp"].notna().sum()),
        ("HP nulo", original["hp"].isna().sum(), cartas["hp"].isna().sum()),
        ("Sem tipo", original["types"].isna().sum(), (cartas["tipo"] == SEM_TIPO).sum()),
        ("Raridade nula", original["rarity"].isna().sum(), cartas["raridade"].isna().sum()),
        ("Coleções diferentes", original["set"].nunique(), cartas["colecao"].nunique()),
    ]
    print(f"{'Medida':<24}{'Antes':>10}{'Depois':>10}")
    for medida, antes, depois in resumo:
        print(f"{medida:<24}{antes:>10}{depois:>10}")

    print()
    print(f"Pokémon: {(cartas['supertipo'] == 'Pokémon').sum()} | "
          f"Treinador: {(cartas['supertipo'] == 'Treinador').sum()} | "
          f"Energia: {(cartas['supertipo'] == 'Energia').sum()}")
    print(f"Cartas especiais: {cartas['especial'].sum()}")
    print(f"Período: {cartas['data_lancamento'].min()} a {cartas['data_lancamento'].max()}")


# ==================================
# 4. Validação local (espelho dos CHECK do SQL)
# ==================================
# O banco já recusaria um dado errado, mas só no meio da carga, com parte das
# cartas enviada. Conferindo aqui, o erro aparece antes do primeiro envio, e a
# mensagem diz quantas cartas têm o problema.

def validar(cartas, total_csv):
    """Confere todas as regras e devolve uma lista com as que falharam.

    Cada regra conta as linhas com problema. Lista vazia = tudo certo.
    """
    titulo("4. VALIDAÇÃO LOCAL (mesmas regras do SQL)")

    pokemon = cartas["supertipo"] == "Pokémon"
    tem_hp = cartas["hp"].notna()
    hp_preenchido = cartas["hp"].dropna()

    # Em Python, ~ significa "não", & significa "e", | significa "ou".
    regras = {
        # Regras da estrutura da tabela
        "10 colunas, na ordem da tabela": int(list(cartas.columns) != COLUNAS_TABELA),
        "nenhuma carta perdida na limpeza": abs(len(cartas) - total_csv),
        "id único (chave primária)": cartas["id"].duplicated().sum(),
        # Regras "not null": só hp pode ser nulo
        **{
            f"{coluna} sem nulos": cartas[coluna].isna().sum()
            for coluna in COLUNAS_TABELA
            if coluna not in COLUNAS_ACEITAM_NULO
        },
        # Regras dos tipos das colunas
        "hp é número inteiro": (hp_preenchido % 1 != 0).sum(),
        "data_lancamento é data válida": pd.to_datetime(
            cartas["data_lancamento"], format="%Y-%m-%d", errors="coerce"
        ).isna().sum(),
        # Regras CHECK, com os mesmos nomes do SQL
        "cartas_supertipo_valido": (~cartas["supertipo"].isin(SUPERTIPOS_VALIDOS)).sum(),
        "cartas_editora_valida": (~cartas["editora"].isin(EDITORAS_VALIDAS)).sum(),
        "cartas_hp_positivo": (hp_preenchido <= 0).sum(),
        "cartas_hp_so_em_pokemon": (~((pokemon & tem_hp) | (~pokemon & ~tem_hp))).sum(),
        "cartas_tipo_so_em_pokemon": (~(pokemon | (cartas["tipo"] == SEM_TIPO))).sum(),
        "cartas_especial_so_em_pokemon": (~(pokemon | ~cartas["especial"])).sum(),
    }

    falhas = []
    for regra, problemas in regras.items():
        situacao = "OK" if problemas == 0 else f"FALHOU ({problemas})"
        print(f"{regra:<36} {situacao}")
        if problemas != 0:
            falhas.append(regra)
    return falhas


# ==================================
# 5. Preparação para envio
# ==================================

def preparar_registros(cartas):
    """Transforma a tabela em uma lista de dicionários, o formato do envio.

    O envio é feito em JSON, que não aceita NaN (o nulo do pandas). Por isso
    convertemos cada valor: HP nulo vira None, que chega ao banco como null.
    """
    registros = []
    for carta in cartas.to_dict("records"):
        carta["hp"] = None if pd.isna(carta["hp"]) else int(carta["hp"])
        carta["especial"] = bool(carta["especial"])
        registros.append(carta)

    # allow_nan=False faz o Python dar erro se sobrar algum NaN. Assim, uma
    # falha de conversão aparece aqui, e não no meio da carga.
    json.dumps(registros, allow_nan=False)
    return registros


# ==================================
# 6. Conexão com o Supabase
# ==================================

def conectar():
    """Cria o cliente do Supabase usando a chave secreta do arquivo .env."""
    load_dotenv(CAMINHO_ENV)
    url = os.getenv("SUPABASE_URL")
    chave = os.getenv("SUPABASE_SECRET_KEY")

    if not url or not chave:
        print("ERRO: preencha SUPABASE_URL e SUPABASE_SECRET_KEY no arquivo .env.")
        sys.exit(1)

    # A chave pública só tem permissão de leitura, então a carga falharia.
    if chave.startswith("sb_publishable_"):
        print("ERRO: esta é a chave pública. A carga precisa da chave secreta.")
        sys.exit(1)

    # A importação fica aqui, e não no topo, para a simulação funcionar mesmo
    # sem a biblioteca supabase instalada.
    from supabase import create_client

    return create_client(url, chave)


# ==================================
# 7. Envio em lotes
# ==================================

def enviar_em_lotes(cliente, registros):
    """Envia os registros com upsert, de TAMANHO_LOTE em TAMANHO_LOTE."""
    titulo("7. ENVIO PARA O SUPABASE")

    enviados = 0
    # range com passo: 0, 500, 1000... Cada volta pega a fatia de um lote.
    for inicio in range(0, len(registros), TAMANHO_LOTE):
        lote = registros[inicio:inicio + TAMANHO_LOTE]

        # on_conflict="id": se o id já existe, atualiza em vez de duplicar.
        try:
            cliente.table(NOME_TABELA).upsert(lote, on_conflict="id").execute()
        except Exception as erro:
            # Parar é seguro: o upsert permite rodar tudo de novo depois.
            print(f"ERRO no lote que começa na carta {inicio}: {erro}")
            print("Corrija o problema e rode de novo: o upsert não duplica nada.")
            sys.exit(1)

        enviados += len(lote)
        print(f"Enviadas {enviados} de {len(registros)} cartas")


# ==================================
# 8. Contagem no banco
# ==================================

def contar_no_banco(cliente):
    """Pergunta ao banco quantas cartas existem: é a evidência da entrega."""
    resposta = (
        cliente.table(NOME_TABELA)
        .select("id", count="exact")  # pede a contagem total da tabela
        .limit(1)                     # só o total importa, não as linhas
        .execute()
    )
    return resposta.count


# ==================================
# Fluxo principal
# ==================================
# A ordem é proposital: limpar, validar e só depois conectar. Assim, nenhum
# dado sai da máquina antes de todas as regras passarem.

def main():
    # argparse cria a opção --simular na linha de comando.
    parser = argparse.ArgumentParser(description="Limpa o CSV e carrega no Supabase.")
    parser.add_argument(
        "--simular",
        action="store_true",
        help="faz limpeza e validação, mas não se conecta ao banco nem envia nada",
    )
    argumentos = parser.parse_args()

    original = ler_csv()
    cartas = limpar(original)
    imprimir_resumo(original, cartas)

    falhas = validar(cartas, len(original))
    if falhas:
        print(f"\nCARGA CANCELADA: {len(falhas)} regra(s) falharam. Nada foi enviado.")
        sys.exit(1)
    print("\nTodas as regras passaram.")

    titulo("5. PREPARAÇÃO PARA ENVIO")
    registros = preparar_registros(cartas)
    total_lotes = (len(registros) + TAMANHO_LOTE - 1) // TAMANHO_LOTE
    print(f"Registros prontos: {len(registros)} em {total_lotes} lotes de até {TAMANHO_LOTE}")
    print("Primeiro registro:")
    print(json.dumps(registros[0], ensure_ascii=False, indent=2))

    if argumentos.simular:
        titulo("SIMULAÇÃO CONCLUÍDA")
        print("Nada foi enviado e nenhuma conexão com o banco foi feita.")
        return

    titulo("6. CONEXÃO COM O SUPABASE")
    cliente = conectar()
    print("Cliente criado.")

    enviar_em_lotes(cliente, registros)

    # A contagem vem do banco, não do script: comprova o que foi gravado.
    titulo("8. CONTAGEM FINAL NO BANCO")
    total_banco = contar_no_banco(cliente)
    print(f"Cartas no CSV:   {len(original)}")
    print(f"Cartas no banco: {total_banco}")

    if total_banco != len(original):
        print("ATENÇÃO: os totais são diferentes. Investigue antes de seguir.")
        sys.exit(1)
    print("Totais iguais: carga concluída.")


# Só executa quando o arquivo é rodado diretamente. Isso permite testar as
# funções importando este arquivo, sem disparar uma carga.
if __name__ == "__main__":
    main()
