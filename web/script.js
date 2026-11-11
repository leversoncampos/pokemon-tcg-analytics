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

// Anos em que as mecânicas especiais chegaram, marcados no gráfico 2.
const MECANICAS = [
    { ano: 2003, rotulo: "Pokémon-ex" },
    { ano: 2012, rotulo: "EX" },
    { ano: 2017, rotulo: "GX" },
    { ano: 2020, rotulo: "V" },
    { ano: 2023, rotulo: "ex" },
];

// Cada era tem a mesma cor em todos os gráficos: cinza claro para a mais
// antiga e cinza-escuro para a mais recente (o laranja é só das especiais).
const CORES_DAS_ERAS = ["#c2c7cf", "#8d95a1", "#4b5563"];
const COR_ERA_RECENTE = CORES_DAS_ERAS[2];

// As 3 eras do gráfico 6 e dos atalhos do topo. Os cortes de 2007 e 2017
// coincidem com os dois degraus do HP das cartas normais encontrados na exploração.
const ERAS = [
    { nome: "1999–2006", inicio: 1999, fim: 2006, cor: CORES_DAS_ERAS[0] },
    { nome: "2007–2016", inicio: 2007, fim: 2016, cor: CORES_DAS_ERAS[1] },
    { nome: "2017–2023", inicio: 2017, fim: 2023, cor: CORES_DAS_ERAS[2] },
];

// Ranking de coleções: só entram coleções com Pokémon suficientes para a média valer.
const MINIMO_POKEMON_COLECAO = 50;
const MINIMO_POKEMON_COLECAO_COM_TIPO = 20;
const TAMANHO_RANKING = 10;

// Uma comparação só vira título-conclusão se cada lado tiver pelo menos esta
// quantidade de cartas. Abaixo disso, o título fica descritivo e avisa.
const AMOSTRA_MINIMA = 30;
const AVISO_AMOSTRA_PEQUENA = " · amostra pequena";

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

const COR_TINTA = "#1f2937";
const COR_TEXTO_SUAVE = "#6b7280";

// Knaflic: tudo em cinza e UMA cor de destaque. Laranja = especiais, e só isso;
// as eras usam CORES_DAS_ERAS e o pico é marcado com anotação.
const COR_ESPECIAIS = "#e8710a";
// Laranja-claro: barras de especiais sem destaque (gráfico 7).
const COR_ESPECIAIS_CLARO = "#f6c9a4";
const COR_NORMAIS = "#9ca3af";
const COR_NORMAIS_CLARO = "#d1d5db";
const COR_NEUTRA_CLARA = "#e5e7eb";
const COR_PAINEL = "#ffffff";
const COR_GRADE = "#f3f4f6";

// A mesma fonte da página também nos gráficos.
const FONTE = '"Source Sans 3", "Segoe UI", Arial, sans-serif';

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
let graficoRaridadeRecente = null;
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
    // O sinal de menos (−) é mais legível que o hífen (-) nos negativos.
    return valor.toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    }).replace("-", "−");
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

// Nome de um trecho pelos anos que realmente têm cartas no filtro: "2005–2006"
// ou só "2005". Assim um período que corta uma era não leva o nome da era inteira.
function nomearAnos(cartas) {
    const anos = cartas.map(obterAno);
    const inicio = Math.min(...anos);
    const fim = Math.max(...anos);

    return inicio === fim ? String(inicio) : `${inicio}–${fim}`;
}

// Separa as cartas por era. Só voltam as eras com cartas no filtro, cada uma
// com o nome dos anos que entraram.
function separarPorEra(cartas) {
    return ERAS
        .map((era) => ({
            era: era,
            cartas: cartas.filter((carta) => obterAno(carta) >= era.inicio && obterAno(carta) <= era.fim),
        }))
        .filter((item) => item.cartas.length > 0)
        .map((item) => ({ ...item, nome: nomearAnos(item.cartas) }));
}

// Se o ano é o último dos dados e a última coleção não é de 31/12, ele é parcial.
// Devolve " (parcial, até 03/11)" ou "".
function descreverAnoParcial(ano) {
    const ultimaData = todasAsCartas.map((carta) => carta.data_lancamento).sort().pop();
    const [anoFinal, mes, dia] = ultimaData.split("-");

    if (Number(anoFinal) !== ano || `${mes}-${dia}` === "12-31") {
        return "";
    }

    return ` (parcial, até ${dia}/${mes})`;
}

// Era de um ano (cada ano está em exatamente uma era).
function obterEraDoAno(ano) {
    return ERAS.find((era) => ano >= era.inicio && ano <= era.fim);
}

// Média de cartas impressas por ano: total ÷ anos que têm cartas.
function calcularCartasPorAno(cartas) {
    return cartas.length / new Set(cartas.map(obterAno)).size;
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

    return true;
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

    // Tipos na mesma ordem e com os mesmos nomes dos gráficos. A lista é
    // refeita do zero (só "Todos" fica), para nunca repetir opções.
    const tiposExistentes = new Set(todasAsCartas.map((carta) => carta.tipo));

    filtroTipo.replaceChildren();
    adicionarOpcao(filtroTipo, "todos", "Todos");

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
    filtroPromos.checked = false;
}

// Conta quantos filtros estão diferentes do padrão. O período conta como um.
function contarFiltrosAtivos() {
    const filtros = lerFiltros();

    const ativos = [
        filtros.anoInicial !== anoMinimo || filtros.anoFinal !== anoMaximo,
        filtros.tipo !== "todos",
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
        filtroAnoInicial, filtroAnoFinal, filtroTipo,
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

    [filtroTipo, filtroPromos].forEach((controle) => {
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

// ===================================
// Criar ou atualizar um gráfico
// ===================================
// Na primeira vez, cria o gráfico (new Chart). Nas seguintes, copia os novos
// valores para DENTRO do gráfico que já existe e chama update(): assim o
// Chart.js anima do valor antigo para o novo, em vez de redesenhar do zero.
// Os conjuntos de dados são atualizados no lugar (Object.assign) porque, se
// fossem trocados por objetos novos, o Chart.js perderia os valores antigos.

function desenharGrafico(grafico, idCanvas, configuracao) {
    if (grafico === null) {
        return new Chart(document.getElementById(idCanvas), configuracao);
    }

    const novos = configuracao.data.datasets;
    const atuais = grafico.data.datasets;

    grafico.data.labels = configuracao.data.labels;

    novos.forEach((novo, indice) => {
        if (atuais[indice]) {
            Object.assign(atuais[indice], novo);
        } else {
            atuais.push(novo);
        }
    });

    // A rosca pode passar de 2 anéis para 1: o que sobrar sai.
    atuais.length = novos.length;

    grafico.options = configuracao.options;
    grafico.update();

    return grafico;
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
                normais: normais.length,
                especiais: especiais.length,
                pctEspeciais: (especiais.length / todos.length) * 100,
                hpGeral: calcularMedia(todos),
                hpNormais: calcularMedia(normais),
                hpEspeciais: calcularMedia(especiais),
            };
        });
}

// ===================================
// Calcular os indicadores
// ===================================

function calcularIndicadores(data) {
    const pokemons = obterPokemons(data);
    const resumo = resumirPorAno(data);

    // KPI 1: total de cartas. O contexto diz o que ficou de fora: as promos
    // ocultas (desligadas por padrão) e, com tipo escolhido, os não-Pokémon.
    const filtros = lerFiltros();

    document.getElementById("kpiTotal").textContent = formatarNumero(data.length);

    const partesDaNota = [];

    if (filtros.tipo !== "todos") {
        partesDaNota.push("só Pokémon do tipo");
    }

    if (filtros.incluirPromos) {
        partesDaNota.push("com promos");
    } else {
        const promosOcultas = todasAsCartas.filter((carta) =>
            ehPromo(carta) && cartaPassaNosFiltros(carta, { ...filtros, incluirPromos: true })).length;

        partesDaNota.push(`${formatarNumero(promosOcultas)} promos ocultas`);
    }

    document.getElementById("notaTotal").textContent = partesDaNota.join(" · ");

    // KPI 2: HP médio (só existe se houver Pokémon no filtro)
    const hpMedio = calcularMedia(pokemons.map((carta) => carta.hp));

    document.getElementById("kpiHp").textContent =
        hpMedio === null ? "—" : formatarDecimal(hpMedio);

    // KPI 3: crescimento do HP médio entre o primeiro e o último ano.
    // Com um ano só, não há o que comparar.
    const kpiCrescimento = document.getElementById("kpiCrescimento");
    const notaCrescimento = document.getElementById("notaCrescimento");

    if (resumo.length < 2) {
        // A nota diz o motivo: falta Pokémon, ou o período tem um ano só.
        kpiCrescimento.textContent = "—";
        notaCrescimento.textContent = pokemons.length === 0
            ? "sem Pokémon neste filtro"
            : "precisa de 2 anos ou mais";
    } else {
        const primeiroAno = resumo[0];
        const ultimoAno = resumo[resumo.length - 1];
        const crescimento = (ultimoAno.hpGeral / primeiroAno.hpGeral - 1) * 100;
        const sinal = crescimento >= 0 ? "+" : "";

        // O sinal + ou − já diz se cresceu ou caiu; um selo repetiria a informação.
        kpiCrescimento.textContent = sinal + formatarPercentual(crescimento);
        // 1 casa decimal: quem refizer a conta com estes números chega ao mesmo %.
        notaCrescimento.textContent = `${formatarDecimal(primeiroAno.hpGeral)} → ${formatarDecimal(ultimoAno.hpGeral)} HP ` +
            `(${primeiroAno.ano}–${ultimoAno.ano})`;
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
        // Sem dados, o título volta a ser descritivo: a conclusão do filtro anterior não vale mais.
        definirTitulo("titulo1", "Cartas impressas por ano");
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

    // Título: média de cartas por ano da primeira e da última era do filtro.
    // É a mesma base do radar e das linhas de média (uma só conta no dashboard).
    const extremas = obterErasExtremas(data);

    if (extremas === null) {
        definirTitulo("titulo1", "Cartas impressas por ano");
    } else if (extremas.some((item) => item.cartas.length < AMOSTRA_MINIMA)) {
        definirTitulo("titulo1", "Cartas impressas por ano" + AVISO_AMOSTRA_PEQUENA);
    } else {
        const [inicial, final] = extremas;
        const antes = calcularCartasPorAno(inicial.cartas);
        const depois = calcularCartasPorAno(final.cartas);

        definirTitulo("titulo1", `A média de cartas impressas por ano ${descreverVariacao(depois / antes, true)}: ` +
            `${formatarNumero(Math.round(antes))} (${inicial.nome}) → ${formatarNumero(Math.round(depois))} (${final.nome})`);
    }

    // Média de cada era do filtro (até 3), desenhada como uma linha em degrau:
    // cada ano recebe a média da sua era.
    const eras = separarPorEra(data);
    const mediaDaEra = (ano) => {
        const item = eras.find((era) => ano >= era.era.inicio && ano <= era.era.fim);

        return calcularCartasPorAno(item.cartas);
    };
    const medias = nomes.map((ano) => mediaDaEra(Number(ano)));

    // Rótulo à direita de cada degrau ("433/ano"), preso ao último ano da era.
    const degraus = eras.map((item) => ({
        indice: nomes.indexOf(String(Math.max(...item.cartas.map(obterAno)))),
        texto: `${formatarNumero(Math.round(calcularCartasPorAno(item.cartas)))}/ano`,
    }));

    // A anotação marca o maior valor. Um número em cada coluna viraria ruído.
    const indiceMaior = valores.indexOf(Math.max(...valores));

    // Criar o gráfico (1ª vez) ou atualizar com animação (ver desenharGrafico)
    graficoCartasPorAno = desenharGrafico(graficoCartasPorAno, "graficoCartasPorAno", {
        type: "bar",
        data: {
            labels: nomes,
            datasets: [
                {
                    // Colunas: cartas impressas em cada ano, em cinza claro (contexto).
                    label: "Cartas",
                    data: valores,
                    backgroundColor: COR_NORMAIS_CLARO,
                    borderRadius: 2,
                    order: 2,
                },
                {
                    // Por cima das colunas: a média de cada era, em degrau.
                    type: "line",
                    label: "Média da era",
                    data: medias,
                    borderColor: COR_ERA_RECENTE,
                    backgroundColor: COR_ERA_RECENTE,
                    borderWidth: 2.5,
                    // "middle": o degrau sobe no meio, entre o último ano de uma era e o primeiro da outra.
                    stepped: "middle",
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    order: 1,
                },
            ],
        },
        options: {
            // Espaço no alto para a anotação e à direita para o rótulo do último degrau.
            layout: { padding: { top: 28, right: ehProjetor() ? 88 : 76 } },
            interaction: { mode: "index", intersect: false },
            plugins: {
                legend: { display: false },
                degraus: { itens: degraus },
                rotulos: {
                    itens: [
                        {
                            serie: 0,
                            indice: indiceMaior,
                            texto: `${nomes[indiceMaior]}: ${formatarNumero(valores[indiceMaior])}`,
                            cor: COR_TEXTO_SUAVE,
                        },
                    ],
                },
                tooltip: {
                    callbacks: {
                        label: (contexto) => contexto.datasetIndex === 0
                            ? `${formatarNumero(contexto.raw)} cartas`
                            : `média da era: ${formatarNumero(Math.round(contexto.raw))}/ano`,
                    },
                },
            },
            scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true, grid: { color: COR_GRADE }, ticks: { maxTicksLimit: 5 } },
            },
        },
    });
}

// ===================================
// 2 - HP médio por ano: normais × especiais
// ===================================

function criarGraficoHpPorAno(data) {
    const resumo = resumirPorAno(data);

    if (resumo.length === 0) {
        graficoHpPorAno = esvaziarGrafico(graficoHpPorAno, "graficoHpPorAno", mensagemDeVazio(data));
        definirTitulo("titulo2", "HP médio por ano: normais × especiais");
        document.getElementById("subtitulo2").textContent = "HP médio por ano, só Pokémon";
        return;
    }

    esconderMensagemDoGrafico("graficoHpPorAno");

    // Título: as duas séries no MESMO período, do 1º ao último ano em que cada
    // uma tem pelo menos AMOSTRA_MINIMA cartas (sem filtros: 2004–2023).
    const temNormais = resumo.some((item) => item.normais > 0);
    const temEspeciais = resumo.some((item) => item.especiais > 0);
    const anosValidos = resumo.filter((item) =>
        (!temNormais || item.normais >= AMOSTRA_MINIMA) && (!temEspeciais || item.especiais >= AMOSTRA_MINIMA));
    const subtitulo = document.getElementById("subtitulo2");

    if (anosValidos.length >= 2) {
        const primeiro = anosValidos[0];
        const ultimo = anosValidos[anosValidos.length - 1];
        const variacaoNormais = ultimo.hpNormais / primeiro.hpNormais;
        const variacaoEspeciais = ultimo.hpEspeciais / primeiro.hpEspeciais;

        if (temNormais && temEspeciais) {
            definirTitulo("titulo2", `As especiais ${descreverVariacao(variacaoEspeciais)} de HP; ` +
                `as normais ${descreverVariacao(variacaoNormais)}`);
        } else if (temNormais) {
            definirTitulo("titulo2", `O HP das normais ${descreverVariacao(variacaoNormais, true)}`);
        } else {
            definirTitulo("titulo2", `O HP das especiais ${descreverVariacao(variacaoEspeciais, true)}`);
        }

        subtitulo.textContent = `HP médio por ano, só Pokémon · variação de ${primeiro.ano} a ${ultimo.ano} ` +
            `(anos com ${AMOSTRA_MINIMA} cartas ou mais em cada série)`;
    } else {
        // Com menos de 2 anos não há variação; com 2 anos ou mais, faltou amostra.
        definirTitulo("titulo2", "HP médio por ano: normais × especiais" +
            (resumo.length >= 2 ? AVISO_AMOSTRA_PEQUENA : ""));
        subtitulo.textContent = "HP médio por ano, só Pokémon";
    }

    // Eixo com todos os anos do primeiro ao último, sem pular nenhum:
    // um ano sem Pokémon no filtro aparece vazio, em vez de sumir do eixo.
    const anos = [];

    for (let ano = resumo[0].ano; ano <= resumo[resumo.length - 1].ano; ano++) {
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

    // Rótulos diretos na ponta de cada linha, na cor da série, no lugar da legenda.
    const indiceUltimo = anos.length - 1;
    const rotulos = [["Normais", normais, COR_TEXTO_SUAVE], ["Especiais", especiais, COR_ESPECIAIS]]
        .map(([nome, serie, cor], indiceSerie) => ({ nome, cor, serie: indiceSerie, valor: serie[indiceUltimo] }))
        .filter((item) => item.valor !== null)
        .map((item) => ({
            serie: item.serie,
            indice: indiceUltimo,
            texto: `${item.nome}: ${Math.round(item.valor)} HP`,
            // No celular, em 2 linhas, para sobrar espaço para o gráfico.
            textoEstreito: [`${item.nome}:`, `${Math.round(item.valor)} HP`],
            cor: item.cor,
            aDireita: true,
        }));

    // Buracos na linha das especiais (ex.: 2011 sem promos): a linha não liga os
    // anos vizinhos, e o buraco recebe a anotação "sem especiais".
    const comEspeciais = especiais.map((valor, indice) => (valor === null ? null : indice)).filter((i) => i !== null);
    const buracos = [];

    for (let indice = comEspeciais[0] + 1; indice < comEspeciais[comEspeciais.length - 1]; indice++) {
        if (especiais[indice] === null) {
            const vizinhos = [especiais[indice - 1], especiais[indice + 1]].filter((valor) => valor !== null);

            buracos.push({ indice: indice, valor: calcularMedia(vizinhos) ?? 0, texto: "sem especiais", cor: COR_TEXTO_SUAVE });
        }
    }

    // Criar o gráfico (1ª vez) ou atualizar com animação (ver desenharGrafico)
    graficoHpPorAno = desenharGrafico(graficoHpPorAno, "graficoHpPorAno", {
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
                    // Linhas retas: uma curva passaria por valores que não existem.
                    tension: 0,
                    spanGaps: false,
                },
                {
                    label: "Especiais",
                    data: especiais,
                    borderColor: COR_ESPECIAIS,
                    backgroundColor: COR_ESPECIAIS,
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    tension: 0,
                    spanGaps: false,
                },
            ],
        },
        options: {
            // Espaço no alto para os nomes das mecânicas (2 linhas em tela estreita)
            // e à direita para os rótulos das linhas.
            // A função é recalculada a cada desenho, então vale também ao girar o celular.
            layout: {
                padding: (contexto) => ({
                    top: contexto.chart.width < 600 ? 44 : 26,
                    right: contexto.chart.width < 500 ? 72 : (ehProjetor() ? 140 : 118),
                }),
            },
            interaction: { mode: "index", intersect: false },
            plugins: {
                legend: { display: false },
                mecanicas: { marcos: marcos },
                rotulos: { itens: rotulos },
                textos: { itens: buracos },
                tooltip: {
                    // Ano sem valor (buraco) não entra no tooltip.
                    filter: (contexto) => contexto.raw !== null,
                    callbacks: {
                        label: (contexto) =>
                            `${contexto.dataset.label}: ${formatarDecimal(contexto.raw)} HP`,
                    },
                },
            },
            scales: {
                x: { grid: { display: false } },
                y: {
                    beginAtZero: true,
                    grid: { color: COR_GRADE },
                    ticks: { maxTicksLimit: 5 },
                    // A unidade fica no eixo, uma vez só.
                    title: { display: true, text: "HP médio" },
                },
            },
        },
    });
}

// ===================================
// 3 - De onde veio o ganho de HP
// ===================================

// Divide o ganho de HP entre o primeiro e o último ano do período (o mesmo
// período do KPI 3 e do topo). Sem especiais, a média seria a das normais;
// o que passa disso vem das especiais.
// Devolve { motivo } quando a divisão não faz sentido no filtro.
function calcularDecomposicao(resumo) {
    const anosComAmbas = resumo.filter((item) => item.hpNormais !== null && item.hpEspeciais !== null);

    if (anosComAmbas.length < 2) {
        return { motivo: "Para dividir o ganho, o filtro precisa de normais e especiais em pelo menos 2 anos." };
    }

    const primeiro = resumo[0];
    const ultimo = resumo[resumo.length - 1];

    if (primeiro.pokemons < AMOSTRA_MINIMA || ultimo.pokemons < AMOSTRA_MINIMA) {
        return { motivo: `Amostra pequena: menos de ${AMOSTRA_MINIMA} Pokémon no primeiro ou no último ano.`, amostraPequena: true };
    }

    const ganhoTotal = ultimo.hpGeral - primeiro.hpGeral;

    if (ganhoTotal <= 0 || primeiro.hpNormais === null || ultimo.hpNormais === null) {
        return { motivo: "O HP médio não subiu entre o primeiro e o último ano: não há ganho para dividir." };
    }

    const parteEspeciais = ((ganhoTotal - (ultimo.hpNormais - primeiro.hpNormais)) / ganhoTotal) * 100;

    // Fora de 0–100% (normais subiram mais que a média, por exemplo), uma pizza não representa a divisão.
    if (parteEspeciais < 0 || parteEspeciais > 100) {
        return { motivo: "Neste filtro, a divisão do ganho fica fora de 0–100% e não cabe numa pizza." };
    }

    return { primeiro, ultimo, parteEspeciais };
}

function criarGraficoGanho(data) {
    const decomposicao = calcularDecomposicao(resumirPorAno(data));
    const nota = document.getElementById("notaGanho");

    if (decomposicao.motivo) {
        const mensagem = obterPokemons(data).length === 0 ? mensagemDeVazio(data) : decomposicao.motivo;

        graficoGanho = esvaziarGrafico(graficoGanho, "graficoGanho", mensagem);
        definirTitulo("titulo3", "De onde veio o ganho de HP" + (decomposicao.amostraPequena ? AVISO_AMOSTRA_PEQUENA : ""));
        nota.hidden = true;
        return;
    }

    esconderMensagemDoGrafico("graficoGanho");

    const { primeiro, ultimo, parteEspeciais } = decomposicao;

    definirTitulo("titulo3", `${Math.round(parteEspeciais)}% do ganho de HP entre ${primeiro.ano} e ` +
        `${ultimo.ano} veio das especiais`);

    // A frase em destaque ao lado da pizza: sem as especiais, a média do último
    // ano seria só a das normais.
    nota.hidden = false;
    document.getElementById("ganhoRotulo").textContent = `Sem as especiais, a média de ${ultimo.ano} seria`;
    document.getElementById("ganhoSem").textContent = `${formatarDecimal(ultimo.hpNormais)} HP`;
    document.getElementById("ganhoCom").textContent = `${formatarDecimal(ultimo.hpGeral)} HP`;

    const nomes = ["Especiais", "Normais"];
    const valores = [parteEspeciais, 100 - parteEspeciais];

    // Criar o gráfico (1ª vez) ou atualizar com animação (ver desenharGrafico)
    graficoGanho = desenharGrafico(graficoGanho, "graficoGanho", {
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

// Configuração de uma rosca (as duas são iguais, só mudam os dados).
function montarRosca(item, partes) {
    return {
        type: "doughnut",
        data: {
            labels: ["Raras especiais", "Outras raras", "Demais cartas"],
            datasets: [
                {
                    // O nome são os anos que realmente entraram (ex.: "2017–2018").
                    label: item.nome,
                    data: partes,
                    // Laranja = especiais; cinza-escuro e cinza-claro para o resto.
                    backgroundColor: [COR_ESPECIAIS, COR_ERA_RECENTE, COR_NEUTRA_CLARA],
                    borderColor: COR_PAINEL,
                    borderWidth: 2,
                },
            ],
        },
        options: {
            cutout: "58%",
            // Espaço em volta para os rótulos que ficam fora das fatias.
            layout: { padding: { top: 26, bottom: 26, left: 96, right: 96 } },
            plugins: {
                legend: { display: false },
                centro: { valor: formatarPercentual(partes[0] + partes[1]), rotulo: "raras" },
                rotulosForaDasFatias: { minimo: 10 },
                tooltip: {
                    callbacks: {
                        label: (contexto) => `${contexto.label}: ${formatarPercentual(contexto.raw)}`,
                    },
                },
            },
        },
    };
}

function criarGraficoRaridade(data) {
    const roscaRecente = document.getElementById("roscaRecente");

    if (data.length === 0) {
        graficoRaridade = esvaziarGrafico(graficoRaridade, "graficoRaridade", MENSAGEM_SEM_CARTAS);
        graficoRaridadeRecente = esvaziarGrafico(graficoRaridadeRecente, "graficoRaridadeRecente", MENSAGEM_SEM_CARTAS);
        document.getElementById("tituloRoscaInicial").textContent = "";
        roscaRecente.hidden = true;
        definirTitulo("titulo4", "Raras por era");
        return;
    }

    esconderMensagemDoGrafico("graficoRaridade");

    // Compara a primeira e a última era com cartas no filtro, pelos anos que entraram.
    const eras = separarPorEra(data);
    const comparadas = eras.length >= 2 ? [eras[0], eras[eras.length - 1]] : eras;
    const partes = comparadas.map((item) => dividirRaridade(item.cartas));

    // % de raras = raras especiais + outras raras.
    const raras = partes.map((valores) => valores[0] + valores[1]);
    const amostraPequena = comparadas.some((item) => item.cartas.length < AMOSTRA_MINIMA);

    if (amostraPequena) {
        definirTitulo("titulo4", "Raras por era" + AVISO_AMOSTRA_PEQUENA);
    } else if (comparadas.length === 2) {
        const recente = partes[1];
        const parteEspeciais = raras[1] > 0 ? (recente[0] / raras[1]) * 100 : 0;
        const quantas = parteEspeciais >= 45 && parteEspeciais <= 55 ? "metade" : `${Math.round(parteEspeciais)}%`;

        definirTitulo("titulo4", `As raras foram de ${Math.round(raras[0])}% para ${Math.round(raras[1])}% ` +
            `das cartas, e ${quantas} delas são especiais`);
    } else {
        definirTitulo("titulo4", `Raras (Holo ou acima): ${Math.round(raras[0])}% das cartas`);
    }

    // Rosca da esquerda: a primeira era (ou a única).
    document.getElementById("tituloRoscaInicial").textContent = comparadas[0].nome;
    graficoRaridade = desenharGrafico(graficoRaridade, "graficoRaridade", montarRosca(comparadas[0], partes[0]));

    // Rosca da direita: a última era. Com uma era só, ela não aparece.
    if (comparadas.length === 2) {
        roscaRecente.hidden = false;
        esconderMensagemDoGrafico("graficoRaridadeRecente");
        document.getElementById("tituloRoscaRecente").textContent = comparadas[1].nome;
        graficoRaridadeRecente = desenharGrafico(graficoRaridadeRecente, "graficoRaridadeRecente",
            montarRosca(comparadas[1], partes[1]));
    } else {
        if (graficoRaridadeRecente) {
            graficoRaridadeRecente.destroy();
            graficoRaridadeRecente = null;
        }

        roscaRecente.hidden = true;
    }
}

// ===================================
// 5 - Ranking das coleções mais fortes
// ===================================

// Mínimo de Pokémon por coleção. Com um tipo escolhido, nenhuma coleção tem 50
// Pokémon daquele tipo (a maior tem 43), então o mínimo cai para 20.
function obterMinimoDaColecao() {
    return lerFiltros().tipo === "todos" ? MINIMO_POKEMON_COLECAO : MINIMO_POKEMON_COLECAO_COM_TIPO;
}

// Agrupa os Pokémon por coleção e devolve as de maior HP médio.
function montarRankingColecoes(pokemons, minimo) {
    const colecoes = {};

    pokemons.forEach((carta) => {
        if (!colecoes[carta.colecao]) {
            colecoes[carta.colecao] = { nome: carta.colecao, ano: obterAno(carta), hps: [], especiais: 0 };
        }

        colecoes[carta.colecao].hps.push(carta.hp);

        if (carta.especial) {
            colecoes[carta.colecao].especiais++;
        }
    });

    return Object.values(colecoes)
        .filter((colecao) => colecao.hps.length >= minimo)
        .map((colecao) => ({
            nome: colecao.nome,
            ano: colecao.ano,
            hp: calcularMedia(colecao.hps),
            // % dos Pokémon da coleção que são especiais (selo laranja na ponta da barra).
            pctEspeciais: (colecao.especiais / colecao.hps.length) * 100,
        }))
        .sort((a, b) => b.hp - a.hp)
        .slice(0, TAMANHO_RANKING);
}

function criarGraficoColecoes(data) {
    const pokemons = obterPokemons(data);
    const minimo = obterMinimoDaColecao();
    const ranking = montarRankingColecoes(pokemons, minimo);
    const doTipo = minimo === MINIMO_POKEMON_COLECAO ? "" : " do tipo";

    document.getElementById("subtitulo5").textContent =
        `HP médio dos Pokémon de cada coleção · mín. ${minimo} Pokémon${doTipo}`;

    if (ranking.length === 0) {
        const mensagem = pokemons.length === 0
            ? mensagemDeVazio(data)
            : `Nenhuma coleção com ${minimo} Pokémon${doTipo} ou mais neste filtro.`;

        graficoColecoes = esvaziarGrafico(graficoColecoes, "graficoColecoes", mensagem);
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

    // Linha de referência: HP médio de todos os Pokémon das coleções no filtro
    // (o mesmo número do KPI 2), para comparar cada barra com o todo.
    const mediaGeral = calcularMedia(pokemons.map((carta) => carta.hp));

    // Criar o gráfico (1ª vez) ou atualizar com animação (ver desenharGrafico)
    graficoColecoes = desenharGrafico(graficoColecoes, "graficoColecoes", {
        type: "bar",
        data: {
            labels: nomes,
            datasets: [
                {
                    label: "HP médio",
                    data: valores,
                    // Barras em cinza: o destaque (laranja) fica no selo das especiais.
                    backgroundColor: COR_NORMAIS,
                    borderRadius: 2,
                    // Barras finas: o que importa é o comprimento, não a área.
                    barPercentage: 0.45,
                    maxBarThickness: 14,
                    // % de especiais de cada coleção, guardado junto para a conferência.
                    pctEspeciais: ranking.map((colecao) => colecao.pctEspeciais),
                },
            ],
        },
        options: {
            indexAxis: "y",
            // Espaço no alto para o texto da média e à direita para HP, ano e selo.
            layout: {
                padding: (contexto) => ({
                    top: 26,
                    right: contexto.chart.width < 500 ? 108 : (ehProjetor() ? 270 : 236),
                }),
            },
            plugins: {
                legend: { display: false },
                // Na ponta da barra: o HP, o ano em negrito e o selo laranja com o % de especiais.
                // No celular: só o HP e o selo curto (o ano fica no tooltip).
                valoresNasBarras: {
                    formatar: (valor, chart) => (chart.width < 500 ? formatarDecimal(valor) : `${formatarDecimal(valor)} HP`),
                    destaques: ranking.map((colecao) => String(colecao.ano)),
                    selos: ranking.map((colecao) => `${Math.round(colecao.pctEspeciais)}% especiais`),
                    selosCurtos: ranking.map((colecao) => `${Math.round(colecao.pctEspeciais)}%`),
                    nomesEmCima: ranking.map((colecao, indice) => `${indice + 1}. ${colecao.nome}`),
                },
                referencia: {
                    valor: mediaGeral,
                    texto: `média de todas as coleções: ${formatarDecimal(mediaGeral)} HP`,
                    textoCurto: `média: ${formatarDecimal(mediaGeral)} HP`,
                },
                tooltip: {
                    callbacks: {
                        label: (contexto) => `${formatarDecimal(contexto.raw)} HP · ${ranking[contexto.dataIndex].ano} · ` +
                            `${formatarPercentual(ranking[contexto.dataIndex].pctEspeciais)} especiais`,
                    },
                },
            },
            scales: {
                // O valor está escrito em cada barra: o eixo X e a grade seriam repetição.
                x: { display: false, beginAtZero: true },
                y: {
                    grid: { display: false },
                    ticks: {
                        color: COR_TINTA,
                        // Nomes com pelo menos 14 px, também no celular.
                        font: { size: Math.max(14, Chart.defaults.font.size) },
                        // function (e não =>) para usar this.chart. No celular, o nome é
                        // encurtado e sem o número (a ordem das barras já diz a posição);
                        // o nome inteiro fica no tooltip.
                        // No celular, o nome sai do eixo e é escrito em cima da barra
                        // (ver nomesEmCima), para não ser cortado.
                        callback: function (_valor, indice) {
                            return this.chart.width < 500 ? "" : `${indice + 1}. ${nomes[indice]}`;
                        },
                    },
                },
            },
        },
    });
}

// ===================================
// 6 - Perfil das eras: quanto cada coisa cresceu
// ===================================

// Eixos do radar. "frase" é o nome usado no título ("as especiais, 5 vezes").
const EIXOS_DO_RADAR = [
    { nome: "HP médio", frase: "o HP médio", campo: "hp", formatar: (valor) => `${formatarDecimal(valor)} HP` },
    { nome: "HP máximo", frase: "o HP máximo", campo: "hpMaximo", formatar: (valor) => `${formatarNumero(valor)} HP` },
    { nome: "Cartas por ano", frase: "as cartas por ano", campo: "cartasPorAno", formatar: (valor) => formatarNumero(Math.round(valor)) },
    { nome: "% raras", frase: "as raras", campo: "pctRaras", formatar: (valor) => formatarPercentual(valor) },
    { nome: "% especiais", frase: "as especiais", campo: "pctEspeciais", formatar: (valor) => formatarPercentual(valor) },
];

// Resume um trecho de cartas nos 5 eixos. Devolve null se não houver Pokémon
// (sem eles, HP e % de especiais não existem).
function resumirTrecho(cartas) {
    const pokemons = obterPokemons(cartas);

    if (pokemons.length === 0) {
        return null;
    }

    const hps = pokemons.map((carta) => carta.hp);

    return {
        hp: calcularMedia(hps),
        hpMaximo: Math.max(...hps),
        cartasPorAno: calcularCartasPorAno(cartas),
        pctRaras: (cartas.filter(ehRara).length / cartas.length) * 100,
        pctEspeciais: (pokemons.filter((carta) => carta.especial).length / pokemons.length) * 100,
    };
}

// Cartas com os filtros atuais, mas no período inteiro (1999–2023). Usado
// quando o período escolhido cabe numa era só.
function obterCartasSemFiltroDePeriodo() {
    const filtros = { ...lerFiltros(), anoInicial: anoMinimo, anoFinal: anoMaximo };

    return todasAsCartas.filter((carta) => cartaPassaNosFiltros(carta, filtros));
}

// Quantas vezes o valor recente tem o de referência. Referência 0: se o recente
// também é 0, não mudou (1×); se não é, é algo novo (null, escrito "novo").
function calcularMultiplicador(recente, referencia) {
    if (referencia > 0) {
        return recente / referencia;
    }

    return recente > 0 ? null : 1;
}

// "5 vezes" a partir de 1,95×; abaixo disso, o multiplicador com uma casa ("×1,4").
function descreverMultiplicador(multiplicador) {
    return multiplicador >= 1.95 ? `${Math.round(multiplicador)} vezes` : `×${formatarDecimal(multiplicador)}`;
}

function criarGraficoEras(data) {
    const nota = document.getElementById("notaEras");

    if (obterPokemons(data).length === 0) {
        graficoEras = esvaziarGrafico(graficoEras, "graficoEras", mensagemDeVazio(data));
        nota.hidden = true;
        definirTitulo("titulo6", "Perfil das eras");
        return;
    }

    esconderMensagemDoGrafico("graficoEras");

    // Referência e trecho comparado: a primeira e a última era com Pokémon.
    // Se o período cabe numa era só, a referência é o período inteiro (mesmos filtros).
    const eras = separarPorEra(data)
        .map((item) => ({ nome: item.nome, cartas: item.cartas, resumo: resumirTrecho(item.cartas) }))
        .filter((item) => item.resumo !== null);

    let referencia;
    let recente;
    const comparaComTudo = eras.length < 2;

    if (comparaComTudo) {
        const tudo = obterCartasSemFiltroDePeriodo();

        referencia = { nome: nomearAnos(tudo), cartas: tudo, resumo: resumirTrecho(tudo) };
        recente = eras[0];
    } else {
        referencia = eras[0];
        recente = eras[eras.length - 1];
    }

    const multiplicadores = EIXOS_DO_RADAR.map((eixo) =>
        calcularMultiplicador(recente.resumo[eixo.campo], referencia.resumo[eixo.campo]));

    // Título: se tudo cresceu, diz qual eixo cresceu mais (e quantas vezes).
    const tudoCresceu = multiplicadores.every((valor) => valor === null || valor > 1);
    const conhecidos = multiplicadores.filter((valor) => valor !== null);
    const maior = conhecidos.length > 0 ? Math.max(...conhecidos) : null;
    const eixoMaior = EIXOS_DO_RADAR[multiplicadores.indexOf(maior)];
    const comoCresceu = maior === null ? "" : (maior >= 1.95
        ? `, e ${eixoMaior.frase}, ${descreverMultiplicador(maior)}`
        : `; o maior aumento: ${eixoMaior.nome} (${descreverMultiplicador(maior)})`);

    if (referencia.cartas.length < AMOSTRA_MINIMA || recente.cartas.length < AMOSTRA_MINIMA) {
        definirTitulo("titulo6", "Perfil das eras" + AVISO_AMOSTRA_PEQUENA);
    } else if (comparaComTudo) {
        definirTitulo("titulo6", tudoCresceu
            ? `Em ${recente.nome}, tudo é maior que no conjunto ${referencia.nome}${comoCresceu}`
            : `Período ${recente.nome} × conjunto ${referencia.nome}`);
    } else {
        definirTitulo("titulo6", tudoCresceu
            ? `Da era ${referencia.nome} para a ${recente.nome}, tudo cresceu${comoCresceu}`
            : `Era ${referencia.nome} × era ${recente.nome}`);
    }

    // Escala em multiplicador: a referência é o polígono regular em 1×. "Novo"
    // (referência 0) fica na borda da escala.
    const topoDaEscala = Math.max(2, Math.ceil(maior ?? 1));
    const pontos = multiplicadores.map((valor) => (valor === null ? topoDaEscala : valor));

    const datasets = [
        {
            label: `${referencia.nome}${comparaComTudo ? " (todo o período)" : ""} = 1×`,
            data: EIXOS_DO_RADAR.map(() => 1),
            reais: EIXOS_DO_RADAR.map((eixo) => referencia.resumo[eixo.campo]),
            borderColor: CORES_DAS_ERAS[0],
            backgroundColor: "rgba(194, 199, 207, 0.35)",
            borderWidth: 2,
            pointRadius: 0,
        },
        {
            label: recente.nome,
            data: pontos,
            reais: EIXOS_DO_RADAR.map((eixo) => recente.resumo[eixo.campo]),
            borderColor: COR_ERA_RECENTE,
            backgroundColor: COR_ERA_RECENTE + "22",
            pointBackgroundColor: COR_ERA_RECENTE,
            borderWidth: 2.5,
            pointRadius: 3,
        },
    ];

    // Multiplicador escrito em cada ponta do polígono recente ("×5,2" ou "novo").
    const rotulos = multiplicadores.map((valor, indice) => ({
        serie: 1,
        indice: indice,
        texto: valor === null ? "novo" : `×${formatarDecimal(valor)}`,
        cor: COR_TINTA,
        paraOCentro: true,
        soEmTelaLarga: true,
    }));

    // No lugar da legenda: um quadradinho com a cor de cada trecho.
    const itens = datasets.map((conjunto) => {
        const quadrado = document.createElement("span");
        quadrado.className = "legenda-cor legenda-cor-texto";
        quadrado.style.background = conjunto.borderColor;

        const nome = document.createElement("span");
        nome.className = "legenda-texto";
        nome.textContent = conjunto.label;

        return [quadrado, nome];
    });

    nota.hidden = false;
    nota.replaceChildren(...itens.flat(), " · cada ponta: quantas vezes o valor da referência; valores reais no tooltip.");

    // Criar o gráfico (1ª vez) ou atualizar com animação (ver desenharGrafico)
    graficoEras = desenharGrafico(graficoEras, "graficoEras", {
        type: "radar",
        data: {
            labels: EIXOS_DO_RADAR.map((eixo) => eixo.nome),
            datasets: datasets,
        },
        options: {
            plugins: {
                legend: { display: false },
                rotulos: { itens: rotulos },
                tooltip: {
                    callbacks: {
                        title: (contextos) => EIXOS_DO_RADAR[contextos[0].dataIndex].nome,
                        label: (contexto) => {
                            const eixo = EIXOS_DO_RADAR[contexto.dataIndex];

                            return `${contexto.dataset.label}: ${eixo.formatar(contexto.dataset.reais[contexto.dataIndex])}`;
                        },
                    },
                },
            },
            scales: {
                r: {
                    min: 0,
                    max: topoDaEscala,
                    // Anéis a cada 1×, com o número escrito ("1×", "2×"...).
                    ticks: {
                        stepSize: 1,
                        color: COR_TEXTO_SUAVE,
                        backdropColor: "transparent",
                        font: { size: 13 },
                        callback: (valor) => `${valor}×`,
                    },
                    grid: { color: COR_NEUTRA_CLARA },
                    angleLines: { color: COR_NEUTRA_CLARA },
                    pointLabels: {
                        color: COR_TINTA,
                        // No celular, o nome do eixo quebra em linhas para caber nas laterais.
                        // O espaço especial ( ) não quebra: "% especiais" e "HP médio" ficam inteiros.
                        // No celular, o multiplicador vem na última linha do nome do eixo.
                        callback: (rotulo, indice) => (graficoEras && graficoEras.width < 450
                            ? [...String(rotulo).replace(/^(HP|%) /, "$1 ").replace(" por ", " por ").split(" "),
                                rotulos[indice].texto]
                            : rotulo),
                        // Nunca abaixo de 13 px, nem no celular.
                        font: (contexto) => ({ size: contexto.chart.width < 450 ? 13 : (ehProjetor() ? 16 : 14) }),
                    },
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
        definirTitulo("titulo7", "% de Pokémon especiais por ano");
        return;
    }

    esconderMensagemDoGrafico("graficoEspeciais");

    const nomes = resumo.map((item) => item.ano);
    const especiais = resumo.map((item) => item.pctEspeciais);

    // Título: do primeiro ano com especiais até o pico.
    const comEspeciais = resumo.filter((item) => item.pctEspeciais > 0);
    const picoEspeciais = comEspeciais.reduce((maior, item) =>
        (maior === null || item.pctEspeciais > maior.pctEspeciais ? item : maior), null);
    const temConclusao = comEspeciais.length >= 2 && picoEspeciais.pctEspeciais > comEspeciais[0].pctEspeciais;

    if (!temConclusao) {
        definirTitulo("titulo7", "% de Pokémon especiais por ano");
    } else if (comEspeciais[0].pokemons < AMOSTRA_MINIMA || picoEspeciais.pokemons < AMOSTRA_MINIMA) {
        definirTitulo("titulo7", "% de Pokémon especiais por ano" + AVISO_AMOSTRA_PEQUENA);
    } else {
        definirTitulo("titulo7", `E ficaram mais comuns: de ${Math.round(comEspeciais[0].pctEspeciais)}% para até ` +
            `${Math.round(picoEspeciais.pctEspeciais)}% dos Pokémon`);
    }

    const maior = Math.max(...especiais);
    const indiceMaior = especiais.indexOf(maior);
    const indiceUltimo = resumo.length - 1;
    const ultimo = resumo[indiceUltimo];
    const anterior = resumo[indiceUltimo - 1];

    // Queda no último ano: menos especiais que no ano anterior E média geral menor.
    const caiuNoFim = anterior !== undefined && indiceUltimo !== indiceMaior &&
        ultimo.pctEspeciais < anterior.pctEspeciais && ultimo.hpGeral < anterior.hpGeral;

    // Anotações: o pico (à esquerda da barra) e a queda do último ano (à direita do gráfico).
    const rotulos = [];

    if (maior > 0) {
        rotulos.push({ serie: 0, indice: indiceMaior, texto: `Pico: ${formatarPercentual(maior)} em ${nomes[indiceMaior]}`,
            cor: COR_ESPECIAIS, aEsquerda: true });
    }

    if (caiuNoFim) {
        rotulos.push({ serie: 0, indice: indiceUltimo, cor: COR_ESPECIAIS, aDireita: true,
            texto: [`${ultimo.ano}: ${Math.round(ultimo.pctEspeciais)}%`, "menos especiais", "→ média cai"] });
    }

    // Anos seguidos sem nenhuma especial recebem a anotação "sem especiais".
    const semEspeciais = [];

    especiais.forEach((valor, indice) => {
        const ultimoTrecho = semEspeciais[semEspeciais.length - 1];

        if (valor > 0) {
            return;
        }

        if (ultimoTrecho && ultimoTrecho.indiceFim === indice - 1) {
            ultimoTrecho.indiceFim = indice;
        } else {
            semEspeciais.push({ indice: indice, indiceFim: indice, valor: 0, texto: "sem especiais", cor: COR_TEXTO_SUAVE });
        }
    });

    // Eixo até a dezena acima do pico: com 100%, as diferenças sumiriam.
    const topoDoEixo = Math.min(100, Math.ceil((maior + 5) / 10) * 10);

    // Criar o gráfico (1ª vez) ou atualizar com animação (ver desenharGrafico)
    graficoEspeciais = desenharGrafico(graficoEspeciais, "graficoEspeciais", {
        type: "bar",
        data: {
            labels: nomes,
            datasets: [
                {
                    label: "Especiais",
                    data: especiais,
                    // Todas as barras são especiais (laranja-claro); o pico e a queda
                    // do último ano ficam em laranja forte.
                    backgroundColor: especiais.map((_valor, indice) =>
                        indice === indiceMaior || (caiuNoFim && indice === indiceUltimo)
                            ? COR_ESPECIAIS
                            : COR_ESPECIAIS_CLARO),
                    borderRadius: 2,
                },
            ],
        },
        options: {
            // Espaço no alto para a anotação do pico e à direita para a da queda.
            layout: {
                padding: (contexto) => ({
                    top: 24,
                    right: caiuNoFim ? (contexto.chart.width < 500 ? 116 : 128) : 0,
                }),
            },
            plugins: {
                legend: { display: false },
                rotulos: { itens: rotulos },
                textos: { itens: semEspeciais },
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
                    ticks: { maxTicksLimit: 5, callback: (valor) => `${valor}%` },
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
    const eras = separarPorEra(data);

    return eras.length >= 2 ? [eras[0], eras[eras.length - 1]] : null;
}

function preencherAchados(data) {
    const resumo = resumirPorAno(data);
    const filtros = lerFiltros();
    const achados = [];

    // Resumo final em até 3 linhas, sem repetir os títulos dos gráficos.

    // 1. Por quê: a frase oficial (mesma divisão da pizza). Só vale acima de 50%.
    const decomposicao = calcularDecomposicao(resumo);

    if (!decomposicao.motivo) {
        achados.push(decomposicao.parteEspeciais > 50
            ? criarAchado("Especiais:", "explicam a maior parte do crescimento do HP, mas não todo; " +
                "as normais também cresceram.")
            : criarAchado("Normais:", "explicam a maior parte do crescimento do HP neste filtro."))
    }

    // 2. Recuo depois do pico. Se, com a fatia de especiais do pico, a média do
    // último ano não tivesse caído, a queda vem principalmente da fatia menor.
    if (resumo.length >= 2) {
        const ultimo = resumo[resumo.length - 1];
        const pico = resumo.reduce((maior, item) => (item.hpGeral > maior.hpGeral ? item : maior));

        if (pico.ano < ultimo.ano && ultimo.hpGeral < pico.hpGeral) {
            const temAsDuas = ultimo.hpNormais !== null && ultimo.hpEspeciais !== null && pico.pctEspeciais > 0;
            const fatiaDoPico = pico.pctEspeciais / 100;
            const comFatiaDoPico = temAsDuas
                ? fatiaDoPico * ultimo.hpEspeciais + (1 - fatiaDoPico) * ultimo.hpNormais
                : null;
            const explicacao = comFatiaDoPico !== null && comFatiaDoPico >= pico.hpGeral
                ? `, principalmente porque a fatia de especiais caiu ` +
                  `(${formatarPercentual(pico.pctEspeciais)} → ${formatarPercentual(ultimo.pctEspeciais)})`
                : "";

            achados.push(criarAchado(`Recuo em ${ultimo.ano}${descreverAnoParcial(ultimo.ano)}:`,
                `${formatarDecimal(pico.hpGeral)} → ${formatarDecimal(ultimo.hpGeral)} HP${explicacao}.`));
        }
    }

    // 3. Editora: normais de 2003 nas duas editoras. Só sem filtro de tipo e sem
    // promos, que é a base em que o achado foi validado.
    if (filtros.tipo === "todos" && !filtros.incluirPromos) {
        const normaisDe2003 = (editora) => calcularMedia(obterPokemons(data)
            .filter((carta) => obterAno(carta) === 2003 && carta.editora === editora && !carta.especial)
            .map((carta) => carta.hp));

        const wotc = normaisDe2003("WOTC");
        const tpci = normaisDe2003("TPCI");

        // A frase só é dita quando os números a confirmam (TPCI sem HP maior).
        if (wotc !== null && tpci !== null && tpci <= wotc) {
            achados.push(criarAchado("Editora:", `em 2003, normais com ${formatarDecimal(wotc)} HP (WOTC) e ` +
                `${formatarDecimal(tpci)} (TPCI); a troca não coincide com aumento de HP.`));
        }
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
// Anotações desenhadas nos gráficos
// ===================================
// O Chart.js permite plugins: funções chamadas enquanto ele desenha. Estes
// são pequenos e evitam instalar uma biblioteca de anotações.

// Tela de projetor (1600 px ou mais): letras maiores também dentro dos gráficos.
function ehProjetor() {
    return window.matchMedia("(min-width: 1600px)").matches;
}

function fonteDasAnotacoes(peso) {
    return `${peso} ${ehProjetor() ? 16 : 14}px ${FONTE}`;
}

// Rótulo direto (Knaflic): texto curto, na cor da série, preso a um ponto ou barra.
// Por padrão fica acima do ponto. Com "aDireita", fica depois do fim do eixo X,
// na altura do ponto (ponta das linhas do gráfico 2). Com "aEsquerda", fica à
// esquerda da barra, na altura do topo dela (pico do gráfico 7).
// O texto pode ser uma lista: cada item vira uma linha.
const pluginRotulos = {
    id: "rotulos",
    afterDatasetsDraw(chart, argumentos, opcoes) {
        const { ctx, chartArea } = chart;
        const alturaDaLinha = ehProjetor() ? 19 : 17;

        (opcoes.itens || []).forEach((item) => {
            const elemento = chart.getDatasetMeta(item.serie).data[item.indice];

            if (!elemento) {
                return;
            }

            const estreito = chart.width < 500;

            // Alguns rótulos só cabem em tela larga (ex.: valores do radar).
            if (estreito && item.soEmTelaLarga) {
                return;
            }

            const texto = estreito && item.textoEstreito ? item.textoEstreito : item.texto;
            const linhas = Array.isArray(texto) ? texto : [texto];

            ctx.save();
            ctx.font = fonteDasAnotacoes(700);
            ctx.fillStyle = item.cor;

            if (item.paraOCentro) {
                // Radar: o texto fica um pouco para dentro do ponto, na direção do centro.
                const { xCenter, yCenter } = chart.scales.r;
                const distancia = Math.hypot(xCenter - elemento.x, yCenter - elemento.y) || 1;
                const passo = Math.min(18, distancia / 2);

                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(linhas[0],
                    elemento.x + ((xCenter - elemento.x) / distancia) * passo,
                    elemento.y + ((yCenter - elemento.y) / distancia) * passo);
            } else if (item.aDireita) {
                ctx.textAlign = "left";
                ctx.textBaseline = "middle";
                linhas.forEach((linha, indice) => {
                    ctx.fillText(linha, chartArea.right + 8, elemento.y + indice * alturaDaLinha);
                });
            } else if (item.aEsquerda) {
                const metadeDaBarra = (elemento.width || 0) / 2;

                ctx.textAlign = "right";
                ctx.textBaseline = "top";
                ctx.fillText(linhas[0], elemento.x - metadeDaBarra - 6, elemento.y);
            } else {
                // Mantém o texto dentro da área do gráfico.
                const largura = ctx.measureText(linhas[0]).width;
                const x = Math.min(
                    Math.max(elemento.x, chartArea.left + largura / 2),
                    chartArea.right - largura / 2
                );

                ctx.textAlign = "center";
                ctx.textBaseline = "bottom";
                ctx.fillText(linhas[0], x, elemento.y - 6);
            }

            ctx.restore();
        });
    },
};

// Texto curto preso a anos e a um valor do eixo Y, como "sem especiais".
// Com "indiceFim", o texto cobre um trecho de anos: fica deitado se couber
// na largura do trecho, e em pé (subindo a partir do valor) se não couber.
const pluginTextos = {
    id: "textos",
    afterDatasetsDraw(chart, argumentos, opcoes) {
        const { ctx, scales } = chart;

        (opcoes.itens || []).forEach((item) => {
            const y = scales.y.getPixelForValue(item.valor);

            ctx.save();
            ctx.font = `italic ${fonteDasAnotacoes(400)}`;
            ctx.fillStyle = item.cor;
            ctx.textBaseline = "middle";

            if (item.indiceFim === undefined) {
                ctx.textAlign = "center";
                ctx.fillText(item.texto, scales.x.getPixelForValue(item.indice), y);
                ctx.restore();
                return;
            }

            const inicio = scales.x.getPixelForValue(item.indice);
            const fim = scales.x.getPixelForValue(item.indiceFim);
            const larguraDeUmAno = scales.x.width / chart.data.labels.length;
            const espaco = fim - inicio + larguraDeUmAno;

            if (ctx.measureText(item.texto).width <= espaco) {
                ctx.textAlign = "center";
                ctx.fillText(item.texto, (inicio + fim) / 2, y - 12);
            } else {
                ctx.translate((inicio + fim) / 2, y - 6);
                ctx.rotate(-Math.PI / 2);
                ctx.textAlign = "left";
                ctx.fillText(item.texto, 0, 0);
            }

            ctx.restore();
        });
    },
};

// Rótulo à direita de cada degrau da linha de médias (gráfico 1), como "433/ano".
// O texto começa logo depois do degrau e sobe o quanto for preciso para não
// encostar nas colunas nem no degrau seguinte que ficam embaixo dele.
const pluginDegraus = {
    id: "degraus",
    afterDatasetsDraw(chart, argumentos, opcoes) {
        const { ctx, chartArea } = chart;
        const colunas = chart.getDatasetMeta(0).data;
        const degrau = chart.getDatasetMeta(1).data;

        ctx.save();
        ctx.font = fonteDasAnotacoes(700);
        ctx.fillStyle = COR_ERA_RECENTE;
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";

        (opcoes.itens || []).forEach((item) => {
            const coluna = colunas[item.indice];
            const proxima = colunas[item.indice + 1];

            if (!coluna) {
                return;
            }

            const largura = ctx.measureText(item.texto).width;

            // Última era: o texto fica à direita do degrau, fora das colunas.
            // As outras: na ponta direita do próprio degrau, terminando onde ele sobe.
            const fim = proxima ? (coluna.x + proxima.x) / 2 - 4 : coluna.x + coluna.width / 2 + 6 + largura;
            const inicio = fim - largura;
            let y = degrau[item.indice].y - 4;

            // Colunas que ficam embaixo do texto empurram o texto para cima.
            colunas.forEach((outra) => {
                const cobre = outra.x + outra.width / 2 >= inicio && outra.x - outra.width / 2 <= fim;

                if (cobre) {
                    y = Math.min(y, outra.y - 4);
                }
            });

            ctx.fillText(item.texto, inicio, Math.max(y, chartArea.top + 14));
        });

        ctx.restore();
    },
};

// Rótulo direto fora de cada fatia grande da rosca (nome + %), com um traço
// curto ligando o texto à fatia. Fatias abaixo de "minimo" % ficam sem rótulo.
const pluginRotulosForaDasFatias = {
    id: "rotulosForaDasFatias",
    afterDatasetsDraw(chart, argumentos, opcoes) {
        if (opcoes.minimo === undefined) {
            return;
        }

        const { ctx } = chart;
        const conjunto = chart.data.datasets[0];

        chart.getDatasetMeta(0).data.forEach((fatia, indice) => {
            const valor = conjunto.data[indice];

            if (valor < opcoes.minimo) {
                return;
            }

            const { x, y, outerRadius, startAngle, endAngle } = fatia;
            const angulo = (startAngle + endAngle) / 2;
            const direita = Math.cos(angulo) >= 0;
            const pontaX = x + Math.cos(angulo) * (outerRadius + 10);
            const pontaY = y + Math.sin(angulo) * (outerRadius + 10);

            ctx.save();
            ctx.strokeStyle = COR_NORMAIS;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(angulo) * (outerRadius + 2), y + Math.sin(angulo) * (outerRadius + 2));
            ctx.lineTo(pontaX, pontaY);
            ctx.stroke();

            ctx.fillStyle = COR_TINTA;
            ctx.textAlign = direita ? "left" : "right";
            ctx.textBaseline = "middle";
            ctx.font = fonteDasAnotacoes(600);

            // O texto nunca passa da borda do gráfico (o nome é a linha mais larga).
            const largura = ctx.measureText(chart.data.labels[indice]).width;
            const textoX = direita
                ? Math.min(pontaX + 4, chart.width - largura - 2)
                : Math.max(pontaX - 4, largura + 2);
            ctx.fillText(chart.data.labels[indice], textoX, pontaY - 8);
            ctx.font = fonteDasAnotacoes(400);
            ctx.fillText(formatarPercentual(valor), textoX, pontaY + 9);
            ctx.restore();
        });
    },
};

// Valor escrito na ponta de cada barra horizontal (ranking): dispensa o eixo X.
// Com "destaques", escreve depois do valor um texto em negrito (o ano da coleção);
// com "selos", um selo laranja (o % de especiais da coleção). No celular, o ano
// some e o selo fica curto.
const pluginValoresNasBarras = {
    id: "valoresNasBarras",
    afterDatasetsDraw(chart, argumentos, opcoes) {
        if (!opcoes.formatar) {
            return;
        }

        const { ctx } = chart;
        const valores = chart.data.datasets[0].data;
        const estreito = chart.width < 500;
        const alturaDoSelo = ehProjetor() ? 22 : 20;

        ctx.save();
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";

        chart.getDatasetMeta(0).data.forEach((barra, indice) => {
            // No celular, o nome da coleção vai em cima da barra, alinhado à esquerda.
            if (estreito && opcoes.nomesEmCima) {
                ctx.fillStyle = COR_TINTA;
                ctx.font = fonteDasAnotacoes(600);
                ctx.textBaseline = "bottom";
                // Contorno branco: a linha tracejada da média não atravessa o nome.
                ctx.strokeStyle = COR_PAINEL;
                ctx.lineWidth = 4;
                ctx.strokeText(opcoes.nomesEmCima[indice], chart.chartArea.left, barra.y - barra.height / 2 - 2);
                ctx.fillText(opcoes.nomesEmCima[indice], chart.chartArea.left, barra.y - barra.height / 2 - 2);
                ctx.textBaseline = "middle";
            }

            let x = barra.x + 6;
            const texto = opcoes.formatar(valores[indice], chart);

            ctx.fillStyle = COR_TINTA;
            ctx.font = fonteDasAnotacoes(400);
            ctx.fillText(texto, x, barra.y);
            x += ctx.measureText(texto).width + 8;

            if (opcoes.destaques && !estreito) {
                ctx.font = fonteDasAnotacoes(700);
                ctx.fillText(opcoes.destaques[indice], x, barra.y);
                x += ctx.measureText(opcoes.destaques[indice]).width + 10;
            }

            if (opcoes.selos) {
                const selo = estreito ? opcoes.selosCurtos[indice] : opcoes.selos[indice];

                ctx.font = fonteDasAnotacoes(700);
                const largura = ctx.measureText(selo).width + 14;

                ctx.fillStyle = COR_ESPECIAIS;
                ctx.beginPath();
                ctx.roundRect(x, barra.y - alturaDoSelo / 2, largura, alturaDoSelo, alturaDoSelo / 2);
                ctx.fill();
                ctx.fillStyle = "#ffffff";
                ctx.fillText(selo, x + 7, barra.y + 1);
            }
        });

        ctx.restore();
    },
};

// Linha vertical tracejada de referência (ranking: média de todas as coleções),
// com o texto no alto.
const pluginReferencia = {
    id: "referencia",
    beforeDatasetsDraw(chart, argumentos, opcoes) {
        if (opcoes.valor === undefined || opcoes.valor === null) {
            return;
        }

        const { ctx, chartArea, scales } = chart;
        const x = scales.x.getPixelForValue(opcoes.valor);

        ctx.save();
        ctx.strokeStyle = COR_TEXTO_SUAVE;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(x, chartArea.top - 4);
        ctx.lineTo(x, chartArea.bottom);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.font = fonteDasAnotacoes(600);
        ctx.fillStyle = COR_TEXTO_SUAVE;
        ctx.textBaseline = "bottom";

        // Texto curto no celular. Começa na linha e nunca passa das bordas.
        const texto = chart.width < 500 && opcoes.textoCurto ? opcoes.textoCurto : opcoes.texto;
        const largura = ctx.measureText(texto).width;
        const inicio = Math.max(2, Math.min(x + 6, chart.width - largura - 2));

        ctx.textAlign = "left";
        ctx.fillText(texto, inicio, chartArea.top - 6);
        ctx.restore();
    },
};

// Linha vertical tracejada no ano de cada mecânica, com o nome no alto.
const pluginMecanicas = {
    id: "mecanicas",
    beforeDatasetsDraw(chart, argumentos, opcoes) {
        const { ctx, chartArea, scales } = chart;

        // Fim do último nome escrito em cada uma das 2 linhas de nomes.
        const fimDaLinha = [-Infinity, -Infinity];

        (opcoes.marcos || []).forEach((marco) => {
            const x = scales.x.getPixelForValue(marco.indice);

            ctx.save();
            ctx.strokeStyle = COR_NORMAIS_CLARO;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(x, chartArea.top);
            ctx.lineTo(x, chartArea.bottom);
            ctx.stroke();

            // Nome da mecânica acima da área do gráfico: ali não cobre nenhum dado.
            ctx.setLineDash([]);
            ctx.fillStyle = COR_TEXTO_SUAVE;
            ctx.font = fonteDasAnotacoes(600);
            ctx.textAlign = "center";
            ctx.textBaseline = "bottom";

            // Em tela estreita, um nome que encostaria no anterior sobe para a 2ª linha.
            const meiaLargura = ctx.measureText(marco.rotulo).width / 2;
            const linha = x - meiaLargura > fimDaLinha[0] + 6 ? 0 : 1;

            fimDaLinha[linha] = x + meiaLargura;
            ctx.fillText(marco.rotulo, x, chartArea.top - 6 - linha * 18);
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
        const conjunto = chart.data.datasets[0];

        chart.getDatasetMeta(0).data.forEach((fatia, indice) => {
            // Fatias muito finas não têm espaço para texto.
            if (conjunto.data[indice] < 8) {
                return;
            }

            const { x, y } = fatia.tooltipPosition();

            ctx.save();
            // Texto branco no laranja; escuro no cinza, para ter contraste.
            ctx.fillStyle = conjunto.backgroundColor[indice] === COR_ESPECIAIS ? "#ffffff" : COR_TINTA;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = fonteDasAnotacoes(600);
            ctx.fillText(chart.data.labels[indice], x, y - 12);
            ctx.font = `700 ${ehProjetor() ? 28 : 20}px ${FONTE}`;
            ctx.fillText(`${Math.round(conjunto.data[indice])}%`, x, y + 12);
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
        ctx.font = `700 ${ehProjetor() ? 22 : 20}px ${FONTE}`;
        ctx.fillText(opcoes.valor, x, y - 9);
        ctx.fillStyle = COR_TEXTO_SUAVE;
        ctx.font = fonteDasAnotacoes(400);
        ctx.fillText(opcoes.rotulo, x, y + 12);
        ctx.restore();
    },
};

// ===================================
// Configuração geral do Chart.js
// ===================================

function configurarChart() {
    Chart.register(pluginRotulos, pluginTextos, pluginDegraus, pluginRotulosForaDasFatias, pluginValoresNasBarras, pluginReferencia, pluginMecanicas, pluginCentro, pluginRotulosNasFatias);

    // maintainAspectRatio: false faz o gráfico ocupar a altura definida no CSS.
    Chart.defaults.maintainAspectRatio = false;
    Chart.defaults.font.family = FONTE;
    // No projetor (tela larga), letras maiores nos gráficos. Mínimo de 14 px.
    Chart.defaults.font.size = ehProjetor() ? 16 : 14;

    // Se a janela passar de um lado para o outro dos 1600 px, as letras mudam junto.
    window.matchMedia("(min-width: 1600px)").addEventListener("change", () => {
        Chart.defaults.font.size = ehProjetor() ? 16 : 14;
        Object.values(Chart.instances).forEach((grafico) => grafico.update("none"));
    });
    Chart.defaults.color = COR_TEXTO_SUAVE;

    // Ao trocar um filtro, os gráficos animam do valor antigo para o novo em
    // 500 ms (ver desenharGrafico). Quem pede menos movimento no sistema não
    // vê animação nenhuma.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        Chart.defaults.animation = false;
    } else {
        Chart.defaults.animation.duration = 500;
        Chart.defaults.animation.easing = "easeOutQuart";
    }

    // Knaflic: sem bordas nos eixos. A grade horizontal (bem clara) é definida em cada gráfico.
    Chart.defaults.scale.border.display = false;

    // Anos na horizontal: sem espaço, o Chart.js pula alguns em vez de inclinar.
    Chart.defaults.scale.ticks.maxRotation = 0;

    // Tooltip escuro e discreto.
    Chart.defaults.plugins.tooltip.backgroundColor = COR_TINTA;
    Chart.defaults.plugins.tooltip.cornerRadius = 6;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.titleFont = { family: FONTE, weight: "600" };
    Chart.defaults.plugins.tooltip.bodyFont = { family: FONTE };
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
            // Os gráficos medem os rótulos com a fonte da página: esperamos ela carregar.
            await document.fonts.ready;

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
