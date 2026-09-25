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

const historicosExcluidosManualmente = new Set();
const historicosIncluidosManualmente = new Set();

const REGRAS_INFORMATIVAS = [
    /\bSALDO ANTERIOR\b/,
    /\bSALDO BLOQUEADO ANTERIOR\b/,
    /\bSALDO DO DIA\b/,
    /\bSALDO FINAL\b/,
    /\bSALDO DISPONIVEL\b/,
    /\bSALDO TOTAL\b/,
    /\bSALDO EM CONTA\b/,
    /\bSALDO EM CONTA CAPITAL\b/,
    /\bSALDO CONTA CAPITAL\b/,
    /\bSALDO BLOQUEADO\b/,
    /\bSALDO BLOQUEADO CHEQUES\b/,
    /\bSALDO BLOQUEADO JUDICIAL\b/,
    /\bCHEQUE ESPECIAL CONTRATADO\b/,
    /\bLIMITE DE CHEQUE ESPECIAL\b/,
    /\bLIMITE CHEQUE ESPECIAL\b/,
    /\bLIMITE DISPONIVEL\b/,
    /\bJUROS VENCIDOS PROVISIONADOS\b/,
    /\bTARIFAS VENCIDAS PROVISIONADAS\b/,
    /\bJUROS VENCIDOS REMANESCENTES\b/,
    /\bTARIFAS VENCIDAS REMANESCENTES\b/,
    /\bENCARGOS VENCIDOS REMANESCENTES\b/,
    /\bENCARGOS A VENCER\b/,
    /\bPREVISAO IOF\b/,
    /\bPREVISAO JUROS\b/,
    /\bPREVISAO TARIFAS\b/,
    /\bOUTRAS INFORMACOES\b/,
    /\bVENCIMENTO CHEQUE ESPECIAL\b/,
    /\bTAXA CHEQUE ESPECIAL\b/,
    /\bCUSTO EFETIVO TOTAL\b/,
    /\bTOTAL DE CREDITOS\b/,
    /\bTOTAL CREDITOS\b/,
    /\bTOTAL DE DEBITOS\b/,
    /\bTOTAL DEBITOS\b/,
    /\bTOTAL MOVIMENTACAO\b/,
    /\bTOTAL MOVIMENTACOES\b/,
    /\bRESUMO\b/,
    /\bLANCAMENTOS FUTUROS\b/,
    /\bDATA DOCUMENTO HISTORICO VALOR\b/,
    /\bDATA HISTORICO VALOR\b/,
    /\bEXTRATO CONTA CORRENTE\b/,
    /\bEXTRATO DE CONTA\b/,
    /\bSISTEMA DE COOPERATIVAS DE CREDITO DO BRASIL\b/,
    /\bSISBR SISTEMA DE INFORMATICA DO SICOOB\b/,
    /\bCOOP\b/,
    /\bCONTA\b.*\bMCPC\b/,
    /\bAGENCIA CONTA\b/,
    /\bOUVIDORIA\b/,
    /\bCENTRAL DE ATENDIMENTO\b/,
    /\bSAC\b/,
    /\bEXTRATOS EMITIDOS ATE\b/
];

const REGRAS_EXCLUSAO_MOVIMENTACAO = [
    {
        id: "emprestimo",
        rotulo: "EMPRÉSTIMO / FINANCIAMENTO",
        motivo: "Liberação de empréstimo ou financiamento não representa renda.",
        testar: h =>
            /\b(EMPRESTIMO|FINANCIAMENTO|FINANC|CREDITO PESSOAL|CREDITO CONSIGNADO|CAPITAL DE GIRO|LIBERACAO DE CREDITO|LIBERACAO CREDITO|CRED LIBERACAO BNDES|CREDITO LIBERACAO BNDES)\b/.test(h)
    },
    {
        id: "titulo-descontado",
        rotulo: "TÍTULO DESCONTADO",
        motivo: "Liberação de título descontado não representa nova renda.",
        testar: h =>
            /\b(CRED LIBERACAO TD|CREDITO LIBERACAO TD|TITULO DESCONTADO|DESCONTO DE TITULOS)\b/.test(h)
    },
    {
        id: "limite",
        rotulo: "LIMITE / CHEQUE ESPECIAL",
        motivo: "Utilização ou liberação de limite não representa renda.",
        testar: h =>
            /\b(CHEQUE ESPECIAL|LIMITE DE CREDITO|CREDITO ROTATIVO|LIMITE ROTATIVO)\b/.test(h)
    },
    {
        id: "estorno",
        rotulo: "ESTORNO / DEVOLUÇÃO",
        motivo: "Estorno, devolução, cancelamento ou reembolso não representa renda.",
        testar: h =>
            /\b(ESTORNO|REVERSAO|CANCELAMENTO|DEVOLUCAO|DEVOLVIDO|REEMBOLSO)\b/.test(h)
    },
    {
        id: "investimento",
        rotulo: "INVESTIMENTO / RESGATE",
        motivo: "Resgate ou aplicação de investimento não representa novo recurso.",
        testar: h =>
            /\b(RDB|RDC|CDB|RESGATE|APLICACAO|INVESTIMENTO|FUNDO DE INVESTIMENTO|RESGATE AUTOMATICO)\b/.test(h)
    },
    {
        id: "pix-devolvido",
        rotulo: "DEVOLUÇÃO PIX",
        motivo: "Devolução de PIX não representa renda.",
        testar: h =>
            /\b(DEVOLUCAO PIX|PIX DEVOLVIDO|PIX DEVOLUCAO)\b/.test(h)
    },
    {
        id: "cheque-devolvido",
        rotulo: "CHEQUE DEVOLVIDO",
        motivo: "Cheque devolvido não representa renda efetiva.",
        testar: h =>
            /\b(CHEQUE DEVOLVIDO|CH DEVOLVIDO)\b/.test(h)
    },
    {
        id: "pontos",
        rotulo: "RESGATE DE PONTOS",
        motivo: "Resgate de pontos não representa renda.",
        testar: h =>
            /\b(RESGATE PONTOS|COOPERA.*RESGATE)\b/.test(h)
    }
];

const PADROES_CREDITO_VALIDO = [
    /\bPIX RECEBIDO\b/,
    /\bPIX RECEBIDA\b/,
    /\bPIX RECEB\b/,
    /\bTRANSF RECEBIDA\b/,
    /\bTRANSFERENCIA RECEBIDA\b/,
    /\bTRANSFERENCIA RECEBIDO\b/,
    /\bCRED TRANSF\b/,
    /\bCREDITO TRANSFERENCIA\b/,
    /\bCRED TED\b/,
    /\bTED RECEBIDA\b/,
    /\bTED RECEBIDO\b/,
    /\bDOC RECEBIDO\b/,
    /\bDOC RECEBIDA\b/,
    /\bDEPOSITO EM DINHEIRO\b/,
    /\bDEP DINHEIRO\b/,
    /\bDEPOSITO CHEQUE\b/,
    /\bDEP CHEQUE\b/,
    /\bRECEBIMENTO\b/,
    /\bPAGAMENTO RECEBIDO\b/,
    /\bCOBRANCA RECEBIDA\b/,
    /\bLIQUIDACAO COBRANCA\b/,
    /\bCRED LIQUIDACAO COBRANCA\b/,
    /\bOUTROS CREDITOS\b/,
    /\bCREDITO EM CONTA\b/,
    /\bCR COMPRAS\b/,
    /\bCR ANTECIPACAO MASTERCARD\b/,
    /\bCR ANTECIPACAO VISA\b/,
    /\bCRED ANTECIPACAO MASTERCARD\b/,
    /\bCRED ANTECIPACAO VISA\b/,
    /\bCREDITO ANTECIPACAO MASTERCARD\b/,
    /\bCREDITO ANTECIPACAO VISA\b/
];

function iniciarMediaMovimentacao() {
    configurarEventosMediaMovimentacao();
    limparResultadosMovimentacao();
    renderizarHistoricosExtrato();
}

function configurarEventosMediaMovimentacao() {
    const btnProcessar = document.getElementById("btnProcessarMovimentacao");
    const btnLimpar = document.getElementById("btnLimparMovimentacao");
    const btnRecalcular = document.getElementById("btnRecalcularMovimentacao");
    const btnRestaurar = document.getElementById("btnRestaurarPeriodoMovimentacao");

    if (btnProcessar) {
        btnProcessar.addEventListener("click", processarMovimentacao);
    }

    if (btnLimpar) {
        btnLimpar.addEventListener("click", limparMediaMovimentacao);
    }

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

            aplicarPeriodoInformadoPeloUsuario();
            calcularResultadosMovimentacao();
            renderizarResultadosMovimentacao();
        });
    });

    [
        "mesesDetectadosMovimentacao",
        "mesesConsideradosMovimentacao"
    ].forEach(function (id) {
        const campo = document.getElementById(id);

        if (!campo) return;

        campo.addEventListener("blur", function () {
            normalizarCampoMeses(campo);

            if (!movimentacoesExtrato.length) return;

            calcularResultadosMovimentacao();
            renderizarResultadosMovimentacao();
        });
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

function processarTextoMovimentacao(texto, opcoes = {}) {
    resetarEstadoMovimentacao();

    if (Array.isArray(opcoes.competenciasDocumentadas)) {
        competenciasDocumentadasExternas = Array.from(
            new Set(
                opcoes.competenciasDocumentadas.filter(Boolean)
            )
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

    historicosExcluidosManualmente.clear();
    historicosIncluidosManualmente.clear();
}

function interpretarExtratoMovimentacao(textoOriginal) {
    const linhas = String(textoOriginal || "")
        .replace(/&#x20;/gi, " ")
        .replace(/&#x9;/gi, "\t")
        .replace(/\\\*/g, "*")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n");

    const resultado = [];
    let dataCorrente = null;

    linhas.forEach(function (linhaOriginal, indice) {
        const linha = String(linhaOriginal || "")
            .replace(/\u00A0/g, " ")
            .replace(/[ \t]+/g, " ")
            .trim();

        if (!linha) return;

        const normalizada = normalizarTexto(linha);

        if (linhaInformativa(normalizada)) {
            return;
        }

        const consolidada = interpretarLinhaConsolidada(
            linha,
            indice + 1
        );

        if (consolidada) {
            resultado.push(consolidada);
            dataCorrente = consolidada.data;
            return;
        }

        const dataEncontrada = extrairDataInicial(linha);

        if (dataEncontrada) {
            dataCorrente = dataEncontrada.data;
        }

        const movimentacao = interpretarLinhaExtratoBruto(
            linha,
            dataCorrente,
            indice + 1,
            !!dataEncontrada
        );

        if (movimentacao) {
            resultado.push(movimentacao);
        }
    });

    return removerDuplicidadesParser(resultado);
}

function interpretarLinhaConsolidada(linha, numeroLinha) {
    if (!linha.includes("|")) return null;

    const partes = linha
        .split("|")
        .map(function (v) {
            return String(v || "").trim();
        });

    if (partes.length < 3) return null;

    const data = converterDataExtrato(partes[0]);

    if (!data) return null;

    const ultima = partes[partes.length - 1];

    const dadosValor = extrairValorFinal(ultima);

    if (!dadosValor) return null;

    const meio = partes
        .slice(1, -1)
        .join(" ");

    const metadata = extrairMetadadosLeitura(meio);

    const historico = removerMetadadosLeitura(meio)
        .replace(/^MOV\d+\s*/i, "")
        .trim();

    if (!historico) return null;

    if (
        linhaInformativa(
            normalizarTexto(historico)
        )
    ) {
        return null;
    }

    return criarMovimentacaoExtrato({
        numeroLinha,
        data,
        documento: "",
        historico,
        valor: dadosValor.valor,
        indicador: dadosValor.indicador,
        original: linha,
        metadata
    });
}

function interpretarLinhaExtratoBruto(
    linha,
    dataCorrente,
    numeroLinha,
    possuiDataNaLinha
) {
    if (!dataCorrente) return null;

    let restante = linha;

    const dataInicial = restante.match(
        /^(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})(?=\s|$)/
    );

    if (dataInicial) {
        restante = restante
            .substring(
                dataInicial[0].length
            )
            .trim();
    }

    const dadosValor = extrairValorFinal(restante);

    if (!dadosValor) return null;

    const historicoParte = restante
        .substring(
            0,
            dadosValor.indice
        )
        .replace(/[|]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (!historicoParte) return null;

    const dadosDescricao = separarDocumentoHistorico(
        historicoParte
    );

    const historicoNormalizado = normalizarTexto(
        dadosDescricao.historico
    );

    if (!historicoNormalizado) return null;

    if (linhaInformativa(historicoNormalizado)) {
        return null;
    }

    if (
        !possuiDataNaLinha &&
        !dadosValor.indicador
    ) {
        return null;
    }

    if (
        !dadosValor.indicador &&
        !ehHistoricoTransacional(
            historicoNormalizado
        )
    ) {
        return null;
    }

    return criarMovimentacaoExtrato({
        numeroLinha,
        data: dataCorrente,
        documento: dadosDescricao.documento,
        historico: dadosDescricao.historico,
        valor: dadosValor.valor,
        indicador: dadosValor.indicador,
        original: linha,
        metadata: {}
    });
}

function extrairValorFinal(texto) {
    const s = String(texto || "")
        .trim();

    const regex =
        /(?:R\$\s*)?([+-]?\s*(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2})\s*([CD*])?\s*$/i;

    const m = s.match(regex);

    if (!m) return null;

    const valorOriginal = converterValorBrasileiro(
        m[1]
    );

    if (!Number.isFinite(valorOriginal)) {
        return null;
    }

    let indicador = String(
        m[2] || ""
    ).toUpperCase();

    if (
        !indicador &&
        valorOriginal < 0
    ) {
        indicador = "D";
    }

    return {
        valor: Math.abs(valorOriginal),
        indicador,
        indice: m.index,
        texto: m[0]
    };
}

function criarMovimentacaoExtrato(dados) {
    const metadata =
        dados.metadata ||
        extrairMetadadosLeitura(
            dados.original || ""
        );

    const historico = removerMetadadosLeitura(
        dados.historico || ""
    )
        .replace(/\s+/g, " ")
        .trim();

    return {
        linha: dados.numeroLinha,
        data: dados.data,
        dataTexto: formatarDataBrasileira(
            dados.data
        ),
        competencia: obterCompetenciaData(
            dados.data
        ),
        documento: String(
            dados.documento || ""
        ).trim(),
        historico,
        historicoNormalizado:
            normalizarTexto(historico),
        valor: Math.abs(
            Number(
                dados.valor || 0
            )
        ),
        indicador: String(
            dados.indicador || ""
        ).toUpperCase(),
        original: String(
            dados.original || ""
        ),
        banco: metadata.banco || "",
        arquivo: metadata.arquivo || "",
        idOrigem: metadata.id || "",
        decisaoLeitura: String(
            metadata.decisao || ""
        ).toUpperCase(),
        considerado: false,
        motivo: ""
    };
}

function extrairMetadadosLeitura(texto) {
    const original = String(
        texto || ""
    );

    function tag(nome) {
        const regex = new RegExp(
            "\\[" +
            nome +
            "\\s*:\\s*([^\\]]+)\\]",
            "i"
        );

        const m = original.match(regex);

        return m
            ? String(
                m[1] || ""
            ).trim()
            : "";
    }

    return {
        id: tag("ID"),
        banco: tag("BANCO"),
        arquivo: tag("ARQUIVO"),
        decisao: tag("DECISAO")
    };
}

function removerMetadadosLeitura(texto) {
    return String(texto || "")
        .replace(
            /\[(?:ID|BANCO|ARQUIVO|DECISAO)\s*:[^\]]+\]/gi,
            " "
        )
        .replace(/\s+/g, " ")
        .trim();
}

function linhaInformativa(normalizado) {
    const h = String(
        normalizado || ""
    ).trim();

    if (!h) return true;

    return REGRAS_INFORMATIVAS.some(
        function (regex) {
            return regex.test(h);
        }
    );
}

function ehHistoricoTransacional(h) {
    if (localizarRegraExclusao(h)) {
        return true;
    }

    if (
        PADROES_CREDITO_VALIDO.some(
            function (regex) {
                return regex.test(h);
            }
        )
    ) {
        return true;
    }

    return /\b(PIX|TED|DOC|TRANSF|TRANSFERENCIA|DEPOSITO|PAGAMENTO|COMPRA|SAQUE|DEBITO|CREDITO|CRED|RECEBIMENTO|ANTECIPACAO|ESTORNO|RESGATE|APLICACAO|EMPRESTIMO|FINANCIAMENTO|JUROS|TARIFA|IOF)\b/.test(
        h
    );
}

function separarDocumentoHistorico(texto) {
    const valor = String(texto || "")
        .replace(/\s+/g, " ")
        .trim();

    if (!valor) {
        return {
            documento: "",
            historico: ""
        };
    }

    const m = valor.match(
        /^([A-Z0-9./-]{1,30})\s+(.+)$/i
    );

    if (
        m &&
        (
            /\d/.test(m[1]) ||
            /^(PIX|MASTERCARD|VISA|IOF)$/i.test(
                m[1]
            )
        )
    ) {
        return {
            documento: m[1],
            historico: m[2]
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

    movimentacoesExtrato.forEach(
        function (movimentacao) {
            const classificacao =
                classificarMovimentacao(
                    movimentacao
                );

            movimentacao.considerado =
                classificacao.considerado;

            movimentacao.motivo =
                classificacao.motivo;

            if (
                movimentacao.considerado
            ) {
                movimentacoesConsideradas.push(
                    movimentacao
                );
            } else {
                movimentacoesExcluidas.push(
                    movimentacao
                );
            }
        }
    );
}

function classificarMovimentacao(m) {
    const h =
        m.historicoNormalizado;

    const decisao = String(
        m.decisaoLeitura || ""
    ).toUpperCase();

    if (linhaInformativa(h)) {
        return {
            considerado: false,
            motivo:
                "Linha informativa / saldo"
        };
    }

    if (m.indicador === "D") {
        return {
            considerado: false,
            motivo: "Débito"
        };
    }

    if (m.indicador === "*") {
        return {
            considerado: false,
            motivo:
                "Saldo ou valor bloqueado"
        };
    }

    if (decisao === "EXCLUIR") {
        return {
            considerado: false,
            motivo:
                "Excluído na conferência da leitura"
        };
    }

    if (decisao === "DUVIDA") {
        return {
            considerado: false,
            motivo:
                "Pendente de conferência"
        };
    }

    if (decisao === "INCLUIR") {
        return {
            considerado: true,
            motivo:
                "Crédito confirmado na conferência"
        };
    }

    const regraExclusao =
        localizarRegraExclusao(h);

    if (
        regraExclusao &&
        !historicosIncluidosManualmente.has(
            h
        )
    ) {
        return {
            considerado: false,
            motivo:
                regraExclusao.rotulo +
                " - " +
                regraExclusao.motivo
        };
    }

    if (
        historicosExcluidosManualmente.has(
            h
        )
    ) {
        return {
            considerado: false,
            motivo:
                "Exclusão manual"
        };
    }

    if (m.indicador === "C") {
        return {
            considerado: true,
            motivo:
                "Crédito do extrato"
        };
    }

    if (
        PADROES_CREDITO_VALIDO.some(
            function (regex) {
                return regex.test(h);
            }
        )
    ) {
        return {
            considerado: true,
            motivo:
                "Crédito identificado pelo histórico"
        };
    }

    return {
        considerado: false,
        motivo:
            "Sem identificação segura como crédito"
    };
}

function localizarRegraExclusao(
    historicoNormalizado
) {
    return (
        REGRAS_EXCLUSAO_MOVIMENTACAO.find(
            function (regra) {
                return regra.testar(
                    historicoNormalizado
                );
            }
        ) ||
        null
    );
}

function removerDuplicidadesParser(lista) {
    const resultado = [];
    const idsProcessados = new Set();

    lista.forEach(
        function (movimentacao) {
            /*
             * NÃO deduplicar pelo conjunto
             * data + histórico + valor.
             *
             * O mesmo cooperado pode receber duas ou mais
             * movimentações legítimas com mesmo valor,
             * mesmo histórico e mesma data.
             *
             * Exemplo real:
             * 01/06/2026 PIX RECEBIDO R$ 200,00
             * 01/06/2026 PIX RECEBIDO R$ 200,00
             *
             * São operações diferentes.
             */

            const idOrigem = String(
                movimentacao.idOrigem || ""
            ).trim();

            if (idOrigem) {
                if (
                    idsProcessados.has(
                        idOrigem
                    )
                ) {
                    return;
                }

                idsProcessados.add(
                    idOrigem
                );
            }

            resultado.push(
                movimentacao
            );
        }
    );

    return resultado;
}

function identificarPeriodoExtrato() {
    const datas = movimentacoesExtrato
        .map(function (m) {
            return m.data;
        })
        .filter(function (d) {
            return (
                d instanceof Date &&
                !Number.isNaN(
                    d.getTime()
                )
            );
        });

    if (!datas.length) return;

    primeiraDataExtrato = new Date(
        Math.min(
            ...datas.map(function (d) {
                return d.getTime();
            })
        )
    );

    ultimaDataExtrato = new Date(
        Math.max(
            ...datas.map(function (d) {
                return d.getTime();
            })
        )
    );

    primeiraDataExtratoAutomatica =
        new Date(
            primeiraDataExtrato
        );

    ultimaDataExtratoAutomatica =
        new Date(
            ultimaDataExtrato
        );

    if (
        competenciasDocumentadasExternas.length
    ) {
        mesesDetectadosAutomaticos =
            competenciasDocumentadasExternas.length;
    } else {
        const competencias =
            Array.from(
                new Set(
                    movimentacoesExtrato
                        .map(function (m) {
                            return m.competencia;
                        })
                        .filter(Boolean)
                )
            );

        mesesDetectadosAutomaticos =
            competencias.length ||
            calcularMesesInclusivos(
                primeiraDataExtrato,
                ultimaDataExtrato
            );
    }

    definirValorCampo(
        "primeiraDataMovimentacao",
        formatarDataBrasileira(
            primeiraDataExtrato
        )
    );

    definirValorCampo(
        "ultimaDataMovimentacao",
        formatarDataBrasileira(
            ultimaDataExtrato
        )
    );

    definirValorCampo(
        "mesesDetectadosMovimentacao",
        String(
            mesesDetectadosAutomaticos
        )
    );

    definirValorCampo(
        "mesesConsideradosMovimentacao",
        String(
            mesesDetectadosAutomaticos
        )
    );
}

function aplicarPeriodoInformadoPeloUsuario() {
    const inicio = converterDataExtrato(
        obterValorCampo(
            "primeiraDataMovimentacao"
        )
    );

    const fim = converterDataExtrato(
        obterValorCampo(
            "ultimaDataMovimentacao"
        )
    );

    if (inicio) {
        primeiraDataExtrato = inicio;
    }

    if (fim) {
        ultimaDataExtrato = fim;
    }
}

function restaurarPeriodoAutomatico() {
    if (
        !primeiraDataExtratoAutomatica ||
        !ultimaDataExtratoAutomatica
    ) {
        return;
    }

    primeiraDataExtrato =
        new Date(
            primeiraDataExtratoAutomatica
        );

    ultimaDataExtrato =
        new Date(
            ultimaDataExtratoAutomatica
        );

    definirValorCampo(
        "primeiraDataMovimentacao",
        formatarDataBrasileira(
            primeiraDataExtrato
        )
    );

    definirValorCampo(
        "ultimaDataMovimentacao",
        formatarDataBrasileira(
            ultimaDataExtrato
        )
    );

    definirValorCampo(
        "mesesDetectadosMovimentacao",
        String(
            mesesDetectadosAutomaticos
        )
    );

    definirValorCampo(
        "mesesConsideradosMovimentacao",
        String(
            mesesDetectadosAutomaticos
        )
    );
}

function calcularResultadosMovimentacao() {
    aplicarPeriodoInformadoPeloUsuario();

    const consideradasPeriodo =
        movimentacoesConsideradas.filter(
            function (m) {
                if (
                    !primeiraDataExtrato ||
                    !ultimaDataExtrato
                ) {
                    return true;
                }

                return (
                    m.data >=
                    primeiraDataExtrato &&
                    m.data <=
                    ultimaDataExtrato
                );
            }
        );

    const total =
        consideradasPeriodo.reduce(
            function (
                soma,
                movimentacao
            ) {
                return (
                    soma +
                    movimentacao.valor
                );
            },
            0
        );

    let meses = Number(
        obterValorCampo(
            "mesesConsideradosMovimentacao"
        )
    );

    if (
        !Number.isFinite(meses) ||
        meses <= 0
    ) {
        meses =
            mesesDetectadosAutomaticos ||
            1;
    }

    meses = Math.max(
        1,
        Math.trunc(meses)
    );

    const media =
        total / meses;

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
        String(meses)
    );

    definirTexto(
        "resultadoQtdConsiderados",
        String(
            consideradasPeriodo.length
        )
    );

    definirTexto(
        "resultadoQtdExcluidos",
        String(
            movimentacoesExcluidas.length
        )
    );

    return {
        total,
        media,
        meses,
        consideradas:
            consideradasPeriodo
    };
}

function renderizarResultadosMovimentacao() {
    const calculo =
        calcularResultadosMovimentacao();

    renderizarResumoMensal(
        calculo.consideradas
    );

    renderizarTabelaMovimentacoes(
        "tabelaMovimentacoesConsideradas",
        calculo.consideradas,
        true
    );

    renderizarTabelaMovimentacoes(
        "tabelaMovimentacoesExcluidas",
        movimentacoesExcluidas,
        false
    );
}

function renderizarResumoMensal(lista) {
    const tbody = obterTbody(
        "tabelaResumoMensalMovimentacao"
    );

    if (!tbody) return;

    tbody.innerHTML = "";

    const mapa = new Map();

    lista.forEach(
        function (m) {
            if (
                !mapa.has(
                    m.competencia
                )
            ) {
                mapa.set(
                    m.competencia,
                    {
                        quantidade: 0,
                        total: 0
                    }
                );
            }

            const item = mapa.get(
                m.competencia
            );

            item.quantidade++;
            item.total += m.valor;
        }
    );

    let competencias;

    if (
        competenciasDocumentadasExternas.length
    ) {
        competencias =
            competenciasDocumentadasExternas.slice();
    } else {
        competencias =
            Array.from(
                mapa.keys()
            ).sort();
    }

    if (!competencias.length) {
        inserirVazio(
            tbody,
            3,
            "Nenhum extrato processado."
        );

        return;
    }

    competencias.forEach(
        function (comp) {
            const item =
                mapa.get(comp) ||
                {
                    quantidade: 0,
                    total: 0
                };

            const tr =
                document.createElement(
                    "tr"
                );

            tr.innerHTML =
                "<td>" +
                escapar(
                    formatarCompetencia(
                        comp
                    )
                ) +
                "</td>" +
                "<td>" +
                item.quantidade +
                "</td>" +
                "<td>" +
                escapar(
                    formatarMoeda(
                        item.total
                    )
                ) +
                "</td>";

            tbody.appendChild(tr);
        }
    );
}

function renderizarTabelaMovimentacoes(
    idTabela,
    lista,
    consideradas
) {
    const tbody = obterTbody(
        idTabela
    );

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
        .sort(function (a, b) {
            return (
                a.data -
                b.data
            );
        })
        .forEach(
            function (m) {
                const tr =
                    document.createElement(
                        "tr"
                    );

                if (consideradas) {
                    const origem =
                        [
                            m.banco,
                            m.arquivo
                        ]
                            .filter(
                                Boolean
                            )
                            .join(
                                " · "
                            );

                    tr.innerHTML =
                        "<td>" +
                        escapar(
                            m.dataTexto
                        ) +
                        "</td>" +
                        "<td>" +
                        escapar(
                            m.documento ||
                            "-"
                        ) +
                        "</td>" +
                        "<td>" +
                        escapar(
                            m.historico
                        ) +
                        "</td>" +
                        "<td>" +
                        escapar(
                            formatarMoeda(
                                m.valor
                            )
                        ) +
                        "</td>" +
                        "<td>" +
                        escapar(
                            origem ||
                            m.motivo ||
                            "-"
                        ) +
                        "</td>";
                } else {
                    tr.innerHTML =
                        "<td>" +
                        escapar(
                            m.dataTexto
                        ) +
                        "</td>" +
                        "<td>" +
                        escapar(
                            m.documento ||
                            "-"
                        ) +
                        "</td>" +
                        "<td>" +
                        escapar(
                            m.historico
                        ) +
                        "</td>" +
                        "<td>" +
                        escapar(
                            formatarMoeda(
                                m.valor
                            )
                        ) +
                        "</td>" +
                        "<td>" +
                        escapar(
                            m.motivo ||
                            "-"
                        ) +
                        "</td>";
                }

                tbody.appendChild(
                    tr
                );
            }
        );
}

function renderizarHistoricosExtrato() {
    const container =
        document.getElementById(
            "listaRegrasMovimentacao"
        );

    const resumo =
        document.getElementById(
            "resumoRegrasMovimentacao"
        );

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

    movimentacoesExtrato.forEach(
        function (m) {
            const chave =
                m.historicoNormalizado;

            if (!chave) return;

            if (
                linhaInformativa(
                    chave
                )
            ) {
                return;
            }

            if (
                !mapa.has(chave)
            ) {
                mapa.set(
                    chave,
                    {
                        normalizado:
                            chave,
                        historico:
                            m.historico,
                        quantidade:
                            0,
                        total:
                            0
                    }
                );
            }

            const item =
                mapa.get(
                    chave
                );

            item.quantidade++;
            item.total +=
                m.valor;
        }
    );

    Array.from(
        mapa.values()
    )
        .sort(
            function (
                a,
                b
            ) {
                return a.historico
                    .localeCompare(
                        b.historico,
                        "pt-BR"
                    );
            }
        )
        .forEach(
            function (item) {
                const regra =
                    localizarRegraExclusao(
                        item.normalizado
                    );

                const excluido =
                    historicosExcluidosManualmente.has(
                        item.normalizado
                    ) ||
                    (
                        regra &&
                        !historicosIncluidosManualmente.has(
                            item.normalizado
                        )
                    );

                const label =
                    document.createElement(
                        "label"
                    );

                label.className =
                    "regra-movimentacao-item";

                const checkbox =
                    document.createElement(
                        "input"
                    );

                checkbox.type =
                    "checkbox";

                checkbox.checked =
                    !!excluido;

                const texto =
                    document.createElement(
                        "span"
                    );

                texto.innerHTML =
                    "<strong>" +
                    escapar(
                        item.historico
                    ) +
                    "</strong>" +
                    "<small>" +
                    item.quantidade +
                    " lançamento(s) · " +
                    escapar(
                        formatarMoeda(
                            item.total
                        )
                    ) +
                    (
                        regra
                            ? " · Exclusão automática: " +
                            escapar(
                                regra.rotulo
                            )
                            : ""
                    ) +
                    "</small>";

                checkbox.addEventListener(
                    "change",
                    function () {
                        if (
                            checkbox.checked
                        ) {
                            historicosExcluidosManualmente.add(
                                item.normalizado
                            );

                            historicosIncluidosManualmente.delete(
                                item.normalizado
                            );
                        } else {
                            historicosExcluidosManualmente.delete(
                                item.normalizado
                            );

                            historicosIncluidosManualmente.add(
                                item.normalizado
                            );
                        }

                        classificarMovimentacoes();
                        renderizarResultadosMovimentacao();
                    }
                );

                label.appendChild(
                    checkbox
                );

                label.appendChild(
                    texto
                );

                container.appendChild(
                    label
                );
            }
        );

    if (resumo) {
        resumo.textContent =
            mapa.size +
            " histórico(s) diferente(s) identificado(s). Marque para desconsiderar.";
    }
}

function limparMediaMovimentacao() {
    resetarEstadoMovimentacao();

    definirValorCampo(
        "textoExtratoMovimentacao",
        ""
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

    const mensal = obterTbody(
        "tabelaResumoMensalMovimentacao"
    );

    const considerados =
        obterTbody(
            "tabelaMovimentacoesConsideradas"
        );

    const excluidos =
        obterTbody(
            "tabelaMovimentacoesExcluidas"
        );

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

function extrairDataInicial(linha) {
    const m = String(
        linha || ""
    ).match(
        /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})(?=\s|$)/
    );

    if (!m) return null;

    const data = criarData(
        Number(m[1]),
        Number(m[2]),
        normalizarAno(
            Number(m[3]),
            m[3].length
        )
    );

    if (!data) return null;

    return {
        data,
        texto: m[0]
    };
}

function converterDataExtrato(texto) {
    const m = String(
        texto || ""
    )
        .trim()
        .match(
            /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/
        );

    if (!m) return null;

    return criarData(
        Number(m[1]),
        Number(m[2]),
        normalizarAno(
            Number(m[3]),
            m[3].length
        )
    );
}

function criarData(
    dia,
    mes,
    ano
) {
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

    const d = new Date(
        ano,
        mes - 1,
        dia,
        12,
        0,
        0,
        0
    );

    if (
        d.getFullYear() !==
        ano ||
        d.getMonth() !==
        mes - 1 ||
        d.getDate() !==
        dia
    ) {
        return null;
    }

    return d;
}

function normalizarAno(
    ano,
    tamanho
) {
    if (tamanho === 2) {
        return ano >= 70
            ? 1900 + ano
            : 2000 + ano;
    }

    return ano;
}

function formatarDataBrasileira(data) {
    if (
        !(data instanceof Date) ||
        Number.isNaN(
            data.getTime()
        )
    ) {
        return "";
    }

    return (
        String(
            data.getDate()
        ).padStart(
            2,
            "0"
        ) +
        "/" +
        String(
            data.getMonth() + 1
        ).padStart(
            2,
            "0"
        ) +
        "/" +
        data.getFullYear()
    );
}

function obterCompetenciaData(data) {
    return (
        data.getFullYear() +
        "-" +
        String(
            data.getMonth() + 1
        ).padStart(
            2,
            "0"
        )
    );
}

function calcularMesesInclusivos(
    inicio,
    fim
) {
    if (
        !inicio ||
        !fim
    ) {
        return 0;
    }

    return (
        (
            fim.getFullYear() -
            inicio.getFullYear()
        ) *
        12 +
        (
            fim.getMonth() -
            inicio.getMonth()
        ) +
        1
    );
}

function aplicarMascaraDataCampo(
    evento
) {
    const campo =
        evento.target;

    let valor = String(
        campo.value || ""
    )
        .replace(
            /\D/g,
            ""
        )
        .slice(
            0,
            8
        );

    if (
        valor.length > 4
    ) {
        valor =
            valor.slice(
                0,
                2
            ) +
            "/" +
            valor.slice(
                2,
                4
            ) +
            "/" +
            valor.slice(4);
    } else if (
        valor.length > 2
    ) {
        valor =
            valor.slice(
                0,
                2
            ) +
            "/" +
            valor.slice(2);
    }

    campo.value = valor;
}

function normalizarCampoMeses(
    campo
) {
    let n = Number(
        campo.value
    );

    if (
        !Number.isFinite(n) ||
        n < 1
    ) {
        campo.value = "";
        return;
    }

    campo.value =
        String(
            Math.trunc(n)
        );
}

function converterValorBrasileiro(
    valor
) {
    let texto = String(
        valor || ""
    )
        .replace(
            /R\$/gi,
            ""
        )
        .replace(
            /\s+/g,
            ""
        )
        .trim();

    if (!texto) {
        return NaN;
    }

    const negativo =
        texto.startsWith("-");

    texto = texto
        .replace(
            /^[+-]/,
            ""
        )
        .replace(
            /\./g,
            ""
        )
        .replace(
            ",",
            "."
        )
        .replace(
            /[^\d.]/g,
            ""
        );

    const numero =
        Number(texto);

    if (
        !Number.isFinite(
            numero
        )
    ) {
        return NaN;
    }

    return negativo
        ? -numero
        : numero;
}

function normalizarTexto(texto) {
    return String(
        texto || ""
    )
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toUpperCase()
        .replace(
            /&#X20;/gi,
            " "
        )
        .replace(
            /&#X9;/gi,
            " "
        )
        .replace(
            /\u00A0/g,
            " "
        )
        .replace(
            /[.,:;()[\]{}]+/g,
            " "
        )
        .replace(
            /[-–—]+/g,
            " "
        )
        .replace(
            /[*_=<>]+/g,
            " "
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}

function formatarCompetencia(comp) {
    const partes = String(
        comp || ""
    ).split("-");

    if (
        partes.length !==
        2
    ) {
        return comp;
    }

    return (
        partes[1] +
        "/" +
        partes[0]
    );
}

function formatarMoeda(valor) {
    return Number(
        valor || 0
    ).toLocaleString(
        "pt-BR",
        {
            style:
                "currency",
            currency:
                "BRL",
            minimumFractionDigits:
                2,
            maximumFractionDigits:
                2
        }
    );
}

function definirTexto(
    id,
    texto
) {
    const el =
        document.getElementById(
            id
        );

    if (el) {
        el.textContent =
            texto;
    }
}

function definirValorCampo(
    id,
    valor
) {
    const el =
        document.getElementById(
            id
        );

    if (el) {
        el.value =
            valor;
    }
}

function obterValorCampo(id) {
    const el =
        document.getElementById(
            id
        );

    return el
        ? String(
            el.value || ""
        )
        : "";
}

function obterTbody(id) {
    const tabela =
        document.getElementById(
            id
        );

    if (!tabela) {
        return null;
    }

    return tabela.tagName ===
        "TBODY"
        ? tabela
        : tabela.querySelector(
            "tbody"
        );
}

function inserirVazio(
    tbody,
    colunas,
    texto
) {
    const tr =
        document.createElement(
            "tr"
        );

    tr.innerHTML =
        '<td colspan="' +
        colunas +
        '" class="sem-dados">' +
        escapar(texto) +
        "</td>";

    tbody.appendChild(
        tr
    );
}

function escapar(texto) {
    return String(
        texto || ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}

window.MediaMovimentacao = {
    processar:
        processarMovimentacao,

    processarTexto:
        function (
            texto,
            opcoes
        ) {
            return processarTextoMovimentacao(
                String(
                    texto || ""
                ),
                opcoes || {}
            );
        },

    recalcular:
        function () {
            if (
                !movimentacoesExtrato.length
            ) {
                return;
            }

            aplicarPeriodoInformadoPeloUsuario();
            classificarMovimentacoes();
            renderizarHistoricosExtrato();
            renderizarResultadosMovimentacao();
        },

    obterMovimentacoes:
        function () {
            return movimentacoesExtrato.slice();
        },

    obterConsideradas:
        function () {
            return movimentacoesConsideradas.slice();
        },

    obterExcluidas:
        function () {
            return movimentacoesExcluidas.slice();
        },

    definirMesesConsiderados:
        function (
            quantidade
        ) {
            const n =
                Number(
                    quantidade
                );

            if (
                !Number.isFinite(n) ||
                n < 1
            ) {
                return;
            }

            const inteiro =
                Math.trunc(n);

            mesesDetectadosAutomaticos =
                inteiro;

            definirValorCampo(
                "mesesDetectadosMovimentacao",
                String(
                    inteiro
                )
            );

            definirValorCampo(
                "mesesConsideradosMovimentacao",
                String(
                    inteiro
                )
            );
        },

    definirCompetenciasDocumentadas:
        function (
            competencias
        ) {
            competenciasDocumentadasExternas =
                Array.from(
                    new Set(
                        (
                            competencias ||
                            []
                        ).filter(
                            Boolean
                        )
                    )
                ).sort();

            if (
                competenciasDocumentadasExternas.length
            ) {
                this.definirMesesConsiderados(
                    competenciasDocumentadasExternas.length
                );
            }
        },

    definirPeriodo:
        function (
            inicio,
            fim
        ) {
            if (
                inicio instanceof Date &&
                !Number.isNaN(
                    inicio.getTime()
                )
            ) {
                primeiraDataExtrato =
                    new Date(
                        inicio
                    );

                primeiraDataExtratoAutomatica =
                    new Date(
                        inicio
                    );

                definirValorCampo(
                    "primeiraDataMovimentacao",
                    formatarDataBrasileira(
                        inicio
                    )
                );
            }

            if (
                fim instanceof Date &&
                !Number.isNaN(
                    fim.getTime()
                )
            ) {
                ultimaDataExtrato =
                    new Date(
                        fim
                    );

                ultimaDataExtratoAutomatica =
                    new Date(
                        fim
                    );

                definirValorCampo(
                    "ultimaDataMovimentacao",
                    formatarDataBrasileira(
                        fim
                    )
                );
            }
        },

    obterResumo:
        function () {
            const calculo =
                calcularResultadosMovimentacao();

            return {
                total:
                    calculo.total,
                media:
                    calculo.media,
                meses:
                    calculo.meses,
                quantidadeConsideradas:
                    calculo
                        .consideradas
                        .length,
                quantidadeExcluidas:
                    movimentacoesExcluidas
                        .length,
                primeiraData:
                    primeiraDataExtrato,
                ultimaData:
                    ultimaDataExtrato,
                competenciasDocumentadas:
                    competenciasDocumentadasExternas.slice()
            };
        }
};