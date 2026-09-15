/**
 * credito-rural-atividades.js
 * Cadastro centralizado das atividades do Crédito Rural
 * Sicoob Mantiqueira
 *
 * Para adicionar, remover, renomear ou reordenar grupos e atividades,
 * altere SOMENTE o objeto ATIVIDADES_CREDITO_RURAL.
 */

const ATIVIDADES_CREDITO_RURAL = {
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
};

function normalizarIdentificadorAtividade(texto) {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

function obterGrupoAtividadeCreditoRural(chaveGrupo) {
    return ATIVIDADES_CREDITO_RURAL[chaveGrupo] || null;
}

function obterNomeGrupoAtividadeCreditoRural(chaveGrupo) {
    const grupo = obterGrupoAtividadeCreditoRural(chaveGrupo);

    return grupo
        ? grupo.nome
        : "";
}

function obterAtividadesCreditoRural(chaveGrupo) {
    const grupo = obterGrupoAtividadeCreditoRural(chaveGrupo);

    return grupo
        ? [...grupo.atividades]
        : [];
}

function obterNomeAtividadeCreditoRural(valorAtividade, chaveGrupo = null) {
    const grupos = chaveGrupo
        ? {
            [chaveGrupo]: ATIVIDADES_CREDITO_RURAL[chaveGrupo]
        }
        : ATIVIDADES_CREDITO_RURAL;

    for (const grupo of Object.values(grupos)) {
        if (!grupo) {
            continue;
        }

        const atividadeEncontrada = grupo.atividades.find(
            item => normalizarIdentificadorAtividade(item) === valorAtividade
        );

        if (atividadeEncontrada) {
            return atividadeEncontrada;
        }
    }

    return "";
}

function obterGrupoPorAtividadeCreditoRural(valorAtividade) {
    for (const [chaveGrupo, grupo] of Object.entries(ATIVIDADES_CREDITO_RURAL)) {
        const encontrou = grupo.atividades.some(
            item => normalizarIdentificadorAtividade(item) === valorAtividade
        );

        if (encontrou) {
            return chaveGrupo;
        }
    }

    return "";
}

function preencherGruposAtividadeCreditoRural(grupoSelecionado = "agricola") {
    const selectGrupo = document.getElementById("grupoAtividade");

    if (!selectGrupo) {
        return;
    }

    selectGrupo.innerHTML = "";

    Object.entries(ATIVIDADES_CREDITO_RURAL).forEach(([chave, grupo]) => {
        const option = document.createElement("option");

        option.value = chave;
        option.textContent = grupo.nome;

        selectGrupo.appendChild(option);
    });

    if (ATIVIDADES_CREDITO_RURAL[grupoSelecionado]) {
        selectGrupo.value = grupoSelecionado;
    } else {
        selectGrupo.selectedIndex = 0;
    }
}

function preencherAtividadesCreditoRural(
    grupoSelecionado = null,
    atividadeSelecionada = null
) {
    const selectGrupo = document.getElementById("grupoAtividade");
    const selectAtividade = document.getElementById("atividade");

    if (!selectGrupo || !selectAtividade) {
        return;
    }

    const chaveGrupo = grupoSelecionado || selectGrupo.value;
    const grupo = ATIVIDADES_CREDITO_RURAL[chaveGrupo];

    selectAtividade.innerHTML = "";

    if (!grupo || !grupo.atividades.length) {
        const option = document.createElement("option");

        option.value = "";
        option.textContent = "Nenhuma atividade disponível";

        selectAtividade.appendChild(option);
        selectAtividade.disabled = true;

        return;
    }

    selectAtividade.disabled = false;

    grupo.atividades.forEach(nomeAtividade => {
        const option = document.createElement("option");

        option.value = normalizarIdentificadorAtividade(nomeAtividade);
        option.textContent = nomeAtividade;

        selectAtividade.appendChild(option);
    });

    if (atividadeSelecionada) {
        const existeAtividade = [...selectAtividade.options].some(
            option => option.value === atividadeSelecionada
        );

        if (existeAtividade) {
            selectAtividade.value = atividadeSelecionada;
        }
    }
}

function inicializarAtividadesCreditoRural() {
    const selectGrupo = document.getElementById("grupoAtividade");
    const selectAtividade = document.getElementById("atividade");

    if (!selectGrupo || !selectAtividade) {
        return;
    }

    preencherGruposAtividadeCreditoRural("agricola");
    preencherAtividadesCreditoRural(
        "agricola",
        normalizarIdentificadorAtividade("Arroz")
    );

    selectGrupo.addEventListener("change", () => {
        preencherAtividadesCreditoRural(selectGrupo.value);

        selectGrupo.dispatchEvent(
            new CustomEvent("creditoRuralGrupoAlterado", {
                bubbles: true,
                detail: {
                    grupo: selectGrupo.value,
                    nomeGrupo: obterNomeGrupoAtividadeCreditoRural(selectGrupo.value),
                    atividade: selectAtividade.value,
                    nomeAtividade: obterNomeAtividadeCreditoRural(
                        selectAtividade.value,
                        selectGrupo.value
                    )
                }
            })
        );
    });
}

window.ATIVIDADES_CREDITO_RURAL = ATIVIDADES_CREDITO_RURAL;

window.CreditoRuralAtividades = {
    dados: ATIVIDADES_CREDITO_RURAL,
    normalizarIdentificadorAtividade,
    obterGrupo: obterGrupoAtividadeCreditoRural,
    obterNomeGrupo: obterNomeGrupoAtividadeCreditoRural,
    obterAtividades: obterAtividadesCreditoRural,
    obterNomeAtividade: obterNomeAtividadeCreditoRural,
    obterGrupoPorAtividade: obterGrupoPorAtividadeCreditoRural,
    preencherGrupos: preencherGruposAtividadeCreditoRural,
    preencherAtividades: preencherAtividadesCreditoRural,
    inicializar: inicializarAtividadesCreditoRural
};

inicializarAtividadesCreditoRural();