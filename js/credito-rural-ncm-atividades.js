(function () {
    "use strict";

    /* =====================================================
       CONSTANTES
       ===================================================== */

    const CONFIANCA_AUTOMATICA_ATIVIDADE = 0.90;
    const CONFIANCA_SUGESTAO_ATIVIDADE = 0.65;

    /* =====================================================
       NORMALIZAÇÃO
       ===================================================== */

    function normalizarTextoClassificacao(valor) {
        return String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toUpperCase()
            .replace(/[^\p{L}\p{N}]+/gu, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function normalizarNcm(valor) {
        return String(valor || "")
            .replace(/\D/g, "")
            .slice(0, 8);
    }

    function normalizarAtividade(valor) {
        if (
            window.CreditoRuralAtividades &&
            typeof window.CreditoRuralAtividades
                .normalizarIdentificadorAtividade === "function"
        ) {
            return window.CreditoRuralAtividades
                .normalizarIdentificadorAtividade(valor);
        }

        return String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "");
    }

    /* =====================================================
       REGRAS
       ===================================================== */

    const REGRAS_NCM_ATIVIDADE_RURAL = [
        /* =================================================
           AGRÍCOLA - CEREAIS
           ================================================= */

        {
            grupo: "agricola",
            atividade: "Arroz",
            ncmsPrefixos: ["1006"],
            termosFortes: [
                "ARROZ",
                "ARROZ EM CASCA",
                "ARROZ COM CASCA"
            ],
            termosExcluir: [],
            automaticoComNcm: true
        },
        {
            grupo: "agricola",
            atividade: "Milho",
            ncmsPrefixos: ["1005"],
            termosFortes: [
                "MILHO",
                "MILHO EM GRAOS",
                "MILHO EM GRAO"
            ],
            termosExcluir: [
                "OLEO DE MILHO",
                "FARINHA DE MILHO"
            ],
            automaticoComNcm: true
        },
        {
            grupo: "agricola",
            atividade: "Sorgo",
            ncmsPrefixos: ["1007"],
            termosFortes: [
                "SORGO",
                "SORGO EM GRAOS"
            ],
            termosExcluir: [],
            automaticoComNcm: true
        },
        {
            grupo: "agricola",
            atividade: "Trigo",
            ncmsPrefixos: ["1001"],
            termosFortes: [
                "TRIGO",
                "TRIGO EM GRAOS"
            ],
            termosExcluir: [
                "FARINHA DE TRIGO"
            ],
            automaticoComNcm: true
        },
        {
            grupo: "agricola",
            atividade: "Aveia",
            ncmsPrefixos: ["1004"],
            termosFortes: [
                "AVEIA",
                "AVEIA EM GRAOS"
            ],
            termosExcluir: [],
            automaticoComNcm: true
        },
        {
            grupo: "agricola",
            atividade: "Cevada",
            ncmsPrefixos: ["1003"],
            termosFortes: [
                "CEVADA",
                "CEVADA EM GRAOS"
            ],
            termosExcluir: [
                "MALTE"
            ],
            automaticoComNcm: true
        },
        {
            grupo: "agricola",
            atividade: "Centeio",
            ncmsPrefixos: ["1002"],
            termosFortes: [
                "CENTEIO"
            ],
            termosExcluir: [],
            automaticoComNcm: true
        },
        {
            grupo: "agricola",
            atividade: "Triticale",
            ncmsPrefixos: ["1008"],
            termosFortes: [
                "TRITICALE"
            ],
            termosExcluir: [],
            automaticoComNcm: false
        },

        /* =================================================
           AGRÍCOLA - OLEAGINOSAS
           ================================================= */

        {
            grupo: "agricola",
            atividade: "Canola",
            ncmsPrefixos: ["1205"],
            termosFortes: [
                "CANOLA",
                "COLZA",
                "SEMENTE DE CANOLA"
            ],
            termosExcluir: [
                "OLEO DE CANOLA"
            ],
            automaticoComNcm: true
        },
        {
            grupo: "agricola",
            atividade: "Soja",
            ncmsPrefixos: ["1201"],
            termosFortes: [
                "SOJA",
                "SOJA EM GRAOS",
                "SOJA EM GRAO",
                "GRAO DE SOJA",
                "GRAOS DE SOJA"
            ],
            termosExcluir: [
                "OLEO DE SOJA",
                "FARELO DE SOJA",
                "LECITINA DE SOJA"
            ],
            automaticoComNcm: true
        },
        {
            grupo: "agricola",
            atividade: "Amendoim",
            ncmsPrefixos: ["1202"],
            termosFortes: [
                "AMENDOIM",
                "AMENDOIM EM CASCA"
            ],
            termosExcluir: [
                "OLEO DE AMENDOIM"
            ],
            automaticoComNcm: true
        },
        {
            grupo: "agricola",
            atividade: "Mamona",
            ncmsPrefixos: ["1207"],
            termosFortes: [
                "MAMONA",
                "SEMENTE DE MAMONA"
            ],
            termosExcluir: [
                "OLEO DE MAMONA"
            ],
            automaticoComNcm: false
        },

        /* =================================================
           ALGODÃO
           ================================================= */

        {
            grupo: "agricola",
            atividade: "Algodão",
            ncmsPrefixos: ["5201"],
            termosFortes: [
                "ALGODAO",
                "ALGODAO NAO CARDADO",
                "ALGODAO EM PLUMA"
            ],
            termosExcluir: [
                "TECIDO",
                "FIO DE ALGODAO"
            ],
            automaticoComNcm: true
        },

        /* =================================================
           RAÍZES / TUBÉRCULOS
           ================================================= */

        {
            grupo: "agricola",
            atividade: "Batata-inglesa",
            ncmsPrefixos: ["0701"],
            termosFortes: [
                "BATATA",
                "BATATA INGLESA"
            ],
            termosExcluir: [
                "BATATA DOCE"
            ],
            automaticoComNcm: true
        },
        {
            grupo: "agricola",
            atividade: "Batata-doce",
            ncmsPrefixos: ["0714"],
            termosFortes: [
                "BATATA DOCE"
            ],
            termosExcluir: [],
            automaticoComNcm: true
        },
        {
            grupo: "agricola",
            atividade: "Mandioca",
            ncmsPrefixos: ["0714"],
            termosFortes: [
                "MANDIOCA",
                "AIPIM",
                "MACAXEIRA"
            ],
            termosExcluir: [
                "FARINHA DE MANDIOCA"
            ],
            automaticoComNcm: true
        },
        {
            grupo: "agricola",
            atividade: "Inhame",
            ncmsPrefixos: ["0714"],
            termosFortes: [
                "INHAME"
            ],
            termosExcluir: [],
            automaticoComNcm: true
        },
        {
            grupo: "agricola",
            atividade: "Cará",
            ncmsPrefixos: ["0714"],
            termosFortes: [
                "CARA",
                "CARÁ"
            ],
            termosExcluir: [],
            automaticoComNcm: true
        },

        /* =================================================
           HORTALIÇAS
           ================================================= */

        {
            grupo: "agricola",
            atividade: "Tomate-cereja",
            ncmsPrefixos: ["0702"],
            termosFortes: [
                "TOMATE CEREJA"
            ],
            termosExcluir: [],
            automaticoComNcm: true
        },
        {
            grupo: "agricola",
            atividade: "Tomate mesa estaqueado",
            ncmsPrefixos: ["0702"],
            termosFortes: [
                "TOMATE ESTAQUEADO",
                "TOMATE DE MESA ESTAQUEADO"
            ],
            termosExcluir: [],
            automaticoComNcm: false
        },
        {
            grupo: "agricola",
            atividade: "Tomate mesa rasteiro",
            ncmsPrefixos: ["0702"],
            termosFortes: [
                "TOMATE RASTEIRO",
                "TOMATE DE MESA RASTEIRO"
            ],
            termosExcluir: [],
            automaticoComNcm: false
        },
        {
            grupo: "agricola",
            atividade: "Cebola",
            ncmsPrefixos: ["0703"],
            termosFortes: [
                "CEBOLA"
            ],
            termosExcluir: [],
            automaticoComNcm: true
        },
        {
            grupo: "agricola",
            atividade: "Alho",
            ncmsPrefixos: ["0703"],
            termosFortes: [
                "ALHO"
            ],
            termosExcluir: [
                "ALHO PORO"
            ],
            automaticoComNcm: true
        },
        {
            grupo: "agricola",
            atividade: "Alho-poró",
            ncmsPrefixos: ["0703"],
            termosFortes: [
                "ALHO PORO"
            ],
            termosExcluir: [],
            automaticoComNcm: true
        },
        {
            grupo: "agricola",
            atividade: "Cenoura",
            ncmsPrefixos: ["0706"],
            termosFortes: [
                "CENOURA"
            ],
            termosExcluir: [],
            automaticoComNcm: true
        },
        {
            grupo: "agricola",
            atividade: "Nabo",
            ncmsPrefixos: ["0706"],
            termosFortes: [
                "NABO"
            ],
            termosExcluir: [],
            automaticoComNcm: true
        },
        {
            grupo: "agricola",
            atividade: "Rabanete",
            ncmsPrefixos: ["0706"],
            termosFortes: [
                "RABANETE"
            ],
            termosExcluir: [],
            automaticoComNcm: true
        },
        {
            grupo: "agricola",
            atividade: "Pepino",
            ncmsPrefixos: ["0707"],
            termosFortes: [
                "PEPINO"
            ],
            termosExcluir: [],
            automaticoComNcm: true
        },
        {
            grupo: "agricola",
            atividade: "Chuchu",
            ncmsPrefixos: ["0709"],
            termosFortes: [
                "CHUCHU"
            ],
            termosExcluir: [],
            automaticoComNcm: false
        },
        {
            grupo: "agricola",
            atividade: "Berinjela",
            ncmsPrefixos: ["0709"],
            termosFortes: [
                "BERINJELA"
            ],
            termosExcluir: [],
            automaticoComNcm: true
        },
        {
            grupo: "agricola",
            atividade: "Pimentão",
            ncmsPrefixos: ["0709"],
            termosFortes: [
                "PIMENTAO"
            ],
            termosExcluir: [],
            automaticoComNcm: true
        },
        {
            grupo: "agricola",
            atividade: "Quiabo",
            ncmsPrefixos: ["0709"],
            termosFortes: [
                "QUIABO"
            ],
            termosExcluir: [],
            automaticoComNcm: false
        },
        {
            grupo: "agricola",
            atividade: "Abóbora-moranga",
            ncmsPrefixos: ["0709"],
            termosFortes: [
                "ABOBORA",
                "MORANGA"
            ],
            termosExcluir: [],
            automaticoComNcm: false
        },
        {
            grupo: "agricola",
            atividade: "Abobrinha",
            ncmsPrefixos: ["0709"],
            termosFortes: [
                "ABOBRINHA"
            ],
            termosExcluir: [],
            automaticoComNcm: false
        },
        {
            grupo: "agricola",
            atividade: "Alface",
            ncmsPrefixos: ["0705"],
            termosFortes: [
                "ALFACE"
            ],
            termosExcluir: [],
            automaticoComNcm: true
        },
        {
            grupo: "agricola",
            atividade: "Chicória",
            ncmsPrefixos: ["0705"],
            termosFortes: [
                "CHICORIA"
            ],
            termosExcluir: [],
            automaticoComNcm: true
        },
        {
            grupo: "agricola",
            atividade: "Brócolis",
            ncmsPrefixos: ["0704"],
            termosFortes: [
                "BROCOLIS"
            ],
            termosExcluir: [],
            automaticoComNcm: true
        },
        {
            grupo: "agricola",
            atividade: "Couve-Flor",
            ncmsPrefixos: ["0704"],
            termosFortes: [
                "COUVE FLOR"
            ],
            termosExcluir: [],
            automaticoComNcm: true
        },

        /* =================================================
           FRUTAS
           ================================================= */

        {
            grupo: "agricola",
            atividade: "Banana",
            ncmsPrefixos: ["0803"],
            termosFortes: [
                "BANANA"
            ],
            termosExcluir: [],
            automaticoComNcm: true
        },
        {
            grupo: "agricola",
            atividade: "Abacaxi",
            ncmsPrefixos: ["0804"],
            termosFortes: [
                "ABACAXI",
                "ANANAS"
            ],
            termosExcluir: [],
            automaticoComNcm: true
        },
        {
            grupo: "agricola",
            atividade: "Laranja",
            ncmsPrefixos: ["0805"],
            termosFortes: [
                "LARANJA"
            ],
            termosExcluir: [
                "SUCO DE LARANJA"
            ],
            automaticoComNcm: true
        },
        {
            grupo: "agricola",
            atividade: "Tangerina",
            ncmsPrefixos: ["0805"],
            termosFortes: [
                "TANGERINA",
                "MEXERICA",
                "MANDARINA"
            ],
            termosExcluir: [],
            automaticoComNcm: true
        },
        {
            grupo: "agricola",
            atividade: "Açaí cultivado",
            ncmsPrefixos: ["0811", "0810"],
            termosFortes: [
                "ACAI",
                "FRUTO DE ACAI"
            ],
            termosExcluir: [
                "POLPA INDUSTRIALIZADA"
            ],
            automaticoComNcm: false
        },
        {
            grupo: "agricola",
            atividade: "Cacau cultivado",
            ncmsPrefixos: ["1801"],
            termosFortes: [
                "CACAU",
                "CACAU EM GRAOS",
                "AMENDOA DE CACAU"
            ],
            termosExcluir: [
                "CHOCOLATE"
            ],
            automaticoComNcm: true
        },

        /* =================================================
           CAFÉ / CANA
           ================================================= */

        {
            grupo: "agricola",
            atividade: "Cafeicultura",
            ncmsPrefixos: ["0901"],
            termosFortes: [
                "CAFE",
                "CAFE EM GRAO",
                "CAFE CRU",
                "CAFE BENEFICIADO"
            ],
            termosExcluir: [
                "BEBIDA DE CAFE"
            ],
            automaticoComNcm: true
        },
        {
            grupo: "agricola",
            atividade: "Cana-de-açúcar",
            ncmsPrefixos: ["1212"],
            termosFortes: [
                "CANA DE ACUCAR",
                "CANA ACUCAR"
            ],
            termosExcluir: [
                "ACUCAR",
                "ETANOL"
            ],
            automaticoComNcm: false
        },

        /* =================================================
           PECUÁRIA - LEITE
           ================================================= */

        {
            grupo: "pecuaria",
            atividade: "Bovinocultura Leite",
            ncmsPrefixos: ["0401"],
            termosFortes: [
                "LEITE CRU",
                "LEITE IN NATURA",
                "LEITE DE VACA"
            ],
            termosExcluir: [
                "LEITE EM PO",
                "QUEIJO",
                "IOGURTE"
            ],
            automaticoComNcm: true
        },
        {
            grupo: "pecuaria",
            atividade: "Bubalinocultura Leite",
            ncmsPrefixos: ["0401"],
            termosFortes: [
                "LEITE DE BUFALA",
                "LEITE BUBALINO"
            ],
            termosExcluir: [],
            automaticoComNcm: true
        },

        /* =================================================
           PECUÁRIA - BOVINOS
           ================================================= */

        {
            grupo: "pecuaria",
            atividade: null,
            grupoSugerido: "Bovinocultura Corte",
            ncmsPrefixos: ["0102"],
            termosFortes: [
                "BOVINO",
                "BOVINOS",
                "BOI",
                "NOVILHO",
                "BEZERRO",
                "BEZERRA",
                "GARROTE",
                "VACA"
            ],
            termosExcluir: [
                "BUFALO",
                "BUFALA"
            ],
            automaticoComNcm: false,
            atividadesPossiveis: [
                "Bovinocultura Corte - Cria",
                "Bovinocultura Corte - Recria",
                "Bovinocultura Corte - Recria/Engorda",
                "Bovinocultura Corte - Engorda",
                "Bovinocultura Corte - Cria/Recria/Engorda",
                "Bovinocultura Corte - Confinamento"
            ]
        },
        {
            grupo: "pecuaria",
            atividade: "Bubalinocultura Corte",
            ncmsPrefixos: ["0102"],
            termosFortes: [
                "BUFALO",
                "BUFALA",
                "BUBALINO"
            ],
            termosExcluir: [],
            automaticoComNcm: false
        },

        /* =================================================
           SUÍNOS
           ================================================= */

        {
            grupo: "pecuaria",
            atividade: null,
            grupoSugerido: "Suinocultura",
            ncmsPrefixos: ["0103"],
            termosFortes: [
                "SUINO",
                "SUINOS",
                "PORCO",
                "LEITAO"
            ],
            termosExcluir: [],
            automaticoComNcm: false,
            atividadesPossiveis: [
                "Suinocultura Integrada",
                "Suinocultura Não Integrada"
            ]
        },

        /* =================================================
           AVES
           ================================================= */

        {
            grupo: "pecuaria",
            atividade: "Avicultura Corte",
            ncmsPrefixos: ["0105"],
            termosFortes: [
                "FRANGO DE CORTE",
                "FRANGO VIVO",
                "AVE PARA ABATE"
            ],
            termosExcluir: [
                "POEDEIRA",
                "OVOS"
            ],
            automaticoComNcm: false
        },
        {
            grupo: "pecuaria",
            atividade: "Avicultura Postura",
            ncmsPrefixos: ["0407", "0105"],
            termosFortes: [
                "OVOS",
                "OVO DE GALINHA",
                "GALINHA POEDEIRA",
                "POEDEIRA"
            ],
            termosExcluir: [],
            automaticoComNcm: false
        },

        /* =================================================
           OVINOS / CAPRINOS
           ================================================= */

        {
            grupo: "pecuaria",
            atividade: "Ovinocultura",
            ncmsPrefixos: ["0104"],
            termosFortes: [
                "OVINO",
                "OVINOS",
                "CARNEIRO",
                "CORDEIRO",
                "OVELHA"
            ],
            termosExcluir: [
                "CAPRINO",
                "CABRA",
                "BODE"
            ],
            automaticoComNcm: false
        },
        {
            grupo: "pecuaria",
            atividade: "Caprinocultura",
            ncmsPrefixos: ["0104"],
            termosFortes: [
                "CAPRINO",
                "CAPRINOS",
                "CABRA",
                "BODE",
                "CABRITO"
            ],
            termosExcluir: [],
            automaticoComNcm: false
        },

        /* =================================================
           APICULTURA
           ================================================= */

        {
            grupo: "pecuaria",
            atividade: "Apicultura",
            ncmsPrefixos: ["0409"],
            termosFortes: [
                "MEL NATURAL",
                "MEL DE ABELHA"
            ],
            termosExcluir: [],
            automaticoComNcm: true
        },
        {
            grupo: "pecuaria",
            atividade: "Meliponicultura",
            ncmsPrefixos: ["0409"],
            termosFortes: [
                "MEL DE ABELHA SEM FERrao",
                "MEL DE JATAI",
                "MEL DE URUCU"
            ],
            termosExcluir: [],
            automaticoComNcm: false
        },

        /* =================================================
           AQUICULTURA / PESCA
           ================================================= */

        {
            grupo: "pecuaria",
            atividade: "Aquicultura - Piscicultura",
            ncmsPrefixos: ["0301"],
            termosFortes: [
                "PEIXE VIVO",
                "TILAPIA",
                "TAMBAQUI",
                "PACU",
                "PIRARUCU"
            ],
            termosExcluir: [],
            automaticoComNcm: false
        },
        {
            grupo: "pecuaria",
            atividade: "Aquicultura - Carcinicultura",
            ncmsPrefixos: ["0306"],
            termosFortes: [
                "CAMARAO",
                "CRUSTACEO"
            ],
            termosExcluir: [],
            automaticoComNcm: false
        },

        /* =================================================
           EXTRATIVISMO
           ================================================= */

        {
            grupo: "extrativismo",
            atividade: "Pirarucu de manejo",
            ncmsPrefixos: ["0302", "0303", "0304"],
            termosFortes: [
                "PIRARUCU DE MANEJO",
                "PIRARUCU MANEJO"
            ],
            termosExcluir: [],
            automaticoComNcm: false
        },

        /* =================================================
           FLORESTAL
           ================================================= */

        {
            grupo: "florestal_agroflorestal",
            atividade: "Florestas comerciais",
            ncmsPrefixos: ["4401", "4403"],
            termosFortes: [
                "MADEIRA EM BRUTO",
                "TORAS",
                "EUCALIPTO",
                "PINUS"
            ],
            termosExcluir: [],
            automaticoComNcm: false
        }
    ];

    /* =====================================================
       PREPARAÇÃO
       ===================================================== */

    REGRAS_NCM_ATIVIDADE_RURAL.forEach(regra => {
        regra.atividadeId =
            regra.atividade
                ? normalizarAtividade(regra.atividade)
                : null;

        regra.atividadesPossiveisIds =
            (regra.atividadesPossiveis || [])
                .map(normalizarAtividade);

        regra.termosFortesNormalizados =
            (regra.termosFortes || [])
                .map(normalizarTextoClassificacao);

        regra.termosExcluirNormalizados =
            (regra.termosExcluir || [])
                .map(normalizarTextoClassificacao);

        regra.ncmsPrefixos =
            (regra.ncmsPrefixos || [])
                .map(normalizarNcm);
    });

    /* =====================================================
       VERIFICAÇÃO DE NCM
       ===================================================== */

    function ncmCorresponde(ncm, prefixos) {
        const codigo =
            normalizarNcm(ncm);

        if (!codigo) {
            return false;
        }

        return prefixos.some(prefixo =>
            codigo.startsWith(prefixo)
        );
    }

    /* =====================================================
       VERIFICAÇÃO DOS TERMOS
       ===================================================== */

    function descricaoPossuiTermo(
        descricao,
        termos
    ) {
        const texto =
            normalizarTextoClassificacao(
                descricao
            );

        return termos.some(termo =>
            texto.includes(termo)
        );
    }

    function descricaoPossuiExclusao(
        descricao,
        termos
    ) {
        return descricaoPossuiTermo(
            descricao,
            termos
        );
    }

    /* =====================================================
       AVALIA UMA REGRA
       ===================================================== */

    function avaliarRegra(
        item,
        regra
    ) {
        const descricao =
            normalizarTextoClassificacao(
                item.descricao ||
                item.xProd ||
                ""
            );

        const ncm =
            normalizarNcm(
                item.ncm ||
                item.NCM ||
                ""
            );

        if (
            descricaoPossuiExclusao(
                descricao,
                regra.termosExcluirNormalizados
            )
        ) {
            return null;
        }

        const encontrouNcm =
            ncmCorresponde(
                ncm,
                regra.ncmsPrefixos
            );

        const encontrouTermo =
            descricaoPossuiTermo(
                descricao,
                regra.termosFortesNormalizados
            );

        if (
            !encontrouNcm &&
            !encontrouTermo
        ) {
            return null;
        }

        let confianca = 0;
        const evidencias = [];

        if (encontrouNcm) {
            confianca += 0.55;
            evidencias.push("NCM");
        }

        if (encontrouTermo) {
            confianca += 0.42;
            evidencias.push(
                "descrição do produto"
            );
        }

        if (
            encontrouNcm &&
            encontrouTermo
        ) {
            confianca += 0.03;
        }

        confianca =
            Math.min(
                1,
                confianca
            );

        let automatico = false;

        if (
            regra.atividadeId &&
            regra.automaticoComNcm &&
            encontrouNcm &&
            encontrouTermo &&
            confianca >=
            CONFIANCA_AUTOMATICA_ATIVIDADE
        ) {
            automatico = true;
        }

        return {
            grupo:
                regra.grupo,

            atividade:
                regra.atividadeId,

            nomeAtividade:
                regra.atividade ||
                "",

            grupoSugerido:
                regra.grupoSugerido ||
                "",

            atividadesPossiveis:
                regra.atividadesPossiveisIds ||
                [],

            atividadesPossiveisNomes:
                regra.atividadesPossiveis ||
                [],

            ncm,

            descricao:
                item.descricao ||
                item.xProd ||
                "",

            confianca,

            automatico,

            evidencias
        };
    }

    /* =====================================================
       CLASSIFICA UM ITEM
       ===================================================== */

    function classificarItem(item) {
        const candidatos = [];

        REGRAS_NCM_ATIVIDADE_RURAL
            .forEach(regra => {
                const resultado =
                    avaliarRegra(
                        item,
                        regra
                    );

                if (resultado) {
                    candidatos.push(
                        resultado
                    );
                }
            });

        candidatos.sort(
            (a, b) =>
                b.confianca -
                a.confianca
        );

        if (!candidatos.length) {
            return {
                identificado: false,
                automatico: false,
                confianca: 0,
                candidatos: []
            };
        }

        const principal =
            candidatos[0];

        return {
            identificado:
                principal.confianca >=
                CONFIANCA_SUGESTAO_ATIVIDADE,

            automatico:
                principal.automatico,

            confianca:
                principal.confianca,

            grupo:
                principal.grupo,

            atividade:
                principal.atividade,

            nomeAtividade:
                principal.nomeAtividade,

            grupoSugerido:
                principal.grupoSugerido,

            atividadesPossiveis:
                principal.atividadesPossiveis,

            atividadesPossiveisNomes:
                principal.atividadesPossiveisNomes,

            evidencias:
                principal.evidencias,

            candidatos
        };
    }

    /* =====================================================
       CLASSIFICA TODOS OS ITENS
       ===================================================== */

    function classificarItens(itens) {
        const resultados = [];

        (itens || []).forEach(
            (item, indice) => {
                const classificacao =
                    classificarItem(
                        item
                    );

                resultados.push({
                    indice,
                    item,
                    ...classificacao
                });
            }
        );

        return resultados;
    }

    /* =====================================================
       CONSOLIDA ATIVIDADES DA NOTA
       ===================================================== */

    function consolidarAtividadesNota(
        itens
    ) {
        const classificacoes =
            classificarItens(
                itens
            );

        const mapa =
            new Map();

        classificacoes.forEach(
            classificacao => {
                if (
                    !classificacao.identificado
                ) {
                    return;
                }

                if (
                    !classificacao.atividade
                ) {
                    return;
                }

                const chave =
                    [
                        classificacao.grupo,
                        classificacao.atividade
                    ].join("|");

                if (
                    !mapa.has(chave)
                ) {
                    mapa.set(
                        chave,
                        {
                            grupo:
                                classificacao.grupo,

                            atividade:
                                classificacao.atividade,

                            nomeAtividade:
                                classificacao.nomeAtividade,

                            confianca:
                                classificacao.confianca,

                            automatico:
                                classificacao.automatico,

                            evidencias:
                                new Set(
                                    classificacao.evidencias
                                ),

                            indicesItens:
                                []
                        }
                    );
                }

                const existente =
                    mapa.get(chave);

                existente.confianca =
                    Math.max(
                        existente.confianca,
                        classificacao.confianca
                    );

                existente.automatico =
                    existente.automatico &&
                    classificacao.automatico;

                classificacao.evidencias
                    .forEach(evidencia =>
                        existente.evidencias.add(
                            evidencia
                        )
                    );

                existente.indicesItens.push(
                    classificacao.indice
                );
            }
        );

        return Array.from(
            mapa.values()
        ).map(item => ({
            ...item,
            evidencias:
                Array.from(
                    item.evidencias
                )
        }));
    }

    /* =====================================================
       EXPORTAÇÃO
       ===================================================== */

    window.REGRAS_NCM_ATIVIDADE_RURAL =
        REGRAS_NCM_ATIVIDADE_RURAL;

    window.CreditoRuralNcmAtividades = {
        regras:
            REGRAS_NCM_ATIVIDADE_RURAL,

        normalizarNcm,

        normalizarTexto:
            normalizarTextoClassificacao,

        classificarItem,

        classificarItens,

        consolidarAtividadesNota,

        CONFIANCA_AUTOMATICA_ATIVIDADE,

        CONFIANCA_SUGESTAO_ATIVIDADE
    };
})();