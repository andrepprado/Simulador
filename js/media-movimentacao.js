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

const historicosExcluidosManualmente = new Set();

/* =========================================================
   REGRAS DE EXCLUSÃO
========================================================= */

const REGRAS_EXCLUSAO_MOVIMENTACAO = [
    {
        id: "cred-emprestimo",
        rotulo: "CRÉD. EMPRÉSTIMO",
        motivo: "Empréstimo é dívida e não renda.",
        testar: function (historico) {
            return (
                historico.includes("CRED EMPRESTIMO") ||
                historico.includes("CREDITO EMPRESTIMO")
            );
        }
    },
    {
        id: "cred-liberacao-td",
        rotulo: "CRÉD. LIBERAÇÃO TD",
        motivo: "Antecipação de recebíveis não é considerada renda.",
        testar: function (historico) {
            return (
                historico.includes("CRED LIBERACAO TD") ||
                historico.includes("TITULO DESCONTADO")
            );
        }
    },
    {
        id: "cred-liberacao-bndes",
        rotulo: "CRÉD. LIBERAÇÃO BNDES",
        motivo: "Liberação de empréstimo junto ao BNDES não é renda.",
        testar: function (historico) {
            return historico.includes("CRED LIBERACAO BNDES");
        }
    },
    {
        id: "cred-liberacao-cartao",
        rotulo: "CRÉD. LIBERAÇÃO TÍTULO REC. CARTÃO",
        motivo: "Movimentação desconsiderada conforme regra definida.",
        testar: function (historico) {
            return (
                historico.includes("CRED LIBERACAO TITULO REC CARTAO") ||
                historico.includes("LIBERACAO TITULO REC CARTAO")
            );
        }
    },
    {
        id: "devolucao-pix",
        rotulo: "CRÉDITO DEVOLUÇÃO PIX",
        motivo: "Devolução não é renda.",
        testar: function (historico) {
            return (
                historico.includes("CRED DEVOLUCAO PIX") ||
                historico.includes("CREDITO DEVOLUCAO PIX")
            );
        }
    },
    {
        id: "est-pix-outra-if",
        rotulo: "EST. PIX EMITIDO OUTRA IF - MESMA TIT.",
        motivo: "Estorno não é renda.",
        testar: function (historico) {
            return (
                historico.includes("EST PIX EMITIDO OUTRA IF") &&
                historico.includes("MESMA TIT")
            );
        }
    },
    {
        id: "estorno-compra-mastercard",
        rotulo: "ESTORNO COMPRA NACIONAL DEBIT MASTERCARD",
        motivo: "Estorno não é renda.",
        testar: function (historico) {
            return historico.includes(
                "ESTORNO COMPRA NACIONAL DEBIT MASTERCARD"
            );
        }
    },
    {
        id: "estorno-deb-convenio",
        rotulo: "ESTORNO DÉB. CONV. DEMAIS EMPRESAS",
        motivo: "Estorno não é renda.",
        testar: function (historico) {
            return (
                historico.includes("ESTORNO DEB CONV DEMAIS EMPRESAS") ||
                historico.includes("ESTORNO DEB CONV DEMAIS EMPRESA")
            );
        }
    },
    {
        id: "estorno-generico",
        rotulo: "OUTROS ESTORNOS",
        motivo: "Estornos não representam renda.",
        testar: function (historico) {
            return (
                historico.startsWith("ESTORNO ") ||
                historico.startsWith("EST ")
            );
        }
    },
    {
        id: "resgate-rdc",
        rotulo: "RESGATE RDC",
        motivo: "Resgate de aplicação não é renda.",
        testar: function (historico) {
            return historico.includes("RESGATE RDC");
        }
    },
    {
        id: "saldo-anterior",
        rotulo: "SALDO ANTERIOR",
        motivo: "Linha informativa do extrato.",
        testar: function (historico) {
            return (
                historico.includes("SALDO ANTERIOR") ||
                historico.includes("SALDO BLOQUEADO ANTERIOR")
            );
        }
    },
    {
        id: "saldo-dia",
        rotulo: "SALDO DO DIA",
        motivo: "Linha informativa do extrato.",
        testar: function (historico) {
            return historico.includes("SALDO DO DIA");
        }
    }
];

/* =========================================================
   HISTÓRICOS QUE PERMITEM IDENTIFICAR CRÉDITO
   QUANDO O INDICADOR C NÃO VEM NO TEXTO
========================================================= */

const PADROES_CREDITO_SEM_INDICADOR = [
    "CRED TED STR",
    "CRED TRANSF CONTAS",
    "CRED TRANSF CONTAS INTERCREDIS",
    "DEP CHEQUE COOP AG",
    "DEP CHEQUE AG",
    "DEPOSITO CHEQUE AG",
    "DEP DINHEIRO",
    "DEPOSITO EM DINHEIRO AG",
    "DEPOSITO EM DINHEIRO",
    "LIBERACAO DE DEPOSITO BLOQUEADO",
    "PIX RECEBIDO",
    "TRANSF RECEBIDA",
    "TRANSFERENCIA RECEBIDA",
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
    const mesesConsiderados = document.getElementById(
        "mesesConsideradosMovimentacao"
    );

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

            classificarMovimentacoes();
            calcularResultadosMovimentacao();
            renderizarResultadosMovimentacao();
        });
    }

    if (mesesConsiderados) {
        mesesConsiderados.addEventListener("input", function () {
            if (movimentacoesExtrato.length === 0) {
                return;
            }

            calcularResultadosMovimentacao();
        });
    }
}

/* =========================================================
   PROCESSAMENTO PRINCIPAL
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

    movimentacoesExtrato = [];
    movimentacoesConsideradas = [];
    movimentacoesExcluidas = [];

    primeiraDataExtrato = null;
    ultimaDataExtrato = null;

    historicosExcluidosManualmente.clear();

    movimentacoesExtrato = interpretarExtratoMovimentacao(texto);

    if (movimentacoesExtrato.length === 0) {
        limparResultadosMovimentacao();
        renderizarHistoricosExtrato();

        alert(
            "Nenhum lançamento financeiro válido foi identificado no extrato."
        );

        return;
    }

    identificarPeriodoExtrato();
    classificarMovimentacoes();
    calcularResultadosMovimentacao();
    renderizarHistoricosExtrato();
    renderizarResultadosMovimentacao();
}

/* =========================================================
   INTERPRETAÇÃO DO EXTRATO
========================================================= */

function interpretarExtratoMovimentacao(textoOriginal) {
    const texto = prepararTrechoExtrato(textoOriginal);

    const linhas = String(texto || "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n");

    const movimentacoes = [];

    let dataCorrente = null;

    linhas.forEach(function (linhaOriginal, indice) {
        const linha = String(linhaOriginal || "").trim();

        if (!linha) {
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

/* =========================================================
   RECORTA SOMENTE O EXTRATO REAL
========================================================= */

function prepararTrechoExtrato(textoOriginal) {
    const linhas = String(textoOriginal || "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n");

    const linhasValidas = [];

    let encontrouMovimentacoes = false;

    for (const linha of linhas) {
        const linhaNormalizada = normalizarTexto(linha);

        if (
            linhaNormalizada.includes("DATADOCUMENTOHISTORICOVALOR") ||
            (
                linhaNormalizada.includes("DATA") &&
                linhaNormalizada.includes("DOCUMENTO") &&
                linhaNormalizada.includes("HISTORICO") &&
                linhaNormalizada.includes("VALOR")
            )
        ) {
            encontrouMovimentacoes = true;
            linhasValidas.push(linha);
            continue;
        }

        if (
            encontrouMovimentacoes &&
            (
                linhaNormalizada === "RESUMO" ||
                linhaNormalizada.includes("LANCAMENTOS FUTUROS")
            )
        ) {
            break;
        }

        linhasValidas.push(linha);
    }

    return linhasValidas.join("\n");
}

/* =========================================================
   LINHA EM FORMATO DE TABELA / MARKDOWN
========================================================= */

function interpretarLinhaTabelaExtrato(
    linha,
    dataCorrente,
    numeroLinha
) {
    let texto = String(linha || "").trim();

    if (!texto.includes("|")) {
        return null;
    }

    if (texto.startsWith("|")) {
        texto = texto.substring(1);
    }

    if (texto.endsWith("|")) {
        texto = texto.substring(
            0,
            texto.length - 1
        );
    }

    const colunas = texto.split("|");

    if (colunas.length < 4) {
        return null;
    }

    const dataTextoCelula = limparCelulaTexto(colunas[0]);
    const documento = limparCelulaTexto(colunas[1]);
    const historico = limparCelulaTexto(colunas[2]);
    const valorTextoCelula = limparCelulaValor(colunas[3]);

    let dataMovimentacao = null;

    if (validarFormatoDataBrasileira(dataTextoCelula)) {
        dataMovimentacao = converterDataBrasileira(
            dataTextoCelula
        );
    } else if (
        !dataTextoCelula ||
        ehCelulaVazia(dataTextoCelula)
    ) {
        dataMovimentacao = dataCorrente;
    } else {
        return null;
    }

    const novaDataCorrente =
        dataMovimentacao || dataCorrente;

    if (!dataMovimentacao) {
        return {
            dataCorrente: novaDataCorrente,
            movimentacao: null
        };
    }

    if (!historico) {
        return {
            dataCorrente: novaDataCorrente,
            movimentacao: null
        };
    }

    const dadosValor =
        extrairValorIndicador(valorTextoCelula);

    if (!dadosValor) {
        return {
            dataCorrente: novaDataCorrente,
            movimentacao: null
        };
    }

    const movimentacao =
        criarMovimentacaoExtrato({
            numeroLinha: numeroLinha,
            data: dataMovimentacao,
            documento: documento,
            historico: historico,
            valor: dadosValor.valor,
            indicador: dadosValor.indicador,
            original: linha
        });

    return {
        dataCorrente: novaDataCorrente,
        movimentacao: movimentacao
    };
}

/* =========================================================
   LINHA EM TEXTO SIMPLES / TAB
========================================================= */

function interpretarLinhaTextoExtrato(
    linha,
    dataCorrente,
    numeroLinha
) {
    let texto =
        String(linha || "")
            .replace(/\u00A0/g, " ")
            .trim();

    if (!texto) {
        return null;
    }

    let dataMovimentacao = null;
    let dataTexto = "";

    const correspondenciaData =
        texto.match(
            /^(\d{2}\/\d{2}\/\d{4})(?=\s|\t|$)/
        );

    if (correspondenciaData) {
        dataTexto =
            correspondenciaData[1];

        dataMovimentacao =
            converterDataBrasileira(
                dataTexto
            );

        texto = texto
            .substring(
                correspondenciaData[0].length
            )
            .trim();
    } else {
        dataMovimentacao =
            dataCorrente;
    }

    const novaDataCorrente =
        dataMovimentacao ||
        dataCorrente;

    if (!dataMovimentacao) {
        return null;
    }

    const dadosValor =
        extrairValorFinalLinha(texto);

    if (!dadosValor) {
        return {
            dataCorrente: novaDataCorrente,
            movimentacao: null
        };
    }

    const parteDescricao =
        dadosValor.parteDescricao;

    const dadosDescricao =
        separarDocumentoHistorico(
            parteDescricao
        );

    if (!dadosDescricao.historico) {
        return {
            dataCorrente: novaDataCorrente,
            movimentacao: null
        };
    }

    const movimentacao =
        criarMovimentacaoExtrato({
            numeroLinha: numeroLinha,
            data: dataMovimentacao,
            documento:
                dadosDescricao.documento,
            historico:
                dadosDescricao.historico,
            valor:
                dadosValor.valor,
            indicador:
                dadosValor.indicador,
            original:
                linha
        });

    return {
        dataCorrente:
            novaDataCorrente,
        movimentacao:
            movimentacao
    };
}

/* =========================================================
   CRIA OBJETO DE MOVIMENTAÇÃO
========================================================= */

function criarMovimentacaoExtrato(dados) {
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
        historico: String(
            dados.historico || ""
        ).trim(),
        historicoNormalizado:
            normalizarTexto(
                dados.historico
            ),
        valor: Math.abs(
            Number(
                dados.valor || 0
            )
        ),
        indicador: String(
            dados.indicador || ""
        ).toUpperCase(),
        original: dados.original || "",
        considerado: false,
        motivo: ""
    };
}

/* =========================================================
   VALOR FINAL DA LINHA
========================================================= */

function extrairValorFinalLinha(texto) {
    const valor = limparCelulaValor(texto);

    const regexValorFinal =
        /(-?\s*(?:R\$\s*)?(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2})\s*([CD*])?\s*$/i;

    const correspondencia =
        valor.match(regexValorFinal);

    if (!correspondencia) {
        return null;
    }

    const numero =
        converterValorBrasileiro(
            correspondencia[1]
        );

    if (!Number.isFinite(numero)) {
        return null;
    }

    const parteDescricao =
        valor
            .substring(
                0,
                correspondencia.index
            )
            .trim();

    return {
        valor: Math.abs(numero),
        indicador: String(
            correspondencia[2] || ""
        ).toUpperCase(),
        parteDescricao: parteDescricao
    };
}

/* =========================================================
   VALOR DE UMA CÉLULA
========================================================= */

function extrairValorIndicador(texto) {
    const valorTexto =
        limparCelulaValor(texto);

    const correspondencia =
        valorTexto.match(
            /(-?\s*(?:R\$\s*)?(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2})\s*([CD*])?\s*$/i
        );

    if (!correspondencia) {
        return null;
    }

    const valor =
        converterValorBrasileiro(
            correspondencia[1]
        );

    if (!Number.isFinite(valor)) {
        return null;
    }

    return {
        valor: Math.abs(valor),
        indicador: String(
            correspondencia[2] || ""
        ).toUpperCase()
    };
}

/* =========================================================
   DOCUMENTO / HISTÓRICO
========================================================= */

function separarDocumentoHistorico(texto) {
    const valor =
        limparCelulaTexto(texto);

    if (!valor) {
        return {
            documento: "",
            historico: ""
        };
    }

    const partesTab =
        valor
            .split(/\t+/)
            .map(function (item) {
                return item.trim();
            })
            .filter(Boolean);

    if (partesTab.length >= 2) {
        return {
            documento:
                partesTab[0],
            historico:
                partesTab
                    .slice(1)
                    .join(" ")
                    .trim()
        };
    }

    const partesEspaco =
        valor
            .split(/\s{2,}/)
            .map(function (item) {
                return item.trim();
            })
            .filter(Boolean);

    if (partesEspaco.length >= 2) {
        const primeiro =
            partesEspaco[0];

        if (
            primeiro.length <= 30
        ) {
            return {
                documento:
                    primeiro,
                historico:
                    partesEspaco
                        .slice(1)
                        .join(" ")
                        .trim()
            };
        }
    }

    const correspondenciaDocumento =
        valor.match(
            /^([0-9A-Z./-]{1,30})\s+(.+)$/i
        );

    if (
        correspondenciaDocumento &&
        pareceDocumento(
            correspondenciaDocumento[1]
        )
    ) {
        return {
            documento:
                correspondenciaDocumento[1],
            historico:
                correspondenciaDocumento[2]
                    .trim()
        };
    }

    return {
        documento: "",
        historico: valor
    };
}

function pareceDocumento(valor) {
    const texto =
        String(valor || "").trim();

    if (!texto) {
        return false;
    }

    if (/^\d+$/.test(texto)) {
        return true;
    }

    if (/^\d+[./-]\d+/.test(texto)) {
        return true;
    }

    if (
        /^(PIX|TITULO|PAGAMENTO|MASTERCARD)$/i.test(
            texto
        )
    ) {
        return true;
    }

    return false;
}

/* =========================================================
   LIMPEZA DAS CÉLULAS
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
    const marcadorAsterisco =
        "__ASTERISCO_INDICADOR__";

    let valor =
        String(texto || "")
            .replace(/\u00A0/g, " ")
            .replace(/&nbsp;/gi, " ")
            .replace(/<br\s*\/?>/gi, " ")
            .replace(
                /\\\*/g,
                marcadorAsterisco
            )
            .replace(/\*\*/g, "")
            .replace(/__/g, "")
            .trim();

    valor = valor
        .replace(
            new RegExp(
                marcadorAsterisco,
                "g"
            ),
            "*"
        )
        .trim();

    return valor;
}

function ehCelulaVazia(texto) {
    const valor =
        String(texto || "")
            .replace(/\u00A0/g, "")
            .trim();

    return !valor;
}

/* =========================================================
   PERÍODO
========================================================= */

function identificarPeriodoExtrato() {
    const datas =
        movimentacoesExtrato
            .map(function (movimentacao) {
                return movimentacao.data;
            })
            .filter(function (data) {
                return (
                    data instanceof Date &&
                    !Number.isNaN(
                        data.getTime()
                    )
                );
            });

    if (datas.length === 0) {
        primeiraDataExtrato = null;
        ultimaDataExtrato = null;

        definirValorCampo(
            "mesesDetectadosMovimentacao",
            ""
        );

        return;
    }

    const timestamps =
        datas.map(function (data) {
            return data.getTime();
        });

    primeiraDataExtrato =
        new Date(
            Math.min.apply(
                null,
                timestamps
            )
        );

    ultimaDataExtrato =
        new Date(
            Math.max.apply(
                null,
                timestamps
            )
        );

    const mesesDetectados =
        calcularQuantidadeMesesPeriodo(
            primeiraDataExtrato,
            ultimaDataExtrato
        );

    definirValorCampo(
        "mesesDetectadosMovimentacao",
        mesesDetectados
    );

    const inputMeses =
        document.getElementById(
            "mesesConsideradosMovimentacao"
        );

    if (inputMeses) {
        inputMeses.value =
            mesesDetectados;
    }

    atualizarExibicaoPeriodo();
}

/* =========================================================
   QUANTIDADE DE MESES
========================================================= */

function calcularQuantidadeMesesPeriodo(
    dataInicial,
    dataFinal
) {
    if (
        !(dataInicial instanceof Date) ||
        !(dataFinal instanceof Date) ||
        Number.isNaN(
            dataInicial.getTime()
        ) ||
        Number.isNaN(
            dataFinal.getTime()
        )
    ) {
        return 0;
    }

    let inicial =
        new Date(
            dataInicial.getTime()
        );

    let final =
        new Date(
            dataFinal.getTime()
        );

    if (
        inicial.getTime() >
        final.getTime()
    ) {
        const temporaria =
            inicial;

        inicial =
            final;

        final =
            temporaria;
    }

    const anoInicial =
        inicial.getFullYear();

    const mesInicial =
        inicial.getMonth();

    const anoFinal =
        final.getFullYear();

    const mesFinal =
        final.getMonth();

    return (
        (
            anoFinal -
            anoInicial
        ) *
        12 +
        (
            mesFinal -
            mesInicial
        ) +
        1
    );
}

/* =========================================================
   EXIBIÇÃO DO PERÍODO
========================================================= */

function atualizarExibicaoPeriodo() {
    const elementoPrimeira =
        document.getElementById(
            "primeiraDataMovimentacao"
        );

    const elementoUltima =
        document.getElementById(
            "ultimaDataMovimentacao"
        );

    if (elementoPrimeira) {
        if ("value" in elementoPrimeira) {
            elementoPrimeira.value =
                primeiraDataExtrato
                    ? formatarDataBrasileira(
                        primeiraDataExtrato
                    )
                    : "";
        } else {
            elementoPrimeira.textContent =
                primeiraDataExtrato
                    ? formatarDataBrasileira(
                        primeiraDataExtrato
                    )
                    : "-";
        }
    }

    if (elementoUltima) {
        if ("value" in elementoUltima) {
            elementoUltima.value =
                ultimaDataExtrato
                    ? formatarDataBrasileira(
                        ultimaDataExtrato
                    )
                    : "";
        } else {
            elementoUltima.textContent =
                ultimaDataExtrato
                    ? formatarDataBrasileira(
                        ultimaDataExtrato
                    )
                    : "-";
        }
    }
}

/* =========================================================
   CLASSIFICAÇÃO
========================================================= */

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
                classificacao.considerado
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

/* =========================================================
   CLASSIFICAÇÃO INDIVIDUAL
========================================================= */

function classificarMovimentacao(
    movimentacao
) {
    const historico =
        movimentacao.historicoNormalizado;

    const regraExclusao =
        localizarRegraExclusao(
            historico
        );

    if (regraExclusao) {
        return {
            considerado: false,
            motivo:
                regraExclusao.rotulo
        };
    }

    if (
        movimentacao.indicador === "D"
    ) {
        return {
            considerado: false,
            motivo: "Débito"
        };
    }

    if (
        movimentacao.indicador === "*"
    ) {
        return {
            considerado: false,
            motivo:
                "Valor bloqueado/informativo"
        };
    }

    if (
        historicosExcluidosManualmente.has(
            historico
        )
    ) {
        return {
            considerado: false,
            motivo:
                "Histórico excluído manualmente"
        };
    }

    if (
        movimentacao.indicador === "C"
    ) {
        return {
            considerado: true,
            motivo:
                "Crédito considerado"
        };
    }

    if (
        identificarCreditoSemIndicador(
            historico
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

/* =========================================================
   REGRA DE EXCLUSÃO
========================================================= */

function localizarRegraExclusao(
    historicoNormalizado
) {
    for (
        const regra
        of REGRAS_EXCLUSAO_MOVIMENTACAO
    ) {
        if (
            regra.testar(
                historicoNormalizado
            )
        ) {
            return regra;
        }
    }

    return null;
}

/* =========================================================
   CRÉDITO SEM INDICADOR
========================================================= */

function identificarCreditoSemIndicador(
    historico
) {
    return PADROES_CREDITO_SEM_INDICADOR.some(
        function (padrao) {
            return historico.includes(
                normalizarTexto(
                    padrao
                )
            );
        }
    );
}

/* =========================================================
   VERIFICA SE MOVIMENTAÇÃO TEM PERFIL DE CRÉDITO
========================================================= */

function ehCreditoPotencial(
    movimentacao
) {
    if (
        movimentacao.indicador === "C"
    ) {
        return true;
    }

    if (
        movimentacao.indicador === "D" ||
        movimentacao.indicador === "*"
    ) {
        return false;
    }

    return identificarCreditoSemIndicador(
        movimentacao.historicoNormalizado
    );
}

/* =========================================================
   HISTÓRICOS DO EXTRATO
========================================================= */

function renderizarHistoricosExtrato() {
    const container =
        document.getElementById(
            "listaRegrasMovimentacao"
        );

    const resumo =
        document.getElementById(
            "resumoRegrasMovimentacao"
        );

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (
        movimentacoesExtrato.length === 0
    ) {
        if (resumo) {
            resumo.textContent =
                "Processe um extrato para visualizar os históricos encontrados.";
        }

        const div =
            document.createElement(
                "div"
            );

        div.className =
            "sem-dados";

        div.textContent =
            "Nenhum histórico identificado.";

        container.appendChild(
            div
        );

        return;
    }

    const historicos =
        agruparHistoricosExtrato();

    if (resumo) {
        resumo.textContent =
            historicos.length +
            " histórico(s) diferente(s) identificado(s) em " +
            movimentacoesExtrato.length +
            " lançamento(s) do extrato.";
    }

    historicos.forEach(
        function (
            grupo,
            indice
        ) {
            const regraAutomatica =
                localizarRegraExclusao(
                    grupo.normalizado
                );

            const manual =
                historicosExcluidosManualmente.has(
                    grupo.normalizado
                );

            const podeExcluirManual =
                grupo.creditosPotenciais > 0 &&
                !regraAutomatica;

            const label =
                document.createElement(
                    "label"
                );

            label.className =
                "opcao-simulacao regra-movimentacao-item";

            let status = "";

            if (regraAutomatica) {
                status =
                    "Exclusão automática: " +
                    regraAutomatica.motivo;
            } else if (
                grupo.creditosPotenciais > 0
            ) {
                status =
                    grupo.creditosPotenciais +
                    " crédito(s) identificado(s)";
            } else if (
                grupo.debitos > 0
            ) {
                status =
                    grupo.debitos +
                    " débito(s) identificado(s)";
            } else {
                status =
                    "Movimentação informativa";
            }

            label.innerHTML = `
                <input
                    type="checkbox"
                    id="historico-movimentacao-${indice}"
                    ${regraAutomatica || manual ? "checked" : ""}
                    ${podeExcluirManual ? "" : "disabled"}
                >

                <span class="opcao-simulacao-conteudo">

                    <strong>
                        ${escaparHtml(
                grupo.historico
            )}
                    </strong>

                    <small>
                        ${escaparHtml(
                status
            )}
                        ·
                        ${grupo.quantidade}
                        ocorrência(s)
                    </small>

                </span>
            `;

            const checkbox =
                label.querySelector(
                    "input"
                );

            if (
                checkbox &&
                podeExcluirManual
            ) {
                checkbox.addEventListener(
                    "change",
                    function () {
                        if (
                            checkbox.checked
                        ) {
                            historicosExcluidosManualmente.add(
                                grupo.normalizado
                            );
                        } else {
                            historicosExcluidosManualmente.delete(
                                grupo.normalizado
                            );
                        }

                        classificarMovimentacoes();
                        calcularResultadosMovimentacao();
                        renderizarResultadosMovimentacao();
                    }
                );
            }

            container.appendChild(
                label
            );
        }
    );
}

/* =========================================================
   AGRUPA TODOS OS HISTÓRICOS ENCONTRADOS
========================================================= */

function agruparHistoricosExtrato() {
    const mapa = new Map();

    movimentacoesExtrato.forEach(
        function (movimentacao) {
            const chave =
                movimentacao.historicoNormalizado;

            if (!chave) {
                return;
            }

            if (!mapa.has(chave)) {
                mapa.set(
                    chave,
                    {
                        normalizado:
                            chave,
                        historico:
                            movimentacao.historico,
                        quantidade: 0,
                        creditosPotenciais: 0,
                        debitos: 0,
                        informativos: 0
                    }
                );
            }

            const grupo =
                mapa.get(chave);

            grupo.quantidade++;

            if (
                ehCreditoPotencial(
                    movimentacao
                )
            ) {
                grupo.creditosPotenciais++;
            } else if (
                movimentacao.indicador === "D"
            ) {
                grupo.debitos++;
            } else {
                grupo.informativos++;
            }
        }
    );

    return Array.from(
        mapa.values()
    ).sort(
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

/* =========================================================
   COMPATIBILIDADE COM CHAMADAS ANTIGAS
========================================================= */

function renderizarRegrasMovimentacao() {
    renderizarHistoricosExtrato();
}

/* =========================================================
   CÁLCULO
========================================================= */

function calcularResultadosMovimentacao() {
    const total =
        movimentacoesConsideradas.reduce(
            function (
                acumulado,
                movimentacao
            ) {
                return (
                    acumulado +
                    movimentacao.valor
                );
            },
            0
        );

    const mesesDetectados =
        calcularQuantidadeMesesPeriodo(
            primeiraDataExtrato,
            ultimaDataExtrato
        );

    let mesesConsiderados =
        obterNumeroCampo(
            "mesesConsideradosMovimentacao"
        );

    if (
        !mesesConsiderados ||
        mesesConsiderados <= 0
    ) {
        mesesConsiderados =
            mesesDetectados;
    }

    const media =
        mesesConsiderados > 0
            ? total /
            mesesConsiderados
            : 0;

    const creditosExcluidos =
        movimentacoesExcluidas.filter(
            function (movimentacao) {
                return ehCreditoPotencial(
                    movimentacao
                );
            }
        ).length;

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
        String(
            mesesConsiderados || 0
        )
    );

    definirTexto(
        "resultadoQtdConsiderados",
        String(
            movimentacoesConsideradas.length
        )
    );

    definirTexto(
        "resultadoQtdExcluidos",
        String(
            creditosExcluidos
        )
    );

    definirValorCampo(
        "mesesDetectadosMovimentacao",
        mesesDetectados
    );
}

/* =========================================================
   RENDERIZAÇÃO
========================================================= */

function renderizarResultadosMovimentacao() {
    renderizarTabelaResumoMensal();
    renderizarTabelaConsideradas();
    renderizarTabelaExcluidas();
}

/* =========================================================
   RESUMO MENSAL
========================================================= */

function renderizarTabelaResumoMensal() {
    const tbody =
        obterTbodyTabela(
            "tabelaResumoMensalMovimentacao"
        );

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    if (
        !primeiraDataExtrato ||
        !ultimaDataExtrato
    ) {
        inserirLinhaSemDados(
            tbody,
            3,
            "Nenhuma movimentação considerada."
        );

        return;
    }

    const agrupamento = {};

    const competenciasPeriodo =
        gerarCompetenciasPeriodo(
            primeiraDataExtrato,
            ultimaDataExtrato
        );

    competenciasPeriodo.forEach(
        function (competencia) {
            agrupamento[
                competencia
            ] = {
                competencia:
                    competencia,
                quantidade: 0,
                total: 0
            };
        }
    );

    movimentacoesConsideradas.forEach(
        function (movimentacao) {
            const competencia =
                movimentacao.competencia;

            if (
                !agrupamento[
                competencia
                ]
            ) {
                agrupamento[
                    competencia
                ] = {
                    competencia:
                        competencia,
                    quantidade: 0,
                    total: 0
                };
            }

            agrupamento[
                competencia
            ].quantidade++;

            agrupamento[
                competencia
            ].total +=
                movimentacao.valor;
        }
    );

    Object.keys(
        agrupamento
    )
        .sort()
        .forEach(
            function (competencia) {
                const grupo =
                    agrupamento[
                    competencia
                    ];

                const tr =
                    document.createElement(
                        "tr"
                    );

                tr.innerHTML = `
                    <td>
                        ${formatarCompetencia(
                    competencia
                )}
                    </td>

                    <td>
                        ${grupo.quantidade}
                    </td>

                    <td>
                        ${formatarMoeda(
                    grupo.total
                )}
                    </td>
                `;

                tbody.appendChild(
                    tr
                );
            }
        );
}

/* =========================================================
   GERA TODAS AS COMPETÊNCIAS ENTRE AS DATAS
========================================================= */

function gerarCompetenciasPeriodo(
    dataInicial,
    dataFinal
) {
    const competencias = [];

    if (
        !(dataInicial instanceof Date) ||
        !(dataFinal instanceof Date)
    ) {
        return competencias;
    }

    const atual =
        new Date(
            dataInicial.getFullYear(),
            dataInicial.getMonth(),
            1,
            12,
            0,
            0,
            0
        );

    const final =
        new Date(
            dataFinal.getFullYear(),
            dataFinal.getMonth(),
            1,
            12,
            0,
            0,
            0
        );

    while (
        atual.getTime() <=
        final.getTime()
    ) {
        competencias.push(
            obterCompetenciaData(
                atual
            )
        );

        atual.setMonth(
            atual.getMonth() + 1
        );
    }

    return competencias;
}

/* =========================================================
   TABELA CONSIDERADAS
========================================================= */

function renderizarTabelaConsideradas() {
    const tbody =
        obterTbodyTabela(
            "tabelaMovimentacoesConsideradas"
        );

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    if (
        movimentacoesConsideradas.length === 0
    ) {
        inserirLinhaSemDados(
            tbody,
            4,
            "Nenhuma movimentação considerada."
        );

        return;
    }

    movimentacoesConsideradas.forEach(
        function (movimentacao) {
            const tr =
                document.createElement(
                    "tr"
                );

            tr.innerHTML = `
                <td>
                    ${escaparHtml(
                movimentacao.dataTexto
            )}
                </td>

                <td>
                    ${escaparHtml(
                movimentacao.documento ||
                "-"
            )}
                </td>

                <td>
                    ${escaparHtml(
                movimentacao.historico
            )}
                </td>

                <td>
                    ${formatarMoeda(
                movimentacao.valor
            )}
                </td>
            `;

            tbody.appendChild(
                tr
            );
        }
    );
}

/* =========================================================
   TABELA EXCLUÍDAS
========================================================= */

function renderizarTabelaExcluidas() {
    const tbody =
        obterTbodyTabela(
            "tabelaMovimentacoesExcluidas"
        );

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    if (
        movimentacoesExcluidas.length === 0
    ) {
        inserirLinhaSemDados(
            tbody,
            5,
            "Nenhuma movimentação excluída."
        );

        return;
    }

    movimentacoesExcluidas.forEach(
        function (movimentacao) {
            const tr =
                document.createElement(
                    "tr"
                );

            tr.innerHTML = `
                <td>
                    ${escaparHtml(
                movimentacao.dataTexto
            )}
                </td>

                <td>
                    ${escaparHtml(
                movimentacao.documento ||
                "-"
            )}
                </td>

                <td>
                    ${escaparHtml(
                movimentacao.historico
            )}
                </td>

                <td>
                    ${formatarMoeda(
                movimentacao.valor
            )}
                </td>

                <td>
                    ${escaparHtml(
                movimentacao.motivo
            )}
                </td>
            `;

            tbody.appendChild(
                tr
            );
        }
    );
}

/* =========================================================
   LOCALIZA TBODY
========================================================= */

function obterTbodyTabela(id) {
    const elemento =
        document.getElementById(
            id
        );

    if (!elemento) {
        return null;
    }

    if (
        elemento.tagName &&
        elemento.tagName.toUpperCase() ===
        "TBODY"
    ) {
        return elemento;
    }

    if (
        elemento.tagName &&
        elemento.tagName.toUpperCase() ===
        "TABLE"
    ) {
        return elemento.querySelector(
            "tbody"
        );
    }

    return elemento;
}

/* =========================================================
   DATAS
========================================================= */

function validarFormatoDataBrasileira(
    valor
) {
    return /^\d{2}\/\d{2}\/\d{4}$/.test(
        String(valor || "").trim()
    );
}

function converterDataBrasileira(
    valor
) {
    const correspondencia =
        String(valor || "")
            .trim()
            .match(
                /^(\d{2})\/(\d{2})\/(\d{4})$/
            );

    if (!correspondencia) {
        return null;
    }

    const dia =
        Number(
            correspondencia[1]
        );

    const mes =
        Number(
            correspondencia[2]
        );

    const ano =
        Number(
            correspondencia[3]
        );

    if (
        dia < 1 ||
        dia > 31 ||
        mes < 1 ||
        mes > 12 ||
        ano < 1900 ||
        ano > 2200
    ) {
        return null;
    }

    const data =
        new Date(
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
        data.getMonth() !==
        mes - 1 ||
        data.getDate() !== dia
    ) {
        return null;
    }

    return data;
}

function formatarDataBrasileira(
    data
) {
    if (
        !(data instanceof Date) ||
        Number.isNaN(
            data.getTime()
        )
    ) {
        return "";
    }

    const dia =
        String(
            data.getDate()
        ).padStart(
            2,
            "0"
        );

    const mes =
        String(
            data.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const ano =
        data.getFullYear();

    return (
        dia +
        "/" +
        mes +
        "/" +
        ano
    );
}

function obterCompetenciaData(
    data
) {
    const ano =
        data.getFullYear();

    const mes =
        String(
            data.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    return (
        ano +
        "-" +
        mes
    );
}

function formatarCompetencia(
    competencia
) {
    const partes =
        String(
            competencia || ""
        ).split("-");

    if (
        partes.length !== 2
    ) {
        return competencia;
    }

    return (
        partes[1] +
        "/" +
        partes[0]
    );
}

/* =========================================================
   NORMALIZAÇÃO
========================================================= */

function normalizarTexto(
    texto
) {
    return String(texto || "")
        .replace(/\u00A0/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/\*\*/g, "")
        .replace(/__/g, "")
        .replace(/\\([*_])/g, "$1")
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toUpperCase()
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

/* =========================================================
   VALOR
========================================================= */

function converterValorBrasileiro(
    valor
) {
    let texto =
        String(valor || "")
            .replace(/R\$/gi, "")
            .replace(/\s/g, "")
            .trim();

    if (!texto) {
        return NaN;
    }

    texto =
        texto
            .replace(/\./g, "")
            .replace(",", ".");

    const numero =
        Number(texto);

    return Number.isFinite(
        numero
    )
        ? numero
        : NaN;
}

function formatarMoeda(
    valor
) {
    return Number(
        valor || 0
    ).toLocaleString(
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
   LIMPEZA
========================================================= */

function limparMediaMovimentacao() {
    movimentacoesExtrato = [];
    movimentacoesConsideradas = [];
    movimentacoesExcluidas = [];

    primeiraDataExtrato = null;
    ultimaDataExtrato = null;

    historicosExcluidosManualmente.clear();

    const textarea =
        document.getElementById(
            "textoExtratoMovimentacao"
        );

    const mesesConsiderados =
        document.getElementById(
            "mesesConsideradosMovimentacao"
        );

    const mesesDetectados =
        document.getElementById(
            "mesesDetectadosMovimentacao"
        );

    if (textarea) {
        textarea.value = "";
    }

    if (mesesConsiderados) {
        mesesConsiderados.value = "";
    }

    if (mesesDetectados) {
        mesesDetectados.value = "";
    }

    limparResultadosMovimentacao();
    renderizarHistoricosExtrato();
}

/* =========================================================
   LIMPEZA DOS RESULTADOS
========================================================= */

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
        "mesesDetectadosMovimentacao",
        ""
    );

    const primeira =
        document.getElementById(
            "primeiraDataMovimentacao"
        );

    const ultima =
        document.getElementById(
            "ultimaDataMovimentacao"
        );

    if (primeira) {
        if ("value" in primeira) {
            primeira.value = "";
        } else {
            primeira.textContent = "-";
        }
    }

    if (ultima) {
        if ("value" in ultima) {
            ultima.value = "";
        } else {
            ultima.textContent = "-";
        }
    }

    const tabelaMensal =
        obterTbodyTabela(
            "tabelaResumoMensalMovimentacao"
        );

    const tabelaConsideradas =
        obterTbodyTabela(
            "tabelaMovimentacoesConsideradas"
        );

    const tabelaExcluidas =
        obterTbodyTabela(
            "tabelaMovimentacoesExcluidas"
        );

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
            4,
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
   HELPERS DE DOM
========================================================= */

function definirTexto(
    id,
    valor
) {
    const elemento =
        document.getElementById(
            id
        );

    if (elemento) {
        elemento.textContent =
            valor;
    }
}

function definirValorCampo(
    id,
    valor
) {
    const elemento =
        document.getElementById(
            id
        );

    if (elemento) {
        elemento.value =
            valor;
    }
}

function obterNumeroCampo(
    id
) {
    const elemento =
        document.getElementById(
            id
        );

    if (!elemento) {
        return 0;
    }

    const numero =
        Number(
            elemento.value
        );

    return Number.isFinite(
        numero
    )
        ? numero
        : 0;
}

function inserirLinhaSemDados(
    tbody,
    colunas,
    mensagem
) {
    const tr =
        document.createElement(
            "tr"
        );

    tr.className =
        "tabela-sem-dados";

    tr.innerHTML = `
        <td
            colspan="${colunas}"
            class="sem-dados"
        >
            ${escaparHtml(
        mensagem
    )}
        </td>
    `;

    tbody.appendChild(
        tr
    );
}

function escaparHtml(
    texto
) {
    return String(texto || "")
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