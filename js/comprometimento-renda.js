const LIMITE_VALOR_MONETARIO = 999999999999.99;

const elementosComprometimento = {
    tipoOperacao: document.getElementById("tipoOperacao"),
    riscoCooperado: document.getElementById("riscoCooperado"),
    valorSolicitado: document.getElementById("valorSolicitado"),
    rendaComprovada: document.getElementById("rendaComprovada"),
    prazoOperacao: document.getElementById("prazoOperacao"),
    taxaMensal: document.getElementById("taxaMensal"),
    perdaEsperada: document.getElementById("perdaEsperada"),
    contratosSicoob: document.getElementById("contratosSicoob"),
    riscoBacenCurtoPrazo: document.getElementById("riscoBacenCurtoPrazo"),
    chequeEspecial: document.getElementById("chequeEspecial"),
    contaGarantida: document.getElementById("contaGarantida"),
    descontoTitulos: document.getElementById("descontoTitulos"),
    outrosValoresExcluir1: document.getElementById("outrosValoresExcluir1"),
    outrosValoresExcluir2: document.getElementById("outrosValoresExcluir2"),
    outrosValoresExcluir3: document.getElementById("outrosValoresExcluir3"),
    endividamentoMensalSfn: document.getElementById("endividamentoMensalSfn"),
    resultadoComprometimentoGlobal: document.getElementById("resultadoComprometimentoGlobal"),
    resultadoValorSolicitado: document.getElementById("resultadoValorSolicitado"),
    resultadoRendaComprovada: document.getElementById("resultadoRendaComprovada"),
    resultadoParcelaOperacao: document.getElementById("resultadoParcelaOperacao"),
    resultadoEndividamentoSfn: document.getElementById("resultadoEndividamentoSfn"),
    resultadoContratosSicoob: document.getElementById("resultadoContratosSicoob"),
    resultadoPercentualSfn: document.getElementById("resultadoPercentualSfn"),
    resultadoPercentualOperacao: document.getElementById("resultadoPercentualOperacao"),
    resultadoPerdaEsperada: document.getElementById("resultadoPerdaEsperada"),
    resultadoRisco: document.getElementById("resultadoRisco"),
    resultadoPrazo: document.getElementById("resultadoPrazo"),
    tabelaValorSfn: document.getElementById("tabelaValorSfn"),
    tabelaPercentualSfn: document.getElementById("tabelaPercentualSfn"),
    tabelaValorOperacao: document.getElementById("tabelaValorOperacao"),
    tabelaPercentualOperacao: document.getElementById("tabelaPercentualOperacao"),
    tabelaValorSicoob: document.getElementById("tabelaValorSicoob"),
    tabelaPercentualSicoob: document.getElementById("tabelaPercentualSicoob"),
    tabelaValorTotal: document.getElementById("tabelaValorTotal"),
    tabelaPercentualTotal: document.getElementById("tabelaPercentualTotal"),
    statusLimitePronampe: document.getElementById("statusLimitePronampe"),
    statusComprometimento: document.getElementById("statusComprometimento"),
    btnCalcularComprometimento: document.getElementById("btnCalcularComprometimento"),
    btnLimparComprometimento: document.getElementById("btnLimparComprometimento")
};

function numeroSeguro(valor) {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : 0;
}

function limitarValorMonetario(valor) {
    const numero = Number(valor);
    if (!Number.isFinite(numero) || numero < 0) return 0;
    return Math.min(numero, LIMITE_VALOR_MONETARIO);
}

function moedaParaNumero(valor) {
    if (valor === null || valor === undefined || valor === "") return 0;

    let texto = String(valor).trim().replace(/R\$/gi, "").replace(/\s/g, "");

    if (texto.includes(",") && texto.includes(".")) {
        texto = texto.replace(/\./g, "").replace(",", ".");
    } else if (texto.includes(",")) {
        texto = texto.replace(",", ".");
    }

    texto = texto.replace(/[^\d.-]/g, "");
    return limitarValorMonetario(Number(texto));
}

function formatarNumeroMoeda(valor) {
    return limitarValorMonetario(valor).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatarMoeda(valor) {
    return numeroSeguro(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatarPercentual(valor) {
    return numeroSeguro(valor).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + "%";
}

function aplicarMascaraMoeda(input) {
    let digitos = String(input.value || "").replace(/\D/g, "");

    if (!digitos) {
        input.value = "0,00";
        return;
    }

    const limiteCentavos = Math.round(LIMITE_VALOR_MONETARIO * 100);
    let centavos = Number(digitos);

    if (!Number.isFinite(centavos) || centavos < 0) centavos = 0;

    centavos = Math.min(centavos, limiteCentavos);

    input.value = (centavos / 100).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function limitarPercentual(valor) {
    return Math.max(0, Math.min(100, numeroSeguro(valor)));
}

function limitarPrazo(valor) {
    const prazo = Math.trunc(numeroSeguro(valor));
    return Math.max(1, Math.min(600, prazo));
}

function calcularParcelaPrice(valor, taxaMensalPercentual, prazoMeses) {
    const principal = limitarValorMonetario(valor);
    const prazo = limitarPrazo(prazoMeses);
    const taxa = Math.max(0, numeroSeguro(taxaMensalPercentual)) / 100;

    if (principal <= 0 || prazo <= 0) return 0;
    if (taxa === 0) return principal / prazo;

    const fator = Math.pow(1 + taxa, prazo);
    const parcela = principal * (taxa * fator) / (fator - 1);

    return Number.isFinite(parcela) ? parcela : 0;
}

function calcularEndividamentoMensalSfn() {
    const riscoTotal = moedaParaNumero(elementosComprometimento.riscoBacenCurtoPrazo.value);
    const chequeEspecial = moedaParaNumero(elementosComprometimento.chequeEspecial.value);
    const contaGarantida = moedaParaNumero(elementosComprometimento.contaGarantida.value);
    const descontoTitulos = moedaParaNumero(elementosComprometimento.descontoTitulos.value);
    const outros1 = moedaParaNumero(elementosComprometimento.outrosValoresExcluir1.value);
    const outros2 = moedaParaNumero(elementosComprometimento.outrosValoresExcluir2.value);
    const outros3 = moedaParaNumero(elementosComprometimento.outrosValoresExcluir3.value);

    const riscoConsiderado = Math.max(
        riscoTotal - chequeEspecial - contaGarantida - descontoTitulos - outros1 - outros2 - outros3,
        0
    );

    return riscoConsiderado / 12;
}

function calcularPercentualComprometimento(valor, renda) {
    if (renda <= 0) return 0;
    return (valor / renda) * 100;
}

function validarLimiteValorSolicitadoPronampe(valorSolicitado, rendaMensal) {
    if (elementosComprometimento.tipoOperacao.value !== "pronampe") {
        return {
            aplicavel: false,
            valido: true,
            rendaAnual: 0,
            limite: 0
        };
    }

    if (rendaMensal <= 0) {
        return {
            aplicavel: true,
            valido: true,
            rendaAnual: 0,
            limite: 0
        };
    }

    const rendaAnual = rendaMensal * 12;
    const limite = rendaAnual * 0.30;

    return {
        aplicavel: true,
        valido: valorSolicitado <= limite,
        rendaAnual,
        limite
    };
}

function atualizarStatusLimitePronampe(valorSolicitado, rendaMensal) {
    const elemento = elementosComprometimento.statusLimitePronampe;
    if (!elemento) return true;

    const validacao = validarLimiteValorSolicitadoPronampe(valorSolicitado, rendaMensal);

    elemento.classList.remove("status-baixo", "status-atencao", "status-alto");

    if (!validacao.aplicavel) {
        elemento.classList.add("status-baixo");
        elemento.innerHTML = `
            <strong>Operação FGI</strong>
            <span>O limite de 30% da renda anual é uma validação exclusiva das operações PRONAMPE.</span>
        `;
        return true;
    }

    if (rendaMensal <= 0) {
        elemento.classList.add("status-atencao");
        elemento.innerHTML = `
            <strong>Limite PRONAMPE</strong>
            <span>Informe uma renda mensal comprovada maior que zero para calcular o limite máximo da operação.</span>
        `;
        return true;
    }

    if (!validacao.valido) {
        elemento.classList.add("status-alto");
        elemento.innerHTML = `
            <strong>Valor solicitado acima do limite permitido para PRONAMPE.</strong>
            <span>Renda mensal: ${formatarMoeda(rendaMensal)} | Renda anual considerada: ${formatarMoeda(validacao.rendaAnual)} | Limite de 30%: ${formatarMoeda(validacao.limite)} | Valor solicitado: ${formatarMoeda(valorSolicitado)}.</span>
        `;
        return false;
    }

    elemento.classList.add("status-baixo");
    elemento.innerHTML = `
        <strong>Valor solicitado dentro do limite do PRONAMPE.</strong>
        <span>Renda mensal: ${formatarMoeda(rendaMensal)} | Renda anual considerada: ${formatarMoeda(validacao.rendaAnual)} | Limite de 30%: ${formatarMoeda(validacao.limite)} | Valor solicitado: ${formatarMoeda(valorSolicitado)}.</span>
    `;

    return true;
}

function atualizarStatus(percentual, renda) {
    const elemento = elementosComprometimento.statusComprometimento;
    if (!elemento) return;

    elemento.classList.remove("status-baixo", "status-atencao", "status-alto");

    if (renda <= 0) {
        elemento.classList.add("status-atencao");
        elemento.innerHTML = `
            <strong>Informe uma renda comprovada válida.</strong>
            <span>O comprometimento somente pode ser calculado quando houver renda mensal comprovada maior que zero.</span>
        `;
        return;
    }

    if (percentual <= 30) {
        elemento.classList.add("status-baixo");
        elemento.innerHTML = `
            <strong>Comprometimento de ${formatarPercentual(percentual)}</strong>
            <span>O percentual calculado está até a faixa de 30% da renda comprovada.</span>
        `;
        return;
    }

    if (percentual <= 50) {
        elemento.classList.add("status-atencao");
        elemento.innerHTML = `
            <strong>Comprometimento de ${formatarPercentual(percentual)}</strong>
            <span>O comprometimento calculado está acima de 30% da renda comprovada e requer atenção na análise.</span>
        `;
        return;
    }

    elemento.classList.add("status-alto");
    elemento.innerHTML = `
        <strong>Comprometimento de ${formatarPercentual(percentual)}</strong>
        <span>O comprometimento calculado está acima de 50% da renda comprovada. Avalie cuidadosamente a capacidade de pagamento.</span>
    `;
}

function limparResultadosBloqueados(valorSolicitado, renda) {
    elementosComprometimento.endividamentoMensalSfn.textContent = "R$ 0,00";
    elementosComprometimento.resultadoComprometimentoGlobal.textContent = "0,00%";
    elementosComprometimento.resultadoValorSolicitado.textContent = formatarMoeda(valorSolicitado);
    elementosComprometimento.resultadoRendaComprovada.textContent = formatarMoeda(renda);
    elementosComprometimento.resultadoParcelaOperacao.textContent = "R$ 0,00";
    elementosComprometimento.resultadoEndividamentoSfn.textContent = "R$ 0,00";
    elementosComprometimento.resultadoContratosSicoob.textContent = "R$ 0,00";
    elementosComprometimento.resultadoPercentualSfn.textContent = "0,00%";
    elementosComprometimento.resultadoPercentualOperacao.textContent = "0,00%";
    elementosComprometimento.resultadoPerdaEsperada.textContent = formatarPercentual(
        limitarPercentual(elementosComprometimento.perdaEsperada.value)
    );
    elementosComprometimento.resultadoRisco.textContent = elementosComprometimento.riscoCooperado.value;
    elementosComprometimento.resultadoPrazo.textContent = `${limitarPrazo(elementosComprometimento.prazoOperacao.value)} meses`;
    elementosComprometimento.tabelaValorSfn.textContent = "R$ 0,00";
    elementosComprometimento.tabelaPercentualSfn.textContent = "0,00%";
    elementosComprometimento.tabelaValorOperacao.textContent = "R$ 0,00";
    elementosComprometimento.tabelaPercentualOperacao.textContent = "0,00%";
    elementosComprometimento.tabelaValorSicoob.textContent = "R$ 0,00";
    elementosComprometimento.tabelaPercentualSicoob.textContent = "0,00%";
    elementosComprometimento.tabelaValorTotal.textContent = "R$ 0,00";
    elementosComprometimento.tabelaPercentualTotal.textContent = "0,00%";

    if (elementosComprometimento.statusComprometimento) {
        elementosComprometimento.statusComprometimento.classList.remove(
            "status-baixo",
            "status-atencao",
            "status-alto"
        );

        elementosComprometimento.statusComprometimento.classList.add("status-atencao");
        elementosComprometimento.statusComprometimento.innerHTML = `
            <strong>Simulação bloqueada pelo limite do PRONAMPE.</strong>
            <span>Ajuste o valor solicitado para continuar o cálculo do comprometimento de renda.</span>
        `;
    }
}

function calcularComprometimento() {
    const valorSolicitado = moedaParaNumero(elementosComprometimento.valorSolicitado.value);
    const renda = moedaParaNumero(elementosComprometimento.rendaComprovada.value);

    const limitePronampeValido = atualizarStatusLimitePronampe(valorSolicitado, renda);

    if (!limitePronampeValido) {
        limparResultadosBloqueados(valorSolicitado, renda);
        return;
    }

    const contratosSicoob = moedaParaNumero(elementosComprometimento.contratosSicoob.value);
    const prazo = limitarPrazo(elementosComprometimento.prazoOperacao.value);
    const taxaMensal = Math.max(0, numeroSeguro(elementosComprometimento.taxaMensal.value));
    const perdaEsperada = limitarPercentual(elementosComprometimento.perdaEsperada.value);

    elementosComprometimento.prazoOperacao.value = prazo;
    elementosComprometimento.perdaEsperada.value = perdaEsperada;

    const parcelaOperacao = calcularParcelaPrice(valorSolicitado, taxaMensal, prazo);
    const endividamentoSfn = calcularEndividamentoMensalSfn();
    const percentualSfn = calcularPercentualComprometimento(endividamentoSfn, renda);
    const percentualOperacao = calcularPercentualComprometimento(parcelaOperacao, renda);
    const percentualSicoob = calcularPercentualComprometimento(contratosSicoob, renda);
    const endividamentoGlobal = endividamentoSfn + parcelaOperacao + contratosSicoob;
    const percentualGlobal = calcularPercentualComprometimento(endividamentoGlobal, renda);

    elementosComprometimento.endividamentoMensalSfn.textContent = formatarMoeda(endividamentoSfn);
    elementosComprometimento.resultadoComprometimentoGlobal.textContent = formatarPercentual(percentualGlobal);
    elementosComprometimento.resultadoValorSolicitado.textContent = formatarMoeda(valorSolicitado);
    elementosComprometimento.resultadoRendaComprovada.textContent = formatarMoeda(renda);
    elementosComprometimento.resultadoParcelaOperacao.textContent = formatarMoeda(parcelaOperacao);
    elementosComprometimento.resultadoEndividamentoSfn.textContent = formatarMoeda(endividamentoSfn);
    elementosComprometimento.resultadoContratosSicoob.textContent = formatarMoeda(contratosSicoob);
    elementosComprometimento.resultadoPercentualSfn.textContent = formatarPercentual(percentualSfn);
    elementosComprometimento.resultadoPercentualOperacao.textContent = formatarPercentual(percentualOperacao);
    elementosComprometimento.resultadoPerdaEsperada.textContent = formatarPercentual(perdaEsperada);
    elementosComprometimento.resultadoRisco.textContent = elementosComprometimento.riscoCooperado.value;
    elementosComprometimento.resultadoPrazo.textContent = `${prazo} meses`;

    elementosComprometimento.tabelaValorSfn.textContent = formatarMoeda(endividamentoSfn);
    elementosComprometimento.tabelaPercentualSfn.textContent = formatarPercentual(percentualSfn);
    elementosComprometimento.tabelaValorOperacao.textContent = formatarMoeda(parcelaOperacao);
    elementosComprometimento.tabelaPercentualOperacao.textContent = formatarPercentual(percentualOperacao);
    elementosComprometimento.tabelaValorSicoob.textContent = formatarMoeda(contratosSicoob);
    elementosComprometimento.tabelaPercentualSicoob.textContent = formatarPercentual(percentualSicoob);
    elementosComprometimento.tabelaValorTotal.textContent = formatarMoeda(endividamentoGlobal);
    elementosComprometimento.tabelaPercentualTotal.textContent = formatarPercentual(percentualGlobal);

    atualizarStatus(percentualGlobal, renda);
}

function registrarCampoMoeda(input) {
    if (!input) return;

    input.setAttribute("inputmode", "numeric");
    input.setAttribute("autocomplete", "off");

    input.addEventListener("input", () => {
        aplicarMascaraMoeda(input);
        calcularComprometimento();
    });

    input.addEventListener("blur", () => {
        input.value = formatarNumeroMoeda(moedaParaNumero(input.value));
        calcularComprometimento();
    });
}

function registrarEventosComprometimento() {
    const camposMoeda = [
        elementosComprometimento.valorSolicitado,
        elementosComprometimento.rendaComprovada,
        elementosComprometimento.contratosSicoob,
        elementosComprometimento.riscoBacenCurtoPrazo,
        elementosComprometimento.chequeEspecial,
        elementosComprometimento.contaGarantida,
        elementosComprometimento.descontoTitulos,
        elementosComprometimento.outrosValoresExcluir1,
        elementosComprometimento.outrosValoresExcluir2,
        elementosComprometimento.outrosValoresExcluir3
    ];

    camposMoeda.forEach(registrarCampoMoeda);

    if (elementosComprometimento.tipoOperacao) {
        elementosComprometimento.tipoOperacao.addEventListener("change", calcularComprometimento);
    }

    if (elementosComprometimento.riscoCooperado) {
        elementosComprometimento.riscoCooperado.addEventListener("change", calcularComprometimento);
    }

    [
        elementosComprometimento.prazoOperacao,
        elementosComprometimento.taxaMensal,
        elementosComprometimento.perdaEsperada
    ].forEach(campo => {
        if (!campo) return;
        campo.addEventListener("input", calcularComprometimento);
        campo.addEventListener("change", calcularComprometimento);
    });

    if (elementosComprometimento.btnCalcularComprometimento) {
        elementosComprometimento.btnCalcularComprometimento.addEventListener(
            "click",
            calcularComprometimento
        );
    }

    if (elementosComprometimento.btnLimparComprometimento) {
        elementosComprometimento.btnLimparComprometimento.addEventListener(
            "click",
            limparComprometimento
        );
    }
}

function limparComprometimento() {
    elementosComprometimento.tipoOperacao.value = "pronampe";
    elementosComprometimento.riscoCooperado.value = "R1";
    elementosComprometimento.valorSolicitado.value = "100.000,00";
    elementosComprometimento.rendaComprovada.value = "20.000,00";
    elementosComprometimento.prazoOperacao.value = "33";
    elementosComprometimento.taxaMensal.value = "1.00";
    elementosComprometimento.perdaEsperada.value = "0";
    elementosComprometimento.contratosSicoob.value = "0,00";
    elementosComprometimento.riscoBacenCurtoPrazo.value = "0,00";
    elementosComprometimento.chequeEspecial.value = "0,00";
    elementosComprometimento.contaGarantida.value = "0,00";
    elementosComprometimento.descontoTitulos.value = "0,00";
    elementosComprometimento.outrosValoresExcluir1.value = "0,00";
    elementosComprometimento.outrosValoresExcluir2.value = "0,00";
    elementosComprometimento.outrosValoresExcluir3.value = "0,00";

    calcularComprometimento();
}

function iniciarComprometimentoRenda() {
    const camposObrigatorios = [
        elementosComprometimento.tipoOperacao,
        elementosComprometimento.valorSolicitado,
        elementosComprometimento.rendaComprovada,
        elementosComprometimento.statusLimitePronampe,
        elementosComprometimento.statusComprometimento
    ];

    if (camposObrigatorios.some(campo => !campo)) {
        console.error("Comprometimento de Renda: existem elementos obrigatórios ausentes no HTML.");
        return;
    }

    registrarEventosComprometimento();

    [
        elementosComprometimento.valorSolicitado,
        elementosComprometimento.rendaComprovada,
        elementosComprometimento.contratosSicoob,
        elementosComprometimento.riscoBacenCurtoPrazo,
        elementosComprometimento.chequeEspecial,
        elementosComprometimento.contaGarantida,
        elementosComprometimento.descontoTitulos,
        elementosComprometimento.outrosValoresExcluir1,
        elementosComprometimento.outrosValoresExcluir2,
        elementosComprometimento.outrosValoresExcluir3
    ].forEach(campo => {
        campo.value = formatarNumeroMoeda(moedaParaNumero(campo.value));
    });

    calcularComprometimento();
}

document.addEventListener("DOMContentLoaded", iniciarComprometimentoRenda);