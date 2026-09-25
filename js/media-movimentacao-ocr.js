(function () {
    "use strict";

    let arquivosExtratoSelecionados = [];
    let resultadoLeituraOCR = null;
    let movimentacoesOCR = [];
    let contadorMovimentacao = 0;

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
            area.addEventListener("dragover", e => { e.preventDefault(); area.classList.add("arrastando") });
            area.addEventListener("dragleave", () => area.classList.remove("arrastando"));
            area.addEventListener("drop", e => { e.preventDefault(); area.classList.remove("arrastando"); if (e.dataTransfer && e.dataTransfer.files) adicionarArquivos(e.dataTransfer.files) });
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
            const duplicado = arquivosExtratoSelecionados.some(a => a.name === file.name && a.size === file.size && a.lastModified === file.lastModified);
            if (!duplicado) arquivosExtratoSelecionados.push(file);
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
        lista.innerHTML = arquivosExtratoSelecionados.map((arquivo, i) => `<div class="arquivo-extrato-item"><div class="arquivo-extrato-info"><div class="arquivo-extrato-icone">${obterExtensao(arquivo.name).toUpperCase()}</div><div class="arquivo-extrato-dados"><strong>${escaparHTML(arquivo.name)}</strong><span>${formatarTamanhoArquivo(arquivo.size)}</span></div></div><button type="button" class="btn-remover-arquivo" data-indice="${i}" title="Remover arquivo">×</button></div>`).join("");
        lista.querySelectorAll(".btn-remover-arquivo").forEach(btn => btn.addEventListener("click", () => {
            arquivosExtratoSelecionados.splice(Number(btn.dataset.indice), 1);
            renderizarArquivosSelecionados();
        }));
    }

    function limparArquivosExtrato() {
        arquivosExtratoSelecionados = [];
        resultadoLeituraOCR = null;
        movimentacoesOCR = [];
        contadorMovimentacao = 0;
        const input = document.getElementById("arquivosExtrato");
        if (input) input.value = "";
        renderizarArquivosSelecionados();
        ocultarResultadoOCR();
        limparTabelasOCR();
        definirStatus("Pronto para ler os extratos.", "info");
    }

    async function processarArquivosExtrato() {
        if (!arquivosExtratoSelecionados.length) return;
        const btn = document.getElementById("btnLerExtratos");
        if (btn) { btn.disabled = true; btn.textContent = "Processando..." }
        definirStatus("Preparando leitura dos arquivos...", "processando");
        movimentacoesOCR = [];
        contadorMovimentacao = 0;

        const resultado = {
            documentos: [],
            movimentacoes: [],
            alertas: [],
            textoConsolidado: "",
            competencias: new Set(),
            instituicoes: new Set(),
            titular: "",
            documentoTitular: "",
            primeiraData: null,
            ultimaData: null
        };

        try {
            for (let i = 0; i < arquivosExtratoSelecionados.length; i++) {
                const arquivo = arquivosExtratoSelecionados[i];
                definirStatus(`Processando ${i + 1} de ${arquivosExtratoSelecionados.length}: ${arquivo.name}`, "processando");
                try {
                    const documento = await lerArquivoExtrato(arquivo, i);
                    const banco = identificarInstituicao(documento.texto);
                    documento.banco = banco;
                    resultado.documentos.push(documento);
                    if (banco) resultado.instituicoes.add(banco);

                    if (documento.texto) {
                        const dados = identificarDadosTitular(documento.texto);
                        if (!resultado.titular && dados.nome) resultado.titular = dados.nome;
                        if (!resultado.documentoTitular && dados.documento) resultado.documentoTitular = dados.documento;

                        const periodo = identificarPeriodoDocumento(documento.texto);
                        const datas = extrairDatasTexto(documento.texto);
                        const datasValidas = filtrarDatasDocumento(datas, periodo);

                        datasValidas.forEach(data => {
                            const comp = obterCompetencia(data);
                            resultado.competencias.add(comp);
                            if (!resultado.primeiraData || data < resultado.primeiraData) resultado.primeiraData = data;
                            if (!resultado.ultimaData || data > resultado.ultimaData) resultado.ultimaData = data;
                        });

                        if (periodo.inicio) {
                            resultado.competencias.add(obterCompetencia(periodo.inicio));
                            if (!resultado.primeiraData || periodo.inicio < resultado.primeiraData) resultado.primeiraData = periodo.inicio;
                        }
                        if (periodo.fim) {
                            resultado.competencias.add(obterCompetencia(periodo.fim));
                            if (!resultado.ultimaData || periodo.fim > resultado.ultimaData) resultado.ultimaData = periodo.fim;
                        }

                        const movs = extrairMovimentacoesDocumento(documento);
                        documento.movimentacoes = movs;
                        resultado.movimentacoes.push(...movs);
                        movimentacoesOCR.push(...movs);

                        const textoNormalizado = gerarTextoNormalizadoDocumento(documento, movs);
                        if (textoNormalizado) resultado.textoConsolidado += (resultado.textoConsolidado ? "\n" : "") + textoNormalizado;
                    }
                } catch (erro) {
                    console.error("Erro processando", arquivo.name, erro);
                    resultado.alertas.push(`${arquivo.name}: ${erro.message || "não foi possível realizar a leitura."}`);
                    resultado.documentos.push({ nome: arquivo.name, tamanho: arquivo.size, metodo: "Erro", banco: "", texto: "", movimentacoes: [], erro: String(erro.message || erro) });
                }
            }

            resultado.competencias = Array.from(resultado.competencias).sort();
            resultado.instituicoes = Array.from(resultado.instituicoes);
            resultado.movimentacoes = removerMovimentacoesDuplicadas(resultado.movimentacoes);
            movimentacoesOCR = resultado.movimentacoes;
            resultadoLeituraOCR = resultado;

            renderizarResultadoOCR(resultado);
            renderizarMovimentacoesOCR(resultado.movimentacoes);
            renderizarResumoPreliminar(resultado.movimentacoes, resultado.competencias);
            mostrarResultadoOCR();
            definirStatus(`Leitura concluída. ${resultado.documentos.length} arquivo(s) processado(s).`, "sucesso");
        } catch (erro) {
            console.error(erro);
            definirStatus(`Erro durante a leitura: ${erro.message || erro}`, "erro");
        } finally {
            if (btn) { btn.disabled = !arquivosExtratoSelecionados.length; btn.textContent = "Ler e Consolidar" }
        }
    }

    async function lerArquivoExtrato(arquivo, indice) {
        const ext = obterExtensao(arquivo.name);
        const base = { id: `ARQ${indice + 1}`, nome: arquivo.name, tamanho: arquivo.size, tipo: arquivo.type, metodo: "", texto: "", banco: "", movimentacoes: [] };

        if (["txt", "csv", "html", "htm"].includes(ext)) {
            base.metodo = "Leitura direta";
            base.texto = await arquivo.text();
            if (["html", "htm"].includes(ext)) base.texto = converterHTMLParaTexto(base.texto);
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
            return base;
        }
        throw new Error("Formato não suportado.");
    }

    async function lerPDF(arquivo) {
        if (typeof pdfjsLib === "undefined") throw new Error("PDF.js não foi carregado.");
        const buffer = await arquivo.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        const paginas = [];

        for (let numero = 1; numero <= pdf.numPages; numero++) {
            definirStatus(`Lendo ${arquivo.name} — página ${numero} de ${pdf.numPages}...`, "processando");
            const page = await pdf.getPage(numero);
            const conteudo = await page.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false });
            let texto = extrairTextoEstruturadoPDF(conteudo);

            if (texto.replace(/\s/g, "").length < 30) {
                const viewport = page.getViewport({ scale: 2 });
                const canvas = document.createElement("canvas");
                canvas.width = Math.ceil(viewport.width);
                canvas.height = Math.ceil(viewport.height);
                const ctx = canvas.getContext("2d", { willReadFrequently: true });
                await page.render({ canvasContext: ctx, viewport }).promise;
                const blob = await new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Falha ao converter página do PDF.")), "image/png"));
                texto = await executarOCRImagem(blob);
                canvas.width = 1;
                canvas.height = 1;
            }
            paginas.push(texto);
        }
        return paginas.join("\n");
    }

    function extrairTextoEstruturadoPDF(conteudo) {
        if (!conteudo || !Array.isArray(conteudo.items)) return "";
        const linhas = [];
        let linhaAtual = [];
        let yAtual = null;
        const tolerancia = 3;

        conteudo.items.forEach(item => {
            const str = String(item.str || "").trim();
            if (!str) return;
            const x = item.transform && item.transform.length >= 6 ? Number(item.transform[4]) : 0;
            const y = item.transform && item.transform.length >= 6 ? Number(item.transform[5]) : 0;
            if (yAtual === null || Math.abs(y - yAtual) <= tolerancia) {
                linhaAtual.push({ x, str });
                if (yAtual === null) yAtual = y;
            } else {
                if (linhaAtual.length) linhas.push(linhaAtual.sort((a, b) => a.x - b.x).map(i => i.str).join(" "));
                linhaAtual = [{ x, str }];
                yAtual = y;
            }
        });
        if (linhaAtual.length) linhas.push(linhaAtual.sort((a, b) => a.x - b.x).map(i => i.str).join(" "));
        return linhas.join("\n");
    }

    async function executarOCRImagem(arquivo) {
        if (typeof Tesseract === "undefined") throw new Error("Tesseract.js não foi carregado.");
        const resultado = await Tesseract.recognize(arquivo, "por", {
            logger: m => {
                if (m && m.status) {
                    const percentual = Number.isFinite(m.progress) ? ` ${Math.round(m.progress * 100)}%` : "";
                    definirStatus(`OCR: ${traduzirStatusOCR(m.status)}${percentual}`, "processando");
                }
            }
        });
        return resultado && resultado.data ? String(resultado.data.text || "") : "";
    }

    function extrairMovimentacoesDocumento(documento) {
        const banco = documento.banco || identificarInstituicao(documento.texto);
        const linhas = prepararLinhas(documento.texto);
        let movimentos = [];

        if (banco === "Banco Inter") movimentos = extrairMovimentacoesInter(linhas, documento);
        else if (banco === "Mercado Pago") movimentos = extrairMovimentacoesMercadoPago(linhas, documento);
        else if (banco === "Itaú") movimentos = extrairMovimentacoesItau(linhas, documento);
        else movimentos = extrairMovimentacoesGenericas(linhas, documento);

        if (!movimentos.length) movimentos = extrairMovimentacoesGenericas(linhas, documento);
        return movimentos;
    }

    function prepararLinhas(texto) {
        return String(texto || "")
            .replace(/\r/g, "\n")
            .split("\n")
            .map(l => l.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim())
            .filter(Boolean);
    }

    function extrairMovimentacoesInter(linhas, documento) {
        const resultado = [];
        for (let i = 0; i < linhas.length; i++) {
            const linha = linhas[i];
            const dataInfo = extrairDataDaLinha(linha);
            if (!dataInfo) continue;
            const valores = extrairValoresLinha(linha);
            if (!valores.length) continue;
            const historico = limparHistoricoMovimentacao(linha, dataInfo.texto, valores);
            if (!historico || linhaIgnorada(historico)) continue;

            let natureza = identificarNaturezaPorHistorico(historico);
            const normal = normalizar(historico);

            if (/\bPIX RECEBIDO\b|\bPIX RECEBIDA\b|\bTRANSFERENCIA RECEBIDA\b|\bTED RECEBIDA\b|\bDEPOSITO\b|\bRECEBIMENTO\b/.test(normal)) natureza = "C";
            if (/\bPIX ENVIADO\b|\bPAGAMENTO\b|\bCOMPRA\b|\bSAQUE\b|\bDEBITO\b/.test(normal)) natureza = "D";

            const valor = valores[valores.length - 1].valor;
            if (!valor) continue;
            resultado.push(criarMovimentacao(documento, dataInfo.data, historico, valor, natureza, linha));
        }
        return resultado;
    }

    function extrairMovimentacoesMercadoPago(linhas, documento) {
        const resultado = [];
        for (let i = 0; i < linhas.length; i++) {
            const linha = linhas[i];
            const dataInfo = extrairDataDaLinha(linha);
            if (!dataInfo) continue;
            const valores = extrairValoresLinha(linha);
            if (!valores.length) continue;

            const historico = limparHistoricoMovimentacao(linha, dataInfo.texto, valores);
            if (!historico || linhaIgnorada(historico)) continue;

            const normal = normalizar(historico);
            let natureza = "";

            if (/\bDINHEIRO RECEBIDO\b|\bTRANSFERENCIA RECEBIDA\b|\bPIX RECEBIDO\b|\bENTRADA\b|\bRECEBIMENTO\b/.test(normal)) natureza = "C";
            else if (/\bPAGAMENTO\b|\bTRANSFERENCIA ENVIADA\b|\bPIX ENVIADO\b|\bCOMPRA\b|\bSAIDA\b|\bSAQUE\b/.test(normal)) natureza = "D";
            else natureza = identificarNaturezaPorHistorico(historico);

            resultado.push(criarMovimentacao(documento, dataInfo.data, historico, valores[valores.length - 1].valor, natureza, linha));
        }
        return resultado;
    }

    function extrairMovimentacoesItau(linhas, documento) {
        const textoNormal = normalizar(documento.texto);
        if (/\bTOTAL DESTA FATURA\b|\bFATURA\b.*\bCARTAO\b|\bVENCIMENTO DA FATURA\b/.test(textoNormal)) return [];

        const resultado = [];
        for (let i = 0; i < linhas.length; i++) {
            const linha = linhas[i];
            const dataInfo = extrairDataDaLinha(linha);
            if (!dataInfo) continue;
            const valores = extrairValoresLinha(linha);
            if (!valores.length) continue;

            const historico = limparHistoricoMovimentacao(linha, dataInfo.texto, valores);
            if (!historico || linhaIgnorada(historico)) continue;

            let natureza = identificarNaturezaPorHistorico(historico);
            const normal = normalizar(historico);
            if (/\bTED\b.*\bRECEB|\bPIX\b.*\bRECEB|\bTRANSF\b.*\bRECEB|\bDEPOSITO\b|\bCREDITO\b/.test(normal)) natureza = "C";
            if (/\bPAGAMENTO\b|\bCOMPRA\b|\bDEBITO\b|\bSAQUE\b|\bPIX\b.*\bENVI/.test(normal)) natureza = "D";

            resultado.push(criarMovimentacao(documento, dataInfo.data, historico, valores[valores.length - 1].valor, natureza, linha));
        }
        return resultado;
    }

    function extrairMovimentacoesGenericas(linhas, documento) {
        const resultado = [];
        for (let i = 0; i < linhas.length; i++) {
            const linha = linhas[i];
            const dataInfo = extrairDataDaLinha(linha);
            if (!dataInfo) continue;
            const valores = extrairValoresLinha(linha);
            if (!valores.length) continue;

            const historico = limparHistoricoMovimentacao(linha, dataInfo.texto, valores);
            if (!historico || linhaIgnorada(historico)) continue;

            const valorInfo = valores[valores.length - 1];
            let natureza = valorInfo.indicador || identificarNaturezaPorHistorico(historico);

            if (!natureza) {
                const n = normalizar(linha);
                if (/\bCREDITO\b|\bCRED\b|\bRECEBIDO\b|\bRECEBIDA\b|\bDEPOSITO\b/.test(n)) natureza = "C";
                else if (/\bDEBITO\b|\bDEB\b|\bPAGAMENTO\b|\bCOMPRA\b|\bSAQUE\b|\bENVIADO\b|\bENVIADA\b/.test(n)) natureza = "D";
            }
            resultado.push(criarMovimentacao(documento, dataInfo.data, historico, valorInfo.valor, natureza, linha));
        }
        return resultado;
    }

    function criarMovimentacao(documento, data, historico, valor, natureza, original) {
        contadorMovimentacao++;
        const classificacao = classificarMovimentacaoOCR(historico, natureza);
        return {
            id: `MOV${String(contadorMovimentacao).padStart(6, "0")}`,
            data,
            dataTexto: formatarData(data),
            competencia: obterCompetencia(data),
            banco: documento.banco || "",
            arquivo: documento.nome || "",
            historico: String(historico || "").trim(),
            valor: Math.abs(Number(valor || 0)),
            natureza: natureza || "",
            classificacao: classificacao.classificacao,
            motivo: classificacao.motivo,
            considerar: classificacao.considerar,
            original: String(original || "")
        };
    }

    function classificarMovimentacaoOCR(historico, natureza) {
        const h = normalizar(historico);

        if (natureza === "D") return { considerar: false, classificacao: "Débito", motivo: "Movimentação de débito." };

        if (/\bSALDO\b|\bTOTAL\b|\bLIMITE\b|\bDISPONIVEL\b|\bRESUMO\b/.test(h))
            return { considerar: false, classificacao: "Informativo", motivo: "Saldo, total ou informação de limite." };

        if (/\bEMPRESTIMO\b|\bFINANCIAMENTO\b|\bLIBERACAO DE CREDITO\b|\bCREDITO PESSOAL\b|\bCAPITAL DE GIRO\b/.test(h))
            return { considerar: false, classificacao: "Empréstimo", motivo: "Crédito decorrente de empréstimo ou financiamento." };

        if (/\bESTORNO\b|\bDEVOLUCAO\b|\bREEMBOLSO\b|\bREVERSAO\b|\bCANCELAMENTO\b/.test(h))
            return { considerar: false, classificacao: "Estorno/Devolução", motivo: "Estorno, devolução ou cancelamento." };

        if (/\bRESGATE\b|\bAPLICACAO\b|\bCDB\b|\bRDB\b|\bRDC\b|\bINVESTIMENTO\b/.test(h))
            return { considerar: false, classificacao: "Investimento", motivo: "Aplicação ou resgate de investimento." };

        if (/\bCHEQUE ESPECIAL\b|\bLIMITE DE CREDITO\b|\bCREDITO ROTATIVO\b/.test(h))
            return { considerar: false, classificacao: "Limite", motivo: "Utilização ou liberação de limite." };

        if (natureza === "C") return { considerar: true, classificacao: "Crédito", motivo: "Crédito identificado no extrato." };

        if (/\bPIX RECEB|\bTRANSFERENCIA RECEB|\bTED RECEB|\bDEPOSITO\b|\bRECEBIMENTO\b|\bCREDITO EM CONTA\b/.test(h))
            return { considerar: true, classificacao: "Crédito", motivo: "Entrada de recursos identificada." };

        return { considerar: false, classificacao: "Conferir", motivo: "Natureza não identificada com segurança." };
    }

    function linhaIgnorada(historico) {
        const h = normalizar(historico);
        if (!h) return true;
        return [
            /\bSALDO ANTERIOR\b/, /\bSALDO DO DIA\b/, /\bSALDO FINAL\b/, /\bSALDO DISPONIVEL\b/,
            /\bTOTAL DE ENTRADAS\b/, /\bTOTAL ENTRADAS\b/, /\bTOTAL DE SAIDAS\b/, /\bTOTAL SAIDAS\b/,
            /\bTOTAL DE CREDITOS\b/, /\bTOTAL CREDITOS\b/, /\bTOTAL DE DEBITOS\b/, /\bTOTAL DEBITOS\b/,
            /\bEXTRATO DE CONTA\b/, /\bEXTRATO CONTA CORRENTE\b/, /\bPERIODO\b/, /\bDATA HISTORICO\b/,
            /\bVENCIMENTO DA FATURA\b/, /\bTOTAL DESTA FATURA\b/, /\bMELHOR DATA DE COMPRA\b/
        ].some(r => r.test(h));
    }

    function extrairDataDaLinha(linha) {
        const m = String(linha || "").match(/\b(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?\b/);
        if (!m) return null;
        let ano = m[3] ? Number(m[3]) : null;
        if (ano !== null && ano < 100) ano += ano >= 70 ? 1900 : 2000;

        if (ano === null) {
            const anoPeriodo = resultadoLeituraOCR && resultadoLeituraOCR.primeiraData ? resultadoLeituraOCR.primeiraData.getFullYear() : new Date().getFullYear();
            ano = anoPeriodo;
        }

        const dia = Number(m[1]);
        const mes = Number(m[2]);
        const data = criarDataSegura(ano, mes, dia);
        return data ? { data, texto: m[0] } : null;
    }

    function extrairValoresLinha(linha) {
        const resultados = [];
        const regex = /(?:R\$\s*)?([+-]?(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2})\s*([CD])?/gi;
        let m;
        while ((m = regex.exec(String(linha || ""))) !== null) {
            let numero = converterValor(m[1]);
            if (!Number.isFinite(numero)) continue;
            let indicador = String(m[2] || "").toUpperCase();
            if (numero < 0 && !indicador) indicador = "D";
            resultados.push({ valor: Math.abs(numero), indicador, texto: m[0], indice: m.index });
        }
        return resultados;
    }

    function limparHistoricoMovimentacao(linha, dataTexto, valores) {
        let texto = String(linha || "");
        if (dataTexto) texto = texto.replace(dataTexto, " ");
        valores.slice().reverse().forEach(v => { texto = texto.replace(v.texto, " ") });
        return texto
            .replace(/\b\d{6,20}\b/g, " ")
            .replace(/\s+/g, " ")
            .replace(/^[|:;\-–—]+|[|:;\-–—]+$/g, "")
            .trim();
    }

    function identificarNaturezaPorHistorico(historico) {
        const h = normalizar(historico);
        if (/\b(RECEBIDO|RECEBIDA|RECEBIMENTO|DEPOSITO|CREDITO|CRED|ENTRADA)\b/.test(h)) return "C";
        if (/\b(ENVIADO|ENVIADA|PAGAMENTO|COMPRA|SAQUE|DEBITO|DEB|SAIDA)\b/.test(h)) return "D";
        return "";
    }

    function gerarTextoNormalizadoDocumento(documento, movimentos) {
        return movimentos.map(m => {
            const indicador = m.natureza || "";
            return `${m.dataTexto} | [ID:${m.id}] [BANCO:${documento.banco || "Não identificado"}] [ARQUIVO:${documento.nome}] [DECISAO:${m.considerar ? "INCLUIR" : "EXCLUIR"}] ${m.historico} | ${formatarValorNumero(m.valor)} ${indicador}`;
        }).join("\n");
    }

    function renderizarMovimentacoesOCR(movimentos) {
        const tabela = document.getElementById("tabelaMovimentacoesOCR");
        if (!tabela) return;
        const tbody = tabela.tagName === "TBODY" ? tabela : tabela.querySelector("tbody");
        if (!tbody) return;
        tbody.innerHTML = "";

        if (!movimentos.length) {
            tbody.innerHTML = '<tr><td colspan="8" class="sem-dados">Nenhuma movimentação identificada.</td></tr>';
            return;
        }

        movimentos.slice().sort((a, b) => a.data - b.data).forEach(m => {
            const tr = document.createElement("tr");
            tr.dataset.id = m.id;
            tr.innerHTML = `<td><input type="checkbox" class="chk-movimentacao-ocr" data-id="${m.id}" ${m.considerar ? "checked" : ""}></td><td>${escaparHTML(m.dataTexto)}</td><td>${escaparHTML(m.banco || "-")}</td><td>${escaparHTML(m.historico)}</td><td>${escaparHTML(formatarMoeda(m.valor))}</td><td>${escaparHTML(m.natureza === "C" ? "Crédito" : m.natureza === "D" ? "Débito" : "-")}</td><td>${escaparHTML(m.classificacao)}</td><td>${escaparHTML(m.motivo)}</td>`;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll(".chk-movimentacao-ocr").forEach(chk => {
            chk.addEventListener("change", () => {
                const mov = movimentacoesOCR.find(m => m.id === chk.dataset.id);
                if (!mov) return;
                mov.considerar = chk.checked;
                mov.classificacao = chk.checked ? "Crédito" : "Desconsiderado";
                mov.motivo = chk.checked ? "Selecionado para o cálculo." : "Desmarcado na conferência.";
                renderizarResumoPreliminar(movimentacoesOCR, resultadoLeituraOCR ? resultadoLeituraOCR.competencias : []);
            });
        });
    }

    function renderizarResumoPreliminar(movimentos, competencias) {
        const validos = movimentos.filter(m => m.considerar);
        const total = validos.reduce((s, m) => s + m.valor, 0);
        const comps = Array.from(new Set((competencias || []).filter(Boolean))).sort();
        const meses = comps.length;
        const media = meses ? total / meses : 0;

        setTextoMultiplos(["ocrMediaMensal", "resultadoMediaOCR", "mediaMensalOCR"], formatarMoeda(media));
        setTextoMultiplos(["ocrTotalCreditos", "resultadoTotalOCR", "totalCreditosOCR"], formatarMoeda(total));
        setTextoMultiplos(["ocrMesesConsiderados", "resultadoMesesOCR", "mesesConsideradosOCR"], String(meses));

        const porMes = new Map();
        validos.forEach(m => {
            if (!porMes.has(m.competencia)) porMes.set(m.competencia, { quantidade: 0, total: 0, bancos: new Set() });
            const x = porMes.get(m.competencia);
            x.quantidade++;
            x.total += m.valor;
            if (m.banco) x.bancos.add(m.banco);
        });

        let maior = "";
        let maiorValor = -1;
        porMes.forEach((v, k) => { if (v.total > maiorValor) { maiorValor = v.total; maior = k } });
        setTextoMultiplos(["ocrMaiorMovimentacao", "resultadoMaiorMesOCR", "mesMaiorMovimentacaoOCR"], maior ? formatarCompetencia(maior) : "-");

        renderizarTabelaCreditosMes(comps, porMes);
        renderizarTabelaInstituicoes(validos, comps);
    }

    function renderizarTabelaCreditosMes(competencias, porMes) {
        const tabela = document.getElementById("tabelaCreditosMesOCR");
        if (!tabela) return;
        const tbody = tabela.tagName === "TBODY" ? tabela : tabela.querySelector("tbody");
        if (!tbody) return;
        tbody.innerHTML = "";
        if (!competencias.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="sem-dados">Nenhuma leitura realizada.</td></tr>';
            return;
        }
        competencias.forEach(comp => {
            const dados = porMes.get(comp) || { quantidade: 0, total: 0, bancos: new Set() };
            const tr = document.createElement("tr");
            tr.innerHTML = `<td>${escaparHTML(formatarCompetencia(comp))}</td><td>${dados.quantidade}</td><td>${escaparHTML(Array.from(dados.bancos).join(", ") || "-")}</td><td>${escaparHTML(formatarMoeda(dados.total))}</td>`;
            tbody.appendChild(tr);
        });
    }

    function renderizarTabelaInstituicoes(validos, competencias) {
        const tabela = document.getElementById("tabelaInstituicoesOCR");
        if (!tabela) return;
        const tbody = tabela.tagName === "TBODY" ? tabela : tabela.querySelector("tbody");
        if (!tbody) return;
        tbody.innerHTML = "";

        const mapa = new Map();
        validos.forEach(m => {
            if (!mapa.has(m.banco || "Não identificado")) mapa.set(m.banco || "Não identificado", { quantidade: 0, total: 0, competencias: new Set() });
            const x = mapa.get(m.banco || "Não identificado");
            x.quantidade++;
            x.total += m.valor;
            x.competencias.add(m.competencia);
        });

        if (!mapa.size) {
            tbody.innerHTML = '<tr><td colspan="4" class="sem-dados">Nenhuma leitura realizada.</td></tr>';
            return;
        }

        Array.from(mapa.entries()).sort((a, b) => a[0].localeCompare(b[0], "pt-BR")).forEach(([banco, dados]) => {
            const divisor = dados.competencias.size || competencias.length || 1;
            const tr = document.createElement("tr");
            tr.innerHTML = `<td>${escaparHTML(banco)}</td><td>${dados.quantidade}</td><td>${escaparHTML(formatarMoeda(dados.total))}</td><td>${escaparHTML(formatarMoeda(dados.total / divisor))}</td>`;
            tbody.appendChild(tr);
        });
    }

    function aplicarLeituraAoCalculo() {
        if (!resultadoLeituraOCR) {
            alert("Nenhum extrato foi processado.");
            return;
        }

        const selecionadas = movimentacoesOCR.filter(m => m.considerar);
        if (!selecionadas.length) {
            alert("Nenhum crédito foi selecionado para o cálculo.");
            return;
        }

        const texto = selecionadas.map(m => `${m.dataTexto} | [ID:${m.id}] [BANCO:${m.banco}] [ARQUIVO:${m.arquivo}] [DECISAO:INCLUIR] ${m.historico} | ${formatarValorNumero(m.valor)} C`).join("\n");

        if (window.MediaMovimentacao && typeof window.MediaMovimentacao.processarTexto === "function") {
            window.MediaMovimentacao.processarTexto(texto, { competenciasDocumentadas: resultadoLeituraOCR.competencias });
        } else {
            const textarea = document.getElementById("textoExtratoMovimentacao");
            if (textarea) textarea.value = texto;
            console.error("MediaMovimentacao.processarTexto não está disponível.");
            alert("A leitura foi concluída, mas o módulo de cálculo não está disponível.");
            return;
        }

        const card = document.getElementById("cardResultadoMovimentacao");
        if (card) setTimeout(() => card.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }

    function renderizarResultadoOCR(resultado) {
        setTexto("ocrNomeTitular", resultado.titular || "Não identificado");
        setTexto("ocrDocumentoTitular", resultado.documentoTitular || "Não identificado");
        setTexto("ocrPeriodoLeitura", formatarPeriodo(resultado.primeiraData, resultado.ultimaData));
        setTexto("ocrInstituicoes", resultado.instituicoes.length ? resultado.instituicoes.join(", ") : "Não identificadas");
        setTexto("ocrQuantidadeArquivos", resultado.documentos.length);
        renderizarDocumentosOCR(resultado.documentos);
        renderizarAlertasOCR(resultado.alertas);
        atualizarResumoLeitura(resultado);
    }

    function renderizarDocumentosOCR(documentos) {
        const el = document.getElementById("listaDocumentosOCR");
        if (!el) return;
        if (!documentos.length) {
            el.innerHTML = '<div class="sem-dados">Nenhum documento processado.</div>';
            return;
        }
        el.innerHTML = documentos.map(doc => `<div class="documento-ocr-item"><div><strong>${escaparHTML(doc.nome)}</strong><span>${escaparHTML(doc.banco || "Instituição não identificada")}</span></div><div class="documento-ocr-meta"><span>${escaparHTML(doc.metodo || "-")}</span><span>${formatarTamanhoArquivo(doc.tamanho || 0)}</span></div></div>`).join("");
    }

    function renderizarAlertasOCR(alertas) {
        const el = document.getElementById("listaAlertasOCR");
        if (!el) return;
        el.innerHTML = alertas.length ? alertas.map(a => `<div class="aviso-atencao">${escaparHTML(a)}</div>`).join("") : '<div class="aviso-info">Nenhum alerta adicional.</div>';
    }

    function atualizarResumoLeitura(resultado) {
        const textarea = document.getElementById("resumoLeituraOCR");
        if (!textarea) return;
        const validos = resultado.movimentacoes.filter(m => m.considerar);
        textarea.value = [
            "RESUMO DA LEITURA DOS EXTRATOS",
            `Arquivos processados: ${resultado.documentos.length}`,
            `Titular: ${resultado.titular || "Não identificado"}`,
            `CPF/CNPJ: ${resultado.documentoTitular || "Não identificado"}`,
            `Instituições: ${resultado.instituicoes.length ? resultado.instituicoes.join(", ") : "Não identificadas"}`,
            `Período: ${formatarPeriodo(resultado.primeiraData, resultado.ultimaData)}`,
            `Competências: ${resultado.competencias.length ? resultado.competencias.map(formatarCompetencia).join(", ") : "Não identificadas"}`,
            `Movimentações identificadas: ${resultado.movimentacoes.length}`,
            `Créditos pré-selecionados: ${validos.length}`,
            `Alertas: ${resultado.alertas.length}`
        ].join("\n");
    }

    async function copiarResumoLeitura() {
        const campo = document.getElementById("resumoLeituraOCR");
        if (!campo) return;
        try {
            await navigator.clipboard.writeText(campo.value);
            const btn = document.getElementById("btnCopiarResumoOCR");
            if (btn) {
                const original = btn.textContent;
                btn.textContent = "Copiado";
                setTimeout(() => btn.textContent = original, 1500);
            }
        } catch (e) {
            campo.select();
            document.execCommand("copy");
        }
    }

    function alterarSelecaoMovimentacoes(marcar) {
        document.querySelectorAll('#tabelaMovimentacoesOCR input[type="checkbox"]').forEach(c => {
            c.checked = marcar;
            const mov = movimentacoesOCR.find(m => m.id === c.dataset.id);
            if (mov) mov.considerar = marcar;
        });
        if (resultadoLeituraOCR) renderizarResumoPreliminar(movimentacoesOCR, resultadoLeituraOCR.competencias);
    }

    function identificarPeriodoDocumento(texto) {
        const t = String(texto || "");
        const padroes = [
            /PER[IÍ]ODO\s*:?\s*(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})\s*(?:A|AT[EÉ]|-)\s*(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/i,
            /DE\s*(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})\s*(?:A|AT[EÉ])\s*(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/i,
            /(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})\s*(?:A|AT[EÉ])\s*(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/i
        ];
        for (const regex of padroes) {
            const m = t.match(regex);
            if (m) {
                const inicio = converterDataTexto(m[1]);
                const fim = converterDataTexto(m[2]);
                if (inicio && fim) return { inicio, fim };
            }
        }
        return { inicio: null, fim: null };
    }

    function filtrarDatasDocumento(datas, periodo) {
        if (!datas.length) return [];
        if (periodo.inicio && periodo.fim) {
            const margemInicio = new Date(periodo.inicio);
            const margemFim = new Date(periodo.fim);
            margemInicio.setDate(margemInicio.getDate() - 3);
            margemFim.setDate(margemFim.getDate() + 3);
            return datas.filter(d => d >= margemInicio && d <= margemFim);
        }
        const anos = new Map();
        datas.forEach(d => anos.set(d.getFullYear(), (anos.get(d.getFullYear()) || 0) + 1));
        const anoPrincipal = Array.from(anos.entries()).sort((a, b) => b[1] - a[1])[0];
        return anoPrincipal ? datas.filter(d => d.getFullYear() === anoPrincipal[0]) : datas;
    }

    function identificarInstituicao(texto) {
        const t = normalizar(texto);
        const bancos = [
            ["MERCADO PAGO", "Mercado Pago"], ["BANCO INTER", "Banco Inter"], ["INTER CO", "Banco Inter"],
            ["ITAU", "Itaú"], ["SICOOB", "Sicoob"], ["SICREDI", "Sicredi"], ["BRADESCO", "Bradesco"],
            ["BANCO DO BRASIL", "Banco do Brasil"], ["CAIXA ECONOMICA", "Caixa Econômica Federal"],
            ["SANTANDER", "Santander"], ["NUBANK", "Nubank"], ["C6 BANK", "C6 Bank"], ["PAGBANK", "PagBank"]
        ];
        const encontrado = bancos.find(([chave]) => t.includes(chave));
        return encontrado ? encontrado[1] : "";
    }

    function identificarDadosTitular(texto) {
        const original = String(texto || "");
        const documento = extrairDocumentoTitular(original);
        const nome = extrairNomeTitular(original);
        return { documento, nome };
    }

    function extrairDocumentoTitular(texto) {
        const padroes = [
            /\bCNPJ\s*:?\s*(\d{2}[.\s]?\d{3}[.\s]?\d{3}[\/\s]?\d{4}[-\s]?\d{2})/i,
            /\bCPF\s*:?\s*(\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2})/i,
            /\b(?:CPF|CNPJ)\s*:?\s*([0-9.\-\/\s]{11,20})/i
        ];
        for (const regex of padroes) {
            const m = texto.match(regex);
            if (m) {
                const n = String(m[1]).replace(/\D/g, "");
                if (n.length === 11 || n.length === 14) return n;
            }
        }
        return "";
    }

    function extrairNomeTitular(texto) {
        const linhas = prepararLinhas(texto);
        const padroes = [
            /^(?:TITULAR|CLIENTE|NOME)\s*:?\s*(.+)$/i,
            /^(?:NOME DO CLIENTE|NOME DO TITULAR)\s*:?\s*(.+)$/i
        ];
        for (const linha of linhas) {
            for (const regex of padroes) {
                const m = linha.match(regex);
                if (m) {
                    const nome = String(m[1] || "").replace(/\s+/g, " ").trim();
                    if (nome.length >= 3 && nome.length <= 100) return nome;
                }
            }
        }
        return "";
    }

    function extrairDatasTexto(texto) {
        const datas = [];
        const vistos = new Set();
        const regex = /\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\b/g;
        let m;
        while ((m = regex.exec(String(texto || ""))) !== null) {
            let ano = Number(m[3]);
            if (ano < 100) ano += ano >= 70 ? 1900 : 2000;
            const mes = Number(m[2]);
            const dia = Number(m[1]);
            const d = criarDataSegura(ano, mes, dia);
            if (!d) continue;
            const chave = `${ano}-${mes}-${dia}`;
            if (!vistos.has(chave)) { vistos.add(chave); datas.push(d) }
        }
        return datas.sort((a, b) => a - b);
    }

    function converterDataTexto(texto) {
        const m = String(texto || "").match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
        if (!m) return null;
        let ano = Number(m[3]);
        if (ano < 100) ano += ano >= 70 ? 1900 : 2000;
        return criarDataSegura(ano, Number(m[2]), Number(m[1]));
    }

    function criarDataSegura(ano, mes, dia) {
        if (!Number.isInteger(ano) || !Number.isInteger(mes) || !Number.isInteger(dia)) return null;
        if (ano < 1900 || ano > 2200 || mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
        const d = new Date(ano, mes - 1, dia, 12, 0, 0, 0);
        if (d.getFullYear() !== ano || d.getMonth() !== mes - 1 || d.getDate() !== dia) return null;
        return d;
    }

    function removerMovimentacoesDuplicadas(lista) {
        const vistos = new Set();
        return lista.filter(m => {
            const chave = [m.dataTexto, m.banco, normalizar(m.historico), m.valor.toFixed(2)].join("|");
            if (vistos.has(chave)) return false;
            vistos.add(chave);
            return true;
        });
    }

    function formatarPeriodo(inicio, fim) {
        if (!inicio && !fim) return "Não identificado";
        if (inicio && fim) return `${formatarData(inicio)} a ${formatarData(fim)}`;
        return formatarData(inicio || fim);
    }

    function formatarData(data) {
        return data instanceof Date && !Number.isNaN(data.getTime()) ? data.toLocaleDateString("pt-BR") : "Não identificado";
    }

    function obterCompetencia(data) {
        return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
    }

    function formatarCompetencia(comp) {
        const p = String(comp || "").split("-");
        return p.length === 2 ? `${p[1]}/${p[0]}` : comp;
    }

    function converterValor(valor) {
        let s = String(valor || "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
        s = s.replace(/[^\d+\-.]/g, "");
        return Number(s);
    }

    function formatarValorNumero(valor) {
        return Number(valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function formatarMoeda(valor) {
        return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function converterHTMLParaTexto(html) {
        const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
        return (doc.body ? doc.body.innerText : doc.documentElement.innerText || "").replace(/\u00a0/g, " ");
    }

    function obterExtensao(nome) {
        const partes = String(nome || "").toLowerCase().split(".");
        return partes.length > 1 ? partes.pop() : "";
    }

    function formatarTamanhoArquivo(bytes) {
        const n = Number(bytes || 0);
        if (n < 1024) return `${n} B`;
        if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
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
        return mapa[String(status || "").toLowerCase()] || status;
    }

    function normalizar(texto) {
        return String(texto || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toUpperCase()
            .replace(/\u00a0/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function mostrarResultadoOCR() {
        const card = document.getElementById("cardResultadoLeituraExtratos");
        if (card) {
            card.hidden = false;
            setTimeout(() => card.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
        }
    }

    function ocultarResultadoOCR() {
        const card = document.getElementById("cardResultadoLeituraExtratos");
        if (card) card.hidden = true;
    }

    function limparTabelasOCR() {
        ["tabelaMovimentacoesOCR", "tabelaCreditosMesOCR", "tabelaInstituicoesOCR"].forEach(id => {
            const tabela = document.getElementById(id);
            if (!tabela) return;
            const tbody = tabela.tagName === "TBODY" ? tabela : tabela.querySelector("tbody");
            if (tbody) tbody.innerHTML = "";
        });
    }

    function definirStatus(texto, tipo) {
        const el = document.getElementById("statusLeituraExtrato");
        if (!el) return;
        el.textContent = texto;
        el.className = `status-leitura-ocr status-${tipo || "info"}`;
    }

    function setTexto(id, valor) {
        const el = document.getElementById(id);
        if (el) el.textContent = valor;
    }

    function setTextoMultiplos(ids, valor) {
        ids.forEach(id => setTexto(id, valor));
    }

    function escaparHTML(valor) {
        return String(valor ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
    }

    window.leituraExtratosMovimentacao = {
        obterArquivos: () => arquivosExtratoSelecionados.slice(),
        obterResultado: () => resultadoLeituraOCR,
        obterMovimentacoes: () => movimentacoesOCR.slice(),
        processar: processarArquivosExtrato,
        aplicar: aplicarLeituraAoCalculo,
        limpar: limparArquivosExtrato
    };

})();