const slugify = (texto) =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const textoOuNulo = (valor) => (typeof valor === "string" && valor.trim() ? valor.trim() : null);
const lista = (valor) => (textoOuNulo(valor) ? [valor.trim()] : []);

export function linhasDoGuia(produtos) {
  const porNome = new Map();

  const obter = (nome) => {
    const slug = slugify(nome);
    if (!slug) throw new Error(`Não foi possível gerar slug para "${nome}".`);
    const existente = porNome.get(slug);
    if (existente) {
      if (existente.nome !== nome) {
        throw new Error(`Os nomes "${existente.nome}" e "${nome}" geram o mesmo slug "${slug}".`);
      }
      return existente;
    }

    const vacina = {
      slug,
      ordem: 0,
      status: "rascunho",
      fonte_id: null,
      nome,
      nome_comercial: null,
      fabricante: null,
      rede: "privada",
      apresentacoes: [],
      faixa_etaria: [],
      esquema_doses: [],
      indicacoes: [],
      diferenciais_clinicos: [],
      beneficio: null,
      conservacao_temperatura: null,
      diluicao_preparo: null,
      via_sitio_aplicacao: null,
      intervalos_minimos: [],
      eventos_adversos: [],
      contraindicacoes: [],
      extras: [],
    };
    porNome.set(slug, vacina);
    return vacina;
  };

  for (const [nome, dados] of Object.entries(produtos.CN ?? {})) {
    const vacina = obter(nome);
    vacina.nome_comercial = textoOuNulo(dados.marcas);
    vacina.diferenciais_clinicos = lista(dados.diferencial_sus);
    vacina.beneficio = textoOuNulo(dados.beneficio);
  }

  for (const [nome, texto] of Object.entries(produtos.FI ?? {})) {
    const conteudo = textoOuNulo(texto);
    if (conteudo) {
      obter(nome).extras.push({
        tipo: "nota",
        titulo: "Ficha de imunização",
        conteudo,
      });
    }
  }

  for (const [nome, indicacao] of produtos.EX ?? []) {
    const texto = textoOuNulo(indicacao);
    const vacina = obter(nome);
    if (texto && !vacina.indicacoes.includes(texto)) vacina.indicacoes.push(texto);
  }

  return [...porNome.values()].map((vacina, indice) => ({
    ...vacina,
    ordem: indice + 1,
  }));
}
