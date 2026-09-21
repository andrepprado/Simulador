/**
 * calculo-renda-notas-fiscais.js
 *
 * Caixa de Ferramentas - Sicoob Mantiqueira
 *
 * Responsabilidades deste arquivo:
 * - interface da tela de cálculo de renda por notas fiscais;
 * - seleção e gerenciamento de arquivos;
 * - processamento de XML NF-e;
 * - processamento de PDF;
 * - OCR de imagens e PDFs digitalizados;
 * - integração com credito-rural-notas-fiscais.js;
 * - integração com credito-rural-ncm-atividades.js;
 * - integração com credito-rural-atividades.js;
 * - classificação automática das atividades;
 * - inclusão manual de atividades;
 * - consolidação dos períodos;
 * - cálculo da renda mensal e anual;
 * - revisão somente de documentos realmente incompletos/ilegíveis.
 */

"use strict";

/* =========================================================
   CONSTANTES
========================================================= */

const CRITERIOS_APURACAO_NOTAS = Object.freeze({
    MOVIMENTACAO: "movimentacao",
    INTERVALO: "intervalo",
    INFORMADO: "informado"
});

const QUALIDADE_MINIMA_OCR = 45;
const QUALIDADE_MINIMA_TEXTO_PDF = 25;
const LARGURA_MINIMA_OCR = 1400;
const ESCALA_PDF_OCR = 2.5;

/* =========================================================
   ESTADO
========================================================= */

let arquivosSelecionados = [];
let notasProcessadas = [];
let atividadesRendaNotas = [];
let periodosNotas = [];

let pdfJsCarregado = null;

/* =========================================================
   INICIALIZAÇÃO
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    iniciarCalculoRendaNotas
);

function iniciarCalculoRendaNotas() {
    inicializarAtividades();
    configurarEventos();

    renderizarArquivosSelecionados();
    renderizarAtividades();
    renderizarNotasProcessadas();
    renderizarPeriodosNotas();
    atualizarResultadosNotas();
    atualizarAvisoRevisaoHumana();
}

/* =========================================================
   INICIALIZAÇÃO DAS ATIVIDADES
========================================================= */

function inicializarAtividades() {
    const grupo =
        document.getElementById(
            "grupoAtividadeNotas"
        );

    const atividade =
        document.getElementById(
            "atividadeNotas"
        );

    if (
        !grupo ||
        !atividade
    ) {
        return;
    }

    if (
        !window.CreditoRuralAtividades
    ) {
        console.error(
            "credito-rural-atividades.js não foi carregado."
        );

        return;
    }

    window.CreditoRuralAtividades
        .preencherGruposEmSelect(
            grupo,
            "agricola",
            false
        );

    window.CreditoRuralAtividades
        .preencherAtividadesEmSelect(
            atividade,
            grupo.value || "agricola",
            "",
            false
        );

    atualizarCampoMesesAtividade();
}

/* =========================================================
   EVENTOS
========================================================= */

function configurarEventos() {
    const inputArquivos =
        document.getElementById(
            "arquivosNotasFiscais"
        );

    const btnSelecionar =
        document.getElementById(
            "btnSelecionarNotas"
        );

    const btnProcessar =
        document.getElementById(
            "btnProcessarNotas"
        );

    const btnLimparArquivos =
        document.getElementById(
            "btnLimparArquivosNotas"
        );

    const grupo =
        document.getElementById(
            "grupoAtividadeNotas"
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

    /* =====================================================
       SELECIONAR ARQUIVOS
       ===================================================== */

    if (
        btnSelecionar &&
        inputArquivos
    ) {
        btnSelecionar.addEventListener(
            "click",
            function (evento) {
                evento.preventDefault();
                evento.stopPropagation();

                inputArquivos.click();
            }
        );
    }

    if (inputArquivos) {
        inputArquivos.addEventListener(
            "change",
            function () {
                const novosArquivos =
                    Array.from(
                        this.files || []
                    );

                adicionarArquivosSelecionados(
                    novosArquivos
                );

                /*
                 * Permite selecionar novamente o mesmo
                 * arquivo caso ele seja removido.
                 */
                this.value = "";

                renderizarArquivosSelecionados();
                limparMensagemOcr();
            }
        );
    }

    /* =====================================================
       PROCESSAR
       ===================================================== */

    if (btnProcessar) {
        btnProcessar.addEventListener(
            "click",
            processarArquivosNotas
        );
    }

    /* =====================================================
       LIMPAR ARQUIVOS
       ===================================================== */

    if (btnLimparArquivos) {
        btnLimparArquivos.addEventListener(
            "click",
            limparArquivosNotas
        );
    }

    /* =====================================================
       GRUPO / ATIVIDADE
       ===================================================== */

    if (grupo) {
        grupo.addEventListener(
            "change",
            function () {
                const atividade =
                    document.getElementById(
                        "atividadeNotas"
                    );

                if (
                    !atividade ||
                    !window.CreditoRuralAtividades
                ) {
                    return;
                }

                window.CreditoRuralAtividades
                    .preencherAtividadesEmSelect(
                        atividade,
                        this.value,
                        "",
                        false
                    );
            }
        );
    }

    /* =====================================================
       CRITÉRIO
       ===================================================== */

    if (criterio) {
        criterio.addEventListener(
            "change",
            atualizarCampoMesesAtividade
        );
    }

    /* =====================================================
       ADICIONAR ATIVIDADE
       ===================================================== */

    if (btnAdicionarAtividade) {
        btnAdicionarAtividade.addEventListener(
            "click",
            adicionarAtividadeManual
        );
    }

    /* =====================================================
       ADICIONAR PERÍODO
       ===================================================== */

    if (btnAdicionarPeriodo) {
        btnAdicionarPeriodo.addEventListener(
            "click",
            adicionarPeriodoManual
        );
    }

    /* =====================================================
       MÁSCARA DO VALOR
       ===================================================== */

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
                    converterMoedaParaNumero(
                        this.value
                    );

                this.value =
                    valor > 0
                        ? formatarMoeda(
                            valor
                        )
                        : "";
            }
        );
    }

    /* =====================================================
       CALCULAR
       ===================================================== */

    if (btnCalcular) {
        btnCalcular.addEventListener(
            "click",
            atualizarResultadosNotas
        );
    }

    /* =====================================================
       LIMPAR CÁLCULO
       ===================================================== */

    if (btnLimparCalculo) {
        btnLimparCalculo.addEventListener(
            "click",
            limparCalculoNotas
        );
    }
}

/* =========================================================
   CAMPO DE MESES INFORMADOS
========================================================= */

function atualizarCampoMesesAtividade() {
    const criterio =
        document.getElementById(
            "criterioAtividadeNotas"
        );

    const campo =
        document.getElementById(
            "campoMesesAtividadeNotas"
        );

    if (!campo) {
        return;
    }

    campo.hidden =
        criterio?.value !==
        CRITERIOS_APURACAO_NOTAS.INFORMADO;
}

/* =========================================================
   ARQUIVOS SELECIONADOS
========================================================= */

function adicionarArquivosSelecionados(
    novosArquivos
) {
    const permitidos = [
        "xml",
        "pdf",
        "jpg",
        "jpeg",
        "png",
        "webp"
    ];

    const chavesExistentes =
        new Set(
            arquivosSelecionados.map(
                gerarChaveArquivo
            )
        );

    novosArquivos.forEach(
        function (arquivo) {
            if (!arquivo) {
                return;
            }

            const extensao =
                obterExtensaoArquivo(
                    arquivo.name
                );

            if (
                !permitidos.includes(
                    extensao
                )
            ) {
                return;
            }

            const chave =
                gerarChaveArquivo(
                    arquivo
                );

            if (
                chavesExistentes.has(
                    chave
                )
            ) {
                return;
            }

            arquivosSelecionados.push(
                arquivo
            );

            chavesExistentes.add(
                chave
            );
        }
    );
}

function gerarChaveArquivo(
    arquivo
) {
    return [
        arquivo?.name || "",
        arquivo?.size || 0,
        arquivo?.lastModified || 0
    ].join("|");
}

function obterExtensaoArquivo(
    nome
) {
    const partes =
        String(
            nome || ""
        )
            .toLowerCase()
            .split(".");

    return partes.length > 1
        ? partes.pop()
        : "";
}

/* =========================================================
   RENDERIZA ARQUIVOS
========================================================= */

function renderizarArquivosSelecionados() {
    /*
     * HTML atual:
     * listaArquivosNotas
     *
     * Mantemos também compatibilidade com versões antigas.
     */
    const lista =
        document.getElementById(
            "listaArquivosNotas"
        ) ||
        document.getElementById(
            "listaArquivosNotasFiscais"
        );

    if (!lista) {
        return;
    }

    lista.innerHTML = "";

    if (
        arquivosSelecionados.length ===
        0
    ) {
        lista.innerHTML = `
            <div class="notas-sem-dados">
                Nenhum arquivo selecionado.
            </div>
        `;

        return;
    }

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
                    aria-label="Remover arquivo"
                >
                    Remover
                </button>
            `;

            const botao =
                item.querySelector(
                    ".notas-arquivo-remover"
                );

            if (botao) {
                botao.addEventListener(
                    "click",
                    function () {
                        removerArquivoSelecionado(
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

/* =========================================================
   REMOVER ARQUIVO
========================================================= */

function removerArquivoSelecionado(
    indice
) {
    if (
        indice < 0 ||
        indice >=
        arquivosSelecionados.length
    ) {
        return;
    }

    arquivosSelecionados.splice(
        indice,
        1
    );

    renderizarArquivosSelecionados();
}

/* =========================================================
   PROCESSAMENTO DOS ARQUIVOS
========================================================= */

async function processarArquivosNotas() {
    if (
        arquivosSelecionados.length ===
        0
    ) {
        exibirMensagemOcr(
            "Selecione pelo menos um arquivo antes de processar.",
            "atencao"
        );

        return;
    }

    if (
        !window.CreditoRuralNotasFiscais
    ) {
        exibirMensagemOcr(
            "O interpretador de notas fiscais não foi carregado.",
            "erro"
        );

        console.error(
            "window.CreditoRuralNotasFiscais não encontrado."
        );

        return;
    }

    const btnProcessar =
        document.getElementById(
            "btnProcessarNotas"
        );

    if (btnProcessar) {
        btnProcessar.disabled = true;
    }

    /*
     * Novo processamento substitui as notas
     * processadas anteriormente.
     *
     * Atividades manuais permanecem.
     */
    notasProcessadas = [];

    /*
     * Remove somente períodos automáticos anteriores.
     * Períodos inseridos manualmente são preservados.
     */
    periodosNotas =
        periodosNotas.filter(
            function (periodo) {
                return (
                    periodo.origem !==
                    "automatico"
                );
            }
        );

    mostrarStatusProcessamento(
        true,
        "Preparando processamento...",
        "Aguarde enquanto os documentos são analisados."
    );

    limparMensagemOcr();

    try {
        for (
            let indice = 0;
            indice <
            arquivosSelecionados.length;
            indice++
        ) {
            const arquivo =
                arquivosSelecionados[
                indice
                ];

            atualizarStatusProcessamentoArquivo(
                indice,
                arquivosSelecionados.length,
                arquivo.name
            );

            try {
                const resultados =
                    await processarArquivoNotaFiscal(
                        arquivo,
                        indice,
                        arquivosSelecionados.length
                    );

                notasProcessadas.push(
                    ...resultados
                );
            } catch (erro) {
                console.error(
                    "Erro ao processar arquivo:",
                    arquivo.name,
                    erro
                );

                notasProcessadas.push(
                    criarNotaComErro(
                        arquivo,
                        erro
                    )
                );
            }

            await cederControleInterface();
        }

        aplicarClassificacaoAutomatica();

        reconstruirPeriodosAutomaticos();

        renderizarAtividades();
        renderizarNotasProcessadas();
        renderizarPeriodosNotas();
        atualizarResultadosNotas();
        atualizarAvisoRevisaoHumana();

        const quantidadeRevisao =
            notasProcessadas.filter(
                function (nota) {
                    return Boolean(
                        nota
                            .requerConferenciaDocumento
                    );
                }
            ).length;

        if (
            quantidadeRevisao > 0
        ) {
            exibirMensagemOcr(
                `${notasProcessadas.length} documento(s) processado(s). ${quantidadeRevisao} documento(s) requer(em) revisão.`,
                "atencao"
            );
        } else {
            exibirMensagemOcr(
                `${notasProcessadas.length} documento(s) processado(s) automaticamente.`,
                "sucesso"
            );
        }
    } finally {
        mostrarStatusProcessamento(
            false
        );

        if (btnProcessar) {
            btnProcessar.disabled =
                false;
        }
    }
}

/* =========================================================
   PROCESSA UM ARQUIVO
========================================================= */

async function processarArquivoNotaFiscal(
    arquivo,
    indiceArquivo,
    totalArquivos
) {
    const extensao =
        obterExtensaoArquivo(
            arquivo.name
        );

    if (
        extensao === "xml"
    ) {
        const xml =
            await arquivo.text();

        const nota =
            window.CreditoRuralNotasFiscais
                .interpretarXmlNfe(
                    xml,
                    arquivo.name
                );

        return [
            normalizarNotaProcessada(
                nota,
                arquivo.name
            )
        ];
    }

    if (
        extensao === "pdf"
    ) {
        return processarPdfNotaFiscal(
            arquivo,
            indiceArquivo,
            totalArquivos
        );
    }

    if (
        [
            "jpg",
            "jpeg",
            "png",
            "webp"
        ].includes(
            extensao
        )
    ) {
        const resultado =
            await executarOcrComRotacao(
                arquivo,
                function (
                    progresso
                ) {
                    atualizarProgressoOcr(
                        indiceArquivo,
                        totalArquivos,
                        progresso,
                        arquivo.name
                    );
                }
            );

        const nota =
            window.CreditoRuralNotasFiscais
                .interpretar(
                    resultado.texto,
                    arquivo.name
                );

        nota.rotacaoOcr =
            resultado.angulo;

        return [
            normalizarNotaProcessada(
                nota,
                arquivo.name
            )
        ];
    }

    throw new Error(
        `Formato de arquivo não suportado: ${extensao}`
    );
}

/* =========================================================
   NOTA COM ERRO
========================================================= */

function criarNotaComErro(
    arquivo,
    erro
) {
    return {
        id:
            gerarId(),

        arquivo:
            arquivo?.name ||
            "Documento",

        modelo:
            "erro",

        modeloDescricao:
            "Não identificado",

        numero:
            "",

        serie:
            "",

        chaveAcesso:
            "",

        data:
            null,

        competencia:
            "",

        emitente:
            "",

        destinatario:
            "",

        valor:
            0,

        itens:
            [],

        atividadesSugeridas:
            [],

        alocacoesAtividade:
            [],

        alocacoesCalculadas:
            [],

        atividadeId:
            "",

        atividadeAutomatica:
            false,

        documentoFiscalCompleto:
            false,

        nfeLegivel:
            false,

        requerConferenciaDocumento:
            true,

        requerConferencia:
            true,

        confirmadaDocumento:
            false,

        confirmada:
            false,

        status:
            "Erro no processamento",

        qualidadeTexto:
            0,

        erro:
            String(
                erro?.message ||
                erro ||
                ""
            )
    };
}

/* =========================================================
   NORMALIZA NOTA PROCESSADA
========================================================= */

function normalizarNotaProcessada(
    nota,
    arquivo
) {
    const normalizada = {
        ...nota
    };

    normalizada.id =
        normalizada.id ||
        gerarId();

    normalizada.arquivo =
        normalizada.arquivo ||
        arquivo ||
        "";

    normalizada.atividadeId =
        normalizada.atividadeId ||
        "";

    normalizada.alocacoesAtividade =
        Array.isArray(
            normalizada
                .alocacoesAtividade
        )
            ? normalizada
                .alocacoesAtividade
            : [];

    normalizada.alocacoesCalculadas =
        [];

    normalizada.itens =
        Array.isArray(
            normalizada.itens
        )
            ? normalizada.itens
            : [];

    return normalizada;
}

/* =========================================================
   PDF
========================================================= */

async function processarPdfNotaFiscal(
    arquivo,
    indiceArquivo,
    totalArquivos
) {
    const pdfjs =
        await carregarPdfJs();

    const buffer =
        await arquivo.arrayBuffer();

    const pdf =
        await pdfjs
            .getDocument({
                data:
                    buffer
            })
            .promise;

    const notas = [];

    try {
        for (
            let numeroPagina = 1;
            numeroPagina <=
            pdf.numPages;
            numeroPagina++
        ) {
            const pagina =
                await pdf.getPage(
                    numeroPagina
                );

            let texto =
                await extrairTextoPaginaPdf(
                    pagina
                );

            let qualidade =
                window.CreditoRuralNotasFiscais
                    .avaliarQualidadeTexto(
                        texto
                    );

            let rotacao = 0;

            /*
             * OCR somente quando a camada textual
             * não for suficiente.
             */
            if (
                qualidade <
                QUALIDADE_MINIMA_TEXTO_PDF
            ) {
                const canvas =
                    await renderizarPaginaPdf(
                        pagina
                    );

                try {
                    const resultadoOcr =
                        await executarOcrComRotacao(
                            canvas,
                            function (
                                progresso
                            ) {
                                const progressoPagina =
                                    (
                                        numeroPagina -
                                        1 +
                                        progresso
                                    ) /
                                    pdf.numPages;

                                atualizarProgressoOcr(
                                    indiceArquivo,
                                    totalArquivos,
                                    progressoPagina,
                                    `${arquivo.name} - Página ${numeroPagina}`
                                );
                            }
                        );

                    texto =
                        resultadoOcr.texto;

                    qualidade =
                        resultadoOcr.qualidade;

                    rotacao =
                        resultadoOcr.angulo;
                } finally {
                    liberarCanvas(
                        canvas
                    );
                }
            }

            const nomeDocumento =
                pdf.numPages > 1
                    ? `${arquivo.name} - Página ${numeroPagina}`
                    : arquivo.name;

            const nota =
                window.CreditoRuralNotasFiscais
                    .interpretar(
                        texto,
                        nomeDocumento
                    );

            nota.numeroPagina =
                numeroPagina;

            nota.totalPaginas =
                pdf.numPages;

            nota.rotacaoOcr =
                rotacao;

            nota.qualidadeTexto =
                Math.max(
                    Number(
                        nota.qualidadeTexto
                    ) || 0,
                    qualidade || 0
                );

            notas.push(
                normalizarNotaProcessada(
                    nota,
                    nomeDocumento
                )
            );

            pagina.cleanup?.();

            await cederControleInterface();
        }
    } finally {
        pdf.cleanup?.();
        pdf.destroy?.();
    }

    return notas;
}

/* =========================================================
   PDF.JS
========================================================= */

async function carregarPdfJs() {
    if (
        window.pdfjsLib
    ) {
        return window.pdfjsLib;
    }

    if (pdfJsCarregado) {
        return pdfJsCarregado;
    }

    pdfJsCarregado = import(
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs"
    )
        .then(
            function (lib) {
                lib.GlobalWorkerOptions
                    .workerSrc =
                    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

                window.pdfjsLib =
                    lib;

                return lib;
            }
        )
        .catch(
            function (erro) {
                pdfJsCarregado =
                    null;

                throw erro;
            }
        );

    return pdfJsCarregado;
}

/* =========================================================
   TEXTO NATIVO DO PDF
========================================================= */

async function extrairTextoPaginaPdf(
    pagina
) {
    try {
        const conteudo =
            await pagina
                .getTextContent();

        return conteudo.items
            .map(
                function (item) {
                    return item.str;
                }
            )
            .join("\n");
    } catch (erro) {
        console.warn(
            "Não foi possível extrair a camada textual do PDF.",
            erro
        );

        return "";
    }
}

/* =========================================================
   RENDERIZA PÁGINA DO PDF
========================================================= */

async function renderizarPaginaPdf(
    pagina
) {
    const viewport =
        pagina.getViewport({
            scale:
                ESCALA_PDF_OCR
        });

    const canvas =
        document.createElement(
            "canvas"
        );

    canvas.width =
        Math.max(
            3,
            Math.ceil(
                viewport.width
            )
        );

    canvas.height =
        Math.max(
            3,
            Math.ceil(
                viewport.height
            )
        );

    const contexto =
        canvas.getContext(
            "2d",
            {
                willReadFrequently:
                    true
            }
        );

    contexto.fillStyle =
        "#FFFFFF";

    contexto.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    await pagina.render({
        canvasContext:
            contexto,
        viewport:
            viewport
    }).promise;

    return canvas;
}

/* =========================================================
   OCR
========================================================= */

async function executarOcrBasico(
    imagem,
    callbackProgresso
) {
    if (
        !window.Tesseract
    ) {
        throw new Error(
            "Tesseract.js não foi carregado."
        );
    }

    const preparada =
        await prepararImagemParaOcr(
            imagem
        );

    try {
        const resultado =
            await window.Tesseract
                .recognize(
                    preparada,
                    "por",
                    {
                        logger:
                            function (
                                evento
                            ) {
                                if (
                                    evento.status ===
                                    "recognizing text"
                                ) {
                                    callbackProgresso?.(
                                        evento.progress ||
                                        0
                                    );
                                }
                            }
                    }
                );

        return String(
            resultado?.data?.text ||
            ""
        );
    } finally {
        liberarCanvas(
            preparada
        );
    }
}

/* =========================================================
   OCR COM ROTAÇÃO
========================================================= */

async function executarOcrComRotacao(
    imagem,
    callbackProgresso
) {
    const textoInicial =
        await executarOcrBasico(
            imagem,
            callbackProgresso
        );

    let melhor = {
        texto:
            textoInicial,

        qualidade:
            window.CreditoRuralNotasFiscais
                .avaliarQualidadeTexto(
                    textoInicial
                ),

        angulo:
            0
    };

    /*
     * Se a primeira leitura for boa,
     * não perde tempo realizando outras
     * três leituras completas.
     */
    if (
        melhor.qualidade >=
        QUALIDADE_MINIMA_OCR
    ) {
        return melhor;
    }

    const base =
        await origemParaCanvas(
            imagem
        );

    try {
        for (
            const angulo
            of [
                90,
                180,
                270
            ]
        ) {
            const rotacionado =
                rotacionarCanvas(
                    base,
                    angulo
                );

            try {
                const texto =
                    await executarOcrBasico(
                        rotacionado,
                        callbackProgresso
                    );

                const qualidade =
                    window.CreditoRuralNotasFiscais
                        .avaliarQualidadeTexto(
                            texto
                        );

                if (
                    qualidade >
                    melhor.qualidade
                ) {
                    melhor = {
                        texto,
                        qualidade,
                        angulo
                    };
                }
            } finally {
                liberarCanvas(
                    rotacionado
                );
            }
        }
    } finally {
        liberarCanvas(
            base
        );
    }

    return melhor;
}

/* =========================================================
   PREPARA IMAGEM PARA OCR
========================================================= */

async function prepararImagemParaOcr(
    origem
) {
    const base =
        await origemParaCanvas(
            origem
        );

    try {
        const escala =
            Math.max(
                1,
                LARGURA_MINIMA_OCR /
                Math.max(
                    base.width,
                    1
                )
            );

        const largura =
            Math.max(
                3,
                Math.round(
                    base.width *
                    escala
                )
            );

        const altura =
            Math.max(
                3,
                Math.round(
                    base.height *
                    escala
                )
            );

        const canvas =
            document.createElement(
                "canvas"
            );

        canvas.width =
            largura;

        canvas.height =
            altura;

        const contexto =
            canvas.getContext(
                "2d",
                {
                    willReadFrequently:
                        true
                }
            );

        contexto.fillStyle =
            "#FFFFFF";

        contexto.fillRect(
            0,
            0,
            largura,
            altura
        );

        contexto.drawImage(
            base,
            0,
            0,
            largura,
            altura
        );

        return canvas;
    } finally {
        liberarCanvas(
            base
        );
    }
}

/* =========================================================
   CONVERTE ORIGEM PARA CANVAS
========================================================= */

async function origemParaCanvas(
    origem
) {
    if (
        origem instanceof
        HTMLCanvasElement
    ) {
        const canvas =
            document.createElement(
                "canvas"
            );

        canvas.width =
            Math.max(
                3,
                origem.width
            );

        canvas.height =
            Math.max(
                3,
                origem.height
            );

        const contexto =
            canvas.getContext(
                "2d",
                {
                    willReadFrequently:
                        true
                }
            );

        contexto.fillStyle =
            "#FFFFFF";

        contexto.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        contexto.drawImage(
            origem,
            0,
            0
        );

        return canvas;
    }

    if (
        origem instanceof
        HTMLImageElement
    ) {
        const canvas =
            document.createElement(
                "canvas"
            );

        canvas.width =
            Math.max(
                3,
                origem.naturalWidth ||
                origem.width
            );

        canvas.height =
            Math.max(
                3,
                origem.naturalHeight ||
                origem.height
            );

        const contexto =
            canvas.getContext(
                "2d"
            );

        contexto.fillStyle =
            "#FFFFFF";

        contexto.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        contexto.drawImage(
            origem,
            0,
            0,
            canvas.width,
            canvas.height
        );

        return canvas;
    }

    const bitmap =
        await createImageBitmap(
            origem
        );

    try {
        const canvas =
            document.createElement(
                "canvas"
            );

        canvas.width =
            Math.max(
                3,
                bitmap.width
            );

        canvas.height =
            Math.max(
                3,
                bitmap.height
            );

        const contexto =
            canvas.getContext(
                "2d"
            );

        contexto.fillStyle =
            "#FFFFFF";

        contexto.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        contexto.drawImage(
            bitmap,
            0,
            0
        );

        return canvas;
    } finally {
        bitmap.close?.();
    }
}

/* =========================================================
   ROTACIONA CANVAS
========================================================= */

function rotacionarCanvas(
    origem,
    angulo
) {
    const trocaDimensoes =
        angulo === 90 ||
        angulo === 270;

    const canvas =
        document.createElement(
            "canvas"
        );

    canvas.width =
        trocaDimensoes
            ? origem.height
            : origem.width;

    canvas.height =
        trocaDimensoes
            ? origem.width
            : origem.height;

    const contexto =
        canvas.getContext(
            "2d"
        );

    contexto.fillStyle =
        "#FFFFFF";

    contexto.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    contexto.translate(
        canvas.width / 2,
        canvas.height / 2
    );

    contexto.rotate(
        angulo *
        Math.PI /
        180
    );

    contexto.drawImage(
        origem,
        -origem.width / 2,
        -origem.height / 2
    );

    return canvas;
}

function liberarCanvas(
    canvas
) {
    if (
        canvas instanceof
        HTMLCanvasElement
    ) {
        canvas.width = 1;
        canvas.height = 1;
    }
}

/* =========================================================
   CLASSIFICAÇÃO AUTOMÁTICA
========================================================= */

function aplicarClassificacaoAutomatica() {
    notasProcessadas.forEach(
        function (nota) {
            nota.atividadeId =
                nota.atividadeId ||
                "";

            nota.alocacoesCalculadas =
                [];

            const alocacoes =
                Array.isArray(
                    nota.alocacoesAtividade
                )
                    ? nota
                        .alocacoesAtividade
                    : [];

            if (
                alocacoes.length === 0
            ) {
                return;
            }

            alocacoes.forEach(
                function (
                    alocacao
                ) {
                    if (
                        !alocacao.grupo ||
                        !alocacao.atividade
                    ) {
                        return;
                    }

                    const cadastro =
                        obterOuCriarAtividade({
                            grupo:
                                alocacao.grupo,

                            atividade:
                                alocacao.atividade,

                            origem:
                                "automatica"
                        });

                    nota.alocacoesCalculadas.push({
                        atividadeId:
                            cadastro.id,

                        valor:
                            Number(
                                alocacao.valor
                            ) || 0,

                        automatico:
                            alocacao.automatico !==
                            false,

                        confianca:
                            Number(
                                alocacao.confianca
                            ) || 0
                    });
                }
            );

            if (
                nota
                    .alocacoesCalculadas
                    .length === 1
            ) {
                nota.atividadeId =
                    nota
                        .alocacoesCalculadas[0]
                        .atividadeId;
            }
        }
    );
}

/* =========================================================
   OBTÉM OU CRIA ATIVIDADE
========================================================= */

function obterOuCriarAtividade({
    grupo,
    atividade,
    origem = "manual"
}) {
    const grupoNormalizado =
        String(
            grupo || ""
        );

    const atividadeNormalizada =
        String(
            atividade || ""
        );

    let existente =
        atividadesRendaNotas.find(
            function (item) {
                return (
                    item.grupo ===
                    grupoNormalizado &&
                    item.atividade ===
                    atividadeNormalizada
                );
            }
        );

    if (existente) {
        /*
         * Se algum documento classificou automaticamente
         * uma atividade que anteriormente era manual,
         * não precisamos alterar a origem manual.
         */
        return existente;
    }

    existente = {
        id:
            gerarId(),

        grupo:
            grupoNormalizado,

        atividade:
            atividadeNormalizada,

        criterio:
            CRITERIOS_APURACAO_NOTAS
                .MOVIMENTACAO,

        mesesRepresentados:
            12,

        origem:
            origem
    };

    atividadesRendaNotas.push(
        existente
    );

    return existente;
}

/* =========================================================
   ADICIONAR ATIVIDADE MANUAL
========================================================= */

function adicionarAtividadeManual() {
    const grupo =
        document.getElementById(
            "grupoAtividadeNotas"
        )?.value;

    const atividade =
        document.getElementById(
            "atividadeNotas"
        )?.value;

    const criterio =
        document.getElementById(
            "criterioAtividadeNotas"
        )?.value ||
        CRITERIOS_APURACAO_NOTAS
            .MOVIMENTACAO;

    const meses =
        Number(
            document.getElementById(
                "mesesAtividadeNotas"
            )?.value
        ) || 12;

    if (
        !grupo ||
        !atividade
    ) {
        exibirMensagemOcr(
            "Selecione o grupo e a atividade.",
            "atencao"
        );

        return;
    }

    const cadastro =
        obterOuCriarAtividade({
            grupo,
            atividade,
            origem:
                "manual"
        });

    cadastro.criterio =
        criterio;

    cadastro.mesesRepresentados =
        Math.max(
            1,
            Math.trunc(
                meses
            )
        );

    renderizarAtividades();
    renderizarNotasProcessadas();
    renderizarPeriodosNotas();
    atualizarResultadosNotas();

    exibirMensagemOcr(
        "Atividade adicionada.",
        "sucesso"
    );
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

    const resumo =
        calcularResumoAtividades();

    if (
        atividadesRendaNotas.length ===
        0
    ) {
        inserirLinhaSemDados(
            tbody,
            7,
            "Nenhuma atividade identificada."
        );

        return;
    }

    atividadesRendaNotas.forEach(
        function (atividade) {
            const calculo =
                resumo.find(
                    function (item) {
                        return (
                            item.atividadeId ===
                            atividade.id
                        );
                    }
                );

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
                obterNomeAtividade(
                    atividade.grupo,
                    atividade.atividade
                )
            )}
                    </strong>

                    ${atividade.origem ===
                    "automatica"
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
                        class="notas-input-tabela atividade-criterio"
                        aria-label="Critério de apuração"
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
                        class="notas-input-tabela atividade-meses"
                        value="${atividade.mesesRepresentados}"
                        ${atividade.criterio ===
                    CRITERIOS_APURACAO_NOTAS.INFORMADO
                    ? ""
                    : "disabled"
                }
                    >
                </td>

                <td>
                    ${calculo?.meses ||
                "-"
                }
                </td>

                <td>
                    ${formatarMoeda(
                    calculo
                        ?.rendaMensal ||
                    0
                )}
                </td>

                <td>
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
                    ".atividade-criterio"
                );

            const inputMeses =
                tr.querySelector(
                    ".atividade-meses"
                );

            const btnRemover =
                tr.querySelector(
                    ".notas-btn-remover"
                );

            if (selectCriterio) {
                selectCriterio.addEventListener(
                    "change",
                    function () {
                        atividade.criterio =
                            this.value;

                        renderizarAtividades();
                        atualizarResultadosNotas();
                    }
                );
            }

            if (inputMeses) {
                inputMeses.addEventListener(
                    "change",
                    function () {
                        atividade.mesesRepresentados =
                            Math.max(
                                1,
                                Math.trunc(
                                    Number(
                                        this.value
                                    ) || 1
                                )
                            );

                        this.value =
                            atividade
                                .mesesRepresentados;

                        atualizarResultadosNotas();
                    }
                );
            }

            if (btnRemover) {
                btnRemover.addEventListener(
                    "click",
                    function () {
                        removerAtividade(
                            atividade.id
                        );
                    }
                );
            }

            tbody.appendChild(
                tr
            );
        }
    );
}

function gerarOpcoesCriterio(
    atual
) {
    return `
        <option
            value="${CRITERIOS_APURACAO_NOTAS.MOVIMENTACAO}"
            ${atual ===
            CRITERIOS_APURACAO_NOTAS.MOVIMENTACAO
            ? "selected"
            : ""
        }
        >
            Meses com movimentação
        </option>

        <option
            value="${CRITERIOS_APURACAO_NOTAS.INTERVALO}"
            ${atual ===
            CRITERIOS_APURACAO_NOTAS.INTERVALO
            ? "selected"
            : ""
        }
        >
            Intervalo completo
        </option>

        <option
            value="${CRITERIOS_APURACAO_NOTAS.INFORMADO}"
            ${atual ===
            CRITERIOS_APURACAO_NOTAS.INFORMADO
            ? "selected"
            : ""
        }
        >
            Período econômico informado
        </option>
    `;
}

/* =========================================================
   REMOVE ATIVIDADE
========================================================= */

function removerAtividade(
    atividadeId
) {
    atividadesRendaNotas =
        atividadesRendaNotas.filter(
            function (atividade) {
                return (
                    atividade.id !==
                    atividadeId
                );
            }
        );

    notasProcessadas.forEach(
        function (nota) {
            nota.alocacoesCalculadas =
                (
                    nota.alocacoesCalculadas ||
                    []
                ).filter(
                    function (item) {
                        return (
                            item.atividadeId !==
                            atividadeId
                        );
                    }
                );

            if (
                nota.atividadeId ===
                atividadeId
            ) {
                nota.atividadeId =
                    "";
            }
        }
    );

    periodosNotas =
        periodosNotas.filter(
            function (periodo) {
                return (
                    periodo.atividadeId !==
                    atividadeId
                );
            }
        );

    reconstruirPeriodosAutomaticos();

    renderizarAtividades();
    renderizarNotasProcessadas();
    renderizarPeriodosNotas();
    atualizarResultadosNotas();
}

/* =========================================================
   RENDERIZA NOTAS PROCESSADAS
========================================================= */

function renderizarNotasProcessadas() {
    const tbody =
        document.getElementById(
            "tabelaDetalhamentoNotas"
        );

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    if (
        notasProcessadas.length ===
        0
    ) {
        inserirLinhaSemDados(
            tbody,
            7,
            "Nenhuma nota fiscal processada."
        );

        atualizarAvisoRevisaoHumana();

        return;
    }

    notasProcessadas.forEach(
        function (nota) {
            const precisaRevisao =
                Boolean(
                    nota
                        .requerConferenciaDocumento
                );

            const atividade =
                obterDescricaoAtividadesNota(
                    nota
                );

            const tr =
                document.createElement(
                    "tr"
                );

            tr.className =
                precisaRevisao
                    ? "nota-requer-revisao"
                    : "nota-processada-automaticamente";

            tr.innerHTML = `
                <td>
                    <strong>
                        ${escaparHtml(
                nota.arquivo ||
                "-"
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
                    ${precisaRevisao
                    ? `
                                <input
                                    type="text"
                                    class="notas-input-tabela nota-data"
                                    value="${escaparHtml(
                        nota.data ||
                        ""
                    )}"
                                    placeholder="dd/mm/aaaa"
                                >
                            `
                    : escaparHtml(
                        nota.data ||
                        "-"
                    )
                }
                </td>

                <td>
                    ${precisaRevisao
                    ? `
                                <input
                                    type="text"
                                    class="notas-input-tabela nota-numero"
                                    value="${escaparHtml(
                        nota.numero ||
                        ""
                    )}"
                                >
                            `
                    : escaparHtml(
                        nota.numero ||
                        "-"
                    )
                }
                </td>

                <td>
                    ${precisaRevisao
                    ? `
                                <input
                                    type="text"
                                    class="notas-input-tabela nota-emitente"
                                    value="${escaparHtml(
                        nota.emitente ||
                        ""
                    )}"
                                >
                            `
                    : escaparHtml(
                        nota.emitente ||
                        "-"
                    )
                }
                </td>

                <td>
                    ${precisaRevisao
                    ? `
                                <input
                                    type="text"
                                    class="notas-input-tabela nota-valor"
                                    value="${Number(
                        nota.valor
                    ) > 0
                        ? escaparHtml(
                            formatarMoeda(
                                nota.valor
                            )
                        )
                        : ""
                    }"
                                >
                            `
                    : formatarMoeda(
                        nota.valor
                    )
                }
                </td>

                <td class="nota-coluna-atividade">
                    ${atividade
                    ? escaparHtml(
                        atividade
                    )
                    : `
                                <select
                                    class="notas-input-tabela nota-atividade-manual"
                                    aria-label="Atividade da nota"
                                ></select>
                            `
                }
                </td>

                <td>
                    <span
                        class="notas-status ${precisaRevisao
                    ? "notas-status-atencao"
                    : "notas-status-sucesso"
                }"
                    >
                        ${precisaRevisao
                    ? "Revisar documento"
                    : "Processada automaticamente"
                }
                    </span>

                    ${precisaRevisao
                    ? `
                                <button
                                    type="button"
                                    class="notas-btn nota-confirmar"
                                >
                                    Confirmar
                                </button>
                            `
                    : ""
                }
                </td>
            `;

            tbody.appendChild(
                tr
            );

            /*
             * Se o documento está legível, mas a atividade não
             * pôde ser inferida, disponibiliza seleção de atividade
             * sem transformar isso em "revisão documental".
             */
            if (!atividade) {
                const select =
                    tr.querySelector(
                        ".nota-atividade-manual"
                    );

                preencherSelectAtividadesNota(
                    select,
                    nota
                );

                if (select) {
                    select.addEventListener(
                        "change",
                        function () {
                            aplicarAtividadeManualNota(
                                nota,
                                this.value
                            );
                        }
                    );
                }
            }

            if (precisaRevisao) {
                configurarRevisaoDocumento(
                    tr,
                    nota
                );
            }
        }
    );

    atualizarAvisoRevisaoHumana();
}

/* =========================================================
   SELECT COM TODAS AS ATIVIDADES
========================================================= */

function preencherSelectAtividadesNota(
    select,
    nota
) {
    if (
        !select ||
        !window.CreditoRuralAtividades
    ) {
        return;
    }

    const catalogo =
        window.CreditoRuralAtividades;

    let selecionada = "";

    if (
        nota?.atividadeId
    ) {
        const cadastro =
            atividadesRendaNotas.find(
                function (atividade) {
                    return (
                        atividade.id ===
                        nota.atividadeId
                    );
                }
            );

        if (cadastro) {
            selecionada =
                `${cadastro.grupo}|${cadastro.atividade}`;
        }
    }

    catalogo
        .preencherTodasAtividadesAgrupadas(
            select,
            selecionada,
            true
        );
}

/* =========================================================
   APLICA ATIVIDADE MANUAL À NOTA
========================================================= */

function aplicarAtividadeManualNota(
    nota,
    valorSelect
) {
    if (
        !valorSelect ||
        !window.CreditoRuralAtividades
    ) {
        nota.atividadeId =
            "";

        nota.alocacoesCalculadas =
            [];

        reconstruirPeriodosAutomaticos();

        renderizarAtividades();
        renderizarPeriodosNotas();
        atualizarResultadosNotas();

        return;
    }

    const interpretada =
        window.CreditoRuralAtividades
            .interpretarValorAtividadeAgrupada(
                valorSelect
            );

    if (!interpretada) {
        return;
    }

    const cadastro =
        obterOuCriarAtividade({
            grupo:
                interpretada.grupo,

            atividade:
                interpretada.atividade,

            origem:
                "manual"
        });

    nota.atividadeId =
        cadastro.id;

    nota.alocacoesCalculadas = [{
        atividadeId:
            cadastro.id,

        valor:
            Number(
                nota.valor
            ) || 0,

        automatico:
            false,

        confianca:
            1
    }];

    reconstruirPeriodosAutomaticos();

    renderizarAtividades();
    renderizarNotasProcessadas();
    renderizarPeriodosNotas();
    atualizarResultadosNotas();
}

/* =========================================================
   DESCRIÇÃO DAS ATIVIDADES DA NOTA
========================================================= */

function obterDescricaoAtividadesNota(
    nota
) {
    const alocacoes =
        Array.isArray(
            nota.alocacoesCalculadas
        )
            ? nota
                .alocacoesCalculadas
            : [];

    if (
        alocacoes.length === 0
    ) {
        return "";
    }

    const nomes =
        alocacoes
            .map(
                function (
                    alocacao
                ) {
                    const cadastro =
                        atividadesRendaNotas.find(
                            function (atividade) {
                                return (
                                    atividade.id ===
                                    alocacao.atividadeId
                                );
                            }
                        );

                    if (!cadastro) {
                        return "";
                    }

                    return obterNomeAtividade(
                        cadastro.grupo,
                        cadastro.atividade
                    );
                }
            )
            .filter(Boolean);

    return [
        ...new Set(
            nomes
        )
    ].join(" + ");
}

/* =========================================================
   CONFIGURA REVISÃO DOCUMENTAL
========================================================= */

function configurarRevisaoDocumento(
    tr,
    nota
) {
    const inputValor =
        tr.querySelector(
            ".nota-valor"
        );

    if (inputValor) {
        inputValor.addEventListener(
            "input",
            function () {
                aplicarMascaraMoeda(
                    this
                );
            }
        );
    }

    const btnConfirmar =
        tr.querySelector(
            ".nota-confirmar"
        );

    if (!btnConfirmar) {
        return;
    }

    btnConfirmar.addEventListener(
        "click",
        function () {
            const dataInformada =
                tr.querySelector(
                    ".nota-data"
                )?.value ||
                "";

            const numeroInformado =
                tr.querySelector(
                    ".nota-numero"
                )?.value ||
                "";

            const emitenteInformado =
                tr.querySelector(
                    ".nota-emitente"
                )?.value ||
                "";

            const valorInformado =
                converterMoedaParaNumero(
                    tr.querySelector(
                        ".nota-valor"
                    )?.value ||
                    ""
                );

            const dataNormalizada =
                window.CreditoRuralNotasFiscais
                    .normalizarData(
                        dataInformada
                    );

            if (
                !window.CreditoRuralNotasFiscais
                    .validarData(
                        dataNormalizada
                    )
            ) {
                exibirMensagemOcr(
                    "Informe uma data válida para confirmar o documento.",
                    "atencao"
                );

                return;
            }

            if (
                valorInformado <= 0
            ) {
                exibirMensagemOcr(
                    "Informe o valor total da nota para confirmar o documento.",
                    "atencao"
                );

                return;
            }

            nota.data =
                dataNormalizada;

            nota.competencia =
                window.CreditoRuralNotasFiscais
                    .formatarCompetenciaData(
                        dataNormalizada
                    );

            nota.numero =
                String(
                    numeroInformado
                ).trim();

            nota.emitente =
                String(
                    emitenteInformado
                ).trim();

            nota.valor =
                valorInformado;

            nota.requerConferenciaDocumento =
                false;

            nota.requerConferencia =
                false;

            nota.confirmadaDocumento =
                true;

            nota.confirmada =
                true;

            nota.status =
                "Conferida manualmente";

            /*
             * Se a atividade já estava associada,
             * atualiza o valor da alocação.
             */
            if (
                nota
                    .alocacoesCalculadas
                    ?.length === 1
            ) {
                nota
                    .alocacoesCalculadas[0]
                    .valor =
                    valorInformado;
            }

            reconstruirPeriodosAutomaticos();

            renderizarNotasProcessadas();
            renderizarPeriodosNotas();
            renderizarAtividades();
            atualizarResultadosNotas();

            exibirMensagemOcr(
                "Documento confirmado.",
                "sucesso"
            );
        }
    );
}

/* =========================================================
   AVISO DE REVISÃO HUMANA
========================================================= */

function atualizarAvisoRevisaoHumana() {
    const aviso =
        document.getElementById(
            "avisoRevisaoHumanaNotas"
        );

    if (!aviso) {
        return;
    }

    const possuiRevisao =
        notasProcessadas.some(
            function (nota) {
                return Boolean(
                    nota
                        .requerConferenciaDocumento
                );
            }
        );

    aviso.hidden =
        !possuiRevisao;
}

/* =========================================================
   RECONSTRÓI PERÍODOS AUTOMÁTICOS
========================================================= */

function reconstruirPeriodosAutomaticos() {
    /*
     * Preserva os períodos manuais.
     */
    periodosNotas =
        periodosNotas.filter(
            function (periodo) {
                return (
                    periodo.origem !==
                    "automatico"
                );
            }
        );

    notasProcessadas.forEach(
        function (nota) {
            /*
             * Documento não confirmado não participa
             * do cálculo.
             */
            if (
                nota
                    .requerConferenciaDocumento
            ) {
                return;
            }

            if (
                !nota.competencia
            ) {
                return;
            }

            const alocacoes =
                Array.isArray(
                    nota.alocacoesCalculadas
                )
                    ? nota
                        .alocacoesCalculadas
                    : [];

            alocacoes.forEach(
                function (
                    alocacao
                ) {
                    if (
                        !alocacao.atividadeId
                    ) {
                        return;
                    }

                    const valor =
                        Number(
                            alocacao.valor
                        ) || 0;

                    if (
                        valor <= 0
                    ) {
                        return;
                    }

                    adicionarOuSomarPeriodo({
                        atividadeId:
                            alocacao
                                .atividadeId,

                        periodo:
                            formatarCompetenciaParaExibicao(
                                nota.competencia
                            ),

                        competencia:
                            nota.competencia,

                        valor:
                            valor,

                        quantidade:
                            1,

                        origem:
                            "automatico"
                    });
                }
            );
        }
    );
}

/* =========================================================
   ADICIONA OU SOMA PERÍODO
========================================================= */

function adicionarOuSomarPeriodo(
    dados
) {
    const competencia =
        dados.competencia ||
        converterPeriodoParaCompetencia(
            dados.periodo
        );

    const existente =
        periodosNotas.find(
            function (periodo) {
                return (
                    periodo.atividadeId ===
                    dados.atividadeId &&
                    periodo.competencia ===
                    competencia &&
                    periodo.origem ===
                    dados.origem
                );
            }
        );

    if (existente) {
        existente.valor +=
            Number(
                dados.valor
            ) || 0;

        existente.quantidade +=
            Number(
                dados.quantidade
            ) || 0;

        return existente;
    }

    const novo = {
        id:
            gerarId(),

        atividadeId:
            dados.atividadeId,

        periodo:
            dados.periodo,

        competencia:
            competencia,

        valor:
            Number(
                dados.valor
            ) || 0,

        quantidade:
            Number(
                dados.quantidade
            ) || 0,

        origem:
            dados.origem ||
            "manual"
    };

    periodosNotas.push(
        novo
    );

    return novo;
}

/* =========================================================
   ADICIONAR PERÍODO MANUAL
========================================================= */

function adicionarPeriodoManual() {
    const atividadeId =
        document.getElementById(
            "atividadePeriodoNota"
        )?.value ||
        "";

    const periodo =
        String(
            document.getElementById(
                "periodoNota"
            )?.value ||
            ""
        ).trim();

    const valor =
        converterMoedaParaNumero(
            document.getElementById(
                "valorPeriodoNota"
            )?.value ||
            ""
        );

    const quantidade =
        Math.max(
            0,
            Math.trunc(
                Number(
                    document.getElementById(
                        "quantidadeNotasPeriodo"
                    )?.value
                ) || 0
            )
        );

    if (!atividadeId) {
        exibirMensagemOcr(
            "Selecione uma atividade para o período.",
            "atencao"
        );

        return;
    }

    const competencia =
        converterPeriodoParaCompetencia(
            periodo
        );

    if (!competencia) {
        exibirMensagemOcr(
            "Informe o período no formato Mês/Ano, por exemplo Janeiro/2026.",
            "atencao"
        );

        return;
    }

    if (
        valor <= 0
    ) {
        exibirMensagemOcr(
            "Informe um valor maior que zero.",
            "atencao"
        );

        return;
    }

    adicionarOuSomarPeriodo({
        atividadeId:
            atividadeId,

        periodo:
            formatarCompetenciaParaExibicao(
                competencia
            ),

        competencia:
            competencia,

        valor:
            valor,

        quantidade:
            quantidade,

        origem:
            "manual"
    });

    limparCamposPeriodoManual();

    renderizarPeriodosNotas();
    renderizarAtividades();
    atualizarResultadosNotas();

    exibirMensagemOcr(
        "Período adicionado.",
        "sucesso"
    );
}

/* =========================================================
   LIMPA CAMPOS DE PERÍODO
========================================================= */

function limparCamposPeriodoManual() {
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

    if (periodo) {
        periodo.value = "";
    }

    if (valor) {
        valor.value = "";
    }

    if (quantidade) {
        quantidade.value =
            "0";
    }
}

/* =========================================================
   RENDERIZA PERÍODOS
========================================================= */

function renderizarPeriodosNotas() {
    preencherSelectAtividadePeriodo();

    const tbody =
        document.getElementById(
            "tabelaPeriodosNotas"
        );

    if (!tbody) {
        atualizarTotalizadoresPeriodos();

        return;
    }

    tbody.innerHTML = "";

    if (
        periodosNotas.length ===
        0
    ) {
        inserirLinhaSemDados(
            tbody,
            5,
            "Nenhum período informado."
        );

        atualizarTotalizadoresPeriodos();

        return;
    }

    const ordenados =
        [
            ...periodosNotas
        ].sort(
            function (
                a,
                b
            ) {
                const compA =
                    a.competencia ||
                    "";

                const compB =
                    b.competencia ||
                    "";

                if (
                    compA ===
                    compB
                ) {
                    return 0;
                }

                return compA <
                    compB
                    ? -1
                    : 1;
            }
        );

    ordenados.forEach(
        function (periodo) {
            const atividade =
                atividadesRendaNotas.find(
                    function (item) {
                        return (
                            item.id ===
                            periodo.atividadeId
                        );
                    }
                );

            const tr =
                document.createElement(
                    "tr"
                );

            tr.innerHTML = `
                <td>
                    ${escaparHtml(
                atividade
                    ? obterNomeAtividade(
                        atividade.grupo,
                        atividade.atividade
                    )
                    : "-"
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
                    ${Number(
                periodo.quantidade
            ) || 0}
                </td>

                <td>
                    <button
                        type="button"
                        class="notas-btn-remover"
                        ${periodo.origem ===
                    "automatico"
                    ? 'title="Período criado automaticamente pela nota"'
                    : ""
                }
                    >
                        Remover
                    </button>
                </td>
            `;

            const btn =
                tr.querySelector(
                    ".notas-btn-remover"
                );

            if (btn) {
                btn.addEventListener(
                    "click",
                    function () {
                        removerPeriodo(
                            periodo.id
                        );
                    }
                );
            }

            tbody.appendChild(
                tr
            );
        }
    );

    atualizarTotalizadoresPeriodos();
}

/* =========================================================
   SELECT DE ATIVIDADE DO PERÍODO
========================================================= */

function preencherSelectAtividadePeriodo() {
    const select =
        document.getElementById(
            "atividadePeriodoNota"
        );

    if (!select) {
        return;
    }

    const selecionado =
        select.value;

    select.innerHTML =
        '<option value="">Selecione</option>';

    atividadesRendaNotas.forEach(
        function (atividade) {
            const option =
                new Option(
                    obterNomeAtividade(
                        atividade.grupo,
                        atividade.atividade
                    ),
                    atividade.id
                );

            if (
                atividade.id ===
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

/* =========================================================
   REMOVE PERÍODO
========================================================= */

function removerPeriodo(
    periodoId
) {
    periodosNotas =
        periodosNotas.filter(
            function (periodo) {
                return (
                    periodo.id !==
                    periodoId
                );
            }
        );

    renderizarPeriodosNotas();
    renderizarAtividades();
    atualizarResultadosNotas();
}

/* =========================================================
   TOTALIZADORES DOS PERÍODOS
========================================================= */

function atualizarTotalizadoresPeriodos() {
    const total =
        periodosNotas.reduce(
            function (
                soma,
                periodo
            ) {
                return (
                    soma +
                    (
                        Number(
                            periodo.valor
                        ) || 0
                    )
                );
            },
            0
        );

    const quantidadeNotas =
        periodosNotas.reduce(
            function (
                soma,
                periodo
            ) {
                return (
                    soma +
                    (
                        Number(
                            periodo.quantidade
                        ) || 0
                    )
                );
            },
            0
        );

    definirTexto(
        "totalNotasPeriodos",
        formatarMoeda(
            total
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
            contarCompetenciasDistintas()
        )
    );
}

function contarCompetenciasDistintas() {
    return new Set(
        periodosNotas
            .map(
                function (
                    periodo
                ) {
                    return periodo.competencia;
                }
            )
            .filter(Boolean)
    ).size;
}

/* =========================================================
   CÁLCULO POR ATIVIDADE
========================================================= */

function calcularResumoAtividades() {
    return atividadesRendaNotas.map(
        function (atividade) {
            const periodos =
                periodosNotas.filter(
                    function (periodo) {
                        return (
                            periodo.atividadeId ===
                            atividade.id
                        );
                    }
                );

            const total =
                periodos.reduce(
                    function (
                        soma,
                        periodo
                    ) {
                        return (
                            soma +
                            (
                                Number(
                                    periodo.valor
                                ) || 0
                            )
                        );
                    },
                    0
                );

            const competencias =
                [
                    ...new Set(
                        periodos
                            .map(
                                function (
                                    periodo
                                ) {
                                    return (
                                        periodo.competencia ||
                                        converterPeriodoParaCompetencia(
                                            periodo.periodo
                                        )
                                    );
                                }
                            )
                            .filter(Boolean)
                    )
                ].sort();

            let meses = 0;

            if (
                total > 0 &&
                competencias.length > 0
            ) {
                switch (
                atividade.criterio
                ) {
                    case CRITERIOS_APURACAO_NOTAS
                        .INFORMADO:

                        meses =
                            Math.max(
                                1,
                                Math.trunc(
                                    Number(
                                        atividade
                                            .mesesRepresentados
                                    ) || 1
                                )
                            );

                        break;

                    case CRITERIOS_APURACAO_NOTAS
                        .INTERVALO:

                        meses =
                            calcularMesesEntreCompetencias(
                                competencias[0],
                                competencias[
                                competencias.length -
                                1
                                ]
                            );

                        break;

                    case CRITERIOS_APURACAO_NOTAS
                        .MOVIMENTACAO:
                    default:

                        meses =
                            competencias.length;

                        break;
                }
            }

            const rendaMensal =
                meses > 0
                    ? total /
                    meses
                    : 0;

            return {
                atividadeId:
                    atividade.id,

                total:
                    total,

                meses:
                    meses,

                rendaMensal:
                    rendaMensal
            };
        }
    );
}

/* =========================================================
   ATUALIZA RESULTADOS
========================================================= */

function atualizarResultadosNotas() {
    const resumo =
        calcularResumoAtividades();

    const rendaMensal =
        resumo.reduce(
            function (
                soma,
                item
            ) {
                return (
                    soma +
                    (
                        Number(
                            item.rendaMensal
                        ) || 0
                    )
                );
            },
            0
        );

    const rendaAnual =
        rendaMensal *
        12;

    const totalNotas =
        resumo.reduce(
            function (
                soma,
                item
            ) {
                return (
                    soma +
                    (
                        Number(
                            item.total
                        ) || 0
                    )
                );
            },
            0
        );

    const quantidadeAtividades =
        resumo.filter(
            function (item) {
                return (
                    item.total >
                    0
                );
            }
        ).length;

    const quantidadeNotas =
        periodosNotas.reduce(
            function (
                soma,
                periodo
            ) {
                return (
                    soma +
                    (
                        Number(
                            periodo.quantidade
                        ) || 0
                    )
                );
            },
            0
        );

    definirTexto(
        "resultadoRendaMensalNotas",
        formatarMoeda(
            rendaMensal
        )
    );

    definirTexto(
        "resultadoRendaAnualNotas",
        formatarMoeda(
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
            quantidadeAtividades
        )
    );

    definirTexto(
        "resultadoQuantidadeNotas",
        String(
            quantidadeNotas
        )
    );

    atualizarResumoCriterios(
        resumo
    );

    atualizarTotalizadoresPeriodos();
}

/* =========================================================
   RESUMO DOS CRITÉRIOS
========================================================= */

function atualizarResumoCriterios(
    resumo
) {
    const container =
        document.getElementById(
            "resumoCriteriosNotas"
        );

    if (!container) {
        return;
    }

    const itens =
        resumo.filter(
            function (item) {
                return (
                    item.total >
                    0
                );
            }
        );

    if (
        itens.length ===
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

    container.innerHTML = `
        <strong>
            Critérios de apuração
        </strong>

        ${itens
            .map(
                function (item) {
                    const atividade =
                        atividadesRendaNotas.find(
                            function (cadastro) {
                                return (
                                    cadastro.id ===
                                    item.atividadeId
                                );
                            }
                        );

                    const nome =
                        atividade
                            ? obterNomeAtividade(
                                atividade.grupo,
                                atividade.atividade
                            )
                            : "Atividade";

                    return `
                        <span>
                            <strong>
                                ${escaparHtml(
                        nome
                    )}
                            </strong>
                            — ${item.meses} mês(es)
                            — ${formatarMoeda(
                        item.rendaMensal
                    )}/mês
                        </span>
                    `;
                }
            )
            .join("")}
    `;
}

/* =========================================================
   LIMPAR ARQUIVOS
========================================================= */

function limparArquivosNotas() {
    arquivosSelecionados = [];
    notasProcessadas = [];

    /*
     * Períodos criados pelas notas são removidos.
     *
     * Períodos manuais são preservados porque o botão
     * é "Limpar Arquivos", e não "Limpar Cálculo".
     */
    periodosNotas =
        periodosNotas.filter(
            function (periodo) {
                return (
                    periodo.origem ===
                    "manual"
                );
            }
        );

    /*
     * Atividades automáticas sem qualquer período
     * associado são removidas.
     */
    removerAtividadesAutomaticasOrfas();

    const input =
        document.getElementById(
            "arquivosNotasFiscais"
        );

    if (input) {
        input.value = "";
    }

    mostrarStatusProcessamento(
        false
    );

    limparMensagemOcr();

    renderizarArquivosSelecionados();
    renderizarAtividades();
    renderizarNotasProcessadas();
    renderizarPeriodosNotas();
    atualizarResultadosNotas();
    atualizarAvisoRevisaoHumana();
}

/* =========================================================
   REMOVE ATIVIDADES AUTOMÁTICAS SEM USO
========================================================= */

function removerAtividadesAutomaticasOrfas() {
    const idsUsados =
        new Set(
            periodosNotas.map(
                function (periodo) {
                    return periodo.atividadeId;
                }
            )
        );

    atividadesRendaNotas =
        atividadesRendaNotas.filter(
            function (atividade) {
                if (
                    atividade.origem !==
                    "automatica"
                ) {
                    return true;
                }

                return idsUsados.has(
                    atividade.id
                );
            }
        );
}

/* =========================================================
   LIMPAR CÁLCULO COMPLETO
========================================================= */

function limparCalculoNotas() {
    arquivosSelecionados = [];
    notasProcessadas = [];
    atividadesRendaNotas = [];
    periodosNotas = [];

    const inputArquivos =
        document.getElementById(
            "arquivosNotasFiscais"
        );

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

    if (inputArquivos) {
        inputArquivos.value = "";
    }

    if (periodo) {
        periodo.value = "";
    }

    if (valor) {
        valor.value = "";
    }

    if (quantidade) {
        quantidade.value =
            "0";
    }

    mostrarStatusProcessamento(
        false
    );

    limparMensagemOcr();

    renderizarArquivosSelecionados();
    renderizarAtividades();
    renderizarNotasProcessadas();
    renderizarPeriodosNotas();
    atualizarResultadosNotas();
    atualizarAvisoRevisaoHumana();
}

/* =========================================================
   STATUS DE PROCESSAMENTO
========================================================= */

function mostrarStatusProcessamento(
    mostrar,
    titulo = "",
    descricao = ""
) {
    const container =
        document.getElementById(
            "statusOcrNotas"
        );

    if (!container) {
        return;
    }

    container.hidden =
        !mostrar;

    definirTexto(
        "tituloStatusOcrNotas",
        titulo
    );

    definirTexto(
        "textoStatusOcrNotas",
        descricao
    );
}

function atualizarStatusProcessamentoArquivo(
    indice,
    total,
    nome
) {
    const percentual =
        Math.round(
            (
                indice /
                Math.max(
                    total,
                    1
                )
            ) *
            100
        );

    mostrarStatusProcessamento(
        true,
        `Processando documentos (${percentual}%)`,
        nome
    );
}

function atualizarProgressoOcr(
    indiceArquivo,
    totalArquivos,
    progressoArquivo,
    nome
) {
    const progresso =
        Math.min(
            1,
            Math.max(
                0,
                Number(
                    progressoArquivo
                ) || 0
            )
        );

    const total =
        Math.max(
            totalArquivos,
            1
        );

    const percentual =
        Math.round(
            (
                (
                    indiceArquivo +
                    progresso
                ) /
                total
            ) *
            100
        );

    mostrarStatusProcessamento(
        true,
        `Processando documentos (${percentual}%)`,
        nome
    );
}

/* =========================================================
   MENSAGEM OCR
========================================================= */

function exibirMensagemOcr(
    mensagem,
    tipo = "info"
) {
    const container =
        document.getElementById(
            "resultadoOcrNotas"
        );

    if (!container) {
        return;
    }

    container.hidden =
        false;

    container.className =
        "notas-resultado-ocr";

    if (
        tipo === "sucesso"
    ) {
        container.classList.add(
            "notas-status-sucesso"
        );
    } else if (
        tipo === "atencao"
    ) {
        container.classList.add(
            "notas-status-atencao"
        );
    } else if (
        tipo === "erro"
    ) {
        container.classList.add(
            "notas-status-erro"
        );
    }

    container.textContent =
        mensagem;
}

function limparMensagemOcr() {
    const container =
        document.getElementById(
            "resultadoOcrNotas"
        );

    if (!container) {
        return;
    }

    container.hidden =
        true;

    container.className =
        "notas-resultado-ocr";

    container.textContent =
        "";
}

/* =========================================================
   NOMES DAS ATIVIDADES
========================================================= */

function obterNomeGrupo(
    grupo
) {
    return (
        window.CreditoRuralAtividades
            ?.obterNomeGrupo(
                grupo
            ) ||
        grupo ||
        ""
    );
}

function obterNomeAtividade(
    grupo,
    atividade
) {
    return (
        window.CreditoRuralAtividades
            ?.obterNomeAtividade(
                atividade,
                grupo
            ) ||
        atividade ||
        ""
    );
}

/* =========================================================
   COMPETÊNCIA
========================================================= */

function converterPeriodoParaCompetencia(
    periodo
) {
    const texto =
        String(
            periodo || ""
        )
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .trim()
            .toUpperCase();

    /*
     * Aceita YYYY-MM.
     */
    const iso =
        texto.match(
            /^(\d{4})-(\d{2})$/
        );

    if (iso) {
        const mes =
            Number(
                iso[2]
            );

        if (
            mes >= 1 &&
            mes <= 12
        ) {
            return `${iso[1]}-${String(
                mes
            ).padStart(2, "0")}`;
        }

        return "";
    }

    /*
     * Aceita MM/YYYY.
     */
    const numerico =
        texto.match(
            /^(\d{1,2})\/(\d{4})$/
        );

    if (numerico) {
        const mes =
            Number(
                numerico[1]
            );

        if (
            mes >= 1 &&
            mes <= 12
        ) {
            return `${numerico[2]}-${String(
                mes
            ).padStart(2, "0")}`;
        }

        return "";
    }

    /*
     * Aceita Janeiro/2026.
     */
    const match =
        texto.match(
            /^([A-Z]+)\/(\d{4})$/
        );

    if (!match) {
        return "";
    }

    const meses = {
        JANEIRO: 1,
        FEVEREIRO: 2,
        MARCO: 3,
        ABRIL: 4,
        MAIO: 5,
        JUNHO: 6,
        JULHO: 7,
        AGOSTO: 8,
        SETEMBRO: 9,
        OUTUBRO: 10,
        NOVEMBRO: 11,
        DEZEMBRO: 12
    };

    const mes =
        meses[
        match[1]
        ];

    if (!mes) {
        return "";
    }

    return `${match[2]}-${String(
        mes
    ).padStart(2, "0")}`;
}

function formatarCompetenciaParaExibicao(
    competencia
) {
    const match =
        String(
            competencia || ""
        ).match(
            /^(\d{4})-(\d{2})$/
        );

    if (!match) {
        return competencia || "";
    }

    const meses = [
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

    const indice =
        Number(
            match[2]
        ) - 1;

    if (
        indice < 0 ||
        indice >=
        meses.length
    ) {
        return competencia;
    }

    return `${meses[indice]}/${match[1]}`;
}

/* =========================================================
   MESES ENTRE COMPETÊNCIAS
========================================================= */

function calcularMesesEntreCompetencias(
    inicial,
    final
) {
    const inicio =
        competenciaParaSerial(
            inicial
        );

    const fim =
        competenciaParaSerial(
            final
        );

    if (
        !Number.isFinite(
            inicio
        ) ||
        !Number.isFinite(
            fim
        )
    ) {
        return 0;
    }

    return (
        Math.abs(
            fim -
            inicio
        ) +
        1
    );
}

function competenciaParaSerial(
    competencia
) {
    const match =
        String(
            competencia || ""
        ).match(
            /^(\d{4})-(\d{2})$/
        );

    if (!match) {
        return NaN;
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
        mes < 1 ||
        mes > 12
    ) {
        return NaN;
    }

    return (
        ano *
        12 +
        mes -
        1
    );
}

/* =========================================================
   MOEDA
========================================================= */

function converterMoedaParaNumero(
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
    if (!input) {
        return;
    }

    const digitos =
        String(
            input.value || ""
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
        ) / 100;

    input.value =
        formatarMoeda(
            numero
        );
}

function formatarMoeda(
    valor
) {
    return Number(
        valor || 0
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

/* =========================================================
   TAMANHO DO ARQUIVO
========================================================= */

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
        return `${tamanho} B`;
    }

    if (
        tamanho <
        1024 *
        1024
    ) {
        return `${(
            tamanho /
            1024
        ).toFixed(1)} KB`;
    }

    return `${(
        tamanho /
        1024 /
        1024
    ).toFixed(2)} MB`;
}

/* =========================================================
   LINHA SEM DADOS
========================================================= */

function inserirLinhaSemDados(
    tbody,
    colunas,
    mensagem
) {
    if (!tbody) {
        return;
    }

    const tr =
        document.createElement(
            "tr"
        );

    tr.className =
        "notas-linha-vazia";

    tr.innerHTML = `
        <td colspan="${colunas}">
            ${escaparHtml(
        mensagem
    )}
        </td>
    `;

    tbody.appendChild(
        tr
    );
}

/* =========================================================
   HELPERS DOM
========================================================= */

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
            String(
                valor ??
                ""
            );
    }
}

function escaparHtml(
    valor
) {
    return String(
        valor ??
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

/* =========================================================
   ID
========================================================= */

function gerarId() {
    if (
        window.crypto &&
        typeof window.crypto
            .randomUUID ===
        "function"
    ) {
        return window.crypto
            .randomUUID();
    }

    return [
        Date.now(),
        Math.random()
            .toString(36)
            .substring(2)
    ].join("_");
}

/* =========================================================
   CEDE CONTROLE AO NAVEGADOR
========================================================= */

function cederControleInterface() {
    return new Promise(
        function (resolve) {
            setTimeout(
                resolve,
                0
            );
        }
    );
}