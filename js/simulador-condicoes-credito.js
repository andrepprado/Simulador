/**
 * simulador-condicoes-credito.js
 * Simulador de Condições de Crédito
 * Sicoob Mantiqueira
 * @author andre.prado
 */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const $ = id => document.getElementById(id);

    /* =========================================================
       LINHAS PF
       ========================================================= */

    const LINHAS_PF = [
        "430 SICOOB COTAS-PARTES PF",
        "483 CRÉDITO COM GARANTIA DE IMÓVEL RESIDENCIAL PRICE",
        "4922 CONSIGNADO BANCOOB PRIVADO - ALÇADA COOPERATIVA",
        "5689 RPL INVESTIMENTO AGRICOLA SINGULAR TAXA LIVRE",
        "5691 RPL INVESTIMENTO PECUARIO SINGULAR TAXA LIVRE",
        "6093 REPACTUAÇÃO CRÉDITO PF-ROTATIVO C/ JUROS MENSAIS",
        "32746 Crédito Pessoal PRE",
        "32749 Crédito Pessoal PÓS",
        "32756 UNIMÓVEL ESPECIAL PF",
        "32759 UNIMÓVEL - ATÉ 80% DO VALOR DO IMÓVEL PÓS - PF",
        "32778 UNIVEÍCULOS NOVOS ESPECIAL - PF",
        "32780 UNIVEÍCULOS USADOS ESPECIAL - PF",
        "32809 CRÉDITO PESSOAL % INFORMADO",
        "33028 CRÉDITO ROTATIVO C/ JUROS MENSAIS PF",
        "2721 CRÉDITO ROTATIVO C/ JUROS MENSAIS PF",
        "34500 REPACTUAÇÃO CRÉDITO PESSOAL % INFORMADO",
        "34503 REPACTUAÇÃO CRÉDITO PESSOAL PRICE",
        "34504 REPACTUAÇÃO CP GAR IMÓV RESIDENCIAL SACD",
        "34506 REPACTUAÇÃO CRÉDITO PESSOAL SACD",
        "34519 REPACTUAÇÃO CRÉDITO PESSOAL SACC",
        "49198 LIMITE CCL PAR - PF",
        "54265 CARTA DE FIANÇA BANCÁRIA",
        "55756 LIMITE CHEQUE ESPECIAL PF",
        "67279 BENS NÃO DE USO PRÓPRIO - VENDA DE IMÓVEL - SACD",
        "69287 BENS NÃO DE USO PRÓPRIO - VENDA DE IMÓVEL PRICE",
        "73905 REFIN CONSIGNADO PRIVADO - ALÇADA BANCOOB",
        "74280 BENS NÃO DE USO PRÓPRIO - VENDA DE IMÓVEL - % INF",
        "82948 RENEG BNDU - VENDA DE VEICULO - PRICE",
        "98107 GUARDA-CHUVA",
        "98349 LIMITE CHEQUE ESPECIAL PF 500,00 PA DIGITAL",
        "102171 COTAS-PARTES PF PRICE TX PRE",
        "68505 BENS DE NAO USO PRÓPRIO VENDA DE VEÍCULO",
        "106361 CONVENIO COMEVAP PRODUTOR RURAL PRE",
        "106366 CONVENIO COMEVAP PRODUTOR RURAL POS",
        "131407 HOME EQUITY PRICE",
        "131409 HOME EQUITY SACD PÓS",
        "63329 CRÉDITO COM GARANTIA DE IMÓVEL RESIDENCIAL % INFORMADO",
        "140554 VEÍCULO HÍBRIDO NOVO - ATÉ 80% PF SACD",
        "140562 VEÍCULO HÍBRIDO NOVO - ATÉ 80% PF PRICE",
        "140553 VEÍCULO ELÉTRICO NOVO - ATÉ 50% PF SACD",
        "140561 VEÍCULO ELÉTRICO NOVO - ATÉ 50% PF PRICE",
        "140563 FOTOVOLTAICA - ATÉ 100% PF SACD",
        "140571 FOTOVOLTAICA - ATÉ 100% PF PRICE",
        "147616 PROMOCIONAL",
        "151887 LIMITE CHEQUE ESPECIAL PF PLUS"
    ];

    /* =========================================================
       LINHAS PJ
       ========================================================= */

    const LINHAS_PJ = [
        "435 SICOOB COTAS-PARTES PJ",
        "10847 RENEG CRÉD PJ-ROTATIVO C/ JUROS MENSAIS",
        "12842 VEÍCULOS NOVOS PJ % INFORMADO",
        "32758 UNIMÓVEL ESPECIAL PJ",
        "32762 CAPITAL DE GIRO PRÉ - ACIMA DE 365 DIAS",
        "32764 CAPITAL DE GIRO PRÉ - ATÉ 365 DIAS",
        "32767 CAPITAL DE GIRO PÓS - ATÉ 365 DIAS",
        "32770 CAPITAL DE GIRO PÓS - ACIMA DE 365 DIAS",
        "32779 UNIVEICULOS NOVOS ESPECIAL - PJ",
        "32781 UNIVEÍCULOS USADOS ESPECIAL - PJ",
        "32791 UNIMÓVEL - ATÉ 80% DO VALOR DO IMÓVEL PÓS - PJ",
        "32807 CAPITAL DE GIRO ATÉ 365D % INFORMADO",
        "32808 CAPITAL DE GIRO ACIMA DE 365D % INFORMADO",
        "34494 REPACTUAÇÃO CG ACIMA 365D NP PARCELADO DECRESCENTE",
        "34495 REPACTUAÇÃO CG ATÉ 365D NP PARCELADO DECRESCENTE",
        "34501 REPACTUAÇÃO CRÉDITO PJ - GIRO ATÉ 365D % INFORMADO",
        "34502 REPACTUAÇÃO CRÉDITO PJ - CG ACIMA 365D % INFORMADO",
        "34510 REPACTUAÇÃO CRÉDITO PJ - GIRO ATÉ 365D PRICE",
        "34515 REPACTUAÇÃO CRÉDITO PJ - GIRO ACIMA 365D PRICE",
        "34516 REPACTUAÇÃO CRÉDITO PJ - GIRO ATÉ 365D SACD",
        "34518 REPACTUAÇÃO CRÉDITO PJ - GIRO ACIMA 365D SACD",
        "34520 REPACTUAÇÃO CRÉDITO PJ -GIRO ATÉ 365D SACC",
        "34521 REPACTUAÇÃO CRÉDITO PJ - GIRO ACIMA DE 365D SACC",
        "35919 REPACTUAÇÃO CONTA CORRENTE PJ PRICE",
        "36880 REPACTUAÇÃO CONTA CORRENTE PJ ATÉ 365 DIAS",
        "44047 CRÉDITO ROTATIVO C/ JUROS MENSAIS PJ",
        "48930 LIMITE CCL PAR - PJ",
        "54265 CARTA DE FIANÇA BANCÁRIA",
        "56594 LIMITE CHEQUE ESPECIAL PJ",
        "67279 BENS NÃO DE USO PRÓPRIO - VENDA DE IMÓVEL - SACD",
        "69287 BENS NÃO DE USO PRÓPRIO - VENDA DE IMÓVEL PRICE",
        "74280 BENS NÃO DE USO PRÓPRIO - VENDA DE IMÓVEL - % INF",
        "76010 LIMITE CHEQUE ESPECIAL PJ 500,00 PA DIGITAL",
        "80994 LIMITE CHEQUE ESPECIAL PJ - 100,00 IAP",
        "82948 RENEG BNDU - VENDA DE VEICULO - PRICE",
        "87421 CAPITAL DE GIRO ACIMA 365D FGI PEAC - SACD",
        "98107 GUARDA-CHUVA",
        "99222 REPAC CAPITAL DE GIRO ACIMA 365D PRICE EX-ASSOCIADO",
        "102172 COTAS-PARTES PJ PRICE TX PRE",
        "106367 CONVENIO COMEVAP PJ ATE 365D PRICE",
        "106368 CONVENIO COMEVAP PJ 365D SACD",
        "106370 CONVENIO COMEVAP PJ ACIMA DE 365D PRICE",
        "106371 CONVENIO COMEVAP PJ ACIMA DE 365D SACD",
        "109128 CAPITAL DE GIRO ACIMA DE 365D - PRONAMPE –SACD",
        "114038 CAPITAL DE GIRO ACIMA DE 365D SACD",
        "68505 BENS DE NAO USO PRÓPRIO VENDA DE VEÍCULO",
        "106361 CONVENIO COMEVAP PRODUTOR RURAL PRE",
        "106366 CONVENIO COMEVAP PRODUTOR RURAL POS",
        "111887 BK AQUISICAO E COMERCIALIZACAO BNDES",
        "147531 COOPERA 13º",
        "140556 VEÍCULO HÍBRIDO NOVO - ATÉ 80% PJ SACD",
        "140559 VEÍCULO HÍBRIDO NOVO - ATÉ 80% PJ PRICE",
        "140555 VEÍCULO ELÉTRICO NOVO - ATÉ 50% PJ SACD",
        "140557 VEÍCULO ELÉTRICO NOVO - ATÉ 50% PJ PRICE",
        "140566 FOTOVOLTAICA - ATÉ 100% PJ SACD",
        "140568 FOTOVOLTAICA - ATÉ 100% PJ PRICE",
        "109922 CAPITAL DE GIRO ACIMA 365 FGI PEAC SACD",
        "143928 SICOOB VERDE ENERGIA LIMPA PJ PRICE",
        "151881 LIMITE CHEQUE ESPECIAL PJ PLUS",
        "30945 REPACTUAÇÃO CRÉDITO PF - CG ADIMA 365D % INFORMADO",
        "125903 CREDITO ROTATIVO PJ - CDI POS FIXADO",
        "99792 CAPITAL DE GIRO HABITACIONAL"
    ];

    const SET_LINHAS_INATIVAS = new Set([33028]);
    const SET_LINHAS_SUSPENSAS = new Set([87421]);

    const SET_FLEX = new Set([
        483, 2721, 6093, 10847, 12842, 30945, 32746, 32749, 32756, 32758,
        32759, 32762, 32764, 32767, 32770, 32778, 32779, 32780, 32781,
        32791, 32807, 32808, 32809, 34494, 34495, 34500, 34501, 34502,
        34503, 34504, 34506, 34510, 34515, 34516, 34518, 34519, 34520,
        34521, 35919, 36880, 44047, 48930, 49198, 63329, 67279, 68505,
        69287, 74280, 82948, 98107, 99222, 99792, 106361, 106366,
        106367, 106368, 106370, 106371, 114038, 125903, 131407, 131409,
        140553, 140554, 140555, 140556, 140557, 140559, 140561, 140562,
        140563, 140566, 140568, 140571, 143928, 147531, 147616
    ]);

    const SET_REPAC = new Set([
        6093, 30945, 34494, 34495, 34500, 34501, 34502, 34503, 34504,
        34506, 34510, 34515, 34516, 34518, 34519, 34520, 34521, 35919,
        36880, 99222
    ]);

    const SET_PORC_VISTA = new Set([48930, 49198]);
    const SET_PRAZO_MEDIO = new Set([48930, 49198]);

    const SET_ALTERA_LIMITE = new Set([
        2721, 6093, 10847, 44047, 48930, 49198, 125903
    ]);

    const SET_COMISSAO = new Set([54265]);

    /* =========================================================
       GARANTIAS
       ========================================================= */

    const SET_AVALISTA_RISCO = new Set([430, 102171]);

    const SET_AVALISTA_OBRIGATORIO = new Set([
        435, 10847, 12842, 32758, 32779, 32781, 32791, 34501, 34502,
        34510, 34515, 34516, 34518, 34520, 34521, 35919, 36880, 44047,
        48930, 56594, 76010, 80994, 102172, 106367, 106368, 106370,
        106371, 109128, 109922, 114038, 125903, 140555, 140556, 140557,
        140559, 140566, 140568, 143928, 151881, 99792
    ]);

    const SET_AVALISTA_PERMITIDO = new Set([
        483, 4922, 5689, 5691, 6093, 32746, 32749, 32756, 32759, 32778,
        32780, 32809, 2721, 34500, 34503, 34504, 34506, 34519, 49198,
        54265, 55756, 67279, 69287, 73905, 74280, 82948, 98107, 98349,
        68505, 106361, 106366, 131407, 131409, 63329, 140554, 140562,
        140553, 140561, 140563, 140571, 147616, 151887, 32762, 32764,
        32767, 32770, 32807, 32808, 34494, 34495, 99222, 111887,
        147531, 30945
    ]);

    const SET_VEICULO_PERMITIDO = new Set([
        10847, 109922, 114038, 125903, 140563, 140566, 140568, 140571,
        143928, 147531, 147616, 2721, 30945, 32746, 32749, 32762, 32764,
        32767, 32770, 32807, 32808, 32809, 34494, 34495, 34500, 34501,
        34502, 34503, 34504, 34506, 34510, 34515, 34516, 34518, 34519,
        34520, 34521, 35919, 36880, 44047, 48930, 49198, 6093, 12842,
        140553, 140554, 140555, 140556, 140557, 140559, 140561, 140562,
        32778, 32779, 32780, 32781, 68505, 82948, 54265
    ]);

    const SET_VEICULO_ZERO = new Set([
        12842, 140553, 140554, 140555, 140556, 140557, 140559, 140561,
        140562, 32778, 32779, 32780, 32781
    ]);

    const SET_CONVENIO = new Set([
        106361, 106366, 106367, 106368, 106370, 106371
    ]);

    const SET_APLICACAO = new Set([
        483, 5689, 5691, 6093, 32746, 32749, 32756, 32759, 32778, 32780,
        32809, 2721, 34500, 34503, 34504, 34506, 34519, 49198, 54265,
        67279, 69287, 74280, 82948, 68505, 106361, 106366, 131407,
        131409, 63329, 140554, 140562, 140553, 140561, 140563, 140571,
        147616, 10847, 12842, 32758, 32762, 32764, 32767, 32770, 32779,
        32781, 32791, 32807, 32808, 34494, 34495, 34501, 34502, 34510,
        34515, 34516, 34518, 34520, 34521, 35919, 36880, 44047, 48930,
        99222, 106367, 106368, 106370, 106371, 109128, 114038, 111887,
        147531, 140556, 140559, 140555, 140557, 140566, 140568, 109922,
        143928, 30945, 125903, 99792
    ]);

    const SET_URBANO_RC = new Set([
        483, 5689, 5691, 6093, 32746, 32749, 32756, 32759, 32809, 2721,
        34500, 34503, 34504, 34506, 34519, 49198, 54265, 67279, 69287,
        74280, 98107, 106361, 106366, 63329, 140563, 140571, 147616,
        10847, 32758, 32762, 32764, 32767, 32770, 32791, 32807, 32808,
        34494, 34495, 34501, 34502, 34510, 34515, 34516, 34518, 34520,
        34521, 35919, 36880, 44047, 48930, 99222, 106367, 106368,
        106370, 106371, 109128, 114038, 111887, 147531, 140566, 140568,
        109922, 143928, 30945, 125903, 99792
    ]);

    const SET_URBANO_RESIDENCIAL = new Set([131407, 131409]);
    const SET_RURAL = new Set([5689, 5691]);

    const SET_GUARDA_CHUVA = new Set([
        483, 5689, 5691, 6093, 32746, 32749, 32756, 32759, 32809, 2721,
        34500, 34503, 34504, 34506, 34519, 49198, 54265, 55756, 67279,
        69287, 73905, 74280, 98349, 106361, 106366, 131407, 131409,
        63329, 140563, 140571, 147616, 151887, 10847, 32758, 32762,
        32764, 32767, 32770, 32791, 32807, 32808, 34494, 34495, 34501,
        34502, 34510, 34515, 34516, 34518, 34520, 34521, 35919, 36880,
        44047, 48930, 56594, 76010, 80994, 99222, 106367, 106368,
        106370, 106371, 109128, 114038, 111887, 147531, 140566, 140568,
        109922, 143928, 151881, 30945, 125903, 99792
    ]);

    const SET_FUNDOS_DOCS = new Set([109128, 109922]);

    const SET_CAPITAL_GIRO = new Set([
        32762, 32764, 32767, 32770, 32807, 32808, 99792, 106367, 106368,
        106370, 106371, 109128, 109922, 114038
    ]);

    const LIMITES_PARECER_GERENTE = Object.freeze({
        32770: {
            valorMaximo: 2300000,
            prazoMaximo: 72
        },
        32762: {
            valorMaximo: 2300000,
            prazoMaximo: 48
        }
    });

    /* =========================================================
       MATRIZ DE TAXAS
       ========================================================= */

    const MATRIZ_TAXAS = [
        [151887, 0, 0, 0, 13.78],
        [151881, 0, 0, 0, 13.78],
        [98349, 0, 0, 0, 8],
        [80992, 0, 0, 0, 8],
        [55756, 0, 0, 0, 8],
        [80994, 0, 0, 0, 7.5],
        [76010, 0, 0, 0, 7.5],
        [56594, 0, 0, 0, 7.5],
        [69287, 0.5, 5, 5, 5],
        [54265, 1.7, 2.21, 3.06, 5],
        [125903, 4.75, 4.75, 4.75, 4.75],
        [33028, 1, 3.9, 3.9, 4.55],
        [2721, 1, 3.9, 3.9, 4.55],
        [49198, 1.3, 1.69, 2.34, 4.5],
        [48930, 1.3, 1.69, 2.34, 4.5],
        [32746, 1.6, 2.08, 2.88, 4.01],
        [10847, 1, 1.3, 1.8, 4],
        [6093, 1, 1.3, 1.8, 4],
        [44047, 1, 3.9, 3.9, 3.9],
        [36880, 0, 1.56, 2.16, 3.84],
        [32764, 1.6, 2.08, 2.88, 3.84],
        [32762, 1.6, 2.08, 2.88, 3.84],
        [78929, 1.2, 1.56, 2.16, 3.6],
        [78923, 1.2, 1.56, 2.16, 3.6],
        [35919, 1.2, 1.56, 2.16, 3.6],
        [34515, 1.2, 1.56, 2.16, 3.6],
        [34510, 1.2, 1.56, 2.16, 3.6],
        [155281, 3.38, 3.56, 3.56, 3.56],
        [32809, 0.9, 1.17, 1.62, 3.55],
        [32808, 0.9, 1.17, 1.62, 3.55],
        [32807, 0.9, 1.17, 1.62, 3.55],
        [82948, 0.89, 1.16, 1.6, 3.53],
        [68505, 0.89, 1.16, 1.6, 3.53],
        [32781, 0.89, 1.16, 1.6, 3.53],
        [32780, 0.89, 1.16, 1.6, 3.53],
        [32779, 0.89, 1.16, 1.6, 3.53],
        [32778, 0.89, 1.16, 1.6, 3.53],
        [12842, 0.89, 1.16, 1.6, 3.53],
        [155280, 3.3, 3.48, 3.48, 3.48],
        [155286, 3.09, 3.26, 3.26, 3.26],
        [111887, 0.85, 1.11, 1.53, 3.26],
        [32767, 0.85, 1.11, 1.53, 3.26],
        [155282, 3.07, 3.23, 3.23, 3.23],
        [155288, 3, 3.17, 3.17, 3.17],
        [155284, 2.98, 3.15, 3.15, 3.15],
        [131409, 1.6, 2.08, 2.88, 3.1],
        [131407, 1.6, 2.08, 2.88, 3.1],
        [102172, 1.2, 1.56, 2.16, 3.1],
        [102171, 1.2, 1.56, 2.16, 3.1],
        [99222, 1.2, 1.56, 2.16, 3.1],
        [78937, 1.2, 1.56, 2.16, 3.1],
        [78930, 0.6, 0.78, 1.08, 3.1],
        [78926, 1.2, 1.56, 2.16, 3.1],
        [78924, 0.6, 0.78, 1.08, 3.1],
        [63329, 1.6, 2.08, 2.88, 3.1],
        [34521, 0.6, 0.78, 1.08, 3.1],
        [34520, 0.6, 0.78, 1.08, 3.1],
        [34519, 0.6, 0.78, 1.08, 3.1],
        [34518, 0.6, 0.78, 1.08, 3.1],
        [34516, 0.6, 0.78, 1.08, 3.1],
        [34506, 0.6, 0.78, 1.08, 3.1],
        [34504, 0.6, 0.78, 1.08, 3.1],
        [34503, 1.2, 1.56, 2.16, 3.1],
        [34502, 1.2, 1.56, 2.16, 3.1],
        [34501, 1.2, 1.56, 2.16, 3.1],
        [34500, 1.2, 1.56, 2.16, 3.1],
        [34495, 0.9, 1.17, 1.62, 3.1],
        [34494, 0.9, 1.17, 1.62, 3.1],
        [32758, 1.6, 2.08, 2.88, 3.1],
        [32756, 1.6, 2.08, 2.88, 3.1],
        [483, 1.6, 2.08, 2.88, 3.1],
        [430, 1.2, 1.56, 2.16, 3.1],
        [106371, 0.9, 1.17, 1.62, 3],
        [106370, 1.6, 2.08, 2.88, 3],
        [106368, 0.9, 1.17, 1.62, 3],
        [106367, 1.6, 2.08, 2.88, 3],
        [106366, 0.9, 1.17, 1.62, 3],
        [106361, 1.6, 2.08, 2.88, 3],
        [114038, 0.9, 1.17, 1.62, 2.96],
        [109128, 0, 0, 0, 2.96],
        [87421, 0.9, 1.17, 1.62, 2.96],
        [32770, 0.9, 1.17, 1.62, 2.96],
        [30945, 0.9, 1.17, 1.62, 2.96],
        [435, 0.9, 1.17, 1.62, 2.96],
        [98107, 2.5, 2.5, 2.5, 2.5],
        [73905, 2.12, 2.42, 2.42, 2.42],
        [4922, 2.12, 2.42, 2.42, 2.42],
        [32791, 0.5, 0.65, 0.9, 2.19],
        [32759, 0.5, 0.65, 0.9, 2.19],
        [99792, 0, 1, 1, 2],
        [147616, 1.75, 1.75, 1.75, 1.75],
        [147531, 1.75, 1.75, 1.75, 1.75],
        [109922, 1.75, 1.75, 1.75, 1.75],
        [143928, 1.4, 1.4, 1.4, 1.4],
        [32749, 0.36, 0.47, 0.65, 1.14],
        [5691, 0.1, 0.2, 0.2, 0.2],
        [5689, 0.1, 0.2, 0.2, 0.2],
        [151747, 0, 0, 0, 0],
        [151746, 0, 0, 0, 0],
        [151745, 0, 0, 0, 0],
        [151695, 0, 0, 0, 0],
        [151683, 0, 0, 0, 0],
        [151673, 0, 0, 0, 0],
        [140571, 0, 0, 0, 0],
        [140568, 0, 0, 0, 0],
        [140566, 0, 0, 0, 0],
        [140563, 0, 0, 0, 0],
        [140562, 0, 0, 0, 0],
        [140561, 0, 0, 0, 0],
        [140559, 0, 0, 0, 0],
        [140557, 0, 0, 0, 0],
        [140556, 0, 0, 0, 0],
        [140555, 0, 0, 0, 0],
        [140554, 0, 0, 0, 0],
        [140553, 0, 0, 0, 0],
        [74280, 0, 0, 0, 0],
        [67279, 0, 0, 0, 0]
    ];

    const TAXAS_POR_CODIGO = new Map();

    MATRIZ_TAXAS.forEach(item => {
        TAXAS_POR_CODIGO.set(item[0], {
            diretor: item[1],
            negocios: item[2],
            gerente: item[3],
            balcao: item[4]
        });
    });

    /* =========================================================
       ELEMENTOS
       ========================================================= */

    const e = {
        tipoPessoa: $("tipoPessoaCredito"),
        linha: $("linhaCreditoCondicoes"),
        valor: $("valorOperacaoCredito"),
        prazo: $("prazoOperacaoCredito"),
        sistema: $("sistemaAmortizacaoCredito"),
        taxa: $("taxaOperacaoCredito"),
        risco: $("riscoOperacaoCredito"),
        perda: $("perdaEsperadaCredito"),
        flex: $("flexCredito"),
        repac: $("repacTroco"),
        justRepac: $("justRepac"),
        porcVista: $("porcVista"),
        prazoMedio: $("prazoMedio"),
        alteraLimite: $("alteraLimite"),
        valorLimiteAnterior: $("valorLimiteAnterior"),
        pix: $("possuiPix"),
        justPix: $("justPix"),
        cotas: $("cotasAtraso"),
        crl: $("crlAtivo"),
        serasa: $("possuiSerasa"),
        justSerasa: $("justSerasa"),
        bacen: $("possuiBacen"),
        justBacen: $("justBacen"),
        faturamento: $("faturamentoAnualCredito"),
        docContabil: $("documentacaoContabilCredito"),
        emitente: $("maisEmitente"),
        avalista: $("garantiaAvalista"),
        veiculo: $("garantiaVeiculo"),
        recebiveis: $("garantiaRecebiveis"),
        aplicacao: $("garantiaAplicacao"),
        maquininha: $("garantiaMaquininha"),
        urbano: $("garantiaImovelUrbano"),
        rural: $("garantiaImovelRural"),
        guarda: $("garantiaGuardaChuva"),
        semGarantia: $("semGarantiaCredito"),
        justSemGarantia: $("justSemGarantia"),
        contratoMae: $("contratoMae"),
        justDispensa: $("justDispensaGarantia"),
        parecerGerente: $("parecerGerente"),
        btnSimular: $("btnSimularCondicoesCredito"),
        btnLimpar: $("btnLimparCondicoesCredito")
    };

    /* =========================================================
       UTILITÁRIOS
       ========================================================= */

    function numero(valor) {
        if (typeof valor === "number") {
            return Number.isFinite(valor) ? valor : 0;
        }

        if (valor === null || valor === undefined || valor === "") {
            return 0;
        }

        let texto = String(valor)
            .trim()
            .replace(/R\$/gi, "")
            .replace(/\s/g, "");

        if (texto.includes(",")) {
            texto = texto
                .replace(/\./g, "")
                .replace(",", ".");
        }

        const resultado = Number(texto);

        return Number.isFinite(resultado)
            ? resultado
            : 0;
    }

    function moeda(valor) {
        return Number(valor || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }

    function percentual(valor) {
        if (!Number.isFinite(Number(valor))) {
            return "-";
        }

        return Number(valor).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4
        }) + "% a.m.";
    }

    function setTexto(id, texto) {
        const elemento = $(id);

        if (elemento) {
            elemento.textContent = texto;
        }
    }

    function setHidden(id, hidden) {
        const elemento = $(id);

        if (elemento) {
            elemento.hidden = hidden;
        }
    }

    function vazio(valor) {
        return String(valor ?? "").trim() === "";
    }

    function codigoLinhaSelecionada() {
        const valor = e.linha?.value || "";
        const match = valor.match(/^\s*(\d+)/);

        return match
            ? Number(match[1])
            : null;
    }

    function nomeLinhaSelecionada() {
        return e.linha?.value || "";
    }

    function linhaDisponivel(codigo) {
        return !!codigo &&
            !SET_LINHAS_INATIVAS.has(codigo) &&
            !SET_LINHAS_SUSPENSAS.has(codigo);
    }

    function formatarMonetario(campo) {
        if (!campo) return;

        campo.value = numero(campo.value).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function sugestaoSistema(nome) {
        const n = String(nome || "").toUpperCase();

        if (n.includes("PRICE")) {
            return "PRICE";
        }

        if (
            n.includes("SACD") ||
            n.includes("SACC") ||
            n.includes("DECRESCENTE")
        ) {
            return "SAC";
        }

        return null;
    }

    /* =========================================================
       LINHAS
       ========================================================= */

    function carregarLinhas() {
        const tipo = e.tipoPessoa.value;
        const linhas = tipo === "PF"
            ? LINHAS_PF
            : tipo === "PJ"
                ? LINHAS_PJ
                : [];

        e.linha.innerHTML = "";

        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = tipo
            ? "Selecione a linha de crédito"
            : "Selecione primeiro o tipo de pessoa";

        e.linha.appendChild(opt);

        linhas.forEach(linha => {
            const option = document.createElement("option");
            option.value = linha;
            option.textContent = linha;
            e.linha.appendChild(option);
        });

        e.linha.disabled = !tipo;

        limparPerfilLinha();
    }

    /* =========================================================
       MATRIZ DE TAXAS
       ========================================================= */

    function obterTaxas(codigo) {
        return TAXAS_POR_CODIGO.get(codigo) || null;
    }

    function menorTaxaValida(taxas) {
        if (!taxas) return null;

        const valores = [
            taxas.diretor,
            taxas.negocios,
            taxas.gerente,
            taxas.balcao
        ].filter(v => Number(v) > 0);

        if (!valores.length) {
            return null;
        }

        return Math.min(...valores);
    }

    function identificarAlcada(taxa, taxas) {
        if (!taxas) {
            return {
                codigo: "SEM_MATRIZ",
                texto: "Taxas não cadastradas"
            };
        }

        if (taxas.balcao <= 0) {
            return {
                codigo: "SEM_TAXA",
                texto: "Linha sem taxa parametrizada"
            };
        }

        if (taxa <= 0) {
            return {
                codigo: "NAO_INFORMADA",
                texto: "Informe a taxa"
            };
        }

        if (taxa >= taxas.balcao) {
            return {
                codigo: "BALCAO",
                texto: "Taxa Balcão"
            };
        }

        if (taxas.gerente > 0 && taxa >= taxas.gerente) {
            return {
                codigo: "GERENTE",
                texto: "Gerente de Agência"
            };
        }

        if (taxas.negocios > 0 && taxa >= taxas.negocios) {
            return {
                codigo: "NEGOCIOS",
                texto: "Gerente de Apoio a Negócios"
            };
        }

        if (taxas.diretor > 0 && taxa >= taxas.diretor) {
            return {
                codigo: "DIRETOR",
                texto: "Diretor / Superintendente"
            };
        }

        return {
            codigo: "ABAIXO",
            texto: "Abaixo da menor alçada cadastrada"
        };
    }

    function carregarTaxas() {
        const codigo = codigoLinhaSelecionada();
        const taxas = obterTaxas(codigo);

        if (!taxas) {
            setTexto("resultadoTaxaBalcao", "-");
            setTexto("resultadoTaxaGerente", "-");
            setTexto("resultadoTaxaNegocios", "-");
            setTexto("resultadoTaxaDiretor", "-");
            setTexto("resultadoAlcadaTaxa", "Taxas não cadastradas");

            e.taxa.value = "";
            e.taxa.readOnly = false;

            return;
        }

        setTexto(
            "resultadoTaxaBalcao",
            taxas.balcao > 0
                ? percentual(taxas.balcao)
                : "Não parametrizada"
        );

        setTexto(
            "resultadoTaxaGerente",
            taxas.gerente > 0
                ? percentual(taxas.gerente)
                : "Sem alçada"
        );

        setTexto(
            "resultadoTaxaNegocios",
            taxas.negocios > 0
                ? percentual(taxas.negocios)
                : "Sem alçada"
        );

        setTexto(
            "resultadoTaxaDiretor",
            taxas.diretor > 0
                ? percentual(taxas.diretor)
                : "Sem alçada"
        );

        if (taxas.balcao > 0) {
            e.taxa.value = taxas.balcao.toFixed(2);
        } else {
            e.taxa.value = "";
        }

        atualizarComportamentoTaxa();
        atualizarAlcada();
    }

    function atualizarComportamentoTaxa() {
        const codigo = codigoLinhaSelecionada();
        const taxas = obterTaxas(codigo);

        if (!codigo) {
            e.taxa.readOnly = false;
            return;
        }

        if (SET_COMISSAO.has(codigo)) {
            e.taxa.readOnly = false;
            return;
        }

        if (!SET_FLEX.has(codigo)) {
            e.taxa.readOnly = !!(taxas && taxas.balcao > 0);
            return;
        }

        const flex = e.flex.value;

        if (flex === "NAO") {
            if (taxas && taxas.balcao > 0) {
                e.taxa.value = taxas.balcao.toFixed(2);
            }

            e.taxa.readOnly = true;
        } else {
            e.taxa.readOnly = false;
        }
    }

    function atualizarAlcada() {
        const codigo = codigoLinhaSelecionada();
        const taxas = obterTaxas(codigo);
        const taxa = numero(e.taxa.value);

        const resultado = identificarAlcada(taxa, taxas);

        setTexto("resultadoAlcadaTaxa", resultado.texto);

        const mensagem = $("mensagemTaxaCredito");

        if (!mensagem) return;

        if (!taxas) {
            mensagem.innerHTML =
                "<strong>Atenção:</strong> não há taxas cadastradas para esta linha.";
            return;
        }

        if (taxas.balcao <= 0) {
            mensagem.innerHTML =
                "<strong>Atenção:</strong> a matriz possui taxa igual a zero para esta linha. Consulte a regra específica de precificação.";
            return;
        }

        if (resultado.codigo === "ABAIXO") {
            mensagem.innerHTML =
                "<strong>Atenção:</strong> a taxa informada está abaixo da menor alçada cadastrada.";
            return;
        }

        if (resultado.codigo === "NAO_INFORMADA") {
            mensagem.innerHTML =
                "<strong>Atenção:</strong> informe a taxa da operação.";
            return;
        }

        mensagem.innerHTML =
            "<strong>Alçada identificada:</strong> " +
            resultado.texto +
            " para a taxa de " +
            percentual(taxa) +
            ".";
    }

    /* =========================================================
       CAMPOS CONDICIONAIS
       ========================================================= */

    function esconderCondicionais() {
        [
            "blocoFlexCredito",
            "blocoRepacTroco",
            "blocoJustRepac",
            "blocoPorcVista",
            "blocoPrazoMedio",
            "blocoAlteraLimite",
            "blocoValorLimiteAnterior",
            "blocoPix",
            "blocoJustPix",
            "blocoCotas",
            "blocoCrl",
            "blocoSerasa",
            "blocoJustSerasa",
            "blocoBacen",
            "blocoJustBacen",
            "blocoFaturamento",
            "blocoBalanco",
            "blocoEmitente",
            "blocoJustSemGarantia",
            "blocoContratoMae",
            "blocoDispensaGarantia",
            "blocoParecerGerente"
        ].forEach(id => setHidden(id, true));
    }

    function mostrarPerfilLinha() {
        const codigo = codigoLinhaSelecionada();

        esconderCondicionais();

        if (!codigo || !linhaDisponivel(codigo)) {
            return;
        }

        setHidden("blocoFlexCredito", !SET_FLEX.has(codigo));
        setHidden("blocoRepacTroco", !SET_REPAC.has(codigo));
        setHidden("blocoPorcVista", !SET_PORC_VISTA.has(codigo));
        setHidden("blocoPrazoMedio", !SET_PRAZO_MEDIO.has(codigo));
        setHidden("blocoAlteraLimite", !SET_ALTERA_LIMITE.has(codigo));

        setHidden("blocoPix", false);
        setHidden("blocoCotas", false);
        setHidden("blocoCrl", false);
        setHidden("blocoSerasa", false);
        setHidden("blocoBacen", false);
        setHidden("blocoFaturamento", false);
        setHidden("blocoBalanco", false);
        setHidden("blocoEmitente", false);

        atualizarCondicionais();
    }

    function atualizarCondicionais() {
        const codigo = codigoLinhaSelecionada();

        setHidden(
            "blocoJustRepac",
            !(SET_REPAC.has(codigo) && e.repac.value === "SIM")
        );

        setHidden(
            "blocoValorLimiteAnterior",
            !(SET_ALTERA_LIMITE.has(codigo) && e.alteraLimite.value === "SIM")
        );

        setHidden(
            "blocoJustPix",
            e.pix.value !== "NAO"
        );

        setHidden(
            "blocoJustSerasa",
            e.serasa.value !== "SIM"
        );

        setHidden(
            "blocoJustBacen",
            e.bacen.value !== "SIM"
        );

        setHidden(
            "blocoJustSemGarantia",
            !e.semGarantia.checked
        );

        setHidden(
            "blocoContratoMae",
            !e.guarda.checked
        );

        atualizarDocumentacaoContabil();
        atualizarExcecoesGerente();
    }

    function atualizarDocumentacaoContabil() {
        const faturamento = numero(e.faturamento.value);

        if (!e.docContabil) return;

        if (faturamento <= 0) {
            e.docContabil.value = "Informe o faturamento anual";
            return;
        }

        if (faturamento <= 400000) {
            e.docContabil.value = "Balanço Perguntado obrigatório";
            return;
        }

        e.docContabil.value = "Balanço Patrimonial + DRE Consolidado obrigatórios";
    }

    /* =========================================================
       GARANTIAS
       ========================================================= */

    function configGarantias(codigo) {
        let avalista = "NAO";

        if (SET_AVALISTA_OBRIGATORIO.has(codigo)) {
            avalista = "OBRIGATORIO";
        } else if (SET_AVALISTA_RISCO.has(codigo)) {
            avalista = "RISCO";
        } else if (SET_AVALISTA_PERMITIDO.has(codigo)) {
            avalista = "PERMITIDO";
        }

        return {
            avalista,
            veiculo: SET_VEICULO_PERMITIDO.has(codigo),
            zeroKm: SET_VEICULO_ZERO.has(codigo),
            recebiveis: SET_CONVENIO.has(codigo),
            aplicacao: SET_APLICACAO.has(codigo),
            urbano: SET_URBANO_RESIDENCIAL.has(codigo)
                ? "RESIDENCIAL"
                : SET_URBANO_RC.has(codigo)
                    ? "RESIDENCIAL/COMERCIAL"
                    : "NAO",
            rural: SET_RURAL.has(codigo),
            guarda: SET_GUARDA_CHUVA.has(codigo)
        };
    }

    function configurarCheckbox(campo, labelId, permitido, obrigatorio = false) {
        if (!campo) return;

        campo.disabled = !permitido;

        if (!permitido) {
            campo.checked = false;
        }

        const label = $(labelId);

        if (label) {
            label.style.opacity = permitido ? "1" : "0.45";
            label.style.cursor = permitido ? "pointer" : "not-allowed";
        }

        if (obrigatorio) {
            campo.checked = true;
        }
    }

    function atualizarGarantiasDisponiveis() {
        const codigo = codigoLinhaSelecionada();

        if (!codigo || !linhaDisponivel(codigo)) {
            [
                [e.avalista, "labelGarantiaAvalista"],
                [e.veiculo, "labelGarantiaVeiculo"],
                [e.recebiveis, "labelGarantiaRecebiveis"],
                [e.aplicacao, "labelGarantiaAplicacao"],
                [e.urbano, "labelGarantiaUrbano"],
                [e.rural, "labelGarantiaRural"],
                [e.guarda, "labelGarantiaGuarda"],
                [e.semGarantia, "labelSemGarantia"]
            ].forEach(item => configurarCheckbox(item[0], item[1], false));

            atualizarRegrasGarantias();
            return;
        }

        const config = configGarantias(codigo);

        configurarCheckbox(
            e.avalista,
            "labelGarantiaAvalista",
            config.avalista !== "NAO",
            config.avalista === "OBRIGATORIO"
        );

        configurarCheckbox(
            e.veiculo,
            "labelGarantiaVeiculo",
            config.veiculo
        );

        configurarCheckbox(
            e.recebiveis,
            "labelGarantiaRecebiveis",
            config.recebiveis
        );

        configurarCheckbox(
            e.aplicacao,
            "labelGarantiaAplicacao",
            config.aplicacao
        );

        configurarCheckbox(
            e.urbano,
            "labelGarantiaUrbano",
            config.urbano !== "NAO"
        );

        configurarCheckbox(
            e.rural,
            "labelGarantiaRural",
            config.rural
        );

        configurarCheckbox(
            e.guarda,
            "labelGarantiaGuarda",
            config.guarda
        );

        configurarCheckbox(
            e.semGarantia,
            "labelSemGarantia",
            config.avalista !== "OBRIGATORIO"
        );

        setTexto(
            "descGarantiaAvalista",
            config.avalista === "OBRIGATORIO"
                ? "Obrigatório"
                : config.avalista === "RISCO"
                    ? "Conforme classificação de risco"
                    : config.avalista === "PERMITIDO"
                        ? "Opcional"
                        : "Não permitido"
        );

        setTexto(
            "descGarantiaVeiculo",
            config.zeroKm
                ? "Linha com regra específica de veículo novo"
                : config.veiculo
                    ? "Opcional"
                    : "Não permitido"
        );

        setTexto(
            "descGarantiaUrbano",
            config.urbano === "RESIDENCIAL"
                ? "Residencial"
                : config.urbano === "RESIDENCIAL/COMERCIAL"
                    ? "Residencial / Comercial"
                    : "Não permitido"
        );

        if (config.avalista === "OBRIGATORIO") {
            e.semGarantia.checked = false;
        }

        atualizarRegrasGarantias();
    }

    function possuiGarantiaReal() {
        return e.veiculo.checked ||
            e.recebiveis.checked ||
            e.aplicacao.checked ||
            e.urbano.checked ||
            e.rural.checked;
    }

    function possuiGarantiaSelecionada() {
        return e.avalista.checked ||
            e.veiculo.checked ||
            e.recebiveis.checked ||
            e.aplicacao.checked ||
            e.urbano.checked ||
            e.rural.checked ||
            e.guarda.checked ||
            e.semGarantia.checked;
    }

    function tratarExclusividadeGarantias(campoAlterado) {
        const codigo = codigoLinhaSelecionada();
        const config = configGarantias(codigo);

        if (campoAlterado === e.semGarantia && e.semGarantia.checked) {
            [
                e.avalista,
                e.veiculo,
                e.recebiveis,
                e.aplicacao,
                e.urbano,
                e.rural,
                e.guarda
            ].forEach(campo => {
                if (campo && !campo.disabled) {
                    campo.checked = false;
                }
            });
        }

        if (
            campoAlterado !== e.semGarantia &&
            campoAlterado.checked &&
            e.semGarantia
        ) {
            e.semGarantia.checked = false;
        }

        if (config.avalista === "OBRIGATORIO") {
            e.avalista.checked = true;
            e.semGarantia.checked = false;
        }

        atualizarCondicionais();
        atualizarRegrasGarantias();
        atualizarEnquadramento();
    }

    function atualizarRegrasGarantias() {
        const container = $("regrasGarantiasCredito");

        if (!container) return;

        const regras = [];

        if (e.avalista.checked) {
            regras.push(
                "<strong>Avalista:</strong> informar CPF/CNPJ e Nome/Razão Social. Para PJ, validar a condição de garantia e a participação dos sócios como avalistas."
            );
        }

        if (e.veiculo.checked) {
            regras.push(
                "<strong>Veículo:</strong> informar tipo do veículo, Orçamento/NF/CRV, existência de seguro, apólice quando houver, justificativa quando não houver seguro, tipo de garantia e situação do licenciamento em SP/RJ."
            );
        }

        if (e.recebiveis.checked) {
            regras.push(
                "<strong>Cessão de Direitos - Produtos/Serviços:</strong> informar valor da garantia e documentação da cessão, com anexos e descrição."
            );
        }

        if (e.aplicacao.checked) {
            regras.push(
                "<strong>Aplicação Financeira:</strong> informar valor da garantia, modo de aplicação, tipo da aplicação, conta corrente e número da aplicação."
            );

            regras.push(
                "<strong>Documentação de Fundos:</strong> CND Receita Federal e Faturamento Receita Federal são aplicáveis à garantia de fundos."
            );
        }

        if (e.urbano.checked) {
            regras.push(
                "<strong>Imóvel Urbano:</strong> informar tipo do imóvel, residência do proprietário, disponibilidade de outros meios para quitação, vínculo com outras operações, contrato de compra e venda, matrícula atualizada, avaliação, construção/averbação, alienação para PJ e certidão objeto e pé quando aplicável."
            );
        }

        if (e.rural.checked) {
            regras.push(
                "<strong>Imóvel Rural:</strong> informar tipo do imóvel, residência do proprietário, outros meios de quitação, vínculos, certidão objeto e pé, contrato de compra e venda, matrícula, avaliação, CAR, CCIR, INCRA, NIRF e situação de construção/averbação."
            );
        }

        if (e.guarda.checked) {
            regras.push(
                "<strong>Limite Guarda-Chuva:</strong> informar o número do Contrato-Mãe."
            );
        }

        if (e.semGarantia.checked) {
            regras.push(
                "<strong>Sem Garantias:</strong> exige justificativa e é incompatível com qualquer outra garantia."
            );
        }

        const codigo = codigoLinhaSelecionada();

        if (
            e.aplicacao.checked ||
            SET_FUNDOS_DOCS.has(codigo)
        ) {
            regras.push(
                "<strong>CND/Faturamento RF:</strong> documentação obrigatória conforme regra de fundos."
            );
        }

        if (!regras.length) {
            container.innerHTML = `
                <div class="documentos-observacao">
                    Selecione uma garantia para visualizar as condições e documentos.
                </div>
            `;
            return;
        }

        container.innerHTML = regras
            .map(regra => `
                <div class="documentos-observacao">
                    ${regra}
                </div>
            `)
            .join("");
    }

    /* =========================================================
       EXCEÇÕES DO GERENTE
       ========================================================= */

    function dadosExcecaoGerente() {
        const codigo = codigoLinhaSelecionada();
        const valor = numero(e.valor.value);
        const prazo = Math.trunc(numero(e.prazo.value));

        const semGarantiaReal =
            SET_CAPITAL_GIRO.has(codigo) &&
            prazo > 36 &&
            !possuiGarantiaReal();

        const limite = LIMITES_PARECER_GERENTE[codigo];

        const excedeuValor =
            !!limite &&
            valor > limite.valorMaximo;

        const excedeuPrazo =
            !!limite &&
            prazo > limite.prazoMaximo;

        return {
            semGarantiaReal,
            excedeuValor,
            excedeuPrazo,
            parecerObrigatorio:
                semGarantiaReal ||
                excedeuValor ||
                excedeuPrazo
        };
    }

    function atualizarExcecoesGerente() {
        const dados = dadosExcecaoGerente();

        setHidden(
            "blocoDispensaGarantia",
            !dados.semGarantiaReal
        );

        setHidden(
            "blocoParecerGerente",
            !dados.parecerObrigatorio
        );
    }

    /* =========================================================
       RESUMO DA LINHA
       ========================================================= */

    function atualizarResumoLinha() {
        const codigo = codigoLinhaSelecionada();
        const nome = nomeLinhaSelecionada();

        if (!codigo) {
            limparResumoLinha();
            return;
        }

        setTexto("resultadoCodigoLinha", String(codigo));

        setTexto(
            "resultadoTipoPessoa",
            e.tipoPessoa.value === "PF"
                ? "Pessoa Física"
                : e.tipoPessoa.value === "PJ"
                    ? "Pessoa Jurídica"
                    : "-"
        );

        let situacao = "Ativa";

        if (SET_LINHAS_INATIVAS.has(codigo)) {
            situacao = "Não existe mais";
        }

        if (SET_LINHAS_SUSPENSAS.has(codigo)) {
            situacao = "Suspensa";
        }

        setTexto("resultadoSituacaoLinha", situacao);

        setTexto(
            "resultadoPermiteFlex",
            SET_COMISSAO.has(codigo)
                ? "Comissão"
                : SET_FLEX.has(codigo)
                    ? "Sim"
                    : "Não"
        );

        setTexto(
            "resultadoRepac",
            SET_REPAC.has(codigo)
                ? "Sim"
                : "Não"
        );

        setTexto(
            "resultadoAlteraLimite",
            SET_ALTERA_LIMITE.has(codigo)
                ? "Sim/Não"
                : "Não aplicável"
        );

        setTexto(
            "resultadoPorcentagemVista",
            SET_PORC_VISTA.has(codigo)
                ? "Obrigatório"
                : "Não aplicável"
        );

        setTexto(
            "resultadoPrazoMedio",
            SET_PRAZO_MEDIO.has(codigo)
                ? "Obrigatório"
                : "Não aplicável"
        );

        setTexto(
            "resultadoNomeLinhaCredito",
            nome
        );

        atualizarListaRegrasLinha();
    }

    function atualizarListaRegrasLinha() {
        const container = $("listaRegrasLinhaCredito");

        if (!container) return;

        const codigo = codigoLinhaSelecionada();

        if (!codigo) {
            container.innerHTML = "";
            return;
        }

        const regras = [];

        if (SET_LINHAS_INATIVAS.has(codigo)) {
            regras.push("A linha não existe mais na matriz.");
        } else if (SET_LINHAS_SUSPENSAS.has(codigo)) {
            regras.push("A linha está suspensa.");
        } else {
            regras.push("Linha disponível conforme a matriz atual utilizada pelo simulador.");
        }

        if (SET_COMISSAO.has(codigo)) {
            regras.push("Linha tratada por comissão.");
        } else if (SET_FLEX.has(codigo)) {
            regras.push("A flexibilização da taxa pode ser informada.");
        } else {
            regras.push("A linha não possui flexibilização de taxa na matriz de regras.");
        }

        if (SET_REPAC.has(codigo)) {
            regras.push("Exige informação sobre REPAC com troco.");
        }

        if (SET_PORC_VISTA.has(codigo)) {
            regras.push("Exige % de recebimento à vista.");
        }

        if (SET_PRAZO_MEDIO.has(codigo)) {
            regras.push("Exige prazo médio de recebimento.");
        }

        if (SET_ALTERA_LIMITE.has(codigo)) {
            regras.push("Exige informação sobre alteração de limite e, se Sim, valor do limite anterior.");
        }

        regras.push("PIX deve ser informado; se Não, exige justificativa.");
        regras.push("Cotas de capital em atraso geram alerta e impedimento na liberação.");
        regras.push("SERASA e BACEN possuem regra de bloqueio quando houver anotação.");
        regras.push("O faturamento anual define a documentação contábil necessária.");
        regras.push("Até R$ 400.000,00: Balanço Perguntado. A partir de R$ 400.000,01: Balanço Patrimonial + DRE Consolidado.");

        const taxas = obterTaxas(codigo);

        if (taxas && taxas.balcao > 0) {
            regras.push(
                "Taxa Balcão cadastrada: " +
                percentual(taxas.balcao) +
                "."
            );
        } else {
            regras.push("A linha não possui taxa de balcão parametrizada na tabela informada.");
        }

        if (SET_CAPITAL_GIRO.has(codigo)) {
            regras.push("Capital de Giro com prazo superior a 36 meses sem garantia real exige justificativa técnica.");
        }

        const limite = LIMITES_PARECER_GERENTE[codigo];

        if (limite) {
            regras.push(
                "Limite interno: " +
                moeda(limite.valorMaximo) +
                " e " +
                limite.prazoMaximo +
                " meses."
            );
        }

        container.innerHTML = regras
            .map(regra => `
                <div class="documentos-observacao">
                    ${regra}
                </div>
            `)
            .join("");
    }

    function limparResumoLinha() {
        [
            "resultadoCodigoLinha",
            "resultadoTipoPessoa",
            "resultadoSituacaoLinha",
            "resultadoPermiteFlex",
            "resultadoRepac",
            "resultadoAlteraLimite",
            "resultadoPorcentagemVista",
            "resultadoPrazoMedio"
        ].forEach(id => setTexto(id, "-"));

        setTexto(
            "resultadoNomeLinhaCredito",
            "Nenhuma linha selecionada"
        );

        const lista = $("listaRegrasLinhaCredito");

        if (lista) {
            lista.innerHTML = "";
        }
    }

    /* =========================================================
       CÁLCULO FINANCEIRO
       ========================================================= */

    function calcularPrice(valor, taxaPercentual, prazo) {
        if (valor <= 0 || prazo <= 0) {
            return [];
        }

        const taxa = taxaPercentual / 100;

        let parcela;

        if (taxa === 0) {
            parcela = valor / prazo;
        } else {
            parcela =
                valor *
                (
                    taxa *
                    Math.pow(1 + taxa, prazo)
                ) /
                (
                    Math.pow(1 + taxa, prazo) - 1
                );
        }

        let saldo = valor;
        const parcelas = [];

        for (let n = 1; n <= prazo; n++) {
            const saldoInicial = saldo;
            const juros = saldoInicial * taxa;

            let amortizacao =
                parcela - juros;

            let valorParcela =
                parcela;

            if (n === prazo) {
                amortizacao = saldoInicial;
                valorParcela = amortizacao + juros;
            }

            saldo = Math.max(
                0,
                saldoInicial - amortizacao
            );

            parcelas.push({
                numero: n,
                saldoInicial,
                amortizacao,
                juros,
                parcela: valorParcela,
                saldoFinal: saldo
            });
        }

        return parcelas;
    }

    function calcularSac(valor, taxaPercentual, prazo) {
        if (valor <= 0 || prazo <= 0) {
            return [];
        }

        const taxa =
            taxaPercentual / 100;

        const amortizacaoBase =
            valor / prazo;

        let saldo = valor;

        const parcelas = [];

        for (let n = 1; n <= prazo; n++) {
            const saldoInicial = saldo;

            const juros =
                saldoInicial * taxa;

            const amortizacao =
                n === prazo
                    ? saldoInicial
                    : amortizacaoBase;

            const parcela =
                amortizacao + juros;

            saldo = Math.max(
                0,
                saldoInicial - amortizacao
            );

            parcelas.push({
                numero: n,
                saldoInicial,
                amortizacao,
                juros,
                parcela,
                saldoFinal: saldo
            });
        }

        return parcelas;
    }

    function calcularParcelas() {
        const valor =
            numero(e.valor.value);

        const prazo =
            Math.trunc(numero(e.prazo.value));

        const taxa =
            numero(e.taxa.value);

        if (e.sistema.value === "SAC") {
            return calcularSac(
                valor,
                taxa,
                prazo
            );
        }

        return calcularPrice(
            valor,
            taxa,
            prazo
        );
    }

    function preencherResultadoFinanceiro(parcelas) {
        const valor =
            numero(e.valor.value);

        const prazo =
            Math.trunc(numero(e.prazo.value));

        const taxa =
            numero(e.taxa.value);

        if (!parcelas.length) {
            limparResultadoFinanceiro();
            return;
        }

        const primeira =
            parcelas[0];

        const ultima =
            parcelas[parcelas.length - 1];

        const totalJuros =
            parcelas.reduce(
                (total, item) => total + item.juros,
                0
            );

        const totalPago =
            parcelas.reduce(
                (total, item) => total + item.parcela,
                0
            );

        const taxaAnual =
            (
                Math.pow(
                    1 + taxa / 100,
                    12
                ) - 1
            ) * 100;

        setTexto(
            "resultadoParcelaCredito",
            moeda(primeira.parcela)
        );

        setTexto(
            "resultadoValorOperacaoCredito",
            moeda(valor)
        );

        setTexto(
            "resultadoPrazoCredito",
            prazo + " meses"
        );

        setTexto(
            "resultadoTaxaMensalCredito",
            percentual(taxa)
        );

        setTexto(
            "resultadoTaxaAnualCredito",
            taxaAnual.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4
            }) + "% a.a."
        );

        setTexto(
            "resultadoPrimeiraParcelaCredito",
            moeda(primeira.parcela)
        );

        setTexto(
            "resultadoUltimaParcelaCredito",
            moeda(ultima.parcela)
        );

        setTexto(
            "resultadoJurosCredito",
            moeda(totalJuros)
        );

        setTexto(
            "resultadoTotalCredito",
            moeda(totalPago)
        );
    }

    function preencherTabela(parcelas) {
        const tbody =
            $("tabelaParcelasCredito");

        if (!tbody) return;

        tbody.innerHTML = "";

        parcelas.forEach(item => {
            const tr =
                document.createElement("tr");

            tr.innerHTML = `
                <td>${item.numero}</td>
                <td>${moeda(item.saldoInicial)}</td>
                <td>${moeda(item.amortizacao)}</td>
                <td>${moeda(item.juros)}</td>
                <td>${moeda(item.parcela)}</td>
                <td>${moeda(item.saldoFinal)}</td>
            `;

            tbody.appendChild(tr);
        });
    }

    function limparTabela() {
        const tbody =
            $("tabelaParcelasCredito");

        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="sem-dados">
                    Realize uma simulação para visualizar as parcelas.
                </td>
            </tr>
        `;
    }

    function limparResultadoFinanceiro() {
        setTexto("resultadoParcelaCredito", "R$ 0,00");
        setTexto("resultadoValorOperacaoCredito", "R$ 0,00");
        setTexto("resultadoPrazoCredito", "0 meses");
        setTexto("resultadoTaxaMensalCredito", "0,00% a.m.");
        setTexto("resultadoTaxaAnualCredito", "0,00% a.a.");
        setTexto("resultadoPrimeiraParcelaCredito", "R$ 0,00");
        setTexto("resultadoUltimaParcelaCredito", "R$ 0,00");
        setTexto("resultadoJurosCredito", "R$ 0,00");
        setTexto("resultadoTotalCredito", "R$ 0,00");
    }

    /* =========================================================
       VALIDAÇÃO / ENQUADRAMENTO
       ========================================================= */

    function validarOperacao() {
        const alertas = [];

        const codigo =
            codigoLinhaSelecionada();

        const valor =
            numero(e.valor.value);

        const prazo =
            Math.trunc(numero(e.prazo.value));

        const taxa =
            numero(e.taxa.value);

        if (!e.tipoPessoa.value) {
            alertas.push({
                tipo: "erro",
                texto: "Selecione o tipo de pessoa."
            });
        }

        if (!codigo) {
            alertas.push({
                tipo: "erro",
                texto: "Selecione a linha de crédito."
            });

            return alertas;
        }

        if (SET_LINHAS_INATIVAS.has(codigo)) {
            alertas.push({
                tipo: "erro",
                texto: "A linha selecionada não existe mais na matriz."
            });
        }

        if (SET_LINHAS_SUSPENSAS.has(codigo)) {
            alertas.push({
                tipo: "erro",
                texto: "A linha selecionada está suspensa."
            });
        }

        if (valor <= 0) {
            alertas.push({
                tipo: "erro",
                texto: "Informe o valor da operação."
            });
        }

        if (prazo <= 0) {
            alertas.push({
                tipo: "erro",
                texto: "Informe o prazo da operação."
            });
        }

        if (taxa < 0 || vazio(e.taxa.value)) {
            alertas.push({
                tipo: "erro",
                texto: "Informe a taxa da operação."
            });
        }

        if (
            SET_FLEX.has(codigo) &&
            vazio(e.flex.value)
        ) {
            alertas.push({
                tipo: "erro",
                texto: "Informe se a taxa será flexibilizada."
            });
        }

        if (
            SET_REPAC.has(codigo) &&
            vazio(e.repac.value)
        ) {
            alertas.push({
                tipo: "erro",
                texto: "Informe se a REPAC possui troco."
            });
        }

        if (
            SET_REPAC.has(codigo) &&
            e.repac.value === "SIM" &&
            vazio(e.justRepac.value)
        ) {
            alertas.push({
                tipo: "erro",
                texto: "Informe a justificativa da REPAC com troco."
            });
        }

        if (
            SET_PORC_VISTA.has(codigo) &&
            vazio(e.porcVista.value)
        ) {
            alertas.push({
                tipo: "erro",
                texto: "Informe o percentual de recebimento à vista."
            });
        }

        if (
            SET_PRAZO_MEDIO.has(codigo) &&
            vazio(e.prazoMedio.value)
        ) {
            alertas.push({
                tipo: "erro",
                texto: "Informe o prazo médio de recebimento."
            });
        }

        if (
            SET_ALTERA_LIMITE.has(codigo) &&
            vazio(e.alteraLimite.value)
        ) {
            alertas.push({
                tipo: "erro",
                texto: "Informe se o limite será alterado."
            });
        }

        if (
            SET_ALTERA_LIMITE.has(codigo) &&
            e.alteraLimite.value === "SIM" &&
            numero(e.valorLimiteAnterior.value) <= 0
        ) {
            alertas.push({
                tipo: "erro",
                texto: "Informe o valor do limite anterior."
            });
        }

        if (vazio(e.pix.value)) {
            alertas.push({
                tipo: "erro",
                texto: "Informe se o cooperado possui PIX cadastrado."
            });
        }

        if (
            e.pix.value === "NAO" &&
            vazio(e.justPix.value)
        ) {
            alertas.push({
                tipo: "erro",
                texto: "Cooperado sem PIX exige justificativa."
            });
        }

        if (vazio(e.cotas.value)) {
            alertas.push({
                tipo: "erro",
                texto: "Informe a situação das cotas de capital."
            });
        }

        if (e.cotas.value === "SIM") {
            alertas.push({
                tipo: "erro",
                texto: "Existem cotas de capital em atraso. A matriz prevê alerta no cadastro e impedimento na liberação."
            });
        }

        if (vazio(e.crl.value)) {
            alertas.push({
                tipo: "erro",
                texto: "Informe a situação do CRL e limites."
            });
        }

        if (e.crl.value === "NAO") {
            alertas.push({
                tipo: "atencao",
                texto: "CRL ou limites não estão ativos. Necessária análise da condição."
            });
        }

        if (vazio(e.serasa.value)) {
            alertas.push({
                tipo: "erro",
                texto: "Informe a situação SERASA."
            });
        }

        if (e.serasa.value === "SIM") {
            alertas.push({
                tipo: "erro",
                texto: "Há anotação SERASA. A matriz prevê trava da proposta."
            });

            if (vazio(e.justSerasa.value)) {
                alertas.push({
                    tipo: "erro",
                    texto: "Informe a justificativa da anotação SERASA."
                });
            }
        }

        if (vazio(e.bacen.value)) {
            alertas.push({
                tipo: "erro",
                texto: "Informe a situação BACEN."
            });
        }

        if (e.bacen.value === "SIM") {
            alertas.push({
                tipo: "erro",
                texto: "Há anotação BACEN. A matriz prevê trava da proposta."
            });

            if (vazio(e.justBacen.value)) {
                alertas.push({
                    tipo: "erro",
                    texto: "Informe a justificativa da anotação BACEN."
                });
            }
        }

        if (numero(e.faturamento.value) <= 0) {
            alertas.push({
                tipo: "erro",
                texto: "Informe o faturamento anual."
            });
        }

        if (vazio(e.emitente.value)) {
            alertas.push({
                tipo: "erro",
                texto: "Informe se haverá mais de um emitente."
            });
        }

        const taxas =
            obterTaxas(codigo);

        const alcada =
            identificarAlcada(taxa, taxas);

        if (alcada.codigo === "ABAIXO") {
            alertas.push({
                tipo: "erro",
                texto:
                    "Taxa abaixo da menor alçada cadastrada. Taxa mínima localizada: " +
                    percentual(menorTaxaValida(taxas)) +
                    "."
            });
        }

        if (!possuiGarantiaSelecionada()) {
            alertas.push({
                tipo: "erro",
                texto: "Selecione pelo menos uma garantia ou marque Sem Garantias."
            });
        }

        const config =
            configGarantias(codigo);

        if (
            config.avalista === "OBRIGATORIO" &&
            !e.avalista.checked
        ) {
            alertas.push({
                tipo: "erro",
                texto: "A linha exige Avalista."
            });
        }

        if (
            e.semGarantia.checked &&
            vazio(e.justSemGarantia.value)
        ) {
            alertas.push({
                tipo: "erro",
                texto: "Sem Garantias exige justificativa."
            });
        }

        if (
            e.guarda.checked &&
            numero(e.contratoMae.value) <= 0
        ) {
            alertas.push({
                tipo: "erro",
                texto: "Informe o Nº do Contrato-Mãe."
            });
        }

        const dadosExcecao =
            dadosExcecaoGerente();

        if (
            dadosExcecao.semGarantiaReal &&
            vazio(e.justDispensa.value)
        ) {
            alertas.push({
                tipo: "erro",
                texto: "Capital de Giro acima de 36 meses sem garantia real exige justificativa técnica para dispensa."
            });
        }

        if (
            dadosExcecao.parecerObrigatorio &&
            vazio(e.parecerGerente.value)
        ) {
            alertas.push({
                tipo: "erro",
                texto: "A condição exige Parecer Técnico do Gerente."
            });
        }

        const limite =
            LIMITES_PARECER_GERENTE[codigo];

        if (
            limite &&
            valor > limite.valorMaximo
        ) {
            alertas.push({
                tipo: "atencao",
                texto:
                    "Valor superior ao limite interno de " +
                    moeda(limite.valorMaximo) +
                    "."
            });
        }

        if (
            limite &&
            prazo > limite.prazoMaximo
        ) {
            alertas.push({
                tipo: "atencao",
                texto:
                    "Prazo superior ao limite interno de " +
                    limite.prazoMaximo +
                    " meses."
            });
        }

        if (
            e.aplicacao.checked ||
            SET_FUNDOS_DOCS.has(codigo)
        ) {
            alertas.push({
                tipo: "info",
                texto: "A operação exige CND Receita Federal e Faturamento Receita Federal conforme regra de garantia de fundos."
            });
        }

        if (
            numero(e.faturamento.value) > 0 &&
            numero(e.faturamento.value) <= 400000
        ) {
            alertas.push({
                tipo: "info",
                texto: "Documentação contábil aplicável: Balanço Perguntado."
            });
        }

        if (
            numero(e.faturamento.value) >= 400000.01
        ) {
            alertas.push({
                tipo: "info",
                texto: "Documentação contábil aplicável: Balanço Patrimonial + DRE Consolidado."
            });
        }

        return alertas;
    }

    function atualizarEnquadramento() {
        const container =
            $("listaAlertasCredito");

        const status =
            $("statusEnquadramentoCredito");

        if (!container || !status) {
            return;
        }

        const codigo =
            codigoLinhaSelecionada();

        if (!codigo) {
            status.innerHTML = `
                <span>Status</span>
                <strong>Aguardando simulação</strong>
            `;

            container.innerHTML = `
                <div class="documentos-observacao">
                    Preencha os dados da operação para realizar a análise.
                </div>
            `;

            return;
        }

        const alertas =
            validarOperacao();

        const erros =
            alertas.filter(a => a.tipo === "erro");

        const atencoes =
            alertas.filter(a => a.tipo === "atencao");

        let texto =
            "Operação enquadrada";

        if (erros.length) {
            texto =
                "Operação não enquadrada";
        } else if (atencoes.length) {
            texto =
                "Operação com pontos de atenção";
        }

        status.innerHTML = `
            <span>Status</span>
            <strong>${texto}</strong>
        `;

        if (!alertas.length) {
            container.innerHTML = `
                <div class="documentos-observacao">
                    <strong>Operação enquadrada.</strong>
                    Nenhuma inconsistência foi identificada nas regras disponíveis.
                </div>
            `;

            return;
        }

        container.innerHTML =
            alertas
                .map(alerta => {
                    const titulo =
                        alerta.tipo === "erro"
                            ? "Não enquadrado"
                            : alerta.tipo === "atencao"
                                ? "Ponto de atenção"
                                : "Informação";

                    return `
                        <div class="documentos-observacao">
                            <strong>${titulo}:</strong> ${alerta.texto}
                        </div>
                    `;
                })
                .join("");
    }

    /* =========================================================
       SIMULAÇÃO
       ========================================================= */

    function simular() {
        atualizarCondicionais();
        atualizarGarantiasDisponiveis();
        atualizarAlcada();
        atualizarEnquadramento();

        const codigo =
            codigoLinhaSelecionada();

        const valor =
            numero(e.valor.value);

        const prazo =
            Math.trunc(numero(e.prazo.value));

        const taxa =
            numero(e.taxa.value);

        if (
            !codigo ||
            valor <= 0 ||
            prazo <= 0 ||
            taxa < 0
        ) {
            limparResultadoFinanceiro();
            limparTabela();
            return;
        }

        const parcelas =
            calcularParcelas();

        preencherResultadoFinanceiro(
            parcelas
        );

        preencherTabela(
            parcelas
        );
    }

    /* =========================================================
       SELEÇÃO DA LINHA
       ========================================================= */

    function aplicarLinhaSelecionada() {
        const codigo =
            codigoLinhaSelecionada();

        limparCamposCondicionais();
        limparResultadoFinanceiro();
        limparTabela();

        if (!codigo) {
            limparResumoLinha();
            esconderCondicionais();
            atualizarGarantiasDisponiveis();
            atualizarEnquadramento();
            return;
        }

        const sugestao =
            sugestaoSistema(
                nomeLinhaSelecionada()
            );

        if (sugestao) {
            e.sistema.value =
                sugestao;
        }

        atualizarResumoLinha();
        mostrarPerfilLinha();
        atualizarGarantiasDisponiveis();
        carregarTaxas();
        atualizarCondicionais();
        atualizarEnquadramento();
    }

    /* =========================================================
       LIMPEZA
       ========================================================= */

    function limparCamposCondicionais() {
        [
            e.flex,
            e.repac,
            e.porcVista,
            e.prazoMedio,
            e.alteraLimite,
            e.pix,
            e.cotas,
            e.crl,
            e.serasa,
            e.bacen,
            e.emitente
        ].forEach(campo => {
            if (campo) {
                campo.value = "";
            }
        });

        [
            e.justRepac,
            e.justPix,
            e.justSerasa,
            e.justBacen,
            e.justSemGarantia,
            e.justDispensa,
            e.parecerGerente
        ].forEach(campo => {
            if (campo) {
                campo.value = "";
            }
        });

        e.valorLimiteAnterior.value =
            "0,00";

        e.faturamento.value =
            "0,00";

        e.docContabil.value =
            "";

        e.contratoMae.value =
            "";

        [
            e.avalista,
            e.veiculo,
            e.recebiveis,
            e.aplicacao,
            e.urbano,
            e.rural,
            e.guarda,
            e.semGarantia
        ].forEach(campo => {
            if (campo) {
                campo.checked = false;
            }
        });
    }

    function limparPerfilLinha() {
        limparCamposCondicionais();
        esconderCondicionais();
        limparResumoLinha();
        limparResultadoFinanceiro();
        limparTabela();

        e.taxa.value = "";
        e.taxa.readOnly = false;

        setTexto("resultadoTaxaBalcao", "-");
        setTexto("resultadoTaxaGerente", "-");
        setTexto("resultadoTaxaNegocios", "-");
        setTexto("resultadoTaxaDiretor", "-");
        setTexto("resultadoAlcadaTaxa", "Aguardando seleção da linha");

        atualizarGarantiasDisponiveis();
        atualizarEnquadramento();
    }

    function limparTudo() {
        e.tipoPessoa.value = "";

        e.linha.innerHTML =
            '<option value="">Selecione primeiro o tipo de pessoa</option>';

        e.linha.disabled = true;

        e.valor.value =
            "0,00";

        e.prazo.value =
            "12";

        e.sistema.value =
            "PRICE";

        e.taxa.value =
            "";

        e.risco.value =
            "";

        e.perda.value =
            "";

        limparPerfilLinha();
    }

    /* =========================================================
       EVENTOS
       ========================================================= */

    e.tipoPessoa.addEventListener(
        "change",
        carregarLinhas
    );

    e.linha.addEventListener(
        "change",
        aplicarLinhaSelecionada
    );

    e.flex.addEventListener(
        "change",
        () => {
            atualizarComportamentoTaxa();
            atualizarAlcada();
            atualizarEnquadramento();
        }
    );

    e.repac.addEventListener(
        "change",
        () => {
            atualizarCondicionais();
            atualizarEnquadramento();
        }
    );

    e.alteraLimite.addEventListener(
        "change",
        () => {
            atualizarCondicionais();
            atualizarEnquadramento();
        }
    );

    e.pix.addEventListener(
        "change",
        () => {
            atualizarCondicionais();
            atualizarEnquadramento();
        }
    );

    e.serasa.addEventListener(
        "change",
        () => {
            atualizarCondicionais();
            atualizarEnquadramento();
        }
    );

    e.bacen.addEventListener(
        "change",
        () => {
            atualizarCondicionais();
            atualizarEnquadramento();
        }
    );

    e.faturamento.addEventListener(
        "input",
        () => {
            atualizarDocumentacaoContabil();
            atualizarEnquadramento();
        }
    );

    e.faturamento.addEventListener(
        "blur",
        () => {
            formatarMonetario(
                e.faturamento
            );

            atualizarDocumentacaoContabil();
        }
    );

    e.valor.addEventListener(
        "input",
        () => {
            atualizarExcecoesGerente();
            atualizarEnquadramento();
        }
    );

    e.valor.addEventListener(
        "blur",
        () => {
            formatarMonetario(
                e.valor
            );

            atualizarExcecoesGerente();
        }
    );

    e.valorLimiteAnterior.addEventListener(
        "blur",
        () => {
            formatarMonetario(
                e.valorLimiteAnterior
            );
        }
    );

    e.prazo.addEventListener(
        "input",
        () => {
            atualizarExcecoesGerente();
            atualizarEnquadramento();
        }
    );

    e.taxa.addEventListener(
        "input",
        () => {
            atualizarAlcada();
            atualizarEnquadramento();
        }
    );

    [
        e.cotas,
        e.crl,
        e.emitente,
        e.porcVista,
        e.prazoMedio,
        e.justRepac,
        e.justPix,
        e.justSerasa,
        e.justBacen,
        e.justSemGarantia,
        e.justDispensa,
        e.parecerGerente,
        e.contratoMae
    ].forEach(campo => {
        campo?.addEventListener(
            "input",
            atualizarEnquadramento
        );

        campo?.addEventListener(
            "change",
            atualizarEnquadramento
        );
    });

    [
        e.avalista,
        e.veiculo,
        e.recebiveis,
        e.aplicacao,
        e.urbano,
        e.rural,
        e.guarda,
        e.semGarantia
    ].forEach(campo => {
        campo?.addEventListener(
            "change",
            () => {
                tratarExclusividadeGarantias(
                    campo
                );
            }
        );
    });

    e.sistema.addEventListener(
        "change",
        () => {
            limparResultadoFinanceiro();
            limparTabela();
        }
    );

    e.btnSimular.addEventListener(
        "click",
        simular
    );

    e.btnLimpar.addEventListener(
        "click",
        limparTudo
    );

    /* =========================================================
       INICIALIZAÇÃO
       ========================================================= */

    esconderCondicionais();
    limparResultadoFinanceiro();
    limparTabela();
    atualizarGarantiasDisponiveis();
    atualizarEnquadramento();
});