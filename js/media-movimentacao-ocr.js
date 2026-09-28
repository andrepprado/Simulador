(function () {
    "use strict";

    let arquivosExtratoSelecionados = [];
    let resultadoLeituraOCR = null;

    const TIPOS_DOCUMENTO = {
        EXTRATO_CONTA:
            "EXTRATO_CONTA",

        FATURA_CARTAO:
            "FATURA_CARTAO",

        INVESTIMENTO:
            "INVESTIMENTO",

        DESCONHECIDO:
            "DESCONHECIDO"
    };

    const MESES = {
        JAN: 1,
        JANEIRO: 1,
        FEV: 2,
        FEVEREIRO: 2,
        MAR: 3,
        MARCO: 3,
        ABR: 4,
        ABRIL: 4,
        MAI: 5,
        MAIO: 5,
        JUN: 6,
        JUNHO: 6,
        JUL: 7,
        JULHO: 7,
        AGO: 8,
        AGOSTO: 8,
        SET: 9,
        SETEMBRO: 9,
        OUT: 10,
        OUTUBRO: 10,
        NOV: 11,
        NOVEMBRO: 11,
        DEZ: 12,
        DEZEMBRO: 12
    };

    document.addEventListener(
        "DOMContentLoaded",
        iniciarLeituraExtratos
    );

    function iniciarLeituraExtratos() {
        const input =
            document.getElementById(
                "arquivosExtrato"
            );

        const area =
            document.getElementById(
                "areaUploadExtrato"
            );

        const btnLer =
            document.getElementById(
                "btnLerExtratos"
            );

        const btnLimpar =
            document.getElementById(
                "btnLimparArquivosExtrato"
            );

        const btnAplicar =
            document.getElementById(
                "btnAplicarLeituraOCR"
            );

        const btnCopiar =
            document.getElementById(
                "btnCopiarResumoOCR"
            );

        const btnTodos =
            document.getElementById(
                "btnSelecionarTodosOCR"
            );

        const btnNenhum =
            document.getElementById(
                "btnDesmarcarTodosOCR"
            );

        if (input) {
            input.addEventListener(
                "change",
                e => {
                    adicionarArquivos(
                        e.target.files
                    );
                }
            );
        }

        if (area) {
            area.addEventListener(
                "dragover",
                e => {
                    e.preventDefault();

                    area.classList.add(
                        "arrastando"
                    );
                }
            );

            area.addEventListener(
                "dragleave",
                () => {
                    area.classList.remove(
                        "arrastando"
                    );
                }
            );

            area.addEventListener(
                "drop",
                e => {
                    e.preventDefault();

                    area.classList.remove(
                        "arrastando"
                    );

                    if (
                        e.dataTransfer &&
                        e.dataTransfer.files
                    ) {
                        adicionarArquivos(
                            e.dataTransfer.files
                        );
                    }
                }
            );
        }

        if (btnLer) {
            btnLer.addEventListener(
                "click",
                processarArquivosExtrato
            );
        }

        if (btnLimpar) {
            btnLimpar.addEventListener(
                "click",
                limparArquivosExtrato
            );
        }

        if (btnAplicar) {
            btnAplicar.addEventListener(
                "click",
                aplicarLeituraAoCalculo
            );
        }

        if (btnCopiar) {
            btnCopiar.addEventListener(
                "click",
                copiarResumoLeitura
            );
        }

        if (btnTodos) {
            btnTodos.addEventListener(
                "click",
                () =>
                    alterarSelecaoMovimentacoes(
                        true
                    )
            );
        }

        if (btnNenhum) {
            btnNenhum.addEventListener(
                "click",
                () =>
                    alterarSelecaoMovimentacoes(
                        false
                    )
            );
        }

        renderizarArquivosSelecionados();
        limparResumoOCR();
    }

    /*
     * =========================================================
     * ARQUIVOS
     * =========================================================
     */

    function adicionarArquivos(
        fileList
    ) {
        const permitidos = [
            "pdf",
            "png",
            "jpg",
            "jpeg",
            "webp",
            "txt",
            "csv",
            "html",
            "htm"
        ];

        Array.from(
            fileList || []
        ).forEach(
            file => {
                const ext =
                    obterExtensao(
                        file.name
                    );

                if (
                    !permitidos.includes(
                        ext
                    )
                ) {
                    return;
                }

                const duplicado =
                    arquivosExtratoSelecionados.some(
                        item =>
                            item.name ===
                            file.name &&
                            item.size ===
                            file.size &&
                            item.lastModified ===
                            file.lastModified
                    );

                if (!duplicado) {
                    arquivosExtratoSelecionados.push(
                        file
                    );
                }
            }
        );

        const input =
            document.getElementById(
                "arquivosExtrato"
            );

        if (input) {
            input.value =
                "";
        }

        renderizarArquivosSelecionados();
    }

    function renderizarArquivosSelecionados() {
        const lista =
            document.getElementById(
                "listaArquivosExtrato"
            );

        const quantidade =
            document.getElementById(
                "quantidadeArquivosExtrato"
            );

        const btnLer =
            document.getElementById(
                "btnLerExtratos"
            );

        const btnLimpar =
            document.getElementById(
                "btnLimparArquivosExtrato"
            );

        if (quantidade) {
            quantidade.textContent =
                arquivosExtratoSelecionados.length;
        }

        if (btnLer) {
            btnLer.disabled =
                arquivosExtratoSelecionados.length ===
                0;
        }

        if (btnLimpar) {
            btnLimpar.disabled =
                arquivosExtratoSelecionados.length ===
                0;
        }

        if (!lista) {
            return;
        }

        if (
            !arquivosExtratoSelecionados.length
        ) {
            lista.innerHTML =
                '<div class="sem-dados">Nenhum arquivo selecionado.</div>';

            return;
        }

        lista.innerHTML =
            arquivosExtratoSelecionados
                .map(
                    (
                        arquivo,
                        indice
                    ) => `
                        <div class="arquivo-extrato-item">
                            <div class="arquivo-extrato-info">
                                <div class="arquivo-extrato-icone">
                                    ${escaparHTML(obterExtensao(arquivo.name).toUpperCase())}
                                </div>

                                <div class="arquivo-extrato-dados">
                                    <strong>${escaparHTML(arquivo.name)}</strong>
                                    <span>${formatarTamanhoArquivo(arquivo.size)}</span>
                                </div>
                            </div>

                            <button
                                type="button"
                                class="btn-remover-arquivo"
                                data-indice="${indice}"
                                title="Remover arquivo"
                            >×</button>
                        </div>
                    `
                )
                .join("");

        lista
            .querySelectorAll(
                ".btn-remover-arquivo"
            )
            .forEach(
                btn => {
                    btn.addEventListener(
                        "click",
                        () => {
                            arquivosExtratoSelecionados.splice(
                                Number(
                                    btn.dataset.indice
                                ),
                                1
                            );

                            renderizarArquivosSelecionados();
                        }
                    );
                }
            );
    }

    function limparArquivosExtrato() {
        arquivosExtratoSelecionados =
            [];

        resultadoLeituraOCR =
            null;

        const input =
            document.getElementById(
                "arquivosExtrato"
            );

        if (input) {
            input.value =
                "";
        }

        renderizarArquivosSelecionados();
        ocultarResultadoOCR();
        limparTabelaMovimentacoesOCR();
        limparResumoOCR();

        definirStatus(
            "Pronto para ler os extratos.",
            "info"
        );
    }

    /*
     * =========================================================
     * PROCESSAMENTO
     * =========================================================
     */

    async function processarArquivosExtrato() {
        if (
            !arquivosExtratoSelecionados.length
        ) {
            return;
        }

        const btn =
            document.getElementById(
                "btnLerExtratos"
            );

        if (btn) {
            btn.disabled =
                true;

            btn.textContent =
                "Processando...";
        }

        const resultado = {
            documentos:
                [],

            movimentacoes:
                [],

            alertas:
                [],

            competencias:
                new Set(),

            instituicoes:
                new Set(),

            textoConsolidado:
                "",

            titular:
                "",

            documentoTitular:
                "",

            primeiraData:
                null,

            ultimaData:
                null
        };

        try {
            for (
                let indice = 0;
                indice <
                arquivosExtratoSelecionados.length;
                indice++
            ) {
                const arquivo =
                    arquivosExtratoSelecionados[
                    indice
                    ];

                definirStatus(
                    `Processando ${indice + 1} de ${arquivosExtratoSelecionados.length}: ${arquivo.name}`,
                    "processando"
                );

                try {
                    const documento =
                        await lerArquivoExtrato(
                            arquivo,
                            indice
                        );

                    documento.banco =
                        identificarInstituicao(
                            documento.texto
                        );

                    documento.tipoDocumento =
                        identificarTipoDocumento(
                            documento.texto,
                            documento.banco
                        );

                    documento.excluidoDaApuracao =
                        documento.tipoDocumento !==
                        TIPOS_DOCUMENTO.EXTRATO_CONTA;

                    documento.motivoExclusao =
                        obterMotivoExclusaoDocumento(
                            documento
                        );

                    resultado.documentos.push(
                        documento
                    );

                    if (
                        documento.banco
                    ) {
                        resultado.instituicoes.add(
                            documento.banco
                        );
                    }

                    if (
                        documento.excluidoDaApuracao
                    ) {
                        resultado.alertas.push(
                            `${documento.nome}: ${documento.motivoExclusao}`
                        );

                        continue;
                    }

                    const identidade =
                        identificarDadosTitular(
                            documento.texto
                        );

                    if (
                        !resultado.titular &&
                        identidade.nome
                    ) {
                        resultado.titular =
                            identidade.nome;
                    }

                    if (
                        !resultado.documentoTitular &&
                        identidade.documento
                    ) {
                        resultado.documentoTitular =
                            identidade.documento;
                    }

                    const movimentacoes =
                        extrairMovimentacoesDocumento(
                            documento
                        );

                    movimentacoes.forEach(
                        movimento => {
                            resultado.movimentacoes.push(
                                movimento
                            );

                            const data =
                                parseDataBR(
                                    movimento.data
                                );

                            if (data) {
                                resultado.competencias.add(
                                    obterCompetenciaData(
                                        data
                                    )
                                );
                            }
                        }
                    );
                } catch (erro) {
                    console.error(
                        arquivo.name,
                        erro
                    );

                    resultado.alertas.push(
                        `${arquivo.name}: ${erro.message || erro}`
                    );
                }
            }

            /*
             * NÃO FAZEMOS DEDUPLICAÇÃO POR:
             *
             * data + valor + histórico.
             *
             * Cada lançamento extraído possui ID pela
             * posição real no documento.
             */
            resultado.movimentacoes.sort(
                (
                    a,
                    b
                ) => {
                    const da =
                        parseDataBR(
                            a.data
                        );

                    const db =
                        parseDataBR(
                            b.data
                        );

                    if (
                        da &&
                        db &&
                        da -
                        db !==
                        0
                    ) {
                        return da -
                            db;
                    }

                    return (
                        a.ordem -
                        b.ordem
                    );
                }
            );

            resultado.competencias =
                Array.from(
                    resultado.competencias
                ).sort();

            resultado.instituicoes =
                Array.from(
                    resultado.instituicoes
                );

            recalcularPeriodo(
                resultado
            );

            resultado.textoConsolidado =
                gerarTextoConsolidado(
                    resultado.movimentacoes
                );

            resultadoLeituraOCR =
                resultado;

            renderizarResultadoOCR(
                resultado
            );

            enviarMovimentacoesParaCalculadora(
                resultado
            );

            mostrarResultadoOCR();

            definirStatus(
                `Leitura concluída. ${resultado.documentos.length} arquivo(s) processado(s).`,
                "sucesso"
            );
        } catch (erro) {
            console.error(
                erro
            );

            definirStatus(
                `Erro durante a leitura: ${erro.message || erro}`,
                "erro"
            );
        } finally {
            if (btn) {
                btn.disabled =
                    !arquivosExtratoSelecionados.length;

                btn.textContent =
                    "Ler e Consolidar";
            }
        }
    }

    /*
     * =========================================================
     * LEITURA
     * =========================================================
     */

    async function lerArquivoExtrato(
        arquivo,
        indice
    ) {
        const ext =
            obterExtensao(
                arquivo.name
            );

        const base = {
            id:
                `ARQ${indice + 1}`,

            nome:
                arquivo.name,

            tamanho:
                arquivo.size,

            tipo:
                arquivo.type,

            metodo:
                "",

            texto:
                "",

            banco:
                "",

            tipoDocumento:
                TIPOS_DOCUMENTO.DESCONHECIDO,

            excluidoDaApuracao:
                false,

            motivoExclusao:
                ""
        };

        if (
            [
                "txt",
                "csv",
                "html",
                "htm"
            ].includes(
                ext
            )
        ) {
            base.metodo =
                "Leitura direta";

            base.texto =
                await arquivo.text();

            if (
                [
                    "html",
                    "htm"
                ].includes(
                    ext
                )
            ) {
                base.texto =
                    converterHTMLParaTexto(
                        base.texto
                    );
            }

            return base;
        }

        if (
            [
                "png",
                "jpg",
                "jpeg",
                "webp"
            ].includes(
                ext
            )
        ) {
            base.metodo =
                "OCR";

            base.texto =
                await executarOCRImagem(
                    arquivo
                );

            return base;
        }

        if (
            ext ===
            "pdf"
        ) {
            base.metodo =
                "PDF";

            base.texto =
                await lerPDF(
                    arquivo
                );

            if (
                !base.texto ||
                base.texto
                    .replace(
                        /\s/g,
                        ""
                    )
                    .length <
                30
            ) {
                base.metodo =
                    "PDF/OCR";

                base.texto =
                    await lerPDFComOCR(
                        arquivo
                    );
            }

            return base;
        }

        throw new Error(
            "Formato não suportado."
        );
    }

    async function lerPDF(
        arquivo
    ) {
        if (
            typeof pdfjsLib ===
            "undefined"
        ) {
            throw new Error(
                "PDF.js não foi carregado."
            );
        }

        const buffer =
            await arquivo.arrayBuffer();

        const pdf =
            await pdfjsLib
                .getDocument({
                    data:
                        buffer
                })
                .promise;

        const paginas =
            [];

        for (
            let numero = 1;
            numero <=
            pdf.numPages;
            numero++
        ) {
            definirStatus(
                `Lendo ${arquivo.name} — página ${numero} de ${pdf.numPages}...`,
                "processando"
            );

            const pagina =
                await pdf.getPage(
                    numero
                );

            const conteudo =
                await pagina.getTextContent({
                    normalizeWhitespace:
                        true,

                    disableCombineTextItems:
                        false
                });

            paginas.push(
                agruparItensPDFPorLinha(
                    conteudo.items
                ).join(
                    "\n"
                )
            );
        }

        return paginas.join(
            "\n"
        );
    }

    function agruparItensPDFPorLinha(
        items
    ) {
        const grupos =
            [];

        (
            items || []
        ).forEach(
            item => {
                const texto =
                    String(
                        item.str || ""
                    ).trim();

                if (!texto) {
                    return;
                }

                const x =
                    item.transform
                        ? Number(
                            item.transform[
                            4
                            ] ||
                            0
                        )
                        : 0;

                const y =
                    item.transform
                        ? Number(
                            item.transform[
                            5
                            ] ||
                            0
                        )
                        : 0;

                let grupo =
                    grupos.find(
                        g =>
                            Math.abs(
                                g.y -
                                y
                            ) <=
                            2.5
                    );

                if (!grupo) {
                    grupo = {
                        y,
                        itens:
                            []
                    };

                    grupos.push(
                        grupo
                    );
                }

                grupo.itens.push({
                    x,
                    texto
                });
            }
        );

        grupos.sort(
            (
                a,
                b
            ) =>
                b.y -
                a.y
        );

        return grupos
            .map(
                grupo => {
                    grupo.itens.sort(
                        (
                            a,
                            b
                        ) =>
                            a.x -
                            b.x
                    );

                    return grupo.itens
                        .map(
                            item =>
                                item.texto
                        )
                        .join(
                            " "
                        )
                        .replace(
                            /\s+/g,
                            " "
                        )
                        .trim();
                }
            )
            .filter(Boolean);
    }

    async function lerPDFComOCR(
        arquivo
    ) {
        if (
            typeof pdfjsLib ===
            "undefined"
        ) {
            throw new Error(
                "PDF.js não foi carregado."
            );
        }

        const buffer =
            await arquivo.arrayBuffer();

        const pdf =
            await pdfjsLib
                .getDocument({
                    data:
                        buffer
                })
                .promise;

        const partes =
            [];

        for (
            let numero = 1;
            numero <=
            pdf.numPages;
            numero++
        ) {
            definirStatus(
                `OCR ${arquivo.name} — página ${numero} de ${pdf.numPages}...`,
                "processando"
            );

            const pagina =
                await pdf.getPage(
                    numero
                );

            const viewport =
                pagina.getViewport({
                    scale:
                        2
                });

            const canvas =
                document.createElement(
                    "canvas"
                );

            canvas.width =
                Math.ceil(
                    viewport.width
                );

            canvas.height =
                Math.ceil(
                    viewport.height
                );

            const contexto =
                canvas.getContext(
                    "2d",
                    {
                        willReadFrequently:
                            true
                    }
                );

            await pagina.render({
                canvasContext:
                    contexto,

                viewport
            }).promise;

            const blob =
                await new Promise(
                    (
                        resolve,
                        reject
                    ) => {
                        canvas.toBlob(
                            resultado =>
                                resultado
                                    ? resolve(
                                        resultado
                                    )
                                    : reject(
                                        new Error(
                                            "Falha ao converter página."
                                        )
                                    ),
                            "image/png"
                        );
                    }
                );

            partes.push(
                await executarOCRImagem(
                    blob
                )
            );

            canvas.width =
                1;

            canvas.height =
                1;
        }

        return partes.join(
            "\n"
        );
    }

    async function executarOCRImagem(
        arquivo
    ) {
        if (
            typeof Tesseract ===
            "undefined"
        ) {
            throw new Error(
                "Tesseract.js não foi carregado."
            );
        }

        const resultado =
            await Tesseract.recognize(
                arquivo,
                "por",
                {
                    logger:
                        mensagem => {
                            if (
                                !mensagem ||
                                !mensagem.status
                            ) {
                                return;
                            }

                            const percentual =
                                Number.isFinite(
                                    mensagem.progress
                                )
                                    ? ` ${Math.round(mensagem.progress * 100)}%`
                                    : "";

                            definirStatus(
                                `OCR: ${mensagem.status}${percentual}`,
                                "processando"
                            );
                        }
                }
            );

        return resultado &&
            resultado.data
            ? String(
                resultado.data.text ||
                ""
            )
            : "";
    }

    /*
     * =========================================================
     * DOCUMENTO / BANCO
     * =========================================================
     */

    function identificarInstituicao(
        texto
    ) {
        const normal =
            normalizar(
                texto
            );

        const bancos = [
            [
                [
                    "SICOOB"
                ],
                "Sicoob"
            ],
            [
                [
                    "MERCADO PAGO"
                ],
                "Mercado Pago"
            ],
            [
                [
                    "BANCO INTER",
                    "INTER PAGAMENTOS"
                ],
                "Banco Inter"
            ],
            [
                [
                    "NUBANK",
                    "NU PAGAMENTOS",
                    "CONTA DO NUBANK"
                ],
                "Nubank"
            ],
            [
                [
                    "SANTANDER"
                ],
                "Santander"
            ],
            [
                [
                    "ITAU"
                ],
                "Itaú"
            ],
            [
                [
                    "BRADESCO"
                ],
                "Bradesco"
            ],
            [
                [
                    "BANCO DO BRASIL"
                ],
                "Banco do Brasil"
            ],
            [
                [
                    "CAIXA ECONOMICA"
                ],
                "Caixa Econômica Federal"
            ],
            [
                [
                    "SICREDI"
                ],
                "Sicredi"
            ],
            [
                [
                    "C6 BANK"
                ],
                "C6 Bank"
            ],
            [
                [
                    "PAGBANK",
                    "PAGSEGURO"
                ],
                "PagBank"
            ]
        ];

        for (
            const [
                termos,
                banco
            ] of bancos
        ) {
            if (
                termos.some(
                    termo =>
                        normal.includes(
                            termo
                        )
                )
            ) {
                return banco;
            }
        }

        return "";
    }

    function identificarTipoDocumento(
        texto,
        banco
    ) {
        const normal =
            normalizar(
                texto
            );

        const sinaisFatura = [
            "RESUMO DA FATURA",
            "TOTAL DA FATURA",
            "TOTAL DA SUA FATURA",
            "VALOR DA FATURA",
            "PAGAMENTO MINIMO",
            "MELHOR DATA DE COMPRA",
            "FECHAMENTO DA FATURA"
        ];

        const quantidadeFatura =
            sinaisFatura.filter(
                termo =>
                    normal.includes(
                        termo
                    )
            ).length;

        if (
            quantidadeFatura >=
            2
        ) {
            return TIPOS_DOCUMENTO.FATURA_CARTAO;
        }

        if (
            /\b(CARTEIRA DE INVESTIMENTOS|FUNDO DE INVESTIMENTO)\b/.test(
                normal
            ) &&
            !normal.includes(
                "EXTRATO CONTA CORRENTE"
            )
        ) {
            return TIPOS_DOCUMENTO.INVESTIMENTO;
        }

        if (
            banco ===
            "Sicoob" &&
            (
                normal.includes(
                    "EXTRATO CONTA CORRENTE"
                ) ||
                normal.includes(
                    "TRANSF.RECEBIDA"
                ) ||
                normal.includes(
                    "PIX RECEBIDO"
                )
            )
        ) {
            return TIPOS_DOCUMENTO.EXTRATO_CONTA;
        }

        if (
            normal.includes(
                "EXTRATO CONTA CORRENTE"
            ) ||
            normal.includes(
                "CONTA CORRENTE"
            ) ||
            normal.includes(
                "DETALHE DOS MOVIMENTOS"
            ) ||
            normal.includes(
                "PIX RECEBIDO"
            ) ||
            normal.includes(
                "TRANSFERENCIA RECEBIDA"
            )
        ) {
            return TIPOS_DOCUMENTO.EXTRATO_CONTA;
        }

        return TIPOS_DOCUMENTO.DESCONHECIDO;
    }

    function obterMotivoExclusaoDocumento(
        documento
    ) {
        if (
            documento.tipoDocumento ===
            TIPOS_DOCUMENTO.FATURA_CARTAO
        ) {
            return "Documento identificado como fatura de cartão e excluído da apuração.";
        }

        if (
            documento.tipoDocumento ===
            TIPOS_DOCUMENTO.INVESTIMENTO
        ) {
            return "Documento identificado como demonstrativo de investimentos e excluído da apuração.";
        }

        if (
            documento.tipoDocumento ===
            TIPOS_DOCUMENTO.DESCONHECIDO
        ) {
            return "Tipo de documento não identificado com segurança.";
        }

        return "";
    }

    /*
     * =========================================================
     * EXTRAÇÃO
     * =========================================================
     */

    function extrairMovimentacoesDocumento(
        documento
    ) {
        if (
            documento.banco ===
            "Sicoob"
        ) {
            return extrairSicoob(
                documento
            );
        }

        return extrairGenerico(
            documento
        );
    }

    /*
     * =========================================================
     * SICOOB
     * =========================================================
     */

    function extrairSicoob(
        documento
    ) {
        const linhas =
            prepararLinhas(
                documento.texto
            );

        const resultado =
            [];

        let movimentoAtual =
            null;

        let ordem =
            0;

        linhas.forEach(
            (
                linha,
                indice
            ) => {
                const principal =
                    interpretarLinhaSicoob(
                        linha,
                        documento,
                        indice,
                        ordem
                    );

                if (principal) {
                    ordem++;

                    principal.ordem =
                        ordem;

                    resultado.push(
                        principal
                    );

                    movimentoAtual =
                        principal;

                    return;
                }

                if (
                    movimentoAtual &&
                    ehComplementoSicoob(
                        linha
                    )
                ) {
                    movimentoAtual.detalhes.push(
                        linha
                    );

                    movimentoAtual.historicoCompleto =
                        [
                            movimentoAtual.historico,
                            ...movimentoAtual.detalhes
                        ]
                            .join(" ")
                            .replace(
                                /\s+/g,
                                " "
                            )
                            .trim();
                }
            }
        );

        return resultado;
    }

    function interpretarLinhaSicoob(
        linha,
        documento,
        indice,
        ordem
    ) {
        const match =
            String(
                linha || ""
            ).match(
                /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(.*?)\s+((?:\d{1,3}(?:\.\d{3})*|\d+),\d{2})\s*([CD*])\s*$/i
            );

        if (!match) {
            return null;
        }

        const data =
            criarDataInfo(
                Number(
                    match[1]
                ),
                Number(
                    match[2]
                ),
                Number(
                    match[3]
                )
            );

        if (!data) {
            return null;
        }

        const meio =
            String(
                match[4] || ""
            )
                .replace(
                    /\s+/g,
                    " "
                )
                .trim();

        const partes =
            meio.split(
                /\s{2,}/
            );

        let documentoMov =
            "";

        let historico =
            meio;

        /*
         * O texto do PDF normalmente é:
         *
         * DOCUMENTO HISTÓRICO
         *
         * Como os espaços podem ter sido normalizados,
         * usamos o primeiro token como documento somente
         * quando ele realmente parece documento.
         */
        const primeiro =
            meio.match(
                /^(\S+)\s+(.+)$/
            );

        if (
            primeiro &&
            pareceDocumentoSicoob(
                primeiro[1]
            )
        ) {
            documentoMov =
                primeiro[1];

            historico =
                primeiro[2];
        }

        historico =
            historico.trim();

        const valor =
            converterMoeda(
                match[5]
            );

        const indicador =
            String(
                match[6] || ""
            ).toUpperCase();

        const classificacao =
            classificarSicoob(
                historico,
                indicador
            );

        return criarMovimentacao({
            id:
                [
                    documento.id,
                    indice,
                    ordem
                ].join("|"),

            ordem,

            data:
                data.dataTexto,

            banco:
                "Sicoob",

            arquivo:
                documento.nome,

            documento:
                documentoMov,

            historico,

            historicoCompleto:
                historico,

            detalhes:
                [],

            valor:
                Math.abs(
                    valor
                ),

            natureza:
                classificacao.natureza,

            classificacao:
                classificacao.classificacao,

            motivo:
                classificacao.motivo,

            considerar:
                classificacao.considerar,

            indicador
        });
    }

    function pareceDocumentoSicoob(
        valor
    ) {
        const texto =
            String(
                valor || ""
            );

        return (
            /^\d{2,}$/.test(
                texto
            ) ||
            /^PIX$/i.test(
                texto
            ) ||
            /^MASTERCARD$/i.test(
                texto
            ) ||
            /^VISA$/i.test(
                texto
            ) ||
            /^[A-Z]+\/\d/i.test(
                texto
            ) ||
            /^[A-Z0-9.-]{3,20}$/i.test(
                texto
            )
        );
    }

    function classificarSicoob(
        historico,
        indicador
    ) {
        const normal =
            normalizar(
                historico
            );

        if (
            indicador ===
            "D"
        ) {
            return {
                natureza:
                    "Débito",

                classificacao:
                    "Débito",

                considerar:
                    false,

                motivo:
                    "Débito identificado pelo indicador D."
            };
        }

        if (
            indicador ===
            "*"
        ) {
            return {
                natureza:
                    "-",

                classificacao:
                    "Informativo",

                considerar:
                    false,

                motivo:
                    "Linha informativa ou valor bloqueado."
            };
        }

        if (
            indicador !==
            "C"
        ) {
            return {
                natureza:
                    "-",

                classificacao:
                    "Conferir",

                considerar:
                    false,

                motivo:
                    "Natureza não identificada."
            };
        }

        /*
         * Crédito C.
         *
         * Primeiro tratamos as exceções reais.
         */
        if (
            /^SALDO\b/.test(
                normal
            ) ||
            normal.includes(
                "SALDO DO DIA"
            ) ||
            normal.includes(
                "SALDO DISPONIVEL"
            ) ||
            normal.includes(
                "SALDO EM CONTA CAPITAL"
            )
        ) {
            return {
                natureza:
                    "Crédito",

                classificacao:
                    "Crédito excluído",

                considerar:
                    false,

                motivo:
                    "Saldo informativo não representa movimentação."
            };
        }

        if (
            normal.includes(
                "CHEQUE ESPECIAL"
            ) ||
            normal.includes(
                "LIMITE DE CREDITO"
            )
        ) {
            return {
                natureza:
                    "Crédito",

                classificacao:
                    "Crédito excluído",

                considerar:
                    false,

                motivo:
                    "Limite disponível não representa movimentação financeira."
            };
        }

        if (
            normal.includes(
                "ESTORNO"
            ) ||
            normal.includes(
                "DEVOLUCAO"
            ) ||
            normal.includes(
                "REVERSAO"
            )
        ) {
            return {
                natureza:
                    "Crédito",

                classificacao:
                    "Crédito excluído",

                considerar:
                    false,

                motivo:
                    "Estorno/devolução não representa nova entrada de recursos."
            };
        }

        if (
            normal.includes(
                "LIBERACAO DE CREDITO"
            ) ||
            normal.includes(
                "LIBERACAO DE DINHEIRO"
            ) ||
            normal.includes(
                "EMPRESTIMO"
            ) ||
            normal.includes(
                "FINANCIAMENTO"
            )
        ) {
            return {
                natureza:
                    "Crédito",

                classificacao:
                    "Crédito excluído",

                considerar:
                    false,

                motivo:
                    "Crédito originado de empréstimo/financiamento."
            };
        }

        if (
            /\b(RDB|RDC|CDB|RESGATE|APLICACAO|INVESTIMENTO)\b/.test(
                normal
            )
        ) {
            return {
                natureza:
                    "Crédito",

                classificacao:
                    "Crédito excluído",

                considerar:
                    false,

                motivo:
                    "Movimentação de investimento."
            };
        }

        /*
         * CORREÇÃO PRINCIPAL:
         *
         * NÃO excluir antecipação SIPAG.
         */
        if (
            normal.includes(
                "CR ANTECIPACAO"
            )
        ) {
            return {
                natureza:
                    "Crédito",

                classificacao:
                    "Crédito",

                considerar:
                    true,

                motivo:
                    "Antecipação de recebíveis creditada efetivamente em conta."
            };
        }

        /*
         * Qualquer outro lançamento efetivamente C,
         * que não esteja nas exclusões acima,
         * representa entrada transacional na conta.
         */
        return {
            natureza:
                "Crédito",

            classificacao:
                "Crédito",

            considerar:
                true,

            motivo:
                "Crédito identificado pelo indicador C do extrato."
        };
    }

    function ehComplementoSicoob(
        linha
    ) {
        const normal =
            normalizar(
                linha
            );

        if (!normal) {
            return false;
        }

        if (
            normal ===
            "SICOOB" ||
            normal.includes(
                "SISTEMA DE COOPERATIVAS"
            ) ||
            normal.includes(
                "SISBR"
            ) ||
            normal.startsWith(
                "COOP.:"
            ) ||
            normal.startsWith(
                "CONTA:"
            ) ||
            normal.startsWith(
                "DATA DOCUMENTO"
            ) ||
            normal ===
            "RESUMO" ||
            normal.startsWith(
                "ENCARGOS"
            ) ||
            normal.startsWith(
                "OUTRAS INFORMACOES"
            ) ||
            normal.startsWith(
                "SAC:"
            )
        ) {
            return false;
        }

        return true;
    }

    /*
     * =========================================================
     * GENÉRICO
     * =========================================================
     */

    function extrairGenerico(
        documento
    ) {
        const linhas =
            prepararLinhas(
                documento.texto
            );

        const ano =
            identificarAnoPrincipal(
                documento.texto
            );

        const movimentos =
            [];

        let ordem =
            0;

        linhas.forEach(
            (
                linha,
                indice
            ) => {
                const data =
                    extrairDataFlexivel(
                        linha,
                        ano
                    );

                if (!data) {
                    return;
                }

                const valores =
                    extrairOcorrenciasMonetarias(
                        linha
                    );

                if (
                    !valores.length
                ) {
                    return;
                }

                const normal =
                    normalizar(
                        linha
                    );

                const ultimo =
                    valores[
                    valores.length -
                    1
                    ];

                let natureza =
                    "-";

                let considerar =
                    false;

                let classificacao =
                    "Conferir";

                let motivo =
                    "Movimentação não classificada automaticamente.";

                if (
                    /\b(PIX ENVIADO|PIX EMITIDO|PAGAMENTO|COMPRA|SAQUE|DEBITO)\b/.test(
                        normal
                    )
                ) {
                    natureza =
                        "Débito";

                    classificacao =
                        "Débito";

                    motivo =
                        "Débito identificado.";
                } else if (
                    /\b(PIX RECEBIDO|TRANSFERENCIA RECEBIDA|TED RECEBIDA|DOC RECEBIDO|DEPOSITO|RECEBIMENTO)\b/.test(
                        normal
                    )
                ) {
                    natureza =
                        "Crédito";

                    classificacao =
                        "Crédito";

                    considerar =
                        true;

                    motivo =
                        "Entrada de recursos identificada.";
                }

                ordem++;

                movimentos.push(
                    criarMovimentacao({
                        id:
                            [
                                documento.id,
                                indice,
                                ordem
                            ].join("|"),

                        ordem,

                        data:
                            data.dataTexto,

                        banco:
                            documento.banco ||
                            "Não identificado",

                        arquivo:
                            documento.nome,

                        documento:
                            "",

                        historico:
                            limparHistoricoGenerico(
                                linha
                            ),

                        historicoCompleto:
                            linha,

                        detalhes:
                            [],

                        valor:
                            Math.abs(
                                ultimo.valor
                            ),

                        natureza,

                        classificacao,

                        motivo,

                        considerar,

                        indicador:
                            ""
                    })
                );
            }
        );

        return movimentos;
    }

    /*
     * =========================================================
     * MOVIMENTAÇÃO
     * =========================================================
     */

    function criarMovimentacao(
        dados
    ) {
        return {
            id:
                dados.id,

            ordem:
                Number(
                    dados.ordem ||
                    0
                ),

            data:
                dados.data ||
                "",

            banco:
                dados.banco ||
                "",

            arquivo:
                dados.arquivo ||
                "",

            documento:
                dados.documento ||
                "",

            historico:
                dados.historico ||
                "",

            historicoCompleto:
                dados.historicoCompleto ||
                dados.historico ||
                "",

            detalhes:
                dados.detalhes ||
                [],

            valor:
                Number(
                    dados.valor ||
                    0
                ),

            indicador:
                dados.indicador ||
                "",

            natureza:
                dados.natureza ||
                "-",

            classificacao:
                dados.classificacao ||
                "Conferir",

            motivo:
                dados.motivo ||
                "",

            considerar:
                dados.considerar ===
                true
        };
    }

    /*
     * =========================================================
     * TEXTO CONSOLIDADO
     * =========================================================
     */

    function gerarTextoConsolidado(
        movimentacoes
    ) {
        return movimentacoes
            .map(
                movimento => {
                    let decisao =
                        "DUVIDA";

                    if (
                        movimento.considerar &&
                        movimento.natureza ===
                        "Crédito"
                    ) {
                        decisao =
                            "INCLUIR";
                    } else if (
                        movimento.natureza ===
                        "Débito" ||
                        movimento.classificacao ===
                        "Crédito excluído"
                    ) {
                        decisao =
                            "EXCLUIR";
                    }

                    const meta = [
                        `[ID:${movimento.id}]`,
                        `[BANCO:${movimento.banco}]`,
                        `[ARQUIVO:${movimento.arquivo}]`,
                        `[DECISAO:${decisao}]`
                    ].join(
                        " "
                    );

                    const indicador =
                        movimento.natureza ===
                            "Crédito"
                            ? "C"
                            : movimento.natureza ===
                                "Débito"
                                ? "D"
                                : "";

                    return [
                        movimento.data,
                        `${meta} ${movimento.historico}`.trim(),
                        `${formatarValorNumero(movimento.valor)}${indicador ? " " + indicador : ""}`
                    ].join(
                        " | "
                    );
                }
            )
            .join(
                "\n"
            );
    }

    function enviarMovimentacoesParaCalculadora(
        resultado
    ) {
        resultado.textoConsolidado =
            gerarTextoConsolidado(
                resultado.movimentacoes
            );

        try {
            if (
                window.MediaMovimentacao &&
                typeof window.MediaMovimentacao.processarTexto ===
                "function"
            ) {
                window.MediaMovimentacao.processarTexto(
                    resultado.textoConsolidado,
                    {
                        competenciasDocumentadas:
                            resultado.competencias
                    }
                );

                return;
            }

            if (
                typeof window.processarTextoMovimentacao ===
                "function"
            ) {
                window.processarTextoMovimentacao(
                    resultado.textoConsolidado,
                    {
                        competenciasDocumentadas:
                            resultado.competencias
                    }
                );
            }
        } catch (erro) {
            console.error(
                "Erro ao enviar movimentações para media-movimentacao.js:",
                erro
            );
        }
    }

    /*
     * =========================================================
     * RESULTADOS OCR
     * =========================================================
     */

    function renderizarResultadoOCR(
        resultado
    ) {
        setTexto(
            "ocrNomeTitular",
            resultado.titular ||
            "Não identificado"
        );

        setTexto(
            "ocrDocumentoTitular",
            resultado.documentoTitular
                ? formatarDocumento(
                    resultado.documentoTitular
                )
                : "Não identificado"
        );

        setTexto(
            "ocrPeriodoLeitura",
            formatarPeriodo(
                resultado.primeiraData,
                resultado.ultimaData
            )
        );

        setTexto(
            "ocrInstituicoes",
            resultado.instituicoes.length
                ? resultado.instituicoes.join(
                    ", "
                )
                : "Não identificadas"
        );

        setTexto(
            "ocrQuantidadeArquivos",
            String(
                resultado.documentos.length
            )
        );

        renderizarDocumentosOCR(
            resultado.documentos
        );

        renderizarAlertasOCR(
            resultado.alertas
        );

        renderizarTabelaMovimentacoesOCR(
            resultado
        );

        atualizarCalculosOCR(
            resultado
        );

        atualizarResumoLeitura(
            resultado
        );
    }

    function renderizarDocumentosOCR(
        documentos
    ) {
        const elemento =
            document.getElementById(
                "listaDocumentosOCR"
            );

        if (!elemento) {
            return;
        }

        elemento.innerHTML =
            documentos.length
                ? documentos
                    .map(
                        documento => `
                            <div class="documento-ocr-item">
                                <div>
                                    <strong>${escaparHTML(documento.nome)}</strong>
                                    <span>
                                        ${escaparHTML(documento.banco || "Instituição não identificada")}
                                        ·
                                        ${escaparHTML(rotuloTipoDocumento(documento.tipoDocumento))}
                                        ·
                                        ${documento.excluidoDaApuracao ? "Excluído da apuração" : "Processado"}
                                    </span>
                                </div>

                                <div class="documento-ocr-meta">
                                    <span>${escaparHTML(documento.metodo || "-")}</span>
                                    <span>${formatarTamanhoArquivo(documento.tamanho || 0)}</span>
                                </div>
                            </div>
                        `
                    )
                    .join("")
                : '<div class="sem-dados">Nenhum documento processado.</div>';
    }

    function rotuloTipoDocumento(
        tipo
    ) {
        switch (tipo) {
            case TIPOS_DOCUMENTO.EXTRATO_CONTA:
                return "Extrato de conta";

            case TIPOS_DOCUMENTO.FATURA_CARTAO:
                return "Fatura de cartão";

            case TIPOS_DOCUMENTO.INVESTIMENTO:
                return "Investimentos";

            default:
                return "Tipo não identificado";
        }
    }

    function renderizarAlertasOCR(
        alertas
    ) {
        const elemento =
            document.getElementById(
                "listaAlertasOCR"
            );

        if (!elemento) {
            return;
        }

        elemento.innerHTML =
            alertas.length
                ? alertas
                    .map(
                        alerta =>
                            `<div class="aviso-atencao">${escaparHTML(alerta)}</div>`
                    )
                    .join("")
                : '<div class="aviso-info">Nenhum alerta adicional.</div>';
    }

    function renderizarTabelaMovimentacoesOCR(
        resultado
    ) {
        const tabela =
            document.getElementById(
                "tabelaMovimentacoesOCR"
            );

        if (!tabela) {
            return;
        }

        const tbody =
            tabela.querySelector(
                "tbody"
            );

        if (!tbody) {
            return;
        }

        if (
            !resultado.movimentacoes.length
        ) {
            tbody.innerHTML =
                '<tr><td colspan="8" class="sem-dados">Nenhuma movimentação identificada.</td></tr>';

            return;
        }

        tbody.innerHTML =
            resultado.movimentacoes
                .map(
                    (
                        movimento,
                        indice
                    ) => `
                        <tr>
                            <td>
                                <input
                                    type="checkbox"
                                    class="check-movimentacao-ocr"
                                    data-indice="${indice}"
                                    ${movimento.considerar ? "checked" : ""}
                                >
                            </td>
                            <td>${escaparHTML(movimento.data)}</td>
                            <td>${escaparHTML(movimento.banco)}</td>
                            <td>${escaparHTML(movimento.historico)}</td>
                            <td>${formatarMoeda(movimento.valor)}</td>
                            <td>${escaparHTML(movimento.natureza)}</td>
                            <td>${escaparHTML(movimento.classificacao)}</td>
                            <td>${escaparHTML(movimento.motivo)}</td>
                        </tr>
                    `
                )
                .join("");

        tbody
            .querySelectorAll(
                ".check-movimentacao-ocr"
            )
            .forEach(
                checkbox => {
                    checkbox.addEventListener(
                        "change",
                        () => {
                            const indice =
                                Number(
                                    checkbox.dataset.indice
                                );

                            const movimento =
                                resultadoLeituraOCR &&
                                resultadoLeituraOCR.movimentacoes[
                                indice
                                ];

                            if (!movimento) {
                                return;
                            }

                            movimento.considerar =
                                checkbox.checked;

                            if (
                                checkbox.checked
                            ) {
                                movimento.natureza =
                                    "Crédito";

                                movimento.classificacao =
                                    "Crédito confirmado manualmente";

                                movimento.motivo =
                                    "Movimentação incluída manualmente.";
                            }

                            atualizarCalculosOCR(
                                resultadoLeituraOCR
                            );

                            atualizarResumoLeitura(
                                resultadoLeituraOCR
                            );
                        }
                    );
                }
            );
    }

    function alterarSelecaoMovimentacoes(
        marcar
    ) {
        if (
            !resultadoLeituraOCR
        ) {
            return;
        }

        resultadoLeituraOCR.movimentacoes.forEach(
            movimento => {
                if (!marcar) {
                    movimento.considerar =
                        false;

                    return;
                }

                movimento.considerar =
                    movimento.natureza ===
                    "Crédito" &&
                    movimento.classificacao !==
                    "Crédito excluído";
            }
        );

        renderizarTabelaMovimentacoesOCR(
            resultadoLeituraOCR
        );

        atualizarCalculosOCR(
            resultadoLeituraOCR
        );

        atualizarResumoLeitura(
            resultadoLeituraOCR
        );
    }

    function atualizarCalculosOCR(
        resultado
    ) {
        const creditos =
            resultado.movimentacoes.filter(
                movimento =>
                    movimento.considerar &&
                    movimento.natureza ===
                    "Crédito"
            );

        const porMes =
            {};

        const porBanco =
            {};

        creditos.forEach(
            movimento => {
                const data =
                    parseDataBR(
                        movimento.data
                    );

                if (!data) {
                    return;
                }

                const competencia =
                    `${String(data.getMonth() + 1).padStart(2, "0")}/${data.getFullYear()}`;

                if (
                    !porMes[
                    competencia
                    ]
                ) {
                    porMes[
                        competencia
                    ] = {
                        quantidade:
                            0,

                        total:
                            0,

                        bancos:
                            new Set()
                    };
                }

                porMes[
                    competencia
                ].quantidade++;

                porMes[
                    competencia
                ].total +=
                    Number(
                        movimento.valor
                    );

                porMes[
                    competencia
                ].bancos.add(
                    movimento.banco
                );

                if (
                    !porBanco[
                    movimento.banco
                    ]
                ) {
                    porBanco[
                        movimento.banco
                    ] = {
                        quantidade:
                            0,

                        total:
                            0,

                        competencias:
                            new Set()
                    };
                }

                porBanco[
                    movimento.banco
                ].quantidade++;

                porBanco[
                    movimento.banco
                ].total +=
                    Number(
                        movimento.valor
                    );

                porBanco[
                    movimento.banco
                ].competencias.add(
                    competencia
                );
            }
        );

        const total =
            creditos.reduce(
                (
                    soma,
                    movimento
                ) =>
                    soma +
                    Number(
                        movimento.valor ||
                        0
                    ),
                0
            );

        const competencias =
            resultado.competencias ||
            [];

        const meses =
            competencias.length;

        const media =
            meses > 0
                ? total /
                meses
                : 0;

        let maiorMes =
            "-";

        let maiorValor =
            -1;

        Object.entries(
            porMes
        ).forEach(
            (
                [
                    mes,
                    dados
                ]
            ) => {
                if (
                    dados.total >
                    maiorValor
                ) {
                    maiorValor =
                        dados.total;

                    maiorMes =
                        mes;
                }
            }
        );

        setTextoMultiplos(
            [
                "ocrMediaMensal",
                "mediaMensalPreliminarOCR"
            ],
            formatarMoeda(
                media
            )
        );

        setTextoMultiplos(
            [
                "ocrTotalCreditosValidos",
                "ocrTotalCreditos",
                "totalCreditosValidosOCR"
            ],
            formatarMoeda(
                total
            )
        );

        setTextoMultiplos(
            [
                "ocrMesesConsiderados",
                "mesesConsideradosOCR"
            ],
            String(
                meses
            )
        );

        setTextoMultiplos(
            [
                "ocrMaiorMes",
                "ocrMesMaiorMovimentacao",
                "mesMaiorMovimentacaoOCR"
            ],
            maiorMes
        );

        renderizarTabelaMeses(
            porMes,
            competencias
        );

        renderizarTabelaBancos(
            porBanco
        );
    }

    function renderizarTabelaMeses(
        porMes,
        competencias
    ) {
        const tabela =
            obterPrimeiroElemento([
                "tabelaResumoMensalOCR",
                "tabelaCreditosMesOCR",
                "tabelaCreditosPorMes"
            ]);

        if (!tabela) {
            return;
        }

        const tbody =
            tabela.querySelector(
                "tbody"
            );

        if (!tbody) {
            return;
        }

        tbody.innerHTML =
            competencias
                .map(
                    competencia => {
                        const partes =
                            competencia.split(
                                "-"
                            );

                        const chave =
                            `${partes[1]}/${partes[0]}`;

                        const dados =
                            porMes[
                            chave
                            ] || {
                                quantidade:
                                    0,

                                total:
                                    0,

                                bancos:
                                    new Set()
                            };

                        return `
                            <tr>
                                <td>${escaparHTML(chave)}</td>
                                <td>${dados.quantidade}</td>
                                <td>${escaparHTML(Array.from(dados.bancos).join(", ") || "-")}</td>
                                <td>${formatarMoeda(dados.total)}</td>
                            </tr>
                        `;
                    }
                )
                .join("");
    }

    function renderizarTabelaBancos(
        porBanco
    ) {
        const tabela =
            obterPrimeiroElemento([
                "tabelaResumoBancosOCR",
                "tabelaResumoInstituicaoOCR",
                "tabelaResumoInstituicao"
            ]);

        if (!tabela) {
            return;
        }

        const tbody =
            tabela.querySelector(
                "tbody"
            );

        if (!tbody) {
            return;
        }

        const entradas =
            Object.entries(
                porBanco
            );

        if (!entradas.length) {
            tbody.innerHTML =
                '<tr><td colspan="4" class="sem-dados">Nenhum crédito considerado.</td></tr>';

            return;
        }

        tbody.innerHTML =
            entradas
                .map(
                    (
                        [
                            banco,
                            dados
                        ]
                    ) => {
                        const meses =
                            Math.max(
                                1,
                                dados.competencias.size
                            );

                        return `
                            <tr>
                                <td>${escaparHTML(banco)}</td>
                                <td>${dados.quantidade}</td>
                                <td>${formatarMoeda(dados.total)}</td>
                                <td>${formatarMoeda(dados.total / meses)}</td>
                            </tr>
                        `;
                    }
                )
                .join("");
    }

    function atualizarResumoLeitura(
        resultado
    ) {
        const textarea =
            document.getElementById(
                "resumoLeituraOCR"
            );

        if (!textarea) {
            return;
        }

        const creditos =
            resultado.movimentacoes.filter(
                movimento =>
                    movimento.considerar &&
                    movimento.natureza ===
                    "Crédito"
            );

        textarea.value = [
            "RESUMO DA LEITURA DOS EXTRATOS",
            `Arquivos processados: ${resultado.documentos.length}`,
            `Titular: ${resultado.titular || "Não identificado"}`,
            `CPF/CNPJ: ${resultado.documentoTitular ? formatarDocumento(resultado.documentoTitular) : "Não identificado"}`,
            `Instituições: ${resultado.instituicoes.length ? resultado.instituicoes.join(", ") : "Não identificadas"}`,
            `Período válido: ${formatarPeriodo(resultado.primeiraData, resultado.ultimaData)}`,
            `Competências válidas: ${resultado.competencias.length ? resultado.competencias.map(formatarCompetencia).join(", ") : "Não identificadas"}`,
            `Movimentações identificadas: ${resultado.movimentacoes.length}`,
            `Créditos selecionados: ${creditos.length}`,
            `Total dos créditos selecionados: ${formatarMoeda(creditos.reduce((soma, movimento) => soma + Number(movimento.valor || 0), 0))}`
        ].join(
            "\n"
        );
    }

    function aplicarLeituraAoCalculo() {
        if (
            !resultadoLeituraOCR
        ) {
            alert(
                "Nenhum extrato foi processado."
            );

            return;
        }

        enviarMovimentacoesParaCalculadora(
            resultadoLeituraOCR
        );

        const card =
            document.getElementById(
                "cardResultadoMovimentacao"
            );

        if (card) {
            card.scrollIntoView({
                behavior:
                    "smooth",

                block:
                    "start"
            });
        }
    }

    async function copiarResumoLeitura() {
        const campo =
            document.getElementById(
                "resumoLeituraOCR"
            );

        if (!campo) {
            return;
        }

        try {
            await navigator.clipboard.writeText(
                campo.value
            );
        } catch (erro) {
            campo.select();

            document.execCommand(
                "copy"
            );
        }
    }

    /*
     * =========================================================
     * TITULAR
     * =========================================================
     */

    function identificarDadosTitular(
        texto
    ) {
        const linhas =
            prepararLinhas(
                texto
            );

        let nome =
            "";

        let documento =
            "";

        for (
            let indice = 0;
            indice <
            linhas.length;
            indice++
        ) {
            const linha =
                linhas[
                indice
                ];

            const conta =
                linha.match(
                    /CONTA:\s*[^/]+\/\s*(.+)$/i
                );

            if (
                conta &&
                pareceNome(
                    conta[1]
                )
            ) {
                nome =
                    conta[1].trim();
            }

            const cpf =
                linha.match(
                    /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/
                );

            if (
                cpf &&
                validarCPF(
                    cpf[0]
                )
            ) {
                documento =
                    cpf[0].replace(
                        /\D/g,
                        ""
                    );

                break;
            }

            const cnpj =
                linha.match(
                    /\b\d{2}\.?\d{3}\.?\d{3}[\/\s-]?\d{4}-?\d{2}\b/
                );

            if (
                cnpj &&
                validarCNPJ(
                    cnpj[0]
                )
            ) {
                documento =
                    cnpj[0].replace(
                        /\D/g,
                        ""
                    );
            }
        }

        return {
            nome,
            documento
        };
    }

    function pareceNome(
        valor
    ) {
        const texto =
            String(
                valor || ""
            ).trim();

        return (
            texto.length >=
            5 &&
            /[A-ZÀ-Ú]/i.test(
                texto
            )
        );
    }

    /*
     * =========================================================
     * DATAS
     * =========================================================
     */

    function recalcularPeriodo(
        resultado
    ) {
        const datas =
            resultado.movimentacoes
                .map(
                    movimento =>
                        parseDataBR(
                            movimento.data
                        )
                )
                .filter(Boolean);

        if (!datas.length) {
            resultado.primeiraData =
                null;

            resultado.ultimaData =
                null;

            return;
        }

        resultado.primeiraData =
            new Date(
                Math.min(
                    ...datas.map(
                        data =>
                            data.getTime()
                    )
                )
            );

        resultado.ultimaData =
            new Date(
                Math.max(
                    ...datas.map(
                        data =>
                            data.getTime()
                    )
                )
            );
    }

    function extrairDataFlexivel(
        texto,
        anoPadrao
    ) {
        const match =
            String(
                texto || ""
            ).match(
                /\b(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?\b/
            );

        if (!match) {
            return null;
        }

        let ano =
            match[3]
                ? Number(
                    match[3]
                )
                : anoPadrao;

        if (!ano) {
            return null;
        }

        if (
            ano <
            100
        ) {
            ano +=
                2000;
        }

        return criarDataInfo(
            Number(
                match[1]
            ),
            Number(
                match[2]
            ),
            ano
        );
    }

    function criarDataInfo(
        dia,
        mes,
        ano
    ) {
        const data =
            new Date(
                ano,
                mes - 1,
                dia,
                12
            );

        if (
            data.getFullYear() !==
            ano ||
            data.getMonth() !==
            mes - 1 ||
            data.getDate() !==
            dia
        ) {
            return null;
        }

        return {
            data,

            dataTexto:
                `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${ano}`
        };
    }

    function parseDataBR(
        valor
    ) {
        const match =
            String(
                valor || ""
            ).match(
                /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
            );

        if (!match) {
            return null;
        }

        const info =
            criarDataInfo(
                Number(
                    match[1]
                ),
                Number(
                    match[2]
                ),
                Number(
                    match[3]
                )
            );

        return info
            ? info.data
            : null;
    }

    function identificarAnoPrincipal(
        texto
    ) {
        const anos =
            String(
                texto || ""
            ).match(
                /\b20\d{2}\b/g
            ) || [];

        if (!anos.length) {
            return new Date()
                .getFullYear();
        }

        const mapa =
            new Map();

        anos.forEach(
            valor => {
                const ano =
                    Number(
                        valor
                    );

                mapa.set(
                    ano,
                    (
                        mapa.get(
                            ano
                        ) ||
                        0
                    ) +
                    1
                );
            }
        );

        return Array.from(
            mapa.entries()
        )
            .sort(
                (
                    a,
                    b
                ) =>
                    b[1] -
                    a[1]
            )[0][0];
    }

    function obterCompetenciaData(
        data
    ) {
        return (
            data.getFullYear() +
            "-" +
            String(
                data.getMonth() +
                1
            ).padStart(
                2,
                "0"
            )
        );
    }

    /*
     * =========================================================
     * VALORES
     * =========================================================
     */

    function extrairOcorrenciasMonetarias(
        texto
    ) {
        const resultado =
            [];

        const regex =
            /(?:R\$\s*)?(-?\s*(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2})([CD])?/gi;

        let match;

        while (
            (
                match =
                regex.exec(
                    String(
                        texto || ""
                    )
                )
            ) !==
            null
        ) {
            const valor =
                converterMoeda(
                    match[1]
                );

            if (
                !Number.isFinite(
                    valor
                )
            ) {
                continue;
            }

            resultado.push({
                valor,

                indicador:
                    String(
                        match[2] ||
                        ""
                    ).toUpperCase(),

                indice:
                    match.index,

                fim:
                    regex.lastIndex
            });
        }

        return resultado;
    }

    function converterMoeda(
        valor
    ) {
        let texto =
            String(
                valor || ""
            )
                .replace(
                    /\s/g,
                    ""
                )
                .replace(
                    /[^\d,.-]/g,
                    ""
                );

        if (!texto) {
            return NaN;
        }

        const negativo =
            texto.startsWith(
                "-"
            );

        texto =
            texto
                .replace(
                    /-/g,
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

        if (
            !Number.isFinite(
                numero
            )
        ) {
            return NaN;
        }

        return negativo
            ? -numero
            : numero;
    }

    /*
     * =========================================================
     * UTILITÁRIOS
     * =========================================================
     */

    function prepararLinhas(
        texto
    ) {
        return String(
            texto || ""
        )
            .replace(
                /\r/g,
                ""
            )
            .split(
                "\n"
            )
            .map(
                linha =>
                    linha
                        .replace(
                            /\u00a0/g,
                            " "
                        )
                        .replace(
                            /\s+/g,
                            " "
                        )
                        .trim()
            )
            .filter(Boolean);
    }

    function limparHistoricoGenerico(
        texto
    ) {
        return String(
            texto || ""
        )
            .replace(
                /\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/g,
                " "
            )
            .replace(
                /(?:R\$\s*)?-?\s*(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2}[CD]?/gi,
                " "
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim();
    }

    function converterHTMLParaTexto(
        html
    ) {
        const documento =
            new DOMParser()
                .parseFromString(
                    String(
                        html || ""
                    ),
                    "text/html"
                );

        return documento.body
            ? documento.body.innerText
            : "";
    }

    function normalizar(
        texto
    ) {
        return String(
            texto || ""
        )
            .normalize(
                "NFD"
            )
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim()
            .toUpperCase();
    }

    function obterExtensao(
        nome
    ) {
        const partes =
            String(
                nome || ""
            )
                .toLowerCase()
                .split(
                    "."
                );

        return partes.length >
            1
            ? partes.pop()
            : "";
    }

    function formatarMoeda(
        valor
    ) {
        return Number(
            valor ||
            0
        ).toLocaleString(
            "pt-BR",
            {
                style:
                    "currency",

                currency:
                    "BRL",

                minimumFractionDigits:
                    2,

                maximumFractionDigits:
                    2
            }
        );
    }

    function formatarValorNumero(
        valor
    ) {
        return Number(
            valor ||
            0
        ).toLocaleString(
            "pt-BR",
            {
                minimumFractionDigits:
                    2,

                maximumFractionDigits:
                    2
            }
        );
    }

    function formatarTamanhoArquivo(
        bytes
    ) {
        const numero =
            Number(
                bytes ||
                0
            );

        if (
            numero <
            1024
        ) {
            return `${numero} B`;
        }

        if (
            numero <
            1048576
        ) {
            return `${(numero / 1024).toFixed(1)} KB`;
        }

        return `${(numero / 1048576).toFixed(2)} MB`;
    }

    function formatarPeriodo(
        inicio,
        fim
    ) {
        if (
            !inicio &&
            !fim
        ) {
            return "Não identificado";
        }

        if (
            inicio &&
            fim
        ) {
            return `${inicio.toLocaleDateString("pt-BR")} a ${fim.toLocaleDateString("pt-BR")}`;
        }

        return (
            inicio ||
            fim
        ).toLocaleDateString(
            "pt-BR"
        );
    }

    function formatarCompetencia(
        competencia
    ) {
        const partes =
            String(
                competencia || ""
            ).split(
                "-"
            );

        return partes.length ===
            2
            ? `${partes[1]}/${partes[0]}`
            : competencia;
    }

    function formatarDocumento(
        documento
    ) {
        const numero =
            String(
                documento || ""
            ).replace(
                /\D/g,
                ""
            );

        if (
            numero.length ===
            11
        ) {
            return numero.replace(
                /(\d{3})(\d{3})(\d{3})(\d{2})/,
                "$1.$2.$3-$4"
            );
        }

        if (
            numero.length ===
            14
        ) {
            return numero.replace(
                /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
                "$1.$2.$3/$4-$5"
            );
        }

        return numero;
    }

    function validarCPF(
        cpf
    ) {
        cpf =
            String(
                cpf || ""
            ).replace(
                /\D/g,
                ""
            );

        if (
            !/^\d{11}$/.test(
                cpf
            ) ||
            /^(\d)\1{10}$/.test(
                cpf
            )
        ) {
            return false;
        }

        let soma =
            0;

        for (
            let i = 0;
            i <
            9;
            i++
        ) {
            soma +=
                Number(
                    cpf[i]
                ) *
                (
                    10 -
                    i
                );
        }

        let digito =
            (
                soma *
                10
            ) %
            11;

        if (
            digito ===
            10
        ) {
            digito =
                0;
        }

        if (
            digito !==
            Number(
                cpf[9]
            )
        ) {
            return false;
        }

        soma =
            0;

        for (
            let i = 0;
            i <
            10;
            i++
        ) {
            soma +=
                Number(
                    cpf[i]
                ) *
                (
                    11 -
                    i
                );
        }

        digito =
            (
                soma *
                10
            ) %
            11;

        if (
            digito ===
            10
        ) {
            digito =
                0;
        }

        return digito ===
            Number(
                cpf[10]
            );
    }

    function validarCNPJ(
        cnpj
    ) {
        cnpj =
            String(
                cnpj || ""
            ).replace(
                /\D/g,
                ""
            );

        if (
            !/^\d{14}$/.test(
                cnpj
            ) ||
            /^(\d)\1{13}$/.test(
                cnpj
            )
        ) {
            return false;
        }

        const calcular =
            base => {
                let peso =
                    base.length ===
                        12
                        ? 5
                        : 6;

                let soma =
                    0;

                for (
                    const caractere
                    of base
                ) {
                    soma +=
                        Number(
                            caractere
                        ) *
                        peso;

                    peso--;

                    if (
                        peso ===
                        1
                    ) {
                        peso =
                            9;
                    }
                }

                const resto =
                    soma %
                    11;

                return resto <
                    2
                    ? 0
                    : 11 -
                    resto;
            };

        const d1 =
            calcular(
                cnpj.slice(
                    0,
                    12
                )
            );

        const d2 =
            calcular(
                cnpj.slice(
                    0,
                    12
                ) +
                d1
            );

        return cnpj.endsWith(
            String(
                d1
            ) +
            String(
                d2
            )
        );
    }

    function setTexto(
        id,
        valor
    ) {
        const elemento =
            document.getElementById(
                id
            );

        if (elemento) {
            elemento.textContent =
                valor;
        }
    }

    function setTextoMultiplos(
        ids,
        valor
    ) {
        (
            ids || []
        ).forEach(
            id =>
                setTexto(
                    id,
                    valor
                )
        );
    }

    function obterPrimeiroElemento(
        ids
    ) {
        for (
            const id
            of ids || []
        ) {
            const elemento =
                document.getElementById(
                    id
                );

            if (elemento) {
                return elemento;
            }
        }

        return null;
    }

    function escaparHTML(
        valor
    ) {
        return String(
            valor ??
            ""
        ).replace(
            /[&<>"']/g,
            caractere => ({
                "&":
                    "&amp;",
                "<":
                    "&lt;",
                ">":
                    "&gt;",
                '"':
                    "&quot;",
                "'":
                    "&#039;"
            }[
                caractere
            ])
        );
    }

    function definirStatus(
        texto,
        tipo
    ) {
        const elemento =
            document.getElementById(
                "statusLeituraExtrato"
            );

        if (!elemento) {
            return;
        }

        elemento.textContent =
            texto;

        elemento.className =
            `status-leitura-ocr status-${tipo || "info"}`;
    }

    function mostrarResultadoOCR() {
        const card =
            document.getElementById(
                "cardResultadoLeituraExtratos"
            );

        if (card) {
            card.hidden =
                false;
        }
    }

    function ocultarResultadoOCR() {
        const card =
            document.getElementById(
                "cardResultadoLeituraExtratos"
            );

        if (card) {
            card.hidden =
                true;
        }
    }

    function limparResumoOCR() {
        setTextoMultiplos(
            [
                "ocrMediaMensal",
                "mediaMensalPreliminarOCR"
            ],
            "R$ 0,00"
        );

        setTextoMultiplos(
            [
                "ocrTotalCreditosValidos",
                "ocrTotalCreditos",
                "totalCreditosValidosOCR"
            ],
            "R$ 0,00"
        );

        setTextoMultiplos(
            [
                "ocrMesesConsiderados",
                "mesesConsideradosOCR"
            ],
            "0"
        );

        setTextoMultiplos(
            [
                "ocrMaiorMes",
                "ocrMesMaiorMovimentacao",
                "mesMaiorMovimentacaoOCR"
            ],
            "-"
        );
    }

    function limparTabelaMovimentacoesOCR() {
        const tabela =
            document.getElementById(
                "tabelaMovimentacoesOCR"
            );

        if (!tabela) {
            return;
        }

        const tbody =
            tabela.querySelector(
                "tbody"
            );

        if (tbody) {
            tbody.innerHTML =
                '<tr><td colspan="8" class="sem-dados">Nenhuma leitura realizada.</td></tr>';
        }
    }

    window.leituraExtratosMovimentacao = {
        obterArquivos:
            () =>
                arquivosExtratoSelecionados.slice(),

        obterResultado:
            () =>
                resultadoLeituraOCR,

        limpar:
            limparArquivosExtrato,

        recalcular:
            () => {
                if (
                    resultadoLeituraOCR
                ) {
                    atualizarCalculosOCR(
                        resultadoLeituraOCR
                    );

                    atualizarResumoLeitura(
                        resultadoLeituraOCR
                    );
                }
            }
    };

})();