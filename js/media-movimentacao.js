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

let formatoDataExtrato = "DMY";

const historicosExcluidosManualmente = new Set();

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
        ignorarPeriodo: false,
        testar: function (historico) {
            return (
                historico.includes("CRED LIBERACAO TD") ||
                historico.includes("CREDITO LIBERACAO TD") ||
                historico.includes("TITULO DESCONTADO")
            );
        }
    },
    {
        id: "cred-liberacao-bndes",
        rotulo: "CRÉD. LIBERAÇÃO BNDES",
        motivo: "Liberação de empréstimo junto ao BNDES não é renda.",
        ignorarPeriodo: false,
        testar: function (historico) {
            return (
                historico.includes("CRED LIBERACAO BNDES") ||
                historico.includes("CREDITO LIBERACAO BNDES")
            );
        }
    },
    {
        id: "cred-liberacao-cartao",
        rotulo: "CRÉD. LIBERAÇÃO TÍTULO REC. CARTÃO",
        motivo: "Movimentação desconsiderada conforme regra definida.",
        ignorarPeriodo: false,
        testar: function (historico) {
            return (
                historico.includes("CRED LIBERACAO TITULO REC CARTAO") ||
                historico.includes("CREDITO LIBERACAO TITULO REC CARTAO") ||
                historico.includes("LIBERACAO TITULO REC CARTAO")
            );
        }
    },
    {
        id: "devolucao-pix",
        rotulo: "CRÉDITO DEVOLUÇÃO PIX",
        motivo: "Devolução de PIX não representa renda.",
        ignorarPeriodo: false,
        testar: function (historico) {
            return (
                historico.includes("CRED DEVOLUCAO PIX") ||
                historico.includes("CREDITO DEVOLUCAO PIX") ||
                historico.includes("DEVOLUCAO PIX")
            );
        }
    },
    {
        id: "coopera-resgate-pontos",
        rotulo: "COOPERA - CRÉDITO RESGATE PONTOS C/C",
        motivo: "Resgate de pontos do programa Coopera não representa renda ou depósito operacional.",
        ignorarPeriodo: false,
        testar: function (historico) {
            return (
                historico.includes("COOPERA CREDITO RESGATE PONTOS") ||
                historico.includes("COOPERA CRED RESGATE PONTOS") ||
                (
                    historico.includes("COOPERA") &&
                    historico.includes("RESGATE") &&
                    historico.includes("PONTOS")
                )
            );
        }
    },
    {
        id: "est-pix-outra-if",
        rotulo: "EST. PIX EMITIDO OUTRA IF - MESMA TIT.",
        motivo: "Estorno não representa renda.",
        ignorarPeriodo: false,
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
        motivo: "Estorno não representa renda.",
        ignorarPeriodo: false,
        testar: function (historico) {
            return historico.includes(
                "ESTORNO COMPRA NACIONAL DEBIT MASTERCARD"
            );
        }
    },
    {
        id: "estorno-deb-convenio",
        rotulo: "ESTORNO DÉB. CONV. DEMAIS EMPRESAS",
        motivo: "Estorno não representa renda.",
        ignorarPeriodo: false,
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
        ignorarPeriodo: false,
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
        motivo: "Resgate de aplicação não representa renda.",
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
            return historico.includes("SALDO ANTERIOR");
        }
    },
    {
        id: "saldo-dia",
        rotulo: "SALDO DO DIA",
        motivo: "Linha informativa do extrato.",
        ignorarPeriodo: true,
        testar: function (historico) {
            return (
                historico.includes("SALDO DO DIA") ||
                historico.includes("SALDO FINAL DO DIA")
            );
        }
    }
];

/* =========================================================
   PADRÕES DE CRÉDITO
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
    "CRED DISTRIBUICAO SOBRAS VALORES",
    "CR COMPRAS",
    "CR ANTECIPACAO"
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
    const btnProcessar = document.getElementById(
        "btnProcessarMovimentacao"
    );

    const btnLimpar = document.getElementById(
        "btnLimparMovimentacao"
    );

    const btnRecalcular = document.getElementById(
        "btnRecalcularMovimentacao"
    );

    const primeiraData = document.getElementById(
        "primeiraDataMovimentacao"
    );

    const ultimaData = document.getElementById(
        "ultimaDataMovimentacao"
    );

    const mesesDetectados = document.getElementById(
        "mesesDetectadosMovimentacao"
    );

    const mesesConsiderados = document.getElementById(
        "mesesConsideradosMovimentacao"
    );

    if (btnProcessar) {
        btnProcessar.addEventListener(
            "click",
            processarMovimentacao
        );
    }

    if (btnLimpar) {
        btnLimpar.addEventListener(
            "click",
            limparMediaMovimentacao
        );
    }

    if (btnRecalcular) {
        btnRecalcular.addEventListener(
            "click",
            recalcularTudoMovimentacao
        );
    }

    if (primeiraData) {
        primeiraData.addEventListener(
            "blur",
            aplicarPeriodoInformadoManualmente
        );

        primeiraData.addEventListener(
            "change",
            aplicarPeriodoInformadoManualmente
        );
    }

    if (ultimaData) {
        ultimaData.addEventListener(
            "blur",
            aplicarPeriodoInformadoManualmente
        );

        ultimaData.addEventListener(
            "change",
            aplicarPeriodoInformadoManualmente
        );
    }

    if (mesesDetectados) {
        mesesDetectados.addEventListener(
            "input",
            function () {
                normalizarCampoMeses(
                    mesesDetectados
                );
            }
        );
    }

    if (mesesConsiderados) {
        mesesConsiderados.addEventListener(
            "input",
            function () {
                if (
                    movimentacoesExtrato.length === 0
                ) {
                    return;
                }

                calcularResultadosMovimentacao();
            }
        );

        mesesConsiderados.addEventListener(
            "blur",
            function () {
                normalizarCampoMeses(
                    mesesConsiderados
                );

                if (
                    movimentacoesExtrato.length === 0
                ) {
                    return;
                }

                calcularResultadosMovimentacao();
            }
        );
    }
}

/* =========================================================
   PROCESSAMENTO PRINCIPAL
========================================================= */

function processarMovimentacao() {
    const textarea = document.getElementById(
        "textoExtratoMovimentacao"
    );

    if (!textarea) {
        return;
    }

    const textoOriginal = String(
        textarea.value || ""
    ).trim();

    if (!textoOriginal) {
        alert(
            "Cole o extrato no campo de texto."
        );

        return;
    }

    resetarEstadoMovimentacao();

    const trechoExtrato =
        prepararTrechoExtrato(
            textoOriginal
        );

    formatoDataExtrato =
        detectarFormatoDatasMovimentacao(
            trechoExtrato
        );

    movimentacoesExtrato =
        interpretarExtratoMovimentacao(
            trechoExtrato,
            formatoDataExtrato
        );

    if (
        movimentacoesExtrato.length === 0
    ) {
        limparResultadosMovimentacao();
        renderizarHistoricosExtrato();

        alert(
            "Nenhum lançamento financeiro válido foi identificado no extrato."
        );

        return;
    }

    inicializarExclusoesAutomaticas();
    identificarPeriodoExtrato();
    classificarMovimentacoes();
    calcularResultadosMovimentacao();
    renderizarHistoricosExtrato();
    renderizarResultadosMovimentacao();
}

/* =========================================================
   RECÁLCULO
========================================================= */

function recalcularTudoMovimentacao() {
    if (
        movimentacoesExtrato.length === 0
    ) {
        return;
    }

    aplicarPeriodoInformadoManualmente(
        false
    );

    classificarMovimentacoes();
    calcularResultadosMovimentacao();
    renderizarHistoricosExtrato();
    renderizarResultadosMovimentacao();
}

/* =========================================================
   RESET
========================================================= */

function resetarEstadoMovimentacao() {
    movimentacoesExtrato = [];
    movimentacoesConsideradas = [];
    movimentacoesExcluidas = [];

    primeiraDataExtrato = null;
    ultimaDataExtrato = null;

    formatoDataExtrato = "DMY";

    historicosExcluidosManualmente.clear();
}

/* =========================================================
   RECORTE DO EXTRATO
========================================================= */

function prepararTrechoExtrato(
    textoOriginal
) {
    const linhas = String(
        textoOriginal || ""
    )
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n");

    let indiceCabecalho = -1;

    for (
        let i = 0;
        i < linhas.length;
        i++
    ) {
        const normalizada =
            normalizarTexto(
                linhas[i]
            );

        if (
            normalizada.includes("DATA") &&
            normalizada.includes("HISTORICO") &&
            normalizada.includes("VALOR")
        ) {
            indiceCabecalho = i;
            break;
        }
    }

    const inicio =
        indiceCabecalho >= 0
            ? indiceCabecalho + 1
            : 0;

    const linhasValidas = [];

    for (
        let i = inicio;
        i < linhas.length;
        i++
    ) {
        const linha =
            linhas[i];

        const normalizada =
            normalizarTexto(
                linha
            );

        if (
            normalizada === "RESUMO" ||
            normalizada.startsWith(
                "RESUMO "
            ) ||
            normalizada.includes(
                "LANCAMENTOS FUTUROS"
            )
        ) {
            break;
        }

        linhasValidas.push(
            linha
        );
    }

    return linhasValidas.join(
        "\n"
    );
}

/* =========================================================
   DETECÇÃO DO FORMATO DA DATA
========================================================= */

function detectarFormatoDatasMovimentacao(
    texto
) {
    const linhas = String(
        texto || ""
    )
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n");

    let evidenciasDMY = 0;
    let evidenciasMDY = 0;

    linhas.forEach(
        function (linhaOriginal) {
            const linha =
                String(
                    linhaOriginal || ""
                ).trim();

            if (!linha) {
                return;
            }

            const normalizada =
                normalizarTexto(
                    linha
                );

            /*
             * Essas linhas nunca podem determinar
             * o formato de data do extrato.
             */
            if (
                normalizada.includes(
                    "SALDO ANTERIOR"
                ) ||
                normalizada.includes(
                    "SALDO BLOQUEADO ANTERIOR"
                ) ||
                normalizada.includes(
                    "SALDO DO DIA"
                )
            ) {
                return;
            }

            /*
             * Somente linhas que parecem lançamentos
             * financeiros participam da inferência.
             */
            if (
                !possuiValorFinanceiroFinal(
                    linha
                )
            ) {
                return;
            }

            const correspondencia =
                linha.match(
                    /^\|?\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?=\s|\t|\||$)/
                );

            if (!correspondencia) {
                return;
            }

            const primeiraParte =
                Number(
                    correspondencia[1]
                );

            const segundaParte =
                Number(
                    correspondencia[2]
                );

            /*
             * 18/09 só pode ser DD/MM.
             */
            if (
                primeiraParte > 12 &&
                segundaParte <= 12
            ) {
                evidenciasDMY++;
                return;
            }

            /*
             * 8/31 só pode ser MM/DD.
             */
            if (
                segundaParte > 12 &&
                primeiraParte <= 12
            ) {
                evidenciasMDY++;
            }
        }
    );

    /*
     * O padrão oficial/preferencial continua sendo
     * brasileiro DD/MM/AAAA.
     *
     * MM/DD só é utilizado quando as movimentações
     * efetivas fornecem evidência objetiva.
     */
    if (
        evidenciasMDY >
        evidenciasDMY
    ) {
        return "MDY";
    }

    return "DMY";
}

/* =========================================================
   INTERPRETAÇÃO
========================================================= */

function interpretarExtratoMovimentacao(
    texto,
    formatoPreferencial = "DMY"
) {
    const linhas = String(
        texto || ""
    )
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n");

    const movimentacoes = [];

    let dataCorrente = null;

    linhas.forEach(
        function (
            linhaOriginal,
            indice
        ) {
            const linha =
                String(
                    linhaOriginal || ""
                ).trim();

            if (!linha) {
                return;
            }

            if (
                deveIgnorarLinhaExtrato(
                    linha
                )
            ) {
                return;
            }

            let resultado = null;

            if (
                linha.includes("|")
            ) {
                resultado =
                    interpretarLinhaTabelaExtrato(
                        linha,
                        dataCorrente,
                        indice + 1,
                        formatoPreferencial
                    );
            }

            if (!resultado) {
                resultado =
                    interpretarLinhaTextoExtrato(
                        linha,
                        dataCorrente,
                        indice + 1,
                        formatoPreferencial
                    );
            }

            if (!resultado) {
                return;
            }

            if (
                resultado.dataCorrente
            ) {
                dataCorrente =
                    resultado.dataCorrente;
            }

            if (
                resultado.movimentacao
            ) {
                movimentacoes.push(
                    resultado.movimentacao
                );
            }
        }
    );

    /*
     * Não removemos duplicidades.
     *
     * Duas transações podem legitimamente possuir
     * mesma data, histórico, documento e valor.
     */
    return movimentacoes;
}

/* =========================================================
   LINHAS IGNORADAS
========================================================= */

function deveIgnorarLinhaExtrato(
    linha
) {
    const texto = String(
        linha || ""
    ).trim();

    if (!texto) {
        return true;
    }

    if (
        /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/.test(
            texto
        )
    ) {
        return true;
    }

    const normalizado =
        normalizarTexto(
            texto
        );

    if (!normalizado) {
        return true;
    }

    if (
        normalizado ===
        "DATA DOCUMENTO HISTORICO VALOR"
    ) {
        return true;
    }

    if (
        normalizado ===
        "DATA HISTORICO VALOR"
    ) {
        return true;
    }

    return false;
}

/* =========================================================
   LINHA TABELADA
========================================================= */

function interpretarLinhaTabelaExtrato(
    linha,
    dataCorrente,
    numeroLinha,
    formatoPreferencial
) {
    let texto = String(
        linha || ""
    ).trim();

    if (
        !texto.includes("|")
    ) {
        return null;
    }

    if (
        texto.startsWith("|")
    ) {
        texto =
            texto.substring(1);
    }

    if (
        texto.endsWith("|")
    ) {
        texto =
            texto.substring(
                0,
                texto.length - 1
            );
    }

    const colunas =
        texto
            .split("|")
            .map(function (item) {
                return item.trim();
            });

    if (
        colunas.length < 3
    ) {
        return null;
    }

    const dataTexto =
        limparCelulaTexto(
            colunas[0]
        );

    const valorTexto =
        limparCelulaValor(
            colunas[
            colunas.length - 1
            ]
        );

    let documento = "";
    let historico = "";

    if (
        colunas.length >= 4
    ) {
        documento =
            limparCelulaTexto(
                colunas[1]
            );

        historico =
            colunas
                .slice(
                    2,
                    colunas.length - 1
                )
                .map(
                    limparCelulaTexto
                )
                .filter(Boolean)
                .join(" ");
    } else {
        historico =
            limparCelulaTexto(
                colunas[1]
            );
    }

    let dataMovimentacao =
        dataCorrente;

    if (dataTexto) {
        dataMovimentacao =
            converterDataExtrato(
                dataTexto,
                formatoPreferencial
            );

        if (!dataMovimentacao) {
            return null;
        }
    }

    if (
        !dataMovimentacao ||
        !historico
    ) {
        return {
            dataCorrente:
                dataMovimentacao ||
                dataCorrente,
            movimentacao: null
        };
    }

    const dadosValor =
        extrairValorIndicador(
            valorTexto
        );

    if (!dadosValor) {
        return {
            dataCorrente:
                dataMovimentacao,
            movimentacao: null
        };
    }

    return {
        dataCorrente:
            dataMovimentacao,

        movimentacao:
            criarMovimentacaoExtrato({
                numeroLinha,
                data:
                    dataMovimentacao,
                documento,
                historico,
                valor:
                    dadosValor.valor,
                indicador:
                    dadosValor.indicador,
                original:
                    linha
            })
    };
}

/* =========================================================
   LINHA TEXTO/TAB
========================================================= */

function interpretarLinhaTextoExtrato(
    linha,
    dataCorrente,
    numeroLinha,
    formatoPreferencial
) {
    let texto = String(
        linha || ""
    )
        .replace(/\u00A0/g, " ")
        .trim();

    if (!texto) {
        return null;
    }

    let dataMovimentacao =
        dataCorrente;

    const correspondenciaData =
        texto.match(
            /^(\d{1,2}\/\d{1,2}\/\d{2,4})(?=\s|\t|$)/
        );

    if (correspondenciaData) {
        dataMovimentacao =
            converterDataExtrato(
                correspondenciaData[1],
                formatoPreferencial
            );

        if (!dataMovimentacao) {
            return null;
        }

        texto =
            texto
                .substring(
                    correspondenciaData[0]
                        .length
                )
                .trim();
    }

    if (!dataMovimentacao) {
        return null;
    }

    const dadosValor =
        extrairValorFinalLinha(
            texto
        );

    if (!dadosValor) {
        return {
            dataCorrente:
                dataMovimentacao,
            movimentacao:
                null
        };
    }

    const dadosDescricao =
        separarDocumentoHistorico(
            dadosValor.parteDescricao
        );

    if (
        !dadosDescricao.historico
    ) {
        return {
            dataCorrente:
                dataMovimentacao,
            movimentacao:
                null
        };
    }

    return {
        dataCorrente:
            dataMovimentacao,

        movimentacao:
            criarMovimentacaoExtrato({
                numeroLinha,
                data:
                    dataMovimentacao,
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
            })
    };
}

/* =========================================================
   CRIA MOVIMENTAÇÃO
========================================================= */

function criarMovimentacaoExtrato(
    dados
) {
    const historico =
        limparCelulaTexto(
            dados.historico
        );

    return {
        linha:
            dados.numeroLinha,

        data:
            dados.data,

        dataTexto:
            formatarDataBrasileira(
                dados.data
            ),

        competencia:
            obterCompetenciaData(
                dados.data
            ),

        documento:
            String(
                dados.documento || ""
            ).trim(),

        historico:
            historico,

        historicoNormalizado:
            normalizarTexto(
                historico
            ),

        valor:
            Math.abs(
                Number(
                    dados.valor || 0
                )
            ),

        indicador:
            String(
                dados.indicador || ""
            ).toUpperCase(),

        original:
            dados.original || "",

        considerado:
            false,

        motivo:
            ""
    };
}

/* =========================================================
   VALOR FINANCEIRO
========================================================= */

function possuiValorFinanceiroFinal(
    texto
) {
    return /(?:R\$\s*)?(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2}\s*[CD*]?\s*$/i.test(
        String(
            texto || ""
        ).trim()
    );
}

function extrairValorFinalLinha(
    texto
) {
    const valor =
        limparCelulaValor(
            texto
        );

    const regexValorFinal =
        /(-?\s*(?:R\$\s*)?(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2})\s*([CD*])?\s*$/i;

    const correspondencia =
        valor.match(
            regexValorFinal
        );

    if (!correspondencia) {
        return null;
    }

    const numero =
        converterValorBrasileiro(
            correspondencia[1]
        );

    if (
        !Number.isFinite(
            numero
        )
    ) {
        return null;
    }

    let indicador =
        String(
            correspondencia[2] || ""
        ).toUpperCase();

    if (
        !indicador &&
        numero < 0
    ) {
        indicador = "D";
    }

    return {
        valor:
            Math.abs(
                numero
            ),

        indicador,

        parteDescricao:
            valor
                .substring(
                    0,
                    correspondencia.index
                )
                .trim()
    };
}

function extrairValorIndicador(
    texto
) {
    const valorTexto =
        limparCelulaValor(
            texto
        );

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

    if (
        !Number.isFinite(
            valor
        )
    ) {
        return null;
    }

    let indicador =
        String(
            correspondencia[2] || ""
        ).toUpperCase();

    if (
        !indicador &&
        valor < 0
    ) {
        indicador = "D";
    }

    return {
        valor:
            Math.abs(
                valor
            ),
        indicador
    };
}

/* =========================================================
   DOCUMENTO / HISTÓRICO
========================================================= */

function separarDocumentoHistorico(
    texto
) {
    const original = String(
        texto || ""
    )
        .replace(/\u00A0/g, " ")
        .trim();

    if (!original) {
        return {
            documento: "",
            historico: ""
        };
    }

    /*
     * Extrato copiado do SISBR normalmente conserva TABs.
     * Havendo duas colunas, a primeira é Documento
     * e a segunda é Histórico.
     */
    const partesTab =
        original
            .split(/\t+/)
            .map(function (item) {
                return item.trim();
            })
            .filter(Boolean);

    if (
        partesTab.length >= 2
    ) {
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

    /*
     * Quando o documento está vazio, pode restar apenas
     * o histórico.
     */
    if (
        partesTab.length === 1
    ) {
        return {
            documento: "",
            historico:
                partesTab[0]
        };
    }

    const limpo =
        limparCelulaTexto(
            original
        );

    const partesEspaco =
        limpo
            .split(/\s{2,}/)
            .map(function (item) {
                return item.trim();
            })
            .filter(Boolean);

    if (
        partesEspaco.length >= 2
    ) {
        if (
            pareceDocumento(
                partesEspaco[0]
            )
        ) {
            return {
                documento:
                    partesEspaco[0],

                historico:
                    partesEspaco
                        .slice(1)
                        .join(" ")
            };
        }

        return {
            documento: "",
            historico:
                partesEspaco.join(" ")
        };
    }

    const correspondencia =
        limpo.match(
            /^([0-9A-Z./-]{1,30})\s+(.+)$/i
        );

    if (
        correspondencia &&
        pareceDocumento(
            correspondencia[1]
        )
    ) {
        return {
            documento:
                correspondencia[1],

            historico:
                correspondencia[2]
        };
    }

    return {
        documento: "",
        historico:
            limpo
    };
}

function pareceDocumento(
    valor
) {
    const texto = String(
        valor || ""
    ).trim();

    if (
        !texto ||
        texto.length > 30
    ) {
        return false;
    }

    if (
        /^\d+$/.test(
            texto
        )
    ) {
        return true;
    }

    if (
        /^\d+[./-]\d+/.test(
            texto
        )
    ) {
        return true;
    }

    if (
        /^[A-Z]{0,5}\d+[A-Z0-9./-]*$/i.test(
            texto
        )
    ) {
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
   CÉLULAS
========================================================= */

function limparCelulaTexto(
    texto
) {
    return String(
        texto || ""
    )
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

function limparCelulaValor(
    texto
) {
    const marcador =
        "__ASTERISCO_INDICADOR__";

    let valor = String(
        texto || ""
    )
        .replace(/\u00A0/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/<br\s*\/?>/gi, " ")
        .replace(
            /\\\*/g,
            marcador
        )
        .replace(/\*\*/g, "")
        .replace(/__/g, "")
        .trim();

    valor =
        valor.replace(
            new RegExp(
                marcador,
                "g"
            ),
            "*"
        );

    return valor.trim();
}

/* =========================================================
   DATAS DO EXTRATO
========================================================= */

function converterDataExtrato(
    valor,
    formatoPreferencial = "DMY"
) {
    const correspondencia =
        String(
            valor || ""
        )
            .trim()
            .match(
                /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/
            );

    if (!correspondencia) {
        return null;
    }

    const parte1 =
        Number(
            correspondencia[1]
        );

    const parte2 =
        Number(
            correspondencia[2]
        );

    let ano =
        Number(
            correspondencia[3]
        );

    if (
        correspondencia[3]
            .length === 2
    ) {
        ano +=
            ano >= 70
                ? 1900
                : 2000;
    }

    let dia;
    let mes;

    /*
     * 31/07 só pode ser DD/MM.
     */
    if (
        parte1 > 12 &&
        parte2 <= 12
    ) {
        dia = parte1;
        mes = parte2;
    }

    /*
     * 7/31 só pode ser MM/DD.
     */
    else if (
        parte2 > 12 &&
        parte1 <= 12
    ) {
        mes = parte1;
        dia = parte2;
    }

    /*
     * 03/08 é ambígua.
     * Utiliza o formato identificado pelas movimentações.
     */
    else if (
        formatoPreferencial === "MDY"
    ) {
        mes = parte1;
        dia = parte2;
    }

    /*
     * Padrão oficial da ferramenta:
     * DD/MM/AAAA.
     */
    else {
        dia = parte1;
        mes = parte2;
    }

    return criarDataSegura(
        dia,
        mes,
        ano
    );
}

function converterDataBrasileira(
    valor
) {
    const correspondencia =
        String(
            valor || ""
        )
            .trim()
            .match(
                /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/
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

    let ano =
        Number(
            correspondencia[3]
        );

    if (
        correspondencia[3]
            .length === 2
    ) {
        ano +=
            ano >= 70
                ? 1900
                : 2000;
    }

    return criarDataSegura(
        dia,
        mes,
        ano
    );
}

function criarDataSegura(
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

function possuiDataValida(
    data
) {
    return (
        data instanceof Date &&
        !Number.isNaN(
            data.getTime()
        )
    );
}

function formatarDataBrasileira(
    data
) {
    if (
        !possuiDataValida(
            data
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

    return (
        dia +
        "/" +
        mes +
        "/" +
        data.getFullYear()
    );
}

/* =========================================================
   PERÍODO
========================================================= */

function identificarPeriodoExtrato() {
    const movimentacoesPeriodo =
        movimentacoesExtrato.filter(
            function (movimentacao) {
                return (
                    possuiDataValida(
                        movimentacao.data
                    ) &&
                    !deveIgnorarMovimentacaoNaDeteccaoPeriodo(
                        movimentacao
                    )
                );
            }
        );

    if (
        movimentacoesPeriodo.length === 0
    ) {
        primeiraDataExtrato = null;
        ultimaDataExtrato = null;

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

        return;
    }

    const timestamps =
        movimentacoesPeriodo.map(
            function (movimentacao) {
                return movimentacao
                    .data
                    .getTime();
            }
        );

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

    const meses =
        calcularQuantidadeMesesPeriodo(
            primeiraDataExtrato,
            ultimaDataExtrato
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
        meses
    );

    definirValorCampo(
        "mesesConsideradosMovimentacao",
        meses
    );
}

function deveIgnorarMovimentacaoNaDeteccaoPeriodo(
    movimentacao
) {
    if (
        !movimentacao ||
        !movimentacao.historicoNormalizado
    ) {
        return true;
    }

    const regra =
        localizarRegraExclusao(
            movimentacao
                .historicoNormalizado
        );

    return Boolean(
        regra &&
        regra.ignorarPeriodo === true
    );
}

/* =========================================================
   PERÍODO MANUAL
========================================================= */

function aplicarPeriodoInformadoManualmente(
    mostrarAviso = true
) {
    if (
        movimentacoesExtrato.length === 0
    ) {
        return;
    }

    const inputPrimeira =
        document.getElementById(
            "primeiraDataMovimentacao"
        );

    const inputUltima =
        document.getElementById(
            "ultimaDataMovimentacao"
        );

    if (
        !inputPrimeira ||
        !inputUltima
    ) {
        return;
    }

    const primeira =
        converterDataBrasileira(
            inputPrimeira.value
        );

    const ultima =
        converterDataBrasileira(
            inputUltima.value
        );

    if (
        !primeira ||
        !ultima
    ) {
        if (mostrarAviso) {
            alert(
                "Informe as datas no formato DD/MM/AAAA."
            );
        }

        return;
    }

    if (
        primeira.getTime() >
        ultima.getTime()
    ) {
        if (mostrarAviso) {
            alert(
                "A primeira movimentação não pode ser posterior à última movimentação."
            );
        }

        return;
    }

    primeiraDataExtrato =
        primeira;

    ultimaDataExtrato =
        ultima;

    const meses =
        calcularQuantidadeMesesPeriodo(
            primeiraDataExtrato,
            ultimaDataExtrato
        );

    definirValorCampo(
        "mesesDetectadosMovimentacao",
        meses
    );

    classificarMovimentacoes();
    calcularResultadosMovimentacao();
    renderizarResultadosMovimentacao();
}

function calcularQuantidadeMesesPeriodo(
    dataInicial,
    dataFinal
) {
    if (
        !possuiDataValida(
            dataInicial
        ) ||
        !possuiDataValida(
            dataFinal
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

    return (
        (
            final.getFullYear() -
            inicial.getFullYear()
        ) *
        12 +
        (
            final.getMonth() -
            inicial.getMonth()
        ) +
        1
    );
}

/* =========================================================
   EXCLUSÕES AUTOMÁTICAS INICIAIS
========================================================= */

function inicializarExclusoesAutomaticas() {
    historicosExcluidosManualmente.clear();

    movimentacoesExtrato.forEach(
        function (movimentacao) {
            const regra =
                localizarRegraExclusao(
                    movimentacao
                        .historicoNormalizado
                );

            if (regra) {
                historicosExcluidosManualmente.add(
                    movimentacao
                        .historicoNormalizado
                );
            }
        }
    );
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

function classificarMovimentacao(
    movimentacao
) {
    const historico =
        movimentacao
            .historicoNormalizado;

    const regraExclusao =
        localizarRegraExclusao(
            historico
        );

    /*
     * O checkbox define se o histórico deve ser
     * desconsiderado.
     *
     * Regras automáticas apenas iniciam marcadas;
     * não ficam bloqueadas.
     */
    if (
        historicosExcluidosManualmente.has(
            historico
        )
    ) {
        return {
            considerado: false,

            motivo:
                regraExclusao
                    ? regraExclusao.rotulo
                    : "Histórico desconsiderado manualmente"
        };
    }

    /*
     * Mesmo que o checkbox esteja livre,
     * débito continua não compondo renda.
     */
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
        movimentacao.indicador === "C"
    ) {
        return {
            considerado: true,
            motivo:
                regraExclusao
                    ? "Crédito incluído manualmente"
                    : "Crédito identificado pelo indicador C"
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
                regraExclusao
                    ? "Crédito incluído manualmente"
                    : "Crédito identificado pelo histórico"
        };
    }

    return {
        considerado: false,
        motivo:
            "Sem identificação segura como crédito"
    };
}

/* =========================================================
   REGRAS
========================================================= */

function localizarRegraExclusao(
    historicoNormalizado
) {
    const historico = String(
        historicoNormalizado || ""
    );

    for (
        const regra
        of REGRAS_EXCLUSAO_MOVIMENTACAO
    ) {
        if (
            regra.testar(
                historico
            )
        ) {
            return regra;
        }
    }

    return null;
}

function identificarCreditoSemIndicador(
    historico
) {
    const valor = String(
        historico || ""
    );

    return PADROES_CREDITO_SEM_INDICADOR.some(
        function (padrao) {
            return valor.includes(
                normalizarTexto(
                    padrao
                )
            );
        }
    );
}

function ehCreditoPotencial(
    movimentacao
) {
    if (!movimentacao) {
        return false;
    }

    if (
        movimentacao.indicador === "D" ||
        movimentacao.indicador === "*"
    ) {
        return false;
    }

    if (
        movimentacao.indicador === "C"
    ) {
        return true;
    }

    return identificarCreditoSemIndicador(
        movimentacao
            .historicoNormalizado
    );
}

/* =========================================================
   HISTÓRICOS
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
            " lançamento(s). As exclusões automáticas já vêm marcadas, mas todos os históricos permanecem disponíveis para alteração manual.";
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

            const marcado =
                historicosExcluidosManualmente.has(
                    grupo.normalizado
                );

            const label =
                document.createElement(
                    "label"
                );

            label.className =
                "opcao-simulacao regra-movimentacao-item";

            if (
                regraAutomatica &&
                marcado
            ) {
                label.classList.add(
                    "regra-movimentacao-automatica"
                );
            }

            let status = "";

            if (
                regraAutomatica &&
                marcado
            ) {
                status =
                    "Exclusão automática inicial: " +
                    regraAutomatica.motivo +
                    " Desmarque para alterar excepcionalmente.";
            } else if (
                regraAutomatica &&
                !marcado
            ) {
                status =
                    "Regra automática desmarcada manualmente.";
            } else if (
                grupo.creditosPotenciais > 0
            ) {
                status =
                    grupo.creditosPotenciais +
                    " crédito(s) identificado(s) · marque para desconsiderar";
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
                    ${marcado ? "checked" : ""}
                    aria-label="${escaparHtml(
                grupo.historico
            )}"
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
                    "input[type='checkbox']"
                );

            if (checkbox) {
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
                        renderizarHistoricosExtrato();
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

function agruparHistoricosExtrato() {
    const mapa =
        new Map();

    movimentacoesExtrato.forEach(
        function (movimentacao) {
            const chave =
                movimentacao
                    .historicoNormalizado;

            if (!chave) {
                return;
            }

            if (
                !mapa.has(
                    chave
                )
            ) {
                mapa.set(
                    chave,
                    {
                        normalizado:
                            chave,

                        historico:
                            movimentacao
                                .historico,

                        quantidade:
                            0,

                        creditosPotenciais:
                            0,

                        debitos:
                            0,

                        informativos:
                            0
                    }
                );
            }

            const grupo =
                mapa.get(
                    chave
                );

            grupo.quantidade++;

            const regra =
                localizarRegraExclusao(
                    chave
                );

            if (
                regra &&
                regra.ignorarPeriodo
            ) {
                grupo.informativos++;
            } else if (
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
        function (
            a,
            b
        ) {
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

    let mesesConsiderados =
        obterNumeroCampo(
            "mesesConsideradosMovimentacao"
        );

    if (
        !Number.isFinite(
            mesesConsiderados
        ) ||
        mesesConsiderados <= 0
    ) {
        mesesConsiderados =
            calcularQuantidadeMesesPeriodo(
                primeiraDataExtrato,
                ultimaDataExtrato
            );
    }

    mesesConsiderados =
        Math.max(
            0,
            Math.trunc(
                mesesConsiderados
            )
        );

    const media =
        mesesConsiderados > 0
            ? total /
            mesesConsiderados
            : 0;

    definirTexto(
        "resultadoMediaMovimentacao",
        formatarMoeda(
            media
        )
    );

    definirTexto(
        "resultadoTotalMovimentacao",
        formatarMoeda(
            total
        )
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
            movimentacoesExcluidas.length
        )
    );
}

function normalizarCampoMeses(
    input
) {
    if (!input) {
        return;
    }

    const texto =
        String(
            input.value || ""
        ).trim();

    if (!texto) {
        return;
    }

    const numero =
        Number(
            texto
        );

    if (
        !Number.isFinite(
            numero
        ) ||
        numero <= 0
    ) {
        input.value = "";
        return;
    }

    input.value =
        String(
            Math.max(
                1,
                Math.trunc(
                    numero
                )
            )
        );
}

/* =========================================================
   RESULTADOS
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
            "Nenhum período válido identificado."
        );

        return;
    }

    const agrupamento = {};

    gerarCompetenciasPeriodo(
        primeiraDataExtrato,
        ultimaDataExtrato
    ).forEach(
        function (competencia) {
            agrupamento[
                competencia
            ] = {
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

            if (!competencia) {
                return;
            }

            /*
             * Quando o período foi alterado manualmente,
             * não exibe movimentos fora dele.
             */
            if (
                movimentacao.data.getTime() <
                primeiraDataExtrato.getTime() ||
                movimentacao.data.getTime() >
                ultimaDataExtrato.getTime()
            ) {
                return;
            }

            if (
                !agrupamento[
                competencia
                ]
            ) {
                agrupamento[
                    competencia
                ] = {
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
                        ${escaparHtml(
                    formatarCompetencia(
                        competencia
                    )
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

function gerarCompetenciasPeriodo(
    dataInicial,
    dataFinal
) {
    const competencias = [];

    if (
        !possuiDataValida(
            dataInicial
        ) ||
        !possuiDataValida(
            dataFinal
        )
    ) {
        return competencias;
    }

    const atual =
        new Date(
            dataInicial.getFullYear(),
            dataInicial.getMonth(),
            1,
            12
        );

    const final =
        new Date(
            dataFinal.getFullYear(),
            dataFinal.getMonth(),
            1,
            12
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

    const registros =
        movimentacoesConsideradas.filter(
            movimentacaoDentroPeriodoAtual
        );

    if (
        registros.length === 0
    ) {
        inserirLinhaSemDados(
            tbody,
            5,
            "Nenhuma movimentação de crédito considerada."
        );

        return;
    }

    registros.forEach(
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
                movimentacao.motivo ||
                "Crédito considerado"
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

    const registros =
        movimentacoesExcluidas.filter(
            movimentacaoDentroPeriodoAtual
        );

    if (
        registros.length === 0
    ) {
        inserirLinhaSemDados(
            tbody,
            5,
            "Nenhuma movimentação desconsiderada."
        );

        return;
    }

    registros.forEach(
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

function movimentacaoDentroPeriodoAtual(
    movimentacao
) {
    if (
        !primeiraDataExtrato ||
        !ultimaDataExtrato
    ) {
        return true;
    }

    const tempo =
        movimentacao
            .data
            .getTime();

    return (
        tempo >=
        primeiraDataExtrato.getTime() &&
        tempo <=
        ultimaDataExtrato.getTime()
    );
}

/* =========================================================
   COMPETÊNCIA
========================================================= */

function obterCompetenciaData(
    data
) {
    if (
        !possuiDataValida(
            data
        )
    ) {
        return "";
    }

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
    return String(
        texto || ""
    )
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
   VALORES
========================================================= */

function converterValorBrasileiro(
    valor
) {
    let texto =
        String(
            valor || ""
        )
            .replace(/R\$/gi, "")
            .replace(/\s/g, "")
            .trim();

    if (!texto) {
        return NaN;
    }

    if (
        texto.includes(",")
    ) {
        texto =
            texto
                .replace(/\./g, "")
                .replace(",", ".");
    }

    texto =
        texto.replace(
            /[^\d.-]/g,
            ""
        );

    const numero =
        Number(
            texto
        );

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
    resetarEstadoMovimentacao();

    const textarea =
        document.getElementById(
            "textoExtratoMovimentacao"
        );

    if (textarea) {
        textarea.value = "";
    }

    [
        "primeiraDataMovimentacao",
        "ultimaDataMovimentacao",
        "mesesDetectadosMovimentacao",
        "mesesConsideradosMovimentacao"
    ].forEach(
        function (id) {
            definirValorCampo(
                id,
                ""
            );
        }
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

    [
        "primeiraDataMovimentacao",
        "ultimaDataMovimentacao",
        "mesesDetectadosMovimentacao",
        "mesesConsideradosMovimentacao"
    ].forEach(
        function (id) {
            definirValorCampo(
                id,
                ""
            );
        }
    );

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

function obterTbodyTabela(
    id
) {
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

function inserirLinhaSemDados(
    tbody,
    colspan,
    mensagem
) {
    if (!tbody) {
        return;
    }

    const tr =
        document.createElement(
            "tr"
        );

    tr.innerHTML = `
        <td
            colspan="${colspan}"
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

function obterNumeroCampo(
    id
) {
    const elemento =
        document.getElementById(
            id
        );

    if (!elemento) {
        return NaN;
    }

    const numero =
        Number(
            String(
                elemento.value || ""
            )
                .replace(",", ".")
                .trim()
        );

    return Number.isFinite(
        numero
    )
        ? numero
        : NaN;
}

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

    if (!elemento) {
        return;
    }

    if (
        "value" in elemento
    ) {
        elemento.value =
            valor == null
                ? ""
                : valor;
    } else {
        elemento.textContent =
            valor == null
                ? ""
                : valor;
    }
}

function escaparHtml(
    valor
) {
    return String(
        valor == null
            ? ""
            : valor
    )
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}