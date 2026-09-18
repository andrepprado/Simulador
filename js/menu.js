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

    const ITENS_MENU = [
        {
            nome: "Início",
            arquivo: "index.html",
            disponivel: true
        },
        {
            nome: "Crédito Rural",
            disponivel: true,
            itens: [
                {
                    nome: "Simulador de Crédito Rural",
                    arquivo: "credito-rural.html",
                    disponivel: true
                },
                {
                    nome: "Cálculo de Renda por Notas Fiscais",
                    arquivo: "calculo-renda-notas-fiscais.html",
                    disponivel: true
                },
                {
                    nome: "Porte do Produtor Rural",
                    arquivo: "porte-produtor-rural.html",
                    disponivel: true
                }
            ]
        },
        {
            nome: "Crédito",
            disponivel: true,
            itens: [
                {
                    nome: "Comprometimento de Renda",
                    arquivo: "comprometimento-renda.html",
                    disponivel: true
                },
                {
                    nome: "Simulador de Condições de Crédito",
                    arquivo: "condicoes-credito.html",
                    disponivel: true
                },
                {
                    nome: "Média de Movimentação",
                    arquivo: "media-movimentacao.html",
                    disponivel: true
                }
            ]
        },
        {
            nome: "Produtos e Serviços",
            disponivel: true,
            itens: [
                {
                    nome: "Antecipação Sipag",
                    arquivo: "antecipacao-sipag.html",
                    disponivel: true
                },
                {
                    nome: "Precificação Sipag",
                    arquivo: "precificacao-sipag.html",
                    disponivel: true
                },
                {
                    nome: "Informações Sicoob Card",
                    arquivo: "informacoes-beneficios-sicoobcard.html",
                    disponivel: true
                },
                {
                    nome: "Cobrança",
                    arquivo: "cobranca.html",
                    disponivel: true
                }
            ]
        },
        {
            nome: "Seguros e Previdência",
            disponivel: true,
            itens: [
                {
                    nome: "Previdência",
                    arquivo: "previdencia.html",
                    disponivel: true
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

    function ehMobile() {
        return window.matchMedia("(max-width: 700px)").matches;
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

    function fecharMenuMobile() {
        const nav = document.querySelector(".menu-principal");
        const botao = document.querySelector(".menu-mobile-botao");

        if (!nav || !botao) {
            return;
        }

        nav.classList.remove("menu-mobile-aberto");
        botao.classList.remove("ativo");
        botao.setAttribute("aria-expanded", "false");
        botao.setAttribute("aria-label", "Abrir menu");

        fecharTodosSubmenus();
    }

    function criarLinkDisponivel(item, paginaAtual, classe = "menu-item") {
        const link = document.createElement("a");

        link.href = item.arquivo;
        link.className = classe;
        link.textContent = item.nome;

        if (itemEstaAtivo(item, paginaAtual)) {
            link.classList.add("ativo");
            link.setAttribute("aria-current", "page");
        }

        link.addEventListener("click", () => {
            if (ehMobile()) {
                fecharMenuMobile();
            }
        });

        return link;
    }

    function criarItemIndisponivel(item, classe = "menu-item") {
        const elemento = document.createElement("span");

        elemento.className = `${classe} menu-indisponivel`;
        elemento.setAttribute("aria-disabled", "true");
        elemento.setAttribute("title", "Em breve");

        const texto = document.createElement("span");
        texto.className = "menu-item-texto";
        texto.textContent = item.nome;

        const status = document.createElement("small");
        status.className = "menu-status-em-breve";
        status.textContent = "Em breve";

        elemento.appendChild(texto);
        elemento.appendChild(status);

        return elemento;
    }

    function criarItemMenu(item, paginaAtual, classe = "menu-item") {
        if (item.disponivel === false) {
            return criarItemIndisponivel(item, classe);
        }

        return criarLinkDisponivel(item, paginaAtual, classe);
    }

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
        texto.className = "menu-item-texto";
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
            submenu.appendChild(
                criarItemMenu(
                    subitem,
                    paginaAtual,
                    "menu-subitem"
                )
            );
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
            if (
                !ehMobile() &&
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
                !ehMobile() &&
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

        texto.className = "menu-item-texto";
        texto.textContent = item.nome;

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

    function criarGrupo(item, paginaAtual) {
        if (item.disponivel === false) {
            return criarGrupoIndisponivel(item);
        }

        return criarGrupoDisponivel(
            item,
            paginaAtual
        );
    }

    function criarBotaoMobile() {
        const topo = document.createElement("div");
        topo.className = "menu-mobile-topo";

        const container = document.createElement("div");
        container.className = "container menu-mobile-topo-conteudo";

        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "menu-mobile-botao";
        botao.setAttribute("aria-label", "Abrir menu");
        botao.setAttribute("aria-expanded", "false");

        const linha1 = document.createElement("span");
        const linha2 = document.createElement("span");
        const linha3 = document.createElement("span");

        botao.appendChild(linha1);
        botao.appendChild(linha2);
        botao.appendChild(linha3);

        botao.addEventListener("click", event => {
            event.stopPropagation();

            const nav = botao.closest(".menu-principal");

            if (!nav) {
                return;
            }

            const abrir = !nav.classList.contains("menu-mobile-aberto");

            nav.classList.toggle("menu-mobile-aberto", abrir);
            botao.classList.toggle("ativo", abrir);

            botao.setAttribute(
                "aria-expanded",
                abrir ? "true" : "false"
            );

            botao.setAttribute(
                "aria-label",
                abrir ? "Fechar menu" : "Abrir menu"
            );

            if (!abrir) {
                fecharTodosSubmenus();
            }
        });

        container.appendChild(botao);
        topo.appendChild(container);

        return topo;
    }

    function criarMenu() {
        const paginaAtual = obterPaginaAtual();

        const nav = document.createElement("nav");
        nav.className = "menu-principal";

        nav.appendChild(
            criarBotaoMobile()
        );

        const container = document.createElement("div");

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

    document.addEventListener("click", event => {
        if (
            !event.target.closest(".menu-grupo") &&
            !event.target.closest(".menu-mobile-botao")
        ) {
            fecharTodosSubmenus();

            if (
                ehMobile() &&
                !event.target.closest(".menu-principal")
            ) {
                fecharMenuMobile();
            }
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            fecharTodosSubmenus();
            fecharMenuMobile();
        }
    });

    let larguraAnterior = window.innerWidth;

    window.addEventListener("resize", () => {
        const larguraAtual = window.innerWidth;

        if (
            larguraAnterior <= 700 &&
            larguraAtual > 700
        ) {
            fecharMenuMobile();
        }

        larguraAnterior = larguraAtual;
    });

    criarMenu();
});