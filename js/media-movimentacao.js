(function () {
    "use strict";

    /*
     * =========================================================
     * MÉDIA DE MOVIMENTAÇÃO
     * =========================================================
     *
     * Este arquivo é a fonte única de:
     *
     * - interpretação das movimentações;
     * - classificação de crédito/débito;
     * - regras de exclusão;
     * - período;
     * - competências;
     * - total considerado;
     * - média mensal;
     * - alterações manuais;
     * - renderização do resultado.
     *
     * IMPORTANTE:
     *
     * Tanto o modo TEXTO quanto o modo PDF/OCR devem terminar
     * neste arquivo.
     *
     * O OCR pode:
     *
     * 1. enviar texto para:
     *    MediaMovimentacao.processarTexto(...)
     *
     * OU
     *
     * 2. enviar movimentações estruturadas para:
     *    MediaMovimentacao.processarMovimentacoes(...)
     *
     * Assim, não existem duas fórmulas diferentes para média.
     * =========================================================
     */

    let movimentacoesExtrato = [];
    let movimentacoesConsideradas = [];
    let movimentacoesExcluidas = [];

    let historicosIncluidosManualmente = new Set();
    let historicosExcluidosManualmente = new Set();

    let competenciasDocumentadasExternas = [];

    let periodoAutomatico = {
        inicio: null,
        fim: null
    };

    /*
     * =========================================================
     * REGRAS DE EXCLUSÃO
     * =========================================================
     */

    const REGRAS_EXCLUSAO_MOVIMENTACAO = [
        {
            rotulo: "SALDO / LINHA INFORMATIVA",
            testar: h =>
                /^SALDO\b/.test(h) ||
                /^SALDO DO DIA\b/.test(h) ||
                /^SALDO ANTERIOR\b/.test(h) ||
                /^SALDO BLOQUEADO\b/.test(h) ||
                /^SALDO DISPONIVEL\b/.test(h) ||
                /^SALDO EM CONTA\b/.test(h) ||
                /^SALDO FINAL\b/.test(h) ||
                /^SALDO INICIAL\b/.test(h)
        },
        {
            rotulo: "LIMITE / CHEQUE ESPECIAL",
            testar: h =>
                /\bCHEQUE ESPECIAL\b/.test(h) ||
                /\bLIMITE DE CREDITO\b/.test(h) ||
                /\bLIMITE DISPONIVEL\b/.test(h) ||
                /\bCREDITO ROTATIVO\b/.test(h) ||
                /\bADIANTAMENTO A DEPOSITANTE\b/.test(h)
        },
        {
            rotulo: "EMPRÉSTIMO / FINANCIAMENTO",
            testar: h =>
                /\bEMPRESTIMO\b/.test(h) ||
                /\bFINANCIAMENTO\b/.test(h) ||
                /\bCREDITO PESSOAL\b/.test(h) ||
                /\bCREDITO CONSIGNADO\b/.test(h) ||
                /\bCAPITAL DE GIRO\b/.test(h) ||
                /\bLIBERACAO DE CREDITO\b/.test(h) ||
                /\bLIBERACAO DE DINHEIRO\b/.test(h) ||
                /\bDINHEIRO LIBERADO\b/.test(h)
        },
        {
            rotulo: "ESTORNO / DEVOLUÇÃO",
            testar: h =>
                /\bESTORNO\b/.test(h) ||
                /\bREVERSAO\b/.test(h) ||
                /\bCANCELAMENTO\b/.test(h) ||
                /\bDEVOLUCAO\b/.test(h) ||
                /\bDEVOLVIDO\b/.test(h) ||
                /\bREEMBOLSO\b/.test(h)
        },
        {
            rotulo: "INVESTIMENTO",
            testar: h =>
                /\bRDB\b/.test(h) ||
                /\bRDC\b/.test(h) ||
                /\bCDB\b/.test(h) ||
                /\bAPLICACAO\b/.test(h) ||
                /\bRESGATE\b/.test(h) ||
                /\bINVESTIMENTO\b/.test(h) ||
                /\bFUNDO DE INVESTIMENTO\b/.test(h) ||
                /\bREMUNERACAO APLICACAO AUTOMATICA\b/.test(h)
        },
        {
            rotulo: "DÉBITO",
            testar: h =>
                /^DEB\b/.test(h) ||
                /^DEBITO\b/.test(h) ||
                /\bPIX EMITIDO\b/.test(h) ||
                /\bPIX ENVIADO\b/.test(h) ||
                /\bTRANSFERENCIA ENVIADA\b/.test(h) ||
                /\bPAGAMENTO DE BOLETO\b/.test(h) ||
                /\bPAGAMENTO\b/.test(h) ||
                /\bCOMPRA\b/.test(h) ||
                /\bSAQUE\b/.test(h) ||
                /\bTARIFA\b/.test(h) ||
                /\bJUROS\b/.test(h) ||
                /\bIOF\b/.test(h)
        }
    ];

    /*
     * Créditos reconhecíveis mesmo quando o extrato não possui
     * indicador C/D.
     */
    const REGRAS_CREDITO_SEM_INDICADOR = [
        /\bPIX RECEBIDO\b/,
        /\bPIX RECEBIDA\b/,
        /\bPIX CREDITO\b/,
        /\bPIX CRED\b/,
        /\bTRANSF RECEBIDA\b/,
        /\bTRANSF\. RECEBIDA\b/,
        /\bTRANSF\.RECEBIDA\b/,
        /\bTRANSFERENCIA RECEBIDA\b/,
        /\bTED RECEBIDA\b/,
        /\bTED RECEBIDO\b/,
        /\bDOC RECEBIDO\b/,
        /\bDOC RECEBIDA\b/,
        /\bDEPOSITO\b/,
        /\bRECEBIMENTO\b/,
        /\bSALARIO\b/,
        /\bPROVENTO\b/,
        /\bPAGAMENTO RECEBIDO\b/,
        /\bDINHEIRO RECEBIDO\b/,
        /\bENTRADA DE DINHEIRO\b/,
        /\bCREDITO RECEBIDO\b/,
        /\bCREDITO EM CONTA\b/,
        /\bCREDITO PIX\b/,
        /\bCR ANTECIPACAO\b/
    ];

    /*
     * =========================================================
     * INICIALIZAÇÃO
     * =========================================================
     */

    document.addEventListener(
        "DOMContentLoaded",
        iniciarMediaMovimentacao
    );

    function iniciarMediaMovimentacao() {
        const btnProcessar =
            document.getElementById("btnProcessarMovimentacao");

        const btnLimpar =
            document.getElementById("btnLimparMovimentacao");

        const btnRecalcular =
            document.getElementById("btnRecalcularMovimentacao");

        const btnRestaurar =
            document.getElementById("btnRestaurarPeriodoMovimentacao");

        const campoInicio =
            document.getElementById("dataInicioMovimentacao");

        const campoFim =
            document.getElementById("dataFimMovimentacao");

        if (btnProcessar) {
            btnProcessar.addEventListener(
                "click",
                function () {
                    const campo =
                        document.getElementById(
                            "textoExtratoMovimentacao"
                        );

                    processarTexto(
                        campo
                            ? campo.value
                            : ""
                    );
                }
            );
        }

        if (btnLimpar) {
            btnLimpar.addEventListener(
                "click",
                limparTudo
            );
        }

        if (btnRecalcular) {
            btnRecalcular.addEventListener(
                "click",
                recalcular
            );
        }

        if (btnRestaurar) {
            btnRestaurar.addEventListener(
                "click",
                restaurarPeriodoAutomatico
            );
        }

        if (campoInicio) {
            campoInicio.addEventListener(
                "change",
                recalcular
            );
        }

        if (campoFim) {
            campoFim.addEventListener(
                "change",
                recalcular
            );
        }
    }

    /*
     * =========================================================
     * ENTRADA POR TEXTO
     * =========================================================
     */

    function processarTexto(texto, opcoes) {
        opcoes = opcoes || {};

        competenciasDocumentadasExternas =
            normalizarCompetencias(
                opcoes.competenciasDocumentadas || []
            );

        historicosIncluidosManualmente =
            new Set();

        historicosExcluidosManualmente =
            new Set();

        movimentacoesExtrato =
            interpretarTextoExtrato(
                texto
            );

        finalizarProcessamento();

        return criarRetornoProcessamento();
    }

    /*
     * =========================================================
     * ENTRADA ESTRUTURADA
     * =========================================================
     *
     * Esta função será usada pelo OCR.
     *
     * O OCR não precisa transformar novamente as movimentações
     * em texto para depois este arquivo interpretar novamente.
     *
     * Isso elimina uma das principais fontes de divergência.
     * =========================================================
     */

    function processarMovimentacoes(movimentacoes, opcoes) {
        opcoes = opcoes || {};

        competenciasDocumentadasExternas =
            normalizarCompetencias(
                opcoes.competenciasDocumentadas || []
            );

        historicosIncluidosManualmente =
            new Set();

        historicosExcluidosManualmente =
            new Set();

        movimentacoesExtrato =
            normalizarMovimentacoesRecebidas(
                movimentacoes
            );

        finalizarProcessamento();

        return criarRetornoProcessamento();
    }

    function finalizarProcessamento() {
        calcularPeriodoAutomatico();

        preencherPeriodoAutomatico();

        classificarMovimentacoes();

        renderizarTudo();
    }

    function criarRetornoProcessamento() {
        const resultado =
            calcularResultado();

        return {
            movimentacoes:
                movimentacoesExtrato.slice(),

            consideradas:
                movimentacoesConsideradas.slice(),

            excluidas:
                movimentacoesExcluidas.slice(),

            resultado
        };
    }

    /*
     * =========================================================
     * NORMALIZAÇÃO DE MOVIMENTAÇÕES RECEBIDAS DO OCR
     * =========================================================
     */

    function normalizarMovimentacoesRecebidas(movimentacoes) {
        const resultado = [];

        (
            Array.isArray(movimentacoes)
                ? movimentacoes
                : []
        ).forEach(
            function (item, indice) {
                if (!item) {
                    return;
                }

                const data =
                    normalizarDataMovimentacao(
                        item.data ||
                        item.dataTexto ||
                        item.date
                    );

                if (!data) {
                    return;
                }

                const valor =
                    normalizarValorMovimentacao(
                        item.valor
                    );

                if (
                    !Number.isFinite(valor)
                ) {
                    return;
                }

                const historico =
                    limparEspacos(
                        item.historico ||
                        item.descricao ||
                        item.description ||
                        ""
                    );

                const detalhes =
                    Array.isArray(item.detalhes)
                        ? item.detalhes
                            .map(limparEspacos)
                            .filter(Boolean)
                        : [];

                let historicoCompleto =
                    limparEspacos(
                        item.historicoCompleto ||
                        [
                            historico,
                            ...detalhes
                        ].join(" ")
                    );

                let indicador =
                    normalizarIndicador(
                        item.indicador ||
                        item.natureza ||
                        item.tipo
                    );

                /*
                 * Compatibilidade com objetos OCR que usam:
                 *
                 * natureza = CREDITO
                 * natureza = DEBITO
                 */
                if (
                    !indicador &&
                    normalizar(item.natureza) ===
                    "CREDITO"
                ) {
                    indicador = "C";
                }

                if (
                    !indicador &&
                    normalizar(item.natureza) ===
                    "DEBITO"
                ) {
                    indicador = "D";
                }

                /*
                 * Se o OCR já trouxe decisão manual do usuário,
                 * guardamos a informação como metadado.
                 *
                 * Porém, a decisão NÃO pode transformar débito
                 * em crédito.
                 */
                const decisao =
                    obterDecisaoRecebida(
                        item
                    );

                if (
                    decisao &&
                    !/\[DECISAO:/i.test(
                        historicoCompleto
                    )
                ) {
                    historicoCompleto =
                        limparEspacos(
                            historicoCompleto +
                            " [DECISAO:" +
                            decisao +
                            "]"
                        );
                }

                resultado.push({
                    id:
                        item.id ||
                        [
                            "OCR",
                            indice,
                            data
                        ].join("|"),

                    origem:
                        item.origem ||
                        "ocr",

                    indiceLinha:
                        Number.isFinite(
                            Number(item.indiceLinha)
                        )
                            ? Number(item.indiceLinha)
                            : indice,

                    ordem:
                        Number.isFinite(
                            Number(item.ordem)
                        )
                            ? Number(item.ordem)
                            : indice + 1,

                    data,

                    documento:
                        limparEspacos(
                            item.documento || ""
                        ),

                    historico,

                    historicoCompleto,

                    historicoNormalizado:
                        normalizar(
                            historico
                        ),

                    detalhes,

                    valor:
                        Math.abs(valor),

                    indicador,

                    considerado:
                        false,

                    motivo:
                        ""
                });
            }
        );

        return resultado;
    }

    function obterDecisaoRecebida(item) {
        if (!item) {
            return "";
        }

        const decisaoDireta =
            normalizar(
                item.decisao || ""
            );

        if (
            decisaoDireta === "INCLUIR" ||
            decisaoDireta === "EXCLUIR"
        ) {
            return decisaoDireta;
        }

        if (
            item.considerar === true ||
            item.considerado === true
        ) {
            return "INCLUIR";
        }

        if (
            item.considerar === false ||
            item.considerado === false
        ) {
            return "EXCLUIR";
        }

        return "";
    }

    function normalizarValorMovimentacao(valor) {
        if (
            typeof valor === "number"
        ) {
            return Math.abs(valor);
        }

        return Math.abs(
            converterMoeda(valor)
        );
    }

    function normalizarIndicador(valor) {
        const n =
            normalizar(
                valor
            );

        if (
            n === "C" ||
            n === "CREDITO" ||
            n === "CR"
        ) {
            return "C";
        }

        if (
            n === "D" ||
            n === "DEBITO" ||
            n === "DB"
        ) {
            return "D";
        }

        if (
            n === "*"
        ) {
            return "*";
        }

        return "";
    }

    function normalizarDataMovimentacao(valor) {
        const texto =
            String(
                valor || ""
            ).trim();

        let data =
            parseDataBR(texto);

        if (data) {
            return formatarDataInterna(
                data
            );
        }

        data =
            parseDataISO(texto);

        if (data) {
            return formatarDataInterna(
                data
            );
        }

        const match =
            texto.match(
                /^(\d{1,2})[.-](\d{1,2})[.-](\d{4})$/
            );

        if (match) {
            data =
                criarData(
                    Number(match[1]),
                    Number(match[2]),
                    Number(match[3])
                );

            if (data) {
                return formatarDataInterna(
                    data
                );
            }
        }

        return "";
    }

    /*
     * =========================================================
     * PARSER DO TEXTO
     * =========================================================
     */

    function interpretarTextoExtrato(texto) {
        const linhas =
            String(
                texto || ""
            )
                .replace(/\r/g, "")
                .split("\n");

        const resultado = [];

        let movimentoAtual = null;
        let sequencial = 0;

        linhas.forEach(
            function (
                linhaOriginal,
                indiceLinha
            ) {
                const linha =
                    String(
                        linhaOriginal || ""
                    )
                        .replace(
                            /\u00a0/g,
                            " "
                        )
                        .trim();

                if (!linha) {
                    return;
                }

                const movimento =
                    interpretarLinhaPrincipal(
                        linha,
                        indiceLinha,
                        sequencial
                    );

                if (movimento) {
                    sequencial++;

                    movimento.ordem =
                        sequencial;

                    resultado.push(
                        movimento
                    );

                    movimentoAtual =
                        movimento;

                    return;
                }

                /*
                 * Linhas complementares pertencem ao lançamento
                 * anterior, por exemplo:
                 *
                 * REM.:
                 * Transferência Pix
                 * Nome do remetente
                 * CPF/CNPJ
                 */
                if (
                    movimentoAtual &&
                    ehLinhaComplementar(
                        linha
                    )
                ) {
                    movimentoAtual
                        .detalhes
                        .push(
                            limparEspacos(
                                linha
                            )
                        );

                    movimentoAtual.historicoCompleto =
                        [
                            movimentoAtual.historico,
                            ...movimentoAtual.detalhes
                        ]
                            .join(" ")
                            .replace(
                                /\s+/g,
                                " "
                            )
                            .trim();
                }
            }
        );

        /*
         * IMPORTANTE:
         *
         * NÃO remover duplicados por:
         *
         * data + histórico + valor.
         *
         * Dois créditos legítimos podem possuir exatamente
         * mesma data, histórico e valor.
         */

        return resultado;
    }

    function interpretarLinhaPrincipal(
        linha,
        indiceLinha,
        sequencial
    ) {
        const dataInfo =
            extrairDataInicioLinha(
                linha
            );

        if (!dataInfo) {
            return null;
        }

        let restante =
            linha
                .slice(
                    dataInfo.fim
                )
                .trim();

        const valorInfo =
            extrairValorFinalLinha(
                restante
            );

        if (!valorInfo) {
            return null;
        }

        restante =
            restante
                .slice(
                    0,
                    valorInfo.indice
                )
                .trim();

        const campos =
            separarCamposLinha(
                restante
            );

        let documento = "";
        let historico = "";

        if (
            campos.length >= 2
        ) {
            /*
             * Em extratos bancários o primeiro campo costuma
             * representar documento/referência.
             */
            documento =
                campos[0];

            historico =
                campos
                    .slice(1)
                    .join(" ");
        } else {
            const partes =
                restante
                    .split(/\s{2,}/)
                    .map(limparEspacos)
                    .filter(Boolean);

            if (
                partes.length >= 2
            ) {
                documento =
                    partes[0];

                historico =
                    partes
                        .slice(1)
                        .join(" ");
            } else {
                /*
                 * Caso não exista separação confiável,
                 * preservamos todo o conteúdo como histórico.
                 */
                historico =
                    restante;
            }
        }

        documento =
            limparEspacos(
                documento
            );

        historico =
            limparEspacos(
                historico
            );

        /*
         * Evita interpretar linhas de resumo como movimentação.
         */
        if (
            ehHistoricoInformativo(
                historico
            )
        ) {
            return {
                id:
                    [
                        "TXT",
                        indiceLinha,
                        sequencial,
                        dataInfo.dataTexto
                    ].join("|"),

                origem:
                    "texto",

                indiceLinha,

                ordem:
                    sequencial,

                data:
                    dataInfo.dataTexto,

                documento,

                historico,

                historicoCompleto:
                    historico,

                historicoNormalizado:
                    normalizar(
                        historico
                    ),

                detalhes: [],

                valor:
                    valorInfo.valor,

                indicador:
                    valorInfo.indicador,

                considerado:
                    false,

                motivo:
                    "Linha informativa"
            };
        }

        return {
            id:
                [
                    "TXT",
                    indiceLinha,
                    sequencial,
                    dataInfo.dataTexto
                ].join("|"),

            origem:
                "texto",

            indiceLinha,

            ordem:
                sequencial,

            data:
                dataInfo.dataTexto,

            documento,

            historico,

            historicoCompleto:
                historico,

            historicoNormalizado:
                normalizar(
                    historico
                ),

            detalhes: [],

            valor:
                valorInfo.valor,

            indicador:
                valorInfo.indicador,

            considerado:
                false,

            motivo:
                ""
        };
    }

    function separarCamposLinha(texto) {
        const tabs =
            String(
                texto || ""
            )
                .split(/\t+/)
                .map(limparEspacos)
                .filter(Boolean);

        if (
            tabs.length >= 2
        ) {
            return tabs;
        }

        return String(
            texto || ""
        )
            .split(/\s{2,}/)
            .map(limparEspacos)
            .filter(Boolean);
    }

    function extrairDataInicioLinha(linha) {
        const match =
            String(
                linha || ""
            ).match(
                /^\s*(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})\b/
            );

        if (!match) {
            return null;
        }

        const dia =
            Number(match[1]);

        const mes =
            Number(match[2]);

        const ano =
            Number(match[3]);

        const data =
            criarData(
                dia,
                mes,
                ano
            );

        if (!data) {
            return null;
        }

        return {
            data,

            dataTexto:
                formatarDataInterna(
                    data
                ),

            fim:
                match[0].length
        };
    }

    function extrairValorFinalLinha(texto) {
        const valor =
            String(
                texto || ""
            );

        /*
         * Exemplos suportados:
         *
         * 10.000,00C
         * 10.000,00 C
         * 211,29D
         * 211,29 D
         * 0,00*
         * R$ 922,49 C
         * 200,00
         */
        const match =
            valor.match(
                /(?:R\$\s*)?(-?\s*(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2})\s*([CD*])?\s*$/i
            );

        if (!match) {
            return null;
        }

        const numero =
            converterMoeda(
                match[1]
            );

        if (
            !Number.isFinite(numero)
        ) {
            return null;
        }

        return {
            valor:
                Math.abs(numero),

            indicador:
                String(
                    match[2] || ""
                )
                    .trim()
                    .toUpperCase(),

            indice:
                match.index
        };
    }

    function ehLinhaComplementar(linha) {
        const n =
            normalizar(
                linha
            );

        if (!n) {
            return false;
        }

        /*
         * Cabeçalhos e rodapés nunca podem ser anexados ao
         * histórico da movimentação anterior.
         */
        if (
            /^SICOOB$/.test(n) ||
            n.includes(
                "SISTEMA DE COOPERATIVAS"
            ) ||
            n.includes(
                "SISBR"
            ) ||
            n.startsWith(
                "COOP.:"
            ) ||
            n.startsWith(
                "CONTA:"
            ) ||
            n.startsWith(
                "DATA DOCUMENTO"
            ) ||
            n === "RESUMO" ||
            n.startsWith(
                "ENCARGOS"
            ) ||
            n.startsWith(
                "OUTRAS INFORMACOES"
            ) ||
            n.startsWith(
                "SAC:"
            ) ||
            n.startsWith(
                "OUVIDORIA"
            ) ||
            n.startsWith(
                "EXTRATO CONTA"
            )
        ) {
            return false;
        }

        /*
         * Uma linha iniciada por data é potencialmente outro
         * lançamento e não complemento.
         */
        if (
            /^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4}\b/.test(
                n
            )
        ) {
            return false;
        }

        return true;
    }

    /*
     * =========================================================
     * CLASSIFICAÇÃO
     * =========================================================
     */

    function classificarMovimentacoes() {
        movimentacoesConsideradas = [];
        movimentacoesExcluidas = [];

        movimentacoesExtrato.forEach(
            function (movimentacao) {
                movimentacao.historicoNormalizado =
                    normalizar(
                        movimentacao.historico
                    );

                movimentacao.historicoCompleto =
                    limparEspacos(
                        movimentacao.historicoCompleto ||
                        movimentacao.historico
                    );

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

    function classificarMovimentacao(movimentacao) {
        const historico =
            normalizar(
                movimentacao.historico
            );

        const historicoCompleto =
            normalizar(
                movimentacao.historicoCompleto ||
                movimentacao.historico
            );

        /*
         * =====================================================
         * 1. LINHAS INFORMATIVAS
         * =====================================================
         */

        if (
            ehHistoricoInformativo(
                historicoCompleto
            )
        ) {
            return {
                considerado: false,
                motivo: "Linha informativa"
            };
        }

        /*
         * =====================================================
         * 2. NATUREZA EXPLÍCITA DO LANÇAMENTO
         * =====================================================
         *
         * Débito sempre prevalece sobre decisão OCR.
         *
         * Isso impede um OCR que marcou considerar=true de
         * transformar um débito real em crédito.
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
                motivo: "Valor bloqueado/informativo"
            };
        }

        /*
         * =====================================================
         * 3. EXCLUSÃO MANUAL
         * =====================================================
         */

        if (
            historicosExcluidosManualmente.has(
                historico
            )
        ) {
            return {
                considerado: false,
                motivo: "Histórico excluído manualmente"
            };
        }

        const inclusaoManual =
            historicosIncluidosManualmente.has(
                historico
            );

        /*
         * =====================================================
         * 4. REGRAS AUTOMÁTICAS
         * =====================================================
         */

        const regraExclusao =
            localizarRegraExclusao(
                historicoCompleto
            );

        if (
            regraExclusao &&
            !inclusaoManual
        ) {
            return {
                considerado: false,
                motivo: regraExclusao.rotulo
            };
        }

        /*
         * =====================================================
         * 5. CRÉDITO EXPLÍCITO
         * =====================================================
         *
         * Indicador C é a evidência mais forte.
         */

        if (
            movimentacao.indicador === "C"
        ) {
            return {
                considerado: true,
                motivo: "Crédito identificado pelo indicador C"
            };
        }

        /*
         * =====================================================
         * 6. INCLUSÃO MANUAL
         * =====================================================
         */

        if (
            inclusaoManual
        ) {
            return {
                considerado: true,
                motivo: "Histórico incluído manualmente"
            };
        }

        /*
         * =====================================================
         * 7. DECISÃO DO OCR
         * =====================================================
         *
         * Só é utilizada quando não existe indicador C/D
         * confiável e nenhuma regra automática prevaleceu.
         */

        const decisao =
            extrairMeta(
                movimentacao.historicoCompleto,
                "DECISAO"
            ) ||
            extrairMeta(
                movimentacao.historico,
                "DECISAO"
            );

        if (
            decisao === "EXCLUIR"
        ) {
            return {
                considerado: false,
                motivo: "Exclusão definida na revisão do extrato"
            };
        }

        if (
            decisao === "INCLUIR"
        ) {
            return {
                considerado: true,
                motivo: "Crédito confirmado na revisão do extrato"
            };
        }

        /*
         * =====================================================
         * 8. CRÉDITO IDENTIFICADO PELO HISTÓRICO
         * =====================================================
         */

        if (
            identificarCreditoSemIndicador(
                historicoCompleto
            )
        ) {
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

    function localizarRegraExclusao(historico) {
        const h =
            normalizar(
                historico
            );

        for (
            const regra
            of REGRAS_EXCLUSAO_MOVIMENTACAO
        ) {
            if (
                regra.testar(h)
            ) {
                return regra;
            }
        }

        return null;
    }

    function identificarCreditoSemIndicador(historico) {
        const h =
            normalizar(
                historico
            );

        return REGRAS_CREDITO_SEM_INDICADOR.some(
            regex =>
                regex.test(h)
        );
    }

    function ehHistoricoInformativo(historico) {
        const h =
            normalizar(
                historico
            );

        return (
            /^SALDO\b/.test(h) ||
            /^TOTAL\b/.test(h) ||
            /^RESUMO\b/.test(h) ||
            /^LIMITE\b/.test(h) ||
            /^CHEQUE ESPECIAL CONTRATADO\b/.test(h) ||
            /^SALDO DISPONIVEL\b/.test(h) ||
            /^SALDO BLOQUEADO\b/.test(h) ||
            /^SALDO EM CONTA\b/.test(h) ||
            /^SALDO EM CONTA CAPITAL\b/.test(h) ||
            /^PREVISAO\b/.test(h) ||
            /^TAXA\b/.test(h) ||
            /^CUSTO EFETIVO TOTAL\b/.test(h)
        );
    }

    /*
     * =========================================================
     * PERÍODO
     * =========================================================
     */

    function calcularPeriodoAutomatico() {
        const datas =
            movimentacoesExtrato
                .filter(
                    m =>
                        !ehLinhaInformativa(m)
                )
                .map(
                    m =>
                        parseDataBR(
                            m.data
                        )
                )
                .filter(Boolean);

        if (!datas.length) {
            periodoAutomatico = {
                inicio: null,
                fim: null
            };

            return;
        }

        periodoAutomatico = {
            inicio:
                new Date(
                    Math.min(
                        ...datas.map(
                            d => d.getTime()
                        )
                    )
                ),

            fim:
                new Date(
                    Math.max(
                        ...datas.map(
                            d => d.getTime()
                        )
                    )
                )
        };
    }

    function preencherPeriodoAutomatico() {
        const inicio =
            obterPrimeiroElemento([
                "dataInicioMovimentacao"
            ]);

        const fim =
            obterPrimeiroElemento([
                "dataFimMovimentacao"
            ]);

        if (
            inicio &&
            periodoAutomatico.inicio
        ) {
            inicio.value =
                formatarDataInput(
                    periodoAutomatico.inicio
                );
        }

        if (
            fim &&
            periodoAutomatico.fim
        ) {
            fim.value =
                formatarDataInput(
                    periodoAutomatico.fim
                );
        }

        atualizarInformacoesPeriodo();
    }

    function restaurarPeriodoAutomatico() {
        preencherPeriodoAutomatico();
        recalcular();
    }

    function obterPeriodoAtual() {
        const campoInicio =
            document.getElementById(
                "dataInicioMovimentacao"
            );

        const campoFim =
            document.getElementById(
                "dataFimMovimentacao"
            );

        const inicio =
            campoInicio &&
                campoInicio.value
                ? parseDataISO(
                    campoInicio.value
                )
                : periodoAutomatico.inicio;

        const fim =
            campoFim &&
                campoFim.value
                ? parseDataISO(
                    campoFim.value
                )
                : periodoAutomatico.fim;

        /*
         * Caso os campos de data não existam no HTML,
         * utiliza o período automático normalmente.
         */

        return {
            inicio:
                inicio ||
                periodoAutomatico.inicio,

            fim:
                fim ||
                periodoAutomatico.fim
        };
    }

    function atualizarInformacoesPeriodo() {
        const periodo =
            obterPeriodoAtual();

        setTextoMultiplos(
            [
                "primeiraDataMovimentacao",
                "resultadoPrimeiraMovimentacao"
            ],
            periodo.inicio
                ? formatarDataBR(
                    periodo.inicio
                )
                : "-"
        );

        setTextoMultiplos(
            [
                "ultimaDataMovimentacao",
                "resultadoUltimaMovimentacao"
            ],
            periodo.fim
                ? formatarDataBR(
                    periodo.fim
                )
                : "-"
        );

        const competencias =
            obterCompetenciasApuracao(
                periodo
            );

        setTextoMultiplos(
            [
                "mesesDetectadosMovimentacao",
                "resultadoMesesDetectados"
            ],
            String(
                competencias.length
            )
        );

        setTexto(
            "mesesConsideradosMovimentacao",
            String(
                competencias.length
            )
        );
    }

    /*
     * =========================================================
     * CÁLCULO
     * =========================================================
     */

    function recalcular() {
        classificarMovimentacoes();
        renderizarTudo();

        return calcularResultado();
    }

    function calcularResultado() {
        const periodo =
            obterPeriodoAtual();

        const consideradasPeriodo =
            movimentacoesConsideradas.filter(
                m =>
                    movimentoDentroPeriodo(
                        m,
                        periodo
                    )
            );

        const excluidasPeriodo =
            movimentacoesExcluidas.filter(
                m =>
                    movimentoDentroPeriodo(
                        m,
                        periodo
                    )
            );

        /*
         * Soma em centavos.
         *
         * Evita pequenas diferenças de ponto flutuante em
         * centenas ou milhares de lançamentos.
         */
        const totalCentavos =
            consideradasPeriodo.reduce(
                function (soma, m) {
                    return (
                        soma +
                        valorParaCentavos(
                            m.valor
                        )
                    );
                },
                0
            );

        const total =
            totalCentavos / 100;

        const competencias =
            obterCompetenciasApuracao(
                periodo
            );

        const meses =
            competencias.length;

        const mediaCentavos =
            meses > 0
                ? Math.round(
                    totalCentavos /
                    meses
                )
                : 0;

        const media =
            mediaCentavos / 100;

        return {
            periodo,

            consideradasPeriodo,

            excluidasPeriodo,

            total,

            totalCentavos,

            competencias,

            meses,

            media,

            mediaCentavos
        };
    }

    function valorParaCentavos(valor) {
        const numero =
            Number(
                valor || 0
            );

        if (
            !Number.isFinite(numero)
        ) {
            return 0;
        }

        return Math.round(
            numero * 100
        );
    }

    function obterCompetenciasApuracao(periodo) {
        const set =
            new Set();

        /*
         * Competências documentadas pelo OCR.
         *
         * Isso é importante quando existe mês no extrato sem
         * nenhum crédito válido.
         */
        competenciasDocumentadasExternas.forEach(
            function (competencia) {
                if (
                    competenciaDentroPeriodo(
                        competencia,
                        periodo
                    )
                ) {
                    set.add(
                        competencia
                    );
                }
            }
        );

        /*
         * Também considera todas as competências existentes
         * nas movimentações do extrato, inclusive meses sem
         * crédito considerado.
         *
         * Isso evita calcular média somente sobre os meses que
         * tiveram entrada.
         */
        movimentacoesExtrato.forEach(
            function (m) {
                const data =
                    parseDataBR(
                        m.data
                    );

                if (
                    !data ||
                    !dataDentroPeriodo(
                        data,
                        periodo
                    )
                ) {
                    return;
                }

                if (
                    ehLinhaInformativa(m)
                ) {
                    return;
                }

                set.add(
                    obterCompetenciaData(
                        data
                    )
                );
            }
        );

        return Array.from(set)
            .sort();
    }

    function movimentoDentroPeriodo(
        movimento,
        periodo
    ) {
        const data =
            parseDataBR(
                movimento.data
            );

        if (!data) {
            return false;
        }

        return dataDentroPeriodo(
            data,
            periodo
        );
    }

    function dataDentroPeriodo(
        data,
        periodo
    ) {
        if (
            periodo.inicio &&
            data <
            inicioDoDia(
                periodo.inicio
            )
        ) {
            return false;
        }

        if (
            periodo.fim &&
            data >
            fimDoDia(
                periodo.fim
            )
        ) {
            return false;
        }

        return true;
    }

    function competenciaDentroPeriodo(
        competencia,
        periodo
    ) {
        const match =
            String(
                competencia || ""
            ).match(
                /^(\d{4})-(\d{2})$/
            );

        if (!match) {
            return false;
        }

        const ano =
            Number(match[1]);

        const mes =
            Number(match[2]);

        const inicioMes =
            new Date(
                ano,
                mes - 1,
                1,
                12
            );

        const fimMes =
            new Date(
                ano,
                mes,
                0,
                12
            );

        if (
            periodo.inicio &&
            fimMes <
            inicioDoDia(
                periodo.inicio
            )
        ) {
            return false;
        }

        if (
            periodo.fim &&
            inicioMes >
            fimDoDia(
                periodo.fim
            )
        ) {
            return false;
        }

        return true;
    }

    /*
     * =========================================================
     * RENDERIZAÇÃO GERAL
     * =========================================================
     */

    function renderizarTudo() {
        atualizarInformacoesPeriodo();

        const resultado =
            calcularResultado();

        renderizarResultado(
            resultado
        );

        renderizarHistoricos(
            resultado
        );

        renderizarResumoMensal(
            resultado
        );

        renderizarMovimentacoesConsideradas(
            resultado
        );

        renderizarMovimentacoesExcluidas(
            resultado
        );

        mostrarCardsResultado();
    }

    function renderizarResultado(resultado) {
        setTexto(
            "resultadoMediaMovimentacao",
            formatarMoeda(
                resultado.media
            )
        );

        setTexto(
            "resultadoTotalMovimentacao",
            formatarMoeda(
                resultado.total
            )
        );

        setTexto(
            "resultadoMesesMovimentacao",
            String(
                resultado.meses
            )
        );

        setTexto(
            "resultadoQtdConsiderados",
            String(
                resultado
                    .consideradasPeriodo
                    .length
            )
        );

        setTexto(
            "resultadoQtdExcluidos",
            String(
                resultado
                    .excluidasPeriodo
                    .length
            )
        );

        setTexto(
            "mesesConsideradosMovimentacao",
            String(
                resultado.meses
            )
        );
    }

    /*
     * =========================================================
     * HISTÓRICOS / REGRAS MANUAIS
     * =========================================================
     */

    function renderizarHistoricos(resultado) {
        const lista =
            document.getElementById(
                "listaRegrasMovimentacao"
            );

        const resumo =
            document.getElementById(
                "resumoRegrasMovimentacao"
            );

        if (!lista) {
            return;
        }

        const agrupados =
            new Map();

        movimentacoesExtrato.forEach(
            function (movimentacao) {
                const chave =
                    normalizar(
                        movimentacao.historico
                    );

                if (!chave) {
                    return;
                }

                if (
                    !agrupados.has(chave)
                ) {
                    agrupados.set(
                        chave,
                        {
                            historico:
                                movimentacao.historico,

                            chave,

                            quantidade: 0,

                            totalCentavos: 0,

                            automaticamenteExcluido:
                                false,

                            motivoAutomatico:
                                ""
                        }
                    );
                }

                const item =
                    agrupados.get(
                        chave
                    );

                item.quantidade++;

                item.totalCentavos +=
                    valorParaCentavos(
                        movimentacao.valor
                    );

                const regra =
                    localizarRegraExclusao(
                        movimentacao.historicoCompleto ||
                        chave
                    );

                if (regra) {
                    item.automaticamenteExcluido =
                        true;

                    item.motivoAutomatico =
                        regra.rotulo;
                }
            }
        );

        const itens =
            Array.from(
                agrupados.values()
            )
                .sort(
                    function (a, b) {
                        return a.historico
                            .localeCompare(
                                b.historico,
                                "pt-BR"
                            );
                    }
                );

        if (resumo) {
            resumo.textContent =
                itens.length +
                " histórico(s) diferente(s) identificado(s). " +
                "Marque para desconsiderar.";
        }

        if (!itens.length) {
            lista.innerHTML =
                '<div class="sem-dados">Nenhum histórico identificado.</div>';

            return;
        }

        lista.innerHTML =
            itens
                .map(
                    function (
                        item,
                        indice
                    ) {
                        const excluidoManual =
                            historicosExcluidosManualmente
                                .has(
                                    item.chave
                                );

                        const incluidoManual =
                            historicosIncluidosManualmente
                                .has(
                                    item.chave
                                );

                        const automaticamente =
                            item.automaticamenteExcluido;

                        const marcado =
                            excluidoManual ||
                            (
                                automaticamente &&
                                !incluidoManual
                            );

                        const classe =
                            marcado
                                ? " regra-excluida"
                                : "";

                        let descricao =
                            item.quantidade +
                            " lançamento(s) · " +
                            formatarMoeda(
                                item.totalCentavos /
                                100
                            );

                        if (
                            automaticamente
                        ) {
                            descricao +=
                                " · Exclusão automática: " +
                                item.motivoAutomatico;
                        }

                        if (
                            incluidoManual
                        ) {
                            descricao +=
                                " · Incluído manualmente";
                        }

                        return `
                            <label class="regra-movimentacao-item${classe}">
                                <input
                                    type="checkbox"
                                    class="check-regra-movimentacao"
                                    data-indice="${indice}"
                                    ${marcado ? "checked" : ""}
                                >
                                <span class="regra-movimentacao-texto">
                                    <strong>${escaparHTML(item.historico)}</strong>
                                    <small>${escaparHTML(descricao)}</small>
                                </span>
                            </label>
                        `;
                    }
                )
                .join("");

        lista
            .querySelectorAll(
                ".check-regra-movimentacao"
            )
            .forEach(
                function (checkbox) {
                    checkbox.addEventListener(
                        "change",
                        function () {
                            const indice =
                                Number(
                                    checkbox.dataset.indice
                                );

                            const item =
                                itens[indice];

                            if (!item) {
                                return;
                            }

                            if (
                                item.automaticamenteExcluido
                            ) {
                                if (
                                    checkbox.checked
                                ) {
                                    historicosIncluidosManualmente
                                        .delete(
                                            item.chave
                                        );

                                    historicosExcluidosManualmente
                                        .add(
                                            item.chave
                                        );
                                } else {
                                    historicosExcluidosManualmente
                                        .delete(
                                            item.chave
                                        );

                                    historicosIncluidosManualmente
                                        .add(
                                            item.chave
                                        );
                                }
                            } else {
                                if (
                                    checkbox.checked
                                ) {
                                    historicosExcluidosManualmente
                                        .add(
                                            item.chave
                                        );

                                    historicosIncluidosManualmente
                                        .delete(
                                            item.chave
                                        );
                                } else {
                                    historicosExcluidosManualmente
                                        .delete(
                                            item.chave
                                        );
                                }
                            }

                            classificarMovimentacoes();
                            renderizarTudo();
                        }
                    );
                }
            );
    }

    /*
     * =========================================================
     * RESUMO MENSAL
     * =========================================================
     */

    function renderizarResumoMensal(resultado) {
        const tabela =
            obterPrimeiroElemento([
                "tabelaResumoMensalMovimentacao",
                "tabelaMovimentacaoMensal"
            ]);

        if (!tabela) {
            return;
        }

        const tbody =
            tabela.querySelector(
                "tbody"
            );

        if (!tbody) {
            return;
        }

        const mapa =
            new Map();

        resultado.competencias.forEach(
            function (competencia) {
                mapa.set(
                    competencia,
                    {
                        quantidade: 0,
                        totalCentavos: 0
                    }
                );
            }
        );

        resultado.consideradasPeriodo.forEach(
            function (movimento) {
                const data =
                    parseDataBR(
                        movimento.data
                    );

                if (!data) {
                    return;
                }

                const competencia =
                    obterCompetenciaData(
                        data
                    );

                if (
                    !mapa.has(
                        competencia
                    )
                ) {
                    mapa.set(
                        competencia,
                        {
                            quantidade: 0,
                            totalCentavos: 0
                        }
                    );
                }

                const item =
                    mapa.get(
                        competencia
                    );

                item.quantidade++;

                item.totalCentavos +=
                    valorParaCentavos(
                        movimento.valor
                    );
            }
        );

        if (!mapa.size) {
            tbody.innerHTML =
                '<tr><td colspan="3" class="sem-dados">Nenhuma competência identificada.</td></tr>';

            return;
        }

        tbody.innerHTML =
            Array.from(
                mapa.entries()
            )
                .sort(
                    function (a, b) {
                        return a[0]
                            .localeCompare(
                                b[0]
                            );
                    }
                )
                .map(
                    function (entrada) {
                        const competencia =
                            entrada[0];

                        const dados =
                            entrada[1];

                        return `
                            <tr>
                                <td>${escaparHTML(formatarCompetencia(competencia))}</td>
                                <td>${dados.quantidade}</td>
                                <td>${formatarMoeda(dados.totalCentavos / 100)}</td>
                            </tr>
                        `;
                    }
                )
                .join("");
    }

    /*
     * =========================================================
     * TABELA DE CRÉDITOS CONSIDERADOS
     * =========================================================
     */

    function renderizarMovimentacoesConsideradas(resultado) {
        const tabela =
            document.getElementById(
                "tabelaMovimentacoesConsideradas"
            );

        const card =
            document.getElementById(
                "cardCreditosConsideradosMovimentacao"
            );

        if (card) {
            card.hidden = false;
        }

        if (!tabela) {
            return;
        }

        const tbody =
            tabela.querySelector(
                "tbody"
            );

        if (!tbody) {
            return;
        }

        const movimentos =
            resultado
                .consideradasPeriodo
                .slice()
                .sort(
                    ordenarMovimentacoes
                );

        if (!movimentos.length) {
            tbody.innerHTML =
                '<tr><td colspan="5" class="sem-dados">Nenhum crédito considerado.</td></tr>';

            return;
        }

        tbody.innerHTML =
            movimentos
                .map(
                    function (m) {
                        return `
                            <tr>
                                <td>${escaparHTML(m.data)}</td>
                                <td>${escaparHTML(m.documento || "-")}</td>
                                <td>${escaparHTML(m.historico || "-")}</td>
                                <td>${formatarMoeda(m.valor)}</td>
                                <td>${escaparHTML(m.motivo || "Considerado")}</td>
                            </tr>
                        `;
                    }
                )
                .join("");
    }

    /*
     * =========================================================
     * TABELA DE MOVIMENTAÇÕES EXCLUÍDAS
     * =========================================================
     */

    function renderizarMovimentacoesExcluidas(resultado) {
        const tabela =
            document.getElementById(
                "tabelaMovimentacoesExcluidas"
            );

        const card =
            document.getElementById(
                "cardMovimentacoesExcluidas"
            );

        if (card) {
            card.hidden = false;
        }

        if (!tabela) {
            return;
        }

        const tbody =
            tabela.querySelector(
                "tbody"
            );

        if (!tbody) {
            return;
        }

        const movimentos =
            resultado
                .excluidasPeriodo
                .slice()
                .sort(
                    ordenarMovimentacoes
                );

        if (!movimentos.length) {
            tbody.innerHTML =
                '<tr><td colspan="5" class="sem-dados">Nenhuma movimentação excluída.</td></tr>';

            return;
        }

        tbody.innerHTML =
            movimentos
                .map(
                    function (m) {
                        return `
                            <tr>
                                <td>${escaparHTML(m.data)}</td>
                                <td>${escaparHTML(m.documento || "-")}</td>
                                <td>${escaparHTML(m.historico || "-")}</td>
                                <td>${formatarMoeda(m.valor)}</td>
                                <td>${escaparHTML(m.motivo || "Excluído")}</td>
                            </tr>
                        `;
                    }
                )
                .join("");
    }

    function ordenarMovimentacoes(a, b) {
        const dataA =
            parseDataBR(
                a.data
            );

        const dataB =
            parseDataBR(
                b.data
            );

        const tempoA =
            dataA
                ? dataA.getTime()
                : 0;

        const tempoB =
            dataB
                ? dataB.getTime()
                : 0;

        if (
            tempoA !== tempoB
        ) {
            return tempoA - tempoB;
        }

        return (
            Number(a.ordem || 0) -
            Number(b.ordem || 0)
        );
    }

    function mostrarCardsResultado() {
        [
            "cardPeriodoMovimentacao",
            "cardResultadoMovimentacao",
            "cardHistoricosMovimentacao",
            "cardResumoMensalMovimentacao",
            "cardCreditosConsideradosMovimentacao",
            "cardMovimentacoesExcluidas"
        ].forEach(
            function (id) {
                const elemento =
                    document.getElementById(
                        id
                    );

                if (elemento) {
                    elemento.hidden =
                        false;
                }
            }
        );
    }

    /*
     * =========================================================
     * LIMPEZA
     * =========================================================
     */

    function limparTudo() {
        movimentacoesExtrato = [];
        movimentacoesConsideradas = [];
        movimentacoesExcluidas = [];

        historicosIncluidosManualmente =
            new Set();

        historicosExcluidosManualmente =
            new Set();

        competenciasDocumentadasExternas =
            [];

        periodoAutomatico = {
            inicio: null,
            fim: null
        };

        const campo =
            document.getElementById(
                "textoExtratoMovimentacao"
            );

        if (campo) {
            campo.value = "";
        }

        const inicio =
            document.getElementById(
                "dataInicioMovimentacao"
            );

        const fim =
            document.getElementById(
                "dataFimMovimentacao"
            );

        if (inicio) {
            inicio.value = "";
        }

        if (fim) {
            fim.value = "";
        }

        setTexto(
            "resultadoMediaMovimentacao",
            "R$ 0,00"
        );

        setTexto(
            "resultadoTotalMovimentacao",
            "R$ 0,00"
        );

        setTexto(
            "resultadoMesesMovimentacao",
            "0"
        );

        setTexto(
            "resultadoQtdConsiderados",
            "0"
        );

        setTexto(
            "resultadoQtdExcluidos",
            "0"
        );

        setTextoMultiplos(
            [
                "primeiraDataMovimentacao",
                "resultadoPrimeiraMovimentacao"
            ],
            "-"
        );

        setTextoMultiplos(
            [
                "ultimaDataMovimentacao",
                "resultadoUltimaMovimentacao"
            ],
            "-"
        );

        setTextoMultiplos(
            [
                "mesesDetectadosMovimentacao",
                "resultadoMesesDetectados"
            ],
            "0"
        );

        setTexto(
            "mesesConsideradosMovimentacao",
            "0"
        );

        const listaRegras =
            document.getElementById(
                "listaRegrasMovimentacao"
            );

        if (listaRegras) {
            listaRegras.innerHTML =
                '<div class="sem-dados">Nenhum histórico identificado.</div>';
        }

        limparTabela(
            "tabelaResumoMensalMovimentacao",
            3,
            "Nenhuma movimentação processada."
        );

        limparTabela(
            "tabelaMovimentacoesConsideradas",
            5,
            "Nenhum crédito considerado."
        );

        limparTabela(
            "tabelaMovimentacoesExcluidas",
            5,
            "Nenhuma movimentação excluída."
        );

        [
            "cardPeriodoMovimentacao",
            "cardResultadoMovimentacao",
            "cardHistoricosMovimentacao",
            "cardResumoMensalMovimentacao",
            "cardCreditosConsideradosMovimentacao",
            "cardMovimentacoesExcluidas"
        ].forEach(
            function (id) {
                const elemento =
                    document.getElementById(
                        id
                    );

                if (elemento) {
                    elemento.hidden =
                        true;
                }
            }
        );
    }

    function limparTabela(
        id,
        colspan,
        mensagem
    ) {
        const tabela =
            document.getElementById(
                id
            );

        if (!tabela) {
            return;
        }

        const tbody =
            tabela.querySelector(
                "tbody"
            );

        if (!tbody) {
            return;
        }

        tbody.innerHTML =
            '<tr><td colspan="' +
            colspan +
            '" class="sem-dados">' +
            escaparHTML(
                mensagem
            ) +
            "</td></tr>";
    }

    /*
     * =========================================================
     * METADADOS OCR
     * =========================================================
     */

    function extrairMeta(
        historico,
        nome
    ) {
        const regex =
            new RegExp(
                "\\[" +
                escaparRegex(
                    nome
                ) +
                ":([^\\]]+)\\]",
                "i"
            );

        const match =
            String(
                historico || ""
            ).match(
                regex
            );

        return match
            ? String(
                match[1] || ""
            )
                .trim()
                .toUpperCase()
            : "";
    }

    /*
     * =========================================================
     * LINHAS INFORMATIVAS
     * =========================================================
     */

    function ehLinhaInformativa(movimento) {
        if (!movimento) {
            return true;
        }

        const h =
            normalizar(
                movimento.historicoCompleto ||
                movimento.historicoNormalizado ||
                movimento.historico
            );

        return ehHistoricoInformativo(
            h
        );
    }

    /*
     * =========================================================
     * COMPETÊNCIAS
     * =========================================================
     */

    function normalizarCompetencias(competencias) {
        const set =
            new Set();

        (
            competencias || []
        ).forEach(
            function (competencia) {
                const valor =
                    String(
                        competencia || ""
                    ).trim();

                if (
                    /^\d{4}-\d{2}$/.test(
                        valor
                    )
                ) {
                    const partes =
                        valor.split("-");

                    const mes =
                        Number(partes[1]);

                    if (
                        mes >= 1 &&
                        mes <= 12
                    ) {
                        set.add(
                            valor
                        );
                    }
                }
            }
        );

        return Array.from(set)
            .sort();
    }

    /*
     * =========================================================
     * DATAS
     * =========================================================
     */

    function criarData(
        dia,
        mes,
        ano
    ) {
        const data =
            new Date(
                ano,
                mes - 1,
                dia,
                12
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

    function parseDataBR(valor) {
        const match =
            String(
                valor || ""
            ).match(
                /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
            );

        if (!match) {
            return null;
        }

        return criarData(
            Number(match[1]),
            Number(match[2]),
            Number(match[3])
        );
    }

    function parseDataISO(valor) {
        const match =
            String(
                valor || ""
            ).match(
                /^(\d{4})-(\d{2})-(\d{2})$/
            );

        if (!match) {
            return null;
        }

        return criarData(
            Number(match[3]),
            Number(match[2]),
            Number(match[1])
        );
    }

    function formatarDataInterna(data) {
        return [
            String(
                data.getDate()
            ).padStart(
                2,
                "0"
            ),

            String(
                data.getMonth() + 1
            ).padStart(
                2,
                "0"
            ),

            data.getFullYear()
        ].join("/");
    }

    function formatarDataInput(data) {
        return [
            data.getFullYear(),

            String(
                data.getMonth() + 1
            ).padStart(
                2,
                "0"
            ),

            String(
                data.getDate()
            ).padStart(
                2,
                "0"
            )
        ].join("-");
    }

    function formatarDataBR(data) {
        return data.toLocaleDateString(
            "pt-BR"
        );
    }

    function inicioDoDia(data) {
        return new Date(
            data.getFullYear(),
            data.getMonth(),
            data.getDate(),
            0,
            0,
            0,
            0
        );
    }

    function fimDoDia(data) {
        return new Date(
            data.getFullYear(),
            data.getMonth(),
            data.getDate(),
            23,
            59,
            59,
            999
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

    function formatarCompetencia(competencia) {
        const match =
            String(
                competencia || ""
            ).match(
                /^(\d{4})-(\d{2})$/
            );

        if (!match) {
            return competencia;
        }

        return (
            match[2] +
            "/" +
            match[1]
        );
    }

    /*
     * =========================================================
     * VALORES
     * =========================================================
     */

    function converterMoeda(valor) {
        if (
            typeof valor === "number"
        ) {
            return valor;
        }

        let texto =
            String(
                valor || ""
            )
                .trim()
                .replace(
                    /\s/g,
                    ""
                )
                .replace(
                    /R\$/gi,
                    ""
                )
                .replace(
                    /[^\d,.\-]/g,
                    ""
                );

        if (!texto) {
            return NaN;
        }

        const negativo =
            texto.startsWith("-");

        texto =
            texto.replace(
                /-/g,
                ""
            );

        /*
         * Formato brasileiro:
         * 1.234.567,89
         */
        if (
            texto.includes(",")
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
            /*
             * Se não houver vírgula, preserva ponto decimal
             * quando for valor já normalizado.
             */
            const quantidadePontos =
                (
                    texto.match(/\./g) ||
                    []
                ).length;

            if (
                quantidadePontos > 1
            ) {
                texto =
                    texto.replace(
                        /\./g,
                        ""
                    );
            }
        }

        const numero =
            Number(
                texto
            );

        if (
            !Number.isFinite(numero)
        ) {
            return NaN;
        }

        return negativo
            ? -numero
            : numero;
    }

    function formatarMoeda(valor) {
        const numero =
            Number(
                valor || 0
            );

        return numero.toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );
    }

    /*
     * =========================================================
     * UTILITÁRIOS
     * =========================================================
     */

    function limparEspacos(valor) {
        return String(
            valor || ""
        )
            .replace(
                /\s+/g,
                " "
            )
            .trim();
    }

    function normalizar(texto) {
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
            .replace(
                /\s+/g,
                " "
            )
            .trim()
            .toUpperCase();
    }

    function setTexto(
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

    function setTextoMultiplos(
        ids,
        valor
    ) {
        (
            ids || []
        ).forEach(
            function (id) {
                setTexto(
                    id,
                    valor
                );
            }
        );
    }

    function obterPrimeiroElemento(ids) {
        for (
            const id
            of ids || []
        ) {
            const elemento =
                document.getElementById(
                    id
                );

            if (elemento) {
                return elemento;
            }
        }

        return null;
    }

    function escaparHTML(valor) {
        return String(
            valor ?? ""
        ).replace(
            /[&<>"']/g,
            function (caractere) {
                return {
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#039;"
                }[caractere];
            }
        );
    }

    function escaparRegex(valor) {
        return String(
            valor || ""
        ).replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );
    }

    /*
     * =========================================================
     * API PÚBLICA
     * =========================================================
     *
     * O OCR deverá utilizar esta mesma API.
     * =========================================================
     */

    window.MediaMovimentacao = {
        processarTexto,

        processarMovimentacoes,

        recalcular,

        limpar:
            limparTudo,

        classificarMovimentacao,

        obterMovimentacoes:
            function () {
                return movimentacoesExtrato
                    .map(
                        copiarMovimentacao
                    );
            },

        obterConsideradas:
            function () {
                return movimentacoesConsideradas
                    .map(
                        copiarMovimentacao
                    );
            },

        obterExcluidas:
            function () {
                return movimentacoesExcluidas
                    .map(
                        copiarMovimentacao
                    );
            },

        obterResultado:
            function () {
                return calcularResultado();
            },

        calcular:
            function () {
                classificarMovimentacoes();

                return calcularResultado();
            }
    };

    function copiarMovimentacao(item) {
        return {
            ...item,

            detalhes:
                Array.isArray(
                    item.detalhes
                )
                    ? item.detalhes.slice()
                    : []
        };
    }

    /*
     * Compatibilidade com o código existente.
     */
    window.processarTextoMovimentacao =
        processarTexto;

    window.processarMovimentacoesMovimentacao =
        processarMovimentacoes;

    /*
     * =========================================================
     * SELEÇÃO DO MODO DE ENTRADA
     * =========================================================
     */

    function configurarModoEntradaMovimentacao() {
        const btnArquivo =
            document.getElementById(
                "btnModoArquivo"
            );

        const btnTexto =
            document.getElementById(
                "btnModoTexto"
            );

        if (
            btnArquivo &&
            btnArquivo.dataset
                .eventoModoConfigurado !== "1"
        ) {
            btnArquivo.dataset
                .eventoModoConfigurado = "1";

            btnArquivo.addEventListener(
                "click",
                function (event) {
                    event.preventDefault();
                    event.stopPropagation();

                    selecionarModoEntradaMovimentacao(
                        "arquivo"
                    );
                }
            );
        }

        if (
            btnTexto &&
            btnTexto.dataset
                .eventoModoConfigurado !== "1"
        ) {
            btnTexto.dataset
                .eventoModoConfigurado = "1";

            btnTexto.addEventListener(
                "click",
                function (event) {
                    event.preventDefault();
                    event.stopPropagation();

                    selecionarModoEntradaMovimentacao(
                        "texto"
                    );
                }
            );
        }

        document
            .querySelectorAll(
                ".btnTrocarModoMovimentacao"
            )
            .forEach(
                function (btn) {
                    if (
                        btn.dataset
                            .eventoModoConfigurado === "1"
                    ) {
                        return;
                    }

                    btn.dataset
                        .eventoModoConfigurado = "1";

                    btn.addEventListener(
                        "click",
                        function (event) {
                            event.preventDefault();
                            event.stopPropagation();

                            voltarSelecaoModoMovimentacao();
                        }
                    );
                }
            );
    }

    function selecionarModoEntradaMovimentacao(modo) {
        const cardModo =
            document.getElementById(
                "cardModoEntrada"
            );

        const cardArquivo =
            document.getElementById(
                "cardLeituraExtratos"
            );

        const cardTexto =
            document.getElementById(
                "cardExtratoMovimentacao"
            );

        const cardResultadoOCR =
            document.getElementById(
                "cardResultadoLeituraExtratos"
            );

        if (cardModo) {
            cardModo.hidden = true;
        }

        if (cardArquivo) {
            cardArquivo.hidden =
                modo !== "arquivo";
        }

        if (cardTexto) {
            cardTexto.hidden =
                modo !== "texto";
        }

        if (cardResultadoOCR) {
            cardResultadoOCR.hidden =
                true;
        }

        ocultarCardsCalculo();

        const status =
            document.getElementById(
                "statusModoMovimentacao"
            );

        if (status) {
            status.textContent =
                modo === "arquivo"
                    ? "Modo selecionado: leitura de arquivo."
                    : "Modo selecionado: texto colado.";
        }

        const destino =
            modo === "arquivo"
                ? cardArquivo
                : cardTexto;

        if (destino) {
            setTimeout(
                function () {
                    destino.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                },
                30
            );
        }
    }

    function voltarSelecaoModoMovimentacao() {
        const cardModo =
            document.getElementById(
                "cardModoEntrada"
            );

        const cardArquivo =
            document.getElementById(
                "cardLeituraExtratos"
            );

        const cardTexto =
            document.getElementById(
                "cardExtratoMovimentacao"
            );

        const cardResultadoOCR =
            document.getElementById(
                "cardResultadoLeituraExtratos"
            );

        if (cardModo) {
            cardModo.hidden = false;
        }

        if (cardArquivo) {
            cardArquivo.hidden = true;
        }

        if (cardTexto) {
            cardTexto.hidden = true;
        }

        if (cardResultadoOCR) {
            cardResultadoOCR.hidden = true;
        }

        ocultarCardsCalculo();

        const status =
            document.getElementById(
                "statusModoMovimentacao"
            );

        if (status) {
            status.textContent =
                "Selecione como deseja informar o extrato.";
        }

        if (cardModo) {
            setTimeout(
                function () {
                    cardModo.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                },
                30
            );
        }
    }

    function ocultarCardsCalculo() {
        [
            "cardPeriodoMovimentacao",
            "cardResultadoMovimentacao",
            "cardHistoricosMovimentacao",
            "cardResumoMensalMovimentacao",
            "cardCreditosConsideradosMovimentacao",
            "cardMovimentacoesExcluidas"
        ].forEach(
            function (id) {
                const elemento =
                    document.getElementById(
                        id
                    );

                if (elemento) {
                    elemento.hidden = true;
                }
            }
        );
    }

    /*
     * Garante a configuração mesmo quando os scripts forem
     * carregados em ordens diferentes.
     */
    function inicializarModoEntradaMovimentacao() {
        configurarModoEntradaMovimentacao();

        setTimeout(
            configurarModoEntradaMovimentacao,
            100
        );

        setTimeout(
            configurarModoEntradaMovimentacao,
            500
        );
    }

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            inicializarModoEntradaMovimentacao,
            {
                once: true
            }
        );
    } else {
        inicializarModoEntradaMovimentacao();
    }

})();