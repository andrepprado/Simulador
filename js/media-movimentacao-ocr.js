(function () {
    "use strict";

    let arquivosExtratoSelecionados = [];
    let resultadoLeituraOCR = null;

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
            area.addEventListener("dragleave", () => area.classList.remove("arrastando"));
            area.addEventListener("drop", e => {
                e.preventDefault();
                area.classList.remove("arrastando");
                if (e.dataTransfer && e.dataTransfer.files) adicionarArquivos(e.dataTransfer.files);
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
        definirStatus("Pronto para ler os extratos.", "info");
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
                    resultado.documentos.push(documento);

                    if (!documento.texto) continue;

                    if (documento.banco) resultado.instituicoes.add(documento.banco);

                    const dados = identificarDadosTitular(documento.texto);

                    if (!resultado.titular && dados.nome) resultado.titular = dados.nome;
                    if (!resultado.documentoTitular && dados.documento) resultado.documentoTitular = dados.documento;

                    const datas = extrairDatasTexto(documento.texto);

                    datas.forEach(data => {
                        const comp = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
                        resultado.competencias.add(comp);

                        if (!resultado.primeiraData || data < resultado.primeiraData)
                            resultado.primeiraData = data;

                        if (!resultado.ultimaData || data > resultado.ultimaData)
                            resultado.ultimaData = data;
                    });

                    const movimentos = extrairMovimentacoesDocumento(documento);

                    movimentos.forEach(m => {
                        resultado.movimentacoes.push(m);

                        const d = parseDataBR(m.data);

                        if (d) {
                            const comp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                            resultado.competencias.add(comp);

                            if (!resultado.primeiraData || d < resultado.primeiraData)
                                resultado.primeiraData = d;

                            if (!resultado.ultimaData || d > resultado.ultimaData)
                                resultado.ultimaData = d;
                        }
                    });
                } catch (erro) {
                    console.error("Erro processando", arquivo.name, erro);

                    resultado.alertas.push(
                        `${arquivo.name}: ${erro.message || "não foi possível realizar a leitura."}`
                    );

                    resultado.documentos.push({
                        nome: arquivo.name,
                        tamanho: arquivo.size,
                        metodo: "Erro",
                        banco: "",
                        texto: "",
                        erro: String(erro.message || erro)
                    });
                }
            }

            resultado.competencias = Array.from(resultado.competencias).sort();
            resultado.instituicoes = Array.from(resultado.instituicoes);

            removerMovimentacoesDuplicadas(resultado);
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
            banco: ""
        };

        if (["txt", "csv", "html", "htm"].includes(ext)) {
            base.metodo = "Leitura direta";
            base.texto = await arquivo.text();

            if (["html", "htm"].includes(ext))
                base.texto = converterHTMLParaTexto(base.texto);

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
        if (typeof pdfjsLib === "undefined")
            throw new Error("PDF.js não foi carregado.");

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
                grupo = { y: y, itens: [] };
                grupos.push(grupo);
            }

            grupo.itens.push({ x: x, texto: texto });
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
        if (typeof pdfjsLib === "undefined")
            throw new Error("PDF.js não foi carregado.");

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
                viewport: viewport
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
        if (typeof Tesseract === "undefined")
            throw new Error("Tesseract.js não foi carregado.");

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

    /* =========================================================
       EXTRAÇÃO DAS MOVIMENTAÇÕES
    ========================================================= */

    function extrairMovimentacoesDocumento(documento) {
        const banco = documento.banco || identificarInstituicao(documento.texto);

        if (banco === "Mercado Pago")
            return extrairMercadoPago(documento);

        return extrairGenerico(documento);
    }

    /* =========================================================
       MERCADO PAGO
    ========================================================= */

    function extrairMercadoPago(documento) {
        const linhas = String(documento.texto || "")
            .replace(/\r/g, "")
            .split("\n")
            .map(l => l.replace(/\s+/g, " ").trim())
            .filter(Boolean);

        const movimentos = [];
        let dataAtual = "";

        linhas.forEach(linha => {
            const dataEncontrada = extrairPrimeiraData(linha);

            if (dataEncontrada)
                dataAtual = dataEncontrada;

            if (!dataAtual) return;

            const normal = normalizar(linha);

            if (deveIgnorarLinhaMercadoPago(normal))
                return;

            const valores = extrairValoresMonetarios(linha);

            if (!valores.length) return;

            const operacao = identificarOperacaoMercadoPago(linha, normal);

            if (!operacao) return;

            let valor = selecionarValorMovimentacaoMercadoPago(linha, valores, operacao);

            if (!Number.isFinite(valor) || valor <= 0)
                return;

            let historico = limparHistoricoMercadoPago(linha);

            if (!historico)
                historico = operacao.historico;

            movimentos.push(criarMovimentacao({
                data: dataAtual,
                banco: "Mercado Pago",
                arquivo: documento.nome,
                historico: historico,
                valor: valor,
                natureza: operacao.natureza,
                classificacao: operacao.classificacao,
                motivo: operacao.motivo,
                considerar: operacao.considerar
            }));
        });

        return movimentos;
    }

    function deveIgnorarLinhaMercadoPago(normal) {
        if (!normal) return true;

        const ignorar = [
            "DETALHE DOS MOVIMENTOS",
            "DATA DESCRICAO ID DA OPERACAO VALOR SALDO",
            "SALDO ANTERIOR",
            "SALDO FINAL",
            "TOTAL DE ENTRADAS",
            "TOTAL DE SAIDAS",
            "ENTRADAS:",
            "SAIDAS:",
            "RESUMO",
            "PERIODO",
            "CPF",
            "CNPJ"
        ];

        return ignorar.some(x => normal === x || normal.startsWith(x));
    }

    function identificarOperacaoMercadoPago(linha, normal) {
        const negativo = temValorNegativo(linha);

        const debitos = [
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

        if (negativo || debitos.some(x => normal.includes(x))) {
            return {
                natureza: "Débito",
                classificacao: "Débito",
                considerar: false,
                historico: "Débito",
                motivo: "Movimentação de débito."
            };
        }

        const creditos = [
            "LIBERACAO DE DINHEIRO",
            "PIX RECEBIDO",
            "DINHEIRO RECEBIDO",
            "TRANSFERENCIA RECEBIDA",
            "TED RECEBIDA",
            "DEPOSITO RECEBIDO",
            "RECEBIMENTO",
            "DINHEIRO LIBERADO",
            "ENTRADA DE DINHEIRO",
            "CREDITO RECEBIDO"
        ];

        if (creditos.some(x => normal.includes(x))) {
            return {
                natureza: "Crédito",
                classificacao: "Crédito",
                considerar: true,
                historico: "Crédito",
                motivo: "Entrada de recursos identificada."
            };
        }

        if (/\b\d{9,15}\b/.test(linha) && !negativo) {
            return {
                natureza: "-",
                classificacao: "Conferir",
                considerar: false,
                historico: "Movimentação",
                motivo: "Natureza não identificada com segurança."
            };
        }

        return null;
    }

    function selecionarValorMovimentacaoMercadoPago(linha, valores, operacao) {
        const id = linha.match(/\b\d{9,15}\b/);

        if (id) {
            const depoisId = linha.substring((id.index || 0) + id[0].length);
            const depois = extrairValoresMonetarios(depoisId);

            if (depois.length)
                return Math.abs(depois[0]);
        }

        if (valores.length === 1)
            return Math.abs(valores[0]);

        if (operacao)
            return Math.abs(valores[0]);

        return NaN;
    }

    function limparHistoricoMercadoPago(linha) {
        let h = String(linha || "");

        h = h.replace(/\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/g, " ");
        h = h.replace(/\b\d{9,15}\b/g, " ");
        h = h.replace(/R\$\s*-?\s*[\d.]+,\d{2}/gi, " ");
        h = h.replace(/\s+/g, " ").trim();

        h = h.replace(/^Data\s+Descrição\s+ID\s+da\s+operação\s+Valor\s+Saldo\s*/i, "");
        h = h.replace(/^DETALHE DOS MOVIMENTOS\s*/i, "");

        return h.trim();
    }

    /* =========================================================
       OUTROS BANCOS
    ========================================================= */

    function extrairGenerico(documento) {
        const linhas = String(documento.texto || "")
            .replace(/\r/g, "")
            .split("\n")
            .map(l => l.replace(/\s+/g, " ").trim())
            .filter(Boolean);

        const movimentos = [];
        let dataAtual = "";

        linhas.forEach(linha => {
            const data = extrairPrimeiraData(linha);
            if (data) dataAtual = data;

            if (!dataAtual) return;

            const normal = normalizar(linha);

            if (deveIgnorarLinhaGenerica(normal))
                return;

            const valores = extrairValoresMonetarios(linha);
            if (!valores.length) return;

            const natureza = classificarNaturezaGenerica(linha, normal);

            if (!natureza) return;

            const valor = selecionarValorGenerico(linha, valores);

            if (!Number.isFinite(valor) || valor <= 0)
                return;

            movimentos.push(criarMovimentacao({
                data: dataAtual,
                banco: documento.banco || "Não identificado",
                arquivo: documento.nome,
                historico: limparHistoricoGenerico(linha),
                valor: valor,
                natureza: natureza.natureza,
                classificacao: natureza.classificacao,
                motivo: natureza.motivo,
                considerar: natureza.considerar
            }));
        });

        return movimentos;
    }

    function deveIgnorarLinhaGenerica(normal) {
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

    function classificarNaturezaGenerica(linha, normal) {
        if (
            temValorNegativo(linha) ||
            /\bD\b/.test(normal) ||
            normal.includes("DEBITO") ||
            normal.includes("PAGAMENTO") ||
            normal.includes("COMPRA") ||
            normal.includes("PIX ENVIADO") ||
            normal.includes("SAQUE")
        ) {
            return {
                natureza: "Débito",
                classificacao: "Débito",
                considerar: false,
                motivo: "Movimentação de débito."
            };
        }

        const credito = [
            "PIX RECEBIDO",
            "TRANSFERENCIA RECEBIDA",
            "TED RECEBIDA",
            "DEPOSITO",
            "CREDITO",
            "RECEBIMENTO",
            "SALARIO",
            "PROVENTO"
        ];

        if (credito.some(x => normal.includes(x))) {
            return {
                natureza: "Crédito",
                classificacao: "Crédito",
                considerar: true,
                motivo: "Entrada de recursos identificada."
            };
        }

        return {
            natureza: "-",
            classificacao: "Conferir",
            considerar: false,
            motivo: "Natureza não identificada com segurança."
        };
    }

    function selecionarValorGenerico(linha, valores) {
        if (valores.length === 1)
            return Math.abs(valores[0]);

        return Math.abs(valores[0]);
    }

    function limparHistoricoGenerico(linha) {
        return String(linha || "")
            .replace(/\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/g, " ")
            .replace(/R\$\s*-?\s*[\d.]+,\d{2}/gi, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    /* =========================================================
       MOVIMENTAÇÃO
    ========================================================= */

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
            considerar: dados.considerar === true
        };
    }

    function gerarIdMovimentacao(d) {
        return [
            d.arquivo || "",
            d.data || "",
            d.banco || "",
            normalizar(d.historico || ""),
            Number(d.valor || 0).toFixed(2)
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

            if (!mapa.has(chave))
                mapa.set(chave, m);
        });

        resultado.movimentacoes = Array.from(mapa.values()).sort((a, b) => {
            const da = parseDataBR(a.data);
            const db = parseDataBR(b.data);

            if (da && db && da - db !== 0)
                return da - db;

            return a.banco.localeCompare(b.banco);
        });
    }

    /* =========================================================
       INTEGRAÇÃO COM media-movimentacao.js
    ========================================================= */

    function gerarTextoConsolidado(movimentacoes) {
        return movimentacoes.map(m => {
            const indicador = m.natureza === "Crédito"
                ? "C"
                : m.natureza === "Débito"
                    ? "D"
                    : "";

            return [
                m.data,
                m.banco,
                m.historico,
                formatarValorNumero(m.valor),
                indicador
            ].join(" | ");
        }).join("\n");
    }

    function enviarMovimentacoesParaCalculadora(resultado) {
        const texto = gerarTextoConsolidado(resultado.movimentacoes);
        resultado.textoConsolidado = texto;

        if (typeof window.processarTextoMovimentacao === "function") {
            try {
                window.processarTextoMovimentacao(texto, {
                    competenciasDocumentadas: resultado.competencias
                });
            } catch (e) {
                console.error("Erro ao enviar movimentações para media-movimentacao.js:", e);
            }
        }

        renderizarTabelaMovimentacoesOCR(resultado);
        atualizarResumoLeitura(resultado);
    }

    function renderizarTabelaMovimentacoesOCR(resultado) {
        const tabela = document.getElementById("tabelaMovimentacoesOCR");
        if (!tabela) return;

        const tbody = tabela.querySelector("tbody");
        if (!tbody) return;

        if (!resultado.movimentacoes.length) {
            tbody.innerHTML = '<tr><td colspan="8" class="sem-dados">Nenhuma leitura realizada.</td></tr>';
            return;
        }

        tbody.innerHTML = resultado.movimentacoes.map((m, i) => `
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

        tbody.querySelectorAll(".check-movimentacao-ocr").forEach(check => {
            check.addEventListener("change", () => {
                const indice = Number(check.dataset.indice);

                if (resultadoLeituraOCR && resultadoLeituraOCR.movimentacoes[indice]) {
                    resultadoLeituraOCR.movimentacoes[indice].considerar = check.checked;
                    atualizarCalculosOCR(resultadoLeituraOCR);
                    atualizarResumoLeitura(resultadoLeituraOCR);
                }
            });
        });

        atualizarCalculosOCR(resultado);
    }

    function alterarSelecaoMovimentacoes(marcar) {
        if (!resultadoLeituraOCR) return;

        resultadoLeituraOCR.movimentacoes.forEach(m => {
            if (marcar)
                m.considerar = m.natureza === "Crédito";
            else
                m.considerar = false;
        });

        renderizarTabelaMovimentacoesOCR(resultadoLeituraOCR);
        atualizarResumoLeitura(resultadoLeituraOCR);
    }

    function atualizarCalculosOCR(resultado) {
        const creditos = resultado.movimentacoes.filter(m =>
            m.considerar === true &&
            m.natureza === "Crédito" &&
            Number(m.valor) > 0
        );

        const porMes = {};
        const porBanco = {};

        creditos.forEach(m => {
            const data = parseDataBR(m.data);
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

        const total = creditos.reduce((s, m) => s + Number(m.valor || 0), 0);

        const quantidadeMeses = resultado.competencias && resultado.competencias.length
            ? resultado.competencias.length
            : Object.keys(porMes).length;

        const media = quantidadeMeses > 0
            ? total / quantidadeMeses
            : 0;

        let maiorMes = "-";
        let maiorValor = -1;

        Object.entries(porMes).forEach(([mes, dados]) => {
            if (dados.total > maiorValor) {
                maiorValor = dados.total;
                maiorMes = mes;
            }
        });

        setTexto("mediaMensalPreliminarOCR", formatarMoeda(media));
        setTexto("totalCreditosValidosOCR", formatarMoeda(total));
        setTexto("mesesConsideradosOCR", quantidadeMeses);
        setTexto("mesMaiorMovimentacaoOCR", maiorMes);

        setTexto("ocrMediaMensal", formatarMoeda(media));
        setTexto("ocrTotalCreditos", formatarMoeda(total));
        setTexto("ocrMesesConsiderados", quantidadeMeses);
        setTexto("ocrMesMaiorMovimentacao", maiorMes);

        renderizarTabelaMeses(porMes);
        renderizarTabelaBancos(porBanco);
    }

    function renderizarTabelaMeses(porMes) {
        const tabela =
            document.getElementById("tabelaCreditosMesOCR") ||
            document.getElementById("tabelaCreditosPorMes");

        if (!tabela) return;

        const tbody = tabela.querySelector("tbody");
        if (!tbody) return;

        const entradas = Object.entries(porMes);

        if (!entradas.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="sem-dados">Nenhum crédito considerado.</td></tr>';
            return;
        }

        entradas.sort((a, b) => {
            const [ma, aa] = a[0].split("/").map(Number);
            const [mb, ab] = b[0].split("/").map(Number);
            return aa - ab || ma - mb;
        });

        tbody.innerHTML = entradas.map(([mes, d]) => `
<tr>
<td>${escaparHTML(mes)}</td>
<td>${d.quantidade}</td>
<td>${escaparHTML(Array.from(d.bancos).join(", "))}</td>
<td>${formatarMoeda(d.total)}</td>
</tr>`).join("");
    }

    function renderizarTabelaBancos(porBanco) {
        const tabela =
            document.getElementById("tabelaResumoInstituicaoOCR") ||
            document.getElementById("tabelaResumoInstituicao");

        if (!tabela) return;

        const tbody = tabela.querySelector("tbody");
        if (!tbody) return;

        const entradas = Object.entries(porBanco);

        if (!entradas.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="sem-dados">Nenhum crédito considerado.</td></tr>';
            return;
        }

        tbody.innerHTML = entradas.map(([banco, d]) => {
            const qtdComp = Math.max(1, d.competencias.size);

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
        const tabela = document.getElementById("tabelaMovimentacoesOCR");
        if (!tabela) return;

        const tbody = tabela.querySelector("tbody");

        if (tbody)
            tbody.innerHTML = '<tr><td colspan="8" class="sem-dados">Nenhuma leitura realizada.</td></tr>';
    }

    /* =========================================================
       RESULTADO OCR
    ========================================================= */

    function renderizarResultadoOCR(resultado) {
        setTexto("ocrNomeTitular", resultado.titular || "Não identificado");
        setTexto("ocrDocumentoTitular", resultado.documentoTitular || "Não identificado");
        setTexto("ocrPeriodoLeitura", formatarPeriodo(resultado.primeiraData, resultado.ultimaData));
        setTexto(
            "ocrInstituicoes",
            resultado.instituicoes.length
                ? resultado.instituicoes.join(", ")
                : "Não identificadas"
        );
        setTexto("ocrQuantidadeArquivos", resultado.documentos.length);

        renderizarDocumentosOCR(resultado.documentos);
        renderizarAlertasOCR(resultado.alertas);
        renderizarTabelaMovimentacoesOCR(resultado);
        atualizarResumoLeitura(resultado);
    }

    function renderizarDocumentosOCR(documentos) {
        const el = document.getElementById("listaDocumentosOCR");
        if (!el) return;

        if (!documentos.length) {
            el.innerHTML = '<div class="sem-dados">Nenhum documento processado.</div>';
            return;
        }

        el.innerHTML = documentos.map(doc => `
<div class="documento-ocr-item">
<div>
<strong>${escaparHTML(doc.nome)}</strong>
<span>${escaparHTML(doc.banco || "Instituição não identificada")}</span>
</div>
<div class="documento-ocr-meta">
<span>${escaparHTML(doc.metodo || "-")}</span>
<span>${formatarTamanhoArquivo(doc.tamanho || 0)}</span>
</div>
</div>`).join("");
    }

    function renderizarAlertasOCR(alertas) {
        const el = document.getElementById("listaAlertasOCR");
        if (!el) return;

        el.innerHTML = alertas.length
            ? alertas.map(a => `<div class="aviso-atencao">${escaparHTML(a)}</div>`).join("")
            : '<div class="aviso-info">Nenhum alerta adicional.</div>';
    }

    function atualizarResumoLeitura(resultado) {
        const textarea = document.getElementById("resumoLeituraOCR");
        if (!textarea) return;

        const creditos = resultado.movimentacoes.filter(m =>
            m.considerar && m.natureza === "Crédito"
        );

        textarea.value = [
            "RESUMO DA LEITURA DOS EXTRATOS",
            `Arquivos processados: ${resultado.documentos.length}`,
            `Titular: ${resultado.titular || "Não identificado"}`,
            `CPF/CNPJ: ${resultado.documentoTitular || "Não identificado"}`,
            `Instituições: ${resultado.instituicoes.length ? resultado.instituicoes.join(", ") : "Não identificadas"}`,
            `Período: ${formatarPeriodo(resultado.primeiraData, resultado.ultimaData)}`,
            `Competências: ${resultado.competencias.length ? resultado.competencias.map(formatarCompetencia).join(", ") : "Não identificadas"}`,
            `Movimentações identificadas: ${resultado.movimentacoes.length}`,
            `Créditos pré-selecionados: ${creditos.length}`,
            `Total dos créditos selecionados: ${formatarMoeda(creditos.reduce((s, m) => s + Number(m.valor || 0), 0))}`,
            `Alertas: ${resultado.alertas.length}`
        ].join("\n");
    }

    /* =========================================================
       APLICAR
    ========================================================= */

    function aplicarLeituraAoCalculo() {
        if (!resultadoLeituraOCR) {
            alert("Nenhum extrato foi processado.");
            return;
        }

        const selecionadas = resultadoLeituraOCR.movimentacoes.filter(m =>
            m.considerar === true && m.natureza === "Crédito"
        );

        const texto = gerarTextoConsolidado(selecionadas);

        if (typeof window.processarTextoMovimentacao === "function") {
            window.processarTextoMovimentacao(texto, {
                competenciasDocumentadas: resultadoLeituraOCR.competencias
            });
        } else {
            const textarea = document.getElementById("textoExtratoMovimentacao");
            if (textarea) textarea.value = texto;
        }

        atualizarCalculosOCR(resultadoLeituraOCR);

        const card = document.getElementById("cardResultadoMovimentacao");
        if (card)
            card.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    /* =========================================================
       COPIAR
    ========================================================= */

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

    /* =========================================================
       UTILITÁRIOS MONETÁRIOS
    ========================================================= */

    function extrairValoresMonetarios(texto) {
        const valores = [];
        const regex = /R\$\s*(-?\s*[\d.]+,\d{2})/gi;
        let m;

        while ((m = regex.exec(String(texto || ""))) !== null) {
            const valor = converterMoeda(m[1]);

            if (Number.isFinite(valor))
                valores.push(valor);
        }

        if (!valores.length) {
            const regexSem = /(-?\s*\d{1,3}(?:\.\d{3})*,\d{2})/g;

            while ((m = regexSem.exec(String(texto || ""))) !== null) {
                const valor = converterMoeda(m[1]);

                if (Number.isFinite(valor))
                    valores.push(valor);
            }
        }

        return valores;
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

        if (!Number.isFinite(n))
            return NaN;

        return negativo ? -n : n;
    }

    function temValorNegativo(texto) {
        return /R\$\s*-\s*[\d.]+,\d{2}/i.test(String(texto || "")) ||
            /-\s*\d{1,3}(?:\.\d{3})*,\d{2}/.test(String(texto || ""));
    }

    function formatarMoeda(valor) {
        return Number(valor || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }

    function formatarValorNumero(valor) {
        return Number(valor || 0).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    /* =========================================================
       DATAS
    ========================================================= */

    function extrairPrimeiraData(texto) {
        const m = String(texto || "").match(
            /\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\b/
        );

        if (!m) return "";

        let ano = Number(m[3]);
        if (ano < 100) ano += ano >= 70 ? 1900 : 2000;

        const dia = Number(m[1]);
        const mes = Number(m[2]);

        const data = new Date(ano, mes - 1, dia);

        if (
            data.getFullYear() !== ano ||
            data.getMonth() !== mes - 1 ||
            data.getDate() !== dia
        ) return "";

        return `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${ano}`;
    }

    function parseDataBR(valor) {
        const m = String(valor || "").match(
            /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
        );

        if (!m) return null;

        const d = new Date(
            Number(m[3]),
            Number(m[2]) - 1,
            Number(m[1])
        );

        return Number.isNaN(d.getTime()) ? null : d;
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
            const d = new Date(ano, mes - 1, dia);

            if (
                d.getFullYear() !== ano ||
                d.getMonth() !== mes - 1 ||
                d.getDate() !== dia
            ) continue;

            const chave = `${ano}-${mes}-${dia}`;

            if (!vistos.has(chave)) {
                vistos.add(chave);
                datas.push(d);
            }
        }

        return datas.sort((a, b) => a - b);
    }

    function formatarPeriodo(inicio, fim) {
        if (!inicio && !fim)
            return "Não identificado";

        if (inicio && fim)
            return `${formatarData(inicio)} a ${formatarData(fim)}`;

        return formatarData(inicio || fim);
    }

    function formatarData(data) {
        return data instanceof Date && !isNaN(data)
            ? data.toLocaleDateString("pt-BR")
            : "Não identificado";
    }

    function formatarCompetencia(comp) {
        const p = String(comp || "").split("-");

        if (p.length !== 2)
            return comp;

        return `${p[1]}/${p[0]}`;
    }

    /* =========================================================
       TITULAR / BANCO
    ========================================================= */

    function identificarInstituicao(texto) {
        const t = normalizar(texto);

        const bancos = [
            ["MERCADO PAGO", "Mercado Pago"],
            ["BANCO INTER", "Banco Inter"],
            ["INTER PAGAMENTOS", "Banco Inter"],
            ["BANCO ITAU", "Itaú"],
            ["ITAU", "Itaú"],
            ["SICOOB", "Sicoob"],
            ["SICREDI", "Sicredi"],
            ["BRADESCO", "Bradesco"],
            ["BANCO DO BRASIL", "Banco do Brasil"],
            ["CAIXA ECONOMICA", "Caixa Econômica Federal"],
            ["SANTANDER", "Santander"],
            ["NUBANK", "Nubank"],
            ["C6 BANK", "C6 Bank"],
            ["PAGBANK", "PagBank"]
        ];

        const encontrado = bancos.find(([chave]) => t.includes(chave));

        return encontrado ? encontrado[1] : "";
    }

    function identificarDadosTitular(texto) {
        const original = String(texto || "");

        let documento = "";

        const candidatos = original.match(
            /(?:\d[\s.\-/]*){11,18}/g
        ) || [];

        for (const candidato of candidatos) {
            const numeros = candidato.replace(/\D/g, "");

            if (numeros.length === 11 || numeros.length === 14) {
                documento = numeros;
                break;
            }
        }

        const nome = original.match(
            /(?:TITULAR|CLIENTE|NOME)\s*:?\s*([A-ZÀ-Ú][A-ZÀ-Ú\s.'-]{3,80})/i
        );

        return {
            documento: documento,
            nome: nome ? nome[1].replace(/\s+/g, " ").trim() : ""
        };
    }

    /* =========================================================
       DEMAIS UTILITÁRIOS
    ========================================================= */

    function converterHTMLParaTexto(html) {
        const doc = new DOMParser().parseFromString(
            String(html || ""),
            "text/html"
        );

        return (
            doc.body
                ? doc.body.innerText
                : doc.documentElement.innerText || ""
        ).replace(/\u00a0/g, " ");
    }

    function obterExtensao(nome) {
        const partes = String(nome || "")
            .toLowerCase()
            .split(".");

        return partes.length > 1
            ? partes.pop()
            : "";
    }

    function formatarTamanhoArquivo(bytes) {
        const n = Number(bytes || 0);

        if (n < 1024)
            return `${n} B`;

        if (n < 1048576)
            return `${(n / 1024).toFixed(1)} KB`;

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
            .replace(/\s+/g, " ")
            .trim()
            .toUpperCase();
    }

    function setTexto(id, valor) {
        const el = document.getElementById(id);
        if (el) el.textContent = valor;
    }

    function escaparHTML(valor) {
        return String(valor ?? "").replace(
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
        const el = document.getElementById("statusLeituraExtrato");
        if (!el) return;

        el.textContent = texto;
        el.className = `status-leitura-ocr status-${tipo || "info"}`;
    }

    function mostrarResultadoOCR() {
        const card = document.getElementById("cardResultadoLeituraExtratos");

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
        const card = document.getElementById("cardResultadoLeituraExtratos");
        if (card) card.hidden = true;
    }

    /* =========================================================
       API PÚBLICA
    ========================================================= */

    window.leituraExtratosMovimentacao = {
        obterArquivos: () => arquivosExtratoSelecionados.slice(),
        obterResultado: () => resultadoLeituraOCR,
        limpar: limparArquivosExtrato,
        recalcular: () => {
            if (resultadoLeituraOCR) {
                atualizarCalculosOCR(resultadoLeituraOCR);
                atualizarResumoLeitura(resultadoLeituraOCR);
            }
        }
    };

})();