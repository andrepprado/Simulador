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

    statusComprometimento: document.getElementById("statusComprometimento"),

    btnCalcularComprometimento: document.getElementById("btnCalcularComprometimento"),
    btnLimparComprometimento: document.getElementById("btnLimparComprometimento")
};

function numeroSeguro(valor) {
    const convertido = Number(valor);

    return Number.isFinite(convertido)
        ? convertido
        : 0;
}

function limitarValorMonetario(valor) {
    const convertido = Number(valor);

    if (!Number.isFinite(convertido) || convertido < 0) {
        return 0;
    }

    return Math.min(convertido, LIMITE_VALOR_MONETARIO);
}

function moedaParaNumero(valor) {
    if (valor === null || valor === undefined || valor === "") {
        return 0;
    }

    let texto = String(valor)
        .trim()
        .replace(/R\$/gi, "")
        .replace(/\s/g, "");

    if (texto.includes(",") && texto.includes(".")) {
        texto = texto
            .replace(/\./g, "")
            .replace(",", ".");
    } else if (texto.includes(",")) {
        texto = texto.replace(",", ".");
    }

    texto = texto.replace(/[^\d.-]/g, "");

    return limitarValorMonetario(Number(texto));
}

function formatarNumeroMoeda(valor) {
    return limitarValorMonetario(valor).toLocaleString(
        "pt-BR",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );
}

function formatarMoeda(valor) {
    const convertido = numeroSeguro(valor);

    return convertido.toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );
}

function formatarPercentual(valor) {
    const convertido = numeroSeguro(valor);

    return convertido.toLocaleString(
        "pt-BR",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    ) + "%";
}

function aplicarMascaraMoeda(input) {
    let digitos = String(input.value || "").replace(/\D/g, "");

    if (!digitos) {
        input.value = "0,00";
        return;
    }

    const limiteCentavos = Math.round(LIMITE_VALOR_MONETARIO * 100);

    let centavos = Number(digitos);

    if (!Number.isFinite(centavos) || centavos < 0) {
        centavos = 0;
    }

    centavos = Math.min(centavos, limiteCentavos);

    input.value = (centavos / 100).toLocaleString(
        "pt-BR",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );
}

function limitarPercentual(valor) {
    return Math.max(
        0,
        Math.min(
            100,
            numeroSeguro(valor)
        )
    );
}

function limitarPrazo(valor) {
    const convertido = Math.trunc(numeroSeguro(valor));

    return Math.max(
        1,
        Math.min(
            600,
            convertido
        )
    );
}

function calcularParcelaPrice(
    valor,
    taxaMensalPercentual,
    prazoMeses
) {
    const principal = limitarValorMonetario(valor);
    const prazo = limitarPrazo(prazoMeses);

    const taxa =
        Math.max(
            0,
            numeroSeguro(taxaMensalPercentual)
        ) / 100;

    if (principal <= 0 || prazo <= 0) {
        return 0;
    }

    if (taxa === 0) {
        return principal / prazo;
    }

    const fator = Math.pow(
        1 + taxa,
        prazo
    );

    const parcela =
        principal *
        (
            taxa * fator
        ) /
        (
            fator - 1
        );

    return Number.isFinite(parcela)
        ? parcela
        : 0;
}

function calcularEndividamentoMensalSfn() {
    const riscoTotal =
        moedaParaNumero(
            elementosComprometimento
                .riscoBacenCurtoPrazo
                .value
        );

    const chequeEspecial =
        moedaParaNumero(
            elementosComprometimento
                .chequeEspecial
                .value
        );

    const contaGarantida =
        moedaParaNumero(
            elementosComprometimento
                .contaGarantida
                .value
        );

    const descontoTitulos =
        moedaParaNumero(
            elementosComprometimento
                .descontoTitulos
                .value
        );

    const outros1 =
        moedaParaNumero(
            elementosComprometimento
                .outrosValoresExcluir1
                .value
        );

    const outros2 =
        moedaParaNumero(
            elementosComprometimento
                .outrosValoresExcluir2
                .value
        );

    const outros3 =
        moedaParaNumero(
            elementosComprometimento
                .outrosValoresExcluir3
                .value
        );

    const riscoConsiderado =
        Math.max(
            riscoTotal -
            chequeEspecial -
            contaGarantida -
            descontoTitulos -
            outros1 -
            outros2 -
            outros3,
            0
        );

    return riscoConsiderado / 12;
}

function calcularPercentualComprometimento(
    valor,
    renda
) {
    if (renda <= 0) {
        return 0;
    }

    return (
        valor /
        renda
    ) * 100;
}

/*
 * =========================================================
 * VALIDAÇÃO ESPECÍFICA PRONAMPE
 * =========================================================
 * Para PRONAMPE, o Valor Solicitado não pode ultrapassar
 * 30% da Renda Atualizada Comprovada.
 *
 * A regra não se aplica ao FGI.
 * =========================================================
 */
function validarLimiteValorSolicitadoPronampe(
    valorSolicitado,
    renda
) {
    const tipoOperacao =
        elementosComprometimento
            .tipoOperacao
            .value;

    if (tipoOperacao !== "pronampe") {
        return {
            valido: true,
            limite: null
        };
    }

    /*
     * Caso ainda não exista renda válida, deixamos a
     * validação normal de renda tratar a situação.
     */
    if (renda <= 0) {
        return {
            valido: true,
            limite: 0
        };
    }

    const limite = renda * 0.30;

    return {
        valido: valorSolicitado <= limite,
        limite: limite
    };
}

function exibirBloqueioPronampe(
    valorSolicitado,
    renda,
    limite
) {
    const elemento =
        elementosComprometimento
            .statusComprometimento;

    elemento.classList.remove(
        "status-baixo",
        "status-atencao",
        "status-alto"
    );

    elemento.classList.add(
        "status-alto"
    );

    elemento.innerHTML = `
        <strong>Valor solicitado acima do limite permitido para PRONAMPE.</strong>
        <span>
            Para operações PRONAMPE, o valor solicitado não pode ser superior a 30% da renda informada.
            Valor solicitado: ${formatarMoeda(valorSolicitado)}.
            Renda informada: ${formatarMoeda(renda)}.
            Limite máximo permitido: ${formatarMoeda(limite)}.
        </span>
    `;
}

function atualizarStatus(
    percentual,
    renda
) {
    const elemento =
        elementosComprometimento
            .statusComprometimento;

    elemento.classList.remove(
        "status-baixo",
        "status-atencao",
        "status-alto"
    );

    if (renda <= 0) {
        elemento.innerHTML = `
            <strong>Informe uma renda comprovada válida.</strong>
            <span>
                O comprometimento somente pode ser calculado quando houver renda mensal comprovada maior que zero.
            </span>
        `;

        return;
    }

    if (percentual <= 30) {
        elemento.classList.add(
            "status-baixo"
        );

        elemento.innerHTML = `
            <strong>Comprometimento de ${formatarPercentual(percentual)}</strong>
            <span>
                O percentual calculado está até a faixa de 30% da renda comprovada.
            </span>
        `;

        return;
    }

    if (percentual <= 50) {
        elemento.classList.add(
            "status-atencao"
        );

        elemento.innerHTML = `
            <strong>Comprometimento de ${formatarPercentual(percentual)}</strong>
            <span>
                O comprometimento calculado está acima de 30% da renda comprovada e requer atenção na análise.
            </span>
        `;

        return;
    }

    elemento.classList.add(
        "status-alto"
    );

    elemento.innerHTML = `
        <strong>Comprometimento de ${formatarPercentual(percentual)}</strong>
        <span>
            O comprometimento calculado está acima de 50% da renda comprovada. Avalie cuidadosamente a capacidade de pagamento.
        </span>
    `;
}

function calcularComprometimento() {
    const valorSolicitado =
        moedaParaNumero(
            elementosComprometimento
                .valorSolicitado
                .value
        );

    const renda =
        moedaParaNumero(
            elementosComprometimento
                .rendaComprovada
                .value
        );

    /*
     * =====================================================
     * BLOQUEIO PRONAMPE - LIMITE DE 30% DA RENDA
     * =====================================================
     */
    const validacaoPronampe =
        validarLimiteValorSolicitadoPronampe(
            valorSolicitado,
            renda
        );

    if (!validacaoPronampe.valido) {
        elementosComprometimento
            .resultadoValorSolicitado
            .textContent =
            formatarMoeda(
                valorSolicitado
            );

        elementosComprometimento
            .resultadoRendaComprovada
            .textContent =
            formatarMoeda(
                renda
            );

        exibirBloqueioPronampe(
            valorSolicitado,
            renda,
            validacaoPronampe.limite
        );

        return;
    }

    const contratosSicoob =
        moedaParaNumero(
            elementosComprometimento
                .contratosSicoob
                .value
        );

    const prazo =
        limitarPrazo(
            elementosComprometimento
                .prazoOperacao
                .value
        );

    const taxaMensal =
        Math.max(
            0,
            numeroSeguro(
                elementosComprometimento
                    .taxaMensal
                    .value
            )
        );

    const perdaEsperada =
        limitarPercentual(
            elementosComprometimento
                .perdaEsperada
                .value
        );

    elementosComprometimento
        .prazoOperacao
        .value = prazo;

    elementosComprometimento
        .perdaEsperada
        .value = perdaEsperada;

    const parcelaOperacao =
        calcularParcelaPrice(
            valorSolicitado,
            taxaMensal,
            prazo
        );

    const endividamentoSfn =
        calcularEndividamentoMensalSfn();

    const percentualSfn =
        calcularPercentualComprometimento(
            endividamentoSfn,
            renda
        );

    const percentualOperacao =
        calcularPercentualComprometimento(
            parcelaOperacao,
            renda
        );

    const percentualSicoob =
        calcularPercentualComprometimento(
            contratosSicoob,
            renda
        );

    const endividamentoGlobal =
        endividamentoSfn +
        parcelaOperacao +
        contratosSicoob;

    const percentualGlobal =
        calcularPercentualComprometimento(
            endividamentoGlobal,
            renda
        );

    elementosComprometimento
        .endividamentoMensalSfn
        .textContent =
        formatarMoeda(
            endividamentoSfn
        );

    elementosComprometimento
        .resultadoComprometimentoGlobal
        .textContent =
        formatarPercentual(
            percentualGlobal
        );

    elementosComprometimento
        .resultadoValorSolicitado
        .textContent =
        formatarMoeda(
            valorSolicitado
        );

    elementosComprometimento
        .resultadoRendaComprovada
        .textContent =
        formatarMoeda(
            renda
        );

    elementosComprometimento
        .resultadoParcelaOperacao
        .textContent =
        formatarMoeda(
            parcelaOperacao
        );

    elementosComprometimento
        .resultadoEndividamentoSfn
        .textContent =
        formatarMoeda(
            endividamentoSfn
        );

    elementosComprometimento
        .resultadoContratosSicoob
        .textContent =
        formatarMoeda(
            contratosSicoob
        );

    elementosComprometimento
        .resultadoPercentualSfn
        .textContent =
        formatarPercentual(
            percentualSfn
        );

    elementosComprometimento
        .resultadoPercentualOperacao
        .textContent =
        formatarPercentual(
            percentualOperacao
        );

    elementosComprometimento
        .resultadoPerdaEsperada
        .textContent =
        formatarPercentual(
            perdaEsperada
        );

    elementosComprometimento
        .resultadoRisco
        .textContent =
        elementosComprometimento
            .riscoCooperado
            .value;

    elementosComprometimento
        .resultadoPrazo
        .textContent =
        `${prazo} meses`;

    elementosComprometimento
        .tabelaValorSfn
        .textContent =
        formatarMoeda(
            endividamentoSfn
        );

    elementosComprometimento
        .tabelaPercentualSfn
        .textContent =
        formatarPercentual(
            percentualSfn
        );

    elementosComprometimento
        .tabelaValorOperacao
        .textContent =
        formatarMoeda(
            parcelaOperacao
        );

    elementosComprometimento
        .tabelaPercentualOperacao
        .textContent =
        formatarPercentual(
            percentualOperacao
        );

    elementosComprometimento
        .tabelaValorSicoob
        .textContent =
        formatarMoeda(
            contratosSicoob
        );

    elementosComprometimento
        .tabelaPercentualSicoob
        .textContent =
        formatarPercentual(
            percentualSicoob
        );

    elementosComprometimento
        .tabelaValorTotal
        .textContent =
        formatarMoeda(
            endividamentoGlobal
        );

    elementosComprometimento
        .tabelaPercentualTotal
        .textContent =
        formatarPercentual(
            percentualGlobal
        );

    atualizarStatus(
        percentualGlobal,
        renda
    );
}

function registrarCampoMoeda(
    input
) {
    input.setAttribute(
        "inputmode",
        "numeric"
    );

    input.setAttribute(
        "autocomplete",
        "off"
    );

    input.addEventListener(
        "input",
        () => {
            aplicarMascaraMoeda(
                input
            );

            calcularComprometimento();
        }
    );

    input.addEventListener(
        "blur",
        () => {
            input.value =
                formatarNumeroMoeda(
                    moedaParaNumero(
                        input.value
                    )
                );

            calcularComprometimento();
        }
    );
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

    camposMoeda.forEach(
        campo => {
            registrarCampoMoeda(
                campo
            );
        }
    );

    [
        elementosComprometimento.tipoOperacao,
        elementosComprometimento.riscoCooperado
    ].forEach(
        campo => {
            campo.addEventListener(
                "change",
                calcularComprometimento
            );
        }
    );

    [
        elementosComprometimento.prazoOperacao,
        elementosComprometimento.taxaMensal,
        elementosComprometimento.perdaEsperada
    ].forEach(
        campo => {
            campo.addEventListener(
                "input",
                calcularComprometimento
            );

            campo.addEventListener(
                "change",
                calcularComprometimento
            );
        }
    );

    elementosComprometimento
        .btnCalcularComprometimento
        .addEventListener(
            "click",
            calcularComprometimento
        );

    elementosComprometimento
        .btnLimparComprometimento
        .addEventListener(
            "click",
            limparComprometimento
        );
}

function limparComprometimento() {
    elementosComprometimento
        .tipoOperacao
        .value =
        "pronampe";

    elementosComprometimento
        .riscoCooperado
        .value =
        "R1";

    elementosComprometimento
        .valorSolicitado
        .value =
        "100.000,00";

    elementosComprometimento
        .rendaComprovada
        .value =
        "20.000,00";

    elementosComprometimento
        .prazoOperacao
        .value =
        "33";

    elementosComprometimento
        .taxaMensal
        .value =
        "1.00";

    elementosComprometimento
        .perdaEsperada
        .value =
        "0";

    elementosComprometimento
        .contratosSicoob
        .value =
        "0,00";

    elementosComprometimento
        .riscoBacenCurtoPrazo
        .value =
        "0,00";

    elementosComprometimento
        .chequeEspecial
        .value =
        "0,00";

    elementosComprometimento
        .contaGarantida
        .value =
        "0,00";

    elementosComprometimento
        .descontoTitulos
        .value =
        "0,00";

    elementosComprometimento
        .outrosValoresExcluir1
        .value =
        "0,00";

    elementosComprometimento
        .outrosValoresExcluir2
        .value =
        "0,00";

    elementosComprometimento
        .outrosValoresExcluir3
        .value =
        "0,00";

    calcularComprometimento();
}

function iniciarComprometimentoRenda() {
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
    ].forEach(
        campo => {
            campo.value =
                formatarNumeroMoeda(
                    moedaParaNumero(
                        campo.value
                    )
                );
        }
    );

    calcularComprometimento();
}

iniciarComprometimentoRenda();