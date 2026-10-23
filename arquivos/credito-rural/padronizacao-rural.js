(() => {
    "use strict";

    const CAMPOS_CLASSIFICACAO = [
        "finalidade",
        "atividade"
    ];

    const obter = id => document.getElementById(id);

    const campoConfigurado = id => {
        const campo = obter(id);
        return campo && String(campo.value || "").trim() !== "";
    };

    function propostaConfigurada() {
        const resumo = document.querySelector(
            ".ms-resumo, .ms-escolhas-resumo"
        );

        const telaUnificada = document.body.classList.contains(
            "ms-tela-unica"
        );

        return telaUnificada &&
            CAMPOS_CLASSIFICACAO.every(campoConfigurado);
    }

    function bloquearClassificacoes() {
        const bloquear = propostaConfigurada();

        CAMPOS_CLASSIFICACAO.forEach(id => {
            const campo = obter(id);

            if (!campo) return;

            campo.disabled = bloquear;
            campo.setAttribute(
                "aria-disabled",
                String(bloquear)
            );

            campo.classList.toggle(
                "mr-campo-travado",
                bloquear
            );

            const container = campo.closest(
                ".campo, .form-group, .campo-formulario"
            );

            if (container) {
                container.classList.toggle(
                    "mr-classificacao-travada",
                    bloquear
                );
            }
        });
    }

    function iniciar() {
        bloquearClassificacoes();

        const observador = new MutationObserver(() => {
            bloquearClassificacoes();
        });

        observador.observe(document.body, {
            attributes: true,
            attributeFilter: ["class"]
        });

        document.addEventListener("change", evento => {
            if (
                CAMPOS_CLASSIFICACAO.includes(
                    evento.target?.id
                )
            ) {
                queueMicrotask(bloquearClassificacoes);
            }
        });

        const botaoLimpar = obter("btnLimpar");

        if (botaoLimpar) {
            botaoLimpar.addEventListener(
                "click",
                () => setTimeout(
                    bloquearClassificacoes,
                    0
                )
            );
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            iniciar,
            { once: true }
        );
    } else {
        iniciar();
    }
})();