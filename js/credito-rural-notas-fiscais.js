/**
 * credito-rural-notas-fiscais.js
 *
 * Caixa de Ferramentas - Sicoob Mantiqueira
 *
 * Interpretador centralizado das notas fiscais utilizadas
 * no cálculo de renda rural.
 *
 * Suporta:
 *
 * - XML NF-e;
 * - NF-e / DANFE;
 * - NFS-e;
 * - Nota Fiscal de Produtor antiga;
 * - documento fiscal genérico.
 *
 * Responsabilidades:
 *
 * - identificar modelo;
 * - interpretar XML;
 * - extrair itens;
 * - extrair NCM;
 * - extrair CFOP;
 * - extrair descrição;
 * - extrair quantidade;
 * - extrair valor dos itens;
 * - extrair data;
 * - extrair número;
 * - extrair emitente;
 * - extrair valor total;
 * - sugerir atividades;
 * - controlar confiança;
 * - determinar necessidade de revisão humana.
 */

(function () {
    "use strict";

    /* =====================================================
       MODELOS
       ===================================================== */

    const MODELOS_NOTA_FISCAL_RURAL =
        Object.freeze({
            XML_NFE:
                "xml_nfe",

            NFE:
                "nfe",

            NFSE:
                "nfse",

            PRODUTOR_ANTIGA:
                "produtor_antiga",

            GENERICA:
                "generica"
        });

    /* =====================================================
       NORMALIZAÇÃO
       ===================================================== */

    function normalizarTextoOcr(
        texto
    ) {
        return String(
            texto ||
            ""
        )
            .replace(
                /\r/g,
                "\n"
            )
            .replace(
                /[|]/g,
                " "
            )
            .replace(
                /[ \t]+/g,
                " "
            )
            .replace(
                /\n[ \t]+/g,
                "\n"
            )
            .replace(
                /\n{3,}/g,
                "\n\n"
            )
            .trim();
    }

    function normalizarComparacao(
        texto
    ) {
        return String(
            texto ||
            ""
        )
            .normalize(
                "NFD"
            )
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .toUpperCase()
            .replace(
                /\s+/g,
                " "
            )
            .trim();
    }

    /* =====================================================
       MODELO
       ===================================================== */

    function identificarModelo(
        texto
    ) {
        const normalizado =
            normalizarComparacao(
                texto
            );

        if (
            normalizado.includes(
                "NOTA FISCAL DE PRODUTOR"
            )
        ) {
            return (
                MODELOS_NOTA_FISCAL_RURAL
                    .PRODUTOR_ANTIGA
            );
        }

        if (
            normalizado.includes(
                "DANFE"
            ) ||
            normalizado.includes(
                "CHAVE DE ACESSO"
            ) ||
            normalizado.includes(
                "DOCUMENTO AUXILIAR DA NOTA FISCAL ELETRONICA"
            )
        ) {
            return (
                MODELOS_NOTA_FISCAL_RURAL
                    .NFE
            );
        }

        if (
            normalizado.includes(
                "NFS-E"
            ) ||
            normalizado.includes(
                "NOTA FISCAL DE SERVICOS ELETRONICA"
            )
        ) {
            return (
                MODELOS_NOTA_FISCAL_RURAL
                    .NFSE
            );
        }

        return (
            MODELOS_NOTA_FISCAL_RURAL
                .GENERICA
        );
    }

    /* =====================================================
       QUALIDADE DO TEXTO
       ===================================================== */

    function avaliarQualidadeTexto(
        texto
    ) {
        const normalizado =
            normalizarComparacao(
                texto
            );

        if (!normalizado) {
            return 0;
        }

        let pontos = 0;

        [
            "NOTA FISCAL",
            "NOTA FISCAL DE PRODUTOR",
            "DANFE",
            "EMISSAO",
            "DATA DA EMISSAO",
            "TOTAL DA NOTA",
            "VALOR TOTAL",
            "NCM",
            "CFOP",
            "DESCRICAO DOS PRODUTOS",
            "DESTINATARIO"
        ].forEach(
            termo => {
                if (
                    normalizado.includes(
                        termo
                    )
                ) {
                    pontos += 7;
                }
            }
        );

        if (
            normalizado.length >=
            100
        ) {
            pontos += 5;
        }

        if (
            normalizado.length >=
            300
        ) {
            pontos += 5;
        }

        return Math.min(
            100,
            pontos
        );
    }

    /* =====================================================
       XML NF-e
       ===================================================== */

    function interpretarXmlNfe(
        xmlTexto,
        nomeArquivo = ""
    ) {
        const parser =
            new DOMParser();

        const documento =
            parser.parseFromString(
                xmlTexto,
                "application/xml"
            );

        if (
            documento.querySelector(
                "parsererror"
            )
        ) {
            throw new Error(
                "XML inválido."
            );
        }

        const obterTexto = (
            elemento,
            seletor
        ) => {
            return (
                elemento
                    ?.querySelector(
                        seletor
                    )
                    ?.textContent
                    ?.trim() ||
                ""
            );
        };

        const ide =
            documento.querySelector(
                "ide"
            );

        const emit =
            documento.querySelector(
                "emit"
            );

        const total =
            documento.querySelector(
                "ICMSTot"
            );

        const numero =
            obterTexto(
                ide,
                "nNF"
            );

        const dataHora =
            obterTexto(
                ide,
                "dhEmi"
            ) ||
            obterTexto(
                ide,
                "dEmi"
            );

        const data =
            converterDataXmlParaBrasileira(
                dataHora
            );

        const emitente =
            obterTexto(
                emit,
                "xNome"
            );

        const valor =
            converterNumero(
                obterTexto(
                    total,
                    "vNF"
                )
            );

        const itens = [];

        documento
            .querySelectorAll(
                "det"
            )
            .forEach(
                det => {
                    const prod =
                        det.querySelector(
                            "prod"
                        );

                    if (!prod) {
                        return;
                    }

                    itens.push({
                        numeroItem:
                            det.getAttribute(
                                "nItem"
                            ) ||
                            "",

                        codigoProduto:
                            obterTexto(
                                prod,
                                "cProd"
                            ),

                        gtin:
                            obterTexto(
                                prod,
                                "cEAN"
                            ),

                        descricao:
                            obterTexto(
                                prod,
                                "xProd"
                            ),

                        ncm:
                            obterTexto(
                                prod,
                                "NCM"
                            ),

                        cfop:
                            obterTexto(
                                prod,
                                "CFOP"
                            ),

                        unidade:
                            obterTexto(
                                prod,
                                "uCom"
                            ),

                        quantidade:
                            converterNumero(
                                obterTexto(
                                    prod,
                                    "qCom"
                                )
                            ),

                        valorUnitario:
                            converterNumero(
                                obterTexto(
                                    prod,
                                    "vUnCom"
                                )
                            ),

                        valorProduto:
                            converterNumero(
                                obterTexto(
                                    prod,
                                    "vProd"
                                )
                            )
                    });
                }
            );

        const atividadesSugeridas =
            classificarAtividadesItens(
                itens
            );

        const multiplasAtividades =
            atividadesSugeridas.length >
            1;

        const atividadeAutomatica =
            atividadesSugeridas.length ===
            1 &&
            atividadesSugeridas[0]
                .automatico;

        return {
            arquivo:
                nomeArquivo,

            modelo:
                MODELOS_NOTA_FISCAL_RURAL
                    .XML_NFE,

            modeloDescricao:
                "XML NF-e",

            numero,

            data,

            emitente,

            valor,

            competencia:
                formatarCompetenciaData(
                    data
                ),

            itens,

            atividadesSugeridas,

            atividadeAutomatica,

            multiplasAtividades,

            requerConferencia:
                !data ||
                valor <= 0 ||
                !atividadeAutomatica ||
                multiplasAtividades,

            confirmada:
                Boolean(
                    data &&
                    valor > 0 &&
                    atividadeAutomatica &&
                    !multiplasAtividades
                ),

            confianca: {
                numero:
                    numero
                        ? 1
                        : 0,

                data:
                    data
                        ? 1
                        : 0,

                emitente:
                    emitente
                        ? 1
                        : 0,

                valor:
                    valor > 0
                        ? 1
                        : 0,

                geral:
                    1
            },

            status:
                atividadeAutomatica
                    ? "XML NF-e identificado"
                    : "Revisar atividade",

            texto:
                xmlTexto
        };
    }

    /* =====================================================
       DATA XML
       ===================================================== */

    function converterDataXmlParaBrasileira(
        valor
    ) {
        if (!valor) {
            return null;
        }

        const match =
            String(valor)
                .match(
                    /^(\d{4})-(\d{2})-(\d{2})/
                );

        if (!match) {
            return null;
        }

        return (
            `${match[3]}/${match[2]}/${match[1]}`
        );
    }

    /* =====================================================
       INTERPRETA TEXTO
       ===================================================== */

    function interpretar(
        textoOriginal,
        nomeArquivo = ""
    ) {
        const texto =
            normalizarTextoOcr(
                textoOriginal
            );

        const modelo =
            identificarModelo(
                texto
            );

        const data =
            extrairData(
                texto
            );

        const numero =
            extrairNumero(
                texto,
                modelo
            );

        const emitente =
            extrairEmitente(
                texto,
                modelo
            );

        const valor =
            extrairValorTotal(
                texto,
                modelo
            );

        const itens =
            extrairItensTexto(
                texto,
                modelo
            );

        const atividadesSugeridas =
            classificarAtividadesItens(
                itens
            );

        const confianca =
            calcularConfianca(
                {
                    numero,
                    data,
                    emitente,
                    valor
                },
                modelo
            );

        const atividadeAutomatica =
            atividadesSugeridas.length ===
            1 &&
            atividadesSugeridas[0]
                .automatico;

        const multiplasAtividades =
            atividadesSugeridas.length >
            1;

        const camposCriticosOk =
            Boolean(
                data &&
                valor > 0
            );

        const confirmarAutomaticamente =
            modelo ===
            MODELOS_NOTA_FISCAL_RURAL
                .NFE &&
            camposCriticosOk &&
            confianca.geral >=
            0.80 &&
            atividadeAutomatica &&
            !multiplasAtividades;

        let status =
            "Identificada";

        if (
            !data ||
            valor <= 0
        ) {
            status =
                "Conferência necessária";
        } else if (
            !atividadeAutomatica
        ) {
            status =
                "Revisar atividade";
        }

        if (
            modelo ===
            MODELOS_NOTA_FISCAL_RURAL
                .PRODUTOR_ANTIGA
        ) {
            status =
                "Nota antiga - revisar";

            /*
             * Nota antiga nunca é incluída
             * automaticamente na renda.
             */
        }

        return {
            arquivo:
                nomeArquivo,

            modelo,

            modeloDescricao:
                obterDescricaoModelo(
                    modelo
                ),

            numero,

            data,

            emitente,

            valor,

            competencia:
                formatarCompetenciaData(
                    data
                ),

            itens,

            atividadesSugeridas,

            atividadeAutomatica,

            multiplasAtividades,

            confianca,

            requerConferencia:
                !confirmarAutomaticamente,

            confirmada:
                confirmarAutomaticamente,

            status,

            texto:
                textoOriginal
        };
    }

    /* =====================================================
       EXTRAI ITENS DO TEXTO
       ===================================================== */

    function extrairItensTexto(
        texto,
        modelo
    ) {
        const itens = [];

        /*
         * Em DANFE com camada textual, procuramos
         * combinações NCM + CFOP e tentamos recuperar
         * a descrição próxima.
         */

        const linhas =
            String(texto || "")
                .split(/\n/)
                .map(
                    linha =>
                        linha.trim()
                )
                .filter(Boolean);

        for (
            let i = 0;
            i <
            linhas.length;
            i++
        ) {
            const linha =
                linhas[i];

            const ncmMatch =
                linha.match(
                    /\b(\d{8})\b/
                );

            if (!ncmMatch) {
                continue;
            }

            const ncm =
                ncmMatch[1];

            const janela =
                [
                    linhas[i - 3] || "",
                    linhas[i - 2] || "",
                    linhas[i - 1] || "",
                    linhas[i],
                    linhas[i + 1] || "",
                    linhas[i + 2] || ""
                ];

            const cfopMatch =
                janela
                    .join(" ")
                    .match(
                        /\b([12567]\d{3})\b/
                    );

            const descricao =
                escolherDescricaoProduto(
                    janela,
                    ncm
                );

            itens.push({
                numeroItem:
                    String(
                        itens.length +
                        1
                    ),

                codigoProduto:
                    "",

                gtin:
                    "",

                descricao,

                ncm,

                cfop:
                    cfopMatch
                        ? cfopMatch[1]
                        : "",

                unidade:
                    "",

                quantidade:
                    0,

                valorUnitario:
                    0,

                valorProduto:
                    0
            });
        }

        /*
         * Nota antiga dificilmente terá NCM.
         * Nesse caso utiliza a descrição da área
         * "Descrição dos Produtos" como apoio.
         */

        if (
            itens.length === 0 &&
            modelo ===
            MODELOS_NOTA_FISCAL_RURAL
                .PRODUTOR_ANTIGA
        ) {
            const descricao =
                extrairDescricaoProdutoNotaAntiga(
                    linhas
                );

            if (descricao) {
                itens.push({
                    numeroItem:
                        "1",

                    codigoProduto:
                        "",

                    gtin:
                        "",

                    descricao,

                    ncm:
                        "",

                    cfop:
                        "",

                    unidade:
                        "",

                    quantidade:
                        0,

                    valorUnitario:
                        0,

                    valorProduto:
                        0
                });
            }
        }

        return removerItensDuplicados(
            itens
        );
    }

    /* =====================================================
       DESCRIÇÃO PRÓXIMA AO NCM
       ===================================================== */

    function escolherDescricaoProduto(
        linhas,
        ncm
    ) {
        const ignorar = [
            "NCM",
            "CFOP",
            "CST",
            "VALOR",
            "QUANTIDADE",
            "UNIDADE",
            "CODIGO",
            ncm
        ];

        const candidatas =
            linhas
                .map(
                    linha =>
                        String(
                            linha ||
                            ""
                        ).trim()
                )
                .filter(
                    linha =>
                        linha.length >=
                        3 &&
                        linha.length <=
                        180
                )
                .filter(
                    linha => {
                        const normal =
                            normalizarComparacao(
                                linha
                            );

                        return !ignorar.some(
                            termo =>
                                normal ===
                                termo
                        );
                    }
                );

        return (
            candidatas[0] ||
            ""
        );
    }

    /* =====================================================
       DESCRIÇÃO NOTA ANTIGA
       ===================================================== */

    function extrairDescricaoProdutoNotaAntiga(
        linhas
    ) {
        for (
            let i = 0;
            i <
            linhas.length;
            i++
        ) {
            const normal =
                normalizarComparacao(
                    linhas[i]
                );

            if (
                normal.includes(
                    "DESCRICAO DOS PRODUTOS"
                )
            ) {
                for (
                    let proxima = 1;
                    proxima <= 5;
                    proxima++
                ) {
                    const candidata =
                        linhas[
                        i +
                        proxima
                        ];

                    if (
                        candidata &&
                        candidata.length >=
                        3
                    ) {
                        return candidata;
                    }
                }
            }
        }

        return "";
    }

    /* =====================================================
       REMOVE ITENS DUPLICADOS
       ===================================================== */

    function removerItensDuplicados(
        itens
    ) {
        const mapa =
            new Map();

        itens.forEach(
            item => {
                const chave =
                    [
                        item.ncm,
                        normalizarComparacao(
                            item.descricao
                        )
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
                }
            }
        );

        return Array.from(
            mapa.values()
        );
    }

    /* =====================================================
       ATIVIDADES
       ===================================================== */

    function classificarAtividadesItens(
        itens
    ) {
        if (
            !window.CreditoRuralNcmAtividades
        ) {
            return [];
        }

        return window
            .CreditoRuralNcmAtividades
            .consolidarAtividadesNota(
                itens
            );
    }

    /* =====================================================
       DATA
       ===================================================== */

    function extrairData(
        texto
    ) {
        const padroes = [
            /DATA\s*(?:DE\s*)?EMISS[AÃ]O[^0-9]{0,40}(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/i,
            /EMISS[AÃ]O[^0-9]{0,40}(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/i,
            /EMITID[AO]\s+EM[^0-9]{0,40}(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/i
        ];

        for (
            const padrao of
            padroes
        ) {
            const match =
                String(texto)
                    .match(
                        padrao
                    );

            if (
                match &&
                match[1]
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

        const datas =
            String(texto)
                .match(
                    /\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/g
                ) ||
            [];

        for (
            const valor of
            datas
        ) {
            const data =
                normalizarData(
                    valor
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

    function normalizarData(
        valor
    ) {
        const match =
            String(
                valor ||
                ""
            )
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

        let ano =
            Number(
                match[3]
            );

        if (
            ano <
            100
        ) {
            ano +=
                ano >= 50
                    ? 1900
                    : 2000;
        }

        return (
            `${String(Number(match[1])).padStart(2, "0")}/${String(Number(match[2])).padStart(2, "0")}/${ano}`
        );
    }

    function validarData(
        valor
    ) {
        const match =
            String(
                valor ||
                ""
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

        const data =
            new Date(
                ano,
                mes - 1,
                dia
            );

        return (
            data.getFullYear() ===
            ano &&
            data.getMonth() ===
            mes - 1 &&
            data.getDate() ===
            dia
        );
    }

    /* =====================================================
       NÚMERO
       ===================================================== */

    function extrairNumero(
        texto,
        modelo
    ) {
        const padroes =
            modelo ===
                MODELOS_NOTA_FISCAL_RURAL
                    .PRODUTOR_ANTIGA
                ? [
                    /NOTA\s+FISCAL\s+DE\s+PRODUTOR[\s\S]{0,100}?N[º°O.]?\s*[:.-]?\s*0*(\d{1,10})/i,
                    /\bN[º°]\s*[:.-]?\s*0*(\d{1,10})\b/i
                ]
                : [
                    /N[ÚU]MERO\s+(?:DA\s+)?(?:NF[- ]?E|NFS[- ]?E|NOTA)[^0-9]{0,20}(\d{1,20})/i,
                    /NF[- ]?E[^0-9]{0,25}N[º°O.]?\s*[:.-]?\s*(\d{1,20})/i,
                    /\bN[º°]\s*(\d{1,20})\b/i
                ];

        for (
            const padrao of
            padroes
        ) {
            const match =
                String(texto)
                    .match(
                        padrao
                    );

            if (
                match &&
                match[1]
            ) {
                return String(
                    match[1]
                )
                    .replace(
                        /\D/g,
                        ""
                    )
                    .replace(
                        /^0+(?=\d)/,
                        ""
                    );
            }
        }

        return "";
    }

    /* =====================================================
       EMITENTE
       ===================================================== */

    function extrairEmitente(
        texto,
        modelo
    ) {
        const conteudo =
            String(texto);

        const recebido =
            conteudo.match(
                /RECEB(?:EMOS|I\/?EMOS)\s+DE\s+(.+?)\s+OS\s+PRODUTOS/i
            );

        if (
            recebido &&
            recebido[1]
        ) {
            return limparEmitente(
                recebido[1]
            );
        }

        const padroes = [
            /RAZ[AÃ]O\s+SOCIAL[\s:.-]+([^\n]+)/i,
            /EMITENTE[\s:.-]+([^\n]+)/i,
            /FORNECEDOR[\s:.-]+([^\n]+)/i
        ];

        for (
            const padrao of
            padroes
        ) {
            const match =
                conteudo.match(
                    padrao
                );

            if (
                match &&
                match[1]
            ) {
                const nome =
                    limparEmitente(
                        match[1]
                    );

                if (nome) {
                    return nome;
                }
            }
        }

        if (
            modelo ===
            MODELOS_NOTA_FISCAL_RURAL
                .PRODUTOR_ANTIGA
        ) {
            const linhas =
                conteudo
                    .split(/\n/)
                    .map(
                        linha =>
                            linha.trim()
                    )
                    .filter(Boolean);

            for (
                let i = 0;
                i <
                Math.min(
                    15,
                    linhas.length
                );
                i++
            ) {
                const normal =
                    normalizarComparacao(
                        linhas[i]
                    );

                if (
                    normal.includes(
                        "NOTA FISCAL"
                    ) ||
                    normal.includes(
                        "CNPJ"
                    ) ||
                    normal.includes(
                        "FAZENDA"
                    )
                ) {
                    continue;
                }

                if (
                    linhas[i].length >=
                    8 &&
                    linhas[i].length <=
                    120
                ) {
                    return limparEmitente(
                        linhas[i]
                    );
                }
            }
        }

        return "";
    }

    function limparEmitente(
        valor
    ) {
        let texto =
            String(
                valor ||
                ""
            )
                .replace(
                    /\s+/g,
                    " "
                )
                .trim();

        texto =
            texto.replace(
                /\b(CNPJ|CPF|INSCRI[CÇ][AÃ]O|ENDERE[CÇ]O|CEP|FONE)\b.*$/i,
                ""
            );

        return texto
            .substring(
                0,
                120
            )
            .trim();
    }

    /* =====================================================
       VALOR TOTAL
       ===================================================== */

    function extrairValorTotal(
        texto,
        modelo
    ) {
        const conteudo =
            String(texto);

        const padroes = [
            /VALOR\s+TOTAL\s+(?:DA\s+)?NOTA[^0-9]{0,100}(?:R\$\s*)?([\d.]+,\d{2})/i,
            /TOTAL\s+DA\s+NOTA[^0-9]{0,100}(?:R\$\s*)?([\d.]+,\d{2})/i,
            /VALOR\s+DA\s+NOTA[^0-9]{0,100}(?:R\$\s*)?([\d.]+,\d{2})/i
        ];

        for (
            const padrao of
            padroes
        ) {
            const match =
                conteudo.match(
                    padrao
                );

            if (
                match &&
                match[1]
            ) {
                const valor =
                    converterNumeroBrasileiro(
                        match[1]
                    );

                if (
                    valor >
                    0
                ) {
                    return valor;
                }
            }
        }

        const linhas =
            conteudo
                .split(/\n/)
                .map(
                    linha =>
                        linha.trim()
                )
                .filter(Boolean);

        const valor =
            procurarValorProximo(
                linhas,
                [
                    "TOTAL DA NOTA",
                    "VALOR TOTAL DA NOTA"
                ]
            );

        if (
            valor >
            0
        ) {
            return valor;
        }

        /*
         * Nota antiga:
         * somente usa "Valor Total dos Produtos" como
         * fallback quando "Total da Nota" não foi encontrado.
         */

        if (
            modelo ===
            MODELOS_NOTA_FISCAL_RURAL
                .PRODUTOR_ANTIGA
        ) {
            return procurarValorProximo(
                linhas,
                [
                    "VALOR TOTAL DOS PRODUTOS"
                ]
            );
        }

        return 0;
    }

    function procurarValorProximo(
        linhas,
        rotulos
    ) {
        for (
            let i = 0;
            i <
            linhas.length;
            i++
        ) {
            const normal =
                normalizarComparacao(
                    linhas[i]
                );

            if (
                !rotulos.some(
                    rotulo =>
                        normal.includes(
                            rotulo
                        )
                )
            ) {
                continue;
            }

            for (
                let distancia = 0;
                distancia <= 8;
                distancia++
            ) {
                const indices =
                    distancia ===
                        0
                        ? [i]
                        : [
                            i - distancia,
                            i + distancia
                        ];

                for (
                    const indice of
                    indices
                ) {
                    if (
                        indice <
                        0 ||
                        indice >=
                        linhas.length
                    ) {
                        continue;
                    }

                    const valores =
                        extrairValoresMonetarios(
                            linhas[
                            indice
                            ]
                        );

                    if (
                        valores.length
                    ) {
                        return valores[
                            valores.length -
                            1
                        ];
                    }
                }
            }
        }

        return 0;
    }

    function extrairValoresMonetarios(
        texto
    ) {
        return (
            String(texto)
                .match(
                    /(?:R\$\s*)?\d{1,3}(?:\.\d{3})*,\d{2}|(?:R\$\s*)?\d+,\d{2}/g
                ) ||
            []
        )
            .map(
                converterNumeroBrasileiro
            )
            .filter(
                valor =>
                    Number.isFinite(
                        valor
                    )
            );
    }

    function converterNumeroBrasileiro(
        valor
    ) {
        let texto =
            String(
                valor ||
                ""
            )
                .replace(
                    /R\$/gi,
                    ""
                )
                .replace(
                    /\s/g,
                    ""
                );

        if (
            texto.includes(
                ","
            )
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

        return converterNumero(
            texto
        );
    }

    function converterNumero(
        valor
    ) {
        const numero =
            Number(
                String(
                    valor ||
                    ""
                )
                    .replace(
                        ",",
                        "."
                    )
            );

        return Number.isFinite(
            numero
        )
            ? numero
            : 0;
    }

    /* =====================================================
       CONFIANÇA
       ===================================================== */

    function calcularConfianca(
        dados,
        modelo
    ) {
        const fator =
            modelo ===
                MODELOS_NOTA_FISCAL_RURAL
                    .PRODUTOR_ANTIGA
                ? 0.76
                : 0.94;

        const resultado = {
            numero:
                dados.numero
                    ? fator
                    : 0,

            data:
                dados.data
                    ? fator
                    : 0,

            emitente:
                dados.emitente
                    ? fator
                    : 0,

            valor:
                dados.valor > 0
                    ? fator
                    : 0
        };

        resultado.geral =
            (
                resultado.numero +
                resultado.data +
                resultado.emitente +
                resultado.valor
            ) /
            4;

        return resultado;
    }

    /* =====================================================
       COMPETÊNCIA
       ===================================================== */

    function formatarCompetenciaData(
        data
    ) {
        const match =
            String(
                data ||
                ""
            ).match(
                /^(\d{2})\/(\d{2})\/(\d{4})$/
            );

        if (!match) {
            return "";
        }

        return (
            `${match[3]}-${match[2]}`
        );
    }

    /* =====================================================
       DESCRIÇÃO DO MODELO
       ===================================================== */

    function obterDescricaoModelo(
        modelo
    ) {
        const descricoes = {
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
        };

        return (
            descricoes[
            modelo
            ] ||
            modelo
        );
    }

    /* =====================================================
       EXPORTAÇÃO
       ===================================================== */

    window.MODELOS_NOTA_FISCAL_RURAL =
        MODELOS_NOTA_FISCAL_RURAL;

    window.CreditoRuralNotasFiscais = {
        modelos:
            MODELOS_NOTA_FISCAL_RURAL,

        identificarModelo,

        avaliarQualidadeTexto,

        interpretar,

        interpretarXmlNfe,

        normalizarTexto:
            normalizarTextoOcr,

        normalizarComparacao,

        normalizarData,

        validarData,

        formatarCompetenciaData,

        converterNumeroBrasileiro
    };
})();