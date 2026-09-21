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
        ignorarPeriodo: false,
        contabilizarCreditoExcluido: true,
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
        contabilizarCreditoExcluido: true,
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
        contabilizarCreditoExcluido: true,
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
        contabilizarCreditoExcluido: true,
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
        motivo: "Devolução não é renda.",
        ignorarPeriodo: false,
        contabilizarCreditoExcluido: true,
        testar: function (historico) {
            return (
                historico.includes("CRED DEVOLUCAO PIX") ||
                historico.includes("CREDITO DEVOLUCAO PIX") ||
                historico.includes("DEVOLUCAO PIX")
            );
        }
    },
    {
        id: "est-pix-outra-if",
        rotulo: "EST. PIX EMITIDO OUTRA IF - MESMA TIT.",
        motivo: "Estorno não é renda.",
        ignorarPeriodo: false,
        contabilizarCreditoExcluido: true,
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
        ignorarPeriodo: false,
        contabilizarCreditoExcluido: true,
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
        ignorarPeriodo: false,
        contabilizarCreditoExcluido: true,
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
        contabilizarCreditoExcluido: true,
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
        ignorarPeriodo: false,
        contabilizarCreditoExcluido: true,
        testar: function (historico) {
            return historico.includes("RESGATE RDC");
        }
    },
    {
        id: "saldo-bloqueado-anterior",
        rotulo: "SALDO BLOQUEADO ANTERIOR",
        motivo: "Linha informativa do extrato.",
        ignorarPeriodo: true,
        contabilizarCreditoExcluido: false,
        testar: function (historico) {
            return historico.includes(
                "SALDO BLOQUEADO ANTERIOR"
            );
        }
    },
    {
        id: "saldo-anterior",
        rotulo: "SALDO ANTERIOR",
        motivo: "Linha informativa do extrato.",
        ignorarPeriodo: true,
        contabilizarCreditoExcluido: false,
        testar: function (historico) {
            return historico.includes(
                "SALDO ANTERIOR"
            );
        }
    },
    {
        id: "saldo-dia",
        rotulo: "SALDO DO DIA",
        motivo: "Linha informativa do extrato.",
        ignorarPeriodo: true,
        contabilizarCreditoExcluido: false,
        testar: function (historico) {
            return (
                historico.includes("SALDO DO DIA") ||
                historico.includes("SALDO FINAL DO DIA")
            );
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
   HISTÓRICOS INFORMATIVOS QUE NÃO DEFINEM PERÍODO
========================================================= */

const PADROES_INFORMATIVOS_PERIODO = [
    "SALDO ANTERIOR",
    "SALDO BLOQUEADO ANTERIOR",
    "SALDO DO DIA",
    "SALDO FINAL DO DIA"
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
    const btnProcessar =
        document.getElementById(
            "btnProcessarMovimentacao"
        );

    const btnLimpar =
        document.getElementById(
            "btnLimparMovimentacao"
        );

    const btnRecalcular =
        document.getElementById(
            "btnRecalcularMovimentacao"
        );

    const mesesConsiderados =
        document.getElementById(
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
            function () {
                if (
                    movimentacoesExtrato.length === 0
                ) {
                    return;
                }

                classificarMovimentacoes();
                calcularResultadosMovimentacao();
                renderizarHistoricosExtrato();
                renderizarResultadosMovimentacao();
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

                normalizarMesesConsiderados();

                calcularResultadosMovimentacao();
                renderizarResultadosMovimentacao();
            }
        );

        mesesConsiderados.addEventListener(
            "blur",
            function () {
                normalizarMesesConsiderados();
                calcularResultadosMovimentacao();
                renderizarResultadosMovimentacao();
            }
        );
    }
}

/* =========================================================
   PROCESSAMENTO PRINCIPAL
========================================================= */

function processarMovimentacao() {
    const textarea =
        document.getElementById(
            "textoExtratoMovimentacao"
        );

    if (!textarea) {
        return;
    }

    const texto =
        String(
            textarea.value || ""
        ).trim();

    if (!texto) {
        alert(
            "Cole o extrato no campo de texto."
        );

        return;
    }

    resetarEstadoMovimentacao();

    movimentacoesExtrato =
        interpretarExtratoMovimentacao(
            texto
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

    identificarPeriodoExtrato();
    classificarMovimentacoes();
    calcularResultadosMovimentacao();
    renderizarHistoricosExtrato();
    renderizarResultadosMovimentacao();
}

/* =========================================================
   RESET DO ESTADO
========================================================= */

function resetarEstadoMovimentacao() {
    movimentacoesExtrato = [];
    movimentacoesConsideradas = [];
    movimentacoesExcluidas = [];

    primeiraDataExtrato = null;
    ultimaDataExtrato = null;

    historicosExcluidosManualmente.clear();
}

/* =========================================================
   INTERPRETAÇÃO DO EXTRATO
========================================================= */

function interpretarExtratoMovimentacao(
    textoOriginal
) {
    const texto =
        prepararTrechoExtrato(
            textoOriginal
        );

    const linhas =
        String(texto || "")
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
                        indice + 1
                    );
            }

            if (!resultado) {
                resultado =
                    interpretarLinhaTextoExtrato(
                        linha,
                        dataCorrente,
                        indice + 1
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

    return removerMovimentacoesDuplicadas(
        movimentacoes
    );
}

/* =========================================================
   LINHAS QUE NÃO REPRESENTAM MOVIMENTAÇÃO
========================================================= */

function deveIgnorarLinhaExtrato(
    linha
) {
    const texto =
        String(linha || "").trim();

    if (!texto) {
        return true;
    }

    /*
     * Separadores Markdown.
     */
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

    const cabecalhos = [
        "DATA DOCUMENTO HISTORICO VALOR",
        "DATA HISTORICO VALOR",
        "DOCUMENTO HISTORICO VALOR",
        "DATA DOCUMENTO HISTORICO"
    ];

    if (
        cabecalhos.some(
            function (cabecalho) {
                return (
                    normalizado ===
                    cabecalho
                );
            }
        )
    ) {
        return true;
    }

    return false;
}

/* =========================================================
   RECORTA SOMENTE O EXTRATO REAL
========================================================= */

function prepararTrechoExtrato(
    textoOriginal
) {
    const linhas =
        String(
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

        const possuiEstruturaCabecalho =
            normalizada.includes("DATA") &&
            normalizada.includes("HISTORICO") &&
            normalizada.includes("VALOR");

        if (
            normalizada.includes(
                "DATADOCUMENTOHISTORICOVALOR"
            ) ||
            possuiEstruturaCabecalho
        ) {
            indiceCabecalho = i;
            break;
        }
    }

    /*
     * Se encontramos o cabeçalho,
     * descartamos tudo que veio antes.
     *
     * Isso impede dados cadastrais, saldos de tela
     * ou outros textos de serem interpretados.
     */
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
            ) ||
            normalizada.includes(
                "LANÇAMENTOS FUTUROS"
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
   LINHA EM FORMATO DE TABELA / MARKDOWN
========================================================= */

function interpretarLinhaTabelaExtrato(
    linha,
    dataCorrente,
    numeroLinha
) {
    let texto =
        String(
            linha || ""
        ).trim();

    if (!texto.includes("|")) {
        return null;
    }

    if (texto.startsWith("|")) {
        texto =
            texto.substring(1);
    }

    if (texto.endsWith("|")) {
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

    /*
     * Formato esperado:
     *
     * Data | Documento | Histórico | Valor
     *
     * Se houver colunas extras no histórico,
     * a última coluna continua sendo o valor.
     */
    const dataTextoCelula =
        limparCelulaTexto(
            colunas[0]
        );

    const valorTextoCelula =
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

    if (
        ehCabecalhoTabela(
            dataTextoCelula,
            documento,
            historico,
            valorTextoCelula
        )
    ) {
        return null;
    }

    let dataMovimentacao = null;

    if (
        validarFormatoDataBrasileira(
            dataTextoCelula
        )
    ) {
        dataMovimentacao =
            converterDataBrasileira(
                dataTextoCelula
            );
    } else if (
        !dataTextoCelula ||
        ehCelulaVazia(
            dataTextoCelula
        )
    ) {
        dataMovimentacao =
            dataCorrente;
    } else {
        return null;
    }

    const novaDataCorrente =
        dataMovimentacao ||
        dataCorrente;

    if (!dataMovimentacao) {
        return {
            dataCorrente:
                novaDataCorrente,
            movimentacao:
                null
        };
    }

    if (!historico) {
        return {
            dataCorrente:
                novaDataCorrente,
            movimentacao:
                null
        };
    }

    const dadosValor =
        extrairValorIndicador(
            valorTextoCelula
        );

    if (!dadosValor) {
        return {
            dataCorrente:
                novaDataCorrente,
            movimentacao:
                null
        };
    }

    const movimentacao =
        criarMovimentacaoExtrato({
            numeroLinha:
                numeroLinha,
            data:
                dataMovimentacao,
            documento:
                documento,
            historico:
                historico,
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
   CABEÇALHO DE TABELA
========================================================= */

function ehCabecalhoTabela(
    data,
    documento,
    historico,
    valor
) {
    const combinado =
        normalizarTexto(
            [
                data,
                documento,
                historico,
                valor
            ].join(" ")
        );

    return (
        combinado.includes("DATA") &&
        combinado.includes("HISTORICO") &&
        combinado.includes("VALOR")
    );
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
        String(
            linha || ""
        )
            .replace(/\u00A0/g, " ")
            .trim();

    if (!texto) {
        return null;
    }

    let dataMovimentacao = null;

    const correspondenciaData =
        texto.match(
            /^(\d{1,2}\/\d{1,2}\/\d{2,4})(?=\s|\t|$)/
        );

    if (correspondenciaData) {
        dataMovimentacao =
            converterDataBrasileira(
                correspondenciaData[1]
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
        extrairValorFinalLinha(
            texto
        );

    if (!dadosValor) {
        return {
            dataCorrente:
                novaDataCorrente,
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
                novaDataCorrente,
            movimentacao:
                null
        };
    }

    const movimentacao =
        criarMovimentacaoExtrato({
            numeroLinha:
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
   REMOVE DUPLICIDADES
========================================================= */

function removerMovimentacoesDuplicadas(
    movimentacoes
) {
    const resultado = [];
    const vistos = new Set();

    movimentacoes.forEach(
        function (
            movimentacao
        ) {
            const chave = [
                movimentacao.dataTexto,
                normalizarTexto(
                    movimentacao.documento
                ),
                movimentacao
                    .historicoNormalizado,
                Number(
                    movimentacao.valor
                ).toFixed(2),
                movimentacao.indicador
            ].join("|");

            if (
                vistos.has(chave)
            ) {
                return;
            }

            vistos.add(chave);

            resultado.push(
                movimentacao
            );
        }
    );

    return resultado;
}

/* =========================================================
   VALOR FINAL DA LINHA
========================================================= */

function extrairValorFinalLinha(
    texto
) {
    const valor =
        limparCelulaValor(
            texto
        );

    /*
     * Exemplos aceitos:
     *
     * 1.250,00 C
     * 1.250,00C
     * R$ 1.250,00 C
     * -1.250,00
     * 1.250,00 D
     * 500,00 *
     */
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

    /*
     * Valor explicitamente negativo sem indicador
     * deve ser tratado como débito.
     */
    if (
        !indicador &&
        numero < 0
    ) {
        indicador = "D";
    }

    const parteDescricao =
        valor
            .substring(
                0,
                correspondencia.index
            )
            .trim();

    return {
        valor:
            Math.abs(
                numero
            ),

        indicador:
            indicador,

        parteDescricao:
            parteDescricao
    };
}

/* =========================================================
   VALOR DE UMA CÉLULA
========================================================= */

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

        indicador:
            indicador
    };
}

/* =========================================================
   DOCUMENTO / HISTÓRICO
========================================================= */

function separarDocumentoHistorico(
    texto
) {
    const valor =
        limparCelulaTexto(
            texto
        );

    if (!valor) {
        return {
            documento: "",
            historico: ""
        };
    }

    /*
     * Primeiro tenta TAB.
     */
    const partesTab =
        valor
            .split(/\t+/)
            .map(function (item) {
                return item.trim();
            })
            .filter(Boolean);

    if (
        partesTab.length >= 2
    ) {
        const primeiro =
            partesTab[0];

        if (
            pareceDocumento(
                primeiro
            )
        ) {
            return {
                documento:
                    primeiro,

                historico:
                    partesTab
                        .slice(1)
                        .join(" ")
                        .trim()
            };
        }

        return {
            documento: "",
            historico:
                partesTab
                    .join(" ")
                    .trim()
        };
    }

    /*
     * Depois tenta duas ou mais sequências de espaço.
     */
    const partesEspaco =
        valor
            .split(/\s{2,}/)
            .map(function (item) {
                return item.trim();
            })
            .filter(Boolean);

    if (
        partesEspaco.length >= 2
    ) {
        const primeiro =
            partesEspaco[0];

        if (
            pareceDocumento(
                primeiro
            )
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

        return {
            documento: "",
            historico:
                partesEspaco
                    .join(" ")
                    .trim()
        };
    }

    /*
     * Documento + histórico separados por espaço simples.
     */
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
        historico:
            valor
    };
}

/* =========================================================
   IDENTIFICA DOCUMENTO
========================================================= */

function pareceDocumento(
    valor
) {
    const texto =
        String(
            valor || ""
        ).trim();

    if (!texto) {
        return false;
    }

    if (
        texto.length >
        30
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
   LIMPEZA DAS CÉLULAS
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
    const marcadorAsterisco =
        "__ASTERISCO_INDICADOR__";

    let valor =
        String(
            texto || ""
        )
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

    valor =
        valor
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

function ehCelulaVazia(
    texto
) {
    return !String(
        texto || ""
    )
        .replace(/\u00A0/g, "")
        .trim();
}

/* =========================================================
   PERÍODO
========================================================= */

function identificarPeriodoExtrato() {
    /*
     * IMPORTANTE:
     *
     * O período NÃO pode ser determinado por:
     *
     * - SALDO ANTERIOR
     * - SALDO BLOQUEADO ANTERIOR
     * - SALDO DO DIA
     *
     * Essas linhas podem trazer datas fora do período
     * real de movimentação e alterar o divisor da média.
     *
     * Também NÃO usamos somente os créditos considerados,
     * pois um mês válido pode possuir apenas débitos ou
     * créditos excluídos pelas regras de renda.
     *
     * Portanto o período é determinado por lançamentos
     * reais do extrato, excluindo somente linhas
     * estritamente informativas.
     */
    const movimentacoesPeriodo =
        movimentacoesExtrato.filter(
            function (
                movimentacao
            ) {
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

    const datas =
        movimentacoesPeriodo.map(
            function (
                movimentacao
            ) {
                return movimentacao.data;
            }
        );

    if (
        datas.length === 0
    ) {
        primeiraDataExtrato = null;
        ultimaDataExtrato = null;

        definirValorCampo(
            "mesesDetectadosMovimentacao",
            ""
        );

        const inputMeses =
            document.getElementById(
                "mesesConsideradosMovimentacao"
            );

        if (inputMeses) {
            inputMeses.value = "";
        }

        atualizarExibicaoPeriodo();

        return;
    }

    const timestamps =
        datas.map(
            function (data) {
                return data.getTime();
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
   IGNORA LINHAS INFORMATIVAS NA DETECÇÃO DO PERÍODO
========================================================= */

function deveIgnorarMovimentacaoNaDeteccaoPeriodo(
    movimentacao
) {
    if (!movimentacao) {
        return true;
    }

    const historico =
        movimentacao
            .historicoNormalizado ||
        "";

    if (!historico) {
        return true;
    }

    const regra =
        localizarRegraExclusao(
            historico
        );

    if (
        regra &&
        regra.ignorarPeriodo === true
    ) {
        return true;
    }

    return PADROES_INFORMATIVOS_PERIODO.some(
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
   VALIDA DATA JS
========================================================= */

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

/* =========================================================
   QUANTIDADE DE MESES
========================================================= */

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
        if (
            "value" in
            elementoPrimeira
        ) {
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
        if (
            "value" in
            elementoUltima
        ) {
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
        function (
            movimentacao
        ) {
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
        movimentacao
            .historicoNormalizado;

    const regraExclusao =
        localizarRegraExclusao(
            historico
        );

    /*
     * Regra automática sempre tem prioridade.
     */
    if (regraExclusao) {
        return {
            considerado:
                false,

            motivo:
                regraExclusao.rotulo
        };
    }

    /*
     * Débito explícito.
     */
    if (
        movimentacao.indicador ===
        "D"
    ) {
        return {
            considerado:
                false,

            motivo:
                "Débito"
        };
    }

    /*
     * Valor informativo/bloqueado.
     */
    if (
        movimentacao.indicador ===
        "*"
    ) {
        return {
            considerado:
                false,

            motivo:
                "Valor bloqueado/informativo"
        };
    }

    /*
     * Exclusão selecionada pelo usuário.
     */
    if (
        historicosExcluidosManualmente.has(
            historico
        )
    ) {
        return {
            considerado:
                false,

            motivo:
                "Histórico excluído manualmente"
        };
    }

    /*
     * Crédito explícito.
     */
    if (
        movimentacao.indicador ===
        "C"
    ) {
        return {
            considerado:
                true,

            motivo:
                "Crédito identificado pelo indicador C"
        };
    }

    /*
     * Sem indicador, mas histórico reconhecido.
     */
    if (
        identificarCreditoSemIndicador(
            historico
        )
    ) {
        return {
            considerado:
                true,

            motivo:
                "Crédito identificado pelo histórico"
        };
    }

    return {
        considerado:
            false,

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
    const historico =
        String(
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

/* =========================================================
   CRÉDITO SEM INDICADOR
========================================================= */

function identificarCreditoSemIndicador(
    historico
) {
    const valor =
        String(
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

/* =========================================================
   VERIFICA SE MOVIMENTAÇÃO TEM PERFIL DE CRÉDITO
========================================================= */

function ehCreditoPotencial(
    movimentacao
) {
    if (!movimentacao) {
        return false;
    }

    if (
        movimentacao.indicador ===
        "D" ||
        movimentacao.indicador ===
        "*"
    ) {
        return false;
    }

    if (
        movimentacao.indicador ===
        "C"
    ) {
        return true;
    }

    return identificarCreditoSemIndicador(
        movimentacao
            .historicoNormalizado
    );
}

/* =========================================================
   CRÉDITO EXCLUÍDO QUE DEVE SER CONTABILIZADO NO RESULTADO
========================================================= */

function ehCreditoExcluidoContabilizavel(
    movimentacao
) {
    if (
        !ehCreditoPotencial(
            movimentacao
        )
    ) {
        return false;
    }

    const regra =
        localizarRegraExclusao(
            movimentacao
                .historicoNormalizado
        );

    if (
        regra &&
        regra.contabilizarCreditoExcluido ===
        false
    ) {
        return false;
    }

    return true;
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
        movimentacoesExtrato.length ===
        0
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
            " lançamento(s) do extrato. " +
            "Regras automáticas são exibidas apenas para conferência e não podem ser alteradas.";
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
                grupo.creditosPotenciais >
                0 &&
                !regraAutomatica;

            const label =
                document.createElement(
                    "label"
                );

            label.className =
                "opcao-simulacao regra-movimentacao-item";

            if (regraAutomatica) {
                label.classList.add(
                    "regra-movimentacao-automatica"
                );
            }

            let status = "";

            if (regraAutomatica) {
                status =
                    "Exclusão automática · " +
                    regraAutomatica.motivo;
            } else if (
                grupo.creditosPotenciais >
                0
            ) {
                status =
                    grupo.creditosPotenciais +
                    " crédito(s) identificado(s)";
            } else if (
                grupo.debitos >
                0
            ) {
                status =
                    grupo.debitos +
                    " débito(s) identificado(s)";
            } else {
                status =
                    "Movimentação informativa";
            }

            /*
             * Regras automáticas não são apresentadas como
             * checkbox desabilitado.
             *
             * Assim o usuário não interpreta como erro da tela.
             */
            if (regraAutomatica) {
                label.innerHTML = `
                    <span
                        class="regra-movimentacao-indicador-automatico"
                        aria-hidden="true"
                        title="Exclusão automática"
                    >
                        ✓
                    </span>

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
                            ·
                            Regra automática
                        </small>

                    </span>
                `;
            } else {
                label.innerHTML = `
                    <input
                        type="checkbox"
                        id="historico-movimentacao-${indice}"
                        ${manual ? "checked" : ""}
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
                            ${podeExcluirManual
                        ? " · Marque para excluir"
                        : ""
                    }
                        </small>

                    </span>
                `;
            }

            const checkbox =
                label.querySelector(
                    "input[type='checkbox']"
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
    const mapa =
        new Map();

    movimentacoesExtrato.forEach(
        function (
            movimentacao
        ) {
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
                            0,

                        regraAutomatica:
                            localizarRegraExclusao(
                                chave
                            )
                    }
                );
            }

            const grupo =
                mapa.get(
                    chave
                );

            grupo.quantidade++;

            const regraAutomatica =
                localizarRegraExclusao(
                    chave
                );

            if (
                regraAutomatica &&
                regraAutomatica
                    .ignorarPeriodo
            ) {
                grupo.informativos++;
            } else if (
                ehCreditoPotencial(
                    movimentacao
                )
            ) {
                grupo.creditosPotenciais++;
            } else if (
                movimentacao.indicador ===
                "D"
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
                    sensitivity:
                        "base"
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
        !Number.isFinite(
            mesesConsiderados
        ) ||
        mesesConsiderados <= 0
    ) {
        mesesConsiderados =
            mesesDetectados;
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

    const creditosExcluidos =
        movimentacoesExcluidas.filter(
            function (
                movimentacao
            ) {
                return ehCreditoExcluidoContabilizavel(
                    movimentacao
                );
            }
        ).length;

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
            movimentacoesConsideradas
                .length
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
        mesesDetectados || ""
    );
}

/* =========================================================
   NORMALIZA MESES CONSIDERADOS
========================================================= */

function normalizarMesesConsiderados() {
    const input =
        document.getElementById(
            "mesesConsideradosMovimentacao"
        );

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
        function (
            competencia
        ) {
            agrupamento[
                competencia
            ] = {
                competencia:
                    competencia,

                quantidade:
                    0,

                total:
                    0
            };
        }
    );

    movimentacoesConsideradas.forEach(
        function (
            movimentacao
        ) {
            const competencia =
                movimentacao.competencia;

            if (
                !competencia
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
                    competencia:
                        competencia,

                    quantidade:
                        0,

                    total:
                        0
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
            function (
                competencia
            ) {
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

/* =========================================================
   GERA TODAS AS COMPETÊNCIAS ENTRE AS DATAS
========================================================= */

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

    let inicial =
        new Date(
            dataInicial.getFullYear(),
            dataInicial.getMonth(),
            1,
            12,
            0,
            0,
            0
        );

    let final =
        new Date(
            dataFinal.getFullYear(),
            dataFinal.getMonth(),
            1,
            12,
            0,
            0,
            0
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

    const atual =
        new Date(
            inicial.getTime()
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
        movimentacoesConsideradas
            .length === 0
    ) {
        /*
         * O HTML atual possui 5 colunas:
         * Data, Documento, Histórico, Valor e Identificação.
         */
        inserirLinhaSemDados(
            tbody,
            5,
            "Nenhuma movimentação considerada."
        );

        return;
    }

    movimentacoesConsideradas.forEach(
        function (
            movimentacao
        ) {
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

    if (
        movimentacoesExcluidas
            .length === 0
    ) {
        inserirLinhaSemDados(
            tbody,
            5,
            "Nenhuma movimentação excluída."
        );

        return;
    }

    movimentacoesExcluidas.forEach(
        function (
            movimentacao
        ) {
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
        elemento.tagName
            .toUpperCase() ===
        "TBODY"
    ) {
        return elemento;
    }

    if (
        elemento.tagName &&
        elemento.tagName
            .toUpperCase() ===
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
    return /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(
        String(
            valor || ""
        ).trim()
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

    /*
     * Aceita ano com dois dígitos.
     */
    if (
        correspondencia[3]
            .length === 2
    ) {
        ano +=
            ano >= 70
                ? 1900
                : 2000;
    }

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
        data.getFullYear() !==
        ano ||
        data.getMonth() !==
        mes - 1 ||
        data.getDate() !==
        dia
    ) {
        return null;
    }

    return data;
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
   VALOR
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

    /*
     * Formato brasileiro:
     * 1.234.567,89
     */
    if (
        texto.includes(",")
    ) {
        texto =
            texto
                .replace(/\./g, "")
                .replace(",", ".");
    } else {
        /*
         * Fallback para formato decimal com ponto.
         */
        const pontos =
            (
                texto.match(/\./g) ||
                []
            ).length;

        if (
            pontos > 1
        ) {
            texto =
                texto.replace(
                    /\./g,
                    ""
                );
        }
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

/* =========================================================
   LIMPEZA
========================================================= */

function limparMediaMovimentacao() {
    resetarEstadoMovimentacao();

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
        if (
            "value" in
            primeira
        ) {
            primeira.value = "";
        } else {
            primeira.textContent =
                "-";
        }
    }

    if (ultima) {
        if (
            "value" in
            ultima
        ) {
            ultima.value = "";
        } else {
            ultima.textContent =
                "-";
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
        tabelaMensal.innerHTML =
            "";

        inserirLinhaSemDados(
            tabelaMensal,
            3,
            "Nenhum extrato processado."
        );
    }

    if (tabelaConsideradas) {
        tabelaConsideradas.innerHTML =
            "";

        /*
         * HTML possui 5 colunas.
         */
        inserirLinhaSemDados(
            tabelaConsideradas,
            5,
            "Nenhum extrato processado."
        );
    }

    if (tabelaExcluidas) {
        tabelaExcluidas.innerHTML =
            "";

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