import { useCallback, useEffect, useState } from "react";
import {
  apagarGuiaVacina,
  atualizarGuiaVacina,
  criarGuiaVacina,
  gravarOrdens,
  listarFontes,
  listarGuiaVacinas,
} from "./api";
import { proximaOrdem, trocarComVizinho } from "./ordem";

const CAMPOS_LISTA = [
  ["apresentacoes", "Apresentações"],
  ["faixa_etaria", "Faixa etária"],
  ["esquema_doses", "Esquema de doses"],
  ["indicacoes", "Indicações"],
  ["diferenciais_clinicos", "Diferenciais clínicos"],
  ["intervalos_minimos", "Intervalos mínimos"],
  ["eventos_adversos", "Eventos adversos"],
  ["contraindicacoes", "Contraindicações"],
];
const CAMPOS_TEXTO = [
  ["nome_comercial", "Nome comercial"],
  ["fabricante", "Fabricante"],
  ["beneficio", "Benefício"],
  ["conservacao_temperatura", "Conservação e temperatura"],
  ["diluicao_preparo", "Diluição e preparo"],
  ["via_sitio_aplicacao", "Via e sítio de aplicação"],
];
const TIPOS_EXTRA = ["alerta", "nota", "esquema", "contraindicacao"];

const slugify = (texto) => texto
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");
const listaParaTexto = (lista) => Array.isArray(lista) ? lista.join("\n") : "";
const textoParaLista = (texto) => texto.split("\n").map((linha) => linha.trim()).filter(Boolean);

function GuiaVacinaForm({ vacina, fontes, ordem, onSalvar, onCancelar }) {
  const inicial = {
    slug: vacina?.slug ?? "",
    nome: vacina?.nome ?? "",
    nome_comercial: vacina?.nome_comercial ?? "",
    fabricante: vacina?.fabricante ?? "",
    rede: vacina?.rede ?? "privada",
    fonte_id: vacina?.fonte_id ?? "",
    status: vacina?.status ?? "rascunho",
    beneficio: vacina?.beneficio ?? "",
    conservacao_temperatura: vacina?.conservacao_temperatura ?? "",
    diluicao_preparo: vacina?.diluicao_preparo ?? "",
    via_sitio_aplicacao: vacina?.via_sitio_aplicacao ?? "",
    ...Object.fromEntries(CAMPOS_LISTA.map(([campo]) => [campo, listaParaTexto(vacina?.[campo])])),
  };
  const [valores, setValores] = useState(inicial);
  const [extras, setExtras] = useState(Array.isArray(vacina?.extras) ? vacina.extras.map((x) => ({ ...x })) : []);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const campo = (nome) => ({
    value: valores[nome],
    onChange: (evento) => setValores({ ...valores, [nome]: evento.target.value }),
  });

  async function enviar(evento) {
    evento.preventDefault();
    setErro("");
    const slug = valores.slug.trim() || slugify(valores.nome);
    if (valores.status === "aprovado" && !valores.fonte_id) {
      setErro("Para aprovar uma vacina, escolha uma fonte.");
      return;
    }
    if (!slug) {
      setErro("Informe um nome que permita gerar um slug.");
      return;
    }
    setSalvando(true);
    try {
      const lista = Object.fromEntries(CAMPOS_LISTA.map(([nome]) => [nome, textoParaLista(valores[nome])]));
      await onSalvar({
        ...lista,
        slug,
        nome: valores.nome.trim(),
        nome_comercial: valores.nome_comercial.trim() || null,
        fabricante: valores.fabricante.trim() || null,
        rede: valores.rede,
        fonte_id: valores.fonte_id || null,
        status: valores.status,
        beneficio: valores.beneficio.trim() || null,
        conservacao_temperatura: valores.conservacao_temperatura.trim() || null,
        diluicao_preparo: valores.diluicao_preparo.trim() || null,
        via_sitio_aplicacao: valores.via_sitio_aplicacao.trim() || null,
        extras: extras.map(({ tipo, titulo, conteudo }) => ({
          tipo,
          titulo: titulo.trim(),
          conteudo: conteudo.trim(),
        })),
        ordem,
      });
    } catch (falha) {
      setErro(falha.message);
      setSalvando(false);
    }
  }

  const atualizarExtra = (indice, chave, valor) =>
    setExtras(extras.map((extra, i) => i === indice ? { ...extra, [chave]: valor } : extra));

  return (
    <form className="formulario" onSubmit={enviar}>
      <label>Nome da vacina<input {...campo("nome")} required /></label>
      <label>Slug<input {...campo("slug")} placeholder={slugify(valores.nome) || "gerado a partir do nome"} /></label>
      <div className="duas">
        <label>Rede
          <select {...campo("rede")}>
            <option value="pni">PNI</option>
            <option value="privada">Privada</option>
            <option value="ambas">Ambas</option>
          </select>
        </label>
        <label>Status
          <select {...campo("status")}>
            <option value="rascunho">Rascunho</option>
            <option value="aprovado">Aprovado (publicado no próximo export)</option>
          </select>
        </label>
      </div>
      <label>Fonte
        <select {...campo("fonte_id")}>
          <option value="">— escolha —</option>
          {fontes.map((fonte) => <option key={fonte.id} value={fonte.id}>{fonte.id} · {fonte.titulo}</option>)}
        </select>
      </label>
      {CAMPOS_TEXTO.map(([nome, rotulo]) => (
        <label key={nome}>{rotulo}<textarea rows={2} {...campo(nome)} /></label>
      ))}
      {CAMPOS_LISTA.map(([nome, rotulo]) => (
        <label key={nome}>{rotulo} (um valor por linha)<textarea rows={3} {...campo(nome)} /></label>
      ))}
      <fieldset>
        <legend>Blocos adicionais</legend>
        {extras.map((extra, indice) => (
          <div className="formulario" key={indice}>
            <label>Tipo
              <select value={extra.tipo} onChange={(evento) => atualizarExtra(indice, "tipo", evento.target.value)}>
                {TIPOS_EXTRA.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
              </select>
            </label>
            <label>Título<input value={extra.titulo} required onChange={(evento) => atualizarExtra(indice, "titulo", evento.target.value)} /></label>
            <label>Conteúdo<textarea rows={3} value={extra.conteudo} required onChange={(evento) => atualizarExtra(indice, "conteudo", evento.target.value)} /></label>
            <button type="button" className="perigo" onClick={() => setExtras(extras.filter((_, i) => i !== indice))}>Remover bloco</button>
          </div>
        ))}
        <button type="button" onClick={() => setExtras([...extras, { tipo: "nota", titulo: "", conteudo: "" }])}>
          + Adicionar bloco
        </button>
      </fieldset>
      {erro && <p className="erro" role="alert">{erro}</p>}
      <div className="botoes">
        <button className="primario" disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</button>
        <button type="button" onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  );
}

export default function GuiaVacinas() {
  const [vacinas, setVacinas] = useState([]);
  const [fontes, setFontes] = useState([]);
  const [editando, setEditando] = useState(null);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    setErro("");
    try {
      const [lista, fontesAtuais] = await Promise.all([listarGuiaVacinas(), listarFontes()]);
      setVacinas(lista);
      setFontes(fontesAtuais);
    } catch (falha) {
      setErro(falha.message);
    }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const salvar = async (id, valores) => {
    setErro("");
    try {
      if (id) await atualizarGuiaVacina(id, valores);
      else await criarGuiaVacina(valores);
      setEditando(null);
      await carregar();
    } catch (falha) {
      setErro(falha.message);
      throw falha;
    }
  };

  const mover = async (vacina, direcao) => {
    setErro("");
    try {
      await gravarOrdens("guia_vacinas", trocarComVizinho(vacinas, vacina.id, direcao));
      await carregar();
    } catch (falha) {
      setErro(falha.message);
    }
  };

  const excluir = (vacina) => {
    if (!window.confirm(`Excluir "${vacina.nome}" do guia?`)) return;
    setErro("");
    apagarGuiaVacina(vacina.id).then(carregar).catch((falha) => setErro(falha.message));
  };

  return (
    <section>
      <h2>Guia de vacinas</h2>
      <p className="ajuda">Somente vacinas aprovadas com fonte vinculada entram em src/data/guia_vacinas.json após executar a publicação explicitamente.</p>
      {erro && <p className="erro" role="alert">{erro}</p>}
      <ul className="lista">
        {vacinas.map((vacina, indice) => (
          <li key={vacina.id} className={`item ${vacina.status}`}>
            <div className="linha">
              <b>{vacina.nome}</b>
              <span className={`chip ${vacina.status}`}>{vacina.status}</span>
              <small>{vacina.fonte_id ?? "sem fonte"} · {vacina.rede}</small>
              <span className="acoes">
                <button aria-label={`Subir ${vacina.nome}`} disabled={indice === 0} onClick={() => mover(vacina, -1)}>↑</button>
                <button aria-label={`Descer ${vacina.nome}`} disabled={indice === vacinas.length - 1} onClick={() => mover(vacina, 1)}>↓</button>
                <button onClick={() => setEditando(editando === vacina.id ? null : vacina.id)}>Editar</button>
                <button className="perigo" onClick={() => excluir(vacina)}>Excluir</button>
              </span>
            </div>
            {editando === vacina.id && (
              <GuiaVacinaForm
                vacina={vacina}
                fontes={fontes}
                ordem={vacina.ordem}
                onSalvar={(valores) => salvar(vacina.id, valores)}
                onCancelar={() => setEditando(null)}
              />
            )}
          </li>
        ))}
      </ul>
      {editando === "novo" ? (
        <GuiaVacinaForm
          fontes={fontes}
          ordem={proximaOrdem(vacinas)}
          onSalvar={(valores) => salvar(null, valores)}
          onCancelar={() => setEditando(null)}
        />
      ) : (
        <button className="primario" onClick={() => setEditando("novo")}>+ Nova vacina no guia</button>
      )}
    </section>
  );
}
