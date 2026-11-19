// Move um item uma posição para cima (-1) ou para baixo (+1) e devolve a ordem
// completa como pares [id, novaOrdem], necessária para as RPCs transacionais.
export function trocarComVizinho(lista, id, direcao) {
  const i = lista.findIndex((x) => x.id === id);
  const j = i + direcao;
  if (i < 0 || j < 0 || j >= lista.length) return [];
  const nova = [...lista];
  [nova[i], nova[j]] = [nova[j], nova[i]];
  return nova.map((x, k) => [x.id, k + 1]);
}

export const proximaOrdem = (lista) => lista.reduce((m, x) => Math.max(m, x.ordem ?? 0), 0) + 1;
