const BANDEIRAS = [
    { id: "cabal", nome: "Cabal", debit: true },
    { id: "visa", nome: "Visa", debit: true },
    { id: "master", nome: "Master", debit: true },
    { id: "elo", nome: "Elo", debit: true },
    { id: "amex", nome: "Amex", debit: false }
];

const MODALIDADES = [
    { id: "debito", nome: "Débito", range: "Debit" },
    { id: "credito", nome: "Crédito à Vista", range: "Credit" },
    { id: "parcelado26", nome: "Parcelado 2 a 6", range: "Installment < 6 Faturamento" },
    { id: "parcelado721", nome: "Parcelado 7 a 21", range: "Installment > 6 Faturamento" }
];

const PLANILHA_BASE = "dados/precificacao-sipag.xlsm";

let baseCarregada = false;
let dadosCnae = [];
let dadosIcNovo = [];
let dadosCusto = [];
let equipamentos = {};
let parametrosFinanceiros = {
    fatorResultadoAntecipacao: 1,
    cdiAnual: 0.145,
    funding: 1.01,
    impostoAntecipacao: 0,
    custoProcessamentoNormal: 0.0022,
    custoProcessamentoGrande: 0.0019
};

const statusBaseSipag = document.getElementById("statusBaseSipag");
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
    return Number(valor.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")) || 0;
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

function normalizarTexto(valor) {
    return String(valor ?? "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function numeroSeguro(valor) {
    if (typeof valor === "number") return valor;

    if (valor === null || valor === undefined || valor === "") {
        return 0;
    }

    const texto = String(valor)
        .replace("%", "")
        .replace(/\s/g, "")
        .replace(",", ".");

    const numero = Number(texto);

    return Number.isFinite(numero) ? numero : 0;
}

function criarMixFaturamento() {
    tabelaMixSipag.innerHTML = "";

    BANDEIRAS.forEach(bandeira => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${bandeira.nome}</td>
            ${MODALIDADES.map(modalidade => {
            if (!bandeira.debit && modalidade.id === "debito") {
                return `<td>-</td>`;
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

function obterSheetArray(workbook, nome) {
    const sheet = workbook.Sheets[nome];

    if (!sheet) {
        throw new Error(`A aba "${nome}" não foi localizada na base.`);
    }

    return XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: true,
        defval: ""
    });
}

async function carregarBaseSipag() {
    try {
        statusBaseSipag.className = "status-carregamento";
        statusBaseSipag.textContent = "Carregando base de parametrização Sipag...";

        const resposta = await fetch(PLANILHA_BASE);

        if (!resposta.ok) {
            throw new Error(`Não foi possível carregar ${PLANILHA_BASE}.`);
        }

        const buffer = await resposta.arrayBuffer();

        const workbook = XLSX.read(buffer, {
            type: "array",
            cellFormula: true,
            cellDates: false
        });

        const cnaeArray = obterSheetArray(workbook, "CNAE x MCC");
        const icNovoArray = obterSheetArray(workbook, "IC TABLE - 08.2024");
        const custoArray = obterSheetArray(workbook, "Custo Operacional");

        dadosCnae = cnaeArray.slice(1).map(linha => ({
            cnae: String(linha[0] ?? "").trim(),
            mcc: String(linha[2] ?? "").trim(),
            segmento: String(linha[4] ?? "").trim()
        })).filter(item => item.cnae || item.mcc);

        dadosIcNovo = icNovoArray.slice(1).map(linha => ({
            mcc: String(linha[1] ?? "").trim(),
            bandeira: String(linha[2] ?? "").trim(),
            range: String(linha[3] ?? "").trim(),
            taxa: numeroSeguro(linha[6])
        })).filter(item => item.mcc && item.bandeira && item.range);

        dadosCusto = custoArray.slice(1).map(linha => ({
            mcc: String(linha[0] ?? "").trim(),
            custoFd: numeroSeguro(linha[1]),
            custoCabal: numeroSeguro(linha[2])
        })).filter(item => item.mcc);

        parametrosFinanceiros.custoProcessamentoNormal = numeroSeguro(custoArray[8]?.[4]) || 0.0022;
        parametrosFinanceiros.custoProcessamentoGrande = numeroSeguro(custoArray[9]?.[4]) || 0.0019;
        parametrosFinanceiros.cdiAnual = numeroSeguro(custoArray[3]?.[4]) || 0.145;
        parametrosFinanceiros.funding = numeroSeguro(custoArray[4]?.[4]) || 1.01;
        parametrosFinanceiros.impostoAntecipacao = numeroSeguro(custoArray[7]?.[4]) || 0;
        parametrosFinanceiros.fatorResultadoAntecipacao = numeroSeguro(custoArray[2]?.[4]) || 1;

        equipamentos.smartPos = {
            valor: numeroSeguro(custoArray[3]?.[15]) || 93
        };

        equipamentos.pinPad = {
            valor: numeroSeguro(custoArray[4]?.[15]) || 27
        };

        equipamentos.conectividade = {
            valor: numeroSeguro(custoArray[5]?.[15]) || 8.88
        };

        baseCarregada = true;

        statusBaseSipag.className = "status-carregamento ok";
        statusBaseSipag.textContent = "Base de parametrização Sipag carregada com sucesso.";

        calcularTudo();
    } catch (erro) {
        console.error(erro);

        baseCarregada = false;

        statusBaseSipag.className = "status-carregamento erro";
        statusBaseSipag.textContent =
            "Não foi possível carregar a base Sipag. Verifique se o arquivo dados/precificacao-sipag.xlsm existe e se o site está sendo executado por um servidor HTTP.";
    }
}

function localizarCnae() {
    const cnae = cnaeSipag.value.replace(/\D/g, "");

    if (!cnae) {
        return;
    }

    const registro = dadosCnae.find(item => item.cnae === cnae);

    if (registro) {
        mccSipag.value = registro.mcc;
        segmentoSipag.value = registro.segmento;
    }

    calcularTudo();
}

function localizarMcc() {
    const mcc = mccSipag.value.trim();

    if (!mcc) {
        segmentoSipag.value = "";
        calcularTudo();
        return;
    }

    const registro = dadosCnae.find(item => item.mcc === mcc);

    if (registro) {
        if (!cnaeSipag.value) {
            cnaeSipag.value = registro.cnae;
        }

        segmentoSipag.value = registro.segmento;
    }

    calcularTudo();
}

function obterCustoMcc() {
    const mcc = mccSipag.value.trim();

    const registro = dadosCusto.find(item => item.mcc === mcc);

    if (!registro) {
        return 0;
    }

    return tipoPrecificacao.value === "Sipaguinha"
        ? registro.custoCabal
        : registro.custoFd;
}

function obterIntercambio(bandeira, modalidade) {
    if (!baseCarregada) return 0;

    const mcc = mccSipag.value.trim();

    if (!mcc) return 0;

    if (bandeira === "cabal") {
        return null;
    }

    const nomesBandeira = {
        visa: "Visa",
        master: "Master",
        elo: "Elo",
        amex: "Amex"
    };

    const modalidadeObj = MODALIDADES.find(item => item.id === modalidade);

    if (!modalidadeObj) return 0;

    return dadosIcNovo
        .filter(item =>
            item.mcc === mcc &&
            normalizarTexto(item.bandeira) === normalizarTexto(nomesBandeira[bandeira]) &&
            normalizarTexto(item.range) === normalizarTexto(modalidadeObj.range)
        )
        .reduce((total, item) => total + item.taxa, 0);
}

function obterAssessment(bandeira, modalidade) {
    if (bandeira === "cabal") return 0;

    const referencias = {
        visa: {
            debito: 0.0017,
            credito: 0.0017,
            parcelado26: 0.0017,
            parcelado721: 0.0017
        },
        master: {
            debito: 0.0018,
            credito: 0.0018,
            parcelado26: 0.0018,
            parcelado721: 0.0018
        },
        elo: {
            debito: 0.0054,
            credito: 0.0054,
            parcelado26: 0.0054,
            parcelado721: 0.0054
        },
        amex: {
            debito: 0,
            credito: 0.0084,
            parcelado26: 0.0084,
            parcelado721: 0.0084
        }
    };

    return referencias[bandeira]?.[modalidade] || 0;
}

function obterImpostoMdr(bandeira, taxaSolicitada, intercambio) {
    if (bandeira !== "amex") {
        return 0;
    }

    const base = Math.max(taxaSolicitada - intercambio, 0);

    const aliquota = tipoPrecificacao.value === "Sipaguinha"
        ? 0.0965
        : 0.0465;

    return base * aliquota;
}

function obterCustoProcessamento() {
    const faturamento = moedaParaNumero(faturamentoMensal.value);

    return faturamento >= 500000.01
        ? parametrosFinanceiros.custoProcessamentoGrande
        : parametrosFinanceiros.custoProcessamentoNormal;
}

function obterTaxaSolicitada(bandeira, modalidade) {
    const input = document.querySelector(
        `.taxa-solicitada[data-bandeira="${bandeira}"][data-modalidade="${modalidade}"]`
    );

    if (!input) return 0;

    return (Number(input.value) || 0) / 100;
}

function obterMix(bandeira, modalidade) {
    const input = document.querySelector(
        `.mix-input[data-bandeira="${bandeira}"][data-modalidade="${modalidade}"]`
    );

    if (!input) return 0;

    return (Number(input.value) || 0) / 100;
}

function calcularNetMdr(bandeira, modalidade) {
    const taxaSolicitada = obterTaxaSolicitada(bandeira, modalidade);

    let intercambio;

    if (bandeira === "cabal") {
        intercambio = taxaSolicitada / 2;
    } else {
        intercambio = obterIntercambio(bandeira, modalidade) || 0;
    }

    const assessment = obterAssessment(bandeira, modalidade);
    const custoOperacional = obterCustoMcc();
    const processamento = obterCustoProcessamento();
    const imposto = obterImpostoMdr(
        bandeira,
        taxaSolicitada,
        intercambio
    );

    const net = taxaSolicitada -
        intercambio -
        assessment -
        custoOperacional -
        processamento -
        imposto;

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
        campos.intercambio.textContent = formatarPercentualDecimal(calculo.intercambio);
    }

    if (campos.assessment) {
        campos.assessment.textContent = formatarPercentualDecimal(calculo.assessment);
    }

    if (campos.operacional) {
        campos.operacional.textContent = formatarPercentualDecimal(calculo.custoOperacional);
    }

    if (campos.processamento) {
        campos.processamento.textContent = formatarPercentualDecimal(calculo.processamento);
    }

    if (campos.impostos) {
        campos.impostos.textContent = formatarPercentualDecimal(calculo.imposto);
    }

    if (campos.net) {
        campos.net.textContent = formatarPercentualDecimal(calculo.net);

        campos.net.style.color = calculo.net < 0
            ? "#c62828"
            : "#00A091";
    }
}

function calcularMdr() {
    const faturamento = moedaParaNumero(faturamentoMensal.value);
    let totalMix = 0;
    let totalMdr = 0;
    const resultadosBandeiras = [];

    BANDEIRAS.forEach(bandeira => {
        let resultadoBandeira = 0;

        MODALIDADES.forEach(modalidade => {
            if (!bandeira.debit && modalidade.id === "debito") {
                return;
            }

            const mix = obterMix(bandeira.id, modalidade.id);

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

            resultadoBandeira += resultadoModalidade;
        });

        totalMdr += resultadoBandeira;

        resultadosBandeiras.push({
            bandeira,
            resultadoBandeira
        });
    });

    totalMixSipag.textContent = formatarPercentualDecimal(totalMix, 2);

    if (Math.abs(totalMix - 1) > 0.0001) {
        totalMixSipag.style.color = "#c62828";
    } else {
        totalMixSipag.style.color = "#ffffff";
    }

    return {
        totalMix,
        totalMdr,
        resultadosBandeiras
    };
}

function calcularAntecipacao() {
    const volume = moedaParaNumero(volumeAntecipado.value);
    const taxaMensal = (Number(taxaAntecipacaoPrecificacao.value) || 0) / 100;
    const duration = Number(durationAntecipacao.value) || 0;

    if (volume <= 0 || taxaMensal <= 0 || duration <= 0) {
        return {
            bruto: 0,
            funding: 0,
            impostos: 0,
            liquido: 0
        };
    }

    const taxaDia = taxaMensal / 30;

    const valorPresente =
        volume /
        Math.pow(1 + taxaDia, duration);

    const bruto = volume - valorPresente;

    const fundingAnual =
        parametrosFinanceiros.cdiAnual *
        parametrosFinanceiros.funding;

    const fundingDia =
        Math.pow(
            1 + fundingAnual,
            1 / 360
        );

    const custoFunding =
        (
            Math.pow(fundingDia, duration) *
            valorPresente -
            valorPresente
        ) * -1;

    const impostos =
        bruto *
        parametrosFinanceiros.impostoAntecipacao *
        -1;

    const liquido =
        (bruto + custoFunding + impostos) *
        parametrosFinanceiros.fatorResultadoAntecipacao;

    return {
        bruto,
        funding: custoFunding,
        impostos,
        liquido
    };
}

function calcularEquipamentos() {
    const smartQtd = Number(qtdSmartPos.value) || 0;
    const smartProposto = moedaParaNumero(valorSmartPos.value);
    const smartMeses = Number(mesesSmartPos.value) || 0;

    const pinQtd = Number(qtdPinPad.value) || 0;
    const pinProposto = moedaParaNumero(valorPinPad.value);
    const pinMeses = Number(mesesPinPad.value) || 0;

    const valorPadraoSmart = equipamentos.smartPos?.valor || 93;
    const valorPadraoPin = equipamentos.pinPad?.valor || 27;

    const complementoSmart =
        Math.max(valorPadraoSmart - smartProposto, 0) *
        smartQtd *
        smartMeses;

    const complementoPin =
        Math.max(valorPadraoPin - pinProposto, 0) *
        pinQtd *
        pinMeses;

    const custoTotal = complementoSmart + complementoPin;

    const impactoMensal = custoTotal > 0
        ? -(custoTotal / 12)
        : 0;

    return {
        complementoSmart,
        complementoPin,
        custoTotal,
        impactoMensal
    };
}

function calcularPayback(resultadoMensal, custoInicial) {
    if (custoInicial <= 0) {
        return resultadoMensal > 0
            ? "1 mês"
            : "-";
    }

    if (resultadoMensal <= 0) {
        return "Sem retorno";
    }

    const meses = Math.ceil(
        custoInicial / resultadoMensal
    );

    if (meses > 24) {
        return "Acima de 24 meses";
    }

    return `${meses} ${meses === 1 ? "mês" : "meses"}`;
}

function preencherTabelaResultados(resultadosBandeiras) {
    tabelaResultadoBandeiras.innerHTML = "";

    resultadosBandeiras.forEach(item => {
        const bandeira = item.bandeira;

        const valores = MODALIDADES.map(modalidade => {
            if (!bandeira.debit && modalidade.id === "debito") {
                return "-";
            }

            const calculo = calcularNetMdr(
                bandeira.id,
                modalidade.id
            );

            return formatarPercentualDecimal(
                calculo.net,
                4
            );
        });

        const tr = document.createElement("tr");

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

function calcularTudo() {
    const faturamento = moedaParaNumero(faturamentoMensal.value);

    faturamentoAnual.value =
        formatarNumeroMoeda(
            faturamento * 12
        );

    const calculoMdr = calcularMdr();
    const calculoAntecipacaoResultado = calcularAntecipacao();
    const calculoEquipamentosResultado = calcularEquipamentos();

    const resultadoMensal =
        calculoMdr.totalMdr +
        calculoAntecipacaoResultado.liquido +
        calculoEquipamentosResultado.impactoMensal;

    const resultadoAnual =
        resultadoMensal * 12;

    resultadoNetMdr.textContent =
        formatarMoeda(calculoMdr.totalMdr);

    resultadoAntecipacao.textContent =
        formatarMoeda(
            calculoAntecipacaoResultado.liquido
        );

    resultadoEquipamentos.textContent =
        formatarMoeda(
            calculoEquipamentosResultado.impactoMensal
        );

    resultadoFinalMensal.textContent =
        formatarMoeda(resultadoMensal);

    resultadoFinalAnual.textContent =
        formatarMoeda(resultadoAnual);

    resultadoPayback.textContent =
        calcularPayback(
            calculoMdr.totalMdr +
            calculoAntecipacaoResultado.liquido,
            calculoEquipamentosResultado.custoTotal
        );

    resultadoCustoOperacional.textContent =
        formatarPercentualDecimal(
            obterCustoMcc(),
            4
        );

    resultadoFinalMensal.style.color =
        resultadoMensal < 0
            ? "#ffffff"
            : "#ffffff";

    preencherTabelaResultados(
        calculoMdr.resultadosBandeiras
    );
}

function registrarMascara(input) {
    input.addEventListener("input", () => {
        aplicarMascaraMoeda(input);
        calcularTudo();
    });
}

cnaeSipag.addEventListener("change", localizarCnae);
mccSipag.addEventListener("change", localizarMcc);
tipoPrecificacao.addEventListener("change", calcularTudo);

registrarMascara(faturamentoMensal);
registrarMascara(volumeAntecipado);
registrarMascara(valorSmartPos);
registrarMascara(valorPinPad);

taxaAntecipacaoPrecificacao.addEventListener("input", calcularTudo);
durationAntecipacao.addEventListener("input", calcularTudo);

qtdSmartPos.addEventListener("input", calcularTudo);
mesesSmartPos.addEventListener("input", calcularTudo);
qtdPinPad.addEventListener("input", calcularTudo);
mesesPinPad.addEventListener("input", calcularTudo);

criarMixFaturamento();
criarCamposTaxas();
calcularTudo();
carregarBaseSipag();