const LIMITE_VALOR_MONETARIO_CENTAVOS = 999999999999n;

const PARAMETROS_COBRANCA = Object.freeze({
    distribuicaoPadrao: Object.freeze({
        redeBancaria: 46.08,
        redeSicoob: 5.18,
        liqPropria: 2.70,
        correspondente: 46.06
    }),
    custosPadrao: Object.freeze({
        redeBancaria: 0.31,
        redeSicoob: 0.20,
        liqPropria: 0.09,
        correspondente: 1.83,
        processamento: 0.05,
        tarifaNova: 0.10
    }),
    diasUteisMes: 21,
    diasUteisAno: 252
});

const elementos = {
    quantidadeBoletos: document.getElementById("quantidadeBoletos"),
    percentualLiquidados: document.getElementById("percentualLiquidados"),
    ticketMedio: document.getElementById("ticketMedio"),
    percentRedeBancaria: document.getElementById("percentRedeBancaria"),
    percentRedeSicoob: document.getElementById("percentRedeSicoob"),
    percentLiqPropria: document.getElementById("percentLiqPropria"),
    percentCorrespondente: document.getElementById("percentCorrespondente"),
    percentBaixaCedente: document.getElementById("percentBaixaCedente"),
    percentBaixaDecurso: document.getElementById("percentBaixaDecurso"),
    centralizacaoFinanceira: document.getElementById("centralizacaoFinanceira"),
    percentualSaldoMedio: document.getElementById("percentualSaldoMedio"),
    taxaCdiAno: document.getElementById("taxaCdiAno"),
    diasFloat: document.getElementById("diasFloat"),
    custoRedeBancaria: document.getElementById("custoRedeBancaria"),
    custoRedeSicoob: document.getElementById("custoRedeSicoob"),
    custoLiqPropria: document.getElementById("custoLiqPropria"),
    custoCorrespondente: document.getElementById("custoCorrespondente"),
    custoProcessamento: document.getElementById("custoProcessamento"),
    custoTarifaNova: document.getElementById("custoTarifaNova"),
    tarifaDecurso: document.getElementById("tarifaDecurso"),
    tarifaBaixaCedente: document.getElementById("tarifaBaixaCedente"),
    tarifaLiquidacao: document.getElementById("tarifaLiquidacao"),
    tarifaEntrada: document.getElementById("tarifaEntrada"),
    totalDistribuicao: document.getElementById("totalDistribuicao"),
    resultadoMensal: document.getElementById("resultadoMensal"),
    receitaFinanceira: document.getElementById("receitaFinanceira"),
    receitaTarifas: document.getElementById("receitaTarifas"),
    custosOperacionais: document.getElementById("custosOperacionais"),
    resultadoAnual: document.getElementById("resultadoAnual"),
    qtdLiquidados: document.getElementById("qtdLiquidados"),
    saldoMedio: document.getElementById("saldoMedio"),
    taxaCdiMensal: document.getElementById("taxaCdiMensal"),
    receitaSaldoMedio: document.getElementById("receitaSaldoMedio"),
    taxaFloat: document.getElementById("taxaFloat"),
    receitaFloat: document.getElementById("receitaFloat"),
    receitaPorBoleto: document.getElementById("receitaPorBoleto"),
    custoMedioBoleto: document.getElementById("custoMedioBoleto"),
    qtdRedeBancaria: document.getElementById("qtdRedeBancaria"),
    qtdRedeSicoob: document.getElementById("qtdRedeSicoob"),
    qtdLiqPropria: document.getElementById("qtdLiqPropria"),
    qtdCorrespondente: document.getElementById("qtdCorrespondente"),
    qtdProcessamento: document.getElementById("qtdProcessamento"),
    qtdTarifaNova: document.getElementById("qtdTarifaNova"),
    unitRedeBancaria: document.getElementById("unitRedeBancaria"),
    unitRedeSicoob: document.getElementById("unitRedeSicoob"),
    unitLiqPropria: document.getElementById("unitLiqPropria"),
    unitCorrespondente: document.getElementById("unitCorrespondente"),
    unitProcessamento: document.getElementById("unitProcessamento"),
    unitTarifaNova: document.getElementById("unitTarifaNova"),
    totalRedeBancaria: document.getElementById("totalRedeBancaria"),
    totalRedeSicoob: document.getElementById("totalRedeSicoob"),
    totalLiqPropria: document.getElementById("totalLiqPropria"),
    totalCorrespondente: document.getElementById("totalCorrespondente"),
    totalProcessamento: document.getElementById("totalProcessamento"),
    totalTarifaNova: document.getElementById("totalTarifaNova"),
    totalCustosTabela: document.getElementById("totalCustosTabela"),
    baseTarifaDecurso: document.getElementById("baseTarifaDecurso"),
    baseTarifaCedente: document.getElementById("baseTarifaCedente"),
    baseTarifaLiquidacao: document.getElementById("baseTarifaLiquidacao"),
    baseTarifaEntrada: document.getElementById("baseTarifaEntrada"),
    unitTarifaDecurso: document.getElementById("unitTarifaDecurso"),
    unitTarifaCedente: document.getElementById("unitTarifaCedente"),
    unitTarifaLiquidacao: document.getElementById("unitTarifaLiquidacao"),
    unitTarifaEntrada: document.getElementById("unitTarifaEntrada"),
    totalTarifaDecurso: document.getElementById("totalTarifaDecurso"),
    totalTarifaCedente: document.getElementById("totalTarifaCedente"),
    totalTarifaLiquidacao: document.getElementById("totalTarifaLiquidacao"),
    totalTarifaEntrada: document.getElementById("totalTarifaEntrada"),
    totalReceitaTarifasTabela: document.getElementById("totalReceitaTarifasTabela"),
    btnLimpar: document.getElementById("btnLimpar")
};

function numero(valor) {
    const convertido = Number(valor);
    return Number.isFinite(convertido) ? convertido : 0;
}

function limitarCentavos(valor) {
    let centavos;

    try {
        centavos = BigInt(valor);
    } catch {
        return 0n;
    }

    if (centavos < 0n) {
        return 0n;
    }

    return centavos > LIMITE_VALOR_MONETARIO_CENTAVOS
        ? LIMITE_VALOR_MONETARIO_CENTAVOS
        : centavos;
}

function moedaParaCentavos(valor) {
    if (
        valor === null ||
        valor === undefined ||
        valor === ""
    ) {
        return 0n;
    }

    let texto = String(valor)
        .trim()
        .replace(/R\$/gi, "")
        .replace(/\s/g, "");

    if (!texto) {
        return 0n;
    }

    let parteInteira = "0";
    let parteDecimal = "00";

    if (texto.includes(",")) {
        const partes = texto.split(",");

        parteInteira = partes[0]
            .replace(/\./g, "")
            .replace(/\D/g, "");

        parteDecimal = String(partes[1] || "")
            .replace(/\D/g, "")
            .padEnd(2, "0")
            .slice(0, 2);
    } else {
        parteInteira = texto
            .replace(/\./g, "")
            .replace(/\D/g, "");
    }

    if (!parteInteira) {
        parteInteira = "0";
    }

    try {
        return limitarCentavos(
            BigInt(parteInteira) * 100n +
            BigInt(parteDecimal || "0")
        );
    } catch {
        return 0n;
    }
}

function digitosParaCentavos(valor) {
    const digitos = String(valor || "")
        .replace(/\D/g, "");

    if (!digitos) {
        return 0n;
    }

    try {
        return limitarCentavos(
            BigInt(digitos)
        );
    } catch {
        return 0n;
    }
}

function centavosParaNumero(centavos) {
    return Number(
        limitarCentavos(centavos)
    ) / 100;
}

function moedaParaNumero(valor) {
    return centavosParaNumero(
        moedaParaCentavos(valor)
    );
}

function formatarCentavos(
    centavos,
    incluirSimbolo = false
) {
    const valor = limitarCentavos(
        centavos
    );

    const inteiro =
        valor / 100n;

    const decimal =
        valor % 100n;

    const inteiroFormatado = inteiro
        .toString()
        .replace(
            /\B(?=(\d{3})+(?!\d))/g,
            "."
        );

    const decimalFormatado = decimal
        .toString()
        .padStart(2, "0");

    const resultado =
        `${inteiroFormatado},${decimalFormatado}`;

    return incluirSimbolo
        ? `R$ ${resultado}`
        : resultado;
}

function formatarMoeda(valor) {
    const convertido =
        Number(valor);

    return (
        Number.isFinite(convertido)
            ? convertido
            : 0
    ).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatarNumeroMoeda(valor) {
    if (typeof valor === "bigint") {
        return formatarCentavos(
            limitarCentavos(valor),
            false
        );
    }

    const convertido =
        Number(valor);

    if (!Number.isFinite(convertido) || convertido <= 0) {
        return "0,00";
    }

    const centavos =
        BigInt(
            Math.round(
                convertido * 100
            )
        );

    return formatarCentavos(
        centavos,
        false
    );
}

function formatarPercentual(valor, casas = 2) {
    return numero(valor).toLocaleString("pt-BR", {
        minimumFractionDigits: casas,
        maximumFractionDigits: casas
    }) + "%";
}

function formatarQuantidade(valor) {
    return numero(valor).toLocaleString("pt-BR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

function aplicarMascaraMoeda(input) {
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

function normalizarCampoMoeda(input) {
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

function limitarPercentual(valor) {
    return Math.max(
        0,
        Math.min(
            100,
            numero(valor)
        )
    );
}

function calcularTaxaCdiMensal(taxaAnualPercentual) {
    const taxaAno =
        numero(taxaAnualPercentual) /
        100;

    if (taxaAno <= -1) {
        return 0;
    }

    return (
        Math.pow(
            1 + taxaAno,
            PARAMETROS_COBRANCA.diasUteisMes /
            PARAMETROS_COBRANCA.diasUteisAno
        ) - 1
    ) * 100;
}

function calcularTaxaFloat(
    taxaCdiAnualPercentual,
    centralizacaoPercentual,
    diasFloat
) {
    const taxaAno =
        numero(
            taxaCdiAnualPercentual
        ) / 100;

    const centralizacao =
        limitarPercentual(
            centralizacaoPercentual
        ) / 100;

    const dias =
        Math.max(
            0,
            numero(diasFloat)
        );

    if (
        taxaAno <= -1 ||
        dias <= 0
    ) {
        return 0;
    }

    const taxaDia =
        Math.pow(
            1 + taxaAno,
            1 /
            PARAMETROS_COBRANCA.diasUteisAno
        ) - 1;

    return (
        Math.pow(
            1 +
            taxaDia *
            centralizacao,
            dias
        ) - 1
    ) * 100;
}

function calcularSimulacao() {
    const qtdBoletos =
        Math.max(
            0,
            numero(
                elementos
                    .quantidadeBoletos
                    .value
            )
        );

    const percentualLiquidados =
        limitarPercentual(
            elementos
                .percentualLiquidados
                .value
        );

    const ticketMedio =
        moedaParaNumero(
            elementos
                .ticketMedio
                .value
        );

    const percentRedeBancaria =
        limitarPercentual(
            elementos
                .percentRedeBancaria
                .value
        );

    const percentRedeSicoob =
        limitarPercentual(
            elementos
                .percentRedeSicoob
                .value
        );

    const percentLiqPropria =
        limitarPercentual(
            elementos
                .percentLiqPropria
                .value
        );

    const percentCorrespondente =
        limitarPercentual(
            elementos
                .percentCorrespondente
                .value
        );

    const percentualBaixaCedente =
        limitarPercentual(
            elementos
                .percentBaixaCedente
                .value
        );

    const percentualBaixaDecurso =
        limitarPercentual(
            elementos
                .percentBaixaDecurso
                .value
        );

    const centralizacao =
        limitarPercentual(
            elementos
                .centralizacaoFinanceira
                .value
        );

    const percentualSaldoMedio =
        limitarPercentual(
            elementos
                .percentualSaldoMedio
                .value
        );

    const taxaCdiAno =
        Math.max(
            0,
            numero(
                elementos
                    .taxaCdiAno
                    .value
            )
        );

    const diasFloat =
        Math.max(
            0,
            numero(
                elementos
                    .diasFloat
                    .value
            )
        );

    const custoRedeBancaria =
        moedaParaNumero(
            elementos
                .custoRedeBancaria
                .value
        );

    const custoRedeSicoob =
        moedaParaNumero(
            elementos
                .custoRedeSicoob
                .value
        );

    const custoLiqPropria =
        moedaParaNumero(
            elementos
                .custoLiqPropria
                .value
        );

    const custoCorrespondente =
        moedaParaNumero(
            elementos
                .custoCorrespondente
                .value
        );

    const custoProcessamento =
        moedaParaNumero(
            elementos
                .custoProcessamento
                .value
        );

    const custoTarifaNova =
        moedaParaNumero(
            elementos
                .custoTarifaNova
                .value
        );

    const tarifaDecurso =
        moedaParaNumero(
            elementos
                .tarifaDecurso
                .value
        );

    const tarifaBaixaCedente =
        moedaParaNumero(
            elementos
                .tarifaBaixaCedente
                .value
        );

    const tarifaLiquidacao =
        moedaParaNumero(
            elementos
                .tarifaLiquidacao
                .value
        );

    const tarifaEntrada =
        moedaParaNumero(
            elementos
                .tarifaEntrada
                .value
        );

    const totalDistribuicao =
        percentRedeBancaria +
        percentRedeSicoob +
        percentLiqPropria +
        percentCorrespondente;

    const qtdBoletosLiquidados =
        qtdBoletos *
        percentualLiquidados /
        100;

    const saldoMedio =
        ticketMedio *
        qtdBoletosLiquidados;

    const taxaCdiMensal =
        calcularTaxaCdiMensal(
            taxaCdiAno
        );

    const receitaSaldoMedio =
        saldoMedio *
        (
            percentualSaldoMedio /
            100
        ) *
        (
            taxaCdiMensal /
            100
        ) *
        (
            centralizacao /
            100
        );

    const taxaFloat =
        calcularTaxaFloat(
            taxaCdiAno,
            centralizacao,
            diasFloat
        );

    const receitaFloat =
        saldoMedio *
        taxaFloat /
        100;

    const receitaFinanceira =
        receitaSaldoMedio +
        receitaFloat;

    const receitaPorBoleto =
        qtdBoletosLiquidados > 0
            ? receitaFinanceira /
            qtdBoletosLiquidados
            : 0;

    const qtdRedeBancaria =
        Math.ceil(
            qtdBoletos *
            percentRedeBancaria /
            100
        );

    const qtdRedeSicoob =
        Math.ceil(
            qtdBoletos *
            percentRedeSicoob /
            100
        );

    const qtdLiqPropria =
        Math.ceil(
            qtdBoletos *
            percentLiqPropria /
            100
        );

    const qtdCorrespondente =
        Math.ceil(
            qtdBoletos *
            percentCorrespondente /
            100
        );

    const percentualLiquidadosDecimal =
        percentualLiquidados /
        100;

    const qtdProcessamentoBruta =
        (
            qtdBoletos *
            (
                percentRedeBancaria /
                100
            ) *
            percentualLiquidadosDecimal
        ) +
        (
            qtdBoletos *
            (
                percentRedeSicoob /
                100
            ) *
            percentualLiquidadosDecimal
        ) +
        (
            qtdBoletos *
            (
                percentCorrespondente /
                100
            ) *
            percentualLiquidadosDecimal
        );

    const qtdProcessamento =
        Math.ceil(
            qtdProcessamentoBruta
        );

    const qtdTarifaNova =
        Math.ceil(
            qtdBoletos *
            (
                percentualBaixaCedente +
                percentualBaixaDecurso
            ) /
            100
        );

    const totalRedeBancaria =
        qtdRedeBancaria *
        custoRedeBancaria;

    const totalRedeSicoob =
        qtdRedeSicoob *
        custoRedeSicoob;

    const totalLiqPropria =
        qtdLiqPropria *
        custoLiqPropria;

    const totalCorrespondente =
        qtdCorrespondente *
        custoCorrespondente;

    const totalProcessamento =
        qtdProcessamento *
        custoProcessamento;

    const totalTarifaNova =
        qtdTarifaNova *
        custoTarifaNova;

    const custosOperacionais =
        totalRedeBancaria +
        totalRedeSicoob +
        totalLiqPropria +
        totalCorrespondente +
        totalProcessamento +
        totalTarifaNova;

    const custoMedioBoleto =
        qtdBoletos > 0
            ? custosOperacionais /
            qtdBoletos
            : 0;

    const baseTarifaDecurso =
        percentualBaixaDecurso /
        100 *
        qtdBoletos;

    const baseTarifaCedente =
        percentualBaixaCedente /
        100 *
        qtdBoletos;

    const baseTarifaLiquidacao =
        percentualLiquidados /
        100 *
        qtdBoletos;

    const baseTarifaEntrada =
        qtdBoletos;

    const totalTarifaDecurso =
        baseTarifaDecurso *
        tarifaDecurso;

    const totalTarifaCedente =
        baseTarifaCedente *
        tarifaBaixaCedente;

    const totalTarifaLiquidacao =
        baseTarifaLiquidacao *
        tarifaLiquidacao;

    const totalTarifaEntrada =
        baseTarifaEntrada *
        tarifaEntrada;

    const receitaTarifas =
        totalTarifaDecurso +
        totalTarifaCedente +
        totalTarifaLiquidacao +
        totalTarifaEntrada;

    const resultadoMensal =
        receitaFinanceira +
        receitaTarifas -
        custosOperacionais;

    const resultadoAnual =
        resultadoMensal *
        12;

    atualizarTela({
        totalDistribuicao,
        qtdBoletosLiquidados,
        saldoMedio,
        taxaCdiMensal,
        receitaSaldoMedio,
        taxaFloat,
        receitaFloat,
        receitaFinanceira,
        receitaPorBoleto,
        qtdRedeBancaria,
        qtdRedeSicoob,
        qtdLiqPropria,
        qtdCorrespondente,
        qtdProcessamento,
        qtdTarifaNova,
        custoRedeBancaria,
        custoRedeSicoob,
        custoLiqPropria,
        custoCorrespondente,
        custoProcessamento,
        custoTarifaNova,
        totalRedeBancaria,
        totalRedeSicoob,
        totalLiqPropria,
        totalCorrespondente,
        totalProcessamento,
        totalTarifaNova,
        custosOperacionais,
        custoMedioBoleto,
        baseTarifaDecurso,
        baseTarifaCedente,
        baseTarifaLiquidacao,
        baseTarifaEntrada,
        tarifaDecurso,
        tarifaBaixaCedente,
        tarifaLiquidacao,
        tarifaEntrada,
        totalTarifaDecurso,
        totalTarifaCedente,
        totalTarifaLiquidacao,
        totalTarifaEntrada,
        receitaTarifas,
        resultadoMensal,
        resultadoAnual
    });
}

function atualizarTela(r) {
    elementos.totalDistribuicao.textContent =
        formatarPercentual(
            r.totalDistribuicao
        );

    elementos.totalDistribuicao.classList.toggle(
        "indicador-ok",
        Math.abs(
            r.totalDistribuicao -
            100
        ) <= 0.05
    );

    elementos.totalDistribuicao.classList.toggle(
        "indicador-erro",
        Math.abs(
            r.totalDistribuicao -
            100
        ) > 0.05
    );

    elementos.resultadoMensal.textContent =
        formatarMoeda(
            r.resultadoMensal
        );

    elementos.receitaFinanceira.textContent =
        formatarMoeda(
            r.receitaFinanceira
        );

    elementos.receitaTarifas.textContent =
        formatarMoeda(
            r.receitaTarifas
        );

    elementos.custosOperacionais.textContent =
        formatarMoeda(
            r.custosOperacionais
        );

    elementos.resultadoAnual.textContent =
        formatarMoeda(
            r.resultadoAnual
        );

    elementos.qtdLiquidados.textContent =
        formatarQuantidade(
            r.qtdBoletosLiquidados
        );

    elementos.saldoMedio.textContent =
        formatarMoeda(
            r.saldoMedio
        );

    elementos.taxaCdiMensal.textContent =
        formatarPercentual(
            r.taxaCdiMensal
        );

    elementos.receitaSaldoMedio.textContent =
        formatarMoeda(
            r.receitaSaldoMedio
        );

    elementos.taxaFloat.textContent =
        formatarPercentual(
            r.taxaFloat
        );

    elementos.receitaFloat.textContent =
        formatarMoeda(
            r.receitaFloat
        );

    elementos.receitaPorBoleto.textContent =
        formatarMoeda(
            r.receitaPorBoleto
        );

    elementos.custoMedioBoleto.textContent =
        formatarMoeda(
            r.custoMedioBoleto
        );

    elementos.qtdRedeBancaria.textContent =
        formatarQuantidade(
            r.qtdRedeBancaria
        );

    elementos.qtdRedeSicoob.textContent =
        formatarQuantidade(
            r.qtdRedeSicoob
        );

    elementos.qtdLiqPropria.textContent =
        formatarQuantidade(
            r.qtdLiqPropria
        );

    elementos.qtdCorrespondente.textContent =
        formatarQuantidade(
            r.qtdCorrespondente
        );

    elementos.qtdProcessamento.textContent =
        formatarQuantidade(
            r.qtdProcessamento
        );

    elementos.qtdTarifaNova.textContent =
        formatarQuantidade(
            r.qtdTarifaNova
        );

    elementos.unitRedeBancaria.textContent =
        formatarMoeda(
            r.custoRedeBancaria
        );

    elementos.unitRedeSicoob.textContent =
        formatarMoeda(
            r.custoRedeSicoob
        );

    elementos.unitLiqPropria.textContent =
        formatarMoeda(
            r.custoLiqPropria
        );

    elementos.unitCorrespondente.textContent =
        formatarMoeda(
            r.custoCorrespondente
        );

    elementos.unitProcessamento.textContent =
        formatarMoeda(
            r.custoProcessamento
        );

    elementos.unitTarifaNova.textContent =
        formatarMoeda(
            r.custoTarifaNova
        );

    elementos.totalRedeBancaria.textContent =
        formatarMoeda(
            r.totalRedeBancaria
        );

    elementos.totalRedeSicoob.textContent =
        formatarMoeda(
            r.totalRedeSicoob
        );

    elementos.totalLiqPropria.textContent =
        formatarMoeda(
            r.totalLiqPropria
        );

    elementos.totalCorrespondente.textContent =
        formatarMoeda(
            r.totalCorrespondente
        );

    elementos.totalProcessamento.textContent =
        formatarMoeda(
            r.totalProcessamento
        );

    elementos.totalTarifaNova.textContent =
        formatarMoeda(
            r.totalTarifaNova
        );

    elementos.totalCustosTabela.textContent =
        formatarMoeda(
            r.custosOperacionais
        );

    elementos.baseTarifaDecurso.textContent =
        formatarQuantidade(
            r.baseTarifaDecurso
        );

    elementos.baseTarifaCedente.textContent =
        formatarQuantidade(
            r.baseTarifaCedente
        );

    elementos.baseTarifaLiquidacao.textContent =
        formatarQuantidade(
            r.baseTarifaLiquidacao
        );

    elementos.baseTarifaEntrada.textContent =
        formatarQuantidade(
            r.baseTarifaEntrada
        );

    elementos.unitTarifaDecurso.textContent =
        formatarMoeda(
            r.tarifaDecurso
        );

    elementos.unitTarifaCedente.textContent =
        formatarMoeda(
            r.tarifaBaixaCedente
        );

    elementos.unitTarifaLiquidacao.textContent =
        formatarMoeda(
            r.tarifaLiquidacao
        );

    elementos.unitTarifaEntrada.textContent =
        formatarMoeda(
            r.tarifaEntrada
        );

    elementos.totalTarifaDecurso.textContent =
        formatarMoeda(
            r.totalTarifaDecurso
        );

    elementos.totalTarifaCedente.textContent =
        formatarMoeda(
            r.totalTarifaCedente
        );

    elementos.totalTarifaLiquidacao.textContent =
        formatarMoeda(
            r.totalTarifaLiquidacao
        );

    elementos.totalTarifaEntrada.textContent =
        formatarMoeda(
            r.totalTarifaEntrada
        );

    elementos.totalReceitaTarifasTabela.textContent =
        formatarMoeda(
            r.receitaTarifas
        );

    atualizarClasseResultado(
        elementos.resultadoMensal,
        r.resultadoMensal
    );

    atualizarClasseResultado(
        elementos.resultadoAnual,
        r.resultadoAnual
    );
}

function atualizarClasseResultado(
    elemento,
    valor
) {
    const card =
        elemento.closest(
            ".resultado-item"
        );

    if (card) {
        card.classList.remove(
            "resultado-positivo",
            "resultado-negativo"
        );

        if (valor > 0) {
            card.classList.add(
                "resultado-positivo"
            );
        } else if (
            valor < 0
        ) {
            card.classList.add(
                "resultado-negativo"
            );
        }
    }

    if (
        elemento ===
        elementos.resultadoMensal
    ) {
        elemento.classList.remove(
            "valor-positivo",
            "valor-negativo"
        );

        if (
            valor > 0
        ) {
            elemento.classList.add(
                "valor-positivo"
            );
        } else if (
            valor < 0
        ) {
            elemento.classList.add(
                "valor-negativo"
            );
        }
    }
}

function limparSimulacao() {
    elementos.quantidadeBoletos.value =
        0;

    elementos.percentualLiquidados.value =
        100;

    elementos.ticketMedio.value =
        "0,00";

    elementos.percentRedeBancaria.value =
        PARAMETROS_COBRANCA
            .distribuicaoPadrao
            .redeBancaria;

    elementos.percentRedeSicoob.value =
        PARAMETROS_COBRANCA
            .distribuicaoPadrao
            .redeSicoob;

    elementos.percentLiqPropria.value =
        PARAMETROS_COBRANCA
            .distribuicaoPadrao
            .liqPropria;

    elementos.percentCorrespondente.value =
        PARAMETROS_COBRANCA
            .distribuicaoPadrao
            .correspondente;

    elementos.percentBaixaCedente.value =
        0;

    elementos.percentBaixaDecurso.value =
        0;

    elementos.centralizacaoFinanceira.value =
        100;

    elementos.percentualSaldoMedio.value =
        0;

    elementos.taxaCdiAno.value =
        15;

    elementos.diasFloat.value =
        0;

    elementos.custoRedeBancaria.value =
        formatarNumeroMoeda(
            PARAMETROS_COBRANCA
                .custosPadrao
                .redeBancaria
        );

    elementos.custoRedeSicoob.value =
        formatarNumeroMoeda(
            PARAMETROS_COBRANCA
                .custosPadrao
                .redeSicoob
        );

    elementos.custoLiqPropria.value =
        formatarNumeroMoeda(
            PARAMETROS_COBRANCA
                .custosPadrao
                .liqPropria
        );

    elementos.custoCorrespondente.value =
        formatarNumeroMoeda(
            PARAMETROS_COBRANCA
                .custosPadrao
                .correspondente
        );

    elementos.custoProcessamento.value =
        formatarNumeroMoeda(
            PARAMETROS_COBRANCA
                .custosPadrao
                .processamento
        );

    elementos.custoTarifaNova.value =
        formatarNumeroMoeda(
            PARAMETROS_COBRANCA
                .custosPadrao
                .tarifaNova
        );

    elementos.tarifaDecurso.value =
        "0,00";

    elementos.tarifaBaixaCedente.value =
        "0,00";

    elementos.tarifaLiquidacao.value =
        "0,00";

    elementos.tarifaEntrada.value =
        "0,00";

    calcularSimulacao();
}

function registrarEventos() {
    const camposNumericos = [
        elementos.quantidadeBoletos,
        elementos.percentualLiquidados,
        elementos.percentRedeBancaria,
        elementos.percentRedeSicoob,
        elementos.percentLiqPropria,
        elementos.percentCorrespondente,
        elementos.percentBaixaCedente,
        elementos.percentBaixaDecurso,
        elementos.centralizacaoFinanceira,
        elementos.percentualSaldoMedio,
        elementos.taxaCdiAno,
        elementos.diasFloat
    ];

    camposNumericos.forEach(input => {
        input.addEventListener(
            "input",
            calcularSimulacao
        );

        input.addEventListener(
            "change",
            calcularSimulacao
        );
    });

    const camposMoeda = [
        elementos.ticketMedio,
        elementos.custoRedeBancaria,
        elementos.custoRedeSicoob,
        elementos.custoLiqPropria,
        elementos.custoCorrespondente,
        elementos.custoProcessamento,
        elementos.custoTarifaNova,
        elementos.tarifaDecurso,
        elementos.tarifaBaixaCedente,
        elementos.tarifaLiquidacao,
        elementos.tarifaEntrada
    ];

    camposMoeda.forEach(input => {
        input.setAttribute(
            "inputmode",
            "numeric"
        );

        input.setAttribute(
            "autocomplete",
            "off"
        );

        normalizarCampoMoeda(
            input
        );

        input.addEventListener(
            "input",
            () => {
                aplicarMascaraMoeda(
                    input
                );

                calcularSimulacao();
            }
        );

        input.addEventListener(
            "blur",
            () => {
                normalizarCampoMoeda(
                    input
                );

                calcularSimulacao();
            }
        );
    });

    elementos.btnLimpar.addEventListener(
        "click",
        limparSimulacao
    );
}

registrarEventos();
calcularSimulacao();