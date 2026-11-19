import { describe, expect, it, vi } from "vitest";
import produtos from "../src/data/produtos.json";
import { linhasDoGuia } from "./lib/guia.js";
import { semearGuiaVacinas } from "./lib/banco.js";

describe("linhasDoGuia", () => {
  it("converte os formatos CN, FI e EX em linhas sem duplicar vacinas", () => {
    const linhas = linhasDoGuia(produtos);
    const nomes = linhas.map((linha) => linha.nome);
    const meningococicaB = linhas.find((linha) => linha.nome === "Meningocócica B");
    const febreTifoide = linhas.find((linha) => linha.nome === "Febre tifoide");

    expect(linhas).toHaveLength(20);
    expect(new Set(linhas.map((linha) => linha.slug)).size).toBe(linhas.length);
    expect(meningococicaB.nome_comercial).toContain("Bexsero");
    expect(meningococicaB.extras[0]).toMatchObject({
      tipo: "nota",
      titulo: "Ficha de imunização",
      conteudo: produtos.FI["Meningocócica B"],
    });
    expect(febreTifoide.indicacoes).toEqual(["Febre tifoide, em viagens a áreas de risco"]);
    expect(linhas.every((linha) => linha.status === "rascunho" && linha.fonte_id === null)).toBe(true);
    expect(nomes).toContain("Febre tifoide");
  });

  it("falha explicitamente quando dois nomes geram o mesmo slug", () => {
    expect(() => linhasDoGuia({
      CN: { A: { marcas: "Marca A", diferencial_sus: "", beneficio: "" } },
      FI: { Á: "Ficha" },
      EX: [],
    })).toThrow(/geram o mesmo slug/);
  });
});

describe("semearGuiaVacinas", () => {
  it("chama a RPC idempotente e informa novos e já existentes", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 17, error: null });
    const resultado = await semearGuiaVacinas({ rpc }, produtos);

    expect(rpc).toHaveBeenCalledWith("semear_guia_vacinas", {
      p_guia_vacinas: expect.arrayContaining([
        expect.objectContaining({ status: "rascunho", fonte_id: null }),
      ]),
    });
    expect(resultado).toEqual({ total: 20, inseridos: 17, existentes: 3 });
  });

  it("explica quando a RPC da migration não está instalada", async () => {
    const client = { rpc: vi.fn().mockResolvedValue({ error: { code: "PGRST202" } }) };
    await expect(semearGuiaVacinas(client, produtos)).rejects.toThrow(/20261118213413_guia_vacinas_e_reordenacao\.sql/);
  });
});
