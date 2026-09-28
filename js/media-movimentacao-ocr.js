(function () {
    "use strict";

    /*
     * =========================================================
     * MEDIA-MOVIMENTACAO-OCR.JS
     * =========================================================
     */

    let arquivosExtratoSelecionados = [];
    let resultadoLeituraOCR = null;

    const TIPOS_DOCUMENTO = {
        EXTRATO_CONTA: "EXTRATO_CONTA",
        FATURA_CARTAO: "FATURA_CARTAO",
        INVESTIMENTO: "INVESTIMENTO",
        DESCONHECIDO: "DESCONHECIDO"
    };

    const MESES_PT = {
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

    const TERMOS_EXCLUSAO_CREDITO = [
        /\bEMPRESTIMO\b/,
        /\bFINANCIAMENTO\b/,
        /\bFINANC\b/,
        /\bCREDITO PESSOAL\b/,
        /\bCREDITO CONSIGNADO\b/,
        /\bCAPITAL DE GIRO\b/,
        /\bLIBERACAO DE CREDITO\b/,
        /\bLIBERACAO CREDITO\b/,
        /\bCREDITO ROTATIVO\b/,
        /\bCHEQUE ESPECIAL\b/,
        /\bLIMITE DE CREDITO\b/,
        /\bLIMITE DISPONIVEL\b/,
        /\bADIANTAMENTO A DEPOSITANTE\b/,

        /\bESTORNO\b/,
        /\bREVERSAO\b/,
        /\bCANCELAMENTO\b/,
        /\bDEVOLUCAO\b/,
        /\bDEVOLVIDO\b/,
        /\bREEMBOLSO\b/,

        /\bRDB\b/,
        /\bRDC\b/,
        /\bCDB\b/,
        /\bRESGATE\b/,
        /\bAPLICACAO\b/,
        /\bINVESTIMENTO\b/,
        /\bFUNDO DE INVESTIMENTO\b/,
        /\bRESGATE AUTOMATICO\b/,
        /\bREMUNERACAO APLICACAO AUTOMATICA\b/,

        /\bANTECIPACAO\b/,
        /\bANTECIPACAO DE CREDITO\b/,
        /\bANTECIPACAO DE RECEBIVEIS\b/,

        /\bTITULO DESCONTADO\b/,
        /\bDESCONTO DE TITULOS\b/,
        /\bCRED LIBERACAO TD\b/,
        /\bCREDITO LIBERACAO TD\b/
    ];

    const TERMOS_CREDITO_SEGURO = [
        "PIX RECEBIDO",
        "PIX RECEBIDA",
        "TRANSFERENCIA RECEBIDA",
        "TRANSFERENCIA RECEBIDO",
        "TRANSF RECEBIDA",
        "TED RECEBIDA",
        "TED RECEBIDO",
        "DOC RECEBIDO",
        "DOC RECEBIDA",
        "DEPOSITO EM DINHEIRO",
        "DEPOSITO RECEBIDO",
        "DEPOSITO CHEQUE",
        "DINHEIRO RECEBIDO",
        "PAGAMENTO RECEBIDO",
        "RECEBIMENTO",
        "RECEBIMENTO DE VENDA",
        "VENDA APROVADA",
        "COBRANCA RECEBIDA",
        "LIQUIDACAO COBRANCA",
        "SALARIO",
        "PROVENTO",
        "ENTRADA DE DINHEIRO",
        "CREDITO RECEBIDO"
    ];

    const TERMOS_DEBITO = [
        "PIX ENVIADO",
        "PIX ENVIADA",
        "TRANSFERENCIA ENVIADA",
        "TRANSFERENCIA ENVIADO",
        "TED ENVIADA",
        "TED ENVIADO",
        "DOC ENVIADO",
        "DOC ENVIADA",
        "PAGAMENTO",
        "PAGAMENTO DE CONTA",
        "PAGAMENTO COM QR",
        "COMPRA",
        "SAQUE",
        "DEBITO",
        "DINHEIRO RETIRADO",
        "DINHEIRO RESERVADO",
        "RESERVA POR GASTOS"
    ];

    /*
     * =========================================================
     * INICIALIZAÇÃO
     * =========================================================
     */

    function iniciarLeituraExtratos() {
        if (
            document.documentElement.dataset
                .mediaMovimentacaoOCRInicializada === "1"
        ) {
            return;
        }

        document.documentElement.dataset
            .mediaMovimentacaoOCRInicializada = "1";

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
                evento => {
                    adicionarArquivos(
                        evento.target.files
                    );
                }
            );
        }

        if (area) {
            area.addEventListener(
                "dragover",
                evento => {
                    evento.preventDefault();

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
                evento => {
                    evento.preventDefault();

                    area.classList.remove(
                        "arrastando"
                    );

                    if (
                        evento.dataTransfer &&
                        evento.dataTransfer.files
                    ) {
                        adicionarArquivos(
                            evento.dataTransfer.files
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
                () => {
                    alterarSelecaoMovimentacoes(
                        true
                    );
                }
            );
        }

        if (btnNenhum) {
            btnNenhum.addEventListener(
                "click",
                () => {
                    alterarSelecaoMovimentacoes(
                        false
                    );
                }
            );
        }

        renderizarArquivosSelecionados();
        limparResumoOCR();

        console.info(
            "[Média de Movimentação] media-movimentacao-ocr.js carregado."
        );
    }

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            iniciarLeituraExtratos,
            { once: true }
        );
    } else {
        iniciarLeituraExtratos();
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
            fileList ||
            []
        ).forEach(
            arquivo => {
                const extensao =
                    obterExtensao(
                        arquivo.name
                    );

                if (
                    !permitidos.includes(
                        extensao
                    )
                ) {
                    return;
                }

                const duplicado =
                    arquivosExtratoSelecionados.some(
                        item =>
                            item.name ===
                            arquivo.name &&
                            item.size ===
                            arquivo.size &&
                            item.lastModified ===
                            arquivo.lastModified
                    );

                if (!duplicado) {
                    arquivosExtratoSelecionados.push(
                        arquivo
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
                String(
                    arquivosExtratoSelecionados.length
                );
        }

        if (btnLer) {
            btnLer.disabled =
                !arquivosExtratoSelecionados.length;
        }

        if (btnLimpar) {
            btnLimpar.disabled =
                !arquivosExtratoSelecionados.length;
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
                                    ${escaparHTML(
                        obterExtensao(
                            arquivo.name
                        ).toUpperCase()
                    )}
                                </div>

                                <div class="arquivo-extrato-dados">
                                    <strong>
                                        ${escaparHTML(
                        arquivo.name
                    )}
                                    </strong>

                                    <span>
                                        ${formatarTamanhoArquivo(
                        arquivo.size
                    )}
                                    </span>
                                </div>
                            </div>

                            <button
                                type="button"
                                class="btn-remover-arquivo"
                                data-indice="${indice}"
                                title="Remover arquivo"
                            >
                                ×
                            </button>
                        </div>
                    `
                )
                .join("");

        lista
            .querySelectorAll(
                ".btn-remover-arquivo"
            )
            .forEach(
                botao => {
                    botao.addEventListener(
                        "click",
                        () => {
                            const indice =
                                Number(
                                    botao.dataset.indice
                                );

                            arquivosExtratoSelecionados.splice(
                                indice,
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

        definirStatus(
            "Preparando leitura dos arquivos...",
            "processando"
        );

        const resultado = {
            documentos: [],
            movimentacoes: [],
            alertas: [],
            textoConsolidado: "",

            competencias:
                new Set(),

            instituicoes:
                new Set(),

            titular:
                "",

            documentoTitular:
                "",

            identidadePontuacao:
                -1,

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
                        !documento.texto
                    ) {
                        continue;
                    }

                    /*
                     * Titular só é pesquisado em campos
                     * identificáveis e CPF/CNPJ válido.
                     */

                    const identidade =
                        identificarDadosTitular(
                            documento.texto,
                            documento.banco
                        );

                    if (
                        identidade.pontuacao >
                        resultado.identidadePontuacao
                    ) {
                        resultado.identidadePontuacao =
                            identidade.pontuacao;

                        resultado.titular =
                            identidade.nome ||
                            "";

                        resultado.documentoTitular =
                            identidade.documento ||
                            "";
                    }

                    /*
                     * Fatura, investimento e documento
                     * desconhecido não entram na apuração.
                     */

                    if (
                        documento.excluidoDaApuracao
                    ) {
                        resultado.alertas.push(
                            `${documento.nome}: ${documento.motivoExclusao}`
                        );

                        continue;
                    }

                    const movimentos =
                        extrairMovimentacoesDocumento(
                            documento
                        );

                    documento.quantidadeMovimentacoes =
                        movimentos.length;

                    /*
                     * Competências do documento:
                     *
                     * primeiro utilizamos movimentações reais.
                     * Somente depois complementamos com período
                     * claramente identificado no extrato.
                     */

                    movimentos.forEach(
                        movimento => {
                            resultado.movimentacoes.push(
                                movimento
                            );

                            const data =
                                parseDataBR(
                                    movimento.data
                                );

                            if (!data) {
                                return;
                            }

                            resultado.competencias.add(
                                obterCompetenciaData(
                                    data
                                )
                            );
                        }
                    );

                    const competenciasDocumento =
                        identificarCompetenciasDocumento(
                            documento.texto
                        );

                    competenciasDocumento.forEach(
                        competencia => {
                            resultado.competencias.add(
                                competencia
                            );
                        }
                    );

                } catch (erro) {
                    console.error(
                        "Erro processando arquivo:",
                        arquivo.name,
                        erro
                    );

                    resultado.alertas.push(
                        `${arquivo.name}: ${erro.message || "não foi possível realizar a leitura."}`
                    );

                    resultado.documentos.push({
                        id:
                            `ERRO${indice + 1}`,

                        nome:
                            arquivo.name,

                        tamanho:
                            arquivo.size,

                        tipo:
                            arquivo.type,

                        metodo:
                            "Erro",

                        banco:
                            "",

                        texto:
                            "",

                        tipoDocumento:
                            TIPOS_DOCUMENTO.DESCONHECIDO,

                        excluidoDaApuracao:
                            true,

                        motivoExclusao:
                            "Falha na leitura do documento.",

                        erro:
                            String(
                                erro.message ||
                                erro
                            )
                    });
                }
            }

            removerMovimentacoesDuplicadas(
                resultado
            );

            marcarPossiveisTransferenciasProprias(
                resultado
            );

            marcarPossiveisDuplicidadesEntreBancos(
                resultado
            );

            recalcularPeriodoComBaseNasMovimentacoes(
                resultado
            );

            resultado.competencias =
                normalizarCompetenciasResultado(
                    resultado
                );

            resultado.instituicoes =
                Array.from(
                    resultado.instituicoes
                )
                    .filter(
                        Boolean
                    )
                    .sort(
                        (
                            a,
                            b
                        ) =>
                            a.localeCompare(
                                b,
                                "pt-BR"
                            )
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
     * LEITURA DE ARQUIVO
     * =========================================================
     */

    async function lerArquivoExtrato(
        arquivo,
        indice
    ) {
        const extensao =
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
                extensao
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
                    extensao
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
                extensao
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
            extensao ===
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

    /*
     * =========================================================
     * PDF.JS
     * =========================================================
     */

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

            const linhas =
                agruparItensPDFPorLinha(
                    conteudo.items
                );

            paginas.push(
                linhas.join(
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
            items ||
            []
        ).forEach(
            item => {
                const texto =
                    String(
                        item.str ||
                        ""
                    ).trim();

                if (!texto) {
                    return;
                }

                const x =
                    item.transform
                        ? Number(
                            item.transform[4] ||
                            0
                        )
                        : 0;

                const y =
                    item.transform
                        ? Number(
                            item.transform[5] ||
                            0
                        )
                        : 0;

                let grupo =
                    grupos.find(
                        itemGrupo =>
                            Math.abs(
                                itemGrupo.y -
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
            .filter(
                Boolean
            );
    }

    /*
     * =========================================================
     * OCR DO PDF
     * =========================================================
     */

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
                            resultado => {
                                if (
                                    resultado
                                ) {
                                    resolve(
                                        resultado
                                    );
                                } else {
                                    reject(
                                        new Error(
                                            "Falha ao converter página do PDF."
                                        )
                                    );
                                }
                            },
                            "image/png"
                        );
                    }
                );

            const texto =
                await executarOCRImagem(
                    blob
                );

            partes.push(
                texto
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

    /*
     * =========================================================
     * TESSERACT
     * =========================================================
     */

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
                                    ? ` ${Math.round(
                                        mensagem.progress *
                                        100
                                    )}%`
                                    : "";

                            definirStatus(
                                `OCR: ${traduzirStatusOCR(
                                    mensagem.status
                                )}${percentual}`,
                                "processando"
                            );
                        }
                }
            );

        return (
            resultado &&
            resultado.data
        )
            ? String(
                resultado.data.text ||
                ""
            )
            : "";
    }

    /*
     * =========================================================
     * TIPO DE DOCUMENTO
     * =========================================================
     */

    function identificarTipoDocumento(
        texto,
        banco
    ) {
        const normal =
            normalizar(
                texto
            );

        const sinaisFaturaFortes = [
            "RESUMO DA FATURA",
            "TOTAL DA SUA FATURA",
            "TOTAL DESTA FATURA",
            "TOTAL DA FATURA",
            "VALOR DA FATURA",
            "PAGAMENTO MINIMO",
            "FATURA ATUAL",
            "FECHAMENTO DA FATURA",
            "VENCIMENTO DA FATURA",
            "MELHOR DATA DE COMPRA",
            "MELHOR DIA DE COMPRA"
        ];

        const sinaisFaturaAuxiliares = [
            "COMPRAS NACIONAIS",
            "COMPRAS INTERNACIONAIS",
            "ENCARGOS DA FATURA",
            "PARCELAMENTO DA FATURA",
            "LIMITE DISPONIVEL PARA COMPRAS",
            "LIMITE DE CREDITO TOTAL",
            "LIMITE TOTAL DE CREDITO"
        ];

        const quantidadeFortes =
            sinaisFaturaFortes.filter(
                termo =>
                    normal.includes(
                        termo
                    )
            ).length;

        const quantidadeAuxiliares =
            sinaisFaturaAuxiliares.filter(
                termo =>
                    normal.includes(
                        termo
                    )
            ).length;

        if (
            quantidadeFortes >= 2 ||
            (
                quantidadeFortes >= 1 &&
                quantidadeAuxiliares >= 1
            )
        ) {
            return TIPOS_DOCUMENTO.FATURA_CARTAO;
        }

        /*
         * Investimento isolado.
         *
         * Se há movimentação típica de conta, não classificamos
         * o documento inteiro como investimento apenas porque
         * possui RDB/CDB em algumas linhas.
         */

        if (
            /\b(RDB|RDC|CDB|CARTEIRA DE INVESTIMENTOS|FUNDO DE INVESTIMENTO)\b/.test(
                normal
            ) &&
            !/\b(PIX RECEBIDO|PIX ENVIADO|TRANSFERENCIA RECEBIDA|CONTA CORRENTE|DETALHE DOS MOVIMENTOS)\b/.test(
                normal
            )
        ) {
            return TIPOS_DOCUMENTO.INVESTIMENTO;
        }

        /*
         * Mercado Pago
         */

        if (
            banco ===
            "Mercado Pago"
        ) {
            if (
                normal.includes(
                    "DETALHE DOS MOVIMENTOS"
                ) ||
                normal.includes(
                    "DATA DESCRICAO ID DA OPERACAO"
                ) ||
                normal.includes(
                    "PIX RECEBIDO"
                ) ||
                normal.includes(
                    "PIX ENVIADO"
                ) ||
                normal.includes(
                    "TOTAL DE ENTRADAS"
                ) ||
                normal.includes(
                    "TOTAL DE SAIDAS"
                )
            ) {
                return TIPOS_DOCUMENTO.EXTRATO_CONTA;
            }
        }

        /*
         * Nubank
         */

        if (
            banco ===
            "Nubank"
        ) {
            if (
                normal.includes(
                    "CONTA DO NUBANK"
                ) ||
                normal.includes(
                    "EXTRATO DA CONTA"
                ) ||
                normal.includes(
                    "PIX RECEBIDO"
                ) ||
                normal.includes(
                    "TRANSFERENCIA RECEBIDA"
                ) ||
                normal.includes(
                    "SALDO EM CONTA"
                )
            ) {
                return TIPOS_DOCUMENTO.EXTRATO_CONTA;
            }
        }

        /*
         * Santander
         */

        if (
            banco ===
            "Santander" &&
            (
                normal.includes(
                    "CONTA CORRENTE"
                ) ||
                normal.includes(
                    "MOVIMENTACAO"
                ) ||
                normal.includes(
                    "EXTRATO"
                )
            )
        ) {
            return TIPOS_DOCUMENTO.EXTRATO_CONTA;
        }

        const sinaisConta = [
            "EXTRATO CONTA CORRENTE",
            "EXTRATO DA CONTA",
            "EXTRATO DE CONTA",
            "CONTA CORRENTE",
            "DETALHE DOS MOVIMENTOS",
            "PIX RECEBIDO",
            "PIX ENVIADO",
            "TRANSFERENCIA RECEBIDA",
            "TRANSFERENCIA ENVIADA",
            "SALDO EM CONTA",
            "MOVIMENTACAO DA CONTA"
        ];

        if (
            sinaisConta.some(
                termo =>
                    normal.includes(
                        termo
                    )
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
            return "Documento identificado como fatura de cartão. Compras, limite, juros, IOF e total da fatura não participam da média de movimentação da conta corrente.";
        }

        if (
            documento.tipoDocumento ===
            TIPOS_DOCUMENTO.INVESTIMENTO
        ) {
            return "Documento identificado como demonstrativo de investimento. Aplicações, resgates e saldos de investimento não participam automaticamente da média de movimentação.";
        }

        if (
            documento.tipoDocumento ===
            TIPOS_DOCUMENTO.DESCONHECIDO
        ) {
            return "Tipo de documento não identificado com segurança. Documento mantido fora da apuração automática.";
        }

        return "";
    }

    /*
     * =========================================================
     * DESPACHANTE DE PARSER
     * =========================================================
     */

    function extrairMovimentacoesDocumento(
        documento
    ) {
        if (
            documento.tipoDocumento !==
            TIPOS_DOCUMENTO.EXTRATO_CONTA
        ) {
            return [];
        }

        const banco =
            documento.banco ||
            identificarInstituicao(
                documento.texto
            );

        if (
            banco ===
            "Mercado Pago"
        ) {
            return extrairMercadoPago(
                documento
            );
        }

        if (
            banco ===
            "Nubank"
        ) {
            return extrairNubank(
                documento
            );
        }

        if (
            banco ===
            "Santander"
        ) {
            return extrairSantander(
                documento
            );
        }

        return extrairGenerico(
            documento
        );
    }

    /*
     * =========================================================
     * MERCADO PAGO
     * =========================================================
     *
     * NÃO agrupamos tudo entre uma data e a data seguinte.
     *
     * No Mercado Pago podem existir diversas operações
     * no mesmo dia.
     *
     * A separação principal é feita pelo ID da operação.
     * =========================================================
     */

    function extrairMercadoPago(
        documento
    ) {
        const linhas =
            prepararLinhas(
                documento.texto
            );

        const anoPadrao =
            identificarAnoPrincipal(
                documento.texto
            );

        const operacoes =
            montarOperacoesMercadoPago(
                linhas,
                anoPadrao
            );

        const movimentacoes =
            [];

        operacoes.forEach(
            operacao => {
                if (
                    !operacao.data ||
                    !Number.isFinite(
                        operacao.valor
                    ) ||
                    operacao.valor ===
                    0
                ) {
                    return;
                }

                const historico =
                    limparDescricaoMercadoPago(
                        operacao.descricao
                    );

                const normal =
                    normalizar(
                        historico
                    );

                if (
                    !normal ||
                    deveIgnorarBlocoMercadoPago(
                        normal
                    )
                ) {
                    return;
                }

                const classificacao =
                    classificarMercadoPago(
                        normal,
                        operacao.valor
                    );

                if (
                    !classificacao
                ) {
                    return;
                }

                movimentacoes.push(
                    criarMovimentacao({
                        operacaoId:
                            operacao.id,

                        data:
                            operacao.data,

                        banco:
                            "Mercado Pago",

                        arquivo:
                            documento.nome,

                        historico,

                        valor:
                            Math.abs(
                                operacao.valor
                            ),

                        natureza:
                            classificacao.natureza,

                        classificacao:
                            classificacao.classificacao,

                        motivo:
                            classificacao.motivo,

                        considerar:
                            classificacao.considerar,

                        confianca:
                            classificacao.confianca
                    })
                );
            }
        );

        return movimentacoes;
    }

    function montarOperacoesMercadoPago(
        linhas,
        anoPadrao
    ) {
        const resultado =
            [];

        let dataAtual =
            "";

        let pendentes =
            [];

        let operacaoAtual =
            null;

        function finalizarAtual() {
            if (
                !operacaoAtual
            ) {
                return;
            }

            const descricao =
                [
                    ...pendentes,
                    ...operacaoAtual.descricao
                ]
                    .join(
                        " "
                    )
                    .replace(
                        /\s+/g,
                        " "
                    )
                    .trim();

            if (
                operacaoAtual.data &&
                Number.isFinite(
                    operacaoAtual.valor
                )
            ) {
                resultado.push({
                    data:
                        operacaoAtual.data,

                    id:
                        operacaoAtual.id ||
                        "",

                    descricao,

                    valor:
                        operacaoAtual.valor,

                    saldo:
                        Number.isFinite(
                            operacaoAtual.saldo
                        )
                            ? operacaoAtual.saldo
                            : null
                });
            }

            operacaoAtual =
                null;

            pendentes =
                [];
        }

        linhas.forEach(
            linhaOriginal => {
                let linha =
                    String(
                        linhaOriginal ||
                        ""
                    )
                        .replace(
                            /\u00a0/g,
                            " "
                        )
                        .replace(
                            /\s+/g,
                            " "
                        )
                        .trim();

                if (!linha) {
                    return;
                }

                const normal =
                    normalizar(
                        linha
                    );

                if (
                    ehCabecalhoMercadoPago(
                        normal
                    )
                ) {
                    return;
                }

                const dataInfo =
                    extrairDataFlexivel(
                        linha,
                        anoPadrao
                    );

                if (
                    dataInfo
                ) {
                    dataAtual =
                        dataInfo.dataTexto;

                    linha =
                        removerPrimeiraData(
                            linha
                        );

                    if (
                        !linha
                    ) {
                        return;
                    }
                }

                const idInfo =
                    localizarIdOperacaoMercadoPago(
                        linha
                    );

                if (
                    idInfo
                ) {
                    finalizarAtual();

                    const antesId =
                        linha
                            .substring(
                                0,
                                idInfo.indice
                            )
                            .trim();

                    const depoisId =
                        linha
                            .substring(
                                idInfo.fim
                            )
                            .trim();

                    const valores =
                        extrairOcorrenciasMonetarias(
                            depoisId
                        );

                    operacaoAtual = {
                        data:
                            dataAtual,

                        id:
                            idInfo.id,

                        descricao:
                            [],

                        valor:
                            NaN,

                        saldo:
                            NaN
                    };

                    if (
                        antesId
                    ) {
                        operacaoAtual.descricao.push(
                            antesId
                        );
                    }

                    if (
                        valores.length
                    ) {
                        operacaoAtual.valor =
                            valores[0].valor;

                        if (
                            valores.length >=
                            2
                        ) {
                            operacaoAtual.saldo =
                                valores[1].valor;
                        }

                        finalizarAtual();
                    }

                    return;
                }

                /*
                 * Algumas extrações PDF quebram o ID e o valor
                 * em linhas distintas.
                 */

                if (
                    operacaoAtual
                ) {
                    const valores =
                        extrairOcorrenciasMonetarias(
                            linha
                        );

                    if (
                        valores.length
                    ) {
                        const antesValor =
                            linha
                                .substring(
                                    0,
                                    valores[0].indice
                                )
                                .trim();

                        if (
                            antesValor
                        ) {
                            operacaoAtual.descricao.push(
                                antesValor
                            );
                        }

                        operacaoAtual.valor =
                            valores[0].valor;

                        if (
                            valores.length >=
                            2
                        ) {
                            operacaoAtual.saldo =
                                valores[1].valor;
                        }

                        finalizarAtual();

                        return;
                    }

                    operacaoAtual.descricao.push(
                        linha
                    );

                    return;
                }

                /*
                 * Fallback para extratos em que cada operação
                 * inteira veio numa única linha, porém sem ID.
                 */

                const valoresLinha =
                    extrairOcorrenciasMonetarias(
                        linha
                    );

                if (
                    dataAtual &&
                    valoresLinha.length &&
                    ehDescricaoTransacional(
                        normal
                    )
                ) {
                    resultado.push({
                        data:
                            dataAtual,

                        id:
                            "",

                        descricao:
                            linha,

                        valor:
                            valoresLinha[0].valor,

                        saldo:
                            valoresLinha.length >=
                                2
                                ? valoresLinha[1].valor
                                : null
                    });

                    pendentes =
                        [];

                    return;
                }

                if (
                    ehDescricaoPossivelMercadoPago(
                        normal
                    )
                ) {
                    pendentes.push(
                        linha
                    );

                    if (
                        pendentes.length >
                        4
                    ) {
                        pendentes.shift();
                    }
                }
            }
        );

        finalizarAtual();

        return resultado;
    }

    function localizarIdOperacaoMercadoPago(
        linha
    ) {
        const texto =
            String(
                linha ||
                ""
            );

        const ocorrenciasValor =
            extrairOcorrenciasMonetarias(
                texto
            );

        const limite =
            ocorrenciasValor.length
                ? ocorrenciasValor[0].indice
                : texto.length;

        const matches =
            Array.from(
                texto.matchAll(
                    /\b\d{9,20}\b/g
                )
            )
                .filter(
                    match =>
                        (
                            match.index ||
                            0
                        ) <
                        limite
                );

        if (
            !matches.length
        ) {
            return null;
        }

        const escolhido =
            matches[
            matches.length -
            1
            ];

        return {
            id:
                escolhido[0],

            indice:
                escolhido.index ||
                0,

            fim:
                (
                    escolhido.index ||
                    0
                ) +
                escolhido[0].length
        };
    }

    function ehCabecalhoMercadoPago(
        normal
    ) {
        const termos = [
            "DETALHE DOS MOVIMENTOS",
            "DATA DESCRICAO ID DA OPERACAO VALOR SALDO",
            "DATA DESCRICAO ID DA OPERACAO",
            "SALDO ANTERIOR",
            "SALDO FINAL",
            "TOTAL DE ENTRADAS",
            "TOTAL DE SAIDAS",
            "INFORMACOES DA CONTA",
            "CPF CNPJ",
            "PERIODO",
            "RESUMO"
        ];

        return termos.some(
            termo =>
                normal ===
                termo ||
                normal.startsWith(
                    termo +
                    " "
                )
        );
    }

    function ehDescricaoPossivelMercadoPago(
        normal
    ) {
        if (
            !normal ||
            ehCabecalhoMercadoPago(
                normal
            )
        ) {
            return false;
        }

        return true;
    }

    function deveIgnorarBlocoMercadoPago(
        normal
    ) {
        if (!normal) {
            return true;
        }

        const termos = [
            "SALDO ANTERIOR",
            "SALDO FINAL",
            "TOTAL DE ENTRADAS",
            "TOTAL DE SAIDAS",
            "DETALHE DOS MOVIMENTOS"
        ];

        return termos.some(
            termo =>
                normal ===
                termo ||
                normal.startsWith(
                    termo +
                    " "
                )
        );
    }

    function classificarMercadoPago(
        normal,
        valor
    ) {
        /*
         * Débito antes de qualquer regra de crédito.
         */

        if (
            valor <
            0 ||
            contemAlgumTermo(
                normal,
                TERMOS_DEBITO
            )
        ) {
            return {
                natureza:
                    "Débito",

                classificacao:
                    "Débito",

                considerar:
                    false,

                motivo:
                    "Movimentação de débito identificada no extrato.",

                confianca:
                    "alta"
            };
        }

        /*
         * Exclusões obrigatórias antes de inclusão.
         */

        const exclusao =
            localizarExclusaoCredito(
                normal
            );

        if (
            exclusao
        ) {
            return {
                natureza:
                    "Crédito",

                classificacao:
                    "Crédito excluído",

                considerar:
                    false,

                motivo:
                    exclusao,

                confianca:
                    "alta"
            };
        }

        /*
         * "Liberação de dinheiro" não é tratada como
         * renda automaticamente.
         */

        if (
            normal.includes(
                "LIBERACAO DE DINHEIRO"
            ) ||
            normal.includes(
                "DINHEIRO LIBERADO"
            )
        ) {
            return {
                natureza:
                    "Crédito",

                classificacao:
                    "Conferir origem",

                considerar:
                    false,

                motivo:
                    "Liberação de dinheiro identificada. A origem deve ser conferida antes da inclusão, pois pode representar crédito, empréstimo ou antecipação.",

                confianca:
                    "alta"
            };
        }

        if (
            contemAlgumTermo(
                normal,
                TERMOS_CREDITO_SEGURO
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
                    "Entrada de recursos identificada pelo histórico da operação.",

                confianca:
                    "alta"
            };
        }

        /*
         * Valor positivo sozinho NÃO basta.
         */

        if (
            valor >
            0
        ) {
            return {
                natureza:
                    "Crédito",

                classificacao:
                    "Conferir",

                considerar:
                    false,

                motivo:
                    "Valor positivo identificado, porém o histórico não permite confirmar a origem como recurso novo.",

                confianca:
                    "baixa"
            };
        }

        return null;
    }

    function limparDescricaoMercadoPago(
        descricao
    ) {
        return String(
            descricao ||
            ""
        )
            .replace(
                /\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/g,
                " "
            )
            .replace(
                /\b\d{9,20}\b/g,
                " "
            )
            .replace(
                /(?:R\$\s*)?[+-]?(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2}-?/gi,
                " "
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim();
    }

    /*
     * =========================================================
     * NUBANK
     * =========================================================
     */

    function extrairNubank(
        documento
    ) {
        const linhas =
            prepararLinhas(
                documento.texto
            );

        const anoPadrao =
            identificarAnoPrincipal(
                documento.texto
            );

        const blocos =
            montarBlocosTransacionaisGenericos(
                linhas,
                anoPadrao
            );

        const movimentacoes =
            [];

        blocos.forEach(
            bloco => {
                const normal =
                    normalizar(
                        bloco.texto
                    );

                if (
                    deveIgnorarBlocoNubank(
                        normal
                    )
                ) {
                    return;
                }

                const valores =
                    extrairOcorrenciasMonetarias(
                        bloco.texto
                    );

                if (
                    !valores.length
                ) {
                    return;
                }

                const valor =
                    selecionarValorNubank(
                        valores,
                        normal
                    );

                if (
                    !Number.isFinite(
                        valor
                    ) ||
                    valor ===
                    0
                ) {
                    return;
                }

                const classificacao =
                    classificarNubank(
                        normal,
                        valor
                    );

                if (
                    !classificacao
                ) {
                    return;
                }

                movimentacoes.push(
                    criarMovimentacao({
                        data:
                            bloco.data,

                        banco:
                            "Nubank",

                        arquivo:
                            documento.nome,

                        historico:
                            limparHistoricoGenerico(
                                bloco.texto
                            ),

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

                        confianca:
                            classificacao.confianca
                    })
                );
            }
        );

        return movimentacoes;
    }

    function deveIgnorarBlocoNubank(
        normal
    ) {
        const termos = [
            "SALDO ANTERIOR",
            "SALDO FINAL",
            "SALDO DISPONIVEL",
            "RESUMO DA FATURA",
            "TOTAL DA FATURA",
            "VALOR DA FATURA",
            "LIMITE DE CREDITO",
            "PAGAMENTO MINIMO"
        ];

        return termos.some(
            termo =>
                normal ===
                termo ||
                normal.startsWith(
                    termo +
                    " "
                )
        );
    }

    function selecionarValorNubank(
        ocorrencias,
        normal
    ) {
        if (
            !ocorrencias.length
        ) {
            return NaN;
        }

        /*
         * Se o extrato traz sinal explícito,
         * ele possui prioridade.
         */

        const sinalizado =
            ocorrencias.find(
                ocorrencia =>
                    ocorrencia.valor <
                    0 ||
                    ocorrencia.sinalNegativoFinal ||
                    /^[+-]/.test(
                        ocorrencia.bruto
                            .replace(
                                /^R\$\s*/i,
                                ""
                            )
                            .trim()
                    )
            );

        if (
            sinalizado
        ) {
            return sinalizado.valor;
        }

        if (
            contemAlgumTermo(
                normal,
                TERMOS_DEBITO
            )
        ) {
            return -Math.abs(
                ocorrencias[0].valor
            );
        }

        if (
            contemAlgumTermo(
                normal,
                TERMOS_CREDITO_SEGURO
            )
        ) {
            return Math.abs(
                ocorrencias[0].valor
            );
        }

        return ocorrencias[0].valor;
    }

    function classificarNubank(
        normal,
        valor
    ) {
        if (
            valor <
            0 ||
            contemAlgumTermo(
                normal,
                TERMOS_DEBITO
            )
        ) {
            return {
                natureza:
                    "Débito",

                classificacao:
                    "Débito",

                considerar:
                    false,

                motivo:
                    "Movimentação de débito identificada.",

                confianca:
                    "alta"
            };
        }

        const exclusao =
            localizarExclusaoCredito(
                normal
            );

        if (
            exclusao
        ) {
            return {
                natureza:
                    "Crédito",

                classificacao:
                    "Crédito excluído",

                considerar:
                    false,

                motivo:
                    exclusao,

                confianca:
                    "alta"
            };
        }

        if (
            contemAlgumTermo(
                normal,
                TERMOS_CREDITO_SEGURO
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
                    "Entrada de recursos identificada pelo histórico.",

                confianca:
                    "alta"
            };
        }

        if (
            valor >
            0
        ) {
            return {
                natureza:
                    "Crédito",

                classificacao:
                    "Conferir",

                considerar:
                    false,

                motivo:
                    "Valor positivo identificado, mas o histórico não confirma a origem como recurso novo.",

                confianca:
                    "baixa"
            };
        }

        return null;
    }

    /*
     * =========================================================
     * SANTANDER
     * =========================================================
     */

    function extrairSantander(
        documento
    ) {
        const linhas =
            prepararLinhas(
                documento.texto
            );

        const anoPadrao =
            identificarAnoPrincipal(
                documento.texto
            );

        const blocos =
            montarBlocosTransacionaisGenericos(
                linhas,
                anoPadrao
            );

        const movimentacoes =
            [];

        blocos.forEach(
            bloco => {
                const normal =
                    normalizar(
                        bloco.texto
                    );

                if (
                    deveIgnorarBlocoSantander(
                        normal
                    )
                ) {
                    return;
                }

                const valores =
                    extrairOcorrenciasMonetarias(
                        bloco.texto
                    );

                if (
                    !valores.length
                ) {
                    return;
                }

                const valor =
                    selecionarValorSantander(
                        valores,
                        normal
                    );

                if (
                    !Number.isFinite(
                        valor
                    ) ||
                    valor ===
                    0
                ) {
                    return;
                }

                const classificacao =
                    classificarSantander(
                        normal,
                        valor
                    );

                if (
                    !classificacao
                ) {
                    return;
                }

                movimentacoes.push(
                    criarMovimentacao({
                        data:
                            bloco.data,

                        banco:
                            "Santander",

                        arquivo:
                            documento.nome,

                        historico:
                            limparHistoricoGenerico(
                                bloco.texto
                            ),

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

                        confianca:
                            classificacao.confianca
                    })
                );
            }
        );

        return movimentacoes;
    }

    function deveIgnorarBlocoSantander(
        normal
    ) {
        const termos = [
            "SALDO EM",
            "TOTAL DE CREDITOS",
            "TOTAL DE DEBITOS",
            "SALDO DISPONIVEL",
            "LIMITE SANTANDER",
            "PROVISAO DE ENCARGOS",
            "SALDOS POR PERIODO",
            "COMPRAS COM CARTAO DE DEBITO",
            "CREDITOS CONTRATADOS"
        ];

        return termos.some(
            termo =>
                normal.startsWith(
                    termo
                )
        );
    }

    function selecionarValorSantander(
        ocorrencias,
        normal
    ) {
        if (
            !ocorrencias.length
        ) {
            return NaN;
        }

        if (
            contemAlgumTermo(
                normal,
                TERMOS_DEBITO
            ) ||
            /\b(IOF|TARIFA)\b/.test(
                normal
            )
        ) {
            return -Math.abs(
                ocorrencias[0].valor
            );
        }

        const negativo =
            ocorrencias.find(
                item =>
                    item.valor <
                    0 ||
                    item.sinalNegativoFinal
            );

        if (
            negativo
        ) {
            return -Math.abs(
                negativo.valor
            );
        }

        return ocorrencias[0].valor;
    }

    function classificarSantander(
        normal,
        valor
    ) {
        if (
            valor <
            0 ||
            contemAlgumTermo(
                normal,
                TERMOS_DEBITO
            ) ||
            /\b(IOF|TARIFA)\b/.test(
                normal
            )
        ) {
            return {
                natureza:
                    "Débito",

                classificacao:
                    "Débito",

                considerar:
                    false,

                motivo:
                    "Movimentação de débito.",

                confianca:
                    "alta"
            };
        }

        const exclusao =
            localizarExclusaoCredito(
                normal
            );

        if (
            exclusao
        ) {
            return {
                natureza:
                    "Crédito",

                classificacao:
                    "Crédito excluído",

                considerar:
                    false,

                motivo:
                    exclusao,

                confianca:
                    "alta"
            };
        }

        if (
            contemAlgumTermo(
                normal,
                TERMOS_CREDITO_SEGURO
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
                    "Entrada de recursos identificada pelo histórico.",

                confianca:
                    "alta"
            };
        }

        if (
            valor >
            0
        ) {
            return {
                natureza:
                    "Crédito",

                classificacao:
                    "Conferir",

                considerar:
                    false,

                motivo:
                    "Crédito potencial identificado, porém o histórico não confirma a origem.",

                confianca:
                    "baixa"
            };
        }

        return null;
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

        const anoPadrao =
            identificarAnoPrincipal(
                documento.texto
            );

        const blocos =
            montarBlocosTransacionaisGenericos(
                linhas,
                anoPadrao
            );

        const movimentacoes =
            [];

        blocos.forEach(
            bloco => {
                const normal =
                    normalizar(
                        bloco.texto
                    );

                if (
                    deveIgnorarLinhaGenerica(
                        normal
                    )
                ) {
                    return;
                }

                const valores =
                    extrairOcorrenciasMonetarias(
                        bloco.texto
                    );

                if (
                    !valores.length
                ) {
                    return;
                }

                const classificacao =
                    classificarNaturezaGenerica(
                        normal,
                        valores
                    );

                if (
                    !classificacao
                ) {
                    return;
                }

                if (
                    !Number.isFinite(
                        classificacao.valor
                    ) ||
                    classificacao.valor ===
                    0
                ) {
                    return;
                }

                movimentacoes.push(
                    criarMovimentacao({
                        data:
                            bloco.data,

                        banco:
                            documento.banco ||
                            "Não identificado",

                        arquivo:
                            documento.nome,

                        historico:
                            limparHistoricoGenerico(
                                bloco.texto
                            ),

                        valor:
                            Math.abs(
                                classificacao.valor
                            ),

                        natureza:
                            classificacao.natureza,

                        classificacao:
                            classificacao.classificacao,

                        motivo:
                            classificacao.motivo,

                        considerar:
                            classificacao.considerar,

                        confianca:
                            classificacao.confianca
                    })
                );
            }
        );

        return movimentacoes;
    }

    function deveIgnorarLinhaGenerica(
        normal
    ) {
        if (!normal) {
            return true;
        }

        const termos = [
            "SALDO",
            "SALDO ANTERIOR",
            "SALDO FINAL",
            "SALDO DISPONIVEL",
            "TOTAL",
            "TOTAL DE CREDITOS",
            "TOTAL CREDITOS",
            "TOTAL DE DEBITOS",
            "TOTAL DEBITOS",
            "LIMITE",
            "LIMITE TOTAL",
            "LIMITE DE CREDITO",
            "TOTAL DA FATURA",
            "VALOR DA FATURA",
            "VENCIMENTO",
            "PAGAMENTO MINIMO",
            "RESUMO DA FATURA"
        ];

        return termos.some(
            termo =>
                normal ===
                termo ||
                normal.startsWith(
                    termo +
                    " "
                )
        );
    }

    function classificarNaturezaGenerica(
        normal,
        ocorrencias
    ) {
        if (
            !ocorrencias.length
        ) {
            return null;
        }

        const negativo =
            ocorrencias.find(
                item =>
                    item.valor <
                    0 ||
                    item.sinalNegativoFinal
            );

        if (
            negativo ||
            contemAlgumTermo(
                normal,
                TERMOS_DEBITO
            )
        ) {
            return {
                valor:
                    -Math.abs(
                        (
                            negativo ||
                            ocorrencias[0]
                        ).valor
                    ),

                natureza:
                    "Débito",

                classificacao:
                    "Débito",

                considerar:
                    false,

                motivo:
                    "Movimentação de débito.",

                confianca:
                    "alta"
            };
        }

        const exclusao =
            localizarExclusaoCredito(
                normal
            );

        if (
            exclusao
        ) {
            return {
                valor:
                    Math.abs(
                        ocorrencias[0].valor
                    ),

                natureza:
                    "Crédito",

                classificacao:
                    "Crédito excluído",

                considerar:
                    false,

                motivo:
                    exclusao,

                confianca:
                    "alta"
            };
        }

        if (
            contemAlgumTermo(
                normal,
                TERMOS_CREDITO_SEGURO
            )
        ) {
            return {
                valor:
                    Math.abs(
                        ocorrencias[0].valor
                    ),

                natureza:
                    "Crédito",

                classificacao:
                    "Crédito",

                considerar:
                    true,

                motivo:
                    "Entrada de recursos identificada pelo histórico.",

                confianca:
                    "alta"
            };
        }

        return {
            valor:
                Math.abs(
                    ocorrencias[0].valor
                ),

            natureza:
                "Crédito",

            classificacao:
                "Conferir",

            considerar:
                false,

            motivo:
                "Valor positivo identificado, porém a origem não foi confirmada com segurança.",

            confianca:
                "baixa"
        };
    }

    /*
     * =========================================================
     * BLOCOS TRANSACIONAIS GENÉRICOS
     * =========================================================
     */

    function montarBlocosTransacionaisGenericos(
        linhas,
        anoPadrao
    ) {
        const resultado =
            [];

        let dataAtual =
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

            const dataInfo =
                extrairDataFlexivel(
                    linha,
                    anoPadrao
                );

            if (
                dataInfo
            ) {
                dataAtual =
                    dataInfo.dataTexto;
            }

            if (
                !dataAtual
            ) {
                continue;
            }

            let bloco =
                linha;

            /*
             * Se a linha já possui valor monetário,
             * ela é uma candidata completa.
             *
             * Caso não tenha, agregamos no máximo
             * as próximas três linhas até encontrar
             * valor ou nova data.
             */

            if (
                !extrairOcorrenciasMonetarias(
                    bloco
                ).length
            ) {
                for (
                    let deslocamento = 1;
                    deslocamento <=
                    3 &&
                    indice +
                    deslocamento <
                    linhas.length;
                    deslocamento++
                ) {
                    const proxima =
                        linhas[
                        indice +
                        deslocamento
                        ];

                    const novaData =
                        extrairDataFlexivel(
                            proxima,
                            anoPadrao
                        );

                    if (
                        novaData
                    ) {
                        break;
                    }

                    if (
                        ehInicioSecaoNaoTransacional(
                            proxima
                        )
                    ) {
                        break;
                    }

                    bloco +=
                        " " +
                        proxima;

                    if (
                        extrairOcorrenciasMonetarias(
                            bloco
                        ).length
                    ) {
                        break;
                    }
                }
            }

            if (
                !extrairOcorrenciasMonetarias(
                    bloco
                ).length
            ) {
                continue;
            }

            resultado.push({
                data:
                    dataAtual,

                texto:
                    bloco
            });
        }

        return removerBlocosDuplicados(
            resultado
        );
    }

    function removerBlocosDuplicados(
        blocos
    ) {
        const mapa =
            new Map();

        blocos.forEach(
            bloco => {
                const chave =
                    [
                        bloco.data,
                        normalizar(
                            bloco.texto
                        )
                    ].join(
                        "|"
                    );

                if (
                    !mapa.has(
                        chave
                    )
                ) {
                    mapa.set(
                        chave,
                        bloco
                    );
                }
            }
        );

        return Array.from(
            mapa.values()
        );
    }

    function ehInicioSecaoNaoTransacional(
        linha
    ) {
        const normal =
            normalizar(
                linha
            );

        const termos = [
            "SALDOS POR PERIODO",
            "COMPRAS COM CARTAO DE DEBITO",
            "COMPROVANTES DE PAGAMENTO",
            "CREDITOS CONTRATADOS",
            "PACOTE DE SERVICOS",
            "INDICES ECONOMICOS",
            "RESUMO DA FATURA",
            "DETALHES DA FATURA",
            "TOTAL DE CREDITOS",
            "TOTAL DE DEBITOS"
        ];

        return termos.some(
            termo =>
                normal.startsWith(
                    termo
                )
        );
    }

    function ehDescricaoTransacional(
        normal
    ) {
        if (
            !normal
        ) {
            return false;
        }

        return (
            contemAlgumTermo(
                normal,
                TERMOS_CREDITO_SEGURO
            ) ||
            contemAlgumTermo(
                normal,
                TERMOS_DEBITO
            ) ||
            !!localizarExclusaoCredito(
                normal
            ) ||
            /\b(CREDITO|CRED|PIX|TED|DOC|TRANSFERENCIA|DEPOSITO|RECEBIMENTO|PAGAMENTO|SAQUE|COMPRA)\b/.test(
                normal
            )
        );
    }

    /*
     * =========================================================
     * EXCLUSÃO DE CRÉDITOS
     * =========================================================
     */

    function localizarExclusaoCredito(
        normal
    ) {
        if (
            !normal
        ) {
            return "";
        }

        if (
            /\b(RDB|RDC|CDB)\b/.test(
                normal
            )
        ) {
            return "Investimento financeiro não representa nova renda.";
        }

        if (
            /\b(RESGATE|APLICACAO|INVESTIMENTO|FUNDO DE INVESTIMENTO|RESGATE AUTOMATICO|REMUNERACAO APLICACAO AUTOMATICA)\b/.test(
                normal
            )
        ) {
            return "Resgate ou movimentação de investimento não representa novo recurso.";
        }

        if (
            /\b(EMPRESTIMO|FINANCIAMENTO|FINANC|CREDITO PESSOAL|CREDITO CONSIGNADO|CAPITAL DE GIRO|LIBERACAO DE CREDITO|LIBERACAO CREDITO)\b/.test(
                normal
            )
        ) {
            return "Empréstimo ou financiamento não representa renda.";
        }

        if (
            /\b(TITULO DESCONTADO|DESCONTO DE TITULOS|CRED LIBERACAO TD|CREDITO LIBERACAO TD)\b/.test(
                normal
            )
        ) {
            return "Liberação de título descontado não representa recurso novo para esta apuração.";
        }

        if (
            /\b(CHEQUE ESPECIAL|LIMITE DE CREDITO|CREDITO ROTATIVO|ADIANTAMENTO A DEPOSITANTE)\b/.test(
                normal
            )
        ) {
            return "Utilização ou liberação de limite não representa renda.";
        }

        if (
            /\b(ANTECIPACAO|ANTECIPACAO DE CREDITO|ANTECIPACAO DE RECEBIVEIS)\b/.test(
                normal
            )
        ) {
            return "Antecipação de recursos não é considerada nova renda nesta apuração.";
        }

        if (
            /\b(ESTORNO|REVERSAO|CANCELAMENTO|DEVOLUCAO|DEVOLVIDO|REEMBOLSO)\b/.test(
                normal
            )
        ) {
            return "Estorno, devolução, cancelamento ou reembolso não representa nova renda.";
        }

        const encontrou =
            TERMOS_EXCLUSAO_CREDITO.some(
                regra =>
                    regra.test(
                        normal
                    )
            );

        return encontrou
            ? "Movimentação enquadrada em regra de exclusão de crédito."
            : "";
    }

    /*
     * =========================================================
     * MOVIMENTAÇÃO
     * =========================================================
     */

    function criarMovimentacao(
        dados
    ) {
        const movimento = {
            id:
                "",

            operacaoId:
                dados.operacaoId ||
                "",

            data:
                dados.data ||
                "",

            banco:
                dados.banco ||
                "",

            arquivo:
                dados.arquivo ||
                "",

            historico:
                String(
                    dados.historico ||
                    ""
                )
                    .replace(
                        /\s+/g,
                        " "
                    )
                    .trim(),

            valor:
                Number(
                    dados.valor ||
                    0
                ),

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
                true,

            confianca:
                dados.confianca ||
                "",

            alteradoManual:
                false,

            possivelDuplicidade:
                false
        };

        movimento.id =
            gerarIdMovimentacao(
                movimento
            );

        return movimento;
    }

    function gerarIdMovimentacao(
        movimento
    ) {
        if (
            movimento.operacaoId
        ) {
            return [
                movimento.arquivo ||
                "",

                movimento.banco ||
                "",

                movimento.operacaoId
            ].join(
                "|"
            );
        }

        return [
            movimento.arquivo ||
            "",

            movimento.data ||
            "",

            movimento.banco ||
            "",

            normalizar(
                movimento.historico ||
                ""
            ),

            Number(
                movimento.valor ||
                0
            ).toFixed(
                2
            ),

            movimento.natureza ||
            ""
        ].join(
            "|"
        );
    }

    function removerMovimentacoesDuplicadas(
        resultado
    ) {
        const mapa =
            new Map();

        resultado.movimentacoes.forEach(
            movimento => {
                if (
                    !mapa.has(
                        movimento.id
                    )
                ) {
                    mapa.set(
                        movimento.id,
                        movimento
                    );
                }
            }
        );

        resultado.movimentacoes =
            Array.from(
                mapa.values()
            )
                .sort(
                    (
                        a,
                        b
                    ) => {
                        const dataA =
                            parseDataBR(
                                a.data
                            );

                        const dataB =
                            parseDataBR(
                                b.data
                            );

                        if (
                            dataA &&
                            dataB &&
                            dataA.getTime() !==
                            dataB.getTime()
                        ) {
                            return (
                                dataA -
                                dataB
                            );
                        }

                        return a.banco.localeCompare(
                            b.banco,
                            "pt-BR"
                        );
                    }
                );
    }

    /*
     * =========================================================
     * TRANSFERÊNCIA ENTRE CONTAS PRÓPRIAS
     * =========================================================
     */

    function marcarPossiveisTransferenciasProprias(
        resultado
    ) {
        const nomeCompleto =
            normalizar(
                resultado.titular ||
                ""
            );

        const partesNome =
            obterPartesNomeSignificativas(
                resultado.titular
            );

        if (
            !nomeCompleto &&
            !partesNome.length
        ) {
            return;
        }

        resultado.movimentacoes.forEach(
            movimento => {
                if (
                    movimento.natureza !==
                    "Crédito"
                ) {
                    return;
                }

                const historico =
                    normalizar(
                        movimento.historico
                    );

                let encontrou =
                    false;

                if (
                    nomeCompleto.length >=
                    8 &&
                    historico.includes(
                        nomeCompleto
                    )
                ) {
                    encontrou =
                        true;
                }

                if (
                    !encontrou &&
                    partesNome.length >=
                    2
                ) {
                    const quantidade =
                        partesNome.filter(
                            parte =>
                                historico.includes(
                                    parte
                                )
                        ).length;

                    if (
                        quantidade >=
                        2
                    ) {
                        encontrou =
                            true;
                    }
                }

                if (
                    encontrou
                ) {
                    movimento.considerar =
                        false;

                    movimento.classificacao =
                        "Possível transferência própria";

                    movimento.motivo =
                        "O histórico apresenta elementos compatíveis com o nome do titular. Possível transferência entre contas próprias; mantida fora da apuração automática.";

                    movimento.confianca =
                        "media";
                }
            }
        );
    }

    function obterPartesNomeSignificativas(
        nome
    ) {
        const ignorar =
            new Set([
                "DA",
                "DE",
                "DO",
                "DAS",
                "DOS",
                "E"
            ]);

        return normalizar(
            nome
        )
            .split(
                /\s+/
            )
            .filter(
                parte =>
                    parte.length >=
                    4 &&
                    !ignorar.has(
                        parte
                    )
            );
    }

    /*
     * =========================================================
     * POSSÍVEIS DUPLICIDADES ENTRE BANCOS
     * =========================================================
     *
     * Não excluímos automaticamente.
     * Apenas colocamos para conferência.
     * =========================================================
     */

    function marcarPossiveisDuplicidadesEntreBancos(
        resultado
    ) {
        const grupos =
            new Map();

        resultado.movimentacoes.forEach(
            movimento => {
                if (
                    movimento.natureza !==
                    "Crédito" ||
                    !Number.isFinite(
                        Number(
                            movimento.valor
                        )
                    )
                ) {
                    return;
                }

                const chave =
                    [
                        movimento.data,
                        Number(
                            movimento.valor
                        ).toFixed(
                            2
                        )
                    ].join(
                        "|"
                    );

                if (
                    !grupos.has(
                        chave
                    )
                ) {
                    grupos.set(
                        chave,
                        []
                    );
                }

                grupos.get(
                    chave
                ).push(
                    movimento
                );
            }
        );

        grupos.forEach(
            movimentos => {
                if (
                    movimentos.length <
                    2
                ) {
                    return;
                }

                const bancos =
                    new Set(
                        movimentos.map(
                            movimento =>
                                movimento.banco
                        )
                    );

                if (
                    bancos.size <
                    2
                ) {
                    return;
                }

                /*
                 * Só sinalizamos quando há termos de
                 * transferência, PIX ou TED.
                 */

                const candidatos =
                    movimentos.filter(
                        movimento => {
                            const historico =
                                normalizar(
                                    movimento.historico
                                );

                            return /\b(PIX|TRANSFERENCIA|TRANSF|TED|DOC)\b/.test(
                                historico
                            );
                        }
                    );

                if (
                    candidatos.length <
                    2
                ) {
                    return;
                }

                candidatos.forEach(
                    movimento => {
                        if (
                            movimento.classificacao ===
                            "Crédito excluído" ||
                            movimento.classificacao ===
                            "Possível transferência própria"
                        ) {
                            return;
                        }

                        movimento.possivelDuplicidade =
                            true;

                        movimento.considerar =
                            false;

                        movimento.classificacao =
                            "Possível duplicidade entre contas";

                        movimento.motivo =
                            "Há movimentação de mesmo valor e mesma data em instituições diferentes. Conferir se corresponde à mesma transferência antes de incluir.";
                    }
                );
            }
        );
    }

    /*
     * =========================================================
     * TEXTO CONSOLIDADO PARA MEDIA-MOVIMENTACAO.JS
     * =========================================================
     */

    function gerarTextoConsolidado(
        movimentacoes
    ) {
        return (
            movimentacoes ||
            []
        )
            .map(
                movimento => {
                    let decisao =
                        "DUVIDA";

                    if (
                        movimento.considerar ===
                        true &&
                        movimento.natureza ===
                        "Crédito"
                    ) {
                        decisao =
                            "INCLUIR";

                    } else if (
                        movimento.natureza ===
                        "Débito" ||
                        movimento.classificacao ===
                        "Crédito excluído" ||
                        movimento.classificacao ===
                        "Possível transferência própria"
                    ) {
                        decisao =
                            "EXCLUIR";
                    }

                    const indicador =
                        movimento.natureza ===
                            "Crédito"
                            ? "C"
                            : movimento.natureza ===
                                "Débito"
                                ? "D"
                                : "";

                    const meta =
                        [
                            `[ID:${movimento.id}]`,
                            `[BANCO:${movimento.banco}]`,
                            `[ARQUIVO:${movimento.arquivo}]`,
                            `[DECISAO:${decisao}]`
                        ].join(
                            " "
                        );

                    const valorFinal =
                        `${formatarValorNumero(
                            movimento.valor
                        )}${indicador ? " " + indicador : ""}`;

                    return [
                        movimento.data,
                        `${meta} ${movimento.historico}`.trim(),
                        valorFinal
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
     * RESULTADO OCR
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

        if (
            !elemento
        ) {
            return;
        }

        if (
            !documentos.length
        ) {
            elemento.innerHTML =
                '<div class="sem-dados">Nenhum documento processado.</div>';

            return;
        }

        elemento.innerHTML =
            documentos
                .map(
                    documento => {
                        const tipo =
                            rotuloTipoDocumento(
                                documento.tipoDocumento
                            );

                        const status =
                            documento.excluidoDaApuracao
                                ? "Excluído da apuração"
                                : "Processado";

                        return `
                            <div class="documento-ocr-item">
                                <div>
                                    <strong>
                                        ${escaparHTML(
                            documento.nome
                        )}
                                    </strong>

                                    <span>
                                        ${escaparHTML(
                            documento.banco ||
                            "Instituição não identificada"
                        )}
                                        ·
                                        ${escaparHTML(
                            tipo
                        )}
                                        ·
                                        ${escaparHTML(
                            status
                        )}
                                    </span>
                                </div>

                                <div class="documento-ocr-meta">
                                    <span>
                                        ${escaparHTML(
                            documento.metodo ||
                            "-"
                        )}
                                    </span>

                                    <span>
                                        ${formatarTamanhoArquivo(
                            documento.tamanho ||
                            0
                        )}
                                    </span>
                                </div>
                            </div>
                        `;
                    }
                )
                .join("");
    }

    function rotuloTipoDocumento(
        tipo
    ) {
        switch (
        tipo
        ) {
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

        if (
            !elemento
        ) {
            return;
        }

        if (
            !alertas.length
        ) {
            elemento.innerHTML =
                '<div class="aviso-info">Nenhum alerta adicional.</div>';

            return;
        }

        elemento.innerHTML =
            alertas
                .map(
                    alerta =>
                        `<div class="aviso-atencao">${escaparHTML(
                            alerta
                        )}</div>`
                )
                .join("");
    }

    /*
     * =========================================================
     * TABELA DE MOVIMENTAÇÕES
     * =========================================================
     */

    function renderizarTabelaMovimentacoesOCR(
        resultado
    ) {
        const tabela =
            document.getElementById(
                "tabelaMovimentacoesOCR"
            );

        if (
            !tabela
        ) {
            return;
        }

        const tbody =
            tabela.querySelector(
                "tbody"
            );

        if (
            !tbody
        ) {
            return;
        }

        if (
            !resultado.movimentacoes.length
        ) {
            tbody.innerHTML =
                '<tr><td colspan="8" class="sem-dados">Nenhuma movimentação de conta corrente identificada.</td></tr>';

            return;
        }

        tbody.innerHTML =
            resultado.movimentacoes
                .map(
                    (
                        movimento,
                        indice
                    ) => {
                        const bloqueado =
                            movimento.natureza ===
                            "Débito" ||
                            movimento.classificacao ===
                            "Crédito excluído" ||
                            movimento.classificacao ===
                            "Possível transferência própria";

                        return `
                            <tr>
                                <td>
                                    <input
                                        type="checkbox"
                                        class="check-movimentacao-ocr"
                                        data-indice="${indice}"
                                        ${movimento.considerar ? "checked" : ""}
                                        ${bloqueado ? "disabled" : ""}
                                    >
                                </td>

                                <td>
                                    ${escaparHTML(
                            movimento.data
                        )}
                                </td>

                                <td>
                                    ${escaparHTML(
                            movimento.banco
                        )}
                                </td>

                                <td>
                                    ${escaparHTML(
                            movimento.historico
                        )}
                                </td>

                                <td>
                                    ${formatarMoeda(
                            movimento.valor
                        )}
                                </td>

                                <td>
                                    ${escaparHTML(
                            movimento.natureza
                        )}
                                </td>

                                <td>
                                    ${escaparHTML(
                            movimento.classificacao
                        )}
                                </td>

                                <td>
                                    ${escaparHTML(
                            movimento.motivo
                        )}
                                </td>
                            </tr>
                        `;
                    }
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

                            if (
                                !resultadoLeituraOCR ||
                                !resultadoLeituraOCR
                                    .movimentacoes[
                                indice
                                ]
                            ) {
                                return;
                            }

                            const movimento =
                                resultadoLeituraOCR
                                    .movimentacoes[
                                indice
                                ];

                            const exclusao =
                                localizarExclusaoCredito(
                                    normalizar(
                                        movimento.historico
                                    )
                                );

                            /*
                             * Regras de exclusão rígidas não
                             * podem ser transformadas em crédito
                             * válido por clique acidental.
                             */

                            if (
                                checkbox.checked &&
                                (
                                    movimento.natureza ===
                                    "Débito" ||
                                    movimento.classificacao ===
                                    "Crédito excluído" ||
                                    movimento.classificacao ===
                                    "Possível transferência própria" ||
                                    exclusao
                                )
                            ) {
                                checkbox.checked =
                                    false;

                                return;
                            }

                            movimento.alteradoManual =
                                true;

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
                                    "Movimentação incluída manualmente durante a conferência.";
                            } else {
                                movimento.classificacao =
                                    "Conferir";

                                movimento.motivo =
                                    "Movimentação removida manualmente da apuração.";
                            }

                            resultadoLeituraOCR.textoConsolidado =
                                gerarTextoConsolidado(
                                    resultadoLeituraOCR.movimentacoes
                                );

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

        resultadoLeituraOCR
            .movimentacoes
            .forEach(
                movimento => {
                    if (
                        !marcar
                    ) {
                        movimento.considerar =
                            false;

                        return;
                    }

                    /*
                     * "Selecionar todos" seleciona somente
                     * créditos automáticos seguros.
                     *
                     * Não seleciona:
                     * - Conferir
                     * - Conferir origem
                     * - exclusões
                     * - transferências próprias
                     * - possíveis duplicidades
                     */

                    movimento.considerar =
                        movimento.natureza ===
                        "Crédito" &&
                        movimento.classificacao ===
                        "Crédito";
                }
            );

        resultadoLeituraOCR.textoConsolidado =
            gerarTextoConsolidado(
                resultadoLeituraOCR.movimentacoes
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

    /*
     * =========================================================
     * CÁLCULOS
     * =========================================================
     */

    function atualizarCalculosOCR(
        resultado
    ) {
        const creditos =
            resultado.movimentacoes.filter(
                movimento =>
                    movimento.considerar ===
                    true &&
                    movimento.natureza ===
                    "Crédito" &&
                    Number(
                        movimento.valor
                    ) >
                    0
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

                if (
                    !data
                ) {
                    return;
                }

                const competencia =
                    `${String(
                        data.getMonth() +
                        1
                    ).padStart(
                        2,
                        "0"
                    )}/${data.getFullYear()}`;

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
            obterCompetenciasValidas(
                resultado
            );

        const quantidadeMeses =
            competencias.length;

        const media =
            quantidadeMeses >
                0
                ? total /
                quantidadeMeses
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
                    competencia,
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
                        competencia;
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
                quantidadeMeses
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

    function obterCompetenciasValidas(
        resultado
    ) {
        const set =
            new Set();

        (
            resultado.competencias ||
            []
        ).forEach(
            competencia => {
                if (
                    /^\d{4}-\d{2}$/.test(
                        String(
                            competencia
                        )
                    )
                ) {
                    set.add(
                        competencia
                    );
                }
            }
        );

        return Array.from(
            set
        ).sort();
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

        if (
            !tabela
        ) {
            return;
        }

        const tbody =
            tabela.querySelector(
                "tbody"
            );

        if (
            !tbody
        ) {
            return;
        }

        if (
            !competencias.length
        ) {
            tbody.innerHTML =
                '<tr><td colspan="4" class="sem-dados">Nenhum período válido identificado.</td></tr>';

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
                                <td>
                                    ${escaparHTML(
                            chave
                        )}
                                </td>

                                <td>
                                    ${dados.quantidade}
                                </td>

                                <td>
                                    ${escaparHTML(
                            Array.from(
                                dados.bancos
                            ).join(
                                ", "
                            ) ||
                            "-"
                        )}
                                </td>

                                <td>
                                    ${formatarMoeda(
                            dados.total
                        )}
                                </td>
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

        if (
            !tabela
        ) {
            return;
        }

        const tbody =
            tabela.querySelector(
                "tbody"
            );

        if (
            !tbody
        ) {
            return;
        }

        const entradas =
            Object.entries(
                porBanco
            );

        if (
            !entradas.length
        ) {
            tbody.innerHTML =
                '<tr><td colspan="4" class="sem-dados">Nenhum crédito considerado.</td></tr>';

            return;
        }

        tbody.innerHTML =
            entradas
                .sort(
                    (
                        a,
                        b
                    ) =>
                        a[0].localeCompare(
                            b[0],
                            "pt-BR"
                        )
                )
                .map(
                    (
                        [
                            banco,
                            dados
                        ]
                    ) => {
                        const quantidadeCompetencias =
                            Math.max(
                                1,
                                dados.competencias.size
                            );

                        return `
                            <tr>
                                <td>
                                    ${escaparHTML(
                            banco
                        )}
                                </td>

                                <td>
                                    ${dados.quantidade}
                                </td>

                                <td>
                                    ${formatarMoeda(
                            dados.total
                        )}
                                </td>

                                <td>
                                    ${formatarMoeda(
                            dados.total /
                            quantidadeCompetencias
                        )}
                                </td>
                            </tr>
                        `;
                    }
                )
                .join("");
    }

    /*
     * =========================================================
     * RESUMO
     * =========================================================
     */

    function atualizarResumoLeitura(
        resultado
    ) {
        const textarea =
            document.getElementById(
                "resumoLeituraOCR"
            );

        if (
            !textarea
        ) {
            return;
        }

        const creditos =
            resultado.movimentacoes.filter(
                movimento =>
                    movimento.considerar &&
                    movimento.natureza ===
                    "Crédito"
            );

        const documentosIncluidos =
            resultado.documentos.filter(
                documento =>
                    !documento.excluidoDaApuracao
            );

        const documentosExcluidos =
            resultado.documentos.filter(
                documento =>
                    documento.excluidoDaApuracao
            );

        const conferir =
            resultado.movimentacoes.filter(
                movimento =>
                    !movimento.considerar &&
                    (
                        movimento.classificacao ===
                        "Conferir" ||
                        movimento.classificacao ===
                        "Conferir origem" ||
                        movimento.classificacao ===
                        "Possível duplicidade entre contas"
                    )
            );

        textarea.value =
            [
                "RESUMO DA LEITURA DOS EXTRATOS",

                `Arquivos processados: ${resultado.documentos.length}`,

                `Extratos de conta utilizados: ${documentosIncluidos.length}`,

                `Documentos excluídos da apuração: ${documentosExcluidos.length}`,

                `Titular: ${resultado.titular || "Não identificado"}`,

                `CPF/CNPJ: ${resultado.documentoTitular ? formatarDocumento(resultado.documentoTitular) : "Não identificado"}`,

                `Instituições: ${resultado.instituicoes.length ? resultado.instituicoes.join(", ") : "Não identificadas"}`,

                `Período válido: ${formatarPeriodo(resultado.primeiraData, resultado.ultimaData)}`,

                `Competências válidas: ${resultado.competencias.length ? resultado.competencias.map(formatarCompetencia).join(", ") : "Não identificadas"}`,

                `Movimentações de conta identificadas: ${resultado.movimentacoes.length}`,

                `Créditos selecionados: ${creditos.length}`,

                `Movimentações para conferência: ${conferir.length}`,

                `Total dos créditos selecionados: ${formatarMoeda(
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
                    )
                )}`,

                `Alertas: ${resultado.alertas.length}`
            ].join(
                "\n"
            );
    }

    /*
     * =========================================================
     * APLICAR LEITURA
     * =========================================================
     */

    function aplicarLeituraAoCalculo() {
        if (
            !resultadoLeituraOCR
        ) {
            alert(
                "Nenhum extrato foi processado."
            );

            return;
        }

        resultadoLeituraOCR.textoConsolidado =
            gerarTextoConsolidado(
                resultadoLeituraOCR.movimentacoes
            );

        try {
            if (
                window.MediaMovimentacao &&
                typeof window.MediaMovimentacao.processarTexto ===
                "function"
            ) {
                window.MediaMovimentacao.processarTexto(
                    resultadoLeituraOCR.textoConsolidado,
                    {
                        competenciasDocumentadas:
                            resultadoLeituraOCR.competencias
                    }
                );

            } else if (
                typeof window.processarTextoMovimentacao ===
                "function"
            ) {
                window.processarTextoMovimentacao(
                    resultadoLeituraOCR.textoConsolidado,
                    {
                        competenciasDocumentadas:
                            resultadoLeituraOCR.competencias
                    }
                );

            } else {
                const campo =
                    document.getElementById(
                        "textoExtratoMovimentacao"
                    );

                if (
                    campo
                ) {
                    campo.value =
                        resultadoLeituraOCR.textoConsolidado;
                }
            }

        } catch (erro) {
            console.error(
                "Erro ao aplicar leitura ao cálculo:",
                erro
            );
        }

        atualizarCalculosOCR(
            resultadoLeituraOCR
        );

        const card =
            document.getElementById(
                "cardResultadoMovimentacao"
            );

        if (
            card
        ) {
            card.scrollIntoView({
                behavior:
                    "smooth",

                block:
                    "start"
            });
        }
    }

    /*
     * =========================================================
     * COPIAR RESUMO
     * =========================================================
     */

    async function copiarResumoLeitura() {
        const campo =
            document.getElementById(
                "resumoLeituraOCR"
            );

        if (
            !campo
        ) {
            return;
        }

        try {
            await navigator.clipboard.writeText(
                campo.value
            );

            const botao =
                document.getElementById(
                    "btnCopiarResumoOCR"
                );

            if (
                botao
            ) {
                const original =
                    botao.textContent;

                botao.textContent =
                    "Copiado";

                setTimeout(
                    () => {
                        botao.textContent =
                            original;
                    },
                    1500
                );
            }

        } catch (erro) {
            campo.select();

            document.execCommand(
                "copy"
            );
        }
    }

    /*
     * =========================================================
     * INSTITUIÇÃO
     * =========================================================
     */

    function identificarInstituicao(
        texto
    ) {
        const normal =
            normalizar(
                texto
            );

        const compacto =
            normal.replace(
                /\s+/g,
                ""
            );

        const bancos = [
            {
                nome:
                    "Mercado Pago",

                termos: [
                    "MERCADO PAGO",
                    "MERCADOPAGO"
                ]
            },

            {
                nome:
                    "Banco Inter",

                termos: [
                    "BANCO INTER",
                    "INTER PAGAMENTOS",
                    "BANCO INTER S A",
                    "INTER BANK"
                ]
            },

            {
                nome:
                    "Nubank",

                termos: [
                    "NUBANK",
                    "NU PAGAMENTOS",
                    "NU FINANCEIRA",
                    "CONTA DO NUBANK"
                ]
            },

            {
                nome:
                    "Itaú",

                termos: [
                    "BANCO ITAU",
                    "ITAU UNIBANCO",
                    "ITAU"
                ]
            },

            {
                nome:
                    "Santander",

                termos: [
                    "SANTANDER"
                ]
            },

            {
                nome:
                    "Sicoob",

                termos: [
                    "SICOOB"
                ]
            },

            {
                nome:
                    "Sicredi",

                termos: [
                    "SICREDI"
                ]
            },

            {
                nome:
                    "Bradesco",

                termos: [
                    "BRADESCO"
                ]
            },

            {
                nome:
                    "Banco do Brasil",

                termos: [
                    "BANCO DO BRASIL"
                ]
            },

            {
                nome:
                    "Caixa Econômica Federal",

                termos: [
                    "CAIXA ECONOMICA"
                ]
            },

            {
                nome:
                    "C6 Bank",

                termos: [
                    "C6 BANK"
                ]
            },

            {
                nome:
                    "PagBank",

                termos: [
                    "PAGBANK",
                    "PAGSEGURO"
                ]
            }
        ];

        for (
            const banco of bancos
        ) {
            if (
                banco.termos.some(
                    termo =>
                        normal.includes(
                            termo
                        )
                )
            ) {
                return banco.nome;
            }
        }

        /*
         * OCR pode separar N U B A N K.
         */

        if (
            compacto.includes(
                "NUBANK"
            ) ||
            compacto.includes(
                "NUPAGAMENTOS"
            )
        ) {
            return "Nubank";
        }

        /*
         * Banco Inter pode aparecer apenas INTER.
         * Só assumimos se houver outros elementos bancários.
         */

        if (
            /\bINTER\b/.test(
                normal
            ) &&
            (
                normal.includes(
                    "EXTRATO"
                ) ||
                normal.includes(
                    "CONTA"
                ) ||
                normal.includes(
                    "RESUMO DA FATURA"
                )
            )
        ) {
            return "Banco Inter";
        }

        return "";
    }

    /*
     * =========================================================
     * TITULAR / CPF / CNPJ
     * =========================================================
     */

    function identificarDadosTitular(
        texto,
        banco
    ) {
        const linhas =
            prepararLinhas(
                texto
            );

        const candidatosNome =
            [];

        const candidatosDocumento =
            [];

        linhas.forEach(
            (
                linha,
                indice
            ) => {
                const normal =
                    normalizar(
                        linha
                    );

                /*
                 * Nome na mesma linha.
                 */

                const nomeMesmaLinha =
                    linha.match(
                        /(?:NOME|TITULAR|CLIENTE|CORRENTISTA)\s*:?\s+([A-ZÀ-Ú][A-ZÀ-Ú\s.'-]{4,100})/i
                    );

                if (
                    nomeMesmaLinha
                ) {
                    const nome =
                        limparNome(
                            nomeMesmaLinha[1]
                        );

                    if (
                        pareceNomePessoa(
                            nome
                        )
                    ) {
                        candidatosNome.push({
                            nome,
                            pontuacao:
                                120
                        });
                    }
                }

                /*
                 * Nome na linha seguinte.
                 */

                if (
                    /^(NOME|TITULAR|CLIENTE|CORRENTISTA)\s*:?\s*$/.test(
                        normal
                    ) &&
                    linhas[
                    indice +
                    1
                    ]
                ) {
                    const nome =
                        limparNome(
                            linhas[
                            indice +
                            1
                            ]
                        );

                    if (
                        pareceNomePessoa(
                            nome
                        )
                    ) {
                        candidatosNome.push({
                            nome,
                            pontuacao:
                                110
                        });
                    }
                }

                /*
                 * CPF.
                 */

                if (
                    /\bCPF\b/.test(
                        normal
                    )
                ) {
                    coletarDocumentosDaLinha(
                        linha
                    ).forEach(
                        documento => {
                            if (
                                documento.length ===
                                11
                            ) {
                                candidatosDocumento.push({
                                    documento,
                                    pontuacao:
                                        250
                                });
                            }
                        }
                    );

                    if (
                        linhas[
                        indice +
                        1
                        ]
                    ) {
                        coletarDocumentosDaLinha(
                            linhas[
                            indice +
                            1
                            ]
                        ).forEach(
                            documento => {
                                if (
                                    documento.length ===
                                    11
                                ) {
                                    candidatosDocumento.push({
                                        documento,
                                        pontuacao:
                                            220
                                    });
                                }
                            }
                        );
                    }
                }

                /*
                 * CNPJ.
                 *
                 * Pontuação propositalmente menor que CPF,
                 * evitando CNPJ de estabelecimento/mercador.
                 */

                if (
                    /\bCNPJ\b/.test(
                        normal
                    )
                ) {
                    coletarDocumentosDaLinha(
                        linha
                    ).forEach(
                        documento => {
                            if (
                                documento.length ===
                                14
                            ) {
                                candidatosDocumento.push({
                                    documento,
                                    pontuacao:
                                        100
                                });
                            }
                        }
                    );
                }
            }
        );

        candidatosNome.sort(
            (
                a,
                b
            ) =>
                b.pontuacao -
                a.pontuacao
        );

        candidatosDocumento.sort(
            (
                a,
                b
            ) =>
                b.pontuacao -
                a.pontuacao
        );

        const melhorNome =
            candidatosNome[0] ||
            null;

        let melhorDocumento =
            candidatosDocumento[0] ||
            null;

        /*
         * CPF sempre prevalece sobre CNPJ se os dois
         * foram encontrados junto a rótulos.
         */

        const cpf =
            candidatosDocumento.find(
                candidato =>
                    candidato.documento.length ===
                    11
            );

        if (
            cpf
        ) {
            melhorDocumento =
                cpf;
        }

        /*
         * Mercado Pago frequentemente contém CNPJ
         * institucional/estabelecimento.
         *
         * Sem nome do titular, CNPJ isolado é descartado.
         */

        if (
            banco ===
            "Mercado Pago" &&
            melhorDocumento &&
            melhorDocumento.documento.length ===
            14 &&
            !melhorNome
        ) {
            melhorDocumento =
                null;
        }

        /*
         * Para qualquer banco, CNPJ sem contexto de nome
         * recebe cautela.
         */

        if (
            melhorDocumento &&
            melhorDocumento.documento.length ===
            14 &&
            !melhorNome
        ) {
            melhorDocumento =
                null;
        }

        return {
            nome:
                melhorNome
                    ? melhorNome.nome
                    : "",

            documento:
                melhorDocumento
                    ? melhorDocumento.documento
                    : "",

            pontuacao:
                (
                    melhorNome
                        ? melhorNome.pontuacao
                        : 0
                ) +
                (
                    melhorDocumento
                        ? melhorDocumento.pontuacao
                        : 0
                )
        };
    }

    function coletarDocumentosDaLinha(
        linha
    ) {
        const texto =
            String(
                linha ||
                ""
            );

        const resultado =
            [];

        /*
         * CPF/CNPJ formatado ou apenas numérico.
         */

        const padroes = [
            /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g,
            /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g,
            /\b\d{11}\b/g,
            /\b\d{14}\b/g
        ];

        padroes.forEach(
            regex => {
                const matches =
                    texto.match(
                        regex
                    ) ||
                    [];

                matches.forEach(
                    candidato => {
                        const numero =
                            candidato.replace(
                                /\D/g,
                                ""
                            );

                        if (
                            numero.length ===
                            11 &&
                            validarCPF(
                                numero
                            )
                        ) {
                            resultado.push(
                                numero
                            );
                        }

                        if (
                            numero.length ===
                            14 &&
                            validarCNPJ(
                                numero
                            )
                        ) {
                            resultado.push(
                                numero
                            );
                        }
                    }
                );
            }
        );

        return Array.from(
            new Set(
                resultado
            )
        );
    }

    function validarCPF(
        cpf
    ) {
        const numero =
            String(
                cpf ||
                ""
            ).replace(
                /\D/g,
                ""
            );

        if (
            !/^\d{11}$/.test(
                numero
            ) ||
            /^(\d)\1{10}$/.test(
                numero
            )
        ) {
            return false;
        }

        let soma =
            0;

        for (
            let indice = 0;
            indice <
            9;
            indice++
        ) {
            soma +=
                Number(
                    numero[
                    indice
                    ]
                ) *
                (
                    10 -
                    indice
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
                numero[9]
            )
        ) {
            return false;
        }

        soma =
            0;

        for (
            let indice = 0;
            indice <
            10;
            indice++
        ) {
            soma +=
                Number(
                    numero[
                    indice
                    ]
                ) *
                (
                    11 -
                    indice
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

        return (
            digito ===
            Number(
                numero[10]
            )
        );
    }

    function validarCNPJ(
        cnpj
    ) {
        const numero =
            String(
                cnpj ||
                ""
            ).replace(
                /\D/g,
                ""
            );

        if (
            !/^\d{14}$/.test(
                numero
            ) ||
            /^(\d)\1{13}$/.test(
                numero
            )
        ) {
            return false;
        }

        const calcularDigito =
            base => {
                let peso =
                    base.length ===
                        12
                        ? 5
                        : 6;

                let soma =
                    0;

                for (
                    const caractere of base
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
            calcularDigito(
                numero.slice(
                    0,
                    12
                )
            );

        const d2 =
            calcularDigito(
                numero.slice(
                    0,
                    12
                ) +
                d1
            );

        return numero.endsWith(
            String(
                d1
            ) +
            String(
                d2
            )
        );
    }

    function formatarDocumento(
        documento
    ) {
        const numero =
            String(
                documento ||
                ""
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

    function limparNome(
        nome
    ) {
        return String(
            nome ||
            ""
        )
            .replace(
                /\s+/g,
                " "
            )
            .replace(
                /\b(AGENCIA|CONTA|CPF|CNPJ|DOCUMENTO)\b.*$/i,
                ""
            )
            .trim();
    }

    function pareceNomePessoa(
        nome
    ) {
        const valor =
            String(
                nome ||
                ""
            ).trim();

        if (
            valor.length <
            5 ||
            valor.length >
            100 ||
            /\d/.test(
                valor
            )
        ) {
            return false;
        }

        const proibidos = [
            "BANCO",
            "MERCADO PAGO",
            "NUBANK",
            "SANTANDER",
            "ITAU",
            "SICOOB",
            "SICREDI",
            "BRADESCO",
            "PAGBANK"
        ];

        const normal =
            normalizar(
                valor
            );

        if (
            proibidos.some(
                termo =>
                    normal.includes(
                        termo
                    )
            )
        ) {
            return false;
        }

        return valor
            .split(
                /\s+/
            )
            .filter(
                Boolean
            )
            .length >=
            2;
    }

    /*
     * =========================================================
     * DATAS
     * =========================================================
     */

    function extrairDataFlexivel(
        texto,
        anoPadrao
    ) {
        const valor =
            String(
                texto ||
                ""
            );

        /*
         * DD/MM/AAAA
         */

        let match =
            valor.match(
                /\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\b/
            );

        if (
            match
        ) {
            let ano =
                Number(
                    match[3]
                );

            if (
                ano <
                100
            ) {
                ano +=
                    ano >=
                        70
                        ? 1900
                        : 2000;
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

        /*
         * DD/MM sem ano.
         */

        match =
            valor.match(
                /\b(\d{1,2})[\/.-](\d{1,2})(?![\/.-]\d)\b/
            );

        if (
            match &&
            anoPadrao
        ) {
            return criarDataInfo(
                Number(
                    match[1]
                ),
                Number(
                    match[2]
                ),
                anoPadrao
            );
        }

        /*
         * 01 ABR 2026
         * 01 ABR
         */

        const normal =
            normalizar(
                valor
            );

        match =
            normal.match(
                /\b(\d{1,2})\s+(JAN|JANEIRO|FEV|FEVEREIRO|MAR|MARCO|ABR|ABRIL|MAI|MAIO|JUN|JUNHO|JUL|JULHO|AGO|AGOSTO|SET|SETEMBRO|OUT|OUTUBRO|NOV|NOVEMBRO|DEZ|DEZEMBRO)(?:\s+(\d{2,4}))?\b/
            );

        if (
            match
        ) {
            const mes =
                MESES_PT[
                match[2]
                ];

            let ano =
                match[3]
                    ? Number(
                        match[3]
                    )
                    : anoPadrao;

            if (
                !mes ||
                !ano
            ) {
                return null;
            }

            if (
                ano <
                100
            ) {
                ano +=
                    ano >=
                        70
                        ? 1900
                        : 2000;
            }

            return criarDataInfo(
                Number(
                    match[1]
                ),
                mes,
                ano
            );
        }

        return null;
    }

    function removerPrimeiraData(
        texto
    ) {
        return String(
            texto ||
            ""
        )
            .replace(
                /\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/,
                " "
            )
            .replace(
                /\b\d{1,2}[\/.-]\d{1,2}\b/,
                " "
            )
            .replace(
                /\b\d{1,2}\s+(?:JAN|JANEIRO|FEV|FEVEREIRO|MAR|MARCO|MARÇO|ABR|ABRIL|MAI|MAIO|JUN|JUNHO|JUL|JULHO|AGO|AGOSTO|SET|SETEMBRO|OUT|OUTUBRO|NOV|NOVEMBRO|DEZ|DEZEMBRO)(?:\s+\d{2,4})?\b/i,
                " "
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim();
    }

    function criarDataInfo(
        dia,
        mes,
        ano
    ) {
        const data =
            new Date(
                ano,
                mes -
                1,
                dia,
                12
            );

        if (
            data.getFullYear() !==
            ano ||
            data.getMonth() !==
            mes -
            1 ||
            data.getDate() !==
            dia
        ) {
            return null;
        }

        return {
            data,

            dataTexto:
                `${String(
                    dia
                ).padStart(
                    2,
                    "0"
                )}/${String(
                    mes
                ).padStart(
                    2,
                    "0"
                )}/${ano}`
        };
    }

    function parseDataBR(
        valor
    ) {
        const match =
            String(
                valor ||
                ""
            ).match(
                /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
            );

        if (
            !match
        ) {
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
        const candidatos =
            String(
                texto ||
                ""
            ).match(
                /\b20\d{2}\b/g
            ) ||
            [];

        if (
            !candidatos.length
        ) {
            return new Date()
                .getFullYear();
        }

        const contagem =
            new Map();

        candidatos.forEach(
            candidato => {
                const ano =
                    Number(
                        candidato
                    );

                contagem.set(
                    ano,
                    (
                        contagem.get(
                            ano
                        ) ||
                        0
                    ) +
                    1
                );
            }
        );

        return Array.from(
            contagem.entries()
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

    function identificarCompetenciasDocumento(
        texto
    ) {
        const resultado =
            new Set();

        const linhas =
            prepararLinhas(
                texto
            );

        const anoPadrao =
            identificarAnoPrincipal(
                texto
            );

        /*
         * Datas transacionais.
         */

        linhas.forEach(
            linha => {
                const data =
                    extrairDataFlexivel(
                        linha,
                        anoPadrao
                    );

                if (
                    data
                ) {
                    resultado.add(
                        obterCompetenciaData(
                            data.data
                        )
                    );
                }
            }
        );

        /*
         * Período explicitamente informado:
         *
         * 01/06/2026 a 30/06/2026
         */

        const textoNormal =
            String(
                texto ||
                ""
            );

        const regexDatas =
            /\b(\d{1,2})[\/.-](\d{1,2})[\/.-](20\d{2})\b/g;

        let match;

        while (
            (
                match =
                regexDatas.exec(
                    textoNormal
                )
            ) !==
            null
        ) {
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

            if (
                info
            ) {
                resultado.add(
                    obterCompetenciaData(
                        info.data
                    )
                );
            }
        }

        return Array.from(
            resultado
        ).sort();
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

    function recalcularPeriodoComBaseNasMovimentacoes(
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
                .filter(
                    Boolean
                );

        if (
            !datas.length
        ) {
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

    function normalizarCompetenciasResultado(
        resultado
    ) {
        const set =
            new Set();

        (
            resultado.competencias ||
            []
        ).forEach(
            competencia => {
                if (
                    /^\d{4}-\d{2}$/.test(
                        String(
                            competencia
                        )
                    )
                ) {
                    set.add(
                        competencia
                    );
                }
            }
        );

        /*
         * Garante que todo mês contendo movimentação
         * identificada esteja presente.
         */

        resultado.movimentacoes.forEach(
            movimento => {
                const data =
                    parseDataBR(
                        movimento.data
                    );

                if (
                    data
                ) {
                    set.add(
                        obterCompetenciaData(
                            data
                        )
                    );
                }
            }
        );

        return Array.from(
            set
        ).sort();
    }

    /*
     * =========================================================
     * VALORES
     * =========================================================
     */

    function extrairOcorrenciasMonetarias(
        texto
    ) {
        const origem =
            String(
                texto ||
                ""
            );

        const resultado =
            [];

        /*
         * Aceita:
         *
         * R$ 700,00
         * 700,00
         * 22500,00
         * 22.500,00
         * -700,00
         * 700,00-
         * +700,00
         */

        const regex =
            /(?:R\$\s*)?([+-]?\s*(?:\d{1,3}(?:\.\d{3})+|\d+),\d{2})(-)?/gi;

        let match;

        while (
            (
                match =
                regex.exec(
                    origem
                )
            ) !==
            null
        ) {
            let valor =
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

            const sinalNegativoFinal =
                match[2] ===
                "-";

            if (
                sinalNegativoFinal
            ) {
                valor =
                    -Math.abs(
                        valor
                    );
            }

            resultado.push({
                valor,

                bruto:
                    match[0],

                indice:
                    match.index,

                fim:
                    regex.lastIndex,

                sinalNegativoFinal
            });
        }

        return resultado;
    }

    function converterMoeda(
        valor
    ) {
        let texto =
            String(
                valor ||
                ""
            )
                .replace(
                    /\s/g,
                    ""
                )
                .replace(
                    /[^\d,.-]/g,
                    ""
                );

        if (
            !texto
        ) {
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

    /*
     * =========================================================
     * FORMATAÇÕES
     * =========================================================
     */

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
            return (
                `${formatarData(
                    inicio
                )} a ${formatarData(
                    fim
                )}`
            );
        }

        return formatarData(
            inicio ||
            fim
        );
    }

    function formatarData(
        data
    ) {
        if (
            !(data instanceof Date) ||
            Number.isNaN(
                data.getTime()
            )
        ) {
            return "Não identificado";
        }

        return data.toLocaleDateString(
            "pt-BR"
        );
    }

    function formatarCompetencia(
        competencia
    ) {
        const partes =
            String(
                competencia ||
                ""
            ).split(
                "-"
            );

        if (
            partes.length !==
            2
        ) {
            return competencia;
        }

        return (
            partes[1] +
            "/" +
            partes[0]
        );
    }

    /*
     * =========================================================
     * HISTÓRICO
     * =========================================================
     */

    function limparHistoricoGenerico(
        texto
    ) {
        return String(
            texto ||
            ""
        )
            .replace(
                /\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/g,
                " "
            )
            .replace(
                /\b\d{1,2}[\/.-]\d{1,2}\b/g,
                " "
            )
            .replace(
                /\b\d{1,2}\s+(?:JAN|JANEIRO|FEV|FEVEREIRO|MAR|MARCO|MARÇO|ABR|ABRIL|MAI|MAIO|JUN|JUNHO|JUL|JULHO|AGO|AGOSTO|SET|SETEMBRO|OUT|OUTUBRO|NOV|NOVEMBRO|DEZ|DEZEMBRO)(?:\s+\d{2,4})?\b/gi,
                " "
            )
            .replace(
                /(?:R\$\s*)?[+-]?(?:\d{1,3}(?:\.\d{3})+|\d+),\d{2}-?/gi,
                " "
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim();
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
            texto ||
            ""
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
            .filter(
                Boolean
            );
    }

    function contemAlgumTermo(
        normal,
        termos
    ) {
        return (
            termos ||
            []
        ).some(
            termo =>
                normal.includes(
                    termo
                )
        );
    }

    function converterHTMLParaTexto(
        html
    ) {
        const documento =
            new DOMParser()
                .parseFromString(
                    String(
                        html ||
                        ""
                    ),
                    "text/html"
                );

        const texto =
            documento.body
                ? documento.body.innerText
                : documento.documentElement
                    ? documento.documentElement.innerText
                    : "";

        return String(
            texto ||
            ""
        ).replace(
            /\u00a0/g,
            " "
        );
    }

    function obterExtensao(
        nome
    ) {
        const partes =
            String(
                nome ||
                ""
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
            return `${(
                numero /
                1024
            ).toFixed(
                1
            )} KB`;
        }

        return `${(
            numero /
            1048576
        ).toFixed(
            2
        )} MB`;
    }

    function traduzirStatusOCR(
        status
    ) {
        const mapa = {
            "loading tesseract core":
                "Carregando mecanismo",

            "initializing tesseract":
                "Inicializando",

            "loading language traineddata":
                "Carregando idioma",

            "initializing api":
                "Preparando reconhecimento",

            "recognizing text":
                "Reconhecendo texto"
        };

        return (
            mapa[
            String(
                status ||
                ""
            ).toLowerCase()
            ] ||
            status
        );
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
            .replace(
                /\u00a0/g,
                " "
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim()
            .toUpperCase();
    }

    /*
     * =========================================================
     * DOM
     * =========================================================
     */

    function setTexto(
        id,
        valor
    ) {
        const elemento =
            document.getElementById(
                id
            );

        if (
            elemento
        ) {
            elemento.textContent =
                valor;
        }
    }

    function setTextoMultiplos(
        ids,
        valor
    ) {
        (
            ids ||
            []
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
            const id of
            ids ||
            []
        ) {
            const elemento =
                document.getElementById(
                    id
                );

            if (
                elemento
            ) {
                return elemento;
            }
        }

        return null;
    }

    function limparTabelaPorIds(
        ids,
        colspan,
        mensagem
    ) {
        const tabela =
            obterPrimeiroElemento(
                ids
            );

        if (
            !tabela
        ) {
            return;
        }

        const tbody =
            tabela.querySelector(
                "tbody"
            );

        if (
            tbody
        ) {
            tbody.innerHTML =
                `<tr><td colspan="${colspan}" class="sem-dados">${escaparHTML(
                    mensagem
                )}</td></tr>`;
        }
    }

    function limparTabelaMovimentacoesOCR() {
        const tabela =
            document.getElementById(
                "tabelaMovimentacoesOCR"
            );

        if (
            !tabela
        ) {
            return;
        }

        const tbody =
            tabela.querySelector(
                "tbody"
            );

        if (
            tbody
        ) {
            tbody.innerHTML =
                '<tr><td colspan="8" class="sem-dados">Nenhuma leitura realizada.</td></tr>';
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

        limparTabelaPorIds(
            [
                "tabelaResumoMensalOCR",
                "tabelaCreditosMesOCR",
                "tabelaCreditosPorMes"
            ],
            4,
            "Nenhuma leitura realizada."
        );

        limparTabelaPorIds(
            [
                "tabelaResumoBancosOCR",
                "tabelaResumoInstituicaoOCR",
                "tabelaResumoInstituicao"
            ],
            4,
            "Nenhuma leitura realizada."
        );
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

        if (
            !elemento
        ) {
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

        if (
            !card
        ) {
            return;
        }

        card.hidden =
            false;

        setTimeout(
            () => {
                card.scrollIntoView({
                    behavior:
                        "smooth",

                    block:
                        "start"
                });
            },
            50
        );
    }

    function ocultarResultadoOCR() {
        const card =
            document.getElementById(
                "cardResultadoLeituraExtratos"
            );

        if (
            card
        ) {
            card.hidden =
                true;
        }
    }

    /*
     * =========================================================
     * API PÚBLICA
     * =========================================================
     */

    window.leituraExtratosMovimentacao = {
        versao:
            "2026.09.28",

        obterArquivos:
            () =>
                arquivosExtratoSelecionados.slice(),

        obterResultado:
            () =>
                resultadoLeituraOCR,

        limpar:
            limparArquivosExtrato,

        aplicar:
            aplicarLeituraAoCalculo,

        recalcular:
            () => {
                if (
                    !resultadoLeituraOCR
                ) {
                    return false;
                }

                resultadoLeituraOCR.textoConsolidado =
                    gerarTextoConsolidado(
                        resultadoLeituraOCR.movimentacoes
                    );

                atualizarCalculosOCR(
                    resultadoLeituraOCR
                );

                atualizarResumoLeitura(
                    resultadoLeituraOCR
                );

                return true;
            }
    };

    console.info(
        "[Média de Movimentação] API OCR disponível em window.leituraExtratosMovimentacao",
        window.leituraExtratosMovimentacao
    );

})();