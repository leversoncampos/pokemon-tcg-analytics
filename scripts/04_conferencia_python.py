"""
==================================
Conferência da tela (parte 2 de 2): cálculo independente em Python
==================================
Lê o JSON salvo por 04_conferencia_tela.mjs (o que o dashboard mostrou em 14
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
import numpy as np
import pandas as pd
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
MINIMO_POKEMON_COLECAO_COM_TIPO = 20
AMOSTRA_MINIMA = 30
AVISO_AMOSTRA_PEQUENA = " · amostra pequena"
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
    texto = texto.replace("−", "-")  # o painel usa o sinal de menos tipográfico
    limpo = re.sub(r"[^0-9,\-]", "", texto.replace(".", "")).replace(",", ".")
    return float(limpo)


# ==================================
# Textos dos títulos, escritos do mesmo jeito que o painel escreve
# ==================================

def arredondar(valor):
    """Math.round do JavaScript: 0,5 sobe (o round do Python arredonda para o par)."""
    return math.floor(valor + 0.5)


def decimal_br(valor):
    """61.74 -> '61,7' (1 casa, como o formatarDecimal do painel)."""
    return f"{arredondar(valor * 10) / 10:.1f}".replace(".", ",").replace("-", "−")


def inteiro_br(valor):
    """1059 -> '1.059'."""
    return f"{valor:,}".replace(",", ".")


def descrever_variacao(razao, singular=False):
    percentual = arredondar(abs(razao - 1) * 100)
    if razao >= 2:
        return "mais que dobrou" if singular else "mais que dobraram"
    if razao >= 1.02:
        return f"subiu {percentual}%" if singular else f"subiram {percentual}%"
    if razao <= 0.98:
        return f"caiu {percentual}%" if singular else f"caíram {percentual}%"
    return "ficou estável" if singular else "ficaram estáveis"


def nomear_anos(cartas):
    inicio, fim = cartas.ano.min(), cartas.ano.max()
    return str(inicio) if inicio == fim else f"{inicio}–{fim}"


def separar_por_era(selecao):
    eras = [selecao[(selecao.ano >= inicio) & (selecao.ano <= fim)] for _, inicio, fim in ERAS]
    return [(nomear_anos(cartas), cartas) for cartas in eras if len(cartas)]


# ==================================
# 3. Filtros e resumos (regras do CLAUDE.md, refeitas em pandas)
# ==================================

def filtrar(cartas, filtro):
    selecao = cartas[(cartas.ano >= filtro["anoInicial"]) & (cartas.ano <= filtro["anoFinal"])]

    if not filtro["promos"]:
        selecao = selecao[~selecao.promo]
    if filtro["tipo"] != "todos":
        selecao = selecao[selecao.tipo == filtro["tipo"]]

    return selecao


def resumir_por_ano(selecao):
    pokemons = selecao[selecao.supertipo == "Pokémon"]
    linhas = []

    for ano, grupo in pokemons.groupby("ano"):
        normais = grupo[~grupo.especial].hp
        especiais = grupo[grupo.especial].hp
        linhas.append({
            "ano": ano,
            "pokemons": len(grupo),
            "qtd_normais": len(normais),
            "qtd_especiais": len(especiais),
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

    # Título 1: média de cartas por ano da primeira e da última era do filtro
    eras_com_cartas = separar_por_era(selecao)
    if len(selecao) == 0 or len(eras_com_cartas) < 2:
        titulo = "Cartas impressas por ano"
    elif any(len(cartas) < AMOSTRA_MINIMA for _, cartas in (eras_com_cartas[0], eras_com_cartas[-1])):
        titulo = "Cartas impressas por ano" + AVISO_AMOSTRA_PEQUENA
    else:
        (nome_i, inicial), (nome_f, final) = eras_com_cartas[0], eras_com_cartas[-1]
        antes = len(inicial) / inicial.ano.nunique()
        depois = len(final) / final.ano.nunique()
        titulo = (f"A média de cartas impressas por ano {descrever_variacao(depois / antes, True)}: "
                  f"{inteiro_br(arredondar(antes))} ({nome_i}) → {inteiro_br(arredondar(depois))} ({nome_f})")
    conferir("título 1", titulo, textos["titulo1"])

    # Título 2: normais e especiais no mesmo período (anos com 30+ cartas em cada série)
    tem_normais = any(linha["qtd_normais"] > 0 for linha in resumo)
    tem_especiais = any(linha["qtd_especiais"] > 0 for linha in resumo)
    validos = [linha for linha in resumo
               if (not tem_normais or linha["qtd_normais"] >= AMOSTRA_MINIMA)
               and (not tem_especiais or linha["qtd_especiais"] >= AMOSTRA_MINIMA)]
    if not resumo:
        titulo = "HP médio por ano: normais × especiais"
    elif len(validos) < 2:
        titulo = "HP médio por ano: normais × especiais" + (AVISO_AMOSTRA_PEQUENA if len(resumo) >= 2 else "")
    else:
        primeiro, ultimo = validos[0], validos[-1]
        if tem_normais and tem_especiais:
            titulo = (f"As especiais {descrever_variacao(ultimo['especiais'] / primeiro['especiais'])} de HP; "
                      f"as normais {descrever_variacao(ultimo['normais'] / primeiro['normais'])}")
        elif tem_normais:
            titulo = f"O HP das normais {descrever_variacao(ultimo['normais'] / primeiro['normais'], True)}"
        else:
            titulo = f"O HP das especiais {descrever_variacao(ultimo['especiais'] / primeiro['especiais'], True)}"
    conferir("título 2", titulo, textos["titulo2"])

    # Gráfico 1: cartas impressas por ano
    por_ano = selecao.groupby("ano").size()
    grafico = graficos["graficoCartasPorAno"]
    if len(selecao) == 0:
        conferir("gráfico 1 vazio", None, grafico)
    else:
        conferir("gráfico 1 anos", ",".join(map(str, por_ano.index)), ",".join(grafico["labels"]))
        for ano, valor in zip(grafico["labels"], grafico["datasets"][0]["data"]):
            conferir(f"gráfico 1 {ano}", float(por_ano[int(ano)]), valor)

        # Linha em degrau: cada ano carrega a média de cartas por ano da sua era
        media_da_era = {}
        for _, inicio, fim in ERAS:
            da_era = selecao[(selecao.ano >= inicio) & (selecao.ano <= fim)]
            if len(da_era):
                for ano in range(inicio, fim + 1):
                    media_da_era[ano] = len(da_era) / da_era.ano.nunique()
        for ano, valor in zip(grafico["labels"], grafico["datasets"][1]["data"]):
            conferir(f"gráfico 1 média da era {ano}", media_da_era[int(ano)], valor)

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

    # Gráfico 3: cascata — HP do 1º ano, + normais, + especiais, HP do último ano
    grafico = graficos["graficoGanho"]
    titulo = "De onde veio o ganho de HP"
    # Mesma ordem do painel: menos de 2 anos → amostra pequena → faltam normais.
    if len(resumo) < 2:
        conferir("gráfico 3 vazio", None, grafico)
    elif resumo[0]["pokemons"] < AMOSTRA_MINIMA or resumo[-1]["pokemons"] < AMOSTRA_MINIMA:
        conferir("gráfico 3 vazio", None, grafico)
        titulo += AVISO_AMOSTRA_PEQUENA
    elif resumo[0]["normais"] is None or resumo[-1]["normais"] is None:
        conferir("gráfico 3 vazio", None, grafico)
    else:
        primeiro, ultimo = resumo[0], resumo[-1]
        total = ultimo["geral"] - primeiro["geral"]
        normais = ultimo["normais"] - primeiro["normais"]
        especiais = total - normais
        esperado = [[0, primeiro["geral"]], [primeiro["geral"], primeiro["geral"] + normais],
                    [primeiro["geral"] + normais, primeiro["geral"] + normais + especiais], [0, ultimo["geral"]]]
        for indice, (inicio, fim) in enumerate(esperado):
            conferir(f"gráfico 3 barra {indice} início", inicio, grafico["datasets"][0]["data"][indice][0])
            conferir(f"gráfico 3 barra {indice} fim", fim, grafico["datasets"][0]["data"][indice][1])
        if total > 0 and normais >= 0 and especiais >= 0:
            titulo = (f"Dos {decimal_br(total)} HP ganhos de {primeiro['ano']} a {ultimo['ano']}, "
                      f"{decimal_br(especiais)} ({arredondar(especiais / total * 100)}%) vieram das especiais")
        else:
            titulo = f"HP médio de {primeiro['ano']} a {ultimo['ano']}: o que mudou nas normais e nas especiais"
    conferir("título 3", titulo, textos["titulo3"])

    # Gráfico 4: barras 100% empilhadas, uma coluna por era com cartas, 3 faixas
    eras = [(nome, selecao[(selecao.ano >= inicio) & (selecao.ano <= fim)]) for nome, inicio, fim in ERAS]
    eras = [era for era in eras if len(era[1])]
    grafico = graficos["graficoRaridade"]
    if not eras:
        conferir("gráfico 4 vazio", None, grafico)
    else:
        conferir("gráfico 4 colunas", float(len(eras)), float(len(grafico["labels"])))
        for coluna, (nome, cartas_da_era) in enumerate(eras):
            total = len(cartas_da_era)
            partes = [
                (cartas_da_era.rara & cartas_da_era.especial).sum() / total * 100,
                (cartas_da_era.rara & ~cartas_da_era.especial).sum() / total * 100,
            ]
            partes.append(100 - partes[0] - partes[1])
            for faixa, valor in enumerate(partes):
                conferir(f"gráfico 4 {nome} faixa {faixa}", valor, grafico["datasets"][faixa]["data"][coluna], 1e-9)

    # Gráfico 5: top 10 coleções por HP médio (mínimo de 50 Pokémon)
    grafico = graficos["graficoColecoes"]
    colecoes = pokemons.groupby("colecao").agg(quantos=("hp", "size"), hp=("hp", "mean"),
                                                pct_especiais=("especial", "mean"))
    minimo = MINIMO_POKEMON_COLECAO if filtro["tipo"] == "todos" else MINIMO_POKEMON_COLECAO_COM_TIPO
    colecoes = colecoes[colecoes.quantos >= minimo].sort_values("hp", ascending=False).head(10)
    if colecoes.empty:
        conferir("gráfico 5 vazio", None, grafico)
    else:
        conferir("gráfico 5 nomes", " | ".join(colecoes.index), " | ".join(grafico["labels"]))
        for (nome, linha), valor in zip(colecoes.iterrows(), grafico["datasets"][0]["data"]):
            conferir(f"gráfico 5 {nome}", linha.hp, valor)
        # Selo laranja: % de especiais de cada coleção (dado novo do ranking)
        for (nome, linha), valor in zip(colecoes.iterrows(), grafico["datasets"][0]["pctEspeciais"]):
            conferir(f"gráfico 5 {nome} % especiais", linha.pct_especiais * 100, valor)

    # Gráfico 6: bolhas — uma por coleção com o mínimo de Pokémon do ranking
    grafico = graficos["graficoBolhas"]
    bolhas = pokemons.groupby("colecao").agg(quantidade=("hp", "size"), hp=("hp", "mean"),
                                             pct=("especial", "mean"), data=("data_lancamento", "min"))
    bolhas = bolhas[bolhas.quantidade >= minimo].copy()
    if bolhas.empty:
        conferir("gráfico 6 vazio", None, grafico)
    else:
        datas = pd.to_datetime(bolhas.data)
        bolhas["x"] = datas.dt.year + (datas - pd.to_datetime(datas.dt.year.astype(str) + "-01-01")).dt.days / 365
        bolhas = bolhas.sort_values("x", kind="stable")
        serie = grafico["datasets"][0]
        conferir("gráfico 6 coleções", " | ".join(sorted(bolhas.index)), " | ".join(sorted(serie["nomes"])))
        por_nome = {nome: indice for indice, nome in enumerate(serie["nomes"])}
        for nome, linha in bolhas.iterrows():
            i = por_nome.get(nome)
            if i is None:
                continue
            conferir(f"gráfico 6 {nome} x", float(linha.x), serie["data"][i]["x"], 1e-9)
            conferir(f"gráfico 6 {nome} HP", float(linha.hp), serie["data"][i]["y"], 1e-9)
            conferir(f"gráfico 6 {nome} Pokémon", float(linha.quantidade), float(serie["quantidades"][i]))
            conferir(f"gráfico 6 {nome} % especiais", float(linha.pct * 100), serie["pctEspeciais"][i], 1e-9)

        # Correlação (r) da nota e título
        r = None
        if len(bolhas) >= 10:
            r = float(np.corrcoef(bolhas.pct * 100, bolhas.hp)[0, 1])
            achado = re.search(r"r = (−?[0-9]+,[0-9]+)", textos["notaBolhas"] or "")
            conferir("gráfico 6 r da nota", round(r, 2), achado and float(achado.group(1).replace(",", ".").replace("−", "-")), 0.0051)
        if r is None:
            titulo = "HP médio × % de especiais por coleção" + AVISO_AMOSTRA_PEQUENA
        elif r >= 0.5:
            por_era = []
            for _, inicio, fim in ERAS:
                da_era = bolhas[(bolhas.x.astype(int) >= inicio) & (bolhas.x.astype(int) <= fim)]
                if len(da_era) >= 10:
                    por_era.append(float(np.corrcoef(da_era.pct * 100, da_era.hp)[0, 1]))
            em_cada_era = len(por_era) >= 2 and all(valor >= 0.5 for valor in por_era)
            titulo = "Coleções com mais especiais têm HP médio maior" + (", mesmo dentro de cada era" if em_cada_era else "")
        else:
            titulo = "HP médio × % de especiais por coleção"
        conferir("título 6", titulo, textos["titulo6"])

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
