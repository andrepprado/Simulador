(function () {
    "use strict";

    /* =========================================================
       ESTADO
       ========================================================= */

    let movimentacoesExtrato = [];
    let movimentacoesConsideradas = [];
    let movimentacoesExcluidas = [];

    let primeiraDataExtrato = null;
    let ultimaDataExtrato = null;

    /*
     * Históricos de crédito que o usuário marcou manualmente
     * para serem excluídos.
     */
    const historicosExcluidosManualmente =
        new Set();

    /*
     * Regras automáticas vêm marcadas por padrão.
     *
     * Quando o usuário desmarca uma regra automática,
     * o histórico é colocado neste Set para que a regra
     * automática deixe de ser aplicada especificamente
     * àquele histórico.
     */
    const historicosAutomaticosDesmarcados =
        new Set();

    /* =========================================================
       REGRAS DE EXCLUSÃO AUTOMÁTICA
       ========================================================= */

    const REGRAS_EXCLUSAO_MOVIMENTACAO = [
        {
            id:
                "cred-emprestimo",

            rotulo:
                "CRÉD. EMPRÉSTIMO",

            motivo:
                "Empréstimo é dívida e não renda.",

            ignorarPeriodo:
                false,

            testar:
                function (historico) {
                    return (
                        historico.includes(
                            "CRED EMPRESTIMO"
                        ) ||
                        historico.includes(
                            "CREDITO EMPRESTIMO"
                        )
                    );
                }
        },
        {
            id:
                "cred-liberacao-td",

            rotulo:
                "CRÉD. LIBERAÇÃO TD",

            motivo:
                "Antecipação de recebíveis não é considerada renda.",

            ignorarPeriodo:
                false,

            testar:
                function (historico) {
                    return (
                        historico.includes(
                            "CRED LIBERACAO TD"
                        ) ||
                        historico.includes(
                            "CREDITO LIBERACAO TD"
                        ) ||
                        historico.includes(
                            "TITULO DESCONTADO"
                        )
                    );
                }
        },
        {
            id:
                "cred-liberacao-bndes",

            rotulo:
                "CRÉD. LIBERAÇÃO BNDES",

            motivo:
                "Liberação de empréstimo junto ao BNDES não é renda.",

            ignorarPeriodo:
                false,

            testar:
                function (historico) {
                    return (
                        historico.includes(
                            "CRED LIBERACAO BNDES"
                        ) ||
                        historico.includes(
                            "CREDITO LIBERACAO BNDES"
                        )
                    );
                }
        },
        {
            id:
                "cred-liberacao-cartao",

            rotulo:
                "CRÉD. LIBERAÇÃO TÍTULO REC. CARTÃO",

            motivo:
                "Liberação de título de recebível de cartão desconsiderada conforme regra definida.",

            ignorarPeriodo:
                false,

            testar:
                function (historico) {
                    return (
                        historico.includes(
                            "CRED LIBERACAO TITULO REC CARTAO"
                        ) ||
                        historico.includes(
                            "CREDITO LIBERACAO TITULO REC CARTAO"
                        ) ||
                        historico.includes(
                            "LIBERACAO TITULO REC CARTAO"
                        )
                    );
                }
        },
        {
            id:
                "devolucao-pix",

            rotulo:
                "CRÉDITO DEVOLUÇÃO PIX",

            motivo:
                "Devolução de PIX não é considerada renda.",

            ignorarPeriodo:
                false,

            testar:
                function (historico) {
                    return (
                        historico.includes(
                            "CRED DEVOLUCAO PIX"
                        ) ||
                        historico.includes(
                            "CREDITO DEVOLUCAO PIX"
                        ) ||
                        historico.includes(
                            "DEVOLUCAO PIX"
                        )
                    );
                }
        },
        {
            id:
                "est-pix-outra-if",

            rotulo:
                "EST. PIX EMITIDO OUTRA IF - MESMA TIT.",

            motivo:
                "Estorno não é renda.",

            ignorarPeriodo:
                false,

            testar:
                function (historico) {
                    return (
                        historico.includes(
                            "EST PIX EMITIDO OUTRA IF"
                        ) &&
                        historico.includes(
                            "MESMA TIT"
                        )
                    );
                }
        },
        {
            id:
                "estorno-compra-mastercard",

            rotulo:
                "ESTORNO COMPRA NACIONAL DEBIT MASTERCARD",

            motivo:
                "Estorno não é renda.",

            ignorarPeriodo:
                false,

            testar:
                function (historico) {
                    return historico.includes(
                        "ESTORNO COMPRA NACIONAL DEBIT MASTERCARD"
                    );
                }
        },
        {
            id:
                "estorno-deb-convenio",

            rotulo:
                "ESTORNO DÉB. CONV. DEMAIS EMPRESAS",

            motivo:
                "Estorno não é renda.",

            ignorarPeriodo:
                false,

            testar:
                function (historico) {
                    return (
                        historico.includes(
                            "ESTORNO DEB CONV DEMAIS EMPRESAS"
                        ) ||
                        historico.includes(
                            "ESTORNO DEB CONV DEMAIS EMPRESA"
                        )
                    );
                }
        },
        {
            id:
                "estorno-generico",

            rotulo:
                "OUTROS ESTORNOS",

            motivo:
                "Estornos não representam renda.",

            ignorarPeriodo:
                false,

            testar:
                function (historico) {
                    return (
                        historico.startsWith(
                            "ESTORNO "
                        ) ||
                        historico.startsWith(
                            "EST "
                        )
                    );
                }
        },
        {
            id:
                "resgate-rdc",

            rotulo:
                "RESGATE RDC",

            motivo:
                "Resgate de aplicação não é considerado renda.",

            ignorarPeriodo:
                false,

            testar:
                function (historico) {
                    return historico.includes(
                        "RESGATE RDC"
                    );
                }
        },

        /*
         * CORREÇÃO:
         *
         * Exemplo encontrado:
         *
         * COOPERA - CREDITO RESGATE PONTOS C/C
         * R$ 7,43 C
         *
         * É resgate de pontos, portanto não compõe
         * movimentação média/renda.
         */
        {
            id:
                "coopera-resgate-pontos",

            rotulo:
                "COOPERA - CRÉDITO RESGATE PONTOS C/C",

            motivo:
                "Resgate de pontos do programa Coopera não representa renda ou depósito operacional.",

            ignorarPeriodo:
                false,

            testar:
                function (historico) {
                    return (
                        historico.includes(
                            "COOPERA"
                        ) &&
                        (
                            historico.includes(
                                "CREDITO RESGATE PONTOS"
                            ) ||
                            historico.includes(
                                "CRED RESGATE PONTOS"
                            ) ||
                            historico.includes(
                                "RESGATE PONTOS C C"
                            ) ||
                            historico.includes(
                                "RESGATE DE PONTOS"
                            )
                        )
                    );
                }
        },
        {
            id:
                "saldo-bloqueado-anterior",

            rotulo:
                "SALDO BLOQUEADO ANTERIOR",

            motivo:
                "Linha informativa do extrato.",

            ignorarPeriodo:
                true,

            testar:
                function (historico) {
                    return historico.includes(
                        "SALDO BLOQUEADO ANTERIOR"
                    );
                }
        },
        {
            id:
                "saldo-anterior",

            rotulo:
                "SALDO ANTERIOR",

            motivo:
                "Linha informativa do extrato.",

            ignorarPeriodo:
                true,

            testar:
                function (historico) {
                    return historico.includes(
                        "SALDO ANTERIOR"
                    );
                }
        },
        {
            id:
                "saldo-dia",

            rotulo:
                "SALDO DO DIA",

            motivo:
                "Linha informativa do extrato.",

            ignorarPeriodo:
                true,

            testar:
                function (historico) {
                    return (
                        historico.includes(
                            "SALDO DO DIA"
                        ) ||
                        historico.includes(
                            "SALDO FINAL DO DIA"
                        )
                    );
                }
        }
    ];

    /* =========================================================
       HISTÓRICOS DE CRÉDITO SEM INDICADOR C
       ========================================================= */

    const PADROES_CREDITO_SEM_INDICADOR = [
        "CRED TED STR",
        "CRED TRANSF CONTAS",
        "CRED TRANSF CONTAS INTERCREDIS",
        "CRED TRANSF",
        "CREDITO TRANSFERENCIA",
        "CREDITO TRANSF",
        "DEP CHEQUE COOP AG",
        "DEP CHEQUE AG",
        "DEPOSITO CHEQUE AG",
        "DEPOSITO CHEQUE",
        "DEP DINHEIRO",
        "DEPOSITO DINHEIRO",
        "DEPOSITO EM DINHEIRO AG",
        "DEPOSITO EM DINHEIRO",
        "LIBERACAO DE DEPOSITO BLOQUEADO",
        "PIX RECEBIDO",
        "PIX RECEB",
        "PIX CREDITO",
        "TRANSF RECEBIDA",
        "TRANSFERENCIA RECEBIDA",
        "TED RECEBIDA",
        "DOC RECEBIDO",
        "OUTROS CREDITOS",
        "CRED DISTRIBUICAO SOBRAS VALORES"
    ];

    /* =========================================================
       MARCADORES DE INÍCIO / FIM DE BLOCO
       ========================================================= */

    const MARCADORES_FIM_BLOCO_EXTRATO = [
        "RESUMO",
        "LANCAMENTOS FUTUROS",
        "LANCAMENTO FUTURO",
        "SALDOS E LIMITES",
        "RESUMO FINANCEIRO"
    ];

    /* =========================================================
       INICIALIZAÇÃO
       ========================================================= */

    document.addEventListener(
        "DOMContentLoaded",
        iniciarMediaMovimentacao
    );

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
                        movimentacoesExtrato.length ===
                        0
                    ) {
                        return;
                    }

                    identificarPeriodoExtrato();
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
                        movimentacoesExtrato.length ===
                        0
                    ) {
                        return;
                    }

                    calcularResultadosMovimentacao();
                }
            );

            mesesConsiderados.addEventListener(
                "blur",
                function () {
                    normalizarMesesConsiderados();

                    if (
                        movimentacoesExtrato.length ===
                        0
                    ) {
                        return;
                    }

                    calcularResultadosMovimentacao();
                }
            );
        }
    }

    /* =========================================================
       PROCESSAMENTO
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
            movimentacoesExtrato.length ===
            0
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
       RESET
       ========================================================= */

    function resetarEstadoMovimentacao() {
        movimentacoesExtrato = [];
        movimentacoesConsideradas = [];
        movimentacoesExcluidas = [];

        primeiraDataExtrato = null;
        ultimaDataExtrato = null;

        historicosExcluidosManualmente.clear();
        historicosAutomaticosDesmarcados.clear();
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
            String(
                texto || ""
            )
                .replace(
                    /\r\n/g,
                    "\n"
                )
                .replace(
                    /\r/g,
                    "\n"
                )
                .split(
                    "\n"
                );

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

                /*
                 * Ao começar outro bloco de extrato,
                 * não transporta a data do mês anterior.
                 */
                if (
                    ehCabecalhoPrincipalExtrato(
                        linha
                    )
                ) {
                    dataCorrente = null;

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
                    linha.includes(
                        "|"
                    )
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
                    Object.prototype.hasOwnProperty.call(
                        resultado,
                        "dataCorrente"
                    )
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
         * IMPORTANTE:
         *
         * Não remover "duplicidades" automaticamente.
         * Duas transações podem legitimamente possuir
         * mesma data, histórico, documento e valor.
         */
        return movimentacoes;
    }

    /* =========================================================
       PREPARAÇÃO DOS BLOCOS DO EXTRATO
       ========================================================= */

    function prepararTrechoExtrato(
        textoOriginal
    ) {
        const linhas =
            String(
                textoOriginal || ""
            )
                .replace(
                    /\r\n/g,
                    "\n"
                )
                .replace(
                    /\r/g,
                    "\n"
                )
                .split(
                    "\n"
                );

        const possuiCabecalho =
            linhas.some(
                ehCabecalhoPrincipalExtrato
            );

        /*
         * Quando não existe cabeçalho reconhecível,
         * preserva todo o conteúdo e deixa o parser
         * analisar linha a linha.
         */
        if (!possuiCabecalho) {
            return linhas.join(
                "\n"
            );
        }

        /*
         * CORREÇÃO PRINCIPAL:
         *
         * O extrato pode conter:
         *
         * CABEÇALHO
         * lançamentos de agosto
         * RESUMO
         *
         * CABEÇALHO
         * lançamentos de julho
         * RESUMO
         *
         * CABEÇALHO
         * lançamentos de junho
         * RESUMO
         *
         * A versão anterior interrompia definitivamente
         * no PRIMEIRO "RESUMO".
         *
         * Agora cada bloco é tratado separadamente e
         * o processamento volta a ser ativado quando
         * um novo cabeçalho é encontrado.
         */
        const resultado = [];

        let dentroBloco =
            false;

        linhas.forEach(
            function (linha) {
                if (
                    ehCabecalhoPrincipalExtrato(
                        linha
                    )
                ) {
                    dentroBloco = true;

                    /*
                     * Mantém o cabeçalho como marcador
                     * para que dataCorrente seja zerada.
                     */
                    resultado.push(
                        linha
                    );

                    return;
                }

                if (
                    dentroBloco &&
                    ehMarcadorFimBlocoExtrato(
                        linha
                    )
                ) {
                    dentroBloco = false;

                    return;
                }

                if (dentroBloco) {
                    resultado.push(
                        linha
                    );
                }
            }
        );

        return resultado.join(
            "\n"
        );
    }

    /* =========================================================
       IDENTIFICA CABEÇALHO PRINCIPAL
       ========================================================= */

    function ehCabecalhoPrincipalExtrato(
        linha
    ) {
        const normalizado =
            normalizarTexto(
                linha
            );

        if (!normalizado) {
            return false;
        }

        return (
            normalizado.includes(
                "DATA"
            ) &&
            normalizado.includes(
                "HISTORICO"
            ) &&
            normalizado.includes(
                "VALOR"
            )
        );
    }

    /* =========================================================
       IDENTIFICA FIM DO BLOCO
       ========================================================= */

    function ehMarcadorFimBlocoExtrato(
        linha
    ) {
        const normalizado =
            normalizarTexto(
                linha
            );

        if (!normalizado) {
            return false;
        }

        return MARCADORES_FIM_BLOCO_EXTRATO.some(
            function (marcador) {
                return (
                    normalizado ===
                    marcador ||
                    normalizado.startsWith(
                        marcador + " "
                    )
                );
            }
        );
    }

    /* =========================================================
       LINHAS IGNORADAS
       ========================================================= */

    function deveIgnorarLinhaExtrato(
        linha
    ) {
        const texto =
            String(
                linha || ""
            ).trim();

        if (!texto) {
            return true;
        }

        /*
         * Separador de Markdown.
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

        if (
            ehCabecalhoPrincipalExtrato(
                texto
            )
        ) {
            return true;
        }

        if (
            ehMarcadorFimBlocoExtrato(
                texto
            )
        ) {
            return true;
        }

        const cabecalhos = [
            "DATA DOCUMENTO HISTORICO VALOR",
            "DATA HISTORICO VALOR",
            "DOCUMENTO HISTORICO VALOR"
        ];

        if (
            cabecalhos.includes(
                normalizado
            )
        ) {
            return true;
        }

        return false;
    }

    /* =========================================================
       LINHA DE TABELA / MARKDOWN
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

        if (
            !texto.includes(
                "|"
            )
        ) {
            return null;
        }

        if (
            texto.startsWith(
                "|"
            )
        ) {
            texto =
                texto.substring(
                    1
                );
        }

        if (
            texto.endsWith(
                "|"
            )
        ) {
            texto =
                texto.substring(
                    0,
                    texto.length - 1
                );
        }

        const colunas =
            texto
                .split(
                    "|"
                )
                .map(
                    function (item) {
                        return item.trim();
                    }
                );

        if (
            colunas.length <
            3
        ) {
            return null;
        }

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
            colunas.length >=
            4
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
                    .filter(
                        Boolean
                    )
                    .join(
                        " "
                    );
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
            return {
                dataCorrente:
                    null,

                movimentacao:
                    null
            };
        }

        let dataMovimentacao =
            null;

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

        if (
            !dataMovimentacao ||
            !historico
        ) {
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

        return {
            dataCorrente:
                novaDataCorrente,

            movimentacao:
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
                })
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
                ].join(
                    " "
                )
            );

        return (
            combinado.includes(
                "DATA"
            ) &&
            combinado.includes(
                "HISTORICO"
            ) &&
            combinado.includes(
                "VALOR"
            )
        );
    }

    /* =========================================================
       LINHA DE TEXTO / TAB
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
                .replace(
                    /\u00A0/g,
                    " "
                )
                .trim();

        if (!texto) {
            return null;
        }

        if (
            ehCabecalhoPrincipalExtrato(
                texto
            )
        ) {
            return {
                dataCorrente:
                    null,

                movimentacao:
                    null
            };
        }

        let dataMovimentacao =
            null;

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

        return {
            dataCorrente:
                novaDataCorrente,

            movimentacao:
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
       VALOR FINAL DA LINHA
       ========================================================= */

    function extrairValorFinalLinha(
        texto
    ) {
        const valor =
            limparCelulaValor(
                texto
            );

        const regex =
            /(-?\s*(?:R\$\s*)?(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2})\s*([CD*])?\s*$/i;

        const correspondencia =
            valor.match(
                regex
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

            indicador:
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

    /* =========================================================
       VALOR DE CÉLULA
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
                documento:
                    "",

                historico:
                    ""
            };
        }

        const partesTab =
            valor
                .split(
                    /\t+/
                )
                .map(
                    function (item) {
                        return item.trim();
                    }
                )
                .filter(
                    Boolean
                );

        if (
            partesTab.length >=
            2
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
                            .slice(
                                1
                            )
                            .join(
                                " "
                            )
                            .trim()
                };
            }

            return {
                documento:
                    "",

                historico:
                    partesTab
                        .join(
                            " "
                        )
                        .trim()
            };
        }

        const partesEspaco =
            valor
                .split(
                    /\s{2,}/
                )
                .map(
                    function (item) {
                        return item.trim();
                    }
                )
                .filter(
                    Boolean
                );

        if (
            partesEspaco.length >=
            2
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
                            .slice(
                                1
                            )
                            .join(
                                " "
                            )
                            .trim()
                };
            }

            return {
                documento:
                    "",

                historico:
                    partesEspaco
                        .join(
                            " "
                        )
                        .trim()
            };
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
            documento:
                "",

            historico:
                valor
        };
    }

    /* =========================================================
       DOCUMENTO
       ========================================================= */

    function pareceDocumento(
        valor
    ) {
        const texto =
            String(
                valor || ""
            ).trim();

        if (
            !texto ||
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
       LIMPEZA DE CÉLULA
       ========================================================= */

    function limparCelulaTexto(
        texto
    ) {
        return String(
            texto || ""
        )
            .replace(
                /\u00A0/g,
                " "
            )
            .replace(
                /&nbsp;/gi,
                " "
            )
            .replace(
                /<br\s*\/?>/gi,
                " "
            )
            .replace(
                /\\([*_])/g,
                "$1"
            )
            .replace(
                /\*\*/g,
                ""
            )
            .replace(
                /__/g,
                ""
            )
            .replace(
                /^\s*[*_]+\s*/,
                ""
            )
            .replace(
                /\s*[*_]+\s*$/,
                ""
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim();
    }

    function limparCelulaValor(
        texto
    ) {
        const marcador =
            "__ASTERISCO_INDICADOR__";

        let valor =
            String(
                texto || ""
            )
                .replace(
                    /\u00A0/g,
                    " "
                )
                .replace(
                    /&nbsp;/gi,
                    " "
                )
                .replace(
                    /<br\s*\/?>/gi,
                    " "
                )
                .replace(
                    /\\\*/g,
                    marcador
                )
                .replace(
                    /\*\*/g,
                    ""
                )
                .replace(
                    /__/g,
                    ""
                )
                .trim();

        valor =
            valor
                .replace(
                    new RegExp(
                        marcador,
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
            .replace(
                /\u00A0/g,
                ""
            )
            .trim();
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

        const datas =
            movimentacoesPeriodo.map(
                function (movimentacao) {
                    return movimentacao.data;
                }
            );

        if (
            datas.length ===
            0
        ) {
            primeiraDataExtrato =
                null;

            ultimaDataExtrato =
                null;

            definirValorCampo(
                "mesesDetectadosMovimentacao",
                ""
            );

            const inputMeses =
                document.getElementById(
                    "mesesConsideradosMovimentacao"
                );

            if (inputMeses) {
                inputMeses.value =
                    "";
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
                String(
                    mesesDetectados
                );
        }

        atualizarExibicaoPeriodo();
    }

    /* =========================================================
       IGNORA INFORMATIVOS NA DETECÇÃO DO PERÍODO
       ========================================================= */

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

        /*
         * Mesmo que o usuário desmarque a exclusão
         * visual de SALDO ANTERIOR/SALDO DO DIA,
         * esses lançamentos continuam sem alterar
         * a primeira/última competência.
         */
        return Boolean(
            regra &&
            regra.ignorarPeriodo ===
            true
        );
    }

    /* =========================================================
       VALIDA DATA
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
        const primeira =
            document.getElementById(
                "primeiraDataMovimentacao"
            );

        const ultima =
            document.getElementById(
                "ultimaDataMovimentacao"
            );

        if (primeira) {
            const valor =
                primeiraDataExtrato
                    ? formatarDataBrasileira(
                        primeiraDataExtrato
                    )
                    : "";

            if (
                "value" in
                primeira
            ) {
                primeira.value =
                    valor;
            } else {
                primeira.textContent =
                    valor || "-";
            }
        }

        if (ultima) {
            const valor =
                ultimaDataExtrato
                    ? formatarDataBrasileira(
                        ultimaDataExtrato
                    )
                    : "";

            if (
                "value" in
                ultima
            ) {
                ultima.value =
                    valor;
            } else {
                ultima.textContent =
                    valor || "-";
            }
        }
    }

    /* =========================================================
       CLASSIFICAÇÃO
       ========================================================= */

    function classificarMovimentacoes() {
        movimentacoesConsideradas =
            [];

        movimentacoesExcluidas =
            [];

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
            movimentacao
                .historicoNormalizado;

        const regraExclusao =
            localizarRegraExclusao(
                historico
            );

        /*
         * Regra automática:
         * marcada por padrão.
         *
         * Se o usuário a desmarcou, ela não é aplicada
         * como exclusão automática.
         */
        if (
            regraExclusao &&
            !historicosAutomaticosDesmarcados.has(
                historico
            )
        ) {
            return {
                considerado:
                    false,

                motivo:
                    regraExclusao.rotulo
            };
        }

        /*
         * Débito nunca entra como crédito considerado.
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
         * Valor bloqueado/informativo.
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
         * Exclusão manual.
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
                    regraExclusao
                        ? "Regra automática desmarcada pelo usuário"
                        : "Crédito identificado pelo indicador C"
            };
        }

        /*
         * Crédito pelo histórico.
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
                    regraExclusao
                        ? "Regra automática desmarcada pelo usuário"
                        : "Crédito identificado pelo histórico"
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
       CRÉDITO POTENCIAL
       ========================================================= */

    function ehCreditoPotencial(
        movimentacao
    ) {
        if (!movimentacao) {
            return false;
        }

        const regra =
            localizarRegraExclusao(
                movimentacao
                    .historicoNormalizado
            );

        if (
            regra &&
            regra.ignorarPeriodo
        ) {
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
       HISTÓRICOS / REGRAS
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

        container.innerHTML =
            "";

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
                " lançamento(s). As exclusões automáticas já vêm marcadas; desmarque somente quando precisar incluir excepcionalmente o histórico.";
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

                const automaticoDesmarcado =
                    historicosAutomaticosDesmarcados.has(
                        grupo.normalizado
                    );

                /*
                 * Regra automática:
                 * sempre habilitada.
                 *
                 * Crédito comum:
                 * também habilitado para permitir
                 * exclusão manual.
                 *
                 * Débito/informativo sem regra:
                 * continua sem interação porque já não
                 * compõe o cálculo por natureza.
                 */
                const podeInteragir =
                    Boolean(
                        regraAutomatica ||
                        grupo.creditosPotenciais >
                        0
                    );

                const marcado =
                    regraAutomatica
                        ? !automaticoDesmarcado
                        : manual;

                const label =
                    document.createElement(
                        "label"
                    );

                label.className =
                    "opcao-simulacao regra-movimentacao-item";

                if (
                    regraAutomatica
                ) {
                    label.classList.add(
                        "regra-movimentacao-automatica"
                    );
                }

                if (
                    !regraAutomatica &&
                    !podeInteragir
                ) {
                    label.classList.add(
                        "regra-movimentacao-informativa"
                    );
                }

                let status = "";

                if (
                    regraAutomatica
                ) {
                    status =
                        marcado
                            ? "Exclusão automática ativa: " +
                            regraAutomatica.motivo
                            : "Exclusão automática desmarcada pelo usuário";
                } else if (
                    grupo.creditosPotenciais >
                    0
                ) {
                    status =
                        grupo.creditosPotenciais +
                        " crédito(s) identificado(s) · marque para desconsiderar";
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

                label.innerHTML = `
                    <input
                        type="checkbox"
                        id="historico-movimentacao-${indice}"
                        ${marcado ? "checked" : ""}
                        ${podeInteragir ? "" : "disabled"}
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

                if (
                    checkbox &&
                    podeInteragir
                ) {
                    checkbox.addEventListener(
                        "change",
                        function () {
                            if (
                                regraAutomatica
                            ) {
                                if (
                                    checkbox.checked
                                ) {
                                    historicosAutomaticosDesmarcados.delete(
                                        grupo.normalizado
                                    );
                                } else {
                                    historicosAutomaticosDesmarcados.add(
                                        grupo.normalizado
                                    );
                                }
                            } else {
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

    /* =========================================================
       AGRUPAMENTO DE HISTÓRICOS
       ========================================================= */

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
                                movimentacao.historico,

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
       COMPATIBILIDADE
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
            mesesConsiderados <=
            0
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
            mesesConsiderados >
                0
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

        definirValorCampo(
            "mesesDetectadosMovimentacao",
            mesesDetectados || ""
        );
    }

    /* =========================================================
       NORMALIZA MESES
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
            numero <=
            0
        ) {
            input.value =
                "";

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
       RENDERIZA RESULTADOS
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

        tbody.innerHTML =
            "";

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

        const agrupamento =
            {};

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

                    quantidade:
                        0,

                    total:
                        0
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
       COMPETÊNCIAS DO PERÍODO
       ========================================================= */

    function gerarCompetenciasPeriodo(
        dataInicial,
        dataFinal
    ) {
        const competencias =
            [];

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
                atual.getMonth() +
                1
            );
        }

        return competencias;
    }

    /* =========================================================
       CRÉDITOS CONSIDERADOS
       ========================================================= */

    function renderizarTabelaConsideradas() {
        const tbody =
            obterTbodyTabela(
                "tabelaMovimentacoesConsideradas"
            );

        if (!tbody) {
            return;
        }

        tbody.innerHTML =
            "";

        if (
            movimentacoesConsideradas.length ===
            0
        ) {
            inserirLinhaSemDados(
                tbody,
                5,
                "Nenhuma movimentação de crédito considerada."
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
       MOVIMENTAÇÕES EXCLUÍDAS
       ========================================================= */

    function renderizarTabelaExcluidas() {
        const tbody =
            obterTbodyTabela(
                "tabelaMovimentacoesExcluidas"
            );

        if (!tbody) {
            return;
        }

        tbody.innerHTML =
            "";

        if (
            movimentacoesExcluidas.length ===
            0
        ) {
            inserirLinhaSemDados(
                tbody,
                5,
                "Nenhuma movimentação desconsiderada."
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
       TBODY
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

        if (
            correspondencia[3].length ===
            2
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
                data.getMonth() +
                1
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
                data.getMonth() +
                1
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
            ).split(
                "-"
            );

        if (
            partes.length !==
            2
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
            .replace(
                /\u00A0/g,
                " "
            )
            .replace(
                /&nbsp;/gi,
                " "
            )
            .replace(
                /<br\s*\/?>/gi,
                " "
            )
            .replace(
                /\*\*/g,
                ""
            )
            .replace(
                /__/g,
                ""
            )
            .replace(
                /\\([*_])/g,
                "$1"
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
                .replace(
                    /R\$/gi,
                    ""
                )
                .replace(
                    /\s/g,
                    ""
                )
                .trim();

        if (!texto) {
            return NaN;
        }

        if (
            texto.includes(
                ","
            )
        ) {
            texto =
                texto
                    .replace(
                        /\./g,
                        ""
                    )
                    .replace(
                        ",",
                        "."
                    );
        } else {
            const pontos =
                (
                    texto.match(
                        /\./g
                    ) ||
                    []
                ).length;

            if (
                pontos >
                1
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
            textarea.value =
                "";
        }

        if (mesesConsiderados) {
            mesesConsiderados.value =
                "";
        }

        if (mesesDetectados) {
            mesesDetectados.value =
                "";
        }

        limparResultadosMovimentacao();
        renderizarHistoricosExtrato();
    }

    /* =========================================================
       LIMPA RESULTADOS
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
                primeira.value =
                    "";
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
                ultima.value =
                    "";
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
       HELPERS DOM
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

    /* =========================================================
       COMPATIBILIDADE GLOBAL
       ========================================================= */

    window.processarMovimentacao =
        processarMovimentacao;

    window.limparMediaMovimentacao =
        limparMediaMovimentacao;

    window.renderizarRegrasMovimentacao =
        renderizarRegrasMovimentacao;
})();