(function () {
    "use strict";

    const MODELOS = Object.freeze({
        XML_NFE: "xml_nfe",
        NFE: "nfe",
        NFSE: "nfse",
        PRODUTOR_ANTIGA: "produtor_antiga",
        GENERICA: "generica"
    });

    function normalizar(texto) {
        return String(texto || "")
            .replace(/\r/g, "\n")
            .replace(/[ \t]+/g, " ")
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
            )
        ) {
            return MODELOS.NFE;
        }

        if (
            t.includes("NFS-E") ||
            t.includes(
                "NOTA FISCAL DE SERVICOS ELETRONICA"
            )
        ) {
            return MODELOS.NFSE;
        }

        return MODELOS.GENERICA;
    }

    function avaliarQualidadeTexto(texto) {
        const t = comparacao(texto);

        if (!t) {
            return 0;
        }

        let score = 0;

        [
            "DANFE",
            "NOTA FISCAL",
            "CHAVE DE ACESSO",
            "EMISSAO",
            "VALOR TOTAL",
            "NCM",
            "CFOP",
            "DADOS DOS PRODUTOS"
        ].forEach(
            item => {
                if (t.includes(item)) {
                    score += 9;
                }
            }
        );

        if (t.length > 300) {
            score += 8;
        }

        if (t.length > 800) {
            score += 8;
        }

        return Math.min(
            100,
            score
        );
    }

    /* =====================================================
       XML
       ===================================================== */

    function locais(elemento, nome) {
        return Array.from(
            elemento?.getElementsByTagName?.("*") || []
        ).filter(
            item =>
                (
                    item.localName ||
                    item.nodeName.split(":").pop()
                ) === nome
        );
    }

    function local(elemento, nome) {
        return locais(
            elemento,
            nome
        )[0] || null;
    }

    function xmlTexto(elemento, nome) {
        return local(
            elemento,
            nome
        )?.textContent?.trim() || "";
    }

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
            doc.querySelector(
                "parsererror"
            )
        ) {
            throw new Error(
                "XML inválido."
            );
        }

        const infNFe =
            local(doc, "infNFe");

        const ide =
            local(doc, "ide");

        const emit =
            local(doc, "emit");

        const dest =
            local(doc, "dest");

        const total =
            local(doc, "ICMSTot");

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
            (
                xmlTexto(
                    local(doc, "infProt"),
                    "chNFe"
                ) ||
                infNFe
                    ?.getAttribute("Id")
                    ?.replace(/^NFe/, "") ||
                ""
            ).replace(/\D/g, "");

        const itens =
            locais(doc, "det")
                .map(det => {
                    const prod =
                        local(
                            det,
                            "prod"
                        );

                    return {
                        numeroItem:
                            det.getAttribute(
                                "nItem"
                            ) || "",

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
                            xmlTexto(
                                prod,
                                "NCM"
                            ),

                        cfop:
                            xmlTexto(
                                prod,
                                "CFOP"
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
                });

        return montarResultado({
            arquivo,
            modelo:
                MODELOS.XML_NFE,

            numero,
            serie,
            chaveAcesso:
                chave,

            data,
            emitente,
            destinatario,
            valor,
            itens,
            qualidadeTexto:
                100,

            texto:
                xmlOriginal,

            origemEstruturada:
                true
        });
    }

    function converterDataXml(valor) {
        const match =
            String(valor || "")
                .match(
                    /^(\d{4})-(\d{2})-(\d{2})/
                );

        return match
            ? `${match[3]}/${match[2]}/${match[1]}`
            : null;
    }

    /* =====================================================
       TEXTO / DANFE
       ===================================================== */

    function interpretar(
        original,
        arquivo = ""
    ) {
        const texto =
            normalizar(original);

        const modelo =
            identificarModelo(texto);

        const numero =
            extrairNumero(
                texto,
                modelo
            );

        const serie =
            extrairSerie(texto);

        const data =
            extrairData(texto);

        const emitente =
            extrairEmitente(texto);

        const valor =
            extrairValor(texto);

        const chave =
            extrairChave(texto);

        const itens =
            extrairItens(
                texto,
                modelo
            );

        return montarResultado({
            arquivo,
            modelo,
            numero,
            serie,
            chaveAcesso:
                chave,
            data,
            emitente,
            destinatario:
                "",
            valor,
            itens,
            qualidadeTexto:
                avaliarQualidadeTexto(
                    texto
                ),
            texto:
                original,
            origemEstruturada:
                false
        });
    }

    function montarResultado(dados) {
        const atividades =
            window.CreditoRuralNcmAtividades
                ?.consolidarAtividadesNota(
                    dados.itens
                ) || [];

        const documentoCompleto =
            Boolean(
                dados.numero &&
                dados.data &&
                Number(
                    dados.valor
                ) > 0
            );

        const nfe =
            dados.modelo ===
            MODELOS.NFE ||
            dados.modelo ===
            MODELOS.XML_NFE;

        /*
         * XML é confiável por estrutura.
         *
         * DANFE:
         * documento é considerado válido quando
         * número, data e valor foram extraídos e
         * a estrutura NF-e foi reconhecida.
         */
        const nfeLegivel =
            nfe &&
            documentoCompleto &&
            (
                dados.origemEstruturada ||
                dados.qualidadeTexto >= 30 ||
                String(
                    dados.chaveAcesso
                ).length === 44
            );

        const antiga =
            dados.modelo ===
            MODELOS.PRODUTOR_ANTIGA;

        const requerConferenciaDocumento =
            antiga
                ? !documentoCompleto
                : (
                    nfe
                        ? !nfeLegivel
                        : !documentoCompleto
                );

        const atividadesAutomaticas =
            atividades.filter(
                item =>
                    item.automatico
            );

        const atividadeAutomatica =
            atividadesAutomaticas.length >
            0;

        const alocacoesAtividade =
            montarAlocacoesAtividade(
                atividades,
                dados.itens,
                dados.valor
            );

        return {
            arquivo:
                dados.arquivo,

            modelo:
                dados.modelo,

            modeloDescricao:
                descricaoModelo(
                    dados.modelo
                ),

            numero:
                dados.numero || "",

            serie:
                dados.serie || "",

            chaveAcesso:
                dados.chaveAcesso || "",

            data:
                dados.data || null,

            competencia:
                competencia(
                    dados.data
                ),

            emitente:
                dados.emitente || "",

            destinatario:
                dados.destinatario || "",

            valor:
                Number(
                    dados.valor
                ) || 0,

            itens:
                dados.itens || [],

            atividadesSugeridas:
                atividades,

            alocacoesAtividade,

            atividadeAutomatica,

            documentoFiscalCompleto:
                documentoCompleto,

            nfeLegivel,

            requerConferenciaDocumento,

            /*
             * Compatibilidade:
             * só representa problema documental.
             */
            requerConferencia:
                requerConferenciaDocumento,

            confirmadaDocumento:
                !requerConferenciaDocumento,

            confirmada:
                !requerConferenciaDocumento,

            status:
                requerConferenciaDocumento
                    ? "Revisar documento"
                    : (
                        nfe
                            ? "NF-e identificada"
                            : "Documento identificado"
                    ),

            qualidadeTexto:
                dados.qualidadeTexto,

            texto:
                dados.texto
        };
    }

    /* =====================================================
       ALOCAÇÃO AUTOMÁTICA POR ATIVIDADE
       ===================================================== */

    function montarAlocacoesAtividade(
        atividades,
        itens,
        valorNota
    ) {
        if (!atividades.length) {
            return [];
        }

        if (atividades.length === 1) {
            return [{
                grupo:
                    atividades[0].grupo,

                atividade:
                    atividades[0].atividade,

                nomeAtividade:
                    atividades[0].nomeAtividade,

                valor:
                    Number(
                        valorNota
                    ) || 0,

                confianca:
                    atividades[0].confianca,

                automatico:
                    atividades[0].automatico
            }];
        }

        /*
         * Mais de uma atividade:
         * utiliza valor dos itens para não duplicar renda.
         */

        const totalProdutos =
            atividades.reduce(
                (soma, item) =>
                    soma +
                    (
                        Number(
                            item.valorProdutos
                        ) || 0
                    ),
                0
            );

        if (totalProdutos <= 0) {
            return [];
        }

        return atividades.map(
            item => ({
                grupo:
                    item.grupo,

                atividade:
                    item.atividade,

                nomeAtividade:
                    item.nomeAtividade,

                valor:
                    (
                        Number(
                            item.valorProdutos
                        ) /
                        totalProdutos
                    ) *
                    Number(
                        valorNota
                    ),

                confianca:
                    item.confianca,

                automatico:
                    item.automatico
            })
        );
    }

    /* =====================================================
       EXTRAÇÕES
       ===================================================== */

    function extrairNumero(texto, modelo) {
        const padroes = modelo ===
            MODELOS.PRODUTOR_ANTIGA
            ? [
                /NOTA\s+FISCAL\s+DE\s+PRODUTOR[\s\S]{0,100}?N[º°O.]?\s*[:.-]?\s*0*(\d{1,12})/i,
                /\bN[º°]\s*[:.-]?\s*0*(\d{1,12})\b/i
            ]
            : [
                /NF-?E[\s\S]{0,60}?N[º°O.]?\s*[:.-]?\s*0*(\d{1,12})/i,
                /N[º°O.]?\s*[:.-]?\s*0*(\d{1,12})\s*(?:SERIE|S[ÉE]RIE)/i,
                /\bN[º°]\s*[:.-]?\s*0*(\d{1,12})\b/i
            ];

        for (const regex of padroes) {
            const match =
                texto.match(regex);

            if (match?.[1]) {
                return String(
                    Number(
                        match[1]
                    )
                );
            }
        }

        return "";
    }

    function extrairSerie(texto) {
        const match =
            texto.match(
                /S[ÉE]RIE\s*[:.-]?\s*(\d{1,4})/i
            );

        return match?.[1] || "";
    }

    function extrairChave(texto) {
        const limpo =
            String(texto || "")
                .replace(
                    /[\s.-]/g,
                    ""
                );

        const match =
            limpo.match(
                /\d{44}/
            );

        return match?.[0] || "";
    }

    function extrairData(texto) {
        const padroes = [
            /EMISS[AÃ]O\s*[:.-]\s*(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/i,
            /DATA\s+(?:DA|DE)\s+EMISS[AÃ]O[^0-9]{0,50}(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/i
        ];

        for (const regex of padroes) {
            const match =
                texto.match(regex);

            if (match?.[1]) {
                return normalizarData(
                    match[1]
                );
            }
        }

        const match =
            texto.match(
                /\b\d{2}\/\d{2}\/\d{4}\b/
            );

        return match
            ? normalizarData(
                match[0]
            )
            : null;
    }

    function extrairEmitente(texto) {
        const recebido =
            texto.match(
                /RECEBEMOS\s+DE\s+(.+?)\s+OS\s+PRODUTOS/i
            );

        if (recebido?.[1]) {
            return recebido[1]
                .replace(/\s+/g, " ")
                .trim();
        }

        const razao =
            texto.match(
                /RAZ[AÃ]O\s+SOCIAL[\s:.-]+([^\n]+)/i
            );

        return razao?.[1]
            ?.trim() || "";
    }

    function extrairValor(texto) {
        const padroes = [
            /VALOR\s+TOTAL\s+(?:DA\s+)?NOTA[^0-9]{0,100}(?:R\$\s*)?([\d.]+,\d{2})/i,
            /TOTAL\s+DA\s+NOTA[^0-9]{0,100}(?:R\$\s*)?([\d.]+,\d{2})/i,
            /EMISS[AÃ]O\s*:[\s\S]{0,250}?VALOR\s*:\s*R?\$?\s*([\d.]+,\d{2})/i
        ];

        for (const regex of padroes) {
            const match =
                texto.match(regex);

            if (match?.[1]) {
                return moeda(
                    match[1]
                );
            }
        }

        return 0;
    }

    function extrairItens(texto, modelo) {
        if (
            modelo !== MODELOS.NFE &&
            modelo !== MODELOS.PRODUTOR_ANTIGA
        ) {
            return [];
        }

        const linhas =
            String(texto || "")
                .split(/\n/)
                .map(
                    item =>
                        item.trim()
                )
                .filter(Boolean);

        const itens = [];

        for (
            let i = 0;
            i < linhas.length;
            i++
        ) {
            const bloco = [
                linhas[i - 2] || "",
                linhas[i - 1] || "",
                linhas[i],
                linhas[i + 1] || "",
                linhas[i + 2] || ""
            ].join(" ");

            const ncm =
                bloco.match(
                    /\b(\d{8})\b/
                )?.[1];

            if (!ncm) {
                continue;
            }

            const cfop =
                bloco.match(
                    /\b([12567]\d{3})\b/
                )?.[1] || "";

            const indice =
                bloco.indexOf(ncm);

            let descricao =
                indice > 0
                    ? bloco
                        .substring(
                            0,
                            indice
                        )
                        .trim()
                    : "";

            /*
             * Mantém apenas a parte final antes do NCM.
             */
            descricao =
                descricao
                    .replace(
                        /.*(?:DESCRI[CÇ][AÃ]O\s+DO\s+PRODUTO\s*\/?\s*SERVI[CÇ]O)/i,
                        ""
                    )
                    .trim();

            descricao =
                descricao
                    .replace(
                        /^\S{1,20}\s+/,
                        ""
                    )
                    .trim();

            const valores =
                bloco.match(
                    /\d[\d.]*,\d{2,6}/g
                ) || [];

            const convertidos =
                valores
                    .map(moeda)
                    .filter(
                        Number.isFinite
                    );

            itens.push({
                numeroItem:
                    String(
                        itens.length + 1
                    ),

                codigoProduto:
                    "",

                gtin:
                    "",

                descricao:
                    descricao.substring(
                        0,
                        180
                    ),

                ncm,

                cfop,

                unidade:
                    "",

                quantidade:
                    0,

                valorUnitario:
                    0,

                valorProduto:
                    convertidos.length
                        ? Math.max(
                            ...convertidos
                        )
                        : 0
            });
        }

        const mapa = new Map();

        itens.forEach(item => {
            const chave =
                `${item.ncm}|${comparacao(item.descricao)}`;

            if (!mapa.has(chave)) {
                mapa.set(
                    chave,
                    item
                );
            }
        });

        return Array.from(
            mapa.values()
        );
    }

    function normalizarData(valor) {
        const match =
            String(valor || "")
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
            Number(match[3]);

        if (ano < 100) {
            ano += ano >= 50
                ? 1900
                : 2000;
        }

        return `${String(Number(match[1])).padStart(2, "0")}/${String(Number(match[2])).padStart(2, "0")}/${ano}`;
    }

    function validarData(data) {
        return /^\d{2}\/\d{2}\/\d{4}$/.test(
            String(data || "")
        );
    }

    function competencia(data) {
        const match =
            String(data || "")
                .match(
                    /^(\d{2})\/(\d{2})\/(\d{4})$/
                );

        return match
            ? `${match[3]}-${match[2]}`
            : "";
    }

    function moeda(valor) {
        const numero =
            Number(
                String(valor || "")
                    .replace(/\./g, "")
                    .replace(",", ".")
                    .replace(
                        /[^\d.-]/g,
                        ""
                    )
            );

        return Number.isFinite(numero)
            ? numero
            : 0;
    }

    function numeroJs(valor) {
        const numero =
            Number(
                String(valor || "")
                    .replace(",", ".")
            );

        return Number.isFinite(numero)
            ? numero
            : 0;
    }

    function descricaoModelo(modelo) {
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
        }[modelo] || modelo;
    }

    window.CreditoRuralNotasFiscais = {
        modelos: MODELOS,
        interpretar,
        interpretarXmlNfe,
        identificarModelo,
        avaliarQualidadeTexto,
        normalizarData,
        validarData,
        formatarCompetenciaData:
            competencia
    };
})();