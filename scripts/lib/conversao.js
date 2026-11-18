// Conversão entre os JSONs do app (src/data) e as linhas do banco do painel.
// São funções puras (sem rede e sem arquivos), por isso dá para testar tudo em `npm test`.

export const REDES = ["privada", "sus"];

// Nome da seção em meta.json que corresponde a um bloco do banco.
export const chaveSecao = (rede, tipo, rotulo) =>
  tipo === "faixa" ? `${rede}.crianca` : `${rede}.grupos.${rotulo}`;

export const chaveBloco = (rede, tipo, rotulo) => `${rede}|${tipo}|${rotulo}`;

const porOrdem = (a, b) =>
  (a.ordem ?? 0) - (b.ordem ?? 0) || String(a.criado_em ?? "").localeCompare(String(b.criado_em ?? ""));

// ---------------------------------------------------------------------------
// JSON -> linhas (usado uma vez, para semear o banco com o que já existe)
// ---------------------------------------------------------------------------

export function linhasDoCalendario(calendario, meta) {
  const blocos = [];
  const itens = [];
  for (const rede of REDES) {
    let ordemBloco = 0;
    const novoBloco = (tipo, rotulo, idadeMin, vacinas) => {
      const fonteId = meta.secoes[chaveSecao(rede, tipo, rotulo)]?.[0] ?? null;
      blocos.push({ rede, tipo, rotulo, idade_min_meses: idadeMin, ordem: ++ordemBloco });
      vacinas.forEach(([nome, protege, esquema], i) => {
        itens.push({
          bloco_ref: chaveBloco(rede, tipo, rotulo),
          ordem: i + 1,
          nome,
          protege,
          esquema,
          fonte_id: fonteId,
          status: "aprovado",
        });
      });
    };
    for (const [rotulo, vacinas, idadeMin] of calendario[rede].crianca) novoBloco("faixa", rotulo, idadeMin, vacinas);
    for (const [rotulo, vacinas] of Object.entries(calendario[rede].grupos)) novoBloco("grupo", rotulo, null, vacinas);
  }
  return { blocos, itens };
}

export function linhasDasFontes(fontes) {
  return fontes.map((f, i) => ({
    id: f.id,
    ordem: i + 1,
    instituicao: f.instituicao,
    titulo: f.titulo,
    arquivo: f.arquivo ?? null,
    url: f.url ?? null,
    conferido_em: f.conferidoEm ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Linhas -> JSON (usado em `npm run publicar`). Só entram itens APROVADOS.
// ---------------------------------------------------------------------------

// `base` é o calendario.json atual: o painel só é dono de `crianca` e `grupos`;
// o que ainda não está no banco (resgateCrianca, resgateGrupos) é mantido como está.
export function calendarioDasLinhas({ blocos, itens }, base) {
  const saida = structuredClone(base);
  const aprovados = itens.filter((i) => i.status === "aprovado");
  const vacinasDe = (bloco) =>
    aprovados
      .filter((i) => i.bloco_id === bloco.id)
      .sort(porOrdem)
      .map((i) => [i.nome, i.protege, i.esquema]);
  for (const rede of REDES) {
    const daRede = blocos.filter((b) => b.rede === rede).sort(porOrdem);
    saida[rede].crianca = daRede
      .filter((b) => b.tipo === "faixa")
      .map((b) => [b.rotulo, vacinasDe(b), b.idade_min_meses]);
    saida[rede].grupos = Object.fromEntries(
      daRede.filter((b) => b.tipo === "grupo").map((b) => [b.rotulo, vacinasDe(b)]),
    );
  }
  return saida;
}

export function fontesDasLinhas(linhas) {
  return [...linhas].sort(porOrdem).map((f) => {
    const o = { id: f.id, instituicao: f.instituicao, titulo: f.titulo };
    if (f.arquivo) o.arquivo = f.arquivo;
    if (f.url) o.url = f.url;
    o.conferidoEm = f.conferido_em ?? null;
    return o;
  });
}

// Fontes realmente usadas por cada seção do calendário (na ordem em que aparecem).
export function secoesDasLinhas({ blocos, itens }) {
  const aprovados = itens.filter((i) => i.status === "aprovado");
  const secoes = {};
  for (const b of [...blocos].sort(porOrdem)) {
    const chave = chaveSecao(b.rede, b.tipo, b.rotulo);
    const ids = aprovados
      .filter((i) => i.bloco_id === b.id)
      .sort(porOrdem)
      .map((i) => i.fonte_id)
      .filter(Boolean);
    secoes[chave] = [...new Set([...(secoes[chave] ?? []), ...ids])];
  }
  return secoes;
}

// Problemas que impedem publicar (lista vazia = pode publicar).
export function verificarPublicacao({ blocos, itens, fontes }) {
  const problemas = [];
  const ids = new Set(fontes.map((f) => f.id));
  for (const b of blocos) {
    const aprovados = itens.filter((i) => i.bloco_id === b.id && i.status === "aprovado");
    if (aprovados.length === 0) problemas.push(`Sem nenhum item aprovado: ${b.rede} / ${b.rotulo}`);
  }
  for (const i of itens.filter((x) => x.status === "aprovado")) {
    if (!i.fonte_id || !ids.has(i.fonte_id)) problemas.push(`Item aprovado sem fonte válida: ${i.nome}`);
  }
  return problemas;
}

// ---------------------------------------------------------------------------
// Texto dos arquivos (mesmo formato dos JSONs de hoje, para o Git mostrar só o que mudou)
// ---------------------------------------------------------------------------

export const textoCalendario = (c) => JSON.stringify(c, null, 1) + "\n";

export const textoFontes = (fontes) =>
  "[\n" + fontes.map((f) => " " + JSON.stringify(f)).join(",\n") + "\n]\n";

export const textoMeta = (meta) =>
  "{\n" +
  ` "atualizadoEm": ${JSON.stringify(meta.atualizadoEm)},\n` +
  ' "secoes": {\n' +
  Object.entries(meta.secoes)
    .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`)
    .join(",\n") +
  "\n }\n}\n";
