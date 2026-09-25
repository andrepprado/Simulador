(function () {
    "use strict";

    const CONFIG = {
        maxArquivos: 20,
        maxTamanho: 30 * 1024 * 1024,
        extensoes: [
            "pdf",
            "png",
            "jpg",
            "jpeg",
            "webp",
            "txt",
            "csv"
        ],
        pdfjs: [
            "./pdfjs/pdf.mjs"
        ],
        pdfWorker:
            "./js/pdfjs/pdf.worker.mjs",
        ocrIdioma:
            "por",
        ocrEscala:
            2.25,
        ocrMinCaracteresPagina:
            80,
        ocrWorkerPath:
            "./js/tesseract/worker.min.js",
        ocrCorePath:
            "./js/tesseract/tesseract-core-lstm.wasm.js",
        ocrLangPath:
            "./js/tesseract/lang-data",
        toleranciaDiasTransferencia:
            2,
        toleranciaValor:
            0.01
    };

    const LINHAS_INFORMATIVAS = [
        /\bSALDO ANTERIOR\b/,
        /\bSALDO DO DIA\b/,
        /\bSALDO FINAL\b/,
        /\bSALDO DISPONIVEL\b/,
        /\bSALDO TOTAL\b/,
        /\bSALDO EM CONTA CAPITAL\b/,
        /\bSALDO CONTA CAPITAL\b/,
        /\bSALDO BLOQUEADO\b/,
        /\bSALDO BLOQUEADO ANTERIOR\b/,
        /\bCHEQUE ESPECIAL CONTRATADO\b/,
        /\bLIMITE DE CHEQUE ESPECIAL\b/,
        /\bLIMITE DISPONIVEL\b/,
        /\bTOTAL DE CREDITOS\b/,
        /\bTOTAL CREDITOS\b/,
        /\bTOTAL DE DEBITOS\b/,
        /\bTOTAL DEBITOS\b/,
        /\bTOTAL MOVIMENTACAO\b/,
        /\bTOTAL MOVIMENTACOES\b/,
        /\bRESUMO\b/,
        /\bLANCAMENTOS FUTUROS\b/,
        /\bDATA DOCUMENTO HISTORICO VALOR\b/,
        /\bDATA HISTORICO VALOR\b/,
        /\bEXTRATO CONTA CORRENTE\b/,
        /\bEXTRATO DE CONTA\b/,
        /\bAGENCIA CONTA\b/,
        /\bCONTA CORRENTE\b/,
        /\bOUVIDORIA\b/,
        /\bCENTRAL DE ATENDIMENTO\b/,
        /\bSAC\b/
    ];

    const PADROES_CREDITO = [
        /\bPIX RECEBIDO\b/,
        /\bPIX RECEBIDA\b/,
        /\bPIX RECEB\b/,
        /\bTRANSF RECEBIDA\b/,
        /\bTRANSFERENCIA RECEBIDA\b/,
        /\bTRANSFERENCIA RECEBIDO\b/,
        /\bCRED TRANSF\b/,
        /\bCREDITO TRANSFERENCIA\b/,
        /\bCRED TED\b/,
        /\bTED RECEBIDA\b/,
        /\bTED RECEBIDO\b/,
        /\bDOC RECEBIDO\b/,
        /\bDOC RECEBIDA\b/,
        /\bDEPOSITO EM DINHEIRO\b/,
        /\bDEP DINHEIRO\b/,
        /\bDEPOSITO CHEQUE\b/,
        /\bDEP CHEQUE\b/,
        /\bRECEBIMENTO\b/,
        /\bPAGAMENTO RECEBIDO\b/,
        /\bCOBRANCA RECEBIDA\b/,
        /\bLIQUIDACAO COBRANCA\b/,
        /\bCRED LIQUIDACAO COBRANCA\b/,
        /\bOUTROS CREDITOS\b/,
        /\bCREDITO EM CONTA\b/,
        /\bCR COMPRAS\b/,

        /*
         * CORREÇÃO:
         * antecipação de recebíveis de cartão é crédito válido
         * para a média de movimentação.
         */
        /\bCR ANTECIPACAO MASTERCARD\b/,
        /\bCR ANTECIPACAO VISA\b/,
        /\bCRED ANTECIPACAO MASTERCARD\b/,
        /\bCRED ANTECIPACAO VISA\b/,
        /\bCREDITO ANTECIPACAO MASTERCARD\b/,
        /\bCREDITO ANTECIPACAO VISA\b/
    ];

    const PADROES_DEBITO = [
        /\bPIX ENVIADO\b/,
        /\bPIX REALIZADO\b/,
        /\bPIX EFETUADO\b/,
        /\bTRANSFERENCIA ENVIADA\b/,
        /\bTRANSFERENCIA REALIZADA\b/,
        /\bTED ENVIADA\b/,
        /\bTED REALIZADA\b/,
        /\bPAGAMENTO\b/,
        /\bCOMPRA\b/,
        /\bSAQUE\b/,
        /\bDEBITO\b/,
        /\bTARIFA\b/
    ];

    let arquivos = [];
    let documentos = [];
    let movimentacoes = [];
    let resultado = null;

    let pdfjs = null;
    let workerOCR = null;
    let contadorMovimentacoes = 0;

    document.addEventListener(
        "DOMContentLoaded",
        iniciar
    );

    function iniciar() {
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

        const btnSelecionar =
            document.getElementById(
                "btnSelecionarTodosOCR"
            );

        const btnDesmarcar =
            document.getElementById(
                "btnDesmarcarTodosOCR"
            );

        const btnAplicar =
            document.getElementById(
                "btnAplicarLeituraOCR"
            );

        const btnCopiar =
            document.getElementById(
                "btnCopiarResumoOCR"
            );

        if (input) {
            input.addEventListener(
                "change",
                function () {
                    adicionarArquivos(
                        Array.from(
                            input.files ||
                            []
                        )
                    );

                    input.value = "";
                }
            );
        }

        if (area) {
            area.addEventListener(
                "dragover",
                function (e) {
                    e.preventDefault();

                    area.classList.add(
                        "arrastando"
                    );
                }
            );

            area.addEventListener(
                "dragleave",
                function () {
                    area.classList.remove(
                        "arrastando"
                    );
                }
            );

            area.addEventListener(
                "drop",
                function (e) {
                    e.preventDefault();

                    area.classList.remove(
                        "arrastando"
                    );

                    adicionarArquivos(
                        Array.from(
                            e.dataTransfer &&
                                e.dataTransfer.files
                                ? e.dataTransfer.files
                                : []
                        )
                    );
                }
            );
        }

        if (btnLer) {
            btnLer.addEventListener(
                "click",
                processarExtratos
            );
        }

        if (btnLimpar) {
            btnLimpar.addEventListener(
                "click",
                limparTudo
            );
        }

        if (btnSelecionar) {
            btnSelecionar.addEventListener(
                "click",
                function () {
                    alterarTodos(true);
                }
            );
        }

        if (btnDesmarcar) {
            btnDesmarcar.addEventListener(
                "click",
                function () {
                    alterarTodos(false);
                }
            );
        }

        if (btnAplicar) {
            btnAplicar.addEventListener(
                "click",
                aplicarAoMotor
            );
        }

        if (btnCopiar) {
            btnCopiar.addEventListener(
                "click",
                copiarResumo
            );
        }

        renderizarArquivos();
        atualizarBotoes();

        definirStatus(
            "Pronto para ler os extratos.",
            "info"
        );

        console.log(
            "[Média Movimentação] Leitor OCR local iniciado."
        );
    }

    function atualizarBotoes() {
        const btnLer =
            document.getElementById(
                "btnLerExtratos"
            );

        const btnLimpar =
            document.getElementById(
                "btnLimparArquivosExtrato"
            );

        if (btnLer) {
            btnLer.disabled =
                arquivos.length === 0;
        }

        if (btnLimpar) {
            btnLimpar.disabled =
                arquivos.length === 0;
        }
    }

    function adicionarArquivos(novos) {
        if (!novos || !novos.length) {
            atualizarBotoes();
            return;
        }

        const erros = [];

        novos.forEach(
            function (file) {
                if (
                    arquivos.length >=
                    CONFIG.maxArquivos
                ) {
                    erros.push(
                        "Limite de " +
                        CONFIG.maxArquivos +
                        " arquivos atingido."
                    );

                    return;
                }

                const ext =
                    obterExtensao(
                        file.name
                    );

                if (
                    !CONFIG.extensoes.includes(
                        ext
                    )
                ) {
                    erros.push(
                        file.name +
                        ": formato não suportado."
                    );

                    return;
                }

                if (
                    file.size >
                    CONFIG.maxTamanho
                ) {
                    erros.push(
                        file.name +
                        ": arquivo maior que " +
                        formatarTamanho(
                            CONFIG.maxTamanho
                        ) +
                        "."
                    );

                    return;
                }

                const duplicado =
                    arquivos.some(
                        function (a) {
                            return (
                                a.name ===
                                file.name &&
                                a.size ===
                                file.size &&
                                a.lastModified ===
                                file.lastModified
                            );
                        }
                    );

                if (!duplicado) {
                    arquivos.push(file);
                }
            }
        );

        renderizarArquivos();
        atualizarBotoes();

        definirStatus(
            erros.length
                ? erros.join(" ")
                : arquivos.length +
                " arquivo(s) selecionado(s).",
            erros.length
                ? "erro"
                : "info"
        );
    }

    function removerArquivo(indice) {
        arquivos.splice(
            indice,
            1
        );

        renderizarArquivos();
        atualizarBotoes();

        definirStatus(
            arquivos.length
                ? arquivos.length +
                " arquivo(s) selecionado(s)."
                : "Nenhum arquivo selecionado.",
            "info"
        );
    }

    function renderizarArquivos() {
        const lista =
            document.getElementById(
                "listaArquivosExtrato"
            );

        const quantidade =
            document.getElementById(
                "quantidadeArquivosExtrato"
            );

        if (quantidade) {
            quantidade.textContent =
                String(
                    arquivos.length
                );
        }

        if (!lista) return;

        lista.innerHTML = "";

        if (!arquivos.length) {
            lista.innerHTML =
                '<div class="sem-dados">Nenhum arquivo selecionado.</div>';

            return;
        }

        arquivos.forEach(
            function (
                file,
                indice
            ) {
                const item =
                    document.createElement(
                        "div"
                    );

                item.className =
                    "arquivo-extrato";

                item.innerHTML =
                    '<div class="arquivo-extrato-info">' +
                    "<strong>" +
                    escapar(
                        file.name
                    ) +
                    "</strong>" +
                    "<small>" +
                    escapar(
                        obterExtensao(
                            file.name
                        ).toUpperCase()
                    ) +
                    " · " +
                    escapar(
                        formatarTamanho(
                            file.size
                        )
                    ) +
                    "</small>" +
                    "</div>" +
                    '<button type="button" class="btn-remover-arquivo" aria-label="Remover arquivo">×</button>';

                const btn =
                    item.querySelector(
                        "button"
                    );

                if (btn) {
                    btn.addEventListener(
                        "click",
                        function (e) {
                            e.preventDefault();
                            e.stopPropagation();

                            removerArquivo(
                                indice
                            );
                        }
                    );
                }

                lista.appendChild(
                    item
                );
            }
        );
    }

    async function processarExtratos() {
        if (!arquivos.length) {
            definirStatus(
                "Selecione pelo menos um extrato.",
                "erro"
            );

            return;
        }

        bloquearProcessamento(
            true
        );

        documentos = [];
        movimentacoes = [];
        resultado = null;
        contadorMovimentacoes = 0;

        try {
            for (
                let i = 0;
                i < arquivos.length;
                i++
            ) {
                const file =
                    arquivos[i];

                definirStatus(
                    "Processando " +
                    (i + 1) +
                    " de " +
                    arquivos.length +
                    ": " +
                    file.name,
                    "processando"
                );

                try {
                    const documento =
                        await processarArquivo(
                            file,
                            i
                        );

                    documentos.push(
                        documento
                    );

                    documento
                        .movimentacoes
                        .forEach(
                            function (m) {
                                movimentacoes.push(
                                    m
                                );
                            }
                        );

                    console.log(
                        "[Média Movimentação] Arquivo processado:",
                        file.name,
                        "| método:",
                        documento.metodoLeitura,
                        "| banco:",
                        documento.banco,
                        "| movimentações:",
                        documento.movimentacoes.length
                    );
                } catch (erroArquivo) {
                    console.error(
                        "[Média Movimentação] Erro em " +
                        file.name,
                        erroArquivo
                    );

                    documentos.push({
                        id:
                            "DOC" +
                            String(
                                i + 1
                            ).padStart(
                                3,
                                "0"
                            ),
                        arquivo:
                            file.name,
                        tipo:
                            obterExtensao(
                                file.name
                            ).toUpperCase(),
                        metodoLeitura:
                            "ERRO",
                        banco:
                            "Não identificado",
                        titular:
                            "",
                        documentoTitular:
                            "",
                        texto:
                            "",
                        periodo:
                            null,
                        competencias:
                            [],
                        movimentacoes:
                            [],
                        erro:
                            erroArquivo &&
                                erroArquivo.message
                                ? erroArquivo.message
                                : String(
                                    erroArquivo
                                )
                    });
                }
            }

            detectarDuplicidades();
            detectarTransferenciasProprias();

            resultado =
                montarResultado();

            renderizarResultado();

            if (
                !movimentacoes.length
            ) {
                definirStatus(
                    "Arquivos lidos, porém nenhuma movimentação financeira foi identificada.",
                    "erro"
                );

                return;
            }

            definirStatus(
                movimentacoes.length +
                " movimentação(ões) identificada(s). Confira antes de aplicar.",
                "sucesso"
            );
        } catch (erro) {
            console.error(
                "[Média Movimentação] Falha:",
                erro
            );

            definirStatus(
                "Erro durante a leitura: " +
                (
                    erro &&
                        erro.message
                        ? erro.message
                        : String(
                            erro
                        )
                ),
                "erro"
            );
        } finally {
            bloquearProcessamento(
                false
            );
        }
    }

    async function processarArquivo(
        file,
        indice
    ) {
        const ext =
            obterExtensao(
                file.name
            );

        let texto = "";
        let metodoLeitura =
            "TEXTO";

        if (ext === "pdf") {
            const leitura =
                await extrairPDF(
                    file
                );

            texto =
                leitura.texto;

            metodoLeitura =
                leitura.metodo;
        } else if (
            [
                "png",
                "jpg",
                "jpeg",
                "webp"
            ].includes(ext)
        ) {
            texto =
                await extrairImagemOCR(
                    file
                );

            metodoLeitura =
                "OCR";
        } else {
            texto =
                await file.text();
        }

        texto =
            normalizarTextoExtraido(
                texto
            );

        if (
            !texto.trim()
        ) {
            throw new Error(
                "Nenhum texto pôde ser extraído."
            );
        }

        const banco =
            identificarBanco(
                texto,
                file.name
            );

        const titular =
            identificarTitular(
                texto
            );

        const periodo =
            identificarPeriodo(
                texto
            );

        const doc = {
            id:
                "DOC" +
                String(
                    indice + 1
                ).padStart(
                    3,
                    "0"
                ),
            arquivo:
                file.name,
            tipo:
                ext.toUpperCase(),
            metodoLeitura,
            banco,
            titular:
                titular.nome,
            documentoTitular:
                titular.documento,
            texto,
            periodo,
            competencias:
                [],
            movimentacoes:
                [],
            erro:
                ""
        };

        doc.movimentacoes =
            interpretarMovimentacoesDocumento(
                doc
            );

        doc.competencias =
            Array.from(
                new Set(
                    doc.movimentacoes
                        .map(
                            m =>
                                m.competencia
                        )
                        .filter(
                            Boolean
                        )
                )
            ).sort();

        return doc;
    }

    async function carregarPDFJS() {
        if (pdfjs) {
            return pdfjs;
        }

        let ultimoErro =
            null;

        for (
            const caminho of
            CONFIG.pdfjs
        ) {
            try {
                pdfjs =
                    await import(
                        caminho
                    );

                if (
                    pdfjs &&
                    pdfjs.GlobalWorkerOptions
                ) {
                    pdfjs
                        .GlobalWorkerOptions
                        .workerSrc =
                        CONFIG.pdfWorker;
                }

                console.log(
                    "[Média Movimentação] PDF.js carregado:",
                    caminho
                );

                return pdfjs;
            } catch (e) {
                ultimoErro =
                    e;
            }
        }

        throw new Error(
            "PDF.js local não encontrado. " +
            (
                ultimoErro &&
                    ultimoErro.message
                    ? ultimoErro.message
                    : ""
            )
        );
    }

    async function extrairPDF(
        file
    ) {
        const lib =
            await carregarPDFJS();

        const buffer =
            await file.arrayBuffer();

        const pdf =
            await lib
                .getDocument({
                    data:
                        new Uint8Array(
                            buffer
                        )
                })
                .promise;

        const paginas = [];

        let usouOCR =
            false;

        let usouTexto =
            false;

        for (
            let numero = 1;
            numero <=
            pdf.numPages;
            numero++
        ) {
            definirStatus(
                "Lendo " +
                file.name +
                " · página " +
                numero +
                " de " +
                pdf.numPages,
                "processando"
            );

            const pagina =
                await pdf.getPage(
                    numero
                );

            const conteudo =
                await pagina
                    .getTextContent();

            let textoPagina =
                reconstruirPagina(
                    conteudo.items ||
                    []
                );

            if (
                textoPDFUtil(
                    textoPagina
                )
            ) {
                usouTexto =
                    true;
            } else {
                definirStatus(
                    "Aplicando OCR em " +
                    file.name +
                    " · página " +
                    numero +
                    " de " +
                    pdf.numPages,
                    "processando"
                );

                textoPagina =
                    await reconhecerPaginaPDFOCR(
                        pagina,
                        file.name,
                        numero,
                        pdf.numPages
                    );

                usouOCR =
                    true;
            }

            paginas.push(
                textoPagina ||
                ""
            );
        }

        const final =
            paginas
                .join("\n")
                .trim();

        if (!final) {
            throw new Error(
                "Não foi possível extrair ou reconhecer texto do PDF."
            );
        }

        return {
            texto:
                final,
            metodo:
                usouOCR &&
                    usouTexto
                    ? "PDF.js + OCR"
                    : (
                        usouOCR
                            ? "OCR"
                            : "PDF.js"
                    )
        };
    }

    function textoPDFUtil(
        texto
    ) {
        const t =
            String(
                texto || ""
            )
                .replace(
                    /\s+/g,
                    " "
                )
                .trim();

        if (
            t.length <
            CONFIG
                .ocrMinCaracteresPagina
        ) {
            return false;
        }

        const validos =
            (
                t.match(
                    /[A-Za-zÀ-ÿ0-9]/g
                ) ||
                []
            ).length;

        return (
            validos /
            Math.max(
                1,
                t.length
            )
        ) >= 0.35;
    }

    function reconstruirPagina(
        items
    ) {
        const elementos =
            (items || [])
                .filter(
                    item =>
                        item &&
                        String(
                            item.str ||
                            ""
                        ).trim()
                )
                .map(
                    function (item) {
                        return {
                            texto:
                                String(
                                    item.str ||
                                    ""
                                )
                                    .replace(
                                        /\s+/g,
                                        " "
                                    )
                                    .trim(),
                            x:
                                item.transform &&
                                    Number.isFinite(
                                        item.transform[4]
                                    )
                                    ? item.transform[4]
                                    : 0,
                            y:
                                item.transform &&
                                    Number.isFinite(
                                        item.transform[5]
                                    )
                                    ? item.transform[5]
                                    : 0
                        };
                    }
                );

        elementos.sort(
            function (
                a,
                b
            ) {
                const dy =
                    b.y -
                    a.y;

                if (
                    Math.abs(
                        dy
                    ) >
                    2.5
                ) {
                    return dy;
                }

                return (
                    a.x -
                    b.x
                );
            }
        );

        const linhas =
            [];

        let atual =
            [];

        let yAtual =
            null;

        elementos.forEach(
            function (el) {
                if (
                    yAtual ===
                    null ||
                    Math.abs(
                        el.y -
                        yAtual
                    ) <= 2.5
                ) {
                    atual.push(
                        el
                    );

                    if (
                        yAtual ===
                        null
                    ) {
                        yAtual =
                            el.y;
                    }
                } else {
                    linhas.push(
                        atual
                            .sort(
                                (
                                    a,
                                    b
                                ) =>
                                    a.x -
                                    b.x
                            )
                            .map(
                                x =>
                                    x.texto
                            )
                            .join(
                                " "
                            )
                    );

                    atual = [
                        el
                    ];

                    yAtual =
                        el.y;
                }
            }
        );

        if (
            atual.length
        ) {
            linhas.push(
                atual
                    .sort(
                        (
                            a,
                            b
                        ) =>
                            a.x -
                            b.x
                    )
                    .map(
                        x =>
                            x.texto
                    )
                    .join(
                        " "
                    )
            );
        }

        return linhas
            .map(
                l =>
                    l
                        .replace(
                            /\s+/g,
                            " "
                        )
                        .trim()
            )
            .filter(
                Boolean
            )
            .join(
                "\n"
            );
    }

    async function reconhecerPaginaPDFOCR(
        pagina,
        nomeArquivo,
        numero,
        total
    ) {
        const viewport =
            pagina.getViewport({
                scale:
                    CONFIG
                        .ocrEscala
            });

        const canvas =
            document.createElement(
                "canvas"
            );

        const ctx =
            canvas.getContext(
                "2d",
                {
                    willReadFrequently:
                        true
                }
            );

        canvas.width =
            Math.ceil(
                viewport.width
            );

        canvas.height =
            Math.ceil(
                viewport.height
            );

        await pagina
            .render({
                canvasContext:
                    ctx,
                viewport,
                background:
                    "white"
            })
            .promise;

        melhorarImagemOCR(
            canvas
        );

        return reconhecerCanvasOCR(
            canvas,
            nomeArquivo +
            " · página " +
            numero +
            "/" +
            total
        );
    }

    async function extrairImagemOCR(
        file
    ) {
        const url =
            URL.createObjectURL(
                file
            );

        try {
            const imagem =
                await carregarImagem(
                    url
                );

            const largura =
                imagem.naturalWidth ||
                imagem.width;

            const altura =
                imagem.naturalHeight ||
                imagem.height;

            const maxLado =
                3200;

            const escala =
                Math.min(
                    1,
                    maxLado /
                    Math.max(
                        largura,
                        altura
                    )
                );

            const canvas =
                document.createElement(
                    "canvas"
                );

            canvas.width =
                Math.max(
                    1,
                    Math.round(
                        largura *
                        escala
                    )
                );

            canvas.height =
                Math.max(
                    1,
                    Math.round(
                        altura *
                        escala
                    )
                );

            const ctx =
                canvas.getContext(
                    "2d",
                    {
                        willReadFrequently:
                            true
                    }
                );

            ctx.fillStyle =
                "#FFFFFF";

            ctx.fillRect(
                0,
                0,
                canvas.width,
                canvas.height
            );

            ctx.drawImage(
                imagem,
                0,
                0,
                canvas.width,
                canvas.height
            );

            melhorarImagemOCR(
                canvas
            );

            return await reconhecerCanvasOCR(
                canvas,
                file.name
            );
        } finally {
            URL.revokeObjectURL(
                url
            );
        }
    }

    function carregarImagem(
        url
    ) {
        return new Promise(
            function (
                resolve,
                reject
            ) {
                const img =
                    new Image();

                img.onload =
                    () =>
                        resolve(
                            img
                        );

                img.onerror =
                    () =>
                        reject(
                            new Error(
                                "Não foi possível abrir a imagem."
                            )
                        );

                img.src =
                    url;
            }
        );
    }

    function melhorarImagemOCR(
        canvas
    ) {
        const ctx =
            canvas.getContext(
                "2d",
                {
                    willReadFrequently:
                        true
                }
            );

        const imagem =
            ctx.getImageData(
                0,
                0,
                canvas.width,
                canvas.height
            );

        const dados =
            imagem.data;

        for (
            let i = 0;
            i < dados.length;
            i += 4
        ) {
            const cinza =
                Math.round(
                    dados[i] *
                    0.299 +
                    dados[i + 1] *
                    0.587 +
                    dados[i + 2] *
                    0.114
                );

            const contraste =
                Math.max(
                    0,
                    Math.min(
                        255,
                        (
                            cinza -
                            128
                        ) *
                        1.18 +
                        128
                    )
                );

            dados[i] =
                dados[i + 1] =
                dados[i + 2] =
                contraste;

            dados[i + 3] =
                255;
        }

        ctx.putImageData(
            imagem,
            0,
            0
        );
    }

    async function obterWorkerOCR() {
        if (workerOCR) {
            return workerOCR;
        }

        if (
            !window.Tesseract ||
            typeof window
                .Tesseract
                .createWorker !==
            "function"
        ) {
            throw new Error(
                "Tesseract.js local não foi carregado."
            );
        }

        workerOCR =
            await window
                .Tesseract
                .createWorker(
                    CONFIG
                        .ocrIdioma,
                    1,
                    {
                        workerPath:
                            CONFIG
                                .ocrWorkerPath,
                        corePath:
                            CONFIG
                                .ocrCorePath,
                        langPath:
                            CONFIG
                                .ocrLangPath,
                        logger:
                            function (
                                m
                            ) {
                                if (
                                    !m ||
                                    typeof m.progress !==
                                    "number"
                                ) {
                                    return;
                                }

                                if (
                                    String(
                                        m.status ||
                                        ""
                                    )
                                        .toLowerCase()
                                        .includes(
                                            "recognizing text"
                                        )
                                ) {
                                    definirStatus(
                                        "OCR reconhecendo texto: " +
                                        Math.round(
                                            m.progress *
                                            100
                                        ) +
                                        "%",
                                        "processando"
                                    );
                                }
                            }
                    }
                );

        return workerOCR;
    }

    async function reconhecerCanvasOCR(
        canvas,
        referencia
    ) {
        const worker =
            await obterWorkerOCR();

        const retorno =
            await worker.recognize(
                canvas
            );

        const texto =
            retorno &&
                retorno.data
                ? String(
                    retorno.data.text ||
                    ""
                )
                : "";

        if (
            !texto.trim()
        ) {
            throw new Error(
                "OCR não encontrou texto legível em " +
                referencia +
                "."
            );
        }

        return texto;
    }

    function normalizarTextoExtraido(
        texto
    ) {
        return String(
            texto || ""
        )
            .replace(
                /\u00A0/g,
                " "
            )
            .replace(
                /\r\n/g,
                "\n"
            )
            .replace(
                /\r/g,
                "\n"
            )
            .replace(
                /[ \t]+/g,
                " "
            )
            .replace(
                /\n{3,}/g,
                "\n\n"
            )
            .trim();
    }

    function interpretarMovimentacoesDocumento(
        doc
    ) {
        const linhas =
            String(
                doc.texto ||
                ""
            )
                .split(
                    "\n"
                )
                .map(
                    l =>
                        l
                            .replace(
                                /\s+/g,
                                " "
                            )
                            .trim()
                )
                .filter(
                    Boolean
                );

        const lista =
            [];

        let dataCorrente =
            null;

        for (
            let i = 0;
            i < linhas.length;
            i++
        ) {
            const linha =
                linhas[i];

            const n =
                normalizar(
                    linha
                );

            if (
                linhaInformativa(
                    n
                )
            ) {
                continue;
            }

            const dataInfo =
                extrairDataLinha(
                    linha,
                    dataCorrente,
                    doc.periodo
                );

            const possuiData =
                !!dataInfo
                    .explicitamenteInformada;

            if (
                dataInfo.data
            ) {
                dataCorrente =
                    dataInfo.data;
            }

            let mov =
                interpretarLinha(
                    linha,
                    dataCorrente,
                    doc,
                    i,
                    possuiData
                );

            /*
             * Concatenação só é tentada quando a linha inicial possui
             * data explícita. Isso evita juntar saldo/resumo às linhas
             * anteriores e criar créditos inexistentes.
             */
            if (
                !mov &&
                possuiData &&
                i + 1 <
                linhas.length &&
                !extrairDataLinha(
                    linhas[i + 1],
                    null,
                    doc.periodo
                )
                    .explicitamenteInformada
            ) {
                mov =
                    interpretarLinha(
                        linha +
                        " " +
                        linhas[
                        i + 1
                        ],
                        dataCorrente,
                        doc,
                        i,
                        true
                    );
            }

            if (mov) {
                lista.push(
                    mov
                );
            }
        }

        return removerDuplicadosDocumento(
            lista
        );
    }

    function interpretarLinha(
        linha,
        dataCorrente,
        doc,
        indice,
        possuiDataNaLinha
    ) {
        const original =
            String(
                linha || ""
            )
                .replace(
                    /\s+/g,
                    " "
                )
                .trim();

        if (
            !original ||
            !dataCorrente
        ) {
            return null;
        }

        const normalizado =
            normalizar(
                original
            );

        if (
            linhaInformativa(
                normalizado
            )
        ) {
            return null;
        }

        let semData =
            original.replace(
                /(?:^|\s)(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?(?=\s|$)/,
                " "
            )
                .replace(
                    /\s+/g,
                    " "
                )
                .trim();

        const valores =
            extrairValores(
                semData
            );

        if (
            !valores.length
        ) {
            return null;
        }

        const escolhido =
            escolherValorMovimentacao(
                valores,
                semData
            );

        if (!escolhido) {
            return null;
        }

        /*
         * Linha sem data herdada só entra se possuir C/D explícito.
         * Essa regra elimina falso crédito de saldo/resumo.
         */
        if (
            !possuiDataNaLinha &&
            !escolhido.indicador
        ) {
            return null;
        }

        let historico =
            (
                semData.substring(
                    0,
                    escolhido.indice
                ) +
                " " +
                semData.substring(
                    escolhido.indice +
                    escolhido.texto.length
                )
            )
                .replace(
                    /[|]+/g,
                    " "
                )
                .replace(
                    /\s+/g,
                    " "
                )
                .trim();

        historico =
            limparHistorico(
                historico
            );

        const historicoNormalizado =
            normalizar(
                historico
            );

        if (
            !historico ||
            historico.length <
            2 ||
            linhaInformativa(
                historicoNormalizado
            )
        ) {
            return null;
        }

        const natureza =
            inferirNatureza(
                original,
                escolhido,
                historicoNormalizado
            );

        /*
         * CORREÇÃO PRINCIPAL:
         * desconhecido não é transformado automaticamente em crédito.
         */
        if (!natureza) {
            return null;
        }

        contadorMovimentacoes++;

        const mov = {
            id:
                "MOV" +
                String(
                    contadorMovimentacoes
                ).padStart(
                    6,
                    "0"
                ),
            documentoId:
                doc.id,
            arquivo:
                doc.arquivo,
            banco:
                doc.banco,
            titular:
                doc.titular,
            documentoTitular:
                doc.documentoTitular,
            linhaOrigem:
                indice + 1,
            original,
            data:
                dataCorrente,
            dataTexto:
                formatarData(
                    dataCorrente
                ),
            competencia:
                competencia(
                    dataCorrente
                ),
            historico,
            historicoNormalizado,
            valor:
                escolhido.valor,
            natureza,
            classificacao:
                "",
            motivo:
                "",
            considerar:
                false,
            duvida:
                false,
            duplicado:
                false,
            transferenciaPropria:
                false,
            referenciaTransferencia:
                "",
            manual:
                false
        };

        classificar(
            mov
        );

        return mov;
    }

    function extrairValores(
        texto
    ) {
        const lista =
            [];

        const regex =
            /(?:R\$\s*)?([+-]?\s*(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2})\s*([CD])?(?=\s|$|[|])/gi;

        let m;

        while (
            (
                m =
                regex.exec(
                    texto
                )
            ) !== null
        ) {
            const original =
                converterValorFlexivel(
                    m[1]
                );

            if (
                !Number.isFinite(
                    original
                ) ||
                Math.abs(
                    original
                ) === 0
            ) {
                continue;
            }

            lista.push({
                valor:
                    Math.abs(
                        original
                    ),
                sinal:
                    original < 0
                        ? -1
                        : 1,
                indicador:
                    String(
                        m[2] ||
                        ""
                    ).toUpperCase(),
                texto:
                    m[0],
                indice:
                    m.index
            });
        }

        return lista;
    }

    function escolherValorMovimentacao(
        valores,
        linha
    ) {
        if (
            !valores.length
        ) {
            return null;
        }

        /*
         * Preferência absoluta por valor que possua indicador C/D.
         * Em extrato Sicoob isso diferencia lançamento de saldos.
         */
        for (
            let i =
                valores.length -
                1;
            i >= 0;
            i--
        ) {
            if (
                valores[i]
                    .indicador ===
                "C" ||
                valores[i]
                    .indicador ===
                "D"
            ) {
                return valores[i];
            }
        }

        if (
            linhaInformativa(
                normalizar(
                    linha
                )
            )
        ) {
            return null;
        }

        if (
            valores.length ===
            1
        ) {
            return valores[0];
        }

        /*
         * Mais de um valor sem C/D é ambíguo.
         * Não assume o último como movimento para não capturar saldo.
         */
        return null;
    }

    function inferirNatureza(
        linha,
        valor,
        historicoNormalizado
    ) {
        if (
            valor.indicador ===
            "C"
        ) {
            return "C";
        }

        if (
            valor.indicador ===
            "D"
        ) {
            return "D";
        }

        if (
            valor.sinal <
            0
        ) {
            return "D";
        }

        if (
            PADROES_CREDITO.some(
                regex =>
                    regex.test(
                        historicoNormalizado
                    )
            )
        ) {
            return "C";
        }

        if (
            PADROES_DEBITO.some(
                regex =>
                    regex.test(
                        historicoNormalizado
                    )
            )
        ) {
            return "D";
        }

        /*
         * NÃO utilizar return "C" como fallback.
         */
        return null;
    }

    function classificar(
        m
    ) {
        const h =
            m.historicoNormalizado;

        if (
            linhaInformativa(
                h
            )
        ) {
            m.classificacao =
                "INFORMATIVO";

            m.motivo =
                "Saldo/resumo informativo";

            m.considerar =
                false;

            return;
        }

        if (
            m.natureza !==
            "C"
        ) {
            m.classificacao =
                "DÉBITO";

            m.motivo =
                "Débito/saída de recursos";

            m.considerar =
                false;

            return;
        }

        /*
         * CR ANTECIPAÇÃO MASTERCARD/VISA É CRÉDITO VÁLIDO.
         * Esta regra vem antes da exclusão genérica de operações.
         */
        if (
            /\b(CR|CRED|CREDITO) ANTECIPACAO (MASTERCARD|VISA)\b/.test(
                h
            )
        ) {
            m.classificacao =
                "ANTECIPAÇÃO DE RECEBÍVEIS";

            m.motivo =
                "Crédito de recebível de cartão";

            m.considerar =
                true;

            return;
        }

        if (
            /\b(ESTORNO|REVERSAO|CANCELAMENTO|DEVOLUCAO|DEVOLVIDO|REEMBOLSO)\b/.test(
                h
            )
        ) {
            m.classificacao =
                "ESTORNO / DEVOLUÇÃO";

            m.motivo =
                "Estorno, devolução ou cancelamento";

            m.considerar =
                false;

            return;
        }

        if (
            /\b(EMPRESTIMO|FINANCIAMENTO|FINANC|LIBERACAO DE CREDITO|LIBERACAO CREDITO|CREDITO PESSOAL|CREDITO CONSIGNADO|CAPITAL DE GIRO|CRED LIBERACAO BNDES)\b/.test(
                h
            )
        ) {
            m.classificacao =
                "EMPRÉSTIMO / FINANCIAMENTO";

            m.motivo =
                "Não representa renda";

            m.considerar =
                false;

            return;
        }

        if (
            /\b(CHEQUE ESPECIAL|LIMITE DE CREDITO|CREDITO ROTATIVO)\b/.test(
                h
            )
        ) {
            m.classificacao =
                "LIMITE";

            m.motivo =
                "Limite de crédito não representa renda";

            m.considerar =
                false;

            return;
        }

        if (
            /\b(RDB|RDC|CDB|RESGATE|APLICACAO|INVESTIMENTO|FUNDO DE INVESTIMENTO)\b/.test(
                h
            )
        ) {
            m.classificacao =
                "INVESTIMENTO";

            m.motivo =
                "Aplicação/resgate de investimento";

            m.considerar =
                false;

            return;
        }

        if (
            /\b(CRED LIBERACAO TD|CREDITO LIBERACAO TD|TITULO DESCONTADO|DESCONTO DE TITULOS)\b/.test(
                h
            )
        ) {
            m.classificacao =
                "TÍTULO DESCONTADO";

            m.motivo =
                "Liberação de título descontado";

            m.considerar =
                false;

            return;
        }

        if (
            /\bPIX\b.*\b(RECEBIDO|RECEBIDA|ENTRADA)\b|\bPIX RECEB\b/.test(
                h
            )
        ) {
            m.classificacao =
                "PIX RECEBIDO";

            m.motivo =
                "PIX recebido";

            m.considerar =
                true;

            return;
        }

        if (
            /\b(TED|DOC)\b.*\b(RECEBIDA|RECEBIDO|CREDITO|CRED)\b/.test(
                h
            )
        ) {
            m.classificacao =
                "TRANSFERÊNCIA RECEBIDA";

            m.motivo =
                "Transferência recebida";

            m.considerar =
                true;

            return;
        }

        if (
            /\b(TRANSFERENCIA RECEBIDA|TRANSF RECEBIDA|CRED TRANSF|CREDITO TRANSFERENCIA)\b/.test(
                h
            )
        ) {
            m.classificacao =
                "TRANSFERÊNCIA RECEBIDA";

            m.motivo =
                "Transferência recebida";

            m.considerar =
                true;

            return;
        }

        if (
            /\b(DEPOSITO|DEP DINHEIRO|DEP CHEQUE)\b/.test(
                h
            )
        ) {
            m.classificacao =
                "DEPÓSITO";

            m.motivo =
                "Depósito recebido";

            m.considerar =
                true;

            return;
        }

        if (
            /\b(PAGAMENTO RECEBIDO|RECEBIMENTO|COBRANCA RECEBIDA|LIQUIDACAO COBRANCA)\b/.test(
                h
            )
        ) {
            m.classificacao =
                "RECEBIMENTO";

            m.motivo =
                "Recebimento identificado";

            m.considerar =
                true;

            return;
        }

        /*
         * Crédito com indicador bancário C, após passar por todas
         * as exclusões acima, é uma entrada efetiva no extrato.
         */
        if (
            m.natureza ===
            "C"
        ) {
            m.classificacao =
                "CRÉDITO";

            m.motivo =
                "Crédito identificado no extrato";

            m.considerar =
                true;

            return;
        }

        m.classificacao =
            "A CONFERIR";

        m.motivo =
            "Movimentação não classificada";

        m.considerar =
            false;

        m.duvida =
            true;
    }

    function linhaInformativa(
        n
    ) {
        return LINHAS_INFORMATIVAS.some(
            regex =>
                regex.test(
                    n
                )
        );
    }

    function extrairDataLinha(
        linha,
        dataCorrente,
        periodo
    ) {
        const texto =
            String(
                linha ||
                ""
            );

        let m =
            texto.match(
                /(?:^|\s)(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})(?=\s|$)/
            );

        if (m) {
            const data =
                criarData(
                    Number(
                        m[1]
                    ),
                    Number(
                        m[2]
                    ),
                    normalizarAno(
                        Number(
                            m[3]
                        ),
                        m[3]
                            .length
                    )
                );

            return {
                data:
                    data ||
                    dataCorrente,
                explicitamenteInformada:
                    !!data
            };
        }

        m =
            texto.match(
                /(?:^|\s)(\d{1,2})[\/.-](\d{1,2})(?=\s|$)/
            );

        if (m) {
            const ano =
                dataCorrente
                    ? dataCorrente
                        .getFullYear()
                    : (
                        periodo &&
                            periodo.inicio
                            ? periodo.inicio
                                .getFullYear()
                            : new Date()
                                .getFullYear()
                    );

            const data =
                criarData(
                    Number(
                        m[1]
                    ),
                    Number(
                        m[2]
                    ),
                    ano
                );

            return {
                data:
                    data ||
                    dataCorrente,
                explicitamenteInformada:
                    !!data
            };
        }

        return {
            data:
                dataCorrente,
            explicitamenteInformada:
                false
        };
    }

    function removerDuplicadosDocumento(
        lista
    ) {
        const saida =
            [];

        const chaves =
            new Set();

        lista.forEach(
            function (m) {
                /*
                 * Não remove duas operações iguais legítimas do mesmo dia.
                 * Usa linha de origem para distinguir lançamentos.
                 * A duplicidade entre arquivos é tratada separadamente.
                 */
                const chave =
                    [
                        m.documentoId,
                        m.linhaOrigem,
                        m.dataTexto,
                        m.natureza,
                        m.valor.toFixed(
                            2
                        ),
                        m.historicoNormalizado
                    ].join(
                        "|"
                    );

                if (
                    chaves.has(
                        chave
                    )
                ) {
                    return;
                }

                chaves.add(
                    chave
                );

                saida.push(
                    m
                );
            }
        );

        return saida;
    }

    function detectarDuplicidades() {
        for (
            let i = 0;
            i <
            movimentacoes.length;
            i++
        ) {
            const a =
                movimentacoes[i];

            for (
                let j =
                    i + 1;
                j <
                movimentacoes.length;
                j++
            ) {
                const b =
                    movimentacoes[j];

                if (
                    a.documentoId ===
                    b.documentoId
                ) {
                    continue;
                }

                if (
                    a.natureza !==
                    b.natureza
                ) {
                    continue;
                }

                if (
                    Math.abs(
                        a.valor -
                        b.valor
                    ) >
                    CONFIG
                        .toleranciaValor
                ) {
                    continue;
                }

                if (
                    Math.abs(
                        diferencaDias(
                            a.data,
                            b.data
                        )
                    ) >
                    1
                ) {
                    continue;
                }

                if (
                    similaridadeHistorico(
                        a.historicoNormalizado,
                        b.historicoNormalizado
                    ) >=
                    0.82
                ) {
                    b.duplicado =
                        true;

                    b.considerar =
                        false;

                    b.duvida =
                        false;

                    b.classificacao =
                        "DUPLICADO";

                    b.motivo =
                        "Possível lançamento duplicado entre arquivos";
                }
            }
        }
    }

    function detectarTransferenciasProprias() {
        const creditos =
            movimentacoes.filter(
                m =>
                    m.natureza ===
                    "C" &&
                    !m.duplicado
            );

        const debitos =
            movimentacoes.filter(
                m =>
                    m.natureza ===
                    "D" &&
                    !m.duplicado
            );

        creditos.forEach(
            function (
                credito
            ) {
                if (
                    !/\b(PIX|TRANSFERENCIA|TRANSF|TED)\b/.test(
                        credito
                            .historicoNormalizado
                    )
                ) {
                    return;
                }

                for (
                    const debito of
                    debitos
                ) {
                    if (
                        credito.documentoId ===
                        debito.documentoId
                    ) {
                        continue;
                    }

                    if (
                        credito.banco ===
                        debito.banco
                    ) {
                        continue;
                    }

                    if (
                        Math.abs(
                            credito.valor -
                            debito.valor
                        ) >
                        CONFIG
                            .toleranciaValor
                    ) {
                        continue;
                    }

                    if (
                        Math.abs(
                            diferencaDias(
                                credito.data,
                                debito.data
                            )
                        ) >
                        CONFIG
                            .toleranciaDiasTransferencia
                    ) {
                        continue;
                    }

                    credito
                        .transferenciaPropria =
                        true;

                    credito
                        .referenciaTransferencia =
                        debito.id;

                    credito
                        .considerar =
                        false;

                    credito
                        .duvida =
                        true;

                    credito
                        .classificacao =
                        "POSSÍVEL TRANSFERÊNCIA PRÓPRIA";

                    credito
                        .motivo =
                        "Existe débito de mesmo valor em outra instituição próxima à mesma data";

                    break;
                }
            }
        );
    }

    function montarResultado() {
        const competenciasDocumentadas =
            Array.from(
                new Set(
                    documentos.flatMap(
                        doc =>
                            doc.competencias ||
                            []
                    )
                )
            ).sort();

        const bancos =
            Array.from(
                new Set(
                    documentos
                        .map(
                            doc =>
                                doc.banco
                        )
                        .filter(
                            banco =>
                                banco &&
                                banco !==
                                "Não identificado"
                        )
                )
            ).sort();

        return {
            competenciasDocumentadas,
            bancos,
            alertas:
                gerarAlertas()
        };
    }

    function gerarAlertas() {
        const alertas =
            [];

        documentos.forEach(
            function (doc) {
                if (
                    doc.erro
                ) {
                    alertas.push(
                        doc.arquivo +
                        ": " +
                        doc.erro
                    );
                }

                if (
                    !doc.erro &&
                    !doc
                        .movimentacoes
                        .length
                ) {
                    alertas.push(
                        doc.arquivo +
                        ": nenhuma movimentação reconhecida."
                    );
                }

                if (
                    doc.banco ===
                    "Não identificado"
                ) {
                    alertas.push(
                        doc.arquivo +
                        ": instituição não identificada."
                    );
                }
            }
        );

        const duvidas =
            movimentacoes.filter(
                m =>
                    m.duvida
            ).length;

        const duplicados =
            movimentacoes.filter(
                m =>
                    m.duplicado
            ).length;

        const proprias =
            movimentacoes.filter(
                m =>
                    m.transferenciaPropria
            ).length;

        if (duvidas) {
            alertas.push(
                duvidas +
                " lançamento(s) precisam de conferência."
            );
        }

        if (duplicados) {
            alertas.push(
                duplicados +
                " possível(is) duplicidade(s) identificada(s)."
            );
        }

        if (proprias) {
            alertas.push(
                proprias +
                " possível(is) transferência(s) entre contas próprias."
            );
        }

        return alertas;
    }

    function renderizarResultado() {
        const card =
            document.getElementById(
                "cardResultadoLeituraExtratos"
            );

        if (card) {
            card.hidden =
                false;
        }

        definirTexto(
            "ocrNomeTitular",
            maisFrequente(
                documentos
                    .map(
                        d =>
                            d.titular
                    )
                    .filter(
                        Boolean
                    )
            ) ||
            "Não identificado"
        );

        definirTexto(
            "ocrDocumentoTitular",
            formatarDocumento(
                maisFrequente(
                    documentos
                        .map(
                            d =>
                                d
                                    .documentoTitular
                        )
                        .filter(
                            Boolean
                        )
                )
            ) ||
            "Não identificado"
        );

        definirTexto(
            "ocrInstituicoes",
            resultado
                .bancos
                .length
                ? resultado
                    .bancos
                    .join(
                        ", "
                    )
                : "Não identificadas"
        );

        definirTexto(
            "ocrQuantidadeArquivos",
            String(
                documentos.length
            )
        );

        const datas =
            movimentacoes
                .map(
                    m =>
                        m.data
                )
                .filter(
                    d =>
                        d instanceof
                        Date &&
                        !Number.isNaN(
                            d.getTime()
                        )
                )
                .sort(
                    (
                        a,
                        b
                    ) =>
                        a -
                        b
                );

        definirTexto(
            "ocrPeriodoLeitura",
            datas.length
                ? formatarData(
                    datas[0]
                ) +
                " a " +
                formatarData(
                    datas[
                    datas.length -
                    1
                    ]
                )
                : "Não identificado"
        );

        renderizarDocumentos();
        renderizarAlertas();
        renderizarTabelaRevisao();
        renderizarResumos();
        atualizarResumoTexto();
    }

    function renderizarDocumentos() {
        const lista =
            document.getElementById(
                "listaDocumentosOCR"
            );

        if (!lista) {
            return;
        }

        lista.innerHTML =
            "";

        documentos.forEach(
            function (doc) {
                const item =
                    document.createElement(
                        "div"
                    );

                item.className =
                    "documento-ocr-item";

                item.innerHTML =
                    "<strong>" +
                    escapar(
                        doc.arquivo
                    ) +
                    "</strong>" +
                    "<span>" +
                    escapar(
                        doc.banco
                    ) +
                    " · " +
                    escapar(
                        doc.metodoLeitura
                    ) +
                    "</span>" +
                    "<small>" +
                    (
                        doc.competencias
                            .length
                            ? escapar(
                                doc.competencias
                                    .map(
                                        formatarCompetencia
                                    )
                                    .join(
                                        ", "
                                    )
                            )
                            : "Competência não identificada"
                    ) +
                    "</small>";

                lista.appendChild(
                    item
                );
            }
        );
    }

    function renderizarAlertas() {
        const lista =
            document.getElementById(
                "listaAlertasOCR"
            );

        if (!lista) {
            return;
        }

        lista.innerHTML =
            "";

        const alertas =
            resultado &&
                resultado.alertas
                ? resultado.alertas
                : [];

        if (
            !alertas.length
        ) {
            lista.innerHTML =
                '<div class="aviso-info">Nenhum alerta adicional.</div>';

            return;
        }

        alertas.forEach(
            function (texto) {
                const item =
                    document.createElement(
                        "div"
                    );

                item.className =
                    "aviso-info";

                item.textContent =
                    texto;

                lista.appendChild(
                    item
                );
            }
        );
    }

    function renderizarTabelaRevisao() {
        const tbody =
            obterTbody(
                "tabelaMovimentacoesOCR"
            );

        if (!tbody) {
            return;
        }

        tbody.innerHTML =
            "";

        if (
            !movimentacoes.length
        ) {
            inserirVazio(
                tbody,
                8,
                "Nenhuma movimentação identificada."
            );

            return;
        }

        movimentacoes
            .slice()
            .sort(
                (
                    a,
                    b
                ) =>
                    a.data -
                    b.data
            )
            .forEach(
                function (m) {
                    const tr =
                        document.createElement(
                            "tr"
                        );

                    if (
                        m.duvida
                    ) {
                        tr.classList.add(
                            "movimentacao-duvida"
                        );
                    }

                    if (
                        m.duplicado ||
                        m.transferenciaPropria
                    ) {
                        tr.classList.add(
                            "movimentacao-alerta"
                        );
                    }

                    const tdCheck =
                        document.createElement(
                            "td"
                        );

                    const checkbox =
                        document.createElement(
                            "input"
                        );

                    checkbox.type =
                        "checkbox";

                    checkbox.checked =
                        !!m.considerar;

                    checkbox.disabled =
                        m.natureza !==
                        "C";

                    checkbox.addEventListener(
                        "change",
                        function () {
                            m.considerar =
                                checkbox.checked;

                            m.manual =
                                true;

                            if (
                                checkbox.checked
                            ) {
                                m.duvida =
                                    false;

                                m.motivo =
                                    "Incluído manualmente na conferência";
                            } else {
                                m.motivo =
                                    "Excluído manualmente na conferência";
                            }

                            renderizarResumos();
                            atualizarResumoTexto();
                        }
                    );

                    tdCheck.appendChild(
                        checkbox
                    );

                    tr.appendChild(
                        tdCheck
                    );

                    [
                        m.dataTexto,
                        m.banco,
                        m.historico,
                        formatarMoeda(
                            m.valor
                        ),
                        m.natureza ===
                            "C"
                            ? "Crédito"
                            : "Débito",
                        m.classificacao,
                        m.motivo
                    ].forEach(
                        function (valor) {
                            const td =
                                document.createElement(
                                    "td"
                                );

                            td.textContent =
                                valor ||
                                "-";

                            tr.appendChild(
                                td
                            );
                        }
                    );

                    tbody.appendChild(
                        tr
                    );
                }
            );
    }

    function alterarTodos(
        considerar
    ) {
        movimentacoes.forEach(
            function (m) {
                if (
                    m.natureza !==
                    "C"
                ) {
                    return;
                }

                m.considerar =
                    considerar;

                m.manual =
                    true;

                m.duvida =
                    false;

                m.motivo =
                    considerar
                        ? "Incluído manualmente na conferência"
                        : "Excluído manualmente na conferência";
            }
        );

        renderizarTabelaRevisao();
        renderizarResumos();
        atualizarResumoTexto();
    }

    function calcularResumo() {
        const consideradas =
            movimentacoes.filter(
                m =>
                    m.natureza ===
                    "C" &&
                    m.considerar
            );

        const competencias =
            resultado &&
                resultado
                    .competenciasDocumentadas &&
                resultado
                    .competenciasDocumentadas
                    .length
                ? resultado
                    .competenciasDocumentadas
                    .slice()
                : Array.from(
                    new Set(
                        consideradas
                            .map(
                                m =>
                                    m.competencia
                            )
                            .filter(
                                Boolean
                            )
                    )
                ).sort();

        const porMes =
            new Map();

        consideradas.forEach(
            function (m) {
                if (
                    !porMes.has(
                        m.competencia
                    )
                ) {
                    porMes.set(
                        m.competencia,
                        {
                            total:
                                0,
                            quantidade:
                                0,
                            bancos:
                                new Set()
                        }
                    );
                }

                const item =
                    porMes.get(
                        m.competencia
                    );

                item.total +=
                    m.valor;

                item.quantidade++;

                if (
                    m.banco
                ) {
                    item.bancos.add(
                        m.banco
                    );
                }
            }
        );

        const total =
            consideradas.reduce(
                (
                    soma,
                    m
                ) =>
                    soma +
                    m.valor,
                0
            );

        const meses =
            competencias.length ||
            porMes.size ||
            1;

        let maiorMes =
            "";

        let maiorValor =
            0;

        porMes.forEach(
            function (
                item,
                comp
            ) {
                if (
                    !maiorMes ||
                    item.total >
                    maiorValor
                ) {
                    maiorMes =
                        comp;

                    maiorValor =
                        item.total;
                }
            }
        );

        return {
            consideradas,
            competencias,
            porMes,
            total,
            meses,
            media:
                total /
                meses,
            maiorMes,
            maiorValor
        };
    }

    function renderizarResumos() {
        const resumo =
            calcularResumo();

        definirTexto(
            "ocrTotalCreditosValidos",
            formatarMoeda(
                resumo.total
            )
        );

        definirTexto(
            "ocrMediaMensal",
            formatarMoeda(
                resumo.media
            )
        );

        definirTexto(
            "ocrMesesConsiderados",
            String(
                resumo.meses
            )
        );

        definirTexto(
            "ocrMaiorMes",
            resumo.maiorMes
                ? formatarCompetencia(
                    resumo.maiorMes
                ) +
                " · " +
                formatarMoeda(
                    resumo.maiorValor
                )
                : "-"
        );

        renderizarResumoMensal(
            resumo
        );

        renderizarResumoBancos(
            resumo
        );
    }

    function renderizarResumoMensal(
        resumo
    ) {
        const tbody =
            obterTbody(
                "tabelaResumoMensalOCR"
            );

        if (!tbody) {
            return;
        }

        tbody.innerHTML =
            "";

        const competencias =
            resumo
                .competencias
                .length
                ? resumo.competencias
                : Array.from(
                    resumo
                        .porMes
                        .keys()
                ).sort();

        if (
            !competencias.length
        ) {
            inserirVazio(
                tbody,
                4,
                "Nenhum crédito considerado."
            );

            return;
        }

        competencias.forEach(
            function (comp) {
                const item =
                    resumo
                        .porMes
                        .get(
                            comp
                        ) ||
                    {
                        total:
                            0,
                        quantidade:
                            0,
                        bancos:
                            new Set()
                    };

                const tr =
                    document.createElement(
                        "tr"
                    );

                tr.innerHTML =
                    "<td>" +
                    escapar(
                        formatarCompetencia(
                            comp
                        )
                    ) +
                    "</td>" +
                    "<td>" +
                    item.quantidade +
                    "</td>" +
                    "<td>" +
                    escapar(
                        Array.from(
                            item.bancos
                        ).join(
                            ", "
                        ) ||
                        "-"
                    ) +
                    "</td>" +
                    "<td>" +
                    escapar(
                        formatarMoeda(
                            item.total
                        )
                    ) +
                    "</td>";

                tbody.appendChild(
                    tr
                );
            }
        );
    }

    function renderizarResumoBancos(
        resumo
    ) {
        const tbody =
            obterTbody(
                "tabelaResumoBancosOCR"
            );

        if (!tbody) {
            return;
        }

        tbody.innerHTML =
            "";

        const mapa =
            new Map();

        resumo
            .consideradas
            .forEach(
                function (m) {
                    const banco =
                        m.banco ||
                        "Não identificado";

                    if (
                        !mapa.has(
                            banco
                        )
                    ) {
                        mapa.set(
                            banco,
                            {
                                quantidade:
                                    0,
                                total:
                                    0,
                                competencias:
                                    new Set()
                            }
                        );
                    }

                    const item =
                        mapa.get(
                            banco
                        );

                    item.quantidade++;
                    item.total +=
                        m.valor;

                    if (
                        m.competencia
                    ) {
                        item
                            .competencias
                            .add(
                                m.competencia
                            );
                    }
                }
            );

        if (
            !mapa.size
        ) {
            inserirVazio(
                tbody,
                4,
                "Nenhum crédito considerado."
            );

            return;
        }

        Array.from(
            mapa.entries()
        )
            .sort(
                (
                    a,
                    b
                ) =>
                    a[0]
                        .localeCompare(
                            b[0],
                            "pt-BR"
                        )
            )
            .forEach(
                function (
                    [
                        banco,
                        item
                    ]
                ) {
                    const divisor =
                        item
                            .competencias
                            .size ||
                        resumo.meses ||
                        1;

                    const tr =
                        document.createElement(
                            "tr"
                        );

                    tr.innerHTML =
                        "<td>" +
                        escapar(
                            banco
                        ) +
                        "</td>" +
                        "<td>" +
                        item.quantidade +
                        "</td>" +
                        "<td>" +
                        escapar(
                            formatarMoeda(
                                item.total
                            )
                        ) +
                        "</td>" +
                        "<td>" +
                        escapar(
                            formatarMoeda(
                                item.total /
                                divisor
                            )
                        ) +
                        "</td>";

                    tbody.appendChild(
                        tr
                    );
                }
            );
    }

    function gerarTextoConsolidado() {
        return movimentacoes
            .slice()
            .sort(
                (
                    a,
                    b
                ) =>
                    a.data -
                    b.data
            )
            .map(
                function (m) {
                    const decisao =
                        m.considerar
                            ? "INCLUIR"
                            : (
                                m.duvida
                                    ? "DUVIDA"
                                    : "EXCLUIR"
                            );

                    return (
                        m.dataTexto +
                        " | " +
                        "[ID:" +
                        sanitizarTag(
                            m.id
                        ) +
                        "] " +
                        "[BANCO:" +
                        sanitizarTag(
                            m.banco
                        ) +
                        "] " +
                        "[ARQUIVO:" +
                        sanitizarTag(
                            m.arquivo
                        ) +
                        "] " +
                        "[DECISAO:" +
                        decisao +
                        "] " +
                        m.historico +
                        " | " +
                        formatarValor(
                            m.valor
                        ) +
                        " " +
                        m.natureza
                    );
                }
            )
            .join(
                "\n"
            );
    }

    function aplicarAoMotor() {
        if (
            !movimentacoes.length
        ) {
            definirStatus(
                "Nenhuma leitura disponível para aplicar.",
                "erro"
            );

            return;
        }

        const texto =
            gerarTextoConsolidado();

        const textarea =
            document.getElementById(
                "textoExtratoMovimentacao"
            );

        if (textarea) {
            textarea.value =
                texto;
        }

        if (
            !window
                .MediaMovimentacao ||
            typeof window
                .MediaMovimentacao
                .processarTexto !==
            "function"
        ) {
            definirStatus(
                "Motor media-movimentacao.js não encontrado.",
                "erro"
            );

            return;
        }

        window
            .MediaMovimentacao
            .processarTexto(
                texto,
                {
                    competenciasDocumentadas:
                        resultado
                            ? resultado
                                .competenciasDocumentadas
                            : []
                }
            );

        definirStatus(
            "Leitura aplicada ao cálculo.",
            "sucesso"
        );
    }

    function gerarResumoTexto() {
        const resumo =
            calcularResumo();

        const linhas = [
            "RESUMO DA LEITURA DOS EXTRATOS",
            "",
            "Arquivos processados: " +
            documentos.length,
            "Competências consideradas: " +
            (
                resumo
                    .competencias
                    .length
                    ? resumo
                        .competencias
                        .map(
                            formatarCompetencia
                        )
                        .join(
                            ", "
                        )
                    : "-"
            ),
            ""
        ];

        resumo
            .competencias
            .forEach(
                function (comp) {
                    const item =
                        resumo
                            .porMes
                            .get(
                                comp
                            ) ||
                        {
                            total:
                                0,
                            quantidade:
                                0
                        };

                    linhas.push(
                        formatarCompetencia(
                            comp
                        ) +
                        ": " +
                        formatarMoeda(
                            item.total
                        ) +
                        " (" +
                        item.quantidade +
                        " crédito(s))"
                    );
                }
            );

        linhas.push(
            "",
            "Total considerado: " +
            formatarMoeda(
                resumo.total
            ),
            "Meses considerados: " +
            resumo.meses,
            "Média mensal: " +
            formatarMoeda(
                resumo.media
            )
        );

        return linhas.join(
            "\n"
        );
    }

    function atualizarResumoTexto() {
        const campo =
            document.getElementById(
                "resumoLeituraOCR"
            );

        if (campo) {
            campo.value =
                gerarResumoTexto();
        }
    }

    async function copiarResumo() {
        const texto =
            gerarResumoTexto();

        try {
            await navigator
                .clipboard
                .writeText(
                    texto
                );

            definirStatus(
                "Resumo copiado.",
                "sucesso"
            );
        } catch (e) {
            const campo =
                document.getElementById(
                    "resumoLeituraOCR"
                );

            if (campo) {
                campo.value =
                    texto;

                campo.select();

                document.execCommand(
                    "copy"
                );
            }
        }
    }

    function limparTudo() {
        arquivos =
            [];

        documentos =
            [];

        movimentacoes =
            [];

        resultado =
            null;

        contadorMovimentacoes =
            0;

        const input =
            document.getElementById(
                "arquivosExtrato"
            );

        if (input) {
            input.value =
                "";
        }

        const card =
            document.getElementById(
                "cardResultadoLeituraExtratos"
            );

        if (card) {
            card.hidden =
                true;
        }

        renderizarArquivos();
        atualizarBotoes();

        definirStatus(
            "Seleção limpa.",
            "info"
        );
    }

    function bloquearProcessamento(
        bloquear
    ) {
        const btn =
            document.getElementById(
                "btnLerExtratos"
            );

        if (!btn) {
            return;
        }

        btn.disabled =
            bloquear;

        btn.textContent =
            bloquear
                ? "Lendo..."
                : "Ler e Consolidar";
    }

    function identificarBanco(
        texto,
        arquivo
    ) {
        const n =
            normalizar(
                arquivo +
                " " +
                texto
            );

        const bancos = [
            [
                "Sicoob",
                [
                    "SICOOB",
                    "BANCO COOPERATIVO SICOOB"
                ]
            ],
            [
                "Nubank",
                [
                    "NUBANK",
                    "NU PAGAMENTOS"
                ]
            ],
            [
                "Mercado Pago",
                [
                    "MERCADO PAGO",
                    "MERCADOPAGO"
                ]
            ],
            [
                "Itaú",
                [
                    "ITAU",
                    "ITAU UNIBANCO"
                ]
            ],
            [
                "Banco do Brasil",
                [
                    "BANCO DO BRASIL"
                ]
            ],
            [
                "Bradesco",
                [
                    "BRADESCO"
                ]
            ],
            [
                "Santander",
                [
                    "SANTANDER"
                ]
            ],
            [
                "Banco Inter",
                [
                    "BANCO INTER"
                ]
            ],
            [
                "Sicredi",
                [
                    "SICREDI"
                ]
            ],
            [
                "Caixa",
                [
                    "CAIXA ECONOMICA FEDERAL"
                ]
            ]
        ];

        for (
            const [
                nome,
                padroes
            ] of bancos
        ) {
            if (
                padroes.some(
                    p =>
                        n.includes(
                            p
                        )
                )
            ) {
                return nome;
            }
        }

        return "Não identificado";
    }

    function identificarTitular(
        texto
    ) {
        const linhas =
            String(
                texto ||
                ""
            )
                .split(
                    "\n"
                )
                .map(
                    l =>
                        l.trim()
                )
                .filter(
                    Boolean
                );

        let nome =
            "";

        let documento =
            "";

        const regexDoc =
            /\b(?:CPF|CNPJ)?\s*:?\s*((?:\d{3}\.?\d{3}\.?\d{3}-?\d{2})|(?:\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}))\b/i;

        for (
            let i = 0;
            i <
            Math.min(
                linhas.length,
                120
            );
            i++
        ) {
            const linha =
                linhas[i];

            if (
                !documento
            ) {
                const m =
                    linha.match(
                        regexDoc
                    );

                if (m) {
                    documento =
                        m[1]
                            .replace(
                                /\D/g,
                                ""
                            );
                }
            }

            if (!nome) {
                const m =
                    linha.match(
                        /(?:TITULAR|CLIENTE|NOME)\s*:?\s+(.{3,100})$/i
                    );

                if (m) {
                    nome =
                        m[1]
                            .replace(
                                regexDoc,
                                ""
                            )
                            .trim();
                }
            }
        }

        return {
            nome,
            documento
        };
    }

    function identificarPeriodo(
        texto
    ) {
        const regex =
            /\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\b/g;

        const datas =
            [];

        let m;

        while (
            (
                m =
                regex.exec(
                    String(
                        texto ||
                        ""
                    )
                )
            ) !==
            null
        ) {
            const d =
                criarData(
                    Number(
                        m[1]
                    ),
                    Number(
                        m[2]
                    ),
                    normalizarAno(
                        Number(
                            m[3]
                        ),
                        m[3]
                            .length
                    )
                );

            if (d) {
                datas.push(
                    d
                );
            }
        }

        if (
            !datas.length
        ) {
            return null;
        }

        datas.sort(
            (
                a,
                b
            ) =>
                a -
                b
        );

        return {
            inicio:
                datas[0],
            fim:
                datas[
                datas.length -
                1
                ]
        };
    }

    function diferencaDias(
        a,
        b
    ) {
        return Math.round(
            (
                a.getTime() -
                b.getTime()
            ) /
            86400000
        );
    }

    function similaridadeHistorico(
        a,
        b
    ) {
        const sa =
            new Set(
                normalizar(
                    a
                )
                    .split(
                        " "
                    )
                    .filter(
                        x =>
                            x.length >
                            2
                    )
            );

        const sb =
            new Set(
                normalizar(
                    b
                )
                    .split(
                        " "
                    )
                    .filter(
                        x =>
                            x.length >
                            2
                    )
            );

        if (
            !sa.size &&
            !sb.size
        ) {
            return 1;
        }

        let inter =
            0;

        sa.forEach(
            function (x) {
                if (
                    sb.has(
                        x
                    )
                ) {
                    inter++;
                }
            }
        );

        const uniao =
            new Set([
                ...sa,
                ...sb
            ]).size;

        return uniao
            ? inter /
            uniao
            : 0;
    }

    function criarData(
        dia,
        mes,
        ano
    ) {
        if (
            dia < 1 ||
            dia > 31 ||
            mes < 1 ||
            mes > 12 ||
            ano < 1900 ||
            ano > 2200
        ) {
            return null;
        }

        const d =
            new Date(
                ano,
                mes -
                1,
                dia,
                12
            );

        if (
            d.getDate() !==
            dia ||
            d.getMonth() !==
            mes -
            1 ||
            d.getFullYear() !==
            ano
        ) {
            return null;
        }

        return d;
    }

    function normalizarAno(
        ano,
        tamanho
    ) {
        if (
            tamanho ===
            2
        ) {
            return ano >=
                70
                ? 1900 +
                ano
                : 2000 +
                ano;
        }

        return ano;
    }

    function competencia(
        d
    ) {
        return (
            d.getFullYear() +
            "-" +
            String(
                d.getMonth() +
                1
            ).padStart(
                2,
                "0"
            )
        );
    }

    function formatarData(
        d
    ) {
        return (
            String(
                d.getDate()
            ).padStart(
                2,
                "0"
            ) +
            "/" +
            String(
                d.getMonth() +
                1
            ).padStart(
                2,
                "0"
            ) +
            "/" +
            d.getFullYear()
        );
    }

    function formatarCompetencia(
        c
    ) {
        const p =
            String(
                c ||
                ""
            ).split(
                "-"
            );

        return p.length ===
            2
            ? p[1] +
            "/" +
            p[0]
            : c;
    }

    function converterValorFlexivel(
        valor
    ) {
        let s =
            String(
                valor ||
                ""
            )
                .replace(
                    /R\$/gi,
                    ""
                )
                .replace(
                    /\s+/g,
                    ""
                );

        const negativo =
            s.startsWith(
                "-"
            );

        s =
            s.replace(
                /^[+-]/,
                ""
            );

        if (
            s.includes(
                ","
            )
        ) {
            s =
                s
                    .replace(
                        /\./g,
                        ""
                    )
                    .replace(
                        ",",
                        "."
                    );
        }

        s =
            s.replace(
                /[^\d.]/g,
                ""
            );

        const n =
            Number(
                s
            );

        if (
            !Number.isFinite(
                n
            )
        ) {
            return NaN;
        }

        return negativo
            ? -n
            : n;
    }

    function normalizar(
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
                /[.,:;()[\]{}]+/g,
                " "
            )
            .replace(
                /[-–—]+/g,
                " "
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim();
    }

    function limparHistorico(
        texto
    ) {
        return String(
            texto ||
            ""
        )
            .replace(
                /^[|;,\s]+|[|;,\s]+$/g,
                ""
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim();
    }

    function maisFrequente(
        lista
    ) {
        const mapa =
            new Map();

        let melhor =
            "";

        let quantidade =
            0;

        lista.forEach(
            function (v) {
                const valor =
                    String(
                        v ||
                        ""
                    ).trim();

                if (
                    !valor
                ) {
                    return;
                }

                const atual =
                    (
                        mapa.get(
                            valor
                        ) ||
                        0
                    ) +
                    1;

                mapa.set(
                    valor,
                    atual
                );

                if (
                    atual >
                    quantidade
                ) {
                    melhor =
                        valor;

                    quantidade =
                        atual;
                }
            }
        );

        return melhor;
    }

    function formatarDocumento(
        doc
    ) {
        const s =
            String(
                doc ||
                ""
            ).replace(
                /\D/g,
                ""
            );

        if (
            s.length ===
            11
        ) {
            return s.replace(
                /(\d{3})(\d{3})(\d{3})(\d{2})/,
                "$1.$2.$3-$4"
            );
        }

        if (
            s.length ===
            14
        ) {
            return s.replace(
                /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
                "$1.$2.$3/$4-$5"
            );
        }

        return doc ||
            "";
    }

    function formatarMoeda(
        v
    ) {
        return Number(
            v ||
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

    function formatarValor(
        v
    ) {
        return Number(
            v ||
            0
        ).toLocaleString(
            "pt-BR",
            {
                minimumFractionDigits:
                    2,
                maximumFractionDigits:
                    2,
                useGrouping:
                    true
            }
        );
    }

    function formatarTamanho(
        bytes
    ) {
        const n =
            Number(
                bytes ||
                0
            );

        if (
            n <
            1024
        ) {
            return (
                n +
                " B"
            );
        }

        if (
            n <
            1024 *
            1024
        ) {
            return (
                n /
                1024
            ).toFixed(
                1
            ) +
                " KB";
        }

        return (
            n /
            (
                1024 *
                1024
            )
        ).toFixed(
            1
        ) +
            " MB";
    }

    function obterExtensao(
        nome
    ) {
        const p =
            String(
                nome ||
                ""
            )
                .toLowerCase()
                .split(
                    "."
                );

        return p.length >
            1
            ? p.pop()
            : "";
    }

    function sanitizarTag(
        v
    ) {
        return String(
            v ||
            ""
        )
            .replace(
                /[\[\]\r\n]/g,
                " "
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim();
    }

    function definirStatus(
        texto,
        tipo
    ) {
        const el =
            document.getElementById(
                "statusLeituraExtrato"
            );

        if (
            !el
        ) {
            return;
        }

        el.textContent =
            texto;

        el.className =
            "status-leitura-ocr status-" +
            (
                tipo ||
                "info"
            );
    }

    function definirTexto(
        id,
        texto
    ) {
        const el =
            document.getElementById(
                id
            );

        if (el) {
            el.textContent =
                texto;
        }
    }

    function obterTbody(
        id
    ) {
        const tabela =
            document.getElementById(
                id
            );

        if (!tabela) {
            return null;
        }

        return tabela.querySelector(
            "tbody"
        );
    }

    function inserirVazio(
        tbody,
        colunas,
        texto
    ) {
        const tr =
            document.createElement(
                "tr"
            );

        tr.innerHTML =
            '<td colspan="' +
            colunas +
            '" class="sem-dados">' +
            escapar(
                texto
            ) +
            "</td>";

        tbody.appendChild(
            tr
        );
    }

    function escapar(
        texto
    ) {
        return String(
            texto ||
            ""
        )
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );
    }

    window.MediaMovimentacaoOCR = {
        processar:
            processarExtratos,

        limpar:
            limparTudo,

        aplicar:
            aplicarAoMotor,

        obterResultado:
            function () {
                return resultado;
            },

        obterMovimentacoes:
            function () {
                return movimentacoes.slice();
            },

        obterResumo:
            calcularResumo,

        gerarTextoConsolidado:
            gerarTextoConsolidado,

        gerarResumo:
            gerarResumoTexto
    };
})();