document.addEventListener("DOMContentLoaded", function () {
    iniciarMediaMovimentacao();
});

/* =========================================================
   ESTADO
========================================================= */

let movimentacoesExtrato = [];
let movimentacoesConsideradas = [];
let movimentacoesExcluidas = [];

let primeiraDataExtrato = null;
let ultimaDataExtrato = null;

let primeiraDataExtratoAutomatica = null;
let ultimaDataExtratoAutomatica = null;
let mesesDetectadosAutomaticos = 0;

let formatoDataExtrato = "BR";

const historicosExcluidosManualmente = new Set();
const historicosIncluidosManualmente = new Set();

/* =========================================================
   REGRAS DE EXCLUSÃO
========================================================= */

const REGRAS_EXCLUSAO_MOVIMENTACAO = [
    {
        id: "cred-emprestimo",
        rotulo: "CRÉD. EMPRÉSTIMO",
        motivo: "Empréstimo é dívida e não renda.",
        ignorarPeriodo: false,
        testar: function (historico) {
            return historico.includes("CRED EMPRESTIMO") ||
                historico.includes("CREDITO EMPRESTIMO");
        }
    },
    {
        id: "cred-liberacao-td",
        rotulo: "CRÉD. LIBERAÇÃO TD",
        motivo: "Antecipação de recebíveis não é considerada renda.",
        ignorarPeriodo: false,
        testar: function (historico) {
            return historico.includes("CRED LIBERACAO TD") ||
                historico.includes("CREDITO LIBERACAO TD") ||
                historico.includes("TITULO DESCONTADO");
        }
    },
    {
        id: "cred-liberacao-bndes",
        rotulo: "CRÉD. LIBERAÇÃO BNDES",
        motivo: "Liberação de empréstimo junto ao BNDES não é renda.",
        ignorarPeriodo: false,
        testar: function (historico) {
            return historico.includes("CRED LIBERACAO BNDES") ||
                historico.includes("CREDITO LIBERACAO BNDES");
        }
    },
    {
        id: "cred-liberacao-cartao",
        rotulo: "CRÉD. LIBERAÇÃO TÍTULO REC. CARTÃO",
        motivo: "Movimentação desconsiderada conforme regra definida.",
        ignorarPeriodo: false,
        testar: function (historico) {
            return historico.includes("CRED LIBERACAO TITULO REC CARTAO") ||
                historico.includes("CREDITO LIBERACAO TITULO REC CARTAO") ||
                historico.includes("LIBERACAO TITULO REC CARTAO");
        }
    },
    {
        id: "devolucao-pix",
        rotulo: "CRÉDITO DEVOLUÇÃO PIX",
        motivo: "Devolução não é renda.",
        ignorarPeriodo: false,
        testar: function (historico) {
            return historico.includes("CRED DEVOLUCAO PIX") ||
                historico.includes("CREDITO DEVOLUCAO PIX") ||
                historico.includes("DEVOLUCAO PIX");
        }
    },
    {
        id: "credito-resgate-pontos",
        rotulo: "CRÉDITO RESGATE PONTOS",
        motivo: "Resgate de pontos não representa renda.",
        ignorarPeriodo: false,
        testar: function (historico) {
            return historico.includes("CREDITO RESGATE PONTOS") ||
                historico.includes("CRED RESGATE PONTOS") ||
                (
                    historico.includes("COOPERA") &&
                    historico.includes("RESGATE PONTOS")
                );
        }
    },
    {
        id: "est-pix-outra-if",
        rotulo: "EST. PIX EMITIDO OUTRA IF - MESMA TIT.",
        motivo: "Estorno não é renda.",
        ignorarPeriodo: false,
        testar: function (historico) {
            return historico.includes("EST PIX EMITIDO OUTRA IF") &&
                historico.includes("MESMA TIT");
        }
    },
    {
        id: "estorno-compra-mastercard",
        rotulo: "ESTORNO COMPRA NACIONAL DEBIT MASTERCARD",
        motivo: "Estorno não é renda.",
        ignorarPeriodo: false,
        testar: function (historico) {
            return historico.includes("ESTORNO COMPRA NACIONAL DEBIT MASTERCARD");
        }
    },
    {
        id: "estorno-deb-convenio",
        rotulo: "ESTORNO DÉB. CONV. DEMAIS EMPRESAS",
        motivo: "Estorno não é renda.",
        ignorarPeriodo: false,
        testar: function (historico) {
            return historico.includes("ESTORNO DEB CONV DEMAIS EMPRESAS") ||
                historico.includes("ESTORNO DEB CONV DEMAIS EMPRESA");
        }
    },
    {
        id: "estorno-generico",
        rotulo: "OUTROS ESTORNOS",
        motivo: "Estornos não representam renda.",
        ignorarPeriodo: false,
        testar: function (historico) {
            return historico.startsWith("ESTORNO ") ||
                historico.startsWith("EST ");
        }
    },
    {
        id: "resgate-rdc",
        rotulo: "RESGATE RDC",
        motivo: "Resgate de aplicação não é renda.",
        ignorarPeriodo: false,
        testar: function (historico) {
            return historico.includes("RESGATE RDC");
        }
    },
    {
        id: "saldo-bloqueado-anterior",
        rotulo: "SALDO BLOQUEADO ANTERIOR",
        motivo: "Linha informativa do extrato.",
        ignorarPeriodo: true,
        testar: function (historico) {
            return historico.includes("SALDO BLOQUEADO ANTERIOR");
        }
    },
    {
        id: "saldo-anterior",
        rotulo: "SALDO ANTERIOR",
        motivo: "Linha informativa do extrato.",
        ignorarPeriodo: true,
        testar: function (historico) {
            return historico.includes("SALDO ANTERIOR") &&
                !historico.includes("SALDO BLOQUEADO ANTERIOR");
        }
    },
    {
        id: "saldo-dia",
        rotulo: "SALDO DO DIA",
        motivo: "Linha informativa do extrato.",
        ignorarPeriodo: true,
        testar: function (historico) {
            return historico.includes("SALDO DO DIA") ||
                historico.includes("SALDO FINAL DO DIA");
        }
    }
];

/* =========================================================
   HISTÓRICOS RECONHECIDOS COMO CRÉDITO
========================================================= */

const PADROES_CREDITO_SEM_INDICADOR = [
    "CRED TED STR",
    "CRED TRANSF CONTAS",
    "CRED TRANSF CONTAS INTERCREDIS",
    "CRED TRANSF",
    "CREDITO TRANSFERENCIA",
    "DEP CHEQUE COOP AG",
    "DEP CHEQUE AG",
    "DEPOSITO CHEQUE AG",
    "DEPOSITO CHEQUE",
    "DEP DINHEIRO",
    "DEPOSITO EM DINHEIRO AG",
    "DEPOSITO EM DINHEIRO",
    "LIBERACAO DE DEPOSITO BLOQUEADO",
    "PIX RECEBIDO",
    "PIX RECEB",
    "TRANSF RECEBIDA",
    "TRANSFERENCIA RECEBIDA",
    "TED RECEBIDA",
    "DOC RECEBIDO",
    "OUTROS CREDITOS",
    "CRED DISTRIBUICAO SOBRAS VALORES"
];

/* =========================================================
   INICIALIZAÇÃO
========================================================= */

function iniciarMediaMovimentacao() {
    configurarEventosMediaMovimentacao();
    limparResultadosMovimentacao();
    renderizarHistoricosExtrato();
}

/* =========================================================
   EVENTOS
========================================================= */

function configurarEventosMediaMovimentacao() {
    const btnProcessar = document.getElementById("btnProcessarMovimentacao");
    const btnLimpar = document.getElementById("btnLimparMovimentacao");
    const btnRecalcular = document.getElementById("btnRecalcularMovimentacao");
    const btnRestaurar = document.getElementById("btnRestaurarPeriodoMovimentacao");

    const primeiraData = document.getElementById("primeiraDataMovimentacao");
    const ultimaData = document.getElementById("ultimaDataMovimentacao");
    const mesesDetectados = document.getElementById("mesesDetectadosMovimentacao");
    const mesesConsiderados = document.getElementById("mesesConsideradosMovimentacao");

    if (btnProcessar) {
        btnProcessar.addEventListener("click", processarMovimentacao);
    }

    if (btnLimpar) {
        btnLimpar.addEventListener("click", limparMediaMovimentacao);
    }

    if (btnRecalcular) {
        btnRecalcular.addEventListener("click", function () {
            if (movimentacoesExtrato.length === 0) {
                return;
            }

            aplicarPeriodoInformadoPeloUsuario({
                recalcularMesesDetectados: false,
                preservarMesesConsiderados: true
            });

            classificarMovimentacoes();
            calcularResultadosMovimentacao();
            renderizarHistoricosExtrato();
            renderizarResultadosMovimentacao();
        });
    }

    if (btnRestaurar) {
        btnRestaurar.addEventListener("click", function () {
            restaurarPeriodoAutomatico();

            if (movimentacoesExtrato.length === 0) {
                return;
            }

            classificarMovimentacoes();
            calcularResultadosMovimentacao();
            renderizarHistoricosExtrato();
            renderizarResultadosMovimentacao();
        });
    }

    [primeiraData, ultimaData].forEach(function (campo) {
        if (!campo) {
            return;
        }

        campo.addEventListener("input", aplicarMascaraDataCampo);

        campo.addEventListener("blur", function () {
            if (movimentacoesExtrato.length === 0) {
                return;
            }

            aplicarPeriodoInformadoPeloUsuario({
                recalcularMesesDetectados: true,
                preservarMesesConsiderados: true
            });

            calcularResultadosMovimentacao();
            renderizarResultadosMovimentacao();
        });
    });

    if (mesesDetectados) {
        mesesDetectados.addEventListener("input", function () {
            normalizarCampoMeses(mesesDetectados, false);

            if (movimentacoesExtrato.length > 0) {
                calcularResultadosMovimentacao();
            }
        });

        mesesDetectados.addEventListener("blur", function () {
            normalizarCampoMeses(mesesDetectados, true);

            if (movimentacoesExtrato.length > 0) {
                calcularResultadosMovimentacao();
            }
        });
    }

    if (mesesConsiderados) {
        mesesConsiderados.addEventListener("input", function () {
            if (movimentacoesExtrato.length > 0) {
                calcularResultadosMovimentacao();
            }
        });

        mesesConsiderados.addEventListener("blur", function () {
            normalizarCampoMeses(mesesConsiderados, true);

            if (movimentacoesExtrato.length > 0) {
                calcularResultadosMovimentacao();
            }
        });
    }
}

/* =========================================================
   PROCESSAMENTO
========================================================= */

function processarMovimentacao() {
    const textarea = document.getElementById("textoExtratoMovimentacao");

    if (!textarea) {
        return;
    }

    const texto = String(textarea.value || "").trim();

    if (!texto) {
        alert("Cole o extrato no campo de texto.");
        return;
    }

    resetarEstadoMovimentacao();

    movimentacoesExtrato = interpretarExtratoMovimentacao(texto);

    if (movimentacoesExtrato.length === 0) {
        limparResultadosMovimentacao();
        renderizarHistoricosExtrato();

        alert("Nenhum lançamento financeiro válido foi identificado no extrato.");
        return;
    }

    identificarPeriodoExtrato();
    classificarMovimentacoes();
    calcularResultadosMovimentacao();
    renderizarHistoricosExtrato();
    renderizarResultadosMovimentacao();
}

function resetarEstadoMovimentacao() {
    movimentacoesExtrato = [];
    movimentacoesConsideradas = [];
    movimentacoesExcluidas = [];

    primeiraDataExtrato = null;
    ultimaDataExtrato = null;

    primeiraDataExtratoAutomatica = null;
    ultimaDataExtratoAutomatica = null;
    mesesDetectadosAutomaticos = 0;

    formatoDataExtrato = "BR";

    historicosExcluidosManualmente.clear();
    historicosIncluidosManualmente.clear();
}

/* =========================================================
   PREPARAÇÃO DO PRIMEIRO BLOCO DO EXTRATO
========================================================= */

function prepararTrechoExtrato(textoOriginal) {
    const linhas = String(textoOriginal || "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n");

    let inicio = 0;

    /*
     * Caso exista cabeçalho SISBR:
     *
     * DATA DOCUMENTO HISTÓRICO VALOR
     *
     * o processamento começa após ele.
     */
    for (let i = 0; i < linhas.length; i++) {
        const normalizada = normalizarTexto(linhas[i]);

        if (
            normalizada.includes("DATA") &&
            normalizada.includes("HISTORICO") &&
            normalizada.includes("VALOR")
        ) {
            inicio = i + 1;
            break;
        }
    }

    const resultado = [];

    let encontrouSaldoAnteriorInicial = false;
    let encontrouMovimentacaoEfetiva = false;

    for (let i = inicio; i < linhas.length; i++) {
        const linha = String(linhas[i] || "");
        const normalizada = normalizarTexto(linha);

        if (!normalizada) {
            resultado.push(linha);
            continue;
        }

        /*
         * Fim tradicional de um extrato.
         */
        if (
            normalizada === "RESUMO" ||
            normalizada.startsWith("RESUMO ") ||
            normalizada.includes("LANCAMENTOS FUTUROS")
        ) {
            break;
        }

        const ehSaldoBloqueadoAnterior =
            normalizada.includes("SALDO BLOQUEADO ANTERIOR");

        const ehSaldoAnterior =
            normalizada.includes("SALDO ANTERIOR") &&
            !ehSaldoBloqueadoAnterior;

        /*
         * O primeiro SALDO ANTERIOR pertence ao bloco atual.
         *
         * Se depois de já termos movimentações efetivas surgir
         * um NOVO SALDO ANTERIOR, significa que começou outro
         * bloco de extrato concatenado.
         */
        if (ehSaldoAnterior) {
            if (
                encontrouSaldoAnteriorInicial &&
                encontrouMovimentacaoEfetiva
            ) {
                break;
            }

            encontrouSaldoAnteriorInicial = true;
        }

        /*
         * Outro cabeçalho depois que o primeiro bloco já começou
         * também significa início de outro bloco.
         */
        if (
            encontrouMovimentacaoEfetiva &&
            normalizada.includes("DATA") &&
            normalizada.includes("HISTORICO") &&
            normalizada.includes("VALOR")
        ) {
            break;
        }

        resultado.push(linha);

        /*
         * Consideramos que o primeiro bloco efetivamente começou
         * quando encontramos uma linha com data + valor que não
         * seja linha de saldo informativo.
         */
        if (
            linhaPareceMovimentacaoFinanceira(linha) &&
            !ehLinhaInformativaPeriodo(normalizada)
        ) {
            encontrouMovimentacaoEfetiva = true;
        }
    }

    return resultado.join("\n");
}

/* =========================================================
   INTERPRETAÇÃO
========================================================= */

function interpretarExtratoMovimentacao(textoOriginal) {
    const texto = prepararTrechoExtrato(textoOriginal);

    const linhas = String(texto || "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n");

    /*
     * O sistema brasileiro continua sendo o padrão.
     *
     * Só muda para M/D/YYYY quando existe evidência
     * inequívoca dentro do próprio primeiro bloco, por exemplo:
     *
     * 7/31/2026
     *
     * pois 31 não pode ser mês.
     */
    formatoDataExtrato = detectarFormatoDataExtrato(linhas);

    const movimentacoes = [];
    let dataCorrente = null;

    linhas.forEach(function (linhaOriginal, indice) {
        const linha = String(linhaOriginal || "").trim();

        if (!linha || deveIgnorarLinhaExtrato(linha)) {
            return;
        }

        let resultado = null;

        if (linha.includes("|")) {
            resultado = interpretarLinhaTabelaExtrato(
                linha,
                dataCorrente,
                indice + 1
            );
        }

        if (!resultado) {
            resultado = interpretarLinhaTextoExtrato(
                linha,
                dataCorrente,
                indice + 1
            );
        }

        if (!resultado) {
            return;
        }

        if (resultado.dataCorrente) {
            dataCorrente = resultado.dataCorrente;
        }

        if (resultado.movimentacao) {
            movimentacoes.push(resultado.movimentacao);
        }
    });

    return movimentacoes;
}

function deveIgnorarLinhaExtrato(linha) {
    const texto = String(linha || "").trim();

    if (!texto) {
        return true;
    }

    if (
        /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/.test(texto)
    ) {
        return true;
    }

    const normalizado = normalizarTexto(texto);

    if (!normalizado) {
        return true;
    }

    if (
        normalizado === "DATA DOCUMENTO HISTORICO VALOR" ||
        normalizado === "DATA HISTORICO VALOR" ||
        normalizado === "DOCUMENTO HISTORICO VALOR"
    ) {
        return true;
    }

    return false;
}

/* =========================================================
   FORMATO DE DATA DO BLOCO
========================================================= */

function detectarFormatoDataExtrato(linhas) {
    let evidenciasBR = 0;
    let evidenciasUS = 0;

    (linhas || []).forEach(function (linha) {
        const match = String(linha || "")
            .trim()
            .match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?=\s|\t|\||$)/);

        if (!match) {
            return;
        }

        const primeiro = Number(match[1]);
        const segundo = Number(match[2]);

        /*
         * 31/07/2026:
         * primeiro > 12 => obrigatoriamente DD/MM.
         */
        if (
            primeiro > 12 &&
            primeiro <= 31 &&
            segundo >= 1 &&
            segundo <= 12
        ) {
            evidenciasBR++;
        }

        /*
         * 7/31/2026:
         * segundo > 12 => obrigatoriamente M/D.
         */
        if (
            segundo > 12 &&
            segundo <= 31 &&
            primeiro >= 1 &&
            primeiro <= 12
        ) {
            evidenciasUS++;
        }
    });

    /*
     * O padrão sempre é brasileiro quando não existe
     * evidência inequívoca em contrário.
     */
    if (evidenciasUS > evidenciasBR) {
        return "US";
    }

    return "BR";
}

function converterDataExtrato(valor) {
    const match = String(valor || "")
        .trim()
        .match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);

    if (!match) {
        return null;
    }

    let primeiro = Number(match[1]);
    let segundo = Number(match[2]);
    let ano = Number(match[3]);

    if (match[3].length === 2) {
        ano += ano >= 70 ? 1900 : 2000;
    }

    let dia = primeiro;
    let mes = segundo;

    if (formatoDataExtrato === "US") {
        mes = primeiro;
        dia = segundo;
    }

    return criarDataValida(dia, mes, ano);
}

/* =========================================================
   LINHA COM PIPE
========================================================= */

function interpretarLinhaTabelaExtrato(linha, dataCorrente, numeroLinha) {
    let texto = String(linha || "").trim();

    if (!texto.includes("|")) {
        return null;
    }

    if (texto.startsWith("|")) {
        texto = texto.substring(1);
    }

    if (texto.endsWith("|")) {
        texto = texto.substring(0, texto.length - 1);
    }

    const colunas = texto
        .split("|")
        .map(function (item) {
            return item.trim();
        });

    if (colunas.length < 3) {
        return null;
    }

    const dataTexto = limparCelulaTexto(colunas[0]);
    const valorTexto = limparCelulaValor(colunas[colunas.length - 1]);

    let documento = "";
    let historico = "";

    if (colunas.length >= 4) {
        documento = limparCelulaTexto(colunas[1]);

        historico = colunas
            .slice(2, colunas.length - 1)
            .map(limparCelulaTexto)
            .filter(Boolean)
            .join(" ");
    } else {
        historico = limparCelulaTexto(colunas[1]);
    }

    if (
        ehCabecalhoTabela(
            dataTexto,
            documento,
            historico,
            valorTexto
        )
    ) {
        return null;
    }

    let dataMovimentacao = null;

    if (validarFormatoDataGenerica(dataTexto)) {
        dataMovimentacao = converterDataExtrato(dataTexto);
    } else if (!dataTexto || ehCelulaVazia(dataTexto)) {
        dataMovimentacao = dataCorrente;
    } else {
        return null;
    }

    const novaDataCorrente = dataMovimentacao || dataCorrente;

    if (!dataMovimentacao || !historico) {
        return {
            dataCorrente: novaDataCorrente,
            movimentacao: null
        };
    }

    const dadosValor = extrairValorIndicador(valorTexto);

    if (!dadosValor) {
        return {
            dataCorrente: novaDataCorrente,
            movimentacao: null
        };
    }

    return {
        dataCorrente: novaDataCorrente,
        movimentacao: criarMovimentacaoExtrato({
            numeroLinha: numeroLinha,
            data: dataMovimentacao,
            documento: documento,
            historico: historico,
            valor: dadosValor.valor,
            indicador: dadosValor.indicador,
            original: linha
        })
    };
}

function ehCabecalhoTabela(data, documento, historico, valor) {
    const combinado = normalizarTexto([
        data,
        documento,
        historico,
        valor
    ].join(" "));

    return combinado.includes("DATA") &&
        combinado.includes("HISTORICO") &&
        combinado.includes("VALOR");
}

/* =========================================================
   LINHA TAB / TEXTO
========================================================= */

function interpretarLinhaTextoExtrato(linha, dataCorrente, numeroLinha) {
    let texto = String(linha || "")
        .replace(/\u00A0/g, " ")
        .trim();

    if (!texto) {
        return null;
    }

    let dataMovimentacao = null;

    const matchData = texto.match(
        /^(\d{1,2}\/\d{1,2}\/\d{2,4})(?=\s|\t|$)/
    );

    if (matchData) {
        dataMovimentacao = converterDataExtrato(matchData[1]);

        if (!dataMovimentacao) {
            return null;
        }

        texto = texto
            .substring(matchData[0].length)
            .trim();
    } else {
        dataMovimentacao = dataCorrente;
    }

    const novaDataCorrente = dataMovimentacao || dataCorrente;

    if (!dataMovimentacao) {
        return null;
    }

    /*
     * Linhas complementares:
     *
     * Pagamento Pix
     * Nome
     * CPF/CNPJ
     *
     * não possuem valor ao final e por isso não viram
     * uma nova movimentação.
     */
    const dadosValor = extrairValorFinalLinha(texto);

    if (!dadosValor) {
        return {
            dataCorrente: novaDataCorrente,
            movimentacao: null
        };
    }

    const dadosDescricao = separarDocumentoHistorico(
        dadosValor.parteDescricao
    );

    if (!dadosDescricao.historico) {
        return {
            dataCorrente: novaDataCorrente,
            movimentacao: null
        };
    }

    return {
        dataCorrente: novaDataCorrente,
        movimentacao: criarMovimentacaoExtrato({
            numeroLinha: numeroLinha,
            data: dataMovimentacao,
            documento: dadosDescricao.documento,
            historico: dadosDescricao.historico,
            valor: dadosValor.valor,
            indicador: dadosValor.indicador,
            original: linha
        })
    };
}

/* =========================================================
   CRIA MOVIMENTAÇÃO
========================================================= */

function criarMovimentacaoExtrato(dados) {
    const historico = limparCelulaTexto(dados.historico);

    return {
        linha: dados.numeroLinha,
        data: dados.data,
        dataTexto: formatarDataBrasileira(dados.data),
        competencia: obterCompetenciaData(dados.data),
        documento: String(dados.documento || "").trim(),
        historico: historico,
        historicoNormalizado: normalizarTexto(historico),
        valor: Math.abs(Number(dados.valor || 0)),
        indicador: String(dados.indicador || "").toUpperCase(),
        original: dados.original || "",
        considerado: false,
        motivo: ""
    };
}

/* =========================================================
   VALORES
========================================================= */

function extrairValorFinalLinha(texto) {
    const valor = limparCelulaValor(texto);

    const regex =
        /(-?\s*(?:R\$\s*)?(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2})\s*([CD*])?\s*$/i;

    const match = valor.match(regex);

    if (!match) {
        return null;
    }

    const numero = converterValorBrasileiro(match[1]);

    if (!Number.isFinite(numero)) {
        return null;
    }

    let indicador = String(match[2] || "").toUpperCase();

    if (!indicador && numero < 0) {
        indicador = "D";
    }

    return {
        valor: Math.abs(numero),
        indicador: indicador,
        parteDescricao: valor
            .substring(0, match.index)
            .trim()
    };
}

function extrairValorIndicador(texto) {
    const valorTexto = limparCelulaValor(texto);

    const match = valorTexto.match(
        /(-?\s*(?:R\$\s*)?(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2})\s*([CD*])?\s*$/i
    );

    if (!match) {
        return null;
    }

    const valor = converterValorBrasileiro(match[1]);

    if (!Number.isFinite(valor)) {
        return null;
    }

    let indicador = String(match[2] || "").toUpperCase();

    if (!indicador && valor < 0) {
        indicador = "D";
    }

    return {
        valor: Math.abs(valor),
        indicador: indicador
    };
}

function converterValorBrasileiro(valor) {
    let texto = String(valor || "")
        .replace(/R\$/gi, "")
        .replace(/\s/g, "")
        .trim();

    if (!texto) {
        return NaN;
    }

    if (texto.includes(",")) {
        texto = texto
            .replace(/\./g, "")
            .replace(",", ".");
    } else {
        const pontos = (texto.match(/\./g) || []).length;

        if (pontos > 1) {
            texto = texto.replace(/\./g, "");
        }
    }

    texto = texto.replace(/[^\d.-]/g, "");

    const numero = Number(texto);

    return Number.isFinite(numero)
        ? numero
        : NaN;
}

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );
}

/* =========================================================
   DOCUMENTO E HISTÓRICO
========================================================= */

function separarDocumentoHistorico(texto) {
    const valor = String(texto || "")
        .replace(/\u00A0/g, " ")
        .trim();

    if (!valor) {
        return {
            documento: "",
            historico: ""
        };
    }

    /*
     * Mantemos TAB aqui porque o conteúdo copiado
     * da planilha/extrato utiliza as colunas:
     *
     * DOCUMENTO    HISTÓRICO
     */
    const partesTab = valor
        .split(/\t+/)
        .map(function (item) {
            return item.trim();
        })
        .filter(Boolean);

    if (partesTab.length >= 2) {
        if (pareceDocumento(partesTab[0])) {
            return {
                documento: partesTab[0],
                historico: partesTab.slice(1).join(" ").trim()
            };
        }

        return {
            documento: "",
            historico: partesTab.join(" ").trim()
        };
    }

    const partesEspacos = valor
        .split(/\s{2,}/)
        .map(function (item) {
            return item.trim();
        })
        .filter(Boolean);

    if (partesEspacos.length >= 2) {
        if (pareceDocumento(partesEspacos[0])) {
            return {
                documento: partesEspacos[0],
                historico: partesEspacos.slice(1).join(" ").trim()
            };
        }

        return {
            documento: "",
            historico: partesEspacos.join(" ").trim()
        };
    }

    const matchDocumento = valor.match(
        /^([0-9A-Z./-]{1,30})\s+(.+)$/i
    );

    if (
        matchDocumento &&
        pareceDocumento(matchDocumento[1])
    ) {
        return {
            documento: matchDocumento[1],
            historico: matchDocumento[2].trim()
        };
    }

    return {
        documento: "",
        historico: valor
    };
}

function pareceDocumento(valor) {
    const texto = String(valor || "").trim();

    if (!texto || texto.length > 30) {
        return false;
    }

    if (/^\d+$/.test(texto)) {
        return true;
    }

    if (/^\d+[./-]\d+/.test(texto)) {
        return true;
    }

    if (/^[A-Z]{0,5}\d+[A-Z0-9./-]*$/i.test(texto)) {
        return true;
    }

    if (/^(PIX|TITULO|PAGAMENTO|MASTERCARD)$/i.test(texto)) {
        return true;
    }

    return false;
}

/* =========================================================
   LIMPEZA
========================================================= */

function limparCelulaTexto(texto) {
    return String(texto || "")
        .replace(/\u00A0/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/\\([*_])/g, "$1")
        .replace(/\*\*/g, "")
        .replace(/__/g, "")
        .replace(/^\s*[*_]+\s*/, "")
        .replace(/\s*[*_]+\s*$/, "")
        .replace(/\s+/g, " ")
        .trim();
}

function limparCelulaValor(texto) {
    const marcador = "__ASTERISCO_INDICADOR__";

    let valor = String(texto || "")
        .replace(/\u00A0/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/\\\*/g, marcador)
        .replace(/\*\*/g, "")
        .replace(/__/g, "")
        .trim();

    return valor
        .replace(new RegExp(marcador, "g"), "*")
        .trim();
}

function ehCelulaVazia(texto) {
    return !String(texto || "")
        .replace(/\u00A0/g, "")
        .trim();
}

/* =========================================================
   IDENTIFICAÇÃO DO PERÍODO
========================================================= */

function identificarPeriodoExtrato() {
    const movimentacoesPeriodo = movimentacoesExtrato.filter(
        function (movimentacao) {
            return possuiDataValida(movimentacao.data) &&
                !deveIgnorarMovimentacaoNaDeteccaoPeriodo(movimentacao);
        }
    );

    if (movimentacoesPeriodo.length === 0) {
        primeiraDataExtrato = null;
        ultimaDataExtrato = null;

        primeiraDataExtratoAutomatica = null;
        ultimaDataExtratoAutomatica = null;
        mesesDetectadosAutomaticos = 0;

        definirValorCampo("primeiraDataMovimentacao", "");
        definirValorCampo("ultimaDataMovimentacao", "");
        definirValorCampo("mesesDetectadosMovimentacao", "");
        definirValorCampo("mesesConsideradosMovimentacao", "");
        return;
    }

    const timestamps = movimentacoesPeriodo.map(
        function (movimentacao) {
            return movimentacao.data.getTime();
        }
    );

    primeiraDataExtrato = new Date(
        Math.min.apply(null, timestamps)
    );

    ultimaDataExtrato = new Date(
        Math.max.apply(null, timestamps)
    );

    primeiraDataExtratoAutomatica =
        new Date(primeiraDataExtrato.getTime());

    ultimaDataExtratoAutomatica =
        new Date(ultimaDataExtrato.getTime());

    mesesDetectadosAutomaticos =
        calcularQuantidadeMesesPeriodo(
            primeiraDataExtrato,
            ultimaDataExtrato
        );

    atualizarExibicaoPeriodo();

    definirValorCampo(
        "mesesDetectadosMovimentacao",
        mesesDetectadosAutomaticos || ""
    );

    definirValorCampo(
        "mesesConsideradosMovimentacao",
        mesesDetectadosAutomaticos || ""
    );
}

function deveIgnorarMovimentacaoNaDeteccaoPeriodo(movimentacao) {
    if (
        !movimentacao ||
        !movimentacao.historicoNormalizado
    ) {
        return true;
    }

    const regra = localizarRegraExclusao(
        movimentacao.historicoNormalizado
    );

    return Boolean(
        regra &&
        regra.ignorarPeriodo === true
    );
}

/* =========================================================
   CLASSIFICAÇÃO
========================================================= */

function classificarMovimentacoes() {
    movimentacoesConsideradas = [];
    movimentacoesExcluidas = [];

    movimentacoesExtrato.forEach(function (movimentacao) {
        const classificacao =
            classificarMovimentacao(movimentacao);

        movimentacao.considerado =
            classificacao.considerado;

        movimentacao.motivo =
            classificacao.motivo;

        if (classificacao.considerado) {
            movimentacoesConsideradas.push(movimentacao);
        } else {
            movimentacoesExcluidas.push(movimentacao);
        }
    });
}

function classificarMovimentacao(movimentacao) {
    const historico = movimentacao.historicoNormalizado;

    const regraExclusao =
        localizarRegraExclusao(historico);

    /*
     * Uma regra automática começa marcada.
     *
     * Porém o usuário pode desmarcá-la.
     */
    const inclusaoManual =
        historicosIncluidosManualmente.has(historico);

    if (
        regraExclusao &&
        !inclusaoManual
    ) {
        return {
            considerado: false,
            motivo: regraExclusao.rotulo
        };
    }

    if (movimentacao.indicador === "D") {
        return {
            considerado: false,
            motivo: "Débito"
        };
    }

    if (movimentacao.indicador === "*") {
        return {
            considerado: false,
            motivo: "Valor bloqueado/informativo"
        };
    }

    if (
        historicosExcluidosManualmente.has(historico)
    ) {
        return {
            considerado: false,
            motivo: "Histórico excluído manualmente"
        };
    }

    if (movimentacao.indicador === "C") {
        return {
            considerado: true,
            motivo: "Crédito identificado pelo indicador C"
        };
    }

    if (identificarCreditoSemIndicador(historico)) {
        return {
            considerado: true,
            motivo: "Crédito identificado pelo histórico"
        };
    }

    return {
        considerado: false,
        motivo: "Sem identificação segura como crédito"
    };
}

function localizarRegraExclusao(historicoNormalizado) {
    const historico = String(historicoNormalizado || "");

    for (const regra of REGRAS_EXCLUSAO_MOVIMENTACAO) {
        if (regra.testar(historico)) {
            return regra;
        }
    }

    return null;
}

function identificarCreditoSemIndicador(historico) {
    const valor = String(historico || "");

    return PADROES_CREDITO_SEM_INDICADOR.some(
        function (padrao) {
            return valor.includes(
                normalizarTexto(padrao)
            );
        }
    );
}

function ehCreditoPotencial(movimentacao) {
    if (!movimentacao) {
        return false;
    }

    const regra = localizarRegraExclusao(
        movimentacao.historicoNormalizado
    );

    if (
        regra &&
        regra.ignorarPeriodo
    ) {
        return false;
    }

    if (
        movimentacao.indicador === "D" ||
        movimentacao.indicador === "*"
    ) {
        return false;
    }

    if (movimentacao.indicador === "C") {
        return true;
    }

    return identificarCreditoSemIndicador(
        movimentacao.historicoNormalizado
    );
}

/* =========================================================
   HISTÓRICOS / CHECKBOXES
========================================================= */

function renderizarHistoricosExtrato() {
    const container = document.getElementById(
        "listaRegrasMovimentacao"
    );

    const resumo = document.getElementById(
        "resumoRegrasMovimentacao"
    );

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (movimentacoesExtrato.length === 0) {
        if (resumo) {
            resumo.textContent =
                "Processe um extrato para visualizar os históricos encontrados.";
        }

        const vazio = document.createElement("div");
        vazio.className = "sem-dados";
        vazio.textContent = "Nenhum histórico identificado.";

        container.appendChild(vazio);
        return;
    }

    const historicos = agruparHistoricosExtrato();

    if (resumo) {
        resumo.textContent =
            historicos.length +
            " histórico(s) diferente(s) identificado(s) em " +
            movimentacoesExtrato.length +
            " lançamento(s). Os históricos sugeridos para exclusão já aparecem marcados, mas todos podem ser alterados manualmente.";
    }

    historicos.forEach(function (grupo, indice) {
        const regraAutomatica =
            localizarRegraExclusao(grupo.normalizado);

        const exclusaoManual =
            historicosExcluidosManualmente.has(
                grupo.normalizado
            );

        const inclusaoManual =
            historicosIncluidosManualmente.has(
                grupo.normalizado
            );

        /*
         * Regra automática:
         * checked por padrão.
         *
         * Regra não automática:
         * unchecked por padrão.
         */
        const marcado = regraAutomatica
            ? !inclusaoManual
            : exclusaoManual;

        let status = "";

        if (regraAutomatica) {
            status =
                "Sugestão automática de exclusão: " +
                regraAutomatica.motivo +
                " · pode ser alterada manualmente";
        } else if (grupo.creditosPotenciais > 0) {
            status =
                grupo.creditosPotenciais +
                " crédito(s) identificado(s) · marque para excluir";
        } else if (grupo.debitos > 0) {
            status =
                grupo.debitos +
                " débito(s) identificado(s) · marcação livre";
        } else {
            status =
                "Movimentação informativa · marcação livre";
        }

        const label = document.createElement("label");

        label.className =
            "opcao-simulacao regra-movimentacao-item";

        if (regraAutomatica) {
            label.classList.add(
                "regra-movimentacao-automatica"
            );
        }

        label.innerHTML = `
            <input
                type="checkbox"
                id="historico-movimentacao-${indice}"
                ${marcado ? "checked" : ""}
                aria-label="${escaparHtml(grupo.historico)}"
            >
            <span class="opcao-simulacao-conteudo">
                <strong>${escaparHtml(grupo.historico)}</strong>
                <small>
                    ${escaparHtml(status)}
                    · ${grupo.quantidade} ocorrência(s)
                </small>
            </span>
        `;

        const checkbox =
            label.querySelector("input[type='checkbox']");

        /*
         * IMPORTANTE:
         * não existe disabled.
         */
        if (checkbox) {
            checkbox.disabled = false;

            checkbox.addEventListener(
                "change",
                function () {
                    if (regraAutomatica) {
                        if (checkbox.checked) {
                            historicosIncluidosManualmente.delete(
                                grupo.normalizado
                            );
                        } else {
                            /*
                             * Desmarcou uma exclusão automática:
                             * usuário quer liberar esse histórico.
                             */
                            historicosIncluidosManualmente.add(
                                grupo.normalizado
                            );
                        }
                    } else {
                        if (checkbox.checked) {
                            historicosExcluidosManualmente.add(
                                grupo.normalizado
                            );
                        } else {
                            historicosExcluidosManualmente.delete(
                                grupo.normalizado
                            );
                        }
                    }

                    classificarMovimentacoes();
                    calcularResultadosMovimentacao();
                    renderizarResultadosMovimentacao();
                }
            );
        }

        container.appendChild(label);
    });
}

function agruparHistoricosExtrato() {
    const mapa = new Map();

    movimentacoesExtrato.forEach(function (movimentacao) {
        const chave = movimentacao.historicoNormalizado;

        if (!chave) {
            return;
        }

        if (!mapa.has(chave)) {
            mapa.set(
                chave,
                {
                    normalizado: chave,
                    historico: movimentacao.historico,
                    quantidade: 0,
                    creditosPotenciais: 0,
                    debitos: 0,
                    informativos: 0
                }
            );
        }

        const grupo = mapa.get(chave);

        grupo.quantidade++;

        const regra =
            localizarRegraExclusao(chave);

        if (
            regra &&
            regra.ignorarPeriodo
        ) {
            grupo.informativos++;
        } else if (ehCreditoPotencial(movimentacao)) {
            grupo.creditosPotenciais++;
        } else if (movimentacao.indicador === "D") {
            grupo.debitos++;
        } else {
            grupo.informativos++;
        }
    });

    return Array.from(mapa.values()).sort(
        function (a, b) {
            return a.historico.localeCompare(
                b.historico,
                "pt-BR",
                {
                    sensitivity: "base"
                }
            );
        }
    );
}

function renderizarRegrasMovimentacao() {
    renderizarHistoricosExtrato();
}

/* =========================================================
   CÁLCULO
========================================================= */

function calcularResultadosMovimentacao() {
    const total = movimentacoesConsideradas.reduce(
        function (acumulado, movimentacao) {
            return acumulado + movimentacao.valor;
        },
        0
    );

    let mesesDetectados =
        obterNumeroCampo("mesesDetectadosMovimentacao");

    if (
        !Number.isFinite(mesesDetectados) ||
        mesesDetectados <= 0
    ) {
        mesesDetectados =
            calcularQuantidadeMesesPeriodo(
                primeiraDataExtrato,
                ultimaDataExtrato
            );
    }

    let mesesConsiderados =
        obterNumeroCampo("mesesConsideradosMovimentacao");

    if (
        !Number.isFinite(mesesConsiderados) ||
        mesesConsiderados <= 0
    ) {
        mesesConsiderados = mesesDetectados;
    }

    mesesConsiderados = Math.max(
        0,
        Math.trunc(mesesConsiderados)
    );

    const media = mesesConsiderados > 0
        ? total / mesesConsiderados
        : 0;

    definirTexto(
        "resultadoMediaMovimentacao",
        formatarMoeda(media)
    );

    definirTexto(
        "resultadoTotalMovimentacao",
        formatarMoeda(total)
    );

    definirTexto(
        "resultadoMesesMovimentacao",
        String(mesesConsiderados || 0)
    );

    definirTexto(
        "resultadoQtdConsiderados",
        String(movimentacoesConsideradas.length)
    );

    definirTexto(
        "resultadoQtdExcluidos",
        String(movimentacoesExcluidas.length)
    );
}

/* =========================================================
   PERÍODO EDITÁVEL
========================================================= */

function aplicarMascaraDataCampo(evento) {
    const campo = evento && evento.target
        ? evento.target
        : null;

    if (!campo) {
        return;
    }

    const numeros = String(campo.value || "")
        .replace(/\D/g, "")
        .slice(0, 8);

    let valor = numeros;

    if (numeros.length > 4) {
        valor =
            numeros.slice(0, 2) +
            "/" +
            numeros.slice(2, 4) +
            "/" +
            numeros.slice(4);
    } else if (numeros.length > 2) {
        valor =
            numeros.slice(0, 2) +
            "/" +
            numeros.slice(2);
    }

    campo.value = valor;
}

function aplicarPeriodoInformadoPeloUsuario(opcoes) {
    const configuracao = Object.assign(
        {
            recalcularMesesDetectados: false,
            preservarMesesConsiderados: true
        },
        opcoes || {}
    );

    const campoPrimeira =
        document.getElementById("primeiraDataMovimentacao");

    const campoUltima =
        document.getElementById("ultimaDataMovimentacao");

    const campoMesesDetectados =
        document.getElementById("mesesDetectadosMovimentacao");

    const campoMesesConsiderados =
        document.getElementById("mesesConsideradosMovimentacao");

    const primeiraInformada = campoPrimeira
        ? converterDataBrasileira(campoPrimeira.value)
        : null;

    const ultimaInformada = campoUltima
        ? converterDataBrasileira(campoUltima.value)
        : null;

    if (primeiraInformada) {
        primeiraDataExtrato = primeiraInformada;
    }

    if (ultimaInformada) {
        ultimaDataExtrato = ultimaInformada;
    }

    if (
        possuiDataValida(primeiraDataExtrato) &&
        possuiDataValida(ultimaDataExtrato) &&
        primeiraDataExtrato.getTime() >
        ultimaDataExtrato.getTime()
    ) {
        const temporaria = primeiraDataExtrato;

        primeiraDataExtrato = ultimaDataExtrato;
        ultimaDataExtrato = temporaria;
    }

    atualizarExibicaoPeriodo();

    if (configuracao.recalcularMesesDetectados) {
        const meses =
            calcularQuantidadeMesesPeriodo(
                primeiraDataExtrato,
                ultimaDataExtrato
            );

        if (campoMesesDetectados) {
            campoMesesDetectados.value =
                meses > 0
                    ? String(meses)
                    : "";
        }

        if (
            !configuracao.preservarMesesConsiderados &&
            campoMesesConsiderados
        ) {
            campoMesesConsiderados.value =
                meses > 0
                    ? String(meses)
                    : "";
        }
    }
}

function restaurarPeriodoAutomatico() {
    primeiraDataExtrato =
        possuiDataValida(primeiraDataExtratoAutomatica)
            ? new Date(primeiraDataExtratoAutomatica.getTime())
            : null;

    ultimaDataExtrato =
        possuiDataValida(ultimaDataExtratoAutomatica)
            ? new Date(ultimaDataExtratoAutomatica.getTime())
            : null;

    atualizarExibicaoPeriodo();

    definirValorCampo(
        "mesesDetectadosMovimentacao",
        mesesDetectadosAutomaticos || ""
    );

    definirValorCampo(
        "mesesConsideradosMovimentacao",
        mesesDetectadosAutomaticos || ""
    );
}

function atualizarExibicaoPeriodo() {
    definirValorCampo(
        "primeiraDataMovimentacao",
        primeiraDataExtrato
            ? formatarDataBrasileira(primeiraDataExtrato)
            : ""
    );

    definirValorCampo(
        "ultimaDataMovimentacao",
        ultimaDataExtrato
            ? formatarDataBrasileira(ultimaDataExtrato)
            : ""
    );
}

function calcularQuantidadeMesesPeriodo(dataInicial, dataFinal) {
    if (
        !possuiDataValida(dataInicial) ||
        !possuiDataValida(dataFinal)
    ) {
        return 0;
    }

    let inicial = new Date(dataInicial.getTime());
    let final = new Date(dataFinal.getTime());

    if (inicial.getTime() > final.getTime()) {
        const temporaria = inicial;
        inicial = final;
        final = temporaria;
    }

    return (
        (final.getFullYear() - inicial.getFullYear()) * 12 +
        (final.getMonth() - inicial.getMonth()) +
        1
    );
}

function normalizarCampoMeses(campo, limparInvalido) {
    if (!campo) {
        return;
    }

    const texto = String(campo.value || "").trim();

    if (!texto) {
        return;
    }

    const numero = Number(texto);

    if (
        !Number.isFinite(numero) ||
        numero <= 0
    ) {
        if (limparInvalido) {
            campo.value = "";
        }

        return;
    }

    campo.value = String(
        Math.max(1, Math.trunc(numero))
    );
}

/* =========================================================
   RESUMO MENSAL
========================================================= */

function renderizarResultadosMovimentacao() {
    renderizarTabelaResumoMensal();
    renderizarTabelaConsideradas();
    renderizarTabelaExcluidas();
}

function renderizarTabelaResumoMensal() {
    const tbody =
        obterTbodyTabela("tabelaResumoMensalMovimentacao");

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    if (
        !possuiDataValida(primeiraDataExtrato) ||
        !possuiDataValida(ultimaDataExtrato)
    ) {
        inserirLinhaSemDados(
            tbody,
            3,
            "Nenhum período válido identificado."
        );

        return;
    }

    const agrupamento = {};

    const competenciasPeriodo =
        gerarCompetenciasPeriodo(
            primeiraDataExtrato,
            ultimaDataExtrato
        );

    competenciasPeriodo.forEach(function (competencia) {
        agrupamento[competencia] = {
            competencia: competencia,
            quantidade: 0,
            total: 0
        };
    });

    movimentacoesConsideradas.forEach(function (movimentacao) {
        const competencia = movimentacao.competencia;

        if (!competencia) {
            return;
        }

        if (!agrupamento[competencia]) {
            agrupamento[competencia] = {
                competencia: competencia,
                quantidade: 0,
                total: 0
            };
        }

        agrupamento[competencia].quantidade++;
        agrupamento[competencia].total += movimentacao.valor;
    });

    Object.keys(agrupamento)
        .sort()
        .forEach(function (competencia) {
            const grupo = agrupamento[competencia];

            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>${escaparHtml(formatarCompetencia(competencia))}</td>
                <td>${grupo.quantidade}</td>
                <td>${formatarMoeda(grupo.total)}</td>
            `;

            tbody.appendChild(tr);
        });
}

function gerarCompetenciasPeriodo(dataInicial, dataFinal) {
    const competencias = [];

    if (
        !possuiDataValida(dataInicial) ||
        !possuiDataValida(dataFinal)
    ) {
        return competencias;
    }

    let inicial = new Date(
        dataInicial.getFullYear(),
        dataInicial.getMonth(),
        1,
        12,
        0,
        0,
        0
    );

    let final = new Date(
        dataFinal.getFullYear(),
        dataFinal.getMonth(),
        1,
        12,
        0,
        0,
        0
    );

    if (inicial.getTime() > final.getTime()) {
        const temporaria = inicial;
        inicial = final;
        final = temporaria;
    }

    const atual = new Date(inicial.getTime());

    while (atual.getTime() <= final.getTime()) {
        competencias.push(
            obterCompetenciaData(atual)
        );

        atual.setMonth(atual.getMonth() + 1);
    }

    return competencias;
}

/* =========================================================
   TABELA CONSIDERADAS
========================================================= */

function renderizarTabelaConsideradas() {
    const tbody =
        obterTbodyTabela("tabelaMovimentacoesConsideradas");

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    if (movimentacoesConsideradas.length === 0) {
        inserirLinhaSemDados(
            tbody,
            5,
            "Nenhuma movimentação de crédito considerada."
        );

        return;
    }

    movimentacoesConsideradas.forEach(function (movimentacao) {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${escaparHtml(movimentacao.dataTexto)}</td>
            <td>${escaparHtml(movimentacao.documento || "-")}</td>
            <td>${escaparHtml(movimentacao.historico)}</td>
            <td>${formatarMoeda(movimentacao.valor)}</td>
            <td>${escaparHtml(
            movimentacao.motivo || "Crédito considerado"
        )}</td>
        `;

        tbody.appendChild(tr);
    });
}

/* =========================================================
   TABELA EXCLUÍDAS
========================================================= */

function renderizarTabelaExcluidas() {
    const tbody =
        obterTbodyTabela("tabelaMovimentacoesExcluidas");

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    if (movimentacoesExcluidas.length === 0) {
        inserirLinhaSemDados(
            tbody,
            5,
            "Nenhuma movimentação desconsiderada."
        );

        return;
    }

    movimentacoesExcluidas.forEach(function (movimentacao) {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${escaparHtml(movimentacao.dataTexto)}</td>
            <td>${escaparHtml(movimentacao.documento || "-")}</td>
            <td>${escaparHtml(movimentacao.historico)}</td>
            <td>${formatarMoeda(movimentacao.valor)}</td>
            <td>${escaparHtml(movimentacao.motivo)}</td>
        `;

        tbody.appendChild(tr);
    });
}

/* =========================================================
   DATAS
========================================================= */

function validarFormatoDataGenerica(valor) {
    return /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(
        String(valor || "").trim()
    );
}

function converterDataBrasileira(valor) {
    const match = String(valor || "")
        .trim()
        .match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);

    if (!match) {
        return null;
    }

    const dia = Number(match[1]);
    const mes = Number(match[2]);

    let ano = Number(match[3]);

    if (match[3].length === 2) {
        ano += ano >= 70
            ? 1900
            : 2000;
    }

    return criarDataValida(
        dia,
        mes,
        ano
    );
}

function criarDataValida(dia, mes, ano) {
    if (
        !Number.isInteger(dia) ||
        !Number.isInteger(mes) ||
        !Number.isInteger(ano) ||
        dia < 1 ||
        dia > 31 ||
        mes < 1 ||
        mes > 12 ||
        ano < 1900 ||
        ano > 2200
    ) {
        return null;
    }

    const data = new Date(
        ano,
        mes - 1,
        dia,
        12,
        0,
        0,
        0
    );

    if (
        data.getFullYear() !== ano ||
        data.getMonth() !== mes - 1 ||
        data.getDate() !== dia
    ) {
        return null;
    }

    return data;
}

function possuiDataValida(data) {
    return data instanceof Date &&
        !Number.isNaN(data.getTime());
}

function formatarDataBrasileira(data) {
    if (!possuiDataValida(data)) {
        return "";
    }

    const dia = String(data.getDate()).padStart(2, "0");
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const ano = data.getFullYear();

    return dia + "/" + mes + "/" + ano;
}

function obterCompetenciaData(data) {
    if (!possuiDataValida(data)) {
        return "";
    }

    return (
        data.getFullYear() +
        "-" +
        String(data.getMonth() + 1).padStart(2, "0")
    );
}

function formatarCompetencia(competencia) {
    const partes = String(competencia || "").split("-");

    if (partes.length !== 2) {
        return competencia;
    }

    return partes[1] + "/" + partes[0];
}

/* =========================================================
   RECONHECIMENTO DE LINHAS
========================================================= */

function linhaPareceMovimentacaoFinanceira(linha) {
    const texto = String(linha || "")
        .replace(/\u00A0/g, " ")
        .trim();

    if (!texto) {
        return false;
    }

    if (
        !/^\d{1,2}\/\d{1,2}\/\d{2,4}(?=\s|\t|\||$)/.test(texto)
    ) {
        return false;
    }

    return /-?\s*(?:R\$\s*)?(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2}\s*[CD*]?\s*$/i.test(
        texto
    );
}

function ehLinhaInformativaPeriodo(normalizada) {
    const texto = String(normalizada || "");

    return texto.includes("SALDO BLOQUEADO ANTERIOR") ||
        texto.includes("SALDO ANTERIOR") ||
        texto.includes("SALDO DO DIA") ||
        texto.includes("SALDO FINAL DO DIA");
}

/* =========================================================
   NORMALIZAÇÃO
========================================================= */

function normalizarTexto(texto) {
    return String(texto || "")
        .replace(/\u00A0/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/\*\*/g, "")
        .replace(/__/g, "")
        .replace(/\\([*_])/g, "$1")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/[.,:;()[\]{}]+/g, " ")
        .replace(/[-–—]+/g, " ")
        .replace(/[*_=<>]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/* =========================================================
   LIMPAR
========================================================= */

function limparMediaMovimentacao() {
    resetarEstadoMovimentacao();

    const textarea =
        document.getElementById("textoExtratoMovimentacao");

    if (textarea) {
        textarea.value = "";
    }

    definirValorCampo("primeiraDataMovimentacao", "");
    definirValorCampo("ultimaDataMovimentacao", "");
    definirValorCampo("mesesDetectadosMovimentacao", "");
    definirValorCampo("mesesConsideradosMovimentacao", "");

    limparResultadosMovimentacao();
    renderizarHistoricosExtrato();
}

function limparResultadosMovimentacao() {
    definirTexto(
        "resultadoMediaMovimentacao",
        "R$ 0,00"
    );

    definirTexto(
        "resultadoTotalMovimentacao",
        "R$ 0,00"
    );

    definirTexto(
        "resultadoMesesMovimentacao",
        "0"
    );

    definirTexto(
        "resultadoQtdConsiderados",
        "0"
    );

    definirTexto(
        "resultadoQtdExcluidos",
        "0"
    );

    definirValorCampo(
        "primeiraDataMovimentacao",
        ""
    );

    definirValorCampo(
        "ultimaDataMovimentacao",
        ""
    );

    definirValorCampo(
        "mesesDetectadosMovimentacao",
        ""
    );

    definirValorCampo(
        "mesesConsideradosMovimentacao",
        ""
    );

    const tabelaMensal =
        obterTbodyTabela("tabelaResumoMensalMovimentacao");

    const tabelaConsideradas =
        obterTbodyTabela("tabelaMovimentacoesConsideradas");

    const tabelaExcluidas =
        obterTbodyTabela("tabelaMovimentacoesExcluidas");

    if (tabelaMensal) {
        tabelaMensal.innerHTML = "";

        inserirLinhaSemDados(
            tabelaMensal,
            3,
            "Nenhum extrato processado."
        );
    }

    if (tabelaConsideradas) {
        tabelaConsideradas.innerHTML = "";

        inserirLinhaSemDados(
            tabelaConsideradas,
            5,
            "Nenhum extrato processado."
        );
    }

    if (tabelaExcluidas) {
        tabelaExcluidas.innerHTML = "";

        inserirLinhaSemDados(
            tabelaExcluidas,
            5,
            "Nenhum extrato processado."
        );
    }
}

/* =========================================================
   DOM
========================================================= */

function obterTbodyTabela(id) {
    const elemento = document.getElementById(id);

    if (!elemento) {
        return null;
    }

    if (
        elemento.tagName &&
        elemento.tagName.toUpperCase() === "TBODY"
    ) {
        return elemento;
    }

    if (
        elemento.tagName &&
        elemento.tagName.toUpperCase() === "TABLE"
    ) {
        return elemento.querySelector("tbody");
    }

    return elemento;
}

function definirTexto(id, valor) {
    const elemento = document.getElementById(id);

    if (elemento) {
        elemento.textContent = valor;
    }
}

function definirValorCampo(id, valor) {
    const elemento = document.getElementById(id);

    if (elemento) {
        elemento.value = valor;
    }
}

function obterNumeroCampo(id) {
    const elemento = document.getElementById(id);

    if (!elemento) {
        return 0;
    }

    const numero = Number(elemento.value);

    return Number.isFinite(numero)
        ? numero
        : 0;
}

function inserirLinhaSemDados(tbody, colunas, mensagem) {
    const tr = document.createElement("tr");

    tr.className = "tabela-sem-dados";

    tr.innerHTML = `
        <td colspan="${colunas}" class="sem-dados">
            ${escaparHtml(mensagem)}
        </td>
    `;

    tbody.appendChild(tr);
}

function escaparHtml(texto) {
    return String(texto || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}