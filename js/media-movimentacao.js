/**
 * media-movimentacao.js
 * Cálculo de média de movimentação financeira
 * Caixa de Ferramentas - Sicoob Mantiqueira
 */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    /* =========================================================
       ELEMENTOS
       ========================================================= */

    const textoExtrato =
        document.getElementById("textoExtratoMovimentacao");

    const mesesDetectados =
        document.getElementById("mesesDetectadosMovimentacao");

    const mesesConsiderados =
        document.getElementById("mesesConsideradosMovimentacao");

    const btnProcessar =
        document.getElementById("btnProcessarMovimentacao");

    const btnLimpar =
        document.getElementById("btnLimparMovimentacao");

    const resultadoMedia =
        document.getElementById("resultadoMediaMovimentacao");

    const resultadoTotal =
        document.getElementById("resultadoTotalMovimentacao");

    const resultadoMeses =
        document.getElementById("resultadoMesesMovimentacao");

    const resultadoQtdConsiderados =
        document.getElementById("resultadoQtdConsiderados");

    const resultadoQtdExcluidos =
        document.getElementById("resultadoQtdExcluidos");

    const listaRegras =
        document.getElementById("listaRegrasMovimentacao");

    const resumoRegras =
        document.getElementById("resumoRegrasMovimentacao");

    const tabelaResumo =
        document.querySelector(
            "#tabelaResumoMensalMovimentacao tbody"
        );

    const tabelaConsideradas =
        document.querySelector(
            "#tabelaMovimentacoesConsideradas tbody"
        );

    const tabelaExcluidas =
        document.querySelector(
            "#tabelaMovimentacoesExcluidas tbody"
        );

    /* =========================================================
       VALIDAÇÃO
       ========================================================= */

    const elementosObrigatorios = [
        textoExtrato,
        mesesDetectados,
        mesesConsiderados,
        btnProcessar,
        btnLimpar,
        resultadoMedia,
        resultadoTotal,
        resultadoMeses,
        resultadoQtdConsiderados,
        resultadoQtdExcluidos,
        listaRegras,
        resumoRegras,
        tabelaResumo,
        tabelaConsideradas,
        tabelaExcluidas
    ];

    if (
        elementosObrigatorios.some(
            elemento => !elemento
        )
    ) {
        console.error(
            "Média de Movimentação: estrutura HTML incompleta."
        );

        return;
    }

    /* =========================================================
       ESTADO
       ========================================================= */

    let movimentacoesExtraidas = [];

    let historicosRegras = [];

    /*
     * Map:
     *
     * HISTORICO NORMALIZADO -> true/false
     *
     * true  = excluir do cálculo
     * false = considerar no cálculo
     */
    const estadoRegras =
        new Map();

    /* =========================================================
       REGRAS PADRÃO DE EXCLUSÃO
       ========================================================= */

    const REGRAS_EXCLUSAO_PADRAO = [
        {
            descricao: "Saldo anterior",
            termos: [
                "SALDO ANTERIOR"
            ]
        },
        {
            descricao: "Saldo bloqueado",
            termos: [
                "SALDO BLOQUEADO",
                "SALDO BLOQUEADO ANTERIOR"
            ]
        },
        {
            descricao: "Saldo do dia",
            termos: [
                "SALDO DO DIA"
            ]
        },
        {
            descricao: "Estorno",
            termos: [
                "ESTORNO"
            ]
        },
        {
            descricao: "Crédito de empréstimo",
            termos: [
                "CRÉD.EMPRÉSTIMO",
                "CRED.EMPRESTIMO",
                "CRÉD. EMPRÉSTIMO",
                "CRED. EMPRESTIMO",
                "CRÉDITO EMPRÉSTIMO",
                "CREDITO EMPRESTIMO"
            ]
        },
        {
            descricao: "Crédito devolução Pix",
            termos: [
                "CRÉDITO DEVOLUÇÃO PIX",
                "CREDITO DEVOLUCAO PIX"
            ]
        },
        {
            descricao: "Estorno de Pix emitido",
            termos: [
                "EST.PIX EMITIDO",
                "EST PIX EMITIDO",
                "ESTORNO PIX EMITIDO"
            ]
        },
        {
            descricao: "Resgate RDC",
            termos: [
                "RESGATE RDC"
            ]
        }
    ];

    /* =========================================================
       PADRÕES AUXILIARES DE CRÉDITO
       ========================================================= */

    const PADROES_CREDITO_SEM_INDICADOR = [
        "PIX RECEBIDO",
        "TRANSF.RECEBIDA",
        "TRANSF. RECEBIDA",
        "TRANSFERÊNCIA RECEBIDA",
        "TRANSFERENCIA RECEBIDA",
        "CRED.TRANSF",
        "CRÉD.TRANSF",
        "CRED TRANSF",
        "CRÉD TRANSF",
        "CREDITO TRANSF",
        "CRÉDITO TRANSF",
        "DEPÓSITO",
        "DEPOSITO",
        "TED RECEBIDA",
        "TED RECEBIDO"
    ];

    /* =========================================================
       UTILITÁRIOS
       ========================================================= */

    function normalizarTexto(valor) {
        return String(valor || "")
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .replace(/\s+/g, " ")
            .trim()
            .toUpperCase();
    }

    function moedaParaNumero(valor) {
        if (
            valor === null ||
            valor === undefined ||
            valor === ""
        ) {
            return 0;
        }

        let texto =
            String(valor)
                .trim()
                .replace(/\s+/g, "");

        texto =
            texto.replace(
                /[CD*]$/i,
                ""
            );

        if (
            texto.includes(",") &&
            texto.includes(".")
        ) {
            texto =
                texto
                    .replace(/\./g, "")
                    .replace(",", ".");
        } else if (
            texto.includes(",")
        ) {
            texto =
                texto.replace(
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
            Number(texto);

        return Number.isFinite(numero)
            ? numero
            : 0;
    }

    function formatarMoeda(valor) {
        return Number(
            valor || 0
        ).toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );
    }

    function obterChaveMes(dataTexto) {
        const match =
            String(dataTexto).match(
                /^(\d{2})\/(\d{2})\/(\d{4})$/
            );

        if (!match) {
            return "";
        }

        return `${match[3]}-${match[2]}`;
    }

    function formatarMes(chaveMes) {
        if (!chaveMes) {
            return "-";
        }

        const partes =
            chaveMes.split("-");

        if (
            partes.length !== 2
        ) {
            return chaveMes;
        }

        const ano =
            Number(partes[0]);

        const mes =
            Number(partes[1]);

        return new Date(
            ano,
            mes - 1,
            1
        ).toLocaleDateString(
            "pt-BR",
            {
                month: "long",
                year: "numeric"
            }
        );
    }

    /* =========================================================
       VALOR
       ========================================================= */

    function localizarValorFinal(linha) {
        const match =
            String(linha || "")
                .match(
                    /(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})([CD*])?\s*$/
                );

        if (!match) {
            return null;
        }

        return {
            texto:
                match[0].trim(),

            numero:
                moedaParaNumero(
                    match[1]
                ),

            indicador:
                String(
                    match[2] || ""
                ).toUpperCase(),

            indice:
                match.index
        };
    }

    /* =========================================================
       COLUNAS
       ========================================================= */

    function extrairColunasComTabulacao(
        linha
    ) {
        return String(
            linha || ""
        )
            .split("\t")
            .map(
                item =>
                    item.trim()
            );
    }

    function extrairDocumentoHistorico(
        linha,
        dataTexto,
        valorInfo
    ) {
        const colunas =
            extrairColunasComTabulacao(
                linha
            );

        if (
            colunas.length >= 4 &&
            String(
                colunas[0] || ""
            ).startsWith(dataTexto)
        ) {
            return {
                documento:
                    colunas[1] || "",

                historico:
                    colunas
                        .slice(
                            2,
                            colunas.length - 1
                        )
                        .filter(Boolean)
                        .join(" ")
                        .trim()
            };
        }

        const meio =
            linha
                .substring(
                    dataTexto.length,
                    valorInfo.indice
                )
                .trim();

        const partes =
            meio
                .split(
                    /\s{2,}|\t+/
                )
                .map(
                    item =>
                        item.trim()
                )
                .filter(Boolean);

        if (
            partes.length >= 2
        ) {
            return {
                documento:
                    partes[0],

                historico:
                    partes
                        .slice(1)
                        .join(" ")
            };
        }

        return {
            documento: "",
            historico: meio
        };
    }

    /* =========================================================
       EXTRAÇÃO
       ========================================================= */

    function linhaEhMovimentacao(linha) {
        return /^\d{2}\/\d{2}\/\d{4}/
            .test(
                String(
                    linha || ""
                ).trim()
            );
    }

    function extrairMovimentacoes(texto) {
        const linhas =
            String(texto || "")
                .replace(/\r/g, "")
                .split("\n");

        const movimentos = [];

        linhas.forEach(
            (
                linhaOriginal,
                indice
            ) => {
                const linha =
                    String(
                        linhaOriginal || ""
                    )
                        .replace(
                            /\u00A0/g,
                            " "
                        )
                        .trim();

                if (
                    !linha ||
                    !linhaEhMovimentacao(
                        linha
                    )
                ) {
                    return;
                }

                const dataMatch =
                    linha.match(
                        /^(\d{2}\/\d{2}\/\d{4})/
                    );

                if (!dataMatch) {
                    return;
                }

                const valorInfo =
                    localizarValorFinal(
                        linha
                    );

                if (!valorInfo) {
                    return;
                }

                const data =
                    dataMatch[1];

                const dados =
                    extrairDocumentoHistorico(
                        linha,
                        data,
                        valorInfo
                    );

                const historico =
                    dados.historico || "";

                movimentos.push({
                    indiceLinha:
                        indice + 1,

                    data,

                    mes:
                        obterChaveMes(data),

                    documento:
                        dados.documento || "",

                    historico,

                    historicoNormalizado:
                        normalizarTexto(
                            historico
                        ),

                    valor:
                        valorInfo.numero,

                    indicador:
                        valorInfo.indicador,

                    considerado:
                        false,

                    excluido:
                        false,

                    motivoExclusao:
                        ""
                });
            }
        );

        return movimentos;
    }

    /* =========================================================
       CRÉDITO OU DÉBITO
       ========================================================= */

    function historicoPareceCredito(
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

        return PADROES_CREDITO_SEM_INDICADOR
            .some(
                termo =>
                    movimentacao
                        .historicoNormalizado
                        .includes(
                            normalizarTexto(
                                termo
                            )
                        )
            );
    }

    /* =========================================================
       REGRA PADRÃO
       ========================================================= */

    function obterRegraPadrao(
        historicoNormalizado
    ) {
        for (
            const regra
            of REGRAS_EXCLUSAO_PADRAO
        ) {
            for (
                const termoOriginal
                of regra.termos
            ) {
                const termo =
                    normalizarTexto(
                        termoOriginal
                    );

                if (
                    historicoNormalizado
                        .includes(
                            termo
                        )
                ) {
                    return regra;
                }
            }
        }

        return null;
    }

    /* =========================================================
       HISTÓRICOS EXISTENTES NO EXTRATO
       ========================================================= */

    function montarDadosHistoricos() {
        const mapa =
            new Map();

        movimentacoesExtraidas
            .forEach(
                movimentacao => {
                    const chave =
                        movimentacao
                            .historicoNormalizado;

                    if (!chave) {
                        return;
                    }

                    if (
                        !mapa.has(chave)
                    ) {
                        mapa.set(
                            chave,
                            {
                                chave,

                                historico:
                                    movimentacao
                                        .historico,

                                quantidade:
                                    0,

                                quantidadeCredito:
                                    0,

                                quantidadeDebito:
                                    0,

                                totalCredito:
                                    0,

                                regraPadrao:
                                    obterRegraPadrao(
                                        chave
                                    )
                            }
                        );
                    }

                    const registro =
                        mapa.get(chave);

                    registro.quantidade +=
                        1;

                    if (
                        historicoPareceCredito(
                            movimentacao
                        )
                    ) {
                        registro
                            .quantidadeCredito +=
                            1;

                        registro.totalCredito +=
                            movimentacao.valor;
                    } else {
                        registro
                            .quantidadeDebito +=
                            1;
                    }
                }
            );

        historicosRegras =
            Array.from(
                mapa.values()
            )
                .sort(
                    (a, b) => {
                        const aCredito =
                            a.quantidadeCredito > 0
                                ? 0
                                : 1;

                        const bCredito =
                            b.quantidadeCredito > 0
                                ? 0
                                : 1;

                        if (
                            aCredito !==
                            bCredito
                        ) {
                            return (
                                aCredito -
                                bCredito
                            );
                        }

                        return a.historico
                            .localeCompare(
                                b.historico,
                                "pt-BR"
                            );
                    }
                );

        estadoRegras.clear();

        historicosRegras.forEach(
            item => {
                /*
                 * Só créditos precisam de regra
                 * configurável.
                 */
                if (
                    item.quantidadeCredito <= 0
                ) {
                    return;
                }

                /*
                 * Se estiver em uma regra padrão,
                 * inicia excluído.
                 */
                estadoRegras.set(
                    item.chave,
                    Boolean(
                        item.regraPadrao
                    )
                );
            }
        );
    }

    /* =========================================================
       HISTÓRICOS INFORMATIVOS NÃO DATADOS
       ========================================================= */

    function obterInformativosPresentes(
        texto
    ) {
        const textoNormalizado =
            normalizarTexto(texto);

        const informativos = [
            {
                historico:
                    "SALDO DO DIA ===== >",

                termos: [
                    "SALDO DO DIA"
                ]
            },
            {
                historico:
                    "SALDO BLOQUEADO ANTERIOR",

                termos: [
                    "SALDO BLOQUEADO ANTERIOR"
                ]
            }
        ];

        return informativos.filter(
            item =>
                item.termos.some(
                    termo =>
                        textoNormalizado
                            .includes(
                                normalizarTexto(
                                    termo
                                )
                            )
                )
        );
    }

    /* =========================================================
       MONTAGEM VISUAL DAS REGRAS
       ========================================================= */

    function montarListaRegras() {
        listaRegras.innerHTML = "";

        if (
            !historicosRegras.length
        ) {
            listaRegras.innerHTML = `
                <div class="sem-dados">
                    Nenhum histórico identificado.
                </div>
            `;

            resumoRegras.textContent =
                "Processe um extrato para visualizar os históricos encontrados.";

            return;
        }

        historicosRegras.forEach(
            item => {
                const label =
                    document.createElement(
                        "label"
                    );

                label.className =
                    "opcao-simulacao";

                const checkbox =
                    document.createElement(
                        "input"
                    );

                checkbox.type =
                    "checkbox";

                const temCredito =
                    item.quantidadeCredito > 0;

                /*
                 * CHECKED = EXCLUIR DO CÁLCULO
                 */
                if (temCredito) {
                    checkbox.checked =
                        estadoRegras.get(
                            item.chave
                        ) === true;
                } else {
                    /*
                     * Débitos já são ignorados
                     * automaticamente.
                     */
                    checkbox.checked =
                        true;

                    checkbox.disabled =
                        true;
                }

                const conteudo =
                    document.createElement(
                        "div"
                    );

                conteudo.className =
                    "opcao-simulacao-conteudo";

                const titulo =
                    document.createElement(
                        "strong"
                    );

                titulo.textContent =
                    item.historico;

                const detalhes =
                    document.createElement(
                        "small"
                    );

                if (temCredito) {
                    const textoRegra =
                        checkbox.checked
                            ? "EXCLUÍDO DO CÁLCULO"
                            : "CONSIDERADO NO CÁLCULO";

                    detalhes.textContent =
                        `${textoRegra} • ` +
                        `${item.quantidadeCredito} crédito(s) • ` +
                        `${formatarMoeda(item.totalCredito)}`;
                } else {
                    detalhes.textContent =
                        `IGNORADO AUTOMATICAMENTE • ` +
                        `${item.quantidadeDebito} débito(s)`;
                }

                conteudo.appendChild(
                    titulo
                );

                conteudo.appendChild(
                    detalhes
                );

                label.appendChild(
                    checkbox
                );

                label.appendChild(
                    conteudo
                );

                if (temCredito) {
                    checkbox.addEventListener(
                        "change",
                        () => {
                            estadoRegras.set(
                                item.chave,
                                checkbox.checked
                            );

                            classificarMovimentacoes();

                            atualizarResultados();

                            montarListaRegras();
                        }
                    );
                }

                listaRegras.appendChild(
                    label
                );
            }
        );

        /*
         * Adiciona informativos encontrados
         * no extrato que não possuem linha
         * de movimentação datada.
         */
        const informativos =
            obterInformativosPresentes(
                textoExtrato.value
            );

        informativos.forEach(
            item => {
                const jaExiste =
                    historicosRegras.some(
                        historico =>
                            normalizarTexto(
                                historico.historico
                            ).includes(
                                normalizarTexto(
                                    item.historico
                                )
                            )
                    );

                if (jaExiste) {
                    return;
                }

                const label =
                    document.createElement(
                        "label"
                    );

                label.className =
                    "opcao-simulacao";

                const checkbox =
                    document.createElement(
                        "input"
                    );

                checkbox.type =
                    "checkbox";

                checkbox.checked =
                    true;

                checkbox.disabled =
                    true;

                const conteudo =
                    document.createElement(
                        "div"
                    );

                conteudo.className =
                    "opcao-simulacao-conteudo";

                const titulo =
                    document.createElement(
                        "strong"
                    );

                titulo.textContent =
                    item.historico;

                const detalhes =
                    document.createElement(
                        "small"
                    );

                detalhes.textContent =
                    "INFORMATIVO • REMOVIDO AUTOMATICAMENTE";

                conteudo.appendChild(
                    titulo
                );

                conteudo.appendChild(
                    detalhes
                );

                label.appendChild(
                    checkbox
                );

                label.appendChild(
                    conteudo
                );

                listaRegras.appendChild(
                    label
                );
            }
        );

        atualizarResumoRegras();
    }

    function atualizarResumoRegras() {
        const totalHistoricos =
            historicosRegras.length;

        const historicosCredito =
            historicosRegras.filter(
                item =>
                    item.quantidadeCredito > 0
            );

        const excluidos =
            historicosCredito.filter(
                item =>
                    estadoRegras.get(
                        item.chave
                    ) === true
            );

        const considerados =
            historicosCredito.length -
            excluidos.length;

        resumoRegras.textContent =
            `${totalHistoricos} histórico(s) encontrado(s) no extrato. ` +
            `${considerados} histórico(s) de crédito considerado(s) e ` +
            `${excluidos.length} histórico(s) de crédito excluído(s). ` +
            `Históricos de débito são ignorados automaticamente.`;
    }

    /* =========================================================
       CLASSIFICAÇÃO
       ========================================================= */

    function classificarMovimentacoes() {
        movimentacoesExtraidas =
            movimentacoesExtraidas.map(
                movimentacao => {
                    const atualizada = {
                        ...movimentacao,

                        considerado:
                            false,

                        excluido:
                            false,

                        motivoExclusao:
                            ""
                    };

                    if (
                        !historicoPareceCredito(
                            atualizada
                        )
                    ) {
                        return atualizada;
                    }

                    const regraUsuario =
                        estadoRegras.get(
                            atualizada
                                .historicoNormalizado
                        );

                    if (
                        regraUsuario === true
                    ) {
                        atualizada.excluido =
                            true;

                        const regraPadrao =
                            obterRegraPadrao(
                                atualizada
                                    .historicoNormalizado
                            );

                        atualizada
                            .motivoExclusao =
                            regraPadrao
                                ? regraPadrao.descricao
                                : "Exclusão definida na regra";

                        return atualizada;
                    }

                    if (
                        !Number.isFinite(
                            atualizada.valor
                        ) ||
                        atualizada.valor <= 0
                    ) {
                        return atualizada;
                    }

                    atualizada.considerado =
                        true;

                    return atualizada;
                }
            );
    }

    /* =========================================================
       PERÍODO
       ========================================================= */

    function detectarQuantidadeExtratos() {
        const saldosAnteriores =
            movimentacoesExtraidas.filter(
                movimentacao =>
                    movimentacao
                        .historicoNormalizado ===
                    "SALDO ANTERIOR"
            );

        if (
            saldosAnteriores.length > 0
        ) {
            return saldosAnteriores.length;
        }

        const meses =
            new Set(
                movimentacoesExtraidas
                    .map(
                        item =>
                            item.mes
                    )
                    .filter(Boolean)
            );

        return meses.size;
    }

    function obterQuantidadeMesesCalculo() {
        const manual =
            Number(
                mesesConsiderados.value
            );

        if (
            Number.isFinite(manual) &&
            manual > 0
        ) {
            return Math.floor(
                manual
            );
        }

        const detectados =
            Number(
                mesesDetectados.value
            );

        if (
            Number.isFinite(
                detectados
            ) &&
            detectados > 0
        ) {
            return Math.floor(
                detectados
            );
        }

        return 0;
    }

    /* =========================================================
       FILTROS
       ========================================================= */

    function obterConsideradas() {
        return movimentacoesExtraidas
            .filter(
                item =>
                    item.considerado
            );
    }

    function obterExcluidas() {
        return movimentacoesExtraidas
            .filter(
                item =>
                    item.excluido
            );
    }

    /* =========================================================
       RESUMO MENSAL
       ========================================================= */

    function calcularResumoMensal(
        consideradas
    ) {
        const resumo =
            new Map();

        consideradas.forEach(
            item => {
                if (!item.mes) {
                    return;
                }

                if (
                    !resumo.has(
                        item.mes
                    )
                ) {
                    resumo.set(
                        item.mes,
                        {
                            mes:
                                item.mes,

                            quantidade:
                                0,

                            total:
                                0
                        }
                    );
                }

                const registro =
                    resumo.get(
                        item.mes
                    );

                registro.quantidade +=
                    1;

                registro.total +=
                    item.valor;
            }
        );

        return Array.from(
            resumo.values()
        ).sort(
            (a, b) =>
                a.mes.localeCompare(
                    b.mes
                )
        );
    }

    /* =========================================================
       CÉLULA
       ========================================================= */

    function criarCelula(
        texto,
        alinhamento = ""
    ) {
        const td =
            document.createElement(
                "td"
            );

        td.textContent =
            texto;

        if (alinhamento) {
            td.style.textAlign =
                alinhamento;
        }

        return td;
    }

    /* =========================================================
       TABELA CONSIDERADAS
       ========================================================= */

    function preencherTabelaConsideradas(
        registros
    ) {
        tabelaConsideradas.innerHTML =
            "";

        if (!registros.length) {
            tabelaConsideradas.innerHTML = `
                <tr>
                    <td colspan="4" class="sem-dados">
                        Nenhuma movimentação de crédito considerada.
                    </td>
                </tr>
            `;

            return;
        }

        registros.forEach(
            item => {
                const tr =
                    document.createElement(
                        "tr"
                    );

                tr.appendChild(
                    criarCelula(
                        item.data
                    )
                );

                tr.appendChild(
                    criarCelula(
                        item.documento ||
                        "-"
                    )
                );

                tr.appendChild(
                    criarCelula(
                        item.historico ||
                        "-"
                    )
                );

                tr.appendChild(
                    criarCelula(
                        formatarMoeda(
                            item.valor
                        ),
                        "right"
                    )
                );

                tabelaConsideradas
                    .appendChild(tr);
            }
        );
    }

    /* =========================================================
       TABELA EXCLUÍDAS
       ========================================================= */

    function preencherTabelaExcluidas(
        registros
    ) {
        tabelaExcluidas.innerHTML =
            "";

        if (!registros.length) {
            tabelaExcluidas.innerHTML = `
                <tr>
                    <td colspan="5" class="sem-dados">
                        Nenhum crédito removido pelas regras.
                    </td>
                </tr>
            `;

            return;
        }

        registros.forEach(
            item => {
                const tr =
                    document.createElement(
                        "tr"
                    );

                tr.appendChild(
                    criarCelula(
                        item.data
                    )
                );

                tr.appendChild(
                    criarCelula(
                        item.documento ||
                        "-"
                    )
                );

                tr.appendChild(
                    criarCelula(
                        item.historico ||
                        "-"
                    )
                );

                tr.appendChild(
                    criarCelula(
                        formatarMoeda(
                            item.valor
                        ),
                        "right"
                    )
                );

                tr.appendChild(
                    criarCelula(
                        item
                            .motivoExclusao ||
                        "Regra de exclusão"
                    )
                );

                tabelaExcluidas
                    .appendChild(tr);
            }
        );
    }

    /* =========================================================
       TABELA RESUMO
       ========================================================= */

    function preencherResumoMensal(
        registros
    ) {
        tabelaResumo.innerHTML =
            "";

        if (!registros.length) {
            tabelaResumo.innerHTML = `
                <tr>
                    <td colspan="3" class="sem-dados">
                        Nenhuma movimentação mensal disponível.
                    </td>
                </tr>
            `;

            return;
        }

        registros.forEach(
            item => {
                const tr =
                    document.createElement(
                        "tr"
                    );

                tr.appendChild(
                    criarCelula(
                        formatarMes(
                            item.mes
                        )
                    )
                );

                tr.appendChild(
                    criarCelula(
                        String(
                            item.quantidade
                        ),
                        "right"
                    )
                );

                tr.appendChild(
                    criarCelula(
                        formatarMoeda(
                            item.total
                        ),
                        "right"
                    )
                );

                tabelaResumo
                    .appendChild(tr);
            }
        );
    }

    /* =========================================================
       RESULTADOS
       ========================================================= */

    function atualizarResultados() {
        const consideradas =
            obterConsideradas();

        const excluidas =
            obterExcluidas();

        const total =
            consideradas.reduce(
                (
                    soma,
                    item
                ) =>
                    soma +
                    item.valor,
                0
            );

        const meses =
            obterQuantidadeMesesCalculo();

        const media =
            meses > 0
                ? total / meses
                : 0;

        resultadoTotal.textContent =
            formatarMoeda(
                total
            );

        resultadoMedia.textContent =
            formatarMoeda(
                media
            );

        resultadoMeses.textContent =
            String(
                meses
            );

        resultadoQtdConsiderados
            .textContent =
            String(
                consideradas.length
            );

        resultadoQtdExcluidos
            .textContent =
            String(
                excluidas.length
            );

        preencherTabelaConsideradas(
            consideradas
        );

        preencherTabelaExcluidas(
            excluidas
        );

        preencherResumoMensal(
            calcularResumoMensal(
                consideradas
            )
        );

        atualizarResumoRegras();
    }

    /* =========================================================
       PROCESSAR
       ========================================================= */

    function processarExtrato() {
        const texto =
            textoExtrato.value.trim();

        if (!texto) {
            limparTudo();
            return;
        }

        movimentacoesExtraidas =
            extrairMovimentacoes(
                texto
            );

        const quantidadeExtratos =
            detectarQuantidadeExtratos();

        mesesDetectados.value =
            String(
                quantidadeExtratos
            );

        mesesConsiderados.value =
            quantidadeExtratos > 0
                ? String(
                    quantidadeExtratos
                )
                : "";

        montarDadosHistoricos();

        classificarMovimentacoes();

        atualizarResultados();

        montarListaRegras();

        console.info(
            "Média de Movimentação - processamento concluído:",
            {
                movimentacoes:
                    movimentacoesExtraidas
                        .length,

                meses:
                    quantidadeExtratos,

                historicos:
                    historicosRegras
                        .length,

                considerados:
                    obterConsideradas()
                        .length,

                excluidos:
                    obterExcluidas()
                        .length
            }
        );
    }

    /* =========================================================
       LIMPAR
       ========================================================= */

    function limparTudo() {
        textoExtrato.value =
            "";

        movimentacoesExtraidas =
            [];

        historicosRegras =
            [];

        estadoRegras.clear();

        mesesDetectados.value =
            "0";

        mesesConsiderados.value =
            "";

        listaRegras.innerHTML = `
            <div class="sem-dados">
                Nenhum histórico identificado.
            </div>
        `;

        resumoRegras.textContent =
            "Processe um extrato para visualizar os históricos encontrados.";

        atualizarResultados();

        textoExtrato.focus();
    }

    /* =========================================================
       EVENTOS
       ========================================================= */

    btnProcessar.addEventListener(
        "click",
        processarExtrato
    );

    btnLimpar.addEventListener(
        "click",
        limparTudo
    );

    mesesConsiderados
        .addEventListener(
            "input",
            atualizarResultados
        );

    textoExtrato
        .addEventListener(
            "keydown",
            event => {
                if (
                    event.ctrlKey &&
                    event.key ===
                    "Enter"
                ) {
                    event.preventDefault();

                    processarExtrato();
                }
            }
        );

    /* =========================================================
       INICIALIZAÇÃO
       ========================================================= */

    atualizarResultados();
});