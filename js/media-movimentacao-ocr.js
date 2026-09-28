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
        JAN: 1, JANEIRO: 1,
        FEV: 2, FEVEREIRO: 2,
        MAR: 3, MARCO: 3,
        ABR: 4, ABRIL: 4,
        MAI: 5, MAIO: 5,
        JUN: 6, JUNHO: 6,
        JUL: 7, JULHO: 7,
        AGO: 8, AGOSTO: 8,
        SET: 9, SETEMBRO: 9,
        OUT: 10, OUTUBRO: 10,
        NOV: 11, NOVEMBRO: 11,
        DEZ: 12, DEZEMBRO: 12
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
            btnTodos.addEventListener("click", () => {
                alterarSelecaoMovimentacoes(true);
            });
        }

        if (btnNenhum) {
            btnNenhum.addEventListener("click", () => {
                alterarSelecaoMovimentacoes(false);
            });
        }

        renderizarArquivosSelecionados();
        limparResumoOCR();
    }

    /*
     * =========================================================
     * ARQUIVOS
     * =========================================================
     */

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

            const duplicado = arquivosExtratoSelecionados.some(item =>
                item.name === file.name &&
                item.size === file.size &&
                item.lastModified === file.lastModified
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
            lista.innerHTML =
                '<div class="sem-dados">Nenhum arquivo selecionado.</div>';
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
                arquivosExtratoSelecionados.splice(
                    Number(btn.dataset.indice),
                    1
                );

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

        definirStatus(
            "Pronto para ler os extratos.",
            "info"
        );
    }

    /*
     * =========================================================
     * PROCESSAMENTO DOS ARQUIVOS
     * =========================================================
     */

    async function processarArquivosExtrato() {
        if (!arquivosExtratoSelecionados.length) {
            return;
        }

        const btn = document.getElementById("btnLerExtratos");

        if (btn) {
            btn.disabled = true;
            btn.textContent = "Processando...";
        }

        const resultado = {
            documentos: [],
            movimentacoes: [],
            alertas: [],
            competencias: new Set(),
            instituicoes: new Set(),
            textoConsolidado: "",
            titular: "",
            documentoTitular: "",
            primeiraData: null,
            ultimaData: null,
            resultadoCalculadora: null
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

                    if (documento.excluidoDaApuracao) {
                        resultado.alertas.push(
                            `${documento.nome}: ${documento.motivoExclusao}`
                        );
                        continue;
                    }

                    const identidade = identificarDadosTitular(
                        documento.texto
                    );

                    if (!resultado.titular && identidade.nome) {
                        resultado.titular = identidade.nome;
                    }

                    if (
                        !resultado.documentoTitular &&
                        identidade.documento
                    ) {
                        resultado.documentoTitular =
                            identidade.documento;
                    }

                    const movimentacoes =
                        extrairMovimentacoesDocumento(documento);

                    movimentacoes.forEach(movimento => {
                        resultado.movimentacoes.push(movimento);

                        const data = parseDataBR(movimento.data);

                        if (data) {
                            resultado.competencias.add(
                                obterCompetenciaData(data)
                            );
                        }
                    });
                } catch (erro) {
                    console.error(arquivo.name, erro);

                    resultado.alertas.push(
                        `${arquivo.name}: ${erro.message || erro}`
                    );
                }
            }

            /*
             * Não remover duplicados.
             *
             * Dois créditos legítimos podem possuir:
             * mesma data + mesmo histórico + mesmo valor.
             */
            resultado.movimentacoes.sort((a, b) => {
                const da = parseDataBR(a.data);
                const db = parseDataBR(b.data);

                if (da && db && da - db !== 0) {
                    return da - db;
                }

                return Number(a.ordem || 0) - Number(b.ordem || 0);
            });

            resultado.competencias =
                Array.from(resultado.competencias).sort();

            resultado.instituicoes =
                Array.from(resultado.instituicoes);

            recalcularPeriodo(resultado);

            resultado.textoConsolidado =
                gerarTextoConsolidado(resultado.movimentacoes);

            resultadoLeituraOCR = resultado;

            /*
             * PRIMEIRO envia para a fonte única de cálculo.
             */
            sincronizarComCalculadora(resultado);

            /*
             * Depois atualiza a tela OCR com o mesmo resultado.
             */
            renderizarResultadoOCR(resultado);

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
                btn.disabled = !arquivosExtratoSelecionados.length;
                btn.textContent = "Ler e Consolidar";
            }
        }
    }

    /*
     * =========================================================
     * LEITURA DOS ARQUIVOS
     * =========================================================
     */

    async function lerArquivoExtrato(arquivo, indice) {
        const ext = obterExtensao(arquivo.name);

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
            [
                "txt",
                "csv",
                "html",
                "htm"
            ].includes(ext)
        ) {
            base.metodo = "Leitura direta";
            base.texto = await arquivo.text();

            if (
                [
                    "html",
                    "htm"
                ].includes(ext)
            ) {
                base.texto = converterHTMLParaTexto(base.texto);
            }

            return base;
        }

        if (
            [
                "png",
                "jpg",
                "jpeg",
                "webp"
            ].includes(ext)
        ) {
            base.metodo = "OCR";
            base.texto = await executarOCRImagem(arquivo);

            return base;
        }

        if (ext === "pdf") {
            base.metodo = "PDF";

            base.texto = await lerPDF(arquivo);

            if (
                !base.texto ||
                base.texto.replace(/\s/g, "").length < 30
            ) {
                base.metodo = "PDF/OCR";
                base.texto = await lerPDFComOCR(arquivo);
            }

            return base;
        }

        throw new Error("Formato não suportado.");
    }

    /*
     * =========================================================
     * PDF
     * =========================================================
     */

    async function lerPDF(arquivo) {
        if (typeof pdfjsLib === "undefined") {
            throw new Error("PDF.js não foi carregado.");
        }

        const buffer = await arquivo.arrayBuffer();

        const pdf = await pdfjsLib
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

            const pagina = await pdf.getPage(numero);

            const conteudo = await pagina.getTextContent({
                normalizeWhitespace: true,
                disableCombineTextItems: false
            });

            paginas.push(
                agruparItensPDFPorLinha(
                    conteudo.items
                ).join("\n")
            );
        }

        return paginas.join("\n");
    }

    function agruparItensPDFPorLinha(items) {
        const grupos = [];

        (items || []).forEach(item => {
            const texto = String(item.str || "").trim();

            if (!texto) {
                return;
            }

            const x = item.transform
                ? Number(item.transform[4] || 0)
                : 0;

            const y = item.transform
                ? Number(item.transform[5] || 0)
                : 0;

            let grupo = grupos.find(
                g => Math.abs(g.y - y) <= 2.5
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

        grupos.sort((a, b) => b.y - a.y);

        return grupos
            .map(grupo => {
                grupo.itens.sort((a, b) => a.x - b.x);

                return grupo.itens
                    .map(item => item.texto)
                    .join(" ")
                    .replace(/\s+/g, " ")
                    .trim();
            })
            .filter(Boolean);
    }

    async function lerPDFComOCR(arquivo) {
        if (typeof pdfjsLib === "undefined") {
            throw new Error("PDF.js não foi carregado.");
        }

        const buffer = await arquivo.arrayBuffer();

        const pdf = await pdfjsLib
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

            const pagina = await pdf.getPage(numero);

            const viewport = pagina.getViewport({
                scale: 2
            });

            const canvas = document.createElement("canvas");

            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);

            const contexto = canvas.getContext(
                "2d",
                {
                    willReadFrequently: true
                }
            );

            await pagina.render({
                canvasContext: contexto,
                viewport
            }).promise;

            const blob = await new Promise((resolve, reject) => {
                canvas.toBlob(
                    resultado => {
                        if (resultado) {
                            resolve(resultado);
                        } else {
                            reject(
                                new Error(
                                    "Falha ao converter página."
                                )
                            );
                        }
                    },
                    "image/png"
                );
            });

            partes.push(
                await executarOCRImagem(blob)
            );

            canvas.width = 1;
            canvas.height = 1;
        }

        return partes.join("\n");
    }

    /*
     * =========================================================
     * OCR DE IMAGEM
     * =========================================================
     */

    async function executarOCRImagem(arquivo) {
        if (typeof Tesseract === "undefined") {
            throw new Error("Tesseract.js não foi carregado.");
        }

        const resultado = await Tesseract.recognize(
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
                        Number.isFinite(mensagem.progress)
                            ? ` ${Math.round(mensagem.progress * 100)}%`
                            : "";

                    definirStatus(
                        `OCR: ${mensagem.status}${percentual}`,
                        "processando"
                    );
                }
            }
        );

        return resultado && resultado.data
            ? String(resultado.data.text || "")
            : "";
    }

    /*
     * =========================================================
     * IDENTIFICAÇÃO DA INSTITUIÇÃO
     * =========================================================
     */

    function identificarInstituicao(texto) {
        const normal = normalizar(texto);

        const bancos = [
            [["SICOOB"], "Sicoob"],
            [["MERCADO PAGO"], "Mercado Pago"],
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
            [["SANTANDER"], "Santander"],
            [["ITAU"], "Itaú"],
            [["BRADESCO"], "Bradesco"],
            [["BANCO DO BRASIL"], "Banco do Brasil"],
            [["CAIXA ECONOMICA"], "Caixa Econômica Federal"],
            [["SICREDI"], "Sicredi"],
            [["C6 BANK"], "C6 Bank"],
            [
                [
                    "PAGBANK",
                    "PAGSEGURO"
                ],
                "PagBank"
            ]
        ];

        for (const [termos, banco] of bancos) {
            if (
                termos.some(
                    termo => normal.includes(termo)
                )
            ) {
                return banco;
            }
        }

        return "";
    }

    /*
     * =========================================================
     * IDENTIFICAÇÃO DO TIPO DE DOCUMENTO
     * =========================================================
     */

    function identificarTipoDocumento(texto, banco) {
        const normal = normalizar(texto);

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
                termo => normal.includes(termo)
            ).length;

        if (quantidadeFatura >= 2) {
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
            banco === "Sicoob" &&
            (
                normal.includes("EXTRATO CONTA CORRENTE") ||
                normal.includes("TRANSF.RECEBIDA") ||
                normal.includes("TRANSF. RECEBIDA") ||
                normal.includes("PIX RECEBIDO")
            )
        ) {
            return TIPOS_DOCUMENTO.EXTRATO_CONTA;
        }

        if (
            normal.includes("EXTRATO CONTA CORRENTE") ||
            normal.includes("CONTA CORRENTE") ||
            normal.includes("DETALHE DOS MOVIMENTOS") ||
            normal.includes("DETALHE DE MOVIMENTOS") ||
            normal.includes("PIX RECEBIDO") ||
            normal.includes("TRANSFERENCIA RECEBIDA")
        ) {
            return TIPOS_DOCUMENTO.EXTRATO_CONTA;
        }

        return TIPOS_DOCUMENTO.DESCONHECIDO;
    }

    function obterMotivoExclusaoDocumento(documento) {
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

    function extrairMovimentacoesDocumento(documento) {
        if (documento.banco === "Sicoob") {
            return extrairSicoob(documento);
        }

        return extrairGenerico(documento);
    }

    /*
     * =========================================================
     * SICOOB
     * =========================================================
     */

    function extrairSicoob(documento) {
        const linhas = prepararLinhas(documento.texto);
        const resultado = [];

        let movimentoAtual = null;
        let ordem = 0;

        linhas.forEach((linha, indice) => {
            const principal = interpretarLinhaSicoob(
                linha,
                documento,
                indice,
                ordem
            );

            if (principal) {
                ordem++;

                principal.ordem = ordem;

                resultado.push(principal);
                movimentoAtual = principal;

                return;
            }

            if (
                movimentoAtual &&
                ehComplementoSicoob(linha)
            ) {
                movimentoAtual.detalhes.push(linha);

                movimentoAtual.historicoCompleto = [
                    movimentoAtual.historico,
                    ...movimentoAtual.detalhes
                ]
                    .join(" ")
                    .replace(/\s+/g, " ")
                    .trim();
            }
        });

        return resultado;
    }

    function interpretarLinhaSicoob(
        linha,
        documento,
        indice,
        ordem
    ) {
        /*
         * Formatos aceitos:
         *
         * 01/06/2026 ... 1.000,00C
         * 01/06/2026 ... 1.000,00 C
         * 01/06/2026 ... 1.000,00D
         * 01/06/2026 ... 1.000,00 D
         * 01/06/2026 ... 0,00*
         */
        const match = String(linha || "").match(
            /^\s*(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})\s+(.*?)\s+(?:R\$\s*)?((?:\d{1,3}(?:\.\d{3})*|\d+),\d{2})\s*([CD*])\s*$/i
        );

        if (!match) {
            return null;
        }

        const data = criarDataInfo(
            Number(match[1]),
            Number(match[2]),
            Number(match[3])
        );

        if (!data) {
            return null;
        }

        const meio = String(match[4] || "")
            .replace(/\s+/g, " ")
            .trim();

        let documentoMov = "";
        let historico = meio;

        const primeiro = meio.match(
            /^(\S+)\s+(.+)$/
        );

        if (
            primeiro &&
            pareceDocumentoSicoob(primeiro[1])
        ) {
            documentoMov = primeiro[1];
            historico = primeiro[2];
        }

        historico = historico.trim();

        const valor = converterMoeda(match[5]);

        if (!Number.isFinite(valor)) {
            return null;
        }

        const indicador =
            String(match[6] || "")
                .toUpperCase();

        const classificacao = classificarSicoob(
            historico,
            indicador
        );

        return criarMovimentacao({
            id: [
                documento.id,
                indice,
                ordem
            ].join("|"),

            ordem,

            data: data.dataTexto,

            banco: "Sicoob",

            arquivo: documento.nome,

            documento: documentoMov,

            historico,

            historicoCompleto: historico,

            detalhes: [],

            valor: Math.abs(valor),

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

    function pareceDocumentoSicoob(valor) {
        const texto = String(valor || "");

        return (
            /^\d{2,}$/.test(texto) ||
            /^PIX$/i.test(texto) ||
            /^MASTERCARD$/i.test(texto) ||
            /^VISA$/i.test(texto) ||
            /^[A-Z]+\/\d/i.test(texto) ||
            /^[A-Z0-9.-]{3,20}$/i.test(texto)
        );
    }

    /*
     * Esta classificação serve para apresentar a prévia OCR.
     *
     * O cálculo oficial é feito pelo media-movimentacao.js.
     */
    function classificarSicoob(historico, indicador) {
        const normal = normalizar(historico);

        if (indicador === "D") {
            return {
                natureza: "Débito",
                classificacao: "Débito",
                considerar: false,
                motivo: "Débito identificado pelo indicador D."
            };
        }

        if (indicador === "*") {
            return {
                natureza: "-",
                classificacao: "Informativo",
                considerar: false,
                motivo: "Linha informativa ou valor bloqueado."
            };
        }

        if (indicador !== "C") {
            return {
                natureza: "-",
                classificacao: "Conferir",
                considerar: false,
                motivo: "Natureza não identificada."
            };
        }

        if (
            /^SALDO\b/.test(normal) ||
            normal.includes("SALDO DO DIA") ||
            normal.includes("SALDO DISPONIVEL") ||
            normal.includes("SALDO EM CONTA CAPITAL")
        ) {
            return {
                natureza: "Crédito",
                classificacao: "Crédito excluído",
                considerar: false,
                motivo: "Saldo informativo não representa movimentação."
            };
        }

        if (
            normal.includes("CHEQUE ESPECIAL") ||
            normal.includes("LIMITE DE CREDITO")
        ) {
            return {
                natureza: "Crédito",
                classificacao: "Crédito excluído",
                considerar: false,
                motivo: "Limite disponível não representa movimentação financeira."
            };
        }

        if (
            normal.includes("ESTORNO") ||
            normal.includes("DEVOLUCAO") ||
            normal.includes("REVERSAO") ||
            normal.includes("CANCELAMENTO") ||
            normal.includes("REEMBOLSO")
        ) {
            return {
                natureza: "Crédito",
                classificacao: "Crédito excluído",
                considerar: false,
                motivo: "Estorno/devolução não representa nova entrada de recursos."
            };
        }

        if (
            normal.includes("LIBERACAO DE CREDITO") ||
            normal.includes("LIBERACAO DE DINHEIRO") ||
            normal.includes("DINHEIRO LIBERADO") ||
            normal.includes("EMPRESTIMO") ||
            normal.includes("FINANCIAMENTO") ||
            normal.includes("CREDITO PESSOAL") ||
            normal.includes("CREDITO CONSIGNADO") ||
            normal.includes("CAPITAL DE GIRO")
        ) {
            return {
                natureza: "Crédito",
                classificacao: "Crédito excluído",
                considerar: false,
                motivo: "Crédito originado de empréstimo/financiamento."
            };
        }

        if (
            /\b(RDB|RDC|CDB|RESGATE|APLICACAO|INVESTIMENTO)\b/.test(
                normal
            )
        ) {
            return {
                natureza: "Crédito",
                classificacao: "Crédito excluído",
                considerar: false,
                motivo: "Movimentação de investimento."
            };
        }

        /*
         * Antecipação SIPAG é mantida.
         */
        if (
            normal.includes("CR ANTECIPACAO")
        ) {
            return {
                natureza: "Crédito",
                classificacao: "Crédito",
                considerar: true,
                motivo: "Antecipação de recebíveis creditada efetivamente em conta."
            };
        }

        return {
            natureza: "Crédito",
            classificacao: "Crédito",
            considerar: true,
            motivo: "Crédito identificado pelo indicador C do extrato."
        };
    }

    function ehComplementoSicoob(linha) {
        const normal = normalizar(linha);

        if (!normal) {
            return false;
        }

        /*
         * Se começa com uma nova data, não pode ser complemento.
         */
        if (
            /^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4}\b/.test(
                normal
            )
        ) {
            return false;
        }

        if (
            normal === "SICOOB" ||
            normal.includes("SISTEMA DE COOPERATIVAS") ||
            normal.includes("SISBR") ||
            normal.startsWith("COOP.:") ||
            normal.startsWith("CONTA:") ||
            normal.startsWith("DATA DOCUMENTO") ||
            normal === "RESUMO" ||
            normal.startsWith("ENCARGOS") ||
            normal.startsWith("OUTRAS INFORMACOES") ||
            normal.startsWith("SAC:") ||
            normal.startsWith("OUVIDORIA")
        ) {
            return false;
        }

        return true;
    }

    /*
     * =========================================================
     * OUTRAS INSTITUIÇÕES
     * =========================================================
     */

    function extrairGenerico(documento) {
        const linhas = prepararLinhas(documento.texto);

        const ano = identificarAnoPrincipal(
            documento.texto
        );

        const movimentos = [];

        let ordem = 0;

        linhas.forEach((linha, indice) => {
            const data = extrairDataFlexivel(
                linha,
                ano
            );

            if (!data) {
                return;
            }

            const valores = extrairOcorrenciasMonetarias(
                linha
            );

            if (!valores.length) {
                return;
            }

            const normal = normalizar(linha);

            /*
             * Para extratos genéricos utilizamos a última
             * ocorrência monetária da linha como valor
             * transacional.
             */
            const ultimo = valores[valores.length - 1];

            let natureza = "-";
            let considerar = false;
            let classificacao = "Conferir";
            let motivo =
                "Movimentação não classificada automaticamente.";
            let indicador =
                normalizarIndicador(ultimo.indicador);

            if (
                indicador === "D" ||
                /\b(PIX ENVIADO|PIX EMITIDO|TRANSFERENCIA ENVIADA|PAGAMENTO|COMPRA|SAQUE|DEBITO)\b/.test(
                    normal
                )
            ) {
                natureza = "Débito";
                classificacao = "Débito";
                considerar = false;
                indicador = "D";
                motivo = "Débito identificado.";
            } else if (
                indicador === "C" ||
                /\b(PIX RECEBIDO|PIX RECEBIDA|TRANSFERENCIA RECEBIDA|TRANSF RECEBIDA|TED RECEBIDA|TED RECEBIDO|DOC RECEBIDO|DOC RECEBIDA|DEPOSITO|RECEBIMENTO|SALARIO|PROVENTO)\b/.test(
                    normal
                )
            ) {
                natureza = "Crédito";
                classificacao = "Crédito";
                considerar = true;
                indicador = "C";
                motivo = "Entrada de recursos identificada.";
            }

            const historico =
                limparHistoricoGenerico(linha);

            /*
             * Exclusões preliminares.
             *
             * A decisão final continuará no
             * media-movimentacao.js.
             */
            const exclusao =
                identificarExclusaoPreliminar(
                    historico,
                    indicador
                );

            if (exclusao) {
                natureza =
                    indicador === "C"
                        ? "Crédito"
                        : natureza;

                classificacao =
                    indicador === "C"
                        ? "Crédito excluído"
                        : classificacao;

                considerar = false;
                motivo = exclusao;
            }

            ordem++;

            movimentos.push(
                criarMovimentacao({
                    id: [
                        documento.id,
                        indice,
                        ordem
                    ].join("|"),

                    ordem,

                    data: data.dataTexto,

                    banco:
                        documento.banco ||
                        "Não identificado",

                    arquivo:
                        documento.nome,

                    documento: "",

                    historico,

                    historicoCompleto:
                        linha,

                    detalhes: [],

                    valor:
                        Math.abs(ultimo.valor),

                    natureza,

                    classificacao,

                    motivo,

                    considerar,

                    indicador
                })
            );
        });

        return movimentos;
    }

    function identificarExclusaoPreliminar(
        historico,
        indicador
    ) {
        const normal = normalizar(historico);

        if (indicador === "D") {
            return "Débito identificado.";
        }

        if (
            /^SALDO\b/.test(normal) ||
            /^TOTAL\b/.test(normal) ||
            /^LIMITE\b/.test(normal)
        ) {
            return "Linha informativa.";
        }

        if (
            normal.includes("CHEQUE ESPECIAL") ||
            normal.includes("LIMITE DE CREDITO")
        ) {
            return "Limite disponível não representa movimentação financeira.";
        }

        if (
            normal.includes("LIBERACAO DE DINHEIRO") ||
            normal.includes("LIBERACAO DE CREDITO") ||
            normal.includes("EMPRESTIMO") ||
            normal.includes("FINANCIAMENTO") ||
            normal.includes("CREDITO PESSOAL") ||
            normal.includes("CAPITAL DE GIRO")
        ) {
            return "Crédito originado de empréstimo/financiamento.";
        }

        if (
            normal.includes("ESTORNO") ||
            normal.includes("DEVOLUCAO") ||
            normal.includes("REVERSAO") ||
            normal.includes("CANCELAMENTO")
        ) {
            return "Estorno/devolução não representa nova entrada de recursos.";
        }

        if (
            /\b(RDB|RDC|CDB|RESGATE|APLICACAO|INVESTIMENTO)\b/.test(
                normal
            )
        ) {
            return "Movimentação de investimento.";
        }

        return "";
    }

    /*
     * =========================================================
     * CRIAÇÃO DA MOVIMENTAÇÃO
     * =========================================================
     */

    function criarMovimentacao(dados) {
        return {
            id: dados.id,

            ordem:
                Number(dados.ordem || 0),

            data:
                dados.data || "",

            banco:
                dados.banco || "",

            arquivo:
                dados.arquivo || "",

            documento:
                dados.documento || "",

            historico:
                dados.historico || "",

            historicoCompleto:
                dados.historicoCompleto ||
                dados.historico ||
                "",

            detalhes:
                Array.isArray(dados.detalhes)
                    ? dados.detalhes
                    : [],

            valor:
                Number(dados.valor || 0),

            indicador:
                normalizarIndicador(
                    dados.indicador
                ),

            natureza:
                dados.natureza || "-",

            classificacao:
                dados.classificacao || "Conferir",

            motivo:
                dados.motivo || "",

            considerar:
                dados.considerar === true
        };
    }

    function normalizarIndicador(valor) {
        const normal = normalizar(valor);

        if (
            normal === "C" ||
            normal === "CR" ||
            normal === "CREDITO"
        ) {
            return "C";
        }

        if (
            normal === "D" ||
            normal === "DB" ||
            normal === "DEBITO"
        ) {
            return "D";
        }

        if (normal === "*") {
            return "*";
        }

        return "";
    }

    /*
     * =========================================================
     * TEXTO CONSOLIDADO
     * =========================================================
     *
     * Mantido para:
     * - compatibilidade;
     * - visualização;
     * - depuração;
     * - resumo.
     *
     * NÃO é mais a rota principal para o cálculo.
     * =========================================================
     */

    function gerarTextoConsolidado(movimentacoes) {
        return movimentacoes
            .map(movimento => {
                let decisao = "DUVIDA";

                if (
                    movimento.considerar &&
                    movimento.natureza === "Crédito"
                ) {
                    decisao = "INCLUIR";
                } else if (
                    movimento.natureza === "Débito" ||
                    movimento.classificacao === "Crédito excluído"
                ) {
                    decisao = "EXCLUIR";
                }

                const meta = [
                    `[ID:${movimento.id}]`,
                    `[BANCO:${movimento.banco}]`,
                    `[ARQUIVO:${movimento.arquivo}]`,
                    `[DECISAO:${decisao}]`
                ].join(" ");

                const indicador =
                    movimento.indicador ||
                    (
                        movimento.natureza === "Crédito"
                            ? "C"
                            : movimento.natureza === "Débito"
                                ? "D"
                                : ""
                    );

                return [
                    movimento.data,
                    `${meta} ${movimento.historico}`.trim(),
                    `${formatarValorNumero(movimento.valor)}${indicador ? " " + indicador : ""}`
                ].join(" | ");
            })
            .join("\n");
    }

    /*
     * =========================================================
     * INTEGRAÇÃO COM media-movimentacao.js
     * =========================================================
     *
     * CORREÇÃO PRINCIPAL:
     *
     * Antes:
     *
     * PDF
     * -> extrair movimentações
     * -> transformar em texto
     * -> processarTexto()
     * -> interpretar novamente
     *
     * Agora:
     *
     * PDF
     * -> extrair movimentações
     * -> processarMovimentacoes()
     *
     * A movimentação extraída é exatamente a movimentação
     * entregue à calculadora.
     * =========================================================
     */

    function sincronizarComCalculadora(resultado) {
        if (!resultado) {
            return null;
        }

        resultado.textoConsolidado =
            gerarTextoConsolidado(
                resultado.movimentacoes
            );

        try {
            /*
             * Nova integração estruturada.
             */
            if (
                window.MediaMovimentacao &&
                typeof window.MediaMovimentacao.processarMovimentacoes ===
                "function"
            ) {
                resultado.resultadoCalculadora =
                    window.MediaMovimentacao.processarMovimentacoes(
                        prepararMovimentacoesParaCalculadora(
                            resultado.movimentacoes
                        ),
                        {
                            competenciasDocumentadas:
                                resultado.competencias
                        }
                    );

                sincronizarClassificacaoDaCalculadora(
                    resultado
                );

                return resultado.resultadoCalculadora;
            }

            /*
             * Compatibilidade temporária caso o JS principal
             * ainda seja uma versão antiga.
             */
            if (
                window.MediaMovimentacao &&
                typeof window.MediaMovimentacao.processarTexto ===
                "function"
            ) {
                console.warn(
                    "MediaMovimentacao.processarMovimentacoes não encontrado. Utilizando processarTexto como compatibilidade."
                );

                resultado.resultadoCalculadora =
                    window.MediaMovimentacao.processarTexto(
                        resultado.textoConsolidado,
                        {
                            competenciasDocumentadas:
                                resultado.competencias
                        }
                    );

                return resultado.resultadoCalculadora;
            }

            if (
                typeof window.processarMovimentacoesMovimentacao ===
                "function"
            ) {
                resultado.resultadoCalculadora =
                    window.processarMovimentacoesMovimentacao(
                        prepararMovimentacoesParaCalculadora(
                            resultado.movimentacoes
                        ),
                        {
                            competenciasDocumentadas:
                                resultado.competencias
                        }
                    );

                sincronizarClassificacaoDaCalculadora(
                    resultado
                );

                return resultado.resultadoCalculadora;
            }

            if (
                typeof window.processarTextoMovimentacao ===
                "function"
            ) {
                resultado.resultadoCalculadora =
                    window.processarTextoMovimentacao(
                        resultado.textoConsolidado,
                        {
                            competenciasDocumentadas:
                                resultado.competencias
                        }
                    );

                return resultado.resultadoCalculadora;
            }

            console.error(
                "media-movimentacao.js não foi carregado ou não expôs a API esperada."
            );
        } catch (erro) {
            console.error(
                "Erro ao enviar movimentações para media-movimentacao.js:",
                erro
            );
        }

        return null;
    }

    function prepararMovimentacoesParaCalculadora(movimentacoes) {
        return (movimentacoes || []).map(movimento => {
            let decisao = "";

            /*
             * Só enviamos decisão explícita quando a seleção
             * foi alterada manualmente.
             */
            if (movimento.decisaoManual === "INCLUIR") {
                decisao = "INCLUIR";
            }

            if (movimento.decisaoManual === "EXCLUIR") {
                decisao = "EXCLUIR";
            }

            return {
                id:
                    movimento.id,

                origem:
                    "ocr",

                ordem:
                    movimento.ordem,

                data:
                    movimento.data,

                documento:
                    movimento.documento,

                historico:
                    movimento.historico,

                historicoCompleto:
                    movimento.historicoCompleto,

                detalhes:
                    Array.isArray(movimento.detalhes)
                        ? movimento.detalhes.slice()
                        : [],

                valor:
                    Number(movimento.valor || 0),

                indicador:
                    movimento.indicador,

                natureza:
                    movimento.natureza,

                decisao
            };
        });
    }

    /*
     * Depois da classificação oficial, refletimos a decisão
     * também na grade do OCR.
     */
    function sincronizarClassificacaoDaCalculadora(resultado) {
        if (
            !resultado ||
            !resultado.resultadoCalculadora
        ) {
            return;
        }

        const retorno =
            resultado.resultadoCalculadora;

        const todas = [];

        if (Array.isArray(retorno.consideradas)) {
            retorno.consideradas.forEach(item => {
                todas.push({
                    ...item,
                    consideradoFinal: true
                });
            });
        }

        if (Array.isArray(retorno.excluidas)) {
            retorno.excluidas.forEach(item => {
                todas.push({
                    ...item,
                    consideradoFinal: false
                });
            });
        }

        const mapa = new Map();

        todas.forEach(item => {
            if (item && item.id) {
                mapa.set(
                    String(item.id),
                    item
                );
            }
        });

        resultado.movimentacoes.forEach(movimento => {
            const oficial =
                mapa.get(
                    String(movimento.id)
                );

            if (!oficial) {
                return;
            }

            movimento.considerar =
                oficial.consideradoFinal === true;

            if (
                oficial.motivo &&
                !movimento.decisaoManual
            ) {
                movimento.motivo =
                    oficial.motivo;
            }

            if (oficial.consideradoFinal) {
                movimento.classificacao =
                    movimento.decisaoManual === "INCLUIR"
                        ? "Crédito confirmado manualmente"
                        : "Crédito";

                if (
                    movimento.natureza === "-"
                ) {
                    movimento.natureza =
                        "Crédito";
                }
            } else {
                if (
                    movimento.indicador === "D" ||
                    movimento.natureza === "Débito"
                ) {
                    movimento.classificacao =
                        "Débito";
                } else {
                    movimento.classificacao =
                        "Crédito excluído";
                }
            }
        });
    }

    /*
     * =========================================================
     * RESULTADOS OCR
     * =========================================================
     */

    function renderizarResultadoOCR(resultado) {
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
                ? resultado.instituicoes.join(", ")
                : "Não identificadas"
        );

        setTexto(
            "ocrQuantidadeArquivos",
            String(resultado.documentos.length)
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

    function renderizarDocumentosOCR(documentos) {
        const elemento =
            document.getElementById(
                "listaDocumentosOCR"
            );

        if (!elemento) {
            return;
        }

        elemento.innerHTML =
            documentos.length
                ? documentos.map(documento => `
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
                `).join("")
                : '<div class="sem-dados">Nenhum documento processado.</div>';
    }

    function rotuloTipoDocumento(tipo) {
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

    function renderizarAlertasOCR(alertas) {
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

    /*
     * =========================================================
     * TABELA DE MOVIMENTAÇÕES OCR
     * =========================================================
     */

    function renderizarTabelaMovimentacoesOCR(resultado) {
        const tabela =
            document.getElementById(
                "tabelaMovimentacoesOCR"
            );

        if (!tabela) {
            return;
        }

        const tbody =
            tabela.querySelector("tbody");

        if (!tbody) {
            return;
        }

        if (!resultado.movimentacoes.length) {
            tbody.innerHTML =
                '<tr><td colspan="8" class="sem-dados">Nenhuma movimentação identificada.</td></tr>';
            return;
        }

        tbody.innerHTML =
            resultado.movimentacoes
                .map((movimento, indice) => `
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
                `)
                .join("");

        tbody
            .querySelectorAll(
                ".check-movimentacao-ocr"
            )
            .forEach(checkbox => {
                checkbox.addEventListener(
                    "change",
                    () => {
                        const indice =
                            Number(
                                checkbox.dataset.indice
                            );

                        const movimento =
                            resultadoLeituraOCR &&
                            resultadoLeituraOCR
                                .movimentacoes[indice];

                        if (!movimento) {
                            return;
                        }

                        /*
                         * Não alteramos o indicador original.
                         *
                         * Se o extrato informou D, ele continua D.
                         * A seleção manual é armazenada à parte.
                         */
                        movimento.decisaoManual =
                            checkbox.checked
                                ? "INCLUIR"
                                : "EXCLUIR";

                        movimento.considerar =
                            checkbox.checked;

                        if (checkbox.checked) {
                            movimento.classificacao =
                                "Crédito confirmado manualmente";

                            movimento.motivo =
                                "Movimentação incluída manualmente.";
                        } else {
                            movimento.classificacao =
                                movimento.natureza === "Débito"
                                    ? "Débito"
                                    : "Crédito excluído";

                            movimento.motivo =
                                "Movimentação excluída manualmente.";
                        }

                        recalcularAposAlteracaoManual();
                    }
                );
            });
    }

    function alterarSelecaoMovimentacoes(marcar) {
        if (!resultadoLeituraOCR) {
            return;
        }

        resultadoLeituraOCR
            .movimentacoes
            .forEach(movimento => {
                /*
                 * Não permitir "Selecionar todos" transformar
                 * débito explícito D em crédito.
                 */
                if (
                    marcar &&
                    movimento.indicador === "D"
                ) {
                    movimento.considerar = false;
                    movimento.decisaoManual = "";

                    return;
                }

                movimento.considerar = marcar;

                movimento.decisaoManual =
                    marcar
                        ? "INCLUIR"
                        : "EXCLUIR";

                if (marcar) {
                    movimento.classificacao =
                        "Crédito confirmado manualmente";

                    movimento.motivo =
                        "Movimentação incluída manualmente.";
                } else {
                    movimento.classificacao =
                        movimento.natureza === "Débito"
                            ? "Débito"
                            : "Crédito excluído";

                    movimento.motivo =
                        "Movimentação excluída manualmente.";
                }
            });

        recalcularAposAlteracaoManual();
    }

    function recalcularAposAlteracaoManual() {
        if (!resultadoLeituraOCR) {
            return;
        }

        /*
         * Toda alteração volta para a mesma calculadora.
         */
        sincronizarComCalculadora(
            resultadoLeituraOCR
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
     * CÁLCULOS DA ÁREA OCR
     * =========================================================
     *
     * Estes cards são apenas uma representação do resultado.
     *
     * Quando media-movimentacao.js estiver disponível,
     * TOTAL, MÉDIA e MESES vêm diretamente dele.
     * =========================================================
     */

    function atualizarCalculosOCR(resultado) {
        const resultadoOficial =
            obterResultadoOficialCalculadora(
                resultado
            );

        const creditos =
            obterCreditosOficiais(
                resultado,
                resultadoOficial
            );

        const porMes = {};
        const porBanco = {};

        creditos.forEach(movimento => {
            const data =
                parseDataBR(
                    movimento.data
                );

            if (!data) {
                return;
            }

            const competencia =
                `${String(data.getMonth() + 1).padStart(2, "0")}/${data.getFullYear()}`;

            if (!porMes[competencia]) {
                porMes[competencia] = {
                    quantidade: 0,
                    totalCentavos: 0,
                    bancos: new Set()
                };
            }

            porMes[competencia].quantidade++;

            porMes[competencia].totalCentavos +=
                valorParaCentavos(
                    movimento.valor
                );

            porMes[competencia].bancos.add(
                movimento.banco ||
                "Não identificado"
            );

            const banco =
                movimento.banco ||
                "Não identificado";

            if (!porBanco[banco]) {
                porBanco[banco] = {
                    quantidade: 0,
                    totalCentavos: 0,
                    competencias: new Set()
                };
            }

            porBanco[banco].quantidade++;

            porBanco[banco].totalCentavos +=
                valorParaCentavos(
                    movimento.valor
                );

            porBanco[banco].competencias.add(
                competencia
            );
        });

        let total = 0;
        let meses = 0;
        let media = 0;
        let competencias = [];

        /*
         * Se a calculadora oficial estiver disponível,
         * usamos exatamente seus números.
         */
        if (resultadoOficial) {
            total =
                Number(
                    resultadoOficial.total || 0
                );

            meses =
                Number(
                    resultadoOficial.meses || 0
                );

            media =
                Number(
                    resultadoOficial.media || 0
                );

            competencias =
                Array.isArray(
                    resultadoOficial.competencias
                )
                    ? resultadoOficial.competencias.slice()
                    : [];
        } else {
            const totalCentavos =
                creditos.reduce(
                    (soma, movimento) =>
                        soma +
                        valorParaCentavos(
                            movimento.valor
                        ),
                    0
                );

            total =
                totalCentavos / 100;

            competencias =
                Array.isArray(resultado.competencias)
                    ? resultado.competencias.slice()
                    : [];

            meses =
                competencias.length;

            media =
                meses > 0
                    ? Math.round(
                        totalCentavos / meses
                    ) / 100
                    : 0;
        }

        let maiorMes = "-";
        let maiorValorCentavos = -1;

        Object.entries(porMes).forEach(
            ([mes, dados]) => {
                if (
                    dados.totalCentavos >
                    maiorValorCentavos
                ) {
                    maiorValorCentavos =
                        dados.totalCentavos;

                    maiorMes = mes;
                }
            }
        );

        setTextoMultiplos(
            [
                "ocrMediaMensal",
                "mediaMensalPreliminarOCR"
            ],
            formatarMoeda(media)
        );

        setTextoMultiplos(
            [
                "ocrTotalCreditosValidos",
                "ocrTotalCreditos",
                "totalCreditosValidosOCR"
            ],
            formatarMoeda(total)
        );

        setTextoMultiplos(
            [
                "ocrMesesConsiderados",
                "mesesConsideradosOCR"
            ],
            String(meses)
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
            porBanco,
            competencias
        );
    }

    function obterResultadoOficialCalculadora(resultado) {
        if (
            resultado &&
            resultado.resultadoCalculadora &&
            resultado.resultadoCalculadora.resultado
        ) {
            return resultado.resultadoCalculadora.resultado;
        }

        if (
            window.MediaMovimentacao &&
            typeof window.MediaMovimentacao.obterResultado ===
            "function"
        ) {
            try {
                return window.MediaMovimentacao.obterResultado();
            } catch (erro) {
                console.error(
                    "Erro ao obter resultado oficial:",
                    erro
                );
            }
        }

        return null;
    }

    function obterCreditosOficiais(
        resultado,
        resultadoOficial
    ) {
        /*
         * Resultado retornado diretamente por calcularResultado.
         */
        if (
            resultadoOficial &&
            Array.isArray(
                resultadoOficial.consideradasPeriodo
            )
        ) {
            return resultadoOficial
                .consideradasPeriodo
                .map(item =>
                    localizarMovimentoOriginal(
                        resultado,
                        item
                    )
                )
                .filter(Boolean);
        }

        /*
         * Resultado retornado por processarMovimentacoes().
         */
        if (
            resultado &&
            resultado.resultadoCalculadora &&
            Array.isArray(
                resultado.resultadoCalculadora.consideradas
            )
        ) {
            return resultado
                .resultadoCalculadora
                .consideradas
                .map(item =>
                    localizarMovimentoOriginal(
                        resultado,
                        item
                    )
                )
                .filter(Boolean);
        }

        return resultado.movimentacoes.filter(
            movimento =>
                movimento.considerar === true &&
                movimento.indicador !== "D"
        );
    }

    function localizarMovimentoOriginal(
        resultado,
        movimentoCalculadora
    ) {
        if (!movimentoCalculadora) {
            return null;
        }

        const original =
            resultado.movimentacoes.find(
                item =>
                    String(item.id) ===
                    String(movimentoCalculadora.id)
            );

        if (original) {
            return original;
        }

        return {
            ...movimentoCalculadora,
            banco:
                movimentoCalculadora.banco ||
                "Não identificado"
        };
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
            tabela.querySelector("tbody");

        if (!tbody) {
            return;
        }

        if (!competencias.length) {
            tbody.innerHTML =
                '<tr><td colspan="4" class="sem-dados">Nenhuma competência identificada.</td></tr>';
            return;
        }

        tbody.innerHTML =
            competencias
                .map(competencia => {
                    const partes =
                        competencia.split("-");

                    const chave =
                        `${partes[1]}/${partes[0]}`;

                    const dados =
                        porMes[chave] || {
                            quantidade: 0,
                            totalCentavos: 0,
                            bancos: new Set()
                        };

                    return `
                        <tr>
                            <td>${escaparHTML(chave)}</td>
                            <td>${dados.quantidade}</td>
                            <td>${escaparHTML(Array.from(dados.bancos).join(", ") || "-")}</td>
                            <td>${formatarMoeda(dados.totalCentavos / 100)}</td>
                        </tr>
                    `;
                })
                .join("");
    }

    function renderizarTabelaBancos(
        porBanco,
        competenciasGerais
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
            tabela.querySelector("tbody");

        if (!tbody) {
            return;
        }

        const entradas =
            Object.entries(porBanco);

        if (!entradas.length) {
            tbody.innerHTML =
                '<tr><td colspan="4" class="sem-dados">Nenhum crédito considerado.</td></tr>';
            return;
        }

        /*
         * Para a média por instituição usamos o mesmo período
         * global documentado, não apenas os meses em que aquele
         * banco teve crédito.
         *
         * Isso evita inflar a média de uma instituição que teve
         * crédito em apenas parte do período.
         */
        const mesesGlobais =
            Math.max(
                1,
                Array.isArray(competenciasGerais)
                    ? competenciasGerais.length
                    : 0
            );

        tbody.innerHTML =
            entradas
                .map(([banco, dados]) => `
                    <tr>
                        <td>${escaparHTML(banco)}</td>
                        <td>${dados.quantidade}</td>
                        <td>${formatarMoeda(dados.totalCentavos / 100)}</td>
                        <td>${formatarMoeda((dados.totalCentavos / 100) / mesesGlobais)}</td>
                    </tr>
                `)
                .join("");
    }

    /*
     * =========================================================
     * RESUMO
     * =========================================================
     */

    function atualizarResumoLeitura(resultado) {
        const textarea =
            document.getElementById(
                "resumoLeituraOCR"
            );

        if (!textarea) {
            return;
        }

        const oficial =
            obterResultadoOficialCalculadora(
                resultado
            );

        const creditos =
            obterCreditosOficiais(
                resultado,
                oficial
            );

        const total =
            oficial
                ? Number(oficial.total || 0)
                : creditos.reduce(
                    (soma, movimento) =>
                        soma +
                        Number(
                            movimento.valor || 0
                        ),
                    0
                );

        const meses =
            oficial
                ? Number(oficial.meses || 0)
                : (
                    Array.isArray(resultado.competencias)
                        ? resultado.competencias.length
                        : 0
                );

        const media =
            oficial
                ? Number(oficial.media || 0)
                : (
                    meses > 0
                        ? total / meses
                        : 0
                );

        const competencias =
            oficial &&
                Array.isArray(oficial.competencias)
                ? oficial.competencias
                : resultado.competencias;

        textarea.value = [
            "RESUMO DA LEITURA DOS EXTRATOS",
            `Arquivos processados: ${resultado.documentos.length}`,
            `Titular: ${resultado.titular || "Não identificado"}`,
            `CPF/CNPJ: ${resultado.documentoTitular ? formatarDocumento(resultado.documentoTitular) : "Não identificado"}`,
            `Instituições: ${resultado.instituicoes.length ? resultado.instituicoes.join(", ") : "Não identificadas"}`,
            `Período válido: ${formatarPeriodo(resultado.primeiraData, resultado.ultimaData)}`,
            `Competências válidas: ${competencias && competencias.length ? competencias.map(formatarCompetencia).join(", ") : "Não identificadas"}`,
            `Movimentações identificadas: ${resultado.movimentacoes.length}`,
            `Créditos considerados: ${creditos.length}`,
            `Total dos créditos considerados: ${formatarMoeda(total)}`,
            `Meses considerados: ${meses}`,
            `Média mensal: ${formatarMoeda(media)}`
        ].join("\n");
    }

    /*
     * =========================================================
     * APLICAR AO CÁLCULO
     * =========================================================
     */

    function aplicarLeituraAoCalculo() {
        if (!resultadoLeituraOCR) {
            alert(
                "Nenhum extrato foi processado."
            );
            return;
        }

        sincronizarComCalculadora(
            resultadoLeituraOCR
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

        const card =
            document.getElementById(
                "cardResultadoMovimentacao"
            );

        if (card) {
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

    function identificarDadosTitular(texto) {
        const linhas =
            prepararLinhas(texto);

        let nome = "";
        let documento = "";

        for (
            let indice = 0;
            indice < linhas.length;
            indice++
        ) {
            const linha =
                linhas[indice];

            const conta =
                linha.match(
                    /CONTA:\s*[^/]+\/\s*(.+)$/i
                );

            if (
                conta &&
                pareceNome(conta[1])
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
                validarCPF(cpf[0])
            ) {
                documento =
                    cpf[0].replace(/\D/g, "");

                break;
            }

            const cnpj =
                linha.match(
                    /\b\d{2}\.?\d{3}\.?\d{3}[\/\s-]?\d{4}-?\d{2}\b/
                );

            if (
                cnpj &&
                validarCNPJ(cnpj[0])
            ) {
                documento =
                    cnpj[0].replace(/\D/g, "");
            }
        }

        return {
            nome,
            documento
        };
    }

    function pareceNome(valor) {
        const texto =
            String(valor || "").trim();

        return (
            texto.length >= 5 &&
            /[A-ZÀ-Ú]/i.test(texto)
        );
    }

    /*
     * =========================================================
     * PERÍODO
     * =========================================================
     */

    function recalcularPeriodo(resultado) {
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
            resultado.primeiraData = null;
            resultado.ultimaData = null;

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
     * DATAS
     * =========================================================
     */

    function extrairDataFlexivel(
        texto,
        anoPadrao
    ) {
        /*
         * Primeiro tenta data completa.
         */
        let match =
            String(texto || "").match(
                /\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\b/
            );

        if (match) {
            let ano =
                Number(match[3]);

            if (ano < 100) {
                ano += 2000;
            }

            return criarDataInfo(
                Number(match[1]),
                Number(match[2]),
                ano
            );
        }

        /*
         * Depois tenta DD/MM utilizando o ano principal
         * encontrado no documento.
         */
        match =
            String(texto || "").match(
                /\b(\d{1,2})[\/.-](\d{1,2})\b/
            );

        if (!match || !anoPadrao) {
            return null;
        }

        return criarDataInfo(
            Number(match[1]),
            Number(match[2]),
            Number(anoPadrao)
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
            data.getFullYear() !== ano ||
            data.getMonth() !== mes - 1 ||
            data.getDate() !== dia
        ) {
            return null;
        }

        return {
            data,

            dataTexto:
                `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${ano}`
        };
    }

    function parseDataBR(valor) {
        const match =
            String(valor || "").match(
                /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
            );

        if (!match) {
            return null;
        }

        const info =
            criarDataInfo(
                Number(match[1]),
                Number(match[2]),
                Number(match[3])
            );

        return info
            ? info.data
            : null;
    }

    function identificarAnoPrincipal(texto) {
        const anos =
            String(texto || "").match(
                /\b20\d{2}\b/g
            ) || [];

        if (!anos.length) {
            return new Date().getFullYear();
        }

        const mapa =
            new Map();

        anos.forEach(valor => {
            const ano =
                Number(valor);

            mapa.set(
                ano,
                (mapa.get(ano) || 0) + 1
            );
        });

        return Array.from(
            mapa.entries()
        )
            .sort(
                (a, b) =>
                    b[1] - a[1]
            )[0][0];
    }

    function obterCompetenciaData(data) {
        return (
            data.getFullYear() +
            "-" +
            String(
                data.getMonth() + 1
            ).padStart(2, "0")
        );
    }

    /*
     * =========================================================
     * VALORES
     * =========================================================
     */

    function extrairOcorrenciasMonetarias(texto) {
        const resultado = [];

        const regex =
            /(?:R\$\s*)?(-?\s*(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2})\s*([CD])?/gi;

        let match;

        while (
            (
                match =
                regex.exec(
                    String(texto || "")
                )
            ) !== null
        ) {
            const valor =
                converterMoeda(
                    match[1]
                );

            if (!Number.isFinite(valor)) {
                continue;
            }

            resultado.push({
                valor,

                indicador:
                    String(
                        match[2] || ""
                    ).toUpperCase(),

                indice:
                    match.index,

                fim:
                    regex.lastIndex
            });
        }

        return resultado;
    }

    function converterMoeda(valor) {
        if (
            typeof valor === "number"
        ) {
            return valor;
        }

        let texto =
            String(valor || "")
                .replace(/\s/g, "")
                .replace(/[^\d,.-]/g, "");

        if (!texto) {
            return NaN;
        }

        const negativo =
            texto.startsWith("-");

        texto =
            texto.replace(/-/g, "");

        if (texto.includes(",")) {
            texto =
                texto
                    .replace(/\./g, "")
                    .replace(",", ".");
        } else {
            const pontos =
                (texto.match(/\./g) || []).length;

            if (pontos > 1) {
                texto =
                    texto.replace(/\./g, "");
            }
        }

        const numero =
            Number(texto);

        if (!Number.isFinite(numero)) {
            return NaN;
        }

        return negativo
            ? -numero
            : numero;
    }

    function valorParaCentavos(valor) {
        const numero =
            Number(valor || 0);

        if (!Number.isFinite(numero)) {
            return 0;
        }

        return Math.round(
            numero * 100
        );
    }

    /*
     * =========================================================
     * UTILITÁRIOS DE TEXTO
     * =========================================================
     */

    function prepararLinhas(texto) {
        return String(texto || "")
            .replace(/\r/g, "")
            .split("\n")
            .map(linha =>
                linha
                    .replace(/\u00a0/g, " ")
                    .replace(/\s+/g, " ")
                    .trim()
            )
            .filter(Boolean);
    }

    function limparHistoricoGenerico(texto) {
        return String(texto || "")
            .replace(
                /\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/g,
                " "
            )
            .replace(
                /(?:R\$\s*)?-?\s*(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2}\s*[CD]?/gi,
                " "
            )
            .replace(/\s+/g, " ")
            .trim();
    }

    function converterHTMLParaTexto(html) {
        const documento =
            new DOMParser()
                .parseFromString(
                    String(html || ""),
                    "text/html"
                );

        return documento.body
            ? documento.body.innerText
            : "";
    }

    function normalizar(texto) {
        return String(texto || "")
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .replace(/\s+/g, " ")
            .trim()
            .toUpperCase();
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

    /*
     * =========================================================
     * FORMATAÇÃO
     * =========================================================
     */

    function formatarMoeda(valor) {
        return Number(valor || 0)
            .toLocaleString(
                "pt-BR",
                {
                    style: "currency",
                    currency: "BRL",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            );
    }

    function formatarValorNumero(valor) {
        return Number(valor || 0)
            .toLocaleString(
                "pt-BR",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            );
    }

    function formatarTamanhoArquivo(bytes) {
        const numero =
            Number(bytes || 0);

        if (numero < 1024) {
            return `${numero} B`;
        }

        if (numero < 1048576) {
            return `${(numero / 1024).toFixed(1)} KB`;
        }

        return `${(numero / 1048576).toFixed(2)} MB`;
    }

    function formatarPeriodo(inicio, fim) {
        if (!inicio && !fim) {
            return "Não identificado";
        }

        if (inicio && fim) {
            return (
                `${inicio.toLocaleDateString("pt-BR")} a ` +
                `${fim.toLocaleDateString("pt-BR")}`
            );
        }

        return (inicio || fim)
            .toLocaleDateString("pt-BR");
    }

    function formatarCompetencia(competencia) {
        const partes =
            String(competencia || "")
                .split("-");

        return partes.length === 2
            ? `${partes[1]}/${partes[0]}`
            : competencia;
    }

    function formatarDocumento(documento) {
        const numero =
            String(documento || "")
                .replace(/\D/g, "");

        if (numero.length === 11) {
            return numero.replace(
                /(\d{3})(\d{3})(\d{3})(\d{2})/,
                "$1.$2.$3-$4"
            );
        }

        if (numero.length === 14) {
            return numero.replace(
                /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
                "$1.$2.$3/$4-$5"
            );
        }

        return numero;
    }

    /*
     * =========================================================
     * CPF
     * =========================================================
     */

    function validarCPF(cpf) {
        cpf =
            String(cpf || "")
                .replace(/\D/g, "");

        if (
            !/^\d{11}$/.test(cpf) ||
            /^(\d)\1{10}$/.test(cpf)
        ) {
            return false;
        }

        let soma = 0;

        for (
            let i = 0;
            i < 9;
            i++
        ) {
            soma +=
                Number(cpf[i]) *
                (10 - i);
        }

        let digito =
            (soma * 10) % 11;

        if (digito === 10) {
            digito = 0;
        }

        if (
            digito !==
            Number(cpf[9])
        ) {
            return false;
        }

        soma = 0;

        for (
            let i = 0;
            i < 10;
            i++
        ) {
            soma +=
                Number(cpf[i]) *
                (11 - i);
        }

        digito =
            (soma * 10) % 11;

        if (digito === 10) {
            digito = 0;
        }

        return (
            digito ===
            Number(cpf[10])
        );
    }

    /*
     * =========================================================
     * CNPJ
     * =========================================================
     */

    function validarCNPJ(cnpj) {
        cnpj =
            String(cnpj || "")
                .replace(/\D/g, "");

        if (
            !/^\d{14}$/.test(cnpj) ||
            /^(\d)\1{13}$/.test(cnpj)
        ) {
            return false;
        }

        const calcular = base => {
            let peso =
                base.length === 12
                    ? 5
                    : 6;

            let soma = 0;

            for (const caractere of base) {
                soma +=
                    Number(caractere) *
                    peso;

                peso--;

                if (peso === 1) {
                    peso = 9;
                }
            }

            const resto =
                soma % 11;

            return resto < 2
                ? 0
                : 11 - resto;
        };

        const d1 =
            calcular(
                cnpj.slice(0, 12)
            );

        const d2 =
            calcular(
                cnpj.slice(0, 12) +
                d1
            );

        return cnpj.endsWith(
            String(d1) +
            String(d2)
        );
    }

    /*
     * =========================================================
     * DOM
     * =========================================================
     */

    function setTexto(id, valor) {
        const elemento =
            document.getElementById(id);

        if (elemento) {
            elemento.textContent = valor;
        }
    }

    function setTextoMultiplos(ids, valor) {
        (ids || []).forEach(id => {
            setTexto(id, valor);
        });
    }

    function obterPrimeiroElemento(ids) {
        for (const id of ids || []) {
            const elemento =
                document.getElementById(id);

            if (elemento) {
                return elemento;
            }
        }

        return null;
    }

    function escaparHTML(valor) {
        return String(valor ?? "")
            .replace(
                /[&<>"']/g,
                caractere => ({
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#039;"
                }[caractere])
            );
    }

    function definirStatus(texto, tipo) {
        const elemento =
            document.getElementById(
                "statusLeituraExtrato"
            );

        if (!elemento) {
            return;
        }

        elemento.textContent = texto;

        elemento.className =
            `status-leitura-ocr status-${tipo || "info"}`;
    }

    function mostrarResultadoOCR() {
        const card =
            document.getElementById(
                "cardResultadoLeituraExtratos"
            );

        if (card) {
            card.hidden = false;
        }
    }

    function ocultarResultadoOCR() {
        const card =
            document.getElementById(
                "cardResultadoLeituraExtratos"
            );

        if (card) {
            card.hidden = true;
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
            tabela.querySelector("tbody");

        if (tbody) {
            tbody.innerHTML =
                '<tr><td colspan="8" class="sem-dados">Nenhuma leitura realizada.</td></tr>';
        }
    }

    /*
     * =========================================================
     * API PÚBLICA
     * =========================================================
     */

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
                if (!resultadoLeituraOCR) {
                    return null;
                }

                sincronizarComCalculadora(
                    resultadoLeituraOCR
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

                return obterResultadoOficialCalculadora(
                    resultadoLeituraOCR
                );
            },

        aplicar:
            aplicarLeituraAoCalculo,

        sincronizar:
            () => {
                if (!resultadoLeituraOCR) {
                    return null;
                }

                return sincronizarComCalculadora(
                    resultadoLeituraOCR
                );
            }
    };

})();