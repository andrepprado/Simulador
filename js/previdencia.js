document.addEventListener("DOMContentLoaded", () => {
    const LIMITE_VALOR_MONETARIO = 999999999999.99;

    const $ = id => document.getElementById(id);
    const $$ = seletor => Array.from(document.querySelectorAll(seletor));

    let etapaAtual = 1;

    const percentualEtapas = {
        1: 25,
        2: 50,
        3: 75,
        4: 100
    };

    const nomesEtapas = {
        1: "Você",
        2: "Planejamento",
        3: "Coberturas",
        4: "Seu Futuro"
    };

    function limitarValorMonetario(valor) {
        const n = Number(valor);

        if (!Number.isFinite(n) || n < 0) {
            return 0;
        }

        return Math.min(n, LIMITE_VALOR_MONETARIO);
    }

    function numero(valor) {
        if (typeof valor === "number") {
            return Number.isFinite(valor) ? valor : 0;
        }

        if (valor === null || valor === undefined) {
            return 0;
        }

        let texto = String(valor)
            .trim()
            .replace(/\s/g, "")
            .replace(/R\$/gi, "");

        if (!texto) {
            return 0;
        }

        if (texto.includes(",")) {
            texto = texto
                .replace(/\./g, "")
                .replace(",", ".");
        }

        const resultado = Number(texto);

        return Number.isFinite(resultado)
            ? resultado
            : 0;
    }

    function numeroMonetario(valor) {
        return limitarValorMonetario(
            numero(valor)
        );
    }

    function moeda(valor) {
        const n = Number(valor);

        return (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function percentual(valor, casas = 4) {
        const n = Number(valor) || 0;

        return `${n.toLocaleString("pt-BR", {
            minimumFractionDigits: casas,
            maximumFractionDigits: casas
        })}%`;
    }

    /* =========================================================
       CAMPOS MONETÁRIOS
       ========================================================= */

    function formatarCampoMoeda(campo) {
        const valor = numeroMonetario(
            campo.value
        );

        campo.value = valor.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function formatarCampoMoedaDigitacao(campo) {
        const digitos = String(campo.value || "")
            .replace(/\D/g, "");

        if (!digitos) {
            campo.value = "0,00";
            return;
        }

        let centavos = Number(digitos);

        if (!Number.isFinite(centavos)) {
            centavos = 0;
        }

        let valor = centavos / 100;

        valor = limitarValorMonetario(
            valor
        );

        campo.value = valor.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function posicionarCursorFinal(campo) {
        requestAnimationFrame(() => {
            const tamanho = campo.value.length;

            try {
                campo.setSelectionRange(
                    tamanho,
                    tamanho
                );
            } catch (erro) {
                // Campo não suporta seleção de texto.
            }
        });
    }

    function configurarCamposMoeda() {
        $$(".campo-moeda").forEach(campo => {
            campo.setAttribute(
                "inputmode",
                "numeric"
            );

            campo.setAttribute(
                "autocomplete",
                "off"
            );

            formatarCampoMoeda(campo);

            campo.addEventListener(
                "input",
                () => {
                    formatarCampoMoedaDigitacao(
                        campo
                    );

                    posicionarCursorFinal(
                        campo
                    );

                    atualizarCoberturas();

                    if (etapaAtual === 4) {
                        calcularTudo();
                    }
                }
            );

            campo.addEventListener(
                "focus",
                () => {
                    posicionarCursorFinal(
                        campo
                    );
                }
            );

            campo.addEventListener(
                "click",
                () => {
                    posicionarCursorFinal(
                        campo
                    );
                }
            );

            campo.addEventListener(
                "blur",
                () => {
                    formatarCampoMoeda(
                        campo
                    );

                    atualizarCoberturas();

                    if (etapaAtual === 4) {
                        calcularTudo();
                    }
                }
            );
        });
    }

    function mostrarEtapa(numeroEtapa) {
        etapaAtual = numeroEtapa;

        $$(".previdencia-painel").forEach(painel => {
            painel.classList.remove("ativo");
        });

        const painel = $(`etapa${numeroEtapa}`);

        if (painel) {
            painel.classList.add("ativo");
        }

        $$(".previdencia-etapa").forEach(botao => {
            const etapa = Number(botao.dataset.etapa);

            botao.classList.toggle(
                "ativo",
                etapa === numeroEtapa
            );

            botao.classList.toggle(
                "concluido",
                etapa < numeroEtapa
            );
        });

        $("textoEtapa").textContent =
            nomesEtapas[numeroEtapa];

        const progresso =
            percentualEtapas[numeroEtapa];

        $("textoProgresso").textContent =
            `${progresso}%`;

        $("barraProgressoValor").style.width =
            `${progresso}%`;

        if (numeroEtapa === 4) {
            atualizarResumo();
            calcularTudo();
        }

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    function validarEtapa1() {
        const idadeAtual =
            numero($("idadeAtual").value);

        const idadeAposentadoria =
            numero($("idadeAposentadoria").value);

        if (idadeAtual < 18) {
            alert(
                "Informe uma idade atual válida."
            );

            $("idadeAtual").focus();
            return false;
        }

        if (
            idadeAposentadoria <=
            idadeAtual
        ) {
            alert(
                "A idade para início da renda deve ser maior que a idade atual."
            );

            $("idadeAposentadoria").focus();
            return false;
        }

        return true;
    }

    function validarEtapa2() {
        const tipo =
            document.querySelector(
                'input[name="tipoSimulacao"]:checked'
            ).value;

        if (
            tipo === "renda" &&
            numeroMonetario(
                $("rendaDesejada").value
            ) <= 0
        ) {
            alert(
                "Informe o valor da renda mensal pretendida."
            );

            $("rendaDesejada").focus();
            return false;
        }

        if (
            tipo === "contribuicao" &&
            obterContribuicaoMensalInformada() <= 0
        ) {
            alert(
                "Informe o valor da contribuição mensal."
            );

            return false;
        }

        return true;
    }

    function validarEtapa3() {
        const morte =
            numeroMonetario(
                $("coberturaMorteContribuicao")
                    .value
            );

        const invalidez =
            numeroMonetario(
                $("coberturaInvalidezContribuicao")
                    .value
            );

        if (
            morte > 0 &&
            morte < 9
        ) {
            alert(
                "A contribuição mínima para cobertura por morte é R$ 9,00."
            );

            $("coberturaMorteContribuicao")
                .focus();

            return false;
        }

        if (
            invalidez > 0 &&
            invalidez < 6
        ) {
            alert(
                "A contribuição mínima para cobertura por invalidez é R$ 6,00."
            );

            $("coberturaInvalidezContribuicao")
                .focus();

            return false;
        }

        return true;
    }

    function podeAvancar(destino) {
        if (etapaAtual === 1) {
            return validarEtapa1();
        }

        if (etapaAtual === 2) {
            return validarEtapa2();
        }

        if (etapaAtual === 3) {
            return validarEtapa3();
        }

        return true;
    }

    $$("[data-avancar]").forEach(botao => {
        botao.addEventListener(
            "click",
            () => {
                const destino =
                    Number(
                        botao.dataset.avancar
                    );

                if (
                    podeAvancar(
                        destino
                    )
                ) {
                    mostrarEtapa(
                        destino
                    );
                }
            }
        );
    });

    $$("[data-voltar]").forEach(botao => {
        botao.addEventListener(
            "click",
            () => {
                mostrarEtapa(
                    Number(
                        botao.dataset.voltar
                    )
                );
            }
        );
    });

    $$(".previdencia-etapa").forEach(botao => {
        botao.addEventListener(
            "click",
            () => {
                const destino =
                    Number(
                        botao.dataset.etapa
                    );

                if (
                    destino <=
                    etapaAtual
                ) {
                    mostrarEtapa(
                        destino
                    );
                }
            }
        );
    });

    function atualizarTipoSimulacao() {
        const tipo =
            document.querySelector(
                'input[name="tipoSimulacao"]:checked'
            ).value;

        $$(".opcao-simulacao").forEach(label => {
            label.classList.toggle(
                "ativo",
                label.querySelector("input")
                    .checked
            );
        });

        $("blocoRendaDesejada")
            .classList.toggle(
                "hide",
                tipo !== "renda"
            );

        $("blocoContribuicaoMensal")
            .classList.toggle(
                "hide",
                tipo !== "contribuicao"
            );
    }

    $$(
        'input[name="tipoSimulacao"]'
    ).forEach(radio => {
        radio.addEventListener(
            "change",
            atualizarTipoSimulacao
        );
    });

    $("possuiBeneficiarios")
        .addEventListener(
            "change",
            () => {
                $("blocoBeneficiario")
                    .classList.toggle(
                        "hide",
                        $("possuiBeneficiarios")
                            .value === "nao"
                    );
            }
        );

    $("tipoContribuicao")
        .addEventListener(
            "change",
            () => {
                const percentualSelecionado =
                    $("tipoContribuicao")
                        .value ===
                    "percentual";

                $("campoContribuicaoValor")
                    .classList.toggle(
                        "hide",
                        percentualSelecionado
                    );

                $("campoContribuicaoPercentual")
                    .classList.toggle(
                        "hide",
                        !percentualSelecionado
                    );
            }
        );

    $("possuiContrapartida")
        .addEventListener(
            "change",
            () => {
                $("campoContrapartida")
                    .classList.toggle(
                        "hide",
                        $("possuiContrapartida")
                            .value ===
                        "nao"
                    );
            }
        );

    function taxaMensalEquivalente(
        taxaAnual
    ) {
        return (
            Math.pow(
                1 +
                taxaAnual / 100,
                1 / 12
            ) - 1
        );
    }

    function obterContribuicaoMensalInformada() {
        const tipo =
            $("tipoContribuicao").value;

        if (
            tipo === "percentual"
        ) {
            const salario =
                numeroMonetario(
                    $("salario").value
                );

            const percentual =
                numero(
                    $("contribuicaoPercentual")
                        .value
                );

            return limitarValorMonetario(
                salario *
                percentual /
                100
            );
        }

        return numeroMonetario(
            $("contribuicaoMensal")
                .value
        );
    }

    function obterContrapartida() {
        if (
            $("possuiContrapartida")
                .value !== "sim"
        ) {
            return 0;
        }

        return numeroMonetario(
            $("contrapartidaMensal")
                .value
        );
    }

    function obterParametrosBase() {
        const idadeAtual =
            numero(
                $("idadeAtual").value
            );

        const idadeAposentadoria =
            numero(
                $("idadeAposentadoria")
                    .value
            );

        const anos =
            Math.max(
                0,
                idadeAposentadoria -
                idadeAtual
            );

        return {
            idadeAtual,
            idadeAposentadoria,
            anos,
            meses: anos * 12,
            taxaAnual:
                numero(
                    $("taxaAnual").value
                ),
            saldoInicial:
                numeroMonetario(
                    $("saldoInicial").value
                ),
            aporteEsporadico:
                numeroMonetario(
                    $("aporteEsporadico")
                        .value
                ),
            periodicidadeAporte:
                numero(
                    $("periodicidadeAporte")
                        .value
                ),
            contrapartida:
                obterContrapartida()
        };
    }

    function projetarReserva({
        saldoInicial,
        contribuicaoMensal,
        contrapartidaMensal,
        aporteEsporadico,
        periodicidadeAporte,
        taxaAnual,
        meses,
        idadeAtual
    }) {
        const taxaMensal =
            taxaMensalEquivalente(
                taxaAnual
            );

        let saldo =
            saldoInicial;

        let totalRendimentos = 0;
        let totalContribuicoes = 0;
        let totalContrapartida = 0;
        let totalAportes = 0;

        const historicoMensal = [];
        const historicoAnual = [];

        for (
            let mes = 0;
            mes < meses;
            mes++
        ) {
            const saldoInicialMes =
                saldo;

            const rendimento =
                saldoInicialMes *
                taxaMensal;

            const aporte =
                aporteEsporadico > 0 &&
                    periodicidadeAporte > 0 &&
                    mes %
                    periodicidadeAporte ===
                    0
                    ? aporteEsporadico
                    : 0;

            saldo =
                saldoInicialMes +
                rendimento +
                contribuicaoMensal +
                contrapartidaMensal +
                aporte;

            totalRendimentos +=
                rendimento;

            totalContribuicoes +=
                contribuicaoMensal;

            totalContrapartida +=
                contrapartidaMensal;

            totalAportes +=
                aporte;

            historicoMensal.push({
                mes: mes + 1,
                saldoInicial:
                    saldoInicialMes,
                rendimento,
                contribuicao:
                    contribuicaoMensal,
                contrapartida:
                    contrapartidaMensal,
                aporte,
                saldo
            });

            const finalAno =
                (mes + 1) % 12 === 0 ||
                mes === meses - 1;

            if (finalAno) {
                const ano =
                    Math.ceil(
                        (mes + 1) / 12
                    );

                const mesesAteAgora =
                    mes + 1;

                historicoAnual.push({
                    ano,
                    idade:
                        idadeAtual + ano,
                    contribuicoes:
                        contribuicaoMensal *
                        mesesAteAgora +
                        contrapartidaMensal *
                        mesesAteAgora,
                    aportes:
                        historicoMensal
                            .slice(
                                0,
                                mesesAteAgora
                            )
                            .reduce(
                                (
                                    soma,
                                    item
                                ) =>
                                    soma +
                                    item.aporte,
                                0
                            ),
                    rendimentos:
                        historicoMensal
                            .slice(
                                0,
                                mesesAteAgora
                            )
                            .reduce(
                                (
                                    soma,
                                    item
                                ) =>
                                    soma +
                                    item.rendimento,
                                0
                            ),
                    saldo
                });
            }
        }

        return {
            saldoFinal:
                saldo,
            taxaMensal,
            totalRendimentos,
            totalContribuicoes,
            totalContrapartida,
            totalAportes,
            historicoMensal,
            historicoAnual
        };
    }

    function calcularReservaPrazoDeterminado(
        rendaMensal,
        prazoAnos,
        percentualParcelaUnica
    ) {
        const percentual =
            Math.min(
                20,
                Math.max(
                    0,
                    percentualParcelaUnica
                )
            ) / 100;

        const reservaParaRenda =
            rendaMensal *
            prazoAnos *
            13;

        let reservaTotal =
            reservaParaRenda;

        if (
            percentual > 0
        ) {
            reservaTotal =
                reservaParaRenda /
                (1 - percentual);
        }

        const parcelaUnica =
            reservaTotal *
            percentual;

        return {
            reservaNecessaria:
                reservaTotal,
            parcelaUnica,
            reservaParaRenda
        };
    }

    function calcularRendaPrazoDeterminado(
        saldo,
        prazoAnos,
        percentualParcelaUnica
    ) {
        const percentual =
            Math.min(
                20,
                Math.max(
                    0,
                    percentualParcelaUnica
                )
            ) / 100;

        const parcelaUnica =
            saldo *
            percentual;

        const saldoRenda =
            saldo -
            parcelaUnica;

        const mesesEquivalentes =
            prazoAnos *
            13;

        const renda =
            mesesEquivalentes > 0
                ? saldoRenda /
                mesesEquivalentes
                : 0;

        return {
            rendaMensal:
                renda,
            parcelaUnica,
            saldoRenda
        };
    }

    function calcularContribuicaoNecessaria({
        saldoInicial,
        saldoObjetivo,
        taxaAnual,
        meses,
        aporteEsporadico,
        periodicidadeAporte,
        contrapartida
    }) {
        if (
            meses <= 0
        ) {
            return 0;
        }

        const projecaoSemContribuicao =
            projetarReserva({
                saldoInicial,
                contribuicaoMensal: 0,
                contrapartidaMensal:
                    contrapartida,
                aporteEsporadico,
                periodicidadeAporte,
                taxaAnual,
                meses,
                idadeAtual: 0
            });

        if (
            projecaoSemContribuicao
                .saldoFinal >=
            saldoObjetivo
        ) {
            return 0;
        }

        const taxaMensal =
            taxaMensalEquivalente(
                taxaAnual
            );

        if (
            Math.abs(
                taxaMensal
            ) < 1e-12
        ) {
            const faltante =
                saldoObjetivo -
                projecaoSemContribuicao
                    .saldoFinal;

            return Math.max(
                0,
                faltante /
                meses
            );
        }

        let minimo = 0;

        let maximo =
            Math.max(
                100,
                saldoObjetivo
            );

        for (
            let tentativa = 0;
            tentativa < 80;
            tentativa++
        ) {
            const meio =
                (minimo + maximo) /
                2;

            const resultado =
                projetarReserva({
                    saldoInicial,
                    contribuicaoMensal:
                        meio,
                    contrapartidaMensal:
                        contrapartida,
                    aporteEsporadico,
                    periodicidadeAporte,
                    taxaAnual,
                    meses,
                    idadeAtual: 0
                });

            if (
                resultado.saldoFinal >=
                saldoObjetivo
            ) {
                maximo =
                    meio;
            } else {
                minimo =
                    meio;
            }
        }

        return Math.max(
            0,
            maximo
        );
    }

    function fatorAtuarialEstimado() {
        const idadeAposentadoria =
            numero(
                $("idadeAposentadoria")
                    .value
            );

        const sexo =
            $("sexo").value;

        const possuiBeneficiarios =
            $("possuiBeneficiarios")
                .value ===
            "sim";

        const idadeBeneficiario =
            numero(
                $("idadeBeneficiario")
                    .value
            );

        let fator =
            191.402 +
            (
                55 -
                idadeAposentadoria
            ) *
            2.437;

        if (
            sexo === "M"
        ) {
            fator *= 0.94;
        }

        if (
            possuiBeneficiarios
        ) {
            const diferenca =
                Math.max(
                    0,
                    idadeAposentadoria -
                    idadeBeneficiario
                );

            fator *=
                1 +
                Math.min(
                    0.18,
                    diferenca *
                    0.0025
                );
        }

        return Math.max(
            130,
            fator
        );
    }

    function estimarCoberturaMorte() {
        const contribuicao =
            numeroMonetario(
                $("coberturaMorteContribuicao")
                    .value
            );

        if (
            contribuicao <= 0
        ) {
            return 0;
        }

        const idade =
            numero(
                $("idadeAtual").value
            );

        const sexo =
            $("sexo").value;

        let fator =
            4444.444444444444;

        const ajusteIdade =
            Math.pow(
                0.965,
                idade - 22
            );

        fator *=
            ajusteIdade;

        if (
            sexo === "M"
        ) {
            fator *= 0.90;
        }

        return Math.max(
            0,
            contribuicao *
            fator
        );
    }

    function estimarCoberturaInvalidez() {
        const contribuicao =
            numeroMonetario(
                $("coberturaInvalidezContribuicao")
                    .value
            );

        if (
            contribuicao <= 0
        ) {
            return 0;
        }

        const idade =
            numero(
                $("idadeAtual").value
            );

        const sexo =
            $("sexo").value;

        let fator =
            14762.922329222393;

        const ajusteIdade =
            Math.pow(
                0.96,
                idade - 22
            );

        fator *=
            ajusteIdade;

        if (
            sexo === "M"
        ) {
            fator *= 0.92;
        }

        return Math.max(
            0,
            contribuicao *
            fator
        );
    }

    function atualizarCoberturas() {
        $("resultadoCoberturaMorte")
            .textContent =
            moeda(
                estimarCoberturaMorte()
            );

        $("resultadoCoberturaInvalidez")
            .textContent =
            moeda(
                estimarCoberturaInvalidez()
            );
    }

    $("coberturaMorteContribuicao")
        .addEventListener(
            "input",
            atualizarCoberturas
        );

    $("coberturaInvalidezContribuicao")
        .addEventListener(
            "input",
            atualizarCoberturas
        );

    function atualizarResumo() {
        const parametros =
            obterParametrosBase();

        const taxaMensal =
            taxaMensalEquivalente(
                parametros.taxaAnual
            );

        $("resumoPeriodo")
            .textContent =
            `${parametros.anos} ${parametros.anos === 1
                ? "ano"
                : "anos"
            }`;

        $("resumoTaxa")
            .textContent =
            `${parametros.taxaAnual}%`;

        $("resumoTaxaMensal")
            .textContent =
            percentual(
                taxaMensal * 100,
                4
            );
    }

    function montarTabela(
        resultado
    ) {
        const tbody =
            $("tabelaProjecao");

        tbody.innerHTML =
            "";

        if (
            !resultado ||
            !resultado
                .historicoAnual
                .length
        ) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="sem-dados">
                        Não há dados para apresentar.
                    </td>
                </tr>
            `;

            return;
        }

        resultado
            .historicoAnual
            .forEach(item => {
                const tr =
                    document
                        .createElement(
                            "tr"
                        );

                tr.innerHTML = `
                    <td>${item.ano}</td>
                    <td>${item.idade} anos</td>
                    <td>${moeda(item.contribuicoes)}</td>
                    <td>${moeda(item.aportes)}</td>
                    <td>${moeda(item.rendimentos)}</td>
                    <td><strong>${moeda(item.saldo)}</strong></td>
                `;

                tbody.appendChild(
                    tr
                );
            });
    }

    function calcularTudo() {
        const parametros =
            obterParametrosBase();

        const tipo =
            document.querySelector(
                'input[name="tipoSimulacao"]:checked'
            ).value;

        const prazoRenda =
            Math.min(
                50,
                Math.max(
                    5,
                    numero(
                        $("prazoRenda").value
                    )
                )
            );

        const percentualParcela =
            Math.min(
                20,
                Math.max(
                    0,
                    numero(
                        $("percentualParcelaUnica")
                            .value
                    )
                )
            );

        $("prazoRenda").value =
            prazoRenda;

        $("percentualParcelaUnica")
            .value =
            percentualParcela;

        let contribuicaoMensal = 0;
        let rendaMensal = 0;
        let reservaNecessaria = 0;
        let parcelaUnica = 0;
        let contribuicaoNecessaria = 0;

        if (
            tipo ===
            "contribuicao"
        ) {
            contribuicaoMensal =
                obterContribuicaoMensalInformada();
        }

        if (
            tipo === "renda"
        ) {
            rendaMensal =
                numeroMonetario(
                    $("rendaDesejada").value
                );

            const objetivo =
                calcularReservaPrazoDeterminado(
                    rendaMensal,
                    prazoRenda,
                    percentualParcela
                );

            reservaNecessaria =
                objetivo
                    .reservaNecessaria;

            parcelaUnica =
                objetivo
                    .parcelaUnica;

            contribuicaoNecessaria =
                calcularContribuicaoNecessaria({
                    saldoInicial:
                        parametros
                            .saldoInicial,
                    saldoObjetivo:
                        reservaNecessaria,
                    taxaAnual:
                        parametros
                            .taxaAnual,
                    meses:
                        parametros
                            .meses,
                    aporteEsporadico:
                        parametros
                            .aporteEsporadico,
                    periodicidadeAporte:
                        parametros
                            .periodicidadeAporte,
                    contrapartida:
                        parametros
                            .contrapartida
                });

            contribuicaoMensal =
                contribuicaoNecessaria;
        }

        const resultado =
            projetarReserva({
                saldoInicial:
                    parametros
                        .saldoInicial,
                contribuicaoMensal,
                contrapartidaMensal:
                    parametros
                        .contrapartida,
                aporteEsporadico:
                    parametros
                        .aporteEsporadico,
                periodicidadeAporte:
                    parametros
                        .periodicidadeAporte,
                taxaAnual:
                    parametros
                        .taxaAnual,
                meses:
                    parametros
                        .meses,
                idadeAtual:
                    parametros
                        .idadeAtual
            });

        if (
            tipo ===
            "contribuicao"
        ) {
            const calculoRenda =
                calcularRendaPrazoDeterminado(
                    resultado
                        .saldoFinal,
                    prazoRenda,
                    percentualParcela
                );

            rendaMensal =
                calculoRenda
                    .rendaMensal;

            parcelaUnica =
                calculoRenda
                    .parcelaUnica;

            reservaNecessaria =
                resultado
                    .saldoFinal;

            contribuicaoNecessaria =
                contribuicaoMensal;

            $("labelResultadoRenda")
                .textContent =
                "Renda mensal estimada";
        } else {
            $("labelResultadoRenda")
                .textContent =
                "Renda mensal pretendida";
        }

        $("resultadoReservaProjetada")
            .textContent =
            moeda(
                resultado
                    .saldoFinal
            );

        $("resultadoRendaMensal")
            .textContent =
            moeda(
                rendaMensal
            );

        $("resultadoReservaNecessaria")
            .textContent =
            moeda(
                reservaNecessaria
            );

        $("resultadoContribuicaoNecessaria")
            .textContent =
            moeda(
                contribuicaoNecessaria
            );

        $("resultadoParcelaUnica")
            .textContent =
            moeda(
                parcelaUnica
            );

        $("resultadoRendimentos")
            .textContent =
            moeda(
                resultado
                    .totalRendimentos
            );

        $("resultadoAportes")
            .textContent =
            moeda(
                resultado
                    .totalAportes
            );

        const fator =
            fatorAtuarialEstimado();

        let rendaIndeterminada = 0;
        let reservaIndeterminada = 0;

        if (
            tipo === "renda"
        ) {
            rendaIndeterminada =
                rendaMensal;

            reservaIndeterminada =
                rendaMensal *
                fator;
        } else {
            reservaIndeterminada =
                resultado
                    .saldoFinal;

            rendaIndeterminada =
                fator > 0
                    ? resultado
                        .saldoFinal /
                    fator
                    : 0;
        }

        $("resultadoReservaIndeterminada")
            .textContent =
            moeda(
                reservaIndeterminada
            );

        $("resultadoRendaIndeterminada")
            .textContent =
            moeda(
                rendaIndeterminada
            );

        $("resultadoFatorAtuarial")
            .textContent =
            fator.toLocaleString(
                "pt-BR",
                {
                    minimumFractionDigits: 3,
                    maximumFractionDigits: 3
                }
            );

        const mensagem =
            $("mensagemObjetivo");

        mensagem.classList.remove(
            "hide",
            "sucesso",
            "atencao"
        );

        if (
            tipo === "renda"
        ) {
            if (
                resultado.saldoFinal >=
                reservaNecessaria
            ) {
                mensagem.classList.add(
                    "sucesso"
                );

                mensagem.innerHTML = `
                    <strong>Objetivo projetado como atingido.</strong>
                    <span>
                        A reserva estimada é suficiente para suportar a renda mensal pretendida nas condições informadas.
                    </span>
                `;
            } else {
                mensagem.classList.add(
                    "atencao"
                );

                mensagem.innerHTML = `
                    <strong>Atenção à contribuição mensal.</strong>
                    <span>
                        Para buscar a renda pretendida, a contribuição mensal estimada é de ${moeda(contribuicaoNecessaria)}.
                    </span>
                `;
            }
        } else {
            mensagem.classList.add(
                "sucesso"
            );

            mensagem.innerHTML = `
                <strong>Projeção concluída.</strong>
                <span>
                    Mantendo os parâmetros informados, a renda mensal estimada é de ${moeda(rendaMensal)}.
                </span>
            `;
        }

        montarTabela(
            resultado
        );

        atualizarResumo();
    }

    $("btnCalcularPrevidencia")
        .addEventListener(
            "click",
            calcularTudo
        );

    [
        "prazoRenda",
        "percentualParcelaUnica",
        "taxaAnual",
        "idadeAtual",
        "idadeAposentadoria",
        "periodicidadeAporte"
    ].forEach(id => {
        $(id).addEventListener(
            "change",
            () => {
                if (
                    etapaAtual === 4
                ) {
                    calcularTudo();
                }
            }
        );
    });

    configurarCamposMoeda();
    atualizarTipoSimulacao();
    atualizarCoberturas();
    mostrarEtapa(1);
});