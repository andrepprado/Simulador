/**
 * calculo-renda-notas-fiscais.js
 *
 * Caixa de Ferramentas - Sicoob Mantiqueira
 *
 * Cálculo de renda por notas fiscais.
 *
 * Recursos:
 * - inclusão manual de períodos;
 * - upload de PDF, JPG, JPEG, PNG e WEBP;
 * - múltiplos arquivos;
 * - múltiplas páginas por PDF;
 * - extração de texto nativo de PDF;
 * - OCR para imagens e PDFs sem camada textual;
 * - identificação de data;
 * - identificação de número da nota;
 * - identificação do emitente;
 * - identificação estrita do valor total da nota;
 * - agrupamento automático por competência;
 * - cálculo da renda mensal e anual;
 * - limpeza completa do formulário.
 */

document.addEventListener("DOMContentLoaded", iniciarCalculoRendaNotas);

/* =========================================================
   ESTADO
   ========================================================= */

let periodosNotas = [];
let notasProcessadas = [];
let arquivosSelecionados = [];

/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

function iniciarCalculoRendaNotas() {
    configurarEventosNotas();
    renderizarArquivosSelecionados();
    renderizarPeriodosNotas();
    renderizarNotasProcessadas();
    atualizarResultadosNotas();
}

/* =========================================================
   EVENTOS
   ========================================================= */

function configurarEventosNotas() {
    const inputArquivos = document.getElementById("arquivosNotasFiscais");
    const btnProcessar = document.getElementById("btnProcessarArquivosNotas");
    const btnLimparArquivos = document.getElementById("btnLimparArquivosNotas");
    const btnAdicionarPeriodo = document.getElementById("btnAdicionarPeriodoNotas");
    const btnCalcular = document.getElementById("btnCalcularRendaNotas");
    const btnLimparCalculo = document.getElementById("btnLimparCalculoNotas");
    const inputValor = document.getElementById("novoValorNota");

    if (inputArquivos) {
        inputArquivos.addEventListener("change", function () {
            const novosArquivos = Array.from(this.files || []);

            adicionarArquivosSelecionados(novosArquivos);

            /*
             * Limpa o input para permitir selecionar posteriormente
             * o mesmo arquivo novamente caso tenha sido removido.
             */
            this.value = "";

            renderizarArquivosSelecionados();
            limparMensagemOcr();
        });
    }

    if (btnProcessar) {
        btnProcessar.addEventListener("click", processarArquivosNotas);
    }

    if (btnLimparArquivos) {
        btnLimparArquivos.addEventListener("click", limparArquivosNotas);
    }

    if (btnAdicionarPeriodo) {
        btnAdicionarPeriodo.addEventListener("click", adicionarPeriodoManual);
    }

    if (btnCalcular) {
        btnCalcular.addEventListener("click", atualizarResultadosNotas);
    }

    if (btnLimparCalculo) {
        btnLimparCalculo.addEventListener("click", limparCalculoNotas);
    }

    if (inputValor) {
        inputValor.addEventListener("input", function () {
            aplicarMascaraMoeda(this);
        });

        inputValor.addEventListener("blur", function () {
            const valor = converterMoedaParaNumero(this.value);

            if (valor > 0) {
                this.value = formatarMoeda(valor);
            }
        });
    }

    document.addEventListener("keydown", function (evento) {
        if (evento.key !== "Enter") {
            return;
        }

        const ativo = document.activeElement;

        if (
            ativo &&
            (
                ativo.id === "novoPeriodoNota" ||
                ativo.id === "novoValorNota" ||
                ativo.id === "novaQuantidadeNotas"
            )
        ) {
            evento.preventDefault();
            adicionarPeriodoManual();
        }
    });
}

/* =========================================================
   PERÍODOS - INCLUSÃO MANUAL
   ========================================================= */

function adicionarPeriodoManual() {
    const inputPeriodo = document.getElementById("novoPeriodoNota");
    const inputValor = document.getElementById("novoValorNota");
    const inputQuantidade = document.getElementById("novaQuantidadeNotas");

    if (!inputPeriodo || !inputValor || !inputQuantidade) {
        return;
    }

    const periodo = String(inputPeriodo.value || "").trim();

    const valor = converterMoedaParaNumero(
        inputValor.value
    );

    const quantidade = Math.max(
        0,
        parseInt(inputQuantidade.value, 10) || 0
    );

    if (!periodo) {
        inputPeriodo.focus();

        exibirMensagemOcr(
            "Informe o período antes de adicionar.",
            "atencao"
        );

        return;
    }

    if (valor <= 0) {
        inputValor.focus();

        exibirMensagemOcr(
            "Informe um valor maior que zero para o período.",
            "atencao"
        );

        return;
    }

    adicionarOuSomarPeriodo({
        periodo: periodo,
        valor: valor,
        quantidade: quantidade,
        origem: "manual"
    });

    inputPeriodo.value = "";
    inputValor.value = "";
    inputQuantidade.value = "0";

    renderizarPeriodosNotas();
    atualizarResultadosNotas();

    inputPeriodo.focus();
}

/* =========================================================
   ADICIONA OU CONSOLIDA PERÍODO
   ========================================================= */

function adicionarOuSomarPeriodo(dados) {
    const chave = normalizarPeriodoChave(
        dados.periodo
    );

    const existente = periodosNotas.find(function (item) {
        return normalizarPeriodoChave(item.periodo) === chave;
    });

    if (existente) {
        existente.valor += Number(dados.valor) || 0;
        existente.quantidade += Number(dados.quantidade) || 0;

        if (dados.origem === "ocr") {
            existente.origem = "ocr";
        }

        return existente;
    }

    const novo = {
        id: gerarId(),
        periodo: dados.periodo,
        valor: Number(dados.valor) || 0,
        quantidade: Number(dados.quantidade) || 0,
        origem: dados.origem || "manual"
    };

    periodosNotas.push(novo);

    ordenarPeriodos();

    return novo;
}

/* =========================================================
   RENDERIZAÇÃO DOS PERÍODOS
   ========================================================= */

function renderizarPeriodosNotas() {
    const tbody = document.getElementById(
        "calculo-notas-periodo"
    );

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    if (periodosNotas.length === 0) {
        const tr = document.createElement("tr");

        tr.className = "notas-linha-vazia";

        tr.innerHTML = `
            <td colspan="4">
                Nenhum período informado.
            </td>
        `;

        tbody.appendChild(tr);

        atualizarTotalizadoresPeriodos();

        return;
    }

    periodosNotas.forEach(function (item) {
        const tr = document.createElement("tr");

        tr.dataset.periodoId = item.id;

        tr.innerHTML = `
            <td>
                <input
                    type="text"
                    class="notas-input-tabela notas-periodo-editar"
                    value="${escaparHtml(item.periodo)}"
                    aria-label="Período"
                >
            </td>

            <td>
                <input
                    type="text"
                    inputmode="decimal"
                    class="notas-input-tabela notas-valor-editar"
                    value="${formatarMoeda(item.valor)}"
                    aria-label="Valor das notas"
                >
            </td>

            <td>
                <input
                    type="number"
                    min="0"
                    step="1"
                    class="notas-input-tabela notas-quantidade-editar"
                    value="${item.quantidade}"
                    aria-label="Quantidade de notas"
                >
            </td>

            <td class="notas-coluna-acoes">
                <button
                    type="button"
                    class="notas-btn-remover"
                    data-id="${item.id}"
                >
                    Remover
                </button>
            </td>
        `;

        tbody.appendChild(tr);

        const inputPeriodo =
            tr.querySelector(".notas-periodo-editar");

        const inputValor =
            tr.querySelector(".notas-valor-editar");

        const inputQuantidade =
            tr.querySelector(".notas-quantidade-editar");

        const btnRemover =
            tr.querySelector(".notas-btn-remover");

        if (inputPeriodo) {
            inputPeriodo.addEventListener(
                "change",
                function () {
                    item.periodo =
                        String(this.value || "").trim();

                    ordenarPeriodos();
                    renderizarPeriodosNotas();
                    atualizarResultadosNotas();
                }
            );
        }

        if (inputValor) {
            inputValor.addEventListener(
                "input",
                function () {
                    aplicarMascaraMoeda(this);
                }
            );

            inputValor.addEventListener(
                "change",
                function () {
                    item.valor =
                        converterMoedaParaNumero(
                            this.value
                        );

                    this.value =
                        formatarMoeda(item.valor);

                    atualizarResultadosNotas();
                    atualizarTotalizadoresPeriodos();
                }
            );
        }

        if (inputQuantidade) {
            inputQuantidade.addEventListener(
                "input",
                function () {
                    item.quantidade = Math.max(
                        0,
                        parseInt(this.value, 10) || 0
                    );

                    atualizarResultadosNotas();
                    atualizarTotalizadoresPeriodos();
                }
            );
        }

        if (btnRemover) {
            btnRemover.addEventListener(
                "click",
                function () {
                    removerPeriodo(item.id);
                }
            );
        }
    });

    atualizarTotalizadoresPeriodos();
}

/* =========================================================
   REMOVER PERÍODO
   ========================================================= */

function removerPeriodo(id) {
    periodosNotas = periodosNotas.filter(
        function (item) {
            return item.id !== id;
        }
    );

    renderizarPeriodosNotas();
    atualizarResultadosNotas();
}

/* =========================================================
   TOTALIZADORES
   ========================================================= */

function atualizarTotalizadoresPeriodos() {
    const totalNotas = periodosNotas.reduce(
        function (total, item) {
            return total + (Number(item.valor) || 0);
        },
        0
    );

    const quantidadeNotas = periodosNotas.reduce(
        function (total, item) {
            return total + (Number(item.quantidade) || 0);
        },
        0
    );

    definirTexto(
        "totalNotasPeriodos",
        formatarMoeda(totalNotas)
    );

    definirTexto(
        "quantidadeNotasPeriodos",
        String(quantidadeNotas)
    );

    definirTexto(
        "quantidadePeriodos",
        String(periodosNotas.length)
    );
}

/* =========================================================
   CÁLCULO DA RENDA
   ========================================================= */

function atualizarResultadosNotas() {
    const totalNotas = periodosNotas.reduce(
        function (total, item) {
            return total + (Number(item.valor) || 0);
        },
        0
    );

    const quantidadeNotas = periodosNotas.reduce(
        function (total, item) {
            return total + (Number(item.quantidade) || 0);
        },
        0
    );

    const quantidadePeriodos =
        periodosNotas.length;

    /*
     * REGRA:
     *
     * Renda mensal =
     * total das notas /
     * quantidade de períodos considerados.
     */
    const rendaMensal =
        quantidadePeriodos > 0
            ? totalNotas / quantidadePeriodos
            : 0;

    const rendaAnual =
        rendaMensal * 12;

    definirTexto(
        "resultadoRendaMensal",
        formatarMoeda(rendaMensal)
    );

    definirTexto(
        "resultadoRendaAnual",
        formatarMoeda(rendaAnual)
    );

    definirTexto(
        "resultadoTotalNotas",
        formatarMoeda(totalNotas)
    );

    definirTexto(
        "resultadoQuantidadePeriodos",
        String(quantidadePeriodos)
    );

    definirTexto(
        "resultadoQuantidadeNotas",
        String(quantidadeNotas)
    );

    atualizarTotalizadoresPeriodos();
}

/* =========================================================
   LIMPAR CÁLCULO
   ========================================================= */

function limparCalculoNotas() {
    /*
     * O botão "Limpar Cálculo" utiliza a mesma
     * limpeza completa do botão "Limpar Arquivos".
     */
    limparArquivosNotas();
}

/* =========================================================
   ARQUIVOS SELECIONADOS
   ========================================================= */

function adicionarArquivosSelecionados(
    novosArquivos
) {
    const chavesExistentes = new Set(
        arquivosSelecionados.map(
            function (arquivo) {
                return gerarChaveArquivo(
                    arquivo
                );
            }
        )
    );

    novosArquivos.forEach(
        function (arquivo) {
            const chave =
                gerarChaveArquivo(arquivo);

            /*
             * Evita adicionar exatamente
             * o mesmo arquivo duas vezes.
             */
            if (!chavesExistentes.has(chave)) {
                arquivosSelecionados.push(
                    arquivo
                );

                chavesExistentes.add(chave);
            }
        }
    );
}

function gerarChaveArquivo(arquivo) {
    return [
        arquivo.name || "",
        arquivo.size || 0,
        arquivo.lastModified || 0
    ].join("|");
}

function renderizarArquivosSelecionados() {
    const lista = document.getElementById(
        "listaArquivosNotasFiscais"
    );

    if (!lista) {
        return;
    }

    lista.innerHTML = "";

    if (arquivosSelecionados.length === 0) {
        lista.innerHTML = `
            <div class="notas-sem-dados">
                Nenhum arquivo selecionado.
            </div>
        `;

        return;
    }

    arquivosSelecionados.forEach(
        function (arquivo, indice) {
            const item =
                document.createElement("div");

            item.className =
                "notas-arquivo-item";

            item.innerHTML = `
                <div class="notas-arquivo-info">
                    <strong>
                        ${escaparHtml(arquivo.name)}
                    </strong>

                    <span>
                        ${formatarTamanhoArquivo(arquivo.size)}
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

            lista.appendChild(item);
        }
    );
}

/* =========================================================
   REMOVER ARQUIVO
   ========================================================= */

function removerArquivoSelecionado(indice) {
    arquivosSelecionados.splice(
        indice,
        1
    );

    atualizarInputArquivos();
    renderizarArquivosSelecionados();
}

/* =========================================================
   RECONSTRÓI FILELIST
   ========================================================= */

function atualizarInputArquivos() {
    const input = document.getElementById(
        "arquivosNotasFiscais"
    );

    if (!input) {
        return;
    }

    try {
        const transfer =
            new DataTransfer();

        arquivosSelecionados.forEach(
            function (arquivo) {
                transfer.items.add(
                    arquivo
                );
            }
        );

        input.files =
            transfer.files;
    } catch (erro) {
        console.warn(
            "Não foi possível reconstruir a lista de arquivos.",
            erro
        );
    }
}

/* =========================================================
   LIMPAR ARQUIVOS
   ========================================================= */

function limparArquivosNotas() {
    const inputArquivos =
        document.getElementById(
            "arquivosNotasFiscais"
        );

    const inputPeriodo =
        document.getElementById(
            "novoPeriodoNota"
        );

    const inputValor =
        document.getElementById(
            "novoValorNota"
        );

    const inputQuantidade =
        document.getElementById(
            "novaQuantidadeNotas"
        );

    /*
     * LIMPEZA COMPLETA.
     *
     * O botão btnLimparArquivosNotas limpa:
     *
     * - arquivos selecionados;
     * - notas processadas;
     * - todas as páginas processadas;
     * - períodos automáticos;
     * - períodos manuais;
     * - campos do formulário;
     * - totalizadores;
     * - resultado mensal;
     * - resultado anual;
     * - quantidade de notas;
     * - quantidade de períodos;
     * - mensagens;
     * - status OCR;
     * - cardDetalhamentoNotas / tabela de documentos.
     */

    arquivosSelecionados = [];
    notasProcessadas = [];
    periodosNotas = [];

    if (inputArquivos) {
        inputArquivos.value = "";
    }

    if (inputPeriodo) {
        inputPeriodo.value = "";
    }

    if (inputValor) {
        inputValor.value = "";
    }

    if (inputQuantidade) {
        inputQuantidade.value = "0";
    }

    mostrarStatusProcessamento(
        false
    );

    limparMensagemOcr();

    renderizarArquivosSelecionados();
    renderizarPeriodosNotas();
    renderizarNotasProcessadas();
    atualizarResultadosNotas();
}

/* =========================================================
   PROCESSAMENTO DOS ARQUIVOS
   ========================================================= */

async function processarArquivosNotas() {
    if (
        arquivosSelecionados.length === 0
    ) {
        exibirMensagemOcr(
            "Selecione pelo menos um arquivo antes de processar.",
            "atencao"
        );

        return;
    }

    const btnProcessar =
        document.getElementById(
            "btnProcessarArquivosNotas"
        );

    if (btnProcessar) {
        btnProcessar.disabled = true;
    }

    /*
     * Ao iniciar novo processamento,
     * substitui o processamento anterior.
     */
    notasProcessadas = [];

    mostrarStatusProcessamento(
        true,
        "Preparando processamento...",
        "Aguarde enquanto os documentos são analisados."
    );

    try {
        /*
         * Processamento SEQUENCIAL.
         *
         * Isso evita tentar abrir dezenas ou centenas
         * de PDFs/imagens simultaneamente na memória.
         */
        for (
            let indice = 0;
            indice < arquivosSelecionados.length;
            indice++
        ) {
            const arquivo =
                arquivosSelecionados[indice];

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

                notasProcessadas.push({
                    arquivo: arquivo.name,
                    data: null,
                    numero: "",
                    emitente: "",
                    valor: 0,
                    competencia: "",
                    status: "Erro no processamento",
                    texto: ""
                });
            }

            /*
             * Permite ao navegador atualizar
             * interface entre arquivos.
             */
            await liberarInterface();
        }

        consolidarNotasNosPeriodos();
        renderizarNotasProcessadas();

        const identificadas =
            notasProcessadas.filter(
                function (nota) {
                    return (
                        nota.data &&
                        nota.valor > 0
                    );
                }
            ).length;

        exibirMensagemOcr(
            `${notasProcessadas.length} documento(s) ou página(s) analisado(s). ${identificadas} com data e valor identificados.`,
            identificadas > 0
                ? "sucesso"
                : "atencao"
        );
    } catch (erro) {
        console.error(erro);

        exibirMensagemOcr(
            "Ocorreu um erro durante o processamento dos documentos.",
            "erro"
        );
    } finally {
        mostrarStatusProcessamento(
            false
        );

        if (btnProcessar) {
            btnProcessar.disabled = false;
        }
    }
}

/* =========================================================
   PROCESSAMENTO POR TIPO
   ========================================================= */

async function processarArquivoNotaFiscal(
    arquivo,
    indiceArquivo,
    totalArquivos
) {
    const nome =
        String(
            arquivo.name || ""
        ).toLowerCase();

    if (nome.endsWith(".pdf")) {
        return processarPdfNotaFiscal(
            arquivo,
            indiceArquivo,
            totalArquivos
        );
    }

    if (
        nome.endsWith(".jpg") ||
        nome.endsWith(".jpeg") ||
        nome.endsWith(".png") ||
        nome.endsWith(".webp")
    ) {
        const texto =
            await executarOcrImagem(
                arquivo,
                function (progresso) {
                    atualizarProgressoArquivo(
                        indiceArquivo,
                        totalArquivos,
                        progresso,
                        arquivo.name
                    );
                }
            );

        return [
            interpretarTextoNotaFiscal(
                texto,
                arquivo.name
            )
        ];
    }

    throw new Error(
        "Formato de arquivo não suportado."
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
    const pdfjsLib =
        await carregarPdfJs();

    const arrayBuffer =
        await arquivo.arrayBuffer();

    const pdf =
        await pdfjsLib.getDocument({
            data: arrayBuffer
        }).promise;

    const resultados = [];

    /*
     * Cada página é tratada como uma
     * nota fiscal independente.
     */
    for (
        let paginaNumero = 1;
        paginaNumero <= pdf.numPages;
        paginaNumero++
    ) {
        mostrarStatusProcessamento(
            true,
            `Processando ${arquivo.name}`,
            `Página ${paginaNumero} de ${pdf.numPages}`
        );

        const pagina =
            await pdf.getPage(
                paginaNumero
            );

        /*
         * Primeiro tenta texto nativo.
         */
        let texto =
            await extrairTextoPaginaPdf(
                pagina
            );

        /*
         * Só executa OCR se a camada textual
         * for insuficiente.
         *
         * PDFs nativos com centenas de páginas
         * ficam muito mais leves desta forma.
         */
        if (
            texto
                .replace(/\s+/g, " ")
                .trim()
                .length < 80
        ) {
            const canvas =
                await renderizarPaginaPdf(
                    pagina
                );

            texto =
                await executarOcrImagem(
                    canvas,
                    function (progresso) {
                        const progressoPagina =
                            (
                                paginaNumero -
                                1 +
                                progresso
                            ) /
                            pdf.numPages;

                        atualizarProgressoArquivo(
                            indiceArquivo,
                            totalArquivos,
                            progressoPagina,
                            `${arquivo.name} - página ${paginaNumero}`
                        );
                    }
                );

            /*
             * Libera bitmap do canvas após OCR.
             */
            canvas.width = 1;
            canvas.height = 1;
        }

        resultados.push(
            interpretarTextoNotaFiscal(
                texto,
                pdf.numPages > 1
                    ? `${arquivo.name} - Página ${paginaNumero}`
                    : arquivo.name
            )
        );

        /*
         * Libera recursos internos da página.
         */
        if (
            typeof pagina.cleanup ===
            "function"
        ) {
            pagina.cleanup();
        }

        /*
         * Dá oportunidade para o navegador
         * atualizar a interface.
         */
        await liberarInterface();
    }

    if (
        typeof pdf.cleanup ===
        "function"
    ) {
        pdf.cleanup();
    }

    return resultados;
}

/* =========================================================
   CARREGAMENTO DO PDF.JS
   ========================================================= */

async function carregarPdfJs() {
    if (window.pdfjsLib) {
        return window.pdfjsLib;
    }

    const pdfjsLib =
        await import(
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs"
        );

    pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

    window.pdfjsLib =
        pdfjsLib;

    return pdfjsLib;
}

/* =========================================================
   TEXTO NATIVO DO PDF
   ========================================================= */

async function extrairTextoPaginaPdf(
    pagina
) {
    try {
        const conteudo =
            await pagina.getTextContent();

        /*
         * Mantém cada item separado por quebra
         * de linha para permitir análise por proximidade.
         */
        return conteudo.items
            .map(function (item) {
                return item.str;
            })
            .join("\n");
    } catch (erro) {
        console.warn(
            "Não foi possível extrair texto nativo do PDF.",
            erro
        );

        return "";
    }
}

/* =========================================================
   RENDERIZA PDF PARA OCR
   ========================================================= */

async function renderizarPaginaPdf(
    pagina
) {
    const escala = 2.2;

    const viewport =
        pagina.getViewport({
            scale: escala
        });

    const canvas =
        document.createElement(
            "canvas"
        );

    const contexto =
        canvas.getContext(
            "2d",
            {
                willReadFrequently: true
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

    await pagina.render({
        canvasContext: contexto,
        viewport: viewport
    }).promise;

    return canvas;
}

/* =========================================================
   OCR
   ========================================================= */

async function executarOcrImagem(
    imagem,
    callbackProgresso
) {
    if (
        typeof window.Tesseract ===
        "undefined" ||
        typeof window.Tesseract.recognize !==
        "function"
    ) {
        throw new Error(
            "Tesseract.js não foi carregado."
        );
    }

    const resultado =
        await window.Tesseract.recognize(
            imagem,
            "por",
            {
                logger: function (
                    mensagem
                ) {
                    if (
                        mensagem.status ===
                        "recognizing text" &&
                        typeof callbackProgresso ===
                        "function"
                    ) {
                        callbackProgresso(
                            mensagem.progress || 0
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

/* =========================================================
   INTERPRETAÇÃO DA NOTA FISCAL
   ========================================================= */

function interpretarTextoNotaFiscal(
    textoOriginal,
    nomeArquivo
) {
    const texto =
        normalizarTextoOcr(
            textoOriginal
        );

    const data =
        extrairDataEmissao(
            texto
        );

    const numero =
        extrairNumeroNota(
            texto
        );

    const emitente =
        extrairEmitente(
            texto
        );

    /*
     * IMPORTANTE:
     *
     * O valor é SEMPRE o VALOR TOTAL DA NOTA.
     *
     * Descrição, produtos, serviços, subtotal,
     * impostos, base de cálculo e outros valores
     * NÃO são utilizados.
     */
    const valor =
        extrairValorTotal(
            texto
        );

    const competencia =
        data
            ? formatarCompetenciaData(data)
            : "";

    const pendencias = [];

    if (!data) {
        pendencias.push(
            "data"
        );
    }

    if (!numero) {
        pendencias.push(
            "número"
        );
    }

    if (!emitente) {
        pendencias.push(
            "emitente"
        );
    }

    if (valor <= 0) {
        pendencias.push(
            "valor"
        );
    }

    let status =
        "Identificada";

    if (
        pendencias.length > 0
    ) {
        status =
            "Não identificado: " +
            pendencias.join(", ");
    }

    return {
        arquivo: nomeArquivo,
        data: data,
        numero: numero,
        emitente: emitente,
        valor: valor,
        competencia: competencia,
        status: status,
        texto: textoOriginal
    };
}

/* =========================================================
   NORMALIZAÇÃO OCR
   ========================================================= */

function normalizarTextoOcr(
    texto
) {
    return String(texto || "")
        .replace(/\r/g, "\n")
        .replace(/[|]/g, " ")
        .replace(/[ \t]+/g, " ")
        .replace(/\n[ \t]+/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

function normalizarComparacao(
    texto
) {
    return String(texto || "")
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toUpperCase()
        .replace(/\s+/g, " ")
        .trim();
}

/* =========================================================
   EXTRAÇÃO DA DATA DE EMISSÃO
   ========================================================= */

function extrairDataEmissao(
    texto
) {
    const linhas =
        String(texto || "")
            .split(/\n/)
            .map(function (linha) {
                return linha.trim();
            })
            .filter(Boolean);

    const padroes = [
        /DATA\s*(?:DE\s*)?EMISS[AÃ]O[^0-9]{0,30}(\d{2}\/\d{2}\/\d{4})/i,
        /DATA\/HORA\s*(?:DE\s*)?EMISS[AÃ]O[^0-9]{0,30}(\d{2}\/\d{2}\/\d{4})/i,
        /EMISS[AÃ]O[^0-9]{0,30}(\d{2}\/\d{2}\/\d{4})/i,
        /EMITID[AO]\s+EM[^0-9]{0,30}(\d{2}\/\d{2}\/\d{4})/i,
        /DATA\s+DA\s+EMISS[AÃ]O[^0-9]{0,30}(\d{2}\/\d{2}\/\d{4})/i,
        /DATA\s+DE\s+GERA[CÇ][AÃ]O[^0-9]{0,30}(\d{2}\/\d{2}\/\d{4})/i
    ];

    for (
        const padrao of padroes
    ) {
        const match =
            texto.match(padrao);

        if (
            match &&
            validarDataBrasileira(
                match[1]
            )
        ) {
            return match[1];
        }
    }

    /*
     * Procura datas próximas de
     * palavras relacionadas à emissão.
     */
    for (
        let i = 0;
        i < linhas.length;
        i++
    ) {
        const normalizada =
            normalizarComparacao(
                linhas[i]
            );

        if (
            normalizada.includes(
                "EMISSAO"
            ) ||
            normalizada.includes(
                "EMITIDA"
            ) ||
            normalizada.includes(
                "DATA DE GERACAO"
            )
        ) {
            const trecho = [
                linhas[i],
                linhas[i + 1] || "",
                linhas[i + 2] || ""
            ].join(" ");

            const datas =
                trecho.match(
                    /\b\d{2}\/\d{2}\/\d{4}\b/g
                ) || [];

            for (
                const data of datas
            ) {
                if (
                    validarDataBrasileira(
                        data
                    )
                ) {
                    return data;
                }
            }
        }
    }

    /*
     * Último fallback:
     * primeira data válida do documento.
     */
    const todasDatas =
        texto.match(
            /\b\d{2}\/\d{2}\/\d{4}\b/g
        ) || [];

    for (
        const data of todasDatas
    ) {
        if (
            validarDataBrasileira(
                data
            )
        ) {
            return data;
        }
    }

    return null;
}

/* =========================================================
   VALIDAÇÃO DA DATA
   ========================================================= */

function validarDataBrasileira(
    valor
) {
    const match =
        String(valor || "").match(
            /^(\d{2})\/(\d{2})\/(\d{4})$/
        );

    if (!match) {
        return false;
    }

    const dia =
        Number(match[1]);

    const mes =
        Number(match[2]);

    const ano =
        Number(match[3]);

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

    const data =
        new Date(
            ano,
            mes - 1,
            dia
        );

    return (
        data.getFullYear() === ano &&
        data.getMonth() === mes - 1 &&
        data.getDate() === dia
    );
}

/* =========================================================
   EXTRAÇÃO DO NÚMERO DA NOTA
   ========================================================= */

function extrairNumeroNota(
    texto
) {
    const padroes = [
        /N[ÚU]MERO\s+(?:DA\s+)?(?:NFS[- ]?E|NF[- ]?E|NOTA)[^0-9]{0,20}(\d{1,20})/i,
        /N[ÚU]MERO[^0-9]{0,15}(\d{1,20})/i,
        /NF[- ]?E[^0-9]{0,15}(?:N[º°O.]*)?[^0-9]{0,10}(\d{1,20})/i,
        /NFS[- ]?E[^0-9]{0,15}(?:N[º°O.]*)?[^0-9]{0,10}(\d{1,20})/i,
        /NOTA\s+FISCAL[^0-9]{0,20}(?:N[º°O.]*)?[^0-9]{0,10}(\d{1,20})/i,
        /\bN[º°]\s*(\d{1,20})\b/i
    ];

    for (
        const padrao of padroes
    ) {
        const match =
            texto.match(padrao);

        if (
            match &&
            match[1]
        ) {
            const numero =
                String(match[1])
                    .replace(/\D/g, "")
                    .trim();

            if (numero) {
                return numero;
            }
        }
    }

    return "";
}

/* =========================================================
   EXTRAÇÃO DO EMITENTE
   ========================================================= */

function extrairEmitente(
    texto
) {
    const conteudo =
        String(texto || "");

    const linhas =
        conteudo
            .split(/\n/)
            .map(function (linha) {
                return linha.trim();
            })
            .filter(Boolean);

    /*
     * DANFE de produtor rural:
     *
     * "Recebemos de NOME os produtos da Nota Fiscal..."
     *
     * O nome após "Recebemos de" é o emitente
     * e tem prioridade.
     */
    const matchRecebemos =
        conteudo.match(
            /RECEBEMOS\s+DE\s+(.+?)\s+OS\s+PRODUTOS\s+DA\s+NOTA\s+FISCAL/i
        );

    if (
        matchRecebemos &&
        matchRecebemos[1]
    ) {
        const candidato =
            limparNomeEmitente(
                matchRecebemos[1]
            );

        if (candidato) {
            return candidato;
        }
    }

    const padroes = [
        /RAZ[AÃ]O\s+SOCIAL[\s:.-]+([^\n]+)/i,
        /NOME\s*(?:\/|\s+)?RAZ[AÃ]O\s+SOCIAL[\s:.-]+([^\n]+)/i,
        /PRESTADOR\s+DE\s+SERVI[CÇ]OS?[\s:.-]+([^\n]+)/i,
        /EMITENTE[\s:.-]+([^\n]+)/i,
        /FORNECEDOR[\s:.-]+([^\n]+)/i
    ];

    for (
        const padrao of padroes
    ) {
        const match =
            conteudo.match(
                padrao
            );

        if (
            match &&
            match[1]
        ) {
            const candidato =
                limparNomeEmitente(
                    match[1]
                );

            if (candidato) {
                return candidato;
            }
        }
    }

    /*
     * Em DANFE, antes do marcador DANFE
     * normalmente aparece a razão social
     * do emitente.
     */
    for (
        let i = 0;
        i < linhas.length;
        i++
    ) {
        const normalizada =
            normalizarComparacao(
                linhas[i]
            );

        if (
            normalizada === "DANFE" ||
            normalizada.includes(
                "DOCUMENTO AUXILIAR DA"
            )
        ) {
            for (
                let anterior = 1;
                anterior <= 4;
                anterior++
            ) {
                const candidato =
                    limparNomeEmitente(
                        linhas[i - anterior] ||
                        ""
                    );

                if (
                    candidato &&
                    !/^(NF-?E|SERIE|N[º°]|FAZENDA|SITIO|RODOVIA|RUA|AVENIDA)/i.test(
                        candidato
                    )
                ) {
                    return candidato;
                }
            }
        }
    }

    /*
     * Outros formatos.
     */
    for (
        let i = 0;
        i < linhas.length;
        i++
    ) {
        const normalizada =
            normalizarComparacao(
                linhas[i]
            );

        if (
            normalizada === "EMITENTE" ||
            normalizada.includes(
                "IDENTIFICACAO DO EMITENTE"
            ) ||
            normalizada.includes(
                "DADOS DO EMITENTE"
            ) ||
            normalizada.includes(
                "PRESTADOR DE SERVICOS"
            )
        ) {
            for (
                let proxima = 1;
                proxima <= 4;
                proxima++
            ) {
                const candidato =
                    limparNomeEmitente(
                        linhas[i + proxima] ||
                        ""
                    );

                if (candidato) {
                    return candidato;
                }
            }
        }
    }

    return "";
}

/* =========================================================
   LIMPEZA DO EMITENTE
   ========================================================= */

function limparNomeEmitente(
    valor
) {
    let texto =
        String(valor || "")
            .replace(/\s+/g, " ")
            .trim();

    if (!texto) {
        return "";
    }

    texto = texto
        .replace(
            /\b(CNPJ|CPF|INSCRI[CÇ][AÃ]O|IE|IM|ENDERE[CÇ]O|CEP|FONE|TELEFONE)\b.*$/i,
            ""
        )
        .replace(
            /^[\s:.-]+/,
            ""
        )
        .trim();

    /*
     * Não aceita texto composto somente
     * por números.
     */
    if (
        texto.length < 3 ||
        /^\d+$/.test(texto)
    ) {
        return "";
    }

    /*
     * Evita considerar CNPJ isolado
     * como emitente.
     */
    if (
        /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(
            texto
        )
    ) {
        return "";
    }

    if (
        texto.length > 120
    ) {
        texto =
            texto.substring(
                0,
                120
            ).trim();
    }

    return texto;
}

/* =========================================================
   EXTRAÇÃO DO VALOR TOTAL DA NOTA
   ========================================================= */

function extrairValorTotal(
    texto
) {
    const conteudo =
        String(texto || "");

    const linhas =
        conteudo
            .split(/\n/)
            .map(function (linha) {
                return linha.trim();
            })
            .filter(Boolean);

    /*
     * =====================================================
     * PRIORIDADE 1
     * DANFE / NF-e de produtor rural - CANHOTO
     * =====================================================
     *
     * Exemplo:
     *
     * Emissão: 01/09/2026
     * Destinatário: ...
     * Valor: R$49.680,00
     *
     * Neste contexto o campo Valor corresponde
     * ao TOTAL DA NOTA.
     *
     * A descrição dos produtos NÃO participa
     * do cálculo.
     */

    const padroesCanhoto = [
        /EMISS[AÃ]O\s*:\s*\d{2}\/\d{2}\/\d{4}[\s\S]{0,350}?VALOR\s*:\s*R?\$?\s*([\d.]+,\d{2})/i,
        /DESTINAT[AÁ]RIO\s*:[\s\S]{0,300}?VALOR\s*:\s*R?\$?\s*([\d.]+,\d{2})/i
    ];

    for (
        const padrao of padroesCanhoto
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

            if (valor > 0) {
                return valor;
            }
        }
    }

    /*
     * =====================================================
     * PRIORIDADE 2
     * RÓTULO E VALOR NO MESMO TRECHO
     * =====================================================
     */

    const padroesDiretos = [
        /VALOR\s+TOTAL\s+(?:DA\s+)?NOTA[^0-9]{0,80}(?:R\$\s*)?([\d.]+,\d{2})/i,
        /VALOR\s+DA\s+NOTA[^0-9]{0,80}(?:R\$\s*)?([\d.]+,\d{2})/i,
        /TOTAL\s+DA\s+NOTA[^0-9]{0,80}(?:R\$\s*)?([\d.]+,\d{2})/i,
        /VALOR\s+TOTAL\s+(?:DA\s+)?NF[- ]?E[^0-9]{0,80}(?:R\$\s*)?([\d.]+,\d{2})/i,
        /TOTAL\s+NF[- ]?E[^0-9]{0,80}(?:R\$\s*)?([\d.]+,\d{2})/i
    ];

    for (
        const padrao of padroesDiretos
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

            if (valor > 0) {
                return valor;
            }
        }
    }

    /*
     * =====================================================
     * PRIORIDADE 3
     * VALOR PRÓXIMO DO RÓTULO
     * =====================================================
     *
     * O PDF.js pode devolver:
     *
     * 49.680,00
     * Valor Total da Nota
     *
     * Portanto, procura primeiro ANTES do rótulo.
     */

    for (
        let i = 0;
        i < linhas.length;
        i++
    ) {
        const normalizada =
            normalizarComparacao(
                linhas[i]
            );

        const ehTotalDaNota =
            normalizada.includes(
                "VALOR TOTAL DA NOTA"
            ) ||
            normalizada.includes(
                "VALOR TOTAL NOTA"
            ) ||
            normalizada.includes(
                "TOTAL DA NOTA"
            ) ||
            normalizada ===
            "VALOR DA NOTA";

        if (!ehTotalDaNota) {
            continue;
        }

        /*
         * Mesmo item/linha.
         */
        const valoresMesmaLinha =
            extrairValoresMonetarios(
                linhas[i]
            );

        if (
            valoresMesmaLinha.length > 0
        ) {
            const valor =
                valoresMesmaLinha[
                valoresMesmaLinha.length -
                1
                ];

            if (valor > 0) {
                return valor;
            }
        }

        /*
         * Procura até 8 itens ANTES.
         *
         * Esse é o padrão dos PDFs
         * de produtor rural testados.
         */
        for (
            let anterior = 1;
            anterior <= 8;
            anterior++
        ) {
            const linhaAnterior =
                linhas[
                i - anterior
                ];

            if (!linhaAnterior) {
                continue;
            }

            const valores =
                extrairValoresMonetarios(
                    linhaAnterior
                );

            if (
                valores.length > 0
            ) {
                const valor =
                    valores[
                    valores.length -
                    1
                    ];

                if (valor > 0) {
                    return valor;
                }
            }
        }

        /*
         * Depois procura até 8 itens DEPOIS.
         */
        for (
            let proxima = 1;
            proxima <= 8;
            proxima++
        ) {
            const linhaSeguinte =
                linhas[
                i + proxima
                ];

            if (!linhaSeguinte) {
                continue;
            }

            const valores =
                extrairValoresMonetarios(
                    linhaSeguinte
                );

            if (
                valores.length > 0
            ) {
                const valor =
                    valores[
                    valores.length -
                    1
                    ];

                if (valor > 0) {
                    return valor;
                }
            }
        }
    }

    /*
     * =====================================================
     * IMPORTANTE
     * =====================================================
     *
     * NÃO existe fallback utilizando:
     *
     * - descrição;
     * - valor unitário;
     * - valor dos produtos;
     * - valor dos serviços;
     * - subtotal;
     * - base de cálculo;
     * - ICMS;
     * - IPI;
     * - PIS;
     * - COFINS;
     * - frete;
     * - seguro;
     * - desconto;
     * - maior valor encontrado no documento.
     *
     * O sistema deve sempre trazer o
     * VALOR TOTAL DA NOTA.
     *
     * Se não for possível identificar esse
     * valor com segurança, retorna zero e
     * deixa a nota pendente para conferência.
     */

    return 0;
}

/* =========================================================
   VALORES MONETÁRIOS
   ========================================================= */

function extrairValoresMonetarios(
    texto
) {
    const correspondencias =
        String(texto || "").match(
            /(?:R\$\s*)?\d{1,3}(?:\.\d{3})*,\d{2}|(?:R\$\s*)?\d+,\d{2}/g
        ) || [];

    return correspondencias
        .map(function (valor) {
            return converterNumeroBrasileiro(
                valor
            );
        })
        .filter(function (valor) {
            return (
                Number.isFinite(valor) &&
                valor >= 0
            );
        });
}

function converterNumeroBrasileiro(
    valor
) {
    let texto =
        String(valor || "")
            .replace(/R\$/gi, "")
            .replace(/\s/g, "")
            .trim();

    if (!texto) {
        return 0;
    }

    if (texto.includes(",")) {
        texto = texto
            .replace(/\./g, "")
            .replace(",", ".");
    }

    texto =
        texto.replace(
            /[^\d.-]/g,
            ""
        );

    const numero =
        Number(texto);

    return Number.isFinite(numero)
        ? numero
        : 0;
}

/* =========================================================
   CONSOLIDAÇÃO AUTOMÁTICA
   ========================================================= */

function consolidarNotasNosPeriodos() {
    /*
     * Só entra no cálculo a nota que tenha:
     *
     * - competência;
     * - VALOR TOTAL DA NOTA > 0.
     */

    const notasValidas =
        notasProcessadas.filter(
            function (nota) {
                return (
                    nota.competencia &&
                    Number(nota.valor) > 0
                );
            }
        );

    /*
     * Remove apenas períodos que foram
     * criados automaticamente por OCR/PDF.
     *
     * Períodos manuais permanecem.
     */
    periodosNotas =
        periodosNotas.filter(
            function (periodo) {
                return (
                    periodo.origem !== "ocr"
                );
            }
        );

    const agrupamento = {};

    notasValidas.forEach(
        function (nota) {
            const chave =
                nota.competencia;

            if (!agrupamento[chave]) {
                agrupamento[chave] = {
                    periodo:
                        formatarCompetenciaExibicao(
                            chave
                        ),
                    valor: 0,
                    quantidade: 0
                };
            }

            agrupamento[chave].valor +=
                nota.valor;

            agrupamento[chave].quantidade++;
        }
    );

    Object.keys(agrupamento)
        .sort()
        .forEach(
            function (chave) {
                const grupo =
                    agrupamento[chave];

                adicionarOuSomarPeriodo({
                    periodo:
                        grupo.periodo,
                    valor:
                        grupo.valor,
                    quantidade:
                        grupo.quantidade,
                    origem:
                        "ocr"
                });
            }
        );

    ordenarPeriodos();
    renderizarPeriodosNotas();
    atualizarResultadosNotas();
}

/* =========================================================
   RENDERIZAÇÃO DAS NOTAS PROCESSADAS
   ========================================================= */

function renderizarNotasProcessadas() {
    const tbody =
        document.getElementById(
            "tabelaNotasFiscaisIdentificadas"
        );

    if (!tbody) {
        return;
    }

    /*
     * Limpa integralmente o detalhamento.
     */
    tbody.innerHTML = "";

    if (
        notasProcessadas.length === 0
    ) {
        const tr =
            document.createElement(
                "tr"
            );

        tr.className =
            "notas-linha-vazia";

        tr.innerHTML = `
            <td colspan="6">
                Nenhuma nota fiscal processada.
            </td>
        `;

        tbody.appendChild(tr);

        return;
    }

    notasProcessadas.forEach(
        function (nota) {
            const tr =
                document.createElement(
                    "tr"
                );

            const classeStatus =
                nota.data &&
                    nota.valor > 0
                    ? "notas-status-sucesso"
                    : nota.data ||
                        nota.valor > 0
                        ? "notas-status-atencao"
                        : "notas-status-erro";

            tr.innerHTML = `
                <td title="${escaparHtml(nota.arquivo)}">
                    ${escaparHtml(nota.arquivo)}
                </td>

                <td>
                    ${nota.data
                    ? escaparHtml(
                        nota.data
                    )
                    : "-"
                }
                </td>

                <td>
                    ${nota.numero
                    ? escaparHtml(
                        nota.numero
                    )
                    : "-"
                }
                </td>

                <td title="${escaparHtml(nota.emitente || "")}">
                    ${nota.emitente
                    ? escaparHtml(
                        nota.emitente
                    )
                    : "-"
                }
                </td>

                <td>
                    ${nota.valor > 0
                    ? formatarMoeda(
                        nota.valor
                    )
                    : "-"
                }
                </td>

                <td>
                    <span class="notas-status ${classeStatus}">
                        ${escaparHtml(nota.status)}
                    </span>
                </td>
            `;

            tbody.appendChild(tr);
        }
    );
}

/* =========================================================
   STATUS DE PROCESSAMENTO
   ========================================================= */

function mostrarStatusProcessamento(
    exibir,
    titulo = "",
    texto = ""
) {
    const status =
        document.getElementById(
            "statusOcrNotasFiscais"
        );

    const tituloElemento =
        document.getElementById(
            "tituloStatusOcrNotasFiscais"
        );

    const textoElemento =
        document.getElementById(
            "textoStatusOcrNotasFiscais"
        );

    if (!status) {
        return;
    }

    status.hidden =
        !exibir;

    if (
        tituloElemento &&
        titulo
    ) {
        tituloElemento.textContent =
            titulo;
    }

    if (
        textoElemento &&
        texto
    ) {
        textoElemento.textContent =
            texto;
    }
}

/* =========================================================
   PROGRESSO
   ========================================================= */

function atualizarStatusProcessamentoArquivo(
    indice,
    total,
    nome
) {
    mostrarStatusProcessamento(
        true,
        `Processando arquivo ${indice + 1} de ${total}`,
        nome
    );
}

function atualizarProgressoArquivo(
    indiceArquivo,
    totalArquivos,
    progressoArquivo,
    descricao
) {
    const progresso =
        Math.min(
            100,
            Math.max(
                0,
                Math.round(
                    (
                        (
                            indiceArquivo +
                            Number(
                                progressoArquivo ||
                                0
                            )
                        ) /
                        totalArquivos
                    ) * 100
                )
            )
        );

    mostrarStatusProcessamento(
        true,
        `Processando documentos... ${progresso}%`,
        descricao
    );
}

/* =========================================================
   MENSAGEM OCR
   ========================================================= */

function exibirMensagemOcr(
    mensagem,
    tipo = "sucesso"
) {
    const resultado =
        document.getElementById(
            "resultadoOcrNotasFiscais"
        );

    if (!resultado) {
        return;
    }

    resultado.hidden =
        false;

    resultado.className =
        `notas-resultado-ocr notas-resultado-ocr-${tipo}`;

    resultado.textContent =
        mensagem;
}

function limparMensagemOcr() {
    const resultado =
        document.getElementById(
            "resultadoOcrNotasFiscais"
        );

    if (!resultado) {
        return;
    }

    resultado.hidden =
        true;

    resultado.textContent =
        "";

    resultado.className =
        "notas-resultado-ocr";
}

/* =========================================================
   COMPETÊNCIA
   ========================================================= */

function formatarCompetenciaData(
    dataBrasileira
) {
    const match =
        String(
            dataBrasileira ||
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
        return (
            competencia ||
            ""
        );
    }

    const ano =
        Number(match[1]);

    const mes =
        Number(match[2]);

    const nomesMeses = [
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
        `${nomesMeses[mes - 1]}/${ano}`
    );
}

/* =========================================================
   ORDENAÇÃO DOS PERÍODOS
   ========================================================= */

function ordenarPeriodos() {
    periodosNotas.sort(
        function (a, b) {
            const dataA =
                converterPeriodoParaOrdenacao(
                    a.periodo
                );

            const dataB =
                converterPeriodoParaOrdenacao(
                    b.periodo
                );

            if (
                dataA !== null &&
                dataB !== null
            ) {
                return (
                    dataA -
                    dataB
                );
            }

            if (
                dataA !== null
            ) {
                return -1;
            }

            if (
                dataB !== null
            ) {
                return 1;
            }

            return String(
                a.periodo
            ).localeCompare(
                String(
                    b.periodo
                ),
                "pt-BR"
            );
        }
    );
}

function converterPeriodoParaOrdenacao(
    periodo
) {
    const texto =
        normalizarComparacao(
            periodo
        );

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
            /^([A-Z]+)\s*\/\s*(\d{4})$/
        );

    if (
        match &&
        meses[match[1]]
    ) {
        return (
            Number(match[2]) *
            100 +
            meses[match[1]]
        );
    }

    match =
        texto.match(
            /^(\d{1,2})\s*\/\s*(\d{4})$/
        );

    if (match) {
        return (
            Number(match[2]) *
            100 +
            Number(match[1])
        );
    }

    match =
        texto.match(
            /^(\d{4})-(\d{2})$/
        );

    if (match) {
        return (
            Number(match[1]) *
            100 +
            Number(match[2])
        );
    }

    return null;
}

/* =========================================================
   NORMALIZAÇÃO DE PERÍODO
   ========================================================= */

function normalizarPeriodoChave(
    periodo
) {
    return normalizarComparacao(
        periodo
    ).replace(
        /\s/g,
        ""
    );
}

/* =========================================================
   MOEDA
   ========================================================= */

function converterMoedaParaNumero(
    valor
) {
    const textoOriginal =
        String(
            valor ||
            ""
        ).trim();

    if (!textoOriginal) {
        return 0;
    }

    let texto =
        textoOriginal
            .replace(/R\$/gi, "")
            .replace(/\s/g, "")
            .trim();

    if (!texto) {
        return 0;
    }

    /*
     * Formato brasileiro.
     */
    if (
        texto.includes(",")
    ) {
        texto = texto
            .replace(/\./g, "")
            .replace(",", ".");
    } else {
        texto =
            texto.replace(
                /[^\d.-]/g,
                ""
            );
    }

    const numero =
        Number(texto);

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

    const apenasNumeros =
        String(
            input.value ||
            ""
        ).replace(
            /\D/g,
            ""
        );

    if (!apenasNumeros) {
        input.value = "";
        return;
    }

    const centavos =
        Number(
            apenasNumeros
        ) / 100;

    input.value =
        formatarMoeda(
            centavos
        );
}

function formatarMoeda(
    valor
) {
    const numero =
        Number(valor) || 0;

    return numero.toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
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
        Number(bytes) || 0;

    if (
        tamanho < 1024
    ) {
        return (
            `${tamanho} B`
        );
    }

    if (
        tamanho <
        1024 * 1024
    ) {
        return (
            `${(tamanho / 1024).toFixed(1)} KB`
        );
    }

    return (
        `${(
            tamanho /
            1024 /
            1024
        ).toFixed(2)} MB`
    );
}

/* =========================================================
   ID
   ========================================================= */

function gerarId() {
    if (
        window.crypto &&
        typeof window.crypto.randomUUID ===
        "function"
    ) {
        return (
            window.crypto.randomUUID()
        );
    }

    return (
        Date.now().toString(36) +
        Math.random()
            .toString(36)
            .substring(2)
    );
}

/* =========================================================
   LIBERA A INTERFACE ENTRE PÁGINAS
   ========================================================= */

function liberarInterface() {
    return new Promise(
        function (resolve) {
            setTimeout(
                resolve,
                0
            );
        }
    );
}

/* =========================================================
   HTML SEGURO
   ========================================================= */

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

/* =========================================================
   TEXTO
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
            valor;
    }
}

