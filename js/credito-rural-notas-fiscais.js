(function () {
    "use strict";

    /* =========================================================
       MODELOS
    ========================================================= */

    const MODELOS = Object.freeze({
        XML_NFE: "xml_nfe",
        NFE: "nfe",
        NFSE: "nfse",
        PRODUTOR_ANTIGA: "produtor_antiga",
        GENERICA: "generica"
    });

    /* =========================================================
       CONSTANTES
    ========================================================= */

    const QUALIDADE_MINIMA_DANFE = 45;
    const TAMANHO_CHAVE_NFE = 44;

    /* =========================================================
       NORMALIZAÇÃO
    ========================================================= */

    function normalizar(texto) {
        return String(texto || "")
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .replace(/[ \t]+/g, " ")
            .replace(/\n[ \t]+/g, "\n")
            .replace(/[ \t]+\n/g, "\n")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
    }

    function comparacao(texto) {
        return String(texto || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toUpperCase()
            .replace(/\s+/g, " ")
            .trim();
    }

    /* =========================================================
       IDENTIFICA MODELO
    ========================================================= */

    function identificarModelo(texto) {
        const t = comparacao(texto);

        if (
            t.includes("NOTA FISCAL DE PRODUTOR")
        ) {
            return MODELOS.PRODUTOR_ANTIGA;
        }

        if (
            t.includes("DANFE") ||
            t.includes("CHAVE DE ACESSO") ||
            t.includes(
                "DOCUMENTO AUXILIAR DA NOTA FISCAL ELETRONICA"
            ) ||
            t.includes(
                "DOCUMENTO AUXILIAR DA NOTA FISCAL ELETRÔNICA"
            )
        ) {
            return MODELOS.NFE;
        }

        if (
            t.includes("NFS-E") ||
            t.includes("NFSE") ||
            t.includes(
                "NOTA FISCAL DE SERVICOS ELETRONICA"
            )
        ) {
            return MODELOS.NFSE;
        }

        return MODELOS.GENERICA;
    }

    /* =========================================================
       QUALIDADE DO TEXTO
    ========================================================= */

    function avaliarQualidadeTexto(texto) {
        const t = comparacao(texto);

        if (!t) {
            return 0;
        }

        let score = 0;

        const marcadores = [
            ["DANFE", 12],
            ["NOTA FISCAL", 8],
            ["CHAVE DE ACESSO", 12],
            ["EMISSAO", 8],
            ["DATA DE EMISSAO", 8],
            ["VALOR TOTAL", 8],
            ["VALOR TOTAL DA NOTA", 10],
            ["NCM", 10],
            ["CFOP", 10],
            ["DADOS DOS PRODUTOS", 10],
            ["PRODUTO", 5]
        ];

        marcadores.forEach(
            function (item) {
                if (
                    t.includes(
                        item[0]
                    )
                ) {
                    score +=
                        item[1];
                }
            }
        );

        if (
            extrairChave(texto)
                .length ===
            TAMANHO_CHAVE_NFE
        ) {
            score += 18;
        }

        if (
            t.length > 300
        ) {
            score += 5;
        }

        if (
            t.length > 800
        ) {
            score += 5;
        }

        if (
            t.length > 1500
        ) {
            score += 5;
        }

        return Math.min(
            100,
            score
        );
    }

    /* =========================================================
       XML - HELPERS
    ========================================================= */

    function locais(
        elemento,
        nome
    ) {
        if (
            !elemento ||
            typeof elemento
                .getElementsByTagName !==
            "function"
        ) {
            return [];
        }

        return Array.from(
            elemento
                .getElementsByTagName(
                    "*"
                )
        ).filter(
            function (item) {
                return (
                    item.localName ||
                    item.nodeName
                        .split(":")
                        .pop()
                ) === nome;
            }
        );
    }

    function local(
        elemento,
        nome
    ) {
        return (
            locais(
                elemento,
                nome
            )[0] ||
            null
        );
    }

    function xmlTexto(
        elemento,
        nome
    ) {
        return (
            local(
                elemento,
                nome
            )
                ?.textContent
                ?.trim() ||
            ""
        );
    }

    /* =========================================================
       XML - INTERPRETA NF-E
    ========================================================= */

    function interpretarXmlNfe(
        xmlOriginal,
        arquivo = ""
    ) {
        const doc =
            new DOMParser()
                .parseFromString(
                    xmlOriginal,
                    "application/xml"
                );

        if (
            doc.getElementsByTagName(
                "parsererror"
            ).length > 0
        ) {
            throw new Error(
                "XML inválido."
            );
        }

        const infNFe =
            local(
                doc,
                "infNFe"
            );

        if (!infNFe) {
            throw new Error(
                "O XML informado não contém uma estrutura NF-e válida."
            );
        }

        const ide =
            local(
                infNFe,
                "ide"
            ) ||
            local(
                doc,
                "ide"
            );

        const emit =
            local(
                infNFe,
                "emit"
            ) ||
            local(
                doc,
                "emit"
            );

        const dest =
            local(
                infNFe,
                "dest"
            ) ||
            local(
                doc,
                "dest"
            );

        const total =
            local(
                infNFe,
                "ICMSTot"
            ) ||
            local(
                doc,
                "ICMSTot"
            );

        const infProt =
            local(
                doc,
                "infProt"
            );

        const numero =
            xmlTexto(
                ide,
                "nNF"
            );

        const serie =
            xmlTexto(
                ide,
                "serie"
            );

        const data =
            converterDataXml(
                xmlTexto(
                    ide,
                    "dhEmi"
                ) ||
                xmlTexto(
                    ide,
                    "dEmi"
                )
            );

        const emitente =
            xmlTexto(
                emit,
                "xNome"
            );

        const destinatario =
            xmlTexto(
                dest,
                "xNome"
            );

        const valor =
            numeroJs(
                xmlTexto(
                    total,
                    "vNF"
                )
            );

        const chave =
            normalizarChaveAcesso(
                xmlTexto(
                    infProt,
                    "chNFe"
                ) ||
                infNFe
                    .getAttribute(
                        "Id"
                    )
                    ?.replace(
                        /^NFe/i,
                        ""
                    ) ||
                ""
            );

        const protocolo =
            xmlTexto(
                infProt,
                "nProt"
            );

        const statusAutorizacao =
            xmlTexto(
                infProt,
                "cStat"
            );

        const motivoStatus =
            xmlTexto(
                infProt,
                "xMotivo"
            );

        const itens =
            locais(
                infNFe,
                "det"
            ).map(
                function (
                    det
                ) {
                    const prod =
                        local(
                            det,
                            "prod"
                        );

                    return {
                        numeroItem:
                            det.getAttribute(
                                "nItem"
                            ) ||
                            "",

                        codigoProduto:
                            xmlTexto(
                                prod,
                                "cProd"
                            ),

                        gtin:
                            xmlTexto(
                                prod,
                                "cEAN"
                            ),

                        descricao:
                            xmlTexto(
                                prod,
                                "xProd"
                            ),

                        ncm:
                            normalizarNcm(
                                xmlTexto(
                                    prod,
                                    "NCM"
                                )
                            ),

                        cfop:
                            normalizarCfop(
                                xmlTexto(
                                    prod,
                                    "CFOP"
                                )
                            ),

                        unidade:
                            xmlTexto(
                                prod,
                                "uCom"
                            ),

                        quantidade:
                            numeroJs(
                                xmlTexto(
                                    prod,
                                    "qCom"
                                )
                            ),

                        valorUnitario:
                            numeroJs(
                                xmlTexto(
                                    prod,
                                    "vUnCom"
                                )
                            ),

                        valorProduto:
                            numeroJs(
                                xmlTexto(
                                    prod,
                                    "vProd"
                                )
                            )
                    };
                }
            );

        return montarResultado({
            arquivo:
                arquivo,

            modelo:
                MODELOS.XML_NFE,

            numero:
                numero,

            serie:
                serie,

            chaveAcesso:
                chave,

            protocolo:
                protocolo,

            statusAutorizacao:
                statusAutorizacao,

            motivoStatus:
                motivoStatus,

            data:
                data,

            emitente:
                emitente,

            destinatario:
                destinatario,

            valor:
                valor,

            itens:
                itens,

            qualidadeTexto:
                100,

            texto:
                xmlOriginal,

            origemEstruturada:
                true
        });
    }

    /* =========================================================
       DATA XML
    ========================================================= */

    function converterDataXml(
        valor
    ) {
        const match =
            String(
                valor || ""
            ).match(
                /^(\d{4})-(\d{2})-(\d{2})/
            );

        if (!match) {
            return null;
        }

        const resultado =
            `${match[3]}/${match[2]}/${match[1]}`;

        return validarData(
            resultado
        )
            ? resultado
            : null;
    }

    /* =========================================================
       TEXTO / DANFE / OCR
    ========================================================= */

    function interpretar(
        original,
        arquivo = ""
    ) {
        const texto =
            normalizar(
                original
            );

        const modelo =
            identificarModelo(
                texto
            );

        const numero =
            extrairNumero(
                texto,
                modelo
            );

        const serie =
            extrairSerie(
                texto
            );

        const data =
            extrairData(
                texto
            );

        const emitente =
            extrairEmitente(
                texto
            );

        const valor =
            extrairValor(
                texto
            );

        const chave =
            extrairChave(
                texto
            );

        const itens =
            extrairItens(
                texto,
                modelo
            );

        const qualidadeTexto =
            avaliarQualidadeTexto(
                texto
            );

        return montarResultado({
            arquivo:
                arquivo,

            modelo:
                modelo,

            numero:
                numero,

            serie:
                serie,

            chaveAcesso:
                chave,

            protocolo:
                "",

            statusAutorizacao:
                "",

            motivoStatus:
                "",

            data:
                data,

            emitente:
                emitente,

            destinatario:
                "",

            valor:
                valor,

            itens:
                itens,

            qualidadeTexto:
                qualidadeTexto,

            texto:
                original,

            origemEstruturada:
                false
        });
    }

    /* =========================================================
       MONTA RESULTADO FINAL
    ========================================================= */

    function montarResultado(
        dados
    ) {
        const itens =
            Array.isArray(
                dados.itens
            )
                ? dados.itens
                : [];

        const atividades =
            window
                .CreditoRuralNcmAtividades
                ?.consolidarAtividadesNota(
                    itens
                ) ||
            [];

        const possuiNumero =
            Boolean(
                String(
                    dados.numero ||
                    ""
                ).trim()
            );

        const possuiData =
            validarData(
                dados.data
            );

        const possuiValor =
            Number(
                dados.valor
            ) > 0;

        const chave =
            normalizarChaveAcesso(
                dados.chaveAcesso
            );

        const possuiChaveNfe =
            chave.length ===
            TAMANHO_CHAVE_NFE;

        const documentoCompleto =
            possuiNumero &&
            possuiData &&
            possuiValor;

        const nfe =
            dados.modelo ===
            MODELOS.NFE ||
            dados.modelo ===
            MODELOS.XML_NFE;

        const estruturaNfeReconhecida =
            Boolean(
                dados.origemEstruturada ||
                possuiChaveNfe ||
                (
                    nfe &&
                    Number(
                        dados
                            .qualidadeTexto
                    ) >=
                    QUALIDADE_MINIMA_DANFE
                )
            );

        const nfeLegivel =
            Boolean(
                nfe &&
                documentoCompleto &&
                estruturaNfeReconhecida
            );

        const antiga =
            dados.modelo ===
            MODELOS.PRODUTOR_ANTIGA;

        const generica =
            dados.modelo ===
            MODELOS.GENERICA;

        const nfse =
            dados.modelo ===
            MODELOS.NFSE;

        let requerConferenciaDocumento =
            false;

        if (nfe) {
            requerConferenciaDocumento =
                !nfeLegivel;
        } else if (antiga) {
            requerConferenciaDocumento =
                !documentoCompleto;
        } else if (
            generica ||
            nfse
        ) {
            requerConferenciaDocumento =
                !documentoCompleto;
        }

        const atividadesAutomaticas =
            atividades.filter(
                function (
                    item
                ) {
                    return (
                        item &&
                        item.automatico ===
                        true
                    );
                }
            );

        const atividadeAutomatica =
            atividadesAutomaticas.length >
            0;

        /*
         * Só utiliza atividades efetivamente
         * classificadas pelo motor.
         *
         * Atividades de baixa confiança podem continuar
         * sendo apresentadas como sugestão, mas não
         * devem gerar automaticamente renda.
         */
        const atividadesParaAlocacao =
            atividades.filter(
                function (
                    item
                ) {
                    return (
                        item &&
                        item.grupo &&
                        item.atividade &&
                        item.automatico ===
                        true
                    );
                }
            );

        const alocacoesAtividade =
            montarAlocacoesAtividade(
                atividadesParaAlocacao,
                itens,
                dados.valor
            );

        const status =
            definirStatusDocumento({
                modelo:
                    dados.modelo,

                requerConferenciaDocumento:
                    requerConferenciaDocumento,

                nfeLegivel:
                    nfeLegivel,

                origemEstruturada:
                    Boolean(
                        dados
                            .origemEstruturada
                    )
            });

        return {
            arquivo:
                dados.arquivo ||
                "",

            modelo:
                dados.modelo,

            modeloDescricao:
                descricaoModelo(
                    dados.modelo
                ),

            numero:
                dados.numero ||
                "",

            serie:
                dados.serie ||
                "",

            chaveAcesso:
                chave,

            protocolo:
                dados.protocolo ||
                "",

            statusAutorizacao:
                dados.statusAutorizacao ||
                "",

            motivoStatus:
                dados.motivoStatus ||
                "",

            data:
                possuiData
                    ? dados.data
                    : null,

            competencia:
                possuiData
                    ? competencia(
                        dados.data
                    )
                    : "",

            emitente:
                dados.emitente ||
                "",

            destinatario:
                dados.destinatario ||
                "",

            valor:
                possuiValor
                    ? Number(
                        dados.valor
                    )
                    : 0,

            itens:
                itens,

            atividadesSugeridas:
                atividades,

            atividadesAutomaticas:
                atividadesAutomaticas,

            alocacoesAtividade:
                alocacoesAtividade,

            atividadeAutomatica:
                atividadeAutomatica,

            documentoFiscalCompleto:
                documentoCompleto,

            estruturaNfeReconhecida:
                estruturaNfeReconhecida,

            nfeLegivel:
                nfeLegivel,

            requerConferenciaDocumento:
                requerConferenciaDocumento,

            /*
             * Compatibilidade com versões anteriores.
             *
             * Este campo representa apenas revisão
             * documental, não necessidade de selecionar
             * atividade.
             */
            requerConferencia:
                requerConferenciaDocumento,

            confirmadaDocumento:
                !requerConferenciaDocumento,

            confirmada:
                !requerConferenciaDocumento,

            status:
                status,

            qualidadeTexto:
                Number(
                    dados.qualidadeTexto
                ) || 0,

            texto:
                dados.texto ||
                ""
        };
    }

    /* =========================================================
       STATUS
    ========================================================= */

    function definirStatusDocumento(
        dados
    ) {
        if (
            dados
                .requerConferenciaDocumento
        ) {
            return "Revisar documento";
        }

        if (
            dados.modelo ===
            MODELOS.XML_NFE
        ) {
            return "XML NF-e identificado";
        }

        if (
            dados.modelo ===
            MODELOS.NFE &&
            dados.nfeLegivel
        ) {
            return "NF-e identificada";
        }

        if (
            dados.modelo ===
            MODELOS.PRODUTOR_ANTIGA
        ) {
            return "Nota de produtor identificada";
        }

        return "Documento identificado";
    }

    /* =========================================================
       ALOCAÇÃO AUTOMÁTICA
    ========================================================= */

    function montarAlocacoesAtividade(
        atividades,
        itens,
        valorNota
    ) {
        if (
            !Array.isArray(
                atividades
            ) ||
            atividades.length === 0
        ) {
            return [];
        }

        const valorTotalNota =
            Number(
                valorNota
            ) || 0;

        if (
            atividades.length ===
            1
        ) {
            return [{
                grupo:
                    atividades[0]
                        .grupo,

                atividade:
                    atividades[0]
                        .atividade,

                nomeAtividade:
                    atividades[0]
                        .nomeAtividade,

                valor:
                    valorTotalNota,

                valorProdutos:
                    Number(
                        atividades[0]
                            .valorProdutos
                    ) || 0,

                confianca:
                    Number(
                        atividades[0]
                            .confianca
                    ) || 0,

                automatico:
                    atividades[0]
                        .automatico ===
                    true,

                evidencias:
                    Array.isArray(
                        atividades[0]
                            .evidencias
                    )
                        ? [
                            ...atividades[0]
                                .evidencias
                        ]
                        : []
            }];
        }

        /*
         * Mais de uma atividade.
         *
         * A divisão só pode ser feita com segurança
         * quando o classificador conseguiu somar o
         * valor dos produtos de cada atividade.
         */
        const totalProdutos =
            atividades.reduce(
                function (
                    soma,
                    item
                ) {
                    return (
                        soma +
                        (
                            Number(
                                item
                                    .valorProdutos
                            ) || 0
                        )
                    );
                },
                0
            );

        if (
            totalProdutos <= 0
        ) {
            return [];
        }

        return atividades.map(
            function (
                item
            ) {
                const valorProdutos =
                    Number(
                        item
                            .valorProdutos
                    ) || 0;

                return {
                    grupo:
                        item.grupo,

                    atividade:
                        item.atividade,

                    nomeAtividade:
                        item
                            .nomeAtividade,

                    valor:
                        (
                            valorProdutos /
                            totalProdutos
                        ) *
                        valorTotalNota,

                    valorProdutos:
                        valorProdutos,

                    confianca:
                        Number(
                            item
                                .confianca
                        ) || 0,

                    automatico:
                        item.automatico ===
                        true,

                    evidencias:
                        Array.isArray(
                            item.evidencias
                        )
                            ? [
                                ...item
                                    .evidencias
                            ]
                            : []
                };
            }
        );
    }

    /* =========================================================
       EXTRAÇÃO DO NÚMERO
    ========================================================= */

    function extrairNumero(
        texto,
        modelo
    ) {
        const fonte =
            String(
                texto || ""
            );

        const padroes =
            modelo ===
                MODELOS.PRODUTOR_ANTIGA
                ? [
                    /NOTA\s+FISCAL\s+DE\s+PRODUTOR[\s\S]{0,120}?N[º°O.]?\s*[:.-]?\s*0*(\d{1,12})/i,
                    /\bN[º°]\s*[:.-]?\s*0*(\d{1,12})\b/i
                ]
                : [
                    /NF-?E[\s\S]{0,80}?N[º°O.]?\s*[:.-]?\s*0*(\d{1,12})/i,
                    /N[º°O.]?\s*[:.-]?\s*0*(\d{1,12})\s*(?:SERIE|S[ÉE]RIE)/i,
                    /(?:NOTA\s+FISCAL|NF-?E)[\s\S]{0,100}?\b0*(\d{1,12})\b/i
                ];

        for (
            const regex
            of padroes
        ) {
            const match =
                fonte.match(
                    regex
                );

            if (
                match?.[1]
            ) {
                return removerZerosEsquerda(
                    match[1]
                );
            }
        }

        return "";
    }

    function removerZerosEsquerda(
        valor
    ) {
        const texto =
            String(
                valor || ""
            )
                .replace(
                    /\D/g,
                    ""
                );

        if (!texto) {
            return "";
        }

        return (
            texto.replace(
                /^0+(?=\d)/,
                ""
            ) ||
            "0"
        );
    }

    /* =========================================================
       SÉRIE
    ========================================================= */

    function extrairSerie(
        texto
    ) {
        const padroes = [
            /S[ÉE]RIE\s*[:.-]?\s*0*(\d{1,4})/i,
            /SERIE\s*[:.-]?\s*0*(\d{1,4})/i
        ];

        for (
            const regex
            of padroes
        ) {
            const match =
                String(
                    texto || ""
                ).match(
                    regex
                );

            if (
                match?.[1]
            ) {
                return removerZerosEsquerda(
                    match[1]
                );
            }
        }

        return "";
    }

    /* =========================================================
       CHAVE DE ACESSO
    ========================================================= */

    function extrairChave(
        texto
    ) {
        const fonte =
            String(
                texto || ""
            );

        /*
         * Primeiro tenta encontrar a chave próxima
         * ao rótulo oficial.
         */
        const proximaRotulo =
            fonte.match(
                /CHAVE\s+DE\s+ACESSO[\s\S]{0,180}?((?:\d[\s.\-]*){44})/i
            );

        if (
            proximaRotulo?.[1]
        ) {
            const chave =
                normalizarChaveAcesso(
                    proximaRotulo[1]
                );

            if (
                chave.length ===
                TAMANHO_CHAVE_NFE
            ) {
                return chave;
            }
        }

        /*
         * Fallback:
         * procura grupos numéricos que totalizem
         * exatamente 44 dígitos.
         */
        const candidatos =
            fonte.match(
                /(?:\d[\s.\-]*){44}/g
            ) ||
            [];

        for (
            const candidato
            of candidatos
        ) {
            const chave =
                normalizarChaveAcesso(
                    candidato
                );

            if (
                chave.length ===
                TAMANHO_CHAVE_NFE
            ) {
                return chave;
            }
        }

        return "";
    }

    function normalizarChaveAcesso(
        valor
    ) {
        const chave =
            String(
                valor || ""
            ).replace(
                /\D/g,
                ""
            );

        return chave.length ===
            TAMANHO_CHAVE_NFE
            ? chave
            : "";
    }

    /* =========================================================
       DATA
    ========================================================= */

    function extrairData(
        texto
    ) {
        const fonte =
            String(
                texto || ""
            );

        const padroes = [
            /DATA\s+(?:DA|DE)\s+EMISS[AÃ]O[\s:.-]{0,20}(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/i,
            /EMISS[AÃ]O[\s:.-]{0,20}(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/i,
            /DATA\s+DE\s+EMISS[AÃ]O[\s\S]{0,60}?(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/i
        ];

        for (
            const regex
            of padroes
        ) {
            const match =
                fonte.match(
                    regex
                );

            if (
                match?.[1]
            ) {
                const data =
                    normalizarData(
                        match[1]
                    );

                if (
                    validarData(
                        data
                    )
                ) {
                    return data;
                }
            }
        }

        /*
         * Fallback somente para datas válidas.
         */
        const datas =
            fonte.match(
                /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g
            ) ||
            [];

        for (
            const candidato
            of datas
        ) {
            const data =
                normalizarData(
                    candidato
                );

            if (
                validarData(
                    data
                )
            ) {
                return data;
            }
        }

        return null;
    }

    /* =========================================================
       EMITENTE
    ========================================================= */

    function extrairEmitente(
        texto
    ) {
        const fonte =
            String(
                texto || ""
            );

        const recebido =
            fonte.match(
                /RECEBEMOS\s+DE\s+(.+?)\s+OS\s+PRODUTOS/i
            );

        if (
            recebido?.[1]
        ) {
            return limparRazaoSocial(
                recebido[1]
            );
        }

        const emitente =
            fonte.match(
                /(?:EMITENTE|REMETENTE)[\s\S]{0,120}?RAZ[AÃ]O\s+SOCIAL[\s:.-]+([^\n]+)/i
            );

        if (
            emitente?.[1]
        ) {
            return limparRazaoSocial(
                emitente[1]
            );
        }

        const razao =
            fonte.match(
                /RAZ[AÃ]O\s+SOCIAL[\s:.-]+([^\n]+)/i
            );

        if (
            razao?.[1]
        ) {
            return limparRazaoSocial(
                razao[1]
            );
        }

        return "";
    }

    function limparRazaoSocial(
        valor
    ) {
        return String(
            valor || ""
        )
            .replace(
                /\s+/g,
                " "
            )
            .replace(
                /\b(?:CNPJ|CPF|IE|INSCRI[CÇ][AÃ]O)\b.*$/i,
                ""
            )
            .trim()
            .substring(
                0,
                180
            );
    }

    /* =========================================================
       VALOR DA NOTA
    ========================================================= */

    function extrairValor(
        texto
    ) {
        const fonte =
            String(
                texto || ""
            );

        const padroes = [
            /VALOR\s+TOTAL\s+DA\s+NOTA[\s\S]{0,80}?(?:R\$\s*)?([\d.]+,\d{2})/i,

            /VALOR\s+TOTAL\s+(?:DA\s+)?NOTA[\s\S]{0,80}?(?:R\$\s*)?([\d.]+,\d{2})/i,

            /TOTAL\s+DA\s+NOTA[\s\S]{0,80}?(?:R\$\s*)?([\d.]+,\d{2})/i,

            /VALOR\s+DA\s+NOTA[\s\S]{0,80}?(?:R\$\s*)?([\d.]+,\d{2})/i,

            /V\.?\s*TOTAL\s+DA\s+NOTA[\s\S]{0,80}?(?:R\$\s*)?([\d.]+,\d{2})/i
        ];

        for (
            const regex
            of padroes
        ) {
            const match =
                fonte.match(
                    regex
                );

            if (
                match?.[1]
            ) {
                const valor =
                    moeda(
                        match[1]
                    );

                if (
                    valor > 0
                ) {
                    return valor;
                }
            }
        }

        return 0;
    }

    /* =========================================================
       ITENS DO DANFE / OCR
    ========================================================= */

    function extrairItens(
        texto,
        modelo
    ) {
        if (
            modelo !==
            MODELOS.NFE &&
            modelo !==
            MODELOS.PRODUTOR_ANTIGA
        ) {
            return [];
        }

        const linhas =
            String(
                texto || ""
            )
                .split(
                    /\n/
                )
                .map(
                    function (
                        item
                    ) {
                        return item
                            .replace(
                                /\s+/g,
                                " "
                            )
                            .trim();
                    }
                )
                .filter(
                    Boolean
                );

        const itens = [];

        for (
            let i = 0;
            i <
            linhas.length;
            i++
        ) {
            const linha =
                linhas[i];

            const candidatosNcm =
                encontrarNcmsNaLinha(
                    linha
                );

            if (
                candidatosNcm.length ===
                0
            ) {
                continue;
            }

            for (
                const ncm
                of candidatosNcm
            ) {
                if (
                    !pareceLinhaProdutoNfe(
                        linhas,
                        i,
                        ncm
                    )
                ) {
                    continue;
                }

                const bloco =
                    obterBlocoItem(
                        linhas,
                        i
                    );

                const cfop =
                    extrairCfopBloco(
                        bloco
                    );

                const descricao =
                    extrairDescricaoItem(
                        bloco,
                        ncm
                    );

                if (
                    !descricao
                ) {
                    continue;
                }

                const valores =
                    extrairValoresMonetarios(
                        bloco
                    );

                /*
                 * Para DANFE/OCR não é seguro assumir
                 * que o maior valor encontrado é vProd.
                 *
                 * Portanto valorProduto fica zero quando
                 * não houver estrutura suficiente.
                 *
                 * Isso evita rateio incorreto entre
                 * atividades.
                 */
                const valorProduto =
                    extrairValorProdutoBloco(
                        bloco
                    );

                itens.push({
                    numeroItem:
                        String(
                            itens.length +
                            1
                        ),

                    codigoProduto:
                        extrairCodigoProduto(
                            bloco,
                            descricao
                        ),

                    gtin:
                        "",

                    descricao:
                        descricao.substring(
                            0,
                            220
                        ),

                    ncm:
                        ncm,

                    cfop:
                        cfop,

                    unidade:
                        extrairUnidadeBloco(
                            bloco
                        ),

                    quantidade:
                        extrairQuantidadeBloco(
                            bloco
                        ),

                    valorUnitario:
                        extrairValorUnitarioBloco(
                            bloco,
                            valores
                        ),

                    valorProduto:
                        valorProduto
                });
            }
        }

        return removerItensDuplicados(
            itens
        );
    }

    /* =========================================================
       LOCALIZA NCM
    ========================================================= */

    function encontrarNcmsNaLinha(
        linha
    ) {
        const resultados = [];

        const regex =
            /\b(\d{8})\b/g;

        let match;

        while (
            (
                match =
                regex.exec(
                    linha
                )
            ) !== null
        ) {
            const candidato =
                normalizarNcm(
                    match[1]
                );

            if (
                candidato &&
                pareceNcm(
                    candidato
                )
            ) {
                resultados.push(
                    candidato
                );
            }
        }

        return [
            ...new Set(
                resultados
            )
        ];
    }

    function pareceNcm(
        valor
    ) {
        const ncm =
            normalizarNcm(
                valor
            );

        if (
            ncm.length !==
            8
        ) {
            return false;
        }

        /*
         * Evita sequências evidentemente inválidas.
         */
        if (
            /^0{8}$/.test(
                ncm
            )
        ) {
            return false;
        }

        const capitulo =
            Number(
                ncm.substring(
                    0,
                    2
                )
            );

        return (
            capitulo >= 1 &&
            capitulo <= 97
        );
    }

    /* =========================================================
       CONFIRMA QUE NCM ESTÁ EM REGIÃO DE PRODUTO
    ========================================================= */

    function pareceLinhaProdutoNfe(
        linhas,
        indice,
        ncm
    ) {
        const bloco =
            obterBlocoItem(
                linhas,
                indice
            );

        const comparado =
            comparacao(
                bloco
            );

        /*
         * Evidência forte.
         */
        if (
            comparado.includes(
                "NCM"
            ) &&
            comparado.includes(
                "CFOP"
            )
        ) {
            return true;
        }

        /*
         * Se houver CFOP plausível próximo do NCM,
         * também é uma boa evidência de item fiscal.
         */
        const cfop =
            extrairCfopBloco(
                bloco
            );

        if (cfop) {
            return true;
        }

        /*
         * NCM reconhecido pelo próprio motor de
         * classificação.
         */
        if (
            window
                .CreditoRuralNcmAtividades
                ?.classificarItem
        ) {
            try {
                const teste =
                    window
                        .CreditoRuralNcmAtividades
                        .classificarItem({
                            ncm:
                                ncm,

                            descricao:
                                bloco
                        });

                if (
                    teste?.identificado
                ) {
                    return true;
                }
            } catch (
            erro
            ) {
                console.warn(
                    "Falha ao validar NCM.",
                    erro
                );
            }
        }

        return false;
    }

    /* =========================================================
       BLOCO DO ITEM
    ========================================================= */

    function obterBlocoItem(
        linhas,
        indice
    ) {
        const inicio =
            Math.max(
                0,
                indice - 2
            );

        const fim =
            Math.min(
                linhas.length,
                indice + 3
            );

        return linhas
            .slice(
                inicio,
                fim
            )
            .join(
                " "
            );
    }

    /* =========================================================
       DESCRIÇÃO DO ITEM
    ========================================================= */

    function extrairDescricaoItem(
        bloco,
        ncm
    ) {
        let texto =
            String(
                bloco || ""
            )
                .replace(
                    /\s+/g,
                    " "
                )
                .trim();

        const indiceNcm =
            texto.indexOf(
                ncm
            );

        if (
            indiceNcm <= 0
        ) {
            return "";
        }

        texto =
            texto
                .substring(
                    0,
                    indiceNcm
                )
                .trim();

        texto =
            texto.replace(
                /.*(?:DESCRI[CÇ][AÃ]O\s+DO\s+PRODUTO(?:\s*\/\s*SERVI[CÇ]O)?)/i,
                ""
            );

        texto =
            texto.replace(
                /.*(?:C[ÓO]DIGO\s+DO\s+PRODUTO)/i,
                ""
            );

        texto =
            texto.trim();

        /*
         * Remove código inicial quando houver:
         * 013 BOVINO FEMEA...
         */
        texto =
            texto.replace(
                /^[A-Z0-9._/-]{1,20}\s+(?=[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ])/i,
                ""
            );

        texto =
            texto
                .replace(
                    /\s+/g,
                    " "
                )
                .trim();

        if (
            texto.length <
            2
        ) {
            return "";
        }

        return texto;
    }

    /* =========================================================
       CFOP
    ========================================================= */

    function extrairCfopBloco(
        bloco
    ) {
        const texto =
            String(
                bloco || ""
            );

        const proximosNcm =
            texto.match(
                /\b([12567]\d{3})\b/g
            ) ||
            [];

        for (
            const candidato
            of proximosNcm
        ) {
            const cfop =
                normalizarCfop(
                    candidato
                );

            if (cfop) {
                return cfop;
            }
        }

        return "";
    }

    function normalizarCfop(
        valor
    ) {
        const cfop =
            String(
                valor || ""
            ).replace(
                /\D/g,
                ""
            );

        return /^[12567]\d{3}$/.test(
            cfop
        )
            ? cfop
            : "";
    }

    /* =========================================================
       NCM
    ========================================================= */

    function normalizarNcm(
        valor
    ) {
        const ncm =
            String(
                valor || ""
            ).replace(
                /\D/g,
                ""
            );

        return ncm.length ===
            8
            ? ncm
            : "";
    }

    /* =========================================================
       VALORES DO BLOCO
    ========================================================= */

    function extrairValoresMonetarios(
        bloco
    ) {
        return (
            String(
                bloco || ""
            ).match(
                /\b\d{1,3}(?:\.\d{3})*,\d{2,6}\b/g
            ) ||
            []
        )
            .map(
                moeda
            )
            .filter(
                function (
                    valor
                ) {
                    return (
                        Number.isFinite(
                            valor
                        ) &&
                        valor >= 0
                    );
                }
            );
    }

    /*
     * Só tenta valorProduto quando o bloco tem
     * indicação estrutural razoável.
     */
    function extrairValorProdutoBloco(
        bloco
    ) {
        const texto =
            String(
                bloco || ""
            );

        const padroes = [
            /VALOR\s+TOTAL[\s:.-]+([\d.]+,\d{2})/i,
            /V\.?\s*TOTAL[\s:.-]+([\d.]+,\d{2})/i,
            /TOTAL\s+ITEM[\s:.-]+([\d.]+,\d{2})/i
        ];

        for (
            const regex
            of padroes
        ) {
            const match =
                texto.match(
                    regex
                );

            if (
                match?.[1]
            ) {
                const valor =
                    moeda(
                        match[1]
                    );

                if (
                    valor > 0
                ) {
                    return valor;
                }
            }
        }

        /*
         * DANFE normalmente apresenta:
         *
         * quantidade
         * valor unitário
         * valor total
         *
         * Se houver pelo menos 3 números monetários,
         * usamos a relação matemática para identificar
         * o total.
         */
        const valores =
            extrairValoresMonetarios(
                texto
            );

        if (
            valores.length >=
            3
        ) {
            const candidatos =
                identificarRelacaoQuantidadeValor(
                    texto,
                    valores
                );

            if (
                candidatos.valorProduto >
                0
            ) {
                return candidatos
                    .valorProduto;
            }
        }

        /*
         * Melhor não informar valor do item do que
         * ratear a renda com dado errado.
         */
        return 0;
    }

    /* =========================================================
       QUANTIDADE / VALOR UNITÁRIO
    ========================================================= */

    function identificarRelacaoQuantidadeValor(
        bloco,
        valores
    ) {
        const resultado = {
            quantidade:
                0,

            valorUnitario:
                0,

            valorProduto:
                0
        };

        const numeros =
            String(
                bloco || ""
            ).match(
                /\b\d+(?:[.,]\d+)?\b/g
            ) ||
            [];

        const convertidos =
            numeros
                .map(
                    numeroBrasileiroGenerico
                )
                .filter(
                    function (
                        numero
                    ) {
                        return (
                            Number.isFinite(
                                numero
                            ) &&
                            numero > 0
                        );
                    }
                );

        /*
         * Testa combinações:
         * quantidade × unitário ≈ total.
         */
        for (
            let i = 0;
            i <
            convertidos.length;
            i++
        ) {
            for (
                let j = 0;
                j <
                valores.length;
                j++
            ) {
                for (
                    let k = 0;
                    k <
                    valores.length;
                    k++
                ) {
                    if (
                        j === k
                    ) {
                        continue;
                    }

                    const quantidade =
                        convertidos[i];

                    const unitario =
                        valores[j];

                    const total =
                        valores[k];

                    if (
                        quantidade <= 0 ||
                        unitario <= 0 ||
                        total <= 0
                    ) {
                        continue;
                    }

                    const esperado =
                        quantidade *
                        unitario;

                    const tolerancia =
                        Math.max(
                            0.05,
                            total *
                            0.001
                        );

                    if (
                        Math.abs(
                            esperado -
                            total
                        ) <=
                        tolerancia
                    ) {
                        resultado.quantidade =
                            quantidade;

                        resultado.valorUnitario =
                            unitario;

                        resultado.valorProduto =
                            total;

                        return resultado;
                    }
                }
            }
        }

        return resultado;
    }

    function extrairQuantidadeBloco(
        bloco
    ) {
        const relacao =
            identificarRelacaoQuantidadeValor(
                bloco,
                extrairValoresMonetarios(
                    bloco
                )
            );

        return relacao
            .quantidade ||
            0;
    }

    function extrairValorUnitarioBloco(
        bloco,
        valores = null
    ) {
        const relacao =
            identificarRelacaoQuantidadeValor(
                bloco,
                valores ||
                extrairValoresMonetarios(
                    bloco
                )
            );

        return relacao
            .valorUnitario ||
            0;
    }

    /* =========================================================
       CÓDIGO PRODUTO
    ========================================================= */

    function extrairCodigoProduto(
        bloco,
        descricao
    ) {
        const texto =
            String(
                bloco || ""
            );

        const indiceDescricao =
            descricao
                ? texto.indexOf(
                    descricao
                )
                : -1;

        if (
            indiceDescricao >
            0
        ) {
            const anterior =
                texto
                    .substring(
                        0,
                        indiceDescricao
                    )
                    .trim();

            const match =
                anterior.match(
                    /([A-Z0-9._/-]{1,20})\s*$/i
                );

            if (
                match?.[1]
            ) {
                return match[1];
            }
        }

        return "";
    }

    /* =========================================================
       UNIDADE
    ========================================================= */

    function extrairUnidadeBloco(
        bloco
    ) {
        const texto =
            comparacao(
                bloco
            );

        const unidades = [
            "UN",
            "UND",
            "UNID",
            "KG",
            "G",
            "L",
            "LT",
            "SC",
            "SACA",
            "CB",
            "CX"
        ];

        for (
            const unidade
            of unidades
        ) {
            const regex =
                new RegExp(
                    `\\b${unidade}\\b`
                );

            if (
                regex.test(
                    texto
                )
            ) {
                return unidade;
            }
        }

        return "";
    }

    /* =========================================================
       REMOVE ITENS DUPLICADOS
    ========================================================= */

    function removerItensDuplicados(
        itens
    ) {
        const mapa =
            new Map();

        itens.forEach(
            function (
                item
            ) {
                const chave = [
                    item.ncm,
                    comparacao(
                        item.descricao
                    ),
                    item.cfop
                ].join("|");

                if (
                    !mapa.has(
                        chave
                    )
                ) {
                    mapa.set(
                        chave,
                        item
                    );

                    return;
                }

                const existente =
                    mapa.get(
                        chave
                    );

                /*
                 * Se uma leitura posterior trouxer
                 * valorProduto mais confiável,
                 * preserva o melhor dado.
                 */
                if (
                    Number(
                        item.valorProduto
                    ) >
                    Number(
                        existente
                            .valorProduto
                    )
                ) {
                    existente.valorProduto =
                        item.valorProduto;
                }

                if (
                    !existente
                        .codigoProduto &&
                    item.codigoProduto
                ) {
                    existente.codigoProduto =
                        item.codigoProduto;
                }

                if (
                    !existente.unidade &&
                    item.unidade
                ) {
                    existente.unidade =
                        item.unidade;
                }

                if (
                    !existente.quantidade &&
                    item.quantidade
                ) {
                    existente.quantidade =
                        item.quantidade;
                }

                if (
                    !existente
                        .valorUnitario &&
                    item.valorUnitario
                ) {
                    existente.valorUnitario =
                        item.valorUnitario;
                }
            }
        );

        return Array.from(
            mapa.values()
        ).map(
            function (
                item,
                indice
            ) {
                return {
                    ...item,
                    numeroItem:
                        String(
                            indice +
                            1
                        )
                };
            }
        );
    }

    /* =========================================================
       DATA
    ========================================================= */

    function normalizarData(
        valor
    ) {
        const match =
            String(
                valor || ""
            )
                .trim()
                .replace(
                    /[.-]/g,
                    "/"
                )
                .match(
                    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/
                );

        if (!match) {
            return "";
        }

        const dia =
            Number(
                match[1]
            );

        const mes =
            Number(
                match[2]
            );

        let ano =
            Number(
                match[3]
            );

        if (
            ano < 100
        ) {
            ano +=
                ano >= 50
                    ? 1900
                    : 2000;
        }

        const resultado =
            `${String(
                dia
            ).padStart(
                2,
                "0"
            )}/${String(
                mes
            ).padStart(
                2,
                "0"
            )}/${ano}`;

        return validarData(
            resultado
        )
            ? resultado
            : "";
    }

    function validarData(
        data
    ) {
        const match =
            String(
                data || ""
            ).match(
                /^(\d{2})\/(\d{2})\/(\d{4})$/
            );

        if (!match) {
            return false;
        }

        const dia =
            Number(
                match[1]
            );

        const mes =
            Number(
                match[2]
            );

        const ano =
            Number(
                match[3]
            );

        if (
            ano < 1900 ||
            ano > 2200 ||
            mes < 1 ||
            mes > 12 ||
            dia < 1 ||
            dia > 31
        ) {
            return false;
        }

        const dataJs =
            new Date(
                ano,
                mes - 1,
                dia,
                12,
                0,
                0,
                0
            );

        return (
            dataJs.getFullYear() ===
            ano &&
            dataJs.getMonth() ===
            mes - 1 &&
            dataJs.getDate() ===
            dia
        );
    }

    /* =========================================================
       COMPETÊNCIA
    ========================================================= */

    function competencia(
        data
    ) {
        if (
            !validarData(
                data
            )
        ) {
            return "";
        }

        const match =
            String(
                data
            ).match(
                /^(\d{2})\/(\d{2})\/(\d{4})$/
            );

        return `${match[3]}-${match[2]}`;
    }

    /* =========================================================
       NÚMEROS
    ========================================================= */

    function moeda(
        valor
    ) {
        let texto =
            String(
                valor || ""
            )
                .replace(
                    /R\$/gi,
                    ""
                )
                .replace(
                    /\s/g,
                    ""
                )
                .trim();

        if (!texto) {
            return 0;
        }

        if (
            texto.includes(",")
        ) {
            texto =
                texto
                    .replace(
                        /\./g,
                        ""
                    )
                    .replace(
                        ",",
                        "."
                    );
        }

        texto =
            texto.replace(
                /[^\d.-]/g,
                ""
            );

        const numero =
            Number(
                texto
            );

        return Number.isFinite(
            numero
        )
            ? numero
            : 0;
    }

    function numeroJs(
        valor
    ) {
        const texto =
            String(
                valor || ""
            )
                .trim()
                .replace(
                    ",",
                    "."
                );

        const numero =
            Number(
                texto
            );

        return Number.isFinite(
            numero
        )
            ? numero
            : 0;
    }

    function numeroBrasileiroGenerico(
        valor
    ) {
        let texto =
            String(
                valor || ""
            )
                .trim();

        if (!texto) {
            return NaN;
        }

        if (
            texto.includes(",")
        ) {
            texto =
                texto
                    .replace(
                        /\./g,
                        ""
                    )
                    .replace(
                        ",",
                        "."
                    );
        }

        const numero =
            Number(
                texto
                    .replace(
                        /[^\d.-]/g,
                        ""
                    )
            );

        return Number.isFinite(
            numero
        )
            ? numero
            : NaN;
    }

    /* =========================================================
       DESCRIÇÃO DO MODELO
    ========================================================= */

    function descricaoModelo(
        modelo
    ) {
        return {
            xml_nfe:
                "XML NF-e",

            nfe:
                "NF-e / DANFE",

            nfse:
                "NFS-e",

            produtor_antiga:
                "Nota Fiscal de Produtor - Modelo Antigo",

            generica:
                "Documento Fiscal Genérico"
        }[modelo] ||
            modelo ||
            "";
    }

    /* =========================================================
       API PÚBLICA
    ========================================================= */

    window.CreditoRuralNotasFiscais = {
        modelos:
            MODELOS,

        interpretar:
            interpretar,

        interpretarXmlNfe:
            interpretarXmlNfe,

        identificarModelo:
            identificarModelo,

        avaliarQualidadeTexto:
            avaliarQualidadeTexto,

        normalizarData:
            normalizarData,

        validarData:
            validarData,

        formatarCompetenciaData:
            competencia,

        normalizarChaveAcesso:
            normalizarChaveAcesso,

        extrairChave:
            extrairChave,

        extrairItens:
            extrairItens,

        extrairValor:
            extrairValor,

        extrairData:
            extrairData
    };
})();