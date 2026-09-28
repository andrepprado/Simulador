(function () {
    "use strict";

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

    const REGRAS_EXCLUSAO_MOVIMENTACAO = [
        {
            rotulo: "SALDO / LINHA INFORMATIVA",
            testar: h =>
                /^SALDO\b/.test(h) ||
                /^SALDO DO DIA\b/.test(h) ||
                /^SALDO ANTERIOR\b/.test(h) ||
                /^SALDO BLOQUEADO\b/.test(h) ||
                /^SALDO DISPONIVEL\b/.test(h) ||
                /^SALDO EM CONTA\b/.test(h)
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

    const REGRAS_CREDITO_SEM_INDICADOR = [
        /\bPIX RECEBIDO\b/,
        /\bPIX RECEBIDA\b/,
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

        /*
         * IMPORTANTE:
         *
         * Antecipação de recebíveis é movimentação financeira
         * efetivamente creditada em conta.
         *
         * Portanto:
         *
         * CR ANTECIPAÇÃO MASTERCARD
         * CR ANTECIPAÇÃO VISA
         * CR ANTECIPAÇÃO ELO
         *
         * devem participar da média quando forem lançamentos C.
         */
        /\bCR ANTECIPACAO\b/
    ];

    document.addEventListener(
        "DOMContentLoaded",
        iniciarMediaMovimentacao
    );

    function iniciarMediaMovimentacao() {
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

        if (btnProcessar) {
            btnProcessar.addEventListener(
                "click",
                () => {
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
    }

    function processarTexto(
        texto,
        opcoes
    ) {
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

        calcularPeriodoAutomatico();

        preencherPeriodoAutomatico();

        classificarMovimentacoes();

        renderizarTudo();

        return {
            movimentacoes:
                movimentacoesExtrato,
            consideradas:
                movimentacoesConsideradas,
            excluidas:
                movimentacoesExcluidas
        };
    }

    /*
     * =========================================================
     * PARSER
     * =========================================================
     */

    function interpretarTextoExtrato(
        texto
    ) {
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
            (
                linhaOriginal,
                indiceLinha
            ) => {
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
                 * Linhas complementares do Sicoob:
                 *
                 * REM.:
                 * Transferência Pix
                 * Nome remetente
                 * CPF/CNPJ
                 *
                 * São anexadas ao movimento anterior.
                 */
                if (
                    movimentoAtual &&
                    ehLinhaComplementar(
                        linha
                    )
                ) {
                    movimentoAtual.detalhes.push(
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
         * NÃO REMOVER "DUPLICADOS" por:
         *
         * data + histórico + valor
         *
         * Isso é intencional.
         *
         * Duas pessoas podem enviar:
         *
         * PIX RECEBIDO R$ 200,00
         * no mesmo dia.
         *
         * Cada linha transacional do extrato é preservada.
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
            campos.length >=
            2
        ) {
            documento =
                campos[0];

            historico =
                campos
                    .slice(1)
                    .join(" ");
        } else {
            /*
             * Fallback para texto que perdeu tabs.
             */
            const partes =
                restante
                    .split(
                        /\s{2,}/
                    )
                    .filter(Boolean);

            if (
                partes.length >=
                2
            ) {
                documento =
                    partes[0];

                historico =
                    partes
                        .slice(1)
                        .join(" ");
            } else {
                historico =
                    restante;
            }
        }

        historico =
            limparEspacos(
                historico
            );

        documento =
            limparEspacos(
                documento
            );

        const indicador =
            valorInfo.indicador;

        const historicoNormalizado =
            normalizar(
                historico
            );

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

            historicoNormalizado,

            detalhes: [],

            valor:
                valorInfo.valor,

            indicador,

            considerado:
                false,

            motivo:
                ""
        };
    }

    function separarCamposLinha(
        texto
    ) {
        const tabs =
            String(
                texto || ""
            )
                .split(/\t+/)
                .map(
                    limparEspacos
                )
                .filter(Boolean);

        if (
            tabs.length >=
            2
        ) {
            return tabs;
        }

        return String(
            texto || ""
        )
            .split(/\s{2,}/)
            .map(
                limparEspacos
            )
            .filter(Boolean);
    }

    function extrairDataInicioLinha(
        linha
    ) {
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
            Number(
                match[1]
            );

        const mes =
            Number(
                match[2]
            );

        const ano =
            Number(
                match[3]
            );

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

    function extrairValorFinalLinha(
        texto
    ) {
        const valor =
            String(
                texto || ""
            );

        /*
         * Exemplos:
         *
         * 10.000,00C
         * 211,29D
         * 0,00*
         * 922,49 C
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
            !Number.isFinite(
                numero
            )
        ) {
            return null;
        }

        return {
            valor:
                Math.abs(
                    numero
                ),

            indicador:
                String(
                    match[2] || ""
                )
                    .toUpperCase(),

            indice:
                match.index
        };
    }

    function ehLinhaComplementar(
        linha
    ) {
        const n =
            normalizar(
                linha
            );

        if (!n) {
            return false;
        }

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
            n ===
            "RESUMO" ||
            n.startsWith(
                "ENCARGOS"
            ) ||
            n.startsWith(
                "OUTRAS INFORMACOES"
            ) ||
            n.startsWith(
                "SAC:"
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
        movimentacoesConsideradas =
            [];

        movimentacoesExcluidas =
            [];

        movimentacoesExtrato.forEach(
            movimentacao => {
                movimentacao.historicoNormalizado =
                    normalizar(
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

    function classificarMovimentacao(
        movimentacao
    ) {
        const historico =
            movimentacao
                .historicoNormalizado;

        const historicoCompleto =
            normalizar(
                movimentacao.historicoCompleto
            );

        /*
         * DECISÃO explicitamente enviada pelo OCR.
         */
        const decisao =
            extrairMeta(
                movimentacao.historico,
                "DECISAO"
            );

        if (
            decisao ===
            "EXCLUIR"
        ) {
            return {
                considerado:
                    false,

                motivo:
                    "Exclusão definida pela leitura do extrato"
            };
        }

        if (
            decisao ===
            "INCLUIR"
        ) {
            return {
                considerado:
                    true,

                motivo:
                    "Crédito confirmado pela leitura do extrato"
            };
        }

        /*
         * Indicador de débito tem prioridade.
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

        const exclusaoManual =
            historicosExcluidosManualmente.has(
                historico
            );

        if (
            exclusaoManual
        ) {
            return {
                considerado:
                    false,

                motivo:
                    "Histórico excluído manualmente"
            };
        }

        const inclusaoManual =
            historicosIncluidosManualmente.has(
                historico
            );

        /*
         * Exclusões automáticas.
         *
         * IMPORTANTE:
         * CR ANTECIPAÇÃO NÃO ESTÁ NESTA LISTA.
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
                considerado:
                    false,

                motivo:
                    regraExclusao.rotulo
            };
        }

        /*
         * Indicador C é a fonte mais forte para extratos
         * Sicoob.
         *
         * Uma transação C é entrada efetiva em conta,
         * salvo regras explícitas acima.
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

        if (
            inclusaoManual
        ) {
            return {
                considerado:
                    true,

                motivo:
                    "Histórico incluído manualmente"
            };
        }

        if (
            identificarCreditoSemIndicador(
                historicoCompleto
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

    function localizarRegraExclusao(
        historico
    ) {
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
        return REGRAS_CREDITO_SEM_INDICADOR.some(
            regex =>
                regex.test(
                    historico
                )
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
                        !ehLinhaInformativa(
                            m
                        )
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
                inicio:
                    null,
                fim:
                    null
            };

            return;
        }

        periodoAutomatico = {
            inicio:
                new Date(
                    Math.min(
                        ...datas.map(
                            d =>
                                d.getTime()
                        )
                    )
                ),

            fim:
                new Date(
                    Math.max(
                        ...datas.map(
                            d =>
                                d.getTime()
                        )
                    )
                )
        };
    }

    function preencherPeriodoAutomatico() {
        const inicio =
            document.getElementById(
                "dataInicioMovimentacao"
            );

        const fim =
            document.getElementById(
                "dataFimMovimentacao"
            );

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

        return {
            inicio,
            fim
        };
    }

    function atualizarInformacoesPeriodo() {
        const periodo =
            obterPeriodoAtual();

        setTexto(
            "resultadoPrimeiraMovimentacao",
            periodo.inicio
                ? formatarDataBR(
                    periodo.inicio
                )
                : "-"
        );

        setTexto(
            "resultadoUltimaMovimentacao",
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

        setTexto(
            "resultadoMesesDetectados",
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

        const total =
            consideradasPeriodo.reduce(
                (
                    soma,
                    m
                ) =>
                    soma +
                    Number(
                        m.valor || 0
                    ),
                0
            );

        const competencias =
            obterCompetenciasApuracao(
                periodo
            );

        const meses =
            competencias.length;

        const media =
            meses > 0
                ? total / meses
                : 0;

        return {
            periodo,
            consideradasPeriodo,
            excluidasPeriodo,
            total,
            competencias,
            meses,
            media
        };
    }

    function obterCompetenciasApuracao(
        periodo
    ) {
        const set =
            new Set();

        competenciasDocumentadasExternas.forEach(
            competencia => {
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

        movimentacoesExtrato.forEach(
            m => {
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
                    ehLinhaInformativa(
                        m
                    )
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

        return Array.from(
            set
        ).sort();
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

        const inicioMes =
            new Date(
                Number(
                    match[1]
                ),
                Number(
                    match[2]
                ) - 1,
                1,
                12
            );

        const fimMes =
            new Date(
                Number(
                    match[1]
                ),
                Number(
                    match[2]
                ),
                0,
                12
            );

        if (
            periodo.inicio &&
            fimMes <
            periodo.inicio
        ) {
            return false;
        }

        if (
            periodo.fim &&
            inicioMes >
            periodo.fim
        ) {
            return false;
        }

        return true;
    }

    /*
     * =========================================================
     * RENDERIZAÇÃO
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

        mostrarCardsResultado();
    }

    function renderizarResultado(
        resultado
    ) {
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
    }

    function renderizarHistoricos(
        resultado
    ) {
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
            movimentacao => {
                const chave =
                    movimentacao
                        .historicoNormalizado;

                if (!chave) {
                    return;
                }

                if (
                    !agrupados.has(
                        chave
                    )
                ) {
                    agrupados.set(
                        chave,
                        {
                            historico:
                                movimentacao.historico,

                            chave,

                            quantidade:
                                0,

                            total:
                                0,

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

                item.total +=
                    Number(
                        movimentacao.valor || 0
                    );

                const regra =
                    localizarRegraExclusao(
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
                    (
                        a,
                        b
                    ) =>
                        a.historico.localeCompare(
                            b.historico,
                            "pt-BR"
                        )
                );

        if (resumo) {
            resumo.textContent =
                `${itens.length} histórico(s) diferente(s) identificado(s). Marque para desconsiderar.`;
        }

        if (!itens.length) {
            lista.innerHTML =
                '<div class="sem-dados">Nenhum histórico identificado.</div>';

            return;
        }

        lista.innerHTML =
            itens
                .map(
                    (
                        item,
                        indice
                    ) => {
                        const excluidoManual =
                            historicosExcluidosManualmente.has(
                                item.chave
                            );

                        const automaticamente =
                            item.automaticamenteExcluido;

                        const marcado =
                            excluidoManual ||
                            automaticamente;

                        const classe =
                            marcado
                                ? " regra-excluida"
                                : "";

                        let descricao =
                            `${item.quantidade} lançamento(s) · ${formatarMoeda(item.total)}`;

                        if (
                            automaticamente
                        ) {
                            descricao +=
                                ` · Exclusão automática: ${item.motivoAutomatico}`;
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
                checkbox => {
                    checkbox.addEventListener(
                        "change",
                        () => {
                            const indice =
                                Number(
                                    checkbox.dataset.indice
                                );

                            const item =
                                itens[
                                indice
                                ];

                            if (!item) {
                                return;
                            }

                            /*
                             * Regra automática continua automática.
                             * Desmarcar uma regra automática cria
                             * inclusão manual.
                             */
                            if (
                                item.automaticamenteExcluido
                            ) {
                                if (
                                    checkbox.checked
                                ) {
                                    historicosIncluidosManualmente.delete(
                                        item.chave
                                    );

                                    historicosExcluidosManualmente.add(
                                        item.chave
                                    );
                                } else {
                                    historicosExcluidosManualmente.delete(
                                        item.chave
                                    );

                                    historicosIncluidosManualmente.add(
                                        item.chave
                                    );
                                }
                            } else {
                                if (
                                    checkbox.checked
                                ) {
                                    historicosExcluidosManualmente.add(
                                        item.chave
                                    );

                                    historicosIncluidosManualmente.delete(
                                        item.chave
                                    );
                                } else {
                                    historicosExcluidosManualmente.delete(
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

    function renderizarResumoMensal(
        resultado
    ) {
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
            competencia => {
                mapa.set(
                    competencia,
                    {
                        quantidade:
                            0,
                        total:
                            0
                    }
                );
            }
        );

        resultado.consideradasPeriodo.forEach(
            movimento => {
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
                            quantidade:
                                0,
                            total:
                                0
                        }
                    );
                }

                const item =
                    mapa.get(
                        competencia
                    );

                item.quantidade++;

                item.total +=
                    Number(
                        movimento.valor || 0
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
                    (
                        a,
                        b
                    ) =>
                        a[0].localeCompare(
                            b[0]
                        )
                )
                .map(
                    (
                        [
                            competencia,
                            dados
                        ]
                    ) => `
                        <tr>
                            <td>${escaparHTML(formatarCompetencia(competencia))}</td>
                            <td>${dados.quantidade}</td>
                            <td>${formatarMoeda(dados.total)}</td>
                        </tr>
                    `
                )
                .join("");
    }

    function mostrarCardsResultado() {
        [
            "cardResultadoMovimentacao",
            "cardHistoricosMovimentacao",
            "cardResumoMensalMovimentacao"
        ].forEach(
            id => {
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
        movimentacoesExtrato =
            [];

        movimentacoesConsideradas =
            [];

        movimentacoesExcluidas =
            [];

        historicosIncluidosManualmente =
            new Set();

        historicosExcluidosManualmente =
            new Set();

        competenciasDocumentadasExternas =
            [];

        periodoAutomatico = {
            inicio:
                null,
            fim:
                null
        };

        const campo =
            document.getElementById(
                "textoExtratoMovimentacao"
            );

        if (campo) {
            campo.value =
                "";
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
            inicio.value =
                "";
        }

        if (fim) {
            fim.value =
                "";
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

        [
            "cardResultadoMovimentacao",
            "cardHistoricosMovimentacao",
            "cardResumoMensalMovimentacao"
        ].forEach(
            id => {
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
     * UTILITÁRIOS
     * =========================================================
     */

    function ehLinhaInformativa(
        movimento
    ) {
        const h =
            movimento
                .historicoNormalizado;

        return (
            /^SALDO\b/.test(
                h
            ) ||
            /^TOTAL\b/.test(
                h
            ) ||
            /^LIMITE\b/.test(
                h
            )
        );
    }

    function normalizarCompetencias(
        competencias
    ) {
        const set =
            new Set();

        (
            competencias || []
        ).forEach(
            competencia => {
                const valor =
                    String(
                        competencia || ""
                    ).trim();

                if (
                    /^\d{4}-\d{2}$/.test(
                        valor
                    )
                ) {
                    set.add(
                        valor
                    );
                }
            }
        );

        return Array.from(
            set
        ).sort();
    }

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

    function parseDataBR(
        valor
    ) {
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
            Number(
                match[1]
            ),
            Number(
                match[2]
            ),
            Number(
                match[3]
            )
        );
    }

    function parseDataISO(
        valor
    ) {
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
            Number(
                match[3]
            ),
            Number(
                match[2]
            ),
            Number(
                match[1]
            )
        );
    }

    function formatarDataInterna(
        data
    ) {
        return [
            String(
                data.getDate()
            ).padStart(
                2,
                "0"
            ),
            String(
                data.getMonth() +
                1
            ).padStart(
                2,
                "0"
            ),
            data.getFullYear()
        ].join("/");
    }

    function formatarDataInput(
        data
    ) {
        return [
            data.getFullYear(),
            String(
                data.getMonth() +
                1
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

    function formatarDataBR(
        data
    ) {
        return data.toLocaleDateString(
            "pt-BR"
        );
    }

    function inicioDoDia(
        data
    ) {
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

    function fimDoDia(
        data
    ) {
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

    function obterCompetenciaData(
        data
    ) {
        return (
            data.getFullYear() +
            "-" +
            String(
                data.getMonth() +
                1
            ).padStart(
                2,
                "0"
            )
        );
    }

    function formatarCompetencia(
        competencia
    ) {
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

    function converterMoeda(
        valor
    ) {
        let texto =
            String(
                valor || ""
            )
                .replace(
                    /\s/g,
                    ""
                )
                .replace(
                    /[^\d,.-]/g,
                    ""
                );

        if (!texto) {
            return NaN;
        }

        const negativo =
            texto.startsWith(
                "-"
            );

        texto =
            texto
                .replace(
                    /-/g,
                    ""
                )
                .replace(
                    /\./g,
                    ""
                )
                .replace(
                    ",",
                    "."
                );

        const numero =
            Number(
                texto
            );

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

    function limparEspacos(
        valor
    ) {
        return String(
            valor || ""
        )
            .replace(
                /\s+/g,
                " "
            )
            .trim();
    }

    function normalizar(
        texto
    ) {
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

    function obterPrimeiroElemento(
        ids
    ) {
        for (
            const id of ids || []
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

    function escaparHTML(
        valor
    ) {
        return String(
            valor ?? ""
        ).replace(
            /[&<>"']/g,
            caractere => ({
                "&":
                    "&amp;",
                "<":
                    "&lt;",
                ">":
                    "&gt;",
                '"':
                    "&quot;",
                "'":
                    "&#039;"
            }[
                caractere
            ])
        );
    }

    function escaparRegex(
        valor
    ) {
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
     */

    window.MediaMovimentacao = {
        processarTexto,

        recalcular,

        limpar:
            limparTudo,

        obterMovimentacoes:
            () =>
                movimentacoesExtrato.slice(),

        obterConsideradas:
            () =>
                movimentacoesConsideradas.slice(),

        obterExcluidas:
            () =>
                movimentacoesExcluidas.slice(),

        obterResultado:
            () =>
                calcularResultado()
    };

    window.processarTextoMovimentacao =
        processarTexto;




    /*
 * =========================================================
 * CORREÇÃO - SELEÇÃO DO MODO DE ENTRADA
 * =========================================================
 */

    function configurarModoEntradaMovimentacao() {
        const btnArquivo = document.getElementById("btnModoArquivo");
        const btnTexto = document.getElementById("btnModoTexto");

        if (btnArquivo && btnArquivo.dataset.eventoModoConfigurado !== "1") {
            btnArquivo.dataset.eventoModoConfigurado = "1";

            btnArquivo.addEventListener("click", function (event) {
                event.preventDefault();
                event.stopPropagation();

                selecionarModoEntradaMovimentacao("arquivo");
            });
        }

        if (btnTexto && btnTexto.dataset.eventoModoConfigurado !== "1") {
            btnTexto.dataset.eventoModoConfigurado = "1";

            btnTexto.addEventListener("click", function (event) {
                event.preventDefault();
                event.stopPropagation();

                selecionarModoEntradaMovimentacao("texto");
            });
        }

        document
            .querySelectorAll(".btnTrocarModoMovimentacao")
            .forEach(function (btn) {
                if (btn.dataset.eventoModoConfigurado === "1") {
                    return;
                }

                btn.dataset.eventoModoConfigurado = "1";

                btn.addEventListener("click", function (event) {
                    event.preventDefault();
                    event.stopPropagation();

                    voltarSelecaoModoMovimentacao();
                });
            });
    }

    function selecionarModoEntradaMovimentacao(modo) {
        const cardModo = document.getElementById("cardModoEntrada");
        const cardArquivo = document.getElementById("cardLeituraExtratos");
        const cardTexto = document.getElementById("cardExtratoMovimentacao");
        const cardResultadoOCR = document.getElementById("cardResultadoLeituraExtratos");

        if (cardModo) {
            cardModo.hidden = true;
        }

        if (cardArquivo) {
            cardArquivo.hidden = modo !== "arquivo";
        }

        if (cardTexto) {
            cardTexto.hidden = modo !== "texto";
        }

        if (cardResultadoOCR) {
            cardResultadoOCR.hidden = true;
        }

        const cardResultado = document.getElementById("cardResultadoMovimentacao");
        const cardHistoricos = document.getElementById("cardHistoricosMovimentacao");
        const cardResumoMensal = document.getElementById("cardResumoMensalMovimentacao");

        if (cardResultado) {
            cardResultado.hidden = true;
        }

        if (cardHistoricos) {
            cardHistoricos.hidden = true;
        }

        if (cardResumoMensal) {
            cardResumoMensal.hidden = true;
        }

        const status = document.getElementById("statusModoMovimentacao");

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
            setTimeout(function () {
                destino.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }, 30);
        }
    }

    function voltarSelecaoModoMovimentacao() {
        const cardModo = document.getElementById("cardModoEntrada");
        const cardArquivo = document.getElementById("cardLeituraExtratos");
        const cardTexto = document.getElementById("cardExtratoMovimentacao");
        const cardResultadoOCR = document.getElementById("cardResultadoLeituraExtratos");
        const cardResultado = document.getElementById("cardResultadoMovimentacao");
        const cardHistoricos = document.getElementById("cardHistoricosMovimentacao");
        const cardResumoMensal = document.getElementById("cardResumoMensalMovimentacao");

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

        if (cardResultado) {
            cardResultado.hidden = true;
        }

        if (cardHistoricos) {
            cardHistoricos.hidden = true;
        }

        if (cardResumoMensal) {
            cardResumoMensal.hidden = true;
        }

        const status = document.getElementById("statusModoMovimentacao");

        if (status) {
            status.textContent = "Selecione como deseja informar o extrato.";
        }

        if (cardModo) {
            setTimeout(function () {
                cardModo.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }, 30);
        }
    }

    /*
     * Garante a configuração mesmo que o JS tenha sido carregado
     * antes ou depois do DOMContentLoaded.
     */
    function inicializarModoEntradaMovimentacao() {
        configurarModoEntradaMovimentacao();

        /*
         * Alguns componentes da página podem ser montados
         * depois do carregamento inicial.
         */
        setTimeout(configurarModoEntradaMovimentacao, 100);
        setTimeout(configurarModoEntradaMovimentacao, 500);
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            inicializarModoEntradaMovimentacao,
            { once: true }
        );
    } else {
        inicializarModoEntradaMovimentacao();
    }


})();