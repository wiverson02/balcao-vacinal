import { describe, it, expect } from "vitest";
import { trocarComVizinho, proximaOrdem } from "./ordem";

const lista = [{ id: "a", ordem: 1 }, { id: "b", ordem: 2 }, { id: "c", ordem: 3 }];

describe("trocarComVizinho", () => {
  it("desce o primeiro: devolve só os dois que mudaram", () => {
    expect(trocarComVizinho(lista, "a", 1)).toEqual([["b", 1], ["a", 2]]);
  });
  it("sobe o último", () => {
    expect(trocarComVizinho(lista, "c", -1)).toEqual([["c", 2], ["b", 3]]);
  });
  it("não faz nada nas pontas nem com id desconhecido", () => {
    expect(trocarComVizinho(lista, "a", -1)).toEqual([]);
    expect(trocarComVizinho(lista, "c", 1)).toEqual([]);
    expect(trocarComVizinho(lista, "x", 1)).toEqual([]);
  });
  it("funciona com ordens repetidas (item novo criado com 0)", () => {
    const repetidas = [{ id: "a", ordem: 0 }, { id: "b", ordem: 0 }, { id: "c", ordem: 0 }];
    expect(trocarComVizinho(repetidas, "c", -1)).toEqual([["a", 1], ["c", 2], ["b", 3]]);
  });
});

describe("proximaOrdem", () => {
  it("é o maior mais um, e 1 para lista vazia", () => {
    expect(proximaOrdem(lista)).toBe(4);
    expect(proximaOrdem([])).toBe(1);
  });
});
