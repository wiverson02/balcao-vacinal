import { useCallback, useEffect, useState } from "react";
import { listarFontes, criarFonte, atualizarFonte, apagarFonte } from "./api";
import { proximaOrdem } from "./ordem";
import { formatarAtualizadoEm } from "./Studio";

const hoje = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const limpar = (v) => (v.trim() === "" ? null : v.trim());

function FonteForm({ fonte, onSalvar, onCancelar, salvando = false }) {
  const [v, setV] = useState({ id: "", instituicao: "", titulo: "", arquivo: "", url: "", conferido_em: "", ...Object.fromEntries(Object.entries(fonte ?? {}).map(([k, x]) => [k, x ?? ""])) });
  const [erro, setErro] = useState("");
  const campo = (n) => ({ value: v[n], onChange: (e) => setV({ ...v, [n]: e.target.value }) });

  async function gravar() {
    setErro("");
    try {
      await onSalvar({
        id: v.id.trim(),
        instituicao: v.instituicao.trim(),
        titulo: v.titulo.trim(),
        arquivo: limpar(v.arquivo),
        url: limpar(v.url),
        conferido_em: limpar(v.conferido_em),
      });
    } catch (err) {
      setErro(err.message);
    }
  }

  function enviar(e) {
    e.preventDefault();
    void gravar();
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      <label>Id (letras minúsculas, números e hífen; não muda depois)<input {...campo("id")} readOnly={Boolean(fonte)} required /></label>
      <div className="duas">
        <label>Instituição<input {...campo("instituicao")} required /></label>
        <label>Título do documento<input {...campo("titulo")} required /></label>
      </div>
      <label>Nome do PDF na sua pasta fontes/<input {...campo("arquivo")} placeholder="ex.: crianca-Calend-SBIm-2026-27.pdf" /></label>
      <label>Link oficial (https://)<input {...campo("url")} /></label>
      <label>
        Conferido contra o documento em
        <span className="duas">
          <input type="date" {...campo("conferido_em")} />
          <button type="button" disabled={salvando} onClick={() => setV({ ...v, conferido_em: hoje() })}>Conferi hoje</button>
        </span>
      </label>
      {erro && <div className="erro" role="alert"><p>{erro}</p><button type="button" disabled={salvando} onClick={() => void gravar()}>Tentar novamente</button></div>}
      <div className="botoes">
        <button className="primario" disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</button>
        <button type="button" disabled={salvando} onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  );
}

export default function Fontes({ onAlteracao, foco, onFocoConsumido }) {
  const [fontes, setFontes] = useState([]);
  const [editando, setEditando] = useState(null); // id, "nova" ou null
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [retryAction, setRetryAction] = useState(null);

  const carregar = useCallback(async () => {
    setErro("");
    setRetryAction(null);
    setCarregando(true);
    try {
      setFontes(await listarFontes());
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => {
    if (foco?.tipo !== "fonte" || !fontes.some((fonte) => fonte.id === foco.id)) return;
    setEditando(foco.id);
    onFocoConsumido?.();
  }, [foco, fontes, onFocoConsumido]);

  const salvar = async (fonte, valores) => {
    const acao = fonte ? atualizarFonte(fonte.id, valores) : criarFonte({ ...valores, ordem: proximaOrdem(fontes) });
    setErro("");
    setSalvando(true);
    try {
      await acao;
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
  const excluir = async (f) => {
    if (!window.confirm(`Excluir a fonte "${f.id}"? Só funciona se nenhum item a usar.`)) return;
    setErro("");
    setSalvando(true);
    let operacaoConcluida = false;
    try {
      await apagarFonte(f.id);
      operacaoConcluida = true;
      await carregar();
      await onAlteracao?.();
    } catch (e) {
      setErro(e.message);
      if (!operacaoConcluida) setRetryAction(() => () => excluir(f));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <p className="ajuda">Cada item aprovado precisa apontar para uma fonte. Preencha “conferido em” depois de comparar o conteúdo com o PDF.</p>
      {erro && <div className="erro" role="alert"><p>{erro}</p><button type="button" disabled={carregando || salvando} onClick={() => retryAction ? void retryAction() : void carregar()}>Tentar novamente</button></div>}
      {carregando && <p role="status">Carregando fontes...</p>}
      <ul className="lista">
        {fontes.map((f) => (
          <li key={f.id} className="item">
            <div className="linha">
              <b>{f.titulo}</b>
              <small>{f.instituicao} · {f.id}</small>
              <span className={`chip ${f.conferido_em ? "aprovado" : "rascunho"}`}>{f.conferido_em ? `conferida em ${f.conferido_em}` : "não conferida"}</span>
              <time className="atualizado-em" dateTime={f.atualizado_em ?? ""}>
                Atualizado em {formatarAtualizadoEm(f.atualizado_em)}
              </time>
              <span className="acoes">
                <button disabled={Boolean(erro) || carregando || salvando} onClick={() => setEditando(editando === f.id ? null : f.id)}>Editar</button>
                <button className="perigo" disabled={Boolean(erro) || carregando || salvando} onClick={() => excluir(f)}>Excluir</button>
              </span>
            </div>
            {editando === f.id && <FonteForm fonte={f} salvando={salvando} onSalvar={(v) => salvar(f, v)} onCancelar={() => setEditando(null)} />}
          </li>
        ))}
      </ul>
      {editando === "nova" ? (
        <FonteForm salvando={salvando} onSalvar={(v) => salvar(null, v)} onCancelar={() => setEditando(null)} />
      ) : (
        <button className="primario" disabled={Boolean(erro) || carregando || salvando} onClick={() => setEditando("nova")}>+ Nova fonte</button>
      )}
    </>
  );
}
