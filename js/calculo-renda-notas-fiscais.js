(function () {
    "use strict";

    /* =========================================================
       CONFIGURAÇÕES
       ========================================================= */

    const PDFJS_CDN =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";

    const PDFJS_WORKER_CDN =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

    const CRITERIOS_APURACAO = Object.freeze({
        MOVIMENTACAO: "movimentacao",
        INTERVALO: "intervalo",
        INFORMADO: "informado"
    });

    const ORIGEM_PERIODO = Object.freeze({
        AUTOMATICO: "automatico",
        MANUAL: "manual"
    });

    const TOLERANCIA_VALOR = 0.05;
    const MESES_PADRAO_ATIVIDADE = 12;

    /* =========================================================
       ESTADO
       ========================================================= */

    let arquivosSelecionados = [];
    let notasProcessadas = [];
    let atividadesNotas = [];
    let periodosManuais = [];
    let periodosNotas = [];

    let pdfJsPromise = null;
    let processamentoEmAndamento = false;

    /* =========================================================
       INICIALIZAÇÃO
       ========================================================= */

    document.addEventListener(
        "DOMContentLoaded",
        iniciarCalculoRendaNotas
    );

    function iniciarCalculoRendaNotas() {
        configurarEventos();
        inicializarSeletoresAtividade();
        renderizarArquivos();
        renderizarAtividades();
        reconstruirPeriodos();
        renderizarNotasProcessadas();
        atualizarResultados();
    }

    /* =========================================================
       EVENTOS
       ========================================================= */

    function configurarEventos() {
        const btnSelecionarNotas =
            document.getElementById(
                "btnSelecionarNotas"
            );

        const inputArquivos =
            document.getElementById(
                "arquivosNotasFiscais"
            );

        const btnProcessar =
            document.getElementById(
                "btnProcessarNotas"
            );

        const btnLimparArquivos =
            document.getElementById(
                "btnLimparArquivosNotas"
            );

        const grupoAtividade =
            document.getElementById(
                "grupoAtividadeNotas"
            );

        const atividade =
            document.getElementById(
                "atividadeNotas"
            );

        const criterio =
            document.getElementById(
                "criterioAtividadeNotas"
            );

        const btnAdicionarAtividade =
            document.getElementById(
                "btnAdicionarAtividadeNotas"
            );

        const btnAdicionarPeriodo =
            document.getElementById(
                "btnAdicionarPeriodoNota"
            );

        const valorPeriodo =
            document.getElementById(
                "valorPeriodoNota"
            );

        const btnCalcular =
            document.getElementById(
                "btnCalcularRendaNotas"
            );

        const btnLimparCalculo =
            document.getElementById(
                "btnLimparCalculoNotas"
            );

        if (
            btnSelecionarNotas &&
            inputArquivos
        ) {
            btnSelecionarNotas.addEventListener(
                "click",
                function () {
                    inputArquivos.click();
                }
            );
        }

        if (inputArquivos) {
            inputArquivos.addEventListener(
                "change",
                function () {
                    adicionarArquivos(
                        Array.from(
                            this.files || []
                        )
                    );

                    this.value = "";

                    renderizarArquivos();
                    limparMensagemProcessamento();
                }
            );
        }

        if (btnProcessar) {
            btnProcessar.addEventListener(
                "click",
                processarArquivosSelecionados
            );
        }

        if (btnLimparArquivos) {
            btnLimparArquivos.addEventListener(
                "click",
                limparArquivos
            );
        }

        if (grupoAtividade) {
            grupoAtividade.addEventListener(
                "change",
                function () {
                    preencherSelectAtividades(
                        atividade,
                        this.value,
                        "",
                        true
                    );
                }
            );
        }

        if (criterio) {
            criterio.addEventListener(
                "change",
                atualizarVisibilidadeMesesAtividade
            );
        }

        if (btnAdicionarAtividade) {
            btnAdicionarAtividade.addEventListener(
                "click",
                adicionarAtividadeManual
            );
        }

        if (btnAdicionarPeriodo) {
            btnAdicionarPeriodo.addEventListener(
                "click",
                adicionarPeriodoManual
            );
        }

        if (valorPeriodo) {
            valorPeriodo.addEventListener(
                "input",
                function () {
                    aplicarMascaraMoeda(
                        this
                    );
                }
            );

            valorPeriodo.addEventListener(
                "blur",
                function () {
                    const valor =
                        moedaParaNumero(
                            this.value
                        );

                    if (valor > 0) {
                        this.value =
                            formatarMoeda(
                                valor
                            );
                    }
                }
            );
        }

        if (btnCalcular) {
            btnCalcular.addEventListener(
                "click",
                atualizarResultados
            );
        }

        if (btnLimparCalculo) {
            btnLimparCalculo.addEventListener(
                "click",
                limparCalculoCompleto
            );
        }
    }

    /* =========================================================
       CATÁLOGO
       ========================================================= */

    function obterApiAtividades() {
        return (
            window.CreditoRuralAtividades ||
            null
        );
    }

    function obterApiNcm() {
        return (
            window.CreditoRuralNcmAtividades ||
            null
        );
    }

    function obterApiNotas() {
        return (
            window.CreditoRuralNotasFiscais ||
            null
        );
    }

    function normalizarAtividade(valor) {
        const api =
            obterApiAtividades();

        if (
            api &&
            typeof api.normalizarIdentificadorAtividade ===
            "function"
        ) {
            return api.normalizarIdentificadorAtividade(
                valor
            );
        }

        return String(
            valor || ""
        )
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .toLowerCase()
            .replace(
                /[^a-z0-9]+/g,
                "_"
            )
            .replace(
                /^_+|_+$/g,
                ""
            );
    }

    function criarIdAtividade(
        grupo,
        atividade
    ) {
        return (
            `${grupo}|${normalizarAtividade(
                atividade
            )}`
        );
    }

    function interpretarIdAtividade(
        valor
    ) {
        const api =
            obterApiAtividades();

        if (
            api &&
            typeof api.interpretarValorAtividadeAgrupada ===
            "function"
        ) {
            const interpretado =
                api.interpretarValorAtividadeAgrupada(
                    valor
                );

            if (interpretado) {
                return interpretado;
            }
        }

        const partes =
            String(
                valor || ""
            ).split("|");

        if (
            partes.length !==
            2
        ) {
            return null;
        }

        const grupo =
            partes[0];

        const atividade =
            partes[1];

        return {
            grupo,
            atividade,
            nomeGrupo:
                obterNomeGrupo(
                    grupo
                ),
            nomeAtividade:
                obterNomeAtividade(
                    atividade,
                    grupo
                )
        };
    }

    function obterNomeGrupo(
        grupo
    ) {
        const api =
            obterApiAtividades();

        if (
            api &&
            typeof api.obterNomeGrupo ===
            "function"
        ) {
            return (
                api.obterNomeGrupo(
                    grupo
                ) ||
                grupo
            );
        }

        return (
            window
                .ATIVIDADES_CREDITO_RURAL
                ?.[grupo]
                ?.nome ||
            grupo ||
            ""
        );
    }

    function obterNomeAtividade(
        atividade,
        grupo = null
    ) {
        const api =
            obterApiAtividades();

        if (
            api &&
            typeof api.obterNomeAtividade ===
            "function"
        ) {
            const nome =
                api.obterNomeAtividade(
                    atividade,
                    grupo
                );

            if (nome) {
                return nome;
            }
        }

        const dados =
            window
                .ATIVIDADES_CREDITO_RURAL ||
            {};

        const grupos =
            grupo
                ? [grupo]
                : Object.keys(
                    dados
                );

        const procurado =
            normalizarAtividade(
                atividade
            );

        for (
            const chaveGrupo
            of grupos
        ) {
            const atividades =
                dados[
                    chaveGrupo
                ]?.atividades ||
                [];

            const encontrada =
                atividades.find(
                    function (item) {
                        return (
                            normalizarAtividade(
                                item
                            ) ===
                            procurado
                        );
                    }
                );

            if (encontrada) {
                return encontrada;
            }
        }

        return (
            atividade ||
            ""
        );
    }

    function localizarAtividade(
        nome,
        grupo = null
    ) {
        const api =
            obterApiAtividades();

        if (
            api &&
            typeof api.localizarAtividadePorNome ===
            "function"
        ) {
            return (
                api.localizarAtividadePorNome(
                    nome,
                    grupo
                ) ||
                null
            );
        }

        return null;
    }

    /* =========================================================
       SELECTS
       ========================================================= */

    function inicializarSeletoresAtividade() {
        const grupo =
            document.getElementById(
                "grupoAtividadeNotas"
            );

        const atividade =
            document.getElementById(
                "atividadeNotas"
            );

        if (grupo) {
            preencherSelectGrupos(
                grupo
            );
        }

        if (
            grupo &&
            atividade
        ) {
            preencherSelectAtividades(
                atividade,
                grupo.value,
                "",
                true
            );
        }

        atualizarSelectAtividadePeriodo();
        atualizarVisibilidadeMesesAtividade();
    }

    function preencherSelectGrupos(
        select
    ) {
        if (!select) {
            return;
        }

        const api =
            obterApiAtividades();

        if (
            api &&
            typeof api.preencherGruposEmSelect ===
            "function"
        ) {
            api.preencherGruposEmSelect(
                select,
                select.value ||
                "agricola",
                true
            );

            return;
        }

        select.innerHTML =
            '<option value="">Selecione</option>';

        const dados =
            window
                .ATIVIDADES_CREDITO_RURAL ||
            {};

        Object.entries(
            dados
        ).forEach(
            function (
                [chave, grupo]
            ) {
                select.appendChild(
                    new Option(
                        grupo.nome,
                        chave
                    )
                );
            }
        );
    }

    function preencherSelectAtividades(
        select,
        grupo,
        selecionada = "",
        incluirVazio = true
    ) {
        if (!select) {
            return;
        }

        const api =
            obterApiAtividades();

        if (
            api &&
            typeof api.preencherAtividadesEmSelect ===
            "function"
        ) {
            api.preencherAtividadesEmSelect(
                select,
                grupo,
                selecionada,
                incluirVazio
            );

            return;
        }

        select.innerHTML = "";

        if (incluirVazio) {
            select.appendChild(
                new Option(
                    "Selecione",
                    ""
                )
            );
        }

        const atividades =
            window
                .ATIVIDADES_CREDITO_RURAL
                ?.[grupo]
                ?.atividades ||
            [];

        atividades.forEach(
            function (nome) {
                select.appendChild(
                    new Option(
                        nome,
                        normalizarAtividade(
                            nome
                        )
                    )
                );
            }
        );
    }

    function preencherSelectTodasAtividades(
        select,
        selecionada = "",
        incluirVazio = true
    ) {
        if (!select) {
            return;
        }

        const api =
            obterApiAtividades();

        if (
            api &&
            typeof api.preencherTodasAtividadesAgrupadas ===
            "function"
        ) {
            api.preencherTodasAtividadesAgrupadas(
                select,
                selecionada,
                incluirVazio
            );

            return;
        }

        select.innerHTML = "";

        if (incluirVazio) {
            select.appendChild(
                new Option(
                    "Selecione a atividade",
                    ""
                )
            );
        }

        const dados =
            window
                .ATIVIDADES_CREDITO_RURAL ||
            {};

        Object.entries(
            dados
        ).forEach(
            function (
                [grupo, dadosGrupo]
            ) {
                const optgroup =
                    document.createElement(
                        "optgroup"
                    );

                optgroup.label =
                    dadosGrupo.nome;

                (
                    dadosGrupo
                        .atividades ||
                    []
                ).forEach(
                    function (nome) {
                        const atividade =
                            normalizarAtividade(
                                nome
                            );

                        optgroup.appendChild(
                            new Option(
                                nome,
                                `${grupo}|${atividade}`
                            )
                        );
                    }
                );

                select.appendChild(
                    optgroup
                );
            }
        );
    }

    /* =========================================================
       ARQUIVOS
       ========================================================= */

    function adicionarArquivos(
        arquivos
    ) {
        const permitidos =
            arquivos.filter(
                arquivoPermitido
            );

        permitidos.forEach(
            function (arquivo) {
                const existe =
                    arquivosSelecionados.some(
                        function (item) {
                            return (
                                item.name ===
                                arquivo.name &&
                                item.size ===
                                arquivo.size &&
                                item.lastModified ===
                                arquivo.lastModified
                            );
                        }
                    );

                if (!existe) {
                    arquivosSelecionados.push(
                        arquivo
                    );
                }
            }
        );

        if (
            permitidos.length !==
            arquivos.length
        ) {
            exibirMensagemProcessamento(
                "Alguns arquivos foram ignorados porque o formato não é suportado.",
                "atencao"
            );
        }
    }

    function arquivoPermitido(
        arquivo
    ) {
        const extensao =
            obterExtensao(
                arquivo.name
            );

        return [
            "xml",
            "pdf",
            "jpg",
            "jpeg",
            "png",
            "webp"
        ].includes(
            extensao
        );
    }

    function renderizarArquivos() {
        const lista =
            document.getElementById(
                "listaArquivosNotas"
            );

        if (!lista) {
            return;
        }

        lista.innerHTML = "";

        arquivosSelecionados.forEach(
            function (
                arquivo,
                indice
            ) {
                const item =
                    document.createElement(
                        "div"
                    );

                item.className =
                    "notas-arquivo-item";

                item.innerHTML = `
                    <div class="notas-arquivo-info">
                        <strong>
                            ${escaparHtml(
                    arquivo.name
                )}
                        </strong>

                        <span>
                            ${formatarTamanhoArquivo(
                    arquivo.size
                )}
                        </span>
                    </div>

                    <button
                        type="button"
                        class="notas-arquivo-remover"
                        data-indice="${indice}"
                    >
                        Remover
                    </button>
                `;

                const btn =
                    item.querySelector(
                        ".notas-arquivo-remover"
                    );

                btn?.addEventListener(
                    "click",
                    function () {
                        arquivosSelecionados.splice(
                            indice,
                            1
                        );

                        renderizarArquivos();
                    }
                );

                lista.appendChild(
                    item
                );
            }
        );
    }

    /* =========================================================
       PROCESSAMENTO
       ========================================================= */

    async function processarArquivosSelecionados() {
        if (
            processamentoEmAndamento
        ) {
            return;
        }

        if (
            arquivosSelecionados.length ===
            0
        ) {
            exibirMensagemProcessamento(
                "Selecione pelo menos um arquivo.",
                "atencao"
            );

            return;
        }

        const apiNotas =
            obterApiNotas();

        if (!apiNotas) {
            exibirMensagemProcessamento(
                "O módulo credito-rural-notas-fiscais.js não foi carregado.",
                "erro"
            );

            return;
        }

        processamentoEmAndamento =
            true;

        notasProcessadas = [];
        atividadesNotas = [];
        periodosManuais = [];
        periodosNotas = [];

        mostrarStatusProcessamento(
            true,
            "Processando documentos",
            "Preparando os arquivos..."
        );

        try {
            for (
                let i = 0;
                i <
                arquivosSelecionados.length;
                i++
            ) {
                const arquivo =
                    arquivosSelecionados[
                    i
                    ];

                mostrarStatusProcessamento(
                    true,
                    "Processando documentos",
                    `Arquivo ${i + 1} de ${arquivosSelecionados.length}: ${arquivo.name}`
                );

                await processarArquivo(
                    arquivo
                );
            }

            notasProcessadas.forEach(
                prepararClassificacaoNota
            );

            reconstruirAtividadesAutomaticas();
            reconstruirPeriodos();
            renderizarNotasProcessadas();
            renderizarAtividades();
            atualizarResultados();

            const pendentes =
                notasProcessadas.filter(
                    notaRequerRevisao
                ).length;

            if (
                pendentes > 0
            ) {
                exibirMensagemProcessamento(
                    `${notasProcessadas.length} documento(s) processado(s). ${pendentes} documento(s) requer(em) revisão.`,
                    "atencao"
                );
            } else {
                exibirMensagemProcessamento(
                    `${notasProcessadas.length} documento(s) processado(s) automaticamente.`,
                    "sucesso"
                );
            }
        } catch (erro) {
            console.error(
                erro
            );

            exibirMensagemProcessamento(
                `Falha no processamento: ${erro.message || erro}`,
                "erro"
            );
        } finally {
            processamentoEmAndamento =
                false;

            mostrarStatusProcessamento(
                false
            );
        }
    }

    async function processarArquivo(
        arquivo
    ) {
        const extensao =
            obterExtensao(
                arquivo.name
            );

        if (
            extensao ===
            "xml"
        ) {
            await processarXml(
                arquivo
            );

            return;
        }

        if (
            extensao ===
            "pdf"
        ) {
            await processarPdf(
                arquivo
            );

            return;
        }

        await processarImagem(
            arquivo
        );
    }

    /* =========================================================
       XML
       ========================================================= */

    async function processarXml(
        arquivo
    ) {
        const texto =
            await arquivo.text();

        const apiNotas =
            obterApiNotas();

        const resultado =
            apiNotas.interpretarXmlNfe(
                texto,
                arquivo.name
            );

        resultado.arquivoOriginal =
            arquivo.name;

        resultado.pagina =
            null;

        resultado.id =
            gerarId();

        notasProcessadas.push(
            resultado
        );
    }

    /* =========================================================
       PDF.JS
       ========================================================= */

    async function garantirPdfJs() {
        if (
            window.pdfjsLib
        ) {
            configurarWorkerPdf();

            return window.pdfjsLib;
        }

        if (pdfJsPromise) {
            return pdfJsPromise;
        }

        pdfJsPromise =
            new Promise(
                function (
                    resolve,
                    reject
                ) {
                    const script =
                        document.createElement(
                            "script"
                        );

                    script.src =
                        PDFJS_CDN;

                    script.onload =
                        function () {
                            configurarWorkerPdf();

                            resolve(
                                window.pdfjsLib
                            );
                        };

                    script.onerror =
                        function () {
                            reject(
                                new Error(
                                    "Não foi possível carregar o leitor de PDF."
                                )
                            );
                        };

                    document.head.appendChild(
                        script
                    );
                }
            );

        return pdfJsPromise;
    }

    function configurarWorkerPdf() {
        if (
            window.pdfjsLib
                ?.GlobalWorkerOptions
        ) {
            window
                .pdfjsLib
                .GlobalWorkerOptions
                .workerSrc =
                PDFJS_WORKER_CDN;
        }
    }

    /* =========================================================
       PDF
       ========================================================= */

    async function processarPdf(
        arquivo
    ) {
        const pdfjsLib =
            await garantirPdfJs();

        const buffer =
            await arquivo.arrayBuffer();

        const documento =
            await pdfjsLib
                .getDocument({
                    data:
                        new Uint8Array(
                            buffer
                        )
                })
                .promise;

        for (
            let paginaNumero = 1;
            paginaNumero <=
            documento.numPages;
            paginaNumero++
        ) {
            mostrarStatusProcessamento(
                true,
                "Processando PDF",
                `${arquivo.name} — página ${paginaNumero} de ${documento.numPages}`
            );

            const pagina =
                await documento.getPage(
                    paginaNumero
                );

            let texto =
                await extrairTextoPaginaPdf(
                    pagina
                );

            let resultado =
                interpretarTextoDocumento(
                    texto,
                    `${arquivo.name} - Página ${paginaNumero}`
                );

            if (
                deveExecutarOcr(
                    resultado,
                    texto
                )
            ) {
                const textoOcr =
                    await executarOcrPaginaPdf(
                        pagina
                    );

                if (
                    textoOcr
                        .trim()
                        .length >
                    texto
                        .trim()
                        .length *
                    .45
                ) {
                    const resultadoOcr =
                        interpretarTextoDocumento(
                            textoOcr,
                            `${arquivo.name} - Página ${paginaNumero}`
                        );

                    resultado =
                        escolherMelhorResultado(
                            resultado,
                            resultadoOcr
                        );

                    if (
                        resultado ===
                        resultadoOcr
                    ) {
                        texto =
                            textoOcr;
                    }
                }
            }

            resultado.id =
                gerarId();

            resultado.arquivoOriginal =
                arquivo.name;

            resultado.arquivo =
                `${arquivo.name} - Página ${paginaNumero}`;

            resultado.pagina =
                paginaNumero;

            resultado.texto =
                resultado.texto ||
                texto;

            notasProcessadas.push(
                resultado
            );
        }
    }

    async function extrairTextoPaginaPdf(
        pagina
    ) {
        const conteudo =
            await pagina.getTextContent();

        if (
            !conteudo.items ||
            conteudo.items.length ===
            0
        ) {
            return "";
        }

        const linhas = [];

        conteudo.items.forEach(
            function (item) {
                const texto =
                    String(
                        item.str || ""
                    ).trim();

                if (!texto) {
                    return;
                }

                const transform =
                    item.transform ||
                    [];

                const x =
                    Number(
                        transform[4]
                    ) || 0;

                const y =
                    Number(
                        transform[5]
                    ) || 0;

                let linha =
                    linhas.find(
                        function (
                            existente
                        ) {
                            return (
                                Math.abs(
                                    existente.y -
                                    y
                                ) <= 2.2
                            );
                        }
                    );

                if (!linha) {
                    linha = {
                        y,
                        itens: []
                    };

                    linhas.push(
                        linha
                    );
                }

                linha.itens.push({
                    x,
                    texto
                });
            }
        );

        linhas.sort(
            function (a, b) {
                return (
                    b.y -
                    a.y
                );
            }
        );

        return linhas
            .map(
                function (linha) {
                    return linha
                        .itens
                        .sort(
                            function (
                                a,
                                b
                            ) {
                                return (
                                    a.x -
                                    b.x
                                );
                            }
                        )
                        .map(
                            item =>
                                item.texto
                        )
                        .join(" ")
                        .replace(
                            /\s+/g,
                            " "
                        )
                        .trim();
                }
            )
            .filter(Boolean)
            .join("\n");
    }

    async function executarOcrPaginaPdf(
        pagina
    ) {
        if (
            !window.Tesseract
        ) {
            return "";
        }

        const viewport =
            pagina.getViewport({
                scale: 2
            });

        const canvas =
            document.createElement(
                "canvas"
            );

        const contexto =
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
                    contexto,
                viewport
            })
            .promise;

        const resultado =
            await window
                .Tesseract
                .recognize(
                    canvas,
                    "por"
                );

        return (
            resultado
                ?.data
                ?.text ||
            ""
        );
    }

    async function processarImagem(
        arquivo
    ) {
        if (
            !window.Tesseract
        ) {
            throw new Error(
                "Tesseract.js não está disponível para OCR."
            );
        }

        mostrarStatusProcessamento(
            true,
            "Executando OCR",
            arquivo.name
        );

        const resultadoOcr =
            await window
                .Tesseract
                .recognize(
                    arquivo,
                    "por"
                );

        const texto =
            resultadoOcr
                ?.data
                ?.text ||
            "";

        const resultado =
            interpretarTextoDocumento(
                texto,
                arquivo.name
            );

        resultado.id =
            gerarId();

        resultado.arquivoOriginal =
            arquivo.name;

        resultado.pagina =
            null;

        notasProcessadas.push(
            resultado
        );
    }

    /* =========================================================
       INTERPRETAÇÃO
       ========================================================= */

    function interpretarTextoDocumento(
        texto,
        arquivo
    ) {
        const apiNotas =
            obterApiNotas();

        if (
            !apiNotas ||
            typeof apiNotas.interpretar !==
            "function"
        ) {
            throw new Error(
                "Módulo de interpretação fiscal indisponível."
            );
        }

        return apiNotas.interpretar(
            texto,
            arquivo
        );
    }

    function deveExecutarOcr(
        resultado,
        texto
    ) {
        if (
            !texto ||
            texto.trim().length <
            80
        ) {
            return true;
        }

        if (!resultado) {
            return true;
        }

        if (
            resultado.documentoFiscalCompleto &&
            resultado.numero &&
            resultado.data &&
            Number(
                resultado.valor
            ) > 0
        ) {
            return false;
        }

        return (
            !resultado.numero ||
            !resultado.data ||
            Number(
                resultado.valor
            ) <= 0
        );
    }

    function escolherMelhorResultado(
        a,
        b
    ) {
        return (
            pontuarResultado(
                b
            ) >
                pontuarResultado(
                    a
                )
                ? b
                : a
        );
    }

    function pontuarResultado(
        resultado
    ) {
        if (!resultado) {
            return 0;
        }

        let pontos = 0;

        if (
            resultado.numero
        ) {
            pontos += 20;
        }

        if (
            resultado.data
        ) {
            pontos += 20;
        }

        if (
            resultado.emitente
        ) {
            pontos += 10;
        }

        if (
            Number(
                resultado.valor
            ) > 0
        ) {
            pontos += 25;
        }

        if (
            String(
                resultado.chaveAcesso ||
                ""
            ).length ===
            44
        ) {
            pontos += 15;
        }

        if (
            Array.isArray(
                resultado.itens
            ) &&
            resultado.itens.length >
            0
        ) {
            pontos += 20;
        }

        pontos +=
            Math.min(
                10,
                (
                    Number(
                        resultado
                            .qualidadeTexto
                    ) ||
                    0
                ) /
                10
            );

        return pontos;
    }

    /* =========================================================
       CLASSIFICAÇÃO
       ========================================================= */

    function prepararClassificacaoNota(
        nota
    ) {
        nota.id =
            nota.id ||
            gerarId();

        if (
            typeof nota.incluidaCalculo !==
            "boolean"
        ) {
            nota.incluidaCalculo =
                nota.elegivelCalculo !==
                false;
        }

        nota.alocacoesAutomaticas =
            classificarItensNota(
                nota
            );

        nota.alocacaoManual =
            nota.alocacaoManual ||
            null;

        recalcularSituacaoNota(
            nota
        );
    }

    function classificarItensNota(
        nota
    ) {
        const itens =
            Array.isArray(
                nota.itens
            )
                ? nota.itens
                : [];

        if (
            itens.length ===
            0
        ) {
            return normalizarAlocacoesExistentes(
                nota.alocacoesAtividade ||
                [],
                nota.valor
            );
        }

        const classificacoes = [];

        itens.forEach(
            function (
                item,
                indice
            ) {
                const classificacao =
                    classificarItemNota(
                        item
                    );

                if (
                    classificacao &&
                    classificacao.grupo &&
                    classificacao.atividade
                ) {
                    classificacoes.push({
                        indice,
                        item,
                        ...classificacao
                    });
                }
            }
        );

        if (
            classificacoes.length ===
            0
        ) {
            return normalizarAlocacoesExistentes(
                nota.alocacoesAtividade ||
                [],
                nota.valor
            );
        }

        const mapa =
            new Map();

        classificacoes.forEach(
            function (
                classificacao
            ) {
                const chave =
                    criarIdAtividade(
                        classificacao.grupo,
                        classificacao.atividade
                    );

                if (
                    !mapa.has(
                        chave
                    )
                ) {
                    mapa.set(
                        chave,
                        {
                            idAtividade:
                                chave,

                            grupo:
                                classificacao.grupo,

                            atividade:
                                classificacao.atividade,

                            nomeAtividade:
                                classificacao
                                    .nomeAtividade ||
                                obterNomeAtividade(
                                    classificacao
                                        .atividade,
                                    classificacao
                                        .grupo
                                ),

                            valorProdutos:
                                0,

                            indicesItens:
                                [],

                            evidencias:
                                [],

                            confianca:
                                Number(
                                    classificacao
                                        .confianca
                                ) || 0,

                            automatico:
                                classificacao
                                    .automatico !==
                                false
                        }
                    );
                }

                const atual =
                    mapa.get(
                        chave
                    );

                atual.valorProdutos +=
                    Number(
                        classificacao
                            .item
                            ?.valorProduto
                    ) || 0;

                atual.indicesItens.push(
                    classificacao.indice
                );

                atual.confianca =
                    Math.max(
                        atual.confianca,
                        Number(
                            classificacao
                                .confianca
                        ) || 0
                    );

                atual.automatico =
                    atual.automatico &&
                    classificacao
                        .automatico !==
                    false;

                (
                    classificacao
                        .evidencias ||
                    []
                ).forEach(
                    function (
                        evidencia
                    ) {
                        if (
                            !atual
                                .evidencias
                                .includes(
                                    evidencia
                                )
                        ) {
                            atual
                                .evidencias
                                .push(
                                    evidencia
                                );
                        }
                    }
                );
            }
        );

        const alocacoes =
            Array.from(
                mapa.values()
            );

        const indicesClassificados =
            new Set();

        alocacoes.forEach(
            function (item) {
                item.indicesItens.forEach(
                    indice =>
                        indicesClassificados.add(
                            indice
                        )
                );
            }
        );

        const todosItensClassificados =
            indicesClassificados.size ===
            itens.length;

        const totalProdutosClassificados =
            alocacoes.reduce(
                function (
                    total,
                    item
                ) {
                    return (
                        total +
                        (
                            Number(
                                item.valorProdutos
                            ) || 0
                        )
                    );
                },
                0
            );

        const valorNota =
            Number(
                nota.valor
            ) || 0;

        if (
            todosItensClassificados &&
            totalProdutosClassificados >
            0 &&
            valorNota > 0
        ) {
            alocacoes.forEach(
                function (item) {
                    item.valor =
                        (
                            item.valorProdutos /
                            totalProdutosClassificados
                        ) *
                        valorNota;
                }
            );
        } else {
            alocacoes.forEach(
                function (item) {
                    item.valor =
                        Number(
                            item.valorProdutos
                        ) || 0;
                }
            );
        }

        alocacoes.forEach(
            function (item) {
                item.completa =
                    todosItensClassificados;
            }
        );

        return alocacoes;
    }

    function classificarItemNota(
        item
    ) {
        const apiNcm =
            obterApiNcm();

        if (
            apiNcm &&
            typeof apiNcm.classificarItem ===
            "function"
        ) {
            try {
                const resultado =
                    apiNcm.classificarItem(
                        item
                    );

                if (
                    resultado &&
                    resultado.identificado &&
                    resultado.grupo &&
                    resultado.atividade
                ) {
                    return resultado;
                }
            } catch (erro) {
                console.warn(
                    "Falha na classificação central do item.",
                    erro
                );
            }
        }

        const bovino =
            classificarBovinoPorDescricao(
                item
            );

        if (bovino) {
            return bovino;
        }

        return null;
    }

    /* =========================================================
       BOVINOCULTURA
       ========================================================= */

    function classificarBovinoPorDescricao(
        item
    ) {
        const descricao =
            normalizarTextoComparacao(
                item?.descricao ||
                ""
            );

        const ncm =
            String(
                item?.ncm ||
                ""
            ).replace(
                /\D/g,
                ""
            );

        if (
            !descricao.includes(
                "BOVINO"
            ) &&
            !ncm.startsWith(
                "0102"
            )
        ) {
            return null;
        }

        if (
            descricao.includes(
                "CONFINAMENTO"
            ) ||
            descricao.includes(
                "CONFINADO"
            )
        ) {
            return criarClassificacao(
                "pecuaria",
                "Bovinocultura Corte - Confinamento",
                .99,
                "Descrição fiscal: bovino em confinamento"
            );
        }

        if (
            descricao.includes(
                "BUFALO"
            ) ||
            descricao.includes(
                "BUFALA"
            ) ||
            descricao.includes(
                "BUBALIN"
            )
        ) {
            return criarClassificacao(
                "pecuaria",
                "Bubalinocultura Corte",
                .98,
                "Descrição fiscal bubalina"
            );
        }

        const faixa =
            extrairFaixaEtaria(
                descricao
            );

        if (faixa) {
            if (
                faixa.max <=
                8
            ) {
                return criarClassificacao(
                    "pecuaria",
                    "Bovinocultura Corte - Cria",
                    .99,
                    `Faixa etária ${faixa.min} a ${faixa.max} meses`
                );
            }

            if (
                faixa.min >=
                9 &&
                faixa.max <=
                24
            ) {
                return criarClassificacao(
                    "pecuaria",
                    "Bovinocultura Corte - Recria",
                    .99,
                    `Faixa etária ${faixa.min} a ${faixa.max} meses`
                );
            }

            if (
                faixa.min >
                24
            ) {
                return criarClassificacao(
                    "pecuaria",
                    "Bovinocultura Corte - Engorda",
                    .99,
                    `Faixa etária acima de ${faixa.min - 1} meses`
                );
            }

            if (
                faixa.min <=
                24 &&
                faixa.max >
                24
            ) {
                return criarClassificacao(
                    "pecuaria",
                    "Bovinocultura Corte - Recria/Engorda",
                    .96,
                    "Faixa etária entre recria e engorda"
                );
            }
        }

        if (
            descricao.includes(
                "BEZERRO"
            ) ||
            descricao.includes(
                "BEZERRA"
            )
        ) {
            return criarClassificacao(
                "pecuaria",
                "Bovinocultura Corte - Cria",
                .92,
                "Descrição fiscal: bezerro/bezerra"
            );
        }

        if (
            descricao.includes(
                "GARROTE"
            ) ||
            descricao.includes(
                "NOVILHA"
            )
        ) {
            return criarClassificacao(
                "pecuaria",
                "Bovinocultura Corte - Recria",
                .90,
                "Descrição fiscal: garrote/novilha"
            );
        }

        if (
            descricao.includes(
                "BOI GORDO"
            ) ||
            descricao.includes(
                "VACA GORDA"
            ) ||
            descricao.includes(
                "ACIMA DE 36"
            )
        ) {
            return criarClassificacao(
                "pecuaria",
                "Bovinocultura Corte - Engorda",
                .96,
                "Descrição fiscal compatível com engorda"
            );
        }

        return null;
    }

    function extrairFaixaEtaria(
        descricao
    ) {
        const texto =
            normalizarTextoComparacao(
                descricao
            );

        let match =
            texto.match(
                /(\d{1,2})\s*(?:A|ATE)\s*(\d{1,2})\s*MESES/
            );

        if (match) {
            return {
                min:
                    Number(
                        match[1]
                    ),

                max:
                    Number(
                        match[2]
                    )
            };
        }

        match =
            texto.match(
                /ACIMA\s+DE\s+(\d{1,2})\s*MESES/
            );

        if (match) {
            return {
                min:
                    Number(
                        match[1]
                    ) +
                    1,

                max:
                    120
            };
        }

        match =
            texto.match(
                /ATE\s+(\d{1,2})\s*MESES/
            );

        if (match) {
            return {
                min:
                    0,

                max:
                    Number(
                        match[1]
                    )
            };
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

            return {
                min:
                    idade,

                max:
                    idade
            };
        }

        return null;
    }

    function criarClassificacao(
        grupo,
        nomeAtividade,
        confianca,
        evidencia
    ) {
        const localizada =
            localizarAtividade(
                nomeAtividade,
                grupo
            );

        if (!localizada) {
            return null;
        }

        return {
            identificado:
                true,

            grupo:
                localizada.grupo,

            atividade:
                localizada.atividade,

            nomeAtividade:
                localizada.nomeAtividade,

            confianca,

            automatico:
                true,

            evidencias: [
                evidencia
            ]
        };
    }

    /* =========================================================
       ALOCAÇÕES EXISTENTES
       ========================================================= */

    function normalizarAlocacoesExistentes(
        alocacoes,
        valorNota
    ) {
        if (
            !Array.isArray(
                alocacoes
            )
        ) {
            return [];
        }

        const validas =
            alocacoes.filter(
                function (item) {
                    return (
                        item &&
                        item.grupo &&
                        item.atividade &&
                        item.automatico !==
                        false
                    );
                }
            );

        if (
            validas.length ===
            0
        ) {
            return [];
        }

        /*
         * Se existe apenas uma atividade, o valor integral
         * da NF pode ser utilizado quando a alocação não
         * possuir valor próprio.
         */
        if (
            validas.length ===
            1
        ) {
            const item =
                validas[0];

            return [{
                idAtividade:
                    criarIdAtividade(
                        item.grupo,
                        item.atividade
                    ),

                grupo:
                    item.grupo,

                atividade:
                    item.atividade,

                nomeAtividade:
                    item.nomeAtividade ||
                    obterNomeAtividade(
                        item.atividade,
                        item.grupo
                    ),

                valor:
                    Number(
                        item.valor
                    ) ||
                    Number(
                        valorNota
                    ) ||
                    0,

                valorProdutos:
                    Number(
                        item.valorProdutos
                    ) ||
                    0,

                indicesItens:
                    item.indicesItens ||
                    [],

                evidencias:
                    item.evidencias ||
                    [],

                confianca:
                    Number(
                        item.confianca
                    ) || 0,

                automatico:
                    true,

                completa:
                    true
            }];
        }

        /*
         * Mais de uma atividade:
         * nunca replica o valor integral da NF para cada
         * atividade. Usa os valores efetivamente alocados.
         */
        const totalValores =
            validas.reduce(
                function (
                    soma,
                    item
                ) {
                    return (
                        soma +
                        (
                            Number(
                                item.valor
                            ) ||
                            Number(
                                item.valorProdutos
                            ) ||
                            0
                        )
                    );
                },
                0
            );

        const valorTotalNota =
            Number(
                valorNota
            ) || 0;

        return validas.map(
            function (item) {
                const valorBase =
                    Number(
                        item.valor
                    ) ||
                    Number(
                        item.valorProdutos
                    ) ||
                    0;

                let valor =
                    valorBase;

                if (
                    valorTotalNota >
                    0 &&
                    totalValores >
                    0
                ) {
                    valor =
                        (
                            valorBase /
                            totalValores
                        ) *
                        valorTotalNota;
                }

                return {
                    idAtividade:
                        criarIdAtividade(
                            item.grupo,
                            item.atividade
                        ),

                    grupo:
                        item.grupo,

                    atividade:
                        item.atividade,

                    nomeAtividade:
                        item.nomeAtividade ||
                        obterNomeAtividade(
                            item.atividade,
                            item.grupo
                        ),

                    valor:
                        valor,

                    valorProdutos:
                        Number(
                            item.valorProdutos
                        ) ||
                        0,

                    indicesItens:
                        item.indicesItens ||
                        [],

                    evidencias:
                        item.evidencias ||
                        [],

                    confianca:
                        Number(
                            item.confianca
                        ) || 0,

                    automatico:
                        true,

                    completa:
                        totalValores >
                        0
                };
            }
        );
    }

    /* =========================================================
       SITUAÇÃO
       ========================================================= */

    function recalcularSituacaoNota(
        nota
    ) {
        const valorNota =
            Number(
                nota.valor
            ) || 0;

        const totalAutomatico =
            (
                nota.alocacoesAutomaticas ||
                []
            ).reduce(
                function (
                    total,
                    item
                ) {
                    return (
                        total +
                        (
                            Number(
                                item.valor
                            ) || 0
                        )
                    );
                },
                0
            );

        const valorManual =
            Number(
                nota
                    .alocacaoManual
                    ?.valor
            ) || 0;

        nota.valorAlocado =
            totalAutomatico +
            valorManual;

        nota.valorPendente =
            Math.max(
                0,
                valorNota -
                nota.valorAlocado
            );

        if (
            nota.valorPendente <=
            TOLERANCIA_VALOR
        ) {
            nota.valorPendente =
                0;
        }

        nota.documentoCompleto =
            Boolean(
                nota.numero &&
                nota.data &&
                valorNota > 0
            );

        nota.atividadeCompleta =
            Boolean(
                nota.valorPendente ===
                0 &&
                (
                    (
                        nota.alocacoesAutomaticas ||
                        []
                    ).length >
                    0 ||
                    nota.alocacaoManual
                )
            );

        nota.processadaAutomaticamente =
            Boolean(
                nota.documentoCompleto &&
                nota.atividadeCompleta &&
                !nota.alocacaoManual
            );

        nota.requerConferencia =
            !nota.documentoCompleto ||
            !nota.atividadeCompleta ||
            Boolean(
                nota.requerConferenciaElegibilidade
            );
    }

    function notaRequerRevisao(
        nota
    ) {
        return Boolean(
            nota.requerConferencia
        );
    }

    /* =========================================================
       ATIVIDADES
       ========================================================= */

    function reconstruirAtividadesAutomaticas() {
        notasProcessadas.forEach(
            function (nota) {
                if (
                    nota.incluidaCalculo ===
                    false
                ) {
                    return;
                }

                (
                    nota.alocacoesAutomaticas ||
                    []
                ).forEach(
                    function (
                        alocacao
                    ) {
                        garantirAtividade(
                            alocacao.grupo,
                            alocacao.atividade,
                            alocacao.nomeAtividade,
                            true
                        );
                    }
                );

                if (
                    nota.alocacaoManual
                ) {
                    garantirAtividade(
                        nota.alocacaoManual.grupo,
                        nota.alocacaoManual.atividade,
                        nota.alocacaoManual.nomeAtividade,
                        false
                    );
                }
            }
        );
    }

    function garantirAtividade(
        grupo,
        atividade,
        nomeAtividade,
        automatica = false
    ) {
        if (
            !grupo ||
            !atividade
        ) {
            return null;
        }

        const id =
            criarIdAtividade(
                grupo,
                atividade
            );

        let existente =
            atividadesNotas.find(
                item =>
                    item.id ===
                    id
            );

        if (existente) {
            if (automatica) {
                existente.automatica =
                    true;
            }

            garantirMesesOriginais(
                existente
            );

            return existente;
        }

        existente = {
            id,

            grupo,

            atividade:
                normalizarAtividade(
                    atividade
                ),

            nomeAtividade:
                nomeAtividade ||
                obterNomeAtividade(
                    atividade,
                    grupo
                ),

            criterio:
                "",

            mesesOriginais:
                0,

            mesesInformados:
                0,

            automatica:
                automatica
        };

        atividadesNotas.push(
            existente
        );

        ordenarAtividades();

        return existente;
    }

    function garantirMesesOriginais(
        atividade
    ) {
        const original =
            Number(
                atividade.mesesOriginais
            );

        if (
            !Number.isFinite(
                original
            ) ||
            original <
            0
        ) {
            atividade.mesesOriginais =
                0;
        }

        const informado =
            Number(
                atividade.mesesInformados
            );

        if (
            !Number.isFinite(
                informado
            ) ||
            informado <
            0
        ) {
            atividade.mesesInformados =
                0;
        }

        return Number(
            atividade.mesesOriginais
        ) || 0;
    }

    function restaurarMesesOriginais(
        atividade
    ) {
        const original =
            garantirMesesOriginais(
                atividade
            );

        atividade.mesesInformados =
            original;

        return original;
    }

    function ordenarAtividades() {
        atividadesNotas.sort(
            function (a, b) {
                const grupo =
                    obterNomeGrupo(
                        a.grupo
                    ).localeCompare(
                        obterNomeGrupo(
                            b.grupo
                        ),
                        "pt-BR"
                    );

                if (grupo !== 0) {
                    return grupo;
                }

                return String(
                    a.nomeAtividade
                ).localeCompare(
                    String(
                        b.nomeAtividade
                    ),
                    "pt-BR"
                );
            }
        );
    }

    /* =========================================================
       ADICIONAR ATIVIDADE
       ========================================================= */

    function adicionarAtividadeManual() {
        const grupoSelect =
            document.getElementById(
                "grupoAtividadeNotas"
            );

        const atividadeSelect =
            document.getElementById(
                "atividadeNotas"
            );

        const criterioSelect =
            document.getElementById(
                "criterioAtividadeNotas"
            );

        const mesesInput =
            document.getElementById(
                "mesesAtividadeNotas"
            );

        if (
            !grupoSelect ||
            !atividadeSelect
        ) {
            return;
        }

        const grupo =
            grupoSelect.value;

        const atividade =
            atividadeSelect.value;

        if (
            !grupo ||
            !atividade
        ) {
            exibirMensagemProcessamento(
                "Selecione o grupo e a atividade.",
                "atencao"
            );

            return;
        }

        const nomeAtividade =
            obterNomeAtividade(
                atividade,
                grupo
            );

        const item =
            garantirAtividade(
                grupo,
                atividade,
                nomeAtividade,
                false
            );

        if (!item) {
            return;
        }

        garantirMesesOriginais(
            item
        );

        item.criterio =
            criterioSelect?.value ||
            "";

        if (
            item.criterio ===
            CRITERIOS_APURACAO.INFORMADO
        ) {
            item.mesesInformados =
                Math.max(
                    0,
                    parseInt(
                        mesesInput?.value,
                        10
                    ) ||
                    0
                );
        } else {
            restaurarMesesOriginais(
                item
            );
        }

        renderizarAtividades();
        atualizarSelectAtividadePeriodo();
        atualizarResultados();
    }

    function atualizarVisibilidadeMesesAtividade() {
        const criterio =
            document.getElementById(
                "criterioAtividadeNotas"
            );

        const campo =
            document.getElementById(
                "campoMesesAtividadeNotas"
            );

        const input =
            document.getElementById(
                "mesesAtividadeNotas"
            );

        if (
            !criterio ||
            !campo
        ) {
            return;
        }

        const informado =
            criterio.value ===
            CRITERIOS_APURACAO.INFORMADO;

        campo.hidden =
            !informado;

        if (
            !informado &&
            input
        ) {
            input.value =
                "";
        }
    }

    /* =========================================================
       RENDERIZA ATIVIDADES
       ========================================================= */

    function renderizarAtividades() {
        const tbody =
            document.getElementById(
                "tabelaAtividadesNotas"
            );

        if (!tbody) {
            return;
        }

        tbody.innerHTML = "";

        if (
            atividadesNotas.length ===
            0
        ) {
            tbody.innerHTML = `
                <tr class="notas-linha-vazia">
                    <td colspan="7">
                        Nenhuma atividade identificada.
                    </td>
                </tr>
            `;

            atualizarSelectAtividadePeriodo();

            return;
        }

        atividadesNotas.forEach(
            function (atividade) {
                garantirMesesOriginais(
                    atividade
                );

                if (
                    atividade.criterio !==
                    CRITERIOS_APURACAO.INFORMADO
                ) {
                    restaurarMesesOriginais(
                        atividade
                    );
                }

                const calculo =
                    calcularRendaAtividade(
                        atividade
                    );

                const valorExibidoMeses =
                    atividade.criterio ===
                        CRITERIOS_APURACAO.INFORMADO
                        ? (
                            Number(
                                atividade.mesesInformados
                            ) >
                                0
                                ? atividade.mesesInformados
                                : ""
                        )
                        : "";

                const tr =
                    document.createElement(
                        "tr"
                    );

                tr.innerHTML = `
                    <td>
                        ${escaparHtml(
                    obterNomeGrupo(
                        atividade.grupo
                    )
                )}
                    </td>

                    <td>
                        <strong>
                            ${escaparHtml(
                    atividade.nomeAtividade
                )}
                        </strong>

                        ${atividade.automatica
                        ? `
                                    <small class="notas-origem-automatica">
                                        Identificada automaticamente
                                    </small>
                                `
                        : ""
                    }
                    </td>

                    <td>
                        <select
                            class="notas-input-tabela atividade-criterio-editar"
                        >
                            ${gerarOpcoesCriterio(
                        atividade.criterio
                    )}
                        </select>
                    </td>

                    <td>
                        <input
                            type="number"
                            min="1"
                            max="120"
                            class="notas-input-tabela atividade-meses-editar"
                            value="${escaparHtml(
                        valorExibidoMeses
                    )}"
                            ${atividade.criterio ===
                        CRITERIOS_APURACAO.INFORMADO
                        ? ""
                        : "disabled"
                    }
                        >
                    </td>

                    <td>
                        ${calculo.valido
                        ? calculo.meses
                        : "Pendente"
                    }
                    </td>

                    <td>
                        <strong>
                            ${calculo.valido
                        ? formatarMoeda(
                            calculo.rendaMensal
                        )
                        : "Pendente"
                    }
                        </strong>

                        ${!calculo.valido
                        ? `
                                <small>
                                    ${escaparHtml(
                            calculo.mensagem
                        )}
                                </small>
                            `
                        : ""
                    }
                    </td>

                    <td class="notas-coluna-acoes">
                        <button
                            type="button"
                            class="notas-btn-remover"
                        >
                            Remover
                        </button>
                    </td>
                `;

                const selectCriterio =
                    tr.querySelector(
                        ".atividade-criterio-editar"
                    );

                const inputMeses =
                    tr.querySelector(
                        ".atividade-meses-editar"
                    );

                const btnRemover =
                    tr.querySelector(
                        ".notas-btn-remover"
                    );

                selectCriterio
                    ?.addEventListener(
                        "change",
                        function () {
                            const novoCriterio =
                                this.value;

                            atividade.criterio =
                                novoCriterio;

                            garantirMesesOriginais(
                                atividade
                            );

                            if (
                                novoCriterio ===
                                CRITERIOS_APURACAO.INFORMADO
                            ) {
                                if (
                                    !Number.isFinite(
                                        Number(
                                            atividade.mesesInformados
                                        )
                                    ) ||
                                    Number(
                                        atividade.mesesInformados
                                    ) <=
                                    0
                                ) {
                                    atividade.mesesInformados =
                                        atividade.mesesOriginais >
                                            0
                                            ? atividade.mesesOriginais
                                            : MESES_PADRAO_ATIVIDADE;
                                }

                                if (inputMeses) {
                                    inputMeses.disabled =
                                        false;

                                    inputMeses.value =
                                        String(
                                            atividade.mesesInformados
                                        );
                                }
                            } else {
                                restaurarMesesOriginais(
                                    atividade
                                );

                                if (inputMeses) {
                                    inputMeses.value =
                                        "";

                                    inputMeses.disabled =
                                        true;
                                }
                            }

                            atualizarResultados();
                        }
                    );

                inputMeses
                    ?.addEventListener(
                        "change",
                        function () {
                            garantirMesesOriginais(
                                atividade
                            );

                            if (
                                atividade.criterio !==
                                CRITERIOS_APURACAO.INFORMADO
                            ) {
                                restaurarMesesOriginais(
                                    atividade
                                );

                                this.value =
                                    "";

                                this.disabled =
                                    true;

                                atualizarResultados();

                                return;
                            }

                            const informado =
                                parseInt(
                                    this.value,
                                    10
                                );

                            const valor =
                                Number.isFinite(
                                    informado
                                )
                                    ? Math.max(
                                        1,
                                        Math.min(
                                            120,
                                            informado
                                        )
                                    )
                                    : 0;

                            atividade.mesesInformados =
                                valor;

                            this.value =
                                valor > 0
                                    ? String(
                                        valor
                                    )
                                    : "";

                            atualizarResultados();
                        }
                    );

                btnRemover
                    ?.addEventListener(
                        "click",
                        function () {
                            removerAtividade(
                                atividade.id
                            );
                        }
                    );

                tbody.appendChild(
                    tr
                );
            }
        );

        atualizarSelectAtividadePeriodo();
    }

    function removerAtividade(
        id
    ) {
        const emUso =
            notasProcessadas.some(
                function (nota) {
                    const automatica =
                        (
                            nota.alocacoesAutomaticas ||
                            []
                        ).some(
                            alocacao =>
                                alocacao.idAtividade ===
                                id
                        );

                    const manual =
                        nota.alocacaoManual
                            ?.idAtividade ===
                        id;

                    return (
                        automatica ||
                        manual
                    );
                }
            );

        if (emUso) {
            exibirMensagemProcessamento(
                "A atividade não pode ser removida porque está vinculada a notas fiscais.",
                "atencao"
            );

            return;
        }

        atividadesNotas =
            atividadesNotas.filter(
                item =>
                    item.id !==
                    id
            );

        periodosManuais =
            periodosManuais.filter(
                item =>
                    item.atividadeId !==
                    id
            );

        reconstruirPeriodos();
        renderizarAtividades();
        atualizarResultados();
    }

    function gerarOpcoesCriterio(
        selecionado
    ) {
        return [
            {
                valor: "",
                texto:
                    "Selecione a forma de apuração"
            },
            {
                valor:
                    CRITERIOS_APURACAO.INFORMADO,

                texto:
                    "Período econômico representado"
            },
            {
                valor:
                    CRITERIOS_APURACAO.MOVIMENTACAO,

                texto:
                    "Meses comprovados pelas notas"
            },
            {
                valor:
                    CRITERIOS_APURACAO.INTERVALO,

                texto:
                    "Intervalo entre primeira e última competência"
            }
        ]
            .map(
                function (item) {
                    return `
                        <option
                            value="${item.valor}"
                            ${item.valor ===
                            selecionado
                            ? "selected"
                            : ""
                        }
                        >
                            ${item.texto}
                        </option>
                    `;
                }
            )
            .join("");
    }

    /* =========================================================
       PERÍODO MANUAL
       ========================================================= */

    function adicionarPeriodoManual() {
        const atividadeSelect =
            document.getElementById(
                "atividadePeriodoNota"
            );

        const periodoInput =
            document.getElementById(
                "periodoNota"
            );

        const valorInput =
            document.getElementById(
                "valorPeriodoNota"
            );

        const quantidadeInput =
            document.getElementById(
                "quantidadeNotasPeriodo"
            );

        if (
            !atividadeSelect ||
            !periodoInput ||
            !valorInput
        ) {
            return;
        }

        const atividadeId =
            atividadeSelect.value;

        const periodo =
            normalizarPeriodoInformado(
                periodoInput.value
            );

        const valor =
            moedaParaNumero(
                valorInput.value
            );

        const quantidade =
            Math.max(
                0,
                parseInt(
                    quantidadeInput?.value,
                    10
                ) ||
                0
            );

        if (!atividadeId) {
            exibirMensagemProcessamento(
                "Selecione a atividade do período.",
                "atencao"
            );

            return;
        }

        if (!periodo) {
            exibirMensagemProcessamento(
                "Informe um período válido.",
                "atencao"
            );

            periodoInput.focus();

            return;
        }

        if (
            valor <=
            0
        ) {
            exibirMensagemProcessamento(
                "Informe um valor maior que zero.",
                "atencao"
            );

            valorInput.focus();

            return;
        }

        periodosManuais.push({
            id:
                gerarId(),

            atividadeId,

            competencia:
                periodo.competencia,

            periodo:
                periodo.exibicao,

            valor,

            quantidade,

            origem:
                ORIGEM_PERIODO.MANUAL
        });

        periodoInput.value =
            "";

        valorInput.value =
            "";

        if (
            quantidadeInput
        ) {
            quantidadeInput.value =
                "0";
        }

        reconstruirPeriodos();
        atualizarResultados();
    }

    /* =========================================================
       CONSOLIDAÇÃO
       ========================================================= */

    function reconstruirPeriodos() {
        const mapa =
            new Map();

        notasProcessadas.forEach(
            function (nota) {
                if (
                    nota.incluidaCalculo ===
                    false ||
                    !nota.competencia ||
                    Number(
                        nota.valor
                    ) <=
                    0
                ) {
                    return;
                }

                const alocacoes = [
                    ...(
                        nota.alocacoesAutomaticas ||
                        []
                    )
                ];

                if (
                    nota.alocacaoManual
                ) {
                    alocacoes.push(
                        nota.alocacaoManual
                    );
                }

                alocacoes.forEach(
                    function (
                        alocacao
                    ) {
                        if (
                            !alocacao.idAtividade ||
                            Number(
                                alocacao.valor
                            ) <=
                            0
                        ) {
                            return;
                        }

                        const chave =
                            `${alocacao.idAtividade}|${nota.competencia}`;

                        if (
                            !mapa.has(
                                chave
                            )
                        ) {
                            mapa.set(
                                chave,
                                {
                                    id:
                                        chave,

                                    atividadeId:
                                        alocacao.idAtividade,

                                    competencia:
                                        nota.competencia,

                                    periodo:
                                        formatarCompetencia(
                                            nota.competencia
                                        ),

                                    valor:
                                        0,

                                    quantidade:
                                        0,

                                    notasIds:
                                        new Set(),

                                    origem:
                                        ORIGEM_PERIODO.AUTOMATICO
                                }
                            );
                        }

                        const periodo =
                            mapa.get(
                                chave
                            );

                        periodo.valor +=
                            Number(
                                alocacao.valor
                            ) ||
                            0;

                        periodo.notasIds.add(
                            nota.id
                        );

                        periodo.quantidade =
                            periodo.notasIds.size;
                    }
                );
            }
        );

        periodosManuais.forEach(
            function (manual) {
                const chave =
                    `${manual.atividadeId}|${manual.competencia}`;

                if (
                    !mapa.has(
                        chave
                    )
                ) {
                    mapa.set(
                        chave,
                        {
                            id:
                                manual.id,

                            atividadeId:
                                manual.atividadeId,

                            competencia:
                                manual.competencia,

                            periodo:
                                manual.periodo,

                            valor:
                                0,

                            quantidade:
                                0,

                            notasIds:
                                new Set(),

                            origem:
                                ORIGEM_PERIODO.MANUAL
                        }
                    );
                }

                const periodo =
                    mapa.get(
                        chave
                    );

                periodo.valor +=
                    Number(
                        manual.valor
                    ) ||
                    0;

                periodo.quantidade +=
                    Number(
                        manual.quantidade
                    ) ||
                    0;

                if (
                    periodo.origem ===
                    ORIGEM_PERIODO.AUTOMATICO
                ) {
                    periodo.origem =
                        "misto";
                }
            }
        );

        periodosNotas =
            Array.from(
                mapa.values()
            )
                .map(
                    function (item) {
                        return {
                            ...item,

                            notasIds:
                                Array.from(
                                    item.notasIds ||
                                    []
                                )
                        };
                    }
                )
                .sort(
                    ordenarPeriodos
                );

        renderizarPeriodos();
    }

    function ordenarPeriodos(
        a,
        b
    ) {
        const competencia =
            String(
                a.competencia
            ).localeCompare(
                String(
                    b.competencia
                )
            );

        if (
            competencia !==
            0
        ) {
            return competencia;
        }

        return String(
            a.atividadeId
        ).localeCompare(
            String(
                b.atividadeId
            )
        );
    }

    /* =========================================================
       RENDERIZA PERÍODOS
       ========================================================= */

    function renderizarPeriodos() {
        const tbody =
            document.getElementById(
                "tabelaPeriodosNotas"
            );

        if (!tbody) {
            atualizarTotalizadoresPeriodo();

            return;
        }

        tbody.innerHTML = "";

        if (
            periodosNotas.length ===
            0
        ) {
            tbody.innerHTML = `
                <tr class="notas-linha-vazia">
                    <td colspan="5">
                        Nenhum período informado.
                    </td>
                </tr>
            `;

            atualizarTotalizadoresPeriodo();

            return;
        }

        periodosNotas.forEach(
            function (periodo) {
                const atividade =
                    obterAtividadePorId(
                        periodo.atividadeId
                    );

                const tr =
                    document.createElement(
                        "tr"
                    );

                const podeRemover =
                    periodo.origem ===
                    ORIGEM_PERIODO.MANUAL ||
                    periodo.origem ===
                    "misto";

                tr.innerHTML = `
                    <td>
                        ${escaparHtml(
                    atividade?.nomeAtividade ||
                    "Atividade não identificada"
                )}
                    </td>

                    <td>
                        ${escaparHtml(
                    periodo.periodo
                )}
                    </td>

                    <td>
                        ${formatarMoeda(
                    periodo.valor
                )}
                    </td>

                    <td>
                        ${periodo.quantidade}
                    </td>

                    <td class="notas-coluna-acoes">
                        ${podeRemover
                        ? `
                                    <button
                                        type="button"
                                        class="notas-btn-remover"
                                    >
                                        Remover
                                    </button>
                                `
                        : `
                                    <span>
                                        Automático
                                    </span>
                                `
                    }
                    </td>
                `;

                if (podeRemover) {
                    tr
                        .querySelector(
                            ".notas-btn-remover"
                        )
                        ?.addEventListener(
                            "click",
                            function () {
                                removerPeriodoManualDaCompetencia(
                                    periodo.atividadeId,
                                    periodo.competencia
                                );
                            }
                        );
                }

                tbody.appendChild(
                    tr
                );
            }
        );

        atualizarTotalizadoresPeriodo();
    }

    function removerPeriodoManualDaCompetencia(
        atividadeId,
        competencia
    ) {
        periodosManuais =
            periodosManuais.filter(
                function (
                    item
                ) {
                    return !(
                        item.atividadeId ===
                        atividadeId &&
                        item.competencia ===
                        competencia
                    );
                }
            );

        reconstruirPeriodos();
        atualizarResultados();
    }

    /* =========================================================
       TOTALIZADORES
       ========================================================= */

    function atualizarTotalizadoresPeriodo() {
        const totalNotas =
            calcularTotalNotas();

        const quantidadeNotas =
            notasProcessadas
                .filter(
                    nota =>
                        nota.incluidaCalculo !==
                        false &&
                        Number(
                            nota.valor
                        ) >
                        0
                )
                .length +
            periodosManuais.reduce(
                function (
                    total,
                    item
                ) {
                    return (
                        total +
                        (
                            Number(
                                item.quantidade
                            ) ||
                            0
                        )
                    );
                },
                0
            );

        const competencias =
            new Set(
                periodosNotas.map(
                    item =>
                        item.competencia
                )
            );

        definirTexto(
            "totalNotasPeriodos",
            formatarMoeda(
                totalNotas
            )
        );

        definirTexto(
            "quantidadeTotalNotas",
            String(
                quantidadeNotas
            )
        );

        definirTexto(
            "quantidadePeriodosNotas",
            String(
                competencias.size
            )
        );
    }

    /* =========================================================
       DETALHAMENTO
       ========================================================= */

    function renderizarNotasProcessadas() {
        const tbody =
            document.getElementById(
                "tabelaDetalhamentoNotas"
            );

        const aviso =
            document.getElementById(
                "avisoRevisaoHumanaNotas"
            );

        if (!tbody) {
            return;
        }

        tbody.innerHTML = "";

        if (
            notasProcessadas.length ===
            0
        ) {
            tbody.innerHTML = `
                <tr class="notas-linha-vazia">
                    <td colspan="9">
                        Nenhuma nota fiscal processada.
                    </td>
                </tr>
            `;

            if (aviso) {
                aviso.hidden =
                    true;
            }

            return;
        }

        const possuiPendencia =
            notasProcessadas.some(
                notaRequerRevisao
            );

        if (aviso) {
            aviso.hidden =
                !possuiPendencia;
        }

        notasProcessadas.forEach(
            function (nota) {
                recalcularSituacaoNota(
                    nota
                );

                const tr =
                    document.createElement(
                        "tr"
                    );

                tr.className =
                    nota.requerConferencia
                        ? "nota-requer-revisao"
                        : "nota-processada-automaticamente";

                const atividadeHtml =
                    gerarHtmlAtividadeNota(
                        nota
                    );

                const status =
                    obterStatusNota(
                        nota
                    );

                tr.innerHTML = `
                    <td>
                        <strong>
                            ${escaparHtml(
                    nota.arquivo ||
                    nota.arquivoOriginal ||
                    ""
                )}
                        </strong>

                        <small>
                            ${escaparHtml(
                    nota.modeloDescricao ||
                    ""
                )}
                        </small>
                    </td>

                    <td>
                        ${escaparHtml(
                    nota.data ||
                    "-"
                )}
                    </td>

                    <td>
                        ${escaparHtml(
                    nota.numero ||
                    "-"
                )}
                    </td>

                    <td>
                        ${escaparHtml(
                    nota.emitente ||
                    "-"
                )}
                    </td>

                    <td>
                        ${escaparHtml(
                    nota.naturezaOperacao ||
                    "Não identificada"
                )}

                        ${nota.motivoElegibilidade
                        ? `
                                <small>
                                    ${escaparHtml(
                            nota.motivoElegibilidade
                        )}
                                </small>
                            `
                        : ""
                    }
                    </td>

                    <td>
                        ${Number(
                        nota.valor
                    ) >
                        0
                        ? formatarMoeda(
                            nota.valor
                        )
                        : "-"
                    }
                    </td>

                    <td class="nota-coluna-atividade">
                        ${atividadeHtml}
                    </td>

                    <td>
                        <label class="opcao-simulacao">
                            <input
                                type="checkbox"
                                class="nota-incluir-calculo"
                                data-nota-id="${nota.id}"
                                ${nota.incluidaCalculo !==
                        false
                        ? "checked"
                        : ""
                    }
                            >

                            <span class="opcao-simulacao-conteudo">
                                <strong>
                                    ${nota.incluidaCalculo !==
                        false
                        ? "Incluída"
                        : "Desconsiderada"
                    }
                                </strong>
                            </span>
                        </label>
                    </td>

                    <td>
                        <span class="notas-status ${status.classe}">
                            ${status.texto}
                        </span>
                    </td>
                `;

                configurarSelectManualNota(
                    tr,
                    nota
                );

                configurarInclusaoNotaCalculo(
                    tr,
                    nota
                );

                tbody.appendChild(
                    tr
                );
            }
        );
    }

    function configurarInclusaoNotaCalculo(
        tr,
        nota
    ) {
        const checkbox =
            tr.querySelector(
                ".nota-incluir-calculo"
            );

        if (!checkbox) {
            return;
        }

        checkbox.addEventListener(
            "change",
            function () {
                nota.incluidaCalculo =
                    Boolean(
                        this.checked
                    );

                reconstruirAtividadesAutomaticas();
                reconstruirPeriodos();
                renderizarAtividades();
                renderizarNotasProcessadas();
                atualizarResultados();
            }
        );
    }

    function gerarHtmlAtividadeNota(
        nota
    ) {
        const automaticas =
            nota.alocacoesAutomaticas ||
            [];

        const partes = [];

        automaticas.forEach(
            function (item) {
                partes.push(`
                    <div>
                        <strong>
                            ${escaparHtml(
                    item.nomeAtividade
                )}
                        </strong>

                        ${automaticas.length >
                        1
                        ? `
                                    <small>
                                        ${formatarMoeda(
                            item.valor
                        )}
                                    </small>
                                `
                        : ""
                    }
                    </div>
                `);
            }
        );

        if (
            nota.alocacaoManual
        ) {
            partes.push(`
                <div>
                    <strong>
                        ${escaparHtml(
                nota.alocacaoManual.nomeAtividade
            )}
                    </strong>

                    <small>
                        Classificação manual
                        ${nota.alocacaoManual.valor >
                    0
                    ? ` — ${formatarMoeda(
                        nota.alocacaoManual.valor
                    )}`
                    : ""
                }
                    </small>
                </div>
            `);
        }

        if (
            nota.valorPendente >
            TOLERANCIA_VALOR
        ) {
            partes.push(`
                <div style="margin-top: 6px;">
                    <select
                        class="notas-input-tabela nota-atividade-manual"
                        data-nota-id="${nota.id}"
                    ></select>

                    ${nota.valorPendente <
                    Number(
                        nota.valor
                    )
                    ? `
                                <small>
                                    Valor pendente:
                                    ${formatarMoeda(
                        nota.valorPendente
                    )}
                                </small>
                            `
                    : ""
                }
                </div>
            `);
        }

        if (
            partes.length ===
            0
        ) {
            return `
                <select
                    class="notas-input-tabela nota-atividade-manual"
                    data-nota-id="${nota.id}"
                ></select>
            `;
        }

        return partes.join("");
    }

    function configurarSelectManualNota(
        tr,
        nota
    ) {
        const select =
            tr.querySelector(
                ".nota-atividade-manual"
            );

        if (!select) {
            return;
        }

        preencherSelectTodasAtividades(
            select,
            nota
                .alocacaoManual
                ?.idAtividade ||
            "",
            true
        );

        select.addEventListener(
            "change",
            function () {
                const valor =
                    this.value;

                if (!valor) {
                    nota.alocacaoManual =
                        null;

                    recalcularSituacaoNota(
                        nota
                    );

                    reconstruirPeriodos();
                    renderizarNotasProcessadas();
                    renderizarAtividades();
                    atualizarResultados();

                    return;
                }

                const interpretada =
                    interpretarIdAtividade(
                        valor
                    );

                if (!interpretada) {
                    return;
                }

                nota.alocacaoManual = {
                    idAtividade:
                        criarIdAtividade(
                            interpretada.grupo,
                            interpretada.atividade
                        ),

                    grupo:
                        interpretada.grupo,

                    atividade:
                        interpretada.atividade,

                    nomeAtividade:
                        interpretada.nomeAtividade,

                    valor:
                        Math.max(
                            0,
                            nota.valorPendente
                        ),

                    automatico:
                        false
                };

                garantirAtividade(
                    interpretada.grupo,
                    interpretada.atividade,
                    interpretada.nomeAtividade,
                    false
                );

                recalcularSituacaoNota(
                    nota
                );

                reconstruirPeriodos();
                renderizarNotasProcessadas();
                renderizarAtividades();
                atualizarResultados();
            }
        );
    }

    function obterStatusNota(
        nota
    ) {
        if (
            nota.incluidaCalculo ===
            false
        ) {
            return {
                texto:
                    "Desconsiderada do cálculo",

                classe:
                    "notas-status-atencao"
            };
        }

        if (
            nota.requerConferenciaElegibilidade
        ) {
            return {
                texto:
                    "Conferir operação",

                classe:
                    "notas-status-atencao"
            };
        }

        if (
            !nota.documentoCompleto
        ) {
            return {
                texto:
                    "Revisar documento",

                classe:
                    "notas-status-atencao"
            };
        }

        if (
            !nota.atividadeCompleta
        ) {
            return {
                texto:
                    "Atividade pendente",

                classe:
                    "notas-status-atencao"
            };
        }

        if (
            nota.alocacaoManual
        ) {
            return {
                texto:
                    "Conferida manualmente",

                classe:
                    "notas-status-sucesso"
            };
        }

        return {
            texto:
                "Processada automaticamente",

            classe:
                "notas-status-sucesso"
        };
    }

    /* =========================================================
       CÁLCULO
       ========================================================= */

    function calcularRendaAtividade(
        atividade
    ) {
        garantirMesesOriginais(
            atividade
        );

        const periodos =
            periodosNotas
                .filter(
                    item =>
                        item.atividadeId ===
                        atividade.id
                )
                .filter(
                    item =>
                        Number(
                            item.valor
                        ) >
                        0
                );

        const total =
            periodos.reduce(
                function (
                    soma,
                    item
                ) {
                    return (
                        soma +
                        (
                            Number(
                                item.valor
                            ) ||
                            0
                        )
                    );
                },
                0
            );

        const mesesComNotas =
            new Set(
                periodos
                    .map(
                        item =>
                            item.competencia
                    )
                    .filter(Boolean)
            ).size;

        const mesesIntervalo =
            calcularMesesIntervalo(
                periodos
            );

        let meses = 0;
        let valido = false;
        let mensagem = "";

        switch (
        atividade.criterio
        ) {
            case CRITERIOS_APURACAO.INFORMADO:

                meses =
                    Math.max(
                        0,
                        parseInt(
                            atividade.mesesInformados,
                            10
                        ) ||
                        0
                    );

                valido =
                    total <=
                    0 ||
                    meses >
                    0;

                mensagem =
                    valido
                        ? "Período econômico informado pelo usuário."
                        : "Informe a quantidade de meses economicamente representados pela atividade.";

                break;

            case CRITERIOS_APURACAO.MOVIMENTACAO:

                meses =
                    mesesComNotas;

                valido =
                    total <=
                    0 ||
                    meses >
                    0;

                mensagem =
                    "Utilizando as competências efetivamente comprovadas pelas notas.";

                break;

            case CRITERIOS_APURACAO.INTERVALO:

                meses =
                    mesesIntervalo;

                valido =
                    total <=
                    0 ||
                    meses >
                    0;

                mensagem =
                    "Utilizando o intervalo entre a primeira e a última competência.";

                break;

            default:

                meses =
                    0;

                valido =
                    total <=
                    0;

                mensagem =
                    "Defina a forma de apuração conforme o período econômico representado pela documentação.";

                break;
        }

        const rendaMensal =
            valido &&
                meses >
                0
                ? total /
                meses
                : 0;

        return {
            total,
            meses,
            rendaMensal,
            valido,
            mensagem,
            mesesComNotas,
            mesesIntervalo
        };
    }

    function calcularMesesIntervalo(
        periodos
    ) {
        const competencias =
            periodos
                .map(
                    item =>
                        item.competencia
                )
                .filter(Boolean)
                .sort();

        if (
            competencias.length ===
            0
        ) {
            return 0;
        }

        const inicio =
            parseCompetencia(
                competencias[0]
            );

        const fim =
            parseCompetencia(
                competencias[
                competencias.length -
                1
                ]
            );

        if (
            !inicio ||
            !fim
        ) {
            return 0;
        }

        return (
            (
                fim.ano -
                inicio.ano
            ) *
            12 +
            (
                fim.mes -
                inicio.mes
            ) +
            1
        );
    }

    /* =========================================================
       RESULTADOS
       ========================================================= */

    function atualizarResultados() {
        const resultados =
            atividadesNotas.map(
                function (atividade) {
                    return {
                        atividade,

                        ...calcularRendaAtividade(
                            atividade
                        )
                    };
                }
            );

        const atividadesComMovimento =
            resultados.filter(
                item =>
                    item.total >
                    0
            );

        const atividadesPendentes =
            atividadesComMovimento.filter(
                item =>
                    !item.valido
            );

        const rendaMensal =
            atividadesPendentes.length >
                0
                ? 0
                : resultados.reduce(
                    function (
                        total,
                        item
                    ) {
                        return (
                            total +
                            item.rendaMensal
                        );
                    },
                    0
                );

        const rendaAnual =
            rendaMensal *
            12;

        const totalNotas =
            calcularTotalNotas();

        const notasComValor =
            notasProcessadas.filter(
                nota =>
                    nota.incluidaCalculo !==
                    false &&
                    Number(
                        nota.valor
                    ) >
                    0
            );

        const quantidadeManual =
            periodosManuais.reduce(
                function (
                    total,
                    item
                ) {
                    return (
                        total +
                        (
                            Number(
                                item.quantidade
                            ) ||
                            0
                        )
                    );
                },
                0
            );

        const quantidadeNotas =
            notasComValor.length +
            quantidadeManual;

        definirTexto(
            "resultadoRendaMensalNotas",
            atividadesPendentes.length >
                0
                ? "Pendente"
                : formatarMoeda(
                    rendaMensal
                )
        );

        definirTexto(
            "resultadoRendaAnualNotas",
            atividadesPendentes.length >
                0
                ? "Pendente"
                : formatarMoeda(
                    rendaAnual
                )
        );

        definirTexto(
            "resultadoTotalNotas",
            formatarMoeda(
                totalNotas
            )
        );

        definirTexto(
            "resultadoQuantidadeAtividades",
            String(
                atividadesComMovimento.length
            )
        );

        definirTexto(
            "resultadoQuantidadeNotas",
            String(
                quantidadeNotas
            )
        );

        atualizarResumoCriterios(
            resultados
        );

        atualizarTotalizadoresPeriodo();
        renderizarAtividades();
    }

    function calcularTotalNotas() {
        const totalProcessado =
            notasProcessadas.reduce(
                function (
                    total,
                    nota
                ) {
                    if (
                        nota.incluidaCalculo ===
                        false
                    ) {
                        return total;
                    }

                    return (
                        total +
                        (
                            Number(
                                nota.valor
                            ) ||
                            0
                        )
                    );
                },
                0
            );

        const totalManual =
            periodosManuais.reduce(
                function (
                    total,
                    item
                ) {
                    return (
                        total +
                        (
                            Number(
                                item.valor
                            ) ||
                            0
                        )
                    );
                },
                0
            );

        return (
            totalProcessado +
            totalManual
        );
    }

    /* =========================================================
       RESUMO CRITÉRIOS
       ========================================================= */

    function atualizarResumoCriterios(
        resultados
    ) {
        const container =
            document.getElementById(
                "resumoCriteriosNotas"
            );

        if (!container) {
            return;
        }

        const comMovimento =
            resultados.filter(
                item =>
                    item.total >
                    0
            );

        if (
            comMovimento.length ===
            0
        ) {
            container.innerHTML = `
                <strong>
                    Critérios de apuração
                </strong>

                <span>
                    Processe as notas fiscais ou informe períodos manualmente.
                </span>
            `;

            return;
        }

        const pendentes =
            comMovimento.filter(
                item =>
                    !item.valido
            );

        container.innerHTML = `
            <strong>
                Critérios de apuração
            </strong>

            ${pendentes.length >
                0
                ? `
                    <span>
                        <strong>
                            Atenção:
                        </strong>

                        ${pendentes.length}
                        atividade(s) possuem valores, mas ainda não tiveram
                        o período econômico definido. A renda permanece
                        pendente até a definição do critério.
                    </span>
                `
                : `
                    <span>
                        Todas as atividades com movimentação possuem
                        período econômico definido.
                    </span>
                `
            }

            ${comMovimento
                .map(
                    function (item) {
                        return `
                            <span>
                                <strong>
                                    ${escaparHtml(
                            item.atividade.nomeAtividade
                        )}
                                </strong>
                                —
                                ${item.valido
                                ? `${item.meses} mês(es) — ${formatarMoeda(
                                    item.rendaMensal
                                )}/mês`
                                : escaparHtml(
                                    item.mensagem
                                )
                            }
                            </span>
                        `;
                    }
                )
                .join("")}
        `;
    }

    /* =========================================================
       SELECT PERÍODO
       ========================================================= */

    function atualizarSelectAtividadePeriodo() {
        const select =
            document.getElementById(
                "atividadePeriodoNota"
            );

        if (!select) {
            return;
        }

        const atual =
            select.value;

        select.innerHTML =
            '<option value="">Selecione</option>';

        atividadesNotas.forEach(
            function (atividade) {
                const option =
                    new Option(
                        atividade.nomeAtividade,
                        atividade.id
                    );

                if (
                    atividade.id ===
                    atual
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

    function obterAtividadePorId(
        id
    ) {
        return (
            atividadesNotas.find(
                item =>
                    item.id ===
                    id
            ) ||
            null
        );
    }

    /* =========================================================
       LIMPEZA
       ========================================================= */

    function limparArquivos() {
        arquivosSelecionados =
            [];

        notasProcessadas =
            [];

        atividadesNotas =
            [];

        periodosManuais =
            [];

        periodosNotas =
            [];

        const input =
            document.getElementById(
                "arquivosNotasFiscais"
            );

        if (input) {
            input.value =
                "";
        }

        renderizarArquivos();
        renderizarNotasProcessadas();
        reconstruirPeriodos();
        renderizarAtividades();
        atualizarResultados();

        limparMensagemProcessamento();

        mostrarStatusProcessamento(
            false
        );
    }

    function limparCalculoCompleto() {
        limparArquivos();

        const periodo =
            document.getElementById(
                "periodoNota"
            );

        const valor =
            document.getElementById(
                "valorPeriodoNota"
            );

        const quantidade =
            document.getElementById(
                "quantidadeNotasPeriodo"
            );

        const meses =
            document.getElementById(
                "mesesAtividadeNotas"
            );

        const criterio =
            document.getElementById(
                "criterioAtividadeNotas"
            );

        if (periodo) {
            periodo.value =
                "";
        }

        if (valor) {
            valor.value =
                "";
        }

        if (quantidade) {
            quantidade.value =
                "0";
        }

        if (meses) {
            meses.value =
                "";
        }

        if (criterio) {
            criterio.value =
                "";
        }

        inicializarSeletoresAtividade();
    }

    /* =========================================================
       STATUS
       ========================================================= */

    function mostrarStatusProcessamento(
        mostrar,
        titulo = "Processando",
        texto = ""
    ) {
        const status =
            document.getElementById(
                "statusOcrNotas"
            );

        const tituloEl =
            document.getElementById(
                "tituloStatusOcrNotas"
            );

        const textoEl =
            document.getElementById(
                "textoStatusOcrNotas"
            );

        if (!status) {
            return;
        }

        status.hidden =
            !mostrar;

        if (tituloEl) {
            tituloEl.textContent =
                titulo;
        }

        if (textoEl) {
            textoEl.textContent =
                texto;
        }
    }

    function exibirMensagemProcessamento(
        mensagem,
        tipo = "sucesso"
    ) {
        const elemento =
            document.getElementById(
                "resultadoOcrNotas"
            );

        if (!elemento) {
            return;
        }

        elemento.hidden =
            false;

        elemento.className =
            `notas-resultado-ocr notas-status-${tipo}`;

        elemento.textContent =
            mensagem;
    }

    function limparMensagemProcessamento() {
        const elemento =
            document.getElementById(
                "resultadoOcrNotas"
            );

        if (!elemento) {
            return;
        }

        elemento.hidden =
            true;

        elemento.textContent =
            "";

        elemento.className =
            "notas-resultado-ocr";
    }

    /* =========================================================
       PERÍODO
       ========================================================= */

    function normalizarPeriodoInformado(
        valor
    ) {
        const texto =
            String(
                valor || ""
            ).trim();

        if (!texto) {
            return null;
        }

        let match =
            texto.match(
                /^(\d{4})[-/](\d{1,2})$/
            );

        if (match) {
            const ano =
                Number(
                    match[1]
                );

            const mes =
                Number(
                    match[2]
                );

            if (
                mes >=
                1 &&
                mes <=
                12
            ) {
                const competencia =
                    `${ano}-${String(
                        mes
                    ).padStart(
                        2,
                        "0"
                    )}`;

                return {
                    competencia,

                    exibicao:
                        formatarCompetencia(
                            competencia
                        )
                };
            }
        }

        match =
            texto.match(
                /^(\d{1,2})[/-](\d{4})$/
            );

        if (match) {
            const mes =
                Number(
                    match[1]
                );

            const ano =
                Number(
                    match[2]
                );

            if (
                mes >=
                1 &&
                mes <=
                12
            ) {
                const competencia =
                    `${ano}-${String(
                        mes
                    ).padStart(
                        2,
                        "0"
                    )}`;

                return {
                    competencia,

                    exibicao:
                        formatarCompetencia(
                            competencia
                        )
                };
            }
        }

        const normalizado =
            normalizarTextoComparacao(
                texto
            );

        const meses = [
            "JANEIRO",
            "FEVEREIRO",
            "MARCO",
            "ABRIL",
            "MAIO",
            "JUNHO",
            "JULHO",
            "AGOSTO",
            "SETEMBRO",
            "OUTUBRO",
            "NOVEMBRO",
            "DEZEMBRO"
        ];

        for (
            let i = 0;
            i <
            meses.length;
            i++
        ) {
            if (
                !normalizado.startsWith(
                    meses[i]
                )
            ) {
                continue;
            }

            const anoMatch =
                normalizado.match(
                    /\b(20\d{2})\b/
                );

            if (!anoMatch) {
                continue;
            }

            const competencia =
                `${anoMatch[1]}-${String(
                    i + 1
                ).padStart(
                    2,
                    "0"
                )}`;

            return {
                competencia,

                exibicao:
                    formatarCompetencia(
                        competencia
                    )
            };
        }

        return null;
    }

    function formatarCompetencia(
        competencia
    ) {
        const parsed =
            parseCompetencia(
                competencia
            );

        if (!parsed) {
            return (
                competencia ||
                ""
            );
        }

        const nomes = [
            "Janeiro",
            "Fevereiro",
            "Março",
            "Abril",
            "Maio",
            "Junho",
            "Julho",
            "Agosto",
            "Setembro",
            "Outubro",
            "Novembro",
            "Dezembro"
        ];

        return (
            `${nomes[
            parsed.mes -
            1
            ]}/${parsed.ano}`
        );
    }

    function parseCompetencia(
        competencia
    ) {
        const match =
            String(
                competencia || ""
            ).match(
                /^(\d{4})-(\d{2})$/
            );

        if (!match) {
            return null;
        }

        const ano =
            Number(
                match[1]
            );

        const mes =
            Number(
                match[2]
            );

        if (
            mes <
            1 ||
            mes >
            12
        ) {
            return null;
        }

        return {
            ano,
            mes
        };
    }

    /* =========================================================
       MOEDA
       ========================================================= */

    function formatarMoeda(
        valor
    ) {
        return (
            Number(
                valor
            ) || 0
        ).toLocaleString(
            "pt-BR",
            {
                style:
                    "currency",

                currency:
                    "BRL"
            }
        );
    }

    function moedaParaNumero(
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

    function aplicarMascaraMoeda(
        input
    ) {
        const digitos =
            String(
                input.value ||
                ""
            ).replace(
                /\D/g,
                ""
            );

        if (!digitos) {
            input.value =
                "";

            return;
        }

        const numero =
            Number(
                digitos
            ) /
            100;

        input.value =
            numero.toLocaleString(
                "pt-BR",
                {
                    minimumFractionDigits:
                        2,

                    maximumFractionDigits:
                        2
                }
            );
    }

    /* =========================================================
       HELPERS
       ========================================================= */

    function obterExtensao(
        nome
    ) {
        return String(
            nome || ""
        )
            .split(".")
            .pop()
            .toLowerCase();
    }

    function formatarTamanhoArquivo(
        bytes
    ) {
        const tamanho =
            Number(
                bytes
            ) || 0;

        if (
            tamanho <
            1024
        ) {
            return (
                `${tamanho} B`
            );
        }

        if (
            tamanho <
            1024 *
            1024
        ) {
            return (
                `${(
                    tamanho /
                    1024
                ).toFixed(
                    1
                )} KB`
            );
        }

        return (
            `${(
                tamanho /
                (
                    1024 *
                    1024
                )
            ).toFixed(
                1
            )} MB`
        );
    }

    function normalizarTextoComparacao(
        valor
    ) {
        return String(
            valor || ""
        )
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .toUpperCase()
            .replace(
                /[^A-Z0-9]+/g,
                " "
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim();
    }

    function definirTexto(
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

    function gerarId() {
        if (
            window.crypto &&
            typeof window.crypto.randomUUID ===
            "function"
        ) {
            return window.crypto.randomUUID();
        }

        return (
            `id-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2)}`
        );
    }

    function escaparHtml(
        valor
    ) {
        return String(
            valor ?? ""
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
})();