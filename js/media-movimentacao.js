"use strict";

document.addEventListener("DOMContentLoaded", iniciarMediaMovimentacao);

let movimentacoesExtrato = [];
let movimentacoesConsideradas = [];
let movimentacoesExcluidas = [];
let primeiraDataExtrato = null;
let ultimaDataExtrato = null;
let primeiraDataExtratoAutomatica = null;
let ultimaDataExtratoAutomatica = null;
let mesesDetectadosAutomaticos = 0;
let competenciasDocumentadasExternas = [];
let formatoDataExtrato = "BR";

const historicosExcluidosManualmente = new Set();
const historicosIncluidosManualmente = new Set();

const REGRAS_EXCLUSAO_MOVIMENTACAO = [
    {
        id: "cred-liberacao-td",
        rotulo: "CRÉD. LIBERAÇÃO TD",
        motivo: "Liberação de título descontado não representa renda.",
        testar: h =>
            h.includes("CRED LIBERACAO TD") ||
            h.includes("CREDITO LIBERACAO TD") ||
            h.includes("TITULO DESCONTADO")
    },
    {
        id: "cred-liberacao-bndes",
        rotulo: "CRÉD. LIBERAÇÃO BNDES",
        motivo: "Liberação de financiamento BNDES não representa renda.",
        testar: h =>
            h.includes("CRED LIBERACAO BNDES") ||
            h.includes("CREDITO LIBERACAO BNDES")
    },
    {
        id: "cred-liberacao-cartao",
        rotulo: "CRÉD. LIBERAÇÃO TÍTULO REC. CARTÃO",
        motivo: "Liberação de recebível de cartão deve ser desconsiderada.",
        testar: h =>
            h.includes("CRED LIBERACAO TITULO REC CARTAO") ||
            h.includes("CREDITO LIBERACAO TITULO REC CARTAO") ||
            h.includes("LIBERACAO TITULO REC CARTAO")
    },
    {
        id: "emprestimo",
        rotulo: "EMPRÉSTIMO / FINANCIAMENTO",
        motivo: "Empréstimo ou financiamento não representa renda.",
        testar: h =>
            /\b(EMPRESTIMO|FINANCIAMENTO|FINANC|CREDITO PESSOAL|CREDITO CONSIGNADO|CAPITAL DE GIRO|LIBERACAO DE CREDITO|LIBERACAO CREDITO)\b/.test(h)
    },
    {
        id: "antecipacao",
        rotulo: "ANTECIPAÇÃO / ADIANTAMENTO",
        motivo: "Antecipação ou adiantamento não representa renda.",
        testar: h =>
            /\b(ANTECIPACAO|ADIANTAMENTO|ADIANTAMENTO A DEPOSITANTE)\b/.test(h)
    },
    {
        id: "limite",
        rotulo: "LIMITE DE CRÉDITO",
        motivo: "Utilização ou liberação de limite não representa renda.",
        testar: h =>
            /\b(CHEQUE ESPECIAL|CREDITO ROTATIVO|LIMITE DE CREDITO)\b/.test(h)
    },
    {
        id: "devolucao-pix",
        rotulo: "CRÉDITO DEVOLUÇÃO PIX",
        motivo: "Devolução de PIX não representa renda.",
        testar: h =>
            h.includes("CRED DEVOLUCAO PIX") ||
            h.includes("CREDITO DEVOLUCAO PIX") ||
            h.includes("DEVOLUCAO PIX")
    },
    {
        id: "cheque-devolvido",
        rotulo: "CHEQUE DEVOLVIDO",
        motivo: "Cheque devolvido não representa renda efetiva.",
        testar: h =>
            h.includes("CHEQUE DEVOLVIDO") ||
            h.includes("CH DEVOLVIDO")
    },
    {
        id: "estorno",
        rotulo: "ESTORNO / DEVOLUÇÃO",
        motivo: "Estorno, devolução ou cancelamento não representa renda.",
        testar: h =>
            /\b(ESTORNO|REVERSAO|CANCELAMENTO|DEVOLUCAO|DEVOLVIDO|REEMBOLSO)\b/.test(h)
    },
    {
        id: "investimento",
        rotulo: "INVESTIMENTO / RESGATE",
        motivo: "Aplicação ou resgate de investimento não representa novo recurso.",
        testar: h =>
            /\b(RDB|RDC|CDB|RESGATE|APLICACAO|INVESTIMENTO|FUNDO DE INVESTIMENTO|POUPANCA RESGATE)\b/.test(h)
    },
    {
        id: "coopera-resgate-pontos",
        rotulo: "COOPERA - RESGATE DE PONTOS",
        motivo: "Resgate de pontos não representa renda.",
        testar: h =>
            h.includes("CREDITO RESGATE PONTOS") ||
            h.includes("CRED RESGATE PONTOS") ||
            (h.includes("COOPERA") && h.includes("RESGATE PONTOS"))
    }
];

const PADROES_CREDITO_SEM_INDICADOR = [
    "PIX RECEBIDO",
    "PIX RECEBIDA",
    "PIX RECEB",
    "CRED TED STR",
    "CRED TRANSF CONTAS",
    "CRED TRANSF CONTAS INTERCREDIS",
    "CRED TRANSF",
    "CREDITO TRANSFERENCIA",
    "TRANSF RECEBIDA",
    "TRANSFERENCIA RECEBIDA",
    "TED RECEBIDA",
    "TED RECEBIDO",
    "DOC RECEBIDO",
    "DOC RECEBIDA",
    "DEP CHEQUE COOP AG",
    "DEP CHEQUE AG",
    "DEPOSITO CHEQUE AG",
    "DEPOSITO CHEQUE",
    "DEP DINHEIRO",
    "DEPOSITO EM DINHEIRO AG",
    "DEPOSITO EM DINHEIRO",
    "LIBERACAO DE DEPOSITO BLOQUEADO",
    "OUTROS CREDITOS",
    "CRED DISTRIBUICAO SOBRAS VALORES",
    "CR COMPRAS",
    "CRED LIQUIDACAO COBRANCA",
    "PAGAMENTO RECEBIDO",
    "RECEBIMENTO"
];

function iniciarMediaMovimentacao() {
    liberarCamposEdicaoMovimentacao();
    configurarEventosMediaMovimentacao();
    limparResultadosMovimentacao();
    renderizarHistoricosExtrato();
}

function configurarEventosMediaMovimentacao() {
    const btnProcessar = document.getElementById("btnProcessarMovimentacao");
    const btnLimpar = document.getElementById("btnLimparMovimentacao");
    const btnRecalcular = document.getElementById("btnRecalcularMovimentacao");
    const btnRestaurar = document.getElementById("btnRestaurarPeriodoMovimentacao");

    if (btnProcessar) btnProcessar.addEventListener("click", processarMovimentacao);
    if (btnLimpar) btnLimpar.addEventListener("click", limparMediaMovimentacao);

    if (btnRecalcular) {
        btnRecalcular.addEventListener("click", function () {
            if (!movimentacoesExtrato.length) return;
            aplicarPeriodoInformadoPeloUsuario();
            classificarMovimentacoes();
            calcularResultadosMovimentacao();
            renderizarHistoricosExtrato();
            renderizarResultadosMovimentacao();
        });
    }

    if (btnRestaurar) {
        btnRestaurar.addEventListener("click", function () {
            restaurarPeriodoAutomatico();
            if (!movimentacoesExtrato.length) return;
            classificarMovimentacoes();
            calcularResultadosMovimentacao();
            renderizarHistoricosExtrato();
            renderizarResultadosMovimentacao();
        });
    }

    ["primeiraDataMovimentacao", "ultimaDataMovimentacao"].forEach(function (id) {
        const campo = document.getElementById(id);
        if (!campo) return;

        campo.addEventListener("input", aplicarMascaraDataCampo);

        campo.addEventListener("blur", function () {
            if (!movimentacoesExtrato.length) return;
            aplicarPeriodoInformadoPeloUsuario({
                recalcularMesesDetectados: true,
                preservarMesesConsiderados: true
            });
            calcularResultadosMovimentacao();
            renderizarResultadosMovimentacao();
        });
    });

    ["mesesDetectadosMovimentacao", "mesesConsideradosMovimentacao"].forEach(function (id) {
        const campo = document.getElementById(id);
        if (!campo) return;

        campo.addEventListener("blur", function () {
            normalizarCampoMeses(campo);
            if (movimentacoesExtrato.length) {
                calcularResultadosMovimentacao();
                renderizarResultadosMovimentacao();
            }
        });
    });
}

function liberarCamposEdicaoMovimentacao() {
    [
        "primeiraDataMovimentacao",
        "ultimaDataMovimentacao",
        "mesesDetectadosMovimentacao",
        "mesesConsideradosMovimentacao"
    ].forEach(function (id) {
        const campo = document.getElementById(id);
        if (!campo) return;
        campo.disabled = false;
        campo.readOnly = false;
        campo.removeAttribute("disabled");
        campo.removeAttribute("readonly");
        campo.style.pointerEvents = "auto";
    });
}

function processarMovimentacao() {
    const textarea = document.getElementById("textoExtratoMovimentacao");
    if (!textarea) return false;

    const texto = String(textarea.value || "").trim();

    if (!texto) {
        alert("Cole o extrato no campo de texto.");
        return false;
    }

    return processarTextoMovimentacao(texto);
}

function processarTextoMovimentacao(texto, opcoes) {
    resetarEstadoMovimentacao();

    if (opcoes && Array.isArray(opcoes.competenciasDocumentadas)) {
        competenciasDocumentadasExternas = Array.from(
            new Set(opcoes.competenciasDocumentadas.filter(Boolean))
        ).sort();
    }

    movimentacoesExtrato = interpretarExtratoMovimentacao(texto);

    if (!movimentacoesExtrato.length) {
        limparResultadosMovimentacao();
        renderizarHistoricosExtrato();
        return false;
    }

    identificarPeriodoExtrato();
    classificarMovimentacoes();
    calcularResultadosMovimentacao();
    renderizarHistoricosExtrato();
    renderizarResultadosMovimentacao();
    liberarCamposEdicaoMovimentacao();

    return true;
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
    competenciasDocumentadasExternas = [];
    formatoDataExtrato = "BR";

    historicosExcluidosManualmente.clear();
    historicosIncluidosManualmente.clear();
}

function interpretarExtratoMovimentacao(textoOriginal) {
    const linhas = String(textoOriginal || "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n");

    formatoDataExtrato = detectarFormatoDataExtrato(linhas);

    const movimentacoes = [];
    let dataCorrente = null;

    linhas.forEach(function (linhaOriginal, indice) {
        const linha = String(linhaOriginal || "").trim();

        if (!linha || deveIgnorarLinhaExtrato(linha)) return;

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

        if (!resultado) return;

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
    const n = normalizarTexto(linha);

    if (!n) return true;

    const padroes = [
        "DATA DOCUMENTO HISTORICO VALOR",
        "DATA HISTORICO VALOR",
        "EXTRATO CONTA CORRENTE",
        "EXTRATO DE CONTA",
        "SISTEMA DE COOPERATIVAS",
        "SISBR SISTEMA",
        "SALDO ANTERIOR",
        "SALDO BLOQUEADO ANTERIOR",
        "SALDO DO DIA",
        "SALDO FINAL",
        "SALDO DISPONIVEL",
        "TOTAL DE CREDITOS",
        "TOTAL CREDITOS",
        "TOTAL DE DEBITOS",
        "TOTAL DEBITOS",
        "LANCAMENTOS FUTUROS"
    ];

    if (n === "RESUMO") return true;

    return padroes.some(p => n.includes(p));
}

function interpretarLinhaTabelaExtrato(linha, dataCorrente, numeroLinha) {
    let texto = String(linha || "").trim();

    if (!texto.includes("|")) return null;

    if (texto.startsWith("|")) texto = texto.slice(1);
    if (texto.endsWith("|")) texto = texto.slice(0, -1);

    const colunas = texto
        .split("|")
        .map(v => String(v || "").trim());

    if (colunas.length < 3) return null;

    const dataTexto = limparCelulaTexto(colunas[0]);

    let dataMovimentacao = validarFormatoDataGenerica(dataTexto)
        ? converterDataExtrato(dataTexto)
        : dataCorrente;

    if (!dataMovimentacao) return null;

    const valorTexto = limparCelulaValor(colunas[colunas.length - 1]);
    const dadosValor = extrairValorIndicador(valorTexto);

    if (!dadosValor) {
        return {
            dataCorrente: dataMovimentacao,
            movimentacao: null
        };
    }

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

    if (!historico) {
        return {
            dataCorrente: dataMovimentacao,
            movimentacao: null
        };
    }

    return {
        dataCorrente: dataMovimentacao,
        movimentacao: criarMovimentacaoExtrato({
            numeroLinha,
            data: dataMovimentacao,
            documento,
            historico,
            valor: dadosValor.valor,
            indicador: dadosValor.indicador,
            original: linha
        })
    };
}

function interpretarLinhaTextoExtrato(linha, dataCorrente, numeroLinha) {
    let texto = String(linha || "")
        .replace(/\u00A0/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (!texto) return null;

    let dataMovimentacao = null;

    const correspondenciaData = texto.match(
        /^(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})(?=\s|$)/
    );

    if (correspondenciaData) {
        dataMovimentacao = converterDataExtrato(correspondenciaData[1]);

        if (!dataMovimentacao) return null;

        texto = texto
            .substring(correspondenciaData[0].length)
            .trim();
    } else {
        dataMovimentacao = dataCorrente;
    }

    if (!dataMovimentacao) return null;

    const dadosValor = extrairValorFinalLinha(texto);

    if (!dadosValor) {
        return {
            dataCorrente: dataMovimentacao,
            movimentacao: null
        };
    }

    const dadosDescricao = separarDocumentoHistorico(
        dadosValor.parteDescricao
    );

    if (!dadosDescricao.historico) {
        return {
            dataCorrente: dataMovimentacao,
            movimentacao: null
        };
    }

    return {
        dataCorrente: dataMovimentacao,
        movimentacao: criarMovimentacaoExtrato({
            numeroLinha,
            data: dataMovimentacao,
            documento: dadosDescricao.documento,
            historico: dadosDescricao.historico,
            valor: dadosValor.valor,
            indicador: dadosValor.indicador,
            original: linha
        })
    };
}

function extrairMetadadosLeitura(texto) {
    const original = String(texto || "");

    function obterTag(nome) {
        const regex = new RegExp(
            "\\[" + nome + "\\s*:\\s*([^\\]]+)\\]",
            "i"
        );

        const m = original.match(regex);

        return m
            ? String(m[1] || "").trim()
            : "";
    }

    return {
        decisao: obterTag("DECISAO").toUpperCase(),
        id: obterTag("ID"),
        banco: obterTag("BANCO"),
        arquivo: obterTag("ARQUIVO")
    };
}

function removerMetadadosLeitura(texto) {
    return String(texto || "")
        .replace(/\[(?:DECISAO|ID|BANCO|ARQUIVO)\s*:[^\]]+\]/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function criarMovimentacaoExtrato(dados) {
    const metadados = extrairMetadadosLeitura(
        (dados.original || "") + " " + (dados.historico || "")
    );

    const historico = removerMetadadosLeitura(
        limparCelulaTexto(dados.historico)
    );

    return {
        linha: dados.numeroLinha,
        data: dados.data,
        dataTexto: formatarDataBrasileira(dados.data),
        competencia: obterCompetenciaData(dados.data),
        documento: String(dados.documento || "").trim(),
        historico,
        historicoNormalizado: normalizarTexto(historico),
        valor: Math.abs(Number(dados.valor || 0)),
        indicador: String(dados.indicador || "").toUpperCase(),
        original: dados.original || "",
        banco: metadados.banco,
        arquivo: metadados.arquivo,
        idOrigem: metadados.id,
        decisaoLeitura: metadados.decisao,
        considerado: false,
        motivo: ""
    };
}

function extrairValorFinalLinha(texto) {
    const valor = limparCelulaValor(texto);

    const correspondencia = valor.match(
        /(-?\s*(?:R\$\s*)?(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2})\s*([CD*])?\s*$/i
    );

    if (!correspondencia) return null;

    const numero = converterValorBrasileiro(correspondencia[1]);

    if (!Number.isFinite(numero)) return null;

    let indicador = String(correspondencia[2] || "").toUpperCase();

    if (!indicador && numero < 0) {
        indicador = "D";
    }

    return {
        valor: Math.abs(numero),
        indicador,
        parteDescricao: valor
            .substring(0, correspondencia.index)
            .trim()
    };
}

function extrairValorIndicador(texto) {
    const valor = limparCelulaValor(texto);

    const correspondencia = valor.match(
        /(-?\s*(?:R\$\s*)?(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2})\s*([CD*])?\s*$/i
    );

    if (!correspondencia) return null;

    const numero = converterValorBrasileiro(correspondencia[1]);

    if (!Number.isFinite(numero)) return null;

    let indicador = String(correspondencia[2] || "").toUpperCase();

    if (!indicador && numero < 0) {
        indicador = "D";
    }

    return {
        valor: Math.abs(numero),
        indicador
    };
}

function separarDocumentoHistorico(texto) {
    let valor = limparCelulaTexto(texto);

    if (!valor) {
        return {
            documento: "",
            historico: ""
        };
    }

    const matchDocumento = valor.match(
        /^([A-Z0-9.-]{3,25})\s+(.+)$/
    );

    if (
        matchDocumento &&
        /\d/.test(matchDocumento[1]) &&
        !/^(PIX|TED|DOC|CRED|DEB|DEP)$/i.test(matchDocumento[1])
    ) {
        return {
            documento: matchDocumento[1],
            historico: matchDocumento[2]
        };
    }

    return {
        documento: "",
        historico: valor
    };
}

function classificarMovimentacoes() {
    movimentacoesConsideradas = [];
    movimentacoesExcluidas = [];

    movimentacoesExtrato.forEach(function (m) {
        const classificacao = classificarMovimentacao(m);

        m.considerado = classificacao.considerado;
        m.motivo = classificacao.motivo;

        if (m.considerado) {
            movimentacoesConsideradas.push(m);
        } else {
            movimentacoesExcluidas.push(m);
        }
    });
}

function classificarMovimentacao(m) {
    const historico = m.historicoNormalizado;
    const decisao = String(m.decisaoLeitura || "").toUpperCase();

    if (m.indicador === "D") {
        return {
            considerado: false,
            motivo: "Débito"
        };
    }

    if (m.indicador === "*") {
        return {
            considerado: false,
            motivo: "Valor bloqueado/informativo"
        };
    }

    if (decisao === "EXCLUIR") {
        return {
            considerado: false,
            motivo: "Excluído na conferência da leitura"
        };
    }

    if (decisao === "INCLUIR") {
        return {
            considerado: true,
            motivo: "Crédito confirmado na conferência"
        };
    }

    if (decisao === "DUVIDA") {
        return {
            considerado: false,
            motivo: "Pendente de conferência"
        };
    }

    const regra = localizarRegraExclusao(historico);
    const inclusaoManual = historicosIncluidosManualmente.has(historico);

    if (regra && !inclusaoManual) {
        return {
            considerado: false,
            motivo: regra.rotulo + " - " + regra.motivo
        };
    }

    if (historicosExcluidosManualmente.has(historico)) {
        return {
            considerado: false,
            motivo: "Exclusão manual"
        };
    }

    if (m.indicador === "C") {
        return {
            considerado: true,
            motivo: "Crédito considerado"
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
        motivo: "Movimentação sem identificação segura como crédito"
    };
}

function localizarRegraExclusao(historico) {
    return REGRAS_EXCLUSAO_MOVIMENTACAO.find(
        regra => regra.testar(historico)
    ) || null;
}

function identificarCreditoSemIndicador(historico) {
    return PADROES_CREDITO_SEM_INDICADOR.some(
        padrao => historico.includes(padrao)
    );
}

function identificarPeriodoExtrato() {
    const validas = movimentacoesExtrato.filter(function (m) {
        return m.data instanceof Date &&
            !Number.isNaN(m.data.getTime());
    });

    if (!validas.length) return;

    primeiraDataExtrato = new Date(
        Math.min(...validas.map(m => m.data.getTime()))
    );

    ultimaDataExtrato = new Date(
        Math.max(...validas.map(m => m.data.getTime()))
    );

    primeiraDataExtratoAutomatica = new Date(primeiraDataExtrato);
    ultimaDataExtratoAutomatica = new Date(ultimaDataExtrato);

    if (competenciasDocumentadasExternas.length) {
        mesesDetectadosAutomaticos =
            competenciasDocumentadasExternas.length;
    } else {
        mesesDetectadosAutomaticos =
            calcularMesesInclusivos(
                primeiraDataExtrato,
                ultimaDataExtrato
            );
    }

    definirValorCampo(
        "primeiraDataMovimentacao",
        formatarDataBrasileira(primeiraDataExtrato)
    );

    definirValorCampo(
        "ultimaDataMovimentacao",
        formatarDataBrasileira(ultimaDataExtrato)
    );

    definirValorCampo(
        "mesesDetectadosMovimentacao",
        String(mesesDetectadosAutomaticos)
    );

    definirValorCampo(
        "mesesConsideradosMovimentacao",
        String(mesesDetectadosAutomaticos)
    );
}

function aplicarPeriodoInformadoPeloUsuario(opcoes) {
    opcoes = opcoes || {};

    const inicio = converterDataExtrato(
        obterValorCampo("primeiraDataMovimentacao")
    );

    const fim = converterDataExtrato(
        obterValorCampo("ultimaDataMovimentacao")
    );

    if (inicio) primeiraDataExtrato = inicio;
    if (fim) ultimaDataExtrato = fim;

    if (
        opcoes.recalcularMesesDetectados &&
        inicio &&
        fim
    ) {
        const meses = calcularMesesInclusivos(inicio, fim);

        definirValorCampo(
            "mesesDetectadosMovimentacao",
            String(meses)
        );

        if (!opcoes.preservarMesesConsiderados) {
            definirValorCampo(
                "mesesConsideradosMovimentacao",
                String(meses)
            );
        }
    }
}

function restaurarPeriodoAutomatico() {
    if (!primeiraDataExtratoAutomatica || !ultimaDataExtratoAutomatica) {
        return;
    }

    primeiraDataExtrato = new Date(primeiraDataExtratoAutomatica);
    ultimaDataExtrato = new Date(ultimaDataExtratoAutomatica);

    definirValorCampo(
        "primeiraDataMovimentacao",
        formatarDataBrasileira(primeiraDataExtrato)
    );

    definirValorCampo(
        "ultimaDataMovimentacao",
        formatarDataBrasileira(ultimaDataExtrato)
    );

    definirValorCampo(
        "mesesDetectadosMovimentacao",
        String(mesesDetectadosAutomaticos)
    );

    definirValorCampo(
        "mesesConsideradosMovimentacao",
        String(mesesDetectadosAutomaticos)
    );
}

function calcularResultadosMovimentacao() {
    aplicarPeriodoInformadoPeloUsuario();

    const meses = obterMesesConsiderados();

    const dentroPeriodo = movimentacoesConsideradas.filter(function (m) {
        if (!primeiraDataExtrato || !ultimaDataExtrato) return true;

        return m.data >= primeiraDataExtrato &&
            m.data <= ultimaDataExtrato;
    });

    const total = dentroPeriodo.reduce(
        (soma, m) => soma + m.valor,
        0
    );

    const media = meses > 0
        ? total / meses
        : 0;

    return {
        total,
        media,
        meses,
        consideradas: dentroPeriodo
    };
}

function obterMesesConsiderados() {
    const valor = Number(
        obterValorCampo("mesesConsideradosMovimentacao")
    );

    if (Number.isFinite(valor) && valor > 0) {
        return Math.floor(valor);
    }

    return mesesDetectadosAutomaticos || 1;
}

function renderizarResultadosMovimentacao() {
    const resumo = calcularResultadosMovimentacao();

    definirTexto(
        "resultadoMediaMovimentacao",
        formatarMoeda(resumo.media)
    );

    definirTexto(
        "resultadoTotalMovimentacao",
        formatarMoeda(resumo.total)
    );

    definirTexto(
        "resultadoMesesMovimentacao",
        String(resumo.meses)
    );

    definirTexto(
        "resultadoQtdConsiderados",
        String(resumo.consideradas.length)
    );

    definirTexto(
        "resultadoQtdExcluidos",
        String(movimentacoesExcluidas.length)
    );

    renderizarResumoMensal(resumo.consideradas);
    renderizarTabelaMovimentacoes(
        "tabelaMovimentacoesConsideradas",
        resumo.consideradas,
        true
    );
    renderizarTabelaMovimentacoes(
        "tabelaMovimentacoesExcluidas",
        movimentacoesExcluidas,
        false
    );
}

function renderizarResumoMensal(lista) {
    const tbody = obterTbody("tabelaResumoMensalMovimentacao");
    if (!tbody) return;

    tbody.innerHTML = "";

    const mapa = new Map();

    lista.forEach(function (m) {
        if (!mapa.has(m.competencia)) {
            mapa.set(m.competencia, {
                quantidade: 0,
                total: 0
            });
        }

        const item = mapa.get(m.competencia);
        item.quantidade++;
        item.total += m.valor;
    });

    const competencias = competenciasDocumentadasExternas.length
        ? competenciasDocumentadasExternas.slice()
        : Array.from(mapa.keys()).sort();

    if (!competencias.length) {
        inserirVazio(
            tbody,
            3,
            "Nenhum extrato processado."
        );
        return;
    }

    competencias.forEach(function (comp) {
        const item = mapa.get(comp) || {
            quantidade: 0,
            total: 0
        };

        const tr = document.createElement("tr");

        tr.innerHTML =
            "<td>" + escapar(formatarCompetencia(comp)) + "</td>" +
            "<td>" + item.quantidade + "</td>" +
            "<td>" + escapar(formatarMoeda(item.total)) + "</td>";

        tbody.appendChild(tr);
    });
}

function renderizarTabelaMovimentacoes(idTabela, lista, consideradas) {
    const tbody = obterTbody(idTabela);
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!lista.length) {
        inserirVazio(
            tbody,
            5,
            consideradas
                ? "Nenhum crédito considerado."
                : "Nenhuma movimentação desconsiderada."
        );
        return;
    }

    lista
        .slice()
        .sort((a, b) => a.data - b.data)
        .forEach(function (m) {
            const tr = document.createElement("tr");

            if (consideradas) {
                const identificacao = [
                    m.banco,
                    m.arquivo
                ].filter(Boolean).join(" · ") || m.motivo;

                tr.innerHTML =
                    "<td>" + escapar(m.dataTexto) + "</td>" +
                    "<td>" + escapar(m.documento || "-") + "</td>" +
                    "<td>" + escapar(m.historico) + "</td>" +
                    "<td>" + escapar(formatarMoeda(m.valor)) + "</td>" +
                    "<td>" + escapar(identificacao || "-") + "</td>";
            } else {
                tr.innerHTML =
                    "<td>" + escapar(m.dataTexto) + "</td>" +
                    "<td>" + escapar(m.documento || "-") + "</td>" +
                    "<td>" + escapar(m.historico) + "</td>" +
                    "<td>" + escapar(formatarMoeda(m.valor)) + "</td>" +
                    "<td>" + escapar(m.motivo || "-") + "</td>";
            }

            tbody.appendChild(tr);
        });
}

function renderizarHistoricosExtrato() {
    const container = document.getElementById("listaRegrasMovimentacao");
    const resumo = document.getElementById("resumoRegrasMovimentacao");

    if (!container) return;

    container.innerHTML = "";

    if (!movimentacoesExtrato.length) {
        container.innerHTML =
            '<div class="sem-dados">Nenhum histórico identificado.</div>';

        if (resumo) {
            resumo.textContent =
                "Processe um extrato para visualizar os históricos encontrados.";
        }

        return;
    }

    const mapa = new Map();

    movimentacoesExtrato.forEach(function (m) {
        if (!mapa.has(m.historicoNormalizado)) {
            mapa.set(m.historicoNormalizado, {
                historico: m.historico,
                normalizado: m.historicoNormalizado,
                quantidade: 0,
                total: 0
            });
        }

        const item = mapa.get(m.historicoNormalizado);
        item.quantidade++;
        item.total += m.valor;
    });

    Array.from(mapa.values())
        .sort((a, b) => a.historico.localeCompare(b.historico, "pt-BR"))
        .forEach(function (item) {
            const regra = localizarRegraExclusao(item.normalizado);
            const excluidoManual =
                historicosExcluidosManualmente.has(item.normalizado);

            const incluidoManual =
                historicosIncluidosManualmente.has(item.normalizado);

            const excluido =
                excluidoManual ||
                (regra && !incluidoManual);

            const linha = document.createElement("label");
            linha.className = "regra-movimentacao-item";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = !!excluido;

            const texto = document.createElement("span");

            texto.innerHTML =
                "<strong>" + escapar(item.historico) + "</strong>" +
                "<small>" +
                item.quantidade +
                " lançamento(s) · " +
                escapar(formatarMoeda(item.total)) +
                (regra
                    ? " · Sugestão automática: " + escapar(regra.rotulo)
                    : "") +
                "</small>";

            checkbox.addEventListener("change", function () {
                if (checkbox.checked) {
                    historicosExcluidosManualmente.add(item.normalizado);
                    historicosIncluidosManualmente.delete(item.normalizado);
                } else {
                    historicosExcluidosManualmente.delete(item.normalizado);
                    historicosIncluidosManualmente.add(item.normalizado);
                }

                classificarMovimentacoes();
                calcularResultadosMovimentacao();
                renderizarResultadosMovimentacao();
            });

            linha.appendChild(checkbox);
            linha.appendChild(texto);
            container.appendChild(linha);
        });

    if (resumo) {
        resumo.textContent =
            mapa.size +
            " histórico(s) diferente(s) identificado(s). Marque para desconsiderar do cálculo.";
    }
}

function limparMediaMovimentacao() {
    resetarEstadoMovimentacao();

    definirValorCampo("textoExtratoMovimentacao", "");
    definirValorCampo("primeiraDataMovimentacao", "");
    definirValorCampo("ultimaDataMovimentacao", "");
    definirValorCampo("mesesDetectadosMovimentacao", "");
    definirValorCampo("mesesConsideradosMovimentacao", "");

    limparResultadosMovimentacao();
    renderizarHistoricosExtrato();
}

function limparResultadosMovimentacao() {
    definirTexto("resultadoMediaMovimentacao", "R$ 0,00");
    definirTexto("resultadoTotalMovimentacao", "R$ 0,00");
    definirTexto("resultadoMesesMovimentacao", "0");
    definirTexto("resultadoQtdConsiderados", "0");
    definirTexto("resultadoQtdExcluidos", "0");

    const mensal = obterTbody("tabelaResumoMensalMovimentacao");
    const considerados = obterTbody("tabelaMovimentacoesConsideradas");
    const excluidos = obterTbody("tabelaMovimentacoesExcluidas");

    if (mensal) {
        mensal.innerHTML =
            '<tr><td colspan="3" class="sem-dados">Nenhum extrato processado.</td></tr>';
    }

    if (considerados) {
        considerados.innerHTML =
            '<tr><td colspan="5" class="sem-dados">Nenhum extrato processado.</td></tr>';
    }

    if (excluidos) {
        excluidos.innerHTML =
            '<tr><td colspan="5" class="sem-dados">Nenhum extrato processado.</td></tr>';
    }
}

function detectarFormatoDataExtrato() {
    return "BR";
}

function validarFormatoDataGenerica(texto) {
    return /^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}$/.test(
        String(texto || "").trim()
    );
}

function converterDataExtrato(texto) {
    const m = String(texto || "")
        .trim()
        .match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);

    if (!m) return null;

    let ano = Number(m[3]);

    if (m[3].length === 2) {
        ano += ano >= 70
            ? 1900
            : 2000;
    }

    const dia = Number(m[1]);
    const mes = Number(m[2]);

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

function formatarDataBrasileira(data) {
    if (!(data instanceof Date) || Number.isNaN(data.getTime())) {
        return "";
    }

    return [
        String(data.getDate()).padStart(2, "0"),
        String(data.getMonth() + 1).padStart(2, "0"),
        data.getFullYear()
    ].join("/");
}

function obterCompetenciaData(data) {
    if (!(data instanceof Date)) return "";

    return (
        data.getFullYear() +
        "-" +
        String(data.getMonth() + 1).padStart(2, "0")
    );
}

function calcularMesesInclusivos(inicio, fim) {
    if (!inicio || !fim) return 0;

    return (
        (fim.getFullYear() - inicio.getFullYear()) * 12 +
        (fim.getMonth() - inicio.getMonth()) +
        1
    );
}

function aplicarMascaraDataCampo(evento) {
    const campo = evento.target;

    let valor = String(campo.value || "")
        .replace(/\D/g, "")
        .slice(0, 8);

    if (valor.length > 4) {
        valor =
            valor.slice(0, 2) +
            "/" +
            valor.slice(2, 4) +
            "/" +
            valor.slice(4);
    } else if (valor.length > 2) {
        valor =
            valor.slice(0, 2) +
            "/" +
            valor.slice(2);
    }

    campo.value = valor;
}

function normalizarCampoMeses(campo) {
    if (!campo) return;

    let valor = Number(campo.value);

    if (!Number.isFinite(valor) || valor < 1) {
        valor = 1;
    }

    campo.value = String(Math.floor(valor));
}

function limparCelulaTexto(valor) {
    return String(valor || "")
        .replace(/\u00A0/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function limparCelulaValor(valor) {
    return String(valor || "")
        .replace(/\u00A0/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function converterValorBrasileiro(valor) {
    let texto = String(valor || "")
        .replace(/R\$/gi, "")
        .replace(/\s+/g, "")
        .trim();

    if (!texto) return NaN;

    const negativo = texto.startsWith("-");

    texto = texto
        .replace(/^[+-]/, "")
        .replace(/\./g, "")
        .replace(",", ".")
        .replace(/[^\d.]/g, "");

    const numero = Number(texto);

    if (!Number.isFinite(numero)) return NaN;

    return negativo
        ? -numero
        : numero;
}

function normalizarTexto(texto) {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/\u00A0/g, " ")
        .replace(/[.,:;()[\]{}]+/g, " ")
        .replace(/[-–—]+/g, " ")
        .replace(/[*_=<>]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function formatarCompetencia(comp) {
    const partes = String(comp || "").split("-");

    if (partes.length !== 2) {
        return String(comp || "");
    }

    return partes[1] + "/" + partes[0];
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

function definirTexto(id, texto) {
    const el = document.getElementById(id);

    if (el) {
        el.textContent = texto;
    }
}

function definirValorCampo(id, valor) {
    const el = document.getElementById(id);

    if (el) {
        el.value = valor;
    }
}

function obterValorCampo(id) {
    const el = document.getElementById(id);

    return el
        ? String(el.value || "")
        : "";
}

function obterTbody(id) {
    const el = document.getElementById(id);

    if (!el) return null;

    return el.tagName === "TBODY"
        ? el
        : el.querySelector("tbody");
}

function inserirVazio(tbody, colunas, texto) {
    const tr = document.createElement("tr");

    tr.innerHTML =
        '<td colspan="' +
        colunas +
        '" class="sem-dados">' +
        escapar(texto) +
        "</td>";

    tbody.appendChild(tr);
}

function escapar(texto) {
    return String(texto || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

window.MediaMovimentacao = {
    processar: processarMovimentacao,

    processarTexto: function (texto, opcoes) {
        return processarTextoMovimentacao(
            String(texto || ""),
            opcoes || {}
        );
    },

    recalcular: function () {
        if (!movimentacoesExtrato.length) return;

        aplicarPeriodoInformadoPeloUsuario();
        classificarMovimentacoes();
        calcularResultadosMovimentacao();
        renderizarHistoricosExtrato();
        renderizarResultadosMovimentacao();
    },

    obterMovimentacoes: function () {
        return movimentacoesExtrato.slice();
    },

    obterConsideradas: function () {
        return movimentacoesConsideradas.slice();
    },

    obterExcluidas: function () {
        return movimentacoesExcluidas.slice();
    },

    definirMesesConsiderados: function (quantidade) {
        const n = Number(quantidade);

        if (!Number.isFinite(n) || n < 1) return;

        definirValorCampo(
            "mesesConsideradosMovimentacao",
            String(Math.floor(n))
        );

        definirValorCampo(
            "mesesDetectadosMovimentacao",
            String(Math.floor(n))
        );

        mesesDetectadosAutomaticos = Math.floor(n);
    },

    definirCompetenciasDocumentadas: function (competencias) {
        competenciasDocumentadasExternas =
            Array.from(
                new Set(
                    (competencias || []).filter(Boolean)
                )
            ).sort();

        if (competenciasDocumentadasExternas.length) {
            this.definirMesesConsiderados(
                competenciasDocumentadasExternas.length
            );
        }
    },

    definirPeriodo: function (inicio, fim) {
        if (inicio instanceof Date && !Number.isNaN(inicio.getTime())) {
            primeiraDataExtrato = new Date(inicio);
            primeiraDataExtratoAutomatica = new Date(inicio);

            definirValorCampo(
                "primeiraDataMovimentacao",
                formatarDataBrasileira(inicio)
            );
        }

        if (fim instanceof Date && !Number.isNaN(fim.getTime())) {
            ultimaDataExtrato = new Date(fim);
            ultimaDataExtratoAutomatica = new Date(fim);

            definirValorCampo(
                "ultimaDataMovimentacao",
                formatarDataBrasileira(fim)
            );
        }
    },

    obterResumo: function () {
        const calculo = calcularResultadosMovimentacao();

        return {
            total: calculo.total,
            media: calculo.media,
            meses: calculo.meses,
            quantidadeConsideradas: movimentacoesConsideradas.length,
            quantidadeExcluidas: movimentacoesExcluidas.length,
            primeiraData: primeiraDataExtrato,
            ultimaData: ultimaDataExtrato,
            competenciasDocumentadas: competenciasDocumentadasExternas.slice()
        };
    }
};