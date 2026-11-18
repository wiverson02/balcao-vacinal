import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { semearBanco, publicarDoBanco } from "./lib/banco.js";
import { textoCalendario, textoFontes, textoMeta, linhasDoCalendario, verificarPublicacao } from "./lib/conversao.js";

const DATA = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "data");
const lf = (s) => s.replace(/\r\n/g, "\n");
const ler = (dir, nome) => lf(fs.readFileSync(path.join(dir, nome), "utf-8"));

// Banco de mentira, em memória, que imita só o que os scripts usam do supabase-js.
function bancoFalso() {
  const tabelas = { fontes: [], blocos: [], itens: [] };
  const estado = { rpcChamadas: 0, erroRpc: null, erroExportRpc: null, exportacao: undefined };
  let seq = 0;
  return {
    tabelas,
    estado,
    from(nome) {
      const t = tabelas[nome];
      return {
        select(_cols, opts) {
          if (opts?.head) return Promise.resolve({ count: t.length, error: null });
          return { range: (de, ate) => Promise.resolve({ data: t.slice(de, ate + 1), error: null }) };
        },
        insert(linhas) {
          const novas = linhas.map((l) => ({ id: l.id ?? `id-${++seq}`, criado_em: String(1000000 + seq), ...l }));
          t.push(...novas);
          const r = Promise.resolve({ error: null });
          r.select = () => Promise.resolve({ data: novas, error: null });
          return r;
        },
      };
    },
    async rpc(nome, args) {
      estado.rpcChamadas++;
      if (nome === "exportar_editorial") {
        if (estado.erroExportRpc) return { data: null, error: estado.erroExportRpc };
        if (estado.exportacao !== undefined) return { data: estado.exportacao, error: null };
        return {
          data: {
            blocos: [...tabelas.blocos],
            itens: [...tabelas.itens],
            fontes: [...tabelas.fontes],
          },
          error: null,
        };
      }
      if (nome === "semear_editorial") {
        if (estado.erroRpc) return { data: null, error: estado.erroRpc };
        for (const [tabela, chave] of [
          ["fontes", "p_fontes"],
          ["blocos", "p_blocos"],
          ["itens", "p_itens"],
        ]) {
          tabelas[tabela].push(...args[chave]);
        }
        return { data: null, error: null };
      }
      throw new Error(`RPC inesperada: ${nome}`);
    },
  };
}

let dir;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "bv-"));
  try {
    for (const n of ["calendario.json", "fontes.json", "meta.json"]) {
      fs.copyFileSync(path.join(DATA, n), path.join(dir, n));
    }
  } catch (erro) {
    fs.rmSync(dir, { recursive: true, force: true });
    dir = undefined;
    throw erro;
  }
});

afterEach(() => {
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

describe("formato dos arquivos gerados", () => {
  it("os textos gerados são idênticos aos arquivos de hoje (o Git não mostra diferença à toa)", () => {
    const lerJson = (n) => JSON.parse(fs.readFileSync(path.join(DATA, n), "utf-8"));
    expect(textoCalendario(lerJson("calendario.json"))).toBe(ler(DATA, "calendario.json"));
    expect(textoFontes(lerJson("fontes.json"))).toBe(ler(DATA, "fontes.json"));
    expect(textoMeta(lerJson("meta.json"))).toBe(ler(DATA, "meta.json"));
  });
});

describe("semear e publicar (ida e volta)", () => {
  it("semear copia tudo para o banco e publicar devolve exatamente os mesmos arquivos", async () => {
    const banco = bancoFalso();
    const r = await semearBanco(banco, dir);
    expect(r.blocos).toBe(13 + 12 + 4 + 4);
    expect(banco.tabelas.itens.every((i) => i.status === "aprovado" && i.fonte_id)).toBe(true);

    const antes = ["calendario.json", "fontes.json", "meta.json"].map((n) => ler(dir, n));
    const pub = await publicarDoBanco(banco, dir, "2030-01-01");
    expect(pub.ok).toBe(true);
    expect(pub.mudou).toEqual({ calendario: false, fontes: false, meta: false });
    expect(["calendario.json", "fontes.json", "meta.json"].map((n) => ler(dir, n))).toEqual(antes);
  });

  it("semear se recusa a rodar com o banco já preenchido", async () => {
    const banco = bancoFalso();
    await semearBanco(banco, dir);
    await expect(semearBanco(banco, dir)).rejects.toThrow(/vazio/);
  });

  it.each(["fontes", "blocos", "itens"])(
    "semear recusa banco com registros em %s antes de chamar a RPC",
    async (tabela) => {
      const banco = bancoFalso();
      banco.tabelas[tabela].push({ id: "existente" });

      await expect(semearBanco(banco, dir)).rejects.toThrow(tabela);
      expect(banco.estado.rpcChamadas).toBe(0);
    },
  );

  it("não altera tabelas quando a RPC transacional retorna erro", async () => {
    const banco = bancoFalso();
    banco.estado.erroRpc = { message: "falha simulada", code: "XX000" };

    await expect(semearBanco(banco, dir)).rejects.toThrow(/transação do PostgreSQL/);
    expect(banco.estado.rpcChamadas).toBe(1);
    expect(banco.tabelas).toEqual({ fontes: [], blocos: [], itens: [] });
  });

  it("explica quando a função transacional ainda não foi instalada", async () => {
    const banco = bancoFalso();
    banco.estado.erroRpc = { message: "function not found", code: "PGRST202" };

    await expect(semearBanco(banco, dir)).rejects.toThrow(/20261118134000_semear_atomico\.sql/);
    expect(banco.tabelas).toEqual({ fontes: [], blocos: [], itens: [] });
  });

  it("editar um item no banco muda só o calendário, atualiza a data e mantém o resgate", async () => {
    const banco = bancoFalso();
    await semearBanco(banco, dir);
    const item = banco.tabelas.itens.find((i) => i.nome === "Hexavalente");
    item.esquema = "TEXTO NOVO";
    const pub = await publicarDoBanco(banco, dir, "2030-01-01");
    expect(pub.mudou).toEqual({ calendario: true, fontes: false, meta: false });
    const cal = JSON.parse(fs.readFileSync(path.join(dir, "calendario.json"), "utf-8"));
    expect(JSON.stringify(cal.privada.crianca)).toContain("TEXTO NOVO");
    const original = JSON.parse(fs.readFileSync(path.join(DATA, "calendario.json"), "utf-8"));
    expect(cal.privada.resgateCrianca).toEqual(original.privada.resgateCrianca);
    expect(JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf-8")).atualizadoEm).toBe("2030-01-01");
  });

  it("rascunho e arquivado não vão para o app", async () => {
    const banco = bancoFalso();
    await semearBanco(banco, dir);
    const [a, b] = banco.tabelas.itens.filter((i) => i.nome === "Rotavírus");
    a.status = "rascunho";
    b.status = "arquivado";
    const pub = await publicarDoBanco(banco, dir, "2030-01-01");
    const cal = fs.readFileSync(path.join(dir, "calendario.json"), "utf-8");
    const original = fs.readFileSync(path.join(DATA, "calendario.json"), "utf-8");
    expect((cal.match(/"Rotavírus"/g) ?? []).length).toBe((original.match(/"Rotavírus"/g) ?? []).length - 2);
    expect(pub.totais.rascunhos).toBe(1);
  });

  it("não publica se um bloco ficar sem item aprovado, e não mexe nos arquivos", async () => {
    const banco = bancoFalso();
    await semearBanco(banco, dir);
    const antes = ler(dir, "calendario.json");
    const idBloco = banco.tabelas.blocos.find((b) => b.rede === "privada" && b.rotulo === "Idoso").id;
    banco.tabelas.itens.filter((i) => i.bloco_id === idBloco).forEach((i) => (i.status = "rascunho"));
    const pub = await publicarDoBanco(banco, dir);
    expect(pub.ok).toBe(false);
    expect(pub.problemas.join()).toContain("privada / Idoso");
    expect(ler(dir, "calendario.json")).toBe(antes);
  });

  it.each(["fontes", "blocos", "itens"])(
    "bloqueia a publicação se a exportação de %s estiver vazia, sem tocar nos JSONs",
    async (tabela) => {
      const banco = bancoFalso();
      await semearBanco(banco, dir);
      banco.tabelas[tabela] = [];
      const nomes = ["calendario.json", "fontes.json", "meta.json"];
      const antes = nomes.map((nome) => ler(dir, nome));
      const antesDeEscrever = vi.fn();

      const pub = await publicarDoBanco(banco, dir, "2030-01-01", antesDeEscrever);

      expect(pub.ok).toBe(false);
      expect(pub.problemas.join(" ")).toContain(`não contém ${tabela}`);
      expect(nomes.map((nome) => ler(dir, nome))).toEqual(antes);
      expect(antesDeEscrever).not.toHaveBeenCalled();
    },
  );

  it("bloqueia estrutura incompleta da RPC sem tocar nos JSONs", async () => {
    const banco = bancoFalso();
    await semearBanco(banco, dir);
    banco.estado.exportacao = {
      fontes: [...banco.tabelas.fontes],
      blocos: [...banco.tabelas.blocos],
      itens: [...banco.tabelas.itens],
    };
    banco.estado.exportacao.itens[0].esquema = "";
    const nomes = ["calendario.json", "fontes.json", "meta.json"];
    const antes = nomes.map((nome) => ler(dir, nome));
    const antesDeEscrever = vi.fn();

    const pub = await publicarDoBanco(banco, dir, "2030-01-01", antesDeEscrever);

    expect(pub.ok).toBe(false);
    expect(pub.problemas.join(" ")).toContain("não tem esquema");
    expect(nomes.map((nome) => ler(dir, nome))).toEqual(antes);
    expect(antesDeEscrever).not.toHaveBeenCalled();
  });

  it("bloqueia a publicação quando não há itens aprovados", async () => {
    const banco = bancoFalso();
    await semearBanco(banco, dir);
    banco.tabelas.itens.forEach((item) => {
      item.status = "rascunho";
    });
    const nomes = ["calendario.json", "fontes.json", "meta.json"];
    const antes = nomes.map((nome) => ler(dir, nome));
    const antesDeEscrever = vi.fn();

    const pub = await publicarDoBanco(banco, dir, "2030-01-01", antesDeEscrever);

    expect(pub.ok).toBe(false);
    expect(pub.problemas).toContain("A exportação não contém nenhum item aprovado.");
    expect(nomes.map((nome) => ler(dir, nome))).toEqual(antes);
    expect(antesDeEscrever).not.toHaveBeenCalled();
  });

  it("não conserva metadados de seções removidas", async () => {
    const banco = bancoFalso();
    await semearBanco(banco, dir);
    const metaPath = path.join(dir, "meta.json");
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
    meta.secoes["privada.grupos.Bloco removido"] = ["fonte-antiga"];
    fs.writeFileSync(metaPath, JSON.stringify(meta));

    await publicarDoBanco(banco, dir, "2030-01-01");

    const metaPublicada = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
    expect(metaPublicada.secoes).not.toHaveProperty("privada.grupos.Bloco removido");
  });

  it("restaura os JSONs originais se uma substituição atômica falhar", async () => {
    const banco = bancoFalso();
    await semearBanco(banco, dir);
    banco.tabelas.itens.find((i) => i.nome === "Hexavalente").esquema = "TEXTO NOVO";
    const nomes = ["calendario.json", "fontes.json", "meta.json"];
    const antes = nomes.map((nome) => fs.readFileSync(path.join(dir, nome)));
    const renameOriginal = fs.renameSync.bind(fs);
    let falhou = false;
    const spy = vi.spyOn(fs, "renameSync").mockImplementation((origem, destino) => {
      if (
        !falhou &&
        destino === path.join(dir, "meta.json") &&
        origem.includes(".balcao-vacinal-publicar-")
      ) {
        falhou = true;
        throw new Error("falha simulada");
      }
      return renameOriginal(origem, destino);
    });

    try {
      await expect(publicarDoBanco(banco, dir, "2030-01-01")).rejects.toThrow(/originais foram restaurados/);
    } finally {
      spy.mockRestore();
    }

    expect(falhou).toBe(true);
    expect(nomes.map((nome) => fs.readFileSync(path.join(dir, nome)))).toEqual(antes);
  });

  it("aborta a escrita se o preflight detectar alterações locais", async () => {
    const banco = bancoFalso();
    await semearBanco(banco, dir);
    banco.tabelas.itens.find((i) => i.nome === "Hexavalente").esquema = "TEXTO NOVO";
    const nomes = ["calendario.json", "fontes.json", "meta.json"];
    const antes = nomes.map((nome) => ler(dir, nome));
    const antesDeEscrever = () => {
      throw new Error("Há alterações locais em src/data.");
    };

    await expect(
      publicarDoBanco(banco, dir, "2030-01-01", antesDeEscrever),
    ).rejects.toThrow(/alterações locais/);
    expect(nomes.map((nome) => ler(dir, nome))).toEqual(antes);
  });

  it("explica quando a RPC de exportação não está instalada", async () => {
    const banco = bancoFalso();
    banco.estado.erroExportRpc = { message: "function not found", code: "PGRST202" };

    await expect(publicarDoBanco(banco, dir)).rejects.toThrow(/exportar_editorial/);
  });

  it("nova fonte e data de conferência aparecem no fontes.json", async () => {
    const banco = bancoFalso();
    await semearBanco(banco, dir);
    banco.tabelas.fontes.find((f) => f.id === "sbim-crianca-2026-27").conferido_em = "2026-11-20";
    banco.tabelas.fontes.push({ id: "nova-fonte", ordem: 99, instituicao: "X", titulo: "Y", arquivo: null, url: null, conferido_em: null });
    await publicarDoBanco(banco, dir, "2030-01-01");
    const f = JSON.parse(fs.readFileSync(path.join(dir, "fontes.json"), "utf-8"));
    expect(f.find((x) => x.id === "sbim-crianca-2026-27").conferidoEm).toBe("2026-11-20");
    expect(f.at(-1)).toEqual({ id: "nova-fonte", instituicao: "X", titulo: "Y", conferidoEm: null });
  });
});

describe("verificarPublicacao", () => {
  it("avisa de item aprovado sem fonte válida", () => {
    const { blocos, itens } = linhasDoCalendario(JSON.parse(fs.readFileSync(path.join(DATA, "calendario.json"), "utf-8")), JSON.parse(fs.readFileSync(path.join(DATA, "meta.json"), "utf-8")));
    const b = blocos.map((x, i) => ({ ...x, id: `b${i}` }));
    const it2 = itens.map((x) => ({ ...x, bloco_id: b.find((y) => `${y.rede}|${y.tipo}|${y.rotulo}` === x.bloco_ref).id, fonte_id: "nao-existe" }));
    expect(verificarPublicacao({ blocos: b, itens: it2, fontes: [] })[0]).toMatch(/Sem nenhum|sem fonte/);
  });
});
