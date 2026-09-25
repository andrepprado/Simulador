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

    const MESES_PT = {
        JAN: 1, JANEIRO: 1,
        FEV: 2, FEVEREIRO: 2,
        MAR: 3, MARCO: 3, "MARÇO": 3,
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

    const TERMOS_EXCLUSAO_CREDITO = [
        /\bEMPRESTIMO\b/,
        /\bFINANCIAMENTO\b/,
        /\bCREDITO PESSOAL\b/,
        /\bCREDITO CONSIGNADO\b/,
        /\bCAPITAL DE GIRO\b/,
        /\bLIBERACAO DE CREDITO\b/,
        /\bCREDITO ROTATIVO\b/,
        /\bCHEQUE ESPECIAL\b/,
        /\bLIMITE DE CREDITO\b/,
        /\bLIMITE DISPONIVEL\b/,
        /\bESTORNO\b/,
        /\bREVERSAO\b/,
        /\bCANCELAMENTO\b/,
        /\bDEVOLUCAO\b/,
        /\bREEMBOLSO\b/,
        /\bRDB\b/,
        /\bRDC\b/,
        /\bCDB\b/,
        /\bRESGATE\b/,
        /\bAPLICACAO\b/,
        /\bINVESTIMENTO\b/,
        /\bFUNDO DE INVESTIMENTO\b/,
        /\bRESGATE AUTOMATICO\b/,
        /\bANTECIPACAO DE CREDITO\b/,
        /\bADIANTAMENTO A DEPOSITANTE\b/
    ];

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

        if (input) input.addEventListener("change", e => adicionarArquivos(e.target.files));

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

        if (btnLer) btnLer.addEventListener("click", processarArquivosExtrato);
        if (btnLimpar) btnLimpar.addEventListener("click", limparArquivosExtrato);
        if (btnAplicar) btnAplicar.addEventListener("click", aplicarLeituraAoCalculo);
        if (btnCopiar) btnCopiar.addEventListener("click", copiarResumoLeitura);
        if (btnTodos) btnTodos.addEventListener("click", () => alterarSelecaoMovimentacoes(true));
        if (btnNenhum) btnNenhum.addEventListener("click", () => alterarSelecaoMovimentacoes(false));

        renderizarArquivosSelecionados();
    }

    function adicionarArquivos(fileList) {
        const permitidos = ["pdf", "png", "jpg", "jpeg", "webp", "txt", "csv", "html", "htm"];

        Array.from(fileList || []).forEach(file => {
            const ext = obterExtensao(file.name);

            if (!permitidos.includes(ext)) return;

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
        if (input) input.value = "";

        renderizarArquivosSelecionados();
    }

    function renderizarArquivosSelecionados() {
        const lista = document.getElementById("listaArquivosExtrato");
        const quantidade = document.getElementById("quantidadeArquivosExtrato");
        const btnLer = document.getElementById("btnLerExtratos");
        const btnLimpar = document.getElementById("btnLimparArquivosExtrato");

        if (quantidade) quantidade.textContent = arquivosExtratoSelecionados.length;
        if (btnLer) btnLer.disabled = !arquivosExtratoSelecionados.length;
        if (btnLimpar) btnLimpar.disabled = !arquivosExtratoSelecionados.length;

        if (!lista) return;

        if (!arquivosExtratoSelecionados.length) {
            lista.innerHTML = '<div class="sem-dados">Nenhum arquivo selecionado.</div>';
            return;
        }

        lista.innerHTML = arquivosExtratoSelecionados.map((arquivo, i) => `
<div class="arquivo-extrato-item">
<div class="arquivo-extrato-info">
<div class="arquivo-extrato-icone">${escaparHTML(obterExtensao(arquivo.name).toUpperCase())}</div>
<div class="arquivo-extrato-dados">
<strong>${escaparHTML(arquivo.name)}</strong>
<span>${formatarTamanhoArquivo(arquivo.size)}</span>
</div>
</div>
<button type="button" class="btn-remover-arquivo" data-indice="${i}" title="Remover arquivo">×</button>
</div>`).join("");

        lista.querySelectorAll(".btn-remover-arquivo").forEach(btn => {
            btn.addEventListener("click", () => {
                arquivosExtratoSelecionados.splice(Number(btn.dataset.indice), 1);
                renderizarArquivosSelecionados();
            });
        });
    }

    function limparArquivosExtrato() {
        arquivosExtratoSelecionados = [];
        resultadoLeituraOCR = null;

        const input = document.getElementById("arquivosExtrato");
        if (input) input.value = "";

        renderizarArquivosSelecionados();
        ocultarResultadoOCR();
        limparTabelaMovimentacoesOCR();
        limparResumoOCR();
        definirStatus("Pronto para ler os extratos.", "info");
    }

    function limparResumoOCR() {
        setTextoMultiplos(["ocrMediaMensal", "mediaMensalPreliminarOCR"], "R$ 0,00");
        setTextoMultiplos(["ocrTotalCreditosValidos", "ocrTotalCreditos", "totalCreditosValidosOCR"], "R$ 0,00");
        setTextoMultiplos(["ocrMesesConsiderados", "mesesConsideradosOCR"], "0");
        setTextoMultiplos(["ocrMaiorMes", "ocrMesMaiorMovimentacao", "mesMaiorMovimentacaoOCR"], "-");

        limparTabelaPorIds(
            ["tabelaResumoMensalOCR", "tabelaCreditosMesOCR", "tabelaCreditosPorMes"],
            4,
            "Nenhuma leitura realizada."
        );

        limparTabelaPorIds(
            ["tabelaResumoBancosOCR", "tabelaResumoInstituicaoOCR", "tabelaResumoInstituicao"],
            4,
            "Nenhuma leitura realizada."
        );
    }

    async function processarArquivosExtrato() {
        if (!arquivosExtratoSelecionados.length) return;

        const btn = document.getElementById("btnLerExtratos");

        if (btn) {
            btn.disabled = true;
            btn.textContent = "Processando...";
        }

        definirStatus("Preparando leitura dos arquivos...", "processando");

        const resultado = {
            documentos: [],
            movimentacoes: [],
            alertas: [],
            textoConsolidado: "",
            competencias: new Set(),
            instituicoes: new Set(),
            titular: "",
            documentoTitular: "",
            identidadePontuacao: -1,
            primeiraData: null,
            ultimaData: null
        };

        try {
            for (let i = 0; i < arquivosExtratoSelecionados.length; i++) {
                const arquivo = arquivosExtratoSelecionados[i];

                definirStatus(
                    `Processando ${i + 1} de ${arquivosExtratoSelecionados.length}: ${arquivo.name}`,
                    "processando"
                );

                try {
                    const documento = await lerArquivoExtrato(arquivo, i);

                    documento.banco = identificarInstituicao(documento.texto);
                    documento.tipoDocumento = identificarTipoDocumento(documento.texto, documento.banco);
                    documento.excluidoDaApuracao = documento.tipoDocumento !== TIPOS_DOCUMENTO.EXTRATO_CONTA;
                    documento.motivoExclusao = obterMotivoExclusaoDocumento(documento);

                    resultado.documentos.push(documento);

                    if (documento.banco) {
                        resultado.instituicoes.add(documento.banco);
                    }

                    if (!documento.texto) continue;

                    const identidade = identificarDadosTitular(documento.texto, documento.banco);

                    if (identidade.pontuacao > resultado.identidadePontuacao) {
                        if (identidade.nome) resultado.titular = identidade.nome;
                        if (identidade.documento) resultado.documentoTitular = identidade.documento;
                        resultado.identidadePontuacao = identidade.pontuacao;
                    }

                    if (documento.excluidoDaApuracao) {
                        resultado.alertas.push(
                            `${documento.nome}: ${documento.motivoExclusao}`
                        );
                        continue;
                    }

                    const competenciasDocumento = identificarCompetenciasDocumento(documento.texto);
                    competenciasDocumento.forEach(comp => resultado.competencias.add(comp));

                    const movimentos = extrairMovimentacoesDocumento(documento);

                    movimentos.forEach(m => {
                        resultado.movimentacoes.push(m);

                        const d = parseDataBR(m.data);

                        if (!d) return;

                        const comp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                        resultado.competencias.add(comp);

                        if (!resultado.primeiraData || d < resultado.primeiraData) {
                            resultado.primeiraData = d;
                        }

                        if (!resultado.ultimaData || d > resultado.ultimaData) {
                            resultado.ultimaData = d;
                        }
                    });
                } catch (erro) {
                    console.error("Erro processando", arquivo.name, erro);

                    resultado.alertas.push(
                        `${arquivo.name}: ${erro.message || "não foi possível realizar a leitura."}`
                    );

                    resultado.documentos.push({
                        id: `ERRO${i + 1}`,
                        nome: arquivo.name,
                        tamanho: arquivo.size,
                        metodo: "Erro",
                        banco: "",
                        texto: "",
                        tipoDocumento: TIPOS_DOCUMENTO.DESCONHECIDO,
                        excluidoDaApuracao: true,
                        motivoExclusao: "Falha na leitura do documento.",
                        erro: String(erro.message || erro)
                    });
                }
            }

            resultado.competencias = Array.from(resultado.competencias).sort();
            resultado.instituicoes = Array.from(resultado.instituicoes);

            removerMovimentacoesDuplicadas(resultado);
            marcarPossiveisTransferenciasProprias(resultado);
            recalcularPeriodoComBaseNasMovimentacoes(resultado);

            resultado.textoConsolidado = gerarTextoConsolidado(resultado.movimentacoes);
            resultadoLeituraOCR = resultado;

            enviarMovimentacoesParaCalculadora(resultado);
            renderizarResultadoOCR(resultado);
            mostrarResultadoOCR();

            definirStatus(
                `Leitura concluída. ${resultado.documentos.length} arquivo(s) processado(s).`,
                "sucesso"
            );
        } catch (erro) {
            console.error(erro);
            definirStatus(`Erro durante a leitura: ${erro.message || erro}`, "erro");
        } finally {
            if (btn) {
                btn.disabled = !arquivosExtratoSelecionados.length;
                btn.textContent = "Ler e Consolidar";
            }
        }
    }

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

        if (["txt", "csv", "html", "htm"].includes(ext)) {
            base.metodo = "Leitura direta";
            base.texto = await arquivo.text();

            if (["html", "htm"].includes(ext)) {
                base.texto = converterHTMLParaTexto(base.texto);
            }

            return base;
        }

        if (["png", "jpg", "jpeg", "webp"].includes(ext)) {
            base.metodo = "OCR";
            base.texto = await executarOCRImagem(arquivo);
            return base;
        }

        if (ext === "pdf") {
            base.metodo = "PDF";
            base.texto = await lerPDF(arquivo);

            if (!base.texto || base.texto.replace(/\s/g, "").length < 30) {
                base.metodo = "PDF/OCR";
                base.texto = await lerPDFComOCR(arquivo);
            }

            return base;
        }

        throw new Error("Formato não suportado.");
    }

    async function lerPDF(arquivo) {
        if (typeof pdfjsLib === "undefined") {
            throw new Error("PDF.js não foi carregado.");
        }

        const buffer = await arquivo.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        const paginas = [];

        for (let numero = 1; numero <= pdf.numPages; numero++) {
            definirStatus(
                `Lendo ${arquivo.name} — página ${numero} de ${pdf.numPages}...`,
                "processando"
            );

            const page = await pdf.getPage(numero);
            const content = await page.getTextContent({
                normalizeWhitespace: true,
                disableCombineTextItems: false
            });

            const linhas = agruparItensPDFPorLinha(content.items);
            paginas.push(linhas.join("\n"));
        }

        return paginas.join("\n");
    }

    function agruparItensPDFPorLinha(items) {
        const grupos = [];

        (items || []).forEach(item => {
            const texto = String(item.str || "").trim();
            if (!texto) return;

            const x = item.transform ? Number(item.transform[4] || 0) : 0;
            const y = item.transform ? Number(item.transform[5] || 0) : 0;

            let grupo = grupos.find(g => Math.abs(g.y - y) <= 2.5);

            if (!grupo) {
                grupo = { y, itens: [] };
                grupos.push(grupo);
            }

            grupo.itens.push({ x, texto });
        });

        grupos.sort((a, b) => b.y - a.y);

        return grupos.map(grupo => {
            grupo.itens.sort((a, b) => a.x - b.x);

            return grupo.itens
                .map(i => i.texto)
                .join(" ")
                .replace(/\s+/g, " ")
                .trim();
        }).filter(Boolean);
    }

    async function lerPDFComOCR(arquivo) {
        if (typeof pdfjsLib === "undefined") {
            throw new Error("PDF.js não foi carregado.");
        }

        const buffer = await arquivo.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        const partes = [];

        for (let pagina = 1; pagina <= pdf.numPages; pagina++) {
            definirStatus(
                `OCR ${arquivo.name} — página ${pagina} de ${pdf.numPages}...`,
                "processando"
            );

            const page = await pdf.getPage(pagina);
            const viewport = page.getViewport({ scale: 2 });

            const canvas = document.createElement("canvas");
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);

            const ctx = canvas.getContext("2d", { willReadFrequently: true });

            await page.render({
                canvasContext: ctx,
                viewport
            }).promise;

            const blob = await new Promise((resolve, reject) => {
                canvas.toBlob(
                    b => b ? resolve(b) : reject(new Error("Falha ao converter página do PDF.")),
                    "image/png"
                );
            });

            partes.push(await executarOCRImagem(blob));

            canvas.width = 1;
            canvas.height = 1;
        }

        return partes.join("\n");
    }

    async function executarOCRImagem(arquivo) {
        if (typeof Tesseract === "undefined") {
            throw new Error("Tesseract.js não foi carregado.");
        }

        const resultado = await Tesseract.recognize(arquivo, "por", {
            logger: m => {
                if (!m || !m.status) return;

                const percentual = Number.isFinite(m.progress)
                    ? ` ${Math.round(m.progress * 100)}%`
                    : "";

                definirStatus(
                    `OCR: ${traduzirStatusOCR(m.status)}${percentual}`,
                    "processando"
                );
            }
        });

        return resultado && resultado.data
            ? String(resultado.data.text || "")
            : "";
    }

    function identificarTipoDocumento(texto, banco) {
        const t = normalizar(texto);

        const sinaisFaturaFortes = [
            "RESUMO DA FATURA",
            "TOTAL DA SUA FATURA",
            "TOTAL DESTA FATURA",
            "VALOR DA FATURA",
            "PAGAMENTO MINIMO",
            "MELHOR DATA DE COMPRA",
            "LIMITE DE CREDITO TOTAL",
            "LIMITE TOTAL DE CREDITO",
            "FATURA ATUAL",
            "FECHAMENTO DA FATURA"
        ];

        const sinaisFaturaAuxiliares = [
            "COMPRAS NACIONAIS",
            "COMPRAS INTERNACIONAIS",
            "ENCARGOS DA FATURA",
            "PARCELAMENTO DA FATURA",
            "LIMITE DISPONIVEL PARA COMPRAS"
        ];

        const fortes = sinaisFaturaFortes.filter(x => t.includes(x)).length;
        const auxiliares = sinaisFaturaAuxiliares.filter(x => t.includes(x)).length;

        if (fortes >= 1 && (auxiliares >= 1 || /\bFATURA\b/.test(t))) {
            return TIPOS_DOCUMENTO.FATURA_CARTAO;
        }

        if (
            /\b(RDB|CDB|RDC|FUNDO DE INVESTIMENTO|CARTEIRA DE INVESTIMENTOS)\b/.test(t) &&
            !/\b(PIX RECEBIDO|PIX ENVIADO|CONTA CORRENTE|DETALHE DOS MOVIMENTOS)\b/.test(t)
        ) {
            return TIPOS_DOCUMENTO.INVESTIMENTO;
        }

        const sinaisConta = [
            "CONTA CORRENTE",
            "EXTRATO DA CONTA",
            "EXTRATO DE CONTA",
            "DETALHE DOS MOVIMENTOS",
            "PIX RECEBIDO",
            "PIX ENVIADO",
            "TRANSFERENCIA RECEBIDA",
            "SALDO EM CONTA",
            "MOVIMENTACAO"
        ];

        if (banco === "Mercado Pago") {
            if (
                t.includes("DETALHE DOS MOVIMENTOS") ||
                t.includes("PIX RECEBIDO") ||
                t.includes("DINHEIRO RECEBIDO") ||
                t.includes("LIBERACAO DE DINHEIRO")
            ) {
                return TIPOS_DOCUMENTO.EXTRATO_CONTA;
            }
        }

        if (sinaisConta.some(x => t.includes(x))) {
            return TIPOS_DOCUMENTO.EXTRATO_CONTA;
        }

        return TIPOS_DOCUMENTO.DESCONHECIDO;
    }

    function obterMotivoExclusaoDocumento(documento) {
        if (documento.tipoDocumento === TIPOS_DOCUMENTO.FATURA_CARTAO) {
            return "Documento identificado como fatura de cartão. Compras, limite, juros, IOF e total da fatura não participam da média de movimentação da conta corrente.";
        }

        if (documento.tipoDocumento === TIPOS_DOCUMENTO.INVESTIMENTO) {
            return "Documento identificado como demonstrativo de investimento, sem movimentação segura de conta corrente para esta apuração.";
        }

        if (documento.tipoDocumento === TIPOS_DOCUMENTO.DESCONHECIDO) {
            return "Tipo de documento não identificado com segurança. Documento mantido fora da apuração automática.";
        }

        return "";
    }

    function extrairMovimentacoesDocumento(documento) {
        if (documento.tipoDocumento !== TIPOS_DOCUMENTO.EXTRATO_CONTA) {
            return [];
        }

        const banco = documento.banco || identificarInstituicao(documento.texto);

        if (banco === "Mercado Pago") {
            return extrairMercadoPago(documento);
        }

        if (banco === "Nubank") {
            return extrairNubank(documento);
        }

        if (banco === "Santander") {
            return extrairSantander(documento);
        }

        return extrairGenerico(documento);
    }

    function extrairMercadoPago(documento) {
        const linhas = prepararLinhas(documento.texto);
        const blocos = montarBlocosTransacionais(linhas, documento.texto);
        const movimentos = [];

        blocos.forEach(bloco => {
            const textoBloco = bloco.texto;
            const normal = normalizar(textoBloco);

            if (deveIgnorarBlocoMercadoPago(normal)) return;

            const valorInfo = extrairValorMovimentoMercadoPago(textoBloco);

            if (!valorInfo || !Number.isFinite(valorInfo.valor) || valorInfo.valor === 0) {
                return;
            }

            const operacao = classificarMercadoPago(textoBloco, normal, valorInfo);

            if (!operacao) return;

            const historico = limparHistoricoMercadoPago(textoBloco) || operacao.historico;

            movimentos.push(criarMovimentacao({
                data: bloco.data,
                banco: "Mercado Pago",
                arquivo: documento.nome,
                historico,
                valor: Math.abs(valorInfo.valor),
                natureza: operacao.natureza,
                classificacao: operacao.classificacao,
                motivo: operacao.motivo,
                considerar: operacao.considerar,
                confianca: operacao.confianca || "alta"
            }));
        });

        return movimentos;
    }

    function deveIgnorarBlocoMercadoPago(normal) {
        if (!normal) return true;

        const ignorar = [
            "DETALHE DOS MOVIMENTOS",
            "DATA DESCRICAO ID DA OPERACAO VALOR SALDO",
            "SALDO ANTERIOR",
            "SALDO FINAL",
            "TOTAL DE ENTRADAS",
            "TOTAL DE SAIDAS",
            "RESUMO",
            "PERIODO"
        ];

        return ignorar.some(x => normal === x || normal.startsWith(x + " "));
    }

    function extrairValorMovimentoMercadoPago(texto) {
        const ocorrencias = extrairOcorrenciasMonetarias(texto);

        if (!ocorrencias.length) return null;

        const id = String(texto || "").match(/\b\d{9,18}\b/);

        if (id) {
            const inicioDepoisId = (id.index || 0) + id[0].length;
            const depois = ocorrencias.filter(o => o.indice >= inicioDepoisId);

            if (depois.length) {
                return {
                    valor: depois[0].valor,
                    origem: "valor após ID"
                };
            }
        }

        if (ocorrencias.length === 1) {
            return {
                valor: ocorrencias[0].valor,
                origem: "único valor"
            };
        }

        return {
            valor: ocorrencias[0].valor,
            origem: "primeiro valor"
        };
    }

    function classificarMercadoPago(texto, normal, valorInfo) {
        const regraExclusao = localizarExclusaoCredito(normal);

        const termosDebito = [
            "PIX ENVIADO",
            "PAGAMENTO",
            "DEBITO POR DIVIDA",
            "DINHEIRO RETIRADO",
            "DINHEIRO RESERVADO",
            "RESERVA POR GASTOS",
            "TRANSFERENCIA ENVIADA",
            "TED ENVIADA",
            "COMPRA",
            "SAQUE",
            "PAGAMENTO DE CONTA"
        ];

        if (
            valorInfo.valor < 0 ||
            termosDebito.some(x => normal.includes(x))
        ) {
            return {
                natureza: "Débito",
                classificacao: "Débito",
                considerar: false,
                historico: "Débito",
                motivo: "Movimentação de débito identificada no extrato.",
                confianca: "alta"
            };
        }

        if (regraExclusao) {
            return {
                natureza: "Crédito",
                classificacao: "Crédito excluído",
                considerar: false,
                historico: "Crédito",
                motivo: regraExclusao,
                confianca: "alta"
            };
        }

        const termosCreditoSeguro = [
            "PIX RECEBIDO",
            "PIX RECEBIDA",
            "DINHEIRO RECEBIDO",
            "TRANSFERENCIA RECEBIDA",
            "TED RECEBIDA",
            "DEPOSITO RECEBIDO",
            "PAGAMENTO RECEBIDO",
            "RECEBIMENTO DE VENDA",
            "VENDA APROVADA",
            "ENTRADA DE DINHEIRO",
            "CREDITO RECEBIDO"
        ];

        if (termosCreditoSeguro.some(x => normal.includes(x))) {
            return {
                natureza: "Crédito",
                classificacao: "Crédito",
                considerar: true,
                historico: "Crédito",
                motivo: "Entrada de recursos identificada pelo histórico e pelo valor positivo da movimentação.",
                confianca: "alta"
            };
        }

        if (
            normal.includes("LIBERACAO DE DINHEIRO") ||
            normal.includes("DINHEIRO LIBERADO")
        ) {
            return {
                natureza: "Crédito",
                classificacao: "Conferir origem",
                considerar: false,
                historico: "Liberação de dinheiro",
                motivo: "Entrada positiva identificada, porém 'liberação de dinheiro' pode representar crédito, antecipação ou outra origem. Não incluída automaticamente.",
                confianca: "media"
            };
        }

        if (valorInfo.valor > 0 && /\b\d{9,18}\b/.test(texto)) {
            return {
                natureza: "Crédito",
                classificacao: "Crédito",
                considerar: true,
                historico: "Entrada",
                motivo: "Valor positivo identificado na coluna de movimentação do Mercado Pago. Histórico preservado para conferência da origem.",
                confianca: "media"
            };
        }

        return {
            natureza: "-",
            classificacao: "Conferir",
            considerar: false,
            historico: "Movimentação",
            motivo: "Natureza não identificada com segurança.",
            confianca: "baixa"
        };
    }

    function limparHistoricoMercadoPago(texto) {
        let h = String(texto || "");

        h = h.replace(/\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/g, " ");
        h = h.replace(/\b\d{9,18}\b/g, " ");
        h = h.replace(/R\$\s*[+-]?\s*[\d.]+,\d{2}/gi, " ");
        h = h.replace(/(?<!\d)[+-]?\s*\d{1,3}(?:\.\d{3})*,\d{2}(?!\d)/g, " ");
        h = h.replace(/\s+/g, " ").trim();

        h = h.replace(/^DATA\s+DESCRICAO\s+ID\s+DA\s+OPERACAO\s+VALOR\s+SALDO\s*/i, "");
        h = h.replace(/^DETALHE DOS MOVIMENTOS\s*/i, "");

        return h.trim();
    }

    function extrairNubank(documento) {
        const linhas = prepararLinhas(documento.texto);
        const anoPadrao = identificarAnoPrincipal(documento.texto);
        const blocos = montarBlocosTransacionais(linhas, documento.texto, anoPadrao);
        const movimentos = [];

        blocos.forEach(bloco => {
            const normal = normalizar(bloco.texto);

            if (deveIgnorarBlocoNubank(normal)) return;

            const ocorrencias = extrairOcorrenciasMonetarias(bloco.texto);
            if (!ocorrencias.length) return;

            const valor = selecionarValorNubank(bloco.texto, ocorrencias, normal);
            if (!Number.isFinite(valor) || valor === 0) return;

            const classificacao = classificarNubank(bloco.texto, normal, valor);
            if (!classificacao) return;

            movimentos.push(criarMovimentacao({
                data: bloco.data,
                banco: "Nubank",
                arquivo: documento.nome,
                historico: limparHistoricoGenerico(bloco.texto),
                valor: Math.abs(valor),
                natureza: classificacao.natureza,
                classificacao: classificacao.classificacao,
                motivo: classificacao.motivo,
                considerar: classificacao.considerar,
                confianca: classificacao.confianca || "alta"
            }));
        });

        return movimentos;
    }

    function deveIgnorarBlocoNubank(normal) {
        const termos = [
            "SALDO ANTERIOR",
            "SALDO FINAL",
            "SALDO DISPONIVEL",
            "RESUMO DA FATURA",
            "LIMITE DE CREDITO",
            "TOTAL DA FATURA",
            "PAGAMENTO MINIMO"
        ];

        return termos.some(x => normal === x || normal.startsWith(x + " "));
    }

    function selecionarValorNubank(texto, ocorrencias, normal) {
        if (ocorrencias.length === 1) {
            return ocorrencias[0].valor;
        }

        const comSinalExplicito = ocorrencias.find(o =>
            /^\s*[+-]/.test(o.bruto.replace(/^R\$\s*/i, ""))
        );

        if (comSinalExplicito) {
            return comSinalExplicito.valor;
        }

        if (
            normal.includes("PIX RECEBIDO") ||
            normal.includes("TRANSFERENCIA RECEBIDA") ||
            normal.includes("DEPOSITO") ||
            normal.includes("SALARIO") ||
            normal.includes("PROVENTO")
        ) {
            return Math.abs(ocorrencias[0].valor);
        }

        if (
            normal.includes("PIX ENVIADO") ||
            normal.includes("PAGAMENTO") ||
            normal.includes("COMPRA") ||
            normal.includes("SAQUE")
        ) {
            return -Math.abs(ocorrencias[0].valor);
        }

        return ocorrencias[0].valor;
    }

    function classificarNubank(texto, normal, valor) {
        if (
            valor < 0 ||
            /\b(PIX ENVIADO|TRANSFERENCIA ENVIADA|PAGAMENTO|COMPRA|SAQUE|DEBITO)\b/.test(normal)
        ) {
            return {
                natureza: "Débito",
                classificacao: "Débito",
                considerar: false,
                motivo: "Movimentação de débito.",
                confianca: "alta"
            };
        }

        const exclusao = localizarExclusaoCredito(normal);

        if (exclusao) {
            return {
                natureza: "Crédito",
                classificacao: "Crédito excluído",
                considerar: false,
                motivo: exclusao,
                confianca: "alta"
            };
        }

        if (
            /\b(PIX RECEBIDO|PIX RECEBIDA|TRANSFERENCIA RECEBIDA|TED RECEBIDA|DEPOSITO|SALARIO|PROVENTO|RECEBIMENTO)\b/.test(normal)
        ) {
            return {
                natureza: "Crédito",
                classificacao: "Crédito",
                considerar: true,
                motivo: "Entrada de recursos identificada.",
                confianca: "alta"
            };
        }

        if (valor > 0) {
            return {
                natureza: "Crédito",
                classificacao: "Conferir",
                considerar: false,
                motivo: "Valor positivo identificado, mas o histórico não confirma a origem do crédito.",
                confianca: "media"
            };
        }

        return null;
    }

    function extrairSantander(documento) {
        const linhas = prepararLinhas(documento.texto);
        const anoPadrao = identificarAnoPrincipal(documento.texto);
        const blocos = montarBlocosTransacionais(linhas, documento.texto, anoPadrao);
        const movimentos = [];

        blocos.forEach(bloco => {
            const normal = normalizar(bloco.texto);

            if (
                normal.includes("SALDO EM") ||
                normal.includes("TOTAL DE CREDITOS") ||
                normal.includes("TOTAL DE DEBITOS") ||
                normal.includes("LIMITE SANTANDER") ||
                normal.includes("SALDO DISPONIVEL")
            ) {
                return;
            }

            const ocorrencias = extrairOcorrenciasMonetarias(bloco.texto);
            if (!ocorrencias.length) return;

            const valor = selecionarValorSantander(bloco.texto, ocorrencias, normal);
            if (!Number.isFinite(valor) || valor === 0) return;

            const classe = classificarSantander(normal, valor);
            if (!classe) return;

            movimentos.push(criarMovimentacao({
                data: bloco.data,
                banco: "Santander",
                arquivo: documento.nome,
                historico: limparHistoricoGenerico(bloco.texto),
                valor: Math.abs(valor),
                natureza: classe.natureza,
                classificacao: classe.classificacao,
                motivo: classe.motivo,
                considerar: classe.considerar,
                confianca: classe.confianca || "alta"
            }));
        });

        return movimentos;
    }

    function selecionarValorSantander(texto, ocorrencias, normal) {
        if (!ocorrencias.length) return NaN;

        if (
            /\b(PIX RECEBIDO|TED RECEBIDA|DOC RECEBIDO|TRANSFERENCIA RECEBIDA)\b/.test(normal)
        ) {
            const candidato = ocorrencias.find(o => !o.sinalNegativoFinal);
            return candidato ? Math.abs(candidato.valor) : Math.abs(ocorrencias[0].valor);
        }

        if (
            /\b(PIX ENVIADO|COMPRA|PAGAMENTO|SAQUE|IOF|TARIFA)\b/.test(normal)
        ) {
            return -Math.abs(ocorrencias[0].valor);
        }

        const movimento = ocorrencias.find(o => o.sinalNegativoFinal || o.valor < 0);

        if (movimento) {
            return -Math.abs(movimento.valor);
        }

        return ocorrencias[0].valor;
    }

    function classificarSantander(normal, valor) {
        if (
            valor < 0 ||
            /\b(PIX ENVIADO|COMPRA|PAGAMENTO|SAQUE|IOF|TARIFA|DEBITO)\b/.test(normal)
        ) {
            return {
                natureza: "Débito",
                classificacao: "Débito",
                considerar: false,
                motivo: "Movimentação de débito.",
                confianca: "alta"
            };
        }

        const exclusao = localizarExclusaoCredito(normal);

        if (exclusao) {
            return {
                natureza: "Crédito",
                classificacao: "Crédito excluído",
                considerar: false,
                motivo: exclusao,
                confianca: "alta"
            };
        }

        if (
            /\b(PIX RECEBIDO|TED RECEBIDA|DOC RECEBIDO|TRANSFERENCIA RECEBIDA|DEPOSITO)\b/.test(normal)
        ) {
            return {
                natureza: "Crédito",
                classificacao: "Crédito",
                considerar: true,
                motivo: "Entrada de recursos identificada.",
                confianca: "alta"
            };
        }

        return null;
    }

    function extrairGenerico(documento) {
        const linhas = prepararLinhas(documento.texto);
        const anoPadrao = identificarAnoPrincipal(documento.texto);
        const blocos = montarBlocosTransacionais(linhas, documento.texto, anoPadrao);
        const movimentos = [];

        blocos.forEach(bloco => {
            const normal = normalizar(bloco.texto);

            if (deveIgnorarLinhaGenerica(normal)) return;

            const ocorrencias = extrairOcorrenciasMonetarias(bloco.texto);
            if (!ocorrencias.length) return;

            const natureza = classificarNaturezaGenerica(bloco.texto, normal, ocorrencias);
            if (!natureza) return;

            const valor = natureza.valor;

            if (!Number.isFinite(valor) || valor === 0) return;

            movimentos.push(criarMovimentacao({
                data: bloco.data,
                banco: documento.banco || "Não identificado",
                arquivo: documento.nome,
                historico: limparHistoricoGenerico(bloco.texto),
                valor: Math.abs(valor),
                natureza: natureza.natureza,
                classificacao: natureza.classificacao,
                motivo: natureza.motivo,
                considerar: natureza.considerar,
                confianca: natureza.confianca || "media"
            }));
        });

        return movimentos;
    }

    function deveIgnorarLinhaGenerica(normal) {
        if (!normal) return true;

        const termos = [
            "SALDO",
            "SALDO ANTERIOR",
            "SALDO FINAL",
            "TOTAL",
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

        return termos.some(x => normal === x || normal.startsWith(x + " "));
    }

    function classificarNaturezaGenerica(texto, normal, ocorrencias) {
        const exclusao = localizarExclusaoCredito(normal);

        const valorSinalizado = ocorrencias.find(o =>
            o.valor < 0 ||
            o.sinalNegativoFinal ||
            /^\s*-/.test(o.bruto.replace(/^R\$\s*/i, ""))
        );

        if (
            valorSinalizado ||
            /\b(PIX ENVIADO|TRANSFERENCIA ENVIADA|PAGAMENTO|COMPRA|SAQUE|DEBITO)\b/.test(normal)
        ) {
            return {
                valor: -Math.abs((valorSinalizado || ocorrencias[0]).valor),
                natureza: "Débito",
                classificacao: "Débito",
                considerar: false,
                motivo: "Movimentação de débito.",
                confianca: "media"
            };
        }

        if (exclusao) {
            return {
                valor: Math.abs(ocorrencias[0].valor),
                natureza: "Crédito",
                classificacao: "Crédito excluído",
                considerar: false,
                motivo: exclusao,
                confianca: "alta"
            };
        }

        if (
            /\b(PIX RECEBIDO|PIX RECEBIDA|TRANSFERENCIA RECEBIDA|TED RECEBIDA|DOC RECEBIDO|DEPOSITO|RECEBIMENTO|SALARIO|PROVENTO)\b/.test(normal)
        ) {
            return {
                valor: Math.abs(ocorrencias[0].valor),
                natureza: "Crédito",
                classificacao: "Crédito",
                considerar: true,
                motivo: "Entrada de recursos identificada.",
                confianca: "alta"
            };
        }

        return {
            valor: Math.abs(ocorrencias[0].valor),
            natureza: "-",
            classificacao: "Conferir",
            considerar: false,
            motivo: "Natureza não identificada com segurança.",
            confianca: "baixa"
        };
    }

    function prepararLinhas(texto) {
        return String(texto || "")
            .replace(/\r/g, "")
            .split("\n")
            .map(l => l.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim())
            .filter(Boolean);
    }

    function montarBlocosTransacionais(linhas, textoCompleto, anoPadrao) {
        const blocos = [];
        let atual = null;

        const anoFallback = anoPadrao || identificarAnoPrincipal(textoCompleto);

        linhas.forEach(linha => {
            const dataInfo = extrairDataFlexivel(linha, anoFallback);

            if (dataInfo && dataInfo.dataTexto) {
                if (atual) {
                    blocos.push(atual);
                }

                atual = {
                    data: dataInfo.dataTexto,
                    texto: linha
                };

                return;
            }

            if (!atual) return;

            if (ehInicioSecaoNaoTransacional(linha)) {
                blocos.push(atual);
                atual = null;
                return;
            }

            atual.texto += " " + linha;
        });

        if (atual) {
            blocos.push(atual);
        }

        return blocos;
    }

    function ehInicioSecaoNaoTransacional(linha) {
        const n = normalizar(linha);

        const termos = [
            "SALDOS POR PERIODO",
            "COMPRAS COM CARTAO DE DEBITO",
            "COMPROVANTES DE PAGAMENTO",
            "CREDITOS CONTRATADOS",
            "PACOTE DE SERVICOS",
            "INDICES ECONOMICOS",
            "RESUMO DA FATURA",
            "DETALHES DA FATURA"
        ];

        return termos.some(x => n.startsWith(x));
    }

    function extrairDataFlexivel(texto, anoPadrao) {
        const s = String(texto || "");

        let m = s.match(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\b/);

        if (m) {
            let ano = Number(m[3]);

            if (ano < 100) {
                ano += ano >= 70 ? 1900 : 2000;
            }

            return criarDataInfo(Number(m[1]), Number(m[2]), ano);
        }

        m = s.match(/\b(\d{1,2})[\/.-](\d{1,2})(?![\/.-]\d)\b/);

        if (m && anoPadrao) {
            return criarDataInfo(Number(m[1]), Number(m[2]), anoPadrao);
        }

        const normal = normalizar(s);

        m = normal.match(
            /\b(\d{1,2})\s+(JAN|JANEIRO|FEV|FEVEREIRO|MAR|MARCO|ABR|ABRIL|MAI|MAIO|JUN|JUNHO|JUL|JULHO|AGO|AGOSTO|SET|SETEMBRO|OUT|OUTUBRO|NOV|NOVEMBRO|DEZ|DEZEMBRO)(?:\s+(\d{2,4}))?\b/
        );

        if (m) {
            let ano = m[3] ? Number(m[3]) : anoPadrao;

            if (!ano) return null;

            if (ano < 100) {
                ano += ano >= 70 ? 1900 : 2000;
            }

            const mes = MESES_PT[m[2]];

            if (!mes) return null;

            return criarDataInfo(Number(m[1]), mes, ano);
        }

        return null;
    }

    function criarDataInfo(dia, mes, ano) {
        const d = new Date(ano, mes - 1, dia, 12);

        if (
            d.getFullYear() !== ano ||
            d.getMonth() !== mes - 1 ||
            d.getDate() !== dia
        ) {
            return null;
        }

        return {
            data: d,
            dataTexto: `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${ano}`
        };
    }

    function identificarAnoPrincipal(texto) {
        const t = String(texto || "");
        const candidatos = [];

        const regexAno = /\b(20\d{2})\b/g;
        let m;

        while ((m = regexAno.exec(t)) !== null) {
            candidatos.push(Number(m[1]));
        }

        if (!candidatos.length) {
            return new Date().getFullYear();
        }

        const contagem = new Map();

        candidatos.forEach(ano => {
            contagem.set(ano, (contagem.get(ano) || 0) + 1);
        });

        return Array.from(contagem.entries())
            .sort((a, b) => b[1] - a[1])[0][0];
    }

    function identificarCompetenciasDocumento(texto) {
        const competencias = new Set();
        const t = normalizar(texto);

        const regexMesAno =
            /\b(JANEIRO|FEVEREIRO|MARCO|ABRIL|MAIO|JUNHO|JULHO|AGOSTO|SETEMBRO|OUTUBRO|NOVEMBRO|DEZEMBRO)[\/\s-]+(20\d{2})\b/g;

        let m;

        while ((m = regexMesAno.exec(t)) !== null) {
            const mes = MESES_PT[m[1]];
            const ano = Number(m[2]);

            if (mes && ano) {
                competencias.add(`${ano}-${String(mes).padStart(2, "0")}`);
            }
        }

        return Array.from(competencias);
    }

    function recalcularPeriodoComBaseNasMovimentacoes(resultado) {
        const datas = resultado.movimentacoes
            .map(m => parseDataBR(m.data))
            .filter(Boolean);

        if (!datas.length) {
            resultado.primeiraData = null;
            resultado.ultimaData = null;
            return;
        }

        resultado.primeiraData = new Date(
            Math.min(...datas.map(d => d.getTime()))
        );

        resultado.ultimaData = new Date(
            Math.max(...datas.map(d => d.getTime()))
        );
    }

    function extrairOcorrenciasMonetarias(texto) {
        const s = String(texto || "");
        const ocorrencias = [];

        const regex =
            /(?:R\$\s*)?([+-]?\s*\d{1,3}(?:\.\d{3})*,\d{2})(-)?/gi;

        let m;

        while ((m = regex.exec(s)) !== null) {
            const bruto = m[0];

            let valor = converterMoeda(m[1]);

            if (!Number.isFinite(valor)) continue;

            const sinalNegativoFinal = m[2] === "-";

            if (sinalNegativoFinal) {
                valor = -Math.abs(valor);
            }

            ocorrencias.push({
                valor,
                bruto,
                indice: m.index,
                fim: regex.lastIndex,
                sinalNegativoFinal
            });
        }

        return ocorrencias;
    }

    function converterMoeda(valor) {
        let s = String(valor || "")
            .replace(/\s/g, "")
            .replace(/[^\d,.-]/g, "");

        if (!s) return NaN;

        const negativo = s.startsWith("-");

        s = s.replace(/-/g, "");

        if (s.includes(",")) {
            s = s.replace(/\./g, "").replace(",", ".");
        }

        const n = Number(s);

        if (!Number.isFinite(n)) return NaN;

        return negativo ? -n : n;
    }

    function formatarMoeda(valor) {
        return Number(valor || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function formatarValorNumero(valor) {
        return Number(valor || 0).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function localizarExclusaoCredito(normal) {
        if (!normal) return "";

        if (/\bRDB\b/.test(normal)) {
            return "RDB / investimento não representa nova renda.";
        }

        if (/\b(RESGATE|APLICACAO|INVESTIMENTO|CDB|RDC|FUNDO DE INVESTIMENTO)\b/.test(normal)) {
            return "Resgate ou aplicação de investimento não representa novo recurso.";
        }

        if (/\b(EMPRESTIMO|FINANCIAMENTO|CREDITO PESSOAL|CREDITO CONSIGNADO|CAPITAL DE GIRO|LIBERACAO DE CREDITO)\b/.test(normal)) {
            return "Empréstimo ou financiamento não representa renda.";
        }

        if (/\b(CHEQUE ESPECIAL|LIMITE DE CREDITO|CREDITO ROTATIVO)\b/.test(normal)) {
            return "Liberação ou utilização de limite não representa renda.";
        }

        if (/\b(ESTORNO|REVERSAO|CANCELAMENTO|DEVOLUCAO|REEMBOLSO)\b/.test(normal)) {
            return "Estorno, devolução ou cancelamento não representa nova renda.";
        }

        const regra = TERMOS_EXCLUSAO_CREDITO.find(r => r.test(normal));

        return regra
            ? "Movimentação classificada em regra de exclusão de crédito."
            : "";
    }

    function marcarPossiveisTransferenciasProprias(resultado) {
        const nomeTitular = normalizar(resultado.titular || "");

        if (!nomeTitular) return;

        resultado.movimentacoes.forEach(m => {
            if (m.natureza !== "Crédito") return;

            const h = normalizar(m.historico);

            if (
                nomeTitular.length >= 8 &&
                h.includes(nomeTitular)
            ) {
                m.classificacao = "Possível transferência própria";
                m.considerar = false;
                m.motivo =
                    "O histórico contém o nome do titular. Possível transferência entre contas próprias; excluída até conferência.";
            }
        });
    }

    function criarMovimentacao(dados) {
        return {
            id: gerarIdMovimentacao(dados),
            data: dados.data || "",
            banco: dados.banco || "",
            arquivo: dados.arquivo || "",
            historico: dados.historico || "",
            valor: Number(dados.valor || 0),
            natureza: dados.natureza || "-",
            classificacao: dados.classificacao || "Conferir",
            motivo: dados.motivo || "",
            considerar: dados.considerar === true,
            confianca: dados.confianca || ""
        };
    }

    function gerarIdMovimentacao(d) {
        return [
            d.arquivo || "",
            d.data || "",
            d.banco || "",
            normalizar(d.historico || ""),
            Number(d.valor || 0).toFixed(2),
            d.natureza || ""
        ].join("|");
    }

    function removerMovimentacoesDuplicadas(resultado) {
        const mapa = new Map();

        resultado.movimentacoes.forEach(m => {
            const chave = [
                m.arquivo,
                m.data,
                m.banco,
                normalizar(m.historico),
                Number(m.valor).toFixed(2),
                m.natureza
            ].join("|");

            if (!mapa.has(chave)) {
                mapa.set(chave, m);
            }
        });

        resultado.movimentacoes =
            Array.from(mapa.values()).sort((a, b) => {
                const da = parseDataBR(a.data);
                const db = parseDataBR(b.data);

                if (da && db && da - db !== 0) {
                    return da - db;
                }

                return a.banco.localeCompare(b.banco, "pt-BR");
            });
    }

    function gerarTextoConsolidado(movimentacoes) {
        return movimentacoes.map(m => {
            let decisao = "DUVIDA";

            if (
                m.considerar === true &&
                m.natureza === "Crédito"
            ) {
                decisao = "INCLUIR";
            } else if (
                m.natureza === "Débito" ||
                m.classificacao === "Crédito excluído" ||
                m.classificacao === "Possível transferência própria"
            ) {
                decisao = "EXCLUIR";
            }

            const indicador =
                m.natureza === "Crédito"
                    ? "C"
                    : m.natureza === "Débito"
                        ? "D"
                        : "";

            const meta = [
                `[ID:${m.id}]`,
                `[BANCO:${m.banco}]`,
                `[ARQUIVO:${m.arquivo}]`,
                `[DECISAO:${decisao}]`
            ].join(" ");

            const valorFinal =
                `${formatarValorNumero(m.valor)}${indicador ? " " + indicador : ""}`;

            return [
                m.data,
                `${meta} ${m.historico}`.trim(),
                valorFinal
            ].join(" | ");
        }).join("\n");
    }

    function enviarMovimentacoesParaCalculadora(resultado) {
        const texto =
            gerarTextoConsolidado(resultado.movimentacoes);

        resultado.textoConsolidado = texto;

        try {
            if (
                window.MediaMovimentacao &&
                typeof window.MediaMovimentacao.processarTexto === "function"
            ) {
                window.MediaMovimentacao.processarTexto(
                    texto,
                    {
                        competenciasDocumentadas:
                            resultado.competencias
                    }
                );
            } else if (
                typeof window.processarTextoMovimentacao === "function"
            ) {
                window.processarTextoMovimentacao(
                    texto,
                    {
                        competenciasDocumentadas:
                            resultado.competencias
                    }
                );
            }
        } catch (e) {
            console.error(
                "Erro ao enviar movimentações para media-movimentacao.js:",
                e
            );
        }

        renderizarTabelaMovimentacoesOCR(resultado);
        atualizarCalculosOCR(resultado);
        atualizarResumoLeitura(resultado);
    }

    function renderizarTabelaMovimentacoesOCR(resultado) {
        const tabela =
            document.getElementById("tabelaMovimentacoesOCR");

        if (!tabela) return;

        const tbody =
            tabela.querySelector("tbody");

        if (!tbody) return;

        if (!resultado.movimentacoes.length) {
            tbody.innerHTML =
                '<tr><td colspan="8" class="sem-dados">Nenhuma movimentação de conta corrente identificada.</td></tr>';

            return;
        }

        tbody.innerHTML =
            resultado.movimentacoes.map((m, i) => `
<tr>
<td><input type="checkbox" class="check-movimentacao-ocr" data-indice="${i}" ${m.considerar ? "checked" : ""}></td>
<td>${escaparHTML(m.data)}</td>
<td>${escaparHTML(m.banco)}</td>
<td>${escaparHTML(m.historico)}</td>
<td>${formatarMoeda(m.valor)}</td>
<td>${escaparHTML(m.natureza)}</td>
<td>${escaparHTML(m.classificacao)}</td>
<td>${escaparHTML(m.motivo)}</td>
</tr>`).join("");

        tbody
            .querySelectorAll(".check-movimentacao-ocr")
            .forEach(check => {
                check.addEventListener("change", () => {
                    const indice =
                        Number(check.dataset.indice);

                    if (
                        !resultadoLeituraOCR ||
                        !resultadoLeituraOCR.movimentacoes[indice]
                    ) {
                        return;
                    }

                    const movimento =
                        resultadoLeituraOCR.movimentacoes[indice];

                    movimento.considerar =
                        check.checked;

                    if (
                        check.checked &&
                        movimento.natureza !== "Crédito"
                    ) {
                        movimento.natureza = "Crédito";
                        movimento.classificacao =
                            "Crédito confirmado manualmente";

                        movimento.motivo =
                            "Movimentação incluída manualmente na conferência.";
                    }

                    if (
                        !check.checked &&
                        movimento.classificacao ===
                        "Crédito confirmado manualmente"
                    ) {
                        movimento.classificacao = "Conferir";
                        movimento.motivo =
                            "Movimentação removida manualmente da apuração.";
                    }

                    atualizarCalculosOCR(
                        resultadoLeituraOCR
                    );

                    atualizarResumoLeitura(
                        resultadoLeituraOCR
                    );
                });
            });
    }

    function alterarSelecaoMovimentacoes(marcar) {
        if (!resultadoLeituraOCR) return;

        resultadoLeituraOCR.movimentacoes.forEach(m => {
            if (!marcar) {
                m.considerar = false;
                return;
            }

            m.considerar =
                m.natureza === "Crédito" &&
                m.classificacao !== "Crédito excluído" &&
                m.classificacao !== "Possível transferência própria" &&
                m.classificacao !== "Conferir origem";
        });

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

    function atualizarCalculosOCR(resultado) {
        const creditos =
            resultado.movimentacoes.filter(m =>
                m.considerar === true &&
                m.natureza === "Crédito" &&
                Number(m.valor) > 0
            );

        const porMes = {};
        const porBanco = {};

        creditos.forEach(m => {
            const data =
                parseDataBR(m.data);

            if (!data) return;

            const competencia =
                `${String(data.getMonth() + 1).padStart(2, "0")}/${data.getFullYear()}`;

            if (!porMes[competencia]) {
                porMes[competencia] = {
                    quantidade: 0,
                    total: 0,
                    bancos: new Set()
                };
            }

            porMes[competencia].quantidade++;
            porMes[competencia].total += Number(m.valor);
            porMes[competencia].bancos.add(m.banco);

            if (!porBanco[m.banco]) {
                porBanco[m.banco] = {
                    quantidade: 0,
                    total: 0,
                    competencias: new Set()
                };
            }

            porBanco[m.banco].quantidade++;
            porBanco[m.banco].total += Number(m.valor);
            porBanco[m.banco].competencias.add(competencia);
        });

        const total =
            creditos.reduce(
                (s, m) =>
                    s + Number(m.valor || 0),
                0
            );

        const competenciasValidas =
            obterCompetenciasValidas(
                resultado,
                creditos
            );

        const quantidadeMeses =
            competenciasValidas.length;

        const media =
            quantidadeMeses > 0
                ? total / quantidadeMeses
                : 0;

        let maiorMes = "-";
        let maiorValor = -1;

        Object.entries(porMes).forEach(
            ([mes, dados]) => {
                if (dados.total > maiorValor) {
                    maiorValor = dados.total;
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
            String(quantidadeMeses)
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
            competenciasValidas
        );

        renderizarTabelaBancos(
            porBanco
        );
    }

    function obterCompetenciasValidas(resultado, creditos) {
        const set = new Set();

        (resultado.competencias || []).forEach(comp => {
            if (comp) set.add(comp);
        });

        creditos.forEach(m => {
            const d = parseDataBR(m.data);

            if (d) {
                set.add(
                    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
                );
            }
        });

        return Array.from(set).sort();
    }

    function renderizarTabelaMeses(porMes, competenciasValidas) {
        const tabela =
            obterPrimeiroElemento([
                "tabelaResumoMensalOCR",
                "tabelaCreditosMesOCR",
                "tabelaCreditosPorMes"
            ]);

        if (!tabela) return;

        const tbody =
            tabela.querySelector("tbody");

        if (!tbody) return;

        const meses = new Set();

        Object.keys(porMes).forEach(m => {
            meses.add(m);
        });

        (competenciasValidas || []).forEach(comp => {
            const partes =
                String(comp).split("-");

            if (partes.length === 2) {
                meses.add(
                    `${partes[1]}/${partes[0]}`
                );
            }
        });

        const entradas =
            Array.from(meses).map(mes => {
                return [
                    mes,
                    porMes[mes] || {
                        quantidade: 0,
                        total: 0,
                        bancos: new Set()
                    }
                ];
            });

        if (!entradas.length) {
            tbody.innerHTML =
                '<tr><td colspan="4" class="sem-dados">Nenhum crédito considerado.</td></tr>';

            return;
        }

        entradas.sort((a, b) => {
            const [ma, aa] =
                a[0].split("/").map(Number);

            const [mb, ab] =
                b[0].split("/").map(Number);

            return aa - ab || ma - mb;
        });

        tbody.innerHTML =
            entradas.map(([mes, d]) => `
<tr>
<td>${escaparHTML(mes)}</td>
<td>${d.quantidade}</td>
<td>${escaparHTML(Array.from(d.bancos).join(", ") || "-")}</td>
<td>${formatarMoeda(d.total)}</td>
</tr>`).join("");
    }

    function renderizarTabelaBancos(porBanco) {
        const tabela =
            obterPrimeiroElemento([
                "tabelaResumoBancosOCR",
                "tabelaResumoInstituicaoOCR",
                "tabelaResumoInstituicao"
            ]);

        if (!tabela) return;

        const tbody =
            tabela.querySelector("tbody");

        if (!tbody) return;

        const entradas =
            Object.entries(porBanco);

        if (!entradas.length) {
            tbody.innerHTML =
                '<tr><td colspan="4" class="sem-dados">Nenhum crédito considerado.</td></tr>';

            return;
        }

        tbody.innerHTML =
            entradas.map(([banco, d]) => {
                const qtdComp =
                    Math.max(
                        1,
                        d.competencias.size
                    );

                return `
<tr>
<td>${escaparHTML(banco)}</td>
<td>${d.quantidade}</td>
<td>${formatarMoeda(d.total)}</td>
<td>${formatarMoeda(d.total / qtdComp)}</td>
</tr>`;
            }).join("");
    }

    function limparTabelaMovimentacoesOCR() {
        const tabela =
            document.getElementById(
                "tabelaMovimentacoesOCR"
            );

        if (!tabela) return;

        const tbody =
            tabela.querySelector("tbody");

        if (tbody) {
            tbody.innerHTML =
                '<tr><td colspan="8" class="sem-dados">Nenhuma leitura realizada.</td></tr>';
        }
    }

    function renderizarResultadoOCR(resultado) {
        setTexto(
            "ocrNomeTitular",
            resultado.titular || "Não identificado"
        );

        setTexto(
            "ocrDocumentoTitular",
            formatarDocumento(
                resultado.documentoTitular
            ) || "Não identificado"
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
        const el =
            document.getElementById(
                "listaDocumentosOCR"
            );

        if (!el) return;

        if (!documentos.length) {
            el.innerHTML =
                '<div class="sem-dados">Nenhum documento processado.</div>';

            return;
        }

        el.innerHTML =
            documentos.map(doc => {
                const tipo =
                    rotuloTipoDocumento(
                        doc.tipoDocumento
                    );

                const status =
                    doc.excluidoDaApuracao
                        ? " · Excluído da apuração"
                        : " · Processado";

                return `
<div class="documento-ocr-item">
<div>
<strong>${escaparHTML(doc.nome)}</strong>
<span>${escaparHTML((doc.banco || "Instituição não identificada") + " · " + tipo + status)}</span>
</div>
<div class="documento-ocr-meta">
<span>${escaparHTML(doc.metodo || "-")}</span>
<span>${formatarTamanhoArquivo(doc.tamanho || 0)}</span>
</div>
</div>`;
            }).join("");
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
        const el =
            document.getElementById(
                "listaAlertasOCR"
            );

        if (!el) return;

        el.innerHTML =
            alertas.length
                ? alertas
                    .map(
                        a =>
                            `<div class="aviso-atencao">${escaparHTML(a)}</div>`
                    )
                    .join("")
                : '<div class="aviso-info">Nenhum alerta adicional.</div>';
    }

    function atualizarResumoLeitura(resultado) {
        const textarea =
            document.getElementById(
                "resumoLeituraOCR"
            );

        if (!textarea) return;

        const creditos =
            resultado.movimentacoes.filter(
                m =>
                    m.considerar &&
                    m.natureza === "Crédito"
            );

        const documentosIncluidos =
            resultado.documentos.filter(
                d => !d.excluidoDaApuracao
            );

        const documentosExcluidos =
            resultado.documentos.filter(
                d => d.excluidoDaApuracao
            );

        textarea.value = [
            "RESUMO DA LEITURA DOS EXTRATOS",
            `Arquivos processados: ${resultado.documentos.length}`,
            `Extratos de conta utilizados: ${documentosIncluidos.length}`,
            `Documentos excluídos da apuração: ${documentosExcluidos.length}`,
            `Titular: ${resultado.titular || "Não identificado"}`,
            `CPF/CNPJ: ${formatarDocumento(resultado.documentoTitular) || "Não identificado"}`,
            `Instituições: ${resultado.instituicoes.length ? resultado.instituicoes.join(", ") : "Não identificadas"}`,
            `Período válido: ${formatarPeriodo(resultado.primeiraData, resultado.ultimaData)}`,
            `Competências válidas: ${resultado.competencias.length ? resultado.competencias.map(formatarCompetencia).join(", ") : "Não identificadas"}`,
            `Movimentações de conta identificadas: ${resultado.movimentacoes.length}`,
            `Créditos selecionados: ${creditos.length}`,
            `Total dos créditos selecionados: ${formatarMoeda(creditos.reduce((s, m) => s + Number(m.valor || 0), 0))}`,
            `Alertas: ${resultado.alertas.length}`
        ].join("\n");
    }

    function aplicarLeituraAoCalculo() {
        if (!resultadoLeituraOCR) {
            alert("Nenhum extrato foi processado.");
            return;
        }

        const texto =
            gerarTextoConsolidado(
                resultadoLeituraOCR.movimentacoes
            );

        try {
            if (
                window.MediaMovimentacao &&
                typeof window.MediaMovimentacao.processarTexto === "function"
            ) {
                window.MediaMovimentacao.processarTexto(
                    texto,
                    {
                        competenciasDocumentadas:
                            resultadoLeituraOCR.competencias
                    }
                );
            } else if (
                typeof window.processarTextoMovimentacao === "function"
            ) {
                window.processarTextoMovimentacao(
                    texto,
                    {
                        competenciasDocumentadas:
                            resultadoLeituraOCR.competencias
                    }
                );
            } else {
                const textarea =
                    document.getElementById(
                        "textoExtratoMovimentacao"
                    );

                if (textarea) {
                    textarea.value = texto;
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

        if (!campo) return;

        try {
            await navigator.clipboard.writeText(
                campo.value
            );

            const btn =
                document.getElementById(
                    "btnCopiarResumoOCR"
                );

            if (btn) {
                const original =
                    btn.textContent;

                btn.textContent =
                    "Copiado";

                setTimeout(() => {
                    btn.textContent =
                        original;
                }, 1500);
            }
        } catch (e) {
            campo.select();
            document.execCommand("copy");
        }
    }

    function parseDataBR(valor) {
        const m =
            String(valor || "").match(
                /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
            );

        if (!m) return null;

        const dia = Number(m[1]);
        const mes = Number(m[2]);
        const ano = Number(m[3]);

        const d =
            new Date(
                ano,
                mes - 1,
                dia,
                12
            );

        if (
            d.getFullYear() !== ano ||
            d.getMonth() !== mes - 1 ||
            d.getDate() !== dia
        ) {
            return null;
        }

        return d;
    }

    function formatarPeriodo(inicio, fim) {
        if (!inicio && !fim) {
            return "Não identificado";
        }

        if (inicio && fim) {
            return (
                `${formatarData(inicio)} a ${formatarData(fim)}`
            );
        }

        return formatarData(
            inicio || fim
        );
    }

    function formatarData(data) {
        return (
            data instanceof Date &&
            !Number.isNaN(data.getTime())
        )
            ? data.toLocaleDateString("pt-BR")
            : "Não identificado";
    }

    function formatarCompetencia(comp) {
        const p =
            String(comp || "").split("-");

        if (p.length !== 2) {
            return comp;
        }

        return `${p[1]}/${p[0]}`;
    }

    function identificarInstituicao(texto) {
        const t = normalizar(texto);

        const bancos = [
            [["MERCADO PAGO"], "Mercado Pago"],
            [["BANCO INTER", "INTER PAGAMENTOS", "BANCO INTER S A", "INTER BANK"], "Banco Inter"],
            [["NU PAGAMENTOS", "NUBANK", "NU FINANCEIRA", "CONTA DO NUBANK", "N U B A N K"], "Nubank"],
            [["BANCO ITAU", "ITAU UNIBANCO", "ITAU"], "Itaú"],
            [["SANTANDER"], "Santander"],
            [["SICOOB"], "Sicoob"],
            [["SICREDI"], "Sicredi"],
            [["BRADESCO"], "Bradesco"],
            [["BANCO DO BRASIL"], "Banco do Brasil"],
            [["CAIXA ECONOMICA"], "Caixa Econômica Federal"],
            [["C6 BANK"], "C6 Bank"],
            [["PAGBANK", "PAGSEGURO"], "PagBank"]
        ];

        for (const [chaves, nome] of bancos) {
            if (
                chaves.some(
                    chave => t.includes(chave)
                )
            ) {
                return nome;
            }
        }

        return "";
    }

    function identificarDadosTitular(texto, banco) {
        const original =
            String(texto || "");

        const linhas =
            prepararLinhas(original);

        const candidatosDocumento = [];
        const candidatosNome = [];

        linhas.forEach((linha, indice) => {
            const n = normalizar(linha);

            const contemRotuloDocumento =
                /\b(CPF|CNPJ|CPF CNPJ|DOCUMENTO)\b/.test(n);

            if (contemRotuloDocumento) {
                coletarDocumentosDaLinha(
                    linha
                ).forEach(doc => {
                    const pontosBase =
                        doc.length === 11
                            ? 120
                            : 70;

                    candidatosDocumento.push({
                        documento: doc,
                        pontuacao:
                            pontosBase + 30
                    });
                });

                if (linhas[indice + 1]) {
                    coletarDocumentosDaLinha(
                        linhas[indice + 1]
                    ).forEach(doc => {
                        const pontosBase =
                            doc.length === 11
                                ? 120
                                : 70;

                        candidatosDocumento.push({
                            documento: doc,
                            pontuacao:
                                pontosBase + 15
                        });
                    });
                }
            }

            const matchNomeMesmaLinha =
                linha.match(
                    /(?:TITULAR|CLIENTE|NOME)\s*:?\s+([A-ZÀ-Ú][A-ZÀ-Ú\s.'-]{3,100})/i
                );

            if (matchNomeMesmaLinha) {
                candidatosNome.push({
                    nome:
                        limparNome(
                            matchNomeMesmaLinha[1]
                        ),
                    pontuacao: 100
                });
            }

            if (
                /^(TITULAR|CLIENTE|NOME)\s*:?\s*$/i.test(
                    linha.trim()
                ) &&
                linhas[indice + 1]
            ) {
                const nomeSeguinte =
                    limparNome(
                        linhas[indice + 1]
                    );

                if (
                    pareceNomePessoa(
                        nomeSeguinte
                    )
                ) {
                    candidatosNome.push({
                        nome:
                            nomeSeguinte,
                        pontuacao: 90
                    });
                }
            }
        });

        const todosDocumentosRotulados =
            candidatosDocumento
                .filter(
                    c =>
                        validarCPFouCNPJ(
                            c.documento
                        )
                )
                .sort(
                    (a, b) =>
                        b.pontuacao -
                        a.pontuacao
                );

        let melhorDocumento =
            todosDocumentosRotulados[0] ||
            null;

        if (!melhorDocumento) {
            const rotulados =
                original.match(
                    /(?:CPF|CNPJ|CPF\/CNPJ)\s*:?\s*([\d.\-\/\s]{11,24})/gi
                ) || [];

            rotulados.forEach(trecho => {
                const docs =
                    coletarDocumentosDaLinha(
                        trecho
                    );

                docs.forEach(doc => {
                    if (
                        !validarCPFouCNPJ(doc)
                    ) {
                        return;
                    }

                    const pontuacao =
                        doc.length === 11
                            ? 110
                            : 60;

                    if (
                        !melhorDocumento ||
                        pontuacao >
                        melhorDocumento.pontuacao
                    ) {
                        melhorDocumento = {
                            documento: doc,
                            pontuacao
                        };
                    }
                });
            });
        }

        const melhorNome =
            candidatosNome
                .filter(
                    c =>
                        pareceNomePessoa(
                            c.nome
                        )
                )
                .sort(
                    (a, b) =>
                        b.pontuacao -
                        a.pontuacao
                )[0] || null;

        let pontuacaoFinal = 0;

        if (melhorDocumento) {
            pontuacaoFinal +=
                melhorDocumento.pontuacao;
        }

        if (melhorNome) {
            pontuacaoFinal +=
                melhorNome.pontuacao;
        }

        if (
            melhorDocumento &&
            melhorDocumento.documento.length === 11
        ) {
            pontuacaoFinal += 50;
        }

        if (
            banco === "Mercado Pago" &&
            melhorDocumento &&
            melhorDocumento.documento.length === 14
        ) {
            pontuacaoFinal -= 30;
        }

        return {
            documento:
                melhorDocumento
                    ? melhorDocumento.documento
                    : "",
            nome:
                melhorNome
                    ? melhorNome.nome
                    : "",
            pontuacao:
                pontuacaoFinal
        };
    }

    function coletarDocumentosDaLinha(linha) {
        const resultado = [];

        const candidatos =
            String(linha || "").match(
                /(?:\d[\s.\-/]*){11,18}/g
            ) || [];

        candidatos.forEach(candidato => {
            const numeros =
                candidato.replace(
                    /\D/g,
                    ""
                );

            if (
                (
                    numeros.length === 11 ||
                    numeros.length === 14
                ) &&
                validarCPFouCNPJ(
                    numeros
                )
            ) {
                resultado.push(
                    numeros
                );
            }
        });

        return resultado;
    }

    function validarCPFouCNPJ(doc) {
        if (/^\d{11}$/.test(doc)) {
            return validarCPF(doc);
        }

        if (/^\d{14}$/.test(doc)) {
            return validarCNPJ(doc);
        }

        return false;
    }

    function validarCPF(cpf) {
        cpf =
            String(cpf || "")
                .replace(/\D/g, "");

        if (!/^\d{11}$/.test(cpf)) {
            return false;
        }

        if (/^(\d)\1{10}$/.test(cpf)) {
            return false;
        }

        let soma = 0;

        for (let i = 0; i < 9; i++) {
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

        for (let i = 0; i < 10; i++) {
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

    function validarCNPJ(cnpj) {
        cnpj =
            String(cnpj || "")
                .replace(/\D/g, "");

        if (!/^\d{14}$/.test(cnpj)) {
            return false;
        }

        if (/^(\d)\1{13}$/.test(cnpj)) {
            return false;
        }

        const calcular = base => {
            let peso =
                base.length === 12
                    ? 5
                    : 6;

            let soma = 0;

            for (const char of base) {
                soma +=
                    Number(char) *
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

    function formatarDocumento(doc) {
        const d =
            String(doc || "")
                .replace(/\D/g, "");

        if (d.length === 11) {
            return d.replace(
                /(\d{3})(\d{3})(\d{3})(\d{2})/,
                "$1.$2.$3-$4"
            );
        }

        if (d.length === 14) {
            return d.replace(
                /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
                "$1.$2.$3/$4-$5"
            );
        }

        return d;
    }

    function limparNome(nome) {
        return String(nome || "")
            .replace(/\s+/g, " ")
            .replace(
                /\b(AGENCIA|CONTA|CPF|CNPJ|DOCUMENTO)\b.*$/i,
                ""
            )
            .trim();
    }

    function pareceNomePessoa(nome) {
        const n =
            String(nome || "").trim();

        if (
            n.length < 5 ||
            n.length > 100
        ) {
            return false;
        }

        if (/\d/.test(n)) {
            return false;
        }

        const partes =
            n.split(/\s+/)
                .filter(Boolean);

        return partes.length >= 2;
    }

    function limparHistoricoGenerico(texto) {
        return String(texto || "")
            .replace(
                /\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/g,
                " "
            )
            .replace(
                /\b\d{1,2}[\/.-]\d{1,2}\b/g,
                " "
            )
            .replace(
                /R\$\s*[+-]?\s*[\d.]+,\d{2}-?/gi,
                " "
            )
            .replace(
                /(?<!\d)[+-]?\s*\d{1,3}(?:\.\d{3})*,\d{2}-?(?!\d)/g,
                " "
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim();
    }

    function converterHTMLParaTexto(html) {
        const doc =
            new DOMParser()
                .parseFromString(
                    String(html || ""),
                    "text/html"
                );

        return (
            doc.body
                ? doc.body.innerText
                : doc.documentElement.innerText || ""
        ).replace(
            /\u00a0/g,
            " "
        );
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

    function formatarTamanhoArquivo(bytes) {
        const n =
            Number(bytes || 0);

        if (n < 1024) {
            return `${n} B`;
        }

        if (n < 1048576) {
            return `${(n / 1024).toFixed(1)} KB`;
        }

        return `${(n / 1048576).toFixed(2)} MB`;
    }

    function traduzirStatusOCR(status) {
        const mapa = {
            "loading tesseract core": "Carregando mecanismo",
            "initializing tesseract": "Inicializando",
            "loading language traineddata": "Carregando idioma",
            "initializing api": "Preparando reconhecimento",
            "recognizing text": "Reconhecendo texto"
        };

        return (
            mapa[
            String(status || "")
                .toLowerCase()
            ] ||
            status
        );
    }

    function normalizar(texto) {
        return String(texto || "")
            .normalize("NFD")
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

    function setTexto(id, valor) {
        const el =
            document.getElementById(id);

        if (el) {
            el.textContent = valor;
        }
    }

    function setTextoMultiplos(ids, valor) {
        (ids || []).forEach(
            id => setTexto(id, valor)
        );
    }

    function obterPrimeiroElemento(ids) {
        for (const id of ids || []) {
            const el =
                document.getElementById(id);

            if (el) {
                return el;
            }
        }

        return null;
    }

    function limparTabelaPorIds(ids, colspan, mensagem) {
        const tabela =
            obterPrimeiroElemento(ids);

        if (!tabela) return;

        const tbody =
            tabela.querySelector("tbody");

        if (tbody) {
            tbody.innerHTML =
                `<tr><td colspan="${colspan}" class="sem-dados">${escaparHTML(mensagem)}</td></tr>`;
        }
    }

    function escaparHTML(valor) {
        return String(valor ?? "")
            .replace(
                /[&<>"']/g,
                c => ({
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#039;"
                }[c])
            );
    }

    function definirStatus(texto, tipo) {
        const el =
            document.getElementById(
                "statusLeituraExtrato"
            );

        if (!el) return;

        el.textContent = texto;

        el.className =
            `status-leitura-ocr status-${tipo || "info"}`;
    }

    function mostrarResultadoOCR() {
        const card =
            document.getElementById(
                "cardResultadoLeituraExtratos"
            );

        if (card) {
            card.hidden = false;

            setTimeout(() => {
                card.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }, 50);
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

    window.leituraExtratosMovimentacao = {
        obterArquivos: () =>
            arquivosExtratoSelecionados.slice(),

        obterResultado: () =>
            resultadoLeituraOCR,

        limpar:
            limparArquivosExtrato,

        recalcular: () => {
            if (resultadoLeituraOCR) {
                atualizarCalculosOCR(
                    resultadoLeituraOCR
                );

                atualizarResumoLeitura(
                    resultadoLeituraOCR
                );
            }
        }
    };

})();