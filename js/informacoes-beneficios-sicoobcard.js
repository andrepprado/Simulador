document.addEventListener("DOMContentLoaded", () => {
    const $ = id => document.getElementById(id);
    const $$ = seletor => Array.from(document.querySelectorAll(seletor));

    const CARTOES = {
        gold: {
            nome: "Gold",
            nomeCompleto: "Sicoobcard Gold",
            descricao: "Cartão de entrada do portfólio Sicoobcard.",
            segmento: "Entrada",
            pontuacao: "—",
            salaVip: "—",
            limite: "R$ 500,00",
            anuidade: "Isento",
            imagem: "img/NEW_CARD_GOLD_a.png",
            bandeiras: ["Visa", "Mastercard"],
            beneficios: [
                {
                    nome: "Mastercard Surpreenda",
                    bandeira: "M"
                },
                {
                    nome: "Global Service",
                    bandeira: "V+M"
                },
                {
                    nome: "Vai de Visa",
                    bandeira: "V"
                }
            ]
        },

        goldPlus: {
            nome: "Gold Plus",
            nomeCompleto: "Sicoobcard Gold Plus",
            descricao: "Categoria de entrada premium do portfólio Sicoobcard.",
            segmento: "Entrada Premium",
            pontuacao: "1,2 pt",
            salaVip: "—",
            limite: "R$ 2.000,00",
            anuidade: "R$ 274,80",
            imagem: "img/NEW_CARD_GOLD_plus_a.png",
            bandeiras: ["Visa", "Mastercard"],
            beneficios: [
                {
                    nome: "Mastercard Surpreenda",
                    bandeira: "M"
                },
                {
                    nome: "Global Service",
                    bandeira: "V+M"
                },
                {
                    nome: "Vai de Visa",
                    bandeira: "V"
                }
            ]
        },

        platinum: {
            nome: "Platinum",
            nomeCompleto: "Sicoobcard Platinum",
            descricao: "Categoria intermediária do portfólio Sicoobcard.",
            segmento: "Intermediário",
            pontuacao: "1,5 pt",
            salaVip: "—",
            limite: "R$ 5.000,00",
            anuidade: "R$ 358,80",
            imagem: "img/NEW_CARD_PLATINUM_a.png",
            bandeiras: ["Visa", "Mastercard"],
            beneficios: [
                {
                    nome: "Mastercard Surpreenda",
                    bandeira: "M"
                },
                {
                    nome: "Seguro viagem",
                    bandeira: "V+M"
                },
                {
                    nome: "Seguro aluguel de veículo",
                    bandeira: "V+M"
                },
                {
                    nome: "Global Service",
                    bandeira: "V+M"
                },
                {
                    nome: "Vai de Visa",
                    bandeira: "V"
                }
            ]
        },

        verth: {
            nome: "Verth",
            nomeCompleto: "Sicoobcard Verth",
            descricao: "Categoria de alta renda inicial do portfólio Sicoobcard.",
            segmento: "Alta renda inicial",
            pontuacao: "2,2 pts",
            salaVip: "4 acessos",
            limite: "R$ 10.000,00",
            anuidade: "R$ 708,00",
            imagem: "img/NEW_CARD_BLACK_VERTH_a.png",
            bandeiras: ["Visa", "Mastercard"],
            beneficios: [
                {
                    nome: "Mastercard Surpreenda",
                    bandeira: "M"
                },
                {
                    nome: "Seguro viagem",
                    bandeira: "V+M"
                },
                {
                    nome: "Seguro aluguel de veículo",
                    bandeira: "V+M"
                },
                {
                    nome: "Seguro proteção família",
                    bandeira: "V+M"
                },
                {
                    nome: "Sala VIP",
                    bandeira: "V+M"
                },
                {
                    nome: "LoungeKey",
                    bandeira: "V+M"
                },
                {
                    nome: "Infinite Fast Pass",
                    bandeira: "V"
                },
                {
                    nome: "Seguro perda bagagem",
                    bandeira: "V"
                },
                {
                    nome: "Global Service",
                    bandeira: "V+M"
                },
                {
                    nome: "Vai de Visa",
                    bandeira: "V"
                },
                {
                    nome: "Garantia estendida",
                    bandeira: "V+M"
                },
                {
                    nome: "Airport Concierge",
                    bandeira: "V"
                }
            ]
        },

        merith: {
            nome: "Merith",
            nomeCompleto: "Sicoobcard Merith",
            descricao: "Categoria de alta renda do portfólio Sicoobcard.",
            segmento: "Alta renda",
            pontuacao: "2,5 pts",
            salaVip: "12 acessos",
            limite: "R$ 30.000,00",
            anuidade: "R$ 1.428,00",
            imagem: "img/NEW_CARD_BLACK_MERITH_a.png",
            bandeiras: ["Visa", "Mastercard"],
            beneficios: [
                {
                    nome: "Mastercard Surpreenda",
                    bandeira: "M"
                },
                {
                    nome: "Seguro viagem",
                    bandeira: "V+M"
                },
                {
                    nome: "Seguro aluguel de veículo",
                    bandeira: "V+M"
                },
                {
                    nome: "Seguro proteção família",
                    bandeira: "V+M"
                },
                {
                    nome: "Sala VIP",
                    bandeira: "V+M"
                },
                {
                    nome: "LoungeKey",
                    bandeira: "V+M"
                },
                {
                    nome: "Infinite Fast Pass",
                    bandeira: "V"
                },
                {
                    nome: "Seguro perda bagagem",
                    bandeira: "V+M"
                },
                {
                    nome: "Global Service",
                    bandeira: "V+M"
                },
                {
                    nome: "Vai de Visa",
                    bandeira: "V"
                },
                {
                    nome: "Garantia estendida",
                    bandeira: "V+M"
                },
                {
                    nome: "Airport Concierge",
                    bandeira: "V+M"
                }
            ]
        },

        zenith: {
            nome: "Zenith",
            nomeCompleto: "Sicoobcard Zenith",
            descricao: "Categoria de ultra alta renda do portfólio Sicoobcard.",
            segmento: "Ultra alta renda",
            pontuacao: "4,0 pts",
            salaVip: "Ilimitado +2",
            limite: "R$ 100.000,00",
            anuidade: "R$ 1.790,00",
            imagem: "img/NEW_CARD_BLACK_ZENITH_a.png",
            bandeiras: ["Visa", "Mastercard"],
            beneficios: [
                {
                    nome: "Mastercard Surpreenda",
                    bandeira: "M"
                },
                {
                    nome: "Seguro viagem",
                    bandeira: "V+M"
                },
                {
                    nome: "Seguro aluguel de veículo",
                    bandeira: "V+M"
                },
                {
                    nome: "Seguro proteção família",
                    bandeira: "V+M"
                },
                {
                    nome: "Sala VIP",
                    bandeira: "V+M"
                },
                {
                    nome: "LoungeKey",
                    bandeira: "V+M"
                },
                {
                    nome: "Infinite Fast Pass",
                    bandeira: "V"
                },
                {
                    nome: "Seguro perda bagagem",
                    bandeira: "V+M"
                },
                {
                    nome: "Global Service",
                    bandeira: "V+M"
                },
                {
                    nome: "Vai de Visa",
                    bandeira: "V"
                },
                {
                    nome: "Garantia estendida",
                    bandeira: "V+M"
                },
                {
                    nome: "Airport Concierge",
                    bandeira: "V+M"
                }
            ]
        },

        masterEmpresarial: {
            nome: "Master Emp.",
            nomeCompleto: "Sicoobcard Mastercard Empresarial",
            descricao: "Cartão destinado ao segmento Pessoa Jurídica.",
            segmento: "Pessoa Jurídica",
            pontuacao: "—",
            salaVip: "—",
            limite: "R$ 5.000,00",
            anuidade: "R$ 220,00",
            imagem: "",
            bandeiras: ["Mastercard"],
            beneficios: []
        },

        visaEmpresarial: {
            nome: "Visa Emp.",
            nomeCompleto: "Sicoobcard Visa Empresarial",
            descricao: "Cartão destinado ao segmento Pessoa Jurídica.",
            segmento: "Pessoa Jurídica",
            pontuacao: "—",
            salaVip: "—",
            limite: "R$ 5.000,00",
            anuidade: "R$ 220,00",
            imagem: "",
            bandeiras: ["Visa"],
            beneficios: []
        }
    };

    function obterClasseBandeira(bandeira) {
        if (bandeira === "M") {
            return "beneficio-master";
        }

        if (bandeira === "V") {
            return "beneficio-visa";
        }

        return "beneficio-ambas";
    }

    function obterNomeBandeira(bandeira) {
        if (bandeira === "M") {
            return "Mastercard";
        }

        if (bandeira === "V") {
            return "Visa";
        }

        return "Visa e Mastercard";
    }

    function criarBeneficio(beneficio) {
        const item = document.createElement("div");

        item.className = "sicoobcard-beneficio";

        const classeBandeira =
            obterClasseBandeira(beneficio.bandeira);

        const nomeBandeira =
            obterNomeBandeira(beneficio.bandeira);

        item.innerHTML = `
            <div class="sicoobcard-beneficio-icone">
                ✓
            </div>

            <div class="sicoobcard-beneficio-conteudo">
                <strong>${beneficio.nome}</strong>
                <small>${nomeBandeira}</small>
            </div>

            <span class="beneficio-bandeira ${classeBandeira}">
                ${beneficio.bandeira}
            </span>
        `;

        return item;
    }

    function atualizarBandeiras(cartao) {
        const container = $("cartaoBandeiras");

        if (!container) {
            return;
        }

        container.innerHTML = "";

        cartao.bandeiras.forEach(bandeira => {
            const tag = document.createElement("span");

            tag.className = "sicoobcard-bandeira-tag";
            tag.textContent = bandeira;

            container.appendChild(tag);
        });
    }

    function atualizarBeneficios(cartao) {
        const lista = $("listaBeneficios");
        const mensagem = $("mensagemSemBeneficios");
        const textoBeneficios = $("textoBeneficios");

        if (!lista || !mensagem) {
            return;
        }

        lista.innerHTML = "";

        if (
            !cartao.beneficios ||
            cartao.beneficios.length === 0
        ) {
            lista.classList.add("hide");
            mensagem.classList.remove("hide");

            if (textoBeneficios) {
                textoBeneficios.textContent =
                    `O material de referência não detalha benefícios individuais para o ${cartao.nomeCompleto}.`;
            }

            return;
        }

        lista.classList.remove("hide");
        mensagem.classList.add("hide");

        if (textoBeneficios) {
            textoBeneficios.textContent =
                `${cartao.beneficios.length} benefícios distintos disponíveis para o ${cartao.nomeCompleto}.`;
        }

        cartao.beneficios.forEach(beneficio => {
            lista.appendChild(
                criarBeneficio(beneficio)
            );
        });
    }

    function removerPlaceholderImagem() {
        const area =
            document.querySelector(
                ".sicoobcard-imagem-area"
            );

        if (!area) {
            return;
        }

        const placeholder =
            area.querySelector(
                ".sicoobcard-imagem-placeholder"
            );

        if (placeholder) {
            placeholder.remove();
        }
    }

    function criarPlaceholderImagem(cartao) {
        const area =
            document.querySelector(
                ".sicoobcard-imagem-area"
            );

        if (!area) {
            return;
        }

        removerPlaceholderImagem();

        const placeholder =
            document.createElement("div");

        placeholder.className =
            "sicoobcard-imagem-placeholder";

        placeholder.innerHTML = `
            <strong>${cartao.nomeCompleto}</strong>
            <span>Imagem ainda não cadastrada.</span>
        `;

        placeholder.style.textAlign =
            "center";

        placeholder.style.color =
            "#33666E";

        placeholder.style.fontSize =
            "12px";

        placeholder.style.lineHeight =
            "1.5";

        area.appendChild(
            placeholder
        );
    }

    function atualizarImagem(cartao) {
        const imagem =
            $("imagemCartao");

        if (!imagem) {
            return;
        }

        removerPlaceholderImagem();

        if (!cartao.imagem) {
            imagem.removeAttribute("src");
            imagem.alt =
                cartao.nomeCompleto;

            imagem.style.display =
                "none";

            criarPlaceholderImagem(
                cartao
            );

            return;
        }

        imagem.classList.add(
            "trocando"
        );

        imagem.style.display =
            "block";

        setTimeout(() => {
            imagem.src =
                cartao.imagem;

            imagem.alt =
                cartao.nomeCompleto;

            imagem.classList.remove(
                "trocando"
            );
        }, 120);
    }

    function atualizarSelecao(chave) {
        $$(".sicoobcard-opcao").forEach(botao => {
            botao.classList.toggle(
                "ativo",
                botao.dataset.cartao === chave
            );
        });

        $$("#tabelaComparativo tr[data-cartao]").forEach(linha => {
            linha.classList.toggle(
                "sicoobcard-linha-ativa",
                linha.dataset.cartao === chave
            );
        });
    }

    function selecionarCartao(chave) {
        const cartao =
            CARTOES[chave];

        if (!cartao) {
            return;
        }

        if ($("cartaoCategoria")) {
            $("cartaoCategoria").textContent =
                "Sicoobcard";
        }

        if ($("cartaoNome")) {
            $("cartaoNome").textContent =
                cartao.nome;
        }

        if ($("cartaoDescricao")) {
            $("cartaoDescricao").textContent =
                cartao.descricao;
        }

        if ($("nomeCartaoImagem")) {
            $("nomeCartaoImagem").textContent =
                cartao.nomeCompleto;
        }

        if ($("segmentoCartaoImagem")) {
            $("segmentoCartaoImagem").textContent =
                cartao.segmento;
        }

        if ($("infoSegmento")) {
            $("infoSegmento").textContent =
                cartao.segmento;
        }

        if ($("infoPontuacao")) {
            $("infoPontuacao").textContent =
                cartao.pontuacao;
        }

        if ($("infoSalaVip")) {
            $("infoSalaVip").textContent =
                cartao.salaVip;
        }

        if ($("infoLimite")) {
            $("infoLimite").textContent =
                cartao.limite;
        }

        if ($("infoAnuidade")) {
            $("infoAnuidade").textContent =
                cartao.anuidade;
        }

        if ($("infoQuantidadeBeneficios")) {
            $("infoQuantidadeBeneficios").textContent =
                cartao.beneficios.length > 0
                    ? cartao.beneficios.length
                    : "—";
        }

        atualizarImagem(cartao);
        atualizarBandeiras(cartao);
        atualizarBeneficios(cartao);
        atualizarSelecao(chave);
    }

    function montarTabelaComparativo() {
        const tbody =
            $("tabelaComparativo");

        if (!tbody) {
            return;
        }

        tbody.innerHTML = "";

        Object.entries(CARTOES).forEach(
            ([chave, cartao]) => {
                const linha =
                    document.createElement("tr");

                linha.dataset.cartao =
                    chave;

                linha.innerHTML = `
                    <td><strong>${cartao.nome}</strong></td>
                    <td>${cartao.segmento}</td>
                    <td>${cartao.pontuacao}</td>
                    <td>${cartao.salaVip}</td>
                    <td>${cartao.limite}</td>
                    <td>${cartao.anuidade}</td>
                `;

                linha.addEventListener(
                    "click",
                    () => {
                        selecionarCartao(chave);

                        const detalhes =
                            document.querySelector(
                                ".sicoobcard-detalhes-grid"
                            );

                        if (detalhes) {
                            window.scrollTo({
                                top:
                                    detalhes.offsetTop -
                                    80,
                                behavior:
                                    "smooth"
                            });
                        }
                    }
                );

                tbody.appendChild(
                    linha
                );
            }
        );
    }

    $$(".sicoobcard-opcao").forEach(botao => {
        botao.addEventListener(
            "click",
            () => {
                selecionarCartao(
                    botao.dataset.cartao
                );
            }
        );
    });

    const imagemCartao =
        $("imagemCartao");

    if (imagemCartao) {
        imagemCartao.addEventListener(
            "error",
            function () {
                const chaveAtiva =
                    document.querySelector(
                        ".sicoobcard-opcao.ativo"
                    )?.dataset.cartao;

                const cartao =
                    CARTOES[chaveAtiva];

                this.style.display =
                    "none";

                if (cartao) {
                    criarPlaceholderImagem(
                        cartao
                    );
                }
            }
        );

        imagemCartao.addEventListener(
            "load",
            function () {
                this.style.display =
                    "block";

                removerPlaceholderImagem();
            }
        );
    }

    montarTabelaComparativo();
    selecionarCartao("gold");
});