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
            .botao-impressao-pdf {
                position: fixed;
                right: 24px;
                bottom: 24px;
                z-index: 99999;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                min-height: 44px;
                padding: 0 18px;
                border: 0;
                border-radius: 10px;
                background: #003640;
                color: #ffffff;
                font-family: Arial, Helvetica, sans-serif;
                font-size: 14px;
                font-weight: 700;
                cursor: pointer;
                box-shadow: 0 8px 22px rgba(0, 54, 64, 0.22);
                transition: background 0.2s ease, transform 0.2s ease;
            }

            .botao-impressao-pdf:hover {
                background: #00A091;
                transform: translateY(-2px);
            }

            .botao-impressao-pdf:focus-visible {
                outline: 3px solid #C9D200;
                outline-offset: 3px;
            }

            @media print {
                @page {
                    size: A4 landscape;
                    margin: 8mm;
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

                .botao-impressao-pdf {
                    display: none !important;
                }

                .container {
                    width: 100% !important;
                    max-width: none !important;
                    margin-left: auto !important;
                    margin-right: auto !important;
                }

                .topo,
                .menu-principal,
                main,
                footer,
                section,
                aside,
                .card,
                .resultado-destaque,
                .resultado-item,
                .linha-selecionada,
                .aviso,
                .aviso-info,
                .indicador-total,
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

                .tabela-wrapper {
                    width: 100% !important;
                    max-width: none !important;
                    overflow-x: visible !important;
                    overflow-y: visible !important;
                }

                table {
                    width: 100% !important;
                    max-width: none !important;
                    border-collapse: collapse !important;
                }

                thead {
                    display: table-header-group !important;
                }

                tfoot {
                    display: table-footer-group !important;
                }

                tr {
                    break-inside: avoid !important;
                    page-break-inside: avoid !important;
                }

                .resultado-item,
                .resultado-destaque,
                .linha-selecionada,
                .titulo-secao,
                .titulo-subsecao,
                .indicador-total {
                    break-inside: avoid !important;
                    page-break-inside: avoid !important;
                }

                input,
                select,
                textarea {
                    color: inherit !important;
                    opacity: 1 !important;
                    background: #ffffff !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }

                button {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }

                a {
                    color: inherit !important;
                    text-decoration: none !important;
                }

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
        botao.innerHTML = "Imprimir / Salvar PDF";
        botao.setAttribute(
            "aria-label",
            "Imprimir página completa ou salvar em PDF"
        );

        botao.addEventListener("click", imprimirPaginaCompleta);

        document.body.appendChild(botao);
    }

    function expandirElementosParaImpressao() {
        document
            .querySelectorAll(
                ".tabela-wrapper, .bloco-bandeira-conteudo"
            )
            .forEach(elemento => {
                elemento.dataset.overflowAnterior =
                    elemento.style.overflow || "";

                elemento.dataset.maxHeightAnterior =
                    elemento.style.maxHeight || "";

                elemento.style.overflow = "visible";
                elemento.style.maxHeight = "none";
            });
    }

    function restaurarElementosDepoisImpressao() {
        document
            .querySelectorAll(
                ".tabela-wrapper, .bloco-bandeira-conteudo"
            )
            .forEach(elemento => {
                elemento.style.overflow =
                    elemento.dataset.overflowAnterior || "";

                elemento.style.maxHeight =
                    elemento.dataset.maxHeightAnterior || "";

                delete elemento.dataset.overflowAnterior;
                delete elemento.dataset.maxHeightAnterior;
            });
    }

    function prepararImpressao() {
        expandirElementosParaImpressao();

        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "instant"
        });
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