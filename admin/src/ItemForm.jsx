import { useState } from "react";

const vazio = { nome: "", protege: "", esquema: "", fonte_id: "", pagina: "", trecho: "", status: "rascunho" };
const limpar = (v) => (v.trim() === "" ? null : v.trim());

export default function ItemForm({ item, fontes, onSalvar, onCancelar, onExcluir }) {
  const [v, setV] = useState(item ? { ...vazio, ...Object.fromEntries(Object.entries(item).map(([k, x]) => [k, x ?? ""])) } : vazio);
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
