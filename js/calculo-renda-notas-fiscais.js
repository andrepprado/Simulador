/**
 * calculo-renda-notas-fiscais.js
 * Ferramenta de apoio para cálculo de renda agropecuária
 * com base no período econômico representado pelas notas fiscais.
 * @author andre.prado
 */

document.addEventListener("DOMContentLoaded", () => {
    const listaPeriodosNotas = document.getElementById("listaPeriodosNotas");
    const listaNotasAuxiliares = document.getElementById("listaNotasAuxiliares");
    const btnAdicionarPeriodo = document.getElementById("btnAdicionarPeriodo");
    const btnAdicionarNotaAuxiliar = document.getElementById("btnAdicionarNotaAuxiliar");
    const btnLimparCalculoNotas = document.getElementById("btnLimparCalculoNotas");

    const resultadoRendaMensal = document.getElementById("resultadoRendaMensal");
    const resultadoRendaAnual = document.getElementById("resultadoRendaAnual");
    const resultadoTotalNotas = document.getElementById("resultadoTotalNotas");
    const resultadoQtdPeriodos = document.getElementById("resultadoQtdPeriodos");
    const totalNotasAuxiliares = document.getElementById("totalNotasAuxiliares");

    const MESES = [
        { id: "jan", nome: "Jan" },
        { id: "fev", nome: "Fev" },
        { id: "mar", nome: "Mar" },
        { id: "abr", nome: "Abr" },
        { id: "mai", nome: "Mai" },
        { id: "jun", nome: "Jun" },
        { id: "jul", nome: "Jul" },
        { id: "ago", nome: "Ago" },
        { id: "set", nome: "Set" },
        { id: "out", nome: "Out" },
        { id: "nov", nome: "Nov" },
        { id: "dez", nome: "Dez" }
    ];

    const REFERENCIAS = [
        "Ciclo Anual ou Safra",
        "Mais de um mês",
        "Período específico ou por lote",
        "Outro período"
    ];

    let contadorPeriodo = 0;
    let contadorNotaAuxiliar = 0;

    function numeroSeguro(valor) {
        const numero = Number(valor);
        return Number.isFinite(numero) ? numero : 0;
    }

    function arredondar(valor, casas = 2) {
        const fator = 10 ** casas;
        return Math.round((numeroSeguro(valor) + Number.EPSILON) * fator) / fator;
    }

    function formatarMoeda(valor) {
        return numeroSeguro(valor).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function apenasDigitos(valor) {
        return String(valor || "").replace(/\D/g, "");
    }

    function moedaParaNumero(valor) {
        const digitos = apenasDigitos(valor);

        if (!digitos) {
            return 0;
        }

        return Number(digitos) / 100;
    }

    function formatarInputMoeda(input) {
        const valor = moedaParaNumero(input.value);

        if (!input.value.trim()) {
            input.value = "";
            return;
        }

        input.value = formatarMoeda(valor)
            .replace("R$", "")
            .trim();
    }

    function obterValorInputMoeda(input) {
        if (!input) {
            return 0;
        }

        return moedaParaNumero(input.value);
    }

    function criarCampoMoedaMes(mes, idPeriodo) {
        const campo = document.createElement("div");
        campo.className = "campo calculo-notas-campo-mes";

        const label = document.createElement("label");
        label.setAttribute("for", `${mes.id}-${idPeriodo}`);
        label.textContent = mes.nome;

        const prefixo = document.createElement("div");
        prefixo.className = "input-prefixo";

        const span = document.createElement("span");
        span.textContent = "R$";

        const input = document.createElement("input");
        input.type = "text";
        input.inputMode = "numeric";
        input.autocomplete = "off";
        input.id = `${mes.id}-${idPeriodo}`;
        input.className = "campo-valor-mes";
        input.placeholder = "0,00";

        input.addEventListener("input", () => {
            formatarInputMoeda(input);
            recalcularTudo();
        });

        prefixo.appendChild(span);
        prefixo.appendChild(input);

        campo.appendChild(label);
        campo.appendChild(prefixo);

        return campo;
    }

    function criarPeriodo() {
        contadorPeriodo += 1;

        const idPeriodo = contadorPeriodo;

        const periodo = document.createElement("div");
        periodo.className = "calculo-notas-periodo";
        periodo.dataset.periodoId = String(idPeriodo);

        const cabecalho = document.createElement("div");
        cabecalho.className = "calculo-notas-periodo-cabecalho";

        const titulo = document.createElement("div");

        const strong = document.createElement("strong");
        strong.textContent = `Período ${idPeriodo}`;

        const small = document.createElement("small");
        small.textContent = "Informe os valores correspondentes aos meses representados pelas notas.";

        titulo.appendChild(strong);
        titulo.appendChild(small);

        const btnRemover = document.createElement("button");
        btnRemover.type = "button";
        btnRemover.className = "btn btn-secundario calculo-notas-remover-periodo";
        btnRemover.textContent = "Remover";

        btnRemover.addEventListener("click", () => {
            periodo.remove();

            if (!listaPeriodosNotas.querySelector(".calculo-notas-periodo")) {
                criarPeriodo();
            }

            renumerarPeriodos();
            recalcularTudo();
        });

        cabecalho.appendChild(titulo);
        cabecalho.appendChild(btnRemover);

        const identificacao = document.createElement("div");
        identificacao.className = "grid-form-3 calculo-notas-identificacao";

        const campoNota = document.createElement("div");
        campoNota.className = "campo";

        const labelNota = document.createElement("label");
        labelNota.textContent = "Nº da Nota(s)";

        const inputNota = document.createElement("input");
        inputNota.type = "text";
        inputNota.className = "periodo-numero-nota";
        inputNota.placeholder = "Opcional";

        campoNota.appendChild(labelNota);
        campoNota.appendChild(inputNota);

        const campoReferencia = document.createElement("div");
        campoReferencia.className = "campo";

        const labelReferencia = document.createElement("label");
        labelReferencia.textContent = "Referência da Situação";

        const selectReferencia = document.createElement("select");
        selectReferencia.className = "periodo-referencia";

        const opcaoVazia = document.createElement("option");
        opcaoVazia.value = "";
        opcaoVazia.textContent = "Selecione";
        selectReferencia.appendChild(opcaoVazia);

        REFERENCIAS.forEach(item => {
            const option = document.createElement("option");
            option.value = item;
            option.textContent = item;
            selectReferencia.appendChild(option);
        });

        campoReferencia.appendChild(labelReferencia);
        campoReferencia.appendChild(selectReferencia);

        const campoProduto = document.createElement("div");
        campoProduto.className = "campo";

        const labelProduto = document.createElement("label");
        labelProduto.textContent = "Produto / Cultura";

        const inputProduto = document.createElement("input");
        inputProduto.type = "text";
        inputProduto.className = "periodo-produto";
        inputProduto.placeholder = "Opcional";

        campoProduto.appendChild(labelProduto);
        campoProduto.appendChild(inputProduto);

        identificacao.appendChild(campoNota);
        identificacao.appendChild(campoReferencia);
        identificacao.appendChild(campoProduto);

        const tituloValores = document.createElement("div");
        tituloValores.className = "titulo-subsecao calculo-notas-titulo-valores";

        const h3 = document.createElement("h3");
        h3.textContent = "Valores por mês";

        const p = document.createElement("p");
        p.textContent = "Preencha apenas os meses que fazem parte da documentação analisada.";

        tituloValores.appendChild(h3);
        tituloValores.appendChild(p);

        const mesesGrid = document.createElement("div");
        mesesGrid.className = "calculo-notas-meses-grid";

        MESES.forEach(mes => {
            mesesGrid.appendChild(
                criarCampoMoedaMes(
                    mes,
                    idPeriodo
                )
            );
        });

        const rodape = document.createElement("div");
        rodape.className = "grid-form-3 calculo-notas-periodo-rodape";

        const campoTotal = document.createElement("div");
        campoTotal.className = "campo";

        const labelTotal = document.createElement("label");
        labelTotal.textContent = "Valor Total das Notas";

        const total = document.createElement("input");
        total.type = "text";
        total.className = "periodo-total";
        total.value = "R$ 0,00";
        total.readOnly = true;

        campoTotal.appendChild(labelTotal);
        campoTotal.appendChild(total);

        const campoMeses = document.createElement("div");
        campoMeses.className = "campo";

        const labelMeses = document.createElement("label");
        labelMeses.textContent = "Meses de Apuração";

        const inputMeses = document.createElement("input");
        inputMeses.type = "number";
        inputMeses.className = "periodo-meses";
        inputMeses.min = "1";
        inputMeses.max = "120";
        inputMeses.step = "1";
        inputMeses.placeholder = "Ex.: 12";

        inputMeses.addEventListener("input", recalcularTudo);

        campoMeses.appendChild(labelMeses);
        campoMeses.appendChild(inputMeses);

        const campoRenda = document.createElement("div");
        campoRenda.className = "campo";

        const labelRenda = document.createElement("label");
        labelRenda.textContent = "Renda Mensal Calculada";

        const renda = document.createElement("input");
        renda.type = "text";
        renda.className = "periodo-renda";
        renda.value = "R$ 0,00";
        renda.readOnly = true;

        campoRenda.appendChild(labelRenda);
        campoRenda.appendChild(renda);

        rodape.appendChild(campoTotal);
        rodape.appendChild(campoMeses);
        rodape.appendChild(campoRenda);

        const observacaoCampo = document.createElement("div");
        observacaoCampo.className = "campo calculo-notas-observacao-periodo";

        const observacaoLabel = document.createElement("label");
        observacaoLabel.textContent = "Observação / Justificativa";

        const observacao = document.createElement("textarea");
        observacao.className = "periodo-observacao";
        observacao.placeholder = "Opcional";

        observacaoCampo.appendChild(observacaoLabel);
        observacaoCampo.appendChild(observacao);

        periodo.appendChild(cabecalho);
        periodo.appendChild(identificacao);
        periodo.appendChild(tituloValores);
        periodo.appendChild(mesesGrid);
        periodo.appendChild(rodape);
        periodo.appendChild(observacaoCampo);

        listaPeriodosNotas.appendChild(periodo);

        recalcularTudo();
    }

    function renumerarPeriodos() {
        const periodos = listaPeriodosNotas.querySelectorAll(".calculo-notas-periodo");

        periodos.forEach((periodo, indice) => {
            const titulo = periodo.querySelector(".calculo-notas-periodo-cabecalho strong");

            if (titulo) {
                titulo.textContent = `Período ${indice + 1}`;
            }
        });
    }

    function calcularPeriodo(periodo) {
        const camposMeses = periodo.querySelectorAll(".campo-valor-mes");

        let total = 0;

        camposMeses.forEach(input => {
            total += obterValorInputMoeda(input);
        });

        total = arredondar(total, 2);

        const inputMeses = periodo.querySelector(".periodo-meses");
        const meses = Math.trunc(numeroSeguro(inputMeses?.value));

        const rendaMensal = meses > 0
            ? arredondar(total / meses, 2)
            : 0;

        const totalCampo = periodo.querySelector(".periodo-total");
        const rendaCampo = periodo.querySelector(".periodo-renda");

        if (totalCampo) {
            totalCampo.value = formatarMoeda(total);
        }

        if (rendaCampo) {
            rendaCampo.value = meses > 0
                ? formatarMoeda(rendaMensal)
                : "R$ 0,00";
        }

        return {
            total,
            meses,
            rendaMensal
        };
    }

    function recalcularTudo() {
        const periodos = listaPeriodosNotas.querySelectorAll(".calculo-notas-periodo");

        let rendaMensalTotal = 0;
        let totalNotas = 0;
        let quantidadePeriodosValidos = 0;

        periodos.forEach(periodo => {
            const resultado = calcularPeriodo(periodo);

            totalNotas += resultado.total;

            if (
                resultado.total > 0 &&
                resultado.meses > 0
            ) {
                rendaMensalTotal += resultado.rendaMensal;
                quantidadePeriodosValidos += 1;
            }
        });

        rendaMensalTotal = arredondar(rendaMensalTotal, 2);
        totalNotas = arredondar(totalNotas, 2);

        const rendaAnual = arredondar(
            rendaMensalTotal * 12,
            2
        );

        resultadoRendaMensal.textContent = formatarMoeda(rendaMensalTotal);
        resultadoRendaAnual.textContent = formatarMoeda(rendaAnual);
        resultadoTotalNotas.textContent = formatarMoeda(totalNotas);
        resultadoQtdPeriodos.textContent = String(quantidadePeriodosValidos);
    }

    function criarNotaAuxiliar() {
        contadorNotaAuxiliar += 1;

        const linha = document.createElement("div");
        linha.className = "calculo-notas-auxiliar-linha";

        const numero = document.createElement("div");
        numero.className = "campo";

        const labelNumero = document.createElement("label");
        labelNumero.textContent = "Nº da Nota";

        const inputNumero = document.createElement("input");
        inputNumero.type = "text";
        inputNumero.placeholder = "Opcional";

        numero.appendChild(labelNumero);
        numero.appendChild(inputNumero);

        const valor = document.createElement("div");
        valor.className = "campo";

        const labelValor = document.createElement("label");
        labelValor.textContent = "Valor";

        const prefixo = document.createElement("div");
        prefixo.className = "input-prefixo";

        const span = document.createElement("span");
        span.textContent = "R$";

        const inputValor = document.createElement("input");
        inputValor.type = "text";
        inputValor.inputMode = "numeric";
        inputValor.className = "nota-auxiliar-valor";
        inputValor.placeholder = "0,00";

        inputValor.addEventListener("input", () => {
            formatarInputMoeda(inputValor);
            calcularNotasAuxiliares();
        });

        prefixo.appendChild(span);
        prefixo.appendChild(inputValor);

        valor.appendChild(labelValor);
        valor.appendChild(prefixo);

        const acoes = document.createElement("div");
        acoes.className = "campo calculo-notas-auxiliar-remover";

        const labelAcao = document.createElement("label");
        labelAcao.innerHTML = "&nbsp;";

        const remover = document.createElement("button");
        remover.type = "button";
        remover.className = "btn btn-secundario";
        remover.textContent = "Remover";

        remover.addEventListener("click", () => {
            linha.remove();
            calcularNotasAuxiliares();
        });

        acoes.appendChild(labelAcao);
        acoes.appendChild(remover);

        linha.appendChild(numero);
        linha.appendChild(valor);
        linha.appendChild(acoes);

        listaNotasAuxiliares.appendChild(linha);
    }

    function calcularNotasAuxiliares() {
        let total = 0;

        listaNotasAuxiliares
            .querySelectorAll(".nota-auxiliar-valor")
            .forEach(input => {
                total += obterValorInputMoeda(input);
            });

        totalNotasAuxiliares.textContent = formatarMoeda(
            arredondar(total, 2)
        );
    }

    function limparTudo() {
        listaPeriodosNotas.innerHTML = "";
        listaNotasAuxiliares.innerHTML = "";

        contadorPeriodo = 0;
        contadorNotaAuxiliar = 0;

        criarPeriodo();

        resultadoRendaMensal.textContent = "R$ 0,00";
        resultadoRendaAnual.textContent = "R$ 0,00";
        resultadoTotalNotas.textContent = "R$ 0,00";
        resultadoQtdPeriodos.textContent = "0";
        totalNotasAuxiliares.textContent = "R$ 0,00";
    }

    btnAdicionarPeriodo.addEventListener("click", criarPeriodo);
    btnAdicionarNotaAuxiliar.addEventListener("click", criarNotaAuxiliar);
    btnLimparCalculoNotas.addEventListener("click", limparTudo);

    criarPeriodo();
    criarNotaAuxiliar();
});