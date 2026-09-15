const LIMITE_VALOR_MONETARIO = 999999999999.99;

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

const DOCUMENTOS = {
    gerais: [
        "Documento de identificação do proponente.",
        "Comprovante de endereço atualizado.",
        "Documentos cadastrais necessários para análise da operação."
    ],

    custeio: [
        "Documentação relacionada à atividade rural.",
        "Comprovação ou documentação da área onde será realizada a atividade.",
        "Orçamentos, estimativas ou informações relacionadas aos itens financiados.",
        "Documentação complementar conforme cultura, atividade e enquadramento da operação."
    ],

    investimento: [
        "Documentação relacionada à propriedade ou área rural.",
        "Orçamento ou proposta comercial do bem ou investimento.",
        "Documentos técnicos relacionados ao investimento.",
        "Documentação complementar conforme o tipo de bem ou finalidade financiada."
    ],

    comercializacao: [
        "Documentação relacionada aos produtos objeto da comercialização.",
        "Comprovação da produção ou origem dos produtos.",
        "Documentos comerciais relacionados à operação."
    ],

    industrializacao: [
        "Documentação relacionada à atividade de industrialização.",
        "Documentação dos produtos ou matérias-primas envolvidos.",
        "Orçamentos ou informações referentes aos custos da operação."
    ],

    agricola: [
        "Informações da cultura ou produção agrícola envolvida.",
        "Informações referentes à área de cultivo.",
        "Documentação relacionada à produção e à atividade agrícola."
    ],

    pecuaria: [
        "Informações relacionadas ao rebanho ou à criação.",
        "Informações referentes à estrutura utilizada na atividade pecuária.",
        "Documentação relacionada à exploração pecuária."
    ],

    extrativismo: [
        "Informações relacionadas à atividade extrativista.",
        "Documentação referente à origem e à exploração dos produtos.",
        "Autorizações, licenças ou documentos aplicáveis à atividade, quando necessários."
    ],

    florestal_agroflorestal: [
        "Informações relacionadas à atividade florestal ou agroflorestal.",
        "Documentação referente à área utilizada na atividade.",
        "Projetos, autorizações, licenças ou documentos técnicos aplicáveis, quando necessários."
    ]
};

const TITULOS_DOCUMENTOS_FINALIDADE = {
    custeio: "Documentação para Custeio",
    investimento: "Documentação para Investimento",
    comercializacao: "Documentação para Comercialização",
    industrializacao: "Documentação para Industrialização"
};

const TITULOS_DOCUMENTOS_GRUPO = {
    agricola: "Documentação da Atividade - Agrícola",
    pecuaria: "Documentação da Atividade - Pecuária",
    extrativismo: "Documentação da Atividade - Extrativismo",
    florestal_agroflorestal: "Documentação da Atividade - Florestal / Agroflorestal"
};

const finalidade = document.getElementById("finalidade");
const linhaCredito = document.getElementById("linhaCredito");
const grupoAtividade = document.getElementById("grupoAtividade");
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
const listaDocumentos = document.getElementById("listaDocumentos");

function limitarValorMonetario(valor) {
    const numero = Number(valor);

    if (!Number.isFinite(numero) || numero < 0) {
        return 0;
    }

    return Math.min(
        numero,
        LIMITE_VALOR_MONETARIO
    );
}

function moedaParaNumero(valor) {
    if (
        valor === null ||
        valor === undefined ||
        valor === ""
    ) {
        return 0;
    }

    let texto = String(valor)
        .trim()
        .replace(/R\$/gi, "")
        .replace(/\s/g, "");

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

    const convertido = Number(texto);

    return limitarValorMonetario(convertido);
}

function formatarMoeda(valor) {
    const numero = Number(valor);

    return (
        Number.isFinite(numero)
            ? numero
            : 0
    ).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatarNumeroMoeda(valor) {
    return limitarValorMonetario(valor).toLocaleString("pt-BR", {
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
    let digitos = String(
        input.value || ""
    ).replace(/\D/g, "");

    if (!digitos) {
        input.value = "0,00";
        return;
    }

    const limiteCentavos = Math.round(
        LIMITE_VALOR_MONETARIO * 100
    );

    let centavos = Number(digitos);

    if (
        !Number.isFinite(centavos) ||
        centavos < 0
    ) {
        centavos = 0;
    }

    centavos = Math.min(
        centavos,
        limiteCentavos
    );

    const valor = centavos / 100;

    input.value = valor.toLocaleString(
        "pt-BR",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );
}

function carregarLinhasCredito() {
    const lista = LINHAS_CREDITO[
        finalidade.value
    ] || [];

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
    const lista = LINHAS_CREDITO[
        finalidade.value
    ] || [];

    return lista.find(
        item =>
            item.id === linhaCredito.value
    );
}

function aplicarParametrosLinha() {
    const linha = obterLinhaSelecionada();

    if (!linha) {
        return;
    }

    taxa.value = linha.taxa.toFixed(2);
    prazo.value = linha.prazo;
    carencia.value = linha.carencia;

    calcularValorFinanciado();
    simularAutomaticamente();
}

function calcularValorFinanciado() {
    const projeto = moedaParaNumero(
        valorProjeto.value
    );

    const recursos = moedaParaNumero(
        recursosProprios.value
    );

    const financiado = limitarValorMonetario(
        Math.max(
            projeto - recursos,
            0
        )
    );

    valorFinanciado.value = formatarNumeroMoeda(
        financiado
    );

    return financiado;
}

function obterQuantidadeParcelas(
    prazoMeses,
    carenciaMeses,
    tipoPeriodicidade
) {
    const mesesFinanciamento = Math.max(
        prazoMeses - carenciaMeses,
        1
    );

    const divisor = {
        mensal: 1,
        trimestral: 3,
        semestral: 6,
        anual: 12
    }[tipoPeriodicidade] || 1;

    return Math.max(
        Math.ceil(
            mesesFinanciamento / divisor
        ),
        1
    );
}

function obterPeriodosPorAno(tipoPeriodicidade) {
    return {
        mensal: 12,
        trimestral: 4,
        semestral: 2,
        anual: 1
    }[tipoPeriodicidade] || 12;
}

function calcularTaxaPeriodo(
    taxaAnual,
    tipoPeriodicidade
) {
    const periodosAno = obterPeriodosPorAno(
        tipoPeriodicidade
    );

    const taxaDecimal = taxaAnual / 100;

    return Math.pow(
        1 + taxaDecimal,
        1 / periodosAno
    ) - 1;
}

function calcularPrice(
    valor,
    taxaPeriodo,
    quantidadeParcelas
) {
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
                Math.pow(
                    1 + taxaPeriodo,
                    quantidadeParcelas
                )
            ) /
            (
                Math.pow(
                    1 + taxaPeriodo,
                    quantidadeParcelas
                ) - 1
            );
    }

    let saldo = valor;

    for (
        let i = 1;
        i <= quantidadeParcelas;
        i++
    ) {
        const saldoInicial = saldo;

        const juros =
            saldoInicial *
            taxaPeriodo;

        let amortizacao =
            valorParcela -
            juros;

        if (i === quantidadeParcelas) {
            amortizacao = saldoInicial;

            valorParcela =
                amortizacao +
                juros;
        }

        saldo = Math.max(
            saldoInicial -
            amortizacao,
            0
        );

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

function calcularSac(
    valor,
    taxaPeriodo,
    quantidadeParcelas
) {
    const parcelas = [];

    if (quantidadeParcelas <= 0) {
        return parcelas;
    }

    const amortizacaoBase =
        valor /
        quantidadeParcelas;

    let saldo = valor;

    for (
        let i = 1;
        i <= quantidadeParcelas;
        i++
    ) {
        const saldoInicial = saldo;

        const juros =
            saldoInicial *
            taxaPeriodo;

        let amortizacao =
            amortizacaoBase;

        if (i === quantidadeParcelas) {
            amortizacao = saldoInicial;
        }

        const valorParcela =
            amortizacao +
            juros;

        saldo = Math.max(
            saldoInicial -
            amortizacao,
            0
        );

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

function calcularCarenciaCapitalizada(
    valor,
    taxaPeriodo,
    carenciaMeses,
    tipoPeriodicidade
) {
    if (carenciaMeses <= 0) {
        return valor;
    }

    const divisor = {
        mensal: 1,
        trimestral: 3,
        semestral: 6,
        anual: 12
    }[tipoPeriodicidade] || 1;

    const periodosCarencia =
        carenciaMeses /
        divisor;

    return valor *
        Math.pow(
            1 + taxaPeriodo,
            periodosCarencia
        );
}

function validarSimulacao(
    mostrarAlerta = false
) {
    const valor =
        calcularValorFinanciado();

    const prazoMeses =
        Number(prazo.value) || 0;

    const carenciaMeses =
        Number(carencia.value) || 0;

    if (valor <= 0) {
        if (mostrarAlerta) {
            alert(
                "Informe um valor financiado maior que zero."
            );
        }

        return false;
    }

    if (prazoMeses <= 0) {
        if (mostrarAlerta) {
            alert(
                "Informe um prazo válido."
            );
        }

        return false;
    }

    if (carenciaMeses < 0) {
        if (mostrarAlerta) {
            alert(
                "Informe uma carência válida."
            );
        }

        return false;
    }

    if (carenciaMeses >= prazoMeses) {
        if (mostrarAlerta) {
            alert(
                "A carência deve ser menor que o prazo total."
            );
        }

        return false;
    }

    return true;
}

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

    const valor =
        calcularValorFinanciado();

    const prazoMeses =
        Number(prazo.value) || 0;

    const carenciaMeses =
        Number(carencia.value) || 0;

    const taxaAnual =
        Number(taxa.value) || 0;

    const tipoPeriodicidade =
        periodicidade.value;

    const sistemaSelecionado =
        sistema.value;

    const linha =
        obterLinhaSelecionada();

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

    let parcelas;

    if (sistemaSelecionado === "sac") {
        parcelas =
            calcularSac(
                saldoAposCarencia,
                taxaPeriodo,
                quantidadeParcelas
            );
    } else {
        parcelas =
            calcularPrice(
                saldoAposCarencia,
                taxaPeriodo,
                quantidadeParcelas
            );
    }

    const totalPago =
        parcelas.reduce(
            (total, item) =>
                total +
                item.valorParcela,
            0
        );

    const jurosTotais =
        totalPago -
        valor;

    const primeiraParcela =
        parcelas.length
            ? parcelas[0].valorParcela
            : 0;

    const ultimaParcela =
        parcelas.length
            ? parcelas[
                parcelas.length - 1
            ].valorParcela
            : 0;

    resultadoValorFinanciado.textContent =
        formatarMoeda(valor);

    resultadoTaxa.textContent =
        formatarPercentual(taxaAnual) +
        " a.a.";

    resultadoPrazo.textContent =
        prazoMeses +
        " meses";

    resultadoCarencia.textContent =
        carenciaMeses +
        " meses";

    resultadoParcelas.textContent =
        quantidadeParcelas;

    resultadoPrimeiraParcela.textContent =
        formatarMoeda(
            primeiraParcela
        );

    resultadoUltimaParcela.textContent =
        formatarMoeda(
            ultimaParcela
        );

    resultadoJuros.textContent =
        formatarMoeda(
            jurosTotais
        );

    resultadoTotal.textContent =
        formatarMoeda(
            totalPago
        );

    resultadoLinha.textContent =
        linha
            ? linha.nome
            : "-";

    preencherTabela(parcelas);
    atualizarDocumentos();
}

function simularAutomaticamente() {
    simular(false);
}

function limparResultadosInvalidos() {
    const valor =
        calcularValorFinanciado();

    const prazoMeses =
        Number(prazo.value) || 0;

    const carenciaMeses =
        Number(carencia.value) || 0;

    const taxaAnual =
        Number(taxa.value) || 0;

    const linha =
        obterLinhaSelecionada();

    resultadoValorFinanciado.textContent =
        formatarMoeda(valor);

    resultadoTaxa.textContent =
        formatarPercentual(taxaAnual) +
        " a.a.";

    resultadoPrazo.textContent =
        prazoMeses +
        " meses";

    resultadoCarencia.textContent =
        carenciaMeses +
        " meses";

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

    resultadoLinha.textContent =
        linha
            ? linha.nome
            : "-";

    tabelaParcelas.innerHTML = `
        <tr>
            <td colspan="6" class="sem-dados">
                Informe dados válidos para visualizar as parcelas.
            </td>
        </tr>
    `;
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
        const tr =
            document.createElement("tr");

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
            .map(
                documento =>
                    `<li class="documento-item">${documento}</li>`
            )
            .join("");

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

function obterNomeAtividadeSelecionada() {
    if (
        window.CreditoRuralAtividades &&
        typeof window.CreditoRuralAtividades.obterNomeAtividade === "function"
    ) {
        return window.CreditoRuralAtividades.obterNomeAtividade(
            atividade.value,
            grupoAtividade.value
        );
    }

    const optionSelecionada =
        atividade.options[
        atividade.selectedIndex
        ];

    return optionSelecionada
        ? optionSelecionada.textContent
        : "";
}

function obterNomeGrupoAtividadeSelecionado() {
    if (
        window.CreditoRuralAtividades &&
        typeof window.CreditoRuralAtividades.obterNomeGrupo === "function"
    ) {
        return window.CreditoRuralAtividades.obterNomeGrupo(
            grupoAtividade.value
        );
    }

    const optionSelecionada =
        grupoAtividade.options[
        grupoAtividade.selectedIndex
        ];

    return optionSelecionada
        ? optionSelecionada.textContent
        : "";
}

function atualizarDocumentos() {
    const finalidadeSelecionada =
        finalidade.value;

    const grupoSelecionado =
        grupoAtividade.value;

    const nomeGrupoSelecionado =
        obterNomeGrupoAtividadeSelecionado();

    const nomeAtividadeSelecionada =
        obterNomeAtividadeSelecionada();

    let html = "";

    html += criarGrupoDocumentos(
        "Documentação Geral",
        DOCUMENTOS.gerais
    );

    if (
        DOCUMENTOS[
        finalidadeSelecionada
        ]
    ) {
        html += criarGrupoDocumentos(
            TITULOS_DOCUMENTOS_FINALIDADE[
            finalidadeSelecionada
            ],
            DOCUMENTOS[
            finalidadeSelecionada
            ]
        );
    }

    if (
        DOCUMENTOS[
        grupoSelecionado
        ]
    ) {
        html += criarGrupoDocumentos(
            TITULOS_DOCUMENTOS_GRUPO[
            grupoSelecionado
            ] ||
            `Documentação da Atividade - ${nomeGrupoSelecionado}`,
            DOCUMENTOS[
            grupoSelecionado
            ]
        );
    }

    if (nomeAtividadeSelecionada) {
        html += criarGrupoDocumentos(
            "Atividade Selecionada",
            [
                `Atividade: ${nomeAtividadeSelecionada}.`
            ]
        );
    }

    listaDocumentos.innerHTML = html;
}

function redefinirAtividadeRural() {
    if (
        window.CreditoRuralAtividades &&
        typeof window.CreditoRuralAtividades.preencherGrupos === "function" &&
        typeof window.CreditoRuralAtividades.preencherAtividades === "function"
    ) {
        window.CreditoRuralAtividades.preencherGrupos(
            "agricola"
        );

        window.CreditoRuralAtividades.preencherAtividades(
            "agricola",
            window.CreditoRuralAtividades.normalizarIdentificadorAtividade(
                "Arroz"
            )
        );

        return;
    }

    grupoAtividade.value =
        "agricola";
}

function limparSimulacao() {
    finalidade.value =
        "custeio";

    redefinirAtividadeRural();

    valorProjeto.value =
        "100.000,00";

    recursosProprios.value =
        "20.000,00";

    periodicidade.value =
        "mensal";

    sistema.value =
        "price";

    carregarLinhasCredito();
    calcularValorFinanciado();
    atualizarDocumentos();
    simularAutomaticamente();
}

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
        valorProjeto.value =
            formatarNumeroMoeda(
                moedaParaNumero(
                    valorProjeto.value
                )
            );

        calcularValorFinanciado();
        simularAutomaticamente();
    }
);

recursosProprios.addEventListener(
    "blur",
    () => {
        recursosProprios.value =
            formatarNumeroMoeda(
                moedaParaNumero(
                    recursosProprios.value
                )
            );

        calcularValorFinanciado();
        simularAutomaticamente();
    }
);

finalidade.addEventListener(
    "change",
    () => {
        carregarLinhasCredito();
    }
);

linhaCredito.addEventListener(
    "change",
    () => {
        aplicarParametrosLinha();
    }
);

grupoAtividade.addEventListener(
    "change",
    () => {
        atualizarDocumentos();
        simularAutomaticamente();
    }
);

atividade.addEventListener(
    "change",
    () => {
        atualizarDocumentos();
        simularAutomaticamente();
    }
);

prazo.addEventListener(
    "input",
    () => {
        simularAutomaticamente();
    }
);

carencia.addEventListener(
    "input",
    () => {
        simularAutomaticamente();
    }
);

taxa.addEventListener(
    "input",
    () => {
        simularAutomaticamente();
    }
);

periodicidade.addEventListener(
    "change",
    () => {
        simularAutomaticamente();
    }
);

sistema.addEventListener(
    "change",
    () => {
        simularAutomaticamente();
    }
);

btnSimular.addEventListener(
    "click",
    () => {
        simular(true);
    }
);

btnLimpar.addEventListener(
    "click",
    () => {
        limparSimulacao();
    }
);

aplicarMascaraMoeda(
    valorProjeto
);

aplicarMascaraMoeda(
    recursosProprios
);

carregarLinhasCredito();
calcularValorFinanciado();
atualizarDocumentos();
simularAutomaticamente();