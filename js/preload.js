document.addEventListener("DOMContentLoaded", () => {
    const recursos = [
        // LOGOS E ÍCONES GERAIS
        "img/logoBranco.png",
        "img/caixaFerramentas.png",

        // ÍCONES DA PÁGINA INICIAL
        "img/simuladorCredito.png",
        "img/antecipacaoSipag.png",
        "img/precificacaoSipag.png",
        "img/cobranca.png",
        "img/previdencia.png",

        // CARTÕES SICOOBCARD
        "img/NEW_CARD_GOLD_a.png",
        "img/NEW_CARD_GOLD_plus_a.png",
        "img/NEW_CARD_PLATINUM_a.png",
        "img/NEW_CARD_BLACK_VERTH_a.png",
        "img/NEW_CARD_BLACK_MERITH_a.png",
        "img/NEW_CARD_BLACK_ZENITH_a.png",
        "img/masterEmpresarial.png",
        "img/visaEmpresarial.png"
    ];

    recursos.forEach(caminho => {
        const imagem = new Image();
        imagem.src = caminho;
    });
});