import { useId, useState } from "react";

const moverTabComSetas = (evento) => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(evento.key)) return;
  const abas = [...evento.currentTarget.querySelectorAll('[role="tab"]')];
  const indice = abas.indexOf(document.activeElement);
  if (indice < 0) return;
  evento.preventDefault();
  const proximo = evento.key === "Home"
    ? 0
    : evento.key === "End"
      ? abas.length - 1
      : (indice + (evento.key === "ArrowRight" ? 1 : abas.length - 1)) % abas.length;
  abas[proximo]?.focus();
  abas[proximo]?.click();
};

export function formatarAtualizadoEm(valor) {
  if (!valor) return "não informado";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "data inválida";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

export function CardConferenciaFonte({ fonte, pagina, secao, referenciaNaoSuportada = false }) {
  if (!fonte) return <p className="ajuda">Selecione uma fonte para conferir o conteúdo.</p>;
  const referencia = [pagina && `p. ${pagina}`, secao].filter(Boolean).join(" · ");
  const urlExterna = /^https?:\/\//i.test(fonte.url ?? "") ? fonte.url : null;

  return (
    <aside className={`conferencia-fonte ${fonte.conferido_em ? "conferida" : "pendente"}`} aria-label="Card de Conferência da Fonte">
      <h3>Conferência da Fonte</h3>
      <dl>
        <dt>Instituição</dt><dd>{fonte.instituicao}</dd>
        <dt>Título</dt><dd>{fonte.titulo}</dd>
        <dt>Página / seção</dt>
        <dd>{referencia || (referenciaNaoSuportada ? "Não suportado no cadastro do Guia." : "Não informado.")}</dd>
        <dt>Conferido em</dt>
        <dd>
          {fonte.conferido_em
            ? <time dateTime={fonte.conferido_em}>{fonte.conferido_em}</time>
            : <strong className="alerta-fonte">Ainda não conferida</strong>}
        </dd>
      </dl>
      {urlExterna
        ? <a href={urlExterna} target="_blank" rel="noopener noreferrer">Abrir documento oficial ↗</a>
        : <p className="ajuda">{fonte.url ? "O link externo não parece ser HTTP ou HTTPS." : "A fonte não possui link externo."}</p>}
      {fonte.arquivo && <p className="ajuda">PDF local: {fonte.arquivo}</p>}
    </aside>
  );
}

export function StudioSplit({ children, preview }) {
  const [abaMovel, setAbaMovel] = useState("editar");
  const [tema, setTema] = useState("escuro");
  const id = useId();

  return (
    <div className="studio">
      <div className="studio-abas-movel" role="tablist" aria-label="Modo Estúdio" onKeyDown={moverTabComSetas}>
        <button
          type="button"
          role="tab"
          aria-selected={abaMovel === "editar"}
          aria-controls={`studio-editor-${id}`}
          onClick={() => setAbaMovel("editar")}
        >Editar</button>
        <button
          type="button"
          role="tab"
          aria-selected={abaMovel === "preview"}
          aria-controls={`studio-preview-${id}`}
          onClick={() => setAbaMovel("preview")}
        >Pré-visualizar</button>
      </div>
      <div className="studio-grade">
        <section
          id={`studio-editor-${id}`}
          role="tabpanel"
          className="studio-editor"
          aria-label="Editor estruturado"
          data-aba-movel={abaMovel === "editar" ? "ativa" : "inativa"}
        >
          {children}
        </section>
        <aside
          id={`studio-preview-${id}`}
          role="tabpanel"
          className={`studio-preview tema-${tema}`}
          aria-label="Preview ao vivo"
          data-aba-movel={abaMovel === "preview" ? "ativa" : "inativa"}
        >
          <div className="studio-preview-cabecalho">
            <h3>Preview ao vivo</h3>
            <div role="group" aria-label="Tema do preview">
              <button type="button" aria-pressed={tema === "claro"} onClick={() => setTema("claro")}>Tema Claro</button>
              <button type="button" aria-pressed={tema === "escuro"} onClick={() => setTema("escuro")}>Tema Escuro</button>
            </div>
          </div>
          <div className={`preview-publico tema-${tema}`}>{preview}</div>
        </aside>
      </div>
    </div>
  );
}
