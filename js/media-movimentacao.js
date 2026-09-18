/**
 * media-movimentacao.js
 * Cálculo de média de movimentação financeira
 * Caixa de Ferramentas - Sicoob Mantiqueira
 */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const textoExtrato =
        document.getElementById("textoExtratoMovimentacao");

    const mesesDetectados =
        document.getElementById("mesesDetectadosMovimentacao");

    const mesesConsiderados =
        document.getElementById("mesesConsideradosMovimentacao");

    const regrasAdicionais =
        document.getElementById("regrasAdicionaisMovimentacao");

    const btnProcessar =
        document.getElementById("btnProcessarMovimentacao");

    const btnLimpar =
        document.getElementById("btnLimparMovimentacao");

    const btnRecalcular =
        document.getElementById("btnRecalcularMovimentacao");

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

    let movimentacoesExtraidas = [];

    const REGRAS_EXCLUSAO_PADRAO = [
        {
            id: "saldo_anterior",
            descricao: "Saldo anterior",
            termos: [
                "SALDO ANTERIOR"
            ],
            ativa: true
        },
        {
            id: "saldo_bloqueado",
            descricao: "Saldo bloqueado",
            termos: [
                "SALDO BLOQUEADO"
            ],
            ativa: true
        },
        {
            id: "saldo_dia",
            descricao: "Saldo do dia",
            termos: [
                "SALDO DO DIA"
            ],
            ativa: true
        },
        {
            id: "estorno",
            descricao: "Estornos",
            termos: [
                "ESTORNO"
            ],
            ativa: true
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
            ],
            ativa: true
        }
    ];

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
            return Number.isFinite(valor) ? valor : 0;
        }

        let texto = String(valor)
            .trim()
            .replace(/\s+/g, "");

        texto = texto.replace(/[CD*]$/i, "");

        if (!texto) {
            return 0;
        }

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

    function localizarValorFinal(linha) {
        const match = linha.match(
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

    function extrairColunasComTabulacao(linha) {
        const colunas = linha
            .split(/\t+/)
            .map(item => item.trim());

        while (
            colunas.length > 0 &&
            !colunas[colunas.length - 1]
        ) {
            colunas.pop();
        }

        return colunas;
    }

    function extrairDocumentoHistorico(
        linha,
        dataTexto,
        valorInfo
    ) {
        const colunas =
            extrairColunasComTabulacao(linha);

        if (colunas.length >= 4) {
            return {
                documento:
                    colunas[1] || "",
                historico:
                    colunas
                        .slice(
                            2,
                            colunas.length - 1
                        )
                        .join(" ")
                        .trim()
            };
        }

        let meio = linha
            .substring(
                dataTexto.length,
                valorInfo.indice
            )
            .trim();

        meio = meio
            .replace(/\s{2,}/g, "\t")
            .trim();

        const partes = meio
            .split(/\t+/)
            .map(item => item.trim())
            .filter(Boolean);

        if (partes.length >= 2) {
            return {
                documento: partes[0],
                historico:
                    partes
                        .slice(1)
                        .join(" ")
            };
        }

        /*
         * Quando o texto foi colado sem tabulação,
         * não é seguro determinar onde termina o
         * documento e começa o histórico.
         *
         * Nesse caso o conteúdo completo é mantido
         * como histórico para que as regras consigam
         * identificar os termos relevantes.
         */
        return {
            documento: "",
            historico: meio
        };
    }

    function linhaEhMovimentacao(linha) {
        return /^\d{2}\/\d{2}\/\d{4}/
            .test(linha.trim());
    }

    function extrairMovimentacoes(texto) {
        const linhas = String(texto || "")
            .replace(/\r/g, "")
            .split("\n");

        const movimentos = [];

        linhas.forEach((linhaOriginal, indice) => {
            const linha =
                linhaOriginal
                    .replace(/\u00A0/g, " ")
                    .trim();

            if (!linha) {
                return;
            }

            if (!linhaEhMovimentacao(linha)) {
                return;
            }

            const dataMatch = linha.match(
                /^(\d{2}\/\d{2}\/\d{4})/
            );

            if (!dataMatch) {
                return;
            }

            const data = dataMatch[1];

            const valorInfo =
                localizarValorFinal(linha);

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

            movimentos.push({
                indiceLinha: indice + 1,
                data,
                mes: obterChaveMes(data),
                documento:
                    dados.documento || "",
                historico:
                    dados.historico || "",
                historicoNormalizado:
                    normalizarTexto(
                        dados.historico
                    ),
                valor: valorInfo.numero,
                valorOriginal:
                    valorInfo.texto,
                indicador,
                considerado: false,
                excluido: false,
                motivoExclusao: ""
            });
        });

        return movimentos;
    }

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

        const historico =
            movimentacao.historicoNormalizado;

        return PADROES_CREDITO_SEM_INDICADOR
            .some(termo =>
                historico.includes(
                    normalizarTexto(termo)
                )
            );
    }

    function obterRegrasAtivas() {
        return REGRAS_EXCLUSAO_PADRAO
            .filter(regra => {
                const checkbox =
                    document.getElementById(
                        `regraMovimentacao_${regra.id}`
                    );

                if (!checkbox) {
                    return regra.ativa;
                }

                return checkbox.checked;
            });
    }

    function obterRegrasAdicionais() {
        return String(
            regrasAdicionais.value || ""
        )
            .split("\n")
            .map(item =>
                normalizarTexto(item)
            )
            .filter(Boolean);
    }

    function verificarExclusao(
        movimentacao
    ) {
        const historico =
            movimentacao.historicoNormalizado;

        const regrasAtivas =
            obterRegrasAtivas();

        for (const regra of regrasAtivas) {
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

        const adicionais =
            obterRegrasAdicionais();

        for (
            const termo
            of adicionais
        ) {
            if (
                historico.includes(termo)
            ) {
                return {
                    excluido: true,
                    motivo:
                        "Regra adicional"
                };
            }
        }

        return {
            excluido: false,
            motivo: ""
        };
    }

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
                     * Débitos nunca entram no cálculo
                     * da média de créditos.
                     */
                    if (
                        !historicoPareceCredito(
                            atualizada
                        )
                    ) {
                        return atualizada;
                    }

                    const exclusao =
                        verificarExclusao(
                            atualizada
                        );

                    if (exclusao.excluido) {
                        atualizada.excluido = true;
                        atualizada.motivoExclusao =
                            exclusao.motivo;

                        return atualizada;
                    }

                    if (atualizada.valor <= 0) {
                        return atualizada;
                    }

                    atualizada.considerado = true;

                    return atualizada;
                }
            );
    }

    function detectarQuantidadeExtratos() {
        const saldosAnteriores =
            movimentacoesExtraidas.filter(
                movimentacao =>
                    movimentacao
                        .historicoNormalizado
                        .includes(
                            "SALDO ANTERIOR"
                        )
            );

        /*
         * O extrato do SISBR normalmente inicia
         * cada período com a linha SALDO ANTERIOR.
         *
         * Por isso essa é a primeira referência
         * para determinar quantos extratos foram
         * colados.
         */
        if (saldosAnteriores.length > 0) {
            return saldosAnteriores.length;
        }

        /*
         * Fallback:
         * caso o usuário cole somente as movimentações,
         * considera a quantidade de meses distintos.
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
            return detectados;
        }

        return 0;
    }

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
            .from(resumo.values())
            .sort((a, b) =>
                a.mes.localeCompare(b.mes)
            );
    }

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
            String(consideradas.length);

        resultadoQtdExcluidos.textContent =
            String(excluidas.length);

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

    function criarCelula(
        texto,
        alinhamento = ""
    ) {
        const td =
            document.createElement("td");

        td.textContent = texto;

        if (alinhamento) {
            td.style.textAlign =
                alinhamento;
        }

        return td;
    }

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
                criarCelula(item.data)
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
                criarCelula(item.data)
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
                    item.motivoExclusao
                    || "Regra de exclusão"
                )
            );

            tabelaExcluidas
                .appendChild(tr);
        });
    }

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

            tabelaResumo.appendChild(tr);
        });
    }

    function montarListaRegras() {
        listaRegras.innerHTML = "";

        REGRAS_EXCLUSAO_PADRAO
            .forEach(regra => {
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

                checkbox.id =
                    `regraMovimentacao_${regra.id}`;

                checkbox.checked =
                    regra.ativa;

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
                    regra.descricao;

                const detalhes =
                    document.createElement(
                        "small"
                    );

                detalhes.textContent =
                    regra.termos.join(" / ");

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

                checkbox.addEventListener(
                    "change",
                    () => {
                        if (
                            movimentacoesExtraidas
                                .length
                        ) {
                            recalcular();
                        }
                    }
                );

                listaRegras.appendChild(
                    label
                );
            });
    }

    function processarExtrato() {
        const texto =
            textoExtrato.value.trim();

        if (!texto) {
            movimentacoesExtraidas = [];

            mesesDetectados.value = "0";
            mesesConsiderados.value = "";

            atualizarResultados();

            return;
        }

        movimentacoesExtraidas =
            extrairMovimentacoes(texto);

        const quantidadeExtratos =
            detectarQuantidadeExtratos();

        mesesDetectados.value =
            String(
                quantidadeExtratos
            );

        /*
         * Preenche automaticamente apenas
         * quando o usuário ainda não informou
         * um valor manual.
         */
        if (
            !mesesConsiderados.value ||
            Number(
                mesesConsiderados.value
            ) <= 0
        ) {
            mesesConsiderados.value =
                quantidadeExtratos > 0
                    ? String(
                        quantidadeExtratos
                    )
                    : "";
        }

        classificarMovimentacoes();
        atualizarResultados();
    }

    function recalcular() {
        if (
            !movimentacoesExtraidas.length
        ) {
            processarExtrato();
            return;
        }

        classificarMovimentacoes();
        atualizarResultados();
    }

    function limparTudo() {
        textoExtrato.value = "";
        regrasAdicionais.value = "";

        movimentacoesExtraidas = [];

        mesesDetectados.value = "0";
        mesesConsiderados.value = "";

        REGRAS_EXCLUSAO_PADRAO
            .forEach(regra => {
                const checkbox =
                    document.getElementById(
                        `regraMovimentacao_${regra.id}`
                    );

                if (checkbox) {
                    checkbox.checked =
                        regra.ativa;
                }
            });

        atualizarResultados();

        textoExtrato.focus();
    }

    btnProcessar.addEventListener(
        "click",
        processarExtrato
    );

    btnLimpar.addEventListener(
        "click",
        limparTudo
    );

    btnRecalcular.addEventListener(
        "click",
        recalcular
    );

    mesesConsiderados.addEventListener(
        "input",
        atualizarResultados
    );

    regrasAdicionais.addEventListener(
        "change",
        recalcular
    );

    montarListaRegras();
    atualizarResultados();
});