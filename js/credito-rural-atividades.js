(function () {
    "use strict";

    const ATIVIDADES_CREDITO_RURAL = Object.freeze({
        agricola: {
            nome: "Agrícola",
            atividades: [
                "Arroz",
                "Milho",
                "Sorgo",
                "Trigo",
                "Aveia",
                "Cevada",
                "Centeio",
                "Triticale",
                "Canola",
                "Soja",
                "Amendoim",
                "Mamona",
                "Algodão",
                "Batata-doce",
                "Batata-inglesa",
                "Beterraba",
                "Cará",
                "Cenoura",
                "Gengibre",
                "Inhame",
                "Mandioca",
                "Mandioquinha salsa (batata-baroa)",
                "Nabo",
                "Rabanete",
                "Acelga",
                "Agrião",
                "Alface",
                "Almeirão",
                "Chicória",
                "Couve",
                "Escarola",
                "Espinafre",
                "Rúcula",
                "Serralha",
                "Taioba",
                "Abóbora-moranga",
                "Abobrinha",
                "Berinjela",
                "Bucha Vegetal",
                "Chuchu",
                "Jiló",
                "Maxixe",
                "Pepino",
                "Pimenta",
                "Pimentão",
                "Quiabo",
                "Tomate-cereja",
                "Tomate mesa estaqueado",
                "Tomate mesa rasteiro",
                "Vagem",
                "Ervilha (vagem verde)",
                "Feijão-caupi (macaçar-vagem verde)",
                "Alho",
                "Alho-poró",
                "Alcachofra",
                "Aspargo",
                "Brócolis",
                "Cebola",
                "Cebolinha Verde",
                "Couve-Flor",
                "Abacaxi",
                "Açaí cultivado",
                "Banana",
                "Cacau cultivado",
                "Laranja",
                "Tangerina",
                "Outras frutas",
                "Cafeicultura",
                "Cana-de-açúcar",
                "Floricultura",
                "Olivicultura",
                "Palmáceas",
                "Plantas medicinais",
                "Plantas aromáticas",
                "Plantas condimentares"
            ]
        },

        pecuaria: {
            nome: "Pecuária",
            atividades: [
                "Bovinocultura Leite",
                "Bovinocultura Corte - Cria",
                "Bovinocultura Corte - Recria",
                "Bovinocultura Corte - Recria/Engorda",
                "Bovinocultura Corte - Engorda",
                "Bovinocultura Corte - Cria/Recria/Engorda",
                "Bovinocultura Corte - Confinamento",
                "Bubalinocultura Leite",
                "Bubalinocultura Corte",
                "Suinocultura Integrada",
                "Suinocultura Não Integrada",
                "Avicultura Corte",
                "Avicultura Postura",
                "Ovinocultura",
                "Caprinocultura",
                "Apicultura",
                "Meliponicultura",
                "Cunicultura",
                "Chinchilicultura",
                "Ranicultura",
                "Sericicultura",
                "Aquicultura - Piscicultura",
                "Aquicultura - Carcinicultura",
                "Aquicultura - Outras espécies",
                "Aquicultura - Pesca Comercial",
                "Aquicultura - Pesca Artesanal",
                "Aquicultura - Pesca Industrial"
            ]
        },

        extrativismo: {
            nome: "Extrativismo",
            atividades: [
                "Extrativismo vegetal sustentável",
                "Manejo florestal",
                "Produtos da socio biodiversidade",
                "Pirarucu de manejo"
            ]
        },

        florestal_agroflorestal: {
            nome: "Florestal / Agroflorestal",
            atividades: [
                "Florestas comerciais",
                "Manejo florestal sustentável",
                "Sistemas agroflorestais",
                "ILF",
                "IPF",
                "ILPF"
            ]
        }
    });

    function normalizarTexto(valor) {
        return String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "");
    }

    function normalizarIdentificadorAtividade(valor) {
        return normalizarTexto(valor);
    }

    function obterGrupo(chaveGrupo) {
        return ATIVIDADES_CREDITO_RURAL[chaveGrupo] || null;
    }

    function obterNomeGrupo(chaveGrupo) {
        return obterGrupo(chaveGrupo)?.nome || chaveGrupo || "";
    }

    function obterAtividades(chaveGrupo) {
        return [...(obterGrupo(chaveGrupo)?.atividades || [])];
    }

    function localizarAtividadePorNome(nome, grupoPreferencial = null) {
        const procurado = normalizarTexto(nome);

        const grupos = grupoPreferencial
            ? [grupoPreferencial]
            : Object.keys(ATIVIDADES_CREDITO_RURAL);

        for (const grupo of grupos) {
            const atividades = obterAtividades(grupo);

            for (const atividade of atividades) {
                if (normalizarTexto(atividade) === procurado) {
                    return {
                        grupo,
                        atividade: normalizarTexto(atividade),
                        nomeAtividade: atividade
                    };
                }
            }
        }

        return null;
    }

    function obterNomeAtividade(valorAtividade, chaveGrupo = null) {
        const procurado = normalizarTexto(valorAtividade);

        const grupos = chaveGrupo
            ? [chaveGrupo]
            : Object.keys(ATIVIDADES_CREDITO_RURAL);

        for (const grupo of grupos) {
            const atividade = obterAtividades(grupo).find(
                item => normalizarTexto(item) === procurado
            );

            if (atividade) {
                return atividade;
            }
        }

        return valorAtividade || "";
    }

    function obterGrupoPorAtividade(valorAtividade) {
        const procurado = normalizarTexto(valorAtividade);

        for (const grupo of Object.keys(ATIVIDADES_CREDITO_RURAL)) {
            const encontrou = obterAtividades(grupo).some(
                item => normalizarTexto(item) === procurado
            );

            if (encontrou) {
                return grupo;
            }
        }

        return null;
    }

    function preencherGruposEmSelect(
        select,
        selecionado = "",
        incluirVazio = false
    ) {
        if (!select) {
            return;
        }

        select.innerHTML = "";

        if (incluirVazio) {
            select.appendChild(new Option("Selecione", ""));
        }

        Object.entries(ATIVIDADES_CREDITO_RURAL).forEach(
            ([chave, grupo]) => {
                const option = new Option(grupo.nome, chave);

                if (chave === selecionado) {
                    option.selected = true;
                }

                select.appendChild(option);
            }
        );
    }

    function preencherAtividadesEmSelect(
        select,
        chaveGrupo,
        selecionada = "",
        incluirVazio = false
    ) {
        if (!select) {
            return;
        }

        select.innerHTML = "";

        if (incluirVazio) {
            select.appendChild(new Option("Selecione", ""));
        }

        obterAtividades(chaveGrupo).forEach(nome => {
            const valor = normalizarTexto(nome);
            const option = new Option(nome, valor);

            if (
                valor === selecionada ||
                nome === selecionada
            ) {
                option.selected = true;
            }

            select.appendChild(option);
        });
    }

    function preencherTodasAtividadesAgrupadas(
        select,
        selecionada = "",
        incluirVazio = true
    ) {
        if (!select) {
            return;
        }

        select.innerHTML = "";

        if (incluirVazio) {
            select.appendChild(
                new Option("Selecione a atividade", "")
            );
        }

        Object.entries(ATIVIDADES_CREDITO_RURAL).forEach(
            ([chaveGrupo, grupo]) => {
                const optgroup = document.createElement("optgroup");

                optgroup.label = grupo.nome;

                grupo.atividades.forEach(nome => {
                    const atividade = normalizarTexto(nome);
                    const valor = `${chaveGrupo}|${atividade}`;
                    const option = new Option(nome, valor);

                    if (
                        selecionada === valor ||
                        selecionada === atividade ||
                        selecionada === nome
                    ) {
                        option.selected = true;
                    }

                    optgroup.appendChild(option);
                });

                select.appendChild(optgroup);
            }
        );
    }

    function interpretarValorAtividadeAgrupada(valor) {
        const texto = String(valor || "");

        if (!texto.includes("|")) {
            return null;
        }

        const [grupo, atividade] = texto.split("|");

        if (!grupo || !atividade) {
            return null;
        }

        return {
            grupo,
            atividade,
            nomeGrupo: obterNomeGrupo(grupo),
            nomeAtividade: obterNomeAtividade(atividade, grupo)
        };
    }

    /* =====================================================
       COMPATIBILIDADE COM CREDITO-RURAL.HTML
       ===================================================== */

    function preencherGruposAtividadeCreditoRural() {
        const select = document.getElementById("grupoAtividade");

        if (!select) {
            return;
        }

        preencherGruposEmSelect(
            select,
            select.value || "agricola",
            false
        );
    }

    function preencherAtividadesCreditoRural() {
        const grupo = document.getElementById("grupoAtividade");
        const atividade = document.getElementById("atividade");

        if (!grupo || !atividade) {
            return;
        }

        preencherAtividadesEmSelect(
            atividade,
            grupo.value || "agricola",
            atividade.value,
            false
        );
    }

    function inicializar() {
        const grupo = document.getElementById("grupoAtividade");
        const atividade = document.getElementById("atividade");

        if (!grupo || !atividade) {
            return;
        }

        preencherGruposAtividadeCreditoRural();
        preencherAtividadesCreditoRural();

        grupo.addEventListener(
            "change",
            preencherAtividadesCreditoRural
        );
    }

    window.ATIVIDADES_CREDITO_RURAL =
        ATIVIDADES_CREDITO_RURAL;

    window.CreditoRuralAtividades = {
        dados: ATIVIDADES_CREDITO_RURAL,
        normalizarIdentificadorAtividade,
        obterGrupo,
        obterNomeGrupo,
        obterAtividades,
        obterNomeAtividade,
        obterGrupoPorAtividade,
        localizarAtividadePorNome,
        preencherGruposEmSelect,
        preencherAtividadesEmSelect,
        preencherTodasAtividadesAgrupadas,
        interpretarValorAtividadeAgrupada,
        inicializar
    };

    window.preencherGruposAtividadeCreditoRural =
        preencherGruposAtividadeCreditoRural;

    window.preencherAtividadesCreditoRural =
        preencherAtividadesCreditoRural;

    window.preencherTodasAtividadesAgrupadasCreditoRural =
        preencherTodasAtividadesAgrupadas;

    document.addEventListener(
        "DOMContentLoaded",
        inicializar
    );
})();