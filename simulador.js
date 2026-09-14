const LINHAS_CREDITO = {
    custeio: [
        {
            id: "custeio_agro",
            nome: "Custeio Agropecuário",
            taxa: 8.50,
            prazo: 12,
            carencia: 0
        },
        {
            id: "custeio_pronamp",
            nome: "Custeio PRONAMP - Demonstrativo",
            taxa: 8.00,
            prazo: 12,
            carencia: 0
        },
        {
            id: "custeio_pronaf",
            nome: "Custeio PRONAF - Demonstrativo",
            taxa: 6.00,
            prazo: 12,
            carencia: 0
        }
    ],
    investimento: [
        {
            id: "investimento_rural",
            nome: "Investimento Agropecuário",
            taxa: 9.50,
            prazo: 60,
            carencia: 12
        },
        {
            id: "moderfrota_demo",
            nome: "Máquinas e Equipamentos - Demonstrativo",
            taxa: 10.50,
            prazo: 84,
            carencia: 12
        },
        {
            id: "pronamp_investimento",
            nome: "PRONAMP Investimento - Demonstrativo",
            taxa: 8.50,
            prazo: 96,
            carencia: 24
        }
    ],
    comercializacao: [
        {
            id: "comercializacao",
            nome: "Comercialização Rural",
            taxa: 9.00,
            prazo: 12,
            carencia: 0
        }
    ],
    industrializacao: [
        {
            id: "industrializacao",
            nome: "Industrialização Rural",
            taxa: 9.50,
            prazo: 24,
            carencia: 3
        }
    ]
};

const finalidade = document.getElementById("finalidade");
const linhaCredito = document.getElementById("linhaCredito");
const atividade = document.getElementById("atividade");
const valorProjeto = document.getElementById("valorProjeto");
const recursosProprios = document.getElementById("recursosProprios");
const valorFinanciado = document.getElementById("valorFinanciado");
const prazo = document.getElementById("prazo");
const carencia = document.getElementById("carencia");
const taxa = document.getElementById("taxa");
const periodicidade = document.getElementById("periodicidade");
const sistema = document.getElementById("sistema");
const btnSimular = document.getElementById("btnSimular");
const btnLimpar = document.getElementById("btnLimpar");

const resultadoValorFinanciado = document.getElementById("resultadoValorFinanciado");
const resultadoTaxa = document.getElementById("resultadoTaxa");
const resultadoPrazo = document.getElementById("resultadoPrazo");
const resultadoCarencia = document.getElementById("resultadoCarencia");
const resultadoParcelas = document.getElementById("resultadoParcelas");
const resultadoPrimeiraParcela = document.getElementById("resultadoPrimeiraParcela");
const resultadoUltimaParcela = document.getElementById("resultadoUltimaParcela");
const resultadoJuros = document.getElementById("resultadoJuros");
const resultadoTotal = document.getElementById("resultadoTotal");
const resultadoLinha = document.getElementById("resultadoLinha");
const tabelaParcelas = document.getElementById("tabelaParcelas");

function moedaParaNumero(valor) {
    if (!valor) return 0;

    return Number(
        valor
            .replace(/\./g, "")
            .replace(",", ".")
            .replace(/[^\d.-]/g, "")
    ) || 0;
}

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function formatarNumeroMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatarPercentual(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + "%";
}

function aplicarMascaraMoeda(input) {
    let valor = input.value.replace(/\D/g, "");

    if (!valor) {
        input.value = "0,00";
        return;
    }

    valor = (Number(valor) / 100).toFixed(2);

    input.value = Number(valor).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function carregarLinhasCredito() {
    const lista = LINHAS_CREDITO[finalidade.value] || [];

    linhaCredito.innerHTML = "";

    lista.forEach(item => {
        const option = document.createElement("option");
        option.value = item.id;
        option.textContent = item.nome;
        linhaCredito.appendChild(option);
    });

    aplicarParametrosLinha();
}

function obterLinhaSelecionada() {
    const lista = LINHAS_CREDITO[finalidade.value] || [];
    return lista.find(item => item.id === linhaCredito.value);
}

function aplicarParametrosLinha() {
    const linha = obterLinhaSelecionada();

    if (!linha) return;

    taxa.value = linha.taxa.toFixed(2);
    prazo.value = linha.prazo;
    carencia.value = linha.carencia;

    calcularValorFinanciado();
}

function calcularValorFinanciado() {
    const projeto = moedaParaNumero(valorProjeto.value);
    const recursos = moedaParaNumero(recursosProprios.value);

    const financiado = Math.max(projeto - recursos, 0);

    valorFinanciado.value = formatarNumeroMoeda(financiado);

    return financiado;
}

function obterQuantidadeParcelas(prazoMeses, carenciaMeses, tipoPeriodicidade) {
    const mesesFinanciamento = Math.max(prazoMeses - carenciaMeses, 1);

    const divisor = {
        mensal: 1,
        trimestral: 3,
        semestral: 6,
        anual: 12
    }[tipoPeriodicidade] || 1;

    return Math.max(Math.ceil(mesesFinanciamento / divisor), 1);
}

function obterPeriodosPorAno(tipoPeriodicidade) {
    return {
        mensal: 12,
        trimestral: 4,
        semestral: 2,
        anual: 1
    }[tipoPeriodicidade] || 12;
}

function calcularTaxaPeriodo(taxaAnual, tipoPeriodicidade) {
    const periodosAno = obterPeriodosPorAno(tipoPeriodicidade);
    const taxaDecimal = taxaAnual / 100;

    return Math.pow(1 + taxaDecimal, 1 / periodosAno) - 1;
}

function calcularPrice(valor, taxaPeriodo, quantidadeParcelas) {
    const parcelas = [];

    if (quantidadeParcelas <= 0) {
        return parcelas;
    }

    let valorParcela;

    if (taxaPeriodo === 0) {
        valorParcela = valor / quantidadeParcelas;
    } else {
        valorParcela =
            valor *
            (
                taxaPeriodo *
                Math.pow(1 + taxaPeriodo, quantidadeParcelas)
            ) /
            (
                Math.pow(1 + taxaPeriodo, quantidadeParcelas) - 1
            );
    }

    let saldo = valor;

    for (let i = 1; i <= quantidadeParcelas; i++) {
        const saldoInicial = saldo;
        const juros = saldoInicial * taxaPeriodo;
        let amortizacao = valorParcela - juros;

        if (i === quantidadeParcelas) {
            amortizacao = saldoInicial;
            valorParcela = amortizacao + juros;
        }

        saldo = Math.max(saldoInicial - amortizacao, 0);

        parcelas.push({
            numero: i,
            saldoInicial,
            amortizacao,
            juros,
            valorParcela,
            saldoFinal: saldo
        });
    }

    return parcelas;
}

function calcularSac(valor, taxaPeriodo, quantidadeParcelas) {
    const parcelas = [];

    if (quantidadeParcelas <= 0) {
        return parcelas;
    }

    const amortizacaoBase = valor / quantidadeParcelas;
    let saldo = valor;

    for (let i = 1; i <= quantidadeParcelas; i++) {
        const saldoInicial = saldo;
        const juros = saldoInicial * taxaPeriodo;
        let amortizacao = amortizacaoBase;

        if (i === quantidadeParcelas) {
            amortizacao = saldoInicial;
        }

        const valorParcela = amortizacao + juros;
        saldo = Math.max(saldoInicial - amortizacao, 0);

        parcelas.push({
            numero: i,
            saldoInicial,
            amortizacao,
            juros,
            valorParcela,
            saldoFinal: saldo
        });
    }

    return parcelas;
}

function calcularCarenciaCapitalizada(valor, taxaPeriodo, carenciaMeses, tipoPeriodicidade) {
    if (carenciaMeses <= 0) return valor;

    const divisor = {
        mensal: 1,
        trimestral: 3,
        semestral: 6,
        anual: 12
    }[tipoPeriodicidade] || 1;

    const periodosCarencia = carenciaMeses / divisor;

    return valor * Math.pow(1 + taxaPeriodo, periodosCarencia);
}

function simular() {
    const valor = calcularValorFinanciado();
    const prazoMeses = Number(prazo.value) || 0;
    const carenciaMeses = Number(carencia.value) || 0;
    const taxaAnual = Number(taxa.value) || 0;
    const tipoPeriodicidade = periodicidade.value;
    const sistemaSelecionado = sistema.value;
    const linha = obterLinhaSelecionada();

    if (valor <= 0) {
        alert("Informe um valor financiado maior que zero.");
        return;
    }

    if (prazoMeses <= 0) {
        alert("Informe um prazo válido.");
        return;
    }

    if (carenciaMeses >= prazoMeses) {
        alert("A carência deve ser menor que o prazo total.");
        return;
    }

    const quantidadeParcelas = obterQuantidadeParcelas(
        prazoMeses,
        carenciaMeses,
        tipoPeriodicidade
    );

    const taxaPeriodo = calcularTaxaPeriodo(
        taxaAnual,
        tipoPeriodicidade
    );

    const saldoAposCarencia = calcularCarenciaCapitalizada(
        valor,
        taxaPeriodo,
        carenciaMeses,
        tipoPeriodicidade
    );

    let parcelas;

    if (sistemaSelecionado === "sac") {
        parcelas = calcularSac(
            saldoAposCarencia,
            taxaPeriodo,
            quantidadeParcelas
        );
    } else {
        parcelas = calcularPrice(
            saldoAposCarencia,
            taxaPeriodo,
            quantidadeParcelas
        );
    }

    const totalPago = parcelas.reduce(
        (total, item) => total + item.valorParcela,
        0
    );

    const jurosTotais = totalPago - valor;

    const primeiraParcela = parcelas.length
        ? parcelas[0].valorParcela
        : 0;

    const ultimaParcela = parcelas.length
        ? parcelas[parcelas.length - 1].valorParcela
        : 0;

    resultadoValorFinanciado.textContent = formatarMoeda(valor);
    resultadoTaxa.textContent = formatarPercentual(taxaAnual) + " a.a.";
    resultadoPrazo.textContent = prazoMeses + " meses";
    resultadoCarencia.textContent = carenciaMeses + " meses";
    resultadoParcelas.textContent = quantidadeParcelas;
    resultadoPrimeiraParcela.textContent = formatarMoeda(primeiraParcela);
    resultadoUltimaParcela.textContent = formatarMoeda(ultimaParcela);
    resultadoJuros.textContent = formatarMoeda(jurosTotais);
    resultadoTotal.textContent = formatarMoeda(totalPago);
    resultadoLinha.textContent = linha ? linha.nome : "-";

    preencherTabela(parcelas);
}

function preencherTabela(parcelas) {
    tabelaParcelas.innerHTML = "";

    if (!parcelas.length) {
        tabelaParcelas.innerHTML = `
            <tr>
                <td colspan="6" class="sem-dados">
                    Nenhuma parcela calculada.
                </td>
            </tr>
        `;
        return;
    }

    parcelas.forEach(item => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${item.numero}</td>
            <td>${formatarMoeda(item.saldoInicial)}</td>
            <td>${formatarMoeda(item.amortizacao)}</td>
            <td>${formatarMoeda(item.juros)}</td>
            <td>${formatarMoeda(item.valorParcela)}</td>
            <td>${formatarMoeda(item.saldoFinal)}</td>
        `;

        tabelaParcelas.appendChild(tr);
    });
}

function limparSimulacao() {
    finalidade.value = "custeio";
    atividade.value = "agricultura";
    valorProjeto.value = "100.000,00";
    recursosProprios.value = "20.000,00";
    periodicidade.value = "mensal";
    sistema.value = "price";

    carregarLinhasCredito();
    calcularValorFinanciado();

    resultadoValorFinanciado.textContent = "R$ 0,00";
    resultadoTaxa.textContent = "0,00% a.a.";
    resultadoPrazo.textContent = "0 meses";
    resultadoCarencia.textContent = "0 meses";
    resultadoParcelas.textContent = "0";
    resultadoPrimeiraParcela.textContent = "R$ 0,00";
    resultadoUltimaParcela.textContent = "R$ 0,00";
    resultadoJuros.textContent = "R$ 0,00";
    resultadoTotal.textContent = "R$ 0,00";
    resultadoLinha.textContent = "-";

    tabelaParcelas.innerHTML = `
        <tr>
            <td colspan="6" class="sem-dados">
                Realize uma simulação para visualizar as parcelas.
            </td>
        </tr>
    `;
}

valorProjeto.addEventListener("input", () => {
    aplicarMascaraMoeda(valorProjeto);
    calcularValorFinanciado();
});

recursosProprios.addEventListener("input", () => {
    aplicarMascaraMoeda(recursosProprios);
    calcularValorFinanciado();
});

finalidade.addEventListener("change", carregarLinhasCredito);
linhaCredito.addEventListener("change", aplicarParametrosLinha);
btnSimular.addEventListener("click", simular);
btnLimpar.addEventListener("click", limparSimulacao);

carregarLinhasCredito();
calcularValorFinanciado();
simular();