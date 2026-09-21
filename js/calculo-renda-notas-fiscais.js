/**
 * calculo-renda-notas-fiscais.js
 *
 * Caixa de Ferramentas - Sicoob Mantiqueira
 *
 * Cálculo de renda por notas fiscais.
 *
 * Dependências:
 *
 * - credito-rural-atividades.js
 * - credito-rural-ncm-atividades.js
 * - credito-rural-notas-fiscais.js
 * - Tesseract.js
 *
 * Fluxo:
 *
 * 1. usuário envia XML, PDF ou imagem;
 * 2. sistema processa os documentos;
 * 3. NF-e/XML tenta identificar a atividade automaticamente;
 * 4. notas antigas são interpretadas com validações adicionais;
 * 5. documentos incertos ficam para revisão humana;
 * 6. atividades identificadas são adicionadas automaticamente;
 * 7. notas confirmadas são agrupadas por atividade + competência;
 * 8. renda é calculada individualmente por atividade;
 * 9. rendas mensais são somadas;
 * 10. renda anual = renda mensal total × 12.
 */

document.addEventListener(
    "DOMContentLoaded",
    iniciarCalculoRendaNotas
);

/* =========================================================
   CONSTANTES
   ========================================================= */

const CRITERIOS_APURACAO_NOTAS =
    Object.freeze({
        MOVIMENTACAO:
            "movimentacao",

        INTERVALO:
            "intervalo",

        INFORMADO:
            "informado"
    });

const QUALIDADE_MINIMA_OCR =
    45;

/* =========================================================
   ESTADO
   ========================================================= */

let arquivosSelecionados = [];
let notasProcessadas = [];
let atividadesRendaNotas = [];
let periodosNotas = [];

/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

function iniciarCalculoRendaNotas() {
    verificarDependencias();

    inicializarSeletoresAtividadeNotas();
    configurarEventosNotas();

    renderizarArquivosSelecionados();
    renderizarAtividadesRendaNotas();
    renderizarNotasProcessadas();
    renderizarPeriodosNotas();
    atualizarResultadosNotas();
}

/* =========================================================
   DEPENDÊNCIAS
   ========================================================= */

function verificarDependencias() {
    if (
        !window.CreditoRuralAtividades
    ) {
        console.error(
            "credito-rural-atividades.js não carregado."
        );
    }

    if (
        !window.CreditoRuralNcmAtividades
    ) {
        console.error(
            "credito-rural-ncm-atividades.js não carregado."
        );
    }

    if (
        !window.CreditoRuralNotasFiscais
    ) {
        console.error(
            "credito-rural-notas-fiscais.js não carregado."
        );
    }
}

/* =========================================================
   ELEMENTOS
   ========================================================= */

function obterElementoPorIds(
    ...ids
) {
    for (
        const id of
        ids
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

/* =========================================================
   SELETORES DE ATIVIDADE
   ========================================================= */

function inicializarSeletoresAtividadeNotas() {
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
        !atividade ||
        !window.CreditoRuralAtividades
    ) {
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
            "agricola",
            null,
            false
        );
}

/* =========================================================
   EVENTOS
   ========================================================= */

function configurarEventosNotas() {
    const arquivos =
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

    const btnLimpar =
        document.getElementById(
            "btnLimparArquivosNotas"
        );

    const btnAtividade =
        document.getElementById(
            "btnAdicionarAtividadeNotas"
        );

    const grupo =
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

    const btnPeriodo =
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

    btnSelecionar?.addEventListener(
        "click",
        () =>
            arquivos?.click()
    );

    arquivos?.addEventListener(
        "change",
        function () {
            adicionarArquivosSelecionados(
                Array.from(
                    this.files ||
                    []
                )
            );

            this.value = "";

            renderizarArquivosSelecionados();
        }
    );

    btnProcessar?.addEventListener(
        "click",
        processarArquivosNotas
    );

    btnLimpar?.addEventListener(
        "click",
        limparArquivosNotas
    );

    btnAtividade?.addEventListener(
        "click",
        adicionarAtividadeManual
    );

    grupo?.addEventListener(
        "change",
        function () {
            window.CreditoRuralAtividades
                ?.preencherAtividadesEmSelect(
                    atividade,
                    this.value,
                    null,
                    false
                );
        }
    );

    criterio?.addEventListener(
        "change",
        atualizarCampoMeses
    );

    btnPeriodo?.addEventListener(
        "click",
        adicionarPeriodoManual
    );

    valorPeriodo?.addEventListener(
        "input",
        function () {
            aplicarMascaraMoeda(
                this
            );
        }
    );

    btnCalcular?.addEventListener(
        "click",
        atualizarResultadosNotas
    );

    btnLimparCalculo?.addEventListener(
        "click",
        limparCalculoNotas
    );

    atualizarCampoMeses();
}

/* =========================================================
   VISIBILIDADE DOS MESES
   ========================================================= */

function atualizarCampoMeses() {
    const criterio =
        document.getElementById(
            "criterioAtividadeNotas"
        );

    const campo =
        document.getElementById(
            "campoMesesAtividadeNotas"
        );

    if (
        criterio &&
        campo
    ) {
        campo.hidden =
            criterio.value !==
            CRITERIOS_APURACAO_NOTAS
                .INFORMADO;
    }
}

/* =========================================================
   ARQUIVOS
   ========================================================= */

function adicionarArquivosSelecionados(
    arquivos
) {
    const existentes =
        new Set(
            arquivosSelecionados.map(
                gerarChaveArquivo
            )
        );

    arquivos.forEach(
        arquivo => {
            const chave =
                gerarChaveArquivo(
                    arquivo
                );

            if (
                !existentes.has(
                    chave
                )
            ) {
                arquivosSelecionados.push(
                    arquivo
                );

                existentes.add(
                    chave
                );
            }
        }
    );
}

function gerarChaveArquivo(
    arquivo
) {
    return [
        arquivo.name,
        arquivo.size,
        arquivo.lastModified
    ].join("|");
}

function renderizarArquivosSelecionados() {
    const lista =
        document.getElementById(
            "listaArquivosNotas"
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
        (
            arquivo,
            indice
        ) => {
            const div =
                document.createElement(
                    "div"
                );

            div.className =
                "notas-arquivo-item";

            div.innerHTML = `
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
                >
                    Remover
                </button>
            `;

            div.querySelector(
                ".notas-arquivo-remover"
            )?.addEventListener(
                "click",
                () => {
                    arquivosSelecionados.splice(
                        indice,
                        1
                    );

                    renderizarArquivosSelecionados();
                }
            );

            lista.appendChild(
                div
            );
        }
    );
}

/* =========================================================
   PROCESSAMENTO
   ========================================================= */

async function processarArquivosNotas() {
    if (
        arquivosSelecionados.length ===
        0
    ) {
        exibirMensagemOcr(
            "Selecione pelo menos um arquivo.",
            "atencao"
        );

        return;
    }

    notasProcessadas = [];

    const botao =
        document.getElementById(
            "btnProcessarNotas"
        );

    if (botao) {
        botao.disabled = true;
    }

    try {
        for (
            let i = 0;
            i <
            arquivosSelecionados.length;
            i++
        ) {
            const arquivo =
                arquivosSelecionados[i];

            mostrarStatusProcessamento(
                true,
                `Processando ${i + 1} de ${arquivosSelecionados.length}`,
                arquivo.name
            );

            try {
                const notas =
                    await processarArquivoNotaFiscal(
                        arquivo,
                        i,
                        arquivosSelecionados.length
                    );

                notasProcessadas.push(
                    ...notas
                );
            } catch (erro) {
                console.error(
                    arquivo.name,
                    erro
                );

                notasProcessadas.push(
                    criarNotaErro(
                        arquivo.name
                    )
                );
            }

            await liberarInterface();
        }

        processarAtividadesAutomaticas();

        consolidarNotasNosPeriodos();

        renderizarAtividadesRendaNotas();
        renderizarNotasProcessadas();
        renderizarPeriodosNotas();
        atualizarResultadosNotas();

        const revisar =
            notasProcessadas.filter(
                nota =>
                    !nota.confirmada
            ).length;

        exibirMensagemOcr(
            revisar > 0
                ? `${notasProcessadas.length} documento(s) processado(s). ${revisar} requer(em) revisão.`
                : `${notasProcessadas.length} documento(s) processado(s) com sucesso.`,
            revisar > 0
                ? "atencao"
                : "sucesso"
        );
    } finally {
        mostrarStatusProcessamento(
            false
        );

        if (botao) {
            botao.disabled = false;
        }
    }
}

/* =========================================================
   PROCESSA UM ARQUIVO
   ========================================================= */

async function processarArquivoNotaFiscal(
    arquivo,
    indice,
    total
) {
    const nome =
        String(
            arquivo.name ||
            ""
        ).toLowerCase();

    if (
        nome.endsWith(
            ".xml"
        )
    ) {
        const texto =
            await arquivo.text();

        return [
            window.CreditoRuralNotasFiscais
                .interpretarXmlNfe(
                    texto,
                    arquivo.name
                )
        ];
    }

    if (
        nome.endsWith(
            ".pdf"
        )
    ) {
        return processarPdfNotaFiscal(
            arquivo,
            indice,
            total
        );
    }

    if (
        /\.(jpg|jpeg|png|webp)$/i
            .test(
                nome
            )
    ) {
        const ocr =
            await executarOcrComRotacao(
                arquivo,
                progresso =>
                    atualizarProgressoArquivo(
                        indice,
                        total,
                        progresso,
                        arquivo.name
                    )
            );

        const nota =
            window.CreditoRuralNotasFiscais
                .interpretar(
                    ocr.texto,
                    arquivo.name
                );

        nota.rotacaoOcr =
            ocr.angulo;

        return [
            nota
        ];
    }

    throw new Error(
        "Formato não suportado."
    );
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

    for (
        let paginaNumero = 1;
        paginaNumero <=
        pdf.numPages;
        paginaNumero++
    ) {
        const pagina =
            await pdf.getPage(
                paginaNumero
            );

        let texto =
            await extrairTextoPaginaPdf(
                pagina
            );

        let rotacaoOcr = 0;

        const qualidade =
            window.CreditoRuralNotasFiscais
                .avaliarQualidadeTexto(
                    texto
                );

        if (
            texto.replace(
                /\s/g,
                ""
            ).length < 80 ||
            qualidade < 20
        ) {
            const canvas =
                await renderizarPaginaPdf(
                    pagina
                );

            const ocr =
                await executarOcrComRotacao(
                    canvas,
                    progresso => {
                        const parcial =
                            (
                                paginaNumero -
                                1 +
                                progresso
                            ) /
                            pdf.numPages;

                        atualizarProgressoArquivo(
                            indiceArquivo,
                            totalArquivos,
                            parcial,
                            `${arquivo.name} - Página ${paginaNumero}`
                        );
                    }
                );

            texto =
                ocr.texto;

            rotacaoOcr =
                ocr.angulo;

            canvas.width = 1;
            canvas.height = 1;
        }

        const nota =
            window.CreditoRuralNotasFiscais
                .interpretar(
                    texto,
                    pdf.numPages > 1
                        ? `${arquivo.name} - Página ${paginaNumero}`
                        : arquivo.name
                );

        nota.rotacaoOcr =
            rotacaoOcr;

        notas.push(
            nota
        );

        pagina.cleanup?.();

        await liberarInterface();
    }

    pdf.cleanup?.();

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

    const pdfjs =
        await import(
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs"
        );

    pdfjs
        .GlobalWorkerOptions
        .workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

    window.pdfjsLib =
        pdfjs;

    return pdfjs;
}

async function extrairTextoPaginaPdf(
    pagina
) {
    try {
        const conteudo =
            await pagina
                .getTextContent();

        return conteudo.items
            .map(
                item =>
                    item.str
            )
            .join("\n");
    } catch {
        return "";
    }
}

async function renderizarPaginaPdf(
    pagina
) {
    const viewport =
        pagina.getViewport({
            scale:
                2.2
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

    await pagina.render({
        canvasContext:
            canvas.getContext(
                "2d",
                {
                    willReadFrequently:
                        true
                }
            ),
        viewport
    }).promise;

    return canvas;
}

/* =========================================================
   OCR
   ========================================================= */

async function executarOcrBasico(
    imagem,
    callback
) {
    if (
        !window.Tesseract
    ) {
        throw new Error(
            "Tesseract.js não carregado."
        );
    }

    const resultado =
        await window.Tesseract
            .recognize(
                imagem,
                "por",
                {
                    logger:
                        mensagem => {
                            if (
                                mensagem.status ===
                                "recognizing text"
                            ) {
                                callback?.(
                                    mensagem.progress ||
                                    0
                                );
                            }
                        }
                }
            );

    return (
        resultado?.data?.text ||
        ""
    );
}

async function executarOcrComRotacao(
    imagem,
    callback
) {
    const inicial =
        await executarOcrBasico(
            imagem,
            callback
        );

    let melhor = {
        texto:
            inicial,

        angulo:
            0,

        qualidade:
            window.CreditoRuralNotasFiscais
                .avaliarQualidadeTexto(
                    inicial
                )
    };

    if (
        melhor.qualidade >=
        QUALIDADE_MINIMA_OCR
    ) {
        return melhor;
    }

    const base =
        await converterImagemParaCanvas(
            imagem
        );

    for (
        const angulo of
        [
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

        const texto =
            await executarOcrBasico(
                rotacionado,
                callback
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
                angulo,
                qualidade
            };
        }

        rotacionado.width = 1;
        rotacionado.height = 1;

        if (
            melhor.qualidade >=
            QUALIDADE_MINIMA_OCR
        ) {
            break;
        }
    }

    base.width = 1;
    base.height = 1;

    return melhor;
}

/* =========================================================
   CANVAS
   ========================================================= */

async function converterImagemParaCanvas(
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
            origem.width;

        canvas.height =
            origem.height;

        canvas
            .getContext(
                "2d"
            )
            .drawImage(
                origem,
                0,
                0
            );

        return canvas;
    }

    const bitmap =
        await createImageBitmap(
            origem
        );

    const canvas =
        document.createElement(
            "canvas"
        );

    canvas.width =
        bitmap.width;

    canvas.height =
        bitmap.height;

    canvas
        .getContext(
            "2d"
        )
        .drawImage(
            bitmap,
            0,
            0
        );

    bitmap.close?.();

    return canvas;
}

function rotacionarCanvas(
    origem,
    angulo
) {
    const radianos =
        angulo *
        Math.PI /
        180;

    const trocar =
        angulo === 90 ||
        angulo === 270;

    const canvas =
        document.createElement(
            "canvas"
        );

    canvas.width =
        trocar
            ? origem.height
            : origem.width;

    canvas.height =
        trocar
            ? origem.width
            : origem.height;

    const ctx =
        canvas.getContext(
            "2d"
        );

    ctx.translate(
        canvas.width /
        2,
        canvas.height /
        2
    );

    ctx.rotate(
        radianos
    );

    ctx.drawImage(
        origem,
        -origem.width /
        2,
        -origem.height /
        2
    );

    return canvas;
}

/* =========================================================
   ATIVIDADES AUTOMÁTICAS
   ========================================================= */

function processarAtividadesAutomaticas() {
    notasProcessadas.forEach(
        nota => {
            const sugestoes =
                nota.atividadesSugeridas ||
                [];

            if (
                sugestoes.length !==
                1
            ) {
                nota.atividadeId =
                    "";

                nota.confirmada =
                    false;

                return;
            }

            const sugestao =
                sugestoes[0];

            if (
                !sugestao.atividade
            ) {
                nota.atividadeId =
                    "";

                nota.confirmada =
                    false;

                return;
            }

            const atividade =
                obterOuCriarAtividadeAutomatica(
                    sugestao.grupo,
                    sugestao.atividade
                );

            nota.atividadeId =
                atividade.id;

            if (
                !sugestao.automatico
            ) {
                nota.confirmada =
                    false;

                nota.requerConferencia =
                    true;
            }

            /*
             * Nota de produtor antiga nunca entra
             * automaticamente.
             */
            if (
                nota.modelo ===
                "produtor_antiga"
            ) {
                nota.confirmada =
                    false;

                nota.requerConferencia =
                    true;
            }
        }
    );
}

/* =========================================================
   CRIA ATIVIDADE AUTOMÁTICA
   ========================================================= */

function obterOuCriarAtividadeAutomatica(
    grupo,
    atividade
) {
    let existente =
        atividadesRendaNotas.find(
            item =>
                item.grupo ===
                grupo &&
                item.atividade ===
                atividade
        );

    if (existente) {
        return existente;
    }

    existente = {
        id:
            gerarId(),

        grupo,

        atividade,

        criterio:
            CRITERIOS_APURACAO_NOTAS
                .MOVIMENTACAO,

        mesesRepresentados:
            12,

        origem:
            "automatica"
    };

    atividadesRendaNotas.push(
        existente
    );

    return existente;
}

/* =========================================================
   ATIVIDADE MANUAL
   ========================================================= */

function adicionarAtividadeManual() {
    const grupo =
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

    const meses =
        document.getElementById(
            "mesesAtividadeNotas"
        );

    if (
        !grupo?.value ||
        !atividade?.value
    ) {
        return;
    }

    const existente =
        atividadesRendaNotas.find(
            item =>
                item.grupo ===
                grupo.value &&
                item.atividade ===
                atividade.value
        );

    if (existente) {
        exibirMensagemOcr(
            "Essa atividade já está cadastrada.",
            "atencao"
        );

        return;
    }

    atividadesRendaNotas.push({
        id:
            gerarId(),

        grupo:
            grupo.value,

        atividade:
            atividade.value,

        criterio:
            criterio.value,

        mesesRepresentados:
            Math.max(
                1,
                Number(
                    meses?.value
                ) ||
                12
            ),

        origem:
            "manual"
    });

    renderizarAtividadesRendaNotas();
    renderizarNotasProcessadas();
}

/* =========================================================
   TABELA DE ATIVIDADES
   ========================================================= */

function renderizarAtividadesRendaNotas() {
    const tbody =
        document.getElementById(
            "tabelaAtividadesNotas"
        );

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    if (
        atividadesRendaNotas.length ===
        0
    ) {
        tbody.innerHTML = `
            <tr class="notas-linha-vazia">
                <td colspan="7">
                    Nenhuma atividade identificada ou adicionada.
                </td>
            </tr>
        `;

        return;
    }

    const resumo =
        calcularResumoAtividades();

    atividadesRendaNotas.forEach(
        atividade => {
            const calculo =
                resumo.find(
                    item =>
                        item.atividadeId ===
                        atividade.id
                );

            const nomeGrupo =
                obterNomeGrupo(
                    atividade.grupo
                );

            const nomeAtividade =
                obterNomeAtividade(
                    atividade.grupo,
                    atividade.atividade
                );

            const tr =
                document.createElement(
                    "tr"
                );

            tr.innerHTML = `
                <td>
                    ${escaparHtml(
                nomeGrupo
            )}
                </td>

                <td>
                    ${escaparHtml(
                nomeAtividade
            )}

                    ${atividade.origem ===
                    "automatica"
                    ? `
                                <small
                                    style="
                                        display:block;
                                        margin-top:3px;
                                        opacity:.7;
                                    "
                                >
                                    Identificada automaticamente
                                </small>
                            `
                    : ""
                }
                </td>

                <td>
                    <select
                        class="notas-input-tabela atividade-criterio"
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
                    CRITERIOS_APURACAO_NOTAS
                        .INFORMADO
                    ? ""
                    : "disabled"
                }
                    >
                </td>

                <td>
                    ${calculo
                    ?.mesesConsiderados ||
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

                <td class="notas-coluna-acoes">
                    <button
                        type="button"
                        class="notas-btn-remover"
                    >
                        Remover
                    </button>
                </td>
            `;

            tbody.appendChild(
                tr
            );

            tr.querySelector(
                ".atividade-criterio"
            )?.addEventListener(
                "change",
                function () {
                    atividade.criterio =
                        this.value;

                    renderizarAtividadesRendaNotas();
                    atualizarResultadosNotas();
                }
            );

            tr.querySelector(
                ".atividade-meses"
            )?.addEventListener(
                "change",
                function () {
                    atividade.mesesRepresentados =
                        Math.max(
                            1,
                            Number(
                                this.value
                            ) ||
                            1
                        );

                    atualizarResultadosNotas();
                }
            );

            tr.querySelector(
                ".notas-btn-remover"
            )?.addEventListener(
                "click",
                () =>
                    removerAtividade(
                        atividade.id
                    )
            );
        }
    );
}

/* =========================================================
   REMOVE ATIVIDADE
   ========================================================= */

function removerAtividade(
    id
) {
    atividadesRendaNotas =
        atividadesRendaNotas.filter(
            item =>
                item.id !==
                id
        );

    notasProcessadas.forEach(
        nota => {
            if (
                nota.atividadeId ===
                id
            ) {
                nota.atividadeId =
                    "";

                nota.confirmada =
                    false;
            }
        }
    );

    periodosNotas =
        periodosNotas.filter(
            periodo =>
                periodo.atividadeId !==
                id
        );

    renderizarAtividadesRendaNotas();
    renderizarNotasProcessadas();
    renderizarPeriodosNotas();
    atualizarResultadosNotas();
}

/* =========================================================
   OPÇÕES DE CRITÉRIO
   ========================================================= */

function gerarOpcoesCriterio(
    atual
) {
    return `
        <option
            value="movimentacao"
            ${atual ===
            "movimentacao"
            ? "selected"
            : ""
        }
        >
            Meses com movimentação
        </option>

        <option
            value="intervalo"
            ${atual ===
            "intervalo"
            ? "selected"
            : ""
        }
        >
            Intervalo completo
        </option>

        <option
            value="informado"
            ${atual ===
            "informado"
            ? "selected"
            : ""
        }
        >
            Período econômico informado
        </option>
    `;
}

/* =========================================================
   NOMES
   ========================================================= */

function obterNomeGrupo(
    grupo
) {
    return (
        window.CreditoRuralAtividades
            ?.obterNomeGrupo(
                grupo
            ) ||
        grupo
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
        atividade
    );
}

/* =========================================================
   SELECT DAS ATIVIDADES
   ========================================================= */

function gerarOpcoesAtividades(
    selecionada
) {
    let html = `
        <option value="">
            Selecione
        </option>
    `;

    atividadesRendaNotas.forEach(
        atividade => {
            html += `
                <option
                    value="${atividade.id}"
                    ${atividade.id ===
                    selecionada
                    ? "selected"
                    : ""
                }
                >
                    ${escaparHtml(
                    obterNomeAtividade(
                        atividade.grupo,
                        atividade.atividade
                    )
                )}
                </option>
            `;
        }
    );

    return html;
}

/* =========================================================
   NOTAS PROCESSADAS
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
        tbody.innerHTML = `
            <tr class="notas-linha-vazia">
                <td colspan="7">
                    Nenhuma nota fiscal processada.
                </td>
            </tr>
        `;

        return;
    }

    notasProcessadas.forEach(
        nota => {
            const tr =
                document.createElement(
                    "tr"
                );

            tr.innerHTML = `
                <td>
                    ${escaparHtml(
                nota.arquivo
            )}

                    <small
                        style="
                            display:block;
                            margin-top:3px;
                            opacity:.7;
                        "
                    >
                        ${escaparHtml(
                nota.modeloDescricao ||
                ""
            )}
                    </small>
                </td>

                <td>
                    <input
                        type="text"
                        class="notas-input-tabela nota-data"
                        value="${escaparHtml(
                nota.data ||
                ""
            )}"
                    >
                </td>

                <td>
                    <input
                        type="text"
                        class="notas-input-tabela nota-numero"
                        value="${escaparHtml(
                nota.numero ||
                ""
            )}"
                    >
                </td>

                <td>
                    <input
                        type="text"
                        class="notas-input-tabela nota-emitente"
                        value="${escaparHtml(
                nota.emitente ||
                ""
            )}"
                    >
                </td>

                <td>
                    <input
                        type="text"
                        class="notas-input-tabela nota-valor"
                        value="${nota.valor > 0
                    ? formatarMoeda(
                        nota.valor
                    )
                    : ""
                }"
                    >
                </td>

                <td>
                    <select
                        class="notas-input-tabela nota-atividade-editar"
                    >
                        ${gerarOpcoesAtividades(
                    nota.atividadeId ||
                    ""
                )}
                    </select>
                </td>

                <td>
                    <span
                        class="notas-status ${nota.confirmada
                    ? "notas-status-sucesso"
                    : "notas-status-atencao"
                }"
                    >
                        ${nota.confirmada
                    ? "Confirmada"
                    : escaparHtml(
                        nota.status ||
                        "Revisar"
                    )
                }
                    </span>

                    ${!nota.confirmada
                    ? `
                                <button
                                    type="button"
                                    class="notas-btn nota-confirmar"
                                    style="
                                        min-width:0;
                                        min-height:28px;
                                        margin-top:6px;
                                        padding:4px 8px;
                                        font-size:8px;
                                    "
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

            configurarEventosLinhaNota(
                tr,
                nota
            );
        }
    );
}

/* =========================================================
   EVENTOS DA NOTA
   ========================================================= */

function configurarEventosLinhaNota(
    tr,
    nota
) {
    const data =
        tr.querySelector(
            ".nota-data"
        );

    const numero =
        tr.querySelector(
            ".nota-numero"
        );

    const emitente =
        tr.querySelector(
            ".nota-emitente"
        );

    const valor =
        tr.querySelector(
            ".nota-valor"
        );

    const atividade =
        tr.querySelector(
            ".nota-atividade-editar"
        );

    data?.addEventListener(
        "change",
        function () {
            const normalizada =
                window.CreditoRuralNotasFiscais
                    .normalizarData(
                        this.value
                    );

            if (
                window.CreditoRuralNotasFiscais
                    .validarData(
                        normalizada
                    )
            ) {
                nota.data =
                    normalizada;

                nota.competencia =
                    window.CreditoRuralNotasFiscais
                        .formatarCompetenciaData(
                            normalizada
                        );

                this.value =
                    normalizada;
            } else {
                nota.data =
                    null;

                nota.competencia =
                    "";
            }

            nota.confirmada =
                false;

            consolidarNotasNosPeriodos();
        }
    );

    numero?.addEventListener(
        "change",
        function () {
            nota.numero =
                this.value.trim();
        }
    );

    emitente?.addEventListener(
        "change",
        function () {
            nota.emitente =
                this.value.trim();
        }
    );

    valor?.addEventListener(
        "input",
        function () {
            aplicarMascaraMoeda(
                this
            );
        }
    );

    valor?.addEventListener(
        "change",
        function () {
            nota.valor =
                converterMoedaParaNumero(
                    this.value
                );

            nota.confirmada =
                false;

            consolidarNotasNosPeriodos();
        }
    );

    atividade?.addEventListener(
        "change",
        function () {
            nota.atividadeId =
                this.value;

            nota.confirmada =
                false;

            consolidarNotasNosPeriodos();
        }
    );

    tr.querySelector(
        ".nota-confirmar"
    )?.addEventListener(
        "click",
        () =>
            confirmarNota(
                nota
            )
    );
}

/* =========================================================
   CONFIRMA NOTA
   ========================================================= */

function confirmarNota(
    nota
) {
    if (
        !nota.data ||
        !nota.competencia
    ) {
        exibirMensagemOcr(
            "Informe uma data válida.",
            "atencao"
        );

        return;
    }

    if (
        Number(
            nota.valor
        ) <=
        0
    ) {
        exibirMensagemOcr(
            "Informe o valor total da nota.",
            "atencao"
        );

        return;
    }

    if (
        !nota.atividadeId
    ) {
        exibirMensagemOcr(
            "Selecione a atividade.",
            "atencao"
        );

        return;
    }

    nota.confirmada =
        true;

    nota.requerConferencia =
        false;

    nota.status =
        "Conferida manualmente";

    consolidarNotasNosPeriodos();

    renderizarNotasProcessadas();
    renderizarAtividadesRendaNotas();
    atualizarResultadosNotas();
}

/* =========================================================
   PERÍODO MANUAL
   ========================================================= */

function adicionarPeriodoManual() {
    const atividade =
        document.getElementById(
            "atividadePeriodoNota"
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

    if (
        !atividade?.value ||
        !periodo?.value ||
        converterMoedaParaNumero(
            valor?.value
        ) <= 0
    ) {
        return;
    }

    adicionarOuSomarPeriodo({
        atividadeId:
            atividade.value,

        periodo:
            periodo.value.trim(),

        valor:
            converterMoedaParaNumero(
                valor.value
            ),

        quantidade:
            Math.max(
                0,
                Number(
                    quantidade?.value
                ) ||
                0
            ),

        origem:
            "manual"
    });

    periodo.value = "";
    valor.value = "";
    quantidade.value = "0";

    renderizarPeriodosNotas();
    atualizarResultadosNotas();
}

/* =========================================================
   CONSOLIDAÇÃO
   ========================================================= */

function consolidarNotasNosPeriodos() {
    periodosNotas =
        periodosNotas.filter(
            periodo =>
                periodo.origem !==
                "ocr"
        );

    notasProcessadas
        .filter(
            nota =>
                nota.confirmada &&
                nota.atividadeId &&
                nota.competencia &&
                Number(
                    nota.valor
                ) >
                0
        )
        .forEach(
            nota => {
                adicionarOuSomarPeriodo({
                    atividadeId:
                        nota.atividadeId,

                    periodo:
                        formatarCompetenciaExibicao(
                            nota.competencia
                        ),

                    valor:
                        nota.valor,

                    quantidade:
                        1,

                    origem:
                        "ocr"
                });
            }
        );

    ordenarPeriodos();

    renderizarPeriodosNotas();
    renderizarAtividadesRendaNotas();
    atualizarResultadosNotas();
}

/* =========================================================
   PERÍODOS
   ========================================================= */

function adicionarOuSomarPeriodo(
    dados
) {
    const chave =
        [
            dados.atividadeId,
            normalizarPeriodoChave(
                dados.periodo
            ),
            dados.origem
        ].join("|");

    const existente =
        periodosNotas.find(
            periodo =>
                [
                    periodo.atividadeId,
                    normalizarPeriodoChave(
                        periodo.periodo
                    ),
                    periodo.origem
                ].join("|") ===
                chave
        );

    if (existente) {
        existente.valor +=
            Number(
                dados.valor
            ) ||
            0;

        existente.quantidade +=
            Number(
                dados.quantidade
            ) ||
            0;

        return;
    }

    periodosNotas.push({
        id:
            gerarId(),

        atividadeId:
            dados.atividadeId,

        periodo:
            dados.periodo,

        valor:
            Number(
                dados.valor
            ) ||
            0,

        quantidade:
            Number(
                dados.quantidade
            ) ||
            0,

        origem:
            dados.origem
    });
}

/* =========================================================
   TABELA DOS PERÍODOS
   ========================================================= */

function renderizarPeriodosNotas() {
    const tbody =
        document.getElementById(
            "tabelaPeriodosNotas"
        );

    const select =
        document.getElementById(
            "atividadePeriodoNota"
        );

    if (select) {
        select.innerHTML =
            gerarOpcoesAtividades(
                select.value
            );
    }

    if (!tbody) {
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

        atualizarTotalizadoresPeriodos();

        return;
    }

    periodosNotas.forEach(
        periodo => {
            const atividade =
                atividadesRendaNotas
                    .find(
                        item =>
                            item.id ===
                            periodo.atividadeId
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
                    ${periodo.quantidade}
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

            tr.querySelector(
                ".notas-btn-remover"
            )?.addEventListener(
                "click",
                () => {
                    periodosNotas =
                        periodosNotas.filter(
                            item =>
                                item.id !==
                                periodo.id
                        );

                    renderizarPeriodosNotas();
                    atualizarResultadosNotas();
                }
            );

            tbody.appendChild(
                tr
            );
        }
    );

    atualizarTotalizadoresPeriodos();
}

/* =========================================================
   TOTALIZADORES
   ========================================================= */

function atualizarTotalizadoresPeriodos() {
    const total =
        periodosNotas.reduce(
            (
                soma,
                item
            ) =>
                soma +
                item.valor,
            0
        );

    const quantidade =
        periodosNotas.reduce(
            (
                soma,
                item
            ) =>
                soma +
                item.quantidade,
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
            quantidade
        )
    );

    definirTexto(
        "quantidadePeriodosNotas",
        String(
            periodosNotas.length
        )
    );
}

/* =========================================================
   CÁLCULO
   ========================================================= */

function calcularResumoAtividades() {
    return atividadesRendaNotas.map(
        atividade => {
            const periodos =
                periodosNotas.filter(
                    item =>
                        item.atividadeId ===
                        atividade.id
                );

            const total =
                periodos.reduce(
                    (
                        soma,
                        item
                    ) =>
                        soma +
                        item.valor,
                    0
                );

            const quantidade =
                periodos.reduce(
                    (
                        soma,
                        item
                    ) =>
                        soma +
                        item.quantidade,
                    0
                );

            const meses =
                determinarMesesConsiderados(
                    atividade,
                    periodos
                );

            return {
                atividadeId:
                    atividade.id,

                totalNotas:
                    total,

                quantidadeNotas:
                    quantidade,

                mesesConsiderados:
                    meses,

                rendaMensal:
                    meses > 0
                        ? total /
                        meses
                        : 0
            };
        }
    );
}

function determinarMesesConsiderados(
    atividade,
    periodos
) {
    if (
        !periodos.length
    ) {
        return 0;
    }

    if (
        atividade.criterio ===
        CRITERIOS_APURACAO_NOTAS
            .INFORMADO
    ) {
        return Math.max(
            1,
            Number(
                atividade
                    .mesesRepresentados
            ) ||
            1
        );
    }

    const referencias =
        periodos
            .map(
                item =>
                    converterPeriodoParaOrdenacao(
                        item.periodo
                    )
            )
            .filter(
                item =>
                    item !==
                    null
            );

    if (
        !referencias.length
    ) {
        return 0;
    }

    if (
        atividade.criterio ===
        CRITERIOS_APURACAO_NOTAS
            .INTERVALO
    ) {
        const seriais =
            referencias.map(
                referencia => {
                    const ano =
                        Math.floor(
                            referencia /
                            100
                        );

                    const mes =
                        referencia %
                        100;

                    return (
                        ano *
                        12 +
                        mes -
                        1
                    );
                }
            );

        return (
            Math.max(
                ...seriais
            ) -
            Math.min(
                ...seriais
            ) +
            1
        );
    }

    return new Set(
        referencias
    ).size;
}

function atualizarResultadosNotas() {
    const resumo =
        calcularResumoAtividades();

    const mensal =
        resumo.reduce(
            (
                soma,
                item
            ) =>
                soma +
                item.rendaMensal,
            0
        );

    const total =
        resumo.reduce(
            (
                soma,
                item
            ) =>
                soma +
                item.totalNotas,
            0
        );

    const quantidade =
        resumo.reduce(
            (
                soma,
                item
            ) =>
                soma +
                item.quantidadeNotas,
            0
        );

    definirTexto(
        "resultadoRendaMensalNotas",
        formatarMoeda(
            mensal
        )
    );

    definirTexto(
        "resultadoRendaAnualNotas",
        formatarMoeda(
            mensal *
            12
        )
    );

    definirTexto(
        "resultadoTotalNotas",
        formatarMoeda(
            total
        )
    );

    definirTexto(
        "resultadoQuantidadeAtividades",
        String(
            resumo.filter(
                item =>
                    item.totalNotas >
                    0
            ).length
        )
    );

    definirTexto(
        "resultadoQuantidadeNotas",
        String(
            quantidade
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
    const elemento =
        document.getElementById(
            "resumoCriteriosNotas"
        );

    if (!elemento) {
        return;
    }

    const linhas =
        resumo
            .filter(
                item =>
                    item.totalNotas >
                    0
            )
            .map(
                item => {
                    const atividade =
                        atividadesRendaNotas
                            .find(
                                atividade =>
                                    atividade.id ===
                                    item.atividadeId
                            );

                    return `
                        <span>
                            <strong>
                                ${escaparHtml(
                        obterNomeAtividade(
                            atividade.grupo,
                            atividade.atividade
                        )
                    )}:
                            </strong>

                            ${item.mesesConsiderados} mês(es)
                            —
                            ${formatarMoeda(
                        item.rendaMensal
                    )}/mês
                        </span>
                    `;
                }
            )
            .join("");

    elemento.innerHTML = `
        <strong>
            Critérios de apuração
        </strong>

        ${linhas ||
        `
                <span>
                    Processe as notas fiscais ou informe períodos manualmente.
                </span>
            `
        }
    `;
}

/* =========================================================
   LIMPEZA
   ========================================================= */

function limparArquivosNotas() {
    arquivosSelecionados = [];
    notasProcessadas = [];
    periodosNotas = [];
    atividadesRendaNotas = [];

    document.getElementById(
        "arquivosNotasFiscais"
    ).value = "";

    limparMensagemOcr();

    renderizarArquivosSelecionados();
    renderizarAtividadesRendaNotas();
    renderizarNotasProcessadas();
    renderizarPeriodosNotas();
    atualizarResultadosNotas();
}

function limparCalculoNotas() {
    limparArquivosNotas();
}

/* =========================================================
   NOTA DE ERRO
   ========================================================= */

function criarNotaErro(
    arquivo
) {
    return {
        arquivo,

        modelo:
            "erro",

        modeloDescricao:
            "Não identificado",

        numero:
            "",

        data:
            null,

        emitente:
            "",

        valor:
            0,

        competencia:
            "",

        itens:
            [],

        atividadesSugeridas:
            [],

        atividadeId:
            "",

        confirmada:
            false,

        requerConferencia:
            true,

        status:
            "Erro no processamento"
    };
}

/* =========================================================
   STATUS
   ========================================================= */

function mostrarStatusProcessamento(
    mostrar,
    titulo,
    texto
) {
    const elemento =
        document.getElementById(
            "statusOcrNotas"
        );

    if (!elemento) {
        return;
    }

    elemento.hidden =
        !mostrar;

    const tituloEl =
        document.getElementById(
            "tituloStatusOcrNotas"
        );

    const textoEl =
        document.getElementById(
            "textoStatusOcrNotas"
        );

    if (tituloEl) {
        tituloEl.textContent =
            titulo ||
            "";
    }

    if (textoEl) {
        textoEl.textContent =
            texto ||
            "";
    }
}

function atualizarProgressoArquivo(
    indice,
    total,
    progresso,
    descricao
) {
    const percentual =
        Math.round(
            (
                (
                    indice +
                    Number(
                        progresso ||
                        0
                    )
                ) /
                total
            ) *
            100
        );

    mostrarStatusProcessamento(
        true,
        `Processando documentos... ${percentual}%`,
        descricao
    );
}

function exibirMensagemOcr(
    mensagem,
    tipo
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

function limparMensagemOcr() {
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
}

/* =========================================================
   PERÍODOS
   ========================================================= */

function formatarCompetenciaExibicao(
    competencia
) {
    const match =
        String(
            competencia ||
            ""
        ).match(
            /^(\d{4})-(\d{2})$/
        );

    if (!match) {
        return competencia;
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

    return (
        `${meses[Number(match[2]) - 1]}/${match[1]}`
    );
}

function converterPeriodoParaOrdenacao(
    periodo
) {
    const texto =
        String(
            periodo ||
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
            .trim();

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

    let match =
        texto.match(
            /^([A-Z]+)\/(\d{4})$/
        );

    if (
        match &&
        meses[
        match[1]
        ]
    ) {
        return (
            Number(
                match[2]
            ) *
            100 +
            meses[
            match[1]
            ]
        );
    }

    match =
        texto.match(
            /^(\d{1,2})\/(\d{4})$/
        );

    if (match) {
        const mes =
            Number(
                match[1]
            );

        if (
            mes <
            1 ||
            mes >
            12
        ) {
            return null;
        }

        return (
            Number(
                match[2]
            ) *
            100 +
            mes
        );
    }

    match =
        texto.match(
            /^(\d{4})-(\d{2})$/
        );

    if (match) {
        return (
            Number(
                match[1]
            ) *
            100 +
            Number(
                match[2]
            )
        );
    }

    return null;
}

function normalizarPeriodoChave(
    periodo
) {
    return String(
        converterPeriodoParaOrdenacao(
            periodo
        ) ||
        periodo
    );
}

function ordenarPeriodos() {
    periodosNotas.sort(
        (
            a,
            b
        ) =>
            (
                converterPeriodoParaOrdenacao(
                    a.periodo
                ) ||
                0
            ) -
            (
                converterPeriodoParaOrdenacao(
                    b.periodo
                ) ||
                0
            )
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

    const numero =
        Number(
            texto.replace(
                /[^\d.-]/g,
                ""
            )
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
        input.value = "";
        return;
    }

    input.value =
        formatarMoeda(
            Number(
                digitos
            ) /
            100
        );
}

function formatarMoeda(
    valor
) {
    return (
        Number(
            valor
        ) ||
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

/* =========================================================
   UTILITÁRIOS
   ========================================================= */

function formatarTamanhoArquivo(
    bytes
) {
    if (
        bytes <
        1024
    ) {
        return (
            `${bytes} B`
        );
    }

    if (
        bytes <
        1024 *
        1024
    ) {
        return (
            `${(
                bytes /
                1024
            ).toFixed(1)} KB`
        );
    }

    return (
        `${(
            bytes /
            1024 /
            1024
        ).toFixed(2)} MB`
    );
}

function gerarId() {
    return (
        window.crypto
            ?.randomUUID?.() ||
        (
            Date.now()
                .toString(36) +
            Math.random()
                .toString(36)
                .slice(2)
        )
    );
}

function liberarInterface() {
    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                0
            )
    );
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