import { useRef, useState } from "react";
import { CardConferenciaFonte, StudioSplit } from "./Studio";

const vazio = { nome: "", protege: "", esquema: "", fonte_id: "", pagina: "", trecho: "", extras: [] };
const limpar = (v) => (v.trim() === "" ? null : v.trim());
const TIPOS_EXTRA = ["alerta", "nota", "esquema", "contraindicacao"];

export default function ItemForm({ item, fontes, onSalvar, onCancelar, onExcluir }) {
  const formRef = useRef(null);
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
  const [acaoPendente, setAcaoPendente] = useState(null);
  const [ultimaAcao, setUltimaAcao] = useState(null);
  const fonte = fontes.find((f) => f.id === v.fonte_id);
  const campo = (nome) => ({ value: v[nome], onChange: (e) => setV({ ...v, [nome]: e.target.value }) });

  async function persistir(status) {
    setErro("");
    setUltimaAcao(status);
    setSalvando(true);
    try {
      await onSalvar({
        nome: v.nome.trim(),
        protege: v.protege.trim(),
        esquema: v.esquema.trim(),
        fonte_id: limpar(v.fonte_id),
        pagina: limpar(v.pagina),
        trecho: limpar(v.trecho),
        status,
        extras: v.extras.map((extra) => ({
          tipo: extra.tipo,
          titulo: extra.titulo.trim(),
          conteudo: extra.conteudo.trim(),
        })),
      });
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  function solicitarAcao(status) {
    setErro("");
    if (!formRef.current.reportValidity()) return;
    if (status === "aprovado" && !v.fonte_id.trim()) {
      setErro("Para aprovar um item, escolha uma fonte.");
      return;
    }
    setAcaoPendente(status);
  }

  const preview = (
    <article className="cartao-preview">
      <header><b>{v.nome.trim() || "Nome da vacina"}</b></header>
      <p className="preview-protecao">{v.protege.trim() || "Protege contra"}</p>
      <p>{v.esquema.trim() || "O esquema da vacina aparecerá aqui."}</p>
      {v.extras.filter((extra) => extra.titulo.trim() || extra.conteudo.trim()).map((extra, indice) => (
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
        <label>Protege contra<input {...campo("protege")} required /></label>
        <label>Esquema<textarea rows={3} {...campo("esquema")} required /></label>
        <div className="duas">
          <label>
            Fonte
            <select {...campo("fonte_id")}>
              <option value="">— escolha —</option>
              {fontes.map((f) => <option key={f.id} value={f.id}>{f.id} · {f.titulo}</option>)}
            </select>
          </label>
          <label>Página<input {...campo("pagina")} placeholder="ex.: 4" /></label>
        </div>
        <label>Trecho literal do documento (para conferir depois)<textarea rows={2} {...campo("trecho")} /></label>
        <CardConferenciaFonte fonte={fonte} pagina={v.pagina} secao={v.trecho} />
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
              <button type="button" className="perigo" disabled={salvando} onClick={() => setV({
                ...v,
                extras: v.extras.filter((_, i) => i !== indice),
              })}>Remover bloco</button>
            </div>
          ))}
          <button type="button" disabled={salvando} onClick={() => setV({
            ...v,
            extras: [...v.extras, { tipo: "nota", titulo: "", conteudo: "" }],
          })}>+ Adicionar bloco</button>
        </fieldset>
        {erro && (
          <div className="erro" role="alert">
            <p>{erro}</p>
            {ultimaAcao && <button type="button" disabled={salvando} onClick={() => void persistir(ultimaAcao)}>Tentar novamente</button>}
          </div>
        )}
        {acaoPendente && (
          <section className="confirmacao-aprovacao" aria-label="Resumo da ação">
            <h4>{acaoPendente === "aprovado" ? "Revise antes de aprovar" : "Confirmar arquivamento"}</h4>
            <dl>
              <dt>Vacina</dt><dd>{v.nome.trim()}</dd>
              <dt>Fonte</dt><dd>{fonte ? `${fonte.instituicao} · ${fonte.titulo}` : "Sem fonte"}</dd>
              <dt>Conferência</dt><dd>{fonte?.conferido_em ?? "Data de conferência ausente"}</dd>
              <dt>Destino</dt><dd>{acaoPendente === "aprovado" ? "Aprovado para a próxima publicação" : "Arquivado e removido do app na próxima publicação"}</dd>
            </dl>
            {acaoPendente === "aprovado" && !fonte?.conferido_em && (
              <p className="alerta-fonte">A fonte ainda não tem data de conferência registrada.</p>
            )}
            <div className="botoes">
              <button type="button" className="primario" disabled={salvando} onClick={() => void persistir(acaoPendente)}>
                {salvando ? "Salvando..." : acaoPendente === "aprovado" ? "Confirmar aprovação" : "Confirmar arquivamento"}
              </button>
              <button type="button" disabled={salvando} onClick={() => setAcaoPendente(null)}>Voltar</button>
            </div>
          </section>
        )}
        <div className="botoes">
          <button className="primario" disabled={salvando}>{salvando ? "Salvando..." : "Salvar rascunho"}</button>
          <button type="button" disabled={salvando} onClick={() => solicitarAcao("aprovado")}>Revisar e aprovar</button>
          {item && item.status !== "arquivado" && (
            <button type="button" className="perigo" disabled={salvando} onClick={() => solicitarAcao("arquivado")}>Arquivar item</button>
          )}
          <button type="button" disabled={salvando} onClick={onCancelar}>Cancelar</button>
          {onExcluir && <button type="button" className="perigo" disabled={salvando} onClick={onExcluir}>Excluir</button>}
        </div>
      </form>
    </StudioSplit>
  );
}
