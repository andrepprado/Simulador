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
        /\bSALDO ANTERIOR\b/,
        /\bSALDO BLOQUEADO ANTERIOR\b/,
        /\bSALDO DO DIA\b/,
        /\bSALDO FINAL\b/,
        /\bSALDO DISPONIVEL\b/,
        /\bSALDO TOTAL\b/,
        /\bSALDO EM CONTA\b/,
        /\bSALDO EM CONTA CAPITAL\b/,
        /\bSALDO CONTA CAPITAL\b/,
        /\bSALDO BLOQUEADO\b/,
        /\bCHEQUE ESPECIAL CONTRATADO\b/,
        /\bLIMITE DE CHEQUE ESPECIAL\b/,
        /\bLIMITE CHEQUE ESPECIAL\b/,
        /\bLIMITE DISPONIVEL\b/,
        /\bJUROS VENCIDOS PROVISIONADOS\b/,
        /\bTARIFAS VENCIDAS PROVISIONADAS\b/,
        /\bJUROS VENCIDOS REMANESCENTES\b/,
        /\bTARIFAS VENCIDAS REMANESCENTES\b/,
        /\bENCARGOS VENCIDOS REMANESCENTES\b/,
        /\bENCARGOS A VENCER\b/,
        /\bPREVISAO IOF\b/,
        /\bPREVISAO JUROS\b/,
        /\bPREVISAO TARIFAS\b/,
        /\bOUTRAS INFORMACOES\b/,
        /\bVENCIMENTO CHEQUE ESPECIAL\b/,
        /\bTAXA CHEQUE ESPECIAL\b/,
        /\bCUSTO EFETIVO TOTAL\b/,
        /\bTOTAL DE CREDITOS\b/,
        /\bTOTAL CREDITOS\b/,
        /\bTOTAL DE DEBITOS\b/,
        /\bTOTAL DEBITOS\b/,
        /\bTOTAL MOVIMENTACAO\b/,
        /\bTOTAL MOVIMENTACOES\b/,
        /^RESUMO$/,
        /\bLANCAMENTOS FUTUROS\b/,
        /\bDATA DOCUMENTO HISTORICO VALOR\b/,
        /\bDATA HISTORICO VALOR\b/,
        /\bEXTRATO CONTA CORRENTE\b/,
        /\bEXTRATO DE CONTA\b/,
        /\bSISTEMA DE COOPERATIVAS DE CREDITO DO BRASIL\b/,
        /\bSISBR SISTEMA DE INFORMATICA DO SICOOB\b/,
        /\bEXTRATOS EMITIDOS ATE\b/,
        /\bOUVIDORIA\b/,
        /\bCENTRAL DE ATENDIMENTO\b/,
        /^SAC$/
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
            testar: h => /\b(CHEQUE ESPECIAL|LIMITE DE CREDITO|CREDITO ROTATIVO|LIMITE ROTATIVO|ADIANTAMENTO A DEPOSITANTE)\b/.test(h)
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
            testar: h => /\b(RDB|RDC|CDB|RESGATE|APLICACAO|INVESTIMENTO|FUNDO DE INVESTIMENTO|RESGATE AUTOMATICO|REMUNERACAO APLICACAO AUTOMATICA)\b/.test(h)
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
        },
        {
            id: "liberacao-dinheiro",
            rotulo: "LIBERAÇÃO DE DINHEIRO",
            motivo: "A origem da liberação precisa ser confirmada antes de ser tratada como renda.",
            testar: h => /\b(LIBERACAO DE DINHEIRO|DINHEIRO LIBERADO)\b/.test(h)
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
        /\bDEPOSITO RECEBIDO\b/,
        /\bRECEBIMENTO\b/,
        /\bPAGAMENTO RECEBIDO\b/,
        /\bCOBRANCA RECEBIDA\b/,
        /\bLIQUIDACAO COBRANCA\b/,
        /\bCRED LIQUIDACAO COBRANCA\b/,
        /\bOUTROS CREDITOS\b/,
        /\bCREDITO EM CONTA\b/,
        /\bSALARIO\b/,
        /\bPROVENTO\b/,
        /\bDINHEIRO RECEBIDO\b/,
        /\bENTRADA DE DINHEIRO\b/,
        /\bCREDITO RECEBIDO\b/
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
            btnArquivo.addEventListener("click", () => selecionarModoEntradaMovimentacao("arquivo"));
        }

        if (btnTexto) {
            btnTexto.addEventListener("click", () => selecionarModoEntradaMovimentacao("texto"));
        }

        document.querySelectorAll(".btnTrocarModoMovimentacao").forEach(btn => {
            btn.addEventListener("click", voltarSelecaoModoMovimentacao);
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

        window.scrollTo({ top: 0, behavior: "smooth" });
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
            status.innerHTML = "<strong>Selecione uma forma de entrada</strong><span>Você poderá trocar de opção a qualquer momento.</span>";
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function mostrarResultadosProcessamento() {
        document.querySelectorAll(".resultado-processamento-movimentacao").forEach(el => {
            el.hidden = false;
        });
    }

    function ocultarResultadosProcessamento() {
        document.querySelectorAll(".resultado-processamento-movimentacao").forEach(el => {
            el.hidden = true;
        });
    }

    function configurarEventosMediaMovimentacao() {
        const btnProcessar = document.getElementById("btnProcessarMovimentacao");
        const btnLimpar = document.getElementById("btnLimparMovimentacao");
        const btnRecalcular = document.getElementById("btnRecalcularMovimentacao");
        const btnRestaurar = document.getElementById("btnRestaurarPeriodoMovimentacao");

        if (btnProcessar) btnProcessar.addEventListener("click", processarMovimentacao);
        if (btnLimpar) btnLimpar.addEventListener("click", limparMediaMovimentacao);

        if (btnRecalcular) {
            btnRecalcular.addEventListener("click", () => {
                if (!movimentacoesExtrato.length) return;

                aplicarPeriodoInformadoPeloUsuario();
                classificarMovimentacoes();
                renderizarHistoricosExtrato();
                renderizarResultadosMovimentacao();
            });
        }

        if (btnRestaurar) {
            btnRestaurar.addEventListener("click", () => {
                restaurarPeriodoAutomatico();

                if (!movimentacoesExtrato.length) return;

                classificarMovimentacoes();
                renderizarHistoricosExtrato();
                renderizarResultadosMovimentacao();
            });
        }

        ["primeiraDataMovimentacao", "ultimaDataMovimentacao"].forEach(id => {
            const campo = document.getElementById(id);
            if (!campo) return;

            campo.addEventListener("input", aplicarMascaraDataCampo);

            campo.addEventListener("blur", () => {
                if (!movimentacoesExtrato.length) return;

                aplicarPeriodoInformadoPeloUsuario();
                renderizarResultadosMovimentacao();
            });
        });

        ["mesesDetectadosMovimentacao", "mesesConsideradosMovimentacao"].forEach(id => {
            const campo = document.getElementById(id);
            if (!campo) return;

            campo.addEventListener("blur", () => {
                normalizarCampoMeses(campo);

                if (movimentacoesExtrato.length) {
                    renderizarResultadosMovimentacao();
                }
            });
        });
    }

    function processarMovimentacao() {
        const campo = document.getElementById("textoExtratoMovimentacao");

        if (!campo) return false;

        const texto = String(campo.value || "").trim();

        if (!texto) {
            alert("Cole o extrato no campo de texto.");
            return false;
        }

        return processarTextoMovimentacao(texto);
    }

    function processarTextoMovimentacao(texto, opcoes = {}) {
        resetarEstadoMovimentacao();

        if (Array.isArray(opcoes.competenciasDocumentadas)) {
            competenciasDocumentadasExternas = normalizarCompetencias(
                opcoes.competenciasDocumentadas
            );
        }

        movimentacoesExtrato = interpretarExtratoMovimentacao(texto);

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
            const el = document.getElementById("cardResultadoMovimentacao");

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

    function interpretarExtratoMovimentacao(texto) {
        const linhas = decodificarTexto(texto)
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .split("\n");

        const movimentacoes = [];
        let dataAtual = null;

        linhas.forEach((linhaOriginal, indice) => {
            const linha = String(linhaOriginal || "")
                .replace(/\u00a0/g, " ")
                .replace(/[ \t]+/g, " ")
                .trim();

            if (!linha) return;

            const consolidada = interpretarLinhaConsolidada(
                linha,
                indice + 1
            );

            if (consolidada) {
                movimentacoes.push(consolidada);
                dataAtual = consolidada.data;
                return;
            }

            const dataInicial = extrairDataInicial(linha);

            if (dataInicial) {
                dataAtual = dataInicial.data;
            }

            if (linhaInformativa(normalizarTexto(linha))) {
                return;
            }

            const bruto = interpretarLinhaExtratoBruto(
                linha,
                dataAtual,
                indice + 1,
                !!dataInicial
            );

            if (bruto) {
                movimentacoes.push(bruto);
            }
        });

        return removerDuplicidadesParser(movimentacoes);
    }

    function interpretarLinhaConsolidada(linha, numeroLinha) {
        if (!linha.includes("|")) {
            return null;
        }

        const partes = linha
            .split("|")
            .map(p => String(p || "").trim());

        if (partes.length < 3) {
            return null;
        }

        const data = converterDataExtrato(partes[0]);

        if (!data) {
            return null;
        }

        const valorInfo = extrairValorFinal(
            partes[partes.length - 1]
        );

        if (!valorInfo) {
            return null;
        }

        const meio = partes
            .slice(1, -1)
            .join(" ");

        const metadata = extrairMetadadosLeitura(meio);

        const historico = removerMetadadosLeitura(meio)
            .replace(/^MOV\d+\s*\*/i, "")
            .trim();

        if (!historico) {
            return null;
        }

        if (linhaInformativa(normalizarTexto(historico))) {
            return null;
        }

        return criarMovimentacaoExtrato({
            numeroLinha,
            data,
            documento: "",
            historico,
            valor: valorInfo.valor,
            indicador: valorInfo.indicador,
            original: linha,
            metadata
        });
    }

    function interpretarLinhaExtratoBruto(
        linha,
        dataAtual,
        numeroLinha,
        iniciouComData
    ) {
        if (!dataAtual) {
            return null;
        }

        let restante = linha;

        const dataNoInicio = restante.match(
            /^(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})(?=\s|$)/
        );

        if (dataNoInicio) {
            restante = restante
                .substring(dataNoInicio[0].length)
                .trim();
        }

        const valorInfo = extrairValorFinal(restante);

        if (!valorInfo) {
            return null;
        }

        const textoAntesValor = restante
            .substring(0, valorInfo.indice)
            .replace(/[|]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        if (!textoAntesValor) {
            return null;
        }

        const separado = separarDocumentoHistorico(textoAntesValor);

        const historicoNormalizado = normalizarTexto(
            separado.historico
        );

        if (
            !historicoNormalizado ||
            linhaInformativa(historicoNormalizado)
        ) {
            return null;
        }

        if (
            !iniciouComData &&
            !valorInfo.indicador &&
            !ehHistoricoTransacional(historicoNormalizado)
        ) {
            return null;
        }

        return criarMovimentacaoExtrato({
            numeroLinha,
            data: dataAtual,
            documento: separado.documento,
            historico: separado.historico,
            valor: valorInfo.valor,
            indicador: valorInfo.indicador,
            original: linha,
            metadata: {}
        });
    }

    function extrairValorFinal(texto) {
        const valor = String(texto || "").trim();

        const match = valor.match(
            /(?:R\$\s*)?([+-]?\s*(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2})\s*([CD*])?\s*$/i
        );

        if (!match) {
            return null;
        }

        const numero = converterValorBrasileiro(
            match[1]
        );

        if (!Number.isFinite(numero)) {
            return null;
        }

        let indicador = String(
            match[2] || ""
        ).toUpperCase();

        if (
            !indicador &&
            numero < 0
        ) {
            indicador = "D";
        }

        return {
            valor: Math.abs(numero),
            indicador,
            indice: match.index,
            texto: match[0]
        };
    }

    function criarMovimentacaoExtrato(dados) {
        const metadata =
            dados.metadata ||
            extrairMetadadosLeitura(
                dados.original || ""
            );

        const historico =
            removerMetadadosLeitura(
                dados.historico || ""
            )
                .replace(/\s+/g, " ")
                .trim();

        return {
            linha: dados.numeroLinha,
            data: dados.data,
            dataTexto: formatarDataBrasileira(
                dados.data
            ),
            competencia: obterCompetenciaData(
                dados.data
            ),
            documento: String(
                dados.documento || ""
            ).trim(),
            historico,
            historicoNormalizado: normalizarTexto(
                historico
            ),
            valor: Math.abs(
                Number(dados.valor || 0)
            ),
            indicador: String(
                dados.indicador || ""
            ).toUpperCase(),
            original: String(
                dados.original || ""
            ),
            banco: metadata.banco || "",
            arquivo: metadata.arquivo || "",
            idOrigem: metadata.id || "",
            decisaoLeitura: String(
                metadata.decisao || ""
            ).toUpperCase(),
            considerado: false,
            motivo: ""
        };
    }

    function extrairMetadadosLeitura(texto) {
        const origem = String(texto || "");

        function ler(chave) {
            const regex = new RegExp(
                "\\[" +
                chave +
                "\\s*:\\s*([^\\]]+)\\]",
                "i"
            );

            const match = origem.match(regex);

            return match
                ? String(
                    match[1] || ""
                ).trim()
                : "";
        }

        return {
            id: ler("ID"),
            banco: ler("BANCO"),
            arquivo: ler("ARQUIVO"),
            decisao: ler("DECISAO")
        };
    }

    function removerMetadadosLeitura(texto) {
        return String(texto || "")
            .replace(
                /\[(?:ID|BANCO|ARQUIVO|DECISAO)\s*:[^\]]+\]/gi,
                " "
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim();
    }

    function decodificarTexto(texto) {
        return String(texto || "")
            .replace(/&#x20;/gi, " ")
            .replace(/&#32;/gi, " ")
            .replace(/&#x9;/gi, "\t")
            .replace(/&#9;/gi, "\t")
            .replace(/&nbsp;/gi, " ")
            .replace(/\\\*/g, "*");
    }

    function linhaInformativa(textoNormalizado) {
        const texto = String(
            textoNormalizado || ""
        ).trim();

        if (!texto) {
            return true;
        }

        return REGRAS_INFORMATIVAS.some(
            regra => regra.test(texto)
        );
    }

    function ehHistoricoTransacional(textoNormalizado) {
        if (
            localizarRegraExclusao(
                textoNormalizado
            )
        ) {
            return true;
        }

        if (
            PADROES_CREDITO_VALIDO.some(
                regra =>
                    regra.test(
                        textoNormalizado
                    )
            )
        ) {
            return true;
        }

        return /\b(PIX|TED|DOC|TRANSF|TRANSFERENCIA|DEPOSITO|PAGAMENTO|COMPRA|SAQUE|DEBITO|CREDITO|CRED|RECEBIMENTO|ANTECIPACAO|ESTORNO|RESGATE|APLICACAO|EMPRESTIMO|FINANCIAMENTO|JUROS|TARIFA|IOF|SALARIO|PROVENTO)\b/.test(
            textoNormalizado
        );
    }

    function separarDocumentoHistorico(texto) {
        const valor = String(
            texto || ""
        )
            .replace(
                /\s+/g,
                " "
            )
            .trim();

        if (!valor) {
            return {
                documento: "",
                historico: ""
            };
        }

        const match = valor.match(
            /^([A-Z0-9./-]{1,30})\s+(.+)$/i
        );

        if (
            match &&
            (
                /\d/.test(
                    match[1]
                ) ||
                /^(PIX|MASTERCARD|VISA|ELO|IOF)$/i.test(
                    match[1]
                )
            )
        ) {
            return {
                documento: match[1],
                historico: match[2]
            };
        }

        return {
            documento: "",
            historico: valor
        };
    }

    function classificarMovimentacoes() {
        movimentacoesConsideradas = [];
        movimentacoesExcluidas = [];

        movimentacoesExtrato.forEach(
            movimentacao => {
                const classificacao =
                    classificarMovimentacao(
                        movimentacao
                    );

                movimentacao.considerado =
                    classificacao.considerado;

                movimentacao.motivo =
                    classificacao.motivo;

                if (
                    movimentacao.considerado
                ) {
                    movimentacoesConsideradas.push(
                        movimentacao
                    );
                } else {
                    movimentacoesExcluidas.push(
                        movimentacao
                    );
                }
            }
        );
    }

    function classificarMovimentacao(movimentacao) {
        const historico =
            movimentacao.historicoNormalizado;

        const decisao = String(
            movimentacao.decisaoLeitura ||
            ""
        ).toUpperCase();

        if (
            linhaInformativa(historico)
        ) {
            return {
                considerado: false,
                motivo: "Linha informativa / saldo"
            };
        }

        if (
            movimentacao.indicador ===
            "D"
        ) {
            return {
                considerado: false,
                motivo: "Débito"
            };
        }

        if (
            movimentacao.indicador ===
            "*"
        ) {
            return {
                considerado: false,
                motivo: "Saldo ou valor bloqueado"
            };
        }

        if (
            decisao === "EXCLUIR"
        ) {
            return {
                considerado: false,
                motivo: "Excluído na conferência da leitura"
            };
        }

        if (
            decisao === "DUVIDA"
        ) {
            return {
                considerado: false,
                motivo: "Pendente de conferência"
            };
        }

        const regraExclusao =
            localizarRegraExclusao(
                historico
            );

        if (
            regraExclusao &&
            !historicosIncluidosManualmente.has(
                historico
            )
        ) {
            return {
                considerado: false,
                motivo:
                    regraExclusao.rotulo +
                    " - " +
                    regraExclusao.motivo
            };
        }

        if (
            historicosExcluidosManualmente.has(
                historico
            )
        ) {
            return {
                considerado: false,
                motivo: "Exclusão manual"
            };
        }

        if (
            decisao === "INCLUIR"
        ) {
            return {
                considerado: true,
                motivo: "Crédito confirmado na conferência"
            };
        }

        if (
            historicosIncluidosManualmente.has(
                historico
            )
        ) {
            return {
                considerado: true,
                motivo: "Inclusão manual"
            };
        }

        if (
            movimentacao.indicador ===
            "C"
        ) {
            return {
                considerado: true,
                motivo: "Crédito confirmado pelo extrato"
            };
        }

        if (
            PADROES_CREDITO_VALIDO.some(
                regra =>
                    regra.test(
                        historico
                    )
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

    function localizarRegraExclusao(
        historicoNormalizado
    ) {
        return (
            REGRAS_EXCLUSAO_MOVIMENTACAO.find(
                regra =>
                    regra.testar(
                        historicoNormalizado
                    )
            ) ||
            null
        );
    }

    function removerDuplicidadesParser(
        movimentacoes
    ) {
        const resultado = [];
        const ids = new Set();
        const chavesLocais = new Set();

        movimentacoes.forEach(
            movimentacao => {
                const id = String(
                    movimentacao.idOrigem ||
                    ""
                ).trim();

                if (id) {
                    if (
                        ids.has(id)
                    ) {
                        return;
                    }

                    ids.add(id);
                }

                const chaveLocal = [
                    movimentacao.arquivo ||
                    "",
                    movimentacao.banco ||
                    "",
                    movimentacao.dataTexto ||
                    "",
                    movimentacao.documento ||
                    "",
                    movimentacao.historicoNormalizado ||
                    "",
                    Number(
                        movimentacao.valor ||
                        0
                    ).toFixed(2),
                    movimentacao.indicador ||
                    ""
                ].join("|");

                if (
                    chavesLocais.has(
                        chaveLocal
                    )
                ) {
                    return;
                }

                chavesLocais.add(
                    chaveLocal
                );

                resultado.push(
                    movimentacao
                );
            }
        );

        return resultado;
    }

    function identificarPeriodoExtrato() {
        const datas =
            movimentacoesExtrato
                .map(
                    m => m.data
                )
                .filter(
                    d =>
                        d instanceof Date &&
                        !Number.isNaN(
                            d.getTime()
                        )
                );

        if (!datas.length) {
            primeiraDataExtrato = null;
            ultimaDataExtrato = null;
            primeiraDataExtratoAutomatica = null;
            ultimaDataExtratoAutomatica = null;

            mesesDetectadosAutomaticos =
                competenciasDocumentadasExternas.length;

            atualizarCamposPeriodo();
            return;
        }

        primeiraDataExtrato =
            new Date(
                Math.min(
                    ...datas.map(
                        d =>
                            d.getTime()
                    )
                )
            );

        ultimaDataExtrato =
            new Date(
                Math.max(
                    ...datas.map(
                        d =>
                            d.getTime()
                    )
                )
            );

        primeiraDataExtratoAutomatica =
            new Date(
                primeiraDataExtrato
            );

        ultimaDataExtratoAutomatica =
            new Date(
                ultimaDataExtrato
            );

        if (
            competenciasDocumentadasExternas.length
        ) {
            mesesDetectadosAutomaticos =
                competenciasDocumentadasExternas.length;
        } else {
            const competencias =
                Array.from(
                    new Set(
                        movimentacoesExtrato
                            .map(
                                m =>
                                    m.competencia
                            )
                            .filter(Boolean)
                    )
                ).sort();

            mesesDetectadosAutomaticos =
                competencias.length ||
                calcularMesesInclusivos(
                    primeiraDataExtrato,
                    ultimaDataExtrato
                );
        }

        atualizarCamposPeriodo();
    }

    function atualizarCamposPeriodo() {
        definirValorCampo(
            "primeiraDataMovimentacao",
            primeiraDataExtrato
                ? formatarDataBrasileira(
                    primeiraDataExtrato
                )
                : ""
        );

        definirValorCampo(
            "ultimaDataMovimentacao",
            ultimaDataExtrato
                ? formatarDataBrasileira(
                    ultimaDataExtrato
                )
                : ""
        );

        definirValorCampo(
            "mesesDetectadosMovimentacao",
            mesesDetectadosAutomaticos >
                0
                ? String(
                    mesesDetectadosAutomaticos
                )
                : ""
        );

        definirValorCampo(
            "mesesConsideradosMovimentacao",
            mesesDetectadosAutomaticos >
                0
                ? String(
                    mesesDetectadosAutomaticos
                )
                : ""
        );
    }

    function aplicarPeriodoInformadoPeloUsuario() {
        const inicio =
            converterDataExtrato(
                obterValorCampo(
                    "primeiraDataMovimentacao"
                )
            );

        const fim =
            converterDataExtrato(
                obterValorCampo(
                    "ultimaDataMovimentacao"
                )
            );

        if (inicio) {
            primeiraDataExtrato =
                inicio;
        }

        if (fim) {
            ultimaDataExtrato =
                fim;
        }
    }

    function restaurarPeriodoAutomatico() {
        if (
            primeiraDataExtratoAutomatica
        ) {
            primeiraDataExtrato =
                new Date(
                    primeiraDataExtratoAutomatica
                );
        }

        if (
            ultimaDataExtratoAutomatica
        ) {
            ultimaDataExtrato =
                new Date(
                    ultimaDataExtratoAutomatica
                );
        }

        atualizarCamposPeriodo();
    }

    function calcularResultadosMovimentacao() {
        aplicarPeriodoInformadoPeloUsuario();

        const consideradasNoPeriodo =
            movimentacoesConsideradas.filter(
                m => {
                    if (!m.data) {
                        return false;
                    }

                    if (
                        primeiraDataExtrato &&
                        m.data <
                        primeiraDataExtrato
                    ) {
                        return false;
                    }

                    if (
                        ultimaDataExtrato &&
                        m.data >
                        ultimaDataExtrato
                    ) {
                        return false;
                    }

                    return true;
                }
            );

        const total =
            consideradasNoPeriodo.reduce(
                (
                    soma,
                    m
                ) =>
                    soma +
                    Number(
                        m.valor ||
                        0
                    ),
                0
            );

        let meses =
            Number(
                obterValorCampo(
                    "mesesConsideradosMovimentacao"
                )
            );

        if (
            !Number.isFinite(
                meses
            ) ||
            meses <= 0
        ) {
            meses =
                mesesDetectadosAutomaticos ||
                obterCompetenciasCalculo(
                    consideradasNoPeriodo
                ).length ||
                1;
        }

        meses =
            Math.max(
                1,
                Math.trunc(
                    meses
                )
            );

        const media =
            total /
            meses;

        definirTexto(
            "resultadoMediaMovimentacao",
            formatarMoeda(
                media
            )
        );

        definirTexto(
            "resultadoTotalMovimentacao",
            formatarMoeda(
                total
            )
        );

        definirTexto(
            "resultadoMesesMovimentacao",
            String(
                meses
            )
        );

        definirTexto(
            "resultadoQtdConsiderados",
            String(
                consideradasNoPeriodo.length
            )
        );

        definirTexto(
            "resultadoQtdExcluidos",
            String(
                movimentacoesExcluidas.length
            )
        );

        return {
            total,
            media,
            meses,
            consideradas:
                consideradasNoPeriodo
        };
    }

    function obterCompetenciasCalculo(
        consideradas
    ) {
        if (
            competenciasDocumentadasExternas.length
        ) {
            return competenciasDocumentadasExternas.slice();
        }

        return Array.from(
            new Set(
                (
                    consideradas ||
                    []
                )
                    .map(
                        m =>
                            m.competencia
                    )
                    .filter(Boolean)
            )
        ).sort();
    }

    function renderizarResultadosMovimentacao() {
        const resultado =
            calcularResultadosMovimentacao();

        renderizarResumoMensal(
            resultado.consideradas
        );

        renderizarTabelaMovimentacoes(
            "tabelaMovimentacoesConsideradas",
            resultado.consideradas,
            true
        );

        renderizarTabelaMovimentacoes(
            "tabelaMovimentacoesExcluidas",
            movimentacoesExcluidas,
            false
        );
    }

    function renderizarResumoMensal(
        consideradas
    ) {
        const tbody =
            obterTbody(
                "tabelaResumoMensalMovimentacao"
            );

        if (!tbody) return;

        tbody.innerHTML = "";

        const mapa =
            new Map();

        consideradas.forEach(
            m => {
                if (
                    !m.competencia
                ) {
                    return;
                }

                if (
                    !mapa.has(
                        m.competencia
                    )
                ) {
                    mapa.set(
                        m.competencia,
                        {
                            quantidade: 0,
                            total: 0
                        }
                    );
                }

                const dados =
                    mapa.get(
                        m.competencia
                    );

                dados.quantidade++;
                dados.total +=
                    Number(
                        m.valor ||
                        0
                    );
            }
        );

        const competencias =
            competenciasDocumentadasExternas.length
                ? competenciasDocumentadasExternas.slice()
                : Array.from(
                    mapa.keys()
                ).sort();

        if (
            !competencias.length
        ) {
            inserirVazio(
                tbody,
                3,
                "Nenhum extrato processado."
            );

            return;
        }

        competencias.forEach(
            competencia => {
                const dados =
                    mapa.get(
                        competencia
                    ) ||
                    {
                        quantidade: 0,
                        total: 0
                    };

                const tr =
                    document.createElement(
                        "tr"
                    );

                tr.innerHTML =
                    "<td>" +
                    escapar(
                        formatarCompetencia(
                            competencia
                        )
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

                tbody.appendChild(
                    tr
                );
            }
        );
    }

    function renderizarTabelaMovimentacoes(
        idTabela,
        movimentacoes,
        consideradas
    ) {
        const tbody =
            obterTbody(
                idTabela
            );

        if (!tbody) return;

        tbody.innerHTML = "";

        if (
            !movimentacoes.length
        ) {
            inserirVazio(
                tbody,
                5,
                consideradas
                    ? "Nenhum crédito considerado."
                    : "Nenhuma movimentação desconsiderada."
            );

            return;
        }

        movimentacoes
            .slice()
            .sort(
                (
                    a,
                    b
                ) =>
                    a.data -
                    b.data
            )
            .forEach(
                m => {
                    const tr =
                        document.createElement(
                            "tr"
                        );

                    if (
                        consideradas
                    ) {
                        const identificacao =
                            [
                                m.banco,
                                m.arquivo
                            ]
                                .filter(
                                    Boolean
                                )
                                .join(
                                    " · "
                                );

                        tr.innerHTML =
                            "<td>" +
                            escapar(
                                m.dataTexto
                            ) +
                            "</td>" +
                            "<td>" +
                            escapar(
                                m.documento ||
                                "-"
                            ) +
                            "</td>" +
                            "<td>" +
                            escapar(
                                m.historico
                            ) +
                            "</td>" +
                            "<td>" +
                            escapar(
                                formatarMoeda(
                                    m.valor
                                )
                            ) +
                            "</td>" +
                            "<td>" +
                            escapar(
                                identificacao ||
                                m.motivo ||
                                "-"
                            ) +
                            "</td>";
                    } else {
                        tr.innerHTML =
                            "<td>" +
                            escapar(
                                m.dataTexto
                            ) +
                            "</td>" +
                            "<td>" +
                            escapar(
                                m.documento ||
                                "-"
                            ) +
                            "</td>" +
                            "<td>" +
                            escapar(
                                m.historico
                            ) +
                            "</td>" +
                            "<td>" +
                            escapar(
                                formatarMoeda(
                                    m.valor
                                )
                            ) +
                            "</td>" +
                            "<td>" +
                            escapar(
                                m.motivo ||
                                "-"
                            ) +
                            "</td>";
                    }

                    tbody.appendChild(
                        tr
                    );
                }
            );
    }

    function renderizarHistoricosExtrato() {
        const lista =
            document.getElementById(
                "listaRegrasMovimentacao"
            );

        const resumo =
            document.getElementById(
                "resumoRegrasMovimentacao"
            );

        if (!lista) return;

        lista.innerHTML = "";

        if (
            !movimentacoesExtrato.length
        ) {
            lista.innerHTML =
                '<div class="sem-dados">Nenhum histórico identificado.</div>';

            if (
                resumo
            ) {
                resumo.textContent =
                    "Processe um extrato para visualizar os históricos encontrados.";
            }

            return;
        }

        const mapa =
            new Map();

        movimentacoesExtrato.forEach(
            m => {
                const historico =
                    m.historicoNormalizado;

                if (
                    !historico ||
                    linhaInformativa(
                        historico
                    )
                ) {
                    return;
                }

                if (
                    !mapa.has(
                        historico
                    )
                ) {
                    mapa.set(
                        historico,
                        {
                            normalizado:
                                historico,
                            historico:
                                m.historico,
                            quantidade: 0,
                            total: 0
                        }
                    );
                }

                const dados =
                    mapa.get(
                        historico
                    );

                dados.quantidade++;
                dados.total +=
                    Number(
                        m.valor ||
                        0
                    );
            }
        );

        Array.from(
            mapa.values()
        )
            .sort(
                (
                    a,
                    b
                ) =>
                    a.historico.localeCompare(
                        b.historico,
                        "pt-BR"
                    )
            )
            .forEach(
                item => {
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
                        document.createElement(
                            "label"
                        );

                    label.className =
                        "regra-movimentacao-item";

                    const checkbox =
                        document.createElement(
                            "input"
                        );

                    checkbox.type =
                        "checkbox";

                    checkbox.checked =
                        !!excluido;

                    const span =
                        document.createElement(
                            "span"
                        );

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

                    lista.appendChild(
                        label
                    );
                }
            );

        if (
            resumo
        ) {
            resumo.textContent =
                mapa.size +
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
        ].forEach(
            id =>
                definirValorCampo(
                    id,
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

        const resumoMensal =
            obterTbody(
                "tabelaResumoMensalMovimentacao"
            );

        const consideradas =
            obterTbody(
                "tabelaMovimentacoesConsideradas"
            );

        const excluidas =
            obterTbody(
                "tabelaMovimentacoesExcluidas"
            );

        if (
            resumoMensal
        ) {
            resumoMensal.innerHTML =
                '<tr><td colspan="3" class="sem-dados">Nenhum extrato processado.</td></tr>';
        }

        if (
            consideradas
        ) {
            consideradas.innerHTML =
                '<tr><td colspan="5" class="sem-dados">Nenhum extrato processado.</td></tr>';
        }

        if (
            excluidas
        ) {
            excluidas.innerHTML =
                '<tr><td colspan="5" class="sem-dados">Nenhum extrato processado.</td></tr>';
        }
    }

    function extrairDataInicial(texto) {
        const match =
            String(
                texto ||
                ""
            ).match(
                /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})(?=\s|$)/
            );

        if (
            !match
        ) {
            return null;
        }

        const data =
            criarData(
                Number(
                    match[1]
                ),
                Number(
                    match[2]
                ),
                normalizarAno(
                    Number(
                        match[3]
                    ),
                    match[3].length
                )
            );

        return data
            ? {
                data,
                texto:
                    match[0]
            }
            : null;
    }

    function converterDataExtrato(valor) {
        const match =
            String(
                valor ||
                ""
            )
                .trim()
                .match(
                    /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/
                );

        return match
            ? criarData(
                Number(
                    match[1]
                ),
                Number(
                    match[2]
                ),
                normalizarAno(
                    Number(
                        match[3]
                    ),
                    match[3].length
                )
            )
            : null;
    }

    function criarData(
        dia,
        mes,
        ano
    ) {
        if (
            !Number.isInteger(
                dia
            ) ||
            !Number.isInteger(
                mes
            ) ||
            !Number.isInteger(
                ano
            ) ||
            dia <
            1 ||
            dia >
            31 ||
            mes <
            1 ||
            mes >
            12 ||
            ano <
            1900 ||
            ano >
            2200
        ) {
            return null;
        }

        const data =
            new Date(
                ano,
                mes - 1,
                dia,
                12
            );

        return (
            data.getFullYear() ===
            ano &&
            data.getMonth() ===
            mes -
            1 &&
            data.getDate() ===
            dia
        )
            ? data
            : null;
    }

    function normalizarAno(
        ano,
        tamanho
    ) {
        return tamanho ===
            2
            ? (
                ano >=
                    70
                    ? 1900 +
                    ano
                    : 2000 +
                    ano
            )
            : ano;
    }

    function formatarDataBrasileira(data) {
        if (
            !(
                data instanceof Date
            ) ||
            Number.isNaN(
                data.getTime()
            )
        ) {
            return "";
        }

        return (
            String(
                data.getDate()
            ).padStart(
                2,
                "0"
            ) +
            "/" +
            String(
                data.getMonth() +
                1
            ).padStart(
                2,
                "0"
            ) +
            "/" +
            data.getFullYear()
        );
    }

    function obterCompetenciaData(data) {
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

    function calcularMesesInclusivos(
        inicio,
        fim
    ) {
        if (
            !inicio ||
            !fim
        ) {
            return 0;
        }

        return (
            (
                fim.getFullYear() -
                inicio.getFullYear()
            ) *
            12 +
            (
                fim.getMonth() -
                inicio.getMonth()
            ) +
            1
        );
    }

    function aplicarMascaraDataCampo(
        evento
    ) {
        const campo =
            evento.target;

        let valor =
            String(
                campo.value ||
                ""
            )
                .replace(
                    /\D/g,
                    ""
                )
                .slice(
                    0,
                    8
                );

        if (
            valor.length >
            4
        ) {
            valor =
                valor.slice(
                    0,
                    2
                ) +
                "/" +
                valor.slice(
                    2,
                    4
                ) +
                "/" +
                valor.slice(
                    4
                );
        } else if (
            valor.length >
            2
        ) {
            valor =
                valor.slice(
                    0,
                    2
                ) +
                "/" +
                valor.slice(
                    2
                );
        }

        campo.value =
            valor;
    }

    function normalizarCampoMeses(
        campo
    ) {
        const valor =
            Number(
                campo.value
            );

        campo.value =
            Number.isFinite(
                valor
            ) &&
                valor >=
                1
                ? String(
                    Math.trunc(
                        valor
                    )
                )
                : "";
    }

    function converterValorBrasileiro(
        valor
    ) {
        let texto =
            String(
                valor ||
                ""
            )
                .replace(
                    /R\$/gi,
                    ""
                )
                .replace(
                    /\s+/g,
                    ""
                )
                .trim();

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
                    /^[+-]/,
                    ""
                )
                .replace(
                    /\./g,
                    ""
                )
                .replace(
                    ",",
                    "."
                )
                .replace(
                    /[^\d.]/g,
                    ""
                );

        const numero =
            Number(
                texto
            );

        return Number.isFinite(
            numero
        )
            ? (
                negativo
                    ? -numero
                    : numero
            )
            : NaN;
    }

    function normalizarTexto(
        texto
    ) {
        return decodificarTexto(
            texto
        )
            .normalize(
                "NFD"
            )
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

    function normalizarCompetencias(
        competencias
    ) {
        return Array.from(
            new Set(
                (
                    competencias ||
                    []
                )
                    .map(
                        comp =>
                            String(
                                comp ||
                                ""
                            ).trim()
                    )
                    .filter(
                        comp =>
                            /^\d{4}-\d{2}$/.test(
                                comp
                            )
                    )
            )
        ).sort();
    }

    function formatarCompetencia(
        comp
    ) {
        const partes =
            String(
                comp ||
                ""
            ).split(
                "-"
            );

        return partes.length ===
            2
            ? partes[1] +
            "/" +
            partes[0]
            : comp;
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

    function definirTexto(
        id,
        valor
    ) {
        const el =
            document.getElementById(
                id
            );

        if (
            el
        ) {
            el.textContent =
                valor;
        }
    }

    function definirValorCampo(
        id,
        valor
    ) {
        const el =
            document.getElementById(
                id
            );

        if (
            el
        ) {
            el.value =
                valor;
        }
    }

    function obterValorCampo(
        id
    ) {
        const el =
            document.getElementById(
                id
            );

        return el
            ? String(
                el.value ||
                ""
            )
            : "";
    }

    function obterTbody(
        id
    ) {
        const el =
            document.getElementById(
                id
            );

        return el
            ? (
                el.tagName ===
                    "TBODY"
                    ? el
                    : el.querySelector(
                        "tbody"
                    )
            )
            : null;
    }

    function inserirVazio(
        tbody,
        colspan,
        mensagem
    ) {
        const tr =
            document.createElement(
                "tr"
            );

        tr.innerHTML =
            '<td colspan="' +
            colspan +
            '" class="sem-dados">' +
            escapar(
                mensagem
            ) +
            "</td>";

        tbody.appendChild(
            tr
        );
    }

    function escapar(
        valor
    ) {
        return String(
            valor ||
            ""
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

    window.MediaMovimentacao = {
        processar:
            processarMovimentacao,

        processarTexto:
            (
                texto,
                opcoes
            ) =>
                processarTextoMovimentacao(
                    String(
                        texto ||
                        ""
                    ),
                    opcoes ||
                    {}
                ),

        recalcular:
            () => {
                if (
                    !movimentacoesExtrato.length
                ) {
                    return;
                }

                aplicarPeriodoInformadoPeloUsuario();
                classificarMovimentacoes();
                renderizarHistoricosExtrato();
                renderizarResultadosMovimentacao();
                mostrarResultadosProcessamento();
            },

        obterMovimentacoes:
            () =>
                movimentacoesExtrato.slice(),

        obterConsideradas:
            () =>
                movimentacoesConsideradas.slice(),

        obterExcluidas:
            () =>
                movimentacoesExcluidas.slice(),

        mostrarResultados:
            mostrarResultadosProcessamento,

        ocultarResultados:
            ocultarResultadosProcessamento,

        selecionarModo:
            selecionarModoEntradaMovimentacao,

        voltarSelecaoModo:
            voltarSelecaoModoMovimentacao,

        definirMesesConsiderados:
            function (
                valor
            ) {
                const numero =
                    Number(
                        valor
                    );

                if (
                    !Number.isFinite(
                        numero
                    ) ||
                    numero <
                    1
                ) {
                    return;
                }

                const meses =
                    Math.trunc(
                        numero
                    );

                mesesDetectadosAutomaticos =
                    meses;

                definirValorCampo(
                    "mesesDetectadosMovimentacao",
                    String(
                        meses
                    )
                );

                definirValorCampo(
                    "mesesConsideradosMovimentacao",
                    String(
                        meses
                    )
                );
            },

        definirCompetenciasDocumentadas:
            function (
                competencias
            ) {
                competenciasDocumentadasExternas =
                    normalizarCompetencias(
                        competencias
                    );

                if (
                    competenciasDocumentadasExternas.length
                ) {
                    mesesDetectadosAutomaticos =
                        competenciasDocumentadasExternas.length;

                    definirValorCampo(
                        "mesesDetectadosMovimentacao",
                        String(
                            mesesDetectadosAutomaticos
                        )
                    );

                    definirValorCampo(
                        "mesesConsideradosMovimentacao",
                        String(
                            mesesDetectadosAutomaticos
                        )
                    );
                }
            },

        definirPeriodo:
            (
                inicio,
                fim
            ) => {
                if (
                    inicio instanceof Date &&
                    !Number.isNaN(
                        inicio.getTime()
                    )
                ) {
                    primeiraDataExtrato =
                        new Date(
                            inicio
                        );

                    primeiraDataExtratoAutomatica =
                        new Date(
                            inicio
                        );

                    definirValorCampo(
                        "primeiraDataMovimentacao",
                        formatarDataBrasileira(
                            inicio
                        )
                    );
                }

                if (
                    fim instanceof Date &&
                    !Number.isNaN(
                        fim.getTime()
                    )
                ) {
                    ultimaDataExtrato =
                        new Date(
                            fim
                        );

                    ultimaDataExtratoAutomatica =
                        new Date(
                            fim
                        );

                    definirValorCampo(
                        "ultimaDataMovimentacao",
                        formatarDataBrasileira(
                            fim
                        )
                    );
                }
            },

        obterResumo:
            () => {
                const resultado =
                    calcularResultadosMovimentacao();

                return {
                    total:
                        resultado.total,
                    media:
                        resultado.media,
                    meses:
                        resultado.meses,
                    quantidadeConsideradas:
                        resultado.consideradas.length,
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

    window.processarTextoMovimentacao =
        function (
            texto,
            opcoes
        ) {
            return processarTextoMovimentacao(
                String(
                    texto ||
                    ""
                ),
                opcoes ||
                {}
            );
        };


})();