import { useCallback, useEffect, useState } from "react";
import { listarBlocos, criarBloco, atualizarBloco, apagarBloco, gravarOrdens } from "./api";
import { trocarComVizinho, proximaOrdem } from "./ordem";
import { formatarAtualizadoEm } from "./Studio";

const REDES = [["privada", "Rede privada (SBIm)"], ["sus", "SUS (PNI)"]];
const TIPOS = [["faixa", "Faixas da criança"], ["grupo", "Grupos"]];

function BlocoForm({ bloco, redeInicial, tipoInicial, onSalvar, onCancelar, salvando: salvandoExterno = false }) {
  const novo = !bloco;
  const [rede, setRede] = useState(bloco?.rede ?? redeInicial);
  const [tipo, setTipo] = useState(bloco?.tipo ?? tipoInicial);
  const [rotulo, setRotulo] = useState(bloco?.rotulo ?? "");
  const [idade, setIdade] = useState(bloco?.idade_min_meses ?? "");
  const [erro, setErro] = useState("");
  const [salvandoLocal, setSalvandoLocal] = useState(false);
  const bloqueado = salvandoLocal || salvandoExterno;

  async function gravar() {
    setErro("");
    setSalvandoLocal(true);
    try {
      await onSalvar({ rede, tipo, rotulo: rotulo.trim(), idade_min_meses: tipo === "faixa" ? Number(idade) : null });
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvandoLocal(false);
    }
  }

  function enviar(e) {
    e.preventDefault();
    void gravar();
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      {novo && (
        <div className="duas">
          <label>Rede<select value={rede} onChange={(e) => setRede(e.target.value)}>{REDES.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></label>
          <label>Tipo<select value={tipo} onChange={(e) => setTipo(e.target.value)}>{TIPOS.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></label>
        </div>
      )}
      <label>Nome do bloco<input value={rotulo} onChange={(e) => setRotulo(e.target.value)} required /></label>
      {tipo === "faixa" && (
        <label>Idade mínima (meses)<input type="number" min="0" value={idade} onChange={(e) => setIdade(e.target.value)} required /></label>
      )}
      {tipo === "grupo" && !novo && (
        <p className="ajuda">Ao renomear um grupo, ajuste também o nome dele em <code>resgateGrupos</code> no calendario.json, senão o teste de dados avisa.</p>
      )}
      {erro && <div className="erro" role="alert"><p>{erro}</p><button type="button" disabled={bloqueado} onClick={() => void gravar()}>Tentar novamente</button></div>}
      <div className="botoes">
        <button className="primario" disabled={bloqueado}>{bloqueado ? "Salvando..." : "Salvar"}</button>
        <button type="button" disabled={bloqueado} onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  );
}

export default function Blocos({ onAlteracao, foco, onFocoConsumido }) {
  const [blocos, setBlocos] = useState([]);
  const [editando, setEditando] = useState(null); // id, "novo:<rede>:<tipo>" ou null
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [retryAction, setRetryAction] = useState(null);

  const carregar = useCallback(async () => {
    setErro("");
    setRetryAction(null);
    setCarregando(true);
    try {
      setBlocos(await listarBlocos());
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => {
    if (foco?.tipo !== "bloco" || !blocos.some((bloco) => bloco.id === foco.id)) return;
    setEditando(foco.id);
    onFocoConsumido?.();
  }, [foco, blocos, onFocoConsumido]);

  const tentar = async (fn) => {
    setErro("");
    setSalvando(true);
    let operacaoConcluida = false;
    try {
      await fn();
      operacaoConcluida = true;
      await carregar();
      await onAlteracao?.();
    } catch (e) {
      setErro(e.message);
      if (!operacaoConcluida) setRetryAction(() => fn);
    } finally {
      setSalvando(false);
    }
  };

  const mover = (lista, b, direcao) => tentar(() => gravarOrdens("blocos", trocarComVizinho(lista, b.id, direcao)));
  const excluir = (b) => {
    if (window.confirm(`Excluir o bloco "${b.rotulo}"? Só funciona se ele estiver sem itens.`)) tentar(() => apagarBloco(b.id));
  };
  const salvar = async (b, valores) => {
    const { rede, tipo, ...resto } = valores;
    const acao = b ? atualizarBloco(b.id, resto) : criarBloco({ ...valores, ordem: proximaOrdem(blocos.filter((x) => x.rede === rede && x.tipo === tipo)) });
    setErro("");
    setSalvando(true);
    try {
      await acao;
      setEditando(null);
      await carregar();
      await onAlteracao?.();
    } catch (e) {
      setErro(e.message);
      throw e;
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <p className="ajuda">Blocos são as faixas de idade da criança e os grupos (adolescente, adulto, idoso, gestante). A idade mínima das faixas é a que o app usa na Caderneta e no Início.</p>
      {erro && <div className="erro" role="alert"><p>{erro}</p><button type="button" disabled={carregando || salvando} onClick={() => retryAction ? void tentar(retryAction) : void carregar()}>Tentar novamente</button></div>}
      {carregando && <p role="status">Carregando blocos...</p>}
      {REDES.map(([rede, nomeRede]) => (
        <section key={rede}>
          <h2>{nomeRede}</h2>
          {TIPOS.map(([tipo, nomeTipo]) => {
            const lista = blocos.filter((b) => b.rede === rede && b.tipo === tipo);
            const chave = `novo:${rede}:${tipo}`;
            return (
              <div key={tipo}>
                <h3>{nomeTipo}</h3>
                <ul className="lista">
                  {lista.map((b, i) => (
                    <li key={b.id} className="item">
                      <div className="linha">
                        <b>{b.rotulo}</b>
                        {tipo === "faixa" && <small>a partir de {b.idade_min_meses} meses</small>}
                        <time className="atualizado-em" dateTime={b.atualizado_em ?? ""}>
                          Atualizado em {formatarAtualizadoEm(b.atualizado_em)}
                        </time>
                        <span className="acoes">
                          <button aria-label={`Subir ${b.rotulo}`} disabled={Boolean(erro) || carregando || salvando || i === 0} onClick={() => mover(lista, b, -1)}>↑</button>
                          <button aria-label={`Descer ${b.rotulo}`} disabled={Boolean(erro) || carregando || salvando || i === lista.length - 1} onClick={() => mover(lista, b, 1)}>↓</button>
                          <button disabled={Boolean(erro) || carregando || salvando} onClick={() => setEditando(editando === b.id ? null : b.id)}>Editar</button>
                          <button className="perigo" disabled={Boolean(erro) || carregando || salvando} onClick={() => excluir(b)}>Excluir</button>
                        </span>
                      </div>
                      {editando === b.id && <BlocoForm bloco={b} salvando={salvando} onSalvar={(v) => salvar(b, v)} onCancelar={() => setEditando(null)} />}
                    </li>
                  ))}
                </ul>
                {editando === chave ? (
                  <BlocoForm redeInicial={rede} tipoInicial={tipo} salvando={salvando} onSalvar={(v) => salvar(null, v)} onCancelar={() => setEditando(null)} />
                ) : (
                  <button disabled={Boolean(erro) || carregando || salvando} onClick={() => setEditando(chave)}>+ Novo bloco</button>
                )}
              </div>
            );
          })}
        </section>
      ))}
    </>
  );
}
