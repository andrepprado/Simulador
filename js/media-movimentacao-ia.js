(function () {
    "use strict";

    const CONFIG = {
        maxArquivos: 20,
        maxTamanho: 30 * 1024 * 1024,
        extensoes: ["pdf", "txt", "csv"],
        pdfjs: ["./pdfjs/pdf.mjs"],
        pdfWorker: "./js/pdfjs/pdf.worker.mjs",
        toleranciaDiasTransferencia: 2,
        toleranciaValor: 0.01
    };

    let arquivos = [];
    let documentos = [];
    let movimentacoes = [];
    let resultado = null;
    let pdfjs = null;
    let contadorMovimentacoes = 0;

    document.addEventListener("DOMContentLoaded", function () {
        iniciar();
    });

    function iniciar() {
        const input = document.getElementById("arquivosExtratoIA");
        const area = document.getElementById("areaUploadExtratoIA");
        const btnAnalisar = document.getElementById("btnAnalisarExtratosIA");
        const btnLimpar = document.getElementById("btnLimparExtratosIA");
        const btnSelecionar = document.getElementById("btnSelecionarTodosIA");
        const btnDesmarcar = document.getElementById("btnDesmarcarTodosIA");
        const btnAplicar = document.getElementById("btnAplicarAnaliseIA");
        const btnCopiar = document.getElementById("btnCopiarParecerIA");

        if (input) {
            input.addEventListener("change", function () {
                adicionarArquivos(Array.from(input.files || []));
                input.value = "";
            });
        }

        if (area) {
            area.addEventListener("dragover", function (e) {
                e.preventDefault();
                area.classList.add("arrastando");
            });

            area.addEventListener("dragleave", function () {
                area.classList.remove("arrastando");
            });

            area.addEventListener("drop", function (e) {
                e.preventDefault();
                area.classList.remove("arrastando");

                adicionarArquivos(
                    Array.from(
                        e.dataTransfer && e.dataTransfer.files
                            ? e.dataTransfer.files
                            : []
                    )
                );
            });
        }

        if (btnAnalisar) {
            btnAnalisar.disabled = false;
            btnAnalisar.removeAttribute("disabled");
            btnAnalisar.style.pointerEvents = "auto";
            btnAnalisar.addEventListener("click", analisarLocal);
        }

        if (btnLimpar) {
            btnLimpar.disabled = false;
            btnLimpar.removeAttribute("disabled");
            btnLimpar.addEventListener("click", limparTudo);
        }

        if (btnSelecionar) {
            btnSelecionar.addEventListener("click", function () {
                alterarTodos(true);
            });
        }

        if (btnDesmarcar) {
            btnDesmarcar.addEventListener("click", function () {
                alterarTodos(false);
            });
        }

        if (btnAplicar) {
            btnAplicar.addEventListener("click", aplicarAoMotor);
        }

        if (btnCopiar) {
            btnCopiar.addEventListener("click", copiarParecer);
        }

        renderizarArquivos();
        atualizarEstadoBotaoAnalisar();

        definirStatus(
            "Pronto para analisar os extratos localmente.",
            "info"
        );

        console.log(
            "[Média Movimentação] Analisador local iniciado. Nenhum dado será enviado para API externa."
        );
    }

    function atualizarEstadoBotaoAnalisar() {
        const btn = document.getElementById("btnAnalisarExtratosIA");
        if (!btn) return;

        btn.disabled = false;
        btn.removeAttribute("disabled");
        btn.style.pointerEvents = "auto";
        btn.style.cursor = "pointer";
    }

    function adicionarArquivos(novos) {
        if (!novos || !novos.length) {
            atualizarEstadoBotaoAnalisar();
            return;
        }

        const erros = [];

        novos.forEach(function (file) {
            if (arquivos.length >= CONFIG.maxArquivos) {
                erros.push(
                    "Limite de " + CONFIG.maxArquivos + " arquivos atingido."
                );
                return;
            }

            const ext = obterExtensao(file.name);

            if (!CONFIG.extensoes.includes(ext)) {
                erros.push(
                    file.name + ": formato não suportado."
                );
                return;
            }

            if (file.size > CONFIG.maxTamanho) {
                erros.push(
                    file.name +
                    ": arquivo maior que " +
                    formatarTamanho(CONFIG.maxTamanho) +
                    "."
                );
                return;
            }

            const duplicado = arquivos.some(function (a) {
                return a.name === file.name &&
                    a.size === file.size &&
                    a.lastModified === file.lastModified;
            });

            if (!duplicado) {
                arquivos.push(file);
            }
        });

        renderizarArquivos();
        atualizarEstadoBotaoAnalisar();

        if (erros.length) {
            definirStatus(
                erros.join(" "),
                "erro"
            );
        } else {
            definirStatus(
                arquivos.length +
                " arquivo(s) selecionado(s).",
                "info"
            );
        }
    }

    function removerArquivo(indice) {
        arquivos.splice(indice, 1);

        renderizarArquivos();
        atualizarEstadoBotaoAnalisar();

        definirStatus(
            arquivos.length
                ? arquivos.length + " arquivo(s) selecionado(s)."
                : "Nenhum arquivo selecionado.",
            "info"
        );
    }

    function renderizarArquivos() {
        const lista = document.getElementById("listaArquivosExtratoIA");
        const quantidade = document.getElementById("quantidadeArquivosIA");

        if (quantidade) {
            quantidade.textContent = String(arquivos.length);
        }

        if (!lista) return;

        lista.innerHTML = "";

        if (!arquivos.length) {
            const vazio = document.createElement("div");
            vazio.className = "sem-dados";
            vazio.textContent = "Nenhum arquivo selecionado.";
            lista.appendChild(vazio);
            return;
        }

        arquivos.forEach(function (file, indice) {
            const item = document.createElement("div");
            item.className = "arquivo-extrato-ia";

            item.innerHTML =
                '<div class="arquivo-extrato-ia-info">' +
                '<strong>' + escapar(file.name) + '</strong>' +
                '<small>' +
                escapar(obterExtensao(file.name).toUpperCase()) +
                " · " +
                escapar(formatarTamanho(file.size)) +
                '</small>' +
                '</div>' +
                '<button type="button" class="btn-remover-arquivo-ia" aria-label="Remover arquivo">×</button>';

            const btn = item.querySelector("button");

            if (btn) {
                btn.addEventListener("click", function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    removerArquivo(indice);
                });
            }

            lista.appendChild(item);
        });
    }

    async function analisarLocal() {
        if (!arquivos.length) {
            atualizarEstadoBotaoAnalisar();

            definirStatus(
                "Selecione pelo menos um extrato para analisar.",
                "erro"
            );

            return;
        }

        bloquearAnalise(true);

        definirStatus(
            "Lendo e analisando os extratos localmente...",
            "processando"
        );

        documentos = [];
        movimentacoes = [];
        resultado = null;
        contadorMovimentacoes = 0;

        try {
            for (let i = 0; i < arquivos.length; i++) {
                const file = arquivos[i];

                definirStatus(
                    "Processando " +
                    (i + 1) +
                    " de " +
                    arquivos.length +
                    ": " +
                    file.name,
                    "processando"
                );

                try {
                    const documento = await processarArquivo(file, i);

                    documentos.push(documento);

                    documento.movimentacoes.forEach(function (m) {
                        movimentacoes.push(m);
                    });

                    console.log(
                        "[Média Movimentação] Arquivo processado:",
                        file.name,
                        "| Banco:",
                        documento.banco,
                        "| Movimentações:",
                        documento.movimentacoes.length
                    );
                } catch (erroArquivo) {
                    console.error(
                        "[Média Movimentação] Erro em " + file.name,
                        erroArquivo
                    );

                    documentos.push({
                        id: "DOC" + String(i + 1).padStart(3, "0"),
                        arquivo: file.name,
                        tipo: obterExtensao(file.name).toUpperCase(),
                        banco: "Não identificado",
                        titular: "",
                        documentoTitular: "",
                        texto: "",
                        periodo: null,
                        competencias: [],
                        movimentacoes: [],
                        erro:
                            erroArquivo && erroArquivo.message
                                ? erroArquivo.message
                                : String(erroArquivo)
                    });
                }
            }

            if (!movimentacoes.length) {
                resultado = montarResultado();
                renderizarResultado();

                definirStatus(
                    "Os arquivos foram lidos, mas nenhuma movimentação financeira foi identificada. Verifique se os PDFs possuem texto selecionável.",
                    "erro"
                );

                return;
            }

            detectarDuplicidades();
            detectarTransferenciasProprias();

            resultado = montarResultado();

            renderizarResultado();

            definirStatus(
                movimentacoes.length +
                " movimentação(ões) identificada(s) em " +
                documentos.length +
                " documento(s). Revise as marcações antes de aplicar ao cálculo.",
                "sucesso"
            );

            console.log(
                "[Média Movimentação] Análise concluída.",
                {
                    documentos: documentos.length,
                    movimentacoes: movimentacoes.length,
                    competencias: resultado.competenciasDocumentadas,
                    bancos: resultado.bancos
                }
            );
        } catch (erro) {
            console.error(
                "[Média Movimentação] Falha na análise local:",
                erro
            );

            definirStatus(
                "Erro durante a análise: " +
                (
                    erro && erro.message
                        ? erro.message
                        : String(erro)
                ),
                "erro"
            );
        } finally {
            bloquearAnalise(false);
        }
    }

    async function processarArquivo(file, indice) {
        const ext = obterExtensao(file.name);
        let texto = "";

        if (ext === "pdf") {
            texto = await extrairPDF(file);
        } else {
            texto = await file.text();
        }

        texto = normalizarTextoExtraido(texto);

        const banco = identificarBanco(texto, file.name);
        const titular = identificarTitular(texto);
        const periodo = identificarPeriodo(texto);

        const doc = {
            id: "DOC" + String(indice + 1).padStart(3, "0"),
            arquivo: file.name,
            tipo: ext.toUpperCase(),
            banco: banco,
            titular: titular.nome,
            documentoTitular: titular.documento,
            texto: texto,
            periodo: periodo,
            competencias: [],
            movimentacoes: [],
            erro: ""
        };

        doc.movimentacoes = interpretarMovimentacoesDocumento(doc);

        doc.competencias = Array.from(
            new Set(
                doc.movimentacoes
                    .filter(function (m) {
                        return m.competencia;
                    })
                    .map(function (m) {
                        return m.competencia;
                    })
            )
        ).sort();

        if (!doc.competencias.length && periodo) {
            const comps = competenciasEntre(
                periodo.inicio,
                periodo.fim
            );

            if (comps.length === 1) {
                doc.competencias = comps;
            }
        }

        return doc;
    }

    async function carregarPDFJS() {
        if (pdfjs) return pdfjs;

        let ultimoErro = null;

        for (const caminho of CONFIG.pdfjs) {
            try {
                pdfjs = await import(caminho);

                if (pdfjs && pdfjs.GlobalWorkerOptions) {
                    pdfjs.GlobalWorkerOptions.workerSrc =
                        CONFIG.pdfWorker;
                }

                console.log(
                    "[Média Movimentação] PDF.js carregado:",
                    caminho
                );

                return pdfjs;
            } catch (e) {
                ultimoErro = e;

                console.warn(
                    "[Média Movimentação] Falha ao carregar PDF.js em",
                    caminho,
                    e
                );
            }
        }

        throw new Error(
            "PDF.js local não encontrado. Confirme os arquivos js/pdfjs/pdf.mjs e js/pdfjs/pdf.worker.mjs." +
            (
                ultimoErro && ultimoErro.message
                    ? " " + ultimoErro.message
                    : ""
            )
        );
    }

    async function extrairPDF(file) {
        const lib = await carregarPDFJS();
        const buffer = await file.arrayBuffer();

        const loadingTask = lib.getDocument({
            data: new Uint8Array(buffer)
        });

        const pdf = await loadingTask.promise;
        const paginas = [];

        for (let numero = 1; numero <= pdf.numPages; numero++) {
            const pagina = await pdf.getPage(numero);
            const conteudo = await pagina.getTextContent();

            const texto = reconstruirPagina(
                conteudo.items || []
            );

            paginas.push(texto);
        }

        const final = paginas.join("\n");

        if (!final.trim()) {
            throw new Error(
                "O PDF não possui texto extraível. Pode ser um documento digitalizado/imagem."
            );
        }

        return final;
    }

    function reconstruirPagina(items) {
        const elementos = (items || [])
            .filter(function (item) {
                return item && String(item.str || "").trim();
            })
            .map(function (item) {
                return {
                    texto: String(item.str || "")
                        .replace(/\s+/g, " ")
                        .trim(),
                    x:
                        item.transform &&
                            Number.isFinite(item.transform[4])
                            ? item.transform[4]
                            : 0,
                    y:
                        item.transform &&
                            Number.isFinite(item.transform[5])
                            ? item.transform[5]
                            : 0,
                    width: Number(item.width || 0)
                };
            });

        elementos.sort(function (a, b) {
            const dy = b.y - a.y;

            if (Math.abs(dy) > 2.5) {
                return dy;
            }

            return a.x - b.x;
        });

        const linhas = [];
        let atual = [];
        let yAtual = null;

        elementos.forEach(function (el) {
            if (
                yAtual === null ||
                Math.abs(el.y - yAtual) <= 2.5
            ) {
                atual.push(el);

                if (yAtual === null) {
                    yAtual = el.y;
                }
            } else {
                linhas.push(
                    montarLinhaPDF(atual)
                );

                atual = [el];
                yAtual = el.y;
            }
        });

        if (atual.length) {
            linhas.push(
                montarLinhaPDF(atual)
            );
        }

        return linhas
            .filter(Boolean)
            .join("\n");
    }

    function montarLinhaPDF(itens) {
        itens.sort(function (a, b) {
            return a.x - b.x;
        });

        let linha = "";
        let fimAnterior = null;

        itens.forEach(function (item) {
            if (!linha) {
                linha = item.texto;
                fimAnterior = item.x + item.width;
                return;
            }

            linha += " " + item.texto;
            fimAnterior = item.x + item.width;
        });

        return linha
            .replace(/\s+/g, " ")
            .trim();
    }

    function normalizarTextoExtraido(texto) {
        return String(texto || "")
            .replace(/\u00A0/g, " ")
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .replace(/[ \t]+/g, " ")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
    }

    function identificarBanco(texto, nomeArquivo) {
        const n = normalizar(
            (nomeArquivo || "") + " " + (texto || "")
        );

        const regras = [
            {
                nome: "Nubank",
                padroes: [
                    "NUBANK",
                    "NU PAGAMENTOS",
                    "NU FINANCEIRA"
                ]
            },
            {
                nome: "Mercado Pago",
                padroes: [
                    "MERCADO PAGO",
                    "MERCADOPAGO",
                    "MERCADO PAGO INSTITUICAO DE PAGAMENTO"
                ]
            },
            {
                nome: "Itaú",
                padroes: [
                    "ITAU UNIBANCO",
                    "BANCO ITAU",
                    "ITAU"
                ]
            },
            {
                nome: "Sicoob",
                padroes: [
                    "SICOOB",
                    "BANCO COOPERATIVO SICOOB",
                    "SISTEMA DE COOPERATIVAS DE CREDITO DO BRASIL"
                ]
            },
            {
                nome: "Banco do Brasil",
                padroes: [
                    "BANCO DO BRASIL",
                    "BB S A"
                ]
            },
            {
                nome: "Bradesco",
                padroes: [
                    "BRADESCO",
                    "BANCO BRADESCO"
                ]
            },
            {
                nome: "Santander",
                padroes: [
                    "SANTANDER",
                    "BANCO SANTANDER"
                ]
            },
            {
                nome: "Banco Inter",
                padroes: [
                    "BANCO INTER",
                    "INTER PAGAMENTOS"
                ]
            },
            {
                nome: "Sicredi",
                padroes: [
                    "SICREDI",
                    "SISTEMA DE CREDITO COOPERATIVO"
                ]
            },
            {
                nome: "Caixa",
                padroes: [
                    "CAIXA ECONOMICA FEDERAL",
                    "CEF"
                ]
            },
            {
                nome: "C6 Bank",
                padroes: [
                    "C6 BANK",
                    "BANCO C6"
                ]
            },
            {
                nome: "PicPay",
                padroes: [
                    "PICPAY"
                ]
            },
            {
                nome: "PagBank",
                padroes: [
                    "PAGBANK",
                    "PAGSEGURO"
                ]
            },
            {
                nome: "BTG Pactual",
                padroes: [
                    "BTG PACTUAL"
                ]
            },
            {
                nome: "Safra",
                padroes: [
                    "BANCO SAFRA",
                    "SAFRA"
                ]
            },
            {
                nome: "Banco Original",
                padroes: [
                    "BANCO ORIGINAL"
                ]
            }
        ];

        for (let i = 0; i < regras.length; i++) {
            if (
                regras[i].padroes.some(function (p) {
                    return n.includes(p);
                })
            ) {
                return regras[i].nome;
            }
        }

        return "Não identificado";
    }

    function identificarTitular(texto) {
        const linhas = String(texto || "")
            .split("\n")
            .map(function (l) {
                return l.trim();
            })
            .filter(Boolean);

        let nome = "";
        let documento = "";

        const regexDoc =
            /\b(?:CPF|CNPJ)?\s*:?\s*((?:\d{3}\.?\d{3}\.?\d{3}-?\d{2})|(?:\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}))\b/i;

        for (let i = 0; i < Math.min(linhas.length, 100); i++) {
            const linha = linhas[i];

            if (!documento) {
                const m = linha.match(regexDoc);

                if (m) {
                    documento = m[1]
                        .replace(/\D/g, "");
                }
            }

            if (!nome) {
                const m = linha.match(
                    /(?:TITULAR|CLIENTE|NOME)\s*:?\s+(.{3,100})$/i
                );

                if (m) {
                    const candidato = m[1]
                        .replace(regexDoc, "")
                        .trim();

                    if (
                        candidato &&
                        /[A-Za-zÀ-ÿ]{2,}/.test(candidato)
                    ) {
                        nome = candidato;
                    }
                }
            }
        }

        return {
            nome: nome,
            documento: documento
        };
    }

    function identificarPeriodo(texto) {
        const regex =
            /\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\b/g;

        const datas = [];
        let m;

        while (
            (m = regex.exec(String(texto || ""))) !== null
        ) {
            const data = criarData(
                Number(m[1]),
                Number(m[2]),
                normalizarAno(
                    Number(m[3]),
                    m[3].length
                )
            );

            if (data) {
                datas.push(data);
            }
        }

        if (!datas.length) {
            return null;
        }

        datas.sort(function (a, b) {
            return a - b;
        });

        return {
            inicio: datas[0],
            fim: datas[datas.length - 1]
        };
    }

    function interpretarMovimentacoesDocumento(doc) {
        const linhas = String(doc.texto || "")
            .split("\n")
            .map(function (l) {
                return l.trim();
            })
            .filter(Boolean);

        const lista = [];
        let dataCorrente = null;

        for (let i = 0; i < linhas.length; i++) {
            const linha = linhas[i];

            const encontrada = extrairDataLinha(
                linha,
                dataCorrente,
                doc.periodo
            );

            if (encontrada.data) {
                dataCorrente = encontrada.data;
            }

            let mov = interpretarLinha(
                linha,
                dataCorrente,
                doc,
                i
            );

            if (!mov && i + 1 < linhas.length) {
                mov = interpretarLinha(
                    linha + " " + linhas[i + 1],
                    dataCorrente,
                    doc,
                    i
                );
            }

            if (!mov && i + 2 < linhas.length) {
                mov = interpretarLinha(
                    linha +
                    " " +
                    linhas[i + 1] +
                    " " +
                    linhas[i + 2],
                    dataCorrente,
                    doc,
                    i
                );
            }

            if (mov) {
                const repetida = lista.some(function (x) {
                    return x.linhaOrigem === mov.linhaOrigem &&
                        x.data.getTime() === mov.data.getTime() &&
                        Math.abs(x.valor - mov.valor) < 0.001 &&
                        x.historicoNormalizado ===
                        mov.historicoNormalizado;
                });

                if (!repetida) {
                    lista.push(mov);
                }
            }
        }

        return removerDuplicadosDocumento(lista);
    }

    function extrairDataLinha(linha, dataCorrente, periodo) {
        const texto = String(linha || "");

        let m = texto.match(
            /(?:^|\s)(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})(?=\s|$)/
        );

        if (m) {
            const d = criarData(
                Number(m[1]),
                Number(m[2]),
                normalizarAno(
                    Number(m[3]),
                    m[3].length
                )
            );

            if (d) {
                return { data: d };
            }
        }

        m = texto.match(
            /(?:^|\s)(\d{1,2})[\/.-](\d{1,2})(?=\s|$)/
        );

        if (m) {
            const ano =
                dataCorrente
                    ? dataCorrente.getFullYear()
                    : (
                        periodo && periodo.inicio
                            ? periodo.inicio.getFullYear()
                            : new Date().getFullYear()
                    );

            const d = criarData(
                Number(m[1]),
                Number(m[2]),
                ano
            );

            if (d) {
                return { data: d };
            }
        }

        return {
            data: dataCorrente
        };
    }

    function interpretarLinha(linha, dataCorrente, doc, indice) {
        const original = String(linha || "")
            .replace(/\s+/g, " ")
            .trim();

        if (!original) {
            return null;
        }

        const n = normalizar(original);

        if (deveIgnorarLinha(n)) {
            return null;
        }

        const dataInfo = extrairDataLinha(
            original,
            dataCorrente,
            doc.periodo
        );

        const data = dataInfo.data;

        if (!data) {
            return null;
        }

        const regexData =
            /(?:^|\s)(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?(?=\s|$)/;

        let semData = original
            .replace(regexData, " ")
            .replace(/\s+/g, " ")
            .trim();

        const valores = [];

        const regexValor =
            /(?:R\$\s*)?([+-]?\s*(?:\d{1,3}(?:\.\d{3})*(?:,\d{2})|\d+(?:,\d{2})|\d{1,3}(?:,\d{3})*(?:\.\d{2})|\d+(?:\.\d{2})))\s*([CD])?(?=\s|$|[|])/gi;

        let match;

        while (
            (match = regexValor.exec(semData)) !== null
        ) {
            const valor = converterValorFlexivel(
                match[1]
            );

            if (
                Number.isFinite(valor) &&
                Math.abs(valor) > 0
            ) {
                valores.push({
                    valor: Math.abs(valor),
                    sinal: valor < 0 ? -1 : 1,
                    indicador: String(
                        match[2] || ""
                    ).toUpperCase(),
                    texto: match[0],
                    indice: match.index
                });
            }
        }

        if (!valores.length) {
            return null;
        }

        const escolhido = escolherValorMovimentacao(
            valores,
            semData
        );

        if (!escolhido) {
            return null;
        }

        let historico = (
            semData.substring(
                0,
                escolhido.indice
            ) +
            " " +
            semData.substring(
                escolhido.indice +
                escolhido.texto.length
            )
        )
            .replace(/[|]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        historico = limparHistorico(
            historico
        );

        if (
            !historico ||
            historico.length < 2
        ) {
            return null;
        }

        const natureza = inferirNatureza(
            original,
            escolhido
        );

        if (!natureza) {
            return null;
        }

        contadorMovimentacoes++;

        const mov = {
            id:
                "LOCAL" +
                String(contadorMovimentacoes)
                    .padStart(6, "0"),
            documentoId: doc.id,
            arquivo: doc.arquivo,
            banco: doc.banco,
            titular: doc.titular,
            documentoTitular:
                doc.documentoTitular,
            linhaOrigem: indice + 1,
            original: original,
            data: data,
            dataTexto: formatarData(data),
            competencia: competencia(data),
            historico: historico,
            historicoNormalizado:
                normalizar(historico),
            valor: escolhido.valor,
            natureza: natureza,
            classificacao: "",
            motivo: "",
            considerar: false,
            duvida: false,
            duplicado: false,
            transferenciaPropria: false,
            referenciaTransferencia: "",
            manual: false
        };

        classificar(mov);

        return mov;
    }

    function escolherValorMovimentacao(valores, linha) {
        if (!valores.length) {
            return null;
        }

        if (valores.length === 1) {
            return valores[0];
        }

        const n = normalizar(linha);

        if (n.includes("SALDO")) {
            return valores[0];
        }

        for (let i = valores.length - 1; i >= 0; i--) {
            if (
                valores[i].indicador === "C" ||
                valores[i].indicador === "D"
            ) {
                return valores[i];
            }
        }

        return valores[valores.length - 1];
    }

    function inferirNatureza(linha, valor) {
        if (valor.indicador === "C") {
            return "C";
        }

        if (valor.indicador === "D") {
            return "D";
        }

        if (valor.sinal < 0) {
            return "D";
        }

        const texto = normalizar(linha);

        if (
            /\b(PIX RECEBIDO|PIX RECEBIDA|PIX RECEB|TRANSFERENCIA RECEBIDA|TRANSFERENCIA RECEBIDO|TRANSF RECEBIDA|TED RECEBIDA|TED RECEBIDO|DOC RECEBIDO|DOC RECEBIDA|DEPOSITO|RECEBIMENTO|PAGAMENTO RECEBIDO|PAGAMENTO RECEBIDA|CREDITO|CRED|ENTRADA)\b/.test(texto)
        ) {
            return "C";
        }

        if (
            /\b(DEBITO|DEB|SAIDA|PAGAMENTO|COMPRA|PIX ENVIADO|PIX REALIZADO|PIX EFETUADO|TRANSFERENCIA ENVIADA|TRANSFERENCIA REALIZADA|TED ENVIADA|SAQUE|APLICACAO)\b/.test(texto)
        ) {
            return "D";
        }

        return "C";
    }

    function classificar(m) {
        if (m.natureza !== "C") {
            m.classificacao = "DEBITO";
            m.motivo =
                "Débito/saída de recursos";
            m.considerar = false;
            return;
        }

        const h = m.historicoNormalizado;

        if (
            m.banco === "Nubank" &&
            Math.abs(
                m.valor - 50000
            ) <= CONFIG.toleranciaValor
        ) {
            m.classificacao =
                "EXCLUSAO_SOLICITADA";
            m.motivo =
                "Crédito de R$ 50.000,00 no Nubank excluído conforme regra da análise";
            m.considerar = false;
            return;
        }

        if (
            /\b(RDB|RESGATE RDB|APLICACAO RDB)\b/.test(h)
        ) {
            m.classificacao =
                "INVESTIMENTO_RDB";
            m.motivo =
                "Movimentação relacionada a RDB não representa novo recurso";
            m.considerar = false;
            return;
        }

        if (
            /\b(EMPRESTIMO|EMPREST|FINANCIAMENTO|FINANC|LIBERACAO DE CREDITO|LIBERACAO CREDITO|CREDITO PESSOAL|CREDITO CONSIGNADO|CAPITAL DE GIRO)\b/.test(h)
        ) {
            m.classificacao =
                "EMPRESTIMO_FINANCIAMENTO";
            m.motivo =
                "Empréstimo/financiamento não representa renda";
            m.considerar = false;
            return;
        }

        if (
            /\b(ANTECIPACAO|ADIANTAMENTO|ADIANTAMENTO A DEPOSITANTE)\b/.test(h)
        ) {
            m.classificacao =
                "ANTECIPACAO";
            m.motivo =
                "Antecipação/adiantamento não representa renda";
            m.considerar = false;
            return;
        }

        if (
            /\b(LIMITE|CHEQUE ESPECIAL|CREDITO ROTATIVO|LIMITE DE CREDITO)\b/.test(h)
        ) {
            m.classificacao =
                "LIMITE_CREDITO";
            m.motivo =
                "Utilização/liberação de limite não representa renda";
            m.considerar = false;
            return;
        }

        if (
            /\b(ESTORNO|REVERSAO|CANCELAMENTO|DEVOLUCAO|DEVOLVIDO|REEMBOLSO)\b/.test(h)
        ) {
            m.classificacao =
                "ESTORNO_DEVOLUCAO";
            m.motivo =
                "Estorno, devolução ou cancelamento não representa renda recorrente";
            m.considerar = false;
            return;
        }

        if (
            /\b(RESGATE|APLICACAO|INVESTIMENTO|CDB|RDC|FUNDO DE INVESTIMENTO|POUPANCA RESGATE)\b/.test(h)
        ) {
            m.classificacao = "INVESTIMENTO";
            m.motivo =
                "Aplicação/resgate de investimento não representa novo recurso";
            m.considerar = false;
            return;
        }

        if (
            /\bPIX\b.*\b(RECEBIDO|RECEBIDA|ENTRADA)\b|\bPIX RECEB\b/.test(h)
        ) {
            m.classificacao = "PIX_RECEBIDO";
            m.motivo = "PIX recebido";
            m.considerar = true;
            return;
        }

        if (
            /\bTED\b.*\b(RECEBIDA|RECEBIDO|CREDITO|CRED)\b|\bCRED TED\b/.test(h)
        ) {
            m.classificacao = "TED_RECEBIDA";
            m.motivo = "TED recebida";
            m.considerar = true;
            return;
        }

        if (
            /\bDOC\b.*\b(RECEBIDO|RECEBIDA|CREDITO|CRED)\b/.test(h)
        ) {
            m.classificacao = "DOC_RECEBIDO";
            m.motivo = "DOC recebido";
            m.considerar = true;
            return;
        }

        if (
            /\b(DEPOSITO|DEP DINHEIRO|DEP CHEQUE|DEPOSITO CHEQUE|DEPOSITO EM DINHEIRO)\b/.test(h)
        ) {
            m.classificacao = "DEPOSITO";
            m.motivo = "Depósito recebido";
            m.considerar = true;
            return;
        }

        if (
            /\b(PAGAMENTO RECEBIDO|RECEBIMENTO|RECEBIDO DE|RECEBIDA DE|COBRANCA RECEBIDA|LIQUIDACAO COBRANCA)\b/.test(h)
        ) {
            m.classificacao = "RECEBIMENTO";
            m.motivo =
                "Recebimento identificado";
            m.considerar = true;
            return;
        }

        if (
            /\b(TRANSFERENCIA RECEBIDA|TRANSF RECEBIDA|CRED TRANSF|CREDITO TRANSFERENCIA)\b/.test(h)
        ) {
            m.classificacao =
                "TRANSFERENCIA_RECEBIDA";
            m.motivo =
                "Transferência recebida";
            m.considerar = true;
            return;
        }

        if (
            /\b(OUTROS CREDITOS|OUTRO CREDITO|CREDITO EM CONTA|CREDITO CONTA|CREDITO)\b/.test(h)
        ) {
            m.classificacao =
                "OUTRO_CREDITO_VALIDO";
            m.motivo =
                "Crédito identificado no extrato";
            m.considerar = true;
            return;
        }

        m.classificacao =
            "CREDITO_NAO_IDENTIFICADO";
        m.motivo =
            "Crédito sem origem suficientemente identificada; requer confirmação";
        m.considerar = false;
        m.duvida = true;
    }

    function deveIgnorarLinha(n) {
        if (!n) return true;

        const padroes = [
            "EXTRATO DE CONTA",
            "EXTRATO CONTA",
            "SALDO ANTERIOR",
            "SALDO DO DIA",
            "SALDO FINAL",
            "SALDO DISPONIVEL",
            "SALDO TOTAL",
            "TOTAL DE CREDITOS",
            "TOTAL CREDITOS",
            "TOTAL DE DEBITOS",
            "TOTAL DEBITOS",
            "RESUMO",
            "LANCAMENTOS FUTUROS",
            "DATA HISTORICO",
            "DATA DOCUMENTO HISTORICO",
            "PERIODO",
            "AGENCIA CONTA",
            "CONTA CORRENTE",
            "OUVIDORIA",
            "SAC ",
            "CENTRAL DE ATENDIMENTO"
        ];

        return padroes.some(function (p) {
            return n.includes(p);
        });
    }

    function removerDuplicadosDocumento(lista) {
        const saida = [];
        const mapa = new Map();

        lista.forEach(function (m) {
            const chave =
                m.documentoId +
                "|" +
                m.dataTexto +
                "|" +
                m.natureza +
                "|" +
                m.valor.toFixed(2) +
                "|" +
                m.historicoNormalizado;

            if (!mapa.has(chave)) {
                mapa.set(chave, m);
                saida.push(m);
            }
        });

        return saida;
    }

    function detectarDuplicidades() {
        for (let i = 0; i < movimentacoes.length; i++) {
            const a = movimentacoes[i];

            if (a.duplicado) {
                continue;
            }

            for (let j = i + 1; j < movimentacoes.length; j++) {
                const b = movimentacoes[j];

                if (
                    a.documentoId ===
                    b.documentoId
                ) {
                    continue;
                }

                if (
                    a.natureza !==
                    b.natureza
                ) {
                    continue;
                }

                if (
                    Math.abs(
                        a.valor - b.valor
                    ) > CONFIG.toleranciaValor
                ) {
                    continue;
                }

                if (
                    Math.abs(
                        diferencaDias(
                            a.data,
                            b.data
                        )
                    ) > 1
                ) {
                    continue;
                }

                const sim = similaridadeHistorico(
                    a.historicoNormalizado,
                    b.historicoNormalizado
                );

                if (sim >= 0.8) {
                    b.duplicado = true;
                    b.considerar = false;
                    b.duvida = false;
                    b.classificacao = "DUPLICADO";
                    b.motivo =
                        "Possível lançamento duplicado entre arquivos (" +
                        a.arquivo +
                        " / " +
                        b.arquivo +
                        ")";
                }
            }
        }
    }

    function detectarTransferenciasProprias() {
        const creditos = movimentacoes.filter(function (m) {
            return m.natureza === "C" && !m.duplicado;
        });

        const debitos = movimentacoes.filter(function (m) {
            return m.natureza === "D" && !m.duplicado;
        });

        creditos.forEach(function (c) {
            if (c.transferenciaPropria) {
                return;
            }

            const hc = c.historicoNormalizado;

            if (
                !/\b(PIX|TRANSFER|TRANSF|TED)\b/.test(hc)
            ) {
                return;
            }

            let melhor = null;

            for (let i = 0; i < debitos.length; i++) {
                const d = debitos[i];

                if (
                    c.documentoId ===
                    d.documentoId
                ) {
                    continue;
                }

                if (
                    c.banco === d.banco &&
                    c.banco !== "Não identificado"
                ) {
                    continue;
                }

                if (
                    Math.abs(
                        c.valor - d.valor
                    ) > CONFIG.toleranciaValor
                ) {
                    continue;
                }

                const dias = Math.abs(
                    diferencaDias(
                        c.data,
                        d.data
                    )
                );

                if (
                    dias >
                    CONFIG.toleranciaDiasTransferencia
                ) {
                    continue;
                }

                const hd =
                    d.historicoNormalizado;

                if (
                    !/\b(PIX|TRANSFER|TRANSF|TED)\b/.test(hd)
                ) {
                    continue;
                }

                if (
                    !melhor ||
                    dias < melhor.dias
                ) {
                    melhor = {
                        mov: d,
                        dias: dias
                    };
                }
            }

            if (melhor) {
                c.transferenciaPropria = true;
                c.referenciaTransferencia =
                    melhor.mov.id;
                c.considerar = false;
                c.duvida = true;
                c.classificacao =
                    "TRANSFERENCIA_PROPRIA";
                c.motivo =
                    "Possível transferência entre contas próprias; encontrada saída de mesmo valor em " +
                    melhor.mov.banco +
                    " em " +
                    melhor.mov.dataTexto;
            }
        });
    }

    function montarResultado() {
        const competencias = Array.from(
            new Set(
                documentos.reduce(
                    function (acc, d) {
                        return acc.concat(
                            d.competencias || []
                        );
                    },
                    []
                )
            )
        ).sort();

        const titulares = documentos
            .map(function (d) {
                return d.titular;
            })
            .filter(Boolean);

        const docsTitular = documentos
            .map(function (d) {
                return d.documentoTitular;
            })
            .filter(Boolean);

        const bancos = Array.from(
            new Set(
                documentos
                    .map(function (d) {
                        return d.banco;
                    })
                    .filter(function (b) {
                        return b &&
                            b !== "Não identificado";
                    })
            )
        );

        return {
            titular:
                maisFrequente(titulares) || "",
            documentoTitular:
                maisFrequente(docsTitular) || "",
            bancos: bancos,
            competenciasDocumentadas:
                competencias,
            documentos: documentos,
            movimentacoes: movimentacoes,
            alertas: gerarAlertas()
        };
    }

    function gerarAlertas() {
        const alertas = [];

        documentos.forEach(function (d) {
            if (d.erro) {
                alertas.push(
                    d.arquivo +
                    ": " +
                    d.erro
                );
            }

            if (
                !d.erro &&
                !d.movimentacoes.length
            ) {
                alertas.push(
                    d.arquivo +
                    ": nenhuma movimentação identificada."
                );
            }

            if (
                d.banco ===
                "Não identificado"
            ) {
                alertas.push(
                    d.arquivo +
                    ": instituição financeira não identificada."
                );
            }
        });

        const duvidas = movimentacoes.filter(
            function (m) {
                return m.duvida;
            }
        ).length;

        const duplicados = movimentacoes.filter(
            function (m) {
                return m.duplicado;
            }
        ).length;

        const proprias = movimentacoes.filter(
            function (m) {
                return m.transferenciaPropria;
            }
        ).length;

        if (duvidas) {
            alertas.push(
                duvidas +
                " crédito(s) permanecem com dúvida e foram desconsiderados até revisão."
            );
        }

        if (duplicados) {
            alertas.push(
                duplicados +
                " possível(is) duplicidade(s) entre arquivos foram desconsideradas."
            );
        }

        if (proprias) {
            alertas.push(
                proprias +
                " possível(is) transferência(s) entre contas próprias foram desconsideradas até confirmação."
            );
        }

        if (
            movimentacoes.length &&
            movimentacoes.every(function (m) {
                return !m.considerar;
            })
        ) {
            alertas.push(
                "Nenhum crédito foi considerado automaticamente."
            );
        }

        return Array.from(
            new Set(alertas)
        );
    }

    function renderizarResultado() {
        const card = document.getElementById(
            "cardResultadoAnaliseIA"
        );

        if (card) {
            card.hidden = false;
        }

        const resumo = calcularResumo();

        definirTexto(
            "iaNomeTitular",
            resultado && resultado.titular
                ? resultado.titular
                : "Não identificado"
        );

        definirTexto(
            "iaDocumentoTitular",
            resultado && resultado.documentoTitular
                ? formatarDocumento(
                    resultado.documentoTitular
                )
                : "Não identificado"
        );

        definirTexto(
            "iaPeriodoAnalise",
            resumo.periodo || "-"
        );

        definirTexto(
            "iaInstituicoesAnalise",
            resultado && resultado.bancos.length
                ? resultado.bancos.join(", ")
                : "Não identificadas"
        );

        definirTexto(
            "iaQuantidadeArquivos",
            String(documentos.length)
        );

        renderizarDocumentos();
        renderizarAlertas();
        renderizarTabelaRevisao();
        renderizarResumos();
        atualizarParecer();
    }

    function renderizarDocumentos() {
        const container = document.getElementById(
            "listaDocumentosAnaliseIA"
        );

        if (!container) return;

        container.innerHTML = "";

        if (!documentos.length) {
            container.innerHTML =
                '<div class="sem-dados">Nenhum documento processado.</div>';
            return;
        }

        documentos.forEach(function (d) {
            const item = document.createElement("div");

            item.className =
                "documento-analise-ia";

            const periodo = d.periodo
                ? formatarData(d.periodo.inicio) +
                " a " +
                formatarData(d.periodo.fim)
                : "Período não identificado";

            const comps = d.competencias.length
                ? d.competencias
                    .map(formatarCompetenciaIA)
                    .join(", ")
                : "Nenhuma competência identificada";

            item.innerHTML =
                "<strong>" +
                escapar(d.arquivo) +
                "</strong>" +
                "<small>" +
                escapar(d.banco) +
                " · " +
                escapar(periodo) +
                " · " +
                d.movimentacoes.length +
                " lançamento(s)" +
                "</small>" +
                "<small>" +
                "Competências: " +
                escapar(comps) +
                (
                    d.erro
                        ? " · ERRO: " +
                        escapar(d.erro)
                        : ""
                ) +
                "</small>";

            container.appendChild(item);
        });
    }

    function renderizarAlertas() {
        const container = document.getElementById(
            "listaAlertasAnaliseIA"
        );

        if (!container) return;

        container.innerHTML = "";

        const alertas =
            resultado
                ? resultado.alertas
                : [];

        if (!alertas.length) {
            const item = document.createElement("div");

            item.className =
                "alerta-analise-ia sucesso";

            item.textContent =
                "Nenhum alerta relevante identificado.";

            container.appendChild(item);
            return;
        }

        alertas.forEach(function (a) {
            const item = document.createElement("div");

            item.className =
                "alerta-analise-ia";

            item.textContent = a;

            container.appendChild(item);
        });
    }

    function renderizarTabelaRevisao() {
        const tbody = obterTbody(
            "tabelaMovimentacoesIA"
        );

        if (!tbody) return;

        tbody.innerHTML = "";

        if (!movimentacoes.length) {
            inserirVazio(
                tbody,
                9,
                "Nenhuma movimentação identificada."
            );
            return;
        }

        const ordenadas =
            movimentacoes
                .slice()
                .sort(function (a, b) {
                    return a.data - b.data ||
                        a.banco.localeCompare(
                            b.banco
                        ) ||
                        a.valor - b.valor;
                });

        ordenadas.forEach(function (m) {
            const tr = document.createElement("tr");

            tr.dataset.id = m.id;

            if (m.considerar) {
                tr.classList.add(
                    "movimentacao-incluida-ia"
                );
            } else {
                tr.classList.add(
                    "movimentacao-excluida-ia"
                );
            }

            if (m.duvida) {
                tr.classList.add(
                    "movimentacao-duvida-ia"
                );
            }

            if (m.duplicado) {
                tr.classList.add(
                    "movimentacao-duplicada-ia"
                );
            }

            const podeMarcar =
                m.natureza === "C";

            tr.innerHTML =
                '<td>' +
                '<input type="checkbox" class="check-movimentacao-ia" ' +
                (m.considerar ? "checked " : "") +
                (podeMarcar ? "" : "disabled ") +
                'aria-label="Considerar lançamento">' +
                '</td>' +
                "<td>" +
                escapar(m.dataTexto) +
                "</td>" +
                "<td>" +
                escapar(m.banco) +
                "</td>" +
                "<td>" +
                escapar(m.arquivo) +
                "</td>" +
                "<td>" +
                escapar(m.historico) +
                "</td>" +
                "<td>" +
                escapar(
                    m.natureza === "C"
                        ? "Crédito"
                        : "Débito"
                ) +
                "</td>" +
                "<td>" +
                escapar(
                    formatarMoeda(m.valor)
                ) +
                "</td>" +
                "<td>" +
                escapar(
                    m.classificacao
                        .replace(/_/g, " ")
                ) +
                "</td>" +
                "<td>" +
                escapar(m.motivo) +
                "</td>";

            const check = tr.querySelector(
                ".check-movimentacao-ia"
            );

            if (check && !check.disabled) {
                check.addEventListener(
                    "change",
                    function () {
                        m.considerar =
                            check.checked;

                        m.manual = true;

                        if (check.checked) {
                            m.duvida = false;
                            m.motivo =
                                "Crédito incluído manualmente na revisão";
                        } else {
                            m.motivo =
                                "Crédito excluído manualmente na revisão";
                        }

                        renderizarResultadoSemTabelaCompleta();
                    }
                );
            }

            tbody.appendChild(tr);
        });
    }

    function renderizarResultadoSemTabelaCompleta() {
        const resumo = calcularResumo();

        definirTexto(
            "iaPeriodoAnalise",
            resumo.periodo || "-"
        );

        renderizarResumos();
        atualizarParecer();

        const tbody = obterTbody(
            "tabelaMovimentacoesIA"
        );

        if (tbody) {
            Array.from(
                tbody.querySelectorAll(
                    "tr[data-id]"
                )
            ).forEach(function (tr) {
                const m = movimentacoes.find(
                    function (x) {
                        return x.id ===
                            tr.dataset.id;
                    }
                );

                if (!m) return;

                tr.classList.toggle(
                    "movimentacao-incluida-ia",
                    m.considerar
                );

                tr.classList.toggle(
                    "movimentacao-excluida-ia",
                    !m.considerar
                );

                tr.classList.toggle(
                    "movimentacao-duvida-ia",
                    m.duvida
                );
            });
        }
    }

    function alterarTodos(incluir) {
        movimentacoes.forEach(function (m) {
            if (m.natureza !== "C") {
                return;
            }

            m.considerar = Boolean(incluir);
            m.manual = true;

            if (incluir) {
                m.duvida = false;
                m.motivo =
                    "Crédito incluído manualmente na revisão";
            } else {
                m.motivo =
                    "Crédito excluído manualmente na revisão";
            }
        });

        renderizarTabelaRevisao();
        renderizarResumos();
        atualizarParecer();
    }

    function calcularResumo() {
        const validos = movimentacoes.filter(
            function (m) {
                return m.natureza === "C" &&
                    m.considerar;
            }
        );

        const total = validos.reduce(
            function (s, m) {
                return s + m.valor;
            },
            0
        );

        let comps =
            resultado &&
                resultado.competenciasDocumentadas
                ? resultado.competenciasDocumentadas.slice()
                : [];

        if (!comps.length) {
            comps = Array.from(
                new Set(
                    validos
                        .map(function (m) {
                            return m.competencia;
                        })
                        .filter(Boolean)
                )
            ).sort();
        }

        const meses = comps.length;

        const media =
            meses
                ? total / meses
                : 0;

        const mensal = {};

        comps.forEach(function (c) {
            mensal[c] = {
                competencia: c,
                total: 0,
                quantidade: 0,
                bancos: new Set()
            };
        });

        validos.forEach(function (m) {
            if (!mensal[m.competencia]) {
                mensal[m.competencia] = {
                    competencia: m.competencia,
                    total: 0,
                    quantidade: 0,
                    bancos: new Set()
                };
            }

            mensal[m.competencia].total +=
                m.valor;

            mensal[m.competencia].quantidade++;

            mensal[m.competencia].bancos.add(
                m.banco
            );
        });

        const mensalLista =
            Object.values(mensal)
                .sort(function (a, b) {
                    return a.competencia
                        .localeCompare(
                            b.competencia
                        );
                });

        let maior = null;

        mensalLista.forEach(function (x) {
            if (
                !maior ||
                x.total > maior.total
            ) {
                maior = x;
            }
        });

        const porBanco = {};

        validos.forEach(function (m) {
            if (!porBanco[m.banco]) {
                porBanco[m.banco] = {
                    banco: m.banco,
                    total: 0,
                    quantidade: 0,
                    competencias: new Set()
                };
            }

            porBanco[m.banco].total +=
                m.valor;

            porBanco[m.banco].quantidade++;

            porBanco[m.banco]
                .competencias
                .add(m.competencia);
        });

        const bancos =
            Object.values(porBanco)
                .map(function (x) {
                    return {
                        banco: x.banco,
                        total: x.total,
                        quantidade: x.quantidade,
                        meses: x.competencias.size,
                        media:
                            x.competencias.size
                                ? x.total /
                                x.competencias.size
                                : 0
                    };
                })
                .sort(function (a, b) {
                    return b.total - a.total;
                });

        let periodo = "";

        if (comps.length) {
            periodo =
                formatarCompetenciaIA(
                    comps[0]
                ) +
                (
                    comps.length > 1
                        ? " a " +
                        formatarCompetenciaIA(
                            comps[
                            comps.length - 1
                            ]
                        )
                        : ""
                );
        }

        return {
            validos: validos,
            total: total,
            meses: meses,
            media: media,
            mensal: mensalLista,
            maior: maior,
            bancos: bancos,
            periodo: periodo
        };
    }

    function renderizarResumos() {
        const r = calcularResumo();

        definirTexto(
            "iaTotalCreditosValidos",
            formatarMoeda(r.total)
        );

        definirTexto(
            "iaMediaMensal",
            formatarMoeda(r.media)
        );

        definirTexto(
            "iaMesesConsiderados",
            String(r.meses)
        );

        definirTexto(
            "iaMaiorMes",
            r.maior
                ? formatarCompetenciaIA(
                    r.maior.competencia
                ) +
                " · " +
                formatarMoeda(
                    r.maior.total
                )
                : "-"
        );

        const mensal = obterTbody(
            "tabelaResumoMensalIA"
        );

        if (mensal) {
            mensal.innerHTML = "";

            if (!r.mensal.length) {
                inserirVazio(
                    mensal,
                    4,
                    "Nenhuma competência identificada."
                );
            } else {
                r.mensal.forEach(function (x) {
                    const tr =
                        document.createElement("tr");

                    tr.innerHTML =
                        "<td>" +
                        escapar(
                            formatarCompetenciaIA(
                                x.competencia
                            )
                        ) +
                        "</td>" +
                        "<td>" +
                        escapar(
                            Array.from(
                                x.bancos
                            ).join(", ") || "-"
                        ) +
                        "</td>" +
                        "<td>" +
                        x.quantidade +
                        "</td>" +
                        "<td>" +
                        escapar(
                            formatarMoeda(
                                x.total
                            )
                        ) +
                        "</td>";

                    mensal.appendChild(tr);
                });
            }
        }

        const bancos = obterTbody(
            "tabelaResumoBancosIA"
        );

        if (bancos) {
            bancos.innerHTML = "";

            if (!r.bancos.length) {
                inserirVazio(
                    bancos,
                    4,
                    "Nenhum crédito válido por instituição."
                );
            } else {
                r.bancos.forEach(function (x) {
                    const tr =
                        document.createElement("tr");

                    tr.innerHTML =
                        "<td>" +
                        escapar(x.banco) +
                        "</td>" +
                        "<td>" +
                        x.quantidade +
                        "</td>" +
                        "<td>" +
                        escapar(
                            formatarMoeda(
                                x.total
                            )
                        ) +
                        "</td>" +
                        "<td>" +
                        escapar(
                            formatarMoeda(
                                x.media
                            )
                        ) +
                        "</td>";

                    bancos.appendChild(tr);
                });
            }
        }
    }

    function gerarParecer() {
        const r = calcularResumo();
        const linhas = [];

        let cabecalho = "";

        if (
            resultado &&
            resultado.documentoTitular
        ) {
            cabecalho +=
                formatarDocumento(
                    resultado.documentoTitular
                );
        }

        if (
            resultado &&
            resultado.titular
        ) {
            cabecalho +=
                (cabecalho ? " - " : "") +
                resultado.titular
                    .toUpperCase();
        }

        if (cabecalho) {
            linhas.push(cabecalho);
        }

        if (
            resultado &&
            resultado.bancos.length
        ) {
            linhas.push(
                "VERIFICADO EXTRATOS: " +
                resultado.bancos
                    .map(function (b) {
                        return b.toUpperCase();
                    })
                    .join(", ") +
                "."
            );
        }

        linhas.push("");
        linhas.push(
            "MÊS ANALISADO | CRÉDITOS CONSIDERADOS"
        );

        r.mensal.forEach(function (x) {
            const bancos =
                Array.from(x.bancos)
                    .filter(function (b) {
                        return b !==
                            "Não identificado";
                    })
                    .join(", ");

            linhas.push(
                formatarCompetenciaExtenso(
                    x.competencia
                ) +
                (
                    bancos
                        ? " — " +
                        bancos.toUpperCase()
                        : ""
                ) +
                " | " +
                formatarMoeda(x.total)
            );
        });

        linhas.push(
            "TOTAL | " +
            formatarMoeda(r.total)
        );

        linhas.push(
            "MÉDIA SIMPLES DOS " +
            r.meses +
            " MÊS(ES) | " +
            formatarMoeda(r.media) +
            " POR MÊS"
        );

        const excluidos =
            movimentacoes.filter(
                function (m) {
                    return m.natureza === "C" &&
                        !m.considerar;
                }
            );

        const duvidas =
            excluidos.filter(function (m) {
                return m.duvida;
            });

        const duplicados =
            excluidos.filter(function (m) {
                return m.duplicado;
            });

        const proprias =
            excluidos.filter(function (m) {
                return m.transferenciaPropria;
            });

        if (
            excluidos.length ||
            duvidas.length
        ) {
            linhas.push("");
            linhas.push("OBSERVAÇÕES:");

            if (excluidos.length) {
                linhas.push(
                    "- " +
                    excluidos.length +
                    " crédito(s) desconsiderado(s) conforme classificação/revisão."
                );
            }

            if (duplicados.length) {
                linhas.push(
                    "- " +
                    duplicados.length +
                    " possível(is) duplicidade(s) desconsiderada(s)."
                );
            }

            if (proprias.length) {
                linhas.push(
                    "- " +
                    proprias.length +
                    " possível(is) transferência(s) entre contas próprias desconsiderada(s)."
                );
            }

            if (duvidas.length) {
                linhas.push(
                    "- " +
                    duvidas.length +
                    " lançamento(s) com dúvida permaneceram fora do cálculo."
                );
            }
        }

        return linhas.join("\n");
    }

    function atualizarParecer() {
        const textarea = document.getElementById(
            "parecerAnaliseIA"
        );

        if (textarea) {
            textarea.value = gerarParecer();
        }
    }

    function gerarTextoConsolidado() {
        return movimentacoes
            .map(function (m) {
                let decisao =
                    m.considerar
                        ? "[INCLUIR_IA]"
                        : "[EXCLUIR_IA]";

                if (
                    m.duvida &&
                    !m.considerar
                ) {
                    decisao += " [DUVIDA_IA]";
                }

                const historico =
                    "[LOCAL:" +
                    sanitizarTag(m.id) +
                    "] " +
                    "[BANCO:" +
                    sanitizarTag(m.banco) +
                    "] " +
                    m.historico +
                    " " +
                    decisao;

                return (
                    formatarData(m.data) +
                    " | " +
                    m.id +
                    " | " +
                    historico +
                    " | " +
                    formatarValor(m.valor) +
                    " " +
                    m.natureza
                );
            })
            .join("\n");
    }

    function aplicarAoMotor() {
        if (!movimentacoes.length) {
            definirStatus(
                "Nenhuma análise disponível para aplicar.",
                "erro"
            );
            return;
        }

        const textarea = document.getElementById(
            "textoExtratoMovimentacao"
        );

        if (!textarea) {
            definirStatus(
                "Campo textoExtratoMovimentacao não encontrado.",
                "erro"
            );
            return;
        }

        textarea.value =
            gerarTextoConsolidado();

        textarea.dispatchEvent(
            new Event(
                "input",
                { bubbles: true }
            )
        );

        try {
            if (
                window.MediaMovimentacao &&
                typeof window.MediaMovimentacao.processar ===
                "function"
            ) {
                window.MediaMovimentacao.processar();
            } else if (
                typeof window.processarMovimentacao ===
                "function"
            ) {
                window.processarMovimentacao();
            } else {
                const btn = document.getElementById(
                    "btnProcessarMovimentacao"
                );

                if (btn) {
                    btn.click();
                }
            }

            setTimeout(function () {
                aplicarPeriodo();
                reprocessarMotor();

                definirStatus(
                    "Análise aplicada ao cálculo da Média de Movimentação.",
                    "sucesso"
                );
            }, 0);
        } catch (e) {
            console.error(e);

            definirStatus(
                "Não foi possível aplicar a análise ao motor: " +
                (e.message || e),
                "erro"
            );
        }
    }

    function aplicarPeriodo() {
        const comps =
            resultado &&
                resultado.competenciasDocumentadas
                ? resultado
                    .competenciasDocumentadas
                    .slice()
                    .sort()
                : [];

        if (!comps.length) {
            return;
        }

        const datas =
            movimentacoes
                .filter(function (m) {
                    return m.data instanceof Date &&
                        !Number.isNaN(
                            m.data.getTime()
                        );
                })
                .map(function (m) {
                    return m.data;
                });

        if (!datas.length) {
            return;
        }

        const inicio = new Date(
            Math.min.apply(
                null,
                datas.map(function (d) {
                    return d.getTime();
                })
            )
        );

        const fim = new Date(
            Math.max.apply(
                null,
                datas.map(function (d) {
                    return d.getTime();
                })
            )
        );

        if (window.MediaMovimentacao) {
            if (
                typeof window.MediaMovimentacao.definirPeriodo ===
                "function"
            ) {
                window.MediaMovimentacao.definirPeriodo(
                    inicio,
                    fim
                );
            }

            if (
                typeof window.MediaMovimentacao.definirMesesConsiderados ===
                "function"
            ) {
                window.MediaMovimentacao.definirMesesConsiderados(
                    comps.length
                );
            }
        }

        const campoDetectados =
            document.getElementById(
                "mesesDetectadosMovimentacao"
            );

        const campoConsiderados =
            document.getElementById(
                "mesesConsideradosMovimentacao"
            );

        const primeira =
            document.getElementById(
                "primeiraDataMovimentacao"
            );

        const ultima =
            document.getElementById(
                "ultimaDataMovimentacao"
            );

        if (primeira) {
            primeira.value =
                formatarData(inicio);
        }

        if (ultima) {
            ultima.value =
                formatarData(fim);
        }

        if (campoDetectados) {
            campoDetectados.value =
                String(comps.length);
        }

        if (campoConsiderados) {
            campoConsiderados.value =
                String(comps.length);
        }
    }

    function reprocessarMotor() {
        try {
            if (
                window.MediaMovimentacao &&
                typeof window.MediaMovimentacao.recalcular ===
                "function"
            ) {
                window.MediaMovimentacao.recalcular();
                return;
            }

            if (
                typeof window.classificarMovimentacoes ===
                "function"
            ) {
                window.classificarMovimentacoes();
            }

            if (
                typeof window.calcularResultadosMovimentacao ===
                "function"
            ) {
                window.calcularResultadosMovimentacao();
            }

            if (
                typeof window.renderizarHistoricosExtrato ===
                "function"
            ) {
                window.renderizarHistoricosExtrato();
            }

            if (
                typeof window.renderizarResultadosMovimentacao ===
                "function"
            ) {
                window.renderizarResultadosMovimentacao();
            }
        } catch (e) {
            console.warn(
                "[Média Movimentação] Não foi possível reprocessar o motor:",
                e
            );
        }
    }

    async function copiarParecer() {
        const textarea = document.getElementById(
            "parecerAnaliseIA"
        );

        const texto =
            textarea
                ? textarea.value
                : gerarParecer();

        if (!texto) {
            return;
        }

        try {
            await navigator.clipboard.writeText(
                texto
            );

            definirStatus(
                "Parecer copiado para a área de transferência.",
                "sucesso"
            );
        } catch (e) {
            if (textarea) {
                textarea.focus();
                textarea.select();

                try {
                    document.execCommand("copy");

                    definirStatus(
                        "Parecer copiado para a área de transferência.",
                        "sucesso"
                    );
                } catch (err) {
                    definirStatus(
                        "Não foi possível copiar automaticamente o parecer.",
                        "erro"
                    );
                }
            }
        }
    }

    function limparTudo() {
        arquivos = [];
        documentos = [];
        movimentacoes = [];
        resultado = null;
        contadorMovimentacoes = 0;

        const input = document.getElementById(
            "arquivosExtratoIA"
        );

        if (input) {
            input.value = "";
        }

        const orientacao = document.getElementById(
            "orientacaoAnaliseIA"
        );

        if (orientacao) {
            orientacao.value = "";
        }

        const card = document.getElementById(
            "cardResultadoAnaliseIA"
        );

        if (card) {
            card.hidden = true;
        }

        const parecer = document.getElementById(
            "parecerAnaliseIA"
        );

        if (parecer) {
            parecer.value = "";
        }

        renderizarArquivos();
        atualizarEstadoBotaoAnalisar();

        definirStatus(
            "Seleção e análise limpas.",
            "info"
        );
    }

    function bloquearAnalise(bloquear) {
        const btn = document.getElementById(
            "btnAnalisarExtratosIA"
        );

        if (!btn) return;

        if (bloquear) {
            btn.disabled = true;
            btn.setAttribute(
                "disabled",
                "disabled"
            );

            btn.style.pointerEvents = "none";
            btn.style.cursor = "wait";
            btn.textContent = "Analisando...";
        } else {
            btn.disabled = false;
            btn.removeAttribute("disabled");
            btn.style.pointerEvents = "auto";
            btn.style.cursor = "pointer";
            btn.textContent =
                "Analisar e Consolidar";
        }
    }

    function definirStatus(texto, tipo) {
        const el = document.getElementById(
            "statusAnaliseIA"
        );

        if (!el) return;

        el.textContent = texto || "";

        el.className =
            "status-analise-ia" +
            (
                tipo
                    ? " status-" + tipo
                    : ""
            );
    }

    function definirTexto(id, texto) {
        const el = document.getElementById(id);

        if (el) {
            el.textContent = texto;
        }
    }

    function obterTbody(id) {
        const el = document.getElementById(id);

        if (!el) {
            return null;
        }

        if (
            el.tagName &&
            el.tagName.toUpperCase() === "TBODY"
        ) {
            return el;
        }

        if (
            el.tagName &&
            el.tagName.toUpperCase() === "TABLE"
        ) {
            return el.querySelector("tbody");
        }

        return el;
    }

    function inserirVazio(tbody, colunas, texto) {
        const tr = document.createElement("tr");

        tr.innerHTML =
            '<td colspan="' +
            colunas +
            '" class="sem-dados">' +
            escapar(texto) +
            "</td>";

        tbody.appendChild(tr);
    }

    function obterExtensao(nome) {
        const partes = String(nome || "")
            .toLowerCase()
            .split(".");

        return partes.length > 1
            ? partes.pop()
            : "";
    }

    function formatarTamanho(bytes) {
        const n = Number(bytes || 0);

        if (n < 1024) {
            return n + " B";
        }

        if (n < 1024 * 1024) {
            return (
                n / 1024
            ).toFixed(1) + " KB";
        }

        return (
            n / (1024 * 1024)
        ).toFixed(1) + " MB";
    }

    function normalizar(texto) {
        return String(texto || "")
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .toUpperCase()
            .replace(/\u00A0/g, " ")
            .replace(
                /[.,:;()[\]{}]+/g,
                " "
            )
            .replace(
                /[-–—]+/g,
                " "
            )
            .replace(
                /[*_=<>]+/g,
                " "
            )
            .replace(/\s+/g, " ")
            .trim();
    }

    function limparHistorico(texto) {
        return String(texto || "")
            .replace(
                /^[|;,\s]+|[|;,\s]+$/g,
                " "
            )
            .replace(/\s+/g, " ")
            .trim();
    }

    function converterValorFlexivel(valor) {
        let s = String(valor || "")
            .replace(/R\$/gi, "")
            .replace(/\s+/g, "")
            .trim();

        if (!s) {
            return NaN;
        }

        let negativo = false;

        if (s.startsWith("-")) {
            negativo = true;
            s = s.substring(1);
        }

        if (s.startsWith("+")) {
            s = s.substring(1);
        }

        const ultimaVirgula =
            s.lastIndexOf(",");

        const ultimoPonto =
            s.lastIndexOf(".");

        if (
            ultimaVirgula >= 0 &&
            ultimoPonto >= 0
        ) {
            if (
                ultimaVirgula >
                ultimoPonto
            ) {
                s = s
                    .replace(/\./g, "")
                    .replace(",", ".");
            } else {
                s = s.replace(/,/g, "");
            }
        } else if (ultimaVirgula >= 0) {
            s = s
                .replace(/\./g, "")
                .replace(",", ".");
        } else if (ultimoPonto >= 0) {
            const decimais =
                s.length -
                ultimoPonto -
                1;

            if (decimais !== 2) {
                s = s.replace(/\./g, "");
            }
        }

        s = s.replace(
            /[^\d.]/g,
            ""
        );

        const n = Number(s);

        if (!Number.isFinite(n)) {
            return NaN;
        }

        return negativo
            ? -n
            : n;
    }

    function normalizarAno(ano, tamanho) {
        if (tamanho === 2) {
            return ano >= 70
                ? 1900 + ano
                : 2000 + ano;
        }

        return ano;
    }

    function criarData(dia, mes, ano) {
        if (
            !Number.isInteger(dia) ||
            !Number.isInteger(mes) ||
            !Number.isInteger(ano) ||
            dia < 1 ||
            dia > 31 ||
            mes < 1 ||
            mes > 12 ||
            ano < 1900 ||
            ano > 2200
        ) {
            return null;
        }

        const d = new Date(
            ano,
            mes - 1,
            dia,
            12,
            0,
            0,
            0
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

    function formatarData(d) {
        if (
            !(d instanceof Date) ||
            Number.isNaN(
                d.getTime()
            )
        ) {
            return "";
        }

        return (
            String(
                d.getDate()
            ).padStart(2, "0") +
            "/" +
            String(
                d.getMonth() + 1
            ).padStart(2, "0") +
            "/" +
            d.getFullYear()
        );
    }

    function competencia(d) {
        if (
            !(d instanceof Date) ||
            Number.isNaN(
                d.getTime()
            )
        ) {
            return "";
        }

        return (
            d.getFullYear() +
            "-" +
            String(
                d.getMonth() + 1
            ).padStart(2, "0")
        );
    }

    function formatarCompetenciaIA(c) {
        const p = String(c || "")
            .split("-");

        return p.length === 2
            ? p[1] + "/" + p[0]
            : c;
    }

    function formatarCompetenciaExtenso(c) {
        const p = String(c || "")
            .split("-");

        if (p.length !== 2) {
            return String(c || "");
        }

        const meses = [
            "JANEIRO",
            "FEVEREIRO",
            "MARÇO",
            "ABRIL",
            "MAIO",
            "JUNHO",
            "JULHO",
            "AGOSTO",
            "SETEMBRO",
            "OUTUBRO",
            "NOVEMBRO",
            "DEZEMBRO"
        ];

        const mes = Number(p[1]);

        return (
            meses[mes - 1] ||
            p[1]
        ) +
            "/" +
            p[0];
    }

    function competenciasEntre(inicio, fim) {
        if (
            !(inicio instanceof Date) ||
            !(fim instanceof Date)
        ) {
            return [];
        }

        const a = new Date(
            inicio.getFullYear(),
            inicio.getMonth(),
            1
        );

        const b = new Date(
            fim.getFullYear(),
            fim.getMonth(),
            1
        );

        const arr = [];

        while (a <= b) {
            arr.push(
                a.getFullYear() +
                "-" +
                String(
                    a.getMonth() + 1
                ).padStart(2, "0")
            );

            a.setMonth(
                a.getMonth() + 1
            );
        }

        return arr;
    }

    function diferencaDias(a, b) {
        return Math.round(
            (
                a.getTime() -
                b.getTime()
            ) /
            86400000
        );
    }

    function similaridadeHistorico(a, b) {
        const sa = new Set(
            normalizar(a)
                .split(" ")
                .filter(function (x) {
                    return x.length > 2;
                })
        );

        const sb = new Set(
            normalizar(b)
                .split(" ")
                .filter(function (x) {
                    return x.length > 2;
                })
        );

        if (
            !sa.size &&
            !sb.size
        ) {
            return 1;
        }

        let inter = 0;

        sa.forEach(function (x) {
            if (sb.has(x)) {
                inter++;
            }
        });

        const uniao = new Set(
            Array.from(sa)
                .concat(
                    Array.from(sb)
                )
        ).size;

        return uniao
            ? inter / uniao
            : 0;
    }

    function maisFrequente(lista) {
        if (!lista.length) {
            return "";
        }

        const mapa = {};
        let melhor = "";
        let qtd = 0;

        lista.forEach(function (x) {
            const k = String(x || "")
                .trim();

            if (!k) {
                return;
            }

            mapa[k] = (mapa[k] || 0) + 1;

            if (mapa[k] > qtd) {
                qtd = mapa[k];
                melhor = k;
            }
        });

        return melhor;
    }

    function formatarDocumento(doc) {
        const s = String(doc || "")
            .replace(/\D/g, "");

        if (s.length === 11) {
            return s.replace(
                /(\d{3})(\d{3})(\d{3})(\d{2})/,
                "$1.$2.$3-$4"
            );
        }

        if (s.length === 14) {
            return s.replace(
                /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
                "$1.$2.$3/$4-$5"
            );
        }

        return doc || "";
    }

    function formatarMoeda(v) {
        return Number(v || 0)
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

    function formatarValor(v) {
        return Number(v || 0)
            .toLocaleString(
                "pt-BR",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                    useGrouping: true
                }
            );
    }

    function sanitizarTag(v) {
        return String(v || "")
            .replace(
                /[\[\]\r\n]/g,
                " "
            )
            .replace(/\s+/g, " ")
            .trim();
    }

    function escapar(texto) {
        return String(texto || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    window.MediaMovimentacaoIA = {
        analisar: analisarLocal,
        limpar: limparTudo,
        aplicar: aplicarAoMotor,

        obterResultado: function () {
            return resultado;
        },

        obterMovimentacoes: function () {
            return movimentacoes.slice();
        },

        obterResumo: calcularResumo,
        gerarTextoConsolidado:
            gerarTextoConsolidado,
        gerarParecer: gerarParecer
    };

})();