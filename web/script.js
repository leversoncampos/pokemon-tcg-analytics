// ===================================
// Conexão com o Supabase
// ===================================
// Aqui entra só a chave PÚBLICA. Ela pode ficar visível no navegador porque
// o banco só permite leitura com ela (ver scripts/03_teste_escrita_bloqueada.py).
// A chave secreta nunca vem para cá.

const SUPABASE_URL = "https://ocsmnsehzywphoyyjecd.supabase.co";

const SUPABASE_KEY = "sb_publishable_mUK_fcRHRymCqs1awExf7Q_vp2Fyx-I";

// As colunas são pedidas pelo nome, em vez de "*", para deixar claro o que o
// dashboard usa e receber só o necessário.
const COLUNAS = "id,nome,supertipo,tipo,hp,raridade,colecao,editora,data_lancamento,especial";

const TABELA = "cartas";

// A API do Supabase devolve no máximo 1.000 linhas por pedido.
const TAMANHO_BLOCO = 1000;

// ===================================
// Regras da análise
// ===================================

// As coleções de promos têm uma única data, embora saiam ao longo de anos.
// Por isso ficam fora das contas por padrão (ver README.md, problema 7).
const TEXTO_PROMOS = "Black Star Promos";

// A tendência do gráfico 2 é projetada estes anos além do último ano do
// período. Sem filtros, o período termina em 2023 e a tendência vai até 2026.
const ANOS_DE_PROJECAO = 3;

// Anos em que as mecânicas especiais chegaram, marcados no gráfico 2.
const MECANICAS = [
    { ano: 2003, rotulo: "Pokémon-ex" },
    { ano: 2012, rotulo: "EX" },
    { ano: 2017, rotulo: "GX" },
    { ano: 2020, rotulo: "V" },
    { ano: 2023, rotulo: "ex" },
];

// As 3 eras do gráfico 6 e dos atalhos do topo. Os cortes de 2007 e 2017
// coincidem com os dois degraus do HP das cartas normais encontrados na exploração.
const ERAS = [
    { nome: "1999–2006", inicio: 1999, fim: 2006 },
    { nome: "2007–2016", inicio: 2007, fim: 2016 },
    { nome: "2017–2023", inicio: 2017, fim: 2023 },
];

// Ranking de coleções: só entram coleções com Pokémon suficientes para a média valer.
const MINIMO_POKEMON_COLECAO = 50;
const TAMANHO_RANKING = 10;

// Mensagens dos gráficos que ficam sem dados com o filtro escolhido.
const MENSAGEM_SEM_CARTAS = "Nenhuma carta neste filtro.";
const MENSAGEM_SEM_POKEMON = "Nenhum Pokémon neste filtro. Este gráfico usa HP ou tipo, que só os Pokémon têm.";

// ===================================
// Tipos (para o filtro)
// ===================================

const TIPOS = [
    { chave: "Fire", nome: "Fogo" },
    { chave: "Metal", nome: "Metal" },
    { chave: "Lightning", nome: "Elétrico" },
    { chave: "Fairy", nome: "Fada" },
    { chave: "Dragon", nome: "Dragão" },
    { chave: "Water", nome: "Água" },
    { chave: "Fighting", nome: "Lutador" },
    { chave: "Darkness", nome: "Sombrio" },
    { chave: "Colorless", nome: "Incolor" },
    { chave: "Psychic", nome: "Psíquico" },
    { chave: "Grass", nome: "Grama" },
];

// ===================================
// Cores
// ===================================

const COR_TINTA = "#1c1b18";
const COR_TEXTO_SUAVE = "#5f5a4c";

// Uma cor de destaque (âmbar); o contexto fica em cinza.
const COR_ESPECIAIS = "#c28500";
const COR_ESPECIAIS_CLARO = "#e7cf94";
const COR_NORMAIS = "#8a8577";
const COR_NORMAIS_CLARO = "#d3cebf";
const COR_PAINEL = "#fffdf7";
const COR_GRADE = "rgba(28, 27, 24, 0.08)";

// ===================================
// Faixas de raridade
// ===================================
// 32 raridades em 7 faixas + "Sem raridade"; as faixas com medalha são as "raras" (Holo ou acima).

const FAIXAS_RARIDADE = [
    {
        nome: "Secreta/Ilustração",
        medalha: "ouro",
        raridades: [
            "Rare Secret", "Rare Rainbow", "Hyper Rare",
            "Illustration Rare", "Special Illustration Rare",
        ],
    },
    {
        nome: "Ultra/Especial",
        medalha: "prata",
        raridades: [
            "Rare Ultra", "Ultra Rare", "Double Rare", "Rare Holo EX", "Rare Holo GX",
            "Rare Holo V", "Rare Holo VMAX", "Rare Holo VSTAR", "Rare Holo LV.X",
            "Rare Holo Star", "Rare BREAK", "Rare Prime", "Rare Prism Star", "Rare ACE",
            "Rare Shining", "Rare Shiny", "Rare Shiny GX", "LEGEND", "Radiant Rare",
            "Amazing Rare", "Classic Collection", "Trainer Gallery Rare Holo",
        ],
    },
    { nome: "Rara Holo", medalha: "bronze", raridades: ["Rare Holo"] },
    { nome: "Rara", medalha: null, raridades: ["Rare"] },
    { nome: "Incomum", medalha: null, raridades: ["Uncommon"] },
    { nome: "Comum", medalha: null, raridades: ["Common"] },
    { nome: "Promo", medalha: null, raridades: ["Promo"] },
    { nome: "Sem raridade", medalha: null, raridades: ["Sem raridade"] },
];

// ===================================
// Dados em memória
// ===================================
// O banco é consultado uma única vez. Depois, os filtros trabalham sobre este
// array, sem buscar tudo de novo a cada clique.

let todasAsCartas = [];

// Primeiro e último ano das cartas carregadas. Servem de limite para o período.
let anoMinimo = null;
let anoMaximo = null;

// ===================================
// Variáveis dos gráficos
// ===================================

let graficoHpPorAno = null;
let graficoCartasPorAno = null;
let graficoEspeciais = null;
let graficoGanho = null;
let graficoRaridade = null;
let graficoColecoes = null;
let graficoEras = null;

// ===================================
// Elementos da tela
// ===================================

const aviso = document.getElementById("aviso");
const avisoTexto = document.getElementById("avisoTexto");
const barra = document.getElementById("barra");
const barraPreenchida = document.getElementById("barraPreenchida");
const botaoTentarNovamente = document.getElementById("botaoTentarNovamente");

// Controles dos filtros
const filtroAnoInicial = document.getElementById("filtroAnoInicial");
const filtroAnoFinal = document.getElementById("filtroAnoFinal");
const filtroTipo = document.getElementById("filtroTipo");
const filtroCartas = document.getElementById("filtroCartas");
const filtroPromos = document.getElementById("filtroPromos");
const botaoLimparFiltros = document.getElementById("botaoLimparFiltros");
const pilulasDeEra = document.querySelectorAll(".pilula[data-era]");

// Gaveta de filtros do celular
const painelFiltros = document.getElementById("painelFiltros");
const botaoAbrirFiltros = document.getElementById("botaoAbrirFiltros");
const botaoFecharFiltros = document.getElementById("botaoFecharFiltros");
const fundoGaveta = document.getElementById("fundoGaveta");

// ===================================
// Formatação
// ===================================

function formatarNumero(valor) {
    return valor.toLocaleString("pt-BR");
}

function formatarDecimal(valor) {
    return valor.toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    });
}

function formatarPercentual(valor) {
    return formatarDecimal(valor) + "%";
}

// ===================================
// Títulos que dizem a conclusão
// ===================================
// O título de cada gráfico é calculado a partir dos dados, para continuar certo com os filtros.

function definirTitulo(idTitulo, texto) {
    document.getElementById(idTitulo).textContent = texto;
}

// Descreve uma razão (fim ÷ começo) em palavras, no plural ou no singular.
function descreverVariacao(razao, singular) {
    const percentual = Math.round(Math.abs(razao - 1) * 100);

    if (razao >= 2) {
        return singular ? "mais que dobrou" : "mais que dobraram";
    }

    if (razao >= 1.02) {
        return singular ? `subiu ${percentual}%` : `subiram ${percentual}%`;
    }

    if (razao <= 0.98) {
        return singular ? `caiu ${percentual}%` : `caíram ${percentual}%`;
    }

    return singular ? "ficou estável" : "ficaram estáveis";
}

// ===================================
// Funções de apoio aos cálculos
// ===================================

function obterAno(carta) {
    // Lemos o ano direto do texto "AAAA-MM-DD". Com new Date(), o fuso horário
    // poderia jogar uma carta de 1º de janeiro para o ano anterior.
    return Number(carta.data_lancamento.slice(0, 4));
}

function ehPromo(carta) {
    return carta.colecao.includes(TEXTO_PROMOS);
}

// Só Pokémon entra nas contas de HP, tipo e % de especiais.
function obterPokemons(cartas) {
    return cartas.filter((carta) => carta.supertipo === "Pokémon");
}

function calcularMedia(valores) {
    if (valores.length === 0) {
        return null;
    }

    const soma = valores.reduce((total, valor) => total + valor, 0);

    return soma / valores.length;
}

function obterFaixa(carta) {
    return FAIXAS_RARIDADE.find((faixa) => faixa.raridades.includes(carta.raridade));
}

// Cartas com medalha são as "raras" do gráfico 6.
function ehRara(carta) {
    return obterFaixa(carta).medalha !== null;
}

// ===================================
// Filtros: ler a tela
// ===================================
// Os valores escolhidos ficam nos próprios controles. Esta função os reúne em
// um objeto, para o resto do código não precisar conhecer a tela.

function lerFiltros() {
    return {
        anoInicial: Number(filtroAnoInicial.value),
        anoFinal: Number(filtroAnoFinal.value),
        tipo: filtroTipo.value,
        cartas: filtroCartas.value,
        incluirPromos: filtroPromos.checked,
    };
}

// ===================================
// Filtros: uma carta passa?
// ===================================
// Cada regra recusa a carta assim que ela não combina. Se passar por todas,
// a carta entra no painel.

function cartaPassaNosFiltros(carta, filtros) {
    const ano = obterAno(carta);

    if (!filtros.incluirPromos && ehPromo(carta)) {
        return false;
    }

    if (ano < filtros.anoInicial || ano > filtros.anoFinal) {
        return false;
    }

    if (filtros.tipo !== "todos" && carta.tipo !== filtros.tipo) {
        return false;
    }

    // Só Pokémon podem ser especiais; "normais" também exige ser Pokémon.
    const regrasDeCartas = {
        todas: () => true,
        pokemon: () => carta.supertipo === "Pokémon",
        normais: () => carta.supertipo === "Pokémon" && !carta.especial,
        especiais: () => carta.especial,
        treinador: () => carta.supertipo === "Treinador",
        energia: () => carta.supertipo === "Energia",
    };

    return regrasDeCartas[filtros.cartas]();
}

// ===================================
// Cartas consideradas no painel
// ===================================
// Todos os indicadores e gráficos recebem o que sair daqui. É o único ponto
// em que os filtros entram nas contas. O contador de consistência não passa por
// aqui: ele usa todasAsCartas, para não depender dos filtros.

function obterCartasDoPainel() {
    const filtros = lerFiltros();

    return todasAsCartas.filter((carta) => cartaPassaNosFiltros(carta, filtros));
}

// ===================================
// Filtros: montar as opções
// ===================================
// As opções saem das cartas carregadas, e não de uma lista fixa: assim só
// aparece o que existe no banco.

function adicionarOpcao(select, valor, texto) {
    const opcao = document.createElement("option");

    opcao.value = valor;
    opcao.textContent = texto;
    select.append(opcao);
}

function preencherOpcoesDosFiltros() {
    const anos = [...new Set(todasAsCartas.map(obterAno))].sort((a, b) => a - b);

    anoMinimo = anos[0];
    anoMaximo = anos[anos.length - 1];

    filtroAnoInicial.replaceChildren();
    filtroAnoFinal.replaceChildren();

    anos.forEach((ano) => {
        adicionarOpcao(filtroAnoInicial, ano, ano);
        adicionarOpcao(filtroAnoFinal, ano, ano);
    });

    // Tipos na mesma ordem e com os mesmos nomes dos gráficos.
    const tiposExistentes = new Set(todasAsCartas.map((carta) => carta.tipo));

    TIPOS
        .filter((tipo) => tiposExistentes.has(tipo.chave))
        .forEach((tipo) => adicionarOpcao(filtroTipo, tipo.chave, tipo.nome));

    definirFiltrosPadrao();
}

// ===================================
// Limitações: data da última coleção
// ===================================

function preencherLimitacoes() {
    const ultimaData = todasAsCartas.map((carta) => carta.data_lancamento).sort().pop();
    const [ano, mes, dia] = ultimaData.split("-");

    document.getElementById("limiteData").textContent =
        `${ano} vai só até ${dia}/${mes}/${ano}, data da última coleção carregada.`;
}

// ===================================
// Filtros: valores padrão
// ===================================

function definirFiltrosPadrao() {
    filtroAnoInicial.value = anoMinimo;
    filtroAnoFinal.value = anoMaximo;
    filtroTipo.value = "todos";
    filtroCartas.value = "todas";
    filtroPromos.checked = false;
}

// Conta quantos filtros estão diferentes do padrão. O período conta como um.
function contarFiltrosAtivos() {
    const filtros = lerFiltros();

    const ativos = [
        filtros.anoInicial !== anoMinimo || filtros.anoFinal !== anoMaximo,
        filtros.tipo !== "todos",
        filtros.cartas !== "todas",
        filtros.incluirPromos,
    ];

    return ativos.filter(Boolean).length;
}

// ===================================
// Filtros: reagir às mudanças
// ===================================

function aoMudarAnoInicial() {
    // Um período ao contrário (de 2020 até 2010) não existe: ajustamos o outro ano.
    if (Number(filtroAnoInicial.value) > Number(filtroAnoFinal.value)) {
        filtroAnoFinal.value = filtroAnoInicial.value;
    }

    aplicarFiltros();
}

function aoMudarAnoFinal() {
    if (Number(filtroAnoFinal.value) < Number(filtroAnoInicial.value)) {
        filtroAnoInicial.value = filtroAnoFinal.value;
    }

    aplicarFiltros();
}

function aoClicarEra(evento) {
    const era = evento.currentTarget.dataset.era;

    if (era === "todas") {
        filtroAnoInicial.value = anoMinimo;
        filtroAnoFinal.value = anoMaximo;
    } else {
        filtroAnoInicial.value = ERAS[Number(era)].inicio;
        filtroAnoFinal.value = ERAS[Number(era)].fim;
    }

    aplicarFiltros();
}

function limparFiltros() {
    definirFiltrosPadrao();
    aplicarFiltros();
}

// Recalcula tudo. Chamada por qualquer mudança de filtro.
function aplicarFiltros() {
    atualizarPilulasDeEra();
    atualizarPainel();
}

// ===================================
// Filtros: atalhos por era
// ===================================
// A pílula fica escura quando o período escolhido é exatamente aquela era.
// Se o período for outro, nenhuma fica marcada.

function atualizarPilulasDeEra() {
    const { anoInicial, anoFinal } = lerFiltros();

    pilulasDeEra.forEach((pilula) => {
        const era = pilula.dataset.era;

        const ativa = era === "todas"
            ? anoInicial === anoMinimo && anoFinal === anoMaximo
            : anoInicial === ERAS[Number(era)].inicio && anoFinal === ERAS[Number(era)].fim;

        pilula.classList.toggle("ativa", ativa);
        pilula.setAttribute("aria-pressed", ativa);
    });
}

// ===================================
// Filtros: resumo do filtro atual
// ===================================

function atualizarResumoDoFiltro(cartas) {
    const texto = `${formatarNumero(cartas.length)} de ${formatarNumero(todasAsCartas.length)} cartas`;

    document.getElementById("resumoFiltro").textContent = texto;

    // Sem nenhuma carta, aparece a mensagem com o botão de limpar.
    document.getElementById("semResultado").hidden = cartas.length > 0;

    // No celular, o botão do topo mostra quantos filtros estão ligados.
    const ativos = contarFiltrosAtivos();
    document.getElementById("contagemFiltros").textContent = ativos > 0 ? `(${ativos})` : "";
}

// ===================================
// Filtros: ativar os controles
// ===================================
// Os controles começam desligados no HTML e só são ligados quando os dados
// chegam. Assim ninguém filtra um array ainda vazio.

function ativarFiltros() {
    const controles = [
        filtroAnoInicial, filtroAnoFinal, filtroTipo, filtroCartas,
        filtroPromos, botaoLimparFiltros, botaoAbrirFiltros,
    ];

    controles.forEach((controle) => {
        controle.disabled = false;
    });

    pilulasDeEra.forEach((pilula) => {
        pilula.disabled = false;
        pilula.addEventListener("click", aoClicarEra);
    });

    filtroAnoInicial.addEventListener("change", aoMudarAnoInicial);
    filtroAnoFinal.addEventListener("change", aoMudarAnoFinal);

    [filtroTipo, filtroCartas, filtroPromos].forEach((controle) => {
        controle.addEventListener("change", aplicarFiltros);
    });

    botaoLimparFiltros.addEventListener("click", limparFiltros);
    document.getElementById("botaoLimparSemResultado").addEventListener("click", limparFiltros);
}

// ===================================
// Gaveta de filtros no celular
// ===================================
// Em telas estreitas, o painel de filtros vira uma gaveta que sobe da parte de
// baixo. O CSS cuida da aparência; aqui só ligamos e desligamos a classe.

function abrirGaveta() {
    painelFiltros.classList.add("aberta");
    fundoGaveta.hidden = false;
    botaoAbrirFiltros.setAttribute("aria-expanded", "true");
    document.body.classList.add("gaveta-aberta");

    // O foco vai para o primeiro filtro, para quem navega pelo teclado.
    filtroAnoInicial.focus();
}

function fecharGaveta() {
    if (!painelFiltros.classList.contains("aberta")) {
        return;
    }

    painelFiltros.classList.remove("aberta");
    fundoGaveta.hidden = true;
    botaoAbrirFiltros.setAttribute("aria-expanded", "false");
    document.body.classList.remove("gaveta-aberta");

    // O foco volta para o botão que abriu a gaveta.
    botaoAbrirFiltros.focus();
}

botaoAbrirFiltros.addEventListener("click", abrirGaveta);
botaoFecharFiltros.addEventListener("click", fecharGaveta);
fundoGaveta.addEventListener("click", fecharGaveta);

document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") {
        fecharGaveta();
    }
});

// Se a tela ficar larga com a gaveta aberta (celular girado), ela fecha.
window.matchMedia("(min-width: 1101px)").addEventListener("change", (consulta) => {
    if (consulta.matches) {
        fecharGaveta();
    }
});

// ===================================
// Gráficos sem dados
// ===================================
// Quando um filtro deixa um gráfico sem dados, ele é destruído e uma mensagem
// ocupa o lugar. Um gráfico vazio ou com valores sem sentido confundiria.

function mostrarMensagemNoGrafico(idCanvas, mensagem) {
    const canvas = document.getElementById(idCanvas);
    const area = canvas.parentElement;

    // O parágrafo da mensagem é criado na primeira vez e reaproveitado depois.
    let paragrafo = area.querySelector(".vazio-grafico");

    if (!paragrafo) {
        paragrafo = document.createElement("p");
        paragrafo.className = "vazio-grafico";
        area.append(paragrafo);
    }

    paragrafo.textContent = mensagem;
    paragrafo.hidden = false;
    canvas.hidden = true;
}

function esconderMensagemDoGrafico(idCanvas) {
    const canvas = document.getElementById(idCanvas);
    const paragrafo = canvas.parentElement.querySelector(".vazio-grafico");

    if (paragrafo) {
        paragrafo.hidden = true;
    }

    canvas.hidden = false;
}

// Destrói o gráfico anterior, mostra a mensagem e devolve null para a variável.
function esvaziarGrafico(grafico, idCanvas, mensagem) {
    if (grafico) {
        grafico.destroy();
    }

    mostrarMensagemNoGrafico(idCanvas, mensagem);

    return null;
}

// Sem cartas é um caso; com cartas mas sem Pokémon é outro, e a mensagem muda.
function mensagemDeVazio(cartas) {
    return cartas.length === 0 ? MENSAGEM_SEM_CARTAS : MENSAGEM_SEM_POKEMON;
}

// ===================================
// Resumo por ano
// ===================================
// KPI 3, gráficos 2 e 7 e os achados usam os mesmos números por ano. Calcular
// em um só lugar garante que eles nunca discordem entre si.

function resumirPorAno(cartas) {
    const anos = {};

    obterPokemons(cartas).forEach((carta) => {
        const ano = obterAno(carta);

        if (!anos[ano]) {
            anos[ano] = { normais: [], especiais: [] };
        }

        if (carta.especial) {
            anos[ano].especiais.push(carta.hp);
        } else {
            anos[ano].normais.push(carta.hp);
        }
    });

    return Object.keys(anos)
        .map(Number)
        .sort((a, b) => a - b)
        .map((ano) => {
            const { normais, especiais } = anos[ano];
            const todos = [...normais, ...especiais];

            return {
                ano: ano,
                pokemons: todos.length,
                especiais: especiais.length,
                pctEspeciais: (especiais.length / todos.length) * 100,
                hpGeral: calcularMedia(todos),
                hpNormais: calcularMedia(normais),
                hpEspeciais: calcularMedia(especiais),
            };
        });
}

// ===================================
// Regressão linear simples
// ===================================
// Encontra a reta y = a + b·x que passa mais perto dos pontos:
// b = soma de (x - média de x)(y - média de y) / soma de (x - média de x)²
// a = média de y - b · média de x

function calcularRegressao(pontos) {
    const mediaX = calcularMedia(pontos.map((ponto) => ponto.x));
    const mediaY = calcularMedia(pontos.map((ponto) => ponto.y));

    let numerador = 0;
    let denominador = 0;

    pontos.forEach((ponto) => {
        numerador += (ponto.x - mediaX) * (ponto.y - mediaY);
        denominador += (ponto.x - mediaX) ** 2;
    });

    const b = numerador / denominador;
    const a = mediaY - b * mediaX;

    return { a, b };
}

// ===================================
// Calcular os indicadores
// ===================================

function calcularIndicadores(data) {
    const pokemons = obterPokemons(data);
    const resumo = resumirPorAno(data);

    // KPI 1: total de cartas, comparado ao total carregado
    document.getElementById("kpiTotal").textContent = formatarNumero(data.length);

    // KPI 2: HP médio (só existe se houver Pokémon no filtro)
    const hpMedio = calcularMedia(pokemons.map((carta) => carta.hp));

    document.getElementById("kpiHp").textContent =
        hpMedio === null ? "—" : formatarDecimal(hpMedio);

    // KPI 3: crescimento do HP médio entre o primeiro e o último ano.
    // Com um ano só, não há o que comparar.
    const kpiCrescimento = document.getElementById("kpiCrescimento");
    const notaCrescimento = document.getElementById("notaCrescimento");
    const selo = document.getElementById("seloCrescimento");

    if (resumo.length < 2) {
        // A nota diz o motivo: falta Pokémon, ou o período tem um ano só.
        kpiCrescimento.textContent = "—";
        notaCrescimento.textContent = pokemons.length === 0
            ? "sem Pokémon neste filtro"
            : "precisa de 2 anos ou mais";
        selo.hidden = true;
    } else {
        const primeiroAno = resumo[0];
        const ultimoAno = resumo[resumo.length - 1];
        const crescimento = (ultimoAno.hpGeral / primeiroAno.hpGeral - 1) * 100;
        const sinal = crescimento >= 0 ? "+" : "";

        kpiCrescimento.textContent = sinal + formatarPercentual(crescimento);
        notaCrescimento.textContent = `${Math.round(primeiroAno.hpGeral)} → ${Math.round(ultimoAno.hpGeral)} HP ` +
            `(${primeiroAno.ano}–${ultimoAno.ano})`;

        selo.hidden = false;
        selo.textContent = crescimento >= 0 ? "▲ Cresceu" : "▼ Caiu";
        selo.className = crescimento >= 0 ? "selo selo-sobe" : "selo selo-desce";
    }

    // Medidor: % de cartas especiais entre os Pokémon
    const medidor = document.getElementById("medidorValor");

    if (pokemons.length === 0) {
        document.getElementById("kpiEspeciais").textContent = "—";
        medidor.classList.add("vazio");
    } else {
        const especiais = pokemons.filter((carta) => carta.especial).length;
        const pctEspeciais = (especiais / pokemons.length) * 100;

        document.getElementById("kpiEspeciais").textContent = formatarPercentual(pctEspeciais);

        // Com pathLength="100" no arco, o primeiro número é o percentual preenchido.
        medidor.classList.toggle("vazio", especiais === 0);
        medidor.style.strokeDasharray = `${pctEspeciais} 100`;
    }
}

// ===================================
// 1 - Cartas lançadas por ano
// ===================================

function criarGraficoCartasPorAno(data) {
    if (data.length === 0) {
        graficoCartasPorAno = esvaziarGrafico(graficoCartasPorAno, "graficoCartasPorAno", MENSAGEM_SEM_CARTAS);
        return;
    }

    esconderMensagemDoGrafico("graficoCartasPorAno");

    const anos = {};

    // Agrupar cartas por ano
    data.forEach((carta) => {
        const ano = obterAno(carta);

        if (!anos[ano]) {
            anos[ano] = 0;
        }

        anos[ano]++;
    });

    const nomes = Object.keys(anos);
    const valores = Object.values(anos);

    // Título: média por ano antes e a partir da era recente.
    const inicioRecente = ERAS[ERAS.length - 1].inicio;
    const antes = calcularMedia(nomes.filter((ano) => ano < inicioRecente).map((ano) => anos[ano]));
    const depois = calcularMedia(nomes.filter((ano) => ano >= inicioRecente).map((ano) => anos[ano]));

    definirTitulo("titulo1", antes !== null && depois !== null
        ? `Desde ${inicioRecente}, a média de cartas impressas por ano ${descreverVariacao(depois / antes, true)} ` +
          `(${formatarNumero(Math.round(antes))} → ${formatarNumero(Math.round(depois))})`
        : "Cartas impressas por ano");

    // A pílula destaca o maior valor. Um número em cada ponto viraria ruído.
    const indiceMaior = valores.indexOf(Math.max(...valores));

    // Destruir gráfico anterior
    if (graficoCartasPorAno) {
        graficoCartasPorAno.destroy();
    }

    const canvas = document.getElementById("graficoCartasPorAno");

    // Criar gráfico
    graficoCartasPorAno = new Chart(canvas, {
        type: "line",
        data: {
            labels: nomes,
            datasets: [
                {
                    label: "Cartas",
                    data: valores,
                    borderColor: COR_NORMAIS,
                    backgroundColor: COR_ESPECIAIS,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    tension: 0.25,
                    // Trecho cinza até 2016 e âmbar na era recente.
                    segment: {
                        borderColor: (trecho) =>
                            Number(nomes[trecho.p1DataIndex]) >= inicioRecente ? COR_ESPECIAIS : COR_NORMAIS,
                    },
                },
            ],
        },
        options: {
            layout: { padding: { top: 28 } },
            interaction: { mode: "index", intersect: false },
            plugins: {
                legend: { display: false },
                pilulas: {
                    itens: [
                        {
                            serie: 0,
                            indice: indiceMaior,
                            texto: `${nomes[indiceMaior]}: ${formatarNumero(valores[indiceMaior])}`,
                        },
                    ],
                },
                tooltip: {
                    callbacks: {
                        label: (contexto) => `${formatarNumero(contexto.raw)} cartas`,
                    },
                },
            },
            scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true, grid: { color: COR_GRADE } },
            },
        },
    });
}

// ===================================
// 2 - HP médio por ano + tendência
// ===================================

function montarTendencia(anos, resumo, campo) {
    // A reta é calculada só com os anos que têm dados nessa série.
    const pontos = resumo
        .filter((item) => item[campo] !== null)
        .map((item) => ({ x: item.ano, y: item[campo] }));

    // Com menos de 2 pontos não existe reta: a série de tendência fica vazia.
    if (pontos.length < 2) {
        return anos.map(() => null);
    }

    const { a, b } = calcularRegressao(pontos);

    // Antes do primeiro ponto real fica null: a reta não inventa o passado.
    return anos.map((ano) => (ano >= pontos[0].x ? a + b * ano : null));
}

function criarGraficoHpPorAno(data) {
    const resumo = resumirPorAno(data);

    if (resumo.length === 0) {
        graficoHpPorAno = esvaziarGrafico(graficoHpPorAno, "graficoHpPorAno", mensagemDeVazio(data));
        return;
    }

    esconderMensagemDoGrafico("graficoHpPorAno");

    // Título: variação de cada série entre o primeiro e o último ano em que ela aparece.
    const variacao = (campo) => {
        const linhas = resumo.filter((item) => item[campo] !== null);

        return linhas.length >= 2 ? linhas[linhas.length - 1][campo] / linhas[0][campo] : null;
    };

    const variacaoEspeciais = variacao("hpEspeciais");
    const variacaoNormais = variacao("hpNormais");

    if (variacaoEspeciais !== null && variacaoNormais !== null) {
        definirTitulo("titulo2", `As especiais ${descreverVariacao(variacaoEspeciais)} de HP; ` +
            `as normais ${descreverVariacao(variacaoNormais)}`);
    } else if (variacaoNormais !== null) {
        definirTitulo("titulo2", `O HP das normais ${descreverVariacao(variacaoNormais, true)}`);
    } else if (variacaoEspeciais !== null) {
        definirTitulo("titulo2", `O HP das especiais ${descreverVariacao(variacaoEspeciais, true)}`);
    } else {
        definirTitulo("titulo2", "HP médio por ano: normais × especiais");
    }

    // Eixo com os anos reais e mais os anos da projeção.
    const ultimoAno = resumo[resumo.length - 1].ano;
    const anos = resumo.map((item) => item.ano);

    for (let ano = ultimoAno + 1; ano <= ultimoAno + ANOS_DE_PROJECAO; ano++) {
        anos.push(ano);
    }

    // Anos sem dados ficam null, e o Chart.js não desenha ponto neles.
    const valorDoAno = (ano, campo) => {
        const item = resumo.find((linha) => linha.ano === ano);

        return item ? item[campo] : null;
    };

    const normais = anos.map((ano) => valorDoAno(ano, "hpNormais"));
    const especiais = anos.map((ano) => valorDoAno(ano, "hpEspeciais"));

    // Mecânicas fora do período não são marcadas.
    const marcos = MECANICAS
        .filter((mecanica) => anos.includes(mecanica.ano))
        .map((mecanica) => ({ indice: anos.indexOf(mecanica.ano), rotulo: mecanica.rotulo }));

    // Rótulos diretos no último ano, no lugar da legenda.
    const indiceUltimo = anos.indexOf(ultimoAno);
    const pilulas = [["Normais", normais], ["Especiais", especiais]]
        .map(([nome, serie], indiceSerie) => ({ nome, serie: indiceSerie, valor: serie[indiceUltimo] }))
        .filter((item) => item.valor !== null)
        .map((item) => ({
            serie: item.serie,
            indice: indiceUltimo,
            texto: `${item.nome}: ${Math.round(item.valor)} HP`,
        }));

    const tendenciaNormais = montarTendencia(anos, resumo, "hpNormais");
    const tendenciaEspeciais = montarTendencia(anos, resumo, "hpEspeciais");


    if (graficoHpPorAno) {
        graficoHpPorAno.destroy();
    }

    const canvas = document.getElementById("graficoHpPorAno");

    graficoHpPorAno = new Chart(canvas, {
        type: "line",
        data: {
            labels: anos,
            datasets: [
                {
                    label: "Normais",
                    data: normais,
                    borderColor: COR_NORMAIS,
                    backgroundColor: COR_NORMAIS,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    spanGaps: true,
                    tension: 0.2,
                },
                {
                    label: "Especiais",
                    data: especiais,
                    borderColor: COR_ESPECIAIS,
                    backgroundColor: COR_ESPECIAIS,
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    // Em 2011 não há especiais fora das promos: a linha liga 2010 a 2012.
                    spanGaps: true,
                    tension: 0.2,
                },
                {
                    label: "Tendência das normais",
                    data: tendenciaNormais,
                    borderColor: COR_NORMAIS_CLARO,
                    borderWidth: 1.5,
                    borderDash: [6, 4],
                    pointRadius: 0,
                    pointHoverRadius: 0,
                },
                {
                    label: "Tendência das especiais",
                    data: tendenciaEspeciais,
                    borderColor: COR_ESPECIAIS_CLARO,
                    borderWidth: 1.5,
                    borderDash: [6, 4],
                    pointRadius: 0,
                    pointHoverRadius: 0,
                },
            ],
        },
        options: {
            layout: { padding: { top: 26 } },
            interaction: { mode: "index", intersect: false },
            plugins: {
                legend: { display: false },
                mecanicas: { marcos: marcos },
                pilulas: { itens: pilulas },
                tooltip: {
                    callbacks: {
                        label: (contexto) =>
                            `${contexto.dataset.label}: ${formatarDecimal(contexto.raw)} HP`,
                    },
                },
            },
            scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true, grid: { color: COR_GRADE } },
            },
        },
    });
}

// ===================================
// 3 - De onde veio o ganho de HP
// ===================================

// Divide o ganho de HP entre o primeiro ano e o pico. Sem especiais, a média
// seria a das normais; o que passa disso vem das especiais.
// Devolve null quando a divisão não faz sentido no filtro.
function calcularDecomposicao(resumo) {
    const anosComAmbas = resumo.filter((item) => item.hpNormais !== null && item.hpEspeciais !== null);

    if (anosComAmbas.length < 2) {
        return null;
    }

    const primeiro = resumo[0];
    const pico = resumo.reduce((maior, item) => (item.hpGeral > maior.hpGeral ? item : maior));
    const ganhoTotal = pico.hpGeral - primeiro.hpGeral;

    if (pico.ano <= primeiro.ano || ganhoTotal <= 0 || primeiro.hpNormais === null || pico.hpNormais === null) {
        return null;
    }

    const parteEspeciais = ((ganhoTotal - (pico.hpNormais - primeiro.hpNormais)) / ganhoTotal) * 100;

    // Fora de 0–100% (normais caíram, por exemplo), uma pizza não representa a divisão.
    if (parteEspeciais < 0 || parteEspeciais > 100) {
        return null;
    }

    return { primeiro, pico, parteEspeciais };
}

function criarGraficoGanho(data) {
    const decomposicao = calcularDecomposicao(resumirPorAno(data));
    const nota = document.getElementById("notaGanho");

    if (decomposicao === null) {
        const mensagem = obterPokemons(data).length === 0
            ? mensagemDeVazio(data)
            : "Para dividir o ganho, o filtro precisa de normais e especiais em pelo menos 2 anos.";

        graficoGanho = esvaziarGrafico(graficoGanho, "graficoGanho", mensagem);
        definirTitulo("titulo3", "De onde veio o ganho de HP");
        nota.hidden = true;
        return;
    }

    esconderMensagemDoGrafico("graficoGanho");

    const { primeiro, pico, parteEspeciais } = decomposicao;

    definirTitulo("titulo3", `${Math.round(parteEspeciais)}% do ganho de HP entre ${primeiro.ano} e ` +
        `${pico.ano} veio das especiais`);

    nota.hidden = false;
    nota.textContent = `Sem as especiais, a média de ${pico.ano} seria ${formatarDecimal(pico.hpNormais)} HP, ` +
        `e não ${formatarDecimal(pico.hpGeral)}.`;

    const nomes = ["Especiais", "Normais"];
    const valores = [parteEspeciais, 100 - parteEspeciais];

    if (graficoGanho) {
        graficoGanho.destroy();
    }

    const canvas = document.getElementById("graficoGanho");

    graficoGanho = new Chart(canvas, {
        type: "pie",
        data: {
            labels: nomes,
            datasets: [
                {
                    label: "Parte do ganho",
                    data: valores,
                    backgroundColor: [COR_ESPECIAIS, COR_NORMAIS],
                    borderColor: COR_PAINEL,
                    borderWidth: 2,
                },
            ],
        },
        options: {
            plugins: {
                legend: { display: false },
                rotulosNasFatias: { ativo: true },
                tooltip: {
                    callbacks: {
                        label: (contexto) => `${contexto.label}: ${formatarPercentual(contexto.raw)} do ganho`,
                    },
                },
            },
        },
    });
}

// ===================================
// 4 - Distribuição por faixa de raridade
// ===================================

// Percentuais de uma era: raras que são especiais, outras raras e o resto.
function dividirRaridade(cartas) {
    const total = cartas.length;
    const rarasEspeciais = cartas.filter((carta) => ehRara(carta) && carta.especial).length;
    const outrasRaras = cartas.filter((carta) => ehRara(carta) && !carta.especial).length;

    return [
        (rarasEspeciais / total) * 100,
        (outrasRaras / total) * 100,
        ((total - rarasEspeciais - outrasRaras) / total) * 100,
    ];
}

function criarGraficoRaridade(data) {
    if (data.length === 0) {
        graficoRaridade = esvaziarGrafico(graficoRaridade, "graficoRaridade", MENSAGEM_SEM_CARTAS);
        preencherLegenda("legendaRaridade", []);
        document.getElementById("notaRaridade").hidden = true;
        return;
    }

    esconderMensagemDoGrafico("graficoRaridade");

    // Compara a primeira e a última era com cartas no filtro.
    const eras = ERAS
        .map((era) => ({ era: era, cartas: data.filter((carta) => {
            const ano = obterAno(carta);

            return ano >= era.inicio && ano <= era.fim;
        }) }))
        .filter((item) => item.cartas.length > 0);

    // No Chart.js, o primeiro conjunto é o anel de fora: a era recente.
    const aneis = eras.length >= 2 ? [eras[eras.length - 1], eras[0]] : eras;
    const partes = aneis.map((item) => dividirRaridade(item.cartas));
    const nomes = ["Raras especiais", "Outras raras", "Demais cartas"];
    const cores = [COR_ESPECIAIS, COR_ESPECIAIS_CLARO, COR_NORMAIS_CLARO];

    // % de raras = raras especiais + outras raras.
    const raras = partes.map((valores) => valores[0] + valores[1]);
    const recente = { raras: raras[0], especiais: partes[0][0] };

    if (aneis.length === 2) {
        const parteEspeciais = recente.raras > 0 ? (recente.especiais / recente.raras) * 100 : 0;
        const quantas = parteEspeciais >= 45 && parteEspeciais <= 55 ? "metade" : `${Math.round(parteEspeciais)}%`;

        definirTitulo("titulo4", `As raras foram de ${Math.round(raras[1])}% para ${Math.round(raras[0])}% ` +
            `das cartas, e ${quantas} delas são especiais`);
    } else {
        definirTitulo("titulo4", `Raras (Holo ou acima): ${Math.round(raras[0])}% das cartas`);
    }

    if (graficoRaridade) {
        graficoRaridade.destroy();
    }

    const canvas = document.getElementById("graficoRaridade");

    graficoRaridade = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels: nomes,
            datasets: aneis.map((item, indice) => ({
                label: item.era.nome,
                data: partes[indice],
                backgroundColor: cores,
                borderColor: COR_PAINEL,
                borderWidth: 2,
            })),
        },
        options: {
            cutout: "45%",
            plugins: {
                legend: { display: false },
                centro: {
                    valor: aneis.length === 2
                        ? `${Math.round(raras[1])}% → ${Math.round(raras[0])}%`
                        : `${Math.round(raras[0])}%`,
                    rotulo: "raras",
                },
                tooltip: {
                    callbacks: {
                        label: (contexto) =>
                            `${contexto.dataset.label} · ${contexto.label}: ${formatarPercentual(contexto.raw)}`,
                    },
                },
            },
        },
    });

    // Lista com os valores das duas eras: "inicial → recente".
    preencherLegenda("legendaRaridade", nomes.map((nome, indice) => ({
        nome: nome,
        cor: cores[indice],
        valor: aneis.length === 2
            ? `${Math.round(partes[1][indice])}% → ${Math.round(partes[0][indice])}%`
            : `${Math.round(partes[0][indice])}%`,
    })));

    const nota = document.getElementById("notaRaridade");
    nota.hidden = false;
    nota.textContent = aneis.length === 2
        ? `Anel interno: ${aneis[1].era.nome}. Anel externo: ${aneis[0].era.nome}. Raras = Holo ou acima.`
        : `Era ${aneis[0].era.nome}. Raras = Holo ou acima.`;
}

// ===================================
// 5 - Ranking das coleções mais fortes
// ===================================

// Agrupa os Pokémon por coleção e devolve as de maior HP médio.
function montarRankingColecoes(pokemons) {
    const colecoes = {};

    pokemons.forEach((carta) => {
        if (!colecoes[carta.colecao]) {
            colecoes[carta.colecao] = { nome: carta.colecao, ano: obterAno(carta), hps: [] };
        }

        colecoes[carta.colecao].hps.push(carta.hp);
    });

    return Object.values(colecoes)
        .filter((colecao) => colecao.hps.length >= MINIMO_POKEMON_COLECAO)
        .map((colecao) => ({ nome: colecao.nome, ano: colecao.ano, hp: calcularMedia(colecao.hps) }))
        .sort((a, b) => b.hp - a.hp)
        .slice(0, TAMANHO_RANKING);
}

function criarGraficoColecoes(data) {
    const pokemons = obterPokemons(data);
    const ranking = montarRankingColecoes(pokemons);

    document.getElementById("notaColecoes").textContent =
        `Só entram coleções com ${MINIMO_POKEMON_COLECAO} Pokémon ou mais no filtro.`;

    if (ranking.length === 0) {
        const mensagem = pokemons.length === 0
            ? mensagemDeVazio(data)
            : `Nenhuma coleção com ${MINIMO_POKEMON_COLECAO} Pokémon ou mais neste filtro.`;

        graficoColecoes = esvaziarGrafico(graficoColecoes, "graficoColecoes", mensagem);
        preencherRanking([]);
        definirTitulo("titulo5", "Coleções com maior HP médio");
        return;
    }

    esconderMensagemDoGrafico("graficoColecoes");

    // Título: se todas as do ranking são da era recente, essa é a conclusão.
    const inicioRecente = ERAS[ERAS.length - 1].inicio;
    const anoMaisAntigo = Math.min(...ranking.map((colecao) => colecao.ano));

    definirTitulo("titulo5", anoMaisAntigo >= inicioRecente
        ? `As ${ranking.length} coleções mais fortes são todas de ${anoMaisAntigo} em diante`
        : `As ${ranking.length} coleções com maior HP médio`);

    const nomes = ranking.map((colecao) => colecao.nome);
    const valores = ranking.map((colecao) => colecao.hp);

    // Destaque para as coleções da era recente; as demais ficam em cinza.
    const cores = ranking.map((colecao) => (colecao.ano >= inicioRecente ? COR_ESPECIAIS : COR_NORMAIS));

    if (graficoColecoes) {
        graficoColecoes.destroy();
    }

    const canvas = document.getElementById("graficoColecoes");

    graficoColecoes = new Chart(canvas, {
        type: "bar",
        data: {
            labels: nomes,
            datasets: [
                {
                    label: "HP médio",
                    data: valores,
                    backgroundColor: cores,
                    borderRadius: 4,
                },
            ],
        },
        options: {
            indexAxis: "y",
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (contexto) =>
                            `${formatarDecimal(contexto.raw)} HP · ${ranking[contexto.dataIndex].ano}`,
                    },
                },
            },
            scales: {
                x: { beginAtZero: true, grid: { color: COR_GRADE } },
                y: {
                    grid: { display: false },
                    // Nomes longos são encurtados no eixo; a lista ao lado mostra o nome inteiro.
                    ticks: {
                        callback: (_valor, indice) =>
                            nomes[indice].length > 22 ? nomes[indice].slice(0, 21) + "…" : nomes[indice],
                    },
                },
            },
        },
    });

    preencherRanking(ranking);
}

// ===================================
// Ranking das coleções
// ===================================

function preencherRanking(ranking) {
    const lista = document.getElementById("rankingColecoes");

    if (ranking.length === 0) {
        const vazio = document.createElement("li");
        vazio.className = "aguardando";
        vazio.textContent = "Sem coleções para mostrar neste filtro.";
        lista.replaceChildren(vazio);
        return;
    }

    const medalhas = ["ouro", "prata", "bronze"];

    const linhas = ranking.map((colecao, indice) => {
        const linha = document.createElement("li");

        const posicao = document.createElement("span");
        posicao.className = "ranking-posicao";
        posicao.textContent = indice + 1;

        const nome = document.createElement("span");
        nome.className = "ranking-nome";
        nome.textContent = colecao.nome;

        const ano = document.createElement("span");
        ano.className = "ranking-ano";
        ano.textContent = colecao.ano;

        const valor = document.createElement("span");
        valor.className = "pilula-valor";
        valor.textContent = `HP ${formatarDecimal(colecao.hp)}`;

        linha.append(posicao, nome);

        // Só os 3 primeiros levam medalha.
        if (medalhas[indice]) {
            linha.append(criarMedalha(medalhas[indice]));
        }

        linha.append(ano, valor);

        return linha;
    });

    lista.replaceChildren(...linhas);
}

// ===================================
// 6 - Perfil das 3 eras
// ===================================

// Resume uma era. Devolve null se a era não tiver nenhuma carta no filtro.
// HP e % de especiais ficam null se a era não tiver Pokémon.
function resumirEra(era, data) {
    const cartas = data.filter((carta) => {
        const ano = obterAno(carta);

        return ano >= era.inicio && ano <= era.fim;
    });

    if (cartas.length === 0) {
        return null;
    }

    const pokemons = obterPokemons(cartas);
    const anosComCartas = new Set(cartas.map(obterAno)).size;

    return {
        hp: calcularMedia(pokemons.map((carta) => carta.hp)),
        cartasPorAno: cartas.length / anosComCartas,
        pctRaras: (cartas.filter(ehRara).length / cartas.length) * 100,
        pctEspeciais: pokemons.length === 0
            ? null
            : (pokemons.filter((carta) => carta.especial).length / pokemons.length) * 100,
    };
}

function criarGraficoEras(data) {
    const eixos = ["HP médio", "Cartas por ano", "% raras (Holo ou acima)", "% especiais"];

    // Rótulos em linhas curtas, para caberem em telas estreitas.
    const eixosEmLinhas = [["HP médio"], ["Cartas", "por ano"], ["% raras", "(Holo ou acima)"], ["% especiais"]];

    // Só eras com Pokémon: sem eles, HP e % de especiais não existem.
    const erasComPokemon = ERAS
        .map((era) => ({ era: era, resumo: resumirEra(era, data) }))
        .filter((item) => item.resumo !== null && item.resumo.hp !== null);

    // Compara só a primeira e a última era: duas formas se leem melhor que três.
    const eras = erasComPokemon.length >= 2
        ? [erasComPokemon[0], erasComPokemon[erasComPokemon.length - 1]]
        : erasComPokemon;

    if (obterPokemons(data).length === 0) {
        graficoEras = esvaziarGrafico(graficoEras, "graficoEras", mensagemDeVazio(data));
        return;
    }

    // Um radar compara formas. Com uma era só, não há o que comparar.
    if (eras.length < 2) {
        graficoEras = esvaziarGrafico(graficoEras, "graficoEras",
            "Este gráfico compara eras, e o período escolhido cobre só uma. Amplie o período.");
        return;
    }

    esconderMensagemDoGrafico("graficoEras");

    const reais = eras.map((item) => [
        item.resumo.hp,
        item.resumo.cartasPorAno,
        item.resumo.pctRaras,
        item.resumo.pctEspeciais,
    ]);

    // Os eixos têm escalas diferentes (HP perto de 100, % perto de 20). Para
    // caberem no mesmo radar, cada valor vira uma nota de 0 a 100, em que 100 é
    // o maior valor daquele eixo entre as eras. O valor real fica no tooltip.
    const maiores = eixos.map((eixo, indice) =>
        Math.max(...reais.map((valoresDaEra) => valoresDaEra[indice]))
    );

    // Quantas vezes a era recente tem o valor da primeira, em cada eixo.
    const razoes = eixos.map((eixo, indice) => (reais[0][indice] > 0 ? reais[1][indice] / reais[0][indice] : null));
    const rotulos = eixosEmLinhas.map((linhas, indice) =>
        razoes[indice] === null ? linhas : [...linhas, `×${formatarDecimal(razoes[indice])}`]);

    definirTitulo("titulo6", razoes.every((razao) => razao !== null && razao > 1)
        ? `A era ${eras[1].era.nome} supera a de ${eras[0].era.nome} em todos os eixos`
        : `Eras ${eras[0].era.nome} × ${eras[1].era.nome}`);

    // Primeira era em cinza (contexto), última em âmbar (destaque).
    const cores = [COR_NORMAIS, COR_ESPECIAIS];

    const datasets = eras.map((item, indiceEra) => ({
        label: item.era.nome,
        // Se o maior valor de um eixo for 0 (ex.: nenhuma especial), todos ficam em 0.
        data: reais[indiceEra].map((valor, indice) =>
            maiores[indice] === 0 ? 0 : (valor / maiores[indice]) * 100
        ),
        reais: reais[indiceEra],
        borderColor: cores[indiceEra],
        backgroundColor: cores[indiceEra] + "22",
        pointBackgroundColor: cores[indiceEra],
        borderWidth: 2,
        pointRadius: 3,
    }));

    if (graficoEras) {
        graficoEras.destroy();
    }

    const canvas = document.getElementById("graficoEras");

    graficoEras = new Chart(canvas, {
        type: "radar",
        data: {
            labels: rotulos,
            datasets: datasets,
        },
        options: {
            plugins: {
                legend: { position: "bottom" },
                tooltip: {
                    callbacks: {
                        label: (contexto) => {
                            const real = contexto.dataset.reais[contexto.dataIndex];
                            const eixo = eixos[contexto.dataIndex];
                            const valor = eixo.startsWith("%")
                                ? formatarPercentual(real)
                                : formatarDecimal(real);

                            return `${contexto.dataset.label}: ${valor}`;
                        },
                    },
                },
            },
            scales: {
                r: {
                    min: 0,
                    max: 100,
                    ticks: { display: false },
                    grid: { color: COR_GRADE },
                    angleLines: { color: COR_GRADE },
                    // Fonte menor quando o gráfico é estreito (celular).
                    pointLabels: { font: (contexto) => ({ size: contexto.chart.width < 450 ? 11 : 13 }) },
                },
            },
        },
    });
}

// ===================================
// 7 - % de cartas especiais por ano
// ===================================

function criarGraficoEspeciais(data) {
    const resumo = resumirPorAno(data);

    if (resumo.length === 0) {
        graficoEspeciais = esvaziarGrafico(graficoEspeciais, "graficoEspeciais", mensagemDeVazio(data));
        return;
    }

    esconderMensagemDoGrafico("graficoEspeciais");

    const nomes = resumo.map((item) => item.ano);
    const especiais = resumo.map((item) => item.pctEspeciais);

    // Título: do primeiro ano com especiais até o pico.
    const comEspeciais = resumo.filter((item) => item.pctEspeciais > 0);
    const picoEspeciais = comEspeciais.reduce((maior, item) =>
        (maior === null || item.pctEspeciais > maior.pctEspeciais ? item : maior), null);

    definirTitulo("titulo7", comEspeciais.length >= 2 && picoEspeciais.pctEspeciais > comEspeciais[0].pctEspeciais
        ? `E ficaram mais comuns: de ${Math.round(comEspeciais[0].pctEspeciais)}% para até ` +
          `${Math.round(picoEspeciais.pctEspeciais)}% dos Pokémon`
        : "% de Pokémon especiais por ano");

    // Sem nenhuma especial no filtro, a pílula de destaque não tem o que mostrar.
    const maior = Math.max(...especiais);
    const indiceMaior = especiais.indexOf(maior);
    const pilulas = maior > 0
        ? [{ serie: 0, indice: indiceMaior, texto: `${nomes[indiceMaior]}: ${formatarPercentual(maior)}` }]
        : [];

    if (graficoEspeciais) {
        graficoEspeciais.destroy();
    }

    const canvas = document.getElementById("graficoEspeciais");

    // Eixo até a dezena acima do pico: com 100%, as diferenças sumiriam.
    const topoDoEixo = Math.min(100, Math.ceil((maior + 5) / 10) * 10);

    graficoEspeciais = new Chart(canvas, {
        type: "bar",
        data: {
            labels: nomes,
            datasets: [
                {
                    label: "Especiais",
                    data: especiais,
                    // Só o pico fica forte; os outros anos são contexto.
                    backgroundColor: especiais.map((_valor, indice) =>
                        indice === indiceMaior ? COR_ESPECIAIS : COR_ESPECIAIS_CLARO),
                    borderRadius: 2,
                },
            ],
        },
        options: {
            plugins: {
                legend: { display: false },
                pilulas: { itens: pilulas },
                tooltip: {
                    callbacks: {
                        label: (contexto) => `Especiais: ${formatarPercentual(contexto.raw)} dos Pokémon`,
                    },
                },
            },
            scales: {
                x: { grid: { display: false } },
                y: {
                    beginAtZero: true,
                    max: topoDoEixo,
                    grid: { color: COR_GRADE },
                    ticks: { callback: (valor) => `${valor}%` },
                },
            },
        },
    });
}

// ===================================
// O que os dados mostram
// ===================================
// Números calculados na hora; cada achado só aparece se o filtro tiver os dados dele.

// Cada achado é uma linha: título em negrito e o número logo depois.
function criarAchado(titulo, texto) {
    const item = document.createElement("li");

    const forte = document.createElement("strong");
    forte.textContent = titulo;

    item.append(forte, ` ${texto}`);

    return item;
}

// Compara a primeira e a última era com cartas no filtro.
function obterErasExtremas(data) {
    const eras = ERAS
        .map((era) => ({ era: era, cartas: data.filter((carta) => {
            const ano = obterAno(carta);

            return ano >= era.inicio && ano <= era.fim;
        }) }))
        .filter((item) => item.cartas.length > 0);

    return eras.length >= 2 ? [eras[0], eras[eras.length - 1]] : null;
}

function preencherAchados(data) {
    const resumo = resumirPorAno(data);
    const achados = [];

    // Hipótese 1: mesma divisão da pizza (gráfico 3). A frase oficial só vale acima de 50%.
    const decomposicao = calcularDecomposicao(resumo);

    if (decomposicao !== null) {
        const { primeiro, pico, parteEspeciais } = decomposicao;
        const periodo = `${primeiro.ano}–${pico.ano}`;

        achados.push(parteEspeciais > 50
            ? criarAchado("Especiais:", `explicam a maior parte do crescimento do HP ` +
                `(${Math.round(parteEspeciais)}%, ${periodo}), mas não todo; as normais também cresceram.`)
            : criarAchado("Normais:", `explicam ${Math.round(100 - parteEspeciais)}% do ganho de HP (${periodo}).`));
    }

    // Recuo depois do pico; a fatia de especiais só entra se o filtro tiver especiais.
    if (resumo.length >= 2) {
        const ultimo = resumo[resumo.length - 1];
        const pico = resumo.reduce((maior, item) => (item.hpGeral > maior.hpGeral ? item : maior));

        if (pico.ano < ultimo.ano && ultimo.hpGeral < pico.hpGeral) {
            const fatia = pico.pctEspeciais > 0 || ultimo.pctEspeciais > 0
                ? `, com especiais de ${formatarPercentual(pico.pctEspeciais)} para ${formatarPercentual(ultimo.pctEspeciais)}`
                : "";

            achados.push(criarAchado(`Recuo em ${ultimo.ano}:`,
                `${formatarDecimal(pico.hpGeral)} → ${formatarDecimal(ultimo.hpGeral)} HP${fatia}.`));
        }
    }

    // Hipóteses 2 e 4: volume e raridade de colecionador, da primeira à última era.
    const extremas = obterErasExtremas(data);

    if (extremas !== null) {
        const [inicial, final] = extremas;
        const eras = `(${inicial.era.nome} → ${final.era.nome})`;
        const porAno = (item) => item.cartas.length / new Set(item.cartas.map(obterAno)).size;
        const pctSecretas = (item) => (item.cartas.filter((carta) =>
            obterFaixa(carta).nome === "Secreta/Ilustração").length / item.cartas.length) * 100;

        achados.push(criarAchado("Cartas impressas por ano:",
            `${formatarNumero(Math.round(porAno(inicial)))} → ${formatarNumero(Math.round(porAno(final)))} ${eras}.`));

        if (pctSecretas(final) > pctSecretas(inicial)) {
            achados.push(criarAchado("Secreta/Ilustração:",
                `${formatarPercentual(pctSecretas(inicial))} → ${formatarPercentual(pctSecretas(final))} das cartas ${eras}.`));
        }
    }

    // Hipótese 3: editoras no mesmo ano, para tirar o efeito do tempo.
    const normaisDe2003 = (editora) => calcularMedia(obterPokemons(data)
        .filter((carta) => obterAno(carta) === 2003 && carta.editora === editora && !carta.especial)
        .map((carta) => carta.hp));

    const wotc = normaisDe2003("WOTC");
    const tpci = normaisDe2003("TPCI");

    if (wotc !== null && tpci !== null) {
        achados.push(criarAchado("Editora:", `em 2003, normais com ${formatarDecimal(wotc)} HP (WOTC) e ` +
            `${formatarDecimal(tpci)} (TPCI); a troca não coincide com aumento de HP.`));
    }

    if (achados.length === 0) {
        const vazio = document.createElement("li");
        vazio.className = "aguardando";
        vazio.textContent = "Sem dados suficientes neste filtro.";
        achados.push(vazio);
    }

    document.getElementById("listaAchados").replaceChildren(...achados);
}

// ===================================
// Legendas e medalhas
// ===================================

function criarMedalha(tipo) {
    const medalha = document.createElement("span");

    medalha.className = `medalha ${tipo}`;
    medalha.textContent = "★";
    medalha.setAttribute("role", "img");
    medalha.setAttribute("aria-label", `Medalha de ${tipo}`);

    return medalha;
}

function preencherLegenda(idLista, itens) {
    const linhas = itens.map((item) => {
        const linha = document.createElement("li");

        const cor = document.createElement("span");
        cor.className = "legenda-cor";
        cor.style.background = item.cor;

        const nome = document.createElement("span");
        nome.className = "legenda-nome";
        nome.textContent = item.nome;

        const valor = document.createElement("span");
        valor.className = "legenda-valor";
        valor.textContent = item.valor;

        linha.append(cor, nome, valor);

        return linha;
    });

    document.getElementById(idLista).replaceChildren(...linhas);
}

// ===================================
// Anotações desenhadas nos gráficos
// ===================================
// O Chart.js permite plugins: funções chamadas enquanto ele desenha. Estes três
// são pequenos e evitam instalar uma biblioteca de anotações.

// Pílula escura presa a um ponto ou barra, como "HP 143".
const pluginPilulas = {
    id: "pilulas",
    afterDatasetsDraw(chart, argumentos, opcoes) {
        const { ctx, chartArea } = chart;

        (opcoes.itens || []).forEach((item) => {
            const elemento = chart.getDatasetMeta(item.serie).data[item.indice];

            if (!elemento) {
                return;
            }

            ctx.save();
            ctx.font = "600 12px Poppins, sans-serif";

            const largura = ctx.measureText(item.texto).width + 16;
            const altura = 22;

            // Mantém a pílula dentro da área do gráfico.
            const x = Math.min(
                Math.max(elemento.x - largura / 2, chartArea.left),
                chartArea.right - largura
            );
            // "abaixo" põe a pílula sob o ponto, para não cobrir outra pílula acima.
            const y = item.abaixo
                ? Math.min(elemento.y + 8, chartArea.bottom - altura)
                : Math.max(elemento.y - altura - 8, chartArea.top - altura);

            // Pílula escura para valores; clara (contorno) para rótulos secundários.
            ctx.beginPath();
            ctx.roundRect(x, y, largura, altura, altura / 2);
            ctx.fillStyle = item.claro ? COR_PAINEL : COR_TINTA;
            ctx.fill();

            if (item.claro) {
                ctx.strokeStyle = COR_NORMAIS_CLARO;
                ctx.stroke();
            }

            ctx.fillStyle = item.claro ? COR_TEXTO_SUAVE : "#ffffff";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(item.texto, x + largura / 2, y + altura / 2);
            ctx.restore();
        });
    },
};

// Linha vertical tracejada no ano de cada mecânica.
const pluginMecanicas = {
    id: "mecanicas",
    beforeDatasetsDraw(chart, argumentos, opcoes) {
        const { ctx, chartArea, scales } = chart;

        (opcoes.marcos || []).forEach((marco) => {
            const x = scales.x.getPixelForValue(marco.indice);

            ctx.save();
            ctx.strokeStyle = "rgba(28, 27, 24, 0.25)";
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(x, chartArea.top);
            ctx.lineTo(x, chartArea.bottom);
            ctx.stroke();

            // Rótulo na base, à direita da linha: ali não há dados nem pílulas.
            ctx.setLineDash([]);
            ctx.fillStyle = COR_TEXTO_SUAVE;
            ctx.font = "500 11px Poppins, sans-serif";
            ctx.textAlign = "left";
            ctx.textBaseline = "bottom";
            ctx.fillText(marco.rotulo, x + 4, chartArea.bottom - 4);
            ctx.restore();
        });
    },
};

// Nome e percentual dentro de cada fatia da pizza, no lugar da legenda.
const pluginRotulosNasFatias = {
    id: "rotulosNasFatias",
    afterDatasetsDraw(chart, argumentos, opcoes) {
        if (!opcoes.ativo) {
            return;
        }

        const { ctx } = chart;
        const valores = chart.data.datasets[0].data;

        chart.getDatasetMeta(0).data.forEach((fatia, indice) => {
            // Fatias muito finas não têm espaço para texto.
            if (valores[indice] < 8) {
                return;
            }

            const { x, y } = fatia.tooltipPosition();

            ctx.save();
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = "600 13px Poppins, sans-serif";
            ctx.fillText(chart.data.labels[indice], x, y - 10);
            ctx.font = "700 20px Poppins, sans-serif";
            ctx.fillText(`${Math.round(valores[indice])}%`, x, y + 12);
            ctx.restore();
        });
    },
};

// Total no centro da rosca.
const pluginCentro = {
    id: "centro",
    afterDraw(chart, argumentos, opcoes) {
        if (!opcoes.valor) {
            return;
        }

        const { ctx, chartArea } = chart;
        const x = (chartArea.left + chartArea.right) / 2;
        const y = (chartArea.top + chartArea.bottom) / 2;

        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = COR_TINTA;
        ctx.font = "700 20px Poppins, sans-serif";
        ctx.fillText(opcoes.valor, x, y - 8);
        ctx.fillStyle = COR_TEXTO_SUAVE;
        ctx.font = "400 12px Poppins, sans-serif";
        ctx.fillText(opcoes.rotulo, x, y + 12);
        ctx.restore();
    },
};

// ===================================
// Configuração geral do Chart.js
// ===================================

function configurarChart() {
    Chart.register(pluginPilulas, pluginMecanicas, pluginCentro, pluginRotulosNasFatias);

    // maintainAspectRatio: false faz o gráfico ocupar a altura definida no CSS.
    Chart.defaults.maintainAspectRatio = false;
    Chart.defaults.font.family = "Poppins, sans-serif";
    // No projetor (tela larga), letras maiores nos gráficos.
    Chart.defaults.font.size = window.matchMedia("(min-width: 1600px)").matches ? 14 : 12;
    Chart.defaults.color = COR_TEXTO_SUAVE;

    // Animação curta: com filtros, os gráficos são redesenhados a cada clique.
    // Quem pede menos movimento no sistema não vê animação nenhuma.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        Chart.defaults.animation = false;
    } else {
        Chart.defaults.animation.duration = 300;
    }

    // Anos na horizontal: sem espaço, o Chart.js pula alguns em vez de inclinar.
    Chart.defaults.scale.ticks.maxRotation = 0;

    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.pointStyle = "circle";
    Chart.defaults.plugins.legend.labels.boxHeight = 7;

    // Tooltip escuro e arredondado, no estilo das pílulas.
    Chart.defaults.plugins.tooltip.backgroundColor = COR_TINTA;
    Chart.defaults.plugins.tooltip.cornerRadius = 12;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.titleFont = { family: "Poppins, sans-serif", weight: "600" };
    Chart.defaults.plugins.tooltip.bodyFont = { family: "Poppins, sans-serif" };
}

// ===================================
// Atualizar o painel
// ===================================

function mostrarGraficos() {
    // O Chart.js precisa do canvas visível para medir o espaço disponível.
    document.querySelectorAll("canvas[hidden]").forEach((canvas) => {
        canvas.hidden = false;
    });

    document.querySelectorAll(".area-grafico .aguardando").forEach((item) => {
        item.remove();
    });
}

// Filtra uma vez e entrega o mesmo conjunto para tudo: indicadores, medidor,
// 7 gráficos e achados. Assim nada na tela discorda do resto.
function atualizarPainel() {
    const cartas = obterCartasDoPainel();

    atualizarResumoDoFiltro(cartas);
    calcularIndicadores(cartas);

    criarGraficoCartasPorAno(cartas);
    criarGraficoHpPorAno(cartas);
    criarGraficoGanho(cartas);
    criarGraficoRaridade(cartas);
    criarGraficoColecoes(cartas);
    criarGraficoEras(cartas);
    criarGraficoEspeciais(cartas);

    preencherAchados(cartas);
}

// ===================================
// Aviso de carregamento e erro
// ===================================

function mostrarProgresso(carregadas, total) {
    avisoTexto.textContent =
        `Carregando ${formatarNumero(carregadas)} de ${formatarNumero(total)} cartas...`;

    const percentual = total > 0 ? carregadas / total : 0;

    // scaleX vai de 0 a 1 e é mais leve para o navegador do que mudar a largura.
    barraPreenchida.style.transform = `scaleX(${percentual})`;
    barra.setAttribute("aria-valuenow", Math.round(percentual * 100));
}

function mostrarErro(mensagem) {
    aviso.classList.remove("concluido");
    aviso.classList.add("erro");
    avisoTexto.textContent = mensagem;
    botaoTentarNovamente.hidden = false;
}

function limparErro() {
    aviso.classList.remove("erro", "concluido");
    botaoTentarNovamente.hidden = true;
    barraPreenchida.style.transform = "scaleX(0)";
    barra.setAttribute("aria-valuenow", 0);
}

function mostrarConcluido() {
    aviso.classList.add("concluido");
}

// ===================================
// Contador de consistência
// ===================================
// Compara o total que o banco informa com o que chegou ao navegador. Usa
// sempre o array completo, nunca o filtrado, para não depender dos filtros.

function atualizarConsistencia(totalNoBanco) {
    const carregadas = todasAsCartas.length;

    // Um Set guarda cada valor uma só vez. Se a paginação repetisse uma carta,
    // o tamanho dele ficaria menor que o total carregado.
    const idsUnicos = new Set(todasAsCartas.map((carta) => carta.id)).size;

    document.getElementById("contadorBanco").textContent = formatarNumero(totalNoBanco);
    document.getElementById("contadorCarregadas").textContent = formatarNumero(carregadas);
    document.getElementById("contadorUnicos").textContent = formatarNumero(idsUnicos);

    const selo = document.getElementById("seloConsistencia");
    const tudoCerto = carregadas === totalNoBanco && idsUnicos === carregadas;

    selo.textContent = tudoCerto ? "Totais iguais" : "Totais diferentes";
    selo.className = tudoCerto ? "selo selo-sobe" : "selo selo-desce";

    return tudoCerto;
}

// ===================================
// Buscar o total no banco
// ===================================

async function buscarTotalNoBanco(cliente) {
    // count: "exact" pede a contagem real da tabela.
    // head: true evita trazer as linhas: aqui só interessa o total.
    const { count, error } = await cliente
        .from(TABELA)
        .select("id", { count: "exact", head: true });

    if (error) {
        throw error;
    }

    return count;
}

// ===================================
// Buscar os registros em blocos
// ===================================

async function buscarTodasAsCartas(cliente, totalNoBanco) {
    // Guardamos direto no array geral: se um bloco falhar, o contador de
    // consistência ainda mostra até onde o carregamento chegou.
    todasAsCartas = [];

    let inicio = 0;

    while (true) {
        // Sem o .order(), o banco pode devolver as linhas em ordem diferente a
        // cada pedido, repetindo umas e pulando outras entre os blocos.
        const { data, error } = await cliente
            .from(TABELA)
            .select(COLUNAS)
            .order("id")
            .range(inicio, inicio + TAMANHO_BLOCO - 1);

        // ===================================
        // Verificar erro
        // ===================================

        if (error) {
            throw error;
        }

        // ===================================
        // Adicionar registros
        // ===================================
        // O push acrescenta ao array existente. Criar um array novo a cada
        // bloco, como no código de exemplo, copiaria tudo de novo a cada volta.

        todasAsCartas.push(...data);

        console.log(`Bloco recebido: ${data.length} registros`);

        mostrarProgresso(todasAsCartas.length, totalNoBanco);

        // ===================================
        // Verificar se chegamos ao final
        // ===================================

        if (data.length < TAMANHO_BLOCO) {
            break;
        }

        // ===================================
        // Ir para o próximo bloco
        // ===================================

        inicio += TAMANHO_BLOCO;
    }
}

// ===================================
// Conferir a configuração
// ===================================
// Devolve uma mensagem se algo impedir a conexão, ou null se estiver tudo certo.

function conferirConfiguracao() {
    if (!window.supabase || !window.Chart) {
        return "Não foi possível carregar as bibliotecas do dashboard. Verifique a internet.";
    }

    if (SUPABASE_URL.startsWith("COLE_AQUI") || SUPABASE_KEY.startsWith("COLE_AQUI")) {
        return "Falta configurar a URL e a chave pública no início do arquivo web/script.js.";
    }

    if (SUPABASE_KEY.startsWith("sb_secret_")) {
        return "Esta é a chave secreta. O navegador só pode usar a chave pública.";
    }

    return null;
}

// ===================================
// Carregar os dados
// ===================================

async function carregarDados() {
    limparErro();

    const problema = conferirConfiguracao();

    if (problema) {
        mostrarErro(problema);
        return;
    }

    const cliente = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    let totalNoBanco = null;

    try {
        avisoTexto.textContent = "Conectando ao banco...";

        totalNoBanco = await buscarTotalNoBanco(cliente);

        mostrarProgresso(0, totalNoBanco);

        await buscarTodasAsCartas(cliente, totalNoBanco);

        console.log("Total de registros recebidos: ", todasAsCartas.length);

        // Só desenhamos com os dados completos: número parcial na tela seria
        // pior do que nenhum número. Os filtros também só ligam aqui.
        if (atualizarConsistencia(totalNoBanco)) {
            mostrarConcluido();
            mostrarGraficos();
            preencherOpcoesDosFiltros();
            preencherLimitacoes();
            ativarFiltros();
            aplicarFiltros();
        } else {
            mostrarErro("Os dados chegaram incompletos. Veja o cartão de consistência.");
        }
    } catch (erro) {
        console.error("Erro ao buscar dados: ", erro);

        mostrarErro("Não foi possível carregar as cartas. Confira a conexão e tente novamente.");

        // Com o total em mãos, o contador mostra até onde o carregamento chegou.
        if (totalNoBanco !== null) {
            atualizarConsistencia(totalNoBanco);
        }
    }
}

botaoTentarNovamente.addEventListener("click", carregarDados);

if (window.Chart) {
    configurarChart();
}

carregarDados();
