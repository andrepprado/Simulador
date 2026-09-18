/**
 * media-movimentacao.js
 * Cálculo de média de movimentação financeira
 * Caixa de Ferramentas - Sicoob Mantiqueira
 */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    /* =========================================================
       ELEMENTOS DA PÁGINA
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
       VALIDAÇÃO DA ESTRUTURA DO HTML
       ========================================================= */

    const elementosObrigatorios = [
        {
            nome: "#textoExtratoMovimentacao",
            elemento: textoExtrato
        },
        {
            nome: "#mesesDetectadosMovimentacao",
            elemento: mesesDetectados
        },
        {
            nome: "#mesesConsideradosMovimentacao",
            elemento: mesesConsiderados
        },
        {
            nome: "#btnProcessarMovimentacao",
            elemento: btnProcessar
        },
        {
            nome: "#btnLimparMovimentacao",
            elemento: btnLimpar
        },
        {
            nome: "#resultadoMediaMovimentacao",
            elemento: resultadoMedia
        },
        {
            nome: "#resultadoTotalMovimentacao",
            elemento: resultadoTotal
        },
        {
            nome: "#resultadoMesesMovimentacao",
            elemento: resultadoMeses
        },
        {
            nome: "#resultadoQtdConsiderados",
            elemento: resultadoQtdConsiderados
        },
        {
            nome: "#resultadoQtdExcluidos",
            elemento: resultadoQtdExcluidos
        },
        {
            nome: "#tabelaResumoMensalMovimentacao tbody",
            elemento: tabelaResumo
        },
        {
            nome: "#tabelaMovimentacoesConsideradas tbody",
            elemento: tabelaConsideradas
        },
        {
            nome: "#tabelaMovimentacoesExcluidas tbody",
            elemento: tabelaExcluidas
        }
    ];

    const elementosAusentes =
        elementosObrigatorios.filter(
            item => !item.elemento
        );

    if (elementosAusentes.length > 0) {
        console.error(
            "Média de Movimentação: elementos obrigatórios não encontrados:",
            elementosAusentes.map(item => item.nome)
        );

        return;
    }

    /* =========================================================
       ESTADO
       ========================================================= */

    let movimentacoesExtraidas = [];

    /* =========================================================
       REGRAS INTERNAS DE EXCLUSÃO
       ========================================================= */

    const REGRAS_EXCLUSAO_PADRAO = [
        {
            id: "saldo_anterior",
            descricao: "Saldo anterior",
            termos: [
                "SALDO ANTERIOR"
            ]
        },
        {
            id: "saldo_bloqueado",
            descricao: "Saldo bloqueado",
            termos: [
                "SALDO BLOQUEADO",
                "SALDO BLOQUEADO ANTERIOR"
            ]
        },
        {
            id: "saldo_dia",
            descricao: "Saldo do dia",
            termos: [
                "SALDO DO DIA"
            ]
        },
        {
            id: "estorno",
            descricao: "Estorno",
            termos: [
                "ESTORNO"
            ]
        },
        {
            id: "credito_emprestimo",
            descricao: "Crédito de empréstimo",
            termos: [
                "CRÉD.EMPRÉSTIMO",
                "CRED.EMPRESTIMO",
                "CRÉD. EMPRÉSTIMO",
                "CRED. EMPRESTIMO",
                "CRÉDITO EMPRÉSTIMO",
                "CREDITO EMPRESTIMO"
            ]
        }
    ];

    /*
     * Históricos que caracterizam entrada de recursos
     * mesmo quando o indicador C não estiver disponível.
     */
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
            .replace(/[\u0300-\u036f]/g, "")
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

        if (typeof valor === "number") {
            return Number.isFinite(valor)
                ? valor
                : 0;
        }

        let texto = String(valor)
            .trim()
            .replace(/\s+/g, "");

        /*
         * Remove indicador de crédito, débito ou
         * valor informativo do SISBR.
         */
        texto = texto.replace(/[CD*]$/i, "");

        if (!texto) {
            return 0;
        }

        /*
         * Formato brasileiro:
         * 18.295,47 -> 18295.47
         */
        if (
            texto.includes(",") &&
            texto.includes(".")
        ) {
            texto = texto
                .replace(/\./g, "")
                .replace(",", ".");
        } else if (texto.includes(",")) {
            texto = texto.replace(",", ".");
        }

        texto = texto.replace(/[^\d.-]/g, "");

        const numero = Number(texto);

        return Number.isFinite(numero)
            ? numero
            : 0;
    }

    function formatarMoeda(valor) {
        return Number(valor || 0)
            .toLocaleString(
                "pt-BR",
                {
                    style: "currency",
                    currency: "BRL"
                }
            );
    }

    function formatarMes(chaveMes) {
        if (!chaveMes) {
            return "-";
        }

        const partes = chaveMes.split("-");

        if (partes.length !== 2) {
            return chaveMes;
        }

        const ano = Number(partes[0]);
        const mes = Number(partes[1]);

        if (
            !Number.isInteger(ano) ||
            !Number.isInteger(mes) ||
            mes < 1 ||
            mes > 12
        ) {
            return chaveMes;
        }

        const data = new Date(
            ano,
            mes - 1,
            1
        );

        return data.toLocaleDateString(
            "pt-BR",
            {
                month: "long",
                year: "numeric"
            }
        );
    }

    function obterChaveMes(dataTexto) {
        const match = String(dataTexto)
            .match(
                /^(\d{2})\/(\d{2})\/(\d{4})$/
            );

        if (!match) {
            return "";
        }

        const mes = match[2];
        const ano = match[3];

        return `${ano}-${mes}`;
    }

    function identificarIndicador(valorTexto) {
        const texto = String(valorTexto || "")
            .trim()
            .toUpperCase();

        if (texto.endsWith("C")) {
            return "C";
        }

        if (texto.endsWith("D")) {
            return "D";
        }

        if (texto.endsWith("*")) {
            return "*";
        }

        return "";
    }

    /* =========================================================
       LOCALIZAÇÃO DO VALOR NO FINAL DA LINHA
       ========================================================= */

    function localizarValorFinal(linha) {
        const match = String(linha || "").match(
            /(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})([CD*])?\s*$/
        );

        if (!match) {
            return null;
        }

        return {
            texto: match[0].trim(),
            numero: moedaParaNumero(match[1]),
            indicador: (
                match[2] || ""
            ).toUpperCase(),
            indice: match.index
        };
    }

    /* =========================================================
       COLUNAS DO EXTRATO
       ========================================================= */

    function extrairColunasComTabulacao(linha) {
        /*
         * split("\t") é intencional.
         *
         * Não utilizamos /\t+/ porque isso eliminaria
         * colunas vazias, como ocorre em:
         *
         * DATA    [documento vazio]    SALDO ANTERIOR    VALOR
         */
        return String(linha || "")
            .split("\t")
            .map(item => item.trim());
    }

    function extrairDocumentoHistorico(
        linha,
        dataTexto,
        valorInfo
    ) {
        const colunas =
            extrairColunasComTabulacao(linha);

        /*
         * Formato SISBR esperado:
         *
         * DATA | DOCUMENTO | HISTÓRICO | VALOR
         */
        if (colunas.length >= 4) {
            const primeiraColuna =
                colunas[0] || "";

            if (
                primeiraColuna.startsWith(
                    dataTexto
                )
            ) {
                const documento =
                    colunas[1] || "";

                const historico =
                    colunas
                        .slice(
                            2,
                            colunas.length - 1
                        )
                        .filter(Boolean)
                        .join(" ")
                        .trim();

                return {
                    documento,
                    historico
                };
            }
        }

        /*
         * Fallback para texto copiado sem manutenção
         * adequada das tabulações.
         */
        let meio = linha
            .substring(
                dataTexto.length,
                valorInfo.indice
            )
            .trim();

        /*
         * Em texto simples, sequências grandes de
         * espaços são tratadas como separadores.
         */
        const partes = meio
            .split(/\s{2,}|\t+/)
            .map(item => item.trim())
            .filter(Boolean);

        if (partes.length >= 2) {
            return {
                documento: partes[0],
                historico:
                    partes
                        .slice(1)
                        .join(" ")
                        .trim()
            };
        }

        /*
         * Se não for possível separar documento e
         * histórico com segurança, mantém tudo como
         * histórico.
         */
        return {
            documento: "",
            historico: meio
        };
    }

    /* =========================================================
       IDENTIFICAÇÃO DAS LINHAS DE MOVIMENTAÇÃO
       ========================================================= */

    function linhaEhMovimentacao(linha) {
        return /^\d{2}\/\d{2}\/\d{4}/
            .test(
                String(linha || "").trim()
            );
    }

    /* =========================================================
       EXTRAÇÃO DAS MOVIMENTAÇÕES
       ========================================================= */

    function extrairMovimentacoes(texto) {
        const linhas = String(texto || "")
            .replace(/\r/g, "")
            .split("\n");

        const movimentos = [];

        linhas.forEach(
            (linhaOriginal, indice) => {
                const linha =
                    String(linhaOriginal || "")
                        .replace(/\u00A0/g, " ")
                        .trim();

                if (!linha) {
                    return;
                }

                /*
                 * Ignora cabeçalhos, rodapés, resumo,
                 * informações complementares,
                 * destinatários de PIX etc.
                 */
                if (!linhaEhMovimentacao(linha)) {
                    return;
                }

                const dataMatch = linha.match(
                    /^(\d{2}\/\d{2}\/\d{4})/
                );

                if (!dataMatch) {
                    return;
                }

                const data =
                    dataMatch[1];

                const valorInfo =
                    localizarValorFinal(linha);

                /*
                 * Linhas com data mas sem valor monetário
                 * no final não são movimentações válidas.
                 */
                if (!valorInfo) {
                    return;
                }

                const dados =
                    extrairDocumentoHistorico(
                        linha,
                        data,
                        valorInfo
                    );

                const indicador =
                    valorInfo.indicador ||
                    identificarIndicador(
                        valorInfo.texto
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

                    valorOriginal:
                        valorInfo.texto,

                    indicador,

                    considerado: false,

                    excluido: false,

                    motivoExclusao: ""
                });
            }
        );

        return movimentos;
    }

    /* =========================================================
       IDENTIFICAÇÃO DE CRÉDITOS
       ========================================================= */

    function historicoPareceCredito(
        movimentacao
    ) {
        /*
         * O indicador C do SISBR tem prioridade.
         */
        if (
            movimentacao.indicador === "C"
        ) {
            return true;
        }

        /*
         * D = débito
         * * = valor informativo/bloqueado
         */
        if (
            movimentacao.indicador === "D" ||
            movimentacao.indicador === "*"
        ) {
            return false;
        }

        /*
         * Fallback para cópias em que o C não tenha
         * sido preservado.
         */
        const historico =
            movimentacao.historicoNormalizado;

        return PADROES_CREDITO_SEM_INDICADOR
            .some(termo => {
                const termoNormalizado =
                    normalizarTexto(termo);

                return historico.includes(
                    termoNormalizado
                );
            });
    }

    /* =========================================================
       MOTOR DE EXCLUSÃO
       ========================================================= */

    function verificarExclusao(
        movimentacao
    ) {
        const historico =
            movimentacao.historicoNormalizado;

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
                    termo &&
                    historico.includes(termo)
                ) {
                    return {
                        excluido: true,
                        motivo:
                            regra.descricao
                    };
                }
            }
        }

        return {
            excluido: false,
            motivo: ""
        };
    }

    /* =========================================================
       CLASSIFICAÇÃO DAS MOVIMENTAÇÕES
       ========================================================= */

    function classificarMovimentacoes() {
        movimentacoesExtraidas =
            movimentacoesExtraidas.map(
                movimentacao => {
                    const atualizada = {
                        ...movimentacao,
                        considerado: false,
                        excluido: false,
                        motivoExclusao: ""
                    };

                    /*
                     * Primeiro verifica se a movimentação
                     * representa crédito.
                     *
                     * Débitos não compõem a média.
                     */
                    if (
                        !historicoPareceCredito(
                            atualizada
                        )
                    ) {
                        return atualizada;
                    }

                    /*
                     * Depois aplica as regras de exclusão
                     * somente sobre os créditos.
                     */
                    const exclusao =
                        verificarExclusao(
                            atualizada
                        );

                    if (exclusao.excluido) {
                        atualizada.excluido =
                            true;

                        atualizada.motivoExclusao =
                            exclusao.motivo;

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
       DETECÇÃO DO PERÍODO
       ========================================================= */

    function detectarQuantidadeExtratos() {
        /*
         * Cada extrato mensal do SISBR possui,
         * normalmente, uma linha SALDO ANTERIOR.
         */
        const saldosAnteriores =
            movimentacoesExtraidas.filter(
                movimentacao =>
                    movimentacao
                        .historicoNormalizado
                        .includes(
                            "SALDO ANTERIOR"
                        ) &&
                    !movimentacao
                        .historicoNormalizado
                        .includes(
                            "SALDO BLOQUEADO ANTERIOR"
                        )
            );

        if (
            saldosAnteriores.length > 0
        ) {
            return saldosAnteriores.length;
        }

        /*
         * Fallback:
         * utiliza os meses distintos encontrados
         * nas movimentações.
         */
        const meses = new Set(
            movimentacoesExtraidas
                .map(item => item.mes)
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
            return Math.floor(manual);
        }

        const detectados =
            Number(
                mesesDetectados.value
            );

        if (
            Number.isFinite(detectados) &&
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
        const resumo = new Map();

        consideradas.forEach(item => {
            if (!item.mes) {
                return;
            }

            if (!resumo.has(item.mes)) {
                resumo.set(
                    item.mes,
                    {
                        mes: item.mes,
                        quantidade: 0,
                        total: 0
                    }
                );
            }

            const registro =
                resumo.get(item.mes);

            registro.quantidade += 1;
            registro.total += item.valor;
        });

        return Array
            .from(
                resumo.values()
            )
            .sort(
                (a, b) =>
                    a.mes.localeCompare(
                        b.mes
                    )
            );
    }

    /* =========================================================
       CRIAÇÃO DE CÉLULAS
       ========================================================= */

    function criarCelula(
        texto,
        alinhamento = ""
    ) {
        const td =
            document.createElement("td");

        td.textContent =
            texto;

        if (alinhamento) {
            td.style.textAlign =
                alinhamento;
        }

        return td;
    }

    /* =========================================================
       TABELA - CONSIDERADAS
       ========================================================= */

    function preencherTabelaConsideradas(
        registros
    ) {
        tabelaConsideradas.innerHTML = "";

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

        registros.forEach(item => {
            const tr =
                document.createElement("tr");

            tr.appendChild(
                criarCelula(
                    item.data
                )
            );

            tr.appendChild(
                criarCelula(
                    item.documento || "-"
                )
            );

            tr.appendChild(
                criarCelula(
                    item.historico || "-"
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
        });
    }

    /* =========================================================
       TABELA - EXCLUÍDAS
       ========================================================= */

    function preencherTabelaExcluidas(
        registros
    ) {
        tabelaExcluidas.innerHTML = "";

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

        registros.forEach(item => {
            const tr =
                document.createElement("tr");

            tr.appendChild(
                criarCelula(
                    item.data
                )
            );

            tr.appendChild(
                criarCelula(
                    item.documento || "-"
                )
            );

            tr.appendChild(
                criarCelula(
                    item.historico || "-"
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
                    item.motivoExclusao ||
                    "Regra de exclusão"
                )
            );

            tabelaExcluidas
                .appendChild(tr);
        });
    }

    /* =========================================================
       TABELA - RESUMO MENSAL
       ========================================================= */

    function preencherResumoMensal(
        registros
    ) {
        tabelaResumo.innerHTML = "";

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

        registros.forEach(item => {
            const tr =
                document.createElement("tr");

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
        });
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
                (soma, item) =>
                    soma + item.valor,
                0
            );

        const meses =
            obterQuantidadeMesesCalculo();

        const media =
            meses > 0
                ? total / meses
                : 0;

        resultadoTotal.textContent =
            formatarMoeda(total);

        resultadoMedia.textContent =
            formatarMoeda(media);

        resultadoMeses.textContent =
            String(meses);

        resultadoQtdConsiderados.textContent =
            String(
                consideradas.length
            );

        resultadoQtdExcluidos.textContent =
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
    }

    /* =========================================================
       PROCESSAMENTO DO EXTRATO
       ========================================================= */

    function processarExtrato() {
        const texto =
            textoExtrato.value.trim();

        if (!texto) {
            movimentacoesExtraidas = [];

            mesesDetectados.value =
                "0";

            mesesConsiderados.value =
                "";

            atualizarResultados();

            return;
        }

        /*
         * Extrai apenas linhas no padrão de
         * movimentação:
         *
         * DD/MM/AAAA ... VALOR C/D/*
         */
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

        /*
         * Sempre que um novo extrato for processado,
         * utiliza inicialmente a quantidade detectada.
         *
         * Depois o usuário ainda pode alterar
         * manualmente o campo.
         */
        mesesConsiderados.value =
            quantidadeExtratos > 0
                ? String(
                    quantidadeExtratos
                )
                : "";

        classificarMovimentacoes();

        atualizarResultados();

        console.info(
            "Média de Movimentação - processamento concluído:",
            {
                movimentacoesExtraidas:
                    movimentacoesExtraidas.length,

                mesesDetectados:
                    quantidadeExtratos,

                creditosConsiderados:
                    obterConsideradas().length,

                creditosExcluidos:
                    obterExcluidas().length
            }
        );
    }

    /* =========================================================
       RECÁLCULO
       ========================================================= */

    function recalcular() {
        if (
            !movimentacoesExtraidas.length
        ) {
            atualizarResultados();
            return;
        }

        classificarMovimentacoes();
        atualizarResultados();
    }

    /* =========================================================
       LIMPEZA
       ========================================================= */

    function limparTudo() {
        textoExtrato.value = "";

        movimentacoesExtraidas = [];

        mesesDetectados.value =
            "0";

        mesesConsiderados.value =
            "";

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

    /*
     * Quando o usuário alterar manualmente a
     * quantidade de meses, somente a média é
     * recalculada.
     */
    mesesConsiderados.addEventListener(
        "input",
        atualizarResultados
    );

    /*
     * Ctrl + Enter dentro do extrato também
     * executa o processamento.
     */
    textoExtrato.addEventListener(
        "keydown",
        event => {
            if (
                event.ctrlKey &&
                event.key === "Enter"
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