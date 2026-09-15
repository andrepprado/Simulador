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
     * Para adicionar, remover, renomear ou reordenar menus
     * e submenus, altere SOMENTE esta estrutura.
     * =========================================================
     */
    const ITENS_MENU = [
        {
            nome: "Início",
            arquivo: "index.html"
        },
        {
            nome: "Crédito",
            itens: [
                {
                    nome: "Crédito Rural",
                    arquivo: "credito-rural.html"
                },
                {
                    nome: "Comprometimento de Renda",
                    arquivo: "comprometimento-renda.html"
                },
                {
                    nome: "Simulador de Condições de Crédito",
                    arquivo: "condicoes-credito.html"
                }
            ]
        },
        {
            nome: "Produtos e Serviços",
            itens: [
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
                }
            ]
        },
        {
            nome: "Seguros e Previdência",
            itens: [
                {
                    nome: "Previdência",
                    arquivo: "previdencia.html"
                }
            ]
        }
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

    function itemEstaAtivo(item, paginaAtual) {
        if (item.arquivo) {
            return item.arquivo.toLowerCase() === paginaAtual;
        }

        if (Array.isArray(item.itens)) {
            return item.itens.some(subitem => itemEstaAtivo(subitem, paginaAtual));
        }

        return false;
    }

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

    function criarLink(item, paginaAtual, classe = "menu-item") {
        const link = document.createElement("a");

        link.href = item.arquivo;
        link.className = classe;
        link.textContent = item.nome;

        if (itemEstaAtivo(item, paginaAtual)) {
            link.classList.add("ativo");
        }

        return link;
    }

    function criarGrupo(item, paginaAtual) {
        const grupo = document.createElement("div");
        grupo.className = "menu-grupo";

        if (itemEstaAtivo(item, paginaAtual)) {
            grupo.classList.add("ativo");
        }

        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "menu-item menu-grupo-botao";
        botao.setAttribute("aria-expanded", "false");

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
            const link = criarLink(
                subitem,
                paginaAtual,
                "menu-subitem"
            );

            submenu.appendChild(link);
        });

        botao.addEventListener("click", event => {
            event.stopPropagation();

            const abrir = !grupo.classList.contains("aberto");

            fecharTodosSubmenus(grupo);

            grupo.classList.toggle("aberto", abrir);
            botao.setAttribute(
                "aria-expanded",
                abrir ? "true" : "false"
            );
        });

        grupo.addEventListener("mouseenter", () => {
            if (window.matchMedia("(hover: hover)").matches) {
                fecharTodosSubmenus(grupo);
                grupo.classList.add("aberto");
                botao.setAttribute("aria-expanded", "true");
            }
        });

        grupo.addEventListener("mouseleave", () => {
            if (window.matchMedia("(hover: hover)").matches) {
                grupo.classList.remove("aberto");
                botao.setAttribute("aria-expanded", "false");
            }
        });

        grupo.appendChild(botao);
        grupo.appendChild(submenu);

        return grupo;
    }

    function criarMenu() {
        const paginaAtual = obterPaginaAtual();

        const nav = document.createElement("nav");
        nav.className = "menu-principal";

        const container = document.createElement("div");
        container.className = "container menu-conteudo";

        ITENS_MENU.forEach(item => {
            if (item.arquivo) {
                container.appendChild(
                    criarLink(item, paginaAtual)
                );

                return;
            }

            if (Array.isArray(item.itens) && item.itens.length > 0) {
                container.appendChild(
                    criarGrupo(item, paginaAtual)
                );
            }
        });

        nav.appendChild(container);
        containerMenu.replaceChildren(nav);
    }

    document.addEventListener("click", event => {
        if (!event.target.closest(".menu-grupo")) {
            fecharTodosSubmenus();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            fecharTodosSubmenus();
        }
    });

    criarMenu();
});