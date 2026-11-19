import { useCallback, useEffect, useState } from "react";
import { listarFontes, listarBlocos, listarItens, contarItens, criarItem, atualizarItem, apagarItem, gravarOrdens } from "./api";
import { trocarComVizinho, proximaOrdem } from "./ordem";
import ItemForm from "./ItemForm";

const REDES = [["privada", "Rede privada (SBIm)"], ["sus", "SUS (PNI)"]];

export default function Vacinas({ onAlteracao, foco, onFocoConsumido }) {
  const [fontes, setFontes] = useState([]);
  const [blocos, setBlocos] = useState([]);
  const [contagem, setContagem] = useState({});
  const [rede, setRede] = useState("privada");
  const [blocoId, setBlocoId] = useState(null);
  const [itens, setItens] = useState([]);
  const [editando, setEditando] = useState(null); // id do item, "novo" ou null
  const [erro, setErro] = useState("");

  const tentar = useCallback(async (fn) => {
    setErro("");
    try {
      await fn();
    } catch (e) {
      setErro(e.message);
    }
  }, []);

  const recarregarBase = useCallback(
    () => tentar(async () => {
      const [f, b, c] = await Promise.all([listarFontes(), listarBlocos(), contarItens()]);
      setFontes(f);
      setBlocos(b);
      setContagem(c);
    }),
    [tentar],
  );
  const recarregarItens = useCallback(
    (id) => tentar(async () => setItens(id ? await listarItens(id) : [])),
    [tentar],
  );

  useEffect(() => { recarregarBase(); }, [recarregarBase]);

  const daRede = blocos.filter((b) => b.rede === rede);
  const ordenados = [...daRede.filter((b) => b.tipo === "faixa"), ...daRede.filter((b) => b.tipo === "grupo")];
  const bloco = ordenados.find((b) => b.id === blocoId) ?? ordenados[0];

  useEffect(() => {
    if (bloco && bloco.id !== blocoId) setBlocoId(bloco.id);
  }, [bloco, blocoId]);
  useEffect(() => {
    setEditando(null);
    recarregarItens(bloco?.id);
  }, [bloco?.id, recarregarItens]);

  useEffect(() => {
    if (foco?.tipo !== "item") return;
    const blocoAlvo = blocos.find((b) => b.id === foco.blocoId);
    if (!blocoAlvo) return;
    setRede(blocoAlvo.rede);
    setBlocoId(blocoAlvo.id);
  }, [foco, blocos]);

  useEffect(() => {
    if (foco?.tipo !== "item" || !itens.some((item) => item.id === foco.id)) return;
    setEditando(foco.id);
    onFocoConsumido?.();
  }, [foco, itens, onFocoConsumido]);

  const aposMudar = async () => {
    await Promise.all([recarregarItens(bloco.id), recarregarBase()]);
    await onAlteracao?.();
  };

  const salvar = (valores) =>
    editando === "novo"
      ? criarItem({ ...valores, bloco_id: bloco.id, ordem: proximaOrdem(itens) }).then(() => { setEditando(null); return aposMudar(); })
      : atualizarItem(editando, valores).then(() => { setEditando(null); return aposMudar(); });

  const excluir = (item) => {
    if (!window.confirm(`Excluir "${item.nome}"? Se só quer tirar do app, use o status arquivado.`)) return;
    tentar(async () => { await apagarItem(item.id); setEditando(null); await aposMudar(); });
  };

  const mover = (item, direcao) =>
    tentar(async () => {
      await gravarOrdens("itens", trocarComVizinho(itens, item.id, direcao), bloco.id);
      await recarregarItens(bloco.id);
      await onAlteracao?.();
    });

  const rotuloBloco = (b) => (b.tipo === "faixa" ? b.rotulo : `Grupo: ${b.rotulo}`);
  const resumo = (b) => {
    const c = contagem[b.id] ?? { aprovado: 0, rascunho: 0 };
    return `${c.aprovado}${c.rascunho ? ` +${c.rascunho} rasc.` : ""}`;
  };

  return (
    <>
      <div className="abas">
        {REDES.map(([id, nome]) => (
          <button key={id} className={id === rede ? "on" : ""} onClick={() => { setRede(id); setBlocoId(null); }}>{nome}</button>
        ))}
      </div>
      <div className="chips">
        {ordenados.map((b) => (
          <button key={b.id} className={b.id === bloco?.id ? "on" : ""} onClick={() => setBlocoId(b.id)}>
            {rotuloBloco(b)} <small>({resumo(b)})</small>
          </button>
        ))}
      </div>
      {erro && <p className="erro" role="alert">{erro}</p>}
      {bloco && (
        <section>
          <h2>{rotuloBloco(bloco)}{bloco.tipo === "faixa" && <small> · a partir de {bloco.idade_min_meses} meses</small>}</h2>
          <ul className="lista">
            {itens.map((item, i) => (
              <li key={item.id} className={`item ${item.status}`}>
                <div className="linha">
                  <b>{item.nome}</b>
                  <span className={`chip ${item.status}`}>{item.status}</span>
                  <small>{item.fonte_id ?? "sem fonte"}{item.pagina ? ` · p. ${item.pagina}` : ""}</small>
                  <span className="acoes">
                    <button aria-label={`Subir ${item.nome}`} disabled={i === 0} onClick={() => mover(item, -1)}>↑</button>
                    <button aria-label={`Descer ${item.nome}`} disabled={i === itens.length - 1} onClick={() => mover(item, 1)}>↓</button>
                    <button onClick={() => setEditando(editando === item.id ? null : item.id)}>Editar</button>
                  </span>
                </div>
                <p className="esquema"><i>{item.protege}.</i> {item.esquema}</p>
                {editando === item.id && (
                  <ItemForm item={item} fontes={fontes} onSalvar={salvar} onCancelar={() => setEditando(null)} onExcluir={() => excluir(item)} />
                )}
              </li>
            ))}
          </ul>
          {editando === "novo" ? (
            <ItemForm fontes={fontes} onSalvar={salvar} onCancelar={() => setEditando(null)} />
          ) : (
            <button className="primario" onClick={() => setEditando("novo")}>+ Nova vacina neste bloco</button>
          )}
        </section>
      )}
    </>
  );
}
