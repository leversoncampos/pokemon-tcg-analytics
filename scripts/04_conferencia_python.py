"""
==================================
Conferência da tela (parte 2 de 2): cálculo independente em Python
==================================
Lê o JSON salvo por 04_conferencia_tela.mjs (o que o dashboard mostrou em 13
combinações de filtros) e refaz as contas com pandas, a partir do CSV limpo
pelas mesmas funções da carga (02_limpeza_e_carga.py). Cada valor da tela é
comparado com o valor calculado aqui e o resumo diz quantos bateram.

Não usa chave nem banco: só o CSV em dados/.

Uso:  python scripts/04_conferencia_python.py [tela.json]
      (sem argumento, lê o arquivo padrão que a parte 1 grava na pasta temporária)
"""

import contextlib
import importlib.util
import io
import json
import math
import re
import sys
import tempfile
from pathlib import Path

PASTA_PROJETO = Path(__file__).resolve().parent.parent
ARQUIVO_PADRAO = Path(tempfile.gettempdir()) / "conferencia-tela.json"

# Faixas "raras" do dashboard: Holo ou acima (mesma lista de FAIXAS_RARIDADE em web/script.js).
RARAS = {
    "Rare Secret", "Rare Rainbow", "Hyper Rare", "Illustration Rare", "Special Illustration Rare",
    "Rare Ultra", "Ultra Rare", "Double Rare", "Rare Holo EX", "Rare Holo GX", "Rare Holo V",
    "Rare Holo VMAX", "Rare Holo VSTAR", "Rare Holo LV.X", "Rare Holo Star", "Rare BREAK", "Rare Prime",
    "Rare Prism Star", "Rare ACE", "Rare Shining", "Rare Shiny", "Rare Shiny GX", "LEGEND", "Radiant Rare",
    "Amazing Rare", "Classic Collection", "Trainer Gallery Rare Holo", "Rare Holo",
}
ERAS = [("1999–2006", 1999, 2006), ("2007–2016", 2007, 2016), ("2017–2023", 2017, 2023)]
MINIMO_POKEMON_COLECAO = 50
TOTAL_NO_BANCO = 17172


# ==================================
# 1. Cartas limpas, pelas mesmas funções da carga
# ==================================
# O nome do script começa com número, então ele é carregado pelo caminho.

def carregar_cartas():
    especificacao = importlib.util.spec_from_file_location(
        "carga", PASTA_PROJETO / "scripts" / "02_limpeza_e_carga.py")
    carga = importlib.util.module_from_spec(especificacao)
    especificacao.loader.exec_module(carga)

    # A limpeza imprime um relatório; aqui ele não interessa.
    with contextlib.redirect_stdout(io.StringIO()):
        cartas = carga.limpar(carga.ler_csv())

    cartas["ano"] = cartas["data_lancamento"].str[:4].astype(int)
    cartas["promo"] = cartas["colecao"].str.contains("Black Star Promos")
    cartas["rara"] = cartas["raridade"].isin(RARAS)
    return cartas


# ==================================
# 2. Comparação
# ==================================

iguais = 0
divergencias = 0


def conferir(rotulo, esperado, na_tela, tolerancia=1e-6):
    """Compara um valor. Números com tolerância (a tela arredonda para 1 casa)."""
    global iguais, divergencias

    if esperado is None or na_tela is None:
        bateu = esperado is None and na_tela is None
    elif isinstance(esperado, str):
        bateu = esperado == na_tela
    else:
        bateu = math.isclose(esperado, na_tela, abs_tol=tolerancia)

    if bateu:
        iguais += 1
    else:
        divergencias += 1
        print(f"  DIVERGE {rotulo}: esperado {esperado!r}, na tela {na_tela!r}")


def numero(texto):
    """Converte o texto da tela em número: '16.072' -> 16072; '+95,8%' -> 95.8."""
    if texto in (None, "—"):
        return None
    limpo = re.sub(r"[^0-9,\-]", "", texto.replace(".", "")).replace(",", ".")
    return float(limpo)


# ==================================
# 3. Filtros e resumos (regras do CLAUDE.md, refeitas em pandas)
# ==================================

def filtrar(cartas, filtro):
    selecao = cartas[(cartas.ano >= filtro["anoInicial"]) & (cartas.ano <= filtro["anoFinal"])]

    if not filtro["promos"]:
        selecao = selecao[~selecao.promo]
    if filtro["tipo"] != "todos":
        selecao = selecao[selecao.tipo == filtro["tipo"]]

    pokemon = selecao.supertipo == "Pokémon"
    regras = {
        "todas": selecao.index == selecao.index,
        "pokemon": pokemon,
        "normais": pokemon & ~selecao.especial,
        "especiais": selecao.especial,
        "treinador": selecao.supertipo == "Treinador",
        "energia": selecao.supertipo == "Energia",
    }
    return selecao[regras[filtro["cartas"]]]


def resumir_por_ano(selecao):
    pokemons = selecao[selecao.supertipo == "Pokémon"]
    linhas = []

    for ano, grupo in pokemons.groupby("ano"):
        normais = grupo[~grupo.especial].hp
        especiais = grupo[grupo.especial].hp
        linhas.append({
            "ano": ano,
            "pct": len(especiais) / len(grupo) * 100,
            "geral": grupo.hp.mean(),
            "normais": normais.mean() if len(normais) else None,
            "especiais": especiais.mean() if len(especiais) else None,
        })

    return linhas


# ==================================
# 4. Conferir uma combinação de filtros
# ==================================

def conferir_combinacao(cartas, foto):
    filtro, textos, graficos = foto["combinacao"], foto["textos"], foto["dados"]
    selecao = filtrar(cartas, filtro)
    pokemons = selecao[selecao.supertipo == "Pokémon"]
    resumo = resumir_por_ano(selecao)

    # KPIs e contador de consistência
    conferir("KPI total", float(len(selecao)), numero(textos["kpiTotal"]))
    conferir("KPI HP médio", round(pokemons.hp.mean(), 1) if len(pokemons) else None,
             numero(textos["kpiHp"]), 0.051)
    crescimento = (resumo[-1]["geral"] / resumo[0]["geral"] - 1) * 100 if len(resumo) >= 2 else None
    conferir("KPI crescimento", None if crescimento is None else round(crescimento, 1),
             numero(textos["kpiCrescimento"]), 0.051)
    conferir("KPI % especiais", round(pokemons.especial.mean() * 100, 1) if len(pokemons) else None,
             numero(textos["kpiEspeciais"]), 0.051)
    for id_contador in ("contadorBanco", "contadorCarregadas", "contadorUnicos"):
        conferir(id_contador, float(TOTAL_NO_BANCO), numero(textos[id_contador]))

    # Gráfico 1: cartas impressas por ano
    por_ano = selecao.groupby("ano").size()
    grafico = graficos["graficoCartasPorAno"]
    if len(selecao) == 0:
        conferir("gráfico 1 vazio", None, grafico)
    else:
        conferir("gráfico 1 anos", ",".join(map(str, por_ano.index)), ",".join(grafico["labels"]))
        for ano, valor in zip(grafico["labels"], grafico["datasets"][0]["data"]):
            conferir(f"gráfico 1 {ano}", float(por_ano[int(ano)]), valor)

    # Gráfico 2: HP médio por ano, normais × especiais (anos da tendência ficam null)
    grafico = graficos["graficoHpPorAno"]
    if not resumo:
        conferir("gráfico 2 vazio", None, grafico)
    else:
        por_ano_resumo = {linha["ano"]: linha for linha in resumo}
        for indice, ano in enumerate(grafico["labels"]):
            linha = por_ano_resumo.get(int(ano))
            conferir(f"gráfico 2 normais {ano}", linha and linha["normais"], grafico["datasets"][0]["data"][indice])
            conferir(f"gráfico 2 especiais {ano}", linha and linha["especiais"], grafico["datasets"][1]["data"][indice])

    # Gráfico 7: % de especiais por ano
    grafico = graficos["graficoEspeciais"]
    if not resumo:
        conferir("gráfico 7 vazio", None, grafico)
    else:
        for linha, ano, valor in zip(resumo, grafico["labels"], grafico["datasets"][0]["data"]):
            conferir(f"gráfico 7 {ano}", linha["pct"], valor)

    # Gráfico 3: parte do ganho de HP (primeiro ano → pico) que veio das especiais
    parte = None
    if sum(1 for linha in resumo if linha["normais"] is not None and linha["especiais"] is not None) >= 2:
        primeiro = resumo[0]
        pico = max(resumo, key=lambda linha: linha["geral"])  # em empate fica o primeiro, como no JS
        ganho = pico["geral"] - primeiro["geral"]
        if (pico["ano"] > primeiro["ano"] and ganho > 0
                and primeiro["normais"] is not None and pico["normais"] is not None):
            parte = (ganho - (pico["normais"] - primeiro["normais"])) / ganho * 100
            if not 0 <= parte <= 100:
                parte = None
    grafico = graficos["graficoGanho"]
    conferir("gráfico 3 % das especiais", parte, grafico and grafico["datasets"][0]["data"][0])

    # Gráfico 4: raridade da primeira e da última era (anel de fora = era recente)
    grafico = graficos["graficoRaridade"]
    eras = [(nome, selecao[(selecao.ano >= inicio) & (selecao.ano <= fim)]) for nome, inicio, fim in ERAS]
    eras = [era for era in eras if len(era[1])]
    if not eras:
        conferir("gráfico 4 vazio", None, grafico)
    else:
        aneis = [eras[-1], eras[0]] if len(eras) >= 2 else eras
        for indice, (nome, cartas_da_era) in enumerate(aneis):
            total = len(cartas_da_era)
            partes = [
                (cartas_da_era.rara & cartas_da_era.especial).sum() / total * 100,
                (cartas_da_era.rara & ~cartas_da_era.especial).sum() / total * 100,
            ]
            partes.append(100 - partes[0] - partes[1])
            for posicao, valor in enumerate(partes):
                conferir(f"gráfico 4 {nome} parte {posicao}", valor, grafico["datasets"][indice]["data"][posicao], 1e-9)

    # Gráfico 5: top 10 coleções por HP médio (mínimo de 50 Pokémon)
    grafico = graficos["graficoColecoes"]
    colecoes = pokemons.groupby("colecao").agg(quantos=("hp", "size"), hp=("hp", "mean"))
    colecoes = colecoes[colecoes.quantos >= MINIMO_POKEMON_COLECAO].sort_values("hp", ascending=False).head(10)
    if colecoes.empty:
        conferir("gráfico 5 vazio", None, grafico)
    else:
        conferir("gráfico 5 nomes", " | ".join(colecoes.index), " | ".join(grafico["labels"]))
        for (nome, linha), valor in zip(colecoes.iterrows(), grafico["datasets"][0]["data"]):
            conferir(f"gráfico 5 {nome}", linha.hp, valor)

    # Gráfico 6: radar da primeira × última era com Pokémon (valores reais)
    grafico = graficos["graficoEras"]
    comparaveis = []
    for nome, inicio, fim in ERAS:
        da_era = selecao[(selecao.ano >= inicio) & (selecao.ano <= fim)]
        pokemons_da_era = da_era[da_era.supertipo == "Pokémon"]
        if len(da_era) and len(pokemons_da_era):
            comparaveis.append((nome, [
                pokemons_da_era.hp.mean(),
                len(da_era) / da_era.ano.nunique(),
                da_era.rara.mean() * 100,
                pokemons_da_era.especial.mean() * 100,
            ]))
    if len(comparaveis) < 2:
        conferir("gráfico 6 vazio", None, grafico)
    else:
        for indice, (nome, valores) in enumerate([comparaveis[0], comparaveis[-1]]):
            for eixo, valor in enumerate(valores):
                conferir(f"gráfico 6 {nome} eixo {eixo}", valor, grafico["datasets"][indice]["reais"][eixo], 1e-9)

    return len(selecao)


# ==================================
# Execução
# ==================================

def main():
    arquivo = Path(sys.argv[1]) if len(sys.argv) > 1 else ARQUIVO_PADRAO

    if not arquivo.exists():
        print(f"Arquivo não encontrado: {arquivo}")
        print("Rode antes: node scripts/04_conferencia_tela.mjs")
        sys.exit(1)

    cartas = carregar_cartas()
    tela = json.loads(arquivo.read_text(encoding="utf-8"))

    for nome, foto in tela.items():
        total = conferir_combinacao(cartas, foto)
        print(f"[{nome}] {total} cartas conferidas")

    print(f"\n{iguais} checagens iguais, {divergencias} divergências")
    sys.exit(0 if divergencias == 0 else 1)


if __name__ == "__main__":
    main()
