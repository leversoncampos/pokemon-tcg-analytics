// ==================================
// Varredura de TODOS os filtros: procura tela quebrada
// ==================================
// Abre web/index.html no Chrome sem janela, espera as 17.172 cartas e aplica
// todas as combinações de filtros: cada par De/Até (325 períodos) × cada tipo
// (12 opções) × promos ligadas/desligadas = 7.800 combinações. Em cada uma, confere:
//   - nenhum texto com NaN, Infinity, undefined ou null;
//   - gráfico vazio sempre com título descritivo (nunca a conclusão de outro filtro);
//   - anos citados nos títulos 1 e 6 dentro do período escolhido.
// Antes, testa a troca rápida de filtros durante a animação e a rolagem lateral
// em 375, 768, 1366 e 1920 px. Complementa 04_conferencia_* (que confere os números).
//
// Não há chave neste arquivo: a página usa a própria chave pública (somente leitura).
// Uso:  node scripts/05_varredura_filtros.mjs
// Se o Chrome estiver em outro lugar, informe o caminho na variável CHROME.

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// ==================================
// Caminhos e Chrome
// ==================================

const PASTA_PROJETO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PAGINA = pathToFileURL(join(PASTA_PROJETO, "web", "index.html")).href;
const CHROME = [
    process.env.CHROME,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
].find((caminho) => caminho && existsSync(caminho));
const PORTA = 9336;
const TOTAL_ESPERADO = 17172;

if (!CHROME) {
    console.error("Chrome não encontrado. Informe o caminho na variável CHROME.");
    process.exit(1);
}

const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

const chrome = spawn(CHROME, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--window-size=1920,1080",
    `--remote-debugging-port=${PORTA}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "varredura-"))}`,
    "about:blank",
]);

let aba;
for (let tentativa = 0; tentativa < 50 && !aba; tentativa++) {
    await esperar(200);
    try {
        aba = (await (await fetch(`http://127.0.0.1:${PORTA}/json/list`)).json()).find((item) => item.type === "page");
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
let problemas = 0;

// ==================================
// 1. Troca rápida de filtros durante a animação
// ==================================
// Depois que a animação termina, cada ponto desenhado tem de estar na altura do seu valor.

const trocaRapida = JSON.parse(await avaliar(`(async () => {
    const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
    const aplicar = (ai, af, tipo, p) => {
        filtroAnoInicial.value = ai; filtroAnoFinal.value = af; filtroTipo.value = tipo; filtroPromos.checked = p;
        aplicarFiltros();
    };
    aplicar(1999, 2006, "todos", false); await pausa(60);
    aplicar(2017, 2023, "Fire", true); await pausa(40);
    aplicar(2005, 2005, "todos", false); await pausa(30);
    aplicar(2010, 2015, "todos", false);
    await pausa(1200);
    const fora = [];
    Object.values(Chart.instances).forEach((g) => {
        if (!["line", "bar"].includes(g.config.type)) return;
        const eixo = g.options.indexAxis === "y" ? g.scales.x : g.scales.y;
        const empilhado = eixo.options.stacked;
        g.data.datasets.forEach((d, i) => g.getDatasetMeta(i).data.forEach((el, j) => {
            const v = d.data[j];
            if (v == null || (v.x !== undefined)) return;
            // Barra flutuante [início, fim]: o topo é o fim. Empilhada: o topo é a soma até aqui.
            let alvo = Array.isArray(v) ? v[1] : v;
            if (empilhado) {
                alvo = g.data.datasets.slice(0, i + 1).reduce((soma, outro) => soma + (outro.data[j] || 0), 0);
            }
            const atual = g.options.indexAxis === "y" ? el.x : el.y;
            if (Math.abs(eixo.getPixelForValue(alvo) - atual) > 1) fora.push(g.canvas.id + " série " + i + " ponto " + j);
        }));
    });
    limparFiltros();
    return JSON.stringify(fora);
})()`));
problemas += trocaRapida.length;
console.log(`1. Troca rápida de filtros: ${trocaRapida.length} ponto(s) fora do lugar.`);

// ==================================
// 2. Rolagem lateral em 4 larguras, com filtros variados
// ==================================

for (const largura of [375, 768, 1366, 1920]) {
    await comando("Emulation.setDeviceMetricsOverride", { width: largura, height: 900, deviceScaleFactor: 1, mobile: largura < 800 });
    await esperar(600);
    const larguras = await avaliar(`(async () => {
        const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
        const r = [];
        for (const [ai, af, tipo, p] of [[1999, 2023, "todos", false], [2005, 2005, "Dragon", true],
            [1999, 2023, "Fire", true], [2017, 2023, "todos", false], [2011, 2011, "Fairy", false]]) {
            filtroAnoInicial.value = ai; filtroAnoFinal.value = af; filtroTipo.value = tipo; filtroPromos.checked = p;
            aplicarFiltros(); await pausa(700);
            r.push(document.documentElement.scrollWidth);
        }
        limparFiltros(); await pausa(600);
        return r;
    })()`);
    const rolam = larguras.filter((valor) => valor > largura).length;
    problemas += rolam;
    console.log(`2. ${largura}px: ${rolam === 0 ? "sem rolagem lateral" : `rolagem lateral em ${rolam} filtro(s)`}`);
}

// ==================================
// 3. Interações: cada uma tem de mudar os filtros e recalcular KPIs e gráficos juntos
// ==================================
// "confere(nome, condição)" guarda o resultado de cada teste.

const interacoes = JSON.parse(await avaliar(`(async () => {
    const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
    const testes = [];
    const confere = (nome, ok) => testes.push({ nome, ok: !!ok });
    // O KPI 1 tem de mostrar o total das cartas que passam nos filtros do momento.
    const kpiBate = () => kpiTotal.textContent === formatarNumero(obterCartasDoPainel().length);

    // Etiquetas: uma por filtro ativo; o × remove só aquele filtro.
    limparFiltros(); await pausa(50);
    confere("etiquetas: nenhuma sem filtros", listaEtiquetas.children.length === 0);
    filtroAnoInicial.value = 2017; filtroAnoFinal.value = 2023; filtroTipo.value = "Fire"; filtroPromos.checked = true;
    aplicarFiltros(); await pausa(50);
    confere("etiquetas: 3 com período, tipo e promos", listaEtiquetas.children.length === 3);
    [...listaEtiquetas.children].find((b) => b.textContent.startsWith("Tipo")).click(); await pausa(50);
    confere("etiquetas: × do tipo volta o tipo para Todos", filtroTipo.value === "todos" && filtroAnoInicial.value === "2017" && filtroPromos.checked);
    confere("etiquetas: KPI recalculado depois do ×", kpiBate());
    [...listaEtiquetas.children].forEach(() => listaEtiquetas.children[0].click());
    confere("etiquetas: removendo todas, volta ao padrão", listaEtiquetas.children.length === 0 && filtroAnoInicial.value === String(anoMinimo) && !filtroPromos.checked);

    // Endereço (#): os filtros escrevem o #, e um # novo aplica a visão.
    filtroAnoInicial.value = 2007; filtroAnoFinal.value = 2016; filtroTipo.value = "Water";
    aplicarFiltros(); await pausa(50);
    confere("endereço: filtros escrevem o #", location.hash === "#de=2007&ate=2016&tipo=Water");
    location.hash = "#de=2017&ate=2023&promos=1"; await pausa(200);
    confere("endereço: # novo aplica a visão", filtroAnoInicial.value === "2017" && filtroTipo.value === "todos" && filtroPromos.checked);
    confere("endereço: KPI recalculado pelo #", kpiBate());
    // Valores inválidos são ignorados; o tipo com HTML não vira elemento na página.
    location.hash = "#de=abc&ate=1800&tipo=" + encodeURIComponent("<img src=x id=invasor>") + "&promos=7"; await pausa(200);
    confere("endereço: valores inválidos ignorados",
        filtroAnoInicial.value === String(anoMinimo) && filtroAnoFinal.value === String(anoMaximo) && filtroTipo.value === "todos" && !filtroPromos.checked);
    confere("endereço: nada do # entra como HTML", document.getElementById("invasor") === null);
    location.hash = "#de=2020&ate=2010"; await pausa(200);
    confere("endereço: período invertido corrigido", filtroAnoInicial.value === "2020" && filtroAnoFinal.value === "2020");
    limparFiltros(); await pausa(50);
    confere("endereço: sem filtros, sem #", location.hash === "");

    // Painel da coleção: um clique de verdade na 1ª barra do ranking e na 1ª bolha.
    const clicar = (grafico, indice) => {
        const elemento = grafico.getDatasetMeta(0).data[indice];
        const caixa = grafico.canvas.getBoundingClientRect();
        grafico.canvas.dispatchEvent(new MouseEvent("click", {
            clientX: caixa.left + elemento.x, clientY: caixa.top + elemento.y, bubbles: true,
        }));
    };
    const valorDoPainel = (rotulo) => [...painelColecaoDados.children]
        .find((linha) => linha.querySelector("dt").textContent === rotulo).querySelector("dd").textContent;

    clicar(graficoColecoes, 0); await pausa(100);
    confere("painel: clique no ranking abre a coleção certa",
        painelColecao.open && painelColecaoNome.textContent === graficoColecoes.data.labels[0]);
    confere("painel: HP médio igual ao da barra",
        valorDoPainel("HP médio") === formatarDecimal(graficoColecoes.data.datasets[0].data[0]) + " HP");
    painelColecao.close();

    clicar(graficoBolhas, 0); await pausa(100);
    const primeiraBolha = graficoBolhas.data.datasets[0];
    confere("painel: clique na bolha abre a coleção certa", painelColecao.open && painelColecaoNome.textContent === primeiraBolha.nomes[0]);
    confere("painel: % de especiais igual ao da bolha", valorDoPainel("Especiais") === formatarPercentual(primeiraBolha.pctEspeciais[0]));
    confere("painel: não muda os filtros", location.hash === "" && filtroTipo.value === "todos");
    painelColecao.close();

    // Clique na era: coluna das barras 100% (gráfico 4) e coluna de um ano (gráfico 1).
    const clicarNoConjunto = (grafico, conjunto, indice) => {
        const elemento = grafico.getDatasetMeta(conjunto).data[indice];
        const caixa = grafico.canvas.getBoundingClientRect();
        const meio = elemento.base !== undefined ? (elemento.y + elemento.base) / 2 : elemento.y;
        grafico.canvas.dispatchEvent(new MouseEvent("click", {
            clientX: caixa.left + elemento.x, clientY: caixa.top + meio, bubbles: true,
        }));
    };
    const eraMarcada = () => document.querySelector(".pilula.ativa").dataset.era;

    limparFiltros(); await pausa(50);
    clicarNoConjunto(graficoRaridade, 2, 0); await pausa(100);
    confere("era: clique na 1ª coluna das barras 100% põe 1999–2006",
        filtroAnoInicial.value === "1999" && filtroAnoFinal.value === "2006" && eraMarcada() === "0");
    confere("era: KPI recalculado pelo clique", kpiBate());
    limparFiltros(); await pausa(50);
    clicarNoConjunto(graficoCartasPorAno, 0, graficoCartasPorAno.data.labels.indexOf("2017")); await pausa(100);
    confere("era: clique na coluna de 2017 do gráfico 1 põe 2017–2023",
        filtroAnoInicial.value === "2017" && filtroAnoFinal.value === "2023" && eraMarcada() === "2");
    confere("era: endereço acompanha o clique", location.hash === "#de=2017");

    limparFiltros();
    return JSON.stringify(testes);
})()`));

// Um link com filtros, aberto do zero, já chega filtrado.
await avaliar(`history.replaceState(null, "", "#de=2017&ate=2023&tipo=Fire&promos=1")`);
await comando("Page.reload");
let recarregou = false;
for (let tentativa = 0; tentativa < 150 && !recarregou; tentativa++) {
    await esperar(400);
    recarregou = await avaliar(`typeof todasAsCartas !== "undefined" && todasAsCartas.length === ${TOTAL_ESPERADO} && !!graficoHpPorAno`).catch(() => false);
}
await esperar(800);
interacoes.push({
    nome: "endereço: link aberto do zero chega filtrado",
    ok: await avaliar(`filtroAnoInicial.value === "2017" && filtroTipo.value === "Fire" && filtroPromos.checked
        && kpiTotal.textContent === formatarNumero(obterCartasDoPainel().length)`),
});
await avaliar(`limparFiltros()`);

const falhas = interacoes.filter((teste) => !teste.ok);
problemas += falhas.length;
console.log(`3. Interações: ${interacoes.length - falhas.length} de ${interacoes.length} testes passaram.`);
falhas.forEach((teste) => console.log("   - falhou: " + teste.nome));

// ==================================
// 4. Todas as combinações de filtros (animação desligada, para ir rápido)
// ==================================

const varredura = JSON.parse(await avaliar(`(() => {
    Chart.defaults.animation = false;
    const tipos = [...filtroTipo.options].map((o) => o.value);
    const descritivos = ["Cartas impressas por ano", "HP médio por ano: normais × especiais", "De onde veio o ganho de HP",
        "Raras por era", "Coleções com maior HP médio", "HP médio × % de especiais por coleção",
        "% de Pokémon especiais por ano"];
    const telas = { graficoCartasPorAno: 1, graficoHpPorAno: 2, graficoGanho: 3, graficoRaridade: 4, graficoColecoes: 5, graficoBolhas: 6, graficoEspeciais: 7 };
    const textoDe = (el) => (el && !el.closest("[hidden]") ? el.textContent.replace(/\\s+/g, " ").trim() : "");
    const quebrados = [], titulosVelhos = [], anosFora = [];
    let combinacoes = 0;

    for (let ai = 1999; ai <= 2023; ai++) for (let af = ai; af <= 2023; af++) for (const tipo of tipos) for (const promos of [false, true]) {
        filtroAnoInicial.value = ai; filtroAnoFinal.value = af; filtroTipo.value = tipo; filtroPromos.checked = promos;
        aplicarFiltros();
        combinacoes++;
        const filtro = ai + "-" + af + " | " + tipo + " | promos " + promos;

        // Todo o texto da página dentro do painel (KPIs, títulos, notas, achados)
        const texto = textoDe(document.querySelector(".conteudo"));
        const ruim = texto.match(/NaN|Infinity|undefined|null|\\[object/);
        if (ruim) quebrados.push(filtro + " :: " + ruim[0]);

        // Gráfico vazio => título descritivo
        for (const [canvas, n] of Object.entries(telas)) {
            const mensagem = document.getElementById(canvas).parentElement.querySelector(".vazio-grafico");
            const titulo = textoDe(document.getElementById("titulo" + n)).replace(" · amostra pequena", "");
            if (mensagem && !mensagem.hidden && !descritivos.includes(titulo)) {
                titulosVelhos.push(filtro + " :: gráfico " + n + " vazio com o título: " + titulo);
            }
        }

        // Anos citados nos títulos 1 e 6 (exceto o conjunto 1999–2023 de referência do radar)
        for (const id of ["titulo1", "titulo6"]) {
            const titulo = textoDe(document.getElementById(id)).replace(/conjunto \\d{4}–\\d{4}/, "");
            (titulo.match(/(19|20)\\d\\d/g) || []).forEach((ano) => {
                if (+ano < ai || +ano > af) anosFora.push(filtro + " :: " + id + ": " + titulo);
            });
        }
    }

    limparFiltros();
    return JSON.stringify({ combinacoes, quebrados, titulosVelhos, anosFora });
})()`));

problemas += varredura.quebrados.length + varredura.titulosVelhos.length + varredura.anosFora.length;
console.log(`4. ${varredura.combinacoes} combinações de filtros:`);
console.log(`   textos quebrados (NaN, Infinity, undefined, null): ${varredura.quebrados.length}`);
console.log(`   gráfico vazio com título de conclusão: ${varredura.titulosVelhos.length}`);
console.log(`   anos fora do período nos títulos 1 e 6: ${varredura.anosFora.length}`);
[...varredura.quebrados, ...varredura.titulosVelhos, ...varredura.anosFora].slice(0, 10).forEach((linha) => console.log("   - " + linha));

console.log(`Erros de JavaScript na página: ${errosNaPagina}`);
problemas += errosNaPagina;
console.log(problemas === 0 ? "\nNenhum problema encontrado." : `\n${problemas} problema(s) encontrado(s).`);

conexao.close();
chrome.kill();
process.exit(problemas === 0 ? 0 : 1);
