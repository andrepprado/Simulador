/**
 * porte-produtor-rural.js
 * Simulador orientativo de classificação do porte do produtor rural.
 * Regras convertidas da planilha Simulador_Porte_Produtor_Rural.
 * @author andre.prado
 */

document.addEventListener("DOMContentLoaded", () => {
    const cafPronaf = document.getElementById("cafPronaf");
    const condicaoTerra = document.getElementById("condicaoTerra");
    const anoBasePorte = document.getElementById("anoBasePorte");
    const condominioParceria = document.getElementById("condominioParceria");
    const tabelaRendasPorte = document.getElementById("tabelaRendasPorte");
    const btnLimparPorte = document.getElementById("btnLimparPorte");
    const containerPorte = document.querySelector(".porte-produtor-container");

    const resultadoPorteFinal = document.getElementById("resultadoPorteFinal");
    const resultadoRba = document.getElementById("resultadoRba");
    const resultadoReceitaBruta = document.getElementById("resultadoReceitaBruta");
    const resultadoPercentualAgro = document.getElementById("resultadoPercentualAgro");
    const resultadoPercentualNaoRural = document.getElementById("resultadoPercentualNaoRural");
    const resultadoPorteBase = document.getElementById("resultadoPorteBase");
    const resultadoPronamp = document.getElementById("resultadoPronamp");
    const resultadoRegra20 = document.getElementById("resultadoRegra20");
    const resultadoCaf = document.getElementById("resultadoCaf");
    const resultadoJustificativa = document.getElementById("resultadoJustificativa");
    const resultadoBaseNormativa = document.getElementById("resultadoBaseNormativa");
    const resultadoRendaAgroPronamp = document.getElementById("resultadoRendaAgroPronamp");
    const resultadoDemaisRendas = document.getElementById("resultadoDemaisRendas");
    const resultadoRendasNaoRurais = document.getElementById("resultadoRendasNaoRurais");

    const TIPOS_RENDA = [
        {
            id: "producao_agricola",
            nome: "Produção agrícola",
            classificacao: "ATIVIDADE AGROPECUÁRIA",
            integraRba: true,
            integraAgroPronamp: true,
            integraNaoAgroPronamp: false,
            integraRegra20: false
        },
        {
            id: "producao_pecuaria",
            nome: "Produção pecuária",
            classificacao: "ATIVIDADE AGROPECUÁRIA",
            integraRba: true,
            integraAgroPronamp: true,
            integraNaoAgroPronamp: false,
            integraRegra20: false
        },
        {
            id: "entidade_integradora",
            nome: "Receita de entidade integradora (agropecuária)",
            classificacao: "ATIVIDADE AGROPECUÁRIA",
            integraRba: true,
            integraAgroPronamp: true,
            integraNaoAgroPronamp: false,
            integraRegra20: false
        },
        {
            id: "extrativismo",
            nome: "Extrativismo vegetal ou animal",
            classificacao: "OUTRA ATIVIDADE RURAL",
            integraRba: true,
            integraAgroPronamp: false,
            integraNaoAgroPronamp: true,
            integraRegra20: false
        },
        {
            id: "servicos_afins",
            nome: "Serviços afins prestados pelo produtor rural",
            classificacao: "OUTRA ATIVIDADE RURAL",
            integraRba: true,
            integraAgroPronamp: false,
            integraNaoAgroPronamp: true,
            integraRegra20: false
        },
        {
            id: "outras_receitas_rurais",
            nome: "Outras receitas de atividade rural",
            classificacao: "OUTRA ATIVIDADE RURAL",
            integraRba: true,
            integraAgroPronamp: true,
            integraNaoAgroPronamp: false,
            integraRegra20: false
        },
        {
            id: "salario_honorarios_prolabore",
            nome: "Salário / honorários / pró-labore",
            classificacao: "ATIVIDADE NÃO RURAL",
            integraRba: false,
            integraAgroPronamp: false,
            integraNaoAgroPronamp: true,
            integraRegra20: true
        },
        {
            id: "rendimentos_empresariais",
            nome: "Rendimentos empresarial não rural",
            classificacao: "ATIVIDADE NÃO RURAL",
            integraRba: false,
            integraAgroPronamp: false,
            integraNaoAgroPronamp: true,
            integraRegra20: true
        },
        {
            id: "declaracao_renda",
            nome: "Declaração de Renda",
            classificacao: "ATIVIDADE NÃO RURAL",
            integraRba: false,
            integraAgroPronamp: false,
            integraNaoAgroPronamp: true,
            integraRegra20: true
        },
        {
            id: "aposentadoria",
            nome: "Aposentadoria / benefício / pensão",
            classificacao: "ATIVIDADE NÃO RURAL",
            integraRba: false,
            integraAgroPronamp: false,
            integraNaoAgroPronamp: true,
            integraRegra20: true
        },
        {
            id: "aluguel",
            nome: "Aluguel",
            classificacao: "ATIVIDADE NÃO RURAL",
            integraRba: false,
            integraAgroPronamp: false,
            integraNaoAgroPronamp: true,
            integraRegra20: true
        },
        {
            id: "aplicacoes_financeiras",
            nome: "Aplicações financeiras",
            classificacao: "ATIVIDADE NÃO RURAL",
            integraRba: false,
            integraAgroPronamp: false,
            integraNaoAgroPronamp: true,
            integraRegra20: true
        },
        {
            id: "outras_rendas_nao_agro",
            nome: "Outras rendas não agropecuárias",
            classificacao: "ATIVIDADE NÃO RURAL",
            integraRba: false,
            integraAgroPronamp: false,
            integraNaoAgroPronamp: true,
            integraRegra20: true
        }
    ];

    const CONDICOES_TERRA_PRONAMP = [
        "PROPRIETÁRIO RURAL",
        "POSSEIRO",
        "ARRENDATÁRIO",
        "PARCEIRO"
    ];

    let calculoAgendado = false;

    function numeroSeguro(valor) {
        const numero = Number(valor);

        return Number.isFinite(numero)
            ? numero
            : 0;
    }

    function arredondar(valor, casas = 2) {
        const fator = 10 ** casas;

        return Math.round(
            (numeroSeguro(valor) + Number.EPSILON) * fator
        ) / fator;
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
        if (!input) {
            return;
        }

        if (!String(input.value || "").trim()) {
            input.value = "";
            return;
        }

        const valor = moedaParaNumero(input.value);

        input.value = formatarMoeda(valor)
            .replace("R$", "")
            .trim();
    }

    /* =========================================================
       GATILHO CENTRAL DE RECÁLCULO
       ========================================================= */

    function agendarCalculoPorte() {
        if (calculoAgendado) {
            return;
        }

        calculoAgendado = true;

        requestAnimationFrame(() => {
            calculoAgendado = false;
            calcularPorte();
        });
    }

    function elementoGeraCalculo(elemento) {
        if (!elemento) {
            return false;
        }

        if (
            elemento.classList &&
            elemento.classList.contains("porte-produtor-renda")
        ) {
            return true;
        }

        return [
            "cafPronaf",
            "condicaoTerra",
            "anoBasePorte",
            "condominioParceria"
        ].includes(elemento.id);
    }

    function configurarGatilhosAutomaticos() {
        if (!containerPorte) {
            return;
        }

        /*
         * INPUT
         *
         * Disparado durante:
         * - digitação;
         * - colagem;
         * - exclusão de conteúdo;
         * - alteração do ano-base;
         * - qualquer modificação nos campos de renda.
         */
        containerPorte.addEventListener("input", evento => {
            const elemento = evento.target;

            if (!elementoGeraCalculo(elemento)) {
                return;
            }

            if (
                elemento.classList &&
                elemento.classList.contains("porte-produtor-renda")
            ) {
                formatarInputMoeda(elemento);
            }

            agendarCalculoPorte();
        });

        /*
         * CHANGE
         *
         * Garante o recálculo principalmente em:
         * - CAF / Pronaf;
         * - condição da terra;
         * - condomínio / parceria;
         * - ano-base;
         * - campos alterados por seleção.
         */
        containerPorte.addEventListener("change", evento => {
            const elemento = evento.target;

            if (!elementoGeraCalculo(elemento)) {
                return;
            }

            if (
                elemento.classList &&
                elemento.classList.contains("porte-produtor-renda")
            ) {
                formatarInputMoeda(elemento);
            }

            agendarCalculoPorte();
        });

        /*
         * BLUR
         *
         * Ao sair de um campo monetário:
         * - garante a máscara monetária;
         * - garante o recálculo final.
         */
        containerPorte.addEventListener(
            "blur",
            evento => {
                const elemento = evento.target;

                if (
                    !elemento ||
                    !elemento.classList ||
                    !elemento.classList.contains("porte-produtor-renda")
                ) {
                    return;
                }

                formatarInputMoeda(elemento);
                agendarCalculoPorte();
            },
            true
        );
    }

    /* =========================================================
       TABELA DE RENDAS
       ========================================================= */

    function criarTabelaRendas() {
        tabelaRendasPorte.innerHTML = "";

        TIPOS_RENDA.forEach(tipo => {
            const tr = document.createElement("tr");

            const tdNome = document.createElement("td");
            tdNome.textContent = tipo.nome;

            const tdClassificacao = document.createElement("td");

            const tag = document.createElement("span");

            tag.className = tipo.integraRegra20
                ? "porte-produtor-tag porte-produtor-tag-nao-rural"
                : "porte-produtor-tag porte-produtor-tag-rural";

            tag.textContent = tipo.classificacao;

            tdClassificacao.appendChild(tag);

            const tdValor = document.createElement("td");

            const wrapper = document.createElement("div");
            wrapper.className = "input-prefixo porte-produtor-input-renda";

            const prefixo = document.createElement("span");
            prefixo.textContent = "R$";

            const input = document.createElement("input");

            input.type = "text";
            input.inputMode = "numeric";
            input.autocomplete = "off";
            input.placeholder = "0,00";
            input.dataset.tipoRenda = tipo.id;
            input.className = "porte-produtor-renda";

            wrapper.appendChild(prefixo);
            wrapper.appendChild(input);

            tdValor.appendChild(wrapper);

            tr.appendChild(tdNome);
            tr.appendChild(tdClassificacao);
            tr.appendChild(tdValor);

            tabelaRendasPorte.appendChild(tr);
        });
    }

    /* =========================================================
       OBTENÇÃO DAS RENDAS
       ========================================================= */

    function obterValorRenda(tipoId) {
        const input = tabelaRendasPorte.querySelector(
            `[data-tipo-renda="${tipoId}"]`
        );

        if (!input) {
            return 0;
        }

        return moedaParaNumero(input.value);
    }

    function obterTotais() {
        let rba = 0;
        let agroPronamp = 0;
        let demaisRendasNaoAgro = 0;
        let rendimentosNaoRurais = 0;

        TIPOS_RENDA.forEach(tipo => {
            const valor = obterValorRenda(tipo.id);

            if (tipo.integraRba) {
                rba += valor;
            }

            if (tipo.integraAgroPronamp) {
                agroPronamp += valor;
            }

            if (tipo.integraNaoAgroPronamp) {
                demaisRendasNaoAgro += valor;
            }

            if (tipo.integraRegra20) {
                rendimentosNaoRurais += valor;
            }
        });

        rba = arredondar(rba, 2);
        agroPronamp = arredondar(agroPronamp, 2);
        demaisRendasNaoAgro = arredondar(demaisRendasNaoAgro, 2);
        rendimentosNaoRurais = arredondar(rendimentosNaoRurais, 2);

        const receitaBrutaTotal = arredondar(
            agroPronamp + demaisRendasNaoAgro,
            2
        );

        const percentualAgro = receitaBrutaTotal > 0
            ? arredondar(
                agroPronamp / receitaBrutaTotal * 100,
                4
            )
            : 0;

        const percentualNaoRural = receitaBrutaTotal > 0
            ? arredondar(
                rendimentosNaoRurais / receitaBrutaTotal * 100,
                4
            )
            : 0;

        return {
            rba,
            agroPronamp,
            demaisRendasNaoAgro,
            receitaBrutaTotal,
            rendimentosNaoRurais,
            percentualAgro,
            percentualNaoRural
        };
    }

    /* =========================================================
       PORTE BASE
       ========================================================= */

    function obterPorteBase(rba, receitaBrutaTotal) {
        if (receitaBrutaTotal <= 0) {
            return "PREENCHER RENDAS";
        }

        if (rba <= 500000) {
            return "PEQUENO";
        }

        if (rba <= 3500000) {
            return "MÉDIO";
        }

        return "GRANDE";
    }

    /* =========================================================
       PRONAMP
       ========================================================= */

    function obterPronamp(totais) {
        if (totais.receitaBrutaTotal <= 0) {
            return "NÃO APLICÁVEL";
        }

        if (condicaoTerra.value === "SELECIONAR") {
            return "INFORMAR CONDIÇÃO DA TERRA";
        }

        const condicaoAdmitida =
            CONDICOES_TERRA_PRONAMP.includes(
                condicaoTerra.value
            );

        const receitaDentroLimite =
            totais.receitaBrutaTotal <= 3500000;

        const percentualAgroSuficiente =
            totais.percentualAgro >= 80;

        return (
            condicaoAdmitida &&
            receitaDentroLimite &&
            percentualAgroSuficiente
        )
            ? "SIM"
            : "NÃO";
    }

    /* =========================================================
       REGRA DOS 20%
       ========================================================= */

    function obterRegra20(totais) {
        if (totais.receitaBrutaTotal <= 0) {
            return "NÃO APLICÁVEL";
        }

        return totais.percentualNaoRural > 20
            ? "SIM"
            : "NÃO";
    }

    /* =========================================================
       PORTE FINAL
       ========================================================= */

    function obterPorteFinal(
        totais,
        porteBase,
        pronamp,
        regra20
    ) {
        if (cafPronaf.value === "SIM") {
            return "PEQUENO PRODUTOR";
        }

        if (totais.receitaBrutaTotal <= 0) {
            return "PREENCHER RENDAS";
        }

        if (pronamp === "INFORMAR CONDIÇÃO DA TERRA") {
            return "INFORMAR CONDIÇÃO DA TERRA";
        }

        if (pronamp === "SIM") {
            return "MÉDIO PRODUTOR";
        }

        if (regra20 === "SIM") {
            return "GRANDE PRODUTOR";
        }

        if (porteBase === "PEQUENO") {
            return "PEQUENO PRODUTOR";
        }

        if (porteBase === "MÉDIO") {
            return "MÉDIO PRODUTOR";
        }

        return "GRANDE PRODUTOR";
    }

    /* =========================================================
       BASE NORMATIVA
       ========================================================= */

    function obterBaseNormativa(
        porteFinal,
        porteBase,
        pronamp,
        regra20
    ) {
        if (porteFinal === "PREENCHER RENDAS") {
            return "-";
        }

        if (porteFinal === "INFORMAR CONDIÇÃO DA TERRA") {
            return "Preenchimento pendente";
        }

        if (cafPronaf.value === "SIM") {
            return "MCR 1-2-5(e) e MCR 10-2";
        }

        if (pronamp === "SIM") {
            return "MCR 1-2-5(f) e MCR 8-1";
        }

        if (regra20 === "SIM") {
            return "MCR 1-2-5(g)";
        }

        if (porteBase === "PEQUENO") {
            return "MCR 1-2-3(a)";
        }

        if (porteBase === "MÉDIO") {
            return "MCR 1-2-3(b)";
        }

        return "MCR 1-2-3(c)";
    }

    /* =========================================================
       JUSTIFICATIVA
       ========================================================= */

    function obterJustificativa(
        totais,
        porteFinal,
        porteBase,
        pronamp,
        regra20
    ) {
        if (porteFinal === "PREENCHER RENDAS") {
            return "Informe pelo menos uma renda anual para realizar a classificação.";
        }

        if (porteFinal === "INFORMAR CONDIÇÃO DA TERRA") {
            return "Selecione a condição de exploração da terra para concluir a análise das condições do Pronamp.";
        }

        if (cafPronaf.value === "SIM") {
            return "O produtor foi classificado como PEQUENO PRODUTOR por possuir CAF válido com enquadramento no Pronaf, conforme a regra especial prevista no MCR 1-2-5(e).";
        }

        if (pronamp === "SIM") {
            return (
                `A RBA apurada foi de ${formatarMoeda(totais.rba)}, valor que, considerado isoladamente, ` +
                `corresponderia ao porte ${porteBase} pela faixa da RBA. Entretanto, não foi informado CAF válido ` +
                `com enquadramento no Pronaf. O produtor atende cumulativamente às condições do Pronamp: condição ` +
                `de exploração da terra admitida, Receita Bruta Total de ${formatarMoeda(totais.receitaBrutaTotal)}, ` +
                `dentro do limite de R$ 3.500.000,00, e ${formatarPercentual(totais.percentualAgro)} da renda ` +
                `originária da atividade agropecuária, percentual igual ou superior a 80%. Assim, conforme a regra ` +
                `aplicada pelo simulador, o porte final é MÉDIO PRODUTOR.`
            );
        }

        if (regra20 === "SIM") {
            return (
                `O produtor foi classificado como GRANDE PRODUTOR porque os rendimentos provenientes de atividades ` +
                `não rurais representam ${formatarPercentual(totais.percentualNaoRural)} da Receita Bruta Total, ` +
                `percentual superior a 20%.`
            );
        }

        if (porteBase === "PEQUENO") {
            return (
                `O produtor foi classificado como PEQUENO PRODUTOR porque a RBA apurada foi de ` +
                `${formatarMoeda(totais.rba)}, valor dentro do limite de R$ 500.000,00, e não foi identificada ` +
                `regra especial que alterasse essa classificação.`
            );
        }

        if (porteBase === "MÉDIO") {
            return (
                `O produtor foi classificado como MÉDIO PRODUTOR porque a RBA apurada foi de ` +
                `${formatarMoeda(totais.rba)}, valor acima de R$ 500.000,00 e até R$ 3.500.000,00, e não foi ` +
                `identificada regra especial que alterasse essa classificação.`
            );
        }

        return (
            `O produtor foi classificado como GRANDE PRODUTOR porque a RBA apurada foi de ` +
            `${formatarMoeda(totais.rba)}, valor superior a R$ 3.500.000,00.`
        );
    }

    /* =========================================================
       CLASSE VISUAL DO PORTE
       ========================================================= */

    function atualizarClassePorte(porteFinal) {
        resultadoPorteFinal.classList.remove(
            "porte-pequeno",
            "porte-medio",
            "porte-grande",
            "porte-pendente"
        );

        if (porteFinal === "PEQUENO PRODUTOR") {
            resultadoPorteFinal.classList.add(
                "porte-pequeno"
            );
            return;
        }

        if (porteFinal === "MÉDIO PRODUTOR") {
            resultadoPorteFinal.classList.add(
                "porte-medio"
            );
            return;
        }

        if (porteFinal === "GRANDE PRODUTOR") {
            resultadoPorteFinal.classList.add(
                "porte-grande"
            );
            return;
        }

        resultadoPorteFinal.classList.add(
            "porte-pendente"
        );
    }

    /* =========================================================
       CÁLCULO PRINCIPAL
       ========================================================= */

    function calcularPorte() {
        const totais = obterTotais();

        const porteBase = obterPorteBase(
            totais.rba,
            totais.receitaBrutaTotal
        );

        const pronamp =
            obterPronamp(
                totais
            );

        const regra20 =
            obterRegra20(
                totais
            );

        const porteFinal =
            obterPorteFinal(
                totais,
                porteBase,
                pronamp,
                regra20
            );

        const baseNormativa =
            obterBaseNormativa(
                porteFinal,
                porteBase,
                pronamp,
                regra20
            );

        const justificativa =
            obterJustificativa(
                totais,
                porteFinal,
                porteBase,
                pronamp,
                regra20
            );

        resultadoPorteFinal.textContent =
            porteFinal;

        resultadoRba.textContent =
            formatarMoeda(
                totais.rba
            );

        resultadoReceitaBruta.textContent =
            formatarMoeda(
                totais.receitaBrutaTotal
            );

        resultadoPercentualAgro.textContent =
            formatarPercentual(
                totais.percentualAgro
            );

        resultadoPercentualNaoRural.textContent =
            formatarPercentual(
                totais.percentualNaoRural
            );

        resultadoPorteBase.textContent =
            porteBase;

        resultadoPronamp.textContent =
            pronamp;

        resultadoRegra20.textContent =
            regra20;

        resultadoCaf.textContent =
            cafPronaf.value === "SIM"
                ? "ENQUADRADO"
                : "NÃO INFORMADO / NÃO ENQUADRADO";

        resultadoJustificativa.textContent =
            justificativa;

        resultadoBaseNormativa.textContent =
            baseNormativa;

        resultadoRendaAgroPronamp.textContent =
            formatarMoeda(
                totais.agroPronamp
            );

        resultadoDemaisRendas.textContent =
            formatarMoeda(
                totais.demaisRendasNaoAgro
            );

        resultadoRendasNaoRurais.textContent =
            formatarMoeda(
                totais.rendimentosNaoRurais
            );

        atualizarClassePorte(
            porteFinal
        );
    }

    /* =========================================================
       LIMPAR
       ========================================================= */

    function limparPorte() {
        cafPronaf.value =
            "NAO";

        condicaoTerra.value =
            "SELECIONAR";

        condominioParceria.value =
            "NAO";

        anoBasePorte.value =
            new Date().getFullYear();

        tabelaRendasPorte
            .querySelectorAll(
                ".porte-produtor-renda"
            )
            .forEach(input => {
                input.value = "";
            });

        calcularPorte();
    }

    /* =========================================================
       INICIALIZAÇÃO
       ========================================================= */

    btnLimparPorte.addEventListener(
        "click",
        limparPorte
    );

    anoBasePorte.value =
        new Date().getFullYear();

    criarTabelaRendas();

    /*
     * Um único controlador monitora todos os campos
     * que podem alterar o resultado da simulação.
     */
    configurarGatilhosAutomaticos();

    calcularPorte();
});