import { useEffect, useState } from "react";
import { configurado, erroConfiguracao, sessaoAtual, aoMudarSessao, entrar, sair, ehEditor } from "./api";
import Vacinas from "./Vacinas";
import Blocos from "./Blocos";
import Fontes from "./Fontes";

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
  ["vacinas", "Vacinas", Vacinas],
  ["blocos", "Blocos", Blocos],
  ["fontes", "Fontes", Fontes],
];

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
  const Tela = ABAS.find((a) => a[0] === aba)[2];
  return (
    <>
      <header>
        <b>Painel · Balcão Vacinal</b>
        <nav>
          {ABAS.map(([id, nome]) => (
            <button key={id} className={id === aba ? "on" : ""} onClick={() => setAba(id)}>{nome}</button>
          ))}
        </nav>
        <span className="quem">{email} <BotaoSair /></span>
      </header>
      <main>
        <Tela />
      </main>
      <footer>
        Só itens com status <b>aprovado</b> chegam ao app. As mudanças daqui só aparecem no site depois de rodar
        <code> npm run publicar</code> no projeto, commitar e enviar para a <code>develop</code>.
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
