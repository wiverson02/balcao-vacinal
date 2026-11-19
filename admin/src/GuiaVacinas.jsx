import { useCallback, useEffect, useRef, useState } from "react";
import {
  apagarGuiaVacina,
  atualizarGuiaVacina,
  criarGuiaVacina,
  gravarOrdens,
  listarFontes,
  listarGuiaVacinas,
} from "./api";
import { proximaOrdem, trocarComVizinho } from "./ordem";
import { CardConferenciaFonte, formatarAtualizadoEm, StudioSplit } from "./Studio";

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

function GuiaVacinaForm({ vacina, fontes, ordem, onSalvar, onCancelar, salvando: salvandoExterno = false }) {
  const formRef = useRef(null);
  const inicial = {
    slug: vacina?.slug ?? "",
    nome: vacina?.nome ?? "",
    nome_comercial: vacina?.nome_comercial ?? "",
    fabricante: vacina?.fabricante ?? "",
    rede: vacina?.rede ?? "privada",
    fonte_id: vacina?.fonte_id ?? "",
    beneficio: vacina?.beneficio ?? "",
    conservacao_temperatura: vacina?.conservacao_temperatura ?? "",
    diluicao_preparo: vacina?.diluicao_preparo ?? "",
    via_sitio_aplicacao: vacina?.via_sitio_aplicacao ?? "",
    ...Object.fromEntries(CAMPOS_LISTA.map(([campo]) => [campo, listaParaTexto(vacina?.[campo])])),
  };
  const [valores, setValores] = useState(inicial);
  const [extras, setExtras] = useState(Array.isArray(vacina?.extras) ? vacina.extras.map((x) => ({ ...x })) : []);
  const [erro, setErro] = useState("");
  const [salvandoLocal, setSalvando] = useState(false);
  const bloqueado = salvandoLocal || salvandoExterno;
  const [confirmarAprovacao, setConfirmarAprovacao] = useState(false);
  const [ultimaAcao, setUltimaAcao] = useState(null);
  const fonte = fontes.find((f) => f.id === valores.fonte_id);

  const campo = (nome) => ({
    value: valores[nome],
    onChange: (evento) => setValores({ ...valores, [nome]: evento.target.value }),
  });

  async function persistir(status) {
    setErro("");
    const slug = valores.slug.trim() || slugify(valores.nome);
    if (!slug) {
      setErro("Informe um nome que permita gerar um slug.");
      return;
    }
    setUltimaAcao(status);
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
        status,
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
    } finally {
      setSalvando(false);
    }
  }

  function solicitarAprovacao() {
    setErro("");
    if (!formRef.current.reportValidity()) return;
    if (!valores.fonte_id) {
      setErro("Para aprovar uma vacina, escolha uma fonte.");
      return;
    }
    setConfirmarAprovacao(true);
  }

  const atualizarExtra = (indice, chave, valor) =>
    setExtras(extras.map((extra, i) => i === indice ? { ...extra, [chave]: valor } : extra));

  const preview = (
    <article className="cartao-preview">
      <header><b>{valores.nome.trim() || "Nome da vacina"}</b></header>
      {valores.nome_comercial.trim() && <p className="preview-comercial">{valores.nome_comercial}</p>}
      {valores.fabricante.trim() && <p><b>Fabricante:</b> {valores.fabricante}</p>}
      {valores.beneficio.trim() && <p>{valores.beneficio}</p>}
      {CAMPOS_LISTA.map(([nome, rotulo]) => {
        const lista = textoParaLista(valores[nome]);
        return lista.length ? <p key={nome}><b>{rotulo}:</b> {lista.join("; ")}</p> : null;
      })}
      {CAMPOS_TEXTO.filter(([nome]) => !["nome_comercial", "fabricante", "beneficio"].includes(nome)).map(([nome, rotulo]) =>
        valores[nome].trim() ? <p key={nome}><b>{rotulo}:</b> {valores[nome]}</p> : null,
      )}
      {extras.filter((extra) => extra.titulo.trim() || extra.conteudo.trim()).map((extra, indice) => (
        <section className={`preview-extra preview-extra-${extra.tipo}`} key={indice}>
          <b>{extra.titulo.trim() || extra.tipo}</b>
          <p>{extra.conteudo.trim() || "Conteúdo do bloco adicional"}</p>
        </section>
      ))}
    </article>
  );

  return (
    <StudioSplit preview={preview}>
      <form ref={formRef} className="formulario" onSubmit={(evento) => { evento.preventDefault(); void persistir("rascunho"); }}>
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
          <label>Fonte
            <select {...campo("fonte_id")}>
              <option value="">— escolha —</option>
              {fontes.map((itemFonte) => <option key={itemFonte.id} value={itemFonte.id}>{itemFonte.id} · {itemFonte.titulo}</option>)}
            </select>
          </label>
        </div>
        <CardConferenciaFonte fonte={fonte} />
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
              <button type="button" className="perigo" disabled={bloqueado} onClick={() => setExtras(extras.filter((_, i) => i !== indice))}>Remover bloco</button>
            </div>
          ))}
          <button type="button" disabled={bloqueado} onClick={() => setExtras([...extras, { tipo: "nota", titulo: "", conteudo: "" }])}>
            + Adicionar bloco
          </button>
        </fieldset>
        {erro && (
          <div className="erro" role="alert">
            <p>{erro}</p>
            {ultimaAcao && <button type="button" disabled={bloqueado} onClick={() => void persistir(ultimaAcao)}>Tentar novamente</button>}
          </div>
        )}
        {confirmarAprovacao && (
          <section className="confirmacao-aprovacao" aria-label="Resumo da aprovação">
            <h4>Revise antes de aprovar</h4>
            <dl>
              <dt>Vacina</dt><dd>{valores.nome.trim()}</dd>
              <dt>Rede</dt><dd>{valores.rede}</dd>
              <dt>Fonte</dt><dd>{fonte ? `${fonte.instituicao} · ${fonte.titulo}` : "Sem fonte"}</dd>
              <dt>Conferência</dt><dd>{fonte?.conferido_em ?? "Data de conferência ausente"}</dd>
              <dt>Destino</dt><dd>Aprovado para a próxima publicação</dd>
            </dl>
            {!fonte?.conferido_em && <p className="alerta-fonte">A fonte ainda não tem data de conferência registrada.</p>}
            <div className="botoes">
              <button type="button" className="primario" disabled={bloqueado} onClick={() => void persistir("aprovado")}>
                {bloqueado ? "Salvando..." : "Confirmar aprovação"}
              </button>
              <button type="button" disabled={bloqueado} onClick={() => setConfirmarAprovacao(false)}>Voltar</button>
            </div>
          </section>
        )}
        <div className="botoes">
          <button className="primario" disabled={bloqueado}>{bloqueado ? "Salvando..." : "Salvar rascunho"}</button>
          <button type="button" disabled={bloqueado} onClick={solicitarAprovacao}>Revisar e aprovar</button>
          <button type="button" disabled={bloqueado} onClick={onCancelar}>Cancelar</button>
        </div>
      </form>
    </StudioSplit>
  );
}

export default function GuiaVacinas({ onAlteracao, foco, onFocoConsumido }) {
  const [vacinas, setVacinas] = useState([]);
  const [fontes, setFontes] = useState([]);
  const [editando, setEditando] = useState(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [retryAction, setRetryAction] = useState(null);

  const carregar = useCallback(async () => {
    setErro("");
    setRetryAction(null);
    setCarregando(true);
    try {
      const [lista, fontesAtuais] = await Promise.all([listarGuiaVacinas(), listarFontes()]);
      setVacinas(lista);
      setFontes(fontesAtuais);
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setCarregando(false);
    }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => {
    if (foco?.tipo !== "guia" || !vacinas.some((vacina) => vacina.id === foco.id)) return;
    setEditando(foco.id);
    onFocoConsumido?.();
  }, [foco, vacinas, onFocoConsumido]);

  const salvar = async (id, valores) => {
    setErro("");
    setSalvando(true);
    try {
      if (id) await atualizarGuiaVacina(id, valores);
      else await criarGuiaVacina(valores);
      setEditando(null);
      await carregar();
      await onAlteracao?.();
    } catch (falha) {
      setErro(falha.message);
      throw falha;
    } finally {
      setSalvando(false);
    }
  };

  const mover = async (vacina, direcao) => {
    setErro("");
    setSalvando(true);
    let operacaoConcluida = false;
    try {
      await gravarOrdens("guia_vacinas", trocarComVizinho(vacinas, vacina.id, direcao));
      operacaoConcluida = true;
      await carregar();
      await onAlteracao?.();
    } catch (falha) {
      setErro(falha.message);
      if (!operacaoConcluida) setRetryAction(() => () => mover(vacina, direcao));
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (vacina) => {
    if (!window.confirm(`Excluir "${vacina.nome}" do guia?`)) return;
    setErro("");
    setSalvando(true);
    let operacaoConcluida = false;
    try {
      await apagarGuiaVacina(vacina.id);
      operacaoConcluida = true;
      await carregar();
      await onAlteracao?.();
    } catch (falha) {
      setErro(falha.message);
      if (!operacaoConcluida) setRetryAction(() => () => excluir(vacina));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <section>
      <h2>Guia de vacinas</h2>
      <p className="ajuda">Somente vacinas aprovadas com fonte vinculada entram em src/data/guia_vacinas.json após executar a publicação explicitamente.</p>
      {erro && (
        <div className="erro" role="alert">
          <p>{erro}</p>
          <button type="button" disabled={carregando || salvando} onClick={() => retryAction ? void retryAction() : void carregar()}>Tentar novamente</button>
        </div>
      )}
      {carregando && <p role="status">Carregando fichas do Guia...</p>}
      <ul className="lista">
        {vacinas.map((vacina, indice) => (
          <li key={vacina.id} className={`item ${vacina.status}`}>
            <div className="linha">
              <b>{vacina.nome}</b>
              <span className={`chip ${vacina.status}`}>{vacina.status}</span>
              <small>{vacina.fonte_id ?? "sem fonte"} · {vacina.rede}</small>
              <time className="atualizado-em" dateTime={vacina.atualizado_em ?? ""}>
                Atualizado em {formatarAtualizadoEm(vacina.atualizado_em)}
              </time>
              <span className="acoes">
                <button aria-label={`Subir ${vacina.nome}`} disabled={Boolean(erro) || salvando || carregando || indice === 0} onClick={() => mover(vacina, -1)}>↑</button>
                <button aria-label={`Descer ${vacina.nome}`} disabled={Boolean(erro) || salvando || carregando || indice === vacinas.length - 1} onClick={() => mover(vacina, 1)}>↓</button>
                <button disabled={Boolean(erro) || salvando || carregando} onClick={() => setEditando(editando === vacina.id ? null : vacina.id)}>Editar</button>
                <button className="perigo" disabled={Boolean(erro) || salvando || carregando} onClick={() => excluir(vacina)}>Excluir</button>
              </span>
            </div>
            {editando === vacina.id && (
              <GuiaVacinaForm
                vacina={vacina}
                fontes={fontes}
                ordem={vacina.ordem}
                salvando={salvando}
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
          salvando={salvando}
          onSalvar={(valores) => salvar(null, valores)}
          onCancelar={() => setEditando(null)}
        />
      ) : (
        <button className="primario" disabled={Boolean(erro) || carregando || salvando} onClick={() => setEditando("novo")}>+ Nova vacina no guia</button>
      )}
    </section>
  );
}
