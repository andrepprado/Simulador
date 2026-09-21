document.addEventListener(
    "DOMContentLoaded",
    iniciarCalculoRendaNotas
);

/* =========================================================
   CONSTANTES
   ========================================================= */

const CRITERIOS_APURACAO_NOTAS = Object.freeze({
    MOVIMENTACAO: "movimentacao",
    INTERVALO: "intervalo",
    INFORMADO: "informado"
});

/* =========================================================
   ESTADO
   ========================================================= */

let periodosNotas = [];
let notasProcessadas = [];
let arquivosSelecionados = [];
let atividadesRendaNotas = [];

/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

function iniciarCalculoRendaNotas() {
    verificarDependenciaAtividadesCreditoRural();

    garantirOpcaoCriterioIntervalo();
    garantirCampoAtividadePeriodoManual();

    inicializarSeletoresAtividadeNotas();
    configurarEventosNotas();

    renderizarArquivosSelecionados();
    renderizarAtividadesRendaNotas();
    renderizarPeriodosNotas();
    renderizarNotasProcessadas();
    atualizarResultadosNotas();
}

/* =========================================================
   ELEMENTOS / COMPATIBILIDADE DE IDS
   ========================================================= */

function obterElementoPorIds(...ids) {
    for (const id of ids) {
        const elemento =
            document.getElementById(id);

        if (elemento) {
            return elemento;
        }
    }

    return null;
}

/* =========================================================
   DEPENDÊNCIA DAS ATIVIDADES
   ========================================================= */

function verificarDependenciaAtividadesCreditoRural() {
    if (
        !window.CreditoRuralAtividades ||
        !window.ATIVIDADES_CREDITO_RURAL
    ) {
        console.error(
            "credito-rural-atividades.js não foi carregado antes de calculo-renda-notas-fiscais.js."
        );
    }
}

/* =========================================================
   INICIALIZAÇÃO DOS SELETORES DE ATIVIDADE
   ========================================================= */

function inicializarSeletoresAtividadeNotas() {
    const grupo =
        document.getElementById(
            "grupoAtividadeNotas"
        );

    const atividade =
        document.getElementById(
            "atividadeNotas"
        );

    if (
        grupo &&
        atividade &&
        window.CreditoRuralAtividades
    ) {
        window.CreditoRuralAtividades
            .preencherGruposEmSelect(
                grupo,
                "agricola",
                false
            );

        window.CreditoRuralAtividades
            .preencherAtividadesEmSelect(
                atividade,
                "agricola",
                null,
                false
            );
    }

    atualizarSelectAtividadePeriodoManual();
}

/* =========================================================
   GARANTE O CRITÉRIO "INTERVALO COMPLETO"
   ========================================================= */

function garantirOpcaoCriterioIntervalo() {
    const select =
        document.getElementById(
            "criterioAtividadeNotas"
        );

    if (!select) {
        return;
    }

    const existe =
        [...select.options].some(
            option =>
                option.value ===
                CRITERIOS_APURACAO_NOTAS.INTERVALO
        );

    if (existe) {
        return;
    }

    const option =
        document.createElement(
            "option"
        );

    option.value =
        CRITERIOS_APURACAO_NOTAS.INTERVALO;

    option.textContent =
        "Intervalo completo";

    const optionInformado =
        [...select.options].find(
            item =>
                item.value ===
                CRITERIOS_APURACAO_NOTAS.INFORMADO
        );

    if (optionInformado) {
        select.insertBefore(
            option,
            optionInformado
        );
    } else {
        select.appendChild(
            option
        );
    }
}

/* =========================================================
   CAMPO DE ATIVIDADE NO LANÇAMENTO MANUAL
   ========================================================= */

function garantirCampoAtividadePeriodoManual() {
    if (
        document.getElementById(
            "atividadePeriodoNota"
        )
    ) {
        return;
    }

    const container =
        document.querySelector(
            "#cardPeriodosNotas .notas-periodo-novo"
        ) ||
        document.querySelector(
            ".notas-card-periodos .notas-periodo-novo"
        );

    if (!container) {
        return;
    }

    const campo =
        document.createElement(
            "div"
        );

    campo.className =
        "notas-campo";

    campo.innerHTML = `
        <label for="atividadePeriodoNota">
            Atividade
        </label>

        <select id="atividadePeriodoNota">
            <option value="">
                Cadastre uma atividade
            </option>
        </select>
    `;

    container.insertBefore(
        campo,
        container.firstChild
    );
}

/* =========================================================
   EVENTOS
   ========================================================= */

function configurarEventosNotas() {
    const inputArquivos =
        document.getElementById(
            "arquivosNotasFiscais"
        );

    const btnSelecionarArquivos =
        document.getElementById(
            "btnSelecionarNotas"
        );

    const btnProcessar =
        obterElementoPorIds(
            "btnProcessarArquivosNotas",
            "btnProcessarNotas"
        );

    const btnLimparArquivos =
        document.getElementById(
            "btnLimparArquivosNotas"
        );

    const btnAdicionarPeriodo =
        obterElementoPorIds(
            "btnAdicionarPeriodoNotas",
            "btnAdicionarPeriodoNota"
        );

    const btnAdicionarAtividade =
        document.getElementById(
            "btnAdicionarAtividadeNotas"
        );

    const btnCalcular =
        document.getElementById(
            "btnCalcularRendaNotas"
        );

    const btnLimparCalculo =
        document.getElementById(
            "btnLimparCalculoNotas"
        );

    const inputValor =
        obterElementoPorIds(
            "novoValorNota",
            "valorPeriodoNota"
        );

    const grupoAtividade =
        document.getElementById(
            "grupoAtividadeNotas"
        );

    const atividade =
        document.getElementById(
            "atividadeNotas"
        );

    const criterio =
        document.getElementById(
            "criterioAtividadeNotas"
        );

    const mesesInformados =
        document.getElementById(
            "mesesAtividadeNotas"
        );

    if (btnSelecionarArquivos) {
        btnSelecionarArquivos.addEventListener(
            "click",
            function () {
                if (inputArquivos) {
                    inputArquivos.click();
                }
            }
        );
    }

    if (inputArquivos) {
        inputArquivos.addEventListener(
            "change",
            function () {
                const novosArquivos =
                    Array.from(
                        this.files || []
                    );

                adicionarArquivosSelecionados(
                    novosArquivos
                );

                /*
                 * Permite selecionar novamente
                 * o mesmo arquivo após removê-lo.
                 */
                this.value = "";

                renderizarArquivosSelecionados();
                limparMensagemOcr();
            }
        );
    }

    if (btnProcessar) {
        btnProcessar.addEventListener(
            "click",
            processarArquivosNotas
        );
    }

    if (btnLimparArquivos) {
        btnLimparArquivos.addEventListener(
            "click",
            limparArquivosNotas
        );
    }

    if (btnAdicionarPeriodo) {
        btnAdicionarPeriodo.addEventListener(
            "click",
            adicionarPeriodoManual
        );
    }

    if (btnAdicionarAtividade) {
        btnAdicionarAtividade.addEventListener(
            "click",
            adicionarAtividadeRendaNotas
        );
    }

    if (btnCalcular) {
        btnCalcular.addEventListener(
            "click",
            atualizarResultadosNotas
        );
    }

    if (btnLimparCalculo) {
        btnLimparCalculo.addEventListener(
            "click",
            limparCalculoNotas
        );
    }

    if (grupoAtividade) {
        grupoAtividade.addEventListener(
            "change",
            function () {
                if (
                    atividade &&
                    window.CreditoRuralAtividades
                ) {
                    window.CreditoRuralAtividades
                        .preencherAtividadesEmSelect(
                            atividade,
                            this.value,
                            null,
                            false
                        );
                }
            }
        );
    }

    if (criterio) {
        criterio.addEventListener(
            "change",
            atualizarVisibilidadeMesesInformados
        );

        atualizarVisibilidadeMesesInformados();
    }

    if (mesesInformados) {
        mesesInformados.addEventListener(
            "input",
            function () {
                if (
                    Number(this.value) < 1
                ) {
                    this.value = "1";
                }
            }
        );
    }

    if (inputValor) {
        inputValor.addEventListener(
            "input",
            function () {
                aplicarMascaraMoeda(
                    this
                );
            }
        );

        inputValor.addEventListener(
            "blur",
            function () {
                const valor =
                    converterMoedaParaNumero(
                        this.value
                    );

                if (valor > 0) {
                    this.value =
                        formatarMoeda(
                            valor
                        );
                }
            }
        );
    }

    document.addEventListener(
        "keydown",
        function (evento) {
            if (
                evento.key !==
                "Enter"
            ) {
                return;
            }

            const ativo =
                document.activeElement;

            if (!ativo) {
                return;
            }

            const idsPeriodo = [
                "novoPeriodoNota",
                "novoValorNota",
                "novaQuantidadeNotas",
                "periodoNota",
                "valorPeriodoNota",
                "quantidadeNotasPeriodo",
                "atividadePeriodoNota"
            ];

            if (
                idsPeriodo.includes(
                    ativo.id
                )
            ) {
                evento.preventDefault();
                adicionarPeriodoManual();
            }
        }
    );
}

/* =========================================================
   VISIBILIDADE DOS MESES INFORMADOS
   ========================================================= */

function atualizarVisibilidadeMesesInformados() {
    const criterio =
        document.getElementById(
            "criterioAtividadeNotas"
        );

    const campo =
        document.getElementById(
            "campoMesesAtividadeNotas"
        );

    const input =
        document.getElementById(
            "mesesAtividadeNotas"
        );

    if (
        !criterio ||
        !campo
    ) {
        return;
    }

    const informar =
        criterio.value ===
        CRITERIOS_APURACAO_NOTAS.INFORMADO;

    campo.hidden =
        !informar;

    if (
        input &&
        informar &&
        Number(input.value) < 1
    ) {
        input.value = "12";
    }
}

/* =========================================================
   ATIVIDADES DO PRODUTOR
   ========================================================= */

function adicionarAtividadeRendaNotas() {
    const grupoSelect =
        document.getElementById(
            "grupoAtividadeNotas"
        );

    const atividadeSelect =
        document.getElementById(
            "atividadeNotas"
        );

    const criterioSelect =
        document.getElementById(
            "criterioAtividadeNotas"
        );

    const mesesInput =
        document.getElementById(
            "mesesAtividadeNotas"
        );

    if (
        !grupoSelect ||
        !atividadeSelect ||
        !criterioSelect
    ) {
        exibirMensagemOcr(
            "Não foi possível localizar os campos da atividade.",
            "erro"
        );

        return;
    }

    const grupo =
        grupoSelect.value;

    const atividade =
        atividadeSelect.value;

    const criterio =
        normalizarCriterioApuracao(
            criterioSelect.value
        );

    const mesesRepresentados =
        Math.max(
            1,
            parseInt(
                mesesInput?.value,
                10
            ) || 12
        );

    if (
        !grupo ||
        !atividade
    ) {
        exibirMensagemOcr(
            "Selecione o grupo e a atividade rural.",
            "atencao"
        );

        return;
    }

    const duplicada =
        atividadesRendaNotas.some(
            item =>
                item.grupo === grupo &&
                item.atividade === atividade
        );

    if (duplicada) {
        exibirMensagemOcr(
            "Essa atividade já foi adicionada à apuração.",
            "atencao"
        );

        return;
    }

    atividadesRendaNotas.push({
        id: gerarId(),
        grupo,
        atividade,
        criterio,
        mesesRepresentados
    });

    renderizarAtividadesRendaNotas();
    atualizarSelectAtividadePeriodoManual();
    renderizarNotasProcessadas();
    renderizarPeriodosNotas();
    atualizarResultadosNotas();

    exibirMensagemOcr(
        `${obterNomeAtividadeCadastro(grupo, atividade)} adicionada à apuração.`,
        "sucesso"
    );
}

/* =========================================================
   REMOVER ATIVIDADE
   ========================================================= */

function removerAtividadeRendaNotas(id) {
    const atividade =
        atividadesRendaNotas.find(
            item =>
                item.id === id
        );

    if (!atividade) {
        return;
    }

    const possuiPeriodos =
        periodosNotas.some(
            periodo =>
                periodo.atividadeId ===
                id
        );

    const possuiNotas =
        notasProcessadas.some(
            nota =>
                nota.atividadeId ===
                id
        );

    if (
        (possuiPeriodos || possuiNotas) &&
        !window.confirm(
            "Esta atividade possui notas ou períodos vinculados. Ao removê-la, os períodos vinculados serão removidos e as notas ficarão sem atividade. Deseja continuar?"
        )
    ) {
        return;
    }

    atividadesRendaNotas =
        atividadesRendaNotas.filter(
            item =>
                item.id !== id
        );

    periodosNotas =
        periodosNotas.filter(
            periodo =>
                periodo.atividadeId !== id
        );

    notasProcessadas.forEach(
        nota => {
            if (
                nota.atividadeId ===
                id
            ) {
                nota.atividadeId = "";
            }
        }
    );

    consolidarNotasNosPeriodos();

    renderizarAtividadesRendaNotas();
    atualizarSelectAtividadePeriodoManual();
    renderizarNotasProcessadas();
    renderizarPeriodosNotas();
    atualizarResultadosNotas();
}

/* =========================================================
   RENDERIZAÇÃO DAS ATIVIDADES
   ========================================================= */

function renderizarAtividadesRendaNotas() {
    const tbody =
        document.getElementById(
            "tabelaAtividadesNotas"
        );

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    if (
        atividadesRendaNotas.length ===
        0
    ) {
        tbody.innerHTML = `
            <tr class="notas-linha-vazia">
                <td colspan="7">
                    Nenhuma atividade cadastrada.
                </td>
            </tr>
        `;

        return;
    }

    const resumos =
        calcularResumoAtividades();

    atividadesRendaNotas.forEach(
        item => {
            const resumo =
                resumos.find(
                    resumoItem =>
                        resumoItem.atividadeId ===
                        item.id
                );

            const tr =
                document.createElement(
                    "tr"
                );

            const mesesInformados =
                item.criterio ===
                    CRITERIOS_APURACAO_NOTAS.INFORMADO
                    ? item.mesesRepresentados
                    : "-";

            const mesesUtilizados =
                resumo &&
                    resumo.mesesConsiderados > 0
                    ? resumo.mesesConsiderados
                    : "-";

            const renda =
                resumo
                    ? resumo.rendaMensal
                    : 0;

            tr.innerHTML = `
                <td>
                    ${escaparHtml(
                obterNomeGrupoCadastro(
                    item.grupo
                )
            )}
                </td>

                <td>
                    ${escaparHtml(
                obterNomeAtividadeCadastro(
                    item.grupo,
                    item.atividade
                )
            )}
                </td>

                <td>
                    <select
                        class="notas-input-tabela atividade-criterio-editar"
                        aria-label="Critério de apuração"
                    >
                        ${gerarOpcoesCriterioHtml(
                item.criterio
            )}
                    </select>
                </td>

                <td>
                    <input
                        type="number"
                        min="1"
                        max="120"
                        step="1"
                        class="notas-input-tabela atividade-meses-editar"
                        value="${item.mesesRepresentados || 12}"
                        ${item.criterio ===
                    CRITERIOS_APURACAO_NOTAS.INFORMADO
                    ? ""
                    : "disabled"
                }
                        aria-label="Meses informados"
                    >
                </td>

                <td>
                    ${mesesUtilizados}
                </td>

                <td>
                    ${formatarMoeda(
                    renda
                )}
                </td>

                <td class="notas-coluna-acoes">
                    <button
                        type="button"
                        class="notas-btn-remover atividade-remover"
                    >
                        Remover
                    </button>
                </td>
            `;

            tbody.appendChild(
                tr
            );

            const selectCriterio =
                tr.querySelector(
                    ".atividade-criterio-editar"
                );

            const inputMeses =
                tr.querySelector(
                    ".atividade-meses-editar"
                );

            const btnRemover =
                tr.querySelector(
                    ".atividade-remover"
                );

            if (selectCriterio) {
                selectCriterio.addEventListener(
                    "change",
                    function () {
                        item.criterio =
                            normalizarCriterioApuracao(
                                this.value
                            );

                        renderizarAtividadesRendaNotas();
                        atualizarResultadosNotas();
                    }
                );
            }

            if (inputMeses) {
                inputMeses.addEventListener(
                    "change",
                    function () {
                        item.mesesRepresentados =
                            Math.max(
                                1,
                                parseInt(
                                    this.value,
                                    10
                                ) || 1
                            );

                        renderizarAtividadesRendaNotas();
                        atualizarResultadosNotas();
                    }
                );
            }

            if (btnRemover) {
                btnRemover.addEventListener(
                    "click",
                    function () {
                        removerAtividadeRendaNotas(
                            item.id
                        );
                    }
                );
            }
        }
    );
}

/* =========================================================
   OPÇÕES DOS CRITÉRIOS
   ========================================================= */

function gerarOpcoesCriterioHtml(
    criterioAtual
) {
    const criterio =
        normalizarCriterioApuracao(
            criterioAtual
        );

    const opcoes = [
        {
            valor:
                CRITERIOS_APURACAO_NOTAS.MOVIMENTACAO,
            nome:
                "Meses com movimentação"
        },
        {
            valor:
                CRITERIOS_APURACAO_NOTAS.INTERVALO,
            nome:
                "Intervalo completo"
        },
        {
            valor:
                CRITERIOS_APURACAO_NOTAS.INFORMADO,
            nome:
                "Período econômico informado"
        }
    ];

    return opcoes
        .map(
            opcao => `
                <option
                    value="${opcao.valor}"
                    ${opcao.valor ===
                    criterio
                    ? "selected"
                    : ""
                }
                >
                    ${opcao.nome}
                </option>
            `
        )
        .join("");
}

/* =========================================================
   NORMALIZA CRITÉRIO
   ========================================================= */

function normalizarCriterioApuracao(
    criterio
) {
    const valor =
        String(
            criterio || ""
        )
            .trim()
            .toLowerCase();

    if (
        valor ===
        CRITERIOS_APURACAO_NOTAS.INTERVALO
    ) {
        return (
            CRITERIOS_APURACAO_NOTAS.INTERVALO
        );
    }

    if (
        valor ===
        CRITERIOS_APURACAO_NOTAS.INFORMADO
    ) {
        return (
            CRITERIOS_APURACAO_NOTAS.INFORMADO
        );
    }

    return (
        CRITERIOS_APURACAO_NOTAS.MOVIMENTACAO
    );
}

/* =========================================================
   CONSULTA AO CADASTRO CENTRAL
   ========================================================= */

function obterNomeGrupoCadastro(
    grupo
) {
    if (
        window.CreditoRuralAtividades &&
        typeof window.CreditoRuralAtividades
            .obterNomeGrupo ===
        "function"
    ) {
        return (
            window.CreditoRuralAtividades
                .obterNomeGrupo(
                    grupo
                ) ||
            grupo
        );
    }

    return grupo || "";
}

function obterNomeAtividadeCadastro(
    grupo,
    atividade
) {
    if (
        window.CreditoRuralAtividades &&
        typeof window.CreditoRuralAtividades
            .obterNomeAtividade ===
        "function"
    ) {
        return (
            window.CreditoRuralAtividades
                .obterNomeAtividade(
                    atividade,
                    grupo
                ) ||
            atividade
        );
    }

    return atividade || "";
}

/* =========================================================
   OPÇÕES DAS ATIVIDADES CADASTRADAS
   ========================================================= */

function gerarOpcoesAtividadesCadastradas(
    atividadeIdSelecionada = ""
) {
    let html = `
        <option value="">
            Selecione a atividade
        </option>
    `;

    atividadesRendaNotas.forEach(
        item => {
            const nomeGrupo =
                obterNomeGrupoCadastro(
                    item.grupo
                );

            const nomeAtividade =
                obterNomeAtividadeCadastro(
                    item.grupo,
                    item.atividade
                );

            html += `
                <option
                    value="${escaparHtml(item.id)}"
                    ${item.id ===
                    atividadeIdSelecionada
                    ? "selected"
                    : ""
                }
                >
                    ${escaparHtml(nomeGrupo)} - ${escaparHtml(nomeAtividade)}
                </option>
            `;
        }
    );

    return html;
}

/* =========================================================
   SELECT DE ATIVIDADE DO PERÍODO MANUAL
   ========================================================= */

function atualizarSelectAtividadePeriodoManual() {
    const select =
        document.getElementById(
            "atividadePeriodoNota"
        );

    if (!select) {
        return;
    }

    const valorAtual =
        select.value;

    select.innerHTML =
        gerarOpcoesAtividadesCadastradas(
            valorAtual
        );

    if (
        atividadesRendaNotas.length ===
        1
    ) {
        select.value =
            atividadesRendaNotas[0].id;
    }
}

/* =========================================================
   PERÍODOS - INCLUSÃO MANUAL
   ========================================================= */

function adicionarPeriodoManual() {
    const inputAtividade =
        document.getElementById(
            "atividadePeriodoNota"
        );

    const inputPeriodo =
        obterElementoPorIds(
            "novoPeriodoNota",
            "periodoNota"
        );

    const inputValor =
        obterElementoPorIds(
            "novoValorNota",
            "valorPeriodoNota"
        );

    const inputQuantidade =
        obterElementoPorIds(
            "novaQuantidadeNotas",
            "quantidadeNotasPeriodo"
        );

    if (
        !inputPeriodo ||
        !inputValor ||
        !inputQuantidade
    ) {
        return;
    }

    let atividadeId =
        inputAtividade?.value ||
        "";

    if (
        !atividadeId &&
        atividadesRendaNotas.length ===
        1
    ) {
        atividadeId =
            atividadesRendaNotas[0].id;
    }

    if (!atividadeId) {
        exibirMensagemOcr(
            "Selecione a atividade correspondente ao período.",
            "atencao"
        );

        inputAtividade?.focus();

        return;
    }

    if (
        !obterAtividadePorId(
            atividadeId
        )
    ) {
        exibirMensagemOcr(
            "A atividade selecionada não é válida.",
            "atencao"
        );

        return;
    }

    const periodo =
        String(
            inputPeriodo.value || ""
        ).trim();

    const valor =
        converterMoedaParaNumero(
            inputValor.value
        );

    const quantidade =
        Math.max(
            0,
            parseInt(
                inputQuantidade.value,
                10
            ) || 0
        );

    if (!periodo) {
        inputPeriodo.focus();

        exibirMensagemOcr(
            "Informe o período antes de adicionar.",
            "atencao"
        );

        return;
    }

    if (
        converterPeriodoParaOrdenacao(
            periodo
        ) === null
    ) {
        inputPeriodo.focus();

        exibirMensagemOcr(
            "Informe uma competência válida. Exemplo: Março/2026.",
            "atencao"
        );

        return;
    }

    if (valor <= 0) {
        inputValor.focus();

        exibirMensagemOcr(
            "Informe um valor maior que zero para o período.",
            "atencao"
        );

        return;
    }

    adicionarOuSomarPeriodo({
        atividadeId,
        periodo,
        valor,
        quantidade,
        origem: "manual"
    });

    inputPeriodo.value = "";
    inputValor.value = "";
    inputQuantidade.value = "0";

    renderizarPeriodosNotas();
    renderizarAtividadesRendaNotas();
    atualizarResultadosNotas();

    inputPeriodo.focus();
}

/* =========================================================
   ADICIONA OU CONSOLIDA PERÍODO
   ========================================================= */

function adicionarOuSomarPeriodo(
    dados
) {
    const atividadeId =
        String(
            dados.atividadeId ||
            ""
        );

    const chavePeriodo =
        normalizarPeriodoChave(
            dados.periodo
        );

    const existente =
        periodosNotas.find(
            item =>
                item.atividadeId ===
                atividadeId &&
                normalizarPeriodoChave(
                    item.periodo
                ) ===
                chavePeriodo
        );

    if (existente) {
        existente.valor +=
            Number(
                dados.valor
            ) || 0;

        existente.quantidade +=
            Number(
                dados.quantidade
            ) || 0;

        /*
         * Um período que possua lançamento manual
         * e OCR continua marcado como misto para não
         * ser apagado integralmente numa nova consolidação.
         */
        if (
            existente.origem !==
            dados.origem
        ) {
            existente.origem =
                "misto";
        }

        return existente;
    }

    const novo = {
        id:
            gerarId(),

        atividadeId,

        periodo:
            dados.periodo,

        valor:
            Number(
                dados.valor
            ) || 0,

        quantidade:
            Number(
                dados.quantidade
            ) || 0,

        origem:
            dados.origem ||
            "manual"
    };

    periodosNotas.push(
        novo
    );

    ordenarPeriodos();

    return novo;
}

/* =========================================================
   RENDERIZAÇÃO DOS PERÍODOS
   ========================================================= */

function renderizarPeriodosNotas() {
    const tbody =
        obterElementoPorIds(
            "calculo-notas-periodo",
            "tabelaPeriodosNotas"
        );

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    if (
        periodosNotas.length ===
        0
    ) {
        const tr =
            document.createElement(
                "tr"
            );

        tr.className =
            "notas-linha-vazia";

        tr.innerHTML = `
            <td colspan="4">
                Nenhum período informado.
            </td>
        `;

        tbody.appendChild(
            tr
        );

        atualizarTotalizadoresPeriodos();

        return;
    }

    periodosNotas.forEach(
        item => {
            const tr =
                document.createElement(
                    "tr"
                );

            tr.dataset.periodoId =
                item.id;

            tr.innerHTML = `
                <td>
                    <select
                        class="notas-input-tabela notas-periodo-atividade-editar"
                        aria-label="Atividade"
                        style="margin-bottom:6px;"
                    >
                        ${gerarOpcoesAtividadesCadastradas(
                item.atividadeId
            )}
                    </select>

                    <input
                        type="text"
                        class="notas-input-tabela notas-periodo-editar"
                        value="${escaparHtml(item.periodo)}"
                        aria-label="Período"
                    >
                </td>

                <td>
                    <input
                        type="text"
                        inputmode="decimal"
                        class="notas-input-tabela notas-valor-editar"
                        value="${formatarMoeda(item.valor)}"
                        aria-label="Valor das notas"
                    >
                </td>

                <td>
                    <input
                        type="number"
                        min="0"
                        step="1"
                        class="notas-input-tabela notas-quantidade-editar"
                        value="${item.quantidade}"
                        aria-label="Quantidade de notas"
                    >
                </td>

                <td class="notas-coluna-acoes">
                    <button
                        type="button"
                        class="notas-btn-remover"
                        data-id="${item.id}"
                    >
                        Remover
                    </button>
                </td>
            `;

            tbody.appendChild(
                tr
            );

            const inputAtividade =
                tr.querySelector(
                    ".notas-periodo-atividade-editar"
                );

            const inputPeriodo =
                tr.querySelector(
                    ".notas-periodo-editar"
                );

            const inputValor =
                tr.querySelector(
                    ".notas-valor-editar"
                );

            const inputQuantidade =
                tr.querySelector(
                    ".notas-quantidade-editar"
                );

            const btnRemover =
                tr.querySelector(
                    ".notas-btn-remover"
                );

            if (inputAtividade) {
                inputAtividade.addEventListener(
                    "change",
                    function () {
                        if (
                            !this.value
                        ) {
                            this.value =
                                item.atividadeId;

                            return;
                        }

                        item.atividadeId =
                            this.value;

                        consolidarPeriodosDuplicados();
                        renderizarPeriodosNotas();
                        renderizarAtividadesRendaNotas();
                        atualizarResultadosNotas();
                    }
                );
            }

            if (inputPeriodo) {
                inputPeriodo.addEventListener(
                    "change",
                    function () {
                        const novoPeriodo =
                            String(
                                this.value ||
                                ""
                            ).trim();

                        if (
                            converterPeriodoParaOrdenacao(
                                novoPeriodo
                            ) ===
                            null
                        ) {
                            this.value =
                                item.periodo;

                            exibirMensagemOcr(
                                "Informe uma competência válida. Exemplo: Março/2026.",
                                "atencao"
                            );

                            return;
                        }

                        item.periodo =
                            novoPeriodo;

                        consolidarPeriodosDuplicados();
                        ordenarPeriodos();
                        renderizarPeriodosNotas();
                        renderizarAtividadesRendaNotas();
                        atualizarResultadosNotas();
                    }
                );
            }

            if (inputValor) {
                inputValor.addEventListener(
                    "input",
                    function () {
                        aplicarMascaraMoeda(
                            this
                        );
                    }
                );

                inputValor.addEventListener(
                    "change",
                    function () {
                        item.valor =
                            converterMoedaParaNumero(
                                this.value
                            );

                        this.value =
                            formatarMoeda(
                                item.valor
                            );

                        renderizarAtividadesRendaNotas();
                        atualizarResultadosNotas();
                        atualizarTotalizadoresPeriodos();
                    }
                );
            }

            if (inputQuantidade) {
                inputQuantidade.addEventListener(
                    "input",
                    function () {
                        item.quantidade =
                            Math.max(
                                0,
                                parseInt(
                                    this.value,
                                    10
                                ) || 0
                            );

                        atualizarResultadosNotas();
                        atualizarTotalizadoresPeriodos();
                    }
                );
            }

            if (btnRemover) {
                btnRemover.addEventListener(
                    "click",
                    function () {
                        removerPeriodo(
                            item.id
                        );
                    }
                );
            }
        }
    );

    atualizarTotalizadoresPeriodos();
}

/* =========================================================
   CONSOLIDA PERÍODOS DUPLICADOS
   ========================================================= */

function consolidarPeriodosDuplicados() {
    const mapa =
        new Map();

    periodosNotas.forEach(
        item => {
            const chave =
                [
                    item.atividadeId,
                    normalizarPeriodoChave(
                        item.periodo
                    )
                ].join("|");

            if (
                !mapa.has(
                    chave
                )
            ) {
                mapa.set(
                    chave,
                    {
                        ...item
                    }
                );

                return;
            }

            const existente =
                mapa.get(
                    chave
                );

            existente.valor +=
                Number(
                    item.valor
                ) || 0;

            existente.quantidade +=
                Number(
                    item.quantidade
                ) || 0;

            if (
                existente.origem !==
                item.origem
            ) {
                existente.origem =
                    "misto";
            }
        }
    );

    periodosNotas =
        Array.from(
            mapa.values()
        );

    ordenarPeriodos();
}

/* =========================================================
   REMOVER PERÍODO
   ========================================================= */

function removerPeriodo(id) {
    periodosNotas =
        periodosNotas.filter(
            item =>
                item.id !== id
        );

    renderizarPeriodosNotas();
    renderizarAtividadesRendaNotas();
    atualizarResultadosNotas();
}

/* =========================================================
   TOTALIZADORES DOS PERÍODOS
   ========================================================= */

function atualizarTotalizadoresPeriodos() {
    const totalNotas =
        periodosNotas.reduce(
            (total, item) =>
                total +
                (
                    Number(
                        item.valor
                    ) || 0
                ),
            0
        );

    const quantidadeNotas =
        periodosNotas.reduce(
            (total, item) =>
                total +
                (
                    Number(
                        item.quantidade
                    ) || 0
                ),
            0
        );

    definirTextoMultiplos(
        [
            "totalNotasPeriodos"
        ],
        formatarMoeda(
            totalNotas
        )
    );

    definirTextoMultiplos(
        [
            "quantidadeNotasPeriodos",
            "quantidadeTotalNotas"
        ],
        String(
            quantidadeNotas
        )
    );

    definirTextoMultiplos(
        [
            "quantidadePeriodos",
            "quantidadePeriodosNotas"
        ],
        String(
            periodosNotas.length
        )
    );
}

/* =========================================================
   RESUMO / CÁLCULO POR ATIVIDADE
   ========================================================= */

function calcularResumoAtividades() {
    return atividadesRendaNotas.map(
        atividade => {
            const periodos =
                periodosNotas.filter(
                    item =>
                        item.atividadeId ===
                        atividade.id &&
                        Number(
                            item.valor
                        ) > 0
                );

            const totalNotas =
                periodos.reduce(
                    (total, item) =>
                        total +
                        (
                            Number(
                                item.valor
                            ) || 0
                        ),
                    0
                );

            const quantidadeNotas =
                periodos.reduce(
                    (total, item) =>
                        total +
                        (
                            Number(
                                item.quantidade
                            ) || 0
                        ),
                    0
                );

            const apuracao =
                determinarMesesConsiderados(
                    atividade,
                    periodos
                );

            const rendaMensal =
                apuracao.meses > 0
                    ? totalNotas /
                    apuracao.meses
                    : 0;

            return {
                atividadeId:
                    atividade.id,

                grupo:
                    atividade.grupo,

                atividade:
                    atividade.atividade,

                nomeGrupo:
                    obterNomeGrupoCadastro(
                        atividade.grupo
                    ),

                nomeAtividade:
                    obterNomeAtividadeCadastro(
                        atividade.grupo,
                        atividade.atividade
                    ),

                criterio:
                    atividade.criterio,

                criterioDescricao:
                    obterDescricaoCriterio(
                        atividade.criterio
                    ),

                totalNotas,

                quantidadeNotas,

                mesesConsiderados:
                    apuracao.meses,

                rendaMensal,

                valido:
                    totalNotas === 0 ||
                    apuracao.valido,

                mensagem:
                    apuracao.mensagem
            };
        }
    );
}

/* =========================================================
   DETERMINAÇÃO DOS MESES
   ========================================================= */

function determinarMesesConsiderados(
    atividade,
    periodos
) {
    if (
        periodos.length ===
        0
    ) {
        return {
            meses: 0,
            valido: true,
            mensagem:
                "Sem valores informados."
        };
    }

    const criterio =
        normalizarCriterioApuracao(
            atividade.criterio
        );

    /* =====================================================
       PERÍODO ECONÔMICO INFORMADO
       ===================================================== */

    if (
        criterio ===
        CRITERIOS_APURACAO_NOTAS.INFORMADO
    ) {
        const meses =
            Math.max(
                0,
                parseInt(
                    atividade.mesesRepresentados,
                    10
                ) || 0
            );

        return {
            meses,
            valido:
                meses > 0,

            mensagem:
                meses > 0
                    ? `Período econômico informado: ${meses} mês(es).`
                    : "Informe a quantidade de meses do período econômico."
        };
    }

    const referencias =
        periodos
            .map(
                item =>
                    converterPeriodoParaOrdenacao(
                        item.periodo
                    )
            )
            .filter(
                valor =>
                    valor !== null
            );

    if (
        referencias.length !==
        periodos.length
    ) {
        return {
            meses: 0,
            valido: false,
            mensagem:
                "Existe período com competência inválida."
        };
    }

    /* =====================================================
       INTERVALO COMPLETO
       ===================================================== */

    if (
        criterio ===
        CRITERIOS_APURACAO_NOTAS.INTERVALO
    ) {
        const seriais =
            referencias.map(
                converterReferenciaPeriodoParaSerialMes
            );

        const menor =
            Math.min(
                ...seriais
            );

        const maior =
            Math.max(
                ...seriais
            );

        const meses =
            maior -
            menor +
            1;

        return {
            meses,
            valido:
                meses > 0,

            mensagem:
                `Intervalo completo entre a primeira e a última competência: ${meses} mês(es).`
        };
    }

    /* =====================================================
       MESES COM MOVIMENTAÇÃO
       ===================================================== */

    const competencias =
        new Set(
            referencias
        );

    const meses =
        competencias.size;

    return {
        meses,
        valido:
            meses > 0,

        mensagem:
            `Competências com movimentação: ${meses} mês(es).`
    };
}

/* =========================================================
   SERIAL DO MÊS
   ========================================================= */

function converterReferenciaPeriodoParaSerialMes(
    referencia
) {
    const ano =
        Math.floor(
            referencia /
            100
        );

    const mes =
        referencia %
        100;

    return (
        ano *
        12 +
        mes -
        1
    );
}

/* =========================================================
   DESCRIÇÃO DO CRITÉRIO
   ========================================================= */

function obterDescricaoCriterio(
    criterio
) {
    const normalizado =
        normalizarCriterioApuracao(
            criterio
        );

    if (
        normalizado ===
        CRITERIOS_APURACAO_NOTAS.INTERVALO
    ) {
        return (
            "Intervalo completo"
        );
    }

    if (
        normalizado ===
        CRITERIOS_APURACAO_NOTAS.INFORMADO
    ) {
        return (
            "Período econômico informado"
        );
    }

    return (
        "Meses com movimentação"
    );
}

/* =========================================================
   CÁLCULO CONSOLIDADO
   ========================================================= */

function atualizarResultadosNotas() {
    const resumos =
        calcularResumoAtividades();

    const atividadesComValor =
        resumos.filter(
            item =>
                item.totalNotas >
                0
        );

    const totalNotas =
        atividadesComValor.reduce(
            (total, item) =>
                total +
                item.totalNotas,
            0
        );

    const quantidadeNotas =
        atividadesComValor.reduce(
            (total, item) =>
                total +
                item.quantidadeNotas,
            0
        );

    const rendaMensal =
        atividadesComValor.reduce(
            (total, item) =>
                total +
                (
                    item.valido
                        ? item.rendaMensal
                        : 0
                ),
            0
        );

    const rendaAnual =
        rendaMensal *
        12;

    definirTextoMultiplos(
        [
            "resultadoRendaMensal",
            "resultadoRendaMensalNotas"
        ],
        formatarMoeda(
            rendaMensal
        )
    );

    definirTextoMultiplos(
        [
            "resultadoRendaAnual",
            "resultadoRendaAnualNotas"
        ],
        formatarMoeda(
            rendaAnual
        )
    );

    definirTextoMultiplos(
        [
            "resultadoTotalNotas"
        ],
        formatarMoeda(
            totalNotas
        )
    );

    definirTextoMultiplos(
        [
            "resultadoQuantidadeAtividades"
        ],
        String(
            atividadesComValor.length
        )
    );

    definirTextoMultiplos(
        [
            "resultadoQuantidadeNotas"
        ],
        String(
            quantidadeNotas
        )
    );

    /*
     * Mantém compatibilidade com o campo antigo.
     * Aqui representa a quantidade total de
     * registros de competência existentes.
     */
    definirTextoMultiplos(
        [
            "resultadoQuantidadePeriodos"
        ],
        String(
            periodosNotas.length
        )
    );

    atualizarTotalizadoresPeriodos();
    atualizarResumoCriterios(
        resumos
    );
}

/* =========================================================
   RESUMO DOS CRITÉRIOS
   ========================================================= */

function atualizarResumoCriterios(
    resumos
) {
    const container =
        document.getElementById(
            "resumoCriteriosNotas"
        );

    if (!container) {
        return;
    }

    const ativos =
        resumos.filter(
            item =>
                item.totalNotas >
                0
        );

    if (
        ativos.length ===
        0
    ) {
        container.innerHTML = `
            <strong>
                Critérios de apuração
            </strong>

            <span>
                Cadastre uma atividade e informe ou processe
                as notas fiscais para realizar o cálculo.
            </span>
        `;

        return;
    }

    const linhas =
        ativos.map(
            item => {
                if (!item.valido) {
                    return `
                        <span>
                            <strong>
                                ${escaparHtml(item.nomeAtividade)}:
                            </strong>
                            ${escaparHtml(item.mensagem)}
                        </span>
                    `;
                }

                return `
                    <span>
                        <strong>
                            ${escaparHtml(item.nomeAtividade)}:
                        </strong>
                        ${escaparHtml(item.criterioDescricao)}
                        — ${item.mesesConsiderados} mês(es)
                        — ${formatarMoeda(item.rendaMensal)}/mês.
                    </span>
                `;
            }
        )
            .join("");

    container.innerHTML = `
        <strong>
            Critérios de apuração
        </strong>

        ${linhas}
    `;
}

/* =========================================================
   LIMPAR CÁLCULO
   ========================================================= */

function limparCalculoNotas() {
    limparArquivosNotas();
}

/* =========================================================
   ARQUIVOS SELECIONADOS
   ========================================================= */

function adicionarArquivosSelecionados(
    novosArquivos
) {
    const chavesExistentes =
        new Set(
            arquivosSelecionados.map(
                arquivo =>
                    gerarChaveArquivo(
                        arquivo
                    )
            )
        );

    novosArquivos.forEach(
        arquivo => {
            const chave =
                gerarChaveArquivo(
                    arquivo
                );

            if (
                !chavesExistentes.has(
                    chave
                )
            ) {
                arquivosSelecionados.push(
                    arquivo
                );

                chavesExistentes.add(
                    chave
                );
            }
        }
    );
}

function gerarChaveArquivo(
    arquivo
) {
    return [
        arquivo.name || "",
        arquivo.size || 0,
        arquivo.lastModified || 0
    ].join("|");
}

/* =========================================================
   RENDERIZAÇÃO DOS ARQUIVOS
   ========================================================= */

function renderizarArquivosSelecionados() {
    const lista =
        obterElementoPorIds(
            "listaArquivosNotasFiscais",
            "listaArquivosNotas"
        );

    if (!lista) {
        return;
    }

    lista.innerHTML = "";

    if (
        arquivosSelecionados.length ===
        0
    ) {
        lista.innerHTML = `
            <div class="notas-sem-dados">
                Nenhum arquivo selecionado.
            </div>
        `;

        return;
    }

    arquivosSelecionados.forEach(
        (arquivo, indice) => {
            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "notas-arquivo-item";

            item.innerHTML = `
                <div class="notas-arquivo-info">
                    <strong>
                        ${escaparHtml(
                arquivo.name
            )}
                    </strong>

                    <span>
                        ${formatarTamanhoArquivo(
                arquivo.size
            )}
                    </span>
                </div>

                <button
                    type="button"
                    class="notas-arquivo-remover"
                    data-indice="${indice}"
                    aria-label="Remover arquivo"
                >
                    Remover
                </button>
            `;

            const botao =
                item.querySelector(
                    ".notas-arquivo-remover"
                );

            if (botao) {
                botao.addEventListener(
                    "click",
                    function () {
                        removerArquivoSelecionado(
                            indice
                        );
                    }
                );
            }

            lista.appendChild(
                item
            );
        }
    );
}

/* =========================================================
   REMOVER ARQUIVO
   ========================================================= */

function removerArquivoSelecionado(
    indice
) {
    arquivosSelecionados.splice(
        indice,
        1
    );

    atualizarInputArquivos();
    renderizarArquivosSelecionados();
}

/* =========================================================
   RECONSTRÓI FILELIST
   ========================================================= */

function atualizarInputArquivos() {
    const input =
        document.getElementById(
            "arquivosNotasFiscais"
        );

    if (!input) {
        return;
    }

    try {
        const transfer =
            new DataTransfer();

        arquivosSelecionados.forEach(
            arquivo => {
                transfer.items.add(
                    arquivo
                );
            }
        );

        input.files =
            transfer.files;
    } catch (erro) {
        console.warn(
            "Não foi possível reconstruir a lista de arquivos.",
            erro
        );
    }
}

/* =========================================================
   LIMPAR ARQUIVOS / CÁLCULO
   ========================================================= */

function limparArquivosNotas() {
    const inputArquivos =
        document.getElementById(
            "arquivosNotasFiscais"
        );

    const inputPeriodo =
        obterElementoPorIds(
            "novoPeriodoNota",
            "periodoNota"
        );

    const inputValor =
        obterElementoPorIds(
            "novoValorNota",
            "valorPeriodoNota"
        );

    const inputQuantidade =
        obterElementoPorIds(
            "novaQuantidadeNotas",
            "quantidadeNotasPeriodo"
        );

    arquivosSelecionados = [];
    notasProcessadas = [];
    periodosNotas = [];
    atividadesRendaNotas = [];

    if (inputArquivos) {
        inputArquivos.value = "";
    }

    if (inputPeriodo) {
        inputPeriodo.value = "";
    }

    if (inputValor) {
        inputValor.value = "";
    }

    if (inputQuantidade) {
        inputQuantidade.value = "0";
    }

    mostrarStatusProcessamento(
        false
    );

    limparMensagemOcr();

    renderizarArquivosSelecionados();
    renderizarAtividadesRendaNotas();
    atualizarSelectAtividadePeriodoManual();
    renderizarPeriodosNotas();
    renderizarNotasProcessadas();
    atualizarResultadosNotas();
}

/* =========================================================
   PROCESSAMENTO DOS ARQUIVOS
   ========================================================= */

async function processarArquivosNotas() {
    if (
        arquivosSelecionados.length ===
        0
    ) {
        exibirMensagemOcr(
            "Selecione pelo menos um arquivo antes de processar.",
            "atencao"
        );

        return;
    }

    if (
        atividadesRendaNotas.length ===
        0
    ) {
        exibirMensagemOcr(
            "Cadastre pelo menos uma atividade antes de processar as notas fiscais.",
            "atencao"
        );

        return;
    }

    const btnProcessar =
        obterElementoPorIds(
            "btnProcessarArquivosNotas",
            "btnProcessarNotas"
        );

    if (btnProcessar) {
        btnProcessar.disabled =
            true;
    }

    notasProcessadas = [];

    mostrarStatusProcessamento(
        true,
        "Preparando processamento...",
        "Aguarde enquanto os documentos são analisados."
    );

    try {
        for (
            let indice = 0;
            indice <
            arquivosSelecionados.length;
            indice++
        ) {
            const arquivo =
                arquivosSelecionados[
                indice
                ];

            atualizarStatusProcessamentoArquivo(
                indice,
                arquivosSelecionados.length,
                arquivo.name
            );

            try {
                const resultados =
                    await processarArquivoNotaFiscal(
                        arquivo,
                        indice,
                        arquivosSelecionados.length
                    );

                /*
                 * Quando existe apenas uma atividade,
                 * vincula automaticamente todas as notas.
                 *
                 * Quando existem várias, o usuário deve
                 * classificá-las no detalhamento.
                 */
                if (
                    atividadesRendaNotas.length ===
                    1
                ) {
                    resultados.forEach(
                        nota => {
                            nota.atividadeId =
                                atividadesRendaNotas[0].id;
                        }
                    );
                }

                notasProcessadas.push(
                    ...resultados
                );
            } catch (erro) {
                console.error(
                    "Erro ao processar arquivo:",
                    arquivo.name,
                    erro
                );

                notasProcessadas.push({
                    arquivo:
                        arquivo.name,

                    data:
                        null,

                    numero:
                        "",

                    emitente:
                        "",

                    valor:
                        0,

                    competencia:
                        "",

                    atividadeId:
                        atividadesRendaNotas.length ===
                            1
                            ? atividadesRendaNotas[0].id
                            : "",

                    status:
                        "Erro no processamento",

                    texto:
                        ""
                });
            }

            await liberarInterface();
        }

        consolidarNotasNosPeriodos();
        renderizarNotasProcessadas();

        const identificadas =
            notasProcessadas.filter(
                nota =>
                    nota.data &&
                    nota.valor > 0
            ).length;

        const semAtividade =
            notasProcessadas.filter(
                nota =>
                    nota.data &&
                    nota.valor > 0 &&
                    !nota.atividadeId
            ).length;

        let mensagem =
            `${notasProcessadas.length} documento(s) ou página(s) analisado(s). ${identificadas} com data e valor identificados.`;

        if (
            semAtividade > 0
        ) {
            mensagem +=
                ` ${semAtividade} nota(s) precisam ser vinculadas a uma atividade antes de entrar no cálculo.`;
        }

        exibirMensagemOcr(
            mensagem,
            identificadas > 0
                ? "sucesso"
                : "atencao"
        );
    } catch (erro) {
        console.error(
            erro
        );

        exibirMensagemOcr(
            "Ocorreu um erro durante o processamento dos documentos.",
            "erro"
        );
    } finally {
        mostrarStatusProcessamento(
            false
        );

        if (btnProcessar) {
            btnProcessar.disabled =
                false;
        }
    }
}

/* =========================================================
   PROCESSAMENTO POR TIPO
   ========================================================= */

async function processarArquivoNotaFiscal(
    arquivo,
    indiceArquivo,
    totalArquivos
) {
    const nome =
        String(
            arquivo.name || ""
        ).toLowerCase();

    if (
        nome.endsWith(
            ".pdf"
        )
    ) {
        return (
            processarPdfNotaFiscal(
                arquivo,
                indiceArquivo,
                totalArquivos
            )
        );
    }

    if (
        nome.endsWith(".jpg") ||
        nome.endsWith(".jpeg") ||
        nome.endsWith(".png") ||
        nome.endsWith(".webp")
    ) {
        const texto =
            await executarOcrImagem(
                arquivo,
                progresso => {
                    atualizarProgressoArquivo(
                        indiceArquivo,
                        totalArquivos,
                        progresso,
                        arquivo.name
                    );
                }
            );

        return [
            interpretarTextoNotaFiscal(
                texto,
                arquivo.name
            )
        ];
    }

    throw new Error(
        "Formato de arquivo não suportado."
    );
}

/* =========================================================
   PDF
   ========================================================= */

async function processarPdfNotaFiscal(
    arquivo,
    indiceArquivo,
    totalArquivos
) {
    const pdfjsLib =
        await carregarPdfJs();

    const arrayBuffer =
        await arquivo.arrayBuffer();

    const pdf =
        await pdfjsLib
            .getDocument({
                data:
                    arrayBuffer
            })
            .promise;

    const resultados = [];

    for (
        let paginaNumero = 1;
        paginaNumero <=
        pdf.numPages;
        paginaNumero++
    ) {
        mostrarStatusProcessamento(
            true,
            `Processando ${arquivo.name}`,
            `Página ${paginaNumero} de ${pdf.numPages}`
        );

        const pagina =
            await pdf.getPage(
                paginaNumero
            );

        let texto =
            await extrairTextoPaginaPdf(
                pagina
            );

        if (
            texto
                .replace(
                    /\s+/g,
                    " "
                )
                .trim()
                .length <
            80
        ) {
            const canvas =
                await renderizarPaginaPdf(
                    pagina
                );

            texto =
                await executarOcrImagem(
                    canvas,
                    progresso => {
                        const progressoPagina =
                            (
                                paginaNumero -
                                1 +
                                progresso
                            ) /
                            pdf.numPages;

                        atualizarProgressoArquivo(
                            indiceArquivo,
                            totalArquivos,
                            progressoPagina,
                            `${arquivo.name} - página ${paginaNumero}`
                        );
                    }
                );

            canvas.width = 1;
            canvas.height = 1;
        }

        resultados.push(
            interpretarTextoNotaFiscal(
                texto,
                pdf.numPages > 1
                    ? `${arquivo.name} - Página ${paginaNumero}`
                    : arquivo.name
            )
        );

        if (
            typeof pagina.cleanup ===
            "function"
        ) {
            pagina.cleanup();
        }

        await liberarInterface();
    }

    if (
        typeof pdf.cleanup ===
        "function"
    ) {
        pdf.cleanup();
    }

    return resultados;
}

/* =========================================================
   CARREGAMENTO DO PDF.JS
   ========================================================= */

async function carregarPdfJs() {
    if (
        window.pdfjsLib
    ) {
        return (
            window.pdfjsLib
        );
    }

    const pdfjsLib =
        await import(
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs"
        );

    pdfjsLib
        .GlobalWorkerOptions
        .workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

    window.pdfjsLib =
        pdfjsLib;

    return pdfjsLib;
}

/* =========================================================
   TEXTO NATIVO DO PDF
   ========================================================= */

async function extrairTextoPaginaPdf(
    pagina
) {
    try {
        const conteudo =
            await pagina
                .getTextContent();

        return conteudo.items
            .map(
                item =>
                    item.str
            )
            .join("\n");
    } catch (erro) {
        console.warn(
            "Não foi possível extrair texto nativo do PDF.",
            erro
        );

        return "";
    }
}

/* =========================================================
   RENDERIZA PDF PARA OCR
   ========================================================= */

async function renderizarPaginaPdf(
    pagina
) {
    const escala =
        2.2;

    const viewport =
        pagina.getViewport({
            scale:
                escala
        });

    const canvas =
        document.createElement(
            "canvas"
        );

    const contexto =
        canvas.getContext(
            "2d",
            {
                willReadFrequently:
                    true
            }
        );

    canvas.width =
        Math.ceil(
            viewport.width
        );

    canvas.height =
        Math.ceil(
            viewport.height
        );

    await pagina.render({
        canvasContext:
            contexto,

        viewport
    }).promise;

    return canvas;
}

/* =========================================================
   OCR
   ========================================================= */

async function executarOcrImagem(
    imagem,
    callbackProgresso
) {
    if (
        typeof window.Tesseract ===
        "undefined" ||
        typeof window.Tesseract
            .recognize !==
        "function"
    ) {
        throw new Error(
            "Tesseract.js não foi carregado."
        );
    }

    const resultado =
        await window.Tesseract.recognize(
            imagem,
            "por",
            {
                logger:
                    mensagem => {
                        if (
                            mensagem.status ===
                            "recognizing text" &&
                            typeof callbackProgresso ===
                            "function"
                        ) {
                            callbackProgresso(
                                mensagem.progress ||
                                0
                            );
                        }
                    }
            }
        );

    return (
        resultado?.data?.text ||
        ""
    );
}

/* =========================================================
   INTERPRETAÇÃO DA NOTA FISCAL
   ========================================================= */

function interpretarTextoNotaFiscal(
    textoOriginal,
    nomeArquivo
) {
    const texto =
        normalizarTextoOcr(
            textoOriginal
        );

    const data =
        extrairDataEmissao(
            texto
        );

    const numero =
        extrairNumeroNota(
            texto
        );

    const emitente =
        extrairEmitente(
            texto
        );

    /*
     * O cálculo utiliza exclusivamente
     * o VALOR TOTAL DA NOTA.
     */
    const valor =
        extrairValorTotal(
            texto
        );

    const competencia =
        data
            ? formatarCompetenciaData(
                data
            )
            : "";

    const pendencias = [];

    if (!data) {
        pendencias.push(
            "data"
        );
    }

    if (!numero) {
        pendencias.push(
            "número"
        );
    }

    if (!emitente) {
        pendencias.push(
            "emitente"
        );
    }

    if (
        valor <= 0
    ) {
        pendencias.push(
            "valor"
        );
    }

    let status =
        "Identificada";

    if (
        pendencias.length >
        0
    ) {
        status =
            "Não identificado: " +
            pendencias.join(
                ", "
            );
    }

    return {
        arquivo:
            nomeArquivo,

        data,

        numero,

        emitente,

        valor,

        competencia,

        atividadeId:
            atividadesRendaNotas.length ===
                1
                ? atividadesRendaNotas[0].id
                : "",

        status,

        texto:
            textoOriginal
    };
}

/* =========================================================
   NORMALIZAÇÃO OCR
   ========================================================= */

function normalizarTextoOcr(
    texto
) {
    return String(
        texto || ""
    )
        .replace(
            /\r/g,
            "\n"
        )
        .replace(
            /[|]/g,
            " "
        )
        .replace(
            /[ \t]+/g,
            " "
        )
        .replace(
            /\n[ \t]+/g,
            "\n"
        )
        .replace(
            /\n{3,}/g,
            "\n\n"
        )
        .trim();
}

function normalizarComparacao(
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
        .toUpperCase()
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}

/* =========================================================
   EXTRAÇÃO DA DATA DE EMISSÃO
   ========================================================= */

function extrairDataEmissao(
    texto
) {
    const linhas =
        String(
            texto || ""
        )
            .split(
                /\n/
            )
            .map(
                linha =>
                    linha.trim()
            )
            .filter(
                Boolean
            );

    const padroes = [
        /DATA\s*(?:DE\s*)?EMISS[AÃ]O[^0-9]{0,30}(\d{2}\/\d{2}\/\d{4})/i,
        /DATA\/HORA\s*(?:DE\s*)?EMISS[AÃ]O[^0-9]{0,30}(\d{2}\/\d{2}\/\d{4})/i,
        /EMISS[AÃ]O[^0-9]{0,30}(\d{2}\/\d{2}\/\d{4})/i,
        /EMITID[AO]\s+EM[^0-9]{0,30}(\d{2}\/\d{2}\/\d{4})/i,
        /DATA\s+DA\s+EMISS[AÃ]O[^0-9]{0,30}(\d{2}\/\d{2}\/\d{4})/i,
        /DATA\s+DE\s+GERA[CÇ][AÃ]O[^0-9]{0,30}(\d{2}\/\d{2}\/\d{4})/i
    ];

    for (
        const padrao of
        padroes
    ) {
        const match =
            texto.match(
                padrao
            );

        if (
            match &&
            validarDataBrasileira(
                match[1]
            )
        ) {
            return (
                match[1]
            );
        }
    }

    for (
        let i = 0;
        i <
        linhas.length;
        i++
    ) {
        const normalizada =
            normalizarComparacao(
                linhas[i]
            );

        if (
            normalizada.includes(
                "EMISSAO"
            ) ||
            normalizada.includes(
                "EMITIDA"
            ) ||
            normalizada.includes(
                "DATA DE GERACAO"
            )
        ) {
            const trecho = [
                linhas[i],
                linhas[i + 1] ||
                "",
                linhas[i + 2] ||
                ""
            ].join(" ");

            const datas =
                trecho.match(
                    /\b\d{2}\/\d{2}\/\d{4}\b/g
                ) || [];

            for (
                const data of
                datas
            ) {
                if (
                    validarDataBrasileira(
                        data
                    )
                ) {
                    return data;
                }
            }
        }
    }

    const todasDatas =
        texto.match(
            /\b\d{2}\/\d{2}\/\d{4}\b/g
        ) || [];

    for (
        const data of
        todasDatas
    ) {
        if (
            validarDataBrasileira(
                data
            )
        ) {
            return data;
        }
    }

    return null;
}

/* =========================================================
   VALIDAÇÃO DA DATA
   ========================================================= */

function validarDataBrasileira(
    valor
) {
    const match =
        String(
            valor || ""
        ).match(
            /^(\d{2})\/(\d{2})\/(\d{4})$/
        );

    if (!match) {
        return false;
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

    if (
        ano < 1900 ||
        ano > 2200 ||
        mes < 1 ||
        mes > 12 ||
        dia < 1 ||
        dia > 31
    ) {
        return false;
    }

    const data =
        new Date(
            ano,
            mes - 1,
            dia
        );

    return (
        data.getFullYear() ===
        ano &&
        data.getMonth() ===
        mes - 1 &&
        data.getDate() ===
        dia
    );
}

/* =========================================================
   EXTRAÇÃO DO NÚMERO DA NOTA
   ========================================================= */

function extrairNumeroNota(
    texto
) {
    const padroes = [
        /N[ÚU]MERO\s+(?:DA\s+)?(?:NFS[- ]?E|NF[- ]?E|NOTA)[^0-9]{0,20}(\d{1,20})/i,
        /N[ÚU]MERO[^0-9]{0,15}(\d{1,20})/i,
        /NF[- ]?E[^0-9]{0,15}(?:N[º°O.]*)?[^0-9]{0,10}(\d{1,20})/i,
        /NFS[- ]?E[^0-9]{0,15}(?:N[º°O.]*)?[^0-9]{0,10}(\d{1,20})/i,
        /NOTA\s+FISCAL[^0-9]{0,20}(?:N[º°O.]*)?[^0-9]{0,10}(\d{1,20})/i,
        /\bN[º°]\s*(\d{1,20})\b/i
    ];

    for (
        const padrao of
        padroes
    ) {
        const match =
            texto.match(
                padrao
            );

        if (
            match &&
            match[1]
        ) {
            const numero =
                String(
                    match[1]
                )
                    .replace(
                        /\D/g,
                        ""
                    )
                    .trim();

            if (numero) {
                return numero;
            }
        }
    }

    return "";
}

/* =========================================================
   EXTRAÇÃO DO EMITENTE
   ========================================================= */

function extrairEmitente(
    texto
) {
    const conteudo =
        String(
            texto || ""
        );

    const linhas =
        conteudo
            .split(
                /\n/
            )
            .map(
                linha =>
                    linha.trim()
            )
            .filter(
                Boolean
            );

    const matchRecebemos =
        conteudo.match(
            /RECEBEMOS\s+DE\s+(.+?)\s+OS\s+PRODUTOS\s+DA\s+NOTA\s+FISCAL/i
        );

    if (
        matchRecebemos &&
        matchRecebemos[1]
    ) {
        const candidato =
            limparNomeEmitente(
                matchRecebemos[1]
            );

        if (candidato) {
            return candidato;
        }
    }

    const padroes = [
        /RAZ[AÃ]O\s+SOCIAL[\s:.-]+([^\n]+)/i,
        /NOME\s*(?:\/|\s+)?RAZ[AÃ]O\s+SOCIAL[\s:.-]+([^\n]+)/i,
        /PRESTADOR\s+DE\s+SERVI[CÇ]OS?[\s:.-]+([^\n]+)/i,
        /EMITENTE[\s:.-]+([^\n]+)/i,
        /FORNECEDOR[\s:.-]+([^\n]+)/i
    ];

    for (
        const padrao of
        padroes
    ) {
        const match =
            conteudo.match(
                padrao
            );

        if (
            match &&
            match[1]
        ) {
            const candidato =
                limparNomeEmitente(
                    match[1]
                );

            if (candidato) {
                return candidato;
            }
        }
    }

    for (
        let i = 0;
        i <
        linhas.length;
        i++
    ) {
        const normalizada =
            normalizarComparacao(
                linhas[i]
            );

        if (
            normalizada ===
            "DANFE" ||
            normalizada.includes(
                "DOCUMENTO AUXILIAR DA"
            )
        ) {
            for (
                let anterior = 1;
                anterior <= 4;
                anterior++
            ) {
                const candidato =
                    limparNomeEmitente(
                        linhas[
                        i -
                        anterior
                        ] ||
                        ""
                    );

                if (
                    candidato &&
                    !/^(NF-?E|SERIE|N[º°]|FAZENDA|SITIO|RODOVIA|RUA|AVENIDA)/i.test(
                        candidato
                    )
                ) {
                    return candidato;
                }
            }
        }
    }

    for (
        let i = 0;
        i <
        linhas.length;
        i++
    ) {
        const normalizada =
            normalizarComparacao(
                linhas[i]
            );

        if (
            normalizada ===
            "EMITENTE" ||
            normalizada.includes(
                "IDENTIFICACAO DO EMITENTE"
            ) ||
            normalizada.includes(
                "DADOS DO EMITENTE"
            ) ||
            normalizada.includes(
                "PRESTADOR DE SERVICOS"
            )
        ) {
            for (
                let proxima = 1;
                proxima <= 4;
                proxima++
            ) {
                const candidato =
                    limparNomeEmitente(
                        linhas[
                        i +
                        proxima
                        ] ||
                        ""
                    );

                if (candidato) {
                    return candidato;
                }
            }
        }
    }

    return "";
}

/* =========================================================
   LIMPEZA DO EMITENTE
   ========================================================= */

function limparNomeEmitente(
    valor
) {
    let texto =
        String(
            valor || ""
        )
            .replace(
                /\s+/g,
                " "
            )
            .trim();

    if (!texto) {
        return "";
    }

    texto =
        texto
            .replace(
                /\b(CNPJ|CPF|INSCRI[CÇ][AÃ]O|IE|IM|ENDERE[CÇ]O|CEP|FONE|TELEFONE)\b.*$/i,
                ""
            )
            .replace(
                /^[\s:.-]+/,
                ""
            )
            .trim();

    if (
        texto.length < 3 ||
        /^\d+$/.test(
            texto
        )
    ) {
        return "";
    }

    if (
        /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(
            texto
        )
    ) {
        return "";
    }

    if (
        texto.length >
        120
    ) {
        texto =
            texto.substring(
                0,
                120
            ).trim();
    }

    return texto;
}

/* =========================================================
   EXTRAÇÃO DO VALOR TOTAL DA NOTA
   ========================================================= */

function extrairValorTotal(
    texto
) {
    const conteudo =
        String(
            texto || ""
        );

    const linhas =
        conteudo
            .split(
                /\n/
            )
            .map(
                linha =>
                    linha.trim()
            )
            .filter(
                Boolean
            );

    /* =====================================================
       PRIORIDADE 1 - CANHOTO
       ===================================================== */

    const padroesCanhoto = [
        /EMISS[AÃ]O\s*:\s*\d{2}\/\d{2}\/\d{4}[\s\S]{0,350}?VALOR\s*:\s*R?\$?\s*([\d.]+,\d{2})/i,
        /DESTINAT[AÁ]RIO\s*:[\s\S]{0,300}?VALOR\s*:\s*R?\$?\s*([\d.]+,\d{2})/i
    ];

    for (
        const padrao of
        padroesCanhoto
    ) {
        const match =
            conteudo.match(
                padrao
            );

        if (
            match &&
            match[1]
        ) {
            const valor =
                converterNumeroBrasileiro(
                    match[1]
                );

            if (
                valor > 0
            ) {
                return valor;
            }
        }
    }

    /* =====================================================
       PRIORIDADE 2 - RÓTULO DIRETO
       ===================================================== */

    const padroesDiretos = [
        /VALOR\s+TOTAL\s+(?:DA\s+)?NOTA[^0-9]{0,80}(?:R\$\s*)?([\d.]+,\d{2})/i,
        /VALOR\s+DA\s+NOTA[^0-9]{0,80}(?:R\$\s*)?([\d.]+,\d{2})/i,
        /TOTAL\s+DA\s+NOTA[^0-9]{0,80}(?:R\$\s*)?([\d.]+,\d{2})/i,
        /VALOR\s+TOTAL\s+(?:DA\s+)?NF[- ]?E[^0-9]{0,80}(?:R\$\s*)?([\d.]+,\d{2})/i,
        /TOTAL\s+NF[- ]?E[^0-9]{0,80}(?:R\$\s*)?([\d.]+,\d{2})/i
    ];

    for (
        const padrao of
        padroesDiretos
    ) {
        const match =
            conteudo.match(
                padrao
            );

        if (
            match &&
            match[1]
        ) {
            const valor =
                converterNumeroBrasileiro(
                    match[1]
                );

            if (
                valor > 0
            ) {
                return valor;
            }
        }
    }

    /* =====================================================
       PRIORIDADE 3 - VALOR PRÓXIMO DO RÓTULO
       ===================================================== */

    for (
        let i = 0;
        i <
        linhas.length;
        i++
    ) {
        const normalizada =
            normalizarComparacao(
                linhas[i]
            );

        const ehTotalDaNota =
            normalizada.includes(
                "VALOR TOTAL DA NOTA"
            ) ||
            normalizada.includes(
                "VALOR TOTAL NOTA"
            ) ||
            normalizada.includes(
                "TOTAL DA NOTA"
            ) ||
            normalizada ===
            "VALOR DA NOTA";

        if (!ehTotalDaNota) {
            continue;
        }

        const valoresMesmaLinha =
            extrairValoresMonetarios(
                linhas[i]
            );

        if (
            valoresMesmaLinha.length >
            0
        ) {
            const valor =
                valoresMesmaLinha[
                valoresMesmaLinha.length -
                1
                ];

            if (
                valor > 0
            ) {
                return valor;
            }
        }

        for (
            let anterior = 1;
            anterior <= 8;
            anterior++
        ) {
            const linhaAnterior =
                linhas[
                i -
                anterior
                ];

            if (!linhaAnterior) {
                continue;
            }

            const valores =
                extrairValoresMonetarios(
                    linhaAnterior
                );

            if (
                valores.length >
                0
            ) {
                const valor =
                    valores[
                    valores.length -
                    1
                    ];

                if (
                    valor > 0
                ) {
                    return valor;
                }
            }
        }

        for (
            let proxima = 1;
            proxima <= 8;
            proxima++
        ) {
            const linhaSeguinte =
                linhas[
                i +
                proxima
                ];

            if (!linhaSeguinte) {
                continue;
            }

            const valores =
                extrairValoresMonetarios(
                    linhaSeguinte
                );

            if (
                valores.length >
                0
            ) {
                const valor =
                    valores[
                    valores.length -
                    1
                    ];

                if (
                    valor > 0
                ) {
                    return valor;
                }
            }
        }
    }

    /*
     * Não utiliza descrição, valor unitário,
     * subtotal, impostos ou maior valor do documento
     * como fallback.
     */
    return 0;
}

/* =========================================================
   VALORES MONETÁRIOS
   ========================================================= */

function extrairValoresMonetarios(
    texto
) {
    const correspondencias =
        String(
            texto || ""
        ).match(
            /(?:R\$\s*)?\d{1,3}(?:\.\d{3})*,\d{2}|(?:R\$\s*)?\d+,\d{2}/g
        ) || [];

    return correspondencias
        .map(
            valor =>
                converterNumeroBrasileiro(
                    valor
                )
        )
        .filter(
            valor =>
                Number.isFinite(
                    valor
                ) &&
                valor >= 0
        );
}

function converterNumeroBrasileiro(
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
        return 0;
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
        : 0;
}

/* =========================================================
   CONSOLIDAÇÃO AUTOMÁTICA
   ========================================================= */

function consolidarNotasNosPeriodos() {
    /*
     * Remove somente a parte OCR.
     *
     * Períodos exclusivamente manuais continuam.
     *
     * Períodos mistos são mantidos apenas com os valores
     * manuais? Como não há armazenamento separado das
     * parcelas manual/OCR, o sistema evita criar "misto"
     * automaticamente durante OCR e reconstrói o OCR
     * sobre os períodos existentes.
     */

    periodosNotas =
        periodosNotas.filter(
            periodo =>
                periodo.origem !==
                "ocr"
        );

    const notasValidas =
        notasProcessadas.filter(
            nota =>
                nota.competencia &&
                Number(
                    nota.valor
                ) >
                0 &&
                nota.atividadeId &&
                obterAtividadePorId(
                    nota.atividadeId
                )
        );

    const agrupamento =
        new Map();

    notasValidas.forEach(
        nota => {
            const chave =
                [
                    nota.atividadeId,
                    nota.competencia
                ].join("|");

            if (
                !agrupamento.has(
                    chave
                )
            ) {
                agrupamento.set(
                    chave,
                    {
                        atividadeId:
                            nota.atividadeId,

                        periodo:
                            formatarCompetenciaExibicao(
                                nota.competencia
                            ),

                        valor:
                            0,

                        quantidade:
                            0
                    }
                );
            }

            const grupo =
                agrupamento.get(
                    chave
                );

            grupo.valor +=
                Number(
                    nota.valor
                ) || 0;

            grupo.quantidade++;
        }
    );

    agrupamento.forEach(
        grupo => {
            /*
             * Se existir período manual na mesma competência
             * e atividade, mantém registros separados para
             * não transformar automaticamente o manual em OCR.
             *
             * A consolidação de duplicados só ocorre em
             * edições feitas pelo usuário.
             */
            const existenteManual =
                periodosNotas.find(
                    periodo =>
                        periodo.atividadeId ===
                        grupo.atividadeId &&
                        normalizarPeriodoChave(
                            periodo.periodo
                        ) ===
                        normalizarPeriodoChave(
                            grupo.periodo
                        ) &&
                        periodo.origem !==
                        "ocr"
                );

            if (existenteManual) {
                periodosNotas.push({
                    id:
                        gerarId(),

                    atividadeId:
                        grupo.atividadeId,

                    periodo:
                        grupo.periodo,

                    valor:
                        grupo.valor,

                    quantidade:
                        grupo.quantidade,

                    origem:
                        "ocr"
                });

                return;
            }

            periodosNotas.push({
                id:
                    gerarId(),

                atividadeId:
                    grupo.atividadeId,

                periodo:
                    grupo.periodo,

                valor:
                    grupo.valor,

                quantidade:
                    grupo.quantidade,

                origem:
                    "ocr"
            });
        }
    );

    ordenarPeriodos();

    renderizarPeriodosNotas();
    renderizarAtividadesRendaNotas();
    atualizarResultadosNotas();
}

/* =========================================================
   RENDERIZAÇÃO DAS NOTAS PROCESSADAS
   ========================================================= */

function renderizarNotasProcessadas() {
    const tbody =
        obterElementoPorIds(
            "tabelaNotasFiscaisIdentificadas",
            "tabelaDetalhamentoNotas"
        );

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    if (
        notasProcessadas.length ===
        0
    ) {
        const tr =
            document.createElement(
                "tr"
            );

        tr.className =
            "notas-linha-vazia";

        tr.innerHTML = `
            <td colspan="7">
                Nenhuma nota fiscal processada.
            </td>
        `;

        tbody.appendChild(
            tr
        );

        return;
    }

    notasProcessadas.forEach(
        nota => {
            const tr =
                document.createElement(
                    "tr"
                );

            const classeStatus =
                nota.data &&
                    nota.valor > 0
                    ? "notas-status-sucesso"
                    : nota.data ||
                        nota.valor > 0
                        ? "notas-status-atencao"
                        : "notas-status-erro";

            const atividadeValida =
                obterAtividadePorId(
                    nota.atividadeId
                );

            tr.innerHTML = `
                <td title="${escaparHtml(nota.arquivo)}">
                    ${escaparHtml(nota.arquivo)}
                </td>

                <td>
                    ${nota.data
                    ? escaparHtml(
                        nota.data
                    )
                    : "-"
                }
                </td>

                <td>
                    ${nota.numero
                    ? escaparHtml(
                        nota.numero
                    )
                    : "-"
                }
                </td>

                <td title="${escaparHtml(nota.emitente || "")}">
                    ${nota.emitente
                    ? escaparHtml(
                        nota.emitente
                    )
                    : "-"
                }
                </td>

                <td>
                    ${nota.valor > 0
                    ? formatarMoeda(
                        nota.valor
                    )
                    : "-"
                }
                </td>

                <td>
                    <select
                        class="notas-input-tabela nota-atividade-editar"
                        aria-label="Atividade da nota fiscal"
                    >
                        ${gerarOpcoesAtividadesCadastradas(
                    atividadeValida
                        ? nota.atividadeId
                        : ""
                )}
                    </select>
                </td>

                <td>
                    <span class="notas-status ${classeStatus}">
                        ${escaparHtml(nota.status)}
                    </span>
                </td>
            `;

            tbody.appendChild(
                tr
            );

            const selectAtividade =
                tr.querySelector(
                    ".nota-atividade-editar"
                );

            if (selectAtividade) {
                selectAtividade.addEventListener(
                    "change",
                    function () {
                        nota.atividadeId =
                            this.value;

                        consolidarNotasNosPeriodos();
                    }
                );
            }
        }
    );
}

/* =========================================================
   BUSCA ATIVIDADE PELO ID
   ========================================================= */

function obterAtividadePorId(
    id
) {
    if (!id) {
        return null;
    }

    return (
        atividadesRendaNotas.find(
            item =>
                item.id === id
        ) ||
        null
    );
}

/* =========================================================
   STATUS DE PROCESSAMENTO
   ========================================================= */

function mostrarStatusProcessamento(
    exibir,
    titulo = "",
    texto = ""
) {
    const status =
        obterElementoPorIds(
            "statusOcrNotasFiscais",
            "statusOcrNotas"
        );

    const tituloElemento =
        obterElementoPorIds(
            "tituloStatusOcrNotasFiscais"
        );

    const textoElemento =
        obterElementoPorIds(
            "textoStatusOcrNotasFiscais",
            "textoStatusOcrNotas"
        );

    if (!status) {
        return;
    }

    status.hidden =
        !exibir;

    if (
        tituloElemento &&
        titulo
    ) {
        tituloElemento.textContent =
            titulo;
    }

    if (
        textoElemento &&
        texto
    ) {
        textoElemento.textContent =
            texto;
    }
}

/* =========================================================
   PROGRESSO
   ========================================================= */

function atualizarStatusProcessamentoArquivo(
    indice,
    total,
    nome
) {
    mostrarStatusProcessamento(
        true,
        `Processando arquivo ${indice + 1} de ${total}`,
        nome
    );
}

function atualizarProgressoArquivo(
    indiceArquivo,
    totalArquivos,
    progressoArquivo,
    descricao
) {
    const progresso =
        Math.min(
            100,
            Math.max(
                0,
                Math.round(
                    (
                        (
                            indiceArquivo +
                            Number(
                                progressoArquivo ||
                                0
                            )
                        ) /
                        totalArquivos
                    ) *
                    100
                )
            )
        );

    mostrarStatusProcessamento(
        true,
        `Processando documentos... ${progresso}%`,
        descricao
    );
}

/* =========================================================
   MENSAGEM OCR
   ========================================================= */

function exibirMensagemOcr(
    mensagem,
    tipo = "sucesso"
) {
    const resultado =
        obterElementoPorIds(
            "resultadoOcrNotasFiscais",
            "resultadoOcrNotas"
        );

    if (!resultado) {
        return;
    }

    resultado.hidden =
        false;

    resultado.className =
        `notas-resultado-ocr notas-status-${tipo}`;

    resultado.textContent =
        mensagem;
}

function limparMensagemOcr() {
    const resultado =
        obterElementoPorIds(
            "resultadoOcrNotasFiscais",
            "resultadoOcrNotas"
        );

    if (!resultado) {
        return;
    }

    resultado.hidden =
        true;

    resultado.textContent =
        "";

    resultado.className =
        "notas-resultado-ocr";
}

/* =========================================================
   COMPETÊNCIA
   ========================================================= */

function formatarCompetenciaData(
    dataBrasileira
) {
    const match =
        String(
            dataBrasileira ||
            ""
        ).match(
            /^(\d{2})\/(\d{2})\/(\d{4})$/
        );

    if (!match) {
        return "";
    }

    return (
        `${match[3]}-${match[2]}`
    );
}

function formatarCompetenciaExibicao(
    competencia
) {
    const match =
        String(
            competencia ||
            ""
        ).match(
            /^(\d{4})-(\d{2})$/
        );

    if (!match) {
        return (
            competencia ||
            ""
        );
    }

    const ano =
        Number(
            match[1]
        );

    const mes =
        Number(
            match[2]
        );

    const nomesMeses = [
        "Janeiro",
        "Fevereiro",
        "Março",
        "Abril",
        "Maio",
        "Junho",
        "Julho",
        "Agosto",
        "Setembro",
        "Outubro",
        "Novembro",
        "Dezembro"
    ];

    return (
        `${nomesMeses[mes - 1]}/${ano}`
    );
}

/* =========================================================
   ORDENAÇÃO DOS PERÍODOS
   ========================================================= */

function ordenarPeriodos() {
    periodosNotas.sort(
        (a, b) => {
            const atividadeA =
                obterAtividadePorId(
                    a.atividadeId
                );

            const atividadeB =
                obterAtividadePorId(
                    b.atividadeId
                );

            const nomeA =
                atividadeA
                    ? obterNomeAtividadeCadastro(
                        atividadeA.grupo,
                        atividadeA.atividade
                    )
                    : "";

            const nomeB =
                atividadeB
                    ? obterNomeAtividadeCadastro(
                        atividadeB.grupo,
                        atividadeB.atividade
                    )
                    : "";

            const comparacaoAtividade =
                nomeA.localeCompare(
                    nomeB,
                    "pt-BR"
                );

            if (
                comparacaoAtividade !==
                0
            ) {
                return (
                    comparacaoAtividade
                );
            }

            const dataA =
                converterPeriodoParaOrdenacao(
                    a.periodo
                );

            const dataB =
                converterPeriodoParaOrdenacao(
                    b.periodo
                );

            if (
                dataA !== null &&
                dataB !== null
            ) {
                return (
                    dataA -
                    dataB
                );
            }

            if (
                dataA !== null
            ) {
                return -1;
            }

            if (
                dataB !== null
            ) {
                return 1;
            }

            return String(
                a.periodo
            ).localeCompare(
                String(
                    b.periodo
                ),
                "pt-BR"
            );
        }
    );
}

function converterPeriodoParaOrdenacao(
    periodo
) {
    const texto =
        normalizarComparacao(
            periodo
        );

    const meses = {
        JANEIRO: 1,
        FEVEREIRO: 2,
        MARCO: 3,
        ABRIL: 4,
        MAIO: 5,
        JUNHO: 6,
        JULHO: 7,
        AGOSTO: 8,
        SETEMBRO: 9,
        OUTUBRO: 10,
        NOVEMBRO: 11,
        DEZEMBRO: 12
    };

    let match =
        texto.match(
            /^([A-Z]+)\s*\/\s*(\d{4})$/
        );

    if (
        match &&
        meses[
        match[1]
        ]
    ) {
        return (
            Number(
                match[2]
            ) *
            100 +
            meses[
            match[1]
            ]
        );
    }

    match =
        texto.match(
            /^(\d{1,2})\s*\/\s*(\d{4})$/
        );

    if (match) {
        const mes =
            Number(
                match[1]
            );

        const ano =
            Number(
                match[2]
            );

        if (
            mes < 1 ||
            mes > 12
        ) {
            return null;
        }

        return (
            ano *
            100 +
            mes
        );
    }

    match =
        texto.match(
            /^(\d{4})-(\d{2})$/
        );

    if (match) {
        const ano =
            Number(
                match[1]
            );

        const mes =
            Number(
                match[2]
            );

        if (
            mes < 1 ||
            mes > 12
        ) {
            return null;
        }

        return (
            ano *
            100 +
            mes
        );
    }

    return null;
}

/* =========================================================
   NORMALIZAÇÃO DO PERÍODO
   ========================================================= */

function normalizarPeriodoChave(
    periodo
) {
    const referencia =
        converterPeriodoParaOrdenacao(
            periodo
        );

    if (
        referencia !==
        null
    ) {
        return String(
            referencia
        );
    }

    return normalizarComparacao(
        periodo
    ).replace(
        /\s/g,
        ""
    );
}

/* =========================================================
   MOEDA
   ========================================================= */

function converterMoedaParaNumero(
    valor
) {
    const textoOriginal =
        String(
            valor || ""
        ).trim();

    if (!textoOriginal) {
        return 0;
    }

    let texto =
        textoOriginal
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
        return 0;
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
        texto =
            texto.replace(
                /[^\d.-]/g,
                ""
            );
    }

    const numero =
        Number(
            texto
        );

    return Number.isFinite(
        numero
    )
        ? numero
        : 0;
}

function aplicarMascaraMoeda(
    input
) {
    if (!input) {
        return;
    }

    const apenasNumeros =
        String(
            input.value ||
            ""
        ).replace(
            /\D/g,
            ""
        );

    if (!apenasNumeros) {
        input.value = "";
        return;
    }

    const centavos =
        Number(
            apenasNumeros
        ) /
        100;

    input.value =
        formatarMoeda(
            centavos
        );
}

function formatarMoeda(
    valor
) {
    const numero =
        Number(
            valor
        ) || 0;

    return numero.toLocaleString(
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
   TAMANHO DO ARQUIVO
   ========================================================= */

function formatarTamanhoArquivo(
    bytes
) {
    const tamanho =
        Number(
            bytes
        ) || 0;

    if (
        tamanho <
        1024
    ) {
        return (
            `${tamanho} B`
        );
    }

    if (
        tamanho <
        1024 *
        1024
    ) {
        return (
            `${(
                tamanho /
                1024
            ).toFixed(1)} KB`
        );
    }

    return (
        `${(
            tamanho /
            1024 /
            1024
        ).toFixed(2)} MB`
    );
}

/* =========================================================
   ID
   ========================================================= */

function gerarId() {
    if (
        window.crypto &&
        typeof window.crypto.randomUUID ===
        "function"
    ) {
        return (
            window.crypto.randomUUID()
        );
    }

    return (
        Date.now()
            .toString(36) +
        Math.random()
            .toString(36)
            .substring(2)
    );
}

/* =========================================================
   LIBERA A INTERFACE
   ========================================================= */

function liberarInterface() {
    return new Promise(
        resolve => {
            setTimeout(
                resolve,
                0
            );
        }
    );
}

/* =========================================================
   HTML SEGURO
   ========================================================= */

function escaparHtml(
    valor
) {
    return String(
        valor ??
        ""
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
   TEXTO
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

function definirTextoMultiplos(
    ids,
    valor
) {
    ids.forEach(
        id => {
            definirTexto(
                id,
                valor
            );
        }
    );
}