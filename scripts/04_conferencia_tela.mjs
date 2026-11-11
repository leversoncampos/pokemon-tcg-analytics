// ==================================
// Conferência da tela (parte 1 de 2): o que o dashboard mostra
// ==================================
// Abre web/index.html no Google Chrome sem janela (modo headless), espera as
// 17.172 cartas chegarem do Supabase e aplica 14 combinações de filtros. Em cada
// uma, salva num JSON os textos da tela (KPIs, títulos, notas, achados) e os
// dados dos 7 gráficos. A parte 2 (04_conferencia_python.py) compara esse JSON
// com um cálculo independente em Python.
//
// Não há chave neste arquivo: a página usa a própria chave pública (somente leitura).
// Precisa de Node.js 22 ou mais novo (já traz fetch e WebSocket) e do Google Chrome.
//
// Uso:  node scripts/04_conferencia_tela.mjs [saida.json] [print.png largura ...]
// Ex.:  node scripts/04_conferencia_tela.mjs
//       node scripts/04_conferencia_tela.mjs tela.json print-1920.png 1920 print-375.png 375
// Se o Chrome estiver em outro lugar, informe o caminho na variável CHROME.

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// ==================================
// Caminhos
// ==================================

const PASTA_PROJETO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PAGINA = pathToFileURL(join(PASTA_PROJETO, "web", "index.html")).href;
const SAIDA_PADRAO = join(tmpdir(), "conferencia-tela.json");

const LOCAIS_DO_CHROME = [
    process.env.CHROME,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
];
const CHROME = LOCAIS_DO_CHROME.find((caminho) => caminho && existsSync(caminho));

const PORTA = 9333;
const TOTAL_ESPERADO = 17172;

const [saida = SAIDA_PADRAO, ...prints] = process.argv.slice(2);

// ==================================
// Combinações de filtros testadas
// ==================================
// Cobrem o padrão, as promos, as 3 eras, um período que corta eras, anos
// isolados, tipos com e sem promos e tipos com poucos dados.

const COMBINACOES = [
    { nome: "padrao", anoInicial: 1999, anoFinal: 2023, tipo: "todos", promos: false },
    { nome: "com promos", anoInicial: 1999, anoFinal: 2023, tipo: "todos", promos: true },
    { nome: "era 1999-2006", anoInicial: 1999, anoFinal: 2006, tipo: "todos", promos: false },
    { nome: "era 2007-2016", anoInicial: 2007, anoFinal: 2016, tipo: "todos", promos: false },
    { nome: "era 2017-2023", anoInicial: 2017, anoFinal: 2023, tipo: "todos", promos: false },
    { nome: "2005-2018 (corta eras)", anoInicial: 2005, anoFinal: 2018, tipo: "todos", promos: false },
    { nome: "2016-2017", anoInicial: 2016, anoFinal: 2017, tipo: "todos", promos: true },
    { nome: "so 2005", anoInicial: 2005, anoFinal: 2005, tipo: "todos", promos: false },
    { nome: "so 2023", anoInicial: 2023, anoFinal: 2023, tipo: "todos", promos: true },
    { nome: "fogo", anoInicial: 1999, anoFinal: 2023, tipo: "Fire", promos: false },
    { nome: "fogo com promos", anoInicial: 1999, anoFinal: 2023, tipo: "Fire", promos: true },
    { nome: "agua 2010-2015 promos", anoInicial: 2010, anoFinal: 2015, tipo: "Water", promos: true },
    { nome: "dragao 2012-2023", anoInicial: 2012, anoFinal: 2023, tipo: "Dragon", promos: false },
    { nome: "fada", anoInicial: 1999, anoFinal: 2023, tipo: "Fairy", promos: false },
];

// ==================================
// Código que roda DENTRO da página
// ==================================
// Preenche os filtros, chama aplicarFiltros() (a mesma função dos cliques) e
// devolve o que ficou na tela.

const FOTOGRAFAR_TELA = `(combinacao) => {
    filtroAnoInicial.value = combinacao.anoInicial;
    filtroAnoFinal.value = combinacao.anoFinal;
    filtroTipo.value = combinacao.tipo;
    filtroPromos.checked = combinacao.promos;
    aplicarFiltros();

    const texto = (id) => {
        const elemento = document.getElementById(id);
        if (!elemento) return null;
        // Texto escondido na tela não conta como mostrado.
        if (elemento.closest("[hidden]")) return "(oculto)";
        return elemento.textContent.replace(/\\s+/g, " ").trim();
    };
    const ids = ["kpiTotal", "kpiHp", "kpiCrescimento", "notaCrescimento", "kpiEspeciais", "resumoFiltro",
        "titulo1", "titulo2", "titulo3", "titulo4", "titulo5", "titulo6", "titulo7",
        "notaTotal", "notaGanho", "subtitulo2", "subtitulo5", "notaEras", "listaAchados", "tituloRoscaInicial", "tituloRoscaRecente",
        "contadorBanco", "contadorCarregadas", "contadorUnicos", "limiteData"];
    const textos = Object.fromEntries(ids.map((id) => [id, texto(id)]));

    const graficos = { graficoCartasPorAno, graficoHpPorAno, graficoGanho, graficoRaridade, graficoRaridadeRecente,
        graficoColecoes, graficoEras, graficoEspeciais };
    const dados = Object.fromEntries(Object.entries(graficos).map(([nome, grafico]) => [nome, grafico ? {
        labels: grafico.data.labels.map((rotulo) => Array.isArray(rotulo) ? rotulo.join(" ") : String(rotulo)),
        datasets: grafico.data.datasets.map((conjunto) => ({
            label: conjunto.label,
            data: conjunto.data.map((valor) => valor == null ? null : Number(valor)),
            reais: conjunto.reais || null,
            pctEspeciais: conjunto.pctEspeciais || null,
        })),
    } : null]));

    return JSON.stringify({ textos, dados });
}`;

// ==================================
// Conversa com o Chrome (protocolo de depuração)
// ==================================

const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

if (!CHROME) {
    console.error("Chrome não encontrado. Informe o caminho na variável CHROME.");
    process.exit(1);
}

const chrome = spawn(CHROME, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--window-size=1920,1080",
    `--remote-debugging-port=${PORTA}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "conferencia-"))}`,
    "about:blank",
]);

let aba;
for (let tentativa = 0; tentativa < 50 && !aba; tentativa++) {
    await esperar(200);
    try {
        const abas = await (await fetch(`http://127.0.0.1:${PORTA}/json/list`)).json();
        aba = abas.find((item) => item.type === "page");
    } catch {
        // O Chrome ainda está abrindo.
    }
}

const conexao = new WebSocket(aba.webSocketDebuggerUrl);
await new Promise((resolver) => conexao.addEventListener("open", resolver));

let proximoId = 1;
const pendentes = new Map();
let errosNaPagina = 0;

conexao.addEventListener("message", (mensagem) => {
    const resposta = JSON.parse(mensagem.data);

    if (pendentes.has(resposta.id)) {
        pendentes.get(resposta.id)(resposta);
        pendentes.delete(resposta.id);
    }

    // Qualquer erro de JavaScript na página aparece aqui.
    if (resposta.method === "Runtime.exceptionThrown") {
        errosNaPagina++;
        console.log("ERRO NA PÁGINA:", resposta.params.exceptionDetails.text);
    }
});

function comando(metodo, parametros = {}) {
    return new Promise((resolver) => {
        const id = proximoId++;
        pendentes.set(id, resolver);
        conexao.send(JSON.stringify({ id, method: metodo, params: parametros }));
    });
}

async function avaliar(expressao) {
    const resposta = await comando("Runtime.evaluate", { expression: expressao, returnByValue: true, awaitPromise: true });

    if (resposta.result.exceptionDetails) {
        throw new Error(JSON.stringify(resposta.result.exceptionDetails));
    }

    return resposta.result.result.value;
}

// ==================================
// Abrir o dashboard e esperar os dados
// ==================================

await comando("Page.enable");
await comando("Runtime.enable");
await comando("Page.navigate", { url: PAGINA });

let carregou = false;
for (let tentativa = 0; tentativa < 150 && !carregou; tentativa++) {
    await esperar(400);
    carregou = await avaliar(
        `typeof todasAsCartas !== "undefined" && todasAsCartas.length === ${TOTAL_ESPERADO} && !!graficoHpPorAno`
    ).catch(() => false);
}

if (!carregou) {
    console.error("O dashboard não terminou de carregar as cartas. Confira a internet e o Supabase.");
    chrome.kill();
    process.exit(1);
}

await esperar(1500);

// ==================================
// Aplicar cada combinação e guardar a tela
// ==================================

const resultado = {};

for (const combinacao of COMBINACOES) {
    const tela = JSON.parse(await avaliar(`(${FOTOGRAFAR_TELA})(${JSON.stringify(combinacao)})`));
    resultado[combinacao.nome] = { combinacao, ...tela };
}

await avaliar("limparFiltros()");
writeFileSync(saida, JSON.stringify(resultado, null, 1));
console.log(`${COMBINACOES.length} combinações salvas em ${saida}`);

// ==================================
// Prints opcionais (pares: arquivo, largura)
// ==================================
// Também confere se a página rola para o lado (scrollWidth maior que a largura).

for (let indice = 0; indice < prints.length; indice += 2) {
    const largura = Number(prints[indice + 1]);
    const celular = largura < 800;

    await comando("Emulation.setDeviceMetricsOverride", { width: largura, height: 1000, deviceScaleFactor: 1, mobile: celular });
    await esperar(1200);

    const altura = await avaliar("document.documentElement.scrollHeight");
    const larguraDaPagina = await avaliar("document.documentElement.scrollWidth");

    await comando("Emulation.setDeviceMetricsOverride", { width: largura, height: altura, deviceScaleFactor: 1, mobile: celular });
    await esperar(1500);

    const foto = await comando("Page.captureScreenshot", { format: "png" });
    writeFileSync(prints[indice], Buffer.from(foto.result.data, "base64"));

    const rolagem = larguraDaPagina > largura ? "COM rolagem lateral" : "sem rolagem lateral";
    console.log(`Print ${largura}px: ${prints[indice]} (${rolagem})`);
}

console.log(errosNaPagina === 0 ? "Nenhum erro de JavaScript na página." : `${errosNaPagina} erro(s) na página.`);

conexao.close();
chrome.kill();
process.exit(errosNaPagina === 0 ? 0 : 1);
