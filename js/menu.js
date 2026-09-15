/**
 * menu.js
 * Menu principal da Caixa de Ferramentas
 * Sicoob Mantiqueira
 */

document.addEventListener("DOMContentLoaded", () => {
    const containerMenu = document.getElementById("menuPrincipal");

    if (!containerMenu) {
        console.warn("Container #menuPrincipal não encontrado.");
        return;
    }

    /*
     * =========================================================
     * CADASTRO CENTRALIZADO DO MENU
     * =========================================================
     * Para adicionar, remover, renomear ou reordenar menus,
     * altere SOMENTE esta lista.
     * =========================================================
     */
    const ITENS_MENU = [
        {
            nome: "Início",
            arquivo: "index.html"
        },
        {
            nome: "Crédito Rural",
            arquivo: "credito-rural.html"
        },
        {
            nome: "Comprometimento de Renda",
            arquivo: "comprometimento-renda.html"
        },
        {
            nome: "Antecipação Sipag",
            arquivo: "antecipacao-sipag.html"
        },
        {
            nome: "Precificação Sipag",
            arquivo: "precificacao-sipag.html"
        },
        {
            nome: "Informações Sicoob Card",
            arquivo: "informacoes-beneficios-sicoobcard.html"
        },
        {
            nome: "Cobrança",
            arquivo: "cobranca.html"
        },
        {
            nome: "Previdência",
            arquivo: "previdencia.html"
        },

    ];

    function obterPaginaAtual() {
        let paginaAtual = window.location.pathname
            .split("/")
            .pop()
            .split("?")[0]
            .split("#")[0];

        paginaAtual = decodeURIComponent(paginaAtual);

        if (!paginaAtual) {
            paginaAtual = "index.html";
        }

        return paginaAtual.toLowerCase();
    }

    function criarMenu() {
        const paginaAtual = obterPaginaAtual();

        const nav = document.createElement("nav");
        nav.className = "menu-principal";

        const container = document.createElement("div");
        container.className = "container menu-conteudo";

        ITENS_MENU.forEach(item => {
            const link = document.createElement("a");

            link.href = item.arquivo;
            link.className = "menu-item";
            link.textContent = item.nome;

            if (
                paginaAtual === item.arquivo.toLowerCase()
            ) {
                link.classList.add("ativo");
            }

            container.appendChild(link);
        });

        nav.appendChild(container);

        containerMenu.replaceChildren(nav);
    }

    criarMenu();
});