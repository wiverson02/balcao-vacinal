import { describe, expect, it } from "vitest";
import { diagnosticarProntidaoPublicacao } from "./lib/conversao.js";

describe("diagnosticarProntidaoPublicacao", () => {
  it("separa bloqueios, aprovações sem fonte conferida e rascunhos sem mutar os dados", () => {
    const blocos = [{ id: "b1" }, { id: "b2" }];
    const itens = [
      { id: "i1", bloco_id: "b1", status: "aprovado", fonte_id: "f1" },
      { id: "i2", bloco_id: "b1", status: "rascunho" },
      { id: "i3", bloco_id: "b2", status: "aprovado", fonte_id: "f2" },
      { id: "i4", bloco_id: "b2", status: "arquivado" },
    ];
    const guiaVacinas = [
      { id: "g1", status: "aprovado", fonte_id: "f3" },
      { id: "g2", status: "rascunho" },
    ];
    const fontes = [
      { id: "f1", conferido_em: "2026-11-18" },
      { id: "f2", conferido_em: null },
    ];

    const resultado = diagnosticarProntidaoPublicacao({ blocos, itens, guiaVacinas, fontes });

    expect(resultado.blocosSemItensAprovados).toEqual([]);
    expect(resultado.itensAprovadosSemFonteConferida).toEqual([itens[2]]);
    expect(resultado.guiaAprovadoSemFonteConferida).toEqual([guiaVacinas[0]]);
    expect(resultado.itensRascunho).toEqual([itens[1]]);
    expect(resultado.guiaRascunho).toEqual([guiaVacinas[1]]);
    expect(itens).toHaveLength(4);
  });

  it("trata ausência de fonte e bloco sem aprovação como pendências, não arquivados", () => {
    const resultado = diagnosticarProntidaoPublicacao({
      blocos: [{ id: "b1" }, { id: "b2" }],
      itens: [{ id: "i1", bloco_id: "b1", status: "aprovado", fonte_id: null }],
      guiaVacinas: [{ id: "g1", status: "arquivado" }],
      fontes: [],
    });

    expect(resultado.blocosSemItensAprovados).toEqual([{ id: "b2" }]);
    expect(resultado.itensAprovadosSemFonteConferida).toHaveLength(1);
    expect(resultado.guiaAprovadoSemFonteConferida).toEqual([]);
    expect(resultado.itensRascunho).toEqual([]);
    expect(resultado.guiaRascunho).toEqual([]);
  });
});
