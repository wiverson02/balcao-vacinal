import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, beforeEach } from "vitest";
import { semearBanco, publicarDoBanco } from "./lib/banco.js";
import { textoCalendario, textoFontes, textoMeta, linhasDoCalendario, verificarPublicacao } from "./lib/conversao.js";

const DATA = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "data");
const lf = (s) => s.replace(/\r\n/g, "\n");
const ler = (dir, nome) => lf(fs.readFileSync(path.join(dir, nome), "utf-8"));

// Banco de mentira, em memória, que imita só o que os scripts usam do supabase-js.
function bancoFalso() {
  const tabelas = { fontes: [], blocos: [], itens: [] };
  let seq = 0;
  return {
    tabelas,
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
  };
}

let dir;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "bv-"));
  for (const n of ["calendario.json", "fontes.json", "meta.json"]) fs.copyFileSync(path.join(DATA, n), path.join(dir, n));
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
