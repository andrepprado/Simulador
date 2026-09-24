const LIMITE_VALOR_MONETARIO_CENTAVOS =
    999999999999n;

const DOCUMENTOS_BASE = {
    "Custeio Agrícola": [
        "Documentação da atividade e da área de cultivo.",
        "Orçamento, estimativa ou comprovação dos itens de custeio.",
        "Documentação complementar conforme cultura, zoneamento e enquadramento."
    ],

    "Custeio Pecuário": [
        "Documentação da exploração pecuária e do rebanho/criação.",
        "Orçamento, estimativa ou comprovação dos itens de custeio.",
        "Documentação complementar conforme espécie, sistema produtivo e enquadramento."
    ],

    "Investimento": [
        "Documentação da propriedade ou área rural.",
        "Orçamento ou proposta comercial dos bens, serviços ou investimentos.",
        "Documentos técnicos e licenças aplicáveis ao investimento."
    ]
};

const finalidade =
    document.getElementById(
        "finalidade"
    );

const atividade =
    document.getElementById(
        "atividade"
    );

const enquadramentoAtividade =
    document.getElementById(
        "enquadramentoAtividade"
    );

const linhaCredito =
    document.getElementById(
        "linhaCredito"
    );

const fonteRecursos =
    document.getElementById(
        "fonteRecursos"
    );

const aplicabilidade =
    document.getElementById(
        "aplicabilidade"
    );

const tipoTaxa =
    document.getElementById(
        "tipoTaxa"
    );

const taxa =
    document.getElementById(
        "taxa"
    );

const valorProjeto =
    document.getElementById(
        "valorProjeto"
    );

const recursosProprios =
    document.getElementById(
        "recursosProprios"
    );

const valorFinanciado =
    document.getElementById(
        "valorFinanciado"
    );

const prazo =
    document.getElementById(
        "prazo"
    );

const prazoMaximo =
    document.getElementById(
        "prazoMaximo"
    );

const carencia =
    document.getElementById(
        "carencia"
    );

const periodicidade =
    document.getElementById(
        "periodicidade"
    );

const sistema =
    document.getElementById(
        "sistema"
    );

const condicaoLinha =
    document.getElementById(
        "condicaoLinha"
    );

const btnSimular =
    document.getElementById(
        "btnSimular"
    );

const btnLimpar =
    document.getElementById(
        "btnLimpar"
    );

const resultadoValorFinanciado =
    document.getElementById(
        "resultadoValorFinanciado"
    );

const resultadoTaxa =
    document.getElementById(
        "resultadoTaxa"
    );

const resultadoPrazo =
    document.getElementById(
        "resultadoPrazo"
    );

const resultadoCarencia =
    document.getElementById(
        "resultadoCarencia"
    );

const resultadoParcelas =
    document.getElementById(
        "resultadoParcelas"
    );

const resultadoPrimeiraParcela =
    document.getElementById(
        "resultadoPrimeiraParcela"
    );

const resultadoUltimaParcela =
    document.getElementById(
        "resultadoUltimaParcela"
    );

const resultadoJuros =
    document.getElementById(
        "resultadoJuros"
    );

const resultadoTotal =
    document.getElementById(
        "resultadoTotal"
    );

const resultadoFonte =
    document.getElementById(
        "resultadoFonte"
    );

const resultadoAplicabilidade =
    document.getElementById(
        "resultadoAplicabilidade"
    );

const resultadoLinha =
    document.getElementById(
        "resultadoLinha"
    );

const resultadoCodigosAstec =
    document.getElementById(
        "resultadoCodigosAstec"
    );

const tabelaParcelas =
    document.getElementById(
        "tabelaParcelas"
    );

const listaDocumentos =
    document.getElementById(
        "listaDocumentos"
    );

/* =========================================================
   BASE
   ========================================================= */

function obterBase() {
    if (
        !window.CreditoRuralBase
    ) {
        throw new Error(
            "O arquivo credito-rural-atividades.js não foi carregado."
        );
    }

    return window
        .CreditoRuralBase;
}

/* =========================================================
   MOEDA
   ========================================================= */

function limitarCentavos(
    valor
) {
    let centavos;

    try {
        centavos =
            BigInt(
                valor
            );
    } catch {
        return 0n;
    }

    if (
        centavos < 0n
    ) {
        return 0n;
    }

    return (
        centavos >
        LIMITE_VALOR_MONETARIO_CENTAVOS
    )
        ? LIMITE_VALOR_MONETARIO_CENTAVOS
        : centavos;
}

function moedaParaCentavos(
    valor
) {
    if (
        valor === null ||
        valor === undefined ||
        valor === ""
    ) {
        return 0n;
    }

    let texto =
        String(
            valor
        )
            .trim()
            .replace(
                /R\$/gi,
                ""
            )
            .replace(
                /\s/g,
                ""
            );

    if (
        !texto
    ) {
        return 0n;
    }

    let parteInteira =
        "0";

    let parteDecimal =
        "00";

    if (
        texto.includes(
            ","
        )
    ) {
        const partes =
            texto.split(
                ","
            );

        parteInteira =
            partes[0]
                .replace(
                    /\./g,
                    ""
                )
                .replace(
                    /\D/g,
                    ""
                );

        parteDecimal =
            String(
                partes[1] ||
                ""
            )
                .replace(
                    /\D/g,
                    ""
                )
                .padEnd(
                    2,
                    "0"
                )
                .slice(
                    0,
                    2
                );
    } else {
        parteInteira =
            texto
                .replace(
                    /\./g,
                    ""
                )
                .replace(
                    /\D/g,
                    ""
                );
    }

    if (
        !parteInteira
    ) {
        parteInteira =
            "0";
    }

    try {
        return limitarCentavos(
            BigInt(
                parteInteira
            ) *
            100n +
            BigInt(
                parteDecimal ||
                "0"
            )
        );
    } catch {
        return 0n;
    }
}

function digitosParaCentavos(
    valor
) {
    const digitos =
        String(
            valor ||
            ""
        )
            .replace(
                /\D/g,
                ""
            );

    if (
        !digitos
    ) {
        return 0n;
    }

    try {
        return limitarCentavos(
            BigInt(
                digitos
            )
        );
    } catch {
        return 0n;
    }
}

function centavosParaNumero(
    centavos
) {
    return Number(
        limitarCentavos(
            centavos
        )
    ) / 100;
}

function formatarCentavos(
    centavos,
    incluirSimbolo = false
) {
    const valor =
        limitarCentavos(
            centavos
        );

    const inteiro =
        valor / 100n;

    const decimal =
        valor % 100n;

    const inteiroFormatado =
        inteiro
            .toString()
            .replace(
                /\B(?=(\d{3})+(?!\d))/g,
                "."
            );

    const decimalFormatado =
        decimal
            .toString()
            .padStart(
                2,
                "0"
            );

    const resultado =
        `${inteiroFormatado},${decimalFormatado}`;

    return incluirSimbolo
        ? `R$ ${resultado}`
        : resultado;
}

function formatarNumeroComoMoeda(
    valor
) {
    const numero =
        Number(
            valor
        ) || 0;

    return numero
        .toLocaleString(
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

function formatarPercentual(
    valor
) {
    return (
        Number(
            valor
        ) || 0
    )
        .toLocaleString(
            "pt-BR",
            {
                minimumFractionDigits:
                    2,

                maximumFractionDigits:
                    2
            }
        ) +
        "%";
}

function aplicarMascaraMoeda(
    input
) {
    const centavos =
        digitosParaCentavos(
            input.value
        );

    input.value =
        formatarCentavos(
            centavos,
            false
        );
}

function normalizarCampoMonetario(
    input
) {
    const centavos =
        moedaParaCentavos(
            input.value
        );

    input.value =
        formatarCentavos(
            centavos,
            false
        );
}

/* =========================================================
   VALOR FINANCIADO
   ========================================================= */

function calcularValorFinanciadoCentavos() {
    const projeto =
        moedaParaCentavos(
            valorProjeto.value
        );

    const recursos =
        moedaParaCentavos(
            recursosProprios.value
        );

    let financiado =
        projeto -
        recursos;

    if (
        financiado < 0n
    ) {
        financiado =
            0n;
    }

    financiado =
        limitarCentavos(
            financiado
        );

    valorFinanciado.value =
        formatarCentavos(
            financiado,
            false
        );

    return financiado;
}

function calcularValorFinanciado() {
    return centavosParaNumero(
        calcularValorFinanciadoCentavos()
    );
}

/* =========================================================
   ENQUADRAMENTO
   ========================================================= */

function obterEnquadramentoSelecionado() {
    if (
        !enquadramentoAtividade.value
    ) {
        return null;
    }

    return obterBase()
        .obterEnquadramento(
            enquadramentoAtividade.value
        );
}

function obterLinhaSelecionada() {
    const enquadramento =
        obterEnquadramentoSelecionado();

    if (
        !enquadramento ||
        linhaCredito.value ===
        ""
    ) {
        return null;
    }

    return enquadramento
        .linhas[
        Number(
            linhaCredito.value
        )
    ] || null;
}

function definirEstadoCarregamento(
    carregando,
    mensagem = ""
) {
    [
        finalidade,
        atividade,
        enquadramentoAtividade,
        linhaCredito,
        tipoTaxa,
        prazo,
        carencia,
        periodicidade,
        sistema,
        btnSimular,
        btnLimpar
    ].forEach(
        elemento => {
            if (
                elemento
            ) {
                elemento.disabled =
                    carregando;
            }
        }
    );

    if (
        carregando &&
        mensagem
    ) {
        condicaoLinha.textContent =
            mensagem;
    }
}

/* =========================================================
   FINALIDADES
   ========================================================= */

function carregarFinalidades() {
    const base =
        obterBase();

    base.preencherFinalidades(
        finalidade,
        finalidade.value ||
        "Custeio Agrícola"
    );

    if (
        !finalidade.value &&
        finalidade.options.length
    ) {
        finalidade.selectedIndex =
            0;
    }

    carregarAtividades();
}

/* =========================================================
   PRODUTOS / ATIVIDADES
   ========================================================= */

function carregarAtividades() {
    const base =
        obterBase();

    const produtoAnterior =
        atividade.value;

    base.preencherProdutos(
        atividade,
        finalidade.value,
        produtoAnterior
    );

    if (
        !atividade.value &&
        atividade.options.length
    ) {
        atividade.selectedIndex =
            0;
    }

    carregarEnquadramentos();
}

/* =========================================================
   ENQUADRAMENTOS ASTEC
   ========================================================= */

function carregarEnquadramentos() {
    const base =
        obterBase();

    const anterior =
        enquadramentoAtividade.value;

    const lista =
        base.preencherEnquadramentos(
            enquadramentoAtividade,
            finalidade.value,
            atividade.value,
            anterior
        );

    if (
        !enquadramentoAtividade.value &&
        lista.length
    ) {
        enquadramentoAtividade.value =
            lista[0].id;
    }

    carregarLinhasCredito();
}

/* =========================================================
   LINHAS DE CRÉDITO
   ========================================================= */

function montarNomeLinha(
    linha
) {
    const taxaExibida =
        linha.taxaAssociadoTexto ||
        linha.taxaSingularTexto ||
        "-";

    const status =
        (
            linha.aplicabilidade &&
            linha.aplicabilidade !==
            "DIRETA"
        )
            ? ` [${linha.aplicabilidade}]`
            : "";

    return (
        `${linha.linha || "Linha não identificada"} - ` +
        `${linha.finalidade || "Finalidade não identificada"} - ` +
        `${taxaExibida || "-"} a.a.${status}`
    );
}

function carregarLinhasCredito() {
    const enquadramento =
        obterEnquadramentoSelecionado();

    linhaCredito.innerHTML =
        "";

    if (
        !enquadramento ||
        !enquadramento
            .linhas
            .length
    ) {
        aplicarParametrosLinha();
        return;
    }

    enquadramento
        .linhas
        .forEach(
            (
                linha,
                indice
            ) => {
                linhaCredito
                    .appendChild(
                        new Option(
                            montarNomeLinha(
                                linha
                            ),
                            String(
                                indice
                            )
                        )
                    );
            }
        );

    linhaCredito.selectedIndex =
        0;

    aplicarParametrosLinha();
}

/* =========================================================
   TAXAS
   ========================================================= */

function obterTaxaDaLinha(
    linha
) {
    if (
        !linha
    ) {
        return null;
    }

    if (
        tipoTaxa.value ===
        "singular"
    ) {
        return linha
            .taxaSingular;
    }

    return (
        linha.taxaAssociado ??
        linha.taxaSingular
    );
}

/* =========================================================
   PARÂMETROS DA LINHA
   ========================================================= */

function aplicarParametrosLinha() {
    const linha =
        obterLinhaSelecionada();

    const enquadramento =
        obterEnquadramentoSelecionado();

    if (
        !linha
    ) {
        fonteRecursos.value =
            "";

        aplicabilidade.value =
            "";

        prazoMaximo.value =
            "";

        taxa.value =
            "";

        condicaoLinha.innerHTML =
            "Nenhuma linha disponível para o enquadramento selecionado.";

        atualizarResultadoIdentificacao();
        limparResultadosInvalidos();
        atualizarDocumentos();

        return;
    }

    fonteRecursos.value =
        linha.fonte ||
        "-";

    aplicabilidade.value =
        linha.aplicabilidade ||
        "-";

    prazoMaximo.value =
        linha.prazo ||
        "";

    if (
        linha.prazo
    ) {
        prazo.max =
            String(
                linha.prazo
            );

        const prazoAtual =
            Number(
                prazo.value
            ) || 0;

        if (
            prazoAtual <= 0 ||
            prazoAtual >
            linha.prazo
        ) {
            prazo.value =
                String(
                    linha.prazo
                );
        }
    } else {
        prazo.removeAttribute(
            "max"
        );
    }

    if (
        (
            Number(
                carencia.value
            ) || 0
        ) >=
        (
            Number(
                prazo.value
            ) || 0
        )
    ) {
        carencia.value =
            "0";
    }

    const taxaSelecionada =
        obterTaxaDaLinha(
            linha
        );

    taxa.value =
        (
            taxaSelecionada === null ||
            taxaSelecionada === undefined
        )
            ? ""
            : Number(
                taxaSelecionada
            )
                .toFixed(
                    2
                );

    const descricaoEnquadramento =
        enquadramento
            ? obterBase()
                .montarDescricaoEnquadramento(
                    enquadramento,
                    true
                )
            : "-";

    condicaoLinha.innerHTML = `
        <strong>
            ${linha.aplicabilidade || "SEM CLASSIFICAÇÃO"}:
        </strong>

        ${linha.condicao || "Sem observação adicional."}

        <br>

        <strong>
            Referência:
        </strong>

        ${linha.fonteRegra || "-"}

        <br>

        <strong>
            Enquadramento ASTEC:
        </strong>

        ${descricaoEnquadramento}
    `;

    calcularValorFinanciado();
    atualizarResultadoIdentificacao();
    atualizarDocumentos();
    simularAutomaticamente();
}

/* =========================================================
   IDENTIFICAÇÃO DO RESULTADO
   ========================================================= */

function atualizarResultadoIdentificacao() {
    const linha =
        obterLinhaSelecionada();

    const enquadramento =
        obterEnquadramentoSelecionado();

    resultadoLinha.textContent =
        linha
            ? `${linha.linha} - ${linha.finalidade}`
            : "-";

    resultadoFonte.textContent =
        linha?.fonte ||
        "-";

    resultadoAplicabilidade.textContent =
        linha?.aplicabilidade ||
        "-";

    resultadoCodigosAstec.textContent =
        enquadramento?.codigo ||
        "-";
}

/* =========================================================
   PARCELAS
   ========================================================= */

function obterQuantidadeParcelas(
    prazoMeses,
    carenciaMeses,
    tipoPeriodicidade
) {
    const mesesFinanciamento =
        Math.max(
            prazoMeses -
            carenciaMeses,
            1
        );

    const divisor = {
        mensal:
            1,

        trimestral:
            3,

        semestral:
            6,

        anual:
            12
    }[
        tipoPeriodicidade
    ] || 1;

    return Math.max(
        Math.ceil(
            mesesFinanciamento /
            divisor
        ),
        1
    );
}

function obterPeriodosPorAno(
    tipoPeriodicidade
) {
    return {
        mensal:
            12,

        trimestral:
            4,

        semestral:
            2,

        anual:
            1
    }[
        tipoPeriodicidade
    ] || 12;
}

function calcularTaxaPeriodo(
    taxaAnual,
    tipoPeriodicidade
) {
    const periodosAno =
        obterPeriodosPorAno(
            tipoPeriodicidade
        );

    const taxaDecimal =
        taxaAnual /
        100;

    return Math.pow(
        1 +
        taxaDecimal,
        1 /
        periodosAno
    ) - 1;
}

/* =========================================================
   PRICE
   ========================================================= */

function calcularPrice(
    valor,
    taxaPeriodo,
    quantidadeParcelas
) {
    const parcelas = [];

    if (
        quantidadeParcelas <= 0
    ) {
        return parcelas;
    }

    let valorParcela;

    if (
        taxaPeriodo === 0
    ) {
        valorParcela =
            valor /
            quantidadeParcelas;
    } else {
        valorParcela =
            valor *
            (
                taxaPeriodo *
                Math.pow(
                    1 +
                    taxaPeriodo,
                    quantidadeParcelas
                )
            ) /
            (
                Math.pow(
                    1 +
                    taxaPeriodo,
                    quantidadeParcelas
                ) -
                1
            );
    }

    let saldo =
        valor;

    for (
        let i = 1;
        i <= quantidadeParcelas;
        i++
    ) {
        const saldoInicial =
            saldo;

        const juros =
            saldoInicial *
            taxaPeriodo;

        let amortizacao =
            valorParcela -
            juros;

        if (
            i ===
            quantidadeParcelas
        ) {
            amortizacao =
                saldoInicial;

            valorParcela =
                amortizacao +
                juros;
        }

        saldo =
            Math.max(
                saldoInicial -
                amortizacao,
                0
            );

        parcelas.push({
            numero:
                i,

            saldoInicial:
                saldoInicial,

            amortizacao:
                amortizacao,

            juros:
                juros,

            valorParcela:
                valorParcela,

            saldoFinal:
                saldo
        });
    }

    return parcelas;
}

/* =========================================================
   SAC
   ========================================================= */

function calcularSac(
    valor,
    taxaPeriodo,
    quantidadeParcelas
) {
    const parcelas = [];

    if (
        quantidadeParcelas <= 0
    ) {
        return parcelas;
    }

    const amortizacaoBase =
        valor /
        quantidadeParcelas;

    let saldo =
        valor;

    for (
        let i = 1;
        i <= quantidadeParcelas;
        i++
    ) {
        const saldoInicial =
            saldo;

        const juros =
            saldoInicial *
            taxaPeriodo;

        let amortizacao =
            amortizacaoBase;

        if (
            i ===
            quantidadeParcelas
        ) {
            amortizacao =
                saldoInicial;
        }

        const valorParcela =
            amortizacao +
            juros;

        saldo =
            Math.max(
                saldoInicial -
                amortizacao,
                0
            );

        parcelas.push({
            numero:
                i,

            saldoInicial:
                saldoInicial,

            amortizacao:
                amortizacao,

            juros:
                juros,

            valorParcela:
                valorParcela,

            saldoFinal:
                saldo
        });
    }

    return parcelas;
}

/* =========================================================
   CARÊNCIA
   ========================================================= */

function calcularCarenciaCapitalizada(
    valor,
    taxaPeriodo,
    carenciaMeses,
    tipoPeriodicidade
) {
    if (
        carenciaMeses <= 0
    ) {
        return valor;
    }

    const divisor = {
        mensal:
            1,

        trimestral:
            3,

        semestral:
            6,

        anual:
            12
    }[
        tipoPeriodicidade
    ] || 1;

    const periodosCarencia =
        carenciaMeses /
        divisor;

    return valor *
        Math.pow(
            1 +
            taxaPeriodo,
            periodosCarencia
        );
}

/* =========================================================
   VALIDAÇÃO
   ========================================================= */

function validarSimulacao(
    mostrarAlerta = false
) {
    const linha =
        obterLinhaSelecionada();

    const valorCentavos =
        calcularValorFinanciadoCentavos();

    const prazoMeses =
        Number(
            prazo.value
        ) || 0;

    const carenciaMeses =
        Number(
            carencia.value
        ) || 0;

    const taxaAnual =
        Number(
            taxa.value
        );

    function falhar(
        mensagem
    ) {
        if (
            mostrarAlerta
        ) {
            alert(
                mensagem
            );
        }

        return false;
    }

    if (
        !linha
    ) {
        return falhar(
            "Selecione uma linha de crédito válida."
        );
    }

    if (
        linha.aplicabilidade ===
        "SEM VÍNCULO AUTOMÁTICO"
    ) {
        return falhar(
            "O item selecionado não possui vínculo automático com uma linha de crédito."
        );
    }

    if (
        linha.aplicabilidade ===
        "REVISAR"
    ) {
        return falhar(
            "O enquadramento selecionado exige revisão manual antes da simulação."
        );
    }

    if (
        !Number.isFinite(
            taxaAnual
        )
    ) {
        return falhar(
            "A linha selecionada não possui taxa definida para simulação."
        );
    }

    if (
        valorCentavos <= 0n
    ) {
        return falhar(
            "Informe um valor financiado maior que zero."
        );
    }

    if (
        prazoMeses <= 0
    ) {
        return falhar(
            "Informe um prazo válido."
        );
    }

    if (
        linha.prazo &&
        prazoMeses >
        linha.prazo
    ) {
        return falhar(
            `O prazo informado supera o máximo de ${linha.prazo} meses da linha selecionada.`
        );
    }

    if (
        carenciaMeses < 0
    ) {
        return falhar(
            "Informe uma carência válida."
        );
    }

    if (
        carenciaMeses >=
        prazoMeses
    ) {
        return falhar(
            "A carência deve ser menor que o prazo total."
        );
    }

    return true;
}

/* =========================================================
   SIMULAÇÃO
   ========================================================= */

function simular(
    mostrarAlerta = true
) {
    if (
        !validarSimulacao(
            mostrarAlerta
        )
    ) {
        limparResultadosInvalidos();
        atualizarDocumentos();

        return;
    }

    const valorCentavos =
        calcularValorFinanciadoCentavos();

    const valor =
        centavosParaNumero(
            valorCentavos
        );

    const prazoMeses =
        Number(
            prazo.value
        ) || 0;

    const carenciaMeses =
        Number(
            carencia.value
        ) || 0;

    const taxaAnual =
        Number(
            taxa.value
        ) || 0;

    const tipoPeriodicidade =
        periodicidade.value;

    const quantidadeParcelas =
        obterQuantidadeParcelas(
            prazoMeses,
            carenciaMeses,
            tipoPeriodicidade
        );

    const taxaPeriodo =
        calcularTaxaPeriodo(
            taxaAnual,
            tipoPeriodicidade
        );

    const saldoAposCarencia =
        calcularCarenciaCapitalizada(
            valor,
            taxaPeriodo,
            carenciaMeses,
            tipoPeriodicidade
        );

    const parcelas =
        sistema.value ===
            "sac"
            ? calcularSac(
                saldoAposCarencia,
                taxaPeriodo,
                quantidadeParcelas
            )
            : calcularPrice(
                saldoAposCarencia,
                taxaPeriodo,
                quantidadeParcelas
            );

    const totalPago =
        parcelas.reduce(
            (
                total,
                item
            ) =>
                total +
                item.valorParcela,
            0
        );

    const jurosTotais =
        totalPago -
        valor;

    resultadoValorFinanciado.textContent =
        formatarCentavos(
            valorCentavos,
            true
        );

    resultadoTaxa.textContent =
        `${formatarPercentual(taxaAnual)} a.a.`;

    resultadoPrazo.textContent =
        `${prazoMeses} meses`;

    resultadoCarencia.textContent =
        `${carenciaMeses} meses`;

    resultadoParcelas.textContent =
        String(
            quantidadeParcelas
        );

    resultadoPrimeiraParcela.textContent =
        parcelas.length
            ? formatarNumeroComoMoeda(
                parcelas[0]
                    .valorParcela
            )
            : "R$ 0,00";

    resultadoUltimaParcela.textContent =
        parcelas.length
            ? formatarNumeroComoMoeda(
                parcelas[
                    parcelas.length -
                    1
                ].valorParcela
            )
            : "R$ 0,00";

    resultadoJuros.textContent =
        formatarNumeroComoMoeda(
            jurosTotais
        );

    resultadoTotal.textContent =
        formatarNumeroComoMoeda(
            totalPago
        );

    atualizarResultadoIdentificacao();

    preencherTabela(
        parcelas
    );

    atualizarDocumentos();
}

function simularAutomaticamente() {
    simular(
        false
    );
}

/* =========================================================
   RESULTADO INVÁLIDO
   ========================================================= */

function limparResultadosInvalidos() {
    const valorCentavos =
        calcularValorFinanciadoCentavos();

    const prazoMeses =
        Number(
            prazo.value
        ) || 0;

    const carenciaMeses =
        Number(
            carencia.value
        ) || 0;

    const taxaAnual =
        Number(
            taxa.value
        );

    resultadoValorFinanciado.textContent =
        formatarCentavos(
            valorCentavos,
            true
        );

    resultadoTaxa.textContent =
        Number.isFinite(
            taxaAnual
        )
            ? `${formatarPercentual(taxaAnual)} a.a.`
            : "-";

    resultadoPrazo.textContent =
        `${prazoMeses} meses`;

    resultadoCarencia.textContent =
        `${carenciaMeses} meses`;

    resultadoParcelas.textContent =
        "0";

    resultadoPrimeiraParcela.textContent =
        "R$ 0,00";

    resultadoUltimaParcela.textContent =
        "R$ 0,00";

    resultadoJuros.textContent =
        "R$ 0,00";

    resultadoTotal.textContent =
        "R$ 0,00";

    atualizarResultadoIdentificacao();

    tabelaParcelas.innerHTML = `
        <tr>
            <td
                colspan="6"
                class="sem-dados"
            >
                Informe dados válidos para visualizar as parcelas.
            </td>
        </tr>
    `;
}

/* =========================================================
   TABELA
   ========================================================= */

function preencherTabela(
    parcelas
) {
    tabelaParcelas.innerHTML =
        "";

    if (
        !parcelas.length
    ) {
        tabelaParcelas.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="sem-dados"
                >
                    Nenhuma parcela calculada.
                </td>
            </tr>
        `;

        return;
    }

    parcelas.forEach(
        item => {
            const tr =
                document.createElement(
                    "tr"
                );

            tr.innerHTML = `
                <td>
                    ${item.numero}
                </td>

                <td>
                    ${formatarNumeroComoMoeda(item.saldoInicial)}
                </td>

                <td>
                    ${formatarNumeroComoMoeda(item.amortizacao)}
                </td>

                <td>
                    ${formatarNumeroComoMoeda(item.juros)}
                </td>

                <td>
                    ${formatarNumeroComoMoeda(item.valorParcela)}
                </td>

                <td>
                    ${formatarNumeroComoMoeda(item.saldoFinal)}
                </td>
            `;

            tabelaParcelas
                .appendChild(
                    tr
                );
        }
    );
}

/* =========================================================
   INFORMAÇÕES DA OPERAÇÃO
   ========================================================= */

function criarGrupoDocumentos(
    titulo,
    documentos
) {
    if (
        !documentos ||
        !documentos.length
    ) {
        return "";
    }

    const itens =
        documentos
            .filter(
                Boolean
            )
            .map(
                documento =>
                    `<li class="documento-item">${documento}</li>`
            )
            .join(
                ""
            );

    return `
        <div class="documento-grupo">

            <div class="documento-grupo-titulo">
                ${titulo}
            </div>

            <ul class="documento-lista">
                ${itens}
            </ul>

        </div>
    `;
}

function atualizarDocumentos() {
    const linha =
        obterLinhaSelecionada();

    const enquadramento =
        obterEnquadramentoSelecionado();

    let html =
        "";

    if (
        enquadramento
    ) {
        html +=
            criarGrupoDocumentos(
                "Enquadramento ASTEC",
                [
                    `Código: ${enquadramento.codigo || "-"}.`,

                    `Produto: ${enquadramento.produto || "-"}.`,

                    `Finalidade: ${enquadramento.finalidade || "-"}.`,

                    `Modalidade: ${enquadramento.modalidade || "-"}.`,

                    `Variedade: ${enquadramento.variedade || "-"}.`,

                    `Cesta: ${enquadramento.cesta || "-"}.`,

                    `Consórcio: ${enquadramento.consorcio || "-"}.`,

                    `U.M. Produção: ${enquadramento.unidadeProducao || "-"}.`,

                    `Zoneamento: ${enquadramento.zoneamento || "-"}.`
                ]
            );
    }

    if (
        linha
    ) {
        html +=
            criarGrupoDocumentos(
                "Linha de Crédito",
                [
                    `Beneficiário: ${linha.beneficiario || "-"}.`,

                    `Linha: ${linha.linha || "-"}.`,

                    `Finalidade da linha: ${linha.finalidade || "-"}.`,

                    `Fonte de recursos: ${linha.fonte || "-"}.`,

                    linha.prazo
                        ? `Prazo máximo: ${linha.prazo} meses.`
                        : "Prazo máximo: não definido na relação.",

                    linha.taxaSingularTexto
                        ? `Taxa da cooperativa singular: ${linha.taxaSingularTexto} a.a.`
                        : "",

                    linha.taxaAssociadoTexto
                        ? `Taxa do cooperado/associado: ${linha.taxaAssociadoTexto} a.a.`
                        : "",

                    `Aplicabilidade: ${linha.aplicabilidade || "-"}.`,

                    linha.condicao
                        ? `Condição: ${linha.condicao}`
                        : "",

                    linha.fonteRegra
                        ? `Referência da regra: ${linha.fonteRegra}`
                        : ""
                ]
            );
    }

    html +=
        criarGrupoDocumentos(
            "Documentação orientativa",
            DOCUMENTOS_BASE[
            finalidade.value
            ] || []
        );

    listaDocumentos.innerHTML =
        html;
}

/* =========================================================
   LIMPAR
   ========================================================= */

function limparSimulacao() {
    finalidade.value =
        "Custeio Agrícola";

    valorProjeto.value =
        "100.000,00";

    recursosProprios.value =
        "20.000,00";

    carencia.value =
        "0";

    periodicidade.value =
        "mensal";

    sistema.value =
        "price";

    tipoTaxa.value =
        "associado";

    carregarAtividades();

    calcularValorFinanciado();

    atualizarDocumentos();

    simularAutomaticamente();
}

/* =========================================================
   EVENTOS
   ========================================================= */

valorProjeto.addEventListener(
    "input",
    () => {
        aplicarMascaraMoeda(
            valorProjeto
        );

        calcularValorFinanciado();

        simularAutomaticamente();
    }
);

recursosProprios.addEventListener(
    "input",
    () => {
        aplicarMascaraMoeda(
            recursosProprios
        );

        calcularValorFinanciado();

        simularAutomaticamente();
    }
);

valorProjeto.addEventListener(
    "blur",
    () => {
        normalizarCampoMonetario(
            valorProjeto
        );

        calcularValorFinanciado();

        simularAutomaticamente();
    }
);

recursosProprios.addEventListener(
    "blur",
    () => {
        normalizarCampoMonetario(
            recursosProprios
        );

        calcularValorFinanciado();

        simularAutomaticamente();
    }
);

finalidade.addEventListener(
    "change",
    carregarAtividades
);

atividade.addEventListener(
    "change",
    carregarEnquadramentos
);

enquadramentoAtividade.addEventListener(
    "change",
    carregarLinhasCredito
);

linhaCredito.addEventListener(
    "change",
    aplicarParametrosLinha
);

tipoTaxa.addEventListener(
    "change",
    aplicarParametrosLinha
);

prazo.addEventListener(
    "input",
    simularAutomaticamente
);

carencia.addEventListener(
    "input",
    simularAutomaticamente
);

periodicidade.addEventListener(
    "change",
    simularAutomaticamente
);

sistema.addEventListener(
    "change",
    simularAutomaticamente
);

btnSimular.addEventListener(
    "click",
    () => {
        simular(
            true
        );
    }
);

btnLimpar.addEventListener(
    "click",
    limparSimulacao
);

/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

async function inicializar() {
    definirEstadoCarregamento(
        true,
        "Carregando a base unificada de Crédito Rural..."
    );

    aplicarMascaraMoeda(
        valorProjeto
    );

    aplicarMascaraMoeda(
        recursosProprios
    );

    try {
        await obterBase()
            .carregar();

        definirEstadoCarregamento(
            false
        );

        carregarFinalidades();

        calcularValorFinanciado();

        atualizarDocumentos();

        simularAutomaticamente();
    } catch (
    erro
    ) {
        console.error(
            "Erro ao carregar a base de Crédito Rural:",
            erro
        );

        condicaoLinha.innerHTML = `
            <strong>
                Erro:
            </strong>

            ${erro.message}

            <br>

            Verifique se o arquivo

            <code>
                ${obterBase().obterUrlBase()}
            </code>

            existe no caminho informado.
        `;

        tabelaParcelas.innerHTML = `
            <tr>

                <td
                    colspan="6"
                    class="sem-dados"
                >
                    Não foi possível carregar
                    a base de Crédito Rural.
                </td>

            </tr>
        `;
    }
}

inicializar();