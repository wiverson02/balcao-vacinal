// Move um item uma posição para cima (-1) ou para baixo (+1) e devolve só as linhas
// cuja ordem mudou, como pares [id, novaOrdem]. Renumera tudo de 1 a n, então
// funciona mesmo que existam ordens repetidas.
export function trocarComVizinho(lista, id, direcao) {
  const i = lista.findIndex((x) => x.id === id);
  const j = i + direcao;
  if (i < 0 || j < 0 || j >= lista.length) return [];
  const nova = [...lista];
  [nova[i], nova[j]] = [nova[j], nova[i]];
  const antiga = new Map(lista.map((x) => [x.id, x.ordem]));
  return nova.map((x, k) => [x.id, k + 1]).filter(([ident, ordem]) => antiga.get(ident) !== ordem);
}

export const proximaOrdem = (lista) => lista.reduce((m, x) => Math.max(m, x.ordem ?? 0), 0) + 1;
