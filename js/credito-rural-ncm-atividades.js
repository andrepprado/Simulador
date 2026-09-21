(function () {
    "use strict";

    /* =========================================================
       CONFIGURAÇÃO
       ========================================================= */

    const LIMIAR_AUTOMATICO = 0.82;

    /*
     * Confiança utilizada quando existe apenas compatibilidade
     * de NCM, mas a descrição não confirma suficientemente
     * a atividade.
     *
     * Fica abaixo do limiar automático propositalmente.
     */
    const CONFIANCA_SOMENTE_NCM = 0.72;

    /* =========================================================
       NORMALIZAÇÃO
       ========================================================= */

    function normalizar(valor) {
        return String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function normalizarNcm(valor) {
        const ncm =
            String(valor || "")
                .replace(/\D/g, "");

        /*
         * NCM válido possui exatamente oito dígitos.
         *
         * Não usamos slice(0, 8), pois isso poderia transformar
         * um número maior incorreto em um NCM aparentemente válido.
         */
        return /^\d{8}$/.test(ncm)
            ? ncm
            : "";
    }

    function possuiTermo(texto, termos) {
        const fonte =
            normalizar(texto);

        return (termos || []).some(
            function (termo) {
                const procurado =
                    normalizar(termo);

                if (!procurado) {
                    return false;
                }

                return fonte.includes(
                    procurado
                );
            }
        );
    }

    /* =========================================================
       CATÁLOGO CENTRAL
       ========================================================= */

    function resolver(nome, grupo) {
        if (
            !window.CreditoRuralAtividades ||
            typeof window
                .CreditoRuralAtividades
                .localizarAtividadePorNome !==
            "function"
        ) {
            return null;
        }

        return window.CreditoRuralAtividades
            .localizarAtividadePorNome(
                nome,
                grupo
            );
    }

    /* =========================================================
       REGRAS GERAIS
       ========================================================= */

    /*
     * Estrutura:
     *
     * {
     *     prefixoNcm,
     *     grupo,
     *     atividade,
     *     termos,
     *     automaticoSomenteNcm
     * }
     *
     * automaticoSomenteNcm deve ser true apenas quando o próprio
     * NCM já representa evidência suficientemente específica.
     */

    const REGRAS = [
        {
            prefixoNcm: "1006",
            grupo: "agricola",
            atividade: "Arroz",
            termos: [
                "ARROZ"
            ],
            automaticoSomenteNcm: true
        },
        {
            prefixoNcm: "1005",
            grupo: "agricola",
            atividade: "Milho",
            termos: [
                "MILHO"
            ],
            automaticoSomenteNcm: true
        },
        {
            prefixoNcm: "1007",
            grupo: "agricola",
            atividade: "Sorgo",
            termos: [
                "SORGO"
            ],
            automaticoSomenteNcm: true
        },
        {
            prefixoNcm: "1001",
            grupo: "agricola",
            atividade: "Trigo",
            termos: [
                "TRIGO"
            ],
            automaticoSomenteNcm: true
        },
        {
            prefixoNcm: "1004",
            grupo: "agricola",
            atividade: "Aveia",
            termos: [
                "AVEIA"
            ],
            automaticoSomenteNcm: true
        },
        {
            prefixoNcm: "1003",
            grupo: "agricola",
            atividade: "Cevada",
            termos: [
                "CEVADA"
            ],
            automaticoSomenteNcm: true
        },
        {
            prefixoNcm: "1002",
            grupo: "agricola",
            atividade: "Centeio",
            termos: [
                "CENTEIO"
            ],
            automaticoSomenteNcm: true
        },
        {
            prefixoNcm: "1205",
            grupo: "agricola",
            atividade: "Canola",
            termos: [
                "CANOLA",
                "COLZA"
            ],
            automaticoSomenteNcm: true
        },
        {
            prefixoNcm: "1201",
            grupo: "agricola",
            atividade: "Soja",
            termos: [
                "SOJA"
            ],
            automaticoSomenteNcm: true
        },
        {
            prefixoNcm: "1202",
            grupo: "agricola",
            atividade: "Amendoim",
            termos: [
                "AMENDOIM"
            ],
            automaticoSomenteNcm: true
        },
        {
            prefixoNcm: "5201",
            grupo: "agricola",
            atividade: "Algodão",
            termos: [
                "ALGODAO"
            ],
            automaticoSomenteNcm: true
        },
        {
            prefixoNcm: "0701",
            grupo: "agricola",
            atividade: "Batata-inglesa",
            termos: [
                "BATATA",
                "BATATA INGLESA"
            ],
            automaticoSomenteNcm: true
        },
        {
            prefixoNcm: "0707",
            grupo: "agricola",
            atividade: "Pepino",
            termos: [
                "PEPINO"
            ],
            automaticoSomenteNcm: true
        },
        {
            prefixoNcm: "0803",
            grupo: "agricola",
            atividade: "Banana",
            termos: [
                "BANANA"
            ],
            automaticoSomenteNcm: true
        },
        {
            prefixoNcm: "0804",
            grupo: "agricola",
            atividade: "Abacaxi",
            termos: [
                "ABACAXI",
                "ANANAS"
            ],
            automaticoSomenteNcm: true
        },
        {
            prefixoNcm: "0901",
            grupo: "agricola",
            atividade: "Cafeicultura",
            termos: [
                "CAFE"
            ],
            automaticoSomenteNcm: true
        },
        {
            prefixoNcm: "1207",
            grupo: "agricola",
            atividade: "Mamona",
            termos: [
                "MAMONA"
            ],
            automaticoSomenteNcm: true
        },
        {
            prefixoNcm: "1212",
            grupo: "agricola",
            atividade: "Cana-de-açúcar",
            termos: [
                "CANA DE ACUCAR"
            ],
            automaticoSomenteNcm: true
        },
        {
            prefixoNcm: "1801",
            grupo: "agricola",
            atividade: "Cacau cultivado",
            termos: [
                "CACAU"
            ],
            automaticoSomenteNcm: true
        },
        {
            prefixoNcm: "0407",
            grupo: "pecuaria",
            atividade: "Avicultura Postura",
            termos: [
                "OVO",
                "OVOS"
            ],
            automaticoSomenteNcm: true
        }
    ];

    /* =========================================================
       CRIA CLASSIFICAÇÃO
       ========================================================= */

    function criar(
        grupo,
        nomeAtividade,
        confianca,
        evidencia = "NCM + descrição",
        automaticoForcado = null
    ) {
        const atividade =
            resolver(
                nomeAtividade,
                grupo
            );

        if (!atividade) {
            return null;
        }

        const confiancaNumerica =
            Number(confianca) || 0;

        const automatico =
            automaticoForcado === null
                ? confiancaNumerica >=
                LIMIAR_AUTOMATICO
                : Boolean(
                    automaticoForcado
                );

        return {
            grupo:
                grupo,

            atividade:
                atividade.atividade,

            nomeAtividade:
                atividade.nomeAtividade,

            confianca:
                confiancaNumerica,

            automatico:
                automatico,

            evidencias: [
                evidencia
            ]
        };
    }

    /* =========================================================
       REGRAS ESPECIAIS
       ========================================================= */

    function classificarEspecial(
        descricao,
        ncm
    ) {
        const texto =
            normalizar(
                descricao
            );

        /* =====================================================
           TOMATE
           ===================================================== */

        if (
            ncm.startsWith("0702")
        ) {
            if (
                possuiTermo(
                    texto,
                    [
                        "TOMATE CEREJA",
                        "TOMATE CHERRY",
                        "CEREJA"
                    ]
                )
            ) {
                return criar(
                    "agricola",
                    "Tomate-cereja",
                    0.99,
                    "NCM 0702 + descrição de tomate-cereja"
                );
            }

            if (
                possuiTermo(
                    texto,
                    [
                        "ESTAQUEADO",
                        "ESTAQUEADA",
                        "ESTAQUE",
                        "TUTORADO"
                    ]
                )
            ) {
                return criar(
                    "agricola",
                    "Tomate mesa estaqueado",
                    0.97,
                    "NCM 0702 + descrição de tomate estaqueado"
                );
            }

            if (
                possuiTermo(
                    texto,
                    [
                        "RASTEIRO",
                        "RASTEIRA",
                        "RASTEIR"
                    ]
                )
            ) {
                return criar(
                    "agricola",
                    "Tomate mesa rasteiro",
                    0.97,
                    "NCM 0702 + descrição de tomate rasteiro"
                );
            }

            /*
             * NCM identifica tomate, mas não distingue
             * sozinho cereja / estaqueado / rasteiro.
             */
            if (
                texto.includes(
                    "TOMATE"
                )
            ) {
                return {
                    identificado:
                        false,

                    automatico:
                        false,

                    confianca:
                        0.70,

                    motivo:
                        "Tomate identificado, mas o tipo de cultivo não pôde ser determinado."
                };
            }
        }

        /* =====================================================
           CEBOLA / ALHO / ALHO-PORÓ
           ===================================================== */

        if (
            ncm.startsWith("0703")
        ) {
            if (
                possuiTermo(
                    texto,
                    [
                        "ALHO PORO",
                        "ALHO-PORO"
                    ]
                )
            ) {
                return criar(
                    "agricola",
                    "Alho-poró",
                    0.99,
                    "NCM 0703 + descrição de alho-poró"
                );
            }

            if (
                /\bALHO\b/.test(
                    texto
                )
            ) {
                return criar(
                    "agricola",
                    "Alho",
                    0.99,
                    "NCM 0703 + descrição de alho"
                );
            }

            if (
                texto.includes(
                    "CEBOLA"
                )
            ) {
                return criar(
                    "agricola",
                    "Cebola",
                    0.99,
                    "NCM 0703 + descrição de cebola"
                );
            }
        }

        /* =====================================================
           BRÓCOLIS / COUVE-FLOR
           ===================================================== */

        if (
            ncm.startsWith("0704")
        ) {
            if (
                texto.includes(
                    "BROCOLIS"
                )
            ) {
                return criar(
                    "agricola",
                    "Brócolis",
                    0.99,
                    "NCM 0704 + descrição de brócolis"
                );
            }

            if (
                possuiTermo(
                    texto,
                    [
                        "COUVE FLOR",
                        "COUVE-FLOR"
                    ]
                )
            ) {
                return criar(
                    "agricola",
                    "Couve-Flor",
                    0.99,
                    "NCM 0704 + descrição de couve-flor"
                );
            }
        }

        /* =====================================================
           ALFACE / CHICÓRIA
           ===================================================== */

        if (
            ncm.startsWith("0705")
        ) {
            if (
                texto.includes(
                    "ALFACE"
                )
            ) {
                return criar(
                    "agricola",
                    "Alface",
                    0.99,
                    "NCM 0705 + descrição de alface"
                );
            }

            if (
                texto.includes(
                    "CHICORIA"
                )
            ) {
                return criar(
                    "agricola",
                    "Chicória",
                    0.99,
                    "NCM 0705 + descrição de chicória"
                );
            }
        }

        /* =====================================================
           CENOURA / NABO
           ===================================================== */

        if (
            ncm.startsWith("0706")
        ) {
            if (
                texto.includes(
                    "CENOURA"
                )
            ) {
                return criar(
                    "agricola",
                    "Cenoura",
                    0.99,
                    "NCM 0706 + descrição de cenoura"
                );
            }

            if (
                /\bNABO\b/.test(
                    texto
                )
            ) {
                return criar(
                    "agricola",
                    "Nabo",
                    0.98,
                    "NCM 0706 + descrição de nabo"
                );
            }
        }

        /* =====================================================
           RAÍZES / TUBÉRCULOS
           ===================================================== */

        if (
            ncm.startsWith("0714")
        ) {
            if (
                possuiTermo(
                    texto,
                    [
                        "BATATA DOCE",
                        "BATATA-DOCE"
                    ]
                )
            ) {
                return criar(
                    "agricola",
                    "Batata-doce",
                    0.99,
                    "NCM 0714 + descrição de batata-doce"
                );
            }

            if (
                possuiTermo(
                    texto,
                    [
                        "MANDIOQUINHA",
                        "BATATA BAROA",
                        "BATATA-BAROA"
                    ]
                )
            ) {
                return criar(
                    "agricola",
                    "Mandioquinha salsa (batata-baroa)",
                    0.99,
                    "NCM 0714 + descrição de mandioquinha"
                );
            }

            if (
                possuiTermo(
                    texto,
                    [
                        "MANDIOCA",
                        "AIPIM",
                        "MACAXEIRA"
                    ]
                )
            ) {
                return criar(
                    "agricola",
                    "Mandioca",
                    0.99,
                    "NCM 0714 + descrição de mandioca"
                );
            }

            if (
                texto.includes(
                    "INHAME"
                )
            ) {
                return criar(
                    "agricola",
                    "Inhame",
                    0.99,
                    "NCM 0714 + descrição de inhame"
                );
            }

            if (
                /\bCARA\b/.test(
                    texto
                )
            ) {
                return criar(
                    "agricola",
                    "Cará",
                    0.98,
                    "NCM 0714 + descrição de cará"
                );
            }
        }

        /* =====================================================
           CÍTRICOS
           ===================================================== */

        if (
            ncm.startsWith("0805")
        ) {
            if (
                texto.includes(
                    "LARANJA"
                )
            ) {
                return criar(
                    "agricola",
                    "Laranja",
                    0.99,
                    "NCM 0805 + descrição de laranja"
                );
            }

            if (
                possuiTermo(
                    texto,
                    [
                        "TANGERINA",
                        "MEXERICA",
                        "MANDARINA"
                    ]
                )
            ) {
                return criar(
                    "agricola",
                    "Tangerina",
                    0.99,
                    "NCM 0805 + descrição de tangerina"
                );
            }
        }

        /* =====================================================
           LEITE
           ===================================================== */

        if (
            ncm.startsWith("0401")
        ) {
            if (
                possuiTermo(
                    texto,
                    [
                        "BUFALA",
                        "BUFALO",
                        "BUBALIN"
                    ]
                )
            ) {
                return criar(
                    "pecuaria",
                    "Bubalinocultura Leite",
                    0.99,
                    "NCM 0401 + descrição de leite bubalino"
                );
            }

            if (
                possuiTermo(
                    texto,
                    [
                        "CABRA",
                        "CAPRIN"
                    ]
                )
            ) {
                return criar(
                    "pecuaria",
                    "Caprinocultura",
                    0.96,
                    "NCM 0401 + descrição de leite caprino"
                );
            }

            if (
                possuiTermo(
                    texto,
                    [
                        "OVELHA",
                        "OVIN"
                    ]
                )
            ) {
                return criar(
                    "pecuaria",
                    "Ovinocultura",
                    0.96,
                    "NCM 0401 + descrição de leite ovino"
                );
            }

            if (
                possuiTermo(
                    texto,
                    [
                        "LEITE BOVINO",
                        "LEITE DE VACA",
                        "LEITE CRU",
                        "LEITE IN NATURA"
                    ]
                )
            ) {
                return criar(
                    "pecuaria",
                    "Bovinocultura Leite",
                    0.98,
                    "NCM 0401 + descrição de leite bovino"
                );
            }

            /*
             * 0401 não distingue sozinho todas as espécies.
             * Gera sugestão, não classificação automática.
             */
            return criar(
                "pecuaria",
                "Bovinocultura Leite",
                0.78,
                "NCM 0401 sem espécie explicitamente identificada",
                false
            );
        }

        /* =====================================================
           MEL
           ===================================================== */

        if (
            ncm.startsWith("0409")
        ) {
            if (
                possuiTermo(
                    texto,
                    [
                        "JATAI",
                        "URUCU",
                        "MANDAÇAIA",
                        "MANDACAIA",
                        "SEM FERRO",
                        "MELIPONA",
                        "MELIPON"
                    ]
                )
            ) {
                return criar(
                    "pecuaria",
                    "Meliponicultura",
                    0.98,
                    "NCM 0409 + descrição de abelha sem ferrão"
                );
            }

            if (
                possuiTermo(
                    texto,
                    [
                        "APIS",
                        "ABELHA AFRICANIZADA",
                        "ABELHA COM FERRO"
                    ]
                )
            ) {
                return criar(
                    "pecuaria",
                    "Apicultura",
                    0.98,
                    "NCM 0409 + descrição apícola"
                );
            }

            /*
             * Mel natural não informa necessariamente
             * o sistema produtivo.
             */
            return criar(
                "pecuaria",
                "Apicultura",
                0.78,
                "NCM 0409 sem identificação suficiente da origem do mel",
                false
            );
        }

        /* =====================================================
           SUÍNOS
           ===================================================== */

        if (
            ncm.startsWith("0103")
        ) {
            if (
                possuiTermo(
                    texto,
                    [
                        "NAO INTEGRAD",
                        "NÃO INTEGRAD",
                        "INDEPENDENTE"
                    ]
                )
            ) {
                return criar(
                    "pecuaria",
                    "Suinocultura Não Integrada",
                    0.97,
                    "NCM 0103 + descrição de produção não integrada"
                );
            }

            if (
                texto.includes(
                    "INTEGRAD"
                )
            ) {
                return criar(
                    "pecuaria",
                    "Suinocultura Integrada",
                    0.97,
                    "NCM 0103 + descrição de produção integrada"
                );
            }

            /*
             * Suíno identificado, mas a NF não informa se
             * a produção é integrada ou não integrada.
             */
            return {
                identificado:
                    false,

                automatico:
                    false,

                confianca:
                    0.75,

                motivo:
                    "Suínos identificados, mas não foi possível determinar se a produção é integrada."
            };
        }

        /* =====================================================
           OVINOS / CAPRINOS
           ===================================================== */

        if (
            ncm.startsWith("0104")
        ) {
            if (
                possuiTermo(
                    texto,
                    [
                        "CAPRIN",
                        "CABRA",
                        "BODE",
                        "CABRITO"
                    ]
                )
            ) {
                return criar(
                    "pecuaria",
                    "Caprinocultura",
                    0.99,
                    "NCM 0104 + descrição caprina"
                );
            }

            if (
                possuiTermo(
                    texto,
                    [
                        "OVIN",
                        "OVELHA",
                        "CORDEIRO",
                        "CARNEIRO"
                    ]
                )
            ) {
                return criar(
                    "pecuaria",
                    "Ovinocultura",
                    0.99,
                    "NCM 0104 + descrição ovina"
                );
            }
        }

        /* =====================================================
           AVES
           ===================================================== */

        if (
            ncm.startsWith("0105")
        ) {
            if (
                possuiTermo(
                    texto,
                    [
                        "POEDEIRA",
                        "POSTURA"
                    ]
                )
            ) {
                return criar(
                    "pecuaria",
                    "Avicultura Postura",
                    0.98,
                    "NCM 0105 + descrição de postura"
                );
            }

            if (
                possuiTermo(
                    texto,
                    [
                        "FRANGO DE CORTE",
                        "FRANGO CORTE",
                        "ABATE",
                        "CORTE"
                    ]
                )
            ) {
                return criar(
                    "pecuaria",
                    "Avicultura Corte",
                    0.98,
                    "NCM 0105 + descrição de ave de corte"
                );
            }

            if (
                texto.includes(
                    "FRANGO"
                )
            ) {
                return criar(
                    "pecuaria",
                    "Avicultura Corte",
                    0.88,
                    "NCM 0105 + descrição de frango"
                );
            }

            /*
             * Galinha genericamente pode ser postura ou outra
             * finalidade. Não forçar classificação.
             */
            if (
                texto.includes(
                    "GALINHA"
                )
            ) {
                return {
                    identificado:
                        false,

                    automatico:
                        false,

                    confianca:
                        0.74,

                    motivo:
                        "Ave identificada sem definição segura entre corte e postura."
                };
            }
        }

        /* =====================================================
           BOVINOS / BUBALINOS VIVOS
           ===================================================== */

        if (
            ncm.startsWith("0102")
        ) {
            return classificarBovino(
                texto
            );
        }

        /* =====================================================
           PISCICULTURA
           ===================================================== */

        if (
            ncm.startsWith("0301")
        ) {
            if (
                possuiTermo(
                    texto,
                    [
                        "TILAPIA",
                        "TAMBAQUI",
                        "PACU",
                        "PEIXE CULTIVADO",
                        "PISCICULTURA",
                        "VIVEIRO"
                    ]
                )
            ) {
                return criar(
                    "pecuaria",
                    "Aquicultura - Piscicultura",
                    0.96,
                    "NCM de peixe + descrição compatível com piscicultura"
                );
            }

            /*
             * Peixe vivo não prova sozinho que se trata de
             * piscicultura em vez de outra origem.
             */
            return criar(
                "pecuaria",
                "Aquicultura - Piscicultura",
                0.74,
                "NCM de peixe sem evidência suficiente do sistema produtivo",
                false
            );
        }

        /* =====================================================
           CAMARÃO
           ===================================================== */

        if (
            ncm.startsWith("0306")
        ) {
            if (
                possuiTermo(
                    texto,
                    [
                        "CAMARAO CULTIVADO",
                        "CARCINICULTURA",
                        "CAMARAO DE CULTIVO",
                        "VIVEIRO"
                    ]
                )
            ) {
                return criar(
                    "pecuaria",
                    "Aquicultura - Carcinicultura",
                    0.97,
                    "NCM de crustáceo + descrição de carcinicultura"
                );
            }

            if (
                texto.includes(
                    "CAMARAO"
                )
            ) {
                return criar(
                    "pecuaria",
                    "Aquicultura - Carcinicultura",
                    0.78,
                    "Camarão identificado sem comprovação suficiente do sistema de cultivo",
                    false
                );
            }
        }

        return null;
    }

    /* =========================================================
       BOVINOS
       ========================================================= */

    function classificarBovino(
        textoOriginal
    ) {
        const texto =
            normalizar(
                textoOriginal
            );

        if (
            possuiTermo(
                texto,
                [
                    "BUFALO",
                    "BUFALA",
                    "BUBALIN"
                ]
            )
        ) {
            return criar(
                "pecuaria",
                "Bubalinocultura Corte",
                0.97,
                "NCM bovino/bubalino + descrição bubalina"
            );
        }

        if (
            possuiTermo(
                texto,
                [
                    "CONFINAMENTO",
                    "CONFINADO",
                    "CONFINADA"
                ]
            )
        ) {
            return criar(
                "pecuaria",
                "Bovinocultura Corte - Confinamento",
                0.99,
                "NCM bovino + descrição explícita de confinamento"
            );
        }

        /*
         * Caso a descrição da própria NF informe explicitamente
         * um ciclo combinado, respeitamos essa informação.
         */

        if (
            possuiTermo(
                texto,
                [
                    "CRIA RECRIA ENGORDA",
                    "CRIA/RECRIA/ENGORDA",
                    "CICLO COMPLETO"
                ]
            )
        ) {
            return criar(
                "pecuaria",
                "Bovinocultura Corte - Cria/Recria/Engorda",
                0.98,
                "Descrição explícita de ciclo completo"
            );
        }

        if (
            possuiTermo(
                texto,
                [
                    "RECRIA ENGORDA",
                    "RECRIA/ENGORDA"
                ]
            )
        ) {
            return criar(
                "pecuaria",
                "Bovinocultura Corte - Recria/Engorda",
                0.98,
                "Descrição explícita de recria/engorda"
            );
        }

        const idade =
            extrairFaixaEtariaBovino(
                texto
            );

        if (idade) {
            /*
             * REGRA INTERNA DE NEGÓCIO:
             *
             * até 8 meses      -> Cria
             * 9 a 24 meses     -> Recria
             * acima de 24      -> Engorda
             *
             * Esta regra NÃO vem diretamente do NCM.
             * O NCM identifica o produto bovino e a faixa
             * etária é obtida da descrição fiscal.
             */

            if (
                idade.max <= 8
            ) {
                return criar(
                    "pecuaria",
                    "Bovinocultura Corte - Cria",
                    0.95,
                    "NCM bovino + faixa etária; regra interna: até 8 meses = Cria"
                );
            }

            if (
                idade.min >= 9 &&
                idade.max <= 24
            ) {
                return criar(
                    "pecuaria",
                    "Bovinocultura Corte - Recria",
                    0.95,
                    "NCM bovino + faixa etária; regra interna: 9 a 24 meses = Recria"
                );
            }

            if (
                idade.min > 24
            ) {
                return criar(
                    "pecuaria",
                    "Bovinocultura Corte - Engorda",
                    0.92,
                    "NCM bovino + faixa etária; regra interna: acima de 24 meses = Engorda"
                );
            }

            if (
                idade.min <= 24 &&
                idade.max > 24
            ) {
                return criar(
                    "pecuaria",
                    "Bovinocultura Corte - Recria/Engorda",
                    0.92,
                    "NCM bovino + faixa etária atravessando Recria/Engorda"
                );
            }
        }

        if (
            possuiTermo(
                texto,
                [
                    "BEZERRO",
                    "BEZERRA"
                ]
            )
        ) {
            return criar(
                "pecuaria",
                "Bovinocultura Corte - Cria",
                0.90,
                "NCM bovino + descrição de bezerro/bezerra"
            );
        }

        if (
            possuiTermo(
                texto,
                [
                    "GARROTE",
                    "NOVILHA"
                ]
            )
        ) {
            return criar(
                "pecuaria",
                "Bovinocultura Corte - Recria",
                0.88,
                "NCM bovino + descrição de garrote/novilha"
            );
        }

        if (
            possuiTermo(
                texto,
                [
                    "NOVILHO",
                    "BOI GORDO",
                    "VACA GORDA",
                    "BOVINO PARA ABATE"
                ]
            )
        ) {
            return criar(
                "pecuaria",
                "Bovinocultura Corte - Engorda",
                0.90,
                "NCM bovino + descrição compatível com engorda/abate"
            );
        }

        /*
         * NCM de bovino sozinho não define a fase produtiva.
         */
        return {
            identificado:
                false,

            automatico:
                false,

            confianca:
                0.76,

            motivo:
                "Bovino identificado, mas a fase produtiva não pôde ser determinada."
        };
    }

    /* =========================================================
       FAIXA ETÁRIA BOVINA
       ========================================================= */

    function extrairFaixaEtariaBovino(
        textoOriginal
    ) {
        const texto =
            normalizar(
                textoOriginal
            );

        let match =
            texto.match(
                /(\d{1,2})\s*(?:A|ATE)\s*(\d{1,2})\s*MESES/
            );

        if (match) {
            const min =
                Number(
                    match[1]
                );

            const max =
                Number(
                    match[2]
                );

            if (
                min >= 0 &&
                max >= min &&
                max <= 120
            ) {
                return {
                    min:
                        min,

                    max:
                        max
                };
            }
        }

        match =
            texto.match(
                /ACIMA\s+DE\s+(\d{1,2})\s*MESES/
            );

        if (match) {
            const base =
                Number(
                    match[1]
                );

            if (
                base >= 0 &&
                base < 120
            ) {
                return {
                    min:
                        base + 1,

                    max:
                        120
                };
            }
        }

        match =
            texto.match(
                /ATE\s+(\d{1,2})\s*MESES/
            );

        if (match) {
            const max =
                Number(
                    match[1]
                );

            if (
                max >= 0 &&
                max <= 120
            ) {
                return {
                    min:
                        0,

                    max:
                        max
                };
            }
        }

        match =
            texto.match(
                /(\d{1,2})\s*MESES/
            );

        if (match) {
            const idade =
                Number(
                    match[1]
                );

            if (
                idade >= 0 &&
                idade <= 120
            ) {
                return {
                    min:
                        idade,

                    max:
                        idade
                };
            }
        }

        return null;
    }

    /* =========================================================
       CLASSIFICAÇÃO GENÉRICA
       ========================================================= */

    function classificarPorRegra(
        descricao,
        ncm
    ) {
        const texto =
            normalizar(
                descricao
            );

        for (
            const regra
            of REGRAS
        ) {
            const ncmOk =
                ncm.startsWith(
                    regra.prefixoNcm
                );

            if (!ncmOk) {
                continue;
            }

            const descricaoOk =
                possuiTermo(
                    texto,
                    regra.termos
                );

            if (
                descricaoOk
            ) {
                const resultado =
                    criar(
                        regra.grupo,
                        regra.atividade,
                        0.98,
                        `NCM ${regra.prefixoNcm} + descrição compatível`
                    );

                if (resultado) {
                    return resultado;
                }
            }

            /*
             * Alguns códigos são suficientemente específicos
             * para permitir classificação mesmo quando o OCR
             * não capturou perfeitamente a descrição.
             */
            if (
                regra
                    .automaticoSomenteNcm
            ) {
                const resultado =
                    criar(
                        regra.grupo,
                        regra.atividade,
                        0.88,
                        `NCM ${regra.prefixoNcm} compatível`
                    );

                if (resultado) {
                    return resultado;
                }
            }

            /*
             * Caso contrário, mantém apenas como sugestão.
             */
            const sugestao =
                criar(
                    regra.grupo,
                    regra.atividade,
                    CONFIANCA_SOMENTE_NCM,
                    `NCM ${regra.prefixoNcm} sem confirmação suficiente na descrição`,
                    false
                );

            if (sugestao) {
                return sugestao;
            }
        }

        return null;
    }

    /* =========================================================
       CLASSIFICA ITEM
       ========================================================= */

    function classificarItem(
        item = {}
    ) {
        const ncm =
            normalizarNcm(
                item.ncm
            );

        const descricao =
            normalizar(
                item.descricao
            );

        if (
            !ncm &&
            !descricao
        ) {
            return resultadoNaoIdentificado(
                "Item sem NCM e sem descrição."
            );
        }

        const especial =
            classificarEspecial(
                descricao,
                ncm
            );

        if (especial) {
            /*
             * Alguns casos especiais retornam apenas uma
             * informação de ambiguidade, sem atividade.
             */
            if (
                especial.grupo &&
                especial.atividade
            ) {
                return {
                    identificado:
                        true,

                    ...especial
                };
            }

            return {
                identificado:
                    false,

                automatico:
                    false,

                confianca:
                    Number(
                        especial
                            .confianca
                    ) || 0,

                motivo:
                    especial.motivo ||
                    "Classificação ambígua.",

                evidencias:
                    especial.evidencias ||
                    []
            };
        }

        const geral =
            classificarPorRegra(
                descricao,
                ncm
            );

        if (geral) {
            return {
                identificado:
                    true,

                ...geral
            };
        }

        return resultadoNaoIdentificado(
            "Nenhuma regra de atividade compatível foi encontrada."
        );
    }

    function resultadoNaoIdentificado(
        motivo = ""
    ) {
        return {
            identificado:
                false,

            grupo:
                "",

            atividade:
                "",

            nomeAtividade:
                "",

            automatico:
                false,

            confianca:
                0,

            evidencias:
                [],

            motivo:
                motivo
        };
    }

    /* =========================================================
       CLASSIFICA TODOS OS ITENS
       ========================================================= */

    function classificarItens(
        itens
    ) {
        return (
            Array.isArray(
                itens
            )
                ? itens
                : []
        ).map(
            function (
                item,
                indice
            ) {
                return {
                    indice:
                        indice,

                    item:
                        item,

                    ...classificarItem(
                        item
                    )
                };
            }
        );
    }

    /* =========================================================
       CONSOLIDA ATIVIDADES DA NOTA
       ========================================================= */

    function consolidarAtividadesNota(
        itens
    ) {
        const classificacoes =
            classificarItens(
                itens
            ).filter(
                function (
                    item
                ) {
                    return Boolean(
                        item.identificado &&
                        item.grupo &&
                        item.atividade
                    );
                }
            );

        const mapa =
            new Map();

        classificacoes.forEach(
            function (
                classificacao
            ) {
                const chave =
                    [
                        classificacao.grupo,
                        classificacao.atividade
                    ].join("|");

                const valorProduto =
                    numeroSeguro(
                        classificacao
                            .item
                            ?.valorProduto
                    );

                if (
                    !mapa.has(
                        chave
                    )
                ) {
                    mapa.set(
                        chave,
                        {
                            grupo:
                                classificacao
                                    .grupo,

                            atividade:
                                classificacao
                                    .atividade,

                            nomeAtividade:
                                classificacao
                                    .nomeAtividade,

                            confianca:
                                numeroSeguro(
                                    classificacao
                                        .confianca
                                ),

                            /*
                             * Todos os itens pertencentes à
                             * atividade precisam ter evidência
                             * automática para que a consolidação
                             * também seja automática.
                             */
                            automatico:
                                classificacao
                                    .automatico ===
                                true,

                            evidencias:
                                new Set(
                                    classificacao
                                        .evidencias ||
                                    []
                                ),

                            valorProdutos:
                                valorProduto,

                            indicesItens: [
                                classificacao
                                    .indice
                            ],

                            quantidadeItens:
                                1
                        }
                    );

                    return;
                }

                const atual =
                    mapa.get(
                        chave
                    );

                /*
                 * Conservador:
                 * a confiança consolidada deve refletir o
                 * item menos seguro da mesma atividade.
                 */
                atual.confianca =
                    Math.min(
                        numeroSeguro(
                            atual
                                .confianca
                        ),
                        numeroSeguro(
                            classificacao
                                .confianca
                        )
                    );

                atual.automatico =
                    atual.automatico &&
                    classificacao
                        .automatico ===
                    true;

                atual.valorProdutos +=
                    valorProduto;

                (
                    classificacao
                        .evidencias ||
                    []
                ).forEach(
                    function (
                        evidencia
                    ) {
                        atual
                            .evidencias
                            .add(
                                evidencia
                            );
                    }
                );

                atual.indicesItens.push(
                    classificacao
                        .indice
                );

                atual.quantidadeItens++;
            }
        );

        return Array.from(
            mapa.values()
        ).map(
            function (
                item
            ) {
                return {
                    grupo:
                        item.grupo,

                    atividade:
                        item.atividade,

                    nomeAtividade:
                        item.nomeAtividade,

                    confianca:
                        item.confianca,

                    automatico:
                        item.automatico,

                    evidencias:
                        Array.from(
                            item
                                .evidencias
                        ),

                    valorProdutos:
                        numeroSeguro(
                            item
                                .valorProdutos
                        ),

                    indicesItens: [
                        ...item
                            .indicesItens
                    ],

                    quantidadeItens:
                        item
                            .quantidadeItens
                };
            }
        );
    }

    /* =========================================================
       IMPORTANTE: NÃO CONSOLIDA FASES BOVINAS DIFERENTES
       ========================================================= */

    /*
     * A versão anterior transformava, por exemplo:
     *
     *   item 1 -> Recria
     *   item 2 -> Engorda
     *
     * em:
     *
     *   Recria/Engorda
     *
     * Isso provocava dois problemas:
     *
     * 1. a NF deixava de refletir a atividade real de cada item;
     * 2. valorProdutos e indicesItens eram perdidos na consolidação.
     *
     * Nesta versão cada atividade é mantida separadamente.
     *
     * A atividade combinada só é usada quando a própria descrição
     * fiscal trouxer evidência explícita dessa atividade.
     */

    /* =========================================================
       HELPERS
       ========================================================= */

    function numeroSeguro(
        valor
    ) {
        const numero =
            Number(
                valor
            );

        return Number.isFinite(
            numero
        )
            ? numero
            : 0;
    }

    /* =========================================================
       API
       ========================================================= */

    window.CreditoRuralNcmAtividades = {
        normalizarNcm:
            normalizarNcm,

        classificarItem:
            classificarItem,

        classificarItens:
            classificarItens,

        consolidarAtividadesNota:
            consolidarAtividadesNota,

        extrairFaixaEtariaBovino:
            extrairFaixaEtariaBovino,

        LIMIAR_AUTOMATICO:
            LIMIAR_AUTOMATICO
    };
})();