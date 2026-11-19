import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  configurado,
  erroConfiguracao,
  sessaoAtual,
  aoMudarSessao,
  entrar,
  sair,
  ehEditor,
  listarBlocos,
  listarFontes,
  listarGuiaVacinas,
  listarTodosItens,
} from "./api";
import { diagnosticarProntidaoPublicacao } from "../../scripts/lib/conversao.js";
import Vacinas from "./Vacinas";
import Blocos from "./Blocos";
import Fontes from "./Fontes";
import GuiaVacinas from "./GuiaVacinas";

function Configuracao() {
  return (
    <main className="cartao">
      <h1>Falta configurar</h1>
      <p>
        {erroConfiguracao} Depois de configurar, reinicie o <code>npm run dev</code>.
      </p>
    </main>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      await entrar(email.trim(), senha);
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="cartao estreito">
      <h1>Painel · Balcão Vacinal</h1>
      <form onSubmit={enviar}>
        <label>
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
        </label>
        <label>
          Senha
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" required />
        </label>
        {erro && <p className="erro" role="alert">{erro}</p>}
        <button className="primario" disabled={enviando}>{enviando ? "Entrando..." : "Entrar"}</button>
      </form>
    </main>
  );
}

const ABAS = [
  ["vacinas", "Calendário", Vacinas],
  ["guia", "Guia clínico", GuiaVacinas],
  ["blocos", "Estrutura", Blocos],
  ["fontes", "Fontes", Fontes],
];

const FILTROS = [
  ["todos", "Todos"],
  ["rascunhos", "Rascunhos"],
  ["aprovados", "Aprovados"],
  ["semFonteConferida", "Sem fonte conferida"],
];
const ABA_POR_TIPO = { item: "vacinas", guia: "guia", bloco: "blocos", fonte: "fontes" };
const normalizarBusca = (texto) =>
  texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const textoDeValores = (valor) => {
  if (typeof valor === "string" || typeof valor === "number") return [String(valor)];
  if (Array.isArray(valor)) return valor.flatMap(textoDeValores);
  if (valor && typeof valor === "object") return Object.values(valor).flatMap(textoDeValores);
  return [];
};
const pluralizar = (total, singular, plural) => `${total} ${total === 1 ? singular : plural}`;
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

function registrosGlobais(dados) {
  if (!dados) return [];
  const blocos = new Map(dados.blocos.map((bloco) => [bloco.id, bloco]));
  const fontes = new Map(dados.fontes.map((fonte) => [fonte.id, fonte]));
  const registrosItens = dados.itens.map((item) => {
    const bloco = blocos.get(item.bloco_id);
    const fonte = fontes.get(item.fonte_id);
    return {
      tipo: "item",
      id: item.id,
      titulo: item.nome,
      descricao: bloco ? `${bloco.rotulo} · ${bloco.rede}` : "Bloco não encontrado",
      status: item.status,
      fonteConferida: Boolean(fonte?.conferido_em),
      blocoId: item.bloco_id,
      rede: bloco?.rede,
      busca: normalizarBusca(textoDeValores([item, bloco, fonte]).join(" ")),
    };
  });
  const registrosGuia = dados.guiaVacinas.map((vacina) => {
    const fonte = fontes.get(vacina.fonte_id);
    return {
      tipo: "guia",
      id: vacina.id,
      titulo: vacina.nome,
      descricao: `${vacina.rede} · ${fonte?.titulo ?? "sem fonte"}`,
      status: vacina.status,
      fonteConferida: Boolean(fonte?.conferido_em),
      busca: normalizarBusca(textoDeValores([vacina, fonte]).join(" ")),
    };
  });
  const registrosBlocos = dados.blocos.map((bloco) => ({
    tipo: "bloco",
    id: bloco.id,
    titulo: bloco.rotulo,
    descricao: `${bloco.rede} · ${bloco.tipo}`,
    busca: normalizarBusca(textoDeValores(bloco).join(" ")),
  }));
  const registrosFontes = dados.fontes.map((fonte) => ({
    tipo: "fonte",
    id: fonte.id,
    titulo: fonte.titulo,
    descricao: `${fonte.instituicao} · ${fonte.id}${fonte.conferido_em ? ` · conferida em ${fonte.conferido_em}` : " · não conferida"}`,
    busca: normalizarBusca(textoDeValores(fonte).join(" ")),
  }));
  return [...registrosItens, ...registrosGuia, ...registrosBlocos, ...registrosFontes];
}

function filtrarRegistros(registros, filtro, diagnostico, busca) {
  const blocosPendentes = new Set((diagnostico?.blocosSemItensAprovados ?? []).map((bloco) => bloco.id));
  const itensSemFonte = new Set((diagnostico?.itensAprovadosSemFonteConferida ?? []).map((item) => item.id));
  const guiaSemFonte = new Set((diagnostico?.guiaAprovadoSemFonteConferida ?? []).map((vacina) => vacina.id));
  const consulta = normalizarBusca(busca.trim());

  return registros.filter((registro) => {
    if (filtro === "rascunhos" && registro.status !== "rascunho") return false;
    if (filtro === "aprovados" && registro.status !== "aprovado") return false;
    if (filtro === "semFonteConferida" &&
      !(registro.tipo === "item" && itensSemFonte.has(registro.id)) &&
      !(registro.tipo === "guia" && guiaSemFonte.has(registro.id))) return false;
    if (filtro === "blocosSemAprovados" &&
      !(registro.tipo === "bloco" && blocosPendentes.has(registro.id))) return false;
    return !consulta || registro.busca.includes(consulta);
  });
}

function BotaoSair() {
  const [erro, setErro] = useState("");

  async function sairComTratamento() {
    setErro("");
    try {
      await sair();
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <>
      <button onClick={sairComTratamento}>Sair</button>
      {erro && <span className="erro" role="alert">{erro}</span>}
    </>
  );
}

function Painel({ email }) {
  const [aba, setAba] = useState("vacinas");
  const [dados, setDados] = useState(null);
  const [erroDados, setErroDados] = useState("");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [foco, setFoco] = useState(null);
  const [focarResultados, setFocarResultados] = useState(false);
  const campoBusca = useRef(null);
  const resultadosRef = useRef(null);
  const Tela = ABAS.find((a) => a[0] === aba)[2];

  const carregarDados = useCallback(async () => {
    setErroDados("");
    try {
      const [fontes, blocos, itens, guiaVacinas] = await Promise.all([
        listarFontes(),
        listarBlocos(),
        listarTodosItens(),
        listarGuiaVacinas(),
      ]);
      setDados({ fontes, blocos, itens, guiaVacinas });
    } catch (erro) {
      setErroDados(erro.message);
    }
  }, []);

  useEffect(() => { void carregarDados(); }, [carregarDados]);
  useEffect(() => {
    const atalhos = (evento) => {
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === "k") {
        evento.preventDefault();
        campoBusca.current?.focus();
      }
    };
    window.addEventListener("keydown", atalhos);
    return () => window.removeEventListener("keydown", atalhos);
  }, []);
  const diagnostico = useMemo(
    () => dados ? diagnosticarProntidaoPublicacao(dados) : null,
    [dados],
  );
  const registros = useMemo(() => registrosGlobais(dados), [dados]);
  const resultados = useMemo(
    () => filtrarRegistros(registros, filtro, diagnostico, busca),
    [registros, filtro, diagnostico, busca],
  );
  useEffect(() => {
    if (!focarResultados) return;
    resultadosRef.current?.focus();
    resultadosRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    setFocarResultados(false);
  }, [focarResultados, resultados.length]);
  const totalSemFonteConferida = diagnostico
    ? diagnostico.itensAprovadosSemFonteConferida.length + diagnostico.guiaAprovadoSemFonteConferida.length
    : 0;
  const totalRascunhos = diagnostico
    ? diagnostico.itensRascunho.length + diagnostico.guiaRascunho.length
    : 0;

  const abrirRegistro = (registro) => {
    setAba(ABA_POR_TIPO[registro.tipo]);
    setFoco({
      tipo: registro.tipo,
      id: registro.id,
      blocoId: registro.blocoId,
      rede: registro.rede,
    });
    setBusca("");
    setFiltro("todos");
  };
  const consumirFoco = useCallback(() => setFoco(null), []);
  const selecionarAba = (id) => {
    setFoco(null);
    setAba(id);
  };
  const selecionarAlerta = (id) => {
    setBusca("");
    setFiltro(id);
    setFocarResultados(true);
  };

  return (
    <>
      <header>
        <b>Painel · Balcão Vacinal</b>
        <nav role="tablist" aria-label="Seções do painel" onKeyDown={moverTabComSetas}>
          {ABAS.map(([id, nome]) => (
            <button
              key={id}
              id={`aba-${id}`}
              type="button"
              role="tab"
              aria-selected={id === aba}
              aria-controls="conteudo-painel"
              className={id === aba ? "on" : ""}
              onClick={() => selecionarAba(id)}
            >{nome}</button>
          ))}
        </nav>
        <span className="quem">{email} <BotaoSair /></span>
      </header>
      <main>
        <section className="ferramentas-painel">
          <details className="semaforo">
            <summary>
              <b>Prontidão para publicar</b>
              {diagnostico && (
                <span className="resumo-prontidao">
                  {diagnostico.blocosSemItensAprovados.length} bloqueios · {totalSemFonteConferida} fontes a conferir · {totalRascunhos} rascunhos
                </span>
              )}
            </summary>
            {erroDados && (
              <p className="erro" role="alert">
                Não foi possível atualizar o diagnóstico editorial: {erroDados}
                <button type="button" onClick={() => void carregarDados()}>Tentar novamente</button>
              </p>
            )}
            {!diagnostico ? (
              <p aria-live="polite">Carregando diagnóstico editorial...</p>
            ) : (
              <div className="indicadores-prontidao">
                <button
                  type="button"
                  className={`indicador bloqueante ${diagnostico.blocosSemItensAprovados.length ? "alerta" : "resolvido"}`}
                  aria-pressed={filtro === "blocosSemAprovados"}
                  onClick={() => selecionarAlerta("blocosSemAprovados")}
                >
                  {pluralizar(diagnostico.blocosSemItensAprovados.length, "bloco", "blocos")} sem itens aprovados (bloqueante)
                </button>
                <button
                  type="button"
                  className={`indicador conferir ${totalSemFonteConferida ? "alerta" : "resolvido"}`}
                  aria-pressed={filtro === "semFonteConferida"}
                  onClick={() => selecionarAlerta("semFonteConferida")}
                >
                  {pluralizar(totalSemFonteConferida, "aprovado sem fonte conferida", "aprovados sem fonte conferida")}
                </button>
                <button
                  type="button"
                  className={`indicador rascunhos ${totalRascunhos ? "alerta" : "resolvido"}`}
                  aria-pressed={filtro === "rascunhos"}
                  onClick={() => selecionarAlerta("rascunhos")}
                >
                  {pluralizar(totalRascunhos, "rascunho pendente", "rascunhos pendentes")}
                </button>
              </div>
            )}
          </details>
          <section className="busca-global" aria-label="Busca e filtros globais">
            <div className="campo-busca">
              <label htmlFor="busca-global">Buscar em tudo</label>
              <input
                id="busca-global"
                ref={campoBusca}
                type="search"
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
                placeholder="Itens, fichas, blocos ou fontes"
                autoComplete="off"
              />
              <kbd>Ctrl+K</kbd>
            </div>
            <details className="filtros-status-menu">
              <summary>
                {filtro === "todos"
                  ? "Filtros rápidos"
                  : `Filtro: ${FILTROS.find(([id]) => id === filtro)?.[1] ?? "Blocos sem itens aprovados"}`}
              </summary>
              <div className="filtros-status" role="group" aria-label="Filtros rápidos por status">
                {FILTROS.map(([id, nome]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={filtro === id}
                    className={filtro === id ? "on" : ""}
                    onClick={(evento) => {
                      setFiltro(id);
                      evento.currentTarget.closest("details").open = false;
                    }}
                  >{nome}</button>
                ))}
              </div>
            </details>
          </section>
          {(busca.trim() || filtro !== "todos") && (
            <section ref={resultadosRef} tabIndex={-1} className="resultados-globais" aria-label="Resultados globais" aria-live="polite">
              <h2>Resultados ({resultados.length})</h2>
              {resultados.length ? (
                <ul className="lista">
                  {resultados.map((registro) => (
                    <li key={`${registro.tipo}:${registro.id}`}>
                      <button type="button" className="resultado-global" onClick={() => abrirRegistro(registro)}>
                        <b>{registro.titulo}</b>
                        <span>{registro.tipo === "item" ? "Item do calendário" : registro.tipo === "guia" ? "Ficha do Guia" : registro.tipo === "bloco" ? "Bloco" : "Fonte"}</span>
                        {registro.status && <span className={`chip ${registro.status}`}>{registro.status}</span>}
                        <small>{registro.descricao}</small>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Nenhum registro corresponde à busca e aos filtros selecionados.</p>
              )}
            </section>
          )}
        </section>
        <section id="conteudo-painel" role="tabpanel" aria-labelledby={`aba-${aba}`} tabIndex={0}>
          <Tela onAlteracao={carregarDados} foco={foco} onFocoConsumido={consumirFoco} />
        </section>
      </main>
      <footer>
        Só itens com status <b>aprovado</b> chegam ao app. As mudanças daqui só aparecem no site depois de rodar
        <code> npm run publicar</code> no projeto. Revise os JSONs gerados, faça commit e envie para <code>main</code>; o deploy público é automático.
      </footer>
    </>
  );
}

export default function App() {
  const [estado, setEstado] = useState({ tela: configurado ? "carregando" : "configurar" });

  useEffect(() => {
    if (!configurado) return;
    let ativo = true;
    let revisao = 0;
    let usuarioVerificado = null;
    let usuarioEmVerificacao = null;

    const definir = async (sessao) => {
      if (!sessao) {
        revisao++;
        usuarioVerificado = null;
        usuarioEmVerificacao = null;
        if (ativo) setEstado({ tela: "login" });
        return;
      }

      const userId = sessao.user.id;
      if (userId === usuarioVerificado || userId === usuarioEmVerificacao) return;
      const tentativa = ++revisao;
      usuarioVerificado = null;
      usuarioEmVerificacao = userId;
      if (ativo) setEstado({ tela: "autorizando" });

      try {
        const editor = await ehEditor(userId);
        if (!ativo || tentativa !== revisao) return;
        usuarioEmVerificacao = null;
        usuarioVerificado = userId;
        setEstado({ tela: editor ? "painel" : "semPermissao", email: sessao.user.email });
      } catch (e) {
        if (!ativo || tentativa !== revisao) return;
        usuarioEmVerificacao = null;
        setEstado({ tela: "erro", mensagem: e.message });
      }
    };
    const revisaoInicial = revisao;
    const parar = aoMudarSessao((sessao) => {
      // Aguarda o callback de auth terminar antes de consultar public.editores.
      setTimeout(() => { if (ativo) void definir(sessao); }, 0);
    });
    sessaoAtual()
      .then((sessao) => {
        if (ativo && revisaoInicial === revisao) return definir(sessao);
      })
      .catch((e) => {
        if (ativo && revisaoInicial === revisao) setEstado({ tela: "erro", mensagem: e.message });
      });
    return () => {
      ativo = false;
      revisao++;
      parar();
    };
  }, []);

  switch (estado.tela) {
    case "configurar":
      return <Configuracao />;
    case "login":
      return <Login />;
    case "painel":
      return <Painel email={estado.email} />;
    case "semPermissao":
      return (
        <main className="cartao estreito">
          <h1>Sem permissão</h1>
          <p>A conta {estado.email} entrou, mas não está na lista de editores.</p>
          <BotaoSair />
        </main>
      );
    case "erro":
      return (
        <main className="cartao estreito">
          <h1>Erro</h1>
          <p className="erro">{estado.mensagem}</p>
          <BotaoSair />
        </main>
      );
    case "autorizando":
      return <main className="cartao estreito"><p>Verificando autorização...</p></main>;
    default:
      return <main className="cartao estreito"><p>Carregando...</p></main>;
  }
}
