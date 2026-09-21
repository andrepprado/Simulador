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
   REGRAS AUTOMÁTICAS DE EXCLUSÃO

   IMPORTANTE:
   - todas estas regras iniciam EXCLUÍDAS;
   - aparecem marcadas na interface;
   - o checkbox permanece liberado;
   - se o usuário desmarcar, a regra poderá ser incluída
     manualmente, exceto débitos e indicador "*".
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
                historico.includes("CREDITO EMPRESTIMO") ||
                historico.includes("LIBERACAO EMPRESTIMO")
            );
        }
    },
    {
        id: "cred-liberacao-td",
        rotulo: "CRÉD. LIBERAÇÃO TD",
        motivo: "Liberação de título descontado não representa renda.",
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
        motivo: "Liberação de recurso de financiamento BNDES não representa renda.",
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
        motivo: "Liberação de título de recebível de cartão deve ser desconsiderada.",
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
        id: "cheque-devolvido",
        rotulo: "CHEQUE DEVOLVIDO",
        motivo: "Cheque devolvido não representa renda efetiva.",
        ignorarPeriodo: false,
        testar: function (historico) {
            return (
                historico.includes("CHEQUE DEVOLVIDO") ||
                historico.includes("CH DEVOLVIDO")
            );
        }
    },
    {
        id: "est-pix-outra-if",
        rotulo: "EST. PIX EMITIDO OUTRA IF",
        motivo: "Estorno não representa renda.",
        ignorarPeriodo: false,
        testar: function (historico) {
            return (
                historico.includes("EST PIX EMITIDO OUTRA IF") ||
                historico.includes("ESTORNO PIX EMITIDO")
            );
        }
    },
    {
        id: "estorno-compra-mastercard",
        rotulo: "ESTORNO COMPRA MASTERCARD",
        motivo: "Estorno de compra não representa renda.",
        ignorarPeriodo: false,
        testar: function (historico) {
            return (
                historico.includes("ESTORNO COMPRA") &&
                historico.includes("MASTERCARD")
            );
        }
    },
    {
        id: "estorno-deb-convenio",
        rotulo: "ESTORNO DÉB. CONV. DEMAIS EMPRESAS",
        motivo: "Estorno de débito não representa renda.",
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
        motivo: "Estorno não representa renda.",
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
        id: "coopera-resgate-pontos",
        rotulo: "COOPERA - CRÉDITO RESGATE PONTOS C/C",
        motivo: "Resgate de pontos Coopera não representa renda.",
        ignorarPeriodo: false,
        testar: function (historico) {
            return (
                historico.includes("CREDITO RESGATE PONTOS") ||
                historico.includes("CRED RESGATE PONTOS") ||
                (
                    historico.includes("COOPERA") &&
                    historico.includes("RESGATE PONTOS")
                )
            );
        }
    },
    {
        id: "saldo-anterior",
        rotulo: "SALDO ANTERIOR",
        motivo: "Saldo anterior é somente uma linha informativa.",
        ignorarPeriodo: true,
        testar: function (historico) {
            return (
                historico.includes("SALDO ANTERIOR") &&
                !historico.includes("SALDO BLOQUEADO ANTERIOR")
            );
        }
    },
    {
        id: "saldo-bloqueado-anterior",
        rotulo: "SALDO BLOQUEADO ANTERIOR",
        motivo: "Saldo bloqueado anterior é somente uma linha informativa.",
        ignorarPeriodo: true,
        testar: function (historico) {
            return historico.includes("SALDO BLOQUEADO ANTERIOR");
        }
    },
    {
        id: "saldo-dia",
        rotulo: "SALDO DO DIA",
        motivo: "Saldo do dia é somente uma linha informativa.",
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
   HISTÓRICOS QUE REPRESENTAM CRÉDITO

   O indicador C continua sendo a principal identificação.
   Esta lista cobre situações em que o texto copiado não
   preserva corretamente o indicador.
========================================================= */

const PADROES_CREDITO_SEM_INDICADOR = [
    "PIX RECEBIDO",
    "PIX RECEB",
    "CRED TED STR",
    "CRED TRANSF CONTAS",
    "CRED TRANSF CONTAS INTERCREDIS",
    "CRED TRANSF",
    "CREDITO TRANSFERENCIA",
    "TRANSF RECEBIDA",
    "TRANSFERENCIA RECEBIDA",
    "TED RECEBIDA",
    "DOC RECEBIDO",
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
    "CR ANTECIPACAO",
    "CRED LIQUIDACAO COBRANCA"
];

/* =========================================================
   INICIALIZAÇÃO
========================================================= */

function iniciarMediaMovimentacao() {
    liberarCamposEdicaoMovimentacao();
    configurarEventosMediaMovimentacao();
    limparResultadosMovimentacao();
    renderizarHistoricosExtrato();
}

/* =========================================================
   CAMPOS EDITÁVEIS
========================================================= */

function liberarCamposEdicaoMovimentacao() {
    [
        "primeiraDataMovimentacao",
        "ultimaDataMovimentacao",
        "mesesDetectadosMovimentacao",
        "mesesConsideradosMovimentacao"
    ].forEach(function (id) {
        const campo = document.getElementById(id);

        if (!campo) {
            return;
        }

        campo.disabled = false;
        campo.readOnly = false;

        campo.removeAttribute("disabled");
        campo.removeAttribute("readonly");

        campo.setAttribute(
            "aria-readonly",
            "false"
        );

        campo.style.pointerEvents = "auto";
    });
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

    const btnRestaurar =
        document.getElementById(
            "btnRestaurarPeriodoMovimentacao"
        );

    const primeiraData =
        document.getElementById(
            "primeiraDataMovimentacao"
        );

    const ultimaData =
        document.getElementById(
            "ultimaDataMovimentacao"
        );

    const mesesDetectados =
        document.getElementById(
            "mesesDetectadosMovimentacao"
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
                if (!movimentacoesExtrato.length) {
                    return;
                }

                aplicarPeriodoInformadoPeloUsuario();

                classificarMovimentacoes();
                calcularResultadosMovimentacao();

                renderizarHistoricosExtrato();
                renderizarResultadosMovimentacao();
            }
        );
    }

    if (btnRestaurar) {
        btnRestaurar.addEventListener(
            "click",
            function () {
                restaurarPeriodoAutomatico();

                if (!movimentacoesExtrato.length) {
                    return;
                }

                classificarMovimentacoes();
                calcularResultadosMovimentacao();
                renderizarHistoricosExtrato();
                renderizarResultadosMovimentacao();
            }
        );
    }

    [primeiraData, ultimaData].forEach(function (campo) {
        if (!campo) {
            return;
        }

        campo.addEventListener(
            "input",
            aplicarMascaraDataCampo
        );

        campo.addEventListener(
            "blur",
            function () {
                if (!movimentacoesExtrato.length) {
                    return;
                }

                aplicarPeriodoInformadoPeloUsuario({
                    recalcularMesesDetectados: true,
                    preservarMesesConsiderados: true
                });

                calcularResultadosMovimentacao();
                renderizarResultadosMovimentacao();
            }
        );
    });

    if (mesesDetectados) {
        mesesDetectados.addEventListener(
            "input",
            function () {
                if (!movimentacoesExtrato.length) {
                    return;
                }

                calcularResultadosMovimentacao();
            }
        );

        mesesDetectados.addEventListener(
            "blur",
            function () {
                normalizarCampoMeses(
                    mesesDetectados,
                    false
                );

                if (!movimentacoesExtrato.length) {
                    return;
                }

                calcularResultadosMovimentacao();
            }
        );
    }

    if (mesesConsiderados) {
        mesesConsiderados.addEventListener(
            "input",
            function () {
                if (!movimentacoesExtrato.length) {
                    return;
                }

                calcularResultadosMovimentacao();
            }
        );

        mesesConsiderados.addEventListener(
            "blur",
            function () {
                normalizarCampoMeses(
                    mesesConsiderados,
                    false
                );

                if (!movimentacoesExtrato.length) {
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

    if (!movimentacoesExtrato.length) {
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

    liberarCamposEdicaoMovimentacao();
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

    primeiraDataExtratoAutomatica = null;
    ultimaDataExtratoAutomatica = null;

    mesesDetectadosAutomaticos = 0;
    formatoDataExtrato = "BR";

    historicosExcluidosManualmente.clear();
    historicosIncluidosManualmente.clear();
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
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .split("\n");

    formatoDataExtrato =
        detectarFormatoDataExtrato(
            linhas
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

            if (
                deveIgnorarLinhaExtrato(
                    linha
                )
            ) {
                return;
            }

            let resultado = null;

            if (linha.includes("|")) {
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

            if (resultado.dataCorrente) {
                dataCorrente =
                    resultado.dataCorrente;
            }

            if (resultado.movimentacao) {
                movimentacoes.push(
                    resultado.movimentacao
                );
            }
        }
    );

    return movimentacoes;
}

/* =========================================================
   PREPARAÇÃO DO TEXTO

   CORREÇÃO IMPORTANTE:

   O usuário pode colar:
   - somente as linhas do extrato;
   - texto copiado do Excel;
   - um extrato SISBR completo;
   - vários extratos SISBR completos concatenados;
   - vários meses sem repetir o cabeçalho;
   - blocos separados por RESUMO.

   O processamento NÃO pode parar no primeiro RESUMO.
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

    const linhasValidas = [];

    let processandoMovimentacoes = false;
    let dentroResumo = false;

    for (
        let i = 0;
        i < linhas.length;
        i++
    ) {
        const linhaOriginal =
            String(
                linhas[i] || ""
            );

        const linha =
            linhaOriginal.trim();

        if (!linha) {
            continue;
        }

        const normalizada =
            normalizarTexto(
                linha
            );

        if (!normalizada) {
            continue;
        }

        /* =====================================================
           CABEÇALHO DE MOVIMENTAÇÕES
        ===================================================== */

        const ehCabecalho =
            normalizada.includes("DATA") &&
            normalizada.includes("HISTORICO") &&
            normalizada.includes("VALOR");

        if (ehCabecalho) {
            processandoMovimentacoes = true;
            dentroResumo = false;
            continue;
        }

        /* =====================================================
           LINHA COM DATA NO INÍCIO

           Uma linha com data pode ser:
           - movimentação real;
           - SALDO ANTERIOR;
           - início de um novo extrato SISBR.

           Portanto ela também reabre o processamento depois
           de um RESUMO.
        ===================================================== */

        const possuiDataInicio =
            /^\s*\d{1,2}\/\d{1,2}\/\d{2,4}(?=\s|\t|\||$)/.test(
                linhaOriginal
            );

        /* =====================================================
           RESUMO
        ===================================================== */

        if (
            normalizada === "RESUMO" ||
            normalizada.startsWith(
                "RESUMO "
            ) ||
            normalizada.includes(
                "LANCAMENTOS FUTUROS"
            )
        ) {
            dentroResumo = true;
            processandoMovimentacoes = false;
            continue;
        }

        /* =====================================================
           NOVO BLOCO APÓS UM RESUMO

           Esta é uma das correções principais.

           Mesmo que o novo extrato não traga novamente:
           DATA DOCUMENTO HISTÓRICO VALOR

           uma nova linha iniciada por data permite retomar
           o processamento.
        ===================================================== */

        if (
            dentroResumo &&
            possuiDataInicio
        ) {
            dentroResumo = false;
            processandoMovimentacoes = true;

            linhasValidas.push(
                linhaOriginal
            );

            continue;
        }

        if (dentroResumo) {
            continue;
        }

        /* =====================================================
           EXTRATO COLADO SEM CABEÇALHO
        ===================================================== */

        if (
            !processandoMovimentacoes &&
            possuiDataInicio
        ) {
            processandoMovimentacoes = true;
        }

        if (!processandoMovimentacoes) {
            continue;
        }

        linhasValidas.push(
            linhaOriginal
        );
    }

    return linhasValidas.join(
        "\n"
    );
}

/* =========================================================
   LINHAS A IGNORAR
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
        normalizado.includes(
            "DATA DOCUMENTO HISTORICO VALOR"
        )
    ) {
        return true;
    }

    if (
        normalizado === "SICOOB" ||
        normalizado.includes(
            "SISTEMA DE COOPERATIVAS DE CREDITO DO BRASIL"
        ) ||
        normalizado.includes(
            "SISBR SISTEMA DE INFORMATICA DO SICOOB"
        )
    ) {
        return true;
    }

    if (
        normalizado.startsWith(
            "COOP "
        )
    ) {
        return true;
    }

    if (
        normalizado.startsWith(
            "CONTA "
        )
    ) {
        return true;
    }

    if (
        normalizado.includes(
            "EXTRATO CONTA CORRENTE"
        )
    ) {
        return true;
    }

    if (
        normalizado === "RESUMO" ||
        normalizado.startsWith(
            "RESUMO "
        )
    ) {
        return true;
    }

    return false;
}

/* =========================================================
   LINHA MARKDOWN / |
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

    if (colunas.length < 3) {
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

    if (colunas.length >= 4) {
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

    let dataMovimentacao = null;

    if (
        validarFormatoDataGenerica(
            dataTexto
        )
    ) {
        dataMovimentacao =
            converterDataExtrato(
                dataTexto
            );
    } else if (!dataTexto) {
        dataMovimentacao =
            dataCorrente;
    } else {
        return null;
    }

    if (!dataMovimentacao) {
        return null;
    }

    if (!historico) {
        return {
            dataCorrente:
                dataMovimentacao,
            movimentacao:
                null
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
            movimentacao:
                null
        };
    }

    return {
        dataCorrente:
            dataMovimentacao,

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
   LINHA TAB / TEXTO
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
            converterDataExtrato(
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

    if (!dadosDescricao.historico) {
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
   VALOR FINAL
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

function extrairValorIndicador(
    texto
) {
    const valor =
        limparCelulaValor(
            texto
        );

    const correspondencia =
        valor.match(
            /(-?\s*(?:R\$\s*)?(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2})\s*([CD*])?\s*$/i
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
        String(
            texto || ""
        )
            .replace(/\u00A0/g, " ")
            .trim();

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
            };
        }

        return {
            documento: "",
            historico:
                partesTab.join(" ")
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
            };
        }

        return {
            documento: "",
            historico:
                partesEspaco.join(" ")
        };
    }

    const match =
        valor.match(
            /^([0-9A-Z./-]{1,30})\s+(.+)$/i
        );

    if (
        match &&
        pareceDocumento(
            match[1]
        )
    ) {
        return {
            documento:
                match[1],

            historico:
                match[2].trim()
        };
    }

    return {
        documento: "",
        historico:
            valor
    };
}

function pareceDocumento(
    valor
) {
    const texto =
        String(
            valor || ""
        ).trim();

    if (
        !texto ||
        texto.length > 30
    ) {
        return false;
    }

    if (/^\d+$/.test(texto)) {
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
        /^[A-Z]{0,15}\d+[A-Z0-9./-]*$/i.test(
            texto
        )
    ) {
        return true;
    }

    const normalizado =
        normalizarTexto(
            texto
        );

    if (
        /^(PIX|MASTERCARD|CONSORCIOS|SICOOB|RECARGA|ESTORNO)$/.test(
            normalizado
        )
    ) {
        return true;
    }

    return false;
}

/* =========================================================
   PERÍODO
========================================================= */

function identificarPeriodoExtrato() {
    const validas =
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

    if (!validas.length) {
        primeiraDataExtrato = null;
        ultimaDataExtrato = null;

        primeiraDataExtratoAutomatica = null;
        ultimaDataExtratoAutomatica = null;

        mesesDetectadosAutomaticos = 0;

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

    const datas =
        validas.map(
            function (item) {
                return item.data.getTime();
            }
        );

    primeiraDataExtrato =
        new Date(
            Math.min.apply(
                null,
                datas
            )
        );

    ultimaDataExtrato =
        new Date(
            Math.max.apply(
                null,
                datas
            )
        );

    primeiraDataExtratoAutomatica =
        new Date(
            primeiraDataExtrato.getTime()
        );

    ultimaDataExtratoAutomatica =
        new Date(
            ultimaDataExtrato.getTime()
        );

    mesesDetectadosAutomaticos =
        calcularQuantidadeMesesPeriodo(
            primeiraDataExtrato,
            ultimaDataExtrato
        );

    atualizarExibicaoPeriodo();

    definirValorCampo(
        "mesesDetectadosMovimentacao",
        mesesDetectadosAutomaticos
    );

    definirValorCampo(
        "mesesConsideradosMovimentacao",
        mesesDetectadosAutomaticos
    );

    liberarCamposEdicaoMovimentacao();
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
            movimentacao.historicoNormalizado
        );

    return Boolean(
        regra &&
        regra.ignorarPeriodo
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

/* =========================================================
   CLASSIFICAÇÃO INDIVIDUAL
========================================================= */

function classificarMovimentacao(
    movimentacao
) {
    const historico =
        movimentacao
            .historicoNormalizado;

    const regra =
        localizarRegraExclusao(
            historico
        );

    const inclusaoManual =
        historicosIncluidosManualmente.has(
            historico
        );

    /* =====================================================
       EXCLUSÃO AUTOMÁTICA

       Esta verificação ocorre ANTES do indicador C.

       Isso é fundamental para:
       - CRÉD. EMPRÉSTIMO
       - CRÉD. LIBERAÇÃO TD
       - devolução PIX
       - cheque devolvido
       - estornos
       - resgates
       - etc.

       Ou seja: ter "C" não transforma uma exclusão
       obrigatória em renda.
    ===================================================== */

    if (
        regra &&
        !inclusaoManual
    ) {
        return {
            considerado:
                false,

            motivo:
                regra.rotulo +
                " - " +
                regra.motivo
        };
    }

    /* =====================================================
       DÉBITO
    ===================================================== */

    if (
        movimentacao.indicador === "D"
    ) {
        return {
            considerado:
                false,

            motivo:
                "Débito"
        };
    }

    /* =====================================================
       INFORMATIVO / BLOQUEADO
    ===================================================== */

    if (
        movimentacao.indicador === "*"
    ) {
        return {
            considerado:
                false,

            motivo:
                "Valor bloqueado/informativo"
        };
    }

    /* =====================================================
       EXCLUSÃO MANUAL
    ===================================================== */

    if (
        historicosExcluidosManualmente.has(
            historico
        )
    ) {
        return {
            considerado:
                false,

            motivo:
                "Exclusão manual"
        };
    }

    /* =====================================================
       CRÉDITO EXPLÍCITO
    ===================================================== */

    if (
        movimentacao.indicador === "C"
    ) {
        return {
            considerado:
                true,

            motivo:
                "Crédito considerado"
        };
    }

    /* =====================================================
       CRÉDITO IDENTIFICADO PELO HISTÓRICO
    ===================================================== */

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
            "Movimentação não identificada como crédito"
    };
}

function localizarRegraExclusao(
    historico
) {
    const valor =
        normalizarTexto(
            historico
        );

    for (
        let i = 0;
        i <
        REGRAS_EXCLUSAO_MOVIMENTACAO.length;
        i++
    ) {
        const regra =
            REGRAS_EXCLUSAO_MOVIMENTACAO[i];

        if (
            regra.testar(
                valor
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
    const texto =
        normalizarTexto(
            historico
        );

    return PADROES_CREDITO_SEM_INDICADOR.some(
        function (padrao) {
            return texto.includes(
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

    const regra =
        localizarRegraExclusao(
            movimentacao.historicoNormalizado
        );

    if (regra) {
        return false;
    }

    if (
        movimentacao.indicador === "C"
    ) {
        return true;
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

    if (!movimentacoesExtrato.length) {
        if (resumo) {
            resumo.textContent =
                "Processe um extrato para visualizar os históricos encontrados.";
        }

        const vazio =
            document.createElement(
                "div"
            );

        vazio.className =
            "sem-dados";

        vazio.textContent =
            "Nenhum histórico identificado.";

        container.appendChild(
            vazio
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
            " lançamento(s). As exclusões automáticas estão marcadas e desconsideradas do cálculo por padrão. As marcações permanecem disponíveis para alteração manual.";
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

            const exclusaoManual =
                historicosExcluidosManualmente.has(
                    grupo.normalizado
                );

            const inclusaoManual =
                historicosIncluidosManualmente.has(
                    grupo.normalizado
                );

            const marcado =
                regraAutomatica
                    ? !inclusaoManual
                    : exclusaoManual;

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
                    "Exclusão automática ativa: " +
                    regraAutomatica.motivo;
            } else if (
                grupo.creditosPotenciais > 0
            ) {
                status =
                    grupo.creditosPotenciais +
                    " crédito(s) considerado(s) · marque para excluir";
            } else if (
                grupo.debitos > 0
            ) {
                status =
                    grupo.debitos +
                    " débito(s) desconsiderado(s)";
            } else {
                status =
                    "Movimentação informativa/desconsiderada";
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
                checkbox.disabled = false;

                checkbox.removeAttribute(
                    "disabled"
                );

                checkbox.style.pointerEvents =
                    "auto";

                checkbox.addEventListener(
                    "change",
                    function () {
                        if (regraAutomatica) {
                            if (
                                checkbox.checked
                            ) {
                                historicosIncluidosManualmente.delete(
                                    grupo.normalizado
                                );
                            } else {
                                historicosIncluidosManualmente.add(
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

            if (!mapa.has(chave)) {
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

            if (regra) {
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
                    sensitivity:
                        "base"
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
    let mesesDetectados =
        obterNumeroCampo(
            "mesesDetectadosMovimentacao"
        );

    if (
        !Number.isFinite(
            mesesDetectados
        ) ||
        mesesDetectados <= 0
    ) {
        mesesDetectados =
            calcularQuantidadeMesesPeriodo(
                primeiraDataExtrato,
                ultimaDataExtrato
            );
    }

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
            1,
            Math.trunc(
                mesesConsiderados
            )
        );

    const consideradasPeriodo =
        movimentacoesConsideradas.filter(
            movimentacaoDentroPeriodoSelecionado
        );

    const total =
        consideradasPeriodo.reduce(
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

    const media =
        mesesConsiderados > 0
            ? total / mesesConsiderados
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
            mesesConsiderados
        )
    );

    definirTexto(
        "resultadoQtdConsiderados",
        String(
            consideradasPeriodo.length
        )
    );

    const excluidasPeriodo =
        movimentacoesExcluidas.filter(
            movimentacaoDentroPeriodoSelecionado
        );

    definirTexto(
        "resultadoQtdExcluidos",
        String(
            excluidasPeriodo.length
        )
    );
}

function movimentacaoDentroPeriodoSelecionado(
    movimentacao
) {
    if (
        !movimentacao ||
        !possuiDataValida(
            movimentacao.data
        )
    ) {
        return false;
    }

    if (
        possuiDataValida(
            primeiraDataExtrato
        ) &&
        movimentacao.data.getTime() <
        primeiraDataExtrato.getTime()
    ) {
        return false;
    }

    if (
        possuiDataValida(
            ultimaDataExtrato
        ) &&
        movimentacao.data.getTime() >
        ultimaDataExtrato.getTime()
    ) {
        return false;
    }

    return true;
}

/* =========================================================
   RESULTADOS / TABELAS
========================================================= */

function renderizarResultadosMovimentacao() {
    renderizarTabelaResumoMensal();
    renderizarTabelaConsideradas();
    renderizarTabelaExcluidas();
}

/* =========================================================
   RESUMO MENSAL

   HTML:
   Mês | Quantidade | Total Considerado
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

    const movimentacoes =
        movimentacoesConsideradas.filter(
            movimentacaoDentroPeriodoSelecionado
        );

    if (!movimentacoes.length) {
        inserirLinhaSemDados(
            tbody,
            3,
            "Nenhum crédito considerado."
        );

        return;
    }

    const agrupamento = {};

    movimentacoes.forEach(
        function (movimentacao) {
            const competencia =
                movimentacao
                    .competencia;

            if (!agrupamento[competencia]) {
                agrupamento[competencia] = {
                    total: 0,
                    quantidade: 0
                };
            }

            agrupamento[
                competencia
            ].total +=
                movimentacao.valor;

            agrupamento[
                competencia
            ].quantidade++;
        }
    );

    Object.keys(
        agrupamento
    )
        .sort()
        .forEach(
            function (competencia) {
                const dados =
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
                        ${dados.quantidade}
                    </td>

                    <td>
                        ${formatarMoeda(
                    dados.total
                )}
                    </td>
                `;

                tbody.appendChild(
                    tr
                );
            }
        );
}

function renderizarTabelaConsideradas() {
    const tbody =
        obterTbodyTabela(
            "tabelaMovimentacoesConsideradas"
        );

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    const lista =
        movimentacoesConsideradas.filter(
            movimentacaoDentroPeriodoSelecionado
        );

    if (!lista.length) {
        inserirLinhaSemDados(
            tbody,
            5,
            "Nenhuma movimentação de crédito considerada."
        );

        return;
    }

    lista.forEach(
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

function renderizarTabelaExcluidas() {
    const tbody =
        obterTbodyTabela(
            "tabelaMovimentacoesExcluidas"
        );

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    const lista =
        movimentacoesExcluidas.filter(
            movimentacaoDentroPeriodoSelecionado
        );

    if (!lista.length) {
        inserirLinhaSemDados(
            tbody,
            5,
            "Nenhuma movimentação desconsiderada."
        );

        return;
    }

    lista.forEach(
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
                "-"
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
   DATAS - DETECÇÃO DO FORMATO

   SISBR:
   DD/MM/AAAA

   Compatibilidade adicional:
   7/31/2026
========================================================= */

function detectarFormatoDataExtrato(
    linhas
) {
    let evidenciasBR = 0;
    let evidenciasUS = 0;

    (linhas || []).forEach(
        function (linha) {
            const match =
                String(
                    linha || ""
                )
                    .trim()
                    .match(
                        /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?=\s|\t|\||$)/
                    );

            if (!match) {
                return;
            }

            const primeiro =
                Number(
                    match[1]
                );

            const segundo =
                Number(
                    match[2]
                );

            if (
                primeiro > 12 &&
                primeiro <= 31 &&
                segundo >= 1 &&
                segundo <= 12
            ) {
                evidenciasBR++;
            }

            if (
                segundo > 12 &&
                segundo <= 31 &&
                primeiro >= 1 &&
                primeiro <= 12
            ) {
                evidenciasUS++;
            }
        }
    );

    return (
        evidenciasUS >
        evidenciasBR
    )
        ? "US"
        : "BR";
}

function validarFormatoDataGenerica(
    valor
) {
    return /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(
        String(
            valor || ""
        ).trim()
    );
}

function converterDataExtrato(
    valor
) {
    const match =
        String(
            valor || ""
        )
            .trim()
            .match(
                /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/
            );

    if (!match) {
        return null;
    }

    const primeiro =
        Number(
            match[1]
        );

    const segundo =
        Number(
            match[2]
        );

    let ano =
        Number(
            match[3]
        );

    if (
        match[3].length === 2
    ) {
        ano +=
            ano >= 70
                ? 1900
                : 2000;
    }

    let dia =
        primeiro;

    let mes =
        segundo;

    if (
        formatoDataExtrato === "US"
    ) {
        mes =
            primeiro;

        dia =
            segundo;
    }

    let data =
        criarDataValida(
            dia,
            mes,
            ano
        );

    if (!data) {
        data =
            criarDataValida(
                mes,
                dia,
                ano
            );
    }

    return data;
}

function criarDataValida(
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
        const auxiliar =
            inicial;

        inicial =
            final;

        final =
            auxiliar;
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
   PERÍODO EDITÁVEL
========================================================= */

function atualizarExibicaoPeriodo() {
    definirValorCampo(
        "primeiraDataMovimentacao",
        primeiraDataExtrato
            ? formatarDataBrasileira(
                primeiraDataExtrato
            )
            : ""
    );

    definirValorCampo(
        "ultimaDataMovimentacao",
        ultimaDataExtrato
            ? formatarDataBrasileira(
                ultimaDataExtrato
            )
            : ""
    );

    liberarCamposEdicaoMovimentacao();
}

function aplicarPeriodoInformadoPeloUsuario(
    opcoes
) {
    opcoes =
        opcoes || {};

    const primeiraCampo =
        document.getElementById(
            "primeiraDataMovimentacao"
        );

    const ultimaCampo =
        document.getElementById(
            "ultimaDataMovimentacao"
        );

    const primeira =
        primeiraCampo
            ? converterDataBrasileira(
                primeiraCampo.value
            )
            : null;

    const ultima =
        ultimaCampo
            ? converterDataBrasileira(
                ultimaCampo.value
            )
            : null;

    if (
        possuiDataValida(
            primeira
        )
    ) {
        primeiraDataExtrato =
            primeira;
    }

    if (
        possuiDataValida(
            ultima
        )
    ) {
        ultimaDataExtrato =
            ultima;
    }

    if (
        possuiDataValida(
            primeiraDataExtrato
        ) &&
        possuiDataValida(
            ultimaDataExtrato
        ) &&
        primeiraDataExtrato.getTime() >
        ultimaDataExtrato.getTime()
    ) {
        const auxiliar =
            primeiraDataExtrato;

        primeiraDataExtrato =
            ultimaDataExtrato;

        ultimaDataExtrato =
            auxiliar;

        atualizarExibicaoPeriodo();
    }

    if (
        opcoes.recalcularMesesDetectados !==
        false
    ) {
        const meses =
            calcularQuantidadeMesesPeriodo(
                primeiraDataExtrato,
                ultimaDataExtrato
            );

        definirValorCampo(
            "mesesDetectadosMovimentacao",
            meses
        );

        if (
            !opcoes.preservarMesesConsiderados
        ) {
            definirValorCampo(
                "mesesConsideradosMovimentacao",
                meses
            );
        }
    }
}

function restaurarPeriodoAutomatico() {
    primeiraDataExtrato =
        possuiDataValida(
            primeiraDataExtratoAutomatica
        )
            ? new Date(
                primeiraDataExtratoAutomatica.getTime()
            )
            : null;

    ultimaDataExtrato =
        possuiDataValida(
            ultimaDataExtratoAutomatica
        )
            ? new Date(
                ultimaDataExtratoAutomatica.getTime()
            )
            : null;

    atualizarExibicaoPeriodo();

    definirValorCampo(
        "mesesDetectadosMovimentacao",
        mesesDetectadosAutomaticos
    );

    definirValorCampo(
        "mesesConsideradosMovimentacao",
        mesesDetectadosAutomaticos
    );

    liberarCamposEdicaoMovimentacao();
}

function aplicarMascaraDataCampo(
    evento
) {
    const campo =
        evento &&
            evento.target
            ? evento.target
            : null;

    if (!campo) {
        return;
    }

    let numeros =
        String(
            campo.value || ""
        ).replace(
            /\D/g,
            ""
        );

    numeros =
        numeros.substring(
            0,
            8
        );

    if (
        numeros.length <= 2
    ) {
        campo.value =
            numeros;

        return;
    }

    if (
        numeros.length <= 4
    ) {
        campo.value =
            numeros.substring(
                0,
                2
            ) +
            "/" +
            numeros.substring(
                2
            );

        return;
    }

    campo.value =
        numeros.substring(
            0,
            2
        ) +
        "/" +
        numeros.substring(
            2,
            4
        ) +
        "/" +
        numeros.substring(
            4
        );
}

function normalizarCampoMeses(
    campo,
    limparInvalido
) {
    if (!campo) {
        return;
    }

    const texto =
        String(
            campo.value || ""
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
        if (limparInvalido) {
            campo.value = "";
        }

        return;
    }

    campo.value =
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
   DATAS BRASILEIRAS
========================================================= */

function converterDataBrasileira(
    valor
) {
    const match =
        String(
            valor || ""
        )
            .trim()
            .match(
                /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/
            );

    if (!match) {
        return null;
    }

    const dia =
        Number(
            match[1]
        );

    const mes =
        Number(
            match[2]
        );

    let ano =
        Number(
            match[3]
        );

    if (
        match[3].length === 2
    ) {
        ano +=
            ano >= 70
                ? 1900
                : 2000;
    }

    return criarDataValida(
        dia,
        mes,
        ano
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
   LIMPEZA / NORMALIZAÇÃO
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
            /\s+/g,
            " "
        )
        .trim();
}

function limparCelulaValor(
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
            /\\\*/g,
            "*"
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
}

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
   LIMPEZA GERAL
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

    liberarCamposEdicaoMovimentacao();
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

    limparTabela(
        "tabelaResumoMensalMovimentacao",
        3,
        "Nenhum extrato processado."
    );

    limparTabela(
        "tabelaMovimentacoesConsideradas",
        5,
        "Nenhum extrato processado."
    );

    limparTabela(
        "tabelaMovimentacoesExcluidas",
        5,
        "Nenhum extrato processado."
    );

    liberarCamposEdicaoMovimentacao();
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

    if (!elemento) {
        return;
    }

    elemento.value =
        valor === null ||
            valor === undefined
            ? ""
            : valor;

    elemento.disabled = false;
    elemento.readOnly = false;

    elemento.removeAttribute(
        "disabled"
    );

    elemento.removeAttribute(
        "readonly"
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

function limparTabela(
    id,
    colunas,
    mensagem
) {
    const tbody =
        obterTbodyTabela(
            id
        );

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    inserirLinhaSemDados(
        tbody,
        colunas,
        mensagem
    );
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