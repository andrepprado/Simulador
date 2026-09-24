(function () {
    "use strict";

    const URL_BASE_CREDITO_RURAL =
        "arquivos/credito-rural/RELACAO_UNIFICADA_HORIZONTAL.tsv";

    let registros = [];
    let carregada = false;
    let carregando = null;

    function normalizarTexto(valor) {
        return String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim();
    }

    function limparValor(valor) {
        return String(valor ?? "")
            .replace(/\r/g, "")
            .trim();
    }

    function parseTsv(texto) {
        const linhas = [];

        let linha = [];
        let campo = "";
        let dentroAspas = false;

        for (
            let i = 0;
            i < texto.length;
            i++
        ) {
            const caractere =
                texto[i];

            const proximo =
                texto[i + 1];

            if (
                caractere === '"'
            ) {
                if (
                    dentroAspas &&
                    proximo === '"'
                ) {
                    campo += '"';
                    i++;
                    continue;
                }

                dentroAspas =
                    !dentroAspas;

                continue;
            }

            if (
                caractere === "\t" &&
                !dentroAspas
            ) {
                linha.push(
                    campo
                );

                campo = "";

                continue;
            }

            if (
                (
                    caractere === "\n" ||
                    caractere === "\r"
                ) &&
                !dentroAspas
            ) {
                if (
                    caractere === "\r" &&
                    proximo === "\n"
                ) {
                    i++;
                }

                linha.push(
                    campo
                );

                campo = "";

                if (
                    linha.length > 1 ||
                    linha.some(
                        valor =>
                            limparValor(
                                valor
                            )
                    )
                ) {
                    linhas.push(
                        linha
                    );
                }

                linha = [];

                continue;
            }

            campo += caractere;
        }

        if (
            campo.length ||
            linha.length
        ) {
            linha.push(
                campo
            );

            if (
                linha.length > 1 ||
                linha.some(
                    valor =>
                        limparValor(
                            valor
                        )
                )
            ) {
                linhas.push(
                    linha
                );
            }
        }

        return linhas;
    }

    function percentualParaNumero(
        valor
    ) {
        const texto =
            limparValor(
                valor
            )
                .replace(
                    "%",
                    ""
                )
                .replace(
                    /\./g,
                    ""
                )
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
            : null;
    }

    function inteiroOuNull(
        valor
    ) {
        const numero =
            Number(
                limparValor(
                    valor
                )
                    .replace(
                        /\D/g,
                        ""
                    )
            );

        return (
            Number.isFinite(
                numero
            ) &&
            numero > 0
        )
            ? numero
            : null;
    }

    function mapearRegistro(
        cabecalhos,
        valores,
        indice
    ) {
        const objeto = {};

        cabecalhos.forEach(
            (
                cabecalho,
                posicao
            ) => {
                objeto[
                    cabecalho
                ] =
                    limparValor(
                        valores[
                        posicao
                        ]
                    );
            }
        );

        const linhas = [];

        for (
            let i = 1;
            i <= 7;
            i++
        ) {
            const chave =
                objeto[
                `Chave Regra ${i}`
                ];

            const linha =
                objeto[
                `Linha ${i}`
                ];

            if (
                !chave &&
                !linha
            ) {
                continue;
            }

            linhas.push({
                numero:
                    i,

                chave:
                    chave,

                beneficiario:
                    objeto[
                    `Beneficiário ${i}`
                    ],

                linha:
                    linha,

                finalidade:
                    objeto[
                    `Finalidade da Linha ${i}`
                    ],

                fonte:
                    objeto[
                    `Fonte de Recursos ${i}`
                    ],

                prazo:
                    inteiroOuNull(
                        objeto[
                        `Prazo Máx. Meses ${i}`
                        ]
                    ),

                taxaSingularTexto:
                    objeto[
                    `Taxa Singular ${i}`
                    ],

                taxaAssociadoTexto:
                    objeto[
                    `Taxa Associado ${i}`
                    ],

                taxaSingular:
                    percentualParaNumero(
                        objeto[
                        `Taxa Singular ${i}`
                        ]
                    ),

                taxaAssociado:
                    percentualParaNumero(
                        objeto[
                        `Taxa Associado ${i}`
                        ]
                    ),

                aplicabilidade:
                    objeto[
                    `Aplicabilidade ${i}`
                    ],

                condicao:
                    objeto[
                    `Condição / Observação ${i}`
                    ],

                fonteRegra:
                    objeto[
                    `Fonte Regra ${i}`
                    ]
            });
        }

        return {
            id:
                String(
                    indice
                ),

            codigo:
                objeto[
                "Código"
                ],

            produto:
                objeto[
                "Produto"
                ],

            finalidade:
                objeto[
                "Finalidade"
                ],

            modalidade:
                objeto[
                "Modalidade"
                ],

            variedade:
                objeto[
                "Variedade"
                ],

            cesta:
                objeto[
                "Cesta"
                ],

            consorcio:
                objeto[
                "Consórcio"
                ],

            unidadeProducao:
                objeto[
                "U.M. Produção"
                ],

            zoneamento:
                objeto[
                "Zoneamento"
                ],

            abaOrigem:
                objeto[
                "Aba Origem"
                ],

            linhas:
                linhas
        };
    }

    async function carregar() {
        if (
            carregada
        ) {
            return registros;
        }

        if (
            carregando
        ) {
            return carregando;
        }

        carregando =
            (
                async () => {
                    const resposta =
                        await fetch(
                            URL_BASE_CREDITO_RURAL,
                            {
                                cache:
                                    "no-store"
                            }
                        );

                    if (
                        !resposta.ok
                    ) {
                        throw new Error(
                            `Não foi possível carregar a base de Crédito Rural. HTTP ${resposta.status}.`
                        );
                    }

                    const texto =
                        await resposta.text();

                    const tabela =
                        parseTsv(
                            texto
                        );

                    if (
                        tabela.length <
                        2
                    ) {
                        throw new Error(
                            "A base de Crédito Rural está vazia ou em formato inválido."
                        );
                    }

                    const cabecalhos =
                        tabela[0]
                            .map(
                                limparValor
                            );

                    registros =
                        tabela
                            .slice(
                                1
                            )
                            .filter(
                                linha =>
                                    limparValor(
                                        linha[0]
                                    )
                            )
                            .map(
                                (
                                    linha,
                                    indice
                                ) =>
                                    mapearRegistro(
                                        cabecalhos,
                                        linha,
                                        indice
                                    )
                            );

                    carregada =
                        true;

                    return registros;
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
        if (
            !carregada
        ) {
            throw new Error(
                "A base de Crédito Rural ainda não foi carregada."
            );
        }
    }

    function listarFinalidades() {
        garantirCarregada();

        const ordemPreferencial = [
            "Custeio Agrícola",
            "Custeio Pecuário",
            "Investimento"
        ];

        const existentes =
            [
                ...new Set(
                    registros.map(
                        item =>
                            item.finalidade
                    )
                )
            ];

        return existentes.sort(
            (
                a,
                b
            ) => {
                const ia =
                    ordemPreferencial.indexOf(
                        a
                    );

                const ib =
                    ordemPreferencial.indexOf(
                        b
                    );

                if (
                    ia !== -1 ||
                    ib !== -1
                ) {
                    if (
                        ia === -1
                    ) {
                        return 1;
                    }

                    if (
                        ib === -1
                    ) {
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

    function listarProdutos(
        finalidade
    ) {
        garantirCarregada();

        return [
            ...new Set(
                registros
                    .filter(
                        item =>
                            item.finalidade ===
                            finalidade
                    )
                    .map(
                        item =>
                            item.produto
                    )
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

    function listarEnquadramentos(
        finalidade,
        produto
    ) {
        garantirCarregada();

        return registros.filter(
            item =>
                item.finalidade ===
                finalidade &&
                item.produto ===
                produto
        );
    }

    function obterEnquadramento(
        id
    ) {
        garantirCarregada();

        return registros.find(
            item =>
                item.id ===
                String(
                    id
                )
        ) || null;
    }

    function obterLinha(
        enquadramentoId,
        indiceLinha
    ) {
        const enquadramento =
            obterEnquadramento(
                enquadramentoId
            );

        if (
            !enquadramento
        ) {
            return null;
        }

        return enquadramento
            .linhas[
            Number(
                indiceLinha
            )
        ] || null;
    }

    function resumirTexto(
        texto,
        tamanho = 70
    ) {
        const valor =
            limparValor(
                texto
            );

        if (
            valor.length <=
            tamanho
        ) {
            return valor;
        }

        return (
            valor.slice(
                0,
                tamanho - 3
            ) +
            "..."
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

        if (
            item.modalidade
        ) {
            partes.push(
                resumirTexto(
                    item.modalidade,
                    55
                )
            );
        }

        if (
            item.variedade &&
            ![
                "não se aplica",
                "não é aplicável"
            ].includes(
                normalizarTexto(
                    item.variedade
                )
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
            item.consorcio &&
            normalizarTexto(
                item.consorcio
            ) !==
            "não se aplica"
        ) {
            partes.push(
                item.consorcio
            );
        }

        if (
            item.zoneamento &&
            normalizarTexto(
                item.zoneamento
            ) !==
            "não se aplica"
        ) {
            partes.push(
                item.zoneamento
            );
        }

        return partes.join(
            " | "
        );
    }

    function preencherFinalidades(
        select,
        selecionada = ""
    ) {
        if (
            !select
        ) {
            return;
        }

        select.innerHTML =
            "";

        listarFinalidades()
            .forEach(
                nome => {
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
            );
    }

    function preencherProdutos(
        select,
        finalidade,
        selecionado = ""
    ) {
        if (
            !select
        ) {
            return;
        }

        select.innerHTML =
            "";

        listarProdutos(
            finalidade
        ).forEach(
            nome => {
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
        );
    }

    function preencherEnquadramentos(
        select,
        finalidade,
        produto,
        selecionado = ""
    ) {
        if (
            !select
        ) {
            return [];
        }

        const lista =
            listarEnquadramentos(
                finalidade,
                produto
            );

        select.innerHTML =
            "";

        lista.forEach(
            item => {
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
                    selecionado
                ) {
                    option.selected =
                        true;
                }

                select.appendChild(
                    option
                );
            }
        );

        select.disabled =
            lista.length <= 1;

        return lista;
    }

    function obterUrlBase() {
        return URL_BASE_CREDITO_RURAL;
    }

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
            obterUrlBase
        });

})();