(function () {
    "use strict";

    /*
     * =========================================================
     * CRÉDITO RURAL - BASE ASTEC + PARÂMETROS DAS LINHAS
     * =========================================================
     *
     * ARQUIVO AUTOSSUFICIENTE.
     *
     * NÃO UTILIZA:
     * - XLSX
     * - CSV
     * - TSV
     * - FETCH DE ARQUIVO EXTERNO
     *
     * Para alterar:
     * - Beneficiário
     * - Linha
     * - Finalidade
     * - Fonte de Recursos
     * - Prazo Máximo
     * - Taxa Singular
     * - Taxa Associado
     *
     * altere SOMENTE:
     *
     * PARAMETROS_CREDITO_RURAL
     *
     * Taxas são armazenadas em percentual direto:
     *
     * 2.00  = 2,00%
     * 5.50  = 5,50%
     * 9.49  = 9,49%
     * 12.50 = 12,50%
     */

    const ORIGEM_BASE_CREDITO_RURAL =
        "js/credito-rural-atividades.js - base interna JavaScript";

    /* =========================================================
       PARÂMETROS OFICIAIS DAS LINHAS
       ========================================================= */

    const PARAMETROS_CREDITO_RURAL = {

        /* =====================================================
           PRONAF
           ===================================================== */

        PRONAF_CUSTEIO_FAIXA_1: {
            beneficiario: "PF/PJ",
            linha: "Pronaf",
            finalidade: "Custeio Faixa 1",
            fonte: "RO - Recursos Obrigatórios",
            prazoMeses: 24,
            taxaSingular: 2.00,
            taxaAssociado: 2.00
        },

        PRONAF_CUSTEIO_FAIXA_2: {
            beneficiario: "PF/PJ",
            linha: "Pronaf",
            finalidade: "Custeio Faixa 2",
            fonte: "RO - Recursos Obrigatórios",
            prazoMeses: 24,
            taxaSingular: 5.50,
            taxaAssociado: 5.50
        },

        PRONAF_CUSTEIO_FAIXA_3: {
            beneficiario: "PF/PJ",
            linha: "Pronaf",
            finalidade: "Custeio Faixa 3",
            fonte: "RO - Recursos Obrigatórios",
            prazoMeses: 24,
            taxaSingular: 1.00,
            taxaAssociado: 1.00
        },

        PRONAF_CUSTEIO_FAIXA_4: {
            beneficiario: "PF/PJ",
            linha: "Pronaf",
            finalidade: "Custeio Faixa 4¹",
            fonte: "RO - Recursos Obrigatórios",
            prazoMeses: 24,
            taxaSingular: 7.50,
            taxaAssociado: 7.50
        },

        PRONAF_CUSTEIO_AGROINDUSTRIA: {
            beneficiario: "PF/PJ",
            linha: "Pronaf",
            finalidade: "Custeio Agroindústria",
            fonte: "RO - Recursos Obrigatórios",
            prazoMeses: 12,
            taxaSingular: 7.50,
            taxaAssociado: 7.50
        },

        PRONAF_INDUSTRIALIZACAO: {
            beneficiario: "PF/PJ",
            linha: "Pronaf",
            finalidade: "Industrialização",
            fonte: "RO - Recursos Obrigatórios",
            prazoMeses: 12,
            taxaSingular: 7.50,
            taxaAssociado: 7.50
        },

        PRONAF_INVESTIMENTO_FAIXA_1: {
            beneficiario: "PF/PJ",
            linha: "Pronaf",
            finalidade: "Investimento Faixa 1",
            fonte: "LCA (Controlado)",
            prazoMeses: 120,
            taxaSingular: 2.00,
            taxaAssociado: 2.00
        },

        PRONAF_INVESTIMENTO_FAIXA_2: {
            beneficiario: "PF/PJ",
            linha: "Pronaf",
            finalidade: "Investimento Faixa 2",
            fonte: "LCA (Controlado)",
            prazoMeses: 120,
            taxaSingular: 7.50,
            taxaAssociado: 7.50
        },

        PRONAF_INVESTIMENTO_FAIXA_3: {
            beneficiario: "PF/PJ",
            linha: "Pronaf",
            finalidade: "Investimento Faixa 3",
            fonte: "LCA (Controlado)",
            prazoMeses: 120,
            taxaSingular: 1.50,
            taxaAssociado: 1.50
        },

        PRONAF_TRATORES_COLHEITADEIRAS: {
            beneficiario: "PF/PJ",
            linha: "Pronaf",
            finalidade: "Tratores e Colheitadeiras",
            fonte: "LCA (Controlado)",
            prazoMeses: 84,
            taxaSingular: 5.00,
            taxaAssociado: 5.00
        },

        PRONAF_AQUISICAO_MATRIZES: {
            beneficiario: "PF/PJ",
            linha: "Pronaf",
            finalidade: "Aquisição de Matrizes",
            fonte: "LCA (Controlado)",
            prazoMeses: 96,
            taxaSingular: 7.50,
            taxaAssociado: 7.50
        },

        PRONAF_CAMIONETES_MOTOS: {
            beneficiario: "PF/PJ",
            linha: "Pronaf",
            finalidade: "Camionetes e Motos",
            fonte: "LCA (Controlado)",
            prazoMeses: 60,
            taxaSingular: 7.50,
            taxaAssociado: 7.50
        },

        /* =====================================================
           PRONAMP
           ===================================================== */

        PRONAMP_CUSTEIO: {
            beneficiario: "PF/PJ",
            linha: "Pronamp",
            finalidade: "Custeio",
            fonte: "RO - Recursos Obrigatórios",
            prazoMeses: 24,
            taxaSingular: 9.00,
            taxaAssociado: 9.00
        },

        PRONAMP_INVESTIMENTO: {
            beneficiario: "PF/PJ",
            linha: "Pronamp",
            finalidade: "Investimento",
            fonte: "LCA (Controlado)",
            prazoMeses: 96,
            taxaSingular: 9.00,
            taxaAssociado: 9.00
        },

        PRONAMP_MODERFROTA_PRONAMP: {
            beneficiario: "PF/PJ",
            linha: "Pronamp",
            finalidade: "Moderfrota Pronamp",
            fonte: "LCA (Controlado)",
            prazoMeses: 96,
            taxaSingular: 11.50,
            taxaAssociado: 11.50
        },

        /* =====================================================
           DEMAIS PRODUTORES
           ===================================================== */

        DEMAIS_PRODUTORES_CUSTEIO: {
            beneficiario: "PF/PJ",
            linha: "Demais Produtores",
            finalidade: "Custeio",
            fonte: "LCA (Controlado)",
            prazoMeses: 14,
            taxaSingular: 12.50,
            taxaAssociado: 12.50
        },

        DEMAIS_PRODUTORES_FEE: {
            beneficiario: "PF/PJ",
            linha: "Demais Produtores",
            finalidade: "FEE",
            fonte: "LCA (Controlado)",
            prazoMeses: 8,
            taxaSingular: 12.50,
            taxaAssociado: 12.50
        },

        DEMAIS_PRODUTORES_INDUSTRIALIZACAO: {
            beneficiario: "PF/PJ",
            linha: "Demais Produtores",
            finalidade: "Industrialização",
            fonte: "RO - Recursos Obrigatórios",
            prazoMeses: 12,
            taxaSingular: 12.50,
            taxaAssociado: 12.50
        },

        DEMAIS_PRODUTORES_INVESTIMENTO: {
            beneficiario: "PF/PJ",
            linha: "Demais Produtores",
            finalidade: "Investimento",
            fonte: "LCA (Controlado)",
            prazoMeses: 144,
            taxaSingular: 11.50,
            taxaAssociado: 11.50
        },

        /* =====================================================
           PROIRRIGA
           ===================================================== */

        PROIRRIGA_INVESTIMENTO: {
            beneficiario: "PF/PJ",
            linha: "Proirriga",
            finalidade: "Investimento",
            fonte: "LCA (Controlado)",
            prazoMeses: 120,
            taxaSingular: 11.50,
            taxaAssociado: 11.50
        },

        /* =====================================================
           MODERFROTA
           ===================================================== */

        MODERFROTA_INVESTIMENTO: {
            beneficiario: "PF/PJ",
            linha: "Moderfrota",
            finalidade: "Investimento",
            fonte: "LCA (Controlado)",
            prazoMeses: 84,
            taxaSingular: 12.50,
            taxaAssociado: 12.50
        },

        /* =====================================================
           RENOVAGRO
           ===================================================== */

        RENOVAGRO_DEMAIS_INVESTIMENTO: {
            beneficiario: "PF/PJ",
            linha: "Renovagro-Demais",
            finalidade: "Investimento",
            fonte: "LCA (Controlado)",
            prazoMeses: 144,
            taxaSingular: 9.50,
            taxaAssociado: 9.50
        },

        RENOVAGRO_RECUPERACAO_PASTAGENS_INVESTIMENTO: {
            beneficiario: "PF/PJ",
            linha: "Renovagro-Recuperação Pastagens",
            finalidade: "Investimento",
            fonte: "LCA (Controlado)",
            prazoMeses: 120,
            taxaSingular: 8.50,
            taxaAssociado: 8.50
        },

        /* =====================================================
           PCA
           ===================================================== */

        PCA_ATE_12MIL_TONELADAS_INVESTIMENTO: {
            beneficiario: "PF/PJ",
            linha: "PCA até 12mil toneladas",
            finalidade: "Investimento",
            fonte: "LCA (Controlado)",
            prazoMeses: 120,
            taxaSingular: 8.00,
            taxaAssociado: 8.00
        },

        /* =====================================================
           COOPERATIVAS
           ===================================================== */

        COOPERATIVAS_PRODUCAO_CUSTEIO: {
            beneficiario: "Cooperativas",
            linha: "Cooperativas de Produção",
            finalidade: "Custeio",
            fonte: "LCA (Controlado)",
            prazoMeses: 24,
            taxaSingular: 12.50,
            taxaAssociado: 12.50
        },

        COOPERATIVAS_PRODUCAO_COMERCIALIZACAO: {
            beneficiario: "Cooperativas",
            linha: "Cooperativas de Produção",
            finalidade: "Comercialização",
            fonte: "LCA (Controlado)",
            prazoMeses: 8,
            taxaSingular: 12.50,
            taxaAssociado: 12.50
        },

        COOPERATIVAS_PRODUCAO_INDUSTRIALIZACAO: {
            beneficiario: "Cooperativas",
            linha: "Cooperativas de Produção",
            finalidade: "Industrialização",
            fonte: "RO - Recursos Obrigatórios",
            prazoMeses: 12,
            taxaSingular: 12.50,
            taxaAssociado: 12.50
        },

        /* =====================================================
           FUNCAFÉ
           ===================================================== */

        FUNCAFE_AQUISICAO_CAFE_COOPERATIVA: {
            beneficiario: "Produtor de Café",
            linha: "Funcafé",
            finalidade: "Aquisição de Café - Cooperativa",
            fonte: "Funcafé",
            prazoMeses: 12,
            taxaSingular: 11.00,
            taxaAssociado: 13.00
        },

        FUNCAFE_AQUISICAO_CAFE_INDUSTRIA: {
            beneficiario: "Produtor de Café",
            linha: "Funcafé",
            finalidade: "Aquisição de Café - Industria",
            fonte: "Funcafé",
            prazoMeses: 12,
            taxaSingular: 11.00,
            taxaAssociado: 13.00
        },

        FUNCAFE_CAPITAL_GIRO: {
            beneficiario: "Produtor de Café",
            linha: "Funcafé",
            finalidade: "Capital Giro",
            fonte: "Funcafé",
            prazoMeses: 24,
            taxaSingular: 11.00,
            taxaAssociado: 13.00
        },

        FUNCAFE_CUSTEIO: {
            beneficiario: "Produtor de Café",
            linha: "Funcafé",
            finalidade: "Custeio",
            fonte: "Funcafé",
            prazoMeses: 14,
            taxaSingular: 9.49,
            taxaAssociado: 11.50
        },

        FUNCAFE_COMERCIALIZACAO: {
            beneficiario: "Produtor de Café",
            linha: "Funcafé",
            finalidade: "Comercialização",
            fonte: "Funcafé",
            prazoMeses: 12,
            taxaSingular: 9.49,
            taxaAssociado: 11.50
        },

        FUNCAFE_RECUPERACAO_DECOTE: {
            beneficiario: "Produtor de Café",
            linha: "Funcafé",
            finalidade: "Recuperação - Decote",
            fonte: "Funcafé",
            prazoMeses: 24,
            taxaSingular: 9.49,
            taxaAssociado: 11.50
        },

        FUNCAFE_RECUPERACAO_ESQUELETAMENTO: {
            beneficiario: "Produtor de Café",
            linha: "Funcafé",
            finalidade: "Recuperação - Esqueletamento",
            fonte: "Funcafé",
            prazoMeses: 36,
            taxaSingular: 9.49,
            taxaAssociado: 11.50
        },

        FUNCAFE_RECUPERACAO_RECEPA: {
            beneficiario: "Produtor de Café",
            linha: "Funcafé",
            finalidade: "Recuperação - Recepa",
            fonte: "Funcafé",
            prazoMeses: 72,
            taxaSingular: 9.49,
            taxaAssociado: 11.50
        },

        FUNCAFE_RECUPERACAO_ARRANQUIO: {
            beneficiario: "Produtor de Café",
            linha: "Funcafé",
            finalidade: "Recuperação - Arranquio",
            fonte: "Funcafé",
            prazoMeses: 96,
            taxaSingular: 9.49,
            taxaAssociado: 11.50
        }
    };

    /*
     * =========================================================
     * ALIASES DAS CHAVES ANTIGAS DA BASE ASTEC
     * =========================================================
     *
     * NÃO É NECESSÁRIO ALTERAR ESTE BLOCO PARA MUDAR TAXAS.
     *
     * Ele existe apenas para manter compatibilidade entre
     * as chaves originalmente gravadas na base compactada
     * e as chaves atuais do PARAMETROS_CREDITO_RURAL.
     */

    const ALIASES_PARAMETROS_CREDITO_RURAL = Object.freeze({

        PRONAF_TRATORES_E_COLHEITADEIRAS:
            "PRONAF_TRATORES_COLHEITADEIRAS",

        PRONAF_AQUISICAO_DE_MATRIZES:
            "PRONAF_AQUISICAO_MATRIZES",

        PRONAF_CAMIONETES_E_MOTOS:
            "PRONAF_CAMIONETES_MOTOS",

        COOPERATIVAS_DE_PRODUCAO_CUSTEIO:
            "COOPERATIVAS_PRODUCAO_CUSTEIO",

        COOPERATIVAS_DE_PRODUCAO_COMERCIALIZACAO:
            "COOPERATIVAS_PRODUCAO_COMERCIALIZACAO",

        COOPERATIVAS_DE_PRODUCAO_INDUSTRIALIZACAO:
            "COOPERATIVAS_PRODUCAO_INDUSTRIALIZACAO",

        FUNCAFE_AQUISICAO_DE_CAFE_COOPERATIVA:
            "FUNCAFE_AQUISICAO_CAFE_COOPERATIVA",

        FUNCAFE_AQUISICAO_DE_CAFE_INDUSTRIA:
            "FUNCAFE_AQUISICAO_CAFE_INDUSTRIA"
    });

    window.PARAMETROS_CREDITO_RURAL =
        PARAMETROS_CREDITO_RURAL;

    /*
     * =========================================================
     * BASE ASTEC EMBARCADA
     * =========================================================
     *
     * 1.110 enquadramentos.
     *
     * Linha, finalidade financeira, fonte, prazo e taxas
     * são resolvidos por PARAMETROS_CREDITO_RURAL.
     *
     * NÃO ALTERAR ESTE BLOCO PARA MUDAR TAXA, PRAZO OU FONTE.
     */

    const BASE_DADOS_GZIP_BASE64 =
        "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";

    let dadosInternos = null;
    let registros = null;
    let carregada = false;
    let carregando = null;

    const limparValor = valor =>
        String(valor ?? "")
            .replace(/\r/g, "")
            .trim();

    function normalizarTexto(valor) {
        return String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim();
    }

    function indice36(valor) {
        const numero =
            parseInt(
                String(valor || "0"),
                36
            );

        return Number.isFinite(numero)
            ? numero
            : 0;
    }

    function percentualTexto(valor) {
        if (
            valor === null ||
            valor === undefined ||
            valor === ""
        ) {
            return "";
        }

        const numero =
            Number(valor);

        if (!Number.isFinite(numero)) {
            return "";
        }

        return (
            numero.toLocaleString(
                "pt-BR",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            ) +
            "%"
        );
    }

    /* =========================================================
       RESOLUÇÃO DOS PARÂMETROS
       ========================================================= */

    function resolverChaveParametro(chave) {
        const valor =
            limparValor(chave);

        if (!valor) {
            return "";
        }

        return (
            ALIASES_PARAMETROS_CREDITO_RURAL[
            valor
            ] ||
            valor
        );
    }

    function obterParametro(chave) {
        const chaveResolvida =
            resolverChaveParametro(
                chave
            );

        if (!chaveResolvida) {
            return null;
        }

        return (
            PARAMETROS_CREDITO_RURAL[
            chaveResolvida
            ] ||
            null
        );
    }

    function listarParametros() {
        return Object.entries(
            PARAMETROS_CREDITO_RURAL
        ).map(
            (
                [
                    chave,
                    parametro
                ]
            ) => ({
                chave,
                ...parametro,

                taxaSingularTexto:
                    percentualTexto(
                        parametro.taxaSingular
                    ),

                taxaAssociadoTexto:
                    percentualTexto(
                        parametro.taxaAssociado
                    )
            })
        );
    }

    function atualizarParametro(
        chave,
        alteracoes = {}
    ) {
        const chaveResolvida =
            resolverChaveParametro(
                chave
            );

        const parametro =
            obterParametro(
                chaveResolvida
            );

        if (!parametro) {
            throw new Error(
                `Parâmetro de Crédito Rural não cadastrado: ${chave}`
            );
        }

        const camposPermitidos = [
            "beneficiario",
            "linha",
            "finalidade",
            "fonte",
            "prazoMeses",
            "taxaSingular",
            "taxaAssociado"
        ];

        for (
            const campo of
            Object.keys(alteracoes)
        ) {
            if (
                !camposPermitidos.includes(
                    campo
                )
            ) {
                throw new Error(
                    `Campo não permitido em PARAMETROS_CREDITO_RURAL: ${campo}`
                );
            }

            const valor =
                alteracoes[campo];

            if (
                [
                    "prazoMeses",
                    "taxaSingular",
                    "taxaAssociado"
                ].includes(campo) &&
                valor !== null
            ) {
                const numero =
                    Number(valor);

                if (
                    !Number.isFinite(numero) ||
                    numero < 0
                ) {
                    throw new Error(
                        `${campo} deve ser um número maior ou igual a zero.`
                    );
                }

                parametro[campo] =
                    numero;
            } else {
                parametro[campo] =
                    valor;
            }
        }

        return {
            chave:
                chaveResolvida,

            ...parametro,

            taxaSingularTexto:
                percentualTexto(
                    parametro.taxaSingular
                ),

            taxaAssociadoTexto:
                percentualTexto(
                    parametro.taxaAssociado
                )
        };
    }

    function atualizarTaxa(
        chave,
        taxaSingular,
        taxaAssociado
    ) {
        return atualizarParametro(
            chave,
            {
                taxaSingular,
                taxaAssociado
            }
        );
    }

    /* =========================================================
       DESCOMPACTAÇÃO DA BASE ASTEC
       ========================================================= */

    async function descompactarDados() {
        if (dadosInternos) {
            return dadosInternos;
        }

        if (
            typeof DecompressionStream ===
            "undefined"
        ) {
            throw new Error(
                "O navegador não possui suporte a DecompressionStream. Utilize uma versão atual do Chrome ou Microsoft Edge."
            );
        }

        try {
            const binario =
                atob(
                    BASE_DADOS_GZIP_BASE64
                );

            const bytes =
                new Uint8Array(
                    binario.length
                );

            for (
                let i = 0;
                i < binario.length;
                i++
            ) {
                bytes[i] =
                    binario.charCodeAt(i);
            }

            const fluxoCompactado =
                new Blob(
                    [
                        bytes
                    ],
                    {
                        type: "application/gzip"
                    }
                )
                    .stream();

            const fluxoDescompactado =
                fluxoCompactado
                    .pipeThrough(
                        new DecompressionStream(
                            "gzip"
                        )
                    );

            const leitor =
                fluxoDescompactado
                    .getReader();

            const decodificador =
                new TextDecoder(
                    "utf-8"
                );

            let texto =
                "";

            while (true) {
                const {
                    value,
                    done
                } =
                    await leitor.read();

                if (done) {
                    break;
                }

                texto +=
                    decodificador.decode(
                        value,
                        {
                            stream: true
                        }
                    );
            }

            texto +=
                decodificador.decode();

            if (
                !texto ||
                !texto.trim()
            ) {
                throw new Error(
                    "A base de Crédito Rural foi descompactada, mas não retornou conteúdo."
                );
            }

            dadosInternos =
                JSON.parse(
                    texto
                );

            if (
                !dadosInternos ||
                typeof dadosInternos !==
                "object"
            ) {
                throw new Error(
                    "A base de Crédito Rural descompactada possui formato inválido."
                );
            }

            return dadosInternos;
        } catch (
        erro
        ) {
            console.error(
                "[Crédito Rural] Erro ao descompactar a base ASTEC:",
                erro
            );

            throw new Error(
                `Falha ao descompactar a base interna de Crédito Rural: ${erro &&
                    erro.message
                    ? erro.message
                    : String(
                        erro
                    )
                }`
            );
        }
    }

    /* =========================================================
       CRIAÇÃO DAS REGRAS
       ========================================================= */

    function criarLinhaRegra(
        regra,
        numero
    ) {
        /*
         * Compatibilidade com todas as versões da base:
         *
         * regra.parametro
         * regra.chaveParametro
         * regra.chaveTaxa
         *
         * chaveTaxa era utilizada na estrutura anterior.
         */

        const chaveParametroOriginal =
            regra.parametro ||
            regra.chaveParametro ||
            regra.chaveTaxa ||
            "";

        const chaveParametro =
            resolverChaveParametro(
                chaveParametroOriginal
            );

        function parametroAtual() {
            return obterParametro(
                chaveParametro
            );
        }

        return Object.freeze({
            numero,

            chave:
                regra.chave ||
                "",

            chaveParametro,

            /*
             * Mantido para compatibilidade com código antigo.
             */
            chaveTaxa:
                chaveParametro,

            get beneficiario() {
                const parametro =
                    parametroAtual();

                return (
                    parametro?.beneficiario ||
                    regra.beneficiario ||
                    ""
                );
            },

            get linha() {
                const parametro =
                    parametroAtual();

                return (
                    parametro?.linha ||
                    regra.linha ||
                    ""
                );
            },

            get finalidade() {
                const parametro =
                    parametroAtual();

                return (
                    parametro?.finalidade ||
                    regra.finalidade ||
                    ""
                );
            },

            get fonte() {
                const parametro =
                    parametroAtual();

                return (
                    parametro?.fonte ||
                    regra.fonte ||
                    ""
                );
            },

            get prazo() {
                const parametro =
                    parametroAtual();

                if (
                    parametro &&
                    parametro.prazoMeses !==
                    undefined &&
                    parametro.prazoMeses !==
                    null
                ) {
                    return parametro.prazoMeses;
                }

                return (
                    regra.prazo ??
                    regra.prazoMeses ??
                    null
                );
            },

            get prazoMeses() {
                return this.prazo;
            },

            get taxaSingular() {
                const parametro =
                    parametroAtual();

                if (
                    parametro &&
                    parametro.taxaSingular !==
                    undefined &&
                    parametro.taxaSingular !==
                    null
                ) {
                    return parametro.taxaSingular;
                }

                return (
                    regra.taxaSingular ??
                    null
                );
            },

            get taxaAssociado() {
                const parametro =
                    parametroAtual();

                if (
                    parametro &&
                    parametro.taxaAssociado !==
                    undefined &&
                    parametro.taxaAssociado !==
                    null
                ) {
                    return parametro.taxaAssociado;
                }

                return (
                    regra.taxaAssociado ??
                    null
                );
            },

            get taxaSingularTexto() {
                return percentualTexto(
                    this.taxaSingular
                );
            },

            get taxaAssociadoTexto() {
                return percentualTexto(
                    this.taxaAssociado
                );
            },

            aplicabilidade:
                regra.aplicabilidade ||
                "",

            condicao:
                regra.condicao ||
                "",

            fonteRegra:
                regra.fonteRegra ||
                ""
        });
    }

    /* =========================================================
       MONTAGEM DOS 1.110 ENQUADRAMENTOS
       ========================================================= */

    async function montarRegistros() {
        if (registros) {
            return registros;
        }

        const dados =
            await descompactarDados();

        registros =
            Object.freeze(
                dados.base
                    .split("\n")
                    .filter(Boolean)
                    .map(
                        (
                            linha,
                            id
                        ) => {
                            const partes =
                                linha.split(
                                    "~"
                                );

                            const regras =
                                String(
                                    partes[10] ||
                                    ""
                                )
                                    .split(".")
                                    .filter(Boolean)
                                    .map(
                                        indice36
                                    );

                            return Object.freeze({
                                id:
                                    String(id),

                                codigo:
                                    partes[0] ||
                                    "",

                                produto:
                                    dados.produtos[
                                    indice36(
                                        partes[1]
                                    )
                                    ] || "",

                                finalidade:
                                    dados.finalidades[
                                    indice36(
                                        partes[2]
                                    )
                                    ] || "",

                                modalidade:
                                    dados.modalidades[
                                    indice36(
                                        partes[3]
                                    )
                                    ] || "",

                                variedade:
                                    dados.variedades[
                                    indice36(
                                        partes[4]
                                    )
                                    ] || "",

                                cesta:
                                    dados.cestas[
                                    indice36(
                                        partes[5]
                                    )
                                    ] || "",

                                consorcio:
                                    dados.consorcios[
                                    indice36(
                                        partes[6]
                                    )
                                    ] || "",

                                unidadeProducao:
                                    dados.unidades[
                                    indice36(
                                        partes[7]
                                    )
                                    ] || "",

                                zoneamento:
                                    dados.zoneamentos[
                                    indice36(
                                        partes[8]
                                    )
                                    ] || "",

                                abaOrigem:
                                    dados.abas[
                                    indice36(
                                        partes[9]
                                    )
                                    ] || "",

                                linhas:
                                    Object.freeze(
                                        regras.map(
                                            (
                                                indiceRegra,
                                                posicao
                                            ) =>
                                                criarLinhaRegra(
                                                    dados.catalogo[
                                                    indiceRegra
                                                    ],
                                                    posicao + 1
                                                )
                                        )
                                    )
                            });
                        }
                    )
            );

        return registros;
    }

    /* =========================================================
       CARREGAMENTO
       ========================================================= */

    async function carregar() {
        if (carregada) {
            return registros;
        }

        if (carregando) {
            return carregando;
        }

        carregando =
            (
                async () => {
                    const base =
                        await montarRegistros();

                    carregada =
                        true;

                    return base;
                }
            )();

        try {
            return await carregando;
        } finally {
            carregando =
                null;
        }
    }

    function garantirCarregada() {
        if (!carregada) {
            throw new Error(
                "A base de Crédito Rural ainda não foi carregada."
            );
        }
    }

    /* =========================================================
       FINALIDADES ASTEC
       ========================================================= */

    function listarFinalidades() {
        garantirCarregada();

        const ordem = [
            "Custeio Agrícola",
            "Custeio Pecuário",
            "Investimento"
        ];

        return [
            ...new Set(
                registros
                    .map(
                        registro =>
                            registro.finalidade
                    )
                    .filter(Boolean)
            )
        ].sort(
            (
                a,
                b
            ) => {
                const ia =
                    ordem.indexOf(a);

                const ib =
                    ordem.indexOf(b);

                if (
                    ia !== -1 ||
                    ib !== -1
                ) {
                    if (ia === -1) {
                        return 1;
                    }

                    if (ib === -1) {
                        return -1;
                    }

                    return ia - ib;
                }

                return a.localeCompare(
                    b,
                    "pt-BR"
                );
            }
        );
    }

    /* =========================================================
       PRODUTOS ASTEC
       ========================================================= */

    function listarProdutos(
        finalidade
    ) {
        garantirCarregada();

        return [
            ...new Set(
                registros
                    .filter(
                        registro =>
                            registro.finalidade ===
                            finalidade
                    )
                    .map(
                        registro =>
                            registro.produto
                    )
                    .filter(Boolean)
            )
        ].sort(
            (
                a,
                b
            ) =>
                a.localeCompare(
                    b,
                    "pt-BR"
                )
        );
    }

    /* =========================================================
       ENQUADRAMENTOS
       ========================================================= */

    function listarEnquadramentos(
        finalidade,
        produto
    ) {
        garantirCarregada();

        return registros.filter(
            registro =>
                registro.finalidade ===
                finalidade &&
                registro.produto ===
                produto
        );
    }

    function obterEnquadramento(
        id
    ) {
        garantirCarregada();

        return (
            registros.find(
                registro =>
                    registro.id ===
                    String(id)
            ) ||
            null
        );
    }

    function obterLinha(
        enquadramentoId,
        indiceLinha
    ) {
        const enquadramento =
            obterEnquadramento(
                enquadramentoId
            );

        if (!enquadramento) {
            return null;
        }

        const indice =
            Number(
                indiceLinha
            );

        if (
            !Number.isInteger(indice) ||
            indice < 0
        ) {
            return null;
        }

        return (
            enquadramento.linhas[
            indice
            ] ||
            null
        );
    }

    /* =========================================================
       DESCRIÇÃO DOS ENQUADRAMENTOS
       ========================================================= */

    function resumirTexto(
        texto,
        tamanho = 70
    ) {
        const valor =
            limparValor(
                texto
            );

        return (
            valor.length <= tamanho
                ? valor
                : (
                    valor.slice(
                        0,
                        tamanho - 3
                    ) +
                    "..."
                )
        );
    }

    function valorAplicavel(
        valor
    ) {
        const normalizado =
            normalizarTexto(
                valor
            );

        return (
            normalizado &&
            ![
                "nao se aplica",
                "nao e aplicavel"
            ].includes(
                normalizado
            )
        );
    }

    function montarDescricaoEnquadramento(
        item,
        mostrarCodigo = true
    ) {
        const partes = [];

        if (
            mostrarCodigo &&
            item.codigo
        ) {
            partes.push(
                `Código ${item.codigo}`
            );
        }

        if (item.modalidade) {
            partes.push(
                resumirTexto(
                    item.modalidade,
                    55
                )
            );
        }

        if (
            valorAplicavel(
                item.variedade
            )
        ) {
            partes.push(
                resumirTexto(
                    item.variedade,
                    70
                )
            );
        }

        if (
            valorAplicavel(
                item.consorcio
            )
        ) {
            partes.push(
                item.consorcio
            );
        }

        if (
            valorAplicavel(
                item.zoneamento
            )
        ) {
            partes.push(
                item.zoneamento
            );
        }

        return partes.join(
            " | "
        );
    }

    /* =========================================================
       SELECT - FINALIDADES
       ========================================================= */

    function preencherFinalidades(
        select,
        selecionada = ""
    ) {
        if (!select) {
            return;
        }

        select.innerHTML =
            "";

        for (
            const nome of
            listarFinalidades()
        ) {
            const option =
                new Option(
                    nome,
                    nome
                );

            if (
                nome ===
                selecionada
            ) {
                option.selected =
                    true;
            }

            select.appendChild(
                option
            );
        }
    }

    /* =========================================================
       SELECT - PRODUTOS
       ========================================================= */

    function preencherProdutos(
        select,
        finalidade,
        selecionado = ""
    ) {
        if (!select) {
            return;
        }

        select.innerHTML =
            "";

        for (
            const nome of
            listarProdutos(
                finalidade
            )
        ) {
            const option =
                new Option(
                    nome,
                    nome
                );

            if (
                nome ===
                selecionado
            ) {
                option.selected =
                    true;
            }

            select.appendChild(
                option
            );
        }
    }

    /* =========================================================
       SELECT - ENQUADRAMENTOS
       ========================================================= */

    function preencherEnquadramentos(
        select,
        finalidade,
        produto,
        selecionado = ""
    ) {
        if (!select) {
            return [];
        }

        const lista =
            listarEnquadramentos(
                finalidade,
                produto
            );

        select.innerHTML =
            "";

        for (
            const item of
            lista
        ) {
            const option =
                new Option(
                    montarDescricaoEnquadramento(
                        item,
                        true
                    ),
                    item.id
                );

            if (
                item.id ===
                String(selecionado)
            ) {
                option.selected =
                    true;
            }

            select.appendChild(
                option
            );
        }

        select.disabled =
            lista.length <= 1;

        return lista;
    }

    /* =========================================================
       INFORMAÇÕES DA BASE
       ========================================================= */

    function obterUrlBase() {
        return ORIGEM_BASE_CREDITO_RURAL;
    }

    function obterQuantidadeRegistros() {
        return registros
            ? registros.length
            : 1110;
    }

    function obterCatalogoRegras() {
        return dadosInternos
            ? dadosInternos.catalogo
            : [];
    }

    /* =========================================================
       VALIDAÇÃO DOS PARÂMETROS UTILIZADOS PELA BASE
       ========================================================= */

    async function validarParametros() {
        const dados =
            await descompactarDados();

        const encontrados =
            new Set();

        const ausentes =
            new Set();

        for (
            const regra of
            dados.catalogo || []
        ) {
            const chaveOriginal =
                regra.parametro ||
                regra.chaveParametro ||
                regra.chaveTaxa ||
                "";

            if (!chaveOriginal) {
                continue;
            }

            const chaveResolvida =
                resolverChaveParametro(
                    chaveOriginal
                );

            encontrados.add(
                chaveResolvida
            );

            if (
                !PARAMETROS_CREDITO_RURAL[
                chaveResolvida
                ]
            ) {
                ausentes.add(
                    chaveResolvida
                );
            }
        }

        return {
            valido:
                ausentes.size === 0,

            quantidadeParametrosUtilizados:
                encontrados.size,

            parametrosUtilizados:
                [
                    ...encontrados
                ].sort(),

            parametrosAusentes:
                [
                    ...ausentes
                ].sort()
        };
    }

    /* =========================================================
       API PÚBLICA
       ========================================================= */

    window.CreditoRuralBase =
        Object.freeze({
            carregar,

            listarFinalidades,
            listarProdutos,
            listarEnquadramentos,

            obterEnquadramento,
            obterLinha,

            preencherFinalidades,
            preencherProdutos,
            preencherEnquadramentos,

            montarDescricaoEnquadramento,

            normalizarTexto,

            obterUrlBase,
            obterQuantidadeRegistros,
            obterCatalogoRegras,

            resolverChaveParametro,
            obterParametro,
            listarParametros,

            atualizarParametro,
            atualizarTaxa,

            validarParametros
        });

})();