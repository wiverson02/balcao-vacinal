import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  supabase: { rpc: vi.fn() },
}));

vi.mock("./supabase", () => ({ supabase: mocks.supabase, erroConfiguracao: null }));

import { gravarOrdens } from "./api";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.supabase.rpc.mockResolvedValue({ data: null, error: null });
});

describe("gravarOrdens", () => {
  it("usa a RPC de blocos com todos os ids em ordem", async () => {
    await gravarOrdens("blocos", [["b2", 2], ["b1", 1]]);

    expect(mocks.supabase.rpc).toHaveBeenCalledWith("reordenar_blocos", { p_ids: ["b1", "b2"] });
  });

  it("usa a RPC de itens com o bloco correspondente", async () => {
    await gravarOrdens("itens", [["i2", 2], ["i1", 1]], "bloco-1");

    expect(mocks.supabase.rpc).toHaveBeenCalledWith("reordenar_itens", {
      p_bloco_id: "bloco-1",
      p_ids: ["i1", "i2"],
    });
  });

  it("usa a RPC do guia de vacinas", async () => {
    await gravarOrdens("guia_vacinas", [["g2", 2], ["g1", 1]]);

    expect(mocks.supabase.rpc).toHaveBeenCalledWith("reordenar_guia_vacinas", { p_ids: ["g1", "g2"] });
  });

  it("falha explicitamente sem tabela/bloco suportado", () => {
    expect(() => gravarOrdens("itens", [["i1", 1]])).toThrow(/identificar a lista/);
    expect(mocks.supabase.rpc).not.toHaveBeenCalled();
  });
});
