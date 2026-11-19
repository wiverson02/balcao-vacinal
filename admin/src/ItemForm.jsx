import { useState } from "react";

const vazio = { nome: "", protege: "", esquema: "", fonte_id: "", pagina: "", trecho: "", status: "rascunho", extras: [] };
const limpar = (v) => (v.trim() === "" ? null : v.trim());
const TIPOS_EXTRA = ["alerta", "nota", "esquema", "contraindicacao"];

export default function ItemForm({ item, fontes, onSalvar, onCancelar, onExcluir }) {
  const [v, setV] = useState(() => ({
    ...vazio,
    ...item,
    fonte_id: item?.fonte_id ?? "",
    pagina: item?.pagina ?? "",
    trecho: item?.trecho ?? "",
    extras: Array.isArray(item?.extras) ? item.extras.map((extra) => ({ ...extra })) : [],
  }));
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const campo = (nome) => ({ value: v[nome], onChange: (e) => setV({ ...v, [nome]: e.target.value }) });

  async function enviar(e) {
    e.preventDefault();
    setErro("");
    if (v.status === "aprovado" && !v.fonte_id.trim()) {
      setErro("Para aprovar um item, escolha uma fonte.");
      return;
    }
    setSalvando(true);
    try {
      await onSalvar({
        nome: v.nome.trim(),
        protege: v.protege.trim(),
        esquema: v.esquema.trim(),
        fonte_id: limpar(v.fonte_id),
        pagina: limpar(v.pagina),
        trecho: limpar(v.trecho),
        status: v.status,
        extras: v.extras.map((extra) => ({
          tipo: extra.tipo,
          titulo: extra.titulo.trim(),
          conteudo: extra.conteudo.trim(),
        })),
      });
    } catch (err) {
      setErro(err.message);
      setSalvando(false);
    }
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      <label>Nome da vacina<input {...campo("nome")} required /></label>
      <label>Protege contra<input {...campo("protege")} required /></label>
      <label>Esquema<textarea rows={3} {...campo("esquema")} required /></label>
      <div className="duas">
        <label>
          Fonte
          <select {...campo("fonte_id")}>
            <option value="">— escolha —</option>
            {fontes.map((f) => <option key={f.id} value={f.id}>{f.id}</option>)}
          </select>
        </label>
        <label>Página<input {...campo("pagina")} placeholder="ex.: 4" /></label>
      </div>
      <label>Trecho literal do documento (para conferir depois)<textarea rows={2} {...campo("trecho")} /></label>
      <fieldset>
        <legend>Blocos adicionais</legend>
        {v.extras.map((extra, indice) => (
          <div className="item-extra formulario" key={indice}>
            <label>
              Tipo
              <select
                value={extra.tipo}
                onChange={(e) => setV({
                  ...v,
                  extras: v.extras.map((x, i) => i === indice ? { ...x, tipo: e.target.value } : x),
                })}
              >
                {TIPOS_EXTRA.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
              </select>
            </label>
            <label>
              Título
              <input
                value={extra.titulo}
                onChange={(e) => setV({
                  ...v,
                  extras: v.extras.map((x, i) => i === indice ? { ...x, titulo: e.target.value } : x),
                })}
                required
              />
            </label>
            <label>
              Conteúdo
              <textarea
                rows={3}
                value={extra.conteudo}
                onChange={(e) => setV({
                  ...v,
                  extras: v.extras.map((x, i) => i === indice ? { ...x, conteudo: e.target.value } : x),
                })}
                required
              />
            </label>
            <button type="button" className="perigo" onClick={() => setV({
              ...v,
              extras: v.extras.filter((_, i) => i !== indice),
            })}>Remover bloco</button>
          </div>
        ))}
        <button type="button" onClick={() => setV({
          ...v,
          extras: [...v.extras, { tipo: "nota", titulo: "", conteudo: "" }],
        })}>+ Adicionar bloco</button>
      </fieldset>
      <label>
        Status
        <select {...campo("status")}>
          <option value="rascunho">rascunho (não vai para o app)</option>
          <option value="aprovado">aprovado (vai para o app)</option>
          <option value="arquivado">arquivado (não vai para o app)</option>
        </select>
      </label>
      {erro && <p className="erro" role="alert">{erro}</p>}
      <div className="botoes">
        <button className="primario" disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</button>
        <button type="button" onClick={onCancelar}>Cancelar</button>
        {onExcluir && <button type="button" className="perigo" onClick={onExcluir}>Excluir</button>}
      </div>
    </form>
  );
}
