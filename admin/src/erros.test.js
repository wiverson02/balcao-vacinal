import { describe, it, expect } from "vitest";
import { traduzirErro } from "./erros";

describe("traduzirErro", () => {
  it("traduz as regras do banco", () => {
    expect(traduzirErro('new row for relation "itens" violates check constraint "itens_check"')).toMatch(/escolher a fonte/);
    expect(traduzirErro('violates foreign key constraint "itens_bloco_id_fkey" on table "itens"')).toMatch(/ainda tem itens/);
    expect(traduzirErro('violates foreign key constraint "itens_fonte_id_fkey"')).toMatch(/ainda é usada/);
    expect(traduzirErro('duplicate key value violates unique constraint "blocos_rede_tipo_rotulo_key"')).toMatch(/Já existe um bloco/);
    expect(traduzirErro('new row violates row-level security policy for table "itens"')).toMatch(/lista de editores/);
    expect(traduzirErro('violates check constraint "fontes_url_check"')).toMatch(/https/);
  });
  it("campo vazio genérico e mensagem desconhecida", () => {
    expect(traduzirErro('violates check constraint "itens_nome_check"')).toMatch(/vazio ou inválido/);
    expect(traduzirErro("algo inesperado")).toBe("algo inesperado");
    expect(traduzirErro()).toBe("Erro desconhecido.");
  });
});
