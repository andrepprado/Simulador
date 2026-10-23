(function () {
    "use strict";

    const root = document.getElementById("ruralWizard");
    const checklist = document.getElementById("mrChecklist");
    const grid = document.querySelector(".simulador-grid");

    if (!root || !checklist || !grid) {
        console.error("[MANTIQUEIRA] Estrutura da página incompleta.");
        return;
    }

    const campos = {
        finalidade: document.getElementById("finalidade"),
        atividade: document.getElementById("atividade"),
        enquadramento: document.getElementById("enquadramentoAtividade"),
        linha: document.getElementById("linhaCredito")
    };

    const estado = {
        finalidade: "",
        atividade: "",
        uf: "",
        pa: "",
        tela: "inicio",
        agencias: [],
        documentos: null,
        statuses: {},
        observacoes: ""
    };

    const criar = (tag, classe, texto) => {
        const elemento = document.createElement(tag);
        if (classe) elemento.className = classe;
        if (texto !== undefined) elemento.textContent = texto;
        return elemento;
    };

    function botao(texto, acao, classe = "") {
        const elemento = criar("button", "ms-btn " + classe, texto);
        elemento.type = "button";
        elemento.addEventListener("click", acao);
        return elemento;
    }

    function normalizar(valor) {
        return String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    }

    function configurado() {
        return !!(
            estado.finalidade &&
            estado.atividade &&
            estado.uf &&
            estado.pa.trim()
        );
    }

    function aplicarFinalidade() {
        if (!campos.finalidade) return;

        const alvo = normalizar(
            estado.finalidade + " " + estado.atividade
        );

        const opcoes = Array.from(campos.finalidade.options);

        const encontrada = opcoes.find(opcao => {
            const texto = normalizar(opcao.textContent);
            return texto.includes(normalizar(estado.finalidade)) &&
                texto.includes(normalizar(estado.atividade));
        });

        if (encontrada) {
            campos.finalidade.value = encontrada.value;
            campos.finalidade.dispatchEvent(
                new Event("change", { bubbles: true })
            );
        } else {
            console.warn(
                "[MANTIQUEIRA] Finalidade não encontrada no motor:",
                alvo
            );
        }
    }

    function criarEscolhas(titulo, valores, atual, alterar) {
        const bloco = criar("div", "ms-campo");
        bloco.append(criar("h3", null, titulo));

        const opcoes = criar("div", "ms-opcoes");

        valores.forEach(([valor, rotulo]) => {
            opcoes.append(botao(rotulo, () => {
                alterar(valor);
                renderizar();
            }, atual === valor ? "ms-ativo" : ""));
        });

        bloco.append(opcoes);
        return bloco;
    }

    function cabecalho() {
        const topo = criar("div", "ms-topo");
        topo.append(criar(
            "span",
            "ms-etiqueta",
            "SICOOB MANTIQUEIRA · CRÉDITO RURAL"
        ));
        topo.append(criar("h2", null, "Simulação e Documentação"));
        topo.append(criar(
            "p",
            "ms-descricao",
            "Configure a proposta e escolha a funcionalidade."
        ));
        return topo;
    }

    function renderizarInicio() {
        root.replaceChildren();
        root.append(cabecalho());

        const configuracao = criar("div", "ms-configuracao");

        configuracao.append(criarEscolhas(
            "1. Finalidade",
            [
                ["Custeio", "Custeio"],
                ["Investimento", "Investimento"]
            ],
            estado.finalidade,
            valor => {
                estado.finalidade = valor;
                estado.statuses = {};
            }
        ));

        configuracao.append(criarEscolhas(
            "2. Atividade",
            [
                ["Agrícola", "Agrícola"],
                ["Pecuária", "Pecuária"]
            ],
            estado.atividade,
            valor => {
                estado.atividade = valor;
                estado.statuses = {};
            }
        ));

        configuracao.append(criarEscolhas(
            "3. Estado",
            [
                ["SP", "São Paulo"],
                ["RJ", "Rio de Janeiro"]
            ],
            estado.uf,
            valor => {
                if (estado.uf !== valor) {
                    estado.pa = "";
                    estado.statuses = {};
                }

                estado.uf = valor;
            }
        ));

        const pa = criar("div", "ms-campo");
        pa.append(criar("h3", null, "4. Posto de atendimento"));

        const select = criar("select", "ms-input");
        select.setAttribute("aria-label", "Posto de atendimento");

        const vazio = criar("option", null, "Selecione o PA");
        vazio.value = "";
        select.append(vazio);

        const agencias = (estado.agencias || [])
            .filter(item => !item.uf || item.uf === estado.uf)
            .filter(item => item.nome)
            .sort((a, b) =>
                a.nome.localeCompare(b.nome, "pt-BR")
            );

        const nomesAdicionados = new Set();

        agencias.forEach(item => {
            if (nomesAdicionados.has(item.nome)) return;

            nomesAdicionados.add(item.nome);

            const opcao = criar("option", null, item.nome);
            opcao.value = item.nome;

            select.append(opcao);
        });

        if (nomesAdicionados.has(estado.pa)) {
            select.value = estado.pa;
        } else {
            estado.pa = "";
        }

        select.addEventListener("change", () => {
            estado.pa = select.value;

            if (!configurado()) return;

            aplicarFinalidade();

            estado.tela = "unificada";
            renderizar();

            root.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        });

        pa.append(select);

        if (!agencias.length) {
            pa.append(criar(
                "p",
                "ms-descricao",
                "Nenhum PA cadastrado para a UF selecionada."
            ));
        }

        configuracao.append(pa);
        root.append(configuracao);

        const acoes = criar("div", "ms-acoes");

        acoes.append(botao(
            "Limpar tudo",
            limparTudo,
            "ms-secundario"
        ));

        root.append(acoes);
    }

    function renderizarEscolha() {
        root.replaceChildren();
        root.append(cabecalho());

        root.append(criar(
            "p",
            "ms-resumo",
            `${estado.finalidade} · ${estado.atividade} · ${estado.uf} · ${estado.pa}`
        ));

        root.append(criar(
            "h3",
            "ms-subtitulo",
            "O que deseja fazer?"
        ));

        const escolhas = criar("div", "ms-funcionalidades");

        const simulador = botao(
            "Simular crédito",
            () => {
                estado.tela = "simulador";
                renderizar();
            },
            "ms-funcao"
        );

        simulador.prepend(criar("span", "ms-icone", "▦"));

        const documentos = botao(
            "Consultar documentos",
            () => {
                estado.tela = "checklist";
                renderizar();
            },
            "ms-funcao"
        );

        documentos.prepend(criar("span", "ms-icone", "☑"));

        escolhas.append(simulador, documentos);
        root.append(escolhas);

        root.append(botao(
            "← Alterar escolhas",
            () => {
                estado.tela = "inicio";
                renderizar();
            },
            "ms-secundario"
        ));

        root.append(botao(
            "Limpar tudo",
            limparTudo,
            "ms-secundario"
        ));
    }

    function renderizarSimulador() {
        root.replaceChildren();
        root.append(cabecalho());

        root.append(criar(
            "p",
            "ms-resumo",
            `${estado.finalidade} · ${estado.atividade} · ${estado.uf} · ${estado.pa}`
        ));

        const acoes = criar("div", "ms-acoes");

        acoes.append(botao(
            "← Voltar às funcionalidades",
            () => {
                estado.tela = "escolha";
                renderizar();
            },
            "ms-secundario"
        ));

        acoes.append(botao(
            "Alterar escolhas",
            () => {
                estado.tela = "inicio";
                renderizar();
            },
            "ms-secundario"
        ));

        acoes.append(botao(
            "Limpar tudo",
            limparTudo,
            "ms-secundario"
        ));

        root.append(acoes);
    }

    function secoesDocumentais() {
        const dados = estado.documentos || {};

        const investimento = estado.finalidade === "Investimento";
        const pecuaria = estado.atividade === "Pecuária";

        const chave = investimento
            ? pecuaria
                ? "DOCS_INV_PEC_GERAIS"
                : "DOCS_INV_AGR_GERAIS"
            : pecuaria
                ? "DOCS_CUSTEIO_PEC_GERAIS"
                : "DOCS_CUSTEIO_AGR_GERAIS";

        const secoes = [...(dados[chave] || [])];

        const regionais = dados.DOCS_AMBIENTAL || {};
        const uf = estado.uf.toLowerCase();

        if (Array.isArray(regionais[uf])) {
            secoes.push(...regionais[uf]);
        }

        return secoes;
    }

    function renderizarDocumentos() {
        checklist.replaceChildren();

        checklist.append(criar(
            "h2",
            null,
            "Checklist de Documentação"
        ));

        checklist.append(criar(
            "p",
            "ms-descricao",
            `${estado.finalidade} · ${estado.atividade} · ${estado.uf} · ${estado.pa}`
        ));

        checklist.append(criar(
            "p",
            "ms-aviso",
            "Documentos de referência. A aplicabilidade deve ser validada conforme a operação e os normativos vigentes."
        ));

        const secoes = secoesDocumentais();
        let total = 0;
        let entregues = 0;
        let na = 0;
        const pendentes = [];

        const grupos = criar("div");

        secoes.forEach((secao, indiceSecao) => {
            const grupo = criar("details", "ms-grupo");
            grupo.open = true;

            grupo.append(criar(
                "summary",
                null,
                secao.secao || "Documentos"
            ));

            (secao.itens || []).forEach((item, indiceItem) => {
                const chave = [
                    estado.finalidade,
                    estado.atividade,
                    estado.uf,
                    indiceSecao,
                    indiceItem
                ].join("|");

                if (!estado.statuses[chave]) {
                    estado.statuses[chave] = item.naPadrao
                        ? "na"
                        : "pendente";
                }

                const status = estado.statuses[chave];
                total++;

                if (status === "entregue") entregues++;
                if (status === "na") na++;

                if (status === "pendente") {
                    pendentes.push({
                        nome: item.nome,
                        responsavel: item.resp
                    });
                }

                const linha = criar(
                    "div",
                    "ms-documento " + status
                );

                const descricao = criar("div", "ms-documento-info");
                descricao.append(criar(
                    "strong",
                    null,
                    item.nome || "Documento"
                ));

                if (item.obs) {
                    descricao.append(criar(
                        "p",
                        "ms-descricao",
                        item.obs
                    ));
                }

                if (item.resp) {
                    descricao.append(criar(
                        "span",
                        "ms-responsavel",
                        item.resp.toUpperCase()
                    ));
                }

                if (item.arquivo) {
                    descricao.append(criar(
                        "p",
                        "ms-nome-arquivo",
                        "Nome do arquivo: " + item.arquivo
                    ));
                }

                const controles = criar("div", "ms-controles");

                const label = criar("label", "ms-checkbox-label");

                const checkbox = criar("input", "ms-checkbox");
                checkbox.type = "checkbox";
                checkbox.checked = status === "entregue";

                checkbox.setAttribute(
                    "aria-label",
                    "Marcar como entregue: " + item.nome
                );

                const textoCheckbox = criar(
                    "span",
                    null,
                    "Entregue"
                );

                checkbox.addEventListener("change", () => {
                    estado.statuses[chave] = checkbox.checked
                        ? "entregue"
                        : "pendente";

                    renderizarDocumentos();
                });

                label.append(checkbox, textoCheckbox);

                const botaoNA = botao(
                    status === "na"
                        ? "N/A ✓"
                        : "N/A",
                    () => {
                        estado.statuses[chave] =
                            estado.statuses[chave] === "na"
                                ? "pendente"
                                : "na";

                        renderizarDocumentos();
                    },
                    status === "na"
                        ? "ms-na-ativo"
                        : "ms-na"
                );

                botaoNA.setAttribute(
                    "aria-label",
                    "Alternar não se aplica: " + item.nome
                );

                controles.append(label, botaoNA);
                linha.append(descricao, controles);

                grupo.append(linha);
            });

            grupos.append(grupo);
        });

        const progresso = criar("div", "ms-progresso");
        const aplicaveis = total - na;
        const percentual = aplicaveis
            ? Math.round(entregues / aplicaveis * 100)
            : 100;

        progresso.append(criar(
            "strong",
            null,
            `${entregues} / ${aplicaveis} documentos entregues`
        ));

        const trilho = criar("div", "ms-trilho");
        const preenchimento = criar("div", "ms-preenchimento");
        preenchimento.style.width = percentual + "%";
        trilho.append(preenchimento);
        progresso.append(trilho);

        checklist.append(progresso, grupos);

        const resumo = criar("details", "ms-pendentes");
        resumo.open = false;

        resumo.append(criar(
            "summary",
            null,
            `Documentos pendentes (${pendentes.length})`
        ));

        const lista = criar("ul");

        pendentes.forEach(item => {
            lista.append(criar(
                "li",
                null,
                `${item.nome} — ${item.responsavel || "Responsável a definir"}`
            ));
        });

        resumo.append(lista);
        checklist.append(resumo);

        const label = criar(
            "label",
            "ms-label",
            "Observações gerais da proposta"
        );

        label.htmlFor = "msObservacoes";

        const textarea = criar("textarea", "ms-textarea");
        textarea.id = "msObservacoes";
        textarea.value = estado.observacoes;
        textarea.rows = 4;

        textarea.addEventListener("input", () => {
            estado.observacoes = textarea.value;
        });

        checklist.append(label, textarea);

        const acoes = criar("div", "ms-acoes");

        acoes.append(botao(
            "Imprimir / Salvar PDF",
            () => window.print(),
            "ms-principal"
        ));

        acoes.append(botao(
            "Limpar tudo / Nova proposta",
            limparTudo,
            "ms-secundario"
        ));

        checklist.append(acoes);
    }

    function limparTudo() {
        if (!confirm(
            "Deseja limpar toda a proposta e os status dos documentos?"
        )) return;

        // Rotina original de limpeza financeira.
        document.getElementById("btnLimpar")?.click();

        estado.finalidade = "";
        estado.atividade = "";
        estado.uf = "";
        estado.pa = "";
        estado.tela = "inicio";
        estado.statuses = {};
        estado.observacoes = "";

        renderizar();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function renderizar() {
        const configuradoAgora = configurado();

        if (!configuradoAgora) {
            estado.tela = "inicio";
        }

        const telaUnificada =
            configuradoAgora &&
            estado.tela === "unificada";

        document.body.classList.remove(
            "rural-wizard-pending",
            "rural-wizard-ready"
        );

        document.body.classList.toggle(
            "ms-simulando",
            telaUnificada
        );

        document.body.classList.toggle(
            "ms-tela-unica",
            telaUnificada
        );

        grid.hidden = !telaUnificada;
        checklist.hidden = !telaUnificada;

        root.replaceChildren();

        if (!telaUnificada) {
            renderizarInicio();
            return;
        }

        root.append(cabecalho());

        root.append(criar(
            "p",
            "ms-resumo",
            `${estado.finalidade} · ${estado.atividade} · ${estado.uf} · ${estado.pa}`
        ));

        const acoes = criar("div", "ms-acoes");

        acoes.append(botao(
            "Alterar escolhas",
            () => {
                estado.tela = "inicio";
                renderizar();
            },
            "ms-secundario"
        ));

        acoes.append(botao(
            "Limpar tudo / Nova proposta",
            limparTudo,
            "ms-secundario"
        ));

        root.append(acoes);

        renderizarDocumentos();
    }

    fetch("arquivos/credito-rural/rede-atendimento.json")
        .then(resposta => {
            if (!resposta.ok) {
                throw new Error("Não foi possível carregar os PAs");
            }
            return resposta.json();
        })
        .then(dados => {
            const lista = Array.isArray(dados)
                ? dados
                : Array.isArray(dados.agencias)
                    ? dados.agencias
                    : Array.isArray(dados.postos)
                        ? dados.postos
                        : [];

            estado.agencias = lista
                .map(item => ({
                    nome: String(
                        item.nome ||
                        item.pa ||
                        item.agencia ||
                        item.descricao ||
                        ""
                    ).trim(),
                    uf: String(
                        item.uf ||
                        item.estado ||
                        ""
                    ).trim().toUpperCase()
                }))
                .filter(item => item.nome);

            if (estado.tela === "inicio") {
                renderizar();
            }
        })
        .catch(erro => {
            console.error("[MANTIQUEIRA] Cadastro de PAs:", erro);
        });
    fetch("arquivos/credito-rural/documentos-referencia.json")
        .then(resposta => {
            if (!resposta.ok) {
                throw new Error("Base documental indisponível");
            }
            return resposta.json();
        })
        .then(dados => {
            estado.documentos = dados;
            if (estado.tela === "checklist") {
                renderizarDocumentos();
            }
        })
        .catch(erro => {
            console.error("[MANTIQUEIRA]", erro);
        });

    renderizar();
})();