// Leitura e escrita no Supabase + arquivos de src/data.
// Recebem o `client` pronto, para poder testar com um banco de mentira.
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
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
const objeto = (valor) => valor !== null && typeof valor === "object" && !Array.isArray(valor);
const textoValido = (valor) => typeof valor === "string" && valor.trim() !== "";

function validarEstruturaEditorial(exportacao) {
  if (!objeto(exportacao)) {
    return ["A RPC exportar_editorial precisa retornar um objeto."];
  }

  const problemas = [];
  for (const tabela of ["fontes", "blocos", "itens"]) {
    if (!Array.isArray(exportacao[tabela])) {
      problemas.push(`A RPC exportar_editorial retornou "${tabela}" fora do formato de lista.`);
    }
  }
  if (problemas.length) return problemas;

  const { fontes, blocos, itens } = exportacao;
  for (const [tabela, linhas] of Object.entries({ fontes, blocos, itens })) {
    if (!linhas.length) problemas.push(`A exportação não contém ${tabela}.`);
  }
  if (problemas.length) return problemas;

  const idsFontes = new Set();
  fontes.forEach((fonte, indice) => {
    const nome = `Fonte ${indice + 1}`;
    if (!objeto(fonte)) {
      problemas.push(`${nome} não é um objeto válido.`);
      return;
    }
    if (!textoValido(fonte.id) || !/^[a-z0-9-]+$/.test(fonte.id)) {
      problemas.push(`${nome} tem um id ausente ou inválido.`);
    } else if (idsFontes.has(fonte.id)) {
      problemas.push(`${nome} repete o id "${fonte.id}".`);
    } else {
      idsFontes.add(fonte.id);
    }
    if (!Number.isInteger(fonte.ordem)) problemas.push(`${nome} tem ordem inválida.`);
    if (!textoValido(fonte.instituicao)) problemas.push(`${nome} não tem instituição.`);
    if (!textoValido(fonte.titulo)) problemas.push(`${nome} não tem título.`);
    if (fonte.arquivo != null && (typeof fonte.arquivo !== "string" || !/\.pdf$/i.test(fonte.arquivo))) {
      problemas.push(`${nome} tem arquivo inválido; informe um PDF ou null.`);
    }
    if (fonte.url != null && (typeof fonte.url !== "string" || !/^https:\/\//.test(fonte.url))) {
      problemas.push(`${nome} tem URL inválida; informe uma URL HTTPS ou null.`);
    }
    if (fonte.conferido_em != null && typeof fonte.conferido_em !== "string") {
      problemas.push(`${nome} tem data de conferência inválida.`);
    }
  });

  const idsBlocos = new Set();
  const chavesBlocos = new Set();
  blocos.forEach((bloco, indice) => {
    const nome = `Bloco ${indice + 1}`;
    if (!objeto(bloco)) {
      problemas.push(`${nome} não é um objeto válido.`);
      return;
    }
    if (!textoValido(bloco.id)) {
      problemas.push(`${nome} não tem id.`);
    } else if (idsBlocos.has(bloco.id)) {
      problemas.push(`${nome} repete o id "${bloco.id}".`);
    } else {
      idsBlocos.add(bloco.id);
    }
    if (!["privada", "sus"].includes(bloco.rede)) problemas.push(`${nome} tem rede inválida.`);
    if (!["faixa", "grupo"].includes(bloco.tipo)) problemas.push(`${nome} tem tipo inválido.`);
    if (!textoValido(bloco.rotulo)) problemas.push(`${nome} não tem rótulo.`);
    if (!Number.isInteger(bloco.ordem)) problemas.push(`${nome} tem ordem inválida.`);
    if (
      bloco.idade_min_meses != null &&
      (!Number.isInteger(bloco.idade_min_meses) || bloco.idade_min_meses < 0)
    ) {
      problemas.push(`${nome} tem idade mínima inválida.`);
    }
    if (
      (bloco.tipo === "faixa" && !Number.isInteger(bloco.idade_min_meses)) ||
      (bloco.tipo === "grupo" && bloco.idade_min_meses != null)
    ) {
      problemas.push(`${nome} tem idade mínima incompatível com o tipo.`);
    }
    if (textoValido(bloco.rede) && textoValido(bloco.tipo) && textoValido(bloco.rotulo)) {
      const chave = `${bloco.rede}|${bloco.tipo}|${bloco.rotulo}`;
      if (chavesBlocos.has(chave)) problemas.push(`${nome} duplica a combinação rede/tipo/rótulo.`);
      chavesBlocos.add(chave);
    }
  });

  const idsItens = new Set();
  itens.forEach((item, indice) => {
    const nome = `Item ${indice + 1}`;
    if (!objeto(item)) {
      problemas.push(`${nome} não é um objeto válido.`);
      return;
    }
    if (!textoValido(item.id)) {
      problemas.push(`${nome} não tem id.`);
    } else if (idsItens.has(item.id)) {
      problemas.push(`${nome} repete o id "${item.id}".`);
    } else {
      idsItens.add(item.id);
    }
    if (!textoValido(item.bloco_id) || !idsBlocos.has(item.bloco_id)) {
      problemas.push(`${nome} referencia um bloco inexistente.`);
    }
    if (!Number.isInteger(item.ordem)) problemas.push(`${nome} tem ordem inválida.`);
    for (const campo of ["nome", "protege", "esquema"]) {
      if (!textoValido(item[campo])) problemas.push(`${nome} não tem ${campo}.`);
    }
    if (!["rascunho", "aprovado", "arquivado"].includes(item.status)) {
      problemas.push(`${nome} tem status inválido.`);
    }
    if (item.fonte_id != null && (!textoValido(item.fonte_id) || !idsFontes.has(item.fonte_id))) {
      problemas.push(`${nome} referencia uma fonte inexistente.`);
    }
    for (const campo of ["pagina", "trecho"]) {
      if (item[campo] != null && typeof item[campo] !== "string") {
        problemas.push(`${nome} tem ${campo} inválido.`);
      }
    }
  });

  if (!itens.some((item) => objeto(item) && item.status === "aprovado")) {
    problemas.push("A exportação não contém nenhum item aprovado.");
  }
  return problemas;
}

// Carrega o que já existe em src/data para o banco. Só roda com o banco vazio.
export async function semearBanco(client, dir) {
  const tabelas = ["fontes", "blocos", "itens"];
  const contagens = await Promise.all(tabelas.map(async (tabela) => {
    const { count, error } = await client.from(tabela).select("id", { count: "exact", head: true });
    if (error) throw new Error(`Erro ao consultar ${tabela}: ${error.message}`);
    return [tabela, count ?? 0];
  }));
  const ocupadas = contagens.filter(([, count]) => count > 0).map(([tabela]) => tabela);
  if (ocupadas.length) {
    throw new Error(`O banco precisa estar vazio nas tabelas fontes, blocos e itens. Com dados: ${ocupadas.join(", ")}.`);
  }

  const calendario = lerJson(dir, "calendario.json");
  const meta = lerJson(dir, "meta.json");
  const fontes = lerJson(dir, "fontes.json");
  const { blocos, itens } = linhasDoCalendario(calendario, meta);
  const fontesRows = linhasDasFontes(fontes);
  const blocosRows = blocos.map((bloco) => ({ ...bloco, id: randomUUID() }));
  const idDoBloco = new Map(blocosRows.map((bloco) => [
    chaveBloco(bloco.rede, bloco.tipo, bloco.rotulo),
    bloco.id,
  ]));
  const itensRows = itens.map(({ bloco_ref, ...item }) => {
    const bloco_id = idDoBloco.get(bloco_ref);
    if (!bloco_id) throw new Error(`Bloco não encontrado para o item ${item.nome}: ${bloco_ref}`);
    return { ...item, id: randomUUID(), bloco_id };
  });
  const problemas = verificarPublicacao({ blocos: blocosRows, itens: itensRows, fontes: fontesRows });
  if (problemas.length) {
    throw new Error(`Os dados locais não podem ser semeados:\n- ${problemas.join("\n- ")}`);
  }

  const { error } = await client.rpc("semear_editorial", {
    p_fontes: fontesRows,
    p_blocos: blocosRows,
    p_itens: itensRows,
  });
  if (error?.code === "PGRST202") {
    throw new Error("A função transacional semear_editorial não está instalada. Aplique a migration 20261118134000_semear_atomico.sql.");
  }
  if (error) {
    throw new Error(`A carga inicial falhou na transação do PostgreSQL: ${error.message}`);
  }
  return { fontes: fontes.length, blocos: blocos.length, itens: itens.length };
}

const dataLocal = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function substituirArquivosAtomico(arquivos) {
  if (!arquivos.length) return;

  const diretorio = path.dirname(arquivos[0].caminho);
  if (arquivos.some(({ caminho }) => path.dirname(caminho) !== diretorio)) {
    throw new Error("A publicação atômica exige arquivos no mesmo diretório.");
  }

  const pastaTemporaria = fs.mkdtempSync(path.join(diretorio, ".balcao-vacinal-publicar-"));
  const estados = arquivos.map(({ caminho, conteudo }, indice) => ({
    caminho,
    conteudo,
    temporario: path.join(pastaTemporaria, `${indice}.novo`),
    backup: path.join(pastaTemporaria, `${indice}.original`),
    originalExistia: fs.existsSync(caminho),
    backupCriado: false,
    instalado: false,
  }));
  const limparTemporarios = () => {
    for (const estado of estados) {
      for (const arquivo of [estado.temporario, estado.backup]) {
        if (fs.existsSync(arquivo)) fs.unlinkSync(arquivo);
      }
    }
    fs.rmdirSync(pastaTemporaria);
  };

  try {
    for (const estado of estados) fs.writeFileSync(estado.temporario, estado.conteudo);
    for (const estado of estados) {
      if (!estado.originalExistia) continue;
      fs.renameSync(estado.caminho, estado.backup);
      estado.backupCriado = true;
    }
    for (const estado of estados) {
      fs.renameSync(estado.temporario, estado.caminho);
      estado.instalado = true;
    }
  } catch (erro) {
    const falhasRestauracao = [];
    for (const estado of [...estados].reverse()) {
      try {
        if (estado.backupCriado) {
          if (fs.existsSync(estado.caminho)) fs.unlinkSync(estado.caminho);
          fs.renameSync(estado.backup, estado.caminho);
          estado.backupCriado = false;
        } else if (!estado.originalExistia && estado.instalado && fs.existsSync(estado.caminho)) {
          fs.unlinkSync(estado.caminho);
        }
      } catch (erroRestauracao) {
        falhasRestauracao.push(`${estado.caminho}: ${erroRestauracao.message}`);
      }
    }
    if (falhasRestauracao.length) {
      throw new Error(
        `Falha ao publicar os JSONs (${erro.message}) e ao restaurar os originais. ` +
        `Backups preservados em ${pastaTemporaria}. Falhas: ${falhasRestauracao.join("; ")}`,
      );
    }
    try {
      limparTemporarios();
    } catch (erroLimpeza) {
      throw new Error(
        `Falha ao publicar os JSONs (${erro.message}); os originais foram restaurados, ` +
        `mas não foi possível limpar ${pastaTemporaria}: ${erroLimpeza.message}`,
      );
    }
    throw new Error(`Falha ao publicar os JSONs; os originais foram restaurados: ${erro.message}`);
  }

  try {
    limparTemporarios();
  } catch (erro) {
    throw new Error(
      `Os JSONs foram atualizados, mas não foi possível limpar os backups em ${pastaTemporaria}: ${erro.message}`,
    );
  }
}

// Lê o banco e reescreve calendario.json, fontes.json e meta.json (só o que mudou).
export async function publicarDoBanco(client, dir, hoje = dataLocal(), antesDeEscrever = null) {
  const { data: exportacao, error } = await client.rpc("exportar_editorial");
  if (error?.code === "PGRST202") {
    throw new Error("A RPC exportar_editorial não está instalada. Aplique a migration 20261118134000_semear_atomico.sql.");
  }
  if (error) throw new Error(`Erro ao exportar o banco: ${error.message}`);
  const problemasEstrutura = validarEstruturaEditorial(exportacao);
  if (problemasEstrutura.length) return { ok: false, problemas: problemasEstrutura };

  const { blocos, itens, fontes: fontesLinhas } = exportacao;
  const problemas = verificarPublicacao({ blocos, itens, fontes: fontesLinhas });
  if (problemas.length) return { ok: false, problemas };

  const calAtual = lerJson(dir, "calendario.json");
  const metaAtual = lerJson(dir, "meta.json");
  const fontesAtual = lerJson(dir, "fontes.json");

  const calNovo = calendarioDasLinhas({ blocos, itens }, calAtual);
  const fontesNovo = fontesDasLinhas(fontesLinhas);
  const secoesGeradas = secoesDasLinhas({ blocos, itens });
  const secaoGerenciada = /^(privada|sus)\.(crianca|grupos\.)/;
  const secoesNovo = {};
  for (const [chave, fontes] of Object.entries(metaAtual.secoes)) {
    if (Object.prototype.hasOwnProperty.call(secoesGeradas, chave)) {
      secoesNovo[chave] = secoesGeradas[chave];
    } else if (!secaoGerenciada.test(chave)) {
      secoesNovo[chave] = fontes;
    }
  }
  for (const [chave, fontes] of Object.entries(secoesGeradas)) {
    if (!Object.prototype.hasOwnProperty.call(secoesNovo, chave)) secoesNovo[chave] = fontes;
  }

  const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const mudou = {
    calendario: !igual(calNovo, calAtual),
    fontes: !igual(fontesNovo, fontesAtual),
    meta: !igual(secoesNovo, metaAtual.secoes),
  };
  const metaNovo = { ...metaAtual, secoes: secoesNovo };
  if (mudou.calendario || mudou.fontes || mudou.meta) metaNovo.atualizadoEm = hoje;

  const arquivos = [];
  if (mudou.calendario) {
    arquivos.push({ caminho: path.join(dir, "calendario.json"), conteudo: textoCalendario(calNovo) });
  }
  if (mudou.fontes) {
    arquivos.push({ caminho: path.join(dir, "fontes.json"), conteudo: textoFontes(fontesNovo) });
  }
  if (mudou.meta || mudou.calendario || mudou.fontes) {
    arquivos.push({ caminho: path.join(dir, "meta.json"), conteudo: textoMeta(metaNovo) });
  }
  if (arquivos.length) {
    antesDeEscrever?.();
    substituirArquivosAtomico(arquivos);
  }

  const aprovados = itens.filter((i) => i.status === "aprovado").length;
  return {
    ok: true,
    mudou,
    totais: { blocos: blocos.length, aprovados, rascunhos: itens.filter((i) => i.status === "rascunho").length },
    aprovados,
  };
}
