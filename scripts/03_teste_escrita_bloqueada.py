# ==================================
# TESTE DE SEGURANÇA - A CHAVE PÚBLICA NÃO ESCREVE
# ==================================
# A chave pública fica visível no navegador, então qualquer pessoa pode copiá-la.
# Este script usa essa mesma chave e tenta alterar a tabela, como faria alguém
# mal-intencionado. O resultado esperado é o banco recusar cada tentativa.
#
# Os testes não põem as cartas reais em risco:
#   - o insert usa uma carta falsa, com todos os campos válidos, para que uma
#     recusa venha da permissão, e não de uma regra CHECK;
#   - o update e o delete miram um id que não existe.
#
# Como rodar (a partir da pasta do projeto):
#     python scripts/03_teste_escrita_bloqueada.py

import re
import sys
from pathlib import Path

from postgrest.exceptions import APIError
from supabase import create_client

# ==================================
# Configurações
# ==================================

sys.stdout.reconfigure(encoding="utf-8")

PASTA_PROJETO = Path(__file__).resolve().parent.parent
CAMINHO_SCRIPT_WEB = PASTA_PROJETO / "web" / "script.js"

NOME_TABELA = "cartas"
ID_DE_TESTE = "teste-seguranca-nao-existe"

# Código do Postgres para "permissão negada" (insufficient_privilege).
CODIGO_PERMISSAO_NEGADA = "42501"

CARTA_FALSA = {
    "id": ID_DE_TESTE,
    "nome": "Teste de segurança",
    "supertipo": "Pokémon",
    "tipo": "Fire",
    "hp": 10,
    "raridade": "Common",
    "colecao": "Teste",
    "editora": "TPCI",
    "data_lancamento": "2023-01-01",
    "especial": False,
}


# ==================================
# Funções auxiliares
# ==================================

def ler_configuracao_do_dashboard():
    """Lê a URL e a chave do próprio dashboard: é a chave que está exposta.

    Usar exatamente o que o navegador usa torna o teste realista. Os valores
    não são impressos.
    """
    texto = CAMINHO_SCRIPT_WEB.read_text(encoding="utf-8")
    url = re.search(r'const SUPABASE_URL = "([^"]+)"', texto).group(1)
    chave = re.search(r'const SUPABASE_KEY = "([^"]+)"', texto).group(1)

    # Com a chave secreta, o teste não provaria nada sobre a chave pública.
    if not chave.startswith("sb_publishable_"):
        print("ERRO: web/script.js não está com uma chave sb_publishable_.")
        sys.exit(1)

    return url, chave


def contar_cartas(cliente):
    """Conta as cartas no banco. A chave pública pode ler."""
    resposta = cliente.table(NOME_TABELA).select("id", count="exact").limit(1).execute()
    return resposta.count


def tentar(descricao, consulta):
    """Executa uma tentativa de escrita e diz se o banco a recusou.

    Devolve True quando a escrita foi bloqueada, que é o resultado esperado.
    """
    try:
        consulta.execute()
    except APIError as erro:
        bloqueada = erro.code == CODIGO_PERMISSAO_NEGADA
        situacao = "BLOQUEADO" if bloqueada else "ERRO INESPERADO"
        print(f"{descricao:<10} {situacao}")
        print(f"           código {erro.code}: {erro.message}")
        return bloqueada

    # Sem erro, o comando foi aceito: é uma falha de segurança.
    print(f"{descricao:<10} ACEITO (falha de segurança)")
    return False


# ==================================
# Execução
# ==================================

def main():
    url, chave = ler_configuracao_do_dashboard()
    cliente = create_client(url, chave)

    total_antes = contar_cartas(cliente)
    print(f"Cartas antes do teste:  {total_antes}")
    print()

    tabela = cliente.table(NOME_TABELA)
    resultados = [
        tentar("INSERT", tabela.insert(CARTA_FALSA)),
        tentar("UPDATE", tabela.update({"nome": "Alterada"}).eq("id", ID_DE_TESTE)),
        tentar("DELETE", tabela.delete().eq("id", ID_DE_TESTE)),
    ]

    # A contagem final confirma que a tabela continua igual.
    total_depois = contar_cartas(cliente)
    print()
    print(f"Cartas depois do teste: {total_depois}")

    if all(resultados) and total_depois == total_antes:
        print("RESULTADO: a chave pública lê, mas não escreve.")
    else:
        print("RESULTADO: FALHOU. Revise as permissões em scripts/criar_tabela.sql.")
        sys.exit(1)


if __name__ == "__main__":
    main()
