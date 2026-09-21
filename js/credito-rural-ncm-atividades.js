(function () {
    "use strict";

    const LIMIAR_AUTOMATICO = 0.82;

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
        return String(valor || "")
            .replace(/\D/g, "")
            .slice(0, 8);
    }

    function resolver(nome, grupo) {
        return window.CreditoRuralAtividades
            ?.localizarAtividadePorNome(
                nome,
                grupo
            ) || null;
    }

    const REGRAS = [
        ["1006", "agricola", "Arroz", ["ARROZ"]],
        ["1005", "agricola", "Milho", ["MILHO"]],
        ["1007", "agricola", "Sorgo", ["SORGO"]],
        ["1001", "agricola", "Trigo", ["TRIGO"]],
        ["1004", "agricola", "Aveia", ["AVEIA"]],
        ["1003", "agricola", "Cevada", ["CEVADA"]],
        ["1002", "agricola", "Centeio", ["CENTEIO"]],
        ["1205", "agricola", "Canola", ["CANOLA", "COLZA"]],
        ["1201", "agricola", "Soja", ["SOJA"]],
        ["1202", "agricola", "Amendoim", ["AMENDOIM"]],
        ["5201", "agricola", "Algodão", ["ALGODAO"]],
        ["0701", "agricola", "Batata-inglesa", ["BATATA"]],
        ["0702", "agricola", null, ["TOMATE"]],
        ["0703", "agricola", null, ["CEBOLA", "ALHO", "ALHO PORO"]],
        ["0704", "agricola", null, ["BROCOLIS", "COUVE FLOR"]],
        ["0705", "agricola", null, ["ALFACE", "CHICORIA"]],
        ["0706", "agricola", null, ["CENOURA", "NABO"]],
        ["0707", "agricola", "Pepino", ["PEPINO"]],
        ["0714", "agricola", null, ["MANDIOCA", "AIPIM", "MACAXEIRA", "INHAME", "CARA", "BATATA DOCE"]],
        ["0803", "agricola", "Banana", ["BANANA"]],
        ["0804", "agricola", "Abacaxi", ["ABACAXI", "ANANAS"]],
        ["0805", "agricola", null, ["LARANJA", "TANGERINA", "MEXERICA"]],
        ["0901", "agricola", "Cafeicultura", ["CAFE"]],
        ["1207", "agricola", "Mamona", ["MAMONA"]],
        ["1212", "agricola", "Cana-de-açúcar", ["CANA DE ACUCAR"]],
        ["1801", "agricola", "Cacau cultivado", ["CACAU"]],
        ["0401", "pecuaria", null, ["LEITE"]],
        ["0407", "pecuaria", "Avicultura Postura", ["OVO", "OVOS"]],
        ["0409", "pecuaria", null, ["MEL"]],
        ["0103", "pecuaria", null, ["SUINO", "PORCO", "LEITAO"]],
        ["0104", "pecuaria", null, ["OVINO", "CORDEIRO", "OVELHA", "CAPRINO", "CABRA", "BODE", "CABRITO"]],
        ["0105", "pecuaria", null, ["FRANGO", "GALINHA", "POEDEIRA"]],
        ["0301", "pecuaria", "Aquicultura - Piscicultura", ["PEIXE", "TILAPIA", "TAMBAQUI", "PACU"]],
        ["0306", "pecuaria", "Aquicultura - Carcinicultura", ["CAMARAO"]]
    ];

    function classificarEspecial(descricao, ncm) {
        const texto = normalizar(descricao);

        /* =================================================
           TOMATE
           ================================================= */

        if (ncm.startsWith("0702")) {
            if (texto.includes("CEREJA")) {
                return criar("agricola", "Tomate-cereja", 0.98);
            }

            if (texto.includes("ESTAQUE")) {
                return criar(
                    "agricola",
                    "Tomate mesa estaqueado",
                    0.96
                );
            }

            if (texto.includes("RASTEIR")) {
                return criar(
                    "agricola",
                    "Tomate mesa rasteiro",
                    0.96
                );
            }
        }

        /* =================================================
           CEBOLA / ALHO
           ================================================= */

        if (ncm.startsWith("0703")) {
            if (texto.includes("ALHO PORO")) {
                return criar("agricola", "Alho-poró", 0.98);
            }

            if (texto.includes("ALHO")) {
                return criar("agricola", "Alho", 0.98);
            }

            if (texto.includes("CEBOLA")) {
                return criar("agricola", "Cebola", 0.98);
            }
        }

        /* =================================================
           RAÍZES
           ================================================= */

        if (ncm.startsWith("0714")) {
            if (texto.includes("BATATA DOCE")) {
                return criar("agricola", "Batata-doce", 0.98);
            }

            if (texto.includes("MANDIOQUINHA")) {
                return criar(
                    "agricola",
                    "Mandioquinha salsa (batata-baroa)",
                    0.98
                );
            }

            if (
                texto.includes("MANDIOCA") ||
                texto.includes("AIPIM") ||
                texto.includes("MACAXEIRA")
            ) {
                return criar("agricola", "Mandioca", 0.98);
            }

            if (texto.includes("INHAME")) {
                return criar("agricola", "Inhame", 0.98);
            }

            if (/\bCARA\b/.test(texto)) {
                return criar("agricola", "Cará", 0.96);
            }
        }

        /* =================================================
           CÍTRICOS
           ================================================= */

        if (ncm.startsWith("0805")) {
            if (texto.includes("LARANJA")) {
                return criar("agricola", "Laranja", 0.98);
            }

            if (
                texto.includes("TANGERINA") ||
                texto.includes("MEXERICA") ||
                texto.includes("MANDARINA")
            ) {
                return criar("agricola", "Tangerina", 0.98);
            }
        }

        /* =================================================
           LEITE
           ================================================= */

        if (ncm.startsWith("0401")) {
            if (
                texto.includes("BUFALA") ||
                texto.includes("BUBALIN")
            ) {
                return criar(
                    "pecuaria",
                    "Bubalinocultura Leite",
                    0.98
                );
            }

            return criar(
                "pecuaria",
                "Bovinocultura Leite",
                0.96
            );
        }

        /* =================================================
           MEL
           ================================================= */

        if (ncm.startsWith("0409")) {
            if (
                texto.includes("JATAI") ||
                texto.includes("URUCU") ||
                texto.includes("SEM FERRO")
            ) {
                return criar(
                    "pecuaria",
                    "Meliponicultura",
                    0.94
                );
            }

            return criar(
                "pecuaria",
                "Apicultura",
                0.95
            );
        }

        /* =================================================
           SUÍNOS
           ================================================= */

        if (ncm.startsWith("0103")) {
            if (texto.includes("INTEGRAD")) {
                return criar(
                    "pecuaria",
                    "Suinocultura Integrada",
                    0.94
                );
            }

            if (
                texto.includes("NAO INTEGRAD") ||
                texto.includes("INDEPENDENTE")
            ) {
                return criar(
                    "pecuaria",
                    "Suinocultura Não Integrada",
                    0.92
                );
            }
        }

        /* =================================================
           OVINO / CAPRINO
           ================================================= */

        if (ncm.startsWith("0104")) {
            if (
                texto.includes("CAPRIN") ||
                texto.includes("CABRA") ||
                texto.includes("BODE") ||
                texto.includes("CABRITO")
            ) {
                return criar(
                    "pecuaria",
                    "Caprinocultura",
                    0.97
                );
            }

            if (
                texto.includes("OVIN") ||
                texto.includes("OVELHA") ||
                texto.includes("CORDEIRO") ||
                texto.includes("CARNEIRO")
            ) {
                return criar(
                    "pecuaria",
                    "Ovinocultura",
                    0.97
                );
            }
        }

        /* =================================================
           AVES
           ================================================= */

        if (ncm.startsWith("0105")) {
            if (
                texto.includes("POEDEIRA") ||
                texto.includes("POSTURA")
            ) {
                return criar(
                    "pecuaria",
                    "Avicultura Postura",
                    0.96
                );
            }

            if (
                texto.includes("CORTE") ||
                texto.includes("ABATE") ||
                texto.includes("FRANGO")
            ) {
                return criar(
                    "pecuaria",
                    "Avicultura Corte",
                    0.93
                );
            }
        }

        /* =================================================
           BOVINOS VIVOS
           ================================================= */

        if (ncm.startsWith("0102")) {
            return classificarBovino(texto);
        }

        return null;
    }

    function classificarBovino(texto) {
        if (
            texto.includes("BUFALO") ||
            texto.includes("BUFALA") ||
            texto.includes("BUBALIN")
        ) {
            return criar(
                "pecuaria",
                "Bubalinocultura Corte",
                0.95,
                "NCM + descrição bubalina"
            );
        }

        if (
            texto.includes("CONFINAMENTO") ||
            texto.includes("CONFINADO")
        ) {
            return criar(
                "pecuaria",
                "Bovinocultura Corte - Confinamento",
                0.98,
                "NCM + descrição de confinamento"
            );
        }

        const idade = extrairFaixaEtariaBovino(texto);

        if (idade) {
            /*
             * Regra produtiva interna:
             *
             * até 8 meses -> Cria
             * 9 a 24 meses -> Recria
             * acima de 24 meses -> Engorda
             *
             * A descrição da NF-e é usada junto com o NCM.
             */

            if (idade.max <= 8) {
                return criar(
                    "pecuaria",
                    "Bovinocultura Corte - Cria",
                    0.94,
                    "NCM bovino + idade até 8 meses"
                );
            }

            if (
                idade.min >= 9 &&
                idade.max <= 24
            ) {
                return criar(
                    "pecuaria",
                    "Bovinocultura Corte - Recria",
                    0.94,
                    "NCM bovino + idade de recria"
                );
            }

            if (idade.min > 24) {
                return criar(
                    "pecuaria",
                    "Bovinocultura Corte - Engorda",
                    0.90,
                    "NCM bovino + idade adulta"
                );
            }

            if (
                idade.min <= 24 &&
                idade.max > 24
            ) {
                return criar(
                    "pecuaria",
                    "Bovinocultura Corte - Recria/Engorda",
                    0.90,
                    "NCM bovino + faixa entre recria e engorda"
                );
            }
        }

        if (
            texto.includes("BEZERRO") ||
            texto.includes("BEZERRA")
        ) {
            return criar(
                "pecuaria",
                "Bovinocultura Corte - Cria",
                0.90
            );
        }

        if (
            texto.includes("GARROTE") ||
            texto.includes("NOVILHA")
        ) {
            return criar(
                "pecuaria",
                "Bovinocultura Corte - Recria",
                0.88
            );
        }

        if (
            texto.includes("NOVILHO") ||
            texto.includes("BOI GORDO") ||
            texto.includes("VACA GORDA")
        ) {
            return criar(
                "pecuaria",
                "Bovinocultura Corte - Engorda",
                0.88
            );
        }

        return null;
    }

    function extrairFaixaEtariaBovino(texto) {
        let match = texto.match(
            /(\d{1,2})\s*(?:A|ATE)\s*(\d{1,2})\s*MESES/
        );

        if (match) {
            return {
                min: Number(match[1]),
                max: Number(match[2])
            };
        }

        match = texto.match(
            /ACIMA\s+DE\s+(\d{1,2})\s*MESES/
        );

        if (match) {
            return {
                min: Number(match[1]) + 1,
                max: 120
            };
        }

        match = texto.match(
            /ATE\s+(\d{1,2})\s*MESES/
        );

        if (match) {
            return {
                min: 0,
                max: Number(match[1])
            };
        }

        return null;
    }

    function criar(
        grupo,
        nomeAtividade,
        confianca,
        evidencia = "NCM + descrição"
    ) {
        const atividade = resolver(
            nomeAtividade,
            grupo
        );

        if (!atividade) {
            return null;
        }

        return {
            grupo,
            atividade: atividade.atividade,
            nomeAtividade: atividade.nomeAtividade,
            confianca,
            automatico:
                confianca >= LIMIAR_AUTOMATICO,
            evidencias: [evidencia]
        };
    }

    function classificarItem(item) {
        const ncm = normalizarNcm(
            item.ncm
        );

        const descricao = normalizar(
            item.descricao
        );

        if (!ncm && !descricao) {
            return {
                identificado: false,
                automatico: false,
                confianca: 0
            };
        }

        const especial =
            classificarEspecial(
                descricao,
                ncm
            );

        if (especial) {
            return {
                identificado: true,
                ...especial
            };
        }

        for (const regra of REGRAS) {
            const [
                prefixo,
                grupo,
                nomeAtividade,
                termos
            ] = regra;

            const ncmOk =
                ncm.startsWith(prefixo);

            const descricaoOk =
                termos.some(
                    termo =>
                        descricao.includes(
                            normalizar(termo)
                        )
                );

            if (
                ncmOk &&
                nomeAtividade &&
                descricaoOk
            ) {
                const resultado =
                    criar(
                        grupo,
                        nomeAtividade,
                        0.97
                    );

                if (resultado) {
                    return {
                        identificado: true,
                        ...resultado
                    };
                }
            }

            if (
                ncmOk &&
                nomeAtividade
            ) {
                const resultado =
                    criar(
                        grupo,
                        nomeAtividade,
                        0.88,
                        "NCM compatível"
                    );

                if (resultado) {
                    return {
                        identificado: true,
                        ...resultado
                    };
                }
            }
        }

        return {
            identificado: false,
            automatico: false,
            confianca: 0
        };
    }

    function consolidarBovinocultura(resultados) {
        const bovinos = resultados.filter(
            item =>
                item.nomeAtividade?.startsWith(
                    "Bovinocultura Corte"
                )
        );

        if (bovinos.length <= 1) {
            return resultados;
        }

        const nomes = new Set(
            bovinos.map(
                item =>
                    item.nomeAtividade
            )
        );

        if (nomes.size === 1) {
            return resultados;
        }

        let destino = null;

        const temCria = [...nomes].some(
            item =>
                item.includes("Cria") &&
                !item.includes("Recria")
        );

        const temRecria = [...nomes].some(
            item =>
                item.includes("Recria")
        );

        const temEngorda = [...nomes].some(
            item =>
                item.includes("Engorda")
        );

        if (
            temCria &&
            (temRecria || temEngorda)
        ) {
            destino =
                "Bovinocultura Corte - Cria/Recria/Engorda";
        } else if (
            temRecria &&
            temEngorda
        ) {
            destino =
                "Bovinocultura Corte - Recria/Engorda";
        }

        if (!destino) {
            return resultados;
        }

        const consolidada =
            criar(
                "pecuaria",
                destino,
                0.93,
                "Consolidação automática das faixas bovinas da NF"
            );

        if (!consolidada) {
            return resultados;
        }

        const outros =
            resultados.filter(
                item =>
                    !item.nomeAtividade?.startsWith(
                        "Bovinocultura Corte"
                    )
            );

        return [
            ...outros,
            consolidada
        ];
    }

    function classificarItens(itens) {
        return (itens || []).map(
            (item, indice) => ({
                indice,
                item,
                ...classificarItem(item)
            })
        );
    }

    function consolidarAtividadesNota(itens) {
        const classificacoes =
            classificarItens(itens)
                .filter(
                    item =>
                        item.identificado &&
                        item.atividade
                );

        let atividades =
            classificacoes.map(
                item => ({
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
                        item.evidencias || [],

                    valorProdutos:
                        Number(
                            item.item?.valorProduto
                        ) || 0,

                    indicesItens: [
                        item.indice
                    ]
                })
            );

        atividades =
            consolidarBovinocultura(
                atividades
            );

        const mapa = new Map();

        atividades.forEach(item => {
            const chave =
                `${item.grupo}|${item.atividade}`;

            if (!mapa.has(chave)) {
                mapa.set(
                    chave,
                    {
                        ...item,
                        evidencias: new Set(
                            item.evidencias
                        ),
                        indicesItens: [
                            ...item.indicesItens
                        ]
                    }
                );

                return;
            }

            const atual =
                mapa.get(chave);

            atual.confianca =
                Math.max(
                    atual.confianca,
                    item.confianca
                );

            atual.automatico =
                atual.automatico &&
                item.automatico;

            atual.valorProdutos +=
                Number(
                    item.valorProdutos
                ) || 0;

            item.evidencias.forEach(
                evidencia =>
                    atual.evidencias.add(
                        evidencia
                    )
            );

            atual.indicesItens.push(
                ...item.indicesItens
            );
        });

        return Array.from(
            mapa.values()
        ).map(
            item => ({
                ...item,
                evidencias: Array.from(
                    item.evidencias
                )
            })
        );
    }

    window.CreditoRuralNcmAtividades = {
        normalizarNcm,
        classificarItem,
        classificarItens,
        consolidarAtividadesNota,
        LIMIAR_AUTOMATICO
    };
})();