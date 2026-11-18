// Leitura e escrita no Supabase + arquivos de src/data.
// Recebem o `client` pronto, para poder testar com um banco de mentira.
import fs from "node:fs";
import path from "node:path";
import {
  linhasDoCalendario, linhasDasFontes, calendarioDasLinhas, fontesDasLinhas, secoesDasLinhas,
  verificarPublicacao, chaveBloco, textoCalendario, textoFontes, textoMeta,
} from "./conversao.js";

const PAGINA = 1000;

export async function buscarTudo(client, tabela) {
  const linhas = [];
  for (let de = 0; ; de += PAGINA) {
    const { data, error } = await client.from(tabela).select("*").range(de, de + PAGINA - 1);
    if (error) throw new Error(`Erro ao ler ${tabela}: ${error.message}`);
    linhas.push(...data);
    if (data.length < PAGINA) return linhas;
  }
}

const lerJson = (dir, nome) => JSON.parse(fs.readFileSync(path.join(dir, nome), "utf-8"));

async function inserir(client, tabela, linhas) {
  for (let i = 0; i < linhas.length; i += 200) {
    const { error } = await client.from(tabela).insert(linhas.slice(i, i + 200));
    if (error) throw new Error(`Erro ao gravar ${tabela}: ${error.message}`);
  }
}

// Carrega o que já existe em src/data para o banco. Só roda com o banco vazio.
export async function semearBanco(client, dir) {
  const { count, error } = await client.from("blocos").select("id", { count: "exact", head: true });
  if (error) throw new Error(`Erro ao consultar o banco: ${error.message}`);
  if (count > 0) throw new Error("O banco já tem blocos. A carga inicial só roda com o banco vazio.");

  const calendario = lerJson(dir, "calendario.json");
  const meta = lerJson(dir, "meta.json");
  const fontes = lerJson(dir, "fontes.json");
  const { blocos, itens } = linhasDoCalendario(calendario, meta);

  await inserir(client, "fontes", linhasDasFontes(fontes));
  const { data: criados, error: e2 } = await client.from("blocos").insert(blocos).select();
  if (e2) throw new Error(`Erro ao gravar blocos: ${e2.message}`);
  const idDoBloco = new Map(criados.map((b) => [chaveBloco(b.rede, b.tipo, b.rotulo), b.id]));
  await inserir(client, "itens", itens.map(({ bloco_ref, ...resto }) => ({ ...resto, bloco_id: idDoBloco.get(bloco_ref) })));
  return { fontes: fontes.length, blocos: blocos.length, itens: itens.length };
}

const dataLocal = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Lê o banco e reescreve calendario.json, fontes.json e meta.json (só o que mudou).
export async function publicarDoBanco(client, dir, hoje = dataLocal()) {
  const [blocos, itens, fontesLinhas] = await Promise.all(
    ["blocos", "itens", "fontes"].map((t) => buscarTudo(client, t)),
  );
  const problemas = verificarPublicacao({ blocos, itens, fontes: fontesLinhas });
  if (problemas.length) return { ok: false, problemas };

  const calAtual = lerJson(dir, "calendario.json");
  const metaAtual = lerJson(dir, "meta.json");
  const fontesAtual = lerJson(dir, "fontes.json");

  const calNovo = calendarioDasLinhas({ blocos, itens }, calAtual);
  const fontesNovo = fontesDasLinhas(fontesLinhas);
  const secoesNovo = { ...metaAtual.secoes, ...secoesDasLinhas({ blocos, itens }) };

  const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const mudou = {
    calendario: !igual(calNovo, calAtual),
    fontes: !igual(fontesNovo, fontesAtual),
    meta: !igual(secoesNovo, metaAtual.secoes),
  };
  const metaNovo = { ...metaAtual, secoes: secoesNovo };
  if (mudou.calendario || mudou.fontes || mudou.meta) metaNovo.atualizadoEm = hoje;

  if (mudou.calendario) fs.writeFileSync(path.join(dir, "calendario.json"), textoCalendario(calNovo));
  if (mudou.fontes) fs.writeFileSync(path.join(dir, "fontes.json"), textoFontes(fontesNovo));
  if (mudou.meta || mudou.calendario || mudou.fontes) fs.writeFileSync(path.join(dir, "meta.json"), textoMeta(metaNovo));

  const aprovados = itens.filter((i) => i.status === "aprovado").length;
  return {
    ok: true,
    mudou,
    totais: { blocos: blocos.length, aprovados, rascunhos: itens.filter((i) => i.status === "rascunho").length },
    aprovados,
  };
}
