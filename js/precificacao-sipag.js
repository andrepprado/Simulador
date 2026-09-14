const BANDEIRAS = [
    { id: "cabal", nome: "Cabal", debit: true },
    { id: "visa", nome: "Visa", debit: true },
    { id: "master", nome: "Master", debit: true },
    { id: "elo", nome: "Elo", debit: true },
    { id: "amex", nome: "Amex", debit: false }
];

const MODALIDADES = [
    { id: "debito", nome: "Débito", produtoIc: "Debit" },
    { id: "credito", nome: "Crédito à Vista", produtoIc: "Credit" },
    { id: "parcelado26", nome: "Parcelado 2 a 6", produtoIc: "Installment < 6 Faturamento" },
    { id: "parcelado721", nome: "Parcelado 7 a 21", produtoIc: "Installment > 6 Faturamento" }
];

const PARAMETROS_LOCAIS = Object.freeze({
    cdiAnual: 0.145,
    fatorFunding: 1.01,
    fatorResultadoAntecipacao: 1,
    impostoAntecipacao: 0
});

const EQUIPAMENTOS_LOCAIS = Object.freeze({
    smartPos: 93,
    pinPad: 27
});

const statusMotorSipag = document.getElementById("statusMotorSipag");
const cnaeSipag = document.getElementById("cnaeSipag");
const mccSipag = document.getElementById("mccSipag");
const segmentoSipag = document.getElementById("segmentoSipag");
const tipoPrecificacao = document.getElementById("tipoPrecificacao");
const faturamentoMensal = document.getElementById("faturamentoMensal");
const faturamentoAnual = document.getElementById("faturamentoAnual");
const tabelaMixSipag = document.getElementById("tabelaMixSipag");
const totalMixSipag = document.getElementById("totalMixSipag");
const blocosTaxasSipag = document.getElementById("blocosTaxasSipag");
const volumeAntecipado = document.getElementById("volumeAntecipado");
const taxaAntecipacaoPrecificacao = document.getElementById("taxaAntecipacaoPrecificacao");
const durationAntecipacao = document.getElementById("durationAntecipacao");
const qtdSmartPos = document.getElementById("qtdSmartPos");
const valorSmartPos = document.getElementById("valorSmartPos");
const mesesSmartPos = document.getElementById("mesesSmartPos");
const qtdPinPad = document.getElementById("qtdPinPad");
const valorPinPad = document.getElementById("valorPinPad");
const mesesPinPad = document.getElementById("mesesPinPad");
const resultadoFinalMensal = document.getElementById("resultadoFinalMensal");
const resultadoNetMdr = document.getElementById("resultadoNetMdr");
const resultadoAntecipacao = document.getElementById("resultadoAntecipacao");
const resultadoEquipamentos = document.getElementById("resultadoEquipamentos");
const resultadoFinalAnual = document.getElementById("resultadoFinalAnual");
const resultadoPayback = document.getElementById("resultadoPayback");
const resultadoCustoOperacional = document.getElementById("resultadoCustoOperacional");
const tabelaResultadoBandeiras = document.getElementById("tabelaResultadoBandeiras");

function moedaParaNumero(valor) {
    if (!valor) return 0;

    return Number(
        String(valor)
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

function formatarPercentualDecimal(valor, casas = 4) {
    return (Number(valor || 0) * 100).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: casas
    }) + "%";
}

function aplicarMascaraMoeda(input) {
    let valor = input.value.replace(/\D/g, "");

    if (!valor) {
        input.value = "0,00";
        return;
    }

    valor = Number(valor) / 100;

    input.value = valor.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function normalizarCodigo(valor) {
    const somenteNumeros = String(valor ?? "").replace(/\D/g, "");

    if (!somenteNumeros) {
        return "";
    }

    return String(Number(somenteNumeros));
}

function arredondar4(valor) {
    return Math.round((valor + Number.EPSILON) * 10000) / 10000;
}

function truncar4(valor) {
    return Math.trunc(valor * 10000) / 10000;
}

function criarMixFaturamento() {
    tabelaMixSipag.innerHTML = "";

    BANDEIRAS.forEach(bandeira => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${bandeira.nome}</td>
            ${MODALIDADES.map(modalidade => {
            if (!bandeira.debit && modalidade.id === "debito") {
                return "<td>-</td>";
            }

            return `
                    <td class="tabela-input">
                        <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value="0"
                            class="mix-input"
                            data-bandeira="${bandeira.id}"
                            data-modalidade="${modalidade.id}"
                        >
                    </td>
                `;
        }).join("")}
        `;

        tabelaMixSipag.appendChild(tr);
    });

    document.querySelectorAll(".mix-input").forEach(input => {
        input.addEventListener("input", calcularTudo);
    });
}

function criarCamposTaxas() {
    blocosTaxasSipag.innerHTML = "";

    BANDEIRAS.forEach(bandeira => {
        const bloco = document.createElement("div");

        bloco.className = "bloco-bandeira";

        bloco.innerHTML = `
            <div class="bloco-bandeira-titulo">${bandeira.nome}</div>

            <div class="bloco-bandeira-conteudo">
                <table class="tabela-taxas">
                    <thead>
                        <tr>
                            <th>Modalidade</th>
                            <th>Taxa Solicitada</th>
                            <th>Intercâmbio</th>
                            <th>Assessment</th>
                            <th>Custo Operacional</th>
                            <th>Processamento</th>
                            <th>Impostos</th>
                            <th>NET MDR</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${MODALIDADES.map(modalidade => {
            if (!bandeira.debit && modalidade.id === "debito") {
                return "";
            }

            const chave = `${bandeira.id}_${modalidade.id}`;

            return `
                                <tr>
                                    <td>${modalidade.nome}</td>

                                    <td>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value="0"
                                            class="taxa-solicitada"
                                            data-bandeira="${bandeira.id}"
                                            data-modalidade="${modalidade.id}"
                                        >
                                    </td>

                                    <td id="intercambio_${chave}">0,0000%</td>
                                    <td id="assessment_${chave}">0,0000%</td>
                                    <td id="operacional_${chave}">0,0000%</td>
                                    <td id="processamento_${chave}">0,0000%</td>
                                    <td id="impostos_${chave}">0,0000%</td>
                                    <td id="net_${chave}">0,0000%</td>
                                </tr>
                            `;
        }).join("")}
                    </tbody>
                </table>
            </div>
        `;

        blocosTaxasSipag.appendChild(bloco);
    });

    document.querySelectorAll(".taxa-solicitada").forEach(input => {
        input.addEventListener("input", calcularTudo);
    });
}

function localizarCnae() {
    const codigo = normalizarCodigo(cnaeSipag.value);

    cnaeSipag.value = codigo;
    segmentoSipag.value = "";

    calcularTudo();
}

function localizarMcc() {
    const mcc = normalizarCodigo(mccSipag.value);

    mccSipag.value = mcc;
    segmentoSipag.value = "";

    calcularTudo();
}

function obterCustoMccBase() {
    return null;
}

function obterCustoOperacional() {
    return 0;
}

function obterIntercambioTabela() {
    return 0;
}

function obterAssessment() {
    return 0;
}

function obterCustoProcessamento() {
    return 0;
}

function obterTaxaSolicitada(bandeira, modalidade) {
    const input = document.querySelector(
        `.taxa-solicitada[data-bandeira="${bandeira}"][data-modalidade="${modalidade}"]`
    );

    if (!input) {
        return 0;
    }

    return (Number(input.value) || 0) / 100;
}

function obterMix(bandeira, modalidade) {
    const input = document.querySelector(
        `.mix-input[data-bandeira="${bandeira}"][data-modalidade="${modalidade}"]`
    );

    if (!input) {
        return 0;
    }

    return (Number(input.value) || 0) / 100;
}

function obterImpostoMdr() {
    return 0;
}

function calcularNetMdr(bandeira, modalidade) {
    const taxaSolicitada = obterTaxaSolicitada(
        bandeira,
        modalidade
    );

    const intercambio =
        bandeira === "cabal"
            ? taxaSolicitada / 2
            : obterIntercambioTabela(
                bandeira,
                modalidade
            );

    const assessment = obterAssessment(
        bandeira,
        modalidade
    );

    const custoOperacional = obterCustoOperacional(
        bandeira
    );

    const processamento = obterCustoProcessamento();

    const imposto = obterImpostoMdr(
        bandeira,
        taxaSolicitada,
        intercambio
    );

    const bruto =
        taxaSolicitada -
        intercambio -
        assessment -
        custoOperacional -
        processamento -
        imposto;

    const net =
        bandeira === "cabal" &&
            (
                modalidade === "parcelado26" ||
                modalidade === "parcelado721"
            )
            ? truncar4(bruto)
            : arredondar4(bruto);

    return {
        taxaSolicitada,
        intercambio,
        assessment,
        custoOperacional,
        processamento,
        imposto,
        net
    };
}

function preencherResultadoTaxa(bandeira, modalidade, calculo) {
    const chave = `${bandeira}_${modalidade}`;

    const campos = {
        intercambio: document.getElementById(`intercambio_${chave}`),
        assessment: document.getElementById(`assessment_${chave}`),
        operacional: document.getElementById(`operacional_${chave}`),
        processamento: document.getElementById(`processamento_${chave}`),
        impostos: document.getElementById(`impostos_${chave}`),
        net: document.getElementById(`net_${chave}`)
    };

    if (campos.intercambio) {
        campos.intercambio.textContent =
            formatarPercentualDecimal(calculo.intercambio);
    }

    if (campos.assessment) {
        campos.assessment.textContent =
            formatarPercentualDecimal(calculo.assessment);
    }

    if (campos.operacional) {
        campos.operacional.textContent =
            formatarPercentualDecimal(calculo.custoOperacional);
    }

    if (campos.processamento) {
        campos.processamento.textContent =
            formatarPercentualDecimal(calculo.processamento);
    }

    if (campos.impostos) {
        campos.impostos.textContent =
            formatarPercentualDecimal(calculo.imposto);
    }

    if (campos.net) {
        campos.net.textContent =
            formatarPercentualDecimal(calculo.net);

        campos.net.style.color =
            calculo.net < 0
                ? "#c62828"
                : "#00A091";
    }
}

function calcularMdr() {
    const faturamento = moedaParaNumero(
        faturamentoMensal.value
    );

    let totalMix = 0;
    let totalMdr = 0;

    const resultadosBandeiras = [];

    BANDEIRAS.forEach(bandeira => {
        let resultadoBandeira = 0;

        const modalidades = {};

        MODALIDADES.forEach(modalidade => {
            if (
                !bandeira.debit &&
                modalidade.id === "debito"
            ) {
                return;
            }

            const mix = obterMix(
                bandeira.id,
                modalidade.id
            );

            totalMix += mix;

            const calculo = calcularNetMdr(
                bandeira.id,
                modalidade.id
            );

            preencherResultadoTaxa(
                bandeira.id,
                modalidade.id,
                calculo
            );

            const resultadoModalidade =
                calculo.net *
                mix *
                faturamento;

            modalidades[modalidade.id] = {
                net: calculo.net,
                resultado: resultadoModalidade
            };

            resultadoBandeira += resultadoModalidade;
        });

        totalMdr += resultadoBandeira;

        resultadosBandeiras.push({
            bandeira,
            resultadoBandeira,
            modalidades
        });
    });

    totalMixSipag.textContent =
        formatarPercentualDecimal(
            totalMix,
            2
        );

    totalMixSipag.style.color =
        Math.abs(totalMix - 1) > 0.0001
            ? "#ffb4b4"
            : "#ffffff";

    return {
        totalMix,
        totalMdr,
        resultadosBandeiras
    };
}

function calcularAntecipacao() {
    const volume =
        moedaParaNumero(
            volumeAntecipado.value
        );

    const taxaMensal =
        (Number(taxaAntecipacaoPrecificacao.value) || 0) / 100;

    const duration =
        Number(durationAntecipacao.value) || 0;

    if (
        volume <= 0 ||
        taxaMensal <= 0 ||
        duration <= 0
    ) {
        return {
            bruto: 0,
            funding: 0,
            impostos: 0,
            liquido: 0
        };
    }

    const valorPresente =
        volume /
        Math.pow(
            1 + taxaMensal / 30,
            duration
        );

    const bruto =
        volume -
        valorPresente;

    const cdiAnual =
        Number(PARAMETROS_LOCAIS.cdiAnual) || 0;

    const fatorFunding =
        Number(PARAMETROS_LOCAIS.fatorFunding) || 0;

    const impostoAntecipacao =
        Number(PARAMETROS_LOCAIS.impostoAntecipacao) || 0;

    const fatorResultadoAntecipacao =
        Number(PARAMETROS_LOCAIS.fatorResultadoAntecipacao) || 0;

    const cdiComFundingAno =
        cdiAnual *
        fatorFunding;

    const fatorFundingDia =
        Math.pow(
            1 + cdiComFundingAno,
            1 / 360
        );

    const baseFunding =
        volume -
        bruto;

    const funding =
        (
            (
                Math.pow(
                    fatorFundingDia,
                    duration
                ) *
                baseFunding
            ) -
            baseFunding
        ) * -1;

    const impostos =
        (
            bruto *
            impostoAntecipacao
        ) * -1;

    const liquido =
        (
            bruto +
            funding +
            impostos
        ) *
        fatorResultadoAntecipacao;

    return {
        bruto,
        funding,
        impostos,
        liquido
    };
}

function calcularEquipamentos() {
    const smartQtd =
        Number(qtdSmartPos.value) || 0;

    const smartProposto =
        moedaParaNumero(valorSmartPos.value);

    const smartMeses =
        Number(mesesSmartPos.value) || 0;

    const pinQtd =
        Number(qtdPinPad.value) || 0;

    const pinProposto =
        moedaParaNumero(valorPinPad.value);

    const pinMeses =
        Number(mesesPinPad.value) || 0;

    const valorSmart =
        Number(EQUIPAMENTOS_LOCAIS.smartPos) || 0;

    const valorPin =
        Number(EQUIPAMENTOS_LOCAIS.pinPad) || 0;

    const complementoSmart =
        Math.max(
            valorSmart - smartProposto,
            0
        ) *
        smartQtd *
        smartMeses;

    const complementoPin =
        Math.max(
            valorPin - pinProposto,
            0
        ) *
        pinQtd *
        pinMeses;

    const custoTotal =
        complementoSmart +
        complementoPin;

    const impactoMensal =
        custoTotal > 0
            ? -(custoTotal / 12)
            : 0;

    return {
        complementoSmart,
        complementoPin,
        custoTotal,
        impactoMensal
    };
}

function calcularPayback(
    resultadoMdrAntecipacaoMensal,
    custoEquipamentos
) {
    if (custoEquipamentos <= 0) {
        return resultadoMdrAntecipacaoMensal > 0
            ? "1 - mês(es)"
            : "-";
    }

    if (resultadoMdrAntecipacaoMensal <= 0) {
        return "Não haverá retorno financeiro para esta negociação em 24 meses.";
    }

    const meses =
        Math.ceil(
            custoEquipamentos /
            resultadoMdrAntecipacaoMensal
        );

    return meses <= 24
        ? `${Math.max(1, meses)} - mês(es)`
        : "Não haverá retorno financeiro para esta negociação em 24 meses.";
}

function preencherTabelaResultados(resultadosBandeiras) {
    tabelaResultadoBandeiras.innerHTML = "";

    resultadosBandeiras.forEach(item => {
        const bandeira =
            item.bandeira;

        const valores =
            MODALIDADES.map(modalidade => {
                if (
                    !bandeira.debit &&
                    modalidade.id === "debito"
                ) {
                    return "-";
                }

                return formatarPercentualDecimal(
                    item.modalidades[modalidade.id]?.net || 0,
                    4
                );
            });

        const tr =
            document.createElement("tr");

        tr.innerHTML = `
            <td>${bandeira.nome}</td>
            <td>${valores[0]}</td>
            <td>${valores[1]}</td>
            <td>${valores[2]}</td>
            <td>${valores[3]}</td>
            <td>${formatarMoeda(item.resultadoBandeira)}</td>
        `;

        tabelaResultadoBandeiras.appendChild(tr);
    });
}

function atualizarStatusMotor() {
    if (!statusMotorSipag) {
        return;
    }

    statusMotorSipag.className =
        "status-carregamento ok";

    statusMotorSipag.textContent =
        "Cálculo local da Precificação Sipag carregado.";
}

function atualizarClasseResultado(elemento, valor) {
    if (!elemento) {
        return;
    }

    const card =
        elemento.closest(".resultado-item");

    if (!card) {
        return;
    }

    card.classList.remove(
        "resultado-negativo",
        "resultado-positivo"
    );

    if (valor < 0) {
        card.classList.add(
            "resultado-negativo"
        );
    } else if (valor > 0) {
        card.classList.add(
            "resultado-positivo"
        );
    }
}

function calcularTudo() {
    const faturamento =
        moedaParaNumero(
            faturamentoMensal.value
        );

    faturamentoAnual.value =
        formatarNumeroMoeda(
            faturamento * 12
        );

    const calculoMdr =
        calcularMdr();

    const calculoAntecipacaoResultado =
        calcularAntecipacao();

    const calculoEquipamentosResultado =
        calcularEquipamentos();

    const resultadoMensal =
        calculoMdr.totalMdr +
        calculoAntecipacaoResultado.liquido +
        calculoEquipamentosResultado.impactoMensal;

    const resultadoAnual =
        resultadoMensal * 12;

    resultadoNetMdr.textContent =
        formatarMoeda(
            calculoMdr.totalMdr
        );

    resultadoAntecipacao.textContent =
        formatarMoeda(
            calculoAntecipacaoResultado.liquido
        );

    resultadoEquipamentos.textContent =
        formatarMoeda(
            calculoEquipamentosResultado.impactoMensal
        );

    resultadoFinalMensal.textContent =
        formatarMoeda(
            resultadoMensal
        );

    resultadoFinalAnual.textContent =
        formatarMoeda(
            resultadoAnual
        );

    resultadoPayback.textContent =
        calcularPayback(
            calculoMdr.totalMdr +
            calculoAntecipacaoResultado.liquido,
            calculoEquipamentosResultado.custoTotal
        );

    const custo =
        obterCustoOperacional("visa");

    resultadoCustoOperacional.textContent =
        formatarPercentualDecimal(
            custo,
            4
        );

    atualizarClasseResultado(
        resultadoNetMdr,
        calculoMdr.totalMdr
    );

    atualizarClasseResultado(
        resultadoAntecipacao,
        calculoAntecipacaoResultado.liquido
    );

    atualizarClasseResultado(
        resultadoEquipamentos,
        calculoEquipamentosResultado.impactoMensal
    );

    atualizarClasseResultado(
        resultadoFinalAnual,
        resultadoAnual
    );

    preencherTabelaResultados(
        calculoMdr.resultadosBandeiras
    );

    atualizarStatusMotor();
}

function registrarMascara(input) {
    input.addEventListener(
        "input",
        () => {
            aplicarMascaraMoeda(input);
            calcularTudo();
        }
    );
}

function registrarEventos() {
    cnaeSipag.addEventListener(
        "change",
        localizarCnae
    );

    cnaeSipag.addEventListener(
        "blur",
        localizarCnae
    );

    mccSipag.addEventListener(
        "change",
        localizarMcc
    );

    mccSipag.addEventListener(
        "blur",
        localizarMcc
    );

    tipoPrecificacao.addEventListener(
        "change",
        calcularTudo
    );

    registrarMascara(
        faturamentoMensal
    );

    registrarMascara(
        volumeAntecipado
    );

    registrarMascara(
        valorSmartPos
    );

    registrarMascara(
        valorPinPad
    );

    taxaAntecipacaoPrecificacao.addEventListener(
        "input",
        calcularTudo
    );

    durationAntecipacao.addEventListener(
        "input",
        calcularTudo
    );

    qtdSmartPos.addEventListener(
        "input",
        calcularTudo
    );

    mesesSmartPos.addEventListener(
        "input",
        calcularTudo
    );

    qtdPinPad.addEventListener(
        "input",
        calcularTudo
    );

    mesesPinPad.addEventListener(
        "input",
        calcularTudo
    );
}

function iniciarPrecificacaoSipag() {
    criarMixFaturamento();
    criarCamposTaxas();
    registrarEventos();
    atualizarStatusMotor();
    calcularTudo();
}

iniciarPrecificacaoSipag();