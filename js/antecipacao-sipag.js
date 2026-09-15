const LIMITE_VALOR_MONETARIO_CENTAVOS = 999999999999n;

const taxaAntecipacao = document.getElementById("taxaAntecipacao");
const taxaMdr = document.getElementById("taxaMdr");
const dataVenda = document.getElementById("dataVenda");
const parcelasAntecipacao = document.getElementById("parcelasAntecipacao");
const valorVenda = document.getElementById("valorVenda");
const btnCalcularAntecipacao = document.getElementById("btnCalcularAntecipacao");
const btnLimparAntecipacao = document.getElementById("btnLimparAntecipacao");

const resultadoLiquidoAntecipado = document.getElementById("resultadoLiquidoAntecipado");
const resultadoValorVenda = document.getElementById("resultadoValorVenda");
const resultadoQtdParcelas = document.getElementById("resultadoQtdParcelas");
const resultadoLiquidoMdr = document.getElementById("resultadoLiquidoMdr");
const resultadoDescontoAntecipacao = document.getElementById("resultadoDescontoAntecipacao");
const resultadoMdr = document.getElementById("resultadoMdr");
const resultadoTaxaAntecipacao = document.getElementById("resultadoTaxaAntecipacao");
const resultadoTaxaFinal = document.getElementById("resultadoTaxaFinal");
const tabelaAntecipacao = document.getElementById("tabelaAntecipacao");
const tabelaTaxaFlex = document.getElementById("tabelaTaxaFlex");

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
    const valor = limitarCentavos(centavos);

    const inteiro = valor / 100n;
    const decimal = valor % 100n;

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
    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
        return "R$ 0,00";
    }

    return numero.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatarPercentual(
    valorDecimal,
    casas = 4
) {
    const numero = Number(valorDecimal);

    return (
        Number.isFinite(numero)
            ? numero * 100
            : 0
    ).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: casas
    }) + "%";
}

function aplicarMascaraMoeda(input) {
    const centavos = digitosParaCentavos(
        input.value
    );

    input.value = formatarCentavos(
        centavos,
        false
    );
}

function validarValorVenda() {
    const centavos = moedaParaCentavos(
        valorVenda.value
    );

    valorVenda.value = formatarCentavos(
        centavos,
        false
    );

    return centavosParaNumero(
        centavos
    );
}

function dataHojeInput() {
    const hoje = new Date();

    const ano = hoje.getFullYear();

    const mes = String(
        hoje.getMonth() + 1
    ).padStart(2, "0");

    const dia = String(
        hoje.getDate()
    ).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

function adicionarDias(
    data,
    dias
) {
    const novaData =
        new Date(data);

    novaData.setDate(
        novaData.getDate() +
        dias
    );

    return novaData;
}

function formatarData(data) {
    return data.toLocaleDateString(
        "pt-BR"
    );
}

function carregarParcelas() {
    parcelasAntecipacao.innerHTML = "";

    for (
        let i = 1;
        i <= 21;
        i++
    ) {
        const option =
            document.createElement(
                "option"
            );

        option.value = i;
        option.textContent = `${i}x`;

        parcelasAntecipacao.appendChild(
            option
        );
    }

    parcelasAntecipacao.value =
        "12";
}

function calcularOperacao(qtdParcelas) {
    const taxaAnt =
        (
            Number(
                taxaAntecipacao.value
            ) || 0
        ) / 100;

    const mdr =
        (
            Number(
                taxaMdr.value
            ) || 0
        ) / 100;

    const valorTotal =
        moedaParaNumero(
            valorVenda.value
        );

    const dataBase =
        dataVenda.value
            ? new Date(
                `${dataVenda.value}T12:00:00`
            )
            : new Date();

    const parcelaBruta =
        qtdParcelas > 0
            ? valorTotal /
            qtdParcelas
            : 0;

    const linhas = [];

    let totalLiquidoMdr = 0;
    let totalDesconto = 0;
    let totalLiquidoAntecipado = 0;

    for (
        let i = 1;
        i <= qtdParcelas;
        i++
    ) {
        const prazo =
            i * 30;

        const vencimento =
            adicionarDias(
                dataBase,
                prazo
            );

        const valorMdr =
            parcelaBruta *
            mdr;

        const liquidoMdr =
            parcelaBruta -
            valorMdr;

        const desagio =
            Math.pow(
                Math.pow(
                    1 + taxaAnt,
                    1 / 30
                ),
                prazo
            ) - 1;

        const desconto =
            liquidoMdr *
            desagio;

        const liquidoAntecipado =
            liquidoMdr -
            desconto;

        const taxaFinal =
            parcelaBruta > 0
                ? (
                    parcelaBruta -
                    liquidoAntecipado
                ) /
                parcelaBruta
                : 0;

        totalLiquidoMdr +=
            liquidoMdr;

        totalDesconto +=
            desconto;

        totalLiquidoAntecipado +=
            liquidoAntecipado;

        linhas.push({
            parcela: i,
            vencimento,
            prazo,
            parcelaBruta,
            mdr,
            liquidoMdr,
            desagio,
            taxaFinal,
            desconto,
            liquidoAntecipado
        });
    }

    const taxaFinalTotal =
        valorTotal > 0
            ? (
                valorTotal -
                totalLiquidoAntecipado
            ) /
            valorTotal
            : 0;

    return {
        valorTotal,
        qtdParcelas,
        mdr,
        taxaAnt,
        totalLiquidoMdr,
        totalDesconto,
        totalLiquidoAntecipado,
        taxaFinalTotal,
        linhas
    };
}

function preencherDetalhamento(
    resultado
) {
    tabelaAntecipacao.innerHTML = "";

    resultado.linhas.forEach(item => {
        const tr =
            document.createElement(
                "tr"
            );

        tr.innerHTML = `
            <td>${item.parcela}</td>
            <td>${formatarData(item.vencimento)}</td>
            <td>${item.prazo} dias</td>
            <td>${formatarMoeda(item.parcelaBruta)}</td>
            <td>${formatarPercentual(item.mdr, 2)}</td>
            <td>${formatarMoeda(item.liquidoMdr)}</td>
            <td>${formatarPercentual(item.desagio, 4)}</td>
            <td>${formatarPercentual(item.taxaFinal, 4)}</td>
            <td>${formatarMoeda(item.desconto)}</td>
            <td>${formatarMoeda(item.liquidoAntecipado)}</td>
        `;

        tabelaAntecipacao.appendChild(
            tr
        );
    });
}

function preencherTaxaFlex() {
    tabelaTaxaFlex.innerHTML = "";

    for (
        let qtd = 1;
        qtd <= 21;
        qtd++
    ) {
        const resultado =
            calcularOperacao(
                qtd
            );

        const tr =
            document.createElement(
                "tr"
            );

        tr.innerHTML = `
            <td>${qtd}x</td>
            <td>${formatarPercentual(resultado.taxaFinalTotal, 4)}</td>
            <td>${formatarMoeda(resultado.totalLiquidoAntecipado)}</td>
        `;

        tabelaTaxaFlex.appendChild(
            tr
        );
    }
}

function calcular() {
    const qtdParcelas =
        Number(
            parcelasAntecipacao.value
        ) || 1;

    const resultado =
        calcularOperacao(
            qtdParcelas
        );

    resultadoLiquidoAntecipado.textContent =
        formatarMoeda(
            resultado.totalLiquidoAntecipado
        );

    resultadoValorVenda.textContent =
        formatarMoeda(
            resultado.valorTotal
        );

    resultadoQtdParcelas.textContent =
        `${resultado.qtdParcelas}x`;

    resultadoLiquidoMdr.textContent =
        formatarMoeda(
            resultado.totalLiquidoMdr
        );

    resultadoDescontoAntecipacao.textContent =
        formatarMoeda(
            resultado.totalDesconto
        );

    resultadoMdr.textContent =
        formatarPercentual(
            resultado.mdr,
            2
        );

    resultadoTaxaAntecipacao.textContent =
        formatarPercentual(
            resultado.taxaAnt,
            2
        );

    resultadoTaxaFinal.textContent =
        formatarPercentual(
            resultado.taxaFinalTotal,
            4
        );

    preencherDetalhamento(
        resultado
    );

    preencherTaxaFlex();
}

function limpar() {
    taxaAntecipacao.value =
        "1.55";

    taxaMdr.value =
        "2.23";

    dataVenda.value =
        dataHojeInput();

    parcelasAntecipacao.value =
        "12";

    valorVenda.value =
        "48.000,00";

    calcular();
}

function registrarEventos() {
    if (valorVenda) {
        valorVenda.setAttribute(
            "inputmode",
            "numeric"
        );

        valorVenda.setAttribute(
            "autocomplete",
            "off"
        );

        valorVenda.addEventListener(
            "input",
            () => {
                aplicarMascaraMoeda(
                    valorVenda
                );

                calcular();
            }
        );

        valorVenda.addEventListener(
            "blur",
            () => {
                validarValorVenda();
                calcular();
            }
        );
    }

    if (taxaAntecipacao) {
        taxaAntecipacao.addEventListener(
            "input",
            calcular
        );
    }

    if (taxaMdr) {
        taxaMdr.addEventListener(
            "input",
            calcular
        );
    }

    if (dataVenda) {
        dataVenda.addEventListener(
            "change",
            calcular
        );
    }

    if (parcelasAntecipacao) {
        parcelasAntecipacao.addEventListener(
            "change",
            calcular
        );
    }

    if (btnCalcularAntecipacao) {
        btnCalcularAntecipacao.addEventListener(
            "click",
            calcular
        );
    }

    if (btnLimparAntecipacao) {
        btnLimparAntecipacao.addEventListener(
            "click",
            limpar
        );
    }
}

function iniciarAntecipacaoSipag() {
    const camposObrigatorios = [
        taxaAntecipacao,
        taxaMdr,
        dataVenda,
        parcelasAntecipacao,
        valorVenda,
        resultadoLiquidoAntecipado,
        resultadoValorVenda,
        resultadoQtdParcelas,
        resultadoLiquidoMdr,
        resultadoDescontoAntecipacao,
        resultadoMdr,
        resultadoTaxaAntecipacao,
        resultadoTaxaFinal,
        tabelaAntecipacao,
        tabelaTaxaFlex
    ];

    if (
        camposObrigatorios.some(
            campo => !campo
        )
    ) {
        console.error(
            "Antecipação Sipag: existem elementos obrigatórios ausentes no HTML."
        );

        return;
    }

    carregarParcelas();

    dataVenda.value =
        dataHojeInput();

    validarValorVenda();

    registrarEventos();

    calcular();
}

if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        iniciarAntecipacaoSipag
    );
} else {
    iniciarAntecipacaoSipag();
}