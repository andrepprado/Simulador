(function () {
    "use strict";
    const ORIGEM_BASE_CREDITO_RURAL = "js/credito-rural-atividades.js - base interna JavaScript";
    const PARAMETROS_CREDITO_RURAL = {
        PRONAF_CUSTEIO_FAIXA_1: { beneficiario: "PF/PJ", linha: "Pronaf", finalidade: "Custeio Faixa 1", fonte: "RO - Recursos Obrigatórios", prazoMeses: 24, taxaSingular: 2.00, taxaAssociado: 2.00 },
        PRONAF_CUSTEIO_FAIXA_2: { beneficiario: "PF/PJ", linha: "Pronaf", finalidade: "Custeio Faixa 2", fonte: "RO - Recursos Obrigatórios", prazoMeses: 24, taxaSingular: 5.50, taxaAssociado: 5.50 },
        PRONAF_CUSTEIO_FAIXA_3: { beneficiario: "PF/PJ", linha: "Pronaf", finalidade: "Custeio Faixa 3", fonte: "RO - Recursos Obrigatórios", prazoMeses: 24, taxaSingular: 1.00, taxaAssociado: 1.00 },
        PRONAF_CUSTEIO_FAIXA_4: { beneficiario: "PF/PJ", linha: "Pronaf", finalidade: "Custeio Faixa 4¹", fonte: "RO - Recursos Obrigatórios", prazoMeses: 24, taxaSingular: 7.50, taxaAssociado: 7.50 },
        PRONAF_CUSTEIO_AGROINDUSTRIA: { beneficiario: "PF/PJ", linha: "Pronaf", finalidade: "Custeio Agroindústria", fonte: "RO - Recursos Obrigatórios", prazoMeses: 12, taxaSingular: 7.50, taxaAssociado: 7.50 },
        PRONAF_INDUSTRIALIZACAO: { beneficiario: "PF/PJ", linha: "Pronaf", finalidade: "Industrialização", fonte: "RO - Recursos Obrigatórios", prazoMeses: 12, taxaSingular: 7.50, taxaAssociado: 7.50 },
        PRONAF_INVESTIMENTO_FAIXA_1: { beneficiario: "PF/PJ", linha: "Pronaf", finalidade: "Investimento Faixa 1", fonte: "LCA (Controlado)", prazoMeses: 120, taxaSingular: 2.00, taxaAssociado: 2.00 },
        PRONAF_INVESTIMENTO_FAIXA_2: { beneficiario: "PF/PJ", linha: "Pronaf", finalidade: "Investimento Faixa 2", fonte: "LCA (Controlado)", prazoMeses: 120, taxaSingular: 7.50, taxaAssociado: 7.50 },
        PRONAF_INVESTIMENTO_FAIXA_3: { beneficiario: "PF/PJ", linha: "Pronaf", finalidade: "Investimento Faixa 3", fonte: "LCA (Controlado)", prazoMeses: 120, taxaSingular: 1.50, taxaAssociado: 1.50 },
        PRONAF_TRATORES_COLHEITADEIRAS: { beneficiario: "PF/PJ", linha: "Pronaf", finalidade: "Tratores e Colheitadeiras", fonte: "LCA (Controlado)", prazoMeses: 84, taxaSingular: 5.00, taxaAssociado: 5.00 },
        PRONAF_AQUISICAO_MATRIZES: { beneficiario: "PF/PJ", linha: "Pronaf", finalidade: "Aquisição de Matrizes", fonte: "LCA (Controlado)", prazoMeses: 96, taxaSingular: 7.50, taxaAssociado: 7.50 },
        PRONAF_CAMIONETES_MOTOS: { beneficiario: "PF/PJ", linha: "Pronaf", finalidade: "Camionetes e Motos", fonte: "LCA (Controlado)", prazoMeses: 60, taxaSingular: 7.50, taxaAssociado: 7.50 },
        PRONAMP_CUSTEIO: { beneficiario: "PF/PJ", linha: "Pronamp", finalidade: "Custeio", fonte: "RO - Recursos Obrigatórios", prazoMeses: 24, taxaSingular: 9.00, taxaAssociado: 9.00 },
        PRONAMP_INVESTIMENTO: { beneficiario: "PF/PJ", linha: "Pronamp", finalidade: "Investimento", fonte: "LCA (Controlado)", prazoMeses: 96, taxaSingular: 9.00, taxaAssociado: 9.00 },
        PRONAMP_MODERFROTA_PRONAMP: { beneficiario: "PF/PJ", linha: "Pronamp", finalidade: "Moderfrota Pronamp", fonte: "LCA (Controlado)", prazoMeses: 96, taxaSingular: 11.50, taxaAssociado: 11.50 },
        DEMAIS_PRODUTORES_CUSTEIO: { beneficiario: "PF/PJ", linha: "Demais Produtores", finalidade: "Custeio", fonte: "LCA (Controlado)", prazoMeses: 14, taxaSingular: 12.50, taxaAssociado: 12.50 },
        DEMAIS_PRODUTORES_FEE: { beneficiario: "PF/PJ", linha: "Demais Produtores", finalidade: "FEE", fonte: "LCA (Controlado)", prazoMeses: 8, taxaSingular: 12.50, taxaAssociado: 12.50 },
        DEMAIS_PRODUTORES_INDUSTRIALIZACAO: { beneficiario: "PF/PJ", linha: "Demais Produtores", finalidade: "Industrialização", fonte: "RO - Recursos Obrigatórios", prazoMeses: 12, taxaSingular: 12.50, taxaAssociado: 12.50 },
        DEMAIS_PRODUTORES_INVESTIMENTO: { beneficiario: "PF/PJ", linha: "Demais Produtores", finalidade: "Investimento", fonte: "LCA (Controlado)", prazoMeses: 144, taxaSingular: 11.50, taxaAssociado: 11.50 },
        PROIRRIGA_INVESTIMENTO: { beneficiario: "PF/PJ", linha: "Proirriga", finalidade: "Investimento", fonte: "LCA (Controlado)", prazoMeses: 120, taxaSingular: 11.50, taxaAssociado: 11.50 },
        MODERFROTA_INVESTIMENTO: { beneficiario: "PF/PJ", linha: "Moderfrota", finalidade: "Investimento", fonte: "LCA (Controlado)", prazoMeses: 84, taxaSingular: 12.50, taxaAssociado: 12.50 },
        RENOVAGRO_DEMAIS_INVESTIMENTO: { beneficiario: "PF/PJ", linha: "Renovagro-Demais", finalidade: "Investimento", fonte: "LCA (Controlado)", prazoMeses: 144, taxaSingular: 9.50, taxaAssociado: 9.50 },
        RENOVAGRO_RECUPERACAO_PASTAGENS_INVESTIMENTO: { beneficiario: "PF/PJ", linha: "Renovagro-Recuperação Pastagens", finalidade: "Investimento", fonte: "LCA (Controlado)", prazoMeses: 120, taxaSingular: 8.50, taxaAssociado: 8.50 },
        PCA_ATE_12MIL_TONELADAS_INVESTIMENTO: { beneficiario: "PF/PJ", linha: "PCA até 12mil toneladas", finalidade: "Investimento", fonte: "LCA (Controlado)", prazoMeses: 120, taxaSingular: 8.00, taxaAssociado: 8.00 },
        COOPERATIVAS_PRODUCAO_CUSTEIO: { beneficiario: "Cooperativas", linha: "Cooperativas de Produção", finalidade: "Custeio", fonte: "LCA (Controlado)", prazoMeses: 24, taxaSingular: 12.50, taxaAssociado: 12.50 },
        COOPERATIVAS_PRODUCAO_COMERCIALIZACAO: { beneficiario: "Cooperativas", linha: "Cooperativas de Produção", finalidade: "Comercialização", fonte: "LCA (Controlado)", prazoMeses: 8, taxaSingular: 12.50, taxaAssociado: 12.50 },
        COOPERATIVAS_PRODUCAO_INDUSTRIALIZACAO: { beneficiario: "Cooperativas", linha: "Cooperativas de Produção", finalidade: "Industrialização", fonte: "RO - Recursos Obrigatórios", prazoMeses: 12, taxaSingular: 12.50, taxaAssociado: 12.50 },
        FUNCAFE_AQUISICAO_CAFE_COOPERATIVA: { beneficiario: "Produtor de Café", linha: "Funcafé", finalidade: "Aquisição de Café - Cooperativa", fonte: "Funcafé", prazoMeses: 12, taxaSingular: 11.00, taxaAssociado: 13.00 },
        FUNCAFE_AQUISICAO_CAFE_INDUSTRIA: { beneficiario: "Produtor de Café", linha: "Funcafé", finalidade: "Aquisição de Café - Industria", fonte: "Funcafé", prazoMeses: 12, taxaSingular: 11.00, taxaAssociado: 13.00 },
        FUNCAFE_CAPITAL_GIRO: { beneficiario: "Produtor de Café", linha: "Funcafé", finalidade: "Capital Giro", fonte: "Funcafé", prazoMeses: 24, taxaSingular: 11.00, taxaAssociado: 13.00 },
        FUNCAFE_CUSTEIO: { beneficiario: "Produtor de Café", linha: "Funcafé", finalidade: "Custeio", fonte: "Funcafé", prazoMeses: 14, taxaSingular: 9.49, taxaAssociado: 11.50 },
        FUNCAFE_COMERCIALIZACAO: { beneficiario: "Produtor de Café", linha: "Funcafé", finalidade: "Comercialização", fonte: "Funcafé", prazoMeses: 12, taxaSingular: 9.49, taxaAssociado: 11.50 },
        FUNCAFE_RECUPERACAO_DECOTE: { beneficiario: "Produtor de Café", linha: "Funcafé", finalidade: "Recuperação - Decote", fonte: "Funcafé", prazoMeses: 24, taxaSingular: 9.49, taxaAssociado: 11.50 },
        FUNCAFE_RECUPERACAO_ESQUELETAMENTO: { beneficiario: "Produtor de Café", linha: "Funcafé", finalidade: "Recuperação - Esqueletamento", fonte: "Funcafé", prazoMeses: 36, taxaSingular: 9.49, taxaAssociado: 11.50 },
        FUNCAFE_RECUPERACAO_RECEPA: { beneficiario: "Produtor de Café", linha: "Funcafé", finalidade: "Recuperação - Recepa", fonte: "Funcafé", prazoMeses: 72, taxaSingular: 9.49, taxaAssociado: 11.50 },
        FUNCAFE_RECUPERACAO_ARRANQUIO: { beneficiario: "Produtor de Café", linha: "Funcafé", finalidade: "Recuperação - Arranquio", fonte: "Funcafé", prazoMeses: 96, taxaSingular: 9.49, taxaAssociado: 11.50 }
    };
    const ALIASES_PARAMETROS_CREDITO_RURAL = Object.freeze({
        PRONAF_TRATORES_E_COLHEITADEIRAS: "PRONAF_TRATORES_COLHEITADEIRAS",
        PRONAF_AQUISICAO_DE_MATRIZES: "PRONAF_AQUISICAO_MATRIZES",
        PRONAF_CAMIONETES_E_MOTOS: "PRONAF_CAMIONETES_MOTOS",
        COOPERATIVAS_DE_PRODUCAO_CUSTEIO: "COOPERATIVAS_PRODUCAO_CUSTEIO",
        COOPERATIVAS_DE_PRODUCAO_COMERCIALIZACAO: "COOPERATIVAS_PRODUCAO_COMERCIALIZACAO",
        COOPERATIVAS_DE_PRODUCAO_INDUSTRIALIZACAO: "COOPERATIVAS_PRODUCAO_INDUSTRIALIZACAO",
        FUNCAFE_AQUISICAO_DE_CAFE_COOPERATIVA: "FUNCAFE_AQUISICAO_CAFE_COOPERATIVA",
        FUNCAFE_AQUISICAO_DE_CAFE_INDUSTRIA: "FUNCAFE_AQUISICAO_CAFE_INDUSTRIA"
    });
    window.PARAMETROS_CREDITO_RURAL = PARAMETROS_CREDITO_RURAL;
    const BASE_DADOS_GZIP_BASE64 =
        "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"
        + "6rdc2CBITKzfiGUlbFBPhCD2zXED57ixb44buIgbJG1zXOYiGYsL2NCJbacmNnJhQ/ynsbET65scFruviR0bMQMbEbaWDmEQkU0S"
        + "2NRWThDYkLECNrDRNwwLNGs71xa2Tb61XfIQxwWZzF3y0G6boi62IF1YVsHWzAE3i0JypUJ5rgiVVseNY56m4QGhVvV0Vi2UlaE1"
        + "M4jUsSO/wYxJKCtDa0ZVkQ8LmkZVMQpj7i0oBWVlaHUCCT95hRMIG2L0xJcBLYsakgSdfLKGg0oKysrQmrmq/TqWuPfrFDQoQ1tW"
        + "KCtDrRMIjAmE7gkEQRlaMwEV0LG0aVkqoCtBraMGxqihe9QgKEOto0YGNLJBVZcVazckinrjnbWbxEWFCKyhBMN0WYOZdZV2zai6"
        + "rFGC1o4ackskoLk1U5VQVobWjKrtwGUDBVKVAbHLJgqoHXt21TSqVpjrBskSULBtCmopcStoUIbWjKrNW91ZM50u61IJWzgT8FQl"
        + "4AS0J+BtLShmoSivmWVbC0oRWiV+W9vA24b8t61t4G1DWt9WZ/cE1LePqnJK9tpdBWZ6M5Itm+aqxW/ZNFdVMDagNUkCHpxAKUmJ"
        + "V294hea67ngFRudtE7Uoo7CpWa/7rauUE+oTz+ytq1EkbGnf7y5kaSgrQ/0qVBP9zj1PbR7Xbu6Eeq+Wrd3cCfXZbNawox7qmh+7"
        + "d+/Xhrrmx+4b5qrbz9l901xDJUn37m1tBWVlaO2oLIqMufo3rsmS3ikS+Ob2Ry00KEPto7IytDpZfZycvWtglz4lzrbPhLIytCqu"
        + "TAvBzu3PQ70Dx3ZNE9BCsGuYQKT6RdmDe69MQVkZah2VGaMy96iMlaE1o6Zq1MemUVM16qN71IQFvqhosidnY52GsjK0Old9RJK9"
        + "b+BWrN3f+wZuQWYTIMEAKooot1YeIDbliiiwr02SlbGhmK3ALt1Y38S+cWJD7oEE9q02GxYsq2Br1qaNd8N5nFCkQhgCfXTHYBKK"
        + "yvixQRkT1WwTtp4JDcrQlhXKylDfAk2Lo/r1o6pUKPTdqVCoU6ES1D4qK0N9CzQtjuqaa1oc1beOynsnBfTONVdMtDUFbl0UIGhQ"
        + "htaMqp+EEjQxVj8KJWhgbKolq+EcTahzsbDhqS2hzsVC1jQB9SiYMHRGUKkvuwfDyL1nGOpt6zB+JpSVodWZtpW+hkkDqXTeECYN"
        + "pNJ5Q5g0kErnDQJqrRUrKCtDa0ZVjj5Mm+aqot2w3RAY6pP4Yd5ALN0SEuZNvksTK2/yXepchgH1baNKuuYNdNVH/EvQcqdvmkSU"
        + "5OMmY3gpSha60zcXbfYtrX5XbjIpaFCGtqxQVob6FmhaHNWvH1Xz6bppAppP100T0OK3aBpVlcPCG3c5TEGDMtQ2alqEWiiQKtd2"
        + "W+PagqPLCjQoQ1tWKCtDfRs0MCYQuicQBGWodQIBK0OtE2DGBJh7AiwoQ60TYKwMtU0gLbLAd0wgLbLAd0wgLbLAd02gyALrBLCP"
        + "UM/VX7nkhbBBBduyYlkF69uwgTmH0D2HIKhgrXMIWAVrnQMz58Dcc2BBBWudA2MVbHUOvmoqDl8bTcV1Wi6hrAytGi9fm8Rlg/Hy"
        + "tUlcNphEX7uuZYNN9tWDQcI3TRPQhvbtM6GsDK3OVff2hytn+JZEERYK0NOJIyV39afeODIykWsXMjaRm3pkpNv6w4byW6Tb+sOG"
        + "8htCGTNH3bhGFUeEStCaUTWjGop6kT6rHG6aGBXKU/ACaj0Fj1BxXl1A7efVAxYmCfUvhKL4dW+frI4e3zWtSxWow3dN60pkRSnc"
        + "uitKCsrK0JroUfOgqfoVax40Vb/wEXeRb4zq260Q05HhQ0NkqMuKJah9VFaGVglrhOUND5+JjLD8sWlUVYEMnxqWZfDgqWkC6AV4"
        + "rP0ktEs/kKkExZoW1alCXv4qHoiqxbIKtrowfHxfTO3yoagn7ayCKLGsgi23i7eiRD2IhrB54VlTxWGNBP3bBiNnJOjfNhg5maAD"
        + "9KNrhyVKVcoXNRSpIp2gRw1Fqkgn6JG7SBXIgjGwIPLdDchRG+urZLciETk9WGklsayCrRKrrcQ7aiinRDrvjhrKKZE+5Bk1lFMi"
        + "naJHDY/6iPQuYNTwqI9I96tHUdNcVe0pitwnIQAaCdGOYncbLkKJv4GEqkp0y4plFWyd1sqiUpS4wpe4pcpUUUOVREFZGerXQUXl"
        + "QUCtlYdYZ99Ru2kCqhsmyg3xu6ybgBZCs6ByaR81ZGVo7ajo6/So/qN9XQLLKljbuMBeA4vHK9L6cSVp8ybShkoILhuazSSUlaE1"
        + "k1WNG9GVuwgZt1SbTXTtthqx3keOGoowsQ7No4W7dyDWx25L0OqyAnWELbqpOcKmNUaHeyVgywJkZWDBwbTx8ZrKXtwaD2WL61yh"
        + "JtPrJgejDdbrBuOaqidJCag9hk7VM58E9NYFlZL6uvx0MguUFaF14mc8uryhHSQ2nl3e0A4S623pqCHfjPW2dAnq10ElBd406CpT"
        + "BdgStGZULYBvmyigRfBtEwW0ZLn7SFisTw8R9LLwuNGro+ujhRhTHzaN7ho0NdRW+K5BU8NEljyitbvkEeunnkcb9+GdWD/2vASt"
        + "kkofYY3uG5alj7BG9+6oIcaAnJ/Iid65T+TAqMqwNzRRxJhsxHRwIxKp2ZPVBktsUMHax2UVrF+HFQ9SkVjLg1QCOWxLQBMc1rdN"
        + "QbOh4ZEGsdy9Bio81hS44xpoUIa2rFBWhvo2aGBMIHRPgBlQ1gANylDrXBkrQ21zTYsU8B2jpkUK+K5Rg8CkgHPUgJWhtaPiuT/N"
        + "WP+9nbOqRTt6cm/gx7pFO2p4mGysW7RLUN8GDYxRQ/eoAStDbaOmxbn6tlH9JDQo4H9wkQCxgYkN3VhmYlkDNqhgrfNlrIL1Ldg0"
        + "CArzddEhDVgFWzsuFjg1zTYuktEDtg2olWL8gWVou947g0jdqR59cLc3xrqRIvrQEBfoRoroQ0NckOjQ7IO7DTDGNfl0yCcSh2a+"
        + "taYGuq85+uhMUHU5IW41rKqtOjHjlrsTE6E+f16ggPofXcP6/HGBZaxfi+WRtMDeWNkloUEZ2rJCWRlaO4EgCo1RAye9CMsq2Npx"
        + "sSHTGNd3jUtYVsHWjKvSrthvSBF1CShuOOWkTgMBNHCf7VVQVob6NiiYOQW1nO1V0KAMtU6AsTLUOoHImEDknEBanIBvm0AYMWNZ"
        + "QWBfly8dY9xw0EtBWRla7R311amNOHSf2lDQoAxtWaGsDK1UWBP5KG0YNXJXWBNdfYgbjo8lesMrdhbhEr3dFSeuYyMS2BIjWo+N"
        + "JPgwFEZPBot5ESlgNr1CrB9FJjZ0YlOKtwT2xuYNJTQwoKEbioRK3Y+nVlBWhvp1UNGuKKC3rrkiNDCgoRuq53rrmqt4knUJWjvX"
        + "kEdmkgeRa7JhEpnY2IUVFYi4oRCroKwMrev1VoLd0C+XGL/11vDM5UR35scN/XKJ7syPXf1yDDsO1NOW8NMrQ2P8726Obo9eS5xS"
        + "Ld+Oa4vfrouxWBdjiTjGR0PJ/rfiiOaPAfqFH1Mr4piaYeyYIf3EnSgTJoIrcsMMca+PlnyGLaZ21uIrmmGrPEEJjZNIQa/roXKO"
        + "quSTuqiDP1qHT3mmH60j4qR1AybY/Q/eKaE74zmpa3xqlRXpp8xE5gYyFxPkDylB1EJNUBNHL0T8ylkLfxcLcZFFHGJF7LfO8cxf"
        + "/XExOVYEXNsJyH+lh7Vi/is9Phih4FLV1uRi8Sd4Esm2G3h7UWHbGzkeRsMSeksD6r0oMR6BmAS9rgfhTSP5uz/x0nVT7F+KZEE7"
        + "foMfWsQKx5S9pPFb55i4ZgVd1UDfFqDq9neNo6YSum6CRgq6aYQqot83QkMJfdcIVVzaNi6rLaG7RqiawEMNFIBHK2GAUm1YHg0L"
        + "xIoWKIE4LkXjR8AnrrJXxqB3RzdH66ONmEHcamv79/47/rt6WuRNHTJ/NciuaxHZ3YCKiPEHEr/gujCiXFGYJL6SlG+ddJI/9ILQ"
        + "j3br66ufeWkFhLP7G/Nna8zFBEVc8VdezAFtwKAMbFWB+gdWEHhpv7X+eRUEXrmAgQG8tgHN30uxsjDBB7qDtUmJMR+5BC1qTUiE"
        + "G2j0xJ/gu6TFmX1Tx+yklcRtyezEpzGLzJYsjEXvIQ0ZVATyHqRXLkf/7Jp/6SR54YcfXNwu/D4CAl9bgJF+nvGV89bixw5avgQu"
        + "LfIjfo5AA9+4gaEBbDmAaRiYQL8aNSAwxucBpBwY4+MLuYZx1rw72h7tjh6MoUUBq+Xzw9h2rUg0na6ddOLAsDhiUDeiaszzF44R"
        + "I/FLPiRGTHnBql0DoBKjJKwAHw15K/zMgCPaKP7MgAn0y0D+5PwWPeMegXcW8qQhrxQoYPDajgyixEQu65AgP4VnxvOf9SwFdmFC"
        + "IJYq0JKzpxT+FZ8s76JM4bHuDicS6HwgiRzcKz1Z3CFhgU7eaVPLHkSnEWZiZKhiUge/PirHJ0rLxXzrWnXxcc4uYKjC3oC54l75"
        + "dOIWPcjYterCs4n1rdOyXhUfN+waUTzAlz/rF4E7y2IKD9q1jxhS/2xIPY5JQmFA8KbA7Kej9+AePhjoqGWi3zahfRO9cqPJEmn0"
        + "nRsdYASj0Wsbut0KEpUiJakrL4SB2/hIK06QNh94Y51GIJ/62gq4qls5x7SqEIGtGgAmVrnq3DlVxvyEJ9owVfSYb3isKad6p61n"
        + "8TmuDnFgWlGTKxUVmqr/RlcD0LPSj7QnPIEO7mt1NWY6y08WjigXw3yZ3CXO5A4f4xooMqHDTOrzLJgm06x/7crziw+GdZVBUK15"
        + "iJ8s+cLf1ed4LGyre7+prOdb4M+GkgzOz9IzTK1JRtxKIhYRUYGgbylSCLYGRT8ajC885dFh/YSVpNV/a6w+qAPqx9kh0HicXQkJ"
        + "hgoPHqT4cDjyhrv6xKH4EDdHbIxPUGtzCuGvDmBs/GDhpg5+WNupmDJUSfFpUBrYroyYqiSDXbpHNB9w5ALq5mZ2Y6d5Qk9DkV5x"
        + "Rcuu9Yog620sqQUpfwyRD9nNO6P0V7g1U5J553B2kCZqoLNKkPCgwSd+JxvOnMe6acrHCskHBlGp56lc6gnBF2jtQcvytlqaQZqI"
        + "X98F0DuujO8LN93wKUrzzhiQiXvQhFcSxMNH+a1LOkmZk6wRJDtH5hQUH2/k0LTi84XMqKAUhoUtnd491KV3qjya8C11mqTDcLRb"
        + "PPvlwCencwlC7TLYvUuKi08hciR4xacFSaBfdUJhoDQtee9yQjBm4Zk6LqoXHpPjmqX2FwpYGwaGoZ7lByeBQlXuSD64bl18jowE"
        + "BjUjxspRsPfOOcb04Frx9BQy1t9aJonnYngcKJDBt6oHr4hMlDdnzjKPfBZJix4w4gQqSoZ+I5CnbAJoSdlCnX+GzDli4VEVLvnR"
        + "lbowcY7YVnoTOiPvMIoTOqoAusgLcOQldeZvirkO58PceffCMxocshbpHZrQmU/LQ64tOrnqyPkjiMalufpYNVc6l48jXa5LW66q"
        + "pzyJ2qKTqI5lF4+sutiYRPIXe8I7t6iZZ1tJc+4sBqNwtpWQaxcyNpGbWmQYpvRgaKKQT7LBWnVJiPRqiPd938T79tyJo2MTHbjR"
        + "AfV2KTRrQIeJiQ4daGyNDSM0ZGnA0ZGlCh3Ig7F4am5TYB0rC4N5LBaBNxYdKByKReCtDWgec3WJV+GMaQNQHxslUXhXh2yFslkM"
        + "ScTqK0UwQV22DR+cilI4VYnATb3nEOckCchdDFV4qkg/SlTdJA0d2wMtfkQyFcceYe74ZOG6IQnZTtsmMjGQfuvInCk/eanAV/zk"
        + "Zd2aUvWk5NDpueQBRTyV0nKKmjhH2KIzh3TvB8uQ2i1ETo8U6YpCFLn2xItH7axBH/5KtS8ZFKWuaCHW/QKRM2cqHm6yehk83oNd"
        + "tLTVnUYUb7LUFnDGOuqLbhoqJHI7NI1dGX2kE7HotZvf5iEgl8UoHAGyWgxIG3TBKU1q0gZNysLpG4fFKJ48ccQVcei3GK/RpSm3"
        + "qW1L+OwDVm5sp22H7sKgSjTS3F0XAvbIvdr00s4eEI4QJZPsQSq2Pmo3ukL1C8eIvDYywYINjCOV20TvnGLOj5CE/AiJNcwGKYtS"
        + "dduFk4mFoxtkBp4smqPLEpEzaSg2P9sDuTCmn26gMlzKa2YsL204vzGUzDhP7TCBlPfKkkN6ay85AJHa2vy/dhKp0O7qWFEC1kUU"
        + "gtNlYyEY0aIQLNHWQjD6KiaD1PSNe8vU18x/61pXooPUOHbaLQzohDFccWN4WerjkBSImVJLZxcHapuvlGjtUCKcp4r4043L0hQ7"
        + "LR0ymgRKmGNXqhMlTBWR0ntHU0yQ6K2VOHcmG/iDooKP76x8DPBJDy10azzE3MLHK3zmuk+/N4U/2NE68kXHnATjj8gZ4GsLGHeq"
        + "AzAiIW/4kovhf0G7EMN7msSCNuI3ruQsA3wwNm2MpaHk9r3CcLslMWEJExkEFPfCPg2tibvvsClL18to7oGcO8OfCIpgcoR9+A4b"
        + "s9iiuNASmIUF8E1xZEWVGAaNW0ykC488HLk11lwAR/jDhUFCHYXp03dII/baNg1fPhcJE+bAWN+1wAZHPjtiR35I8ITgfIkEv5dL"
        + "lHg/UmMT2G+3TPCSwIvKEjk4SGjPXoL5npkN3I58c+S3NPKNZRptXjKX4JWF0syXdTck3nuDHlXaxXz/R/Abse/s/OZgQQwJLhGj"
        + "BBbrk+C3FrGT4MAEryzg8u+qB4XfVReKAUQw3M8HNxESwgoiIHZbIYJfAqcF8J0TLCkmwDbx4WBJMQF+a1MnAQ5M8Mqhe+2IflwR"
        + "yPMt0Ynn3mFF9RL1mCkc+CN8urNaC8DGKpptt9xYJjb7SITBF3/3YMXi3hw2tsUKG+PT8R0mS3Kv7T/DZLUYLyxI8MamSAKcmOB7"
        + "JzjkTdAS/M4NDgITvLUpRyuJEmk524HbcpZ/mSEo/jKDci3FX2YIir/MUETxfWSBYrsyCqYXh1K42swQrlbVrrewt1piQ6cggs9N"
        + "A1846HbU4KDjyFdS28bO/0e7uuMk1IQT5ySCUkkyoB/l9MUJi+q4uFkco/lvp8a4QY2NjnQK0W47zVOSEFYIOGLf282TAPPWcAl+"
        + "cIKFeZJgm3ni4JBXfiT40TmysGUSbLNlEhyYYJstA9ZhCTThI2N49YHvidTaXwCrALN9KR7H68QGqYFl7x0WNeUdBCBDVxz8wVAN"
        + "8cAHLhWBEvlrp7QxP9YPAGsvnFLBUsIKqUDstw6zR2CfF84k+FubQSVwkCQm+I3FzXOwZLQAv7Xa9URHau0bsusWH9B0qITJmD9o"
        + "ONzBdC0paDiLYYwpT1gExgkL2tOSyBxRAaaYLWo4A96iSf7IN7S4eTDGQyTemLLR9muO9OuQ7oMMTOd4QcNBBjFH9xmFwnjuMwql"
        + "OdrPKBTHdJ5RYPqMQtBwRqE6qvWMQgVqP3hQhVoPHlSh1oMH1blaDx5UodaDB0wfPAiazhMw8zwBiV/pPMHH7+rlNC0D/ZaRmRYk"
        + "2qdaL5foJZfooDCmH0u5ch4+YCopZ5Qkygam9ptyAxOTDUwcmQCSKuxt3uoUsjqkH7bTREpg25RAv0r/RG9ZtKsSeM9LZhJqPyZR"
        + "GBXmmIqnFcKoKKz3gqQLNaqwTw09/qYKunv8DZryHn8xpujxL40p7h6IzDhVTf4f+d63ZKmfwFT9tIhum+jIjfbbzETHBvq+Bhya"
        + "4MQCxma6CDsJiWn8EFKwrWdwII8/Uzjn0AN3o3oJaG9UZ3JzGzXLT1UZun2vNavCWncPuDDrjh5w33RQvlbn9ENlvfdKSZyt3QXT"
        + "7+z0ZWZZNWjq9K1FWzt9a9HWTt8S2t3pWwgSsNMXm8d4xMbdADVsWKYRyYo88HVr7IBUpC9pRfA/oYntnamJvrYEfLauZt9SSONs"
        + "ty1Y7HK7rdUJlIE2J9DQ8mogIwiDQ2XZ0bV9sFh2QrYk8rEBWWx3/WD3Fq7GWNNb8OZUXowXzakh3yWLi9YS7A5pPo+pn7iY5DbH"
        + "DlhfYt83YXGj1+cZ3AeOvaxi5SxcfZgl8XP2YRrMcndYCtvS0GHJih2WQUPHpEHYNgyayK2L9rflrYuC8XV2QhYE1dXgWFJ/V5dh"
        + "iVXOVq1ScO1sgzI9RVJug7LqaRlo01OU/1Tp1Ed3XIW/zs6ReculKe5eJFbsRZJ43JPS+PDKblZ5L5I5enjdhLZ0LtWjQ7NzKVy4"
        + "0dbOpRp02sIyBdJPjG2y2W+bQaSzzakgP+5+H+XvI30Est22+3sB5IsSwPC2jJTRmKg/GVi2cIyaMhP5YEf6aeH+rx3ItrkktqxD"
        + "ysoQF/Kc3EGoT9kZotvQflLyr66ukkLJwNXaUQihnI0YJQvj6q8oQN39FcX7g3lPeDEo51IXvqkPmBt6MYo+w9GLoeQz1v2qObOb"
        + "NiB5wlvCcY4hETN8W092rEi2I+JlHnHkqrQaIUmxbiduu+IfDhTKsagqR8FbOJsSKtbB2ZRQRrubEowcr6GFgMkWAm7fA9nomsfi"
        + "8evyIX9CR/jSEIonR2hpecJT7LuyK9Ba4mg3KAaCMYZifNSUa+mdzRUVkcyCdPcRFAIGZ3uAoOgX//X/ANO1Ir/fRgEA";
    let dadosInternos = null, registros = null, carregada = false, carregando = null;
    const limparValor = valor => String(valor ?? "").replace(/\r/g, "").trim();
    function normalizarTexto(valor) { return String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim(); }
    function indice36(valor) { const numero = parseInt(String(valor || "0"), 36); return Number.isFinite(numero) ? numero : 0; }
    function percentualTexto(valor) { if (valor === null || valor === undefined || valor === "") return ""; const numero = Number(valor); if (!Number.isFinite(numero)) return ""; return numero.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%"; }
    function resolverChaveParametro(chave) { const valor = limparValor(chave); if (!valor) return ""; return ALIASES_PARAMETROS_CREDITO_RURAL[valor] || valor; }
    function obterParametro(chave) { const chaveResolvida = resolverChaveParametro(chave); if (!chaveResolvida) return null; return PARAMETROS_CREDITO_RURAL[chaveResolvida] || null; }
    function listarParametros() { return Object.entries(PARAMETROS_CREDITO_RURAL).map(([chave, parametro]) => ({ chave, ...parametro, taxaSingularTexto: percentualTexto(parametro.taxaSingular), taxaAssociadoTexto: percentualTexto(parametro.taxaAssociado) })); }
    function atualizarParametro(chave, alteracoes = {}) {
        const chaveResolvida = resolverChaveParametro(chave), parametro = obterParametro(chaveResolvida);
        if (!parametro) throw new Error(`Parâmetro de Crédito Rural não cadastrado: ${chave}`);
        const camposPermitidos = ["beneficiario", "linha", "finalidade", "fonte", "prazoMeses", "taxaSingular", "taxaAssociado"];
        for (const campo of Object.keys(alteracoes)) {
            if (!camposPermitidos.includes(campo)) throw new Error(`Campo não permitido em PARAMETROS_CREDITO_RURAL: ${campo}`);
            const valor = alteracoes[campo];
            if (["prazoMeses", "taxaSingular", "taxaAssociado"].includes(campo) && valor !== null) {
                const numero = Number(valor);
                if (!Number.isFinite(numero) || numero < 0) throw new Error(`${campo} deve ser um número maior ou igual a zero.`);
                parametro[campo] = numero;
            } else parametro[campo] = valor;
        }
        return { chave: chaveResolvida, ...parametro, taxaSingularTexto: percentualTexto(parametro.taxaSingular), taxaAssociadoTexto: percentualTexto(parametro.taxaAssociado) };
    }
    function atualizarTaxa(chave, taxaSingular, taxaAssociado) { return atualizarParametro(chave, { taxaSingular, taxaAssociado }); }
    async function descompactarDados() {
        if (dadosInternos) return dadosInternos;
        if (typeof DecompressionStream === "undefined") throw new Error("O navegador não possui suporte a DecompressionStream. Utilize uma versão atual do Chrome ou Microsoft Edge.");
        try {
            const binario = atob(BASE_DADOS_GZIP_BASE64), bytes = new Uint8Array(binario.length);
            for (let i = 0; i < binario.length; i++)bytes[i] = binario.charCodeAt(i);
            const fluxoDescompactado = new Blob([bytes], { type: "application/gzip" }).stream().pipeThrough(new DecompressionStream("gzip"));
            const leitor = fluxoDescompactado.getReader(), decodificador = new TextDecoder("utf-8");
            let texto = "";
            while (true) { const { value, done } = await leitor.read(); if (done) break; texto += decodificador.decode(value, { stream: true }); }
            texto += decodificador.decode();
            if (!texto.trim()) throw new Error("A base interna foi descompactada sem conteúdo.");
            dadosInternos = JSON.parse(texto);
            if (!dadosInternos || typeof dadosInternos !== "object" || typeof dadosInternos.base !== "string" || !Array.isArray(dadosInternos.catalogo)) throw new Error("A estrutura da base interna de Crédito Rural é inválida.");
            return dadosInternos;
        } catch (erro) {
            console.error("[Crédito Rural] Erro ao descompactar a base ASTEC:", erro);
            throw new Error(`Falha ao descompactar a base interna de Crédito Rural: ${erro && erro.message ? erro.message : String(erro)}`);
        }
    }
    function criarLinhaRegra(regra, numero) {
        const chaveParametroOriginal = regra.parametro || regra.chaveParametro || regra.chaveTaxa || "", chaveParametro = resolverChaveParametro(chaveParametroOriginal);
        function parametroAtual() { return obterParametro(chaveParametro); }
        return Object.freeze({
            numero, chave: regra.chave || "", chaveParametro, chaveTaxa: chaveParametro,
            get beneficiario() { const parametro = parametroAtual(); return parametro?.beneficiario || regra.beneficiario || ""; },
            get linha() { const parametro = parametroAtual(); return parametro?.linha || regra.linha || ""; },
            get finalidade() { const parametro = parametroAtual(); return parametro?.finalidade || regra.finalidade || ""; },
            get fonte() { const parametro = parametroAtual(); return parametro?.fonte || regra.fonte || ""; },
            get prazo() { const parametro = parametroAtual(); if (parametro && parametro.prazoMeses !== undefined && parametro.prazoMeses !== null) return parametro.prazoMeses; return regra.prazo ?? regra.prazoMeses ?? null; },
            get prazoMeses() { return this.prazo; },
            get taxaSingular() { const parametro = parametroAtual(); if (parametro && parametro.taxaSingular !== undefined && parametro.taxaSingular !== null) return parametro.taxaSingular; return regra.taxaSingular ?? null; },
            get taxaAssociado() { const parametro = parametroAtual(); if (parametro && parametro.taxaAssociado !== undefined && parametro.taxaAssociado !== null) return parametro.taxaAssociado; return regra.taxaAssociado ?? null; },
            get taxaSingularTexto() { return percentualTexto(this.taxaSingular); },
            get taxaAssociadoTexto() { return percentualTexto(this.taxaAssociado); },
            aplicabilidade: regra.aplicabilidade || "", condicao: regra.condicao || "", fonteRegra: regra.fonteRegra || ""
        });
    }
    async function montarRegistros() {
        if (registros) return registros;
        const dados = await descompactarDados();
        registros = Object.freeze(dados.base.split("\n").filter(Boolean).map((linha, id) => {
            const partes = linha.split("~"), regras = String(partes[10] || "").split(".").filter(Boolean).map(indice36);
            return Object.freeze({
                id: String(id), codigo: partes[0] || "", produto: dados.produtos[indice36(partes[1])] || "", finalidade: dados.finalidades[indice36(partes[2])] || "",
                modalidade: dados.modalidades[indice36(partes[3])] || "", variedade: dados.variedades[indice36(partes[4])] || "", cesta: dados.cestas[indice36(partes[5])] || "",
                consorcio: dados.consorcios[indice36(partes[6])] || "", unidadeProducao: dados.unidades[indice36(partes[7])] || "", zoneamento: dados.zoneamentos[indice36(partes[8])] || "",
                abaOrigem: dados.abas[indice36(partes[9])] || "", linhas: Object.freeze(regras.map((indiceRegra, posicao) => criarLinhaRegra(dados.catalogo[indiceRegra], posicao + 1)))
            });
        }));
        return registros;
    }
    async function carregar() {
        if (carregada) return registros;
        if (carregando) return carregando;
        carregando = (async () => { const base = await montarRegistros(); carregada = true; return base; })();
        try { return await carregando; } finally { carregando = null; }
    }
    function garantirCarregada() { if (!carregada) throw new Error("A base de Crédito Rural ainda não foi carregada."); }
    function listarFinalidades() {
        garantirCarregada();
        const ordem = ["Custeio Agrícola", "Custeio Pecuário", "Investimento"];
        return [...new Set(registros.map(registro => registro.finalidade).filter(Boolean))].sort((a, b) => {
            const ia = ordem.indexOf(a), ib = ordem.indexOf(b);
            if (ia !== -1 || ib !== -1) { if (ia === -1) return 1; if (ib === -1) return -1; return ia - ib; }
            return a.localeCompare(b, "pt-BR");
        });
    }
    function listarProdutos(finalidade) { garantirCarregada(); return [...new Set(registros.filter(registro => registro.finalidade === finalidade).map(registro => registro.produto).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR")); }
    function listarEnquadramentos(finalidade, produto) { garantirCarregada(); return registros.filter(registro => registro.finalidade === finalidade && registro.produto === produto); }
    function obterEnquadramento(id) { garantirCarregada(); return registros.find(registro => registro.id === String(id)) || null; }
    function obterLinha(enquadramentoId, indiceLinha) {
        const enquadramento = obterEnquadramento(enquadramentoId);
        if (!enquadramento) return null;
        const indice = Number(indiceLinha);
        if (!Number.isInteger(indice) || indice < 0) return null;
        return enquadramento.linhas[indice] || null;
    }
    function resumirTexto(texto, tamanho = 70) { const valor = limparValor(texto); return valor.length <= tamanho ? valor : valor.slice(0, tamanho - 3) + "..."; }
    function valorAplicavel(valor) { const normalizado = normalizarTexto(valor); return normalizado && !["nao se aplica", "nao e aplicavel"].includes(normalizado); }
    function montarDescricaoEnquadramento(item, mostrarCodigo = true) {
        const partes = [];
        if (mostrarCodigo && item.codigo) partes.push(`Código ${item.codigo}`);
        if (item.modalidade) partes.push(resumirTexto(item.modalidade, 55));
        if (valorAplicavel(item.variedade)) partes.push(resumirTexto(item.variedade, 70));
        if (valorAplicavel(item.consorcio)) partes.push(item.consorcio);
        if (valorAplicavel(item.zoneamento)) partes.push(item.zoneamento);
        return partes.join(" | ");
    }
    function preencherFinalidades(select, selecionada = "") {
        if (!select) return;
        select.innerHTML = "";
        for (const nome of listarFinalidades()) { const option = new Option(nome, nome); if (nome === selecionada) option.selected = true; select.appendChild(option); }
    }
    function preencherProdutos(select, finalidade, selecionado = "") {
        if (!select) return;
        select.innerHTML = "";
        for (const nome of listarProdutos(finalidade)) { const option = new Option(nome, nome); if (nome === selecionado) option.selected = true; select.appendChild(option); }
    }
    function preencherEnquadramentos(select, finalidade, produto, selecionado = "") {
        if (!select) return [];
        const lista = listarEnquadramentos(finalidade, produto);
        select.innerHTML = "";
        for (const item of lista) { const option = new Option(montarDescricaoEnquadramento(item, true), item.id); if (item.id === String(selecionado)) option.selected = true; select.appendChild(option); }
        select.disabled = lista.length <= 1;
        return lista;
    }
    function obterUrlBase() { return ORIGEM_BASE_CREDITO_RURAL; }
    function obterQuantidadeRegistros() { return registros ? registros.length : 1110; }
    function obterCatalogoRegras() { return dadosInternos ? dadosInternos.catalogo : []; }
    async function validarParametros() {
        const dados = await descompactarDados(), encontrados = new Set(), ausentes = new Set();
        for (const regra of dados.catalogo || []) {
            const chaveOriginal = regra.parametro || regra.chaveParametro || regra.chaveTaxa || "";
            if (!chaveOriginal) continue;
            const chaveResolvida = resolverChaveParametro(chaveOriginal);
            encontrados.add(chaveResolvida);
            if (!PARAMETROS_CREDITO_RURAL[chaveResolvida]) ausentes.add(chaveResolvida);
        }
        return { valido: ausentes.size === 0, quantidadeParametrosUtilizados: encontrados.size, parametrosUtilizados: [...encontrados].sort(), parametrosAusentes: [...ausentes].sort() };
    }
    window.CreditoRuralBase = Object.freeze({
        carregar, listarFinalidades, listarProdutos, listarEnquadramentos, obterEnquadramento, obterLinha,
        preencherFinalidades, preencherProdutos, preencherEnquadramentos, montarDescricaoEnquadramento,
        normalizarTexto, obterUrlBase, obterQuantidadeRegistros, obterCatalogoRegras, resolverChaveParametro,
        obterParametro, listarParametros, atualizarParametro, atualizarTaxa, validarParametros
    });
})();