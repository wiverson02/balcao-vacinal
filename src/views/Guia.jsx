import { useState } from "react";
import Card from "../components/Card";
import {
  BENEFICIOS_GUIA,
  criarModeloCardGuia,
  DIFERENCIAIS_GUIA,
  indiceGuiaPublico,
  MARCAS_GUIA,
  produtosCatalogo,
  TERMOS_GUIA,
  TEXTOS_GUIA,
} from "../lib/guiaCardModel";

const normalizarBusca = (texto) =>
  texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export default function Guia() {
  const [consulta, setConsulta] = useState("");
  const { mapa, guias } = indiceGuiaPublico;
  const termo = normalizarBusca(consulta);
  const nomes = Object.keys(mapa).sort().filter((nome) => {
    const guia = guias[nome];
    const modelo = criarModeloCardGuia(nome, guia);
    const campos = [
      nome,
      ...mapa[nome].d,
      ...mapa[nome].g,
      ...(TEXTOS_GUIA[nome] || []),
      ...(TERMOS_GUIA[nome] || []),
      modelo.marcas,
      modelo.diferencial_sus,
      modelo.beneficio,
      produtosCatalogo.FI[nome],
      ...Object.values(guia || {}).flatMap((valor) =>
        Array.isArray(valor) ? valor : typeof valor === "string" ? [valor] : [],
      ),
      ...(guia?.extras || []).flatMap((extra) => [extra.titulo, extra.conteudo]),
    ].filter(Boolean);
    return normalizarBusca(campos.join(" ")).includes(termo);
  });

  return (
    <>
      <h2>Guia de vacinas</h2>
      <label htmlFor="busca-guia-publico">Buscar vacina ou doença</label>
      <input
        id="busca-guia-publico"
        type="search"
        placeholder="Buscar vacina ou doença"
        value={consulta}
        onChange={(evento) => setConsulta(evento.target.value)}
        style={{ width: "100%", marginBottom: 14 }}
      />
      <div className="grid">
        {nomes.length
          ? nomes.map((nome) => <Card key={nome} {...criarModeloCardGuia(nome, guias[nome])} />)
          : <p className="muted">Nenhuma vacina encontrada. Tente outro termo.</p>}
      </div>
    </>
  );
}
