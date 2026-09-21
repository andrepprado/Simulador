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

/* =========================================================
   NORMALIZAÇÃO
   ========================================================= */

function normalizarIdentificadorAtividade(texto) {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

/* =========================================================
   CONSULTAS
   ========================================================= */

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

function obterNomeAtividadeCreditoRural(
    valorAtividade,
    chaveGrupo = null
) {
    if (!valorAtividade) {
        return "";
    }

    const grupos = chaveGrupo
        ? {
            [chaveGrupo]: ATIVIDADES_CREDITO_RURAL[chaveGrupo]
        }
        : ATIVIDADES_CREDITO_RURAL;

    for (const grupo of Object.values(grupos)) {
        if (!grupo) {
            continue;
        }

        const atividadeEncontrada =
            grupo.atividades.find(
                item =>
                    normalizarIdentificadorAtividade(item) ===
                    valorAtividade
            );

        if (atividadeEncontrada) {
            return atividadeEncontrada;
        }
    }

    return "";
}

function obterGrupoPorAtividadeCreditoRural(valorAtividade) {
    if (!valorAtividade) {
        return "";
    }

    for (
        const [chaveGrupo, grupo]
        of Object.entries(ATIVIDADES_CREDITO_RURAL)
    ) {
        const encontrou =
            grupo.atividades.some(
                item =>
                    normalizarIdentificadorAtividade(item) ===
                    valorAtividade
            );

        if (encontrou) {
            return chaveGrupo;
        }
    }

    return "";
}

function obterAtividadeCompletaCreditoRural(
    valorAtividade,
    chaveGrupo = null
) {
    const grupoEncontrado =
        chaveGrupo ||
        obterGrupoPorAtividadeCreditoRural(valorAtividade);

    if (!grupoEncontrado) {
        return null;
    }

    const nomeAtividade =
        obterNomeAtividadeCreditoRural(
            valorAtividade,
            grupoEncontrado
        );

    if (!nomeAtividade) {
        return null;
    }

    return {
        grupo: grupoEncontrado,
        nomeGrupo:
            obterNomeGrupoAtividadeCreditoRural(
                grupoEncontrado
            ),
        atividade: valorAtividade,
        nomeAtividade
    };
}

/* =========================================================
   FUNÇÕES GENÉRICAS PARA SELECTS
   ========================================================= */

function preencherGruposEmSelectCreditoRural(
    select,
    grupoSelecionado = "agricola",
    incluirOpcaoVazia = false
) {
    if (!select) {
        return;
    }

    select.innerHTML = "";

    if (incluirOpcaoVazia) {
        const optionVazia =
            document.createElement("option");

        optionVazia.value = "";
        optionVazia.textContent =
            "Selecione o grupo";

        select.appendChild(
            optionVazia
        );
    }

    Object.entries(
        ATIVIDADES_CREDITO_RURAL
    ).forEach(
        ([chave, grupo]) => {
            const option =
                document.createElement("option");

            option.value = chave;
            option.textContent = grupo.nome;

            select.appendChild(
                option
            );
        }
    );

    if (
        grupoSelecionado &&
        ATIVIDADES_CREDITO_RURAL[
        grupoSelecionado
        ]
    ) {
        select.value =
            grupoSelecionado;
    } else if (
        incluirOpcaoVazia
    ) {
        select.value = "";
    } else if (
        select.options.length
    ) {
        select.selectedIndex = 0;
    }
}

function preencherAtividadesEmSelectCreditoRural(
    select,
    chaveGrupo,
    atividadeSelecionada = null,
    incluirOpcaoVazia = false
) {
    if (!select) {
        return;
    }

    const grupo =
        ATIVIDADES_CREDITO_RURAL[
        chaveGrupo
        ];

    select.innerHTML = "";

    if (incluirOpcaoVazia) {
        const optionVazia =
            document.createElement("option");

        optionVazia.value = "";
        optionVazia.textContent =
            "Selecione a atividade";

        select.appendChild(
            optionVazia
        );
    }

    if (
        !grupo ||
        !grupo.atividades.length
    ) {
        if (!incluirOpcaoVazia) {
            const option =
                document.createElement("option");

            option.value = "";
            option.textContent =
                "Nenhuma atividade disponível";

            select.appendChild(
                option
            );
        }

        select.disabled = true;

        return;
    }

    select.disabled = false;

    grupo.atividades.forEach(
        nomeAtividade => {
            const option =
                document.createElement("option");

            option.value =
                normalizarIdentificadorAtividade(
                    nomeAtividade
                );

            option.textContent =
                nomeAtividade;

            select.appendChild(
                option
            );
        }
    );

    if (atividadeSelecionada) {
        const existeAtividade =
            [...select.options].some(
                option =>
                    option.value ===
                    atividadeSelecionada
            );

        if (existeAtividade) {
            select.value =
                atividadeSelecionada;
        }
    } else if (
        incluirOpcaoVazia
    ) {
        select.value = "";
    }
}

/* =========================================================
   SELECT COM OPTGROUP
   ========================================================= */

function preencherTodasAtividadesAgrupadasCreditoRural(
    select,
    atividadeSelecionada = null,
    incluirOpcaoVazia = true
) {
    if (!select) {
        return;
    }

    select.innerHTML = "";

    if (incluirOpcaoVazia) {
        const optionInicial =
            document.createElement("option");

        optionInicial.value = "";
        optionInicial.textContent =
            "Selecione a atividade";

        select.appendChild(
            optionInicial
        );
    }

    Object.entries(
        ATIVIDADES_CREDITO_RURAL
    ).forEach(
        ([chaveGrupo, grupo]) => {
            const optgroup =
                document.createElement(
                    "optgroup"
                );

            optgroup.label =
                grupo.nome;

            grupo.atividades.forEach(
                nomeAtividade => {
                    const valorAtividade =
                        normalizarIdentificadorAtividade(
                            nomeAtividade
                        );

                    const option =
                        document.createElement(
                            "option"
                        );

                    /*
                     * O value contém grupo + atividade.
                     * Isso evita ambiguidades entre grupos.
                     */
                    option.value =
                        `${chaveGrupo}|${valorAtividade}`;

                    option.dataset.grupo =
                        chaveGrupo;

                    option.dataset.atividade =
                        valorAtividade;

                    option.textContent =
                        nomeAtividade;

                    optgroup.appendChild(
                        option
                    );
                }
            );

            select.appendChild(
                optgroup
            );
        }
    );

    if (atividadeSelecionada) {
        const existe =
            [...select.options].some(
                option =>
                    option.value ===
                    atividadeSelecionada
            );

        if (existe) {
            select.value =
                atividadeSelecionada;
        }
    }
}

function interpretarValorAtividadeAgrupadaCreditoRural(
    valor
) {
    const texto =
        String(valor || "");

    if (!texto.includes("|")) {
        return null;
    }

    const [
        grupo,
        atividade
    ] = texto.split("|");

    if (
        !grupo ||
        !atividade ||
        !ATIVIDADES_CREDITO_RURAL[grupo]
    ) {
        return null;
    }

    const nomeAtividade =
        obterNomeAtividadeCreditoRural(
            atividade,
            grupo
        );

    if (!nomeAtividade) {
        return null;
    }

    return {
        grupo,
        nomeGrupo:
            obterNomeGrupoAtividadeCreditoRural(
                grupo
            ),
        atividade,
        nomeAtividade
    };
}

/* =========================================================
   COMPATIBILIDADE COM CREDITO-RURAL.HTML
   ========================================================= */

function preencherGruposAtividadeCreditoRural(
    grupoSelecionado = "agricola"
) {
    const selectGrupo =
        document.getElementById(
            "grupoAtividade"
        );

    if (!selectGrupo) {
        return;
    }

    preencherGruposEmSelectCreditoRural(
        selectGrupo,
        grupoSelecionado,
        false
    );
}

function preencherAtividadesCreditoRural(
    grupoSelecionado = null,
    atividadeSelecionada = null
) {
    const selectGrupo =
        document.getElementById(
            "grupoAtividade"
        );

    const selectAtividade =
        document.getElementById(
            "atividade"
        );

    if (
        !selectGrupo ||
        !selectAtividade
    ) {
        return;
    }

    const chaveGrupo =
        grupoSelecionado ||
        selectGrupo.value;

    preencherAtividadesEmSelectCreditoRural(
        selectAtividade,
        chaveGrupo,
        atividadeSelecionada,
        false
    );
}

/* =========================================================
   EVENTO PADRÃO
   ========================================================= */

function dispararEventoAtividadeCreditoRural(
    elementoOrigem,
    nomeEvento = "creditoRuralAtividadeAlterada"
) {
    if (!elementoOrigem) {
        return;
    }

    const selectGrupo =
        document.getElementById(
            "grupoAtividade"
        );

    const selectAtividade =
        document.getElementById(
            "atividade"
        );

    if (
        !selectGrupo ||
        !selectAtividade
    ) {
        return;
    }

    elementoOrigem.dispatchEvent(
        new CustomEvent(
            nomeEvento,
            {
                bubbles: true,
                detail: {
                    grupo:
                        selectGrupo.value,

                    nomeGrupo:
                        obterNomeGrupoAtividadeCreditoRural(
                            selectGrupo.value
                        ),

                    atividade:
                        selectAtividade.value,

                    nomeAtividade:
                        obterNomeAtividadeCreditoRural(
                            selectAtividade.value,
                            selectGrupo.value
                        )
                }
            }
        )
    );
}

/* =========================================================
   INICIALIZAÇÃO CREDITO-RURAL.HTML
   ========================================================= */

function inicializarAtividadesCreditoRural() {
    const selectGrupo =
        document.getElementById(
            "grupoAtividade"
        );

    const selectAtividade =
        document.getElementById(
            "atividade"
        );

    /*
     * Este arquivo também é carregado em páginas que não possuem
     * os campos grupoAtividade/atividade.
     * Portanto simplesmente retorna quando não existirem.
     */
    if (
        !selectGrupo ||
        !selectAtividade
    ) {
        return;
    }

    /*
     * Evita registrar listeners duplicados caso a função
     * seja chamada mais de uma vez.
     */
    if (
        selectGrupo.dataset
            .creditoRuralInicializado ===
        "true"
    ) {
        return;
    }

    selectGrupo.dataset
        .creditoRuralInicializado =
        "true";

    preencherGruposAtividadeCreditoRural(
        "agricola"
    );

    preencherAtividadesCreditoRural(
        "agricola",
        normalizarIdentificadorAtividade(
            "Arroz"
        )
    );

    selectGrupo.addEventListener(
        "change",
        () => {
            preencherAtividadesCreditoRural(
                selectGrupo.value
            );

            dispararEventoAtividadeCreditoRural(
                selectGrupo,
                "creditoRuralGrupoAlterado"
            );

            dispararEventoAtividadeCreditoRural(
                selectGrupo,
                "creditoRuralAtividadeAlterada"
            );
        }
    );

    selectAtividade.addEventListener(
        "change",
        () => {
            dispararEventoAtividadeCreditoRural(
                selectAtividade,
                "creditoRuralAtividadeAlterada"
            );
        }
    );
}

/* =========================================================
   EXPOSIÇÃO GLOBAL
   ========================================================= */

window.ATIVIDADES_CREDITO_RURAL =
    ATIVIDADES_CREDITO_RURAL;

window.CreditoRuralAtividades = {
    dados:
        ATIVIDADES_CREDITO_RURAL,

    normalizarIdentificadorAtividade,

    obterGrupo:
        obterGrupoAtividadeCreditoRural,

    obterNomeGrupo:
        obterNomeGrupoAtividadeCreditoRural,

    obterAtividades:
        obterAtividadesCreditoRural,

    obterNomeAtividade:
        obterNomeAtividadeCreditoRural,

    obterGrupoPorAtividade:
        obterGrupoPorAtividadeCreditoRural,

    obterAtividadeCompleta:
        obterAtividadeCompletaCreditoRural,

    preencherGrupos:
        preencherGruposAtividadeCreditoRural,

    preencherAtividades:
        preencherAtividadesCreditoRural,

    preencherGruposEmSelect:
        preencherGruposEmSelectCreditoRural,

    preencherAtividadesEmSelect:
        preencherAtividadesEmSelectCreditoRural,

    preencherTodasAtividadesAgrupadas:
        preencherTodasAtividadesAgrupadasCreditoRural,

    interpretarValorAtividadeAgrupada:
        interpretarValorAtividadeAgrupadaCreditoRural,

    inicializar:
        inicializarAtividadesCreditoRural
};

/* =========================================================
   INICIALIZAÇÃO AUTOMÁTICA
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        inicializarAtividadesCreditoRural
    );
} else {
    inicializarAtividadesCreditoRural();
}