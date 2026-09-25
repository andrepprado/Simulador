(function () {
    "use strict";

    let arquivosExtratoSelecionados = [];
    let resultadoLeituraOCR = null;
    let workerTesseract = null;

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

        lista.innerHTML = arquivosExtratoSelecionados.map((arquivo, i) => `
<div class="arquivo-extrato-item">
<div class="arquivo-extrato-info">
<div class="arquivo-extrato-icone">${obterExtensao(arquivo.name).toUpperCase()}</div>
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
        definirStatus("Pronto para ler os extratos.", "info");
    }

    async function processarArquivosExtrato() {
        if (!arquivosExtratoSelecionados.length) return;

        const btn = document.getElementById("btnLerExtratos");
        if (btn) { btn.disabled = true; btn.textContent = "Processando..." }
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
                definirStatus(`Processando ${i + 1} de ${arquivosExtratoSelecionados.length}: ${arquivo.name}`, "processando");

                try {
                    const documento = await lerArquivoExtrato(arquivo, i);
                    resultado.documentos.push(documento);

                    if (documento.texto) {
                        resultado.textoConsolidado += (resultado.textoConsolidado ? "\n" : "") + documento.texto;
                        const banco = identificarInstituicao(documento.texto);
                        documento.banco = banco;
                        if (banco) resultado.instituicoes.add(banco);

                        const dados = identificarDadosTitular(documento.texto);
                        if (!resultado.titular && dados.nome) resultado.titular = dados.nome;
                        if (!resultado.documentoTitular && dados.documento) resultado.documentoTitular = dados.documento;

                        const datas = extrairDatasTexto(documento.texto);
                        datas.forEach(data => {
                            const comp = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
                            resultado.competencias.add(comp);
                            if (!resultado.primeiraData || data < resultado.primeiraData) resultado.primeiraData = data;
                            if (!resultado.ultimaData || data > resultado.ultimaData) resultado.ultimaData = data;
                        });
                    }
                } catch (erro) {
                    resultado.alertas.push(`${arquivo.name}: ${erro.message || "não foi possível realizar a leitura."}`);
                    resultado.documentos.push({ nome: arquivo.name, tamanho: arquivo.size, metodo: "Erro", banco: "", texto: "", erro: String(erro.message || erro) });
                }
            }

            resultado.competencias = Array.from(resultado.competencias).sort();
            resultado.instituicoes = Array.from(resultado.instituicoes);
            resultadoLeituraOCR = resultado;

            gerarMovimentacoesResultado(resultado);
            renderizarResultadoOCR(resultado);
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
        const base = { id: `ARQ${indice + 1}`, nome: arquivo.name, tamanho: arquivo.size, tipo: arquivo.type, metodo: "", texto: "", banco: "" };

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
            base.metodo = "PDF/OCR";
            base.texto = await lerPDF(arquivo);
            return base;
        }

        throw new Error("Formato não suportado.");
    }

    async function lerPDF(arquivo) {
        if (typeof pdfjsLib === "undefined") {
            throw new Error("PDF.js não foi carregado. Inclua pdf.min.js antes de media-movimentacao-ocr.js.");
        }

        const buffer = await arquivo.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        const partes = [];

        for (let pagina = 1; pagina <= pdf.numPages; pagina++) {
            definirStatus(`Lendo ${arquivo.name} — página ${pagina} de ${pdf.numPages}...`, "processando");
            const page = await pdf.getPage(pagina);
            const conteudo = await page.getTextContent();
            const texto = conteudo.items.map(item => item.str).join(" ").replace(/\s+/g, " ").trim();

            if (texto.length >= 30) {
                partes.push(texto);
                continue;
            }

            const viewport = page.getViewport({ scale: 2 });
            const canvas = document.createElement("canvas");
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            await page.render({ canvasContext: ctx, viewport }).promise;
            const blob = await new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Falha ao converter página do PDF.")), "image/png"));
            const textoOCR = await executarOCRImagem(blob);
            partes.push(textoOCR);
            canvas.width = 1;
            canvas.height = 1;
        }

        return partes.join("\n");
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

    function gerarMovimentacoesResultado(resultado) {
        if (!resultado.textoConsolidado) return;
        if (typeof window.processarTextoMovimentacao === "function") {
            try { window.processarTextoMovimentacao(resultado.textoConsolidado, { competenciasDocumentadas: resultado.competencias }); } catch (e) { console.warn(e) }
        }
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
        el.innerHTML = alertas.length ? alertas.map(a => `<div class="aviso-atencao">${escaparHTML(a)}</div>`).join("") : '<div class="aviso-info">Nenhum alerta adicional.</div>';
    }

    function atualizarResumoLeitura(resultado) {
        const textarea = document.getElementById("resumoLeituraOCR");
        if (!textarea) return;

        textarea.value = [
            "RESUMO DA LEITURA DOS EXTRATOS",
            `Arquivos processados: ${resultado.documentos.length}`,
            `Titular: ${resultado.titular || "Não identificado"}`,
            `CPF/CNPJ: ${resultado.documentoTitular || "Não identificado"}`,
            `Instituições: ${resultado.instituicoes.length ? resultado.instituicoes.join(", ") : "Não identificadas"}`,
            `Período: ${formatarPeriodo(resultado.primeiraData, resultado.ultimaData)}`,
            `Competências: ${resultado.competencias.length ? resultado.competencias.map(formatarCompetencia).join(", ") : "Não identificadas"}`,
            `Alertas: ${resultado.alertas.length}`
        ].join("\n");
    }

    function aplicarLeituraAoCalculo() {
        if (!resultadoLeituraOCR || !resultadoLeituraOCR.textoConsolidado) {
            alert("Nenhum extrato foi processado.");
            return;
        }

        if (typeof window.processarTextoMovimentacao === "function") {
            window.processarTextoMovimentacao(resultadoLeituraOCR.textoConsolidado, { competenciasDocumentadas: resultadoLeituraOCR.competencias });
        } else {
            const textarea = document.getElementById("textoExtratoMovimentacao");
            if (textarea) textarea.value = resultadoLeituraOCR.textoConsolidado;
        }

        const card = document.getElementById("cardResultadoMovimentacao");
        if (card) card.scrollIntoView({ behavior: "smooth", block: "start" });
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
        document.querySelectorAll('#tabelaMovimentacoesOCR input[type="checkbox"]').forEach(c => { c.checked = marcar; c.dispatchEvent(new Event("change", { bubbles: true })) });
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

    function definirStatus(texto, tipo) {
        const el = document.getElementById("statusLeituraExtrato");
        if (!el) return;
        el.textContent = texto;
        el.className = `status-leitura-ocr status-${tipo || "info"}`;
    }

    function identificarInstituicao(texto) {
        const t = normalizar(texto);
        const bancos = [
            ["SICOOB", "Sicoob"], ["SICREDI", "Sicredi"], ["ITAU", "Itaú"], ["BRADESCO", "Bradesco"],
            ["BANCO DO BRASIL", "Banco do Brasil"], ["CAIXA ECONOMICA", "Caixa Econômica Federal"],
            ["SANTANDER", "Santander"], ["NUBANK", "Nubank"], ["INTER", "Banco Inter"],
            ["C6 BANK", "C6 Bank"], ["PAGBANK", "PagBank"], ["MERCADO PAGO", "Mercado Pago"]
        ];
        const encontrado = bancos.find(([chave]) => t.includes(chave));
        return encontrado ? encontrado[1] : "";
    }

    function identificarDadosTitular(texto) {
        const original = String(texto || "");
        const doc = original.match(/\b(?:CPF|CNPJ)\s*:?\s*((?:\d[.\s-]*){11,14})/i);
        const nome = original.match(/(?:TITULAR|CLIENTE|NOME)\s*:?\s*([A-ZÀ-Ú][A-ZÀ-Ú\s.'-]{3,80})/i);
        return {
            documento: doc ? doc[1].replace(/\D/g, "") : "",
            nome: nome ? nome[1].replace(/\s+/g, " ").trim() : ""
        };
    }

    function extrairDatasTexto(texto) {
        const datas = [];
        const vistos = new Set();
        const regex = /\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\b/g;
        let m;

        while ((m = regex.exec(String(texto || ""))) !== null) {
            let ano = Number(m[3]);
            if (ano < 100) ano += ano >= 70 ? 1900 : 2000;
            const mes = Number(m[2]), dia = Number(m[1]);
            const d = new Date(ano, mes - 1, dia);
            if (d.getFullYear() !== ano || d.getMonth() !== mes - 1 || d.getDate() !== dia) continue;
            const chave = `${ano}-${mes}-${dia}`;
            if (!vistos.has(chave)) { vistos.add(chave); datas.push(d) }
        }
        return datas.sort((a, b) => a - b);
    }

    function formatarPeriodo(inicio, fim) {
        if (!inicio && !fim) return "Não identificado";
        if (inicio && fim) return `${formatarData(inicio)} a ${formatarData(fim)}`;
        return formatarData(inicio || fim);
    }

    function formatarData(data) {
        return data instanceof Date && !isNaN(data) ? data.toLocaleDateString("pt-BR") : "Não identificado";
    }

    function formatarCompetencia(comp) {
        const p = String(comp || "").split("-");
        if (p.length !== 2) return comp;
        return `${p[1]}/${p[0]}`;
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
        return String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    }

    function setTexto(id, valor) {
        const el = document.getElementById(id);
        if (el) el.textContent = valor;
    }

    function escaparHTML(valor) {
        return String(valor ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
    }

    window.leituraExtratosMovimentacao = {
        obterArquivos: () => arquivosExtratoSelecionados.slice(),
        obterResultado: () => resultadoLeituraOCR,
        limpar: limparArquivosExtrato
    };
})();