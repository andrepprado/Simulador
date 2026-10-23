(function () {
    "use strict";

    const ids = [
        "finalidade",
        "atividade",
        "enquadramentoAtividade",
        "linhaCredito"
    ];

    const nomes = [
        "Finalidade / Tipo de atividade",
        "Produto / Atividade rural",
        "Enquadramento ASTEC",
        "Linha de crédito"
    ];

    const campos = ids.map(id => document.getElementById(id));
    const root = document.getElementById("ruralWizard");

    if (!root || campos.some(campo => !campo)) {
        console.error("[WIZARD RURAL] Campos originais nao encontrados.");
        return;
    }

    let etapa = 0;
    let pesquisa = "";

    const escolhidos = [null, null, null, null];

    function criar(tag, classe, texto) {
        const elemento = document.createElement(tag);

        if (classe) elemento.className = classe;
        if (texto !== undefined) elemento.textContent = texto;

        return elemento;
    }

    function opcoes(indice) {
        return Array.from(campos[indice].options).filter(opcao =>
            !opcao.disabled &&
            opcao.value !== "" &&
            opcao.textContent.trim()
        );
    }

    function selecionar(indice, valor) {
        const campo = campos[indice];

        campo.value = valor;

        campo.dispatchEvent(
            new Event("change", { bubbles: true })
        );

        escolhidos[indice] = {
            valor,
            texto: campo.selectedOptions[0]?.textContent.trim() || valor
        };

        for (let i = indice + 1; i < escolhidos.length; i++) {
            escolhidos[i] = null;
        }

        etapa = indice + 1;
        pesquisa = "";

        if (etapa >= ids.length) {
            etapa = ids.length;

            document.body.classList.remove("rural-wizard-pending");
            document.body.classList.add("rural-wizard-ready");
        } else {
            document.body.classList.add("rural-wizard-pending");
            document.body.classList.remove("rural-wizard-ready");
        }

        renderizar();
    }

    function voltar(indice) {
        etapa = indice;
        pesquisa = "";

        document.body.classList.add("rural-wizard-pending");
        document.body.classList.remove("rural-wizard-ready");

        renderizar();

        root.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    function renderizar() {
        root.replaceChildren();

        root.append(
            criar("div", "rw-eyebrow", "CONFIGURE A PROPOSTA")
        );

        root.append(
            criar("h2", null, "Credito Rural | Sicoob Mantiqueira")
        );

        const breadcrumb = criar("div", "rw-breadcrumb");

        escolhidos.forEach((item, indice) => {
            if (!item) return;

            const botao = criar("button", "rw-crumb", item.texto);
            botao.type = "button";
            botao.title = "Alterar " + nomes[indice];

            botao.addEventListener("click", () => voltar(indice));

            breadcrumb.append(botao);
        });

        root.append(breadcrumb);

        if (etapa === ids.length) {
            root.append(
                criar(
                    "div",
                    "rw-label",
                    "Configuracao concluida. Informe os valores e simule abaixo."
                )
            );

            const navegacao = criar("div", "rw-nav");

            const alterar = criar(
                "button",
                "secondary",
                "Alterar escolhas"
            );

            alterar.type = "button";
            alterar.addEventListener("click", () => voltar(0));

            navegacao.append(alterar);
            root.append(navegacao);

            return;
        }

        const secao = criar("section", "rw-step");

        secao.append(
            criar(
                "div",
                "rw-label",
                `${etapa + 1}. ${nomes[etapa]}`
            )
        );

        const lista = opcoes(etapa);

        if (!lista.length) {
            secao.append(
                criar(
                    "p",
                    "rw-note",
                    "Nenhuma opcao disponivel para a selecao anterior."
                )
            );

            root.append(secao);
            return;
        }

        if (lista.length > 12) {
            const busca = criar("input", "rw-search");

            busca.type = "search";
            busca.placeholder = "Pesquisar " + nomes[etapa].toLowerCase();
            busca.value = pesquisa;

            secao.append(busca);

            busca.addEventListener("input", () => {
                pesquisa = busca.value;
                desenharBotoes();
            });
        }

        const area = criar("div", "rw-options");
        const nota = criar("p", "rw-note");

        secao.append(area, nota);

        function desenharBotoes() {
            area.replaceChildren();

            const termo = pesquisa
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase();

            const filtradas = lista.filter(opcao =>
                opcao.textContent
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .toLowerCase()
                    .includes(termo)
            );

            filtradas.slice(0, 70).forEach(opcao => {
                const botao = criar(
                    "button",
                    "rw-btn",
                    opcao.textContent.trim()
                );

                botao.type = "button";

                if (escolhidos[etapa]?.valor === opcao.value) {
                    botao.classList.add("selected");
                }

                botao.addEventListener("click", () => {
                    selecionar(etapa, opcao.value);
                });

                area.append(botao);
            });

            nota.textContent = filtradas.length > 70
                ? `Exibindo 70 de ${filtradas.length} opcoes. Refine a pesquisa.`
                : "";
        }

        desenharBotoes();
        root.append(secao);

        if (etapa > 0) {
            const navegacao = criar("div", "rw-nav");

            const anterior = criar(
                "button",
                "secondary",
                "Voltar"
            );

            anterior.type = "button";
            anterior.addEventListener("click", () => voltar(etapa - 1));

            navegacao.append(anterior);
            root.append(navegacao);
        }
    }

    let tentativas = 0;

    const timer = setInterval(() => {
        tentativas++;

        if (opcoes(0).length > 0) {
            clearInterval(timer);
            renderizar();
        } else if (tentativas >= 100) {
            clearInterval(timer);

            root.replaceChildren(
                criar(
                    "p",
                    "rw-note",
                    "A base de credito rural nao carregou."
                )
            );

            document.body.classList.remove("rural-wizard-pending");
        }
    }, 150);

    document.body.classList.add("rural-wizard-pending");

    document.getElementById("btnLimpar")?.addEventListener("click", () => {
        escolhidos.fill(null);
        etapa = 0;
        pesquisa = "";

        document.body.classList.add("rural-wizard-pending");
        document.body.classList.remove("rural-wizard-ready");

        setTimeout(renderizar, 0);
    });
})();