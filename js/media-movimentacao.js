/**
 * media-movimentacao.js
 *
 * Caixa de Ferramentas - Sicoob Mantiqueira
 *
 * Cálculo da média de movimentação por extrato SISBR.
 *
 * REGRAS PRINCIPAIS:
 *
 * 1. Somente linhas iniciadas por DD/MM/AAAA são tratadas como lançamentos.
 * 2. Débitos são sempre desconsiderados.
 * 3. Créditos são considerados, exceto históricos previstos nas regras de exclusão.
 * 4. O período é calculado pela PRIMEIRA e ÚLTIMA data encontradas no extrato.
 * 5. O cálculo de meses considera as competências abrangidas pelo intervalo.
 *
 * Exemplo:
 * 30/12/2024 até 18/09/2026 = 22 meses.
 */

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

/* =========================================================
   REGRAS DE EXCLUSÃO
========================================================= */

const REGRAS_EXCLUSAO_MOVIMENTACAO = [
    {
        id: "cred-emprestimo",
        rotulo: "CRÉD. EMPRÉSTIMO",
        motivo: "Empréstimo é dívida e não renda.",
        ativo: true,
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
        ativo: true,
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
        ativo: true,
        testar: function (historico) {
            return historico.includes("CRED LIBERACAO BNDES");
        }
    },
    {
        id: "cred-liberacao-cartao",
        rotulo: "CRÉD. LIBERAÇÃO TÍTULO REC. CARTÃO",
        motivo: "Movimentação desconsiderada conforme regra definida.",
        ativo: true,
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
        ativo: true,
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
        ativo: true,
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
        ativo: true,
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
        ativo: true,
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
        ativo: true,
        testar: function (historico) {
            return historico.startsWith("ESTORNO ");
        }
    },
    {
        id: "resgate-rdc",
        rotulo: "RESGATE RDC",
        motivo: "Resgate de aplicação não é renda.",
        ativo: true,
        testar: function (historico) {
            return historico.includes("RESGATE RDC");
        }
    },
    {
        id: "saldo-anterior",
        rotulo: "SALDO ANTERIOR",
        motivo: "Linha informativa do extrato.",
        ativo: true,
        testar: function (historico) {
            return historico.includes("SALDO ANTERIOR");
        }
    },
    {
        id: "saldo-dia",
        rotulo: "SALDO DO DIA",
        motivo: "Linha informativa do extrato.",
        ativo: true,
        testar: function (historico) {
            return historico.includes("SALDO DO DIA");
        }
    }
];

/*
 * Estes históricos ajudam a reconhecer créditos quando o texto
 * colado não conserva o indicador "C".
 *
 * IMPORTANTE:
 * "LIBERAÇÃO DE DEPÓSITO BLOQUEADO" é crédito considerado.
 * Portanto, NÃO existe regra genérica excluindo "BLOQUEADO".
 */
const PADROES_CREDITO_SEM_INDICADOR = [
    "CRED TED-STR",
    "CRED TED STR",
    "CRED TRANSF CONTAS",
    "CRED TRANSF CONTAS INTERCREDIS",
    "DEP CHEQUE COOP/AG",
    "DEP CHEQUE COOP AG",
    "DEPOSITO CHEQUE AG",
    "DEPOSITO EM DINHEIRO AG",
    "LIBERACAO DE DEPOSITO BLOQUEADO",
    "PIX RECEBIDO",
    "TRANSF RECEBIDA",
    "TRANSFERENCIA RECEBIDA"
];

/* =========================================================
   INICIALIZAÇÃO
========================================================= */

function iniciarMediaMovimentacao() {
    configurarEventosMediaMovimentacao();
    renderizarRegrasMovimentacao();
    limparResultadosMovimentacao();
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
            function () {
                if (movimentacoesExtrato.length > 0) {
                    classificarMovimentacoes();
                    calcularResultadosMovimentacao();
                    renderizarResultadosMovimentacao();
                }
            }
        );
    }

    if (mesesConsiderados) {
        mesesConsiderados.addEventListener(
            "input",
            function () {
                if (movimentacoesExtrato.length > 0) {
                    calcularResultadosMovimentacao();
                }
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

    movimentacoesExtrato = interpretarExtratoMovimentacao(
        texto
    );

    if (movimentacoesExtrato.length === 0) {
        limparResultadosMovimentacao();

        alert(
            "Nenhum lançamento com data no formato DD/MM/AAAA foi identificado."
        );

        return;
    }

    identificarPeriodoExtrato();

    classificarMovimentacoes();

    calcularResultadosMovimentacao();

    renderizarResultadosMovimentacao();
}

/* =========================================================
   INTERPRETAÇÃO DO EXTRATO
========================================================= */

function interpretarExtratoMovimentacao(texto) {
    const linhas = String(texto || "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n");

    const movimentacoes = [];

    linhas.forEach(function (linhaOriginal, indice) {
        const linha = String(linhaOriginal || "").trim();

        if (!linha) {
            return;
        }

        /*
         * SOMENTE uma linha iniciada efetivamente por uma data
         * DD/MM/AAAA pode se transformar em lançamento.
         *
         * Isso elimina:
         * - cabeçalhos;
         * - nome do associado;
         * - conta corrente;
         * - textos explicativos;
         * - linhas complementares;
         * - rodapés;
         * - totais sem data.
         */
        const correspondenciaData = linha.match(
            /^(\d{2}\/\d{2}\/\d{4})(?:\s+|\t+)/
        );

        if (!correspondenciaData) {
            return;
        }

        const dataTexto = correspondenciaData[1];

        const data = converterDataBrasileira(
            dataTexto
        );

        if (!data) {
            return;
        }

        const movimentacao = interpretarLinhaMovimentacao(
            linha,
            data,
            dataTexto,
            indice + 1
        );

        if (!movimentacao) {
            return;
        }

        movimentacoes.push(
            movimentacao
        );
    });

    return movimentacoes;
}

/* =========================================================
   INTERPRETA UMA LINHA
========================================================= */

function interpretarLinhaMovimentacao(
    linha,
    data,
    dataTexto,
    numeroLinha
) {
    let restante = linha
        .replace(
            /^(\d{2}\/\d{2}\/\d{4})/,
            ""
        )
        .trim();

    /*
     * Localiza o último valor monetário existente na linha.
     *
     * Exemplos válidos:
     *
     * 1.500,00 C
     * 1.500,00C
     * 1.500,00 D
     * 1500,00
     */
    const regexValorFinal =
        /(-?\s*(?:R\$\s*)?(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2})\s*([CD])?\s*$/i;

    const correspondenciaValor =
        restante.match(
            regexValorFinal
        );

    if (!correspondenciaValor) {
        /*
         * Linha possui data, mas não termina em valor.
         * Portanto não representa lançamento financeiro útil.
         */
        return null;
    }

    const valorTexto =
        correspondenciaValor[1];

    const indicador =
        String(
            correspondenciaValor[2] || ""
        ).toUpperCase();

    const valor =
        converterValorBrasileiro(
            valorTexto
        );

    if (!Number.isFinite(valor)) {
        return null;
    }

    /*
     * Remove valor e C/D do restante da linha.
     */
    let parteDescricao = restante
        .substring(
            0,
            correspondenciaValor.index
        )
        .trim();

    const dadosDescricao =
        separarDocumentoHistorico(
            parteDescricao
        );

    return {
        linha: numeroLinha,
        data: data,
        dataTexto: dataTexto,
        competencia: obterCompetenciaData(data),
        documento: dadosDescricao.documento,
        historico: dadosDescricao.historico,
        historicoNormalizado: normalizarTexto(
            dadosDescricao.historico
        ),
        valor: Math.abs(valor),
        indicador: indicador,
        original: linha,
        considerado: false,
        motivo: ""
    };
}

/* =========================================================
   DOCUMENTO / HISTÓRICO
========================================================= */

function separarDocumentoHistorico(texto) {
    const valor = String(texto || "").trim();

    if (!valor) {
        return {
            documento: "",
            historico: ""
        };
    }

    /*
     * Se vier separado por TAB, o SISBR normalmente mantém
     * muito melhor a estrutura das colunas.
     */
    const partesTab = valor
        .split(/\t+/)
        .map(function (item) {
            return item.trim();
        })
        .filter(Boolean);

    if (partesTab.length >= 2) {
        return {
            documento: partesTab[0],
            historico: partesTab
                .slice(1)
                .join(" ")
                .trim()
        };
    }

    /*
     * Tenta identificar documento no primeiro campo.
     *
     * Só separa quando o primeiro token tiver aparência
     * típica de documento/número.
     */
    const correspondenciaDocumento = valor.match(
        /^([0-9A-Z./-]{3,30})\s{2,}(.+)$/i
    );

    if (correspondenciaDocumento) {
        return {
            documento: correspondenciaDocumento[1],
            historico: correspondenciaDocumento[2].trim()
        };
    }

    /*
     * Alguns textos copiados transformam TAB em vários espaços.
     */
    const partesEspaco = valor
        .split(/\s{2,}/)
        .map(function (item) {
            return item.trim();
        })
        .filter(Boolean);

    if (partesEspaco.length >= 2) {
        const primeiro = partesEspaco[0];

        if (
            /^[0-9A-Z./-]{3,30}$/i.test(
                primeiro
            )
        ) {
            return {
                documento: primeiro,
                historico: partesEspaco
                    .slice(1)
                    .join(" ")
            };
        }
    }

    /*
     * Se não for possível separar com segurança,
     * tudo é mantido como histórico.
     */
    return {
        documento: "",
        historico: valor
    };
}

/* =========================================================
   PERÍODO DO EXTRATO
========================================================= */

function identificarPeriodoExtrato() {
    if (movimentacoesExtrato.length === 0) {
        primeiraDataExtrato = null;
        ultimaDataExtrato = null;
        return;
    }

    /*
     * A primeira e última data são obtidas pela DATA,
     * e não pela posição das linhas.
     *
     * Dessa forma funciona mesmo se o texto estiver:
     * - crescente;
     * - decrescente;
     * - parcialmente fora de ordem.
     */
    const datas = movimentacoesExtrato
        .map(function (movimentacao) {
            return movimentacao.data;
        })
        .filter(function (data) {
            return data instanceof Date &&
                !Number.isNaN(data.getTime());
        });

    if (datas.length === 0) {
        primeiraDataExtrato = null;
        ultimaDataExtrato = null;
        return;
    }

    primeiraDataExtrato = new Date(
        Math.min.apply(
            null,
            datas.map(function (data) {
                return data.getTime();
            })
        )
    );

    ultimaDataExtrato = new Date(
        Math.max.apply(
            null,
            datas.map(function (data) {
                return data.getTime();
            })
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

    /*
     * Sempre que um novo extrato é processado,
     * o número calculado pelo período vira o padrão.
     *
     * O usuário ainda poderá alterá-lo manualmente depois.
     */
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
        Number.isNaN(dataInicial.getTime()) ||
        Number.isNaN(dataFinal.getTime())
    ) {
        return 0;
    }

    let inicial = dataInicial;
    let final = dataFinal;

    if (inicial > final) {
        inicial = dataFinal;
        final = dataInicial;
    }

    /*
     * Calcula COMPETÊNCIAS MENSAIS abrangidas.
     *
     * Exemplo:
     *
     * 30/12/2024
     * até
     * 18/09/2026
     *
     * Dez/2024 = 1
     * Jan-Dez/2025 = 12
     * Jan-Set/2026 = 9
     *
     * Total = 22
     */
    const diferencaAnos =
        final.getFullYear() -
        inicial.getFullYear();

    const diferencaMeses =
        final.getMonth() -
        inicial.getMonth();

    return (
        diferencaAnos * 12 +
        diferencaMeses +
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

    /*
     * Estes campos são opcionais.
     * Se ainda não estiverem no HTML, o JS continua funcionando.
     */
    if (elementoPrimeira) {
        if (
            "value" in elementoPrimeira
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
            "value" in elementoUltima
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

    const regrasAtivas =
        obterRegrasExclusaoAtivas();

    const regrasPersonalizadas =
        obterRegrasPersonalizadas();

    movimentacoesExtrato.forEach(
        function (movimentacao) {
            const classificacao =
                classificarMovimentacao(
                    movimentacao,
                    regrasAtivas,
                    regrasPersonalizadas
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
    movimentacao,
    regrasAtivas,
    regrasPersonalizadas
) {
    const historico =
        movimentacao.historicoNormalizado;

    /*
     * Débito nunca participa da renda.
     */
    if (
        movimentacao.indicador === "D"
    ) {
        return {
            considerado: false,
            motivo: "Débito"
        };
    }

    /*
     * Regras conhecidas de exclusão são aplicadas antes
     * da inclusão do crédito.
     */
    for (
        const regra of regrasAtivas
    ) {
        if (
            regra.testar(historico)
        ) {
            return {
                considerado: false,
                motivo: regra.rotulo
            };
        }
    }

    /*
     * Regras adicionais digitadas pelo usuário.
     */
    for (
        const regraTexto of regrasPersonalizadas
    ) {
        if (
            historico.includes(
                regraTexto
            )
        ) {
            return {
                considerado: false,
                motivo:
                    "Regra adicional: " +
                    regraTexto
            };
        }
    }

    /*
     * C explícito no extrato = crédito.
     */
    if (
        movimentacao.indicador === "C"
    ) {
        return {
            considerado: true,
            motivo: "Crédito considerado"
        };
    }

    /*
     * Quando o indicador C/D desaparece ao copiar/colar,
     * tentamos reconhecer somente históricos conhecidos
     * de crédito.
     */
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

    /*
     * Uma linha sem C/D e cujo histórico não permite
     * identificar crédito com segurança não entra.
     */
    return {
        considerado: false,
        motivo:
            "Sem identificação segura como crédito"
    };
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
                normalizarTexto(padrao)
            );
        }
    );
}

/* =========================================================
   REGRAS ATIVAS
========================================================= */

function obterRegrasExclusaoAtivas() {
    return REGRAS_EXCLUSAO_MOVIMENTACAO.filter(
        function (regra) {
            const checkbox =
                document.getElementById(
                    "regra-movimentacao-" +
                    regra.id
                );

            if (!checkbox) {
                return regra.ativo;
            }

            return checkbox.checked;
        }
    );
}

function obterRegrasPersonalizadas() {
    const textarea =
        document.getElementById(
            "regrasAdicionaisMovimentacao"
        );

    if (!textarea) {
        return [];
    }

    return String(
        textarea.value || ""
    )
        .split(/\n|;/)
        .map(function (item) {
            return normalizarTexto(
                item
            );
        })
        .filter(Boolean);
}

/* =========================================================
   CÁLCULO
========================================================= */

function calcularResultadosMovimentacao() {
    const total =
        movimentacoesConsideradas.reduce(
            function (acumulado, movimentacao) {
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

    definirTexto(
        "resultadoMediaMovimentacao",
        formatarMoeda(total > 0 ? media : 0)
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
            movimentacoesExcluidas.length
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
        document.getElementById(
            "tabelaResumoMensalMovimentacao"
        );

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    const agrupamento = {};

    movimentacoesConsideradas.forEach(
        function (movimentacao) {
            const competencia =
                movimentacao.competencia;

            if (!agrupamento[competencia]) {
                agrupamento[competencia] = {
                    competencia: competencia,
                    quantidade: 0,
                    total: 0
                };
            }

            agrupamento[competencia].quantidade++;

            agrupamento[competencia].total +=
                movimentacao.valor;
        }
    );

    const competencias =
        Object.keys(
            agrupamento
        ).sort();

    if (competencias.length === 0) {
        inserirLinhaSemDados(
            tbody,
            3,
            "Nenhuma movimentação considerada."
        );
        return;
    }

    competencias.forEach(
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
                    ${formatarCompetencia(competencia)}
                </td>

                <td>
                    ${grupo.quantidade}
                </td>

                <td>
                    ${formatarMoeda(grupo.total)}
                </td>
            `;

            tbody.appendChild(tr);
        }
    );
}

/* =========================================================
   TABELA CONSIDERADAS
========================================================= */

function renderizarTabelaConsideradas() {
    const tbody =
        document.getElementById(
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
            5,
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
                movimentacao.documento || "-"
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
                movimentacao.indicador ||
                "Crédito"
            )}
                </td>
            `;

            tbody.appendChild(tr);
        }
    );
}

/* =========================================================
   TABELA EXCLUÍDAS
========================================================= */

function renderizarTabelaExcluidas() {
    const tbody =
        document.getElementById(
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
                movimentacao.documento || "-"
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

            tbody.appendChild(tr);
        }
    );
}

/* =========================================================
   REGRAS
========================================================= */

function renderizarRegrasMovimentacao() {
    const container =
        document.getElementById(
            "listaRegrasMovimentacao"
        );

    if (!container) {
        return;
    }

    container.innerHTML = "";

    REGRAS_EXCLUSAO_MOVIMENTACAO.forEach(
        function (regra) {
            const label =
                document.createElement(
                    "label"
                );

            label.className =
                "opcao-simulacao regra-movimentacao-item";

            label.innerHTML = `
                <input
                    type="checkbox"
                    id="regra-movimentacao-${escaparHtml(
                regra.id
            )}"
                    ${regra.ativo
                    ? "checked"
                    : ""
                }
                >

                <span class="opcao-simulacao-conteudo">

                    <strong>
                        Excluir:
                        ${escaparHtml(
                    regra.rotulo
                )}
                    </strong>

                    <small>
                        ${escaparHtml(
                    regra.motivo
                )}
                    </small>

                </span>
            `;

            const checkbox =
                label.querySelector(
                    "input"
                );

            if (checkbox) {
                checkbox.addEventListener(
                    "change",
                    function () {
                        if (
                            movimentacoesExtrato.length >
                            0
                        ) {
                            classificarMovimentacoes();
                            calcularResultadosMovimentacao();
                            renderizarResultadosMovimentacao();
                        }
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
   DATAS
========================================================= */

function converterDataBrasileira(
    valor
) {
    const correspondencia =
        String(valor || "").match(
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

    /*
     * Meio-dia é proposital para evitar possíveis
     * deslocamentos de data relacionados a timezone/DST.
     */
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
        data.getMonth() !== mes - 1 ||
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
        Number.isNaN(data.getTime())
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

    return `${dia}/${mes}/${ano}`;
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

    return `${ano}-${mes}`;
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

    const textarea =
        document.getElementById(
            "textoExtratoMovimentacao"
        );

    const regrasAdicionais =
        document.getElementById(
            "regrasAdicionaisMovimentacao"
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

    if (regrasAdicionais) {
        regrasAdicionais.value = "";
    }

    if (mesesConsiderados) {
        mesesConsiderados.value = "";
    }

    if (mesesDetectados) {
        mesesDetectados.value = "";
    }

    renderizarRegrasMovimentacao();

    limparResultadosMovimentacao();
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
        document.getElementById(
            "tabelaResumoMensalMovimentacao"
        );

    const tabelaConsideradas =
        document.getElementById(
            "tabelaMovimentacoesConsideradas"
        );

    const tabelaExcluidas =
        document.getElementById(
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
        <td colspan="${colunas}">
            ${escaparHtml(mensagem)}
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