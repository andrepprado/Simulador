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
     * disponivel: true  -> permite clique e navegação
     * disponivel: false -> apenas exibe como "Em breve"
     * =========================================================
     */

    const ITENS_MENU = [
        {
            nome: "Início",
            arquivo: "index.html",
            disponivel: true
        },
        {
            nome: "Crédito",
            disponivel: true,
            itens: [
                {
                    nome: "Crédito Rural",
                    arquivo: "credito-rural.html",
                    disponivel: true
                },
                {
                    nome: "Comprometimento de Renda",
                    arquivo: "comprometimento-renda.html",
                    disponivel: true
                },
                {
                    nome: "Simulador de Condições de Crédito",
                    arquivo: "condicoes-credito.html",
                    disponivel: true
                }
            ]
        },
        {
            nome: "Produtos e Serviços",
            disponivel: false,
            itens: [
                {
                    nome: "Antecipação Sipag",
                    arquivo: "antecipacao-sipag.html",
                    disponivel: false
                },
                {
                    nome: "Precificação Sipag",
                    arquivo: "precificacao-sipag.html",
                    disponivel: false
                },
                {
                    nome: "Informações Sicoob Card",
                    arquivo: "informacoes-beneficios-sicoobcard.html",
                    disponivel: false
                },
                {
                    nome: "Cobrança",
                    arquivo: "cobranca.html",
                    disponivel: false
                }
            ]
        },
        {
            nome: "Seguros e Previdência",
            disponivel: false,
            itens: [
                {
                    nome: "Previdência",
                    arquivo: "previdencia.html",
                    disponivel: false
                }
            ]
        }
    ];

    /* =========================================================
       PÁGINA ATUAL
       ========================================================= */

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

    /* =========================================================
       ITEM ATIVO
       ========================================================= */

    function itemEstaAtivo(item, paginaAtual) {
        if (item.arquivo && item.disponivel !== false) {
            return item.arquivo.toLowerCase() === paginaAtual;
        }

        if (Array.isArray(item.itens)) {
            return item.itens.some(subitem =>
                itemEstaAtivo(subitem, paginaAtual)
            );
        }

        return false;
    }

    /* =========================================================
       FECHAR SUBMENUS
       ========================================================= */

    function fecharTodosSubmenus(excecao = null) {
        document.querySelectorAll(".menu-grupo.aberto").forEach(grupo => {
            if (grupo !== excecao) {
                grupo.classList.remove("aberto");

                const botao = grupo.querySelector(".menu-grupo-botao");

                if (botao) {
                    botao.setAttribute("aria-expanded", "false");
                }
            }
        });
    }

    /* =========================================================
       LINK DISPONÍVEL
       ========================================================= */

    function criarLinkDisponivel(item, paginaAtual, classe = "menu-item") {
        const link = document.createElement("a");

        link.href = item.arquivo;
        link.className = classe;
        link.textContent = item.nome;

        if (itemEstaAtivo(item, paginaAtual)) {
            link.classList.add("ativo");
        }

        return link;
    }

    /* =========================================================
       ITEM INDISPONÍVEL
       ========================================================= */

    function criarItemIndisponivel(item, classe = "menu-item") {
        const elemento = document.createElement("span");

        elemento.className = `${classe} menu-indisponivel`;
        elemento.setAttribute("aria-disabled", "true");
        elemento.setAttribute("title", "Em breve");

        const texto = document.createElement("span");
        texto.textContent = item.nome;

        const status = document.createElement("small");
        status.className = "menu-status-em-breve";
        status.textContent = "Em breve";

        elemento.appendChild(texto);
        elemento.appendChild(status);

        return elemento;
    }

    /* =========================================================
       CRIAÇÃO DE ITEM
       ========================================================= */

    function criarItemMenu(item, paginaAtual, classe = "menu-item") {
        if (item.disponivel === false) {
            return criarItemIndisponivel(
                item,
                classe
            );
        }

        return criarLinkDisponivel(
            item,
            paginaAtual,
            classe
        );
    }

    /* =========================================================
       GRUPO DISPONÍVEL
       ========================================================= */

    function criarGrupoDisponivel(item, paginaAtual) {
        const grupo = document.createElement("div");
        grupo.className = "menu-grupo";

        if (itemEstaAtivo(item, paginaAtual)) {
            grupo.classList.add("ativo");
        }

        const botao = document.createElement("button");

        botao.type = "button";
        botao.className = "menu-item menu-grupo-botao";
        botao.setAttribute("aria-expanded", "false");
        botao.setAttribute("aria-haspopup", "true");

        const texto = document.createElement("span");
        texto.textContent = item.nome;

        const seta = document.createElement("span");
        seta.className = "menu-grupo-seta";
        seta.setAttribute("aria-hidden", "true");
        seta.textContent = "▾";

        botao.appendChild(texto);
        botao.appendChild(seta);

        const submenu = document.createElement("div");
        submenu.className = "menu-submenu";

        item.itens.forEach(subitem => {
            const elemento = criarItemMenu(
                subitem,
                paginaAtual,
                "menu-subitem"
            );

            submenu.appendChild(elemento);
        });

        botao.addEventListener("click", event => {
            event.stopPropagation();

            const abrir =
                !grupo.classList.contains("aberto");

            fecharTodosSubmenus(grupo);

            grupo.classList.toggle(
                "aberto",
                abrir
            );

            botao.setAttribute(
                "aria-expanded",
                abrir ? "true" : "false"
            );
        });

        grupo.addEventListener("mouseenter", () => {
            if (
                window.matchMedia("(hover: hover)").matches
            ) {
                fecharTodosSubmenus(grupo);

                grupo.classList.add("aberto");

                botao.setAttribute(
                    "aria-expanded",
                    "true"
                );
            }
        });

        grupo.addEventListener("mouseleave", () => {
            if (
                window.matchMedia("(hover: hover)").matches
            ) {
                grupo.classList.remove("aberto");

                botao.setAttribute(
                    "aria-expanded",
                    "false"
                );
            }
        });

        grupo.appendChild(botao);
        grupo.appendChild(submenu);

        return grupo;
    }

    /* =========================================================
       GRUPO INDISPONÍVEL
       ========================================================= */

    function criarGrupoIndisponivel(item) {
        const grupo = document.createElement("div");

        grupo.className =
            "menu-grupo menu-grupo-indisponivel";

        const elemento = document.createElement("span");

        elemento.className =
            "menu-item menu-grupo-botao menu-indisponivel";

        elemento.setAttribute(
            "aria-disabled",
            "true"
        );

        elemento.setAttribute(
            "title",
            "Em breve"
        );

        const texto = document.createElement("span");

        texto.textContent =
            item.nome;

        const status = document.createElement("small");

        status.className =
            "menu-status-em-breve";

        status.textContent =
            "Em breve";

        elemento.appendChild(texto);
        elemento.appendChild(status);

        grupo.appendChild(elemento);

        return grupo;
    }

    /* =========================================================
       CRIAÇÃO DOS GRUPOS
       ========================================================= */

    function criarGrupo(item, paginaAtual) {
        if (item.disponivel === false) {
            return criarGrupoIndisponivel(item);
        }

        return criarGrupoDisponivel(
            item,
            paginaAtual
        );
    }

    /* =========================================================
       CRIAÇÃO DO MENU
       ========================================================= */

    function criarMenu() {
        const paginaAtual =
            obterPaginaAtual();

        const nav =
            document.createElement("nav");

        nav.className =
            "menu-principal";

        const container =
            document.createElement("div");

        container.className =
            "container menu-conteudo";

        ITENS_MENU.forEach(item => {
            if (item.arquivo) {
                container.appendChild(
                    criarItemMenu(
                        item,
                        paginaAtual
                    )
                );

                return;
            }

            if (
                Array.isArray(item.itens) &&
                item.itens.length > 0
            ) {
                container.appendChild(
                    criarGrupo(
                        item,
                        paginaAtual
                    )
                );
            }
        });

        nav.appendChild(container);

        containerMenu.replaceChildren(nav);
    }

    /* =========================================================
       EVENTOS GERAIS
       ========================================================= */

    document.addEventListener("click", event => {
        if (
            !event.target.closest(".menu-grupo")
        ) {
            fecharTodosSubmenus();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            fecharTodosSubmenus();
        }
    });

    /* =========================================================
       INICIALIZAÇÃO
       ========================================================= */

    criarMenu();
});