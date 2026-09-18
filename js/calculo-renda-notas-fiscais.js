/**
 * calculo-renda-notas-fiscais.js
 *
 * Caixa de Ferramentas - Sicoob Mantiqueira
 *
 * Cálculo de renda através de notas fiscais.
 *
 * Recursos:
 * - inclusão manual de períodos;
 * - calculadora auxiliar;
 * - upload de arquivos;
 * - leitura OCR de imagens;
 * - leitura OCR de PDFs;
 * - identificação de datas;
 * - identificação do valor total da nota;
 * - agrupamento automático por competência;
 * - preenchimento automático de .calculo-notas-periodo.
 */

document.addEventListener("DOMContentLoaded", function () {
    iniciarCalculoNotas();
});

/* =========================================================
   ESTADO
========================================================= */

let contadorPeriodosNotas = 0;
let contadorNotasAuxiliares = 0;

let notasProcessadasOCR = [];

/* =========================================================
   INICIALIZAÇÃO
========================================================= */

function iniciarCalculoNotas() {

    configurarEventosCalculoNotas();

    if (
        document.getElementById("listaPeriodosNotas") &&
        document.querySelectorAll(".calculo-notas-periodo").length === 0
    ) {
        adicionarPeriodoNota();
    }

    atualizarCalculoNotas();
    atualizarTotalNotasAuxiliares();
}

/* =========================================================
   EVENTOS
========================================================= */

function configurarEventosCalculoNotas() {

    const btnAdicionarPeriodo =
        document.getElementById("btnAdicionarPeriodo");

    const btnAdicionarNotaAuxiliar =
        document.getElementById("btnAdicionarNotaAuxiliar");

    const btnLimparCalculoNotas =
        document.getElementById("btnLimparCalculoNotas");

    const btnProcessarNotasFiscais =
        document.getElementById("btnProcessarNotasFiscais");

    const btnLimparArquivosNotas =
        document.getElementById("btnLimparArquivosNotas");

    if (btnAdicionarPeriodo) {
        btnAdicionarPeriodo.addEventListener(
            "click",
            function () {
                adicionarPeriodoNota();
            }
        );
    }

    if (btnAdicionarNotaAuxiliar) {
        btnAdicionarNotaAuxiliar.addEventListener(
            "click",
            function () {
                adicionarNotaAuxiliar();
            }
        );
    }

    if (btnLimparCalculoNotas) {
        btnLimparCalculoNotas.addEventListener(
            "click",
            limparCalculoNotas
        );
    }

    if (btnProcessarNotasFiscais) {
        btnProcessarNotasFiscais.addEventListener(
            "click",
            processarArquivosNotasFiscais
        );
    }

    if (btnLimparArquivosNotas) {
        btnLimparArquivosNotas.addEventListener(
            "click",
            limparArquivosNotasFiscais
        );
    }
}

/* =========================================================
   PERÍODOS
========================================================= */

function adicionarPeriodoNota(dados = {}) {

    const lista =
        document.getElementById("listaPeriodosNotas");

    if (!lista) {
        return;
    }

    contadorPeriodosNotas++;

    const id = contadorPeriodosNotas;

    const elemento =
        document.createElement("div");

    elemento.className =
        "calculo-notas-periodo";

    elemento.dataset.periodoId = id;

    elemento.innerHTML = `
        <div class="calculo-notas-periodo-cabecalho">

            <strong class="titulo-periodo">
                Período ${id}
            </strong>

            <button
                type="button"
                class="btn-remover-periodo"
                aria-label="Remover período"
            >
                Remover
            </button>

        </div>

        <div class="form-grid">

            <div class="campo-formulario">

                <label>
                    Competência
                </label>

                <input
                    type="month"
                    class="calculo-notas-competencia"
                    value="${dados.competencia || ""}"
                >

            </div>

            <div class="campo-formulario">

                <label>
                    Quantidade de meses
                </label>

                <input
                    type="number"
                    min="1"
                    step="1"
                    class="calculo-notas-meses"
                    value="${dados.meses || 1}"
                >

            </div>

            <div class="campo-formulario">

                <label>
                    Total das notas
                </label>

                <input
                    type="text"
                    inputmode="decimal"
                    class="calculo-notas-total moeda"
                    value="${dados.totalFormatado || formatarMoedaCampo(dados.total || 0)}"
                >

            </div>

            <div class="campo-formulario">

                <label>
                    Quantidade de notas
                </label>

                <input
                    type="number"
                    min="0"
                    step="1"
                    class="calculo-notas-quantidade"
                    value="${dados.quantidade || 0}"
                    readonly
                >

            </div>

        </div>
    `;

    lista.appendChild(elemento);

    const btnRemover =
        elemento.querySelector(".btn-remover-periodo");

    const competencia =
        elemento.querySelector(".calculo-notas-competencia");

    const meses =
        elemento.querySelector(".calculo-notas-meses");

    const total =
        elemento.querySelector(".calculo-notas-total");

    btnRemover.addEventListener(
        "click",
        function () {

            elemento.remove();

            reorganizarTitulosPeriodos();

            atualizarCalculoNotas();
        }
    );

    competencia.addEventListener(
        "change",
        atualizarCalculoNotas
    );

    meses.addEventListener(
        "input",
        atualizarCalculoNotas
    );

    total.addEventListener(
        "input",
        function () {

            aplicarMascaraMoedaInput(this);

            atualizarCalculoNotas();
        }
    );

    atualizarCalculoNotas();

    return elemento;
}

function reorganizarTitulosPeriodos() {

    const periodos =
        document.querySelectorAll(
            ".calculo-notas-periodo"
        );

    periodos.forEach(
        function (periodo, indice) {

            const titulo =
                periodo.querySelector(
                    ".titulo-periodo"
                );

            if (titulo) {
                titulo.textContent =
                    `Período ${indice + 1}`;
            }
        }
    );
}

/* =========================================================
   CÁLCULO PRINCIPAL
========================================================= */

function atualizarCalculoNotas() {

    const periodos =
        document.querySelectorAll(
            ".calculo-notas-periodo"
        );

    let rendaMensal = 0;
    let totalNotas = 0;
    let qtdPeriodosValidos = 0;

    periodos.forEach(
        function (periodo) {

            const inputMeses =
                periodo.querySelector(
                    ".calculo-notas-meses"
                );

            const inputTotal =
                periodo.querySelector(
                    ".calculo-notas-total"
                );

            const meses =
                Number(
                    inputMeses?.value
                ) || 0;

            const total =
                converterMoedaParaNumero(
                    inputTotal?.value
                );

            if (total !== 0 || meses > 0) {

                totalNotas += total;

                if (meses > 0) {
                    rendaMensal +=
                        total / meses;
                }

                qtdPeriodosValidos++;
            }
        }
    );

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
        "resultadoQtdPeriodos",
        String(qtdPeriodosValidos)
    );
}

/* =========================================================
   CALCULADORA AUXILIAR
========================================================= */

function adicionarNotaAuxiliar(valor = 0) {

    const lista =
        document.getElementById(
            "listaNotasAuxiliares"
        );

    if (!lista) {
        return;
    }

    contadorNotasAuxiliares++;

    const item =
        document.createElement("div");

    item.className =
        "nota-auxiliar-item";

    item.innerHTML = `
        <div class="campo-formulario">

            <label>
                Nota ${contadorNotasAuxiliares}
            </label>

            <input
                type="text"
                inputmode="decimal"
                class="nota-auxiliar-valor moeda"
                value="${formatarMoedaCampo(valor)}"
            >

        </div>

        <button
            type="button"
            class="btn-remover-nota-auxiliar"
            aria-label="Remover nota"
        >
            Remover
        </button>
    `;

    lista.appendChild(item);

    const input =
        item.querySelector(
            ".nota-auxiliar-valor"
        );

    const remover =
        item.querySelector(
            ".btn-remover-nota-auxiliar"
        );

    input.addEventListener(
        "input",
        function () {

            aplicarMascaraMoedaInput(this);

            atualizarTotalNotasAuxiliares();
        }
    );

    remover.addEventListener(
        "click",
        function () {

            item.remove();

            atualizarTotalNotasAuxiliares();
        }
    );

    atualizarTotalNotasAuxiliares();
}

function atualizarTotalNotasAuxiliares() {

    const inputs =
        document.querySelectorAll(
            ".nota-auxiliar-valor"
        );

    let total = 0;

    inputs.forEach(
        function (input) {

            total +=
                converterMoedaParaNumero(
                    input.value
                );
        }
    );

    definirTexto(
        "totalNotasAuxiliares",
        formatarMoeda(total)
    );
}

/* =========================================================
   LIMPEZA
========================================================= */

function limparCalculoNotas() {

    const listaPeriodos =
        document.getElementById(
            "listaPeriodosNotas"
        );

    const listaAuxiliares =
        document.getElementById(
            "listaNotasAuxiliares"
        );

    if (listaPeriodos) {
        listaPeriodos.innerHTML = "";
    }

    if (listaAuxiliares) {
        listaAuxiliares.innerHTML = "";
    }

    contadorPeriodosNotas = 0;
    contadorNotasAuxiliares = 0;

    notasProcessadasOCR = [];

    limparArquivosNotasFiscais();

    adicionarPeriodoNota();

    atualizarCalculoNotas();

    atualizarTotalNotasAuxiliares();
}

/* =========================================================
   OCR
========================================================= */

async function processarArquivosNotasFiscais() {

    const input =
        document.getElementById(
            "arquivosNotasFiscais"
        );

    if (!input) {
        return;
    }

    const arquivos =
        Array.from(input.files || []);

    if (arquivos.length === 0) {

        definirStatusOcr(
            "Selecione pelo menos um arquivo.",
            "erro"
        );

        return;
    }

    notasProcessadasOCR = [];

    mostrarProgressoOcr(true);

    atualizarProgressoOcr(
        0,
        "Preparando processamento..."
    );

    definirStatusOcr(
        "Processando notas fiscais...",
        "processando"
    );

    try {

        for (
            let indice = 0;
            indice < arquivos.length;
            indice++
        ) {

            const arquivo =
                arquivos[indice];

            const percentualArquivo =
                Math.round(
                    (
                        indice /
                        arquivos.length
                    ) * 100
                );

            atualizarProgressoOcr(
                percentualArquivo,
                `Processando ${indice + 1} de ${arquivos.length}: ${arquivo.name}`
            );

            try {

                const resultado =
                    await processarArquivoNotaFiscal(
                        arquivo,
                        indice,
                        arquivos.length
                    );

                notasProcessadasOCR.push(
                    ...resultado
                );

            } catch (erro) {

                console.error(
                    "Erro ao processar arquivo:",
                    arquivo.name,
                    erro
                );

                notasProcessadasOCR.push({
                    arquivo: arquivo.name,
                    dataEmissao: null,
                    competencia: "",
                    valor: 0,
                    texto: "",
                    status:
                        "Não foi possível processar o arquivo."
                });
            }
        }

        atualizarProgressoOcr(
            100,
            "Processamento concluído."
        );

        consolidarNotasProcessadas();

        renderizarTabelaNotasProcessadas();

        definirStatusOcr(
            `${notasProcessadasOCR.length} nota(s) ou página(s) analisada(s).`,
            "sucesso"
        );

    } catch (erro) {

        console.error(erro);

        definirStatusOcr(
            "Ocorreu um erro durante o processamento das notas fiscais.",
            "erro"
        );

    } finally {

        setTimeout(
            function () {
                mostrarProgressoOcr(false);
            },
            1200
        );
    }
}

/* =========================================================
   PROCESSAMENTO POR ARQUIVO
========================================================= */

async function processarArquivoNotaFiscal(
    arquivo,
    indiceArquivo,
    totalArquivos
) {

    const nome =
        arquivo.name.toLowerCase();

    if (nome.endsWith(".pdf")) {

        return await processarPdfNotaFiscal(
            arquivo,
            indiceArquivo,
            totalArquivos
        );
    }

    if (
        nome.endsWith(".png") ||
        nome.endsWith(".jpg") ||
        nome.endsWith(".jpeg") ||
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
   OCR DE IMAGEM
========================================================= */

async function executarOcrImagem(
    imagem,
    callbackProgresso
) {

    if (
        typeof Tesseract === "undefined"
    ) {
        throw new Error(
            "Tesseract.js não foi carregado."
        );
    }

    const resultado =
        await Tesseract.recognize(
            imagem,
            "por",
            {
                logger: function (mensagem) {

                    if (
                        mensagem.status ===
                        "recognizing text"
                    ) {

                        if (
                            typeof callbackProgresso ===
                            "function"
                        ) {
                            callbackProgresso(
                                mensagem.progress || 0
                            );
                        }
                    }
                }
            }
        );

    return resultado?.data?.text || "";
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

    for (
        let paginaNumero = 1;
        paginaNumero <= pdf.numPages;
        paginaNumero++
    ) {

        atualizarProgressoOcr(
            calcularPercentualBase(
                indiceArquivo,
                totalArquivos
            ),
            `${arquivo.name} - página ${paginaNumero} de ${pdf.numPages}`
        );

        const pagina =
            await pdf.getPage(
                paginaNumero
            );

        /*
         * Primeiro tentamos aproveitar texto real do PDF.
         * Isso é mais rápido e mais preciso que OCR quando
         * o PDF possui camada textual.
         */
        let textoPdf =
            await extrairTextoPaginaPdf(
                pagina
            );

        /*
         * Se o texto for insuficiente, renderizamos a página
         * e executamos OCR.
         */
        if (
            textoPdf.replace(/\s+/g, " ").trim().length <
            80
        ) {

            const canvas =
                await renderizarPaginaPdf(
                    pagina
                );

            textoPdf =
                await executarOcrImagem(
                    canvas,
                    function (progresso) {

                        const progressoPagina =
                            (
                                paginaNumero - 1 +
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
        }

        resultados.push(
            interpretarTextoNotaFiscal(
                textoPdf,
                pdf.numPages > 1
                    ? `${arquivo.name} - Página ${paginaNumero}`
                    : arquivo.name
            )
        );
    }

    return resultados;
}

async function carregarPdfJs() {

    if (
        window.pdfjsLib
    ) {
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

async function extrairTextoPaginaPdf(
    pagina
) {

    try {

        const conteudo =
            await pagina.getTextContent();

        return conteudo.items
            .map(
                function (item) {
                    return item.str;
                }
            )
            .join(" ");

    } catch (erro) {

        console.warn(
            "Não foi possível extrair texto nativo do PDF.",
            erro
        );

        return "";
    }
}

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
   INTERPRETAÇÃO DA NOTA
========================================================= */

function interpretarTextoNotaFiscal(
    textoOriginal,
    nomeArquivo
) {

    const texto =
        normalizarTextoOCR(
            textoOriginal
        );

    const dataEmissao =
        extrairDataEmissaoNota(
            texto
        );

    const valor =
        extrairValorTotalNota(
            texto
        );

    const competencia =
        dataEmissao
            ? formatarCompetencia(
                dataEmissao
            )
            : "";

    let status = "Identificada";

    if (!dataEmissao && valor <= 0) {
        status =
            "Data e valor não identificados";
    } else if (!dataEmissao) {
        status =
            "Data não identificada";
    } else if (valor <= 0) {
        status =
            "Valor não identificado";
    }

    return {
        arquivo: nomeArquivo,
        dataEmissao: dataEmissao,
        competencia: competencia,
        valor: valor,
        texto: textoOriginal,
        status: status
    };
}

/* =========================================================
   NORMALIZAÇÃO OCR
========================================================= */

function normalizarTextoOCR(
    texto
) {

    return String(texto || "")
        .replace(/\r/g, "\n")
        .replace(/[|]/g, " ")
        .replace(/[ \t]+/g, " ")
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
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}

/* =========================================================
   DATA DE EMISSÃO
========================================================= */

function extrairDataEmissaoNota(
    texto
) {

    const linhas =
        texto
            .split(/\n/)
            .map(
                function (linha) {
                    return linha.trim();
                }
            )
            .filter(Boolean);

    const padroesPrioritarios = [
        /DATA\s*(?:DE\s*)?EMISS[AÃ]O[\s:.-]*(\d{2}\/\d{2}\/\d{4})/i,
        /EMISS[AÃ]O[\s:.-]*(\d{2}\/\d{2}\/\d{4})/i,
        /DATA\/HORA\s*(?:DE\s*)?EMISS[AÃ]O[\s:.-]*(\d{2}\/\d{2}\/\d{4})/i,
        /DATA\s*DA\s*EMISS[AÃ]O[\s:.-]*(\d{2}\/\d{2}\/\d{4})/i,
        /EMITIDA?\s*EM[\s:.-]*(\d{2}\/\d{2}\/\d{4})/i,
        /DATA\s*DE\s*GERA[CÇ][AÃ]O[\s:.-]*(\d{2}\/\d{2}\/\d{4})/i
    ];

    for (
        const padrao of padroesPrioritarios
    ) {

        const correspondencia =
            texto.match(
                padrao
            );

        if (correspondencia) {

            const data =
                criarDataBrasileira(
                    correspondencia[1]
                );

            if (data) {
                return data;
            }
        }
    }

    /*
     * Procura em linhas que contenham palavras ligadas
     * à emissão.
     */
    for (
        let i = 0;
        i < linhas.length;
        i++
    ) {

        const linhaNormalizada =
            normalizarComparacao(
                linhas[i]
            );

        if (
            linhaNormalizada.includes(
                "EMISSAO"
            ) ||
            linhaNormalizada.includes(
                "EMITIDA"
            )
        ) {

            const datas =
                linhas[i].match(
                    /\b\d{2}\/\d{2}\/\d{4}\b/g
                );

            if (
                datas &&
                datas.length > 0
            ) {

                const data =
                    criarDataBrasileira(
                        datas[0]
                    );

                if (data) {
                    return data;
                }
            }

            /*
             * OCR pode quebrar o título e a data em
             * linhas consecutivas.
             */
            if (
                linhas[i + 1]
            ) {

                const datasLinhaSeguinte =
                    linhas[i + 1].match(
                        /\b\d{2}\/\d{2}\/\d{4}\b/g
                    );

                if (
                    datasLinhaSeguinte &&
                    datasLinhaSeguinte.length > 0
                ) {

                    const data =
                        criarDataBrasileira(
                            datasLinhaSeguinte[0]
                        );

                    if (data) {
                        return data;
                    }
                }
            }
        }
    }

    /*
     * Última alternativa:
     * pega uma data encontrada no documento.
     */
    const todasDatas =
        texto.match(
            /\b\d{2}\/\d{2}\/\d{4}\b/g
        ) || [];

    for (
        const textoData of todasDatas
    ) {

        const data =
            criarDataBrasileira(
                textoData
            );

        if (data) {
            return data;
        }
    }

    return null;
}

function criarDataBrasileira(
    valor
) {

    const partes =
        String(valor || "")
            .split("/");

    if (
        partes.length !== 3
    ) {
        return null;
    }

    const dia =
        Number(partes[0]);

    const mes =
        Number(partes[1]);

    const ano =
        Number(partes[2]);

    if (
        dia < 1 ||
        dia > 31 ||
        mes < 1 ||
        mes > 12 ||
        ano < 2000 ||
        ano > 2100
    ) {
        return null;
    }

    const data =
        new Date(
            ano,
            mes - 1,
            dia
        );

    if (
        data.getFullYear() !== ano ||
        data.getMonth() !== mes - 1 ||
        data.getDate() !== dia
    ) {
        return null;
    }

    return data;
}

/* =========================================================
   VALOR DA NOTA
========================================================= */

function extrairValorTotalNota(
    texto
) {

    const linhas =
        texto
            .split(/\n/)
            .map(
                function (linha) {
                    return linha.trim();
                }
            )
            .filter(Boolean);

    /*
     * Ordem proposital.
     *
     * Primeiro buscamos descrições que normalmente
     * representam efetivamente o valor final do documento.
     */
    const rotulosPrioritarios = [
        "VALOR TOTAL DA NOTA",
        "VALOR TOTAL DA NF-E",
        "VALOR TOTAL DA NFE",
        "VALOR TOTAL NF-E",
        "VALOR TOTAL NFE",
        "VALOR DA NOTA",
        "TOTAL DA NOTA",
        "TOTAL NF-E",
        "TOTAL NFE",
        "VALOR TOTAL DO SERVIÇO",
        "VALOR TOTAL DO SERVICO",
        "VALOR DOS SERVIÇOS",
        "VALOR DOS SERVICOS",
        "VALOR LÍQUIDO DA NOTA",
        "VALOR LIQUIDO DA NOTA",
        "VALOR LÍQUIDO",
        "VALOR LIQUIDO",
        "TOTAL A PAGAR"
    ];

    for (
        const rotulo of rotulosPrioritarios
    ) {

        for (
            let i = 0;
            i < linhas.length;
            i++
        ) {

            const linhaNormalizada =
                normalizarComparacao(
                    linhas[i]
                );

            if (
                linhaNormalizada.includes(
                    normalizarComparacao(
                        rotulo
                    )
                )
            ) {

                /*
                 * Procura o valor na própria linha.
                 */
                const valorLinha =
                    extrairUltimoValorMonetario(
                        linhas[i]
                    );

                if (
                    valorLinha !== null &&
                    valorLinha > 0
                ) {
                    return valorLinha;
                }

                /*
                 * Em DANFE/NFS-e o rótulo pode ficar em uma
                 * linha e o valor na linha seguinte.
                 */
                for (
                    let proxima = 1;
                    proxima <= 2;
                    proxima++
                ) {

                    if (
                        !linhas[i + proxima]
                    ) {
                        continue;
                    }

                    const valorSeguinte =
                        extrairPrimeiroValorMonetario(
                            linhas[i + proxima]
                        );

                    if (
                        valorSeguinte !== null &&
                        valorSeguinte > 0
                    ) {
                        return valorSeguinte;
                    }
                }
            }
        }
    }

    /*
     * Expressões mais tolerantes para OCR.
     */
    const padroes = [
        /VALOR\s+TOTAL\s+(?:DA\s+)?NOTA[^0-9]{0,30}(?:R\$\s*)?([\d.]+,\d{2})/i,
        /VALOR\s+DA\s+NOTA[^0-9]{0,30}(?:R\$\s*)?([\d.]+,\d{2})/i,
        /TOTAL\s+DA\s+NOTA[^0-9]{0,30}(?:R\$\s*)?([\d.]+,\d{2})/i,
        /VALOR\s+TOTAL\s+(?:DA\s+)?NF[-\s]?E[^0-9]{0,30}(?:R\$\s*)?([\d.]+,\d{2})/i,
        /TOTAL\s+NF[-\s]?E[^0-9]{0,30}(?:R\$\s*)?([\d.]+,\d{2})/i,
        /VALOR\s+TOTAL\s+(?:DOS\s+)?SERVI[CÇ]OS[^0-9]{0,30}(?:R\$\s*)?([\d.]+,\d{2})/i,
        /VALOR\s+L[IÍ]QUIDO[^0-9]{0,30}(?:R\$\s*)?([\d.]+,\d{2})/i
    ];

    for (
        const padrao of padroes
    ) {

        const correspondencia =
            texto.match(
                padrao
            );

        if (
            correspondencia &&
            correspondencia[1]
        ) {

            const valor =
                converterNumeroBrasileiro(
                    correspondencia[1]
                );

            if (valor > 0) {
                return valor;
            }
        }
    }

    /*
     * Último fallback:
     *
     * se não encontramos um campo explícito, analisamos
     * valores monetários em linhas que contenham "TOTAL".
     */
    const candidatosTotal = [];

    linhas.forEach(
        function (linha) {

            const normalizada =
                normalizarComparacao(
                    linha
                );

            if (
                normalizada.includes(
                    "TOTAL"
                )
            ) {

                const valores =
                    extrairTodosValoresMonetarios(
                        linha
                    );

                candidatosTotal.push(
                    ...valores
                );
            }
        }
    );

    if (
        candidatosTotal.length > 0
    ) {

        return Math.max(
            ...candidatosTotal
        );
    }

    return 0;
}

/* =========================================================
   VALORES MONETÁRIOS OCR
========================================================= */

function extrairTodosValoresMonetarios(
    texto
) {

    const correspondencias =
        String(texto || "").match(
            /(?:R\$\s*)?\d{1,3}(?:\.\d{3})*,\d{2}|(?:R\$\s*)?\d+,\d{2}/g
        ) || [];

    return correspondencias
        .map(
            function (valor) {

                return converterNumeroBrasileiro(
                    valor
                );
            }
        )
        .filter(
            function (valor) {

                return Number.isFinite(valor);
            }
        );
}

function extrairPrimeiroValorMonetario(
    texto
) {

    const valores =
        extrairTodosValoresMonetarios(
            texto
        );

    return valores.length > 0
        ? valores[0]
        : null;
}

function extrairUltimoValorMonetario(
    texto
) {

    const valores =
        extrairTodosValoresMonetarios(
            texto
        );

    return valores.length > 0
        ? valores[valores.length - 1]
        : null;
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

    /*
     * 12.345,67
     */
    if (
        texto.includes(",")
    ) {

        texto =
            texto
                .replace(/\./g, "")
                .replace(",", ".");
    }

    const numero =
        Number(texto);

    return Number.isFinite(numero)
        ? numero
        : 0;
}

/* =========================================================
   CONSOLIDAÇÃO POR COMPETÊNCIA
========================================================= */

function consolidarNotasProcessadas() {

    const notasValidas =
        notasProcessadasOCR.filter(
            function (nota) {

                return (
                    nota.dataEmissao &&
                    nota.competencia &&
                    nota.valor > 0
                );
            }
        );

    if (
        notasValidas.length === 0
    ) {

        definirStatusOcr(
            "Nenhuma nota com data e valor válidos foi identificada para preencher os períodos.",
            "erro"
        );

        return;
    }

    const agrupamento = {};

    notasValidas.forEach(
        function (nota) {

            const chave =
                nota.competencia;

            if (!agrupamento[chave]) {

                agrupamento[chave] = {
                    competencia: chave,
                    total: 0,
                    quantidade: 0,
                    notas: []
                };
            }

            agrupamento[chave].total +=
                nota.valor;

            agrupamento[chave].quantidade++;

            agrupamento[chave].notas.push(
                nota
            );
        }
    );

    const competencias =
        Object.keys(
            agrupamento
        ).sort();

    /*
     * Ao processar OCR, substituímos os períodos existentes
     * pelos períodos identificados nas notas.
     */
    const lista =
        document.getElementById(
            "listaPeriodosNotas"
        );

    if (lista) {
        lista.innerHTML = "";
    }

    contadorPeriodosNotas = 0;

    competencias.forEach(
        function (competencia) {

            const grupo =
                agrupamento[
                competencia
                ];

            const periodo =
                adicionarPeriodoNota({
                    competencia:
                        grupo.competencia,
                    meses: 1,
                    total:
                        grupo.total,
                    quantidade:
                        grupo.quantidade
                });

            if (!periodo) {
                return;
            }

            const inputQuantidade =
                periodo.querySelector(
                    ".calculo-notas-quantidade"
                );

            if (inputQuantidade) {

                inputQuantidade.value =
                    grupo.quantidade;
            }

            periodo.dataset.origem =
                "ocr";
        }
    );

    atualizarCalculoNotas();
}

/* =========================================================
   TABELA DE NOTAS PROCESSADAS
========================================================= */

function renderizarTabelaNotasProcessadas() {

    const tbody =
        document.getElementById(
            "tabelaNotasProcessadas"
        );

    const card =
        document.getElementById(
            "cardNotasProcessadas"
        );

    if (
        !tbody ||
        !card
    ) {
        return;
    }

    tbody.innerHTML = "";

    notasProcessadasOCR.forEach(
        function (nota) {

            const tr =
                document.createElement(
                    "tr"
                );

            tr.innerHTML = `
                <td>
                    ${escaparHtml(nota.arquivo)}
                </td>

                <td>
                    ${nota.dataEmissao
                    ? formatarDataBrasileira(
                        nota.dataEmissao
                    )
                    : "-"
                }
                </td>

                <td>
                    ${nota.competencia
                    ? formatarCompetenciaExibicao(
                        nota.competencia
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
                    ${escaparHtml(nota.status)}
                </td>
            `;

            tbody.appendChild(
                tr
            );
        }
    );

    card.hidden =
        notasProcessadasOCR.length === 0;
}

/* =========================================================
   PROGRESSO
========================================================= */

function atualizarProgressoArquivo(
    indiceArquivo,
    totalArquivos,
    progressoArquivo,
    descricao
) {

    const base =
        indiceArquivo /
        totalArquivos;

    const parteArquivo =
        progressoArquivo /
        totalArquivos;

    const total =
        Math.min(
            1,
            base + parteArquivo
        );

    atualizarProgressoOcr(
        Math.round(
            total * 100
        ),
        descricao
    );
}

function calcularPercentualBase(
    indiceArquivo,
    totalArquivos
) {

    return Math.round(
        (
            indiceArquivo /
            totalArquivos
        ) * 100
    );
}

function mostrarProgressoOcr(
    mostrar
) {

    const container =
        document.getElementById(
            "progressoOcrNotas"
        );

    if (!container) {
        return;
    }

    container.hidden =
        !mostrar;
}

function atualizarProgressoOcr(
    percentual,
    texto
) {

    const barra =
        document.getElementById(
            "progressoOcrNotasBarra"
        );

    const textoElemento =
        document.getElementById(
            "progressoOcrNotasTexto"
        );

    const valor =
        Math.max(
            0,
            Math.min(
                100,
                Number(percentual) || 0
            )
        );

    if (barra) {

        barra.style.width =
            `${valor}%`;
    }

    if (textoElemento) {

        textoElemento.textContent =
            texto
                ? `${valor}% - ${texto}`
                : `${valor}%`;
    }
}

/* =========================================================
   STATUS OCR
========================================================= */

function definirStatusOcr(
    mensagem,
    tipo
) {

    const elemento =
        document.getElementById(
            "statusOcrNotas"
        );

    if (!elemento) {
        return;
    }

    elemento.hidden = false;

    elemento.className =
        `ocr-status ocr-status-${tipo || "normal"}`;

    elemento.textContent =
        mensagem;
}

function limparArquivosNotasFiscais() {

    const input =
        document.getElementById(
            "arquivosNotasFiscais"
        );

    const status =
        document.getElementById(
            "statusOcrNotas"
        );

    const progresso =
        document.getElementById(
            "progressoOcrNotas"
        );

    const tabela =
        document.getElementById(
            "tabelaNotasProcessadas"
        );

    const card =
        document.getElementById(
            "cardNotasProcessadas"
        );

    if (input) {
        input.value = "";
    }

    if (status) {
        status.hidden = true;
    }

    if (progresso) {
        progresso.hidden = true;
    }

    if (tabela) {
        tabela.innerHTML = "";
    }

    if (card) {
        card.hidden = true;
    }

    notasProcessadasOCR = [];
}

/* =========================================================
   COMPETÊNCIA
========================================================= */

function formatarCompetencia(
    data
) {

    const ano =
        data.getFullYear();

    const mes =
        String(
            data.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    return `${ano}-${mes}`;
}

function formatarCompetenciaExibicao(
    competencia
) {

    const partes =
        String(
            competencia || ""
        ).split("-");

    if (
        partes.length !== 2
    ) {
        return competencia;
    }

    return `${partes[1]}/${partes[0]}`;
}

/* =========================================================
   MOEDA
========================================================= */

function converterMoedaParaNumero(
    valor
) {

    if (
        typeof valor === "number"
    ) {

        return Number.isFinite(valor)
            ? valor
            : 0;
    }

    let texto =
        String(
            valor || ""
        )
            .replace(/R\$/gi, "")
            .replace(/\s/g, "")
            .trim();

    if (!texto) {
        return 0;
    }

    if (
        texto.includes(",")
    ) {

        texto =
            texto
                .replace(/\./g, "")
                .replace(",", ".");
    }

    const numero =
        Number(texto);

    return Number.isFinite(numero)
        ? numero
        : 0;
}

function formatarMoeda(
    valor
) {

    return Number(
        valor || 0
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

function formatarMoedaCampo(
    valor
) {

    return Number(
        valor || 0
    ).toLocaleString(
        "pt-BR",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );
}

function aplicarMascaraMoedaInput(
    input
) {

    const apenasNumeros =
        String(
            input.value || ""
        ).replace(
            /\D/g,
            ""
        );

    if (!apenasNumeros) {

        input.value = "";

        return;
    }

    const numero =
        Number(
            apenasNumeros
        ) / 100;

    input.value =
        numero.toLocaleString(
            "pt-BR",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );
}

/* =========================================================
   DATAS
========================================================= */

function formatarDataBrasileira(
    data
) {

    return new Intl.DateTimeFormat(
        "pt-BR"
    ).format(
        data
    );
}

/* =========================================================
   SEGURANÇA DE EXIBIÇÃO
========================================================= */

function escaparHtml(
    texto
) {

    return String(
        texto || ""
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
   UTILITÁRIOS
========================================================= */

function definirTexto(
    id,
    texto
) {

    const elemento =
        document.getElementById(
            id
        );

    if (elemento) {
        elemento.textContent =
            texto;
    }
}