(function () {
    "use strict";

    let arquivosExtratoSelecionados = [];
    let resultadoLeituraOCR = null;

    const TIPOS_DOCUMENTO = {
        EXTRATO_CONTA: "EXTRATO_CONTA",
        FATURA_CARTAO: "FATURA_CARTAO",
        INVESTIMENTO: "INVESTIMENTO",
        DESCONHECIDO: "DESCONHECIDO"
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

    document.addEventListener("DOMContentLoaded", iniciarLeituraExtratos);

    function iniciarLeituraExtratos() {
        const input = document.getElementById("arquivosExtrato");
        const area = document.getElementById("areaUploadExtrato");
        const btnLer = document.getElementById("btnLerExtratos");
        const btnLimpar = document.getElementById("btnLimparArquivosExtrato");
        const btnAplicar = document.getElementById("btnAplicarLeituraOCR");
        const btnCopiar = document.getElementById("btnCopiarResumoOCR");
        const btnTodos = document.getElementById("btnSelecionarTodosOCR");
        const btnNenhum = document.getElementById("btnDesmarcarTodosOCR");

        if (input) {
            input.addEventListener("change", e => {
                adicionarArquivos(e.target.files);
            });
        }

        if (area) {
            area.addEventListener("dragover", e => {
                e.preventDefault();
                area.classList.add("arrastando");
            });

            area.addEventListener("dragleave", () => {
                area.classList.remove("arrastando");
            });

            area.addEventListener("drop", e => {
                e.preventDefault();
                area.classList.remove("arrastando");

                if (e.dataTransfer && e.dataTransfer.files) {
                    adicionarArquivos(e.dataTransfer.files);
                }
            });
        }

        if (btnLer) {
            btnLer.addEventListener("click", processarArquivosExtrato);
        }

        if (btnLimpar) {
            btnLimpar.addEventListener("click", limparArquivosExtrato);
        }

        if (btnAplicar) {
            btnAplicar.addEventListener("click", aplicarLeituraAoCalculo);
        }

        if (btnCopiar) {
            btnCopiar.addEventListener("click", copiarResumoLeitura);
        }

        if (btnTodos) {
            btnTodos.addEventListener("click", () => alterarSelecaoMovimentacoes(true));
        }

        if (btnNenhum) {
            btnNenhum.addEventListener("click", () => alterarSelecaoMovimentacoes(false));
        }

        renderizarArquivosSelecionados();
        limparResumoOCR();
    }

    function adicionarArquivos(fileList) {
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

        Array.from(fileList || []).forEach(file => {
            const ext = obterExtensao(file.name);

            if (!permitidos.includes(ext)) {
                return;
            }

            const duplicado = arquivosExtratoSelecionados.some(a =>
                a.name === file.name &&
                a.size === file.size &&
                a.lastModified === file.lastModified
            );

            if (!duplicado) {
                arquivosExtratoSelecionados.push(file);
            }
        });

        const input = document.getElementById("arquivosExtrato");

        if (input) {
            input.value = "";
        }

        renderizarArquivosSelecionados();
    }

    function renderizarArquivosSelecionados() {
        const lista = document.getElementById("listaArquivosExtrato");
        const quantidade = document.getElementById("quantidadeArquivosExtrato");
        const btnLer = document.getElementById("btnLerExtratos");
        const btnLimpar = document.getElementById("btnLimparArquivosExtrato");

        if (quantidade) {
            quantidade.textContent = arquivosExtratoSelecionados.length;
        }

        if (btnLer) {
            btnLer.disabled = arquivosExtratoSelecionados.length === 0;
        }

        if (btnLimpar) {
            btnLimpar.disabled = arquivosExtratoSelecionados.length === 0;
        }

        if (!lista) {
            return;
        }

        if (!arquivosExtratoSelecionados.length) {
            lista.innerHTML = '<div class="sem-dados">Nenhum arquivo selecionado.</div>';
            return;
        }

        lista.innerHTML = arquivosExtratoSelecionados.map((arquivo, indice) => `
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
        `).join("");

        lista.querySelectorAll(".btn-remover-arquivo").forEach(btn => {
            btn.addEventListener("click", () => {
                const indice = Number(btn.dataset.indice);

                arquivosExtratoSelecionados.splice(indice, 1);
                renderizarArquivosSelecionados();
            });
        });
    }

    function limparArquivosExtrato() {
        arquivosExtratoSelecionados = [];
        resultadoLeituraOCR = null;

        const input = document.getElementById("arquivosExtrato");

        if (input) {
            input.value = "";
        }

        renderizarArquivosSelecionados();
        ocultarResultadoOCR();
        limparTabelaMovimentacoesOCR();
        limparResumoOCR();

        definirStatus("Pronto para ler os extratos.", "info");
    }

    function limparResumoOCR() {
        setTextoMultiplos(
            ["ocrMediaMensal", "mediaMensalPreliminarOCR"],
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
            ["ocrMesesConsiderados", "mesesConsideradosOCR"],
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

    async function processarArquivosExtrato() {
        if (!arquivosExtratoSelecionados.length) {
            return;
        }

        const btn = document.getElementById("btnLerExtratos");

        if (btn) {
            btn.disabled = true;
            btn.textContent = "Processando...";
        }

        definirStatus(
            "Preparando leitura dos arquivos...",
            "processando"
        );

        const resultado = {
            documentos: [],
            movimentacoes: [],
            alertas: [],
            competencias: new Set(),
            instituicoes: new Set(),
            textoConsolidado: "",
            titular: "",
            documentoTitular: "",
            identidadePontuacao: -1,
            primeiraData: null,
            ultimaData: null
        };

        try {
            for (
                let indice = 0;
                indice < arquivosExtratoSelecionados.length;
                indice++
            ) {
                const arquivo = arquivosExtratoSelecionados[indice];

                definirStatus(
                    `Processando ${indice + 1} de ${arquivosExtratoSelecionados.length}: ${arquivo.name}`,
                    "processando"
                );

                try {
                    const documento = await lerArquivoExtrato(
                        arquivo,
                        indice
                    );

                    documento.banco = identificarInstituicao(
                        documento.texto
                    );

                    documento.tipoDocumento = identificarTipoDocumento(
                        documento.texto,
                        documento.banco
                    );

                    documento.excluidoDaApuracao =
                        documento.tipoDocumento !== TIPOS_DOCUMENTO.EXTRATO_CONTA;

                    documento.motivoExclusao =
                        obterMotivoExclusaoDocumento(documento);

                    resultado.documentos.push(documento);

                    if (documento.banco) {
                        resultado.instituicoes.add(documento.banco);
                    }

                    if (!documento.texto) {
                        continue;
                    }

                    const identidade = identificarDadosTitular(
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
                            identidade.nome || "";

                        resultado.documentoTitular =
                            identidade.documento || "";
                    }

                    if (documento.excluidoDaApuracao) {
                        resultado.alertas.push(
                            `${documento.nome}: ${documento.motivoExclusao}`
                        );

                        continue;
                    }

                    const competenciasDocumento =
                        identificarCompetenciasDocumento(
                            documento.texto
                        );

                    competenciasDocumento.forEach(comp => {
                        resultado.competencias.add(comp);
                    });

                    const movimentacoes =
                        extrairMovimentacoesDocumento(
                            documento
                        );

                    movimentacoes.forEach(movimento => {
                        resultado.movimentacoes.push(movimento);

                        const data = parseDataBR(
                            movimento.data
                        );

                        if (!data) {
                            return;
                        }

                        const competencia =
                            obterCompetenciaData(data);

                        resultado.competencias.add(
                            competencia
                        );
                    });
                } catch (erro) {
                    console.error(
                        "Erro ao processar arquivo:",
                        arquivo.name,
                        erro
                    );

                    resultado.alertas.push(
                        `${arquivo.name}: ${erro.message || erro}`
                    );

                    resultado.documentos.push({
                        id: `ERRO${indice + 1}`,
                        nome: arquivo.name,
                        tamanho: arquivo.size,
                        tipo: arquivo.type,
                        metodo: "Erro",
                        texto: "",
                        banco: "",
                        tipoDocumento: TIPOS_DOCUMENTO.DESCONHECIDO,
                        excluidoDaApuracao: true,
                        motivoExclusao:
                            "Não foi possível interpretar este documento.",
                        erro: String(erro.message || erro)
                    });
                }
            }

            removerMovimentacoesDuplicadas(resultado);

            resultado.competencias =
                Array.from(resultado.competencias)
                    .filter(Boolean)
                    .sort();

            resultado.instituicoes =
                Array.from(resultado.instituicoes)
                    .filter(Boolean);

            recalcularPeriodoComBaseNasMovimentacoes(
                resultado
            );

            marcarPossiveisTransferenciasProprias(
                resultado
            );

            resultado.textoConsolidado =
                gerarTextoConsolidado(
                    resultado.movimentacoes
                );

            resultadoLeituraOCR = resultado;

            renderizarResultadoOCR(resultado);
            enviarMovimentacoesParaCalculadora(resultado);
            mostrarResultadoOCR();

            definirStatus(
                `Leitura concluída. ${resultado.documentos.length} arquivo(s) processado(s).`,
                "sucesso"
            );
        } catch (erro) {
            console.error(erro);

            definirStatus(
                `Erro durante a leitura: ${erro.message || erro}`,
                "erro"
            );
        } finally {
            if (btn) {
                btn.disabled =
                    arquivosExtratoSelecionados.length === 0;

                btn.textContent =
                    "Ler e Consolidar";
            }
        }
    }

    async function lerArquivoExtrato(
        arquivo,
        indice
    ) {
        const ext = obterExtensao(
            arquivo.name
        );

        const base = {
            id: `ARQ${indice + 1}`,
            nome: arquivo.name,
            tamanho: arquivo.size,
            tipo: arquivo.type,
            metodo: "",
            texto: "",
            banco: "",
            tipoDocumento: TIPOS_DOCUMENTO.DESCONHECIDO,
            excluidoDaApuracao: false,
            motivoExclusao: ""
        };

        if (
            ["txt", "csv", "html", "htm"].includes(ext)
        ) {
            base.metodo =
                "Leitura direta";

            base.texto =
                await arquivo.text();

            if (
                ["html", "htm"].includes(ext)
            ) {
                base.texto =
                    converterHTMLParaTexto(
                        base.texto
                    );
            }

            return base;
        }

        if (
            ["png", "jpg", "jpeg", "webp"].includes(ext)
        ) {
            base.metodo =
                "OCR";

            base.texto =
                await executarOCRImagem(
                    arquivo
                );

            return base;
        }

        if (ext === "pdf") {
            base.metodo =
                "PDF";

            base.texto =
                await lerPDF(
                    arquivo
                );

            if (
                !base.texto ||
                base.texto
                    .replace(/\s/g, "")
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

    async function lerPDF(arquivo) {
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
                    data: buffer
                })
                .promise;

        const paginas = [];

        for (
            let numero = 1;
            numero <= pdf.numPages;
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
                    normalizeWhitespace: true,
                    disableCombineTextItems: false
                });

            const linhas =
                agruparItensPDFPorLinha(
                    conteudo.items
                );

            paginas.push(
                linhas.join("\n")
            );
        }

        return paginas.join("\n");
    }

    function agruparItensPDFPorLinha(items) {
        const grupos = [];

        (items || []).forEach(item => {
            const texto =
                String(item.str || "")
                    .trim();

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
                    g =>
                        Math.abs(
                            g.y - y
                        ) <=
                        2.5
                );

            if (!grupo) {
                grupo = {
                    y,
                    itens: []
                };

                grupos.push(grupo);
            }

            grupo.itens.push({
                x,
                texto
            });
        });

        grupos.sort(
            (a, b) =>
                b.y - a.y
        );

        return grupos
            .map(grupo => {
                grupo.itens.sort(
                    (a, b) =>
                        a.x - b.x
                );

                return grupo.itens
                    .map(i => i.texto)
                    .join(" ")
                    .replace(/\s+/g, " ")
                    .trim();
            })
            .filter(Boolean);
    }

    async function lerPDFComOCR(arquivo) {
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
                    data: buffer
                })
                .promise;

        const partes = [];

        for (
            let numero = 1;
            numero <= pdf.numPages;
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
                    scale: 2
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
                        willReadFrequently: true
                    }
                );

            await pagina.render({
                canvasContext: contexto,
                viewport
            }).promise;

            const blob =
                await new Promise(
                    (resolve, reject) => {
                        canvas.toBlob(
                            b =>
                                b
                                    ? resolve(b)
                                    : reject(
                                        new Error(
                                            "Falha ao converter página do PDF."
                                        )
                                    ),
                            "image/png"
                        );
                    }
                );

            const texto =
                await executarOCRImagem(
                    blob
                );

            partes.push(texto);

            canvas.width = 1;
            canvas.height = 1;
        }

        return partes.join("\n");
    }

    async function executarOCRImagem(arquivo) {
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
                    logger: mensagem => {
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
                            `OCR: ${traduzirStatusOCR(mensagem.status)}${percentual}`,
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

    function identificarTipoDocumento(
        texto,
        banco
    ) {
        const normal =
            normalizar(texto);

        const sinaisFaturaFortes = [
            "RESUMO DA FATURA",
            "TOTAL DA SUA FATURA",
            "TOTAL DESTA FATURA",
            "TOTAL DA FATURA",
            "VALOR DA FATURA",
            "PAGAMENTO MINIMO",
            "LIMITE DE CREDITO TOTAL",
            "LIMITE TOTAL DE CREDITO",
            "FATURA ATUAL",
            "FECHAMENTO DA FATURA",
            "MELHOR DATA DE COMPRA"
        ];

        const sinaisFaturaAuxiliares = [
            "COMPRAS NACIONAIS",
            "COMPRAS INTERNACIONAIS",
            "PARCELAMENTO DA FATURA",
            "ENCARGOS DA FATURA",
            "LIMITE DISPONIVEL PARA COMPRAS",
            "VENCIMENTO DA FATURA"
        ];

        const fortes =
            sinaisFaturaFortes.filter(
                termo =>
                    normal.includes(
                        termo
                    )
            ).length;

        const auxiliares =
            sinaisFaturaAuxiliares.filter(
                termo =>
                    normal.includes(
                        termo
                    )
            ).length;

        if (
            fortes >= 2 ||
            (
                fortes >= 1 &&
                auxiliares >= 1
            )
        ) {
            return TIPOS_DOCUMENTO.FATURA_CARTAO;
        }

        if (
            banco === "Mercado Pago" &&
            (
                normal.includes(
                    "DETALHE DOS MOVIMENTOS"
                ) ||
                normal.includes(
                    "PIX RECEBIDO"
                ) ||
                normal.includes(
                    "PIX ENVIADO"
                ) ||
                normal.includes(
                    "DINHEIRO RETIRADO"
                ) ||
                normal.includes(
                    "DINHEIRO RESERVADO"
                )
            )
        ) {
            return TIPOS_DOCUMENTO.EXTRATO_CONTA;
        }

        if (
            banco === "Santander" &&
            (
                normal.includes(
                    "CONTA CORRENTE"
                ) ||
                normal.includes(
                    "MOVIMENTACAO"
                )
            )
        ) {
            return TIPOS_DOCUMENTO.EXTRATO_CONTA;
        }

        if (
            banco === "Nubank" &&
            (
                normal.includes(
                    "CONTA DO NUBANK"
                ) ||
                normal.includes(
                    "PIX RECEBIDO"
                ) ||
                normal.includes(
                    "TRANSFERENCIA RECEBIDA"
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
            "SALDO EM CONTA"
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

        if (
            /\b(RDB|CDB|RDC|CARTEIRA DE INVESTIMENTOS|FUNDO DE INVESTIMENTO)\b/.test(
                normal
            ) &&
            !/\bPIX\b/.test(
                normal
            )
        ) {
            return TIPOS_DOCUMENTO.INVESTIMENTO;
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
            return "Documento identificado como demonstrativo de investimento e excluído da apuração de movimentação.";
        }

        if (
            documento.tipoDocumento ===
            TIPOS_DOCUMENTO.DESCONHECIDO
        ) {
            return "Tipo de documento não identificado com segurança. Documento excluído da apuração automática.";
        }

        return "";
    }

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
            banco === "Mercado Pago"
        ) {
            return extrairMercadoPago(
                documento
            );
        }

        if (
            banco === "Nubank"
        ) {
            return extrairNubank(
                documento
            );
        }

        if (
            banco === "Santander"
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
     * O Mercado Pago não pode ser interpretado simplesmente
     * agrupando tudo entre uma data e a próxima data.
     *
     * Em um mesmo dia existem várias operações.
     *
     * A unidade real da operação será:
     *
     * DATA
     * DESCRIÇÃO
     * ID DA OPERAÇÃO
     * VALOR
     * SALDO
     *
     * O ID da operação é utilizado como divisor principal.
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

        const movimentacoes = [];

        operacoes.forEach(
            operacao => {
                const normal =
                    normalizar(
                        operacao.descricao
                    );

                if (
                    !operacao.data ||
                    !operacao.id ||
                    !Number.isFinite(
                        operacao.valor
                    ) ||
                    operacao.valor <= 0 ||
                    !normal
                ) {
                    return;
                }

                const classificacao =
                    classificarOperacaoMercadoPago(
                        normal,
                        operacao
                    );

                if (
                    !classificacao
                ) {
                    return;
                }

                movimentacoes.push(
                    criarMovimentacao({
                        data:
                            operacao.data,
                        banco:
                            "Mercado Pago",
                        arquivo:
                            documento.nome,
                        historico:
                            limparDescricaoMercadoPago(
                                operacao.descricao
                            ),
                        valor:
                            operacao.valor,
                        natureza:
                            classificacao.natureza,
                        classificacao:
                            classificacao.classificacao,
                        motivo:
                            classificacao.motivo,
                        considerar:
                            classificacao.considerar,
                        confianca:
                            classificacao.confianca,
                        operacaoId:
                            operacao.id
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
        const resultado = [];

        let dataAtual = "";
        let descricaoPendente = [];
        let operacaoAtual = null;

        function finalizarAtual() {
            if (
                !operacaoAtual
            ) {
                return;
            }

            const descricao =
                [
                    ...descricaoPendente,
                    ...operacaoAtual.descricao
                ]
                    .join(" ")
                    .replace(/\s+/g, " ")
                    .trim();

            if (
                operacaoAtual.id &&
                operacaoAtual.data &&
                Number.isFinite(
                    operacaoAtual.valor
                )
            ) {
                resultado.push({
                    data:
                        operacaoAtual.data,
                    id:
                        operacaoAtual.id,
                    descricao,
                    valor:
                        Math.abs(
                            operacaoAtual.valor
                        ),
                    saldo:
                        Number.isFinite(
                            operacaoAtual.saldo
                        )
                            ? operacaoAtual.saldo
                            : null
                });
            }

            descricaoPendente = [];
            operacaoAtual = null;
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

                if (
                    !linha
                ) {
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

                    const valoresDepoisId =
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
                        valoresDepoisId.length
                    ) {
                        operacaoAtual.valor =
                            Math.abs(
                                valoresDepoisId[0].valor
                            );

                        if (
                            valoresDepoisId.length >=
                            2
                        ) {
                            operacaoAtual.saldo =
                                valoresDepoisId[1].valor;
                        }

                        finalizarAtual();
                    }

                    return;
                }

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
                        const textoAntesValor =
                            linha
                                .substring(
                                    0,
                                    valores[0].indice
                                )
                                .trim();

                        if (
                            textoAntesValor
                        ) {
                            operacaoAtual.descricao.push(
                                textoAntesValor
                            );
                        }

                        operacaoAtual.valor =
                            Math.abs(
                                valores[0].valor
                            );

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

                if (
                    ehDescricaoPossivelMercadoPago(
                        normal
                    )
                ) {
                    descricaoPendente.push(
                        linha
                    );

                    if (
                        descricaoPendente.length >
                        4
                    ) {
                        descricaoPendente.shift();
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

        const matches =
            Array.from(
                texto.matchAll(
                    /\b\d{9,18}\b/g
                )
            );

        if (
            !matches.length
        ) {
            return null;
        }

        /*
         * IDs da operação normalmente aparecem antes
         * da coluna Valor.
         *
         * Telefones/CPF podem aparecer em descrições.
         * Preferimos o último número longo da linha
         * antes dos valores monetários.
         */

        const ocorrenciasValor =
            extrairOcorrenciasMonetarias(
                texto
            );

        let limite =
            ocorrenciasValor.length
                ? ocorrenciasValor[0].indice
                : texto.length;

        const candidatos =
            matches.filter(
                m =>
                    (m.index || 0) <
                    limite
            );

        const escolhido =
            candidatos.length
                ? candidatos[
                candidatos.length -
                1
                ]
                : matches[
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
                (escolhido.index || 0) +
                escolhido[0].length
        };
    }

    function ehCabecalhoMercadoPago(
        normal
    ) {
        if (
            !normal
        ) {
            return true;
        }

        const termos = [
            "DETALHE DOS MOVIMENTOS",
            "DATA DESCRICAO ID DA OPERACAO VALOR SALDO",
            "DATA DESCRICAO ID DA OPERACAO",
            "SALDO ANTERIOR",
            "SALDO FINAL",
            "TOTAL DE ENTRADAS",
            "TOTAL DE SAIDAS",
            "ENTRADAS",
            "SAIDAS",
            "RESUMO",
            "PERIODO",
            "CPF CNPJ",
            "INFORMACOES DA CONTA"
        ];

        return termos.some(
            termo =>
                normal === termo ||
                normal.startsWith(
                    termo + " "
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

        if (
            /^R\$\s*/i.test(
                normal
            )
        ) {
            return false;
        }

        return true;
    }

    function classificarOperacaoMercadoPago(
        normal,
        operacao
    ) {
        /*
         * PRIORIDADE DAS REGRAS:
         *
         * 1 - Débito
         * 2 - Crédito financeiro / exclusão
         * 3 - Transferência própria
         * 4 - Crédito válido
         * 5 - Dúvida
         */

        const debitos = [
            "PIX ENVIADO",
            "PAGAMENTO",
            "PAGAMENTO COM QR",
            "PAGAMENTO DE CONTA",
            "DEBITO POR DIVIDA",
            "DINHEIRO RETIRADO",
            "DINHEIRO RESERVADO",
            "RESERVA POR GASTOS",
            "TRANSFERENCIA ENVIADA",
            "TED ENVIADA",
            "COMPRA",
            "SAQUE"
        ];

        if (
            debitos.some(
                termo =>
                    normal.includes(
                        termo
                    )
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
                    "Liberação de dinheiro não é considerada renda automaticamente. Pode representar crédito, empréstimo ou antecipação.",
                confianca:
                    "alta"
            };
        }

        const motivoExclusao =
            localizarMotivoExclusaoCredito(
                normal
            );

        if (
            motivoExclusao
        ) {
            return {
                natureza:
                    "Crédito",
                classificacao:
                    "Crédito excluído",
                considerar:
                    false,
                motivo:
                    motivoExclusao,
                confianca:
                    "alta"
            };
        }

        const creditosSeguros = [
            "PIX RECEBIDO",
            "PIX RECEBIDA",
            "TRANSFERENCIA RECEBIDA",
            "TRANSFERENCIA RECEBIDO",
            "TED RECEBIDA",
            "TED RECEBIDO",
            "DEPOSITO RECEBIDO",
            "DINHEIRO RECEBIDO",
            "PAGAMENTO RECEBIDO",
            "RECEBIMENTO DE VENDA",
            "VENDA APROVADA",
            "CREDITO RECEBIDO",
            "ENTRADA DE DINHEIRO"
        ];

        if (
            creditosSeguros.some(
                termo =>
                    normal.includes(
                        termo
                    )
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

        return {
            natureza:
                "-",
            classificacao:
                "Conferir",
            considerar:
                false,
            motivo:
                "Movimentação identificada, mas a origem não foi confirmada com segurança.",
            confianca:
                "baixa"
        };
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

        const movimentacoes = [];
        let dataAtual = "";

        for (
            let indice = 0;
            indice < linhas.length;
            indice++
        ) {
            const linha =
                linhas[indice];

            const data =
                extrairDataFlexivel(
                    linha,
                    anoPadrao
                );

            if (
                data
            ) {
                dataAtual =
                    data.dataTexto;
            }

            if (
                !dataAtual
            ) {
                continue;
            }

            let bloco =
                linha;

            /*
             * Alguns extratos Nubank quebram:
             *
             * Data / tipo
             * Nome
             * Valor
             */

            for (
                let j = 1;
                j <= 2 &&
                indice + j <
                linhas.length;
                j++
            ) {
                const proxima =
                    linhas[
                    indice + j
                    ];

                if (
                    extrairDataFlexivel(
                        proxima,
                        anoPadrao
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

            const normal =
                normalizar(
                    bloco
                );

            if (
                deveIgnorarBlocoNubank(
                    normal
                )
            ) {
                continue;
            }

            const valores =
                extrairOcorrenciasMonetarias(
                    bloco
                );

            if (
                !valores.length
            ) {
                continue;
            }

            const valor =
                Math.abs(
                    valores[
                        valores.length -
                        1
                    ].valor
                );

            const classificacao =
                classificarOperacaoGenerica(
                    normal
                );

            if (
                !classificacao
            ) {
                continue;
            }

            movimentacoes.push(
                criarMovimentacao({
                    data:
                        dataAtual,
                    banco:
                        "Nubank",
                    arquivo:
                        documento.nome,
                    historico:
                        limparHistoricoGenerico(
                            bloco
                        ),
                    valor,
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
            "LIMITE DE CREDITO",
            "PAGAMENTO MINIMO"
        ];

        return termos.some(
            termo =>
                normal === termo ||
                normal.startsWith(
                    termo + " "
                )
        );
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

        const movimentacoes = [];
        let dataAtual = "";

        for (
            let indice = 0;
            indice < linhas.length;
            indice++
        ) {
            const linha =
                linhas[indice];

            const data =
                extrairDataFlexivel(
                    linha,
                    anoPadrao
                );

            if (
                data
            ) {
                dataAtual =
                    data.dataTexto;
            }

            if (
                !dataAtual
            ) {
                continue;
            }

            let bloco =
                linha;

            for (
                let j = 1;
                j <= 3 &&
                indice + j <
                linhas.length;
                j++
            ) {
                const proxima =
                    linhas[
                    indice + j
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

            const normal =
                normalizar(
                    bloco
                );

            if (
                deveIgnorarBlocoSantander(
                    normal
                )
            ) {
                continue;
            }

            const valores =
                extrairOcorrenciasMonetarias(
                    bloco
                );

            if (
                !valores.length
            ) {
                continue;
            }

            const classificacao =
                classificarOperacaoGenerica(
                    normal
                );

            if (
                !classificacao
            ) {
                continue;
            }

            const valor =
                Math.abs(
                    valores[0].valor
                );

            movimentacoes.push(
                criarMovimentacao({
                    data:
                        dataAtual,
                    banco:
                        "Santander",
                    arquivo:
                        documento.nome,
                    historico:
                        limparHistoricoGenerico(
                            bloco
                        ),
                    valor,
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

        const movimentacoes = [];
        let dataAtual = "";

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
                    dataAtual =
                        data.dataTexto;
                }

                if (
                    !dataAtual
                ) {
                    return;
                }

                const normal =
                    normalizar(
                        linha
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
                        linha
                    );

                if (
                    !valores.length
                ) {
                    return;
                }

                const classificacao =
                    classificarOperacaoGenerica(
                        normal
                    );

                if (
                    !classificacao
                ) {
                    return;
                }

                movimentacoes.push(
                    criarMovimentacao({
                        data:
                            dataAtual,
                        banco:
                            documento.banco ||
                            "Não identificado",
                        arquivo:
                            documento.nome,
                        historico:
                            limparHistoricoGenerico(
                                linha
                            ),
                        valor:
                            Math.abs(
                                valores[0].valor
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
        if (
            !normal
        ) {
            return true;
        }

        const termos = [
            "SALDO",
            "SALDO ANTERIOR",
            "SALDO FINAL",
            "TOTAL",
            "TOTAL DE CREDITOS",
            "TOTAL DE DEBITOS",
            "LIMITE",
            "LIMITE TOTAL",
            "TOTAL DA FATURA",
            "VALOR DA FATURA",
            "VENCIMENTO",
            "JUROS",
            "ENCARGOS",
            "TAXA",
            "PAGAMENTO MINIMO",
            "RESUMO DA FATURA"
        ];

        return termos.some(
            termo =>
                normal === termo ||
                normal.startsWith(
                    termo + " "
                )
        );
    }

    function classificarOperacaoGenerica(
        normal
    ) {
        const debitos = [
            "PIX ENVIADO",
            "TRANSFERENCIA ENVIADA",
            "TED ENVIADA",
            "PAGAMENTO",
            "COMPRA",
            "SAQUE",
            "DEBITO"
        ];

        if (
            debitos.some(
                termo =>
                    normal.includes(
                        termo
                    )
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
                    "Liberação de dinheiro não é incluída automaticamente.",
                confianca:
                    "alta"
            };
        }

        const exclusao =
            localizarMotivoExclusaoCredito(
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

        const creditos = [
            "PIX RECEBIDO",
            "PIX RECEBIDA",
            "TRANSFERENCIA RECEBIDA",
            "TRANSFERENCIA RECEBIDO",
            "TED RECEBIDA",
            "TED RECEBIDO",
            "DOC RECEBIDO",
            "DOC RECEBIDA",
            "DEPOSITO",
            "RECEBIMENTO",
            "SALARIO",
            "PROVENTO",
            "DINHEIRO RECEBIDO",
            "PAGAMENTO RECEBIDO"
        ];

        if (
            creditos.some(
                termo =>
                    normal.includes(
                        termo
                    )
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

        return null;
    }

    function localizarMotivoExclusaoCredito(
        normal
    ) {
        if (
            /\b(RDB|RDC|CDB)\b/.test(
                normal
            )
        ) {
            return "Investimento financeiro não representa nova renda.";
        }

        if (
            /\b(RESGATE|APLICACAO|INVESTIMENTO|FUNDO DE INVESTIMENTO|REMUNERACAO APLICACAO AUTOMATICA)\b/.test(
                normal
            )
        ) {
            return "Resgate ou movimentação de investimento não representa novo recurso.";
        }

        if (
            /\b(EMPRESTIMO|FINANCIAMENTO|CREDITO PESSOAL|CREDITO CONSIGNADO|CAPITAL DE GIRO|LIBERACAO DE CREDITO)\b/.test(
                normal
            )
        ) {
            return "Empréstimo ou financiamento não representa renda.";
        }

        if (
            /\b(CHEQUE ESPECIAL|LIMITE DE CREDITO|CREDITO ROTATIVO|ADIANTAMENTO A DEPOSITANTE)\b/.test(
                normal
            )
        ) {
            return "Utilização ou liberação de limite não representa renda.";
        }

        if (
            /\b(ESTORNO|REVERSAO|CANCELAMENTO|DEVOLUCAO|DEVOLVIDO|REEMBOLSO)\b/.test(
                normal
            )
        ) {
            return "Estorno, devolução ou reembolso não representa nova renda.";
        }

        return "";
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
            id: "",
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
                dados.historico ||
                "",
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
                ""
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
                movimento.arquivo,
                movimento.banco,
                movimento.operacaoId
            ].join("|");
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
            ).toFixed(2),
            movimento.natureza ||
            ""
        ].join("|");
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
            ).sort(
                (a, b) => {
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
                        dataA -
                        dataB !==
                        0
                    ) {
                        return dataA -
                            dataB;
                    }

                    return a.banco.localeCompare(
                        b.banco,
                        "pt-BR"
                    );
                }
            );
    }

    function marcarPossiveisTransferenciasProprias(
        resultado
    ) {
        const nome =
            normalizar(
                resultado.titular ||
                ""
            );

        if (
            !nome ||
            nome.length <
            8
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

                if (
                    historico.includes(
                        nome
                    )
                ) {
                    movimento.considerar =
                        false;

                    movimento.classificacao =
                        "Possível transferência própria";

                    movimento.motivo =
                        "O histórico contém o nome do titular. Possível transferência entre contas próprias.";
                }
            }
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
                .filter(Boolean);

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

    /*
     * =========================================================
     * INTEGRAÇÃO
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
                        "Crédito excluído" ||
                        movimento.classificacao ===
                        "Possível transferência própria" ||
                        movimento.classificacao ===
                        "Conferir origem"
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

                    const meta = [
                        `[ID:${movimento.id}]`,
                        `[BANCO:${movimento.banco}]`,
                        `[ARQUIVO:${movimento.arquivo}]`,
                        `[DECISAO:${decisao}]`
                    ].join(" ");

                    return [
                        movimento.data,
                        `${meta} ${movimento.historico}`.trim(),
                        `${formatarValorNumero(movimento.valor)}${indicador ? " " + indicador : ""}`
                    ].join(" | ");
                }
            )
            .join("\n");
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
     * RESULTADO
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
                                    <strong>${escaparHTML(documento.nome)}</strong>
                                    <span>
                                        ${escaparHTML(documento.banco || "Instituição não identificada")}
                                        ·
                                        ${escaparHTML(tipo)}
                                        ·
                                        ${escaparHTML(status)}
                                    </span>
                                </div>
                                <div class="documento-ocr-meta">
                                    <span>${escaparHTML(documento.metodo || "-")}</span>
                                    <span>${formatarTamanhoArquivo(documento.tamanho || 0)}</span>
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
                        `<div class="aviso-atencao">${escaparHTML(alerta)}</div>`
                )
                .join("");
    }

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

                            if (
                                !resultadoLeituraOCR ||
                                !resultadoLeituraOCR.movimentacoes[
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
                            } else if (
                                movimento.classificacao ===
                                "Crédito confirmado manualmente"
                            ) {
                                movimento.classificacao =
                                    "Conferir";

                                movimento.motivo =
                                    "Movimentação removida manualmente.";
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
                if (
                    !marcar
                ) {
                    movimento.considerar =
                        false;

                    return;
                }

                movimento.considerar =
                    movimento.natureza ===
                    "Crédito" &&
                    movimento.classificacao ===
                    "Crédito";
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
                    movimento.considerar ===
                    true &&
                    movimento.natureza ===
                    "Crédito" &&
                    Number(
                        movimento.valor
                    ) >
                    0
            );

        const porMes = {};
        const porBanco = {};

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
                    `${String(data.getMonth() + 1).padStart(2, "0")}/${data.getFullYear()}`;

                if (
                    !porMes[
                    competencia
                    ]
                ) {
                    porMes[
                        competencia
                    ] = {
                        quantidade: 0,
                        total: 0,
                        bancos: new Set()
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
                        quantidade: 0,
                        total: 0,
                        competencias: new Set()
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

        let maiorMes = "-";
        let maiorValor = -1;

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
                        competencia
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
                '<tr><td colspan="4" class="sem-dados">Nenhum crédito considerado.</td></tr>';

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
                            ] ||
                            {
                                quantidade: 0,
                                total: 0,
                                bancos: new Set()
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
                                <td>${escaparHTML(banco)}</td>
                                <td>${dados.quantidade}</td>
                                <td>${formatarMoeda(dados.total)}</td>
                                <td>${formatarMoeda(dados.total / quantidadeCompetencias)}</td>
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

        const utilizados =
            resultado.documentos.filter(
                documento =>
                    !documento.excluidoDaApuracao
            );

        const excluidos =
            resultado.documentos.filter(
                documento =>
                    documento.excluidoDaApuracao
            );

        textarea.value = [
            "RESUMO DA LEITURA DOS EXTRATOS",
            `Arquivos processados: ${resultado.documentos.length}`,
            `Extratos de conta utilizados: ${utilizados.length}`,
            `Documentos excluídos da apuração: ${excluidos.length}`,
            `Titular: ${resultado.titular || "Não identificado"}`,
            `CPF/CNPJ: ${resultado.documentoTitular ? formatarDocumento(resultado.documentoTitular) : "Não identificado"}`,
            `Instituições: ${resultado.instituicoes.length ? resultado.instituicoes.join(", ") : "Não identificadas"}`,
            `Período válido: ${formatarPeriodo(resultado.primeiraData, resultado.ultimaData)}`,
            `Competências válidas: ${resultado.competencias.length ? resultado.competencias.map(formatarCompetencia).join(", ") : "Não identificadas"}`,
            `Movimentações de conta identificadas: ${resultado.movimentacoes.length}`,
            `Créditos selecionados: ${creditos.length}`,
            `Total dos créditos selecionados: ${formatarMoeda(creditos.reduce((soma, m) => soma + Number(m.valor || 0), 0))}`,
            `Alertas: ${resultado.alertas.length}`
        ].join("\n");
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

        resultadoLeituraOCR.textoConsolidado =
            gerarTextoConsolidado(
                resultadoLeituraOCR.movimentacoes
            );

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
                behavior: "smooth",
                block: "start"
            });
        }
    }

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

            const btn =
                document.getElementById(
                    "btnCopiarResumoOCR"
                );

            if (
                btn
            ) {
                const textoOriginal =
                    btn.textContent;

                btn.textContent =
                    "Copiado";

                setTimeout(
                    () => {
                        btn.textContent =
                            textoOriginal;
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
     * INSTITUIÇÃO / TITULAR
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
            {
                nome: "Mercado Pago",
                termos: [
                    "MERCADO PAGO"
                ]
            },
            {
                nome: "Banco Inter",
                termos: [
                    "BANCO INTER",
                    "INTER PAGAMENTOS",
                    "BANCO INTER S A",
                    "INTER BANK"
                ]
            },
            {
                nome: "Nubank",
                termos: [
                    "NUBANK",
                    "NU PAGAMENTOS",
                    "NU FINANCEIRA",
                    "CONTA DO NUBANK"
                ]
            },
            {
                nome: "Itaú",
                termos: [
                    "BANCO ITAU",
                    "ITAU UNIBANCO",
                    "ITAU"
                ]
            },
            {
                nome: "Santander",
                termos: [
                    "SANTANDER"
                ]
            },
            {
                nome: "Sicoob",
                termos: [
                    "SICOOB"
                ]
            },
            {
                nome: "Sicredi",
                termos: [
                    "SICREDI"
                ]
            },
            {
                nome: "Bradesco",
                termos: [
                    "BRADESCO"
                ]
            },
            {
                nome: "Banco do Brasil",
                termos: [
                    "BANCO DO BRASIL"
                ]
            },
            {
                nome: "Caixa Econômica Federal",
                termos: [
                    "CAIXA ECONOMICA"
                ]
            },
            {
                nome: "C6 Bank",
                termos: [
                    "C6 BANK"
                ]
            },
            {
                nome: "PagBank",
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
         * Banco Inter em OCR pode perder "Banco"
         * e deixar somente o logotipo/texto INTER.
         * Só aceitamos assim se houver indícios claros
         * de fatura bancária.
         */

        if (
            /\bINTER\b/.test(
                normal
            ) &&
            (
                normal.includes(
                    "RESUMO DA FATURA"
                ) ||
                normal.includes(
                    "TOTAL DA SUA FATURA"
                )
            )
        ) {
            return "Banco Inter";
        }

        return "";
    }

    function identificarDadosTitular(
        texto,
        banco
    ) {
        const linhas =
            prepararLinhas(
                texto
            );

        const nomes = [];
        const documentos = [];

        for (
            let indice = 0;
            indice < linhas.length;
            indice++
        ) {
            const linha =
                linhas[indice];

            const normal =
                normalizar(
                    linha
                );

            if (
                /^(NOME|TITULAR|CLIENTE)\s*:?\s*$/.test(
                    normal
                ) &&
                linhas[
                indice + 1
                ]
            ) {
                const nome =
                    limparNome(
                        linhas[
                        indice + 1
                        ]
                    );

                if (
                    pareceNomePessoa(
                        nome
                    )
                ) {
                    nomes.push({
                        valor:
                            nome,
                        pontuacao:
                            100
                    });
                }
            }

            const nomeMesmaLinha =
                linha.match(
                    /(?:NOME|TITULAR|CLIENTE)\s*:?\s+([A-ZÀ-Ú][A-ZÀ-Ú\s.'-]{4,100})/i
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
                    nomes.push({
                        valor:
                            nome,
                        pontuacao:
                            110
                    });
                }
            }

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
                            documentos.push({
                                valor:
                                    documento,
                                pontuacao:
                                    200
                            });
                        }
                    }
                );

                if (
                    linhas[
                    indice + 1
                    ]
                ) {
                    coletarDocumentosDaLinha(
                        linhas[
                        indice + 1
                        ]
                    ).forEach(
                        documento => {
                            if (
                                documento.length ===
                                11
                            ) {
                                documentos.push({
                                    valor:
                                        documento,
                                    pontuacao:
                                        180
                                });
                            }
                        }
                    );
                }
            }

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
                            documentos.push({
                                valor:
                                    documento,
                                pontuacao:
                                    60
                            });
                        }
                    }
                );
            }
        }

        nomes.sort(
            (a, b) =>
                b.pontuacao -
                a.pontuacao
        );

        documentos.sort(
            (a, b) =>
                b.pontuacao -
                a.pontuacao
        );

        const melhorNome =
            nomes[0] ||
            null;

        const melhorDocumento =
            documentos[0] ||
            null;

        /*
         * Não exibimos CNPJ como documento do titular
         * se nem sequer identificamos o titular.
         *
         * Isso evita exatamente o caso:
         *
         * Titular: Não identificado
         * CPF/CNPJ: 57.585.832/0001-34
         */

        let documentoFinal =
            melhorDocumento
                ? melhorDocumento.valor
                : "";

        if (
            documentoFinal.length ===
            14 &&
            !melhorNome
        ) {
            documentoFinal = "";
        }

        /*
         * Para Mercado Pago, CNPJ pode ser documento
         * cadastral da conta/estabelecimento.
         * CPF identificado sempre tem prioridade.
         */

        if (
            banco === "Mercado Pago" &&
            documentoFinal.length ===
            14
        ) {
            const cpf =
                documentos.find(
                    item =>
                        item.valor.length ===
                        11
                );

            if (
                cpf
            ) {
                documentoFinal =
                    cpf.valor;
            } else if (
                !melhorNome
            ) {
                documentoFinal =
                    "";
            }
        }

        return {
            nome:
                melhorNome
                    ? melhorNome.valor
                    : "",
            documento:
                documentoFinal,
            pontuacao:
                (melhorNome
                    ? melhorNome.pontuacao
                    : 0) +
                (documentoFinal
                    ? documentoFinal.length === 11
                        ? 200
                        : 40
                    : 0)
        };
    }

    function coletarDocumentosDaLinha(
        linha
    ) {
        const resultado = [];

        const candidatos =
            String(
                linha ||
                ""
            ).match(
                /(?:\d[\s.\-/]*){11,18}/g
            ) ||
            [];

        candidatos.forEach(
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

        return resultado;
    }

    function validarCPF(
        cpf
    ) {
        cpf =
            String(
                cpf ||
                ""
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

        let soma = 0;

        for (
            let indice = 0;
            indice < 9;
            indice++
        ) {
            soma +=
                Number(
                    cpf[
                    indice
                    ]
                ) *
                (10 -
                    indice);
        }

        let digito =
            (soma * 10) %
            11;

        if (
            digito ===
            10
        ) {
            digito = 0;
        }

        if (
            digito !==
            Number(
                cpf[9]
            )
        ) {
            return false;
        }

        soma = 0;

        for (
            let indice = 0;
            indice < 10;
            indice++
        ) {
            soma +=
                Number(
                    cpf[
                    indice
                    ]
                ) *
                (11 -
                    indice);
        }

        digito =
            (soma * 10) %
            11;

        if (
            digito ===
            10
        ) {
            digito = 0;
        }

        return (
            digito ===
            Number(
                cpf[10]
            )
        );
    }

    function validarCNPJ(
        cnpj
    ) {
        cnpj =
            String(
                cnpj ||
                ""
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

        const calcularDigito =
            base => {
                let peso =
                    base.length ===
                        12
                        ? 5
                        : 6;

                let soma = 0;

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
                        peso = 9;
                    }
                }

                const resto =
                    soma % 11;

                return resto <
                    2
                    ? 0
                    : 11 -
                    resto;
            };

        const d1 =
            calcularDigito(
                cnpj.slice(
                    0,
                    12
                )
            );

        const d2 =
            calcularDigito(
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

        return valor
            .split(/\s+/)
            .filter(Boolean)
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
                MESES[
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
                mes - 1,
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
                `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${ano}`
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
                (a, b) =>
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
         * Evitamos datas de fatura porque o documento
         * já foi filtrado antes.
         */

        return Array.from(
            resultado
        );
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
            return `${formatarData(inicio)} a ${formatarData(fim)}`;
        }

        return formatarData(
            inicio ||
            fim
        );
    }

    function formatarData(
        data
    ) {
        return (
            data instanceof Date &&
            !Number.isNaN(
                data.getTime()
            )
        )
            ? data.toLocaleDateString(
                "pt-BR"
            )
            : "Não identificado";
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

        return partes.length ===
            2
            ? `${partes[1]}/${partes[0]}`
            : competencia;
    }

    /*
     * =========================================================
     * VALORES
     * =========================================================
     */

    function extrairOcorrenciasMonetarias(
        texto
    ) {
        const valor =
            String(
                texto ||
                ""
            );

        const resultado = [];

        /*
         * Exemplos aceitos:
         *
         * R$ 700,00
         * 700,00
         * -700,00
         * 700,00-
         * 1.994,41
         */

        const regex =
            /(?:R\$\s*)?(-?\s*(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2})(-)?/gi;

        let match;

        while (
            (
                match =
                regex.exec(
                    valor
                )
            ) !==
            null
        ) {
            let numero =
                converterMoeda(
                    match[1]
                );

            if (
                !Number.isFinite(
                    numero
                )
            ) {
                continue;
            }

            const negativoFinal =
                match[2] ===
                "-";

            if (
                negativoFinal
            ) {
                numero =
                    -Math.abs(
                        numero
                    );
            }

            resultado.push({
                valor:
                    numero,
                indice:
                    match.index,
                fim:
                    regex.lastIndex,
                bruto:
                    match[0],
                negativoFinal
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
            .filter(Boolean);
    }

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
                /R\$\s*-?\s*(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2}-?/gi,
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
                        html ||
                        ""
                    ),
                    "text/html"
                );

        return (
            documento.body
                ? documento.body.innerText
                : documento.documentElement.innerText ||
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
            return `${(numero / 1024).toFixed(1)} KB`;
        }

        return `${(numero / 1048576).toFixed(2)} MB`;
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
                /\s+/g,
                " "
            )
            .trim()
            .toUpperCase();
    }

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
            const id of ids ||
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
                `<tr><td colspan="${colspan}" class="sem-dados">${escaparHTML(mensagem)}</td></tr>`;
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
        obterArquivos: () =>
            arquivosExtratoSelecionados.slice(),

        obterResultado: () =>
            resultadoLeituraOCR,

        limpar:
            limparArquivosExtrato,

        recalcular: () => {
            if (
                !resultadoLeituraOCR
            ) {
                return;
            }

            atualizarCalculosOCR(
                resultadoLeituraOCR
            );

            atualizarResumoLeitura(
                resultadoLeituraOCR
            );
        }
    };

})();