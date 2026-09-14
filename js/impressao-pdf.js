(() => {
    "use strict";

    const ID_ESTILO = "estilo-impressao-pdf";
    const ID_BOTAO = "btnImprimirPdfPagina";

    function adicionarEstilosImpressao() {
        if (document.getElementById(ID_ESTILO)) {
            return;
        }

        const style = document.createElement("style");
        style.id = ID_ESTILO;

        style.textContent = `
            @media print {

                @page {
                    size: A4 landscape;
                    margin: 5mm;
                }

                html,
                body {
                    width: 100% !important;
                    height: auto !important;
                    min-height: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    overflow: visible !important;
                    background: #ffffff !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }

                body {
                    zoom: 0.68 !important;
                }

                .botao-impressao-pdf {
                    display: none !important;
                }

                .container {
                    width: 100% !important;
                    max-width: 1180px !important;
                    margin-left: auto !important;
                    margin-right: auto !important;
                    padding-left: 12px !important;
                    padding-right: 12px !important;
                }

                .topo {
                    width: 100% !important;
                }

                .topo-conteudo {
                    min-height: 92px !important;
                }

                .topo-textos h1 {
                    font-size: 25px !important;
                }

                .topo-textos p {
                    font-size: 12px !important;
                }

                .topo-logo img {
                    max-height: 48px !important;
                }

                .menu-principal {
                    display: block !important;
                }

                .menu-conteudo {
                    min-height: 46px !important;
                }

                .menu-item {
                    min-height: 46px !important;
                    padding-left: 14px !important;
                    padding-right: 14px !important;
                    font-size: 12px !important;
                }

                main {
                    width: 100% !important;
                    max-width: 1180px !important;
                    margin: 20px auto 0 auto !important;
                    padding-left: 12px !important;
                    padding-right: 12px !important;
                }

                /*
                 * CRÉDITO RURAL
                 * Mantém exatamente a estrutura visual de duas colunas.
                 */
                .simulador-grid {
                    display: grid !important;
                    grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr) !important;
                    gap: 20px !important;
                    align-items: start !important;
                }

                .simulador-grid .formulario-card {
                    grid-column: 1 !important;
                    grid-row: 1 !important;
                }

                .simulador-grid .resultado-card {
                    grid-column: 2 !important;
                    grid-row: 1 !important;
                }

                .simulador-grid .tabela-card {
                    grid-column: 1 !important;
                    grid-row: 2 !important;
                }

                .simulador-grid .documentos-card {
                    grid-column: 2 !important;
                    grid-row: 2 !important;
                }

                /*
                 * ANTECIPAÇÃO
                 */
                .antecipacao-grid {
                    display: grid !important;
                    grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr) !important;
                    gap: 20px !important;
                    align-items: start !important;
                }

                .antecipacao-formulario {
                    grid-column: 1 !important;
                    grid-row: 1 !important;
                }

                .antecipacao-resultado {
                    grid-column: 2 !important;
                    grid-row: 1 !important;
                }

                .antecipacao-tabela {
                    grid-column: 1 !important;
                    grid-row: 2 !important;
                }

                .antecipacao-documentos {
                    grid-column: 2 !important;
                    grid-row: 2 !important;
                }

                /*
                 * PRECIFICAÇÃO
                 */
                .simulador-grid-igual {
                    display: grid !important;
                    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                    gap: 20px !important;
                    align-items: start !important;
                }

                .simulador-grid-igual .card-largura-total {
                    grid-column: 1 / -1 !important;
                }

                /*
                 * COBRANÇA
                 */
                .cobranca-grid {
                    display: grid !important;
                    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                    gap: 20px !important;
                    align-items: start !important;
                }

                .cobranca-card-largura-total,
                .cobranca-card-principal,
                .cobranca-acoes {
                    grid-column: 1 / -1 !important;
                }

                /*
                 * PREVIDÊNCIA
                 */
                .previdencia-container {
                    width: 100% !important;
                    max-width: 1180px !important;
                }

                .previdencia-painel.ativo {
                    display: grid !important;
                }

                /*
                 * CARDS
                 */
                .card {
                    padding: 20px !important;
                    border-radius: 12px !important;
                    box-shadow: 0 5px 18px rgba(0, 54, 64, 0.08) !important;
                    overflow: visible !important;
                }

                .titulo-secao {
                    margin-bottom: 16px !important;
                }

                .titulo-secao h2 {
                    font-size: 20px !important;
                    margin-bottom: 5px !important;
                }

                .titulo-secao p {
                    font-size: 12px !important;
                }

                .titulo-subsecao h3 {
                    font-size: 16px !important;
                }

                /*
                 * FORMULÁRIOS
                 */
                .grid-form {
                    display: grid !important;
                    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                    gap: 14px !important;
                }

                .grid-form-4 {
                    display: grid !important;
                    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
                    gap: 12px !important;
                }

                .campo label {
                    font-size: 11px !important;
                    margin-bottom: 5px !important;
                }

                input,
                select,
                textarea {
                    min-height: 36px !important;
                    height: 36px !important;
                    font-size: 12px !important;
                    color: inherit !important;
                    opacity: 1 !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }

                .input-prefixo,
                .input-sufixo {
                    min-height: 36px !important;
                }

                .input-prefixo span,
                .input-sufixo span {
                    font-size: 11px !important;
                }

                /*
                 * BOTÕES DA PRÓPRIA SIMULAÇÃO
                 */
                .acoes {
                    margin-top: 16px !important;
                    gap: 10px !important;
                }

                .acoes button {
                    min-height: 36px !important;
                    padding: 0 16px !important;
                    font-size: 11px !important;
                }

                /*
                 * RESULTADOS
                 */
                .resultado-destaque {
                    padding: 18px !important;
                    margin-bottom: 14px !important;
                }

                .resultado-destaque span {
                    font-size: 11px !important;
                }

                .resultado-destaque strong {
                    font-size: 23px !important;
                }

                .resultados-grid,
                .resultados-grid-3,
                .resultados-grid-4 {
                    gap: 10px !important;
                }

                .resultado-item {
                    padding: 12px !important;
                    min-height: 70px !important;
                }

                .resultado-item span {
                    font-size: 10px !important;
                }

                .resultado-item strong {
                    font-size: 13px !important;
                }

                .linha-selecionada {
                    padding: 12px !important;
                    margin-top: 12px !important;
                }

                .linha-selecionada span {
                    font-size: 10px !important;
                }

                .linha-selecionada strong {
                    font-size: 12px !important;
                }

                /*
                 * AVISOS
                 */
                .aviso,
                .aviso-info,
                .documentos-observacao {
                    padding: 12px !important;
                    font-size: 10px !important;
                }

                /*
                 * TABELAS
                 */
                .tabela-wrapper {
                    width: 100% !important;
                    max-width: none !important;
                    height: auto !important;
                    max-height: none !important;
                    overflow: visible !important;
                }

                table {
                    width: 100% !important;
                    max-width: none !important;
                    border-collapse: collapse !important;
                    table-layout: auto !important;
                }

                th,
                td {
                    padding: 8px 7px !important;
                    font-size: 10px !important;
                    white-space: normal !important;
                }

                thead {
                    display: table-header-group !important;
                }

                tfoot {
                    display: table-footer-group !important;
                }

                /*
                 * Evita cortes ruins dentro dos componentes.
                 */
                tr,
                .resultado-item,
                .resultado-destaque,
                .linha-selecionada,
                .titulo-secao,
                .titulo-subsecao,
                .aviso,
                .aviso-info,
                .indicador-total {
                    break-inside: avoid !important;
                    page-break-inside: avoid !important;
                }

                /*
                 * O card pode continuar na página seguinte.
                 * Isso é necessário para tabelas e documentos longos.
                 */
                section,
                aside,
                .card {
                    break-inside: auto !important;
                    page-break-inside: auto !important;
                }

                /*
                 * Remove limitações de altura e barras de rolagem.
                 */
                main,
                section,
                aside,
                .card,
                .tabela-wrapper,
                .bloco-bandeira,
                .bloco-bandeira-conteudo {
                    height: auto !important;
                    min-height: 0 !important;
                    max-height: none !important;
                    overflow: visible !important;
                }

                /*
                 * Preserva cores.
                 */
                .topo,
                .menu-principal,
                footer,
                .card,
                .resultado-destaque,
                .resultado-item,
                .linha-selecionada,
                .aviso,
                .aviso-info,
                table,
                thead,
                tbody,
                tfoot,
                tr,
                th,
                td {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }

                /*
                 * Links não mostram URL no PDF.
                 */
                a {
                    color: inherit !important;
                    text-decoration: none !important;
                }

                a[href]::after {
                    content: none !important;
                }

                /*
                 * Rodapé.
                 */
                footer {
                    width: 100% !important;
                    margin-top: 20px !important;
                    padding-top: 14px !important;
                    padding-bottom: 14px !important;
                    font-size: 10px !important;
                }

                /*
                 * Desliga efeitos que não fazem sentido na impressão.
                 */
                * {
                    animation: none !important;
                    transition: none !important;
                }
            }
        `;

        document.head.appendChild(style);
    }

    function criarBotaoImpressao() {
        if (document.getElementById(ID_BOTAO)) {
            return;
        }

        const botao = document.createElement("button");

        botao.type = "button";
        botao.id = ID_BOTAO;
        botao.className = "botao-impressao-pdf";
        botao.textContent = "Imprimir / Salvar PDF";

        botao.setAttribute(
            "aria-label",
            "Imprimir página completa ou salvar em PDF"
        );

        botao.addEventListener(
            "click",
            imprimirPaginaCompleta
        );

        document.body.appendChild(botao);
    }

    function salvarEstadoElemento(elemento) {
        if (elemento.dataset.impressaoPreparada === "1") {
            return;
        }

        elemento.dataset.impressaoPreparada = "1";
        elemento.dataset.overflowAnterior =
            elemento.style.overflow || "";
        elemento.dataset.overflowXAnterior =
            elemento.style.overflowX || "";
        elemento.dataset.overflowYAnterior =
            elemento.style.overflowY || "";
        elemento.dataset.heightAnterior =
            elemento.style.height || "";
        elemento.dataset.maxHeightAnterior =
            elemento.style.maxHeight || "";
    }

    function expandirElementosParaImpressao() {
        const seletores = [
            ".tabela-wrapper",
            ".bloco-bandeira-conteudo"
        ];

        document
            .querySelectorAll(seletores.join(","))
            .forEach(elemento => {
                salvarEstadoElemento(elemento);

                elemento.style.overflow = "visible";
                elemento.style.overflowX = "visible";
                elemento.style.overflowY = "visible";
                elemento.style.height = "auto";
                elemento.style.maxHeight = "none";
            });
    }

    function restaurarElementosDepoisImpressao() {
        document
            .querySelectorAll(
                '[data-impressao-preparada="1"]'
            )
            .forEach(elemento => {
                elemento.style.overflow =
                    elemento.dataset.overflowAnterior || "";

                elemento.style.overflowX =
                    elemento.dataset.overflowXAnterior || "";

                elemento.style.overflowY =
                    elemento.dataset.overflowYAnterior || "";

                elemento.style.height =
                    elemento.dataset.heightAnterior || "";

                elemento.style.maxHeight =
                    elemento.dataset.maxHeightAnterior || "";

                delete elemento.dataset.impressaoPreparada;
                delete elemento.dataset.overflowAnterior;
                delete elemento.dataset.overflowXAnterior;
                delete elemento.dataset.overflowYAnterior;
                delete elemento.dataset.heightAnterior;
                delete elemento.dataset.maxHeightAnterior;
            });
    }

    function prepararImpressao() {
        expandirElementosParaImpressao();

        window.scrollTo(
            0,
            0
        );
    }

    function finalizarImpressao() {
        restaurarElementosDepoisImpressao();
    }

    function imprimirPaginaCompleta() {
        prepararImpressao();

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                window.print();
            });
        });
    }

    function iniciarImpressaoPdf() {
        adicionarEstilosImpressao();
        criarBotaoImpressao();

        window.addEventListener(
            "beforeprint",
            prepararImpressao
        );

        window.addEventListener(
            "afterprint",
            finalizarImpressao
        );
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            iniciarImpressaoPdf
        );
    } else {
        iniciarImpressaoPdf();
    }
})();