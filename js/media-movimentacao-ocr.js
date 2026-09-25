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
        pdfWorker: "./js/pdfjs/pdf.worker.mjs",
        ocrIdioma: "por",
        ocrEscala: 2.25,
        ocrMinCaracteresPagina: 80,
        ocrWorkerPath: "./js/tesseract/worker.min.js",
        ocrCorePath: "./js/tesseract/tesseract-core-lstm.wasm.js",
        ocrLangPath: "./js/tesseract/lang-data",
        toleranciaDiasTransferencia: 2,
        toleranciaValor: 0.01
    };

    let arquivos = [];
    let documentos = [];
    let movimentacoes = [];
    let resultado = null;
    let pdfjs = null;
    let workerOCR = null;
    let contadorMovimentacoes = 0;

    document.addEventListener("DOMContentLoaded", iniciar);

    function iniciar() {
        const input = document.getElementById("arquivosExtrato");
        const area = document.getElementById("areaUploadExtrato");
        const btnLer = document.getElementById("btnLerExtratos");
        const btnLimpar = document.getElementById("btnLimparArquivosExtrato");
        const btnSelecionar = document.getElementById("btnSelecionarTodosOCR");
        const btnDesmarcar = document.getElementById("btnDesmarcarTodosOCR");
        const btnAplicar = document.getElementById("btnAplicarLeituraOCR");
        const btnCopiar = document.getElementById("btnCopiarResumoOCR");

        if (input) {
            input.addEventListener("change", function () {
                adicionarArquivos(
                    Array.from(input.files || [])
                );

                input.value = "";
            });
        }

        if (area) {
            area.addEventListener("dragover", function (e) {
                e.preventDefault();
                area.classList.add("arrastando");
            });

            area.addEventListener("dragleave", function () {
                area.classList.remove("arrastando");
            });

            area.addEventListener("drop", function (e) {
                e.preventDefault();
                area.classList.remove("arrastando");

                adicionarArquivos(
                    Array.from(
                        e.dataTransfer &&
                            e.dataTransfer.files
                            ? e.dataTransfer.files
                            : []
                    )
                );
            });
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
            document.getElementById("btnLerExtratos");

        const btnLimpar =
            document.getElementById("btnLimparArquivosExtrato");

        if (btnLer) {
            btnLer.disabled = arquivos.length === 0;
        }

        if (btnLimpar) {
            btnLimpar.disabled = arquivos.length === 0;
        }
    }

    function adicionarArquivos(novos) {
        if (!novos || !novos.length) {
            atualizarBotoes();
            return;
        }

        const erros = [];

        novos.forEach(function (file) {
            if (arquivos.length >= CONFIG.maxArquivos) {
                erros.push(
                    "Limite de " +
                    CONFIG.maxArquivos +
                    " arquivos atingido."
                );

                return;
            }

            const ext = obterExtensao(file.name);

            if (!CONFIG.extensoes.includes(ext)) {
                erros.push(
                    file.name +
                    ": formato não suportado."
                );

                return;
            }

            if (file.size > CONFIG.maxTamanho) {
                erros.push(
                    file.name +
                    ": arquivo maior que " +
                    formatarTamanho(CONFIG.maxTamanho) +
                    "."
                );

                return;
            }

            const duplicado = arquivos.some(function (a) {
                return (
                    a.name === file.name &&
                    a.size === file.size &&
                    a.lastModified === file.lastModified
                );
            });

            if (!duplicado) {
                arquivos.push(file);
            }
        });

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
        arquivos.splice(indice, 1);

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
            document.getElementById("listaArquivosExtrato");

        const quantidade =
            document.getElementById("quantidadeArquivosExtrato");

        if (quantidade) {
            quantidade.textContent =
                String(arquivos.length);
        }

        if (!lista) return;

        lista.innerHTML = "";

        if (!arquivos.length) {
            lista.innerHTML =
                '<div class="sem-dados">Nenhum arquivo selecionado.</div>';

            return;
        }

        arquivos.forEach(function (file, indice) {
            const item =
                document.createElement("div");

            item.className = "arquivo-extrato";

            item.innerHTML =
                '<div class="arquivo-extrato-info">' +
                "<strong>" +
                escapar(file.name) +
                "</strong>" +
                "<small>" +
                escapar(
                    obterExtensao(file.name).toUpperCase()
                ) +
                " · " +
                escapar(formatarTamanho(file.size)) +
                "</small>" +
                "</div>" +
                '<button type="button" class="btn-remover-arquivo" aria-label="Remover arquivo">×</button>';

            const btn =
                item.querySelector("button");

            if (btn) {
                btn.addEventListener(
                    "click",
                    function (e) {
                        e.preventDefault();
                        e.stopPropagation();
                        removerArquivo(indice);
                    }
                );
            }

            lista.appendChild(item);
        });
    }

    async function processarExtratos() {
        if (!arquivos.length) {
            definirStatus(
                "Selecione pelo menos um extrato.",
                "erro"
            );

            return;
        }

        bloquearProcessamento(true);

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
                const file = arquivos[i];

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

                    documentos.push(documento);

                    documento.movimentacoes.forEach(
                        function (m) {
                            movimentacoes.push(m);
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
                            String(i + 1).padStart(3, "0"),
                        arquivo: file.name,
                        tipo:
                            obterExtensao(file.name)
                                .toUpperCase(),
                        metodoLeitura: "ERRO",
                        banco: "Não identificado",
                        titular: "",
                        documentoTitular: "",
                        texto: "",
                        periodo: null,
                        competencias: [],
                        movimentacoes: [],
                        erro:
                            erroArquivo &&
                                erroArquivo.message
                                ? erroArquivo.message
                                : String(erroArquivo)
                    });
                }
            }

            detectarDuplicidades();
            detectarTransferenciasProprias();

            resultado = montarResultado();

            renderizarResultado();

            if (!movimentacoes.length) {
                definirStatus(
                    "Os arquivos foram lidos, mas nenhuma movimentação financeira foi identificada.",
                    "erro"
                );

                return;
            }

            definirStatus(
                movimentacoes.length +
                " movimentação(ões) identificada(s) em " +
                documentos.length +
                " documento(s). Confira antes de aplicar.",
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
                    erro && erro.message
                        ? erro.message
                        : String(erro)
                ),
                "erro"
            );
        } finally {
            bloquearProcessamento(false);
        }
    }

    async function processarArquivo(file, indice) {
        const ext = obterExtensao(file.name);

        let texto = "";
        let metodoLeitura = "TEXTO";

        if (ext === "pdf") {
            const leitura =
                await extrairPDF(file);

            texto = leitura.texto;
            metodoLeitura = leitura.metodo;
        } else if (
            ["png", "jpg", "jpeg", "webp"].includes(ext)
        ) {
            texto =
                await extrairImagemOCR(file);

            metodoLeitura = "OCR";
        } else {
            texto = await file.text();
        }

        texto =
            normalizarTextoExtraido(texto);

        if (!texto.trim()) {
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
            identificarTitular(texto);

        const periodo =
            identificarPeriodo(texto);

        const doc = {
            id:
                "DOC" +
                String(indice + 1).padStart(3, "0"),
            arquivo: file.name,
            tipo: ext.toUpperCase(),
            metodoLeitura,
            banco,
            titular: titular.nome,
            documentoTitular:
                titular.documento,
            texto,
            periodo,
            competencias: [],
            movimentacoes: [],
            erro: ""
        };

        doc.movimentacoes =
            interpretarMovimentacoesDocumento(
                doc
            );

        doc.competencias =
            Array.from(
                new Set(
                    doc.movimentacoes
                        .map(m => m.competencia)
                        .filter(Boolean)
                )
            ).sort();

        if (
            !doc.competencias.length &&
            periodo
        ) {
            const comps =
                competenciasEntre(
                    periodo.inicio,
                    periodo.fim
                );

            if (comps.length === 1) {
                doc.competencias = comps;
            }
        }

        return doc;
    }

    async function carregarPDFJS() {
        if (pdfjs) return pdfjs;

        let ultimoErro = null;

        for (const caminho of CONFIG.pdfjs) {
            try {
                pdfjs =
                    await import(caminho);

                if (
                    pdfjs &&
                    pdfjs.GlobalWorkerOptions
                ) {
                    pdfjs.GlobalWorkerOptions.workerSrc =
                        CONFIG.pdfWorker;
                }

                console.log(
                    "[Média Movimentação] PDF.js carregado:",
                    caminho
                );

                return pdfjs;
            } catch (e) {
                ultimoErro = e;
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

    async function extrairPDF(file) {
        const lib =
            await carregarPDFJS();

        const buffer =
            await file.arrayBuffer();

        const loadingTask =
            lib.getDocument({
                data: new Uint8Array(buffer)
            });

        const pdf =
            await loadingTask.promise;

        const paginas = [];

        let usouOCR = false;
        let usouTexto = false;

        for (
            let numero = 1;
            numero <= pdf.numPages;
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
                await pdf.getPage(numero);

            const conteudo =
                await pagina.getTextContent();

            let textoPagina =
                reconstruirPagina(
                    conteudo.items || []
                );

            if (textoPDFUtil(textoPagina)) {
                usouTexto = true;
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

                usouOCR = true;
            }

            paginas.push(
                textoPagina || ""
            );
        }

        const final =
            paginas.join("\n").trim();

        if (!final) {
            throw new Error(
                "Não foi possível extrair ou reconhecer texto do PDF."
            );
        }

        return {
            texto: final,
            metodo:
                usouOCR && usouTexto
                    ? "PDF.js + OCR"
                    : usouOCR
                        ? "OCR"
                        : "PDF.js"
        };
    }

    function textoPDFUtil(texto) {
        const t =
            String(texto || "")
                .replace(/\s+/g, " ")
                .trim();

        if (
            t.length <
            CONFIG.ocrMinCaracteresPagina
        ) {
            return false;
        }

        const validos =
            (
                t.match(
                    /[A-Za-zÀ-ÿ0-9]/g
                ) || []
            ).length;

        return (
            validos /
            Math.max(1, t.length)
        ) >= 0.35;
    }

    function reconstruirPagina(items) {
        const elementos =
            (items || [])
                .filter(function (item) {
                    return (
                        item &&
                        String(item.str || "").trim()
                    );
                })
                .map(function (item) {
                    return {
                        texto:
                            String(item.str || "")
                                .replace(/\s+/g, " ")
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
                                : 0,
                        width:
                            Number(item.width || 0)
                    };
                });

        elementos.sort(function (a, b) {
            const dy =
                b.y - a.y;

            if (Math.abs(dy) > 2.5) {
                return dy;
            }

            return a.x - b.x;
        });

        const linhas = [];

        let atual = [];
        let yAtual = null;

        elementos.forEach(function (el) {
            if (
                yAtual === null ||
                Math.abs(
                    el.y - yAtual
                ) <= 2.5
            ) {
                atual.push(el);

                if (yAtual === null) {
                    yAtual = el.y;
                }
            } else {
                linhas.push(
                    montarLinhaPDF(atual)
                );

                atual = [el];
                yAtual = el.y;
            }
        });

        if (atual.length) {
            linhas.push(
                montarLinhaPDF(atual)
            );
        }

        return linhas
            .filter(Boolean)
            .join("\n");
    }

    function montarLinhaPDF(itens) {
        return itens
            .slice()
            .sort(
                (a, b) => a.x - b.x
            )
            .map(
                item => item.texto
            )
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
    }

    async function reconhecerPaginaPDFOCR(
        pagina,
        nomeArquivo,
        numero,
        total
    ) {
        const viewport =
            pagina.getViewport({
                scale: CONFIG.ocrEscala
            });

        const canvas =
            document.createElement("canvas");

        const ctx =
            canvas.getContext(
                "2d",
                {
                    willReadFrequently: true
                }
            );

        canvas.width =
            Math.ceil(viewport.width);

        canvas.height =
            Math.ceil(viewport.height);

        await pagina.render({
            canvasContext: ctx,
            viewport,
            background: "white"
        }).promise;

        melhorarImagemOCR(canvas);

        const texto =
            await reconhecerCanvasOCR(
                canvas,
                nomeArquivo +
                " · página " +
                numero +
                "/" +
                total
            );

        canvas.width = 1;
        canvas.height = 1;

        return texto;
    }

    async function extrairImagemOCR(file) {
        const url =
            URL.createObjectURL(file);

        try {
            const imagem =
                await carregarImagem(url);

            const canvas =
                document.createElement("canvas");

            const largura =
                imagem.naturalWidth ||
                imagem.width;

            const altura =
                imagem.naturalHeight ||
                imagem.height;

            const maxLado = 3200;

            const escala =
                Math.min(
                    1,
                    maxLado /
                    Math.max(
                        largura,
                        altura
                    )
                );

            canvas.width =
                Math.max(
                    1,
                    Math.round(
                        largura * escala
                    )
                );

            canvas.height =
                Math.max(
                    1,
                    Math.round(
                        altura * escala
                    )
                );

            const ctx =
                canvas.getContext(
                    "2d",
                    {
                        willReadFrequently: true
                    }
                );

            ctx.fillStyle = "#FFFFFF";

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

            melhorarImagemOCR(canvas);

            return await reconhecerCanvasOCR(
                canvas,
                file.name
            );
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    function carregarImagem(url) {
        return new Promise(
            function (resolve, reject) {
                const img = new Image();

                img.onload =
                    function () {
                        resolve(img);
                    };

                img.onerror =
                    function () {
                        reject(
                            new Error(
                                "Não foi possível abrir a imagem."
                            )
                        );
                    };

                img.src = url;
            }
        );
    }

    function melhorarImagemOCR(canvas) {
        const ctx =
            canvas.getContext(
                "2d",
                {
                    willReadFrequently: true
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
                    dados[i] * 0.299 +
                    dados[i + 1] * 0.587 +
                    dados[i + 2] * 0.114
                );

            const contraste =
                Math.max(
                    0,
                    Math.min(
                        255,
                        (cinza - 128) *
                        1.2 +
                        128
                    )
                );

            dados[i] =
                dados[i + 1] =
                dados[i + 2] =
                contraste;

            dados[i + 3] = 255;
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
            typeof window.Tesseract.createWorker !==
            "function"
        ) {
            throw new Error(
                "Tesseract.js local não foi carregado."
            );
        }

        workerOCR =
            await window.Tesseract.createWorker(
                CONFIG.ocrIdioma,
                1,
                {
                    workerPath:
                        CONFIG.ocrWorkerPath,

                    corePath:
                        CONFIG.ocrCorePath,

                    langPath:
                        CONFIG.ocrLangPath,

                    logger:
                        function (m) {
                            if (
                                !m ||
                                typeof m.progress !==
                                "number"
                            ) {
                                return;
                            }

                            if (
                                String(
                                    m.status || ""
                                ).toLowerCase()
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

        if (!texto.trim()) {
            throw new Error(
                "OCR não encontrou texto legível em " +
                referencia +
                "."
            );
        }

        return texto;
    }

    function normalizarTextoExtraido(texto) {
        return String(texto || "")
            .replace(/\u00A0/g, " ")
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .replace(/[ \t]+/g, " ")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
    }

    function identificarBanco(texto, nomeArquivo) {
        const n =
            normalizar(
                (nomeArquivo || "") +
                " " +
                (texto || "")
            );

        const regras = [
            {
                nome: "Nubank",
                padroes: [
                    "NUBANK",
                    "NU PAGAMENTOS",
                    "NU FINANCEIRA"
                ]
            },
            {
                nome: "Mercado Pago",
                padroes: [
                    "MERCADO PAGO",
                    "MERCADOPAGO"
                ]
            },
            {
                nome: "Itaú",
                padroes: [
                    "ITAU UNIBANCO",
                    "BANCO ITAU",
                    "ITAU"
                ]
            },
            {
                nome: "Sicoob",
                padroes: [
                    "SICOOB",
                    "BANCO COOPERATIVO SICOOB",
                    "SISTEMA DE COOPERATIVAS DE CREDITO DO BRASIL"
                ]
            },
            {
                nome: "Banco do Brasil",
                padroes: [
                    "BANCO DO BRASIL",
                    "BB S A"
                ]
            },
            {
                nome: "Bradesco",
                padroes: [
                    "BRADESCO",
                    "BANCO BRADESCO"
                ]
            },
            {
                nome: "Santander",
                padroes: [
                    "SANTANDER",
                    "BANCO SANTANDER"
                ]
            },
            {
                nome: "Banco Inter",
                padroes: [
                    "BANCO INTER",
                    "INTER PAGAMENTOS"
                ]
            },
            {
                nome: "Sicredi",
                padroes: [
                    "SICREDI"
                ]
            },
            {
                nome: "Caixa",
                padroes: [
                    "CAIXA ECONOMICA FEDERAL",
                    "CEF"
                ]
            },
            {
                nome: "C6 Bank",
                padroes: [
                    "C6 BANK",
                    "BANCO C6"
                ]
            },
            {
                nome: "PicPay",
                padroes: [
                    "PICPAY"
                ]
            },
            {
                nome: "PagBank",
                padroes: [
                    "PAGBANK",
                    "PAGSEGURO"
                ]
            },
            {
                nome: "BTG Pactual",
                padroes: [
                    "BTG PACTUAL"
                ]
            },
            {
                nome: "Safra",
                padroes: [
                    "BANCO SAFRA",
                    "SAFRA"
                ]
            }
        ];

        for (
            let i = 0;
            i < regras.length;
            i++
        ) {
            if (
                regras[i].padroes.some(
                    p => n.includes(p)
                )
            ) {
                return regras[i].nome;
            }
        }

        return "Não identificado";
    }

    function identificarTitular(texto) {
        const linhas =
            String(texto || "")
                .split("\n")
                .map(l => l.trim())
                .filter(Boolean);

        let nome = "";
        let documento = "";

        const regexDoc =
            /\b(?:CPF|CNPJ)?\s*:?\s*((?:\d{3}\.?\d{3}\.?\d{3}-?\d{2})|(?:\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}))\b/i;

        for (
            let i = 0;
            i < Math.min(
                linhas.length,
                120
            );
            i++
        ) {
            const linha =
                linhas[i];

            if (!documento) {
                const m =
                    linha.match(regexDoc);

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
                    const candidato =
                        m[1]
                            .replace(
                                regexDoc,
                                ""
                            )
                            .trim();

                    if (
                        candidato &&
                        /[A-Za-zÀ-ÿ]{2,}/.test(
                            candidato
                        )
                    ) {
                        nome =
                            candidato;
                    }
                }
            }
        }

        return {
            nome,
            documento
        };
    }

    function identificarPeriodo(texto) {
        const regex =
            /\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\b/g;

        const datas = [];

        let m;

        while (
            (
                m =
                regex.exec(
                    String(
                        texto || ""
                    )
                )
            ) !== null
        ) {
            const data =
                criarData(
                    Number(m[1]),
                    Number(m[2]),
                    normalizarAno(
                        Number(m[3]),
                        m[3].length
                    )
                );

            if (data) {
                datas.push(data);
            }
        }

        if (!datas.length) {
            return null;
        }

        datas.sort(
            (a, b) => a - b
        );

        return {
            inicio: datas[0],
            fim:
                datas[
                datas.length - 1
                ]
        };
    }

    function interpretarMovimentacoesDocumento(doc) {
        const linhas =
            String(doc.texto || "")
                .split("\n")
                .map(l => l.trim())
                .filter(Boolean);

        const lista = [];

        let dataCorrente = null;

        for (
            let i = 0;
            i < linhas.length;
            i++
        ) {
            const linha =
                linhas[i];

            const encontrada =
                extrairDataLinha(
                    linha,
                    dataCorrente,
                    doc.periodo
                );

            if (encontrada.data) {
                dataCorrente =
                    encontrada.data;
            }

            let mov =
                interpretarLinha(
                    linha,
                    dataCorrente,
                    doc,
                    i
                );

            if (
                !mov &&
                i + 1 < linhas.length
            ) {
                mov =
                    interpretarLinha(
                        linha +
                        " " +
                        linhas[i + 1],
                        dataCorrente,
                        doc,
                        i
                    );
            }

            if (
                !mov &&
                i + 2 < linhas.length
            ) {
                mov =
                    interpretarLinha(
                        linha +
                        " " +
                        linhas[i + 1] +
                        " " +
                        linhas[i + 2],
                        dataCorrente,
                        doc,
                        i
                    );
            }

            if (mov) {
                lista.push(mov);
            }
        }

        return removerDuplicadosDocumento(
            lista
        );
    }

    function extrairDataLinha(
        linha,
        dataCorrente,
        periodo
    ) {
        const texto =
            String(linha || "");

        let m =
            texto.match(
                /(?:^|\s)(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})(?=\s|$)/
            );

        if (m) {
            const data =
                criarData(
                    Number(m[1]),
                    Number(m[2]),
                    normalizarAno(
                        Number(m[3]),
                        m[3].length
                    )
                );

            if (data) {
                return {
                    data
                };
            }
        }

        m =
            texto.match(
                /(?:^|\s)(\d{1,2})[\/.-](\d{1,2})(?=\s|$)/
            );

        if (m) {
            const ano =
                dataCorrente
                    ? dataCorrente.getFullYear()
                    : (
                        periodo &&
                            periodo.inicio
                            ? periodo.inicio.getFullYear()
                            : new Date().getFullYear()
                    );

            const data =
                criarData(
                    Number(m[1]),
                    Number(m[2]),
                    ano
                );

            if (data) {
                return {
                    data
                };
            }
        }

        return {
            data: dataCorrente
        };
    }

    function interpretarLinha(
        linha,
        dataCorrente,
        doc,
        indice
    ) {
        const original =
            String(linha || "")
                .replace(/\s+/g, " ")
                .trim();

        if (!original) {
            return null;
        }

        const n =
            normalizar(original);

        if (deveIgnorarLinha(n)) {
            return null;
        }

        const dataInfo =
            extrairDataLinha(
                original,
                dataCorrente,
                doc.periodo
            );

        const data =
            dataInfo.data;

        if (!data) {
            return null;
        }

        const regexData =
            /(?:^|\s)(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?(?=\s|$)/;

        const semData =
            original
                .replace(
                    regexData,
                    " "
                )
                .replace(
                    /\s+/g,
                    " "
                )
                .trim();

        const valores = [];

        const regexValor =
            /(?:R\$\s*)?([+-]?\s*(?:\d{1,3}(?:\.\d{3})*(?:,\d{2})|\d+(?:,\d{2})|\d{1,3}(?:,\d{3})*(?:\.\d{2})|\d+(?:\.\d{2})))\s*([CD])?(?=\s|$|[|])/gi;

        let match;

        while (
            (
                match =
                regexValor.exec(
                    semData
                )
            ) !== null
        ) {
            const valor =
                converterValorFlexivel(
                    match[1]
                );

            if (
                Number.isFinite(valor) &&
                Math.abs(valor) > 0
            ) {
                valores.push({
                    valor:
                        Math.abs(valor),
                    sinal:
                        valor < 0
                            ? -1
                            : 1,
                    indicador:
                        String(
                            match[2] ||
                            ""
                        ).toUpperCase(),
                    texto:
                        match[0],
                    indice:
                        match.index
                });
            }
        }

        if (!valores.length) {
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
                .replace(/[|]+/g, " ")
                .replace(/\s+/g, " ")
                .trim();

        historico =
            limparHistorico(
                historico
            );

        if (
            !historico ||
            historico.length < 2
        ) {
            return null;
        }

        const natureza =
            inferirNatureza(
                original,
                escolhido
            );

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
            data,
            dataTexto:
                formatarData(data),
            competencia:
                competencia(data),
            historico,
            historicoNormalizado:
                normalizar(historico),
            valor:
                escolhido.valor,
            natureza,
            classificacao: "",
            motivo: "",
            considerar: false,
            duvida: false,
            duplicado: false,
            transferenciaPropria: false,
            referenciaTransferencia: "",
            manual: false
        };

        classificar(mov);

        return mov;
    }

    function escolherValorMovimentacao(
        valores,
        linha
    ) {
        if (!valores.length) {
            return null;
        }

        if (valores.length === 1) {
            return valores[0];
        }

        const n =
            normalizar(linha);

        if (n.includes("SALDO")) {
            return valores[0];
        }

        for (
            let i =
                valores.length - 1;
            i >= 0;
            i--
        ) {
            if (
                valores[i].indicador ===
                "C" ||
                valores[i].indicador ===
                "D"
            ) {
                return valores[i];
            }
        }

        return valores[
            valores.length - 1
        ];
    }

    function inferirNatureza(
        linha,
        valor
    ) {
        if (
            valor.indicador === "C"
        ) {
            return "C";
        }

        if (
            valor.indicador === "D"
        ) {
            return "D";
        }

        if (valor.sinal < 0) {
            return "D";
        }

        const texto =
            normalizar(linha);

        if (
            /\b(PIX RECEBIDO|PIX RECEBIDA|PIX RECEB|TRANSFERENCIA RECEBIDA|TRANSFERENCIA RECEBIDO|TRANSF RECEBIDA|TED RECEBIDA|TED RECEBIDO|DOC RECEBIDO|DOC RECEBIDA|DEPOSITO|RECEBIMENTO|PAGAMENTO RECEBIDO|PAGAMENTO RECEBIDA|CREDITO|CRED|ENTRADA)\b/.test(
                texto
            )
        ) {
            return "C";
        }

        if (
            /\b(DEBITO|DEB|SAIDA|PAGAMENTO|COMPRA|PIX ENVIADO|PIX REALIZADO|PIX EFETUADO|TRANSFERENCIA ENVIADA|TRANSFERENCIA REALIZADA|TED ENVIADA|SAQUE|APLICACAO)\b/.test(
                texto
            )
        ) {
            return "D";
        }

        return "C";
    }

    function classificar(m) {
        if (m.natureza !== "C") {
            m.classificacao =
                "DÉBITO";

            m.motivo =
                "Débito/saída de recursos";

            m.considerar = false;

            return;
        }

        const h =
            m.historicoNormalizado;

        if (
            /\b(EMPRESTIMO|FINANCIAMENTO|FINANC|LIBERACAO DE CREDITO|LIBERACAO CREDITO|CREDITO PESSOAL|CREDITO CONSIGNADO|CAPITAL DE GIRO)\b/.test(
                h
            )
        ) {
            m.classificacao =
                "EMPRÉSTIMO / FINANCIAMENTO";

            m.motivo =
                "Não representa renda";

            m.considerar = false;

            return;
        }

        if (
            /\b(ANTECIPACAO|ADIANTAMENTO|ADIANTAMENTO A DEPOSITANTE)\b/.test(
                h
            )
        ) {
            m.classificacao =
                "ANTECIPAÇÃO";

            m.motivo =
                "Antecipação/adiantamento não representa renda";

            m.considerar = false;

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
                "Estorno ou devolução";

            m.considerar = false;

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
                "Movimentação de investimento";

            m.considerar = false;

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

            m.considerar = true;

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

            m.considerar = true;

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

            m.considerar = true;

            return;
        }

        if (
            /\b(PAGAMENTO RECEBIDO|RECEBIMENTO|RECEBIDO DE|RECEBIDA DE|COBRANCA RECEBIDA|LIQUIDACAO COBRANCA)\b/.test(
                h
            )
        ) {
            m.classificacao =
                "RECEBIMENTO";

            m.motivo =
                "Recebimento identificado";

            m.considerar = true;

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

            m.considerar = true;

            return;
        }

        if (
            /\b(OUTROS CREDITOS|OUTRO CREDITO|CREDITO EM CONTA|CREDITO CONTA|CREDITO)\b/.test(
                h
            )
        ) {
            m.classificacao =
                "CRÉDITO";

            m.motivo =
                "Crédito identificado";

            m.considerar = true;

            return;
        }

        m.classificacao =
            "CRÉDITO A CONFERIR";

        m.motivo =
            "Origem do crédito não identificada com segurança";

        m.considerar = false;
        m.duvida = true;
    }

    function deveIgnorarLinha(n) {
        if (!n) return true;

        const padroes = [
            "EXTRATO DE CONTA",
            "EXTRATO CONTA",
            "SALDO ANTERIOR",
            "SALDO DO DIA",
            "SALDO FINAL",
            "SALDO DISPONIVEL",
            "SALDO TOTAL",
            "TOTAL DE CREDITOS",
            "TOTAL CREDITOS",
            "TOTAL DE DEBITOS",
            "TOTAL DEBITOS",
            "RESUMO",
            "LANCAMENTOS FUTUROS",
            "DATA HISTORICO",
            "DATA DOCUMENTO HISTORICO",
            "PERIODO",
            "AGENCIA CONTA",
            "CONTA CORRENTE",
            "OUVIDORIA",
            "CENTRAL DE ATENDIMENTO"
        ];

        return padroes.some(
            p => n.includes(p)
        );
    }

    function removerDuplicadosDocumento(lista) {
        const saida = [];
        const mapa = new Map();

        lista.forEach(function (m) {
            const chave =
                m.documentoId +
                "|" +
                m.dataTexto +
                "|" +
                m.natureza +
                "|" +
                m.valor.toFixed(2) +
                "|" +
                m.historicoNormalizado;

            if (!mapa.has(chave)) {
                mapa.set(
                    chave,
                    m
                );

                saida.push(m);
            }
        });

        return saida;
    }

    function detectarDuplicidades() {
        for (
            let i = 0;
            i < movimentacoes.length;
            i++
        ) {
            const a =
                movimentacoes[i];

            for (
                let j = i + 1;
                j < movimentacoes.length;
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
                    CONFIG.toleranciaValor
                ) {
                    continue;
                }

                if (
                    Math.abs(
                        diferencaDias(
                            a.data,
                            b.data
                        )
                    ) > 1
                ) {
                    continue;
                }

                if (
                    similaridadeHistorico(
                        a.historicoNormalizado,
                        b.historicoNormalizado
                    ) >= 0.82
                ) {
                    b.duplicado = true;
                    b.considerar = false;
                    b.duvida = false;
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
                    m.natureza === "C" &&
                    !m.duplicado
            );

        const debitos =
            movimentacoes.filter(
                m =>
                    m.natureza === "D" &&
                    !m.duplicado
            );

        creditos.forEach(
            function (credito) {
                if (
                    !/\b(PIX|TRANSFER|TRANSF|TED)\b/.test(
                        credito.historicoNormalizado
                    )
                ) {
                    return;
                }

                for (
                    let i = 0;
                    i < debitos.length;
                    i++
                ) {
                    const debito =
                        debitos[i];

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
                        CONFIG.toleranciaValor
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
                        CONFIG.toleranciaDiasTransferencia
                    ) {
                        continue;
                    }

                    credito.transferenciaPropria =
                        true;

                    credito.referenciaTransferencia =
                        debito.id;

                    credito.considerar =
                        false;

                    credito.duvida =
                        true;

                    credito.classificacao =
                        "POSSÍVEL TRANSFERÊNCIA PRÓPRIA";

                    credito.motivo =
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
        const alertas = [];

        documentos.forEach(
            function (doc) {
                if (doc.erro) {
                    alertas.push(
                        doc.arquivo +
                        ": " +
                        doc.erro
                    );
                }

                if (
                    !doc.movimentacoes.length &&
                    !doc.erro
                ) {
                    alertas.push(
                        doc.arquivo +
                        ": nenhuma movimentação foi reconhecida."
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
                m => m.duvida
            ).length;

        const duplicados =
            movimentacoes.filter(
                m => m.duplicado
            ).length;

        const transferencias =
            movimentacoes.filter(
                m =>
                    m.transferenciaPropria
            ).length;

        if (duvidas) {
            alertas.push(
                duvidas +
                " crédito(s) precisam de conferência."
            );
        }

        if (duplicados) {
            alertas.push(
                duplicados +
                " possível(is) duplicidade(s) identificada(s)."
            );
        }

        if (transferencias) {
            alertas.push(
                transferencias +
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
            card.hidden = false;
        }

        const titulares =
            documentos
                .map(
                    d => d.titular
                )
                .filter(Boolean);

        const documentosTitular =
            documentos
                .map(
                    d =>
                        d.documentoTitular
                )
                .filter(Boolean);

        definirTexto(
            "ocrNomeTitular",
            maisFrequente(titulares) ||
            "Não identificado"
        );

        definirTexto(
            "ocrDocumentoTitular",
            formatarDocumento(
                maisFrequente(
                    documentosTitular
                )
            ) ||
            "Não identificado"
        );

        definirTexto(
            "ocrInstituicoes",
            resultado.bancos.length
                ? resultado.bancos.join(", ")
                : "Não identificadas"
        );

        definirTexto(
            "ocrQuantidadeArquivos",
            String(documentos.length)
        );

        const datas =
            movimentacoes
                .map(m => m.data)
                .filter(
                    d =>
                        d instanceof Date &&
                        !Number.isNaN(
                            d.getTime()
                        )
                )
                .sort(
                    (a, b) => a - b
                );

        definirTexto(
            "ocrPeriodoLeitura",
            datas.length
                ? formatarData(datas[0]) +
                " a " +
                formatarData(
                    datas[
                    datas.length - 1
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

        if (!lista) return;

        lista.innerHTML = "";

        if (!documentos.length) {
            lista.innerHTML =
                '<div class="sem-dados">Nenhum documento processado.</div>';

            return;
        }

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
                    escapar(doc.arquivo) +
                    "</strong>" +
                    "<span>" +
                    escapar(doc.banco) +
                    " · " +
                    escapar(
                        doc.metodoLeitura ||
                        doc.tipo
                    ) +
                    "</span>" +
                    "<small>" +
                    (
                        doc.competencias.length
                            ? escapar(
                                doc.competencias
                                    .map(
                                        formatarCompetencia
                                    )
                                    .join(", ")
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

        if (!lista) return;

        lista.innerHTML = "";

        const alertas =
            resultado &&
                resultado.alertas
                ? resultado.alertas
                : [];

        if (!alertas.length) {
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

        if (!tbody) return;

        tbody.innerHTML = "";

        if (!movimentacoes.length) {
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
                (a, b) =>
                    a.data - b.data
            )
            .forEach(
                function (m) {
                    const tr =
                        document.createElement(
                            "tr"
                        );

                    if (m.duvida) {
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
                        m.natureza !== "C";

                    checkbox.addEventListener(
                        "change",
                        function () {
                            m.considerar =
                                checkbox.checked;

                            m.manual = true;

                            if (
                                checkbox.checked
                            ) {
                                m.duvida = false;
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
                                valor || "-";

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

    function alterarTodos(considerar) {
        movimentacoes.forEach(
            function (m) {
                if (
                    m.natureza === "C"
                ) {
                    m.considerar =
                        considerar;

                    m.manual = true;

                    if (considerar) {
                        m.duvida = false;
                        m.motivo =
                            "Incluído manualmente na conferência";
                    } else {
                        m.motivo =
                            "Excluído manualmente na conferência";
                    }
                }
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
                    m.natureza === "C" &&
                    m.considerar
            );

        const competencias =
            resultado &&
                resultado.competenciasDocumentadas &&
                resultado.competenciasDocumentadas.length
                ? resultado.competenciasDocumentadas.slice()
                : Array.from(
                    new Set(
                        consideradas
                            .map(
                                m =>
                                    m.competencia
                            )
                            .filter(Boolean)
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
                            total: 0,
                            quantidade: 0,
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

                if (m.banco) {
                    item.bancos.add(
                        m.banco
                    );
                }
            }
        );

        const total =
            consideradas.reduce(
                (soma, m) =>
                    soma + m.valor,
                0
            );

        const meses =
            competencias.length ||
            porMes.size ||
            1;

        let maiorMes = "";
        let maiorValor = -1;

        porMes.forEach(
            function (item, comp) {
                if (
                    item.total >
                    maiorValor
                ) {
                    maiorValor =
                        item.total;

                    maiorMes =
                        comp;
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
                total / meses,
            maiorMes,
            maiorValor:
                maiorValor < 0
                    ? 0
                    : maiorValor
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

        if (!tbody) return;

        tbody.innerHTML = "";

        const competencias =
            resumo.competencias.length
                ? resumo.competencias
                : Array.from(
                    resumo.porMes.keys()
                ).sort();

        if (!competencias.length) {
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
                    resumo.porMes.get(
                        comp
                    ) || {
                        total: 0,
                        quantidade: 0,
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
                        ).join(", ") ||
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

        if (!tbody) return;

        tbody.innerHTML = "";

        const mapa =
            new Map();

        resumo.consideradas.forEach(
            function (m) {
                const banco =
                    m.banco ||
                    "Não identificado";

                if (!mapa.has(banco)) {
                    mapa.set(
                        banco,
                        {
                            quantidade: 0,
                            total: 0,
                            competencias:
                                new Set()
                        }
                    );
                }

                const item =
                    mapa.get(banco);

                item.quantidade++;
                item.total +=
                    m.valor;

                if (m.competencia) {
                    item.competencias.add(
                        m.competencia
                    );
                }
            }
        );

        if (!mapa.size) {
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
                (a, b) =>
                    a[0].localeCompare(
                        b[0],
                        "pt-BR"
                    )
            )
            .forEach(
                function (
                    [banco, item]
                ) {
                    const divisor =
                        item.competencias.size ||
                        resumo.meses ||
                        1;

                    const tr =
                        document.createElement(
                            "tr"
                        );

                    tr.innerHTML =
                        "<td>" +
                        escapar(banco) +
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

    function gerarResumoTexto() {
        const resumo =
            calcularResumo();

        const linhas = [];

        linhas.push(
            "RESUMO DA LEITURA DOS EXTRATOS"
        );

        linhas.push("");

        linhas.push(
            "Arquivos processados: " +
            documentos.length
        );

        linhas.push(
            "Instituições: " +
            (
                resultado &&
                    resultado.bancos.length
                    ? resultado.bancos.join(
                        ", "
                    )
                    : "Não identificadas"
            )
        );

        linhas.push(
            "Competências consideradas: " +
            (
                resumo.competencias.length
                    ? resumo.competencias
                        .map(
                            formatarCompetencia
                        )
                        .join(", ")
                    : "-"
            )
        );

        linhas.push("");

        resumo.competencias.forEach(
            function (comp) {
                const item =
                    resumo.porMes.get(
                        comp
                    ) || {
                        total: 0,
                        quantidade: 0
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

        linhas.push("");
        linhas.push(
            "Total considerado: " +
            formatarMoeda(
                resumo.total
            )
        );

        linhas.push(
            "Meses considerados: " +
            resumo.meses
        );

        linhas.push(
            "Média mensal: " +
            formatarMoeda(
                resumo.media
            )
        );

        const observacao =
            document.getElementById(
                "observacaoLeituraExtrato"
            );

        if (
            observacao &&
            String(
                observacao.value ||
                ""
            ).trim()
        ) {
            linhas.push("");
            linhas.push(
                "Observação: " +
                String(
                    observacao.value
                ).trim()
            );
        }

        return linhas.join("\n");
    }

    function atualizarResumoTexto() {
        const textarea =
            document.getElementById(
                "resumoLeituraOCR"
            );

        if (textarea) {
            textarea.value =
                gerarResumoTexto();
        }
    }

    function gerarTextoConsolidado() {
        return movimentacoes
            .slice()
            .sort(
                (a, b) =>
                    a.data - b.data
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

                    const historico =
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
                        m.historico;

                    return (
                        m.dataTexto +
                        " | " +
                        historico +
                        " | " +
                        formatarValor(
                            m.valor
                        ) +
                        " " +
                        m.natureza
                    );
                }
            )
            .join("\n");
    }

    function aplicarAoMotor() {
        if (!movimentacoes.length) {
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

        try {
            if (
                window.MediaMovimentacao &&
                typeof window.MediaMovimentacao.processarTexto ===
                "function"
            ) {
                window.MediaMovimentacao.processarTexto(
                    texto,
                    {
                        competenciasDocumentadas:
                            resultado
                                ? resultado.competenciasDocumentadas
                                : []
                    }
                );
            } else {
                throw new Error(
                    "Motor media-movimentacao.js não encontrado."
                );
            }

            definirStatus(
                "Leitura aplicada ao cálculo da Média de Movimentação.",
                "sucesso"
            );
        } catch (e) {
            console.error(e);

            definirStatus(
                "Não foi possível aplicar os dados: " +
                (
                    e.message ||
                    e
                ),
                "erro"
            );
        }
    }

    async function copiarResumo() {
        const textarea =
            document.getElementById(
                "resumoLeituraOCR"
            );

        const texto =
            textarea
                ? textarea.value
                : gerarResumoTexto();

        if (!texto) return;

        try {
            await navigator.clipboard.writeText(
                texto
            );

            definirStatus(
                "Resumo copiado.",
                "sucesso"
            );
        } catch (e) {
            if (textarea) {
                textarea.focus();
                textarea.select();

                document.execCommand(
                    "copy"
                );

                definirStatus(
                    "Resumo copiado.",
                    "sucesso"
                );
            }
        }
    }

    function limparTudo() {
        arquivos = [];
        documentos = [];
        movimentacoes = [];
        resultado = null;
        contadorMovimentacoes = 0;

        const input =
            document.getElementById(
                "arquivosExtrato"
            );

        if (input) {
            input.value = "";
        }

        const observacao =
            document.getElementById(
                "observacaoLeituraExtrato"
            );

        if (observacao) {
            observacao.value = "";
        }

        const card =
            document.getElementById(
                "cardResultadoLeituraExtratos"
            );

        if (card) {
            card.hidden = true;
        }

        const resumo =
            document.getElementById(
                "resumoLeituraOCR"
            );

        if (resumo) {
            resumo.value = "";
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

        if (!btn) return;

        btn.disabled =
            bloquear;

        btn.textContent =
            bloquear
                ? "Lendo..."
                : "Ler e Consolidar";

        btn.style.cursor =
            bloquear
                ? "wait"
                : "pointer";
    }

    function definirStatus(
        texto,
        tipo
    ) {
        const el =
            document.getElementById(
                "statusLeituraExtrato"
            );

        if (!el) return;

        el.textContent =
            texto || "";

        el.className =
            "status-leitura-ocr" +
            (
                tipo
                    ? " status-" +
                    tipo
                    : ""
            );
    }

    function definirTexto(id, texto) {
        const el =
            document.getElementById(id);

        if (el) {
            el.textContent =
                texto;
        }
    }

    function obterTbody(id) {
        const el =
            document.getElementById(id);

        if (!el) {
            return null;
        }

        return el.tagName ===
            "TBODY"
            ? el
            : el.querySelector(
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
            escapar(texto) +
            "</td>";

        tbody.appendChild(tr);
    }

    function obterExtensao(nome) {
        const partes =
            String(nome || "")
                .toLowerCase()
                .split(".");

        return partes.length > 1
            ? partes.pop()
            : "";
    }

    function formatarTamanho(bytes) {
        const n =
            Number(bytes || 0);

        if (n < 1024) {
            return n + " B";
        }

        if (
            n <
            1024 * 1024
        ) {
            return (
                n / 1024
            ).toFixed(1) +
                " KB";
        }

        return (
            n /
            (
                1024 *
                1024
            )
        ).toFixed(1) +
            " MB";
    }

    function normalizar(texto) {
        return String(texto || "")
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .toUpperCase()
            .replace(/\u00A0/g, " ")
            .replace(
                /[.,:;()[\]{}]+/g,
                " "
            )
            .replace(
                /[-–—]+/g,
                " "
            )
            .replace(
                /[*_=<>]+/g,
                " "
            )
            .replace(/\s+/g, " ")
            .trim();
    }

    function limparHistorico(texto) {
        return String(texto || "")
            .replace(
                /^[|;,\s]+|[|;,\s]+$/g,
                " "
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim();
    }

    function converterValorFlexivel(
        valor
    ) {
        let s =
            String(valor || "")
                .replace(
                    /R\$/gi,
                    ""
                )
                .replace(
                    /\s+/g,
                    ""
                )
                .trim();

        if (!s) {
            return NaN;
        }

        let negativo = false;

        if (
            s.startsWith("-")
        ) {
            negativo = true;
            s = s.substring(1);
        }

        if (
            s.startsWith("+")
        ) {
            s = s.substring(1);
        }

        const ultimaVirgula =
            s.lastIndexOf(",");

        const ultimoPonto =
            s.lastIndexOf(".");

        if (
            ultimaVirgula >= 0 &&
            ultimoPonto >= 0
        ) {
            if (
                ultimaVirgula >
                ultimoPonto
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
            } else {
                s =
                    s.replace(
                        /,/g,
                        ""
                    );
            }
        } else if (
            ultimaVirgula >= 0
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
        } else if (
            ultimoPonto >= 0
        ) {
            const decimais =
                s.length -
                ultimoPonto -
                1;

            if (
                decimais !== 2
            ) {
                s =
                    s.replace(
                        /\./g,
                        ""
                    );
            }
        }

        s =
            s.replace(
                /[^\d.]/g,
                ""
            );

        const n =
            Number(s);

        if (
            !Number.isFinite(n)
        ) {
            return NaN;
        }

        return negativo
            ? -n
            : n;
    }

    function normalizarAno(
        ano,
        tamanho
    ) {
        if (
            tamanho === 2
        ) {
            return ano >= 70
                ? 1900 + ano
                : 2000 + ano;
        }

        return ano;
    }

    function criarData(
        dia,
        mes,
        ano
    ) {
        if (
            !Number.isInteger(dia) ||
            !Number.isInteger(mes) ||
            !Number.isInteger(ano) ||
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
                mes - 1,
                dia,
                12,
                0,
                0,
                0
            );

        if (
            d.getFullYear() !==
            ano ||
            d.getMonth() !==
            mes - 1 ||
            d.getDate() !==
            dia
        ) {
            return null;
        }

        return d;
    }

    function formatarData(d) {
        if (
            !(d instanceof Date) ||
            Number.isNaN(
                d.getTime()
            )
        ) {
            return "";
        }

        return (
            String(
                d.getDate()
            ).padStart(
                2,
                "0"
            ) +
            "/" +
            String(
                d.getMonth() + 1
            ).padStart(
                2,
                "0"
            ) +
            "/" +
            d.getFullYear()
        );
    }

    function competencia(d) {
        if (
            !(d instanceof Date) ||
            Number.isNaN(
                d.getTime()
            )
        ) {
            return "";
        }

        return (
            d.getFullYear() +
            "-" +
            String(
                d.getMonth() + 1
            ).padStart(
                2,
                "0"
            )
        );
    }

    function formatarCompetencia(c) {
        const p =
            String(c || "")
                .split("-");

        return p.length === 2
            ? p[1] +
            "/" +
            p[0]
            : c;
    }

    function competenciasEntre(
        inicio,
        fim
    ) {
        if (
            !(inicio instanceof Date) ||
            !(fim instanceof Date)
        ) {
            return [];
        }

        const atual =
            new Date(
                inicio.getFullYear(),
                inicio.getMonth(),
                1
            );

        const final =
            new Date(
                fim.getFullYear(),
                fim.getMonth(),
                1
            );

        const arr = [];

        while (
            atual <= final
        ) {
            arr.push(
                competencia(
                    atual
                )
            );

            atual.setMonth(
                atual.getMonth() +
                1
            );
        }

        return arr;
    }

    function diferencaDias(a, b) {
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
                normalizar(a)
                    .split(" ")
                    .filter(
                        x =>
                            x.length > 2
                    )
            );

        const sb =
            new Set(
                normalizar(b)
                    .split(" ")
                    .filter(
                        x =>
                            x.length > 2
                    )
            );

        if (
            !sa.size &&
            !sb.size
        ) {
            return 1;
        }

        let inter = 0;

        sa.forEach(
            function (x) {
                if (sb.has(x)) {
                    inter++;
                }
            }
        );

        const uniao =
            new Set(
                [
                    ...sa,
                    ...sb
                ]
            ).size;

        return uniao
            ? inter / uniao
            : 0;
    }

    function maisFrequente(lista) {
        if (!lista.length) {
            return "";
        }

        const mapa = {};
        let melhor = "";
        let quantidade = 0;

        lista.forEach(
            function (valor) {
                const chave =
                    String(
                        valor || ""
                    ).trim();

                if (!chave) {
                    return;
                }

                mapa[chave] =
                    (
                        mapa[chave] ||
                        0
                    ) + 1;

                if (
                    mapa[chave] >
                    quantidade
                ) {
                    quantidade =
                        mapa[chave];

                    melhor =
                        chave;
                }
            }
        );

        return melhor;
    }

    function formatarDocumento(doc) {
        const s =
            String(doc || "")
                .replace(
                    /\D/g,
                    ""
                );

        if (
            s.length === 11
        ) {
            return s.replace(
                /(\d{3})(\d{3})(\d{3})(\d{2})/,
                "$1.$2.$3-$4"
            );
        }

        if (
            s.length === 14
        ) {
            return s.replace(
                /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
                "$1.$2.$3/$4-$5"
            );
        }

        return doc || "";
    }

    function formatarMoeda(v) {
        return Number(
            v || 0
        ).toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );
    }

    function formatarValor(v) {
        return Number(
            v || 0
        ).toLocaleString(
            "pt-BR",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
                useGrouping: true
            }
        );
    }

    function sanitizarTag(v) {
        return String(v || "")
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

    function escapar(texto) {
        return String(texto || "")
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
        processar: processarExtratos,
        limpar: limparTudo,
        aplicar: aplicarAoMotor,

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