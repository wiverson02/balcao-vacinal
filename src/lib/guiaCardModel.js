import calendario from "../data/calendario.json";
import produtos from "../data/produtos.json";
import guiaVacinas from "../data/guia_vacinas.json";

export const produtosCatalogo = produtos;

export const TEXTOS_GUIA = {
  Hexavalente: ["DTPa-VIP-Hib-HB", "Difteria, tétano, coqueluche, poliomielite, Haemophilus influenzae b e hepatite B", "Indicada para: Criança."],
  "dTpa-VIP": ["dTpa-VIP", "Difteria, tétano, coqueluche e poliomielite", "Indicada para: Criança (reforço) e também adolescentes e adultos, conforme bula."],
  "Tetraviral (SCRV)": ["Tetraviral (SCRV)", "Sarampo, caxumba, rubéola e varicela", "Indicada para: Criança: 1ª dose aos 12 meses (opcional, no lugar de SCR + varicela separadas) e 2ª dose a partir dos 15 meses (preferencial)."],
  "Pneumocócica conjugada": ["Pneumocócica conjugada", "Doenças pneumocócicas", "Indicada para: Criança: 2, 4 e 6 meses + reforço entre 12 e 15 meses (esquema 3+1)."],
};
export const TERMOS_GUIA = { "Tríplice viral": ["SCR"] };
export const MARCAS_GUIA = { "Pneumocócica conjugada": "Prevenar 20® (Pfizer)" };
export const DIFERENCIAIS_GUIA = { "Pneumocócica conjugada": "VPC20 (20 sorotipos)" };
export const BENEFICIOS_GUIA = {
  "Tetraviral (SCRV)": "Reúne sarampo, caxumba, rubéola e varicela em uma única aplicação. Aos 12 meses pode substituir as duas injeções separadas e, na 2ª dose, a partir dos 15 meses, é a opção preferida pela SBIm, com intervalo de 3 meses da dose anterior.",
  "Pneumocócica conjugada": "Protege contra 20 tipos de pneumococo, causadores de pneumonia, meningite e infecção no sangue. Quem já recebeu a VPC10 pode se beneficiar de doses adicionais de VPC20.",
};

function criarIndice() {
  const mapa = {};
  const guias = Object.fromEntries(guiaVacinas.map((vacina) => [vacina.nome, vacina]));
  const adicionar = (vacina, grupo) => {
    if (vacina[0] === "DTPa + VIP") return;
    const item = mapa[vacina[0]] ??= { p: vacina[1], d: new Set(), g: new Set() };
    item.d.add(vacina[1]);
    item.g.add(grupo);
  };

  calendario.privada.crianca.forEach((bloco) => bloco[1].forEach((vacina) => adicionar(vacina, "Criança")));
  Object.entries(calendario.privada.grupos).forEach(([grupo, itens]) => itens.forEach((vacina) => adicionar(vacina, grupo)));
  produtos.EX.forEach((vacina) => adicionar(vacina, "Viajantes"));
  for (const vacina of guiaVacinas) {
    mapa[vacina.nome] ??= { p: vacina.indicacoes.join("; ") || vacina.nome, d: new Set(), g: new Set() };
  }

  return { mapa, guias };
}

export const indiceGuiaPublico = criarIndice();

export function criarModeloCardGuia(nome, vacina = indiceGuiaPublico.guias[nome]) {
  const item = indiceGuiaPublico.mapa[nome] ?? { p: vacina?.indicacoes?.join("; ") || nome, d: new Set(), g: new Set() };
  const produto = produtos.CN[nome];
  const publicos = [...item.g];
  const texto = vacina
    ? [
      nome,
      vacina.indicacoes.join("; ") || TEXTOS_GUIA[nome]?.[1] || item.p,
      vacina.esquema_doses.length
        ? `Esquema: ${vacina.esquema_doses.join("; ")}`
        : TEXTOS_GUIA[nome]?.[2] || (publicos.length ? `Indicada para: ${publicos.join(", ")}.` : "Confira as indicações detalhadas."),
    ]
    : TEXTOS_GUIA[nome] || [nome, item.p, publicos.length ? `Indicada para: ${publicos.join(", ")}.` : "Confira as indicações detalhadas."];

  return {
    v: texto,
    privado: true,
    produtoKey: nome,
    dadosGuia: vacina,
    marcas: vacina?.nome_comercial || MARCAS_GUIA[nome] || produto?.marcas,
    diferencial_sus: vacina?.diferenciais_clinicos?.join("; ") || DIFERENCIAIS_GUIA[nome] || produto?.diferencial_sus,
    beneficio: vacina?.beneficio || BENEFICIOS_GUIA[nome] || produto?.beneficio,
  };
}
