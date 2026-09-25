(function () {
    "use strict";

    document.addEventListener("DOMContentLoaded", iniciarMediaMovimentacao);

    let movimentacoesExtrato = [];
    let movimentacoesConsideradas = [];
    let movimentacoesExcluidas = [];
    let primeiraDataExtrato = null;
    let ultimaDataExtrato = null;
    let primeiraDataExtratoAutomatica = null;
    let ultimaDataExtratoAutomatica = null;
    let mesesDetectadosAutomaticos = 0;
    let competenciasDocumentadasExternas = [];
    let modoEntradaMovimentacao = "";

    const historicosExcluidosManualmente = new Set();
    const historicosIncluidosManualmente = new Set();

    const REGRAS_INFORMATIVAS = [
        /\bSALDO ANTERIOR\b/, /\bSALDO BLOQUEADO ANTERIOR\b/, /\bSALDO DO DIA\b/, /\bSALDO FINAL\b/, /\bSALDO DISPONIVEL\b/, /\bSALDO TOTAL\b/, /\bSALDO EM CONTA\b/, /\bSALDO EM CONTA CAPITAL\b/, /\bSALDO CONTA CAPITAL\b/, /\bSALDO BLOQUEADO\b/,
        /\bCHEQUE ESPECIAL CONTRATADO\b/, /\bLIMITE DE CHEQUE ESPECIAL\b/, /\bLIMITE CHEQUE ESPECIAL\b/, /\bLIMITE DISPONIVEL\b/, /\bJUROS VENCIDOS PROVISIONADOS\b/, /\bTARIFAS VENCIDAS PROVISIONADAS\b/, /\bJUROS VENCIDOS REMANESCENTES\b/, /\bTARIFAS VENCIDAS REMANESCENTES\b/,
        /\bENCARGOS VENCIDOS REMANESCENTES\b/, /\bENCARGOS A VENCER\b/, /\bPREVISAO IOF\b/, /\bPREVISAO JUROS\b/, /\bPREVISAO TARIFAS\b/, /\bOUTRAS INFORMACOES\b/, /\bVENCIMENTO CHEQUE ESPECIAL\b/, /\bTAXA CHEQUE ESPECIAL\b/, /\bCUSTO EFETIVO TOTAL\b/,
        /\bTOTAL DE CREDITOS\b/, /\bTOTAL CREDITOS\b/, /\bTOTAL DE DEBITOS\b/, /\bTOTAL DEBITOS\b/, /\bTOTAL MOVIMENTACAO\b/, /\bTOTAL MOVIMENTACOES\b/, /\bRESUMO\b/, /\bLANCAMENTOS FUTUROS\b/, /\bDATA DOCUMENTO HISTORICO VALOR\b/, /\bDATA HISTORICO VALOR\b/,
        /\bEXTRATO CONTA CORRENTE\b/, /\bEXTRATO DE CONTA\b/, /\bSISTEMA DE COOPERATIVAS DE CREDITO DO BRASIL\b/, /\bSISBR SISTEMA DE INFORMATICA DO SICOOB\b/, /\bEXTRATOS EMITIDOS ATE\b/, /\bOUVIDORIA\b/, /\bCENTRAL DE ATENDIMENTO\b/, /\bSAC\b/
    ];

    const REGRAS_EXCLUSAO_MOVIMENTACAO = [
        {
            id: "emprestimo",
            rotulo: "EMPRÉSTIMO / FINANCIAMENTO",
            motivo: "Empréstimo ou financiamento não representa renda.",
            testar: h => /\b(EMPRESTIMO|FINANCIAMENTO|FINANC|CREDITO PESSOAL|CREDITO CONSIGNADO|CAPITAL DE GIRO|LIBERACAO DE CREDITO|LIBERACAO CREDITO|CRED LIBERACAO BNDES|CREDITO LIBERACAO BNDES)\b/.test(h)
        },
        {
            id: "titulo-descontado",
            rotulo: "TÍTULO DESCONTADO",
            motivo: "Liberação de título descontado não representa nova renda.",
            testar: h => /\b(CRED LIBERACAO TD|CREDITO LIBERACAO TD|TITULO DESCONTADO|DESCONTO DE TITULOS)\b/.test(h)
        },
        {
            id: "limite",
            rotulo: "LIMITE / CHEQUE ESPECIAL",
            motivo: "Utilização ou liberação de limite não representa renda.",
            testar: h => /\b(CHEQUE ESPECIAL|LIMITE DE CREDITO|CREDITO ROTATIVO|LIMITE ROTATIVO)\b/.test(h)
        },
        {
            id: "estorno",
            rotulo: "ESTORNO / DEVOLUÇÃO",
            motivo: "Estorno, devolução, cancelamento ou reembolso não representa renda.",
            testar: h => /\b(ESTORNO|REVERSAO|CANCELAMENTO|DEVOLUCAO|DEVOLVIDO|REEMBOLSO)\b/.test(h)
        },
        {
            id: "investimento",
            rotulo: "INVESTIMENTO / RESGATE",
            motivo: "Resgate ou aplicação de investimento não representa novo recurso.",
            testar: h => /\b(RDB|RDC|CDB|RESGATE|APLICACAO|INVESTIMENTO|FUNDO DE INVESTIMENTO|RESGATE AUTOMATICO)\b/.test(h)
        },
        {
            id: "pix-devolvido",
            rotulo: "DEVOLUÇÃO PIX",
            motivo: "Devolução de PIX não representa renda.",
            testar: h => /\b(DEVOLUCAO PIX|PIX DEVOLVIDO|PIX DEVOLUCAO)\b/.test(h)
        },
        {
            id: "cheque-devolvido",
            rotulo: "CHEQUE DEVOLVIDO",
            motivo: "Cheque devolvido não representa renda efetiva.",
            testar: h => /\b(CHEQUE DEVOLVIDO|CH DEVOLVIDO)\b/.test(h)
        },
        {
            id: "pontos",
            rotulo: "RESGATE DE PONTOS",
            motivo: "Resgate de pontos não representa renda.",
            testar: h => /\b(RESGATE PONTOS|COOPERA.*RESGATE)\b/.test(h)
        }
    ];

    const PADROES_CREDITO_VALIDO = [
        /\bPIX RECEBIDO\b/,
        /\bPIX RECEBIDA\b/,
        /\bPIX RECEB\b/,
        /\bTRANSF RECEBIDA\b/,
        /\bTRANSFERENCIA RECEBIDA\b/,
        /\bTRANSFERENCIA RECEBIDO\b/,
        /\bCRED TRANSF\b/,
        /\bCREDITO TRANSFERENCIA\b/,
        /\bCRED TED\b/,
        /\bTED RECEBIDA\b/,
        /\bTED RECEBIDO\b/,
        /\bDOC RECEBIDO\b/,
        /\bDOC RECEBIDA\b/,
        /\bDEPOSITO EM DINHEIRO\b/,
        /\bDEP DINHEIRO\b/,
        /\bDEPOSITO CHEQUE\b/,
        /\bDEP CHEQUE\b/,
        /\bRECEBIMENTO\b/,
        /\bPAGAMENTO RECEBIDO\b/,
        /\bCOBRANCA RECEBIDA\b/,
        /\bLIQUIDACAO COBRANCA\b/,
        /\bCRED LIQUIDACAO COBRANCA\b/,
        /\bOUTROS CREDITOS\b/,
        /\bCREDITO EM CONTA\b/,
        /\bCR COMPRAS\b/,
        /\bCR ANTECIPACAO\b/,
        /\bCRED ANTECIPACAO\b/,
        /\bCREDITO ANTECIPACAO\b/
    ];

    function iniciarMediaMovimentacao() {
        configurarModoEntradaMovimentacao();
        configurarEventosMediaMovimentacao();
        limparResultadosMovimentacao();
        renderizarHistoricosExtrato();
        ocultarResultadosProcessamento();
    }

    function configurarModoEntradaMovimentacao() {
        const btnArquivo = document.getElementById("btnModoArquivo");
        const btnTexto = document.getElementById("btnModoTexto");

        if (btnArquivo) {
            btnArquivo.addEventListener(
                "click",
                () => selecionarModoEntradaMovimentacao("arquivo")
            );
        }

        if (btnTexto) {
            btnTexto.addEventListener(
                "click",
                () => selecionarModoEntradaMovimentacao("texto")
            );
        }

        document
            .querySelectorAll(".btnTrocarModoMovimentacao")
            .forEach(btn => {
                btn.addEventListener(
                    "click",
                    voltarSelecaoModoMovimentacao
                );
            });
    }

    function selecionarModoEntradaMovimentacao(modo) {
        modoEntradaMovimentacao = modo;

        const seletor = document.getElementById("cardModoEntrada");
        const arquivo = document.getElementById("cardLeituraExtratos");
        const texto = document.getElementById("cardExtratoMovimentacao");
        const resultadoOCR = document.getElementById("cardResultadoLeituraExtratos");

        if (seletor) seletor.hidden = true;
        if (arquivo) arquivo.hidden = modo !== "arquivo";
        if (texto) texto.hidden = modo !== "texto";
        if (resultadoOCR) resultadoOCR.hidden = true;

        ocultarResultadosProcessamento();
        resetarEstadoMovimentacao();
        limparResultadosMovimentacao();
        renderizarHistoricosExtrato();

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    function voltarSelecaoModoMovimentacao() {
        modoEntradaMovimentacao = "";

        const seletor = document.getElementById("cardModoEntrada");
        const arquivo = document.getElementById("cardLeituraExtratos");
        const texto = document.getElementById("cardExtratoMovimentacao");
        const resultadoOCR = document.getElementById("cardResultadoLeituraExtratos");

        if (seletor) seletor.hidden = false;
        if (arquivo) arquivo.hidden = true;
        if (texto) texto.hidden = true;
        if (resultadoOCR) resultadoOCR.hidden = true;

        ocultarResultadosProcessamento();
        resetarEstadoMovimentacao();
        limparResultadosMovimentacao();
        renderizarHistoricosExtrato();

        const status = document.getElementById("statusModoMovimentacao");

        if (status) {
            status.innerHTML =
                "<strong>Selecione uma forma de entrada</strong>" +
                "<span>Você poderá trocar de opção a qualquer momento.</span>";
        }

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    function mostrarResultadosProcessamento() {
        document
            .querySelectorAll(".resultado-processamento-movimentacao")
            .forEach(el => {
                el.hidden = false;
            });
    }

    function ocultarResultadosProcessamento() {
        document
            .querySelectorAll(".resultado-processamento-movimentacao")
            .forEach(el => {
                el.hidden = true;
            });
    }

    function configurarEventosMediaMovimentacao() {
        const a = document.getElementById("btnProcessarMovimentacao");
        const b = document.getElementById("btnLimparMovimentacao");
        const c = document.getElementById("btnRecalcularMovimentacao");
        const d = document.getElementById("btnRestaurarPeriodoMovimentacao");

        if (a) {
            a.addEventListener(
                "click",
                processarMovimentacao
            );
        }

        if (b) {
            b.addEventListener(
                "click",
                limparMediaMovimentacao
            );
        }

        if (c) {
            c.addEventListener("click", () => {
                if (!movimentacoesExtrato.length) return;

                aplicarPeriodoInformadoPeloUsuario();
                classificarMovimentacoes();
                renderizarHistoricosExtrato();
                renderizarResultadosMovimentacao();
            });
        }

        if (d) {
            d.addEventListener("click", () => {
                restaurarPeriodoAutomatico();

                if (!movimentacoesExtrato.length) return;

                classificarMovimentacoes();
                renderizarHistoricosExtrato();
                renderizarResultadosMovimentacao();
            });
        }

        [
            "primeiraDataMovimentacao",
            "ultimaDataMovimentacao"
        ].forEach(id => {
            const e = document.getElementById(id);

            if (!e) return;

            e.addEventListener(
                "input",
                aplicarMascaraDataCampo
            );

            e.addEventListener("blur", () => {
                if (!movimentacoesExtrato.length) return;

                aplicarPeriodoInformadoPeloUsuario();
                renderizarResultadosMovimentacao();
            });
        });

        [
            "mesesDetectadosMovimentacao",
            "mesesConsideradosMovimentacao"
        ].forEach(id => {
            const e = document.getElementById(id);

            if (!e) return;

            e.addEventListener("blur", () => {
                normalizarCampoMeses(e);

                if (movimentacoesExtrato.length) {
                    renderizarResultadosMovimentacao();
                }
            });
        });
    }

    function processarMovimentacao() {
        const a = document.getElementById("textoExtratoMovimentacao");

        if (!a) return false;

        const b = String(a.value || "").trim();

        if (!b) {
            alert("Cole o extrato no campo de texto.");
            return false;
        }

        return processarTextoMovimentacao(b);
    }

    function processarTextoMovimentacao(a, b = {}) {
        resetarEstadoMovimentacao();

        if (Array.isArray(b.competenciasDocumentadas)) {
            competenciasDocumentadasExternas = Array.from(
                new Set(
                    b.competenciasDocumentadas.filter(Boolean)
                )
            ).sort();
        }

        movimentacoesExtrato = interpretarExtratoMovimentacao(a);

        if (!movimentacoesExtrato.length) {
            ocultarResultadosProcessamento();
            limparResultadosMovimentacao();
            renderizarHistoricosExtrato();
            return false;
        }

        identificarPeriodoExtrato();
        classificarMovimentacoes();
        renderizarHistoricosExtrato();
        renderizarResultadosMovimentacao();
        mostrarResultadosProcessamento();

        setTimeout(() => {
            const el = document.getElementById(
                "cardResultadoMovimentacao"
            );

            if (el) {
                el.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        }, 50);

        return true;
    }

    function resetarEstadoMovimentacao() {
        movimentacoesExtrato = [];
        movimentacoesConsideradas = [];
        movimentacoesExcluidas = [];

        primeiraDataExtrato = null;
        ultimaDataExtrato = null;
        primeiraDataExtratoAutomatica = null;
        ultimaDataExtratoAutomatica = null;

        mesesDetectadosAutomaticos = 0;
        competenciasDocumentadasExternas = [];

        historicosExcluidosManualmente.clear();
        historicosIncluidosManualmente.clear();
    }

    function interpretarExtratoMovimentacao(a) {
        const b = decodificarTexto(a)
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .split("\n");

        const c = [];
        let d = null;

        b.forEach((a, b) => {
            const e = String(a || "")
                .replace(/\u00a0/g, " ")
                .replace(/[ \t]+/g, " ")
                .trim();

            if (!e) return;

            if (linhaInformativa(normalizarTexto(e))) {
                return;
            }

            const f = interpretarLinhaConsolidada(
                e,
                b + 1
            );

            if (f) {
                c.push(f);
                d = f.data;
                return;
            }

            const g = extrairDataInicial(e);

            if (g) {
                d = g.data;
            }

            const h = interpretarLinhaExtratoBruto(
                e,
                d,
                b + 1,
                !!g
            );

            if (h) {
                c.push(h);
            }
        });

        return removerDuplicidadesParser(c);
    }

    function interpretarLinhaConsolidada(a, b) {
        if (!a.includes("|")) {
            return null;
        }

        const c = a
            .split("|")
            .map(a => String(a || "").trim());

        if (c.length < 3) {
            return null;
        }

        const d = converterDataExtrato(c[0]);

        if (!d) {
            return null;
        }

        const e = extrairValorFinal(
            c[c.length - 1]
        );

        if (!e) {
            return null;
        }

        const f = c
            .slice(1, -1)
            .join(" ");

        const g = extrairMetadadosLeitura(f);

        const h = removerMetadadosLeitura(f)
            .replace(/^MOV\d+\s*\*/i, "")
            .trim();

        if (
            !h ||
            linhaInformativa(
                normalizarTexto(h)
            )
        ) {
            return null;
        }

        return criarMovimentacaoExtrato({
            numeroLinha: b,
            data: d,
            documento: "",
            historico: h,
            valor: e.valor,
            indicador: e.indicador,
            original: a,
            metadata: g
        });
    }

    function interpretarLinhaExtratoBruto(a, b, c, d) {
        if (!b) {
            return null;
        }

        let e = a;

        const f = e.match(
            /^(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})(?=\s|$)/
        );

        if (f) {
            e = e
                .substring(f[0].length)
                .trim();
        }

        const g = extrairValorFinal(e);

        if (!g) {
            return null;
        }

        const h = e
            .substring(0, g.indice)
            .replace(/[|]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        if (!h) {
            return null;
        }

        const i = separarDocumentoHistorico(h);
        const j = normalizarTexto(i.historico);

        if (
            !j ||
            linhaInformativa(j)
        ) {
            return null;
        }

        if (
            !d &&
            !g.indicador
        ) {
            return null;
        }

        if (
            !g.indicador &&
            !ehHistoricoTransacional(j)
        ) {
            return null;
        }

        return criarMovimentacaoExtrato({
            numeroLinha: c,
            data: b,
            documento: i.documento,
            historico: i.historico,
            valor: g.valor,
            indicador: g.indicador,
            original: a,
            metadata: {}
        });
    }

    function extrairValorFinal(a) {
        const b = String(a || "").trim();

        const c = b.match(
            /(?:R\$\s*)?([+-]?\s*(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2})\s*([CD*])?\s*$/i
        );

        if (!c) {
            return null;
        }

        const d = converterValorBrasileiro(
            c[1]
        );

        if (!Number.isFinite(d)) {
            return null;
        }

        let e = String(
            c[2] || ""
        ).toUpperCase();

        if (
            !e &&
            d < 0
        ) {
            e = "D";
        }

        return {
            valor: Math.abs(d),
            indicador: e,
            indice: c.index,
            texto: c[0]
        };
    }

    function criarMovimentacaoExtrato(a) {
        const b =
            a.metadata ||
            extrairMetadadosLeitura(
                a.original || ""
            );

        const c = removerMetadadosLeitura(
            a.historico || ""
        )
            .replace(/\s+/g, " ")
            .trim();

        return {
            linha: a.numeroLinha,
            data: a.data,
            dataTexto: formatarDataBrasileira(
                a.data
            ),
            competencia: obterCompetenciaData(
                a.data
            ),
            documento: String(
                a.documento || ""
            ).trim(),
            historico: c,
            historicoNormalizado: normalizarTexto(c),
            valor: Math.abs(
                Number(a.valor || 0)
            ),
            indicador: String(
                a.indicador || ""
            ).toUpperCase(),
            original: String(
                a.original || ""
            ),
            banco: b.banco || "",
            arquivo: b.arquivo || "",
            idOrigem: b.id || "",
            decisaoLeitura: String(
                b.decisao || ""
            ).toUpperCase(),
            considerado: false,
            motivo: ""
        };
    }

    function extrairMetadadosLeitura(a) {
        const b = String(a || "");

        function c(a) {
            const regex = new RegExp(
                "\\[" +
                a +
                "\\s*:\\s*([^\\]]+)\\]",
                "i"
            );

            const d = b.match(regex);

            return d
                ? String(d[1] || "").trim()
                : "";
        }

        return {
            id: c("ID"),
            banco: c("BANCO"),
            arquivo: c("ARQUIVO"),
            decisao: c("DECISAO")
        };
    }

    function removerMetadadosLeitura(a) {
        return String(a || "")
            .replace(
                /\[(?:ID|BANCO|ARQUIVO|DECISAO)\s*:[^\]]+\]/gi,
                " "
            )
            .replace(/\s+/g, " ")
            .trim();
    }

    function decodificarTexto(a) {
        return String(a || "")
            .replace(/&#x20;/gi, " ")
            .replace(/&#32;/gi, " ")
            .replace(/&#x9;/gi, "\t")
            .replace(/&#9;/gi, "\t")
            .replace(/&nbsp;/gi, " ")
            .replace(/\\\*/g, "*");
    }

    function linhaInformativa(a) {
        const b = String(a || "").trim();

        if (!b) {
            return true;
        }

        return REGRAS_INFORMATIVAS.some(
            a => a.test(b)
        );
    }

    function ehHistoricoTransacional(a) {
        if (localizarRegraExclusao(a)) {
            return true;
        }

        if (
            PADROES_CREDITO_VALIDO.some(
                b => b.test(a)
            )
        ) {
            return true;
        }

        return /\b(PIX|TED|DOC|TRANSF|TRANSFERENCIA|DEPOSITO|PAGAMENTO|COMPRA|SAQUE|DEBITO|CREDITO|CRED|RECEBIMENTO|ANTECIPACAO|ESTORNO|RESGATE|APLICACAO|EMPRESTIMO|FINANCIAMENTO|JUROS|TARIFA|IOF)\b/.test(a);
    }

    function separarDocumentoHistorico(a) {
        const b = String(a || "")
            .replace(/\s+/g, " ")
            .trim();

        if (!b) {
            return {
                documento: "",
                historico: ""
            };
        }

        const c = b.match(
            /^([A-Z0-9./-]{1,30})\s+(.+)$/i
        );

        if (
            c &&
            (
                /\d/.test(c[1]) ||
                /^(PIX|MASTERCARD|VISA|ELO|IOF)$/i.test(
                    c[1]
                )
            )
        ) {
            return {
                documento: c[1],
                historico: c[2]
            };
        }

        return {
            documento: "",
            historico: b
        };
    }

    function classificarMovimentacoes() {
        movimentacoesConsideradas = [];
        movimentacoesExcluidas = [];

        movimentacoesExtrato.forEach(a => {
            const b = classificarMovimentacao(a);

            a.considerado = b.considerado;
            a.motivo = b.motivo;

            (
                a.considerado
                    ? movimentacoesConsideradas
                    : movimentacoesExcluidas
            ).push(a);
        });
    }

    function classificarMovimentacao(a) {
        const b = a.historicoNormalizado;

        const c = String(
            a.decisaoLeitura || ""
        ).toUpperCase();

        if (linhaInformativa(b)) {
            return {
                considerado: false,
                motivo: "Linha informativa / saldo"
            };
        }

        if (a.indicador === "D") {
            return {
                considerado: false,
                motivo: "Débito"
            };
        }

        if (a.indicador === "*") {
            return {
                considerado: false,
                motivo: "Saldo ou valor bloqueado"
            };
        }

        if (c === "EXCLUIR") {
            return {
                considerado: false,
                motivo: "Excluído na conferência da leitura"
            };
        }

        if (c === "DUVIDA") {
            return {
                considerado: false,
                motivo: "Pendente de conferência"
            };
        }

        if (c === "INCLUIR") {
            return {
                considerado: true,
                motivo: "Crédito confirmado na conferência"
            };
        }

        const d = localizarRegraExclusao(b);

        if (
            d &&
            !historicosIncluidosManualmente.has(b)
        ) {
            return {
                considerado: false,
                motivo:
                    d.rotulo +
                    " - " +
                    d.motivo
            };
        }

        if (
            historicosExcluidosManualmente.has(b)
        ) {
            return {
                considerado: false,
                motivo: "Exclusão manual"
            };
        }

        if (a.indicador === "C") {
            return {
                considerado: true,
                motivo: "Crédito do extrato"
            };
        }

        if (
            PADROES_CREDITO_VALIDO.some(
                a => a.test(b)
            )
        ) {
            return {
                considerado: true,
                motivo: "Crédito identificado pelo histórico"
            };
        }

        return {
            considerado: false,
            motivo: "Sem identificação segura como crédito"
        };
    }

    function localizarRegraExclusao(a) {
        return REGRAS_EXCLUSAO_MOVIMENTACAO.find(
            b => b.testar(a)
        ) || null;
    }

    function removerDuplicidadesParser(a) {
        const b = [];
        const c = new Set();

        a.forEach(a => {
            const d = String(
                a.idOrigem || ""
            ).trim();

            if (d) {
                if (c.has(d)) {
                    return;
                }

                c.add(d);
            }

            b.push(a);
        });

        return b;
    }

    function identificarPeriodoExtrato() {
        const a = movimentacoesExtrato
            .map(a => a.data)
            .filter(a =>
                a instanceof Date &&
                !Number.isNaN(a.getTime())
            );

        if (!a.length) {
            return;
        }

        primeiraDataExtrato = new Date(
            Math.min(
                ...a.map(a => a.getTime())
            )
        );

        ultimaDataExtrato = new Date(
            Math.max(
                ...a.map(a => a.getTime())
            )
        );

        primeiraDataExtratoAutomatica =
            new Date(primeiraDataExtrato);

        ultimaDataExtratoAutomatica =
            new Date(ultimaDataExtrato);

        if (
            competenciasDocumentadasExternas.length
        ) {
            mesesDetectadosAutomaticos =
                competenciasDocumentadasExternas.length;
        } else {
            const b = Array.from(
                new Set(
                    movimentacoesExtrato
                        .map(a => a.competencia)
                        .filter(Boolean)
                )
            );

            mesesDetectadosAutomaticos =
                b.length ||
                calcularMesesInclusivos(
                    primeiraDataExtrato,
                    ultimaDataExtrato
                );
        }

        definirValorCampo(
            "primeiraDataMovimentacao",
            formatarDataBrasileira(
                primeiraDataExtrato
            )
        );

        definirValorCampo(
            "ultimaDataMovimentacao",
            formatarDataBrasileira(
                ultimaDataExtrato
            )
        );

        definirValorCampo(
            "mesesDetectadosMovimentacao",
            String(mesesDetectadosAutomaticos)
        );

        definirValorCampo(
            "mesesConsideradosMovimentacao",
            String(mesesDetectadosAutomaticos)
        );
    }

    function aplicarPeriodoInformadoPeloUsuario() {
        const a = converterDataExtrato(
            obterValorCampo(
                "primeiraDataMovimentacao"
            )
        );

        const b = converterDataExtrato(
            obterValorCampo(
                "ultimaDataMovimentacao"
            )
        );

        if (a) {
            primeiraDataExtrato = a;
        }

        if (b) {
            ultimaDataExtrato = b;
        }
    }

    function restaurarPeriodoAutomatico() {
        if (
            !primeiraDataExtratoAutomatica ||
            !ultimaDataExtratoAutomatica
        ) {
            return;
        }

        primeiraDataExtrato = new Date(
            primeiraDataExtratoAutomatica
        );

        ultimaDataExtrato = new Date(
            ultimaDataExtratoAutomatica
        );

        definirValorCampo(
            "primeiraDataMovimentacao",
            formatarDataBrasileira(
                primeiraDataExtrato
            )
        );

        definirValorCampo(
            "ultimaDataMovimentacao",
            formatarDataBrasileira(
                ultimaDataExtrato
            )
        );

        definirValorCampo(
            "mesesDetectadosMovimentacao",
            String(mesesDetectadosAutomaticos)
        );

        definirValorCampo(
            "mesesConsideradosMovimentacao",
            String(mesesDetectadosAutomaticos)
        );
    }

    function calcularResultadosMovimentacao() {
        aplicarPeriodoInformadoPeloUsuario();

        const a = movimentacoesConsideradas.filter(
            a =>
                !primeiraDataExtrato ||
                !ultimaDataExtrato ||
                (
                    a.data >= primeiraDataExtrato &&
                    a.data <= ultimaDataExtrato
                )
        );

        const b = a.reduce(
            (a, b) => a + b.valor,
            0
        );

        let c = Number(
            obterValorCampo(
                "mesesConsideradosMovimentacao"
            )
        );

        if (
            !Number.isFinite(c) ||
            c <= 0
        ) {
            c =
                mesesDetectadosAutomaticos ||
                1;
        }

        c = Math.max(
            1,
            Math.trunc(c)
        );

        const d = b / c;

        definirTexto(
            "resultadoMediaMovimentacao",
            formatarMoeda(d)
        );

        definirTexto(
            "resultadoTotalMovimentacao",
            formatarMoeda(b)
        );

        definirTexto(
            "resultadoMesesMovimentacao",
            String(c)
        );

        definirTexto(
            "resultadoQtdConsiderados",
            String(a.length)
        );

        definirTexto(
            "resultadoQtdExcluidos",
            String(
                movimentacoesExcluidas.length
            )
        );

        return {
            total: b,
            media: d,
            meses: c,
            consideradas: a
        };
    }

    function renderizarResultadosMovimentacao() {
        const a = calcularResultadosMovimentacao();

        renderizarResumoMensal(
            a.consideradas
        );

        renderizarTabelaMovimentacoes(
            "tabelaMovimentacoesConsideradas",
            a.consideradas,
            true
        );

        renderizarTabelaMovimentacoes(
            "tabelaMovimentacoesExcluidas",
            movimentacoesExcluidas,
            false
        );
    }

    function renderizarResumoMensal(a) {
        const b = obterTbody(
            "tabelaResumoMensalMovimentacao"
        );

        if (!b) return;

        b.innerHTML = "";

        const c = new Map();

        a.forEach(a => {
            if (!c.has(a.competencia)) {
                c.set(
                    a.competencia,
                    {
                        quantidade: 0,
                        total: 0
                    }
                );
            }

            const b = c.get(
                a.competencia
            );

            b.quantidade++;
            b.total += a.valor;
        });

        const d =
            competenciasDocumentadasExternas.length
                ? competenciasDocumentadasExternas.slice()
                : Array.from(c.keys()).sort();

        if (!d.length) {
            inserirVazio(
                b,
                3,
                "Nenhum extrato processado."
            );

            return;
        }

        d.forEach(a => {
            const dados =
                c.get(a) ||
                {
                    quantidade: 0,
                    total: 0
                };

            const e =
                document.createElement("tr");

            e.innerHTML =
                "<td>" +
                escapar(
                    formatarCompetencia(a)
                ) +
                "</td>" +
                "<td>" +
                dados.quantidade +
                "</td>" +
                "<td>" +
                escapar(
                    formatarMoeda(
                        dados.total
                    )
                ) +
                "</td>";

            b.appendChild(e);
        });
    }

    function renderizarTabelaMovimentacoes(a, b, c) {
        const d = obterTbody(a);

        if (!d) return;

        d.innerHTML = "";

        if (!b.length) {
            inserirVazio(
                d,
                5,
                c
                    ? "Nenhum crédito considerado."
                    : "Nenhuma movimentação desconsiderada."
            );

            return;
        }

        b
            .slice()
            .sort(
                (a, b) =>
                    a.data - b.data
            )
            .forEach(a => {
                const b =
                    document.createElement("tr");

                if (c) {
                    const c = [
                        a.banco,
                        a.arquivo
                    ]
                        .filter(Boolean)
                        .join(" · ");

                    b.innerHTML =
                        "<td>" +
                        escapar(a.dataTexto) +
                        "</td>" +
                        "<td>" +
                        escapar(
                            a.documento || "-"
                        ) +
                        "</td>" +
                        "<td>" +
                        escapar(a.historico) +
                        "</td>" +
                        "<td>" +
                        escapar(
                            formatarMoeda(
                                a.valor
                            )
                        ) +
                        "</td>" +
                        "<td>" +
                        escapar(
                            c ||
                            a.motivo ||
                            "-"
                        ) +
                        "</td>";
                } else {
                    b.innerHTML =
                        "<td>" +
                        escapar(a.dataTexto) +
                        "</td>" +
                        "<td>" +
                        escapar(
                            a.documento || "-"
                        ) +
                        "</td>" +
                        "<td>" +
                        escapar(a.historico) +
                        "</td>" +
                        "<td>" +
                        escapar(
                            formatarMoeda(
                                a.valor
                            )
                        ) +
                        "</td>" +
                        "<td>" +
                        escapar(
                            a.motivo || "-"
                        ) +
                        "</td>";
                }

                d.appendChild(b);
            });
    }

    function renderizarHistoricosExtrato() {
        const a = document.getElementById(
            "listaRegrasMovimentacao"
        );

        const b = document.getElementById(
            "resumoRegrasMovimentacao"
        );

        if (!a) return;

        a.innerHTML = "";

        if (!movimentacoesExtrato.length) {
            a.innerHTML =
                '<div class="sem-dados">Nenhum histórico identificado.</div>';

            if (b) {
                b.textContent =
                    "Processe um extrato para visualizar os históricos encontrados.";
            }

            return;
        }

        const c = new Map();

        movimentacoesExtrato.forEach(a => {
            const b =
                a.historicoNormalizado;

            if (
                !b ||
                linhaInformativa(b)
            ) {
                return;
            }

            if (!c.has(b)) {
                c.set(
                    b,
                    {
                        normalizado: b,
                        historico: a.historico,
                        quantidade: 0,
                        total: 0
                    }
                );
            }

            const d = c.get(b);

            d.quantidade++;
            d.total += a.valor;
        });

        Array.from(c.values())
            .sort(
                (a, b) =>
                    a.historico.localeCompare(
                        b.historico,
                        "pt-BR"
                    )
            )
            .forEach(item => {
                const regra =
                    localizarRegraExclusao(
                        item.normalizado
                    );

                const excluido =
                    historicosExcluidosManualmente.has(
                        item.normalizado
                    ) ||
                    (
                        regra &&
                        !historicosIncluidosManualmente.has(
                            item.normalizado
                        )
                    );

                const label =
                    document.createElement("label");

                label.className =
                    "regra-movimentacao-item";

                const checkbox =
                    document.createElement("input");

                checkbox.type = "checkbox";
                checkbox.checked = !!excluido;

                const span =
                    document.createElement("span");

                span.innerHTML =
                    "<strong>" +
                    escapar(
                        item.historico
                    ) +
                    "</strong>" +
                    "<small>" +
                    item.quantidade +
                    " lançamento(s) · " +
                    escapar(
                        formatarMoeda(
                            item.total
                        )
                    ) +
                    (
                        regra
                            ? " · Exclusão automática: " +
                            escapar(
                                regra.rotulo
                            )
                            : ""
                    ) +
                    "</small>";

                checkbox.addEventListener(
                    "change",
                    () => {
                        if (
                            checkbox.checked
                        ) {
                            historicosExcluidosManualmente.add(
                                item.normalizado
                            );

                            historicosIncluidosManualmente.delete(
                                item.normalizado
                            );
                        } else {
                            historicosExcluidosManualmente.delete(
                                item.normalizado
                            );

                            historicosIncluidosManualmente.add(
                                item.normalizado
                            );
                        }

                        classificarMovimentacoes();
                        renderizarResultadosMovimentacao();
                    }
                );

                label.appendChild(
                    checkbox
                );

                label.appendChild(
                    span
                );

                a.appendChild(
                    label
                );
            });

        if (b) {
            b.textContent =
                c.size +
                " histórico(s) diferente(s) identificado(s). Marque para desconsiderar.";
        }
    }

    function limparMediaMovimentacao() {
        resetarEstadoMovimentacao();

        [
            "textoExtratoMovimentacao",
            "primeiraDataMovimentacao",
            "ultimaDataMovimentacao",
            "mesesDetectadosMovimentacao",
            "mesesConsideradosMovimentacao"
        ].forEach(a =>
            definirValorCampo(
                a,
                ""
            )
        );

        limparResultadosMovimentacao();
        renderizarHistoricosExtrato();
        ocultarResultadosProcessamento();
    }

    function limparResultadosMovimentacao() {
        definirTexto(
            "resultadoMediaMovimentacao",
            "R$ 0,00"
        );

        definirTexto(
            "resultadoTotalMovimentacao",
            "R$ 0,00"
        );

        definirTexto(
            "resultadoMesesMovimentacao",
            "0"
        );

        definirTexto(
            "resultadoQtdConsiderados",
            "0"
        );

        definirTexto(
            "resultadoQtdExcluidos",
            "0"
        );

        const a = obterTbody(
            "tabelaResumoMensalMovimentacao"
        );

        const b = obterTbody(
            "tabelaMovimentacoesConsideradas"
        );

        const c = obterTbody(
            "tabelaMovimentacoesExcluidas"
        );

        if (a) {
            a.innerHTML =
                '<tr><td colspan="3" class="sem-dados">Nenhum extrato processado.</td></tr>';
        }

        if (b) {
            b.innerHTML =
                '<tr><td colspan="5" class="sem-dados">Nenhum extrato processado.</td></tr>';
        }

        if (c) {
            c.innerHTML =
                '<tr><td colspan="5" class="sem-dados">Nenhum extrato processado.</td></tr>';
        }
    }

    function extrairDataInicial(a) {
        const b = String(a || "").match(
            /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})(?=\s|$)/
        );

        if (!b) {
            return null;
        }

        const c = criarData(
            Number(b[1]),
            Number(b[2]),
            normalizarAno(
                Number(b[3]),
                b[3].length
            )
        );

        return c
            ? {
                data: c,
                texto: b[0]
            }
            : null;
    }

    function converterDataExtrato(a) {
        const b = String(a || "")
            .trim()
            .match(
                /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/
            );

        return b
            ? criarData(
                Number(b[1]),
                Number(b[2]),
                normalizarAno(
                    Number(b[3]),
                    b[3].length
                )
            )
            : null;
    }

    function criarData(a, b, c) {
        if (
            !Number.isInteger(a) ||
            !Number.isInteger(b) ||
            !Number.isInteger(c) ||
            a < 1 ||
            a > 31 ||
            b < 1 ||
            b > 12 ||
            c < 1900 ||
            c > 2200
        ) {
            return null;
        }

        const d = new Date(
            c,
            b - 1,
            a,
            12
        );

        return (
            d.getFullYear() === c &&
            d.getMonth() === b - 1 &&
            d.getDate() === a
        )
            ? d
            : null;
    }

    function normalizarAno(a, b) {
        return b === 2
            ? (
                a >= 70
                    ? 1900 + a
                    : 2000 + a
            )
            : a;
    }

    function formatarDataBrasileira(a) {
        return (
            a instanceof Date &&
            !Number.isNaN(
                a.getTime()
            )
        )
            ? String(
                a.getDate()
            ).padStart(
                2,
                "0"
            ) +
            "/" +
            String(
                a.getMonth() + 1
            ).padStart(
                2,
                "0"
            ) +
            "/" +
            a.getFullYear()
            : "";
    }

    function obterCompetenciaData(a) {
        return (
            a.getFullYear() +
            "-" +
            String(
                a.getMonth() + 1
            ).padStart(
                2,
                "0"
            )
        );
    }

    function calcularMesesInclusivos(a, b) {
        return (
            !a ||
            !b
        )
            ? 0
            : (
                b.getFullYear() -
                a.getFullYear()
            ) *
            12 +
            (
                b.getMonth() -
                a.getMonth()
            ) +
            1;
    }

    function aplicarMascaraDataCampo(a) {
        const b = a.target;

        let c = String(
            b.value || ""
        )
            .replace(/\D/g, "")
            .slice(0, 8);

        if (c.length > 4) {
            c =
                c.slice(0, 2) +
                "/" +
                c.slice(2, 4) +
                "/" +
                c.slice(4);
        } else if (c.length > 2) {
            c =
                c.slice(0, 2) +
                "/" +
                c.slice(2);
        }

        b.value = c;
    }

    function normalizarCampoMeses(a) {
        const b = Number(
            a.value
        );

        a.value =
            Number.isFinite(b) &&
                b >= 1
                ? String(
                    Math.trunc(b)
                )
                : "";
    }

    function converterValorBrasileiro(a) {
        let b = String(a || "")
            .replace(/R\$/gi, "")
            .replace(/\s+/g, "")
            .trim();

        if (!b) {
            return NaN;
        }

        const c =
            b.startsWith("-");

        b = b
            .replace(/^[+-]/, "")
            .replace(/\./g, "")
            .replace(",", ".")
            .replace(/[^\d.]/g, "");

        const d = Number(b);

        return Number.isFinite(d)
            ? (
                c
                    ? -d
                    : d
            )
            : NaN;
    }

    function normalizarTexto(a) {
        return decodificarTexto(a)
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .toUpperCase()
            .replace(
                /\u00a0/g,
                " "
            )
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
            .replace(
                /\s+/g,
                " "
            )
            .trim();
    }

    function formatarCompetencia(a) {
        const b = String(
            a || ""
        ).split("-");

        return b.length === 2
            ? b[1] + "/" + b[0]
            : a;
    }

    function formatarMoeda(a) {
        return Number(
            a || 0
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

    function definirTexto(a, b) {
        const c =
            document.getElementById(a);

        if (c) {
            c.textContent = b;
        }
    }

    function definirValorCampo(a, b) {
        const c =
            document.getElementById(a);

        if (c) {
            c.value = b;
        }
    }

    function obterValorCampo(a) {
        const b =
            document.getElementById(a);

        return b
            ? String(
                b.value || ""
            )
            : "";
    }

    function obterTbody(a) {
        const b =
            document.getElementById(a);

        return b
            ? (
                b.tagName === "TBODY"
                    ? b
                    : b.querySelector(
                        "tbody"
                    )
            )
            : null;
    }

    function inserirVazio(a, b, c) {
        const d =
            document.createElement("tr");

        d.innerHTML =
            '<td colspan="' +
            b +
            '" class="sem-dados">' +
            escapar(c) +
            "</td>";

        a.appendChild(d);
    }

    function escapar(a) {
        return String(a || "")
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

    window.MediaMovimentacao = {
        processar: processarMovimentacao,

        processarTexto: (a, b) =>
            processarTextoMovimentacao(
                String(a || ""),
                b || {}
            ),

        recalcular: () => {
            if (!movimentacoesExtrato.length) {
                return;
            }

            aplicarPeriodoInformadoPeloUsuario();
            classificarMovimentacoes();
            renderizarHistoricosExtrato();
            renderizarResultadosMovimentacao();
            mostrarResultadosProcessamento();
        },

        obterMovimentacoes: () =>
            movimentacoesExtrato.slice(),

        obterConsideradas: () =>
            movimentacoesConsideradas.slice(),

        obterExcluidas: () =>
            movimentacoesExcluidas.slice(),

        mostrarResultados:
            mostrarResultadosProcessamento,

        ocultarResultados:
            ocultarResultadosProcessamento,

        selecionarModo:
            selecionarModoEntradaMovimentacao,

        voltarSelecaoModo:
            voltarSelecaoModoMovimentacao,

        definirMesesConsiderados: function (a) {
            const b = Number(a);

            if (
                !Number.isFinite(b) ||
                b < 1
            ) {
                return;
            }

            const c =
                Math.trunc(b);

            mesesDetectadosAutomaticos = c;

            definirValorCampo(
                "mesesDetectadosMovimentacao",
                String(c)
            );

            definirValorCampo(
                "mesesConsideradosMovimentacao",
                String(c)
            );
        },

        definirCompetenciasDocumentadas: function (a) {
            competenciasDocumentadasExternas =
                Array.from(
                    new Set(
                        (a || []).filter(
                            Boolean
                        )
                    )
                ).sort();

            if (
                competenciasDocumentadasExternas.length
            ) {
                this.definirMesesConsiderados(
                    competenciasDocumentadasExternas.length
                );
            }
        },

        definirPeriodo: (a, b) => {
            if (
                a instanceof Date &&
                !Number.isNaN(
                    a.getTime()
                )
            ) {
                primeiraDataExtrato =
                    new Date(a);

                primeiraDataExtratoAutomatica =
                    new Date(a);

                definirValorCampo(
                    "primeiraDataMovimentacao",
                    formatarDataBrasileira(a)
                );
            }

            if (
                b instanceof Date &&
                !Number.isNaN(
                    b.getTime()
                )
            ) {
                ultimaDataExtrato =
                    new Date(b);

                ultimaDataExtratoAutomatica =
                    new Date(b);

                definirValorCampo(
                    "ultimaDataMovimentacao",
                    formatarDataBrasileira(b)
                );
            }
        },

        obterResumo: () => {
            const a =
                calcularResultadosMovimentacao();

            return {
                total: a.total,
                media: a.media,
                meses: a.meses,
                quantidadeConsideradas:
                    a.consideradas.length,
                quantidadeExcluidas:
                    movimentacoesExcluidas.length,
                primeiraData:
                    primeiraDataExtrato,
                ultimaData:
                    ultimaDataExtrato,
                competenciasDocumentadas:
                    competenciasDocumentadasExternas.slice()
            };
        }
    };

})();