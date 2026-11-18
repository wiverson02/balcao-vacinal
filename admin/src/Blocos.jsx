import { useCallback, useEffect, useState } from "react";
import { listarBlocos, criarBloco, atualizarBloco, apagarBloco, gravarOrdens } from "./api";
import { trocarComVizinho, proximaOrdem } from "./ordem";

const REDES = [["privada", "Rede privada (SBIm)"], ["sus", "SUS (PNI)"]];
const TIPOS = [["faixa", "Faixas da criança"], ["grupo", "Grupos"]];

function BlocoForm({ bloco, redeInicial, tipoInicial, onSalvar, onCancelar }) {
  const novo = !bloco;
  const [rede, setRede] = useState(bloco?.rede ?? redeInicial);
  const [tipo, setTipo] = useState(bloco?.tipo ?? tipoInicial);
  const [rotulo, setRotulo] = useState(bloco?.rotulo ?? "");
  const [idade, setIdade] = useState(bloco?.idade_min_meses ?? "");
  const [erro, setErro] = useState("");

  async function enviar(e) {
    e.preventDefault();
    setErro("");
    try {
      await onSalvar({ rede, tipo, rotulo: rotulo.trim(), idade_min_meses: tipo === "faixa" ? Number(idade) : null });
    } catch (err) {
      setErro(err.message);
    }
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
      {erro && <p className="erro" role="alert">{erro}</p>}
      <div className="botoes">
        <button className="primario">Salvar</button>
        <button type="button" onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  );
}

export default function Blocos() {
  const [blocos, setBlocos] = useState([]);
  const [editando, setEditando] = useState(null); // id, "novo:<rede>:<tipo>" ou null
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    try {
      setBlocos(await listarBlocos());
    } catch (e) {
      setErro(e.message);
    }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const tentar = async (fn) => {
    setErro("");
    try {
      await fn();
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
  };

  const mover = (lista, b, direcao) => tentar(() => gravarOrdens("blocos", trocarComVizinho(lista, b.id, direcao)));
  const excluir = (b) => {
    if (window.confirm(`Excluir o bloco "${b.rotulo}"? Só funciona se ele estiver sem itens.`)) tentar(() => apagarBloco(b.id));
  };
  const salvar = (b, valores) => {
    const { rede, tipo, ...resto } = valores;
    const acao = b ? atualizarBloco(b.id, resto) : criarBloco({ ...valores, ordem: proximaOrdem(blocos.filter((x) => x.rede === rede && x.tipo === tipo)) });
    return acao.then(() => { setEditando(null); return carregar(); });
  };

  return (
    <>
      <p className="ajuda">Blocos são as faixas de idade da criança e os grupos (adolescente, adulto, idoso, gestante). A idade mínima das faixas é a que o app usa na Caderneta e no Início.</p>
      {erro && <p className="erro" role="alert">{erro}</p>}
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
                        <span className="acoes">
                          <button aria-label={`Subir ${b.rotulo}`} disabled={i === 0} onClick={() => mover(lista, b, -1)}>↑</button>
                          <button aria-label={`Descer ${b.rotulo}`} disabled={i === lista.length - 1} onClick={() => mover(lista, b, 1)}>↓</button>
                          <button onClick={() => setEditando(editando === b.id ? null : b.id)}>Editar</button>
                          <button className="perigo" onClick={() => excluir(b)}>Excluir</button>
                        </span>
                      </div>
                      {editando === b.id && <BlocoForm bloco={b} onSalvar={(v) => salvar(b, v)} onCancelar={() => setEditando(null)} />}
                    </li>
                  ))}
                </ul>
                {editando === chave ? (
                  <BlocoForm redeInicial={rede} tipoInicial={tipo} onSalvar={(v) => salvar(null, v)} onCancelar={() => setEditando(null)} />
                ) : (
                  <button onClick={() => setEditando(chave)}>+ Novo bloco</button>
                )}
              </div>
            );
          })}
        </section>
      ))}
    </>
  );
}
