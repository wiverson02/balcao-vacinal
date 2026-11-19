// Toda a conversa com o Supabase passa por aqui.
import { erroConfiguracao, supabase } from "./supabase";
import { traduzirErro } from "./erros";

export const configurado = !erroConfiguracao;
export { erroConfiguracao };

const conferir = ({ data, error }) => {
  if (error) throw new Error(traduzirErro(error.message));
  return data;
};

export const sessaoAtual = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(traduzirErro(error.message));
  return data.session;
};
export const aoMudarSessao = (fn) => {
  const { data } = supabase.auth.onAuthStateChange((evento, sessao) => fn(sessao, evento));
  return () => data.subscription.unsubscribe();
};
export const entrar = async (email, senha) => {
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) {
    if (error.status === 400) throw new Error("E-mail ou senha incorretos.");
    throw new Error(`Não foi possível entrar: ${traduzirErro(error.message)}`);
  }
};
export const sair = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(traduzirErro(error.message));
};

export const ehEditor = (userId) =>
  supabase.from("editores").select("user_id").eq("user_id", userId).maybeSingle().then(conferir).then(Boolean);

// Fontes
export const listarFontes = () => supabase.from("fontes").select("*").order("ordem").then(conferir);
export const criarFonte = (f) => supabase.from("fontes").insert(f).then(conferir);
export const atualizarFonte = (id, f) => supabase.from("fontes").update(f).eq("id", id).then(conferir);
export const apagarFonte = (id) => supabase.from("fontes").delete().eq("id", id).then(conferir);

// Blocos (faixas da criança e grupos)
export const listarBlocos = () =>
  supabase.from("blocos").select("*").order("rede").order("ordem").then(conferir);
export const criarBloco = (b) => supabase.from("blocos").insert(b).then(conferir);
export const atualizarBloco = (id, b) => supabase.from("blocos").update(b).eq("id", id).then(conferir);
export const apagarBloco = (id) => supabase.from("blocos").delete().eq("id", id).then(conferir);

// Itens (vacinas)
export const listarItens = (blocoId) =>
  supabase.from("itens").select("*").eq("bloco_id", blocoId).order("ordem").order("criado_em").then(conferir);
export const criarItem = (i) => supabase.from("itens").insert(i).then(conferir);
export const atualizarItem = (id, i) => supabase.from("itens").update(i).eq("id", id).then(conferir);
export const apagarItem = (id) => supabase.from("itens").delete().eq("id", id).then(conferir);

// Guia de vacinas
export const listarGuiaVacinas = () =>
  supabase.from("guia_vacinas").select("*").order("ordem").order("nome").then(conferir);
export const criarGuiaVacina = (vacina) => supabase.from("guia_vacinas").insert(vacina).then(conferir);
export const atualizarGuiaVacina = (id, vacina) =>
  supabase.from("guia_vacinas").update(vacina).eq("id", id).then(conferir);
export const apagarGuiaVacina = (id) => supabase.from("guia_vacinas").delete().eq("id", id).then(conferir);

// Contagem por bloco e status (para mostrar quantos aprovados e rascunhos cada bloco tem).
export async function contarItens() {
  const contagem = {};
  for (let de = 0; ; de += 1000) {
    const linhas = await supabase.from("itens").select("bloco_id,status").range(de, de + 999).then(conferir);
    for (const { bloco_id, status } of linhas) {
      contagem[bloco_id] ??= { aprovado: 0, rascunho: 0, arquivado: 0 };
      contagem[bloco_id][status]++;
    }
    if (linhas.length < 1000) return contagem;
  }
}

export const gravarOrdens = (tabela, pares, blocoId) => {
  const p_ids = [...pares].sort((a, b) => a[1] - b[1]).map(([id]) => id);
  if (tabela === "blocos") {
    return supabase.rpc("reordenar_blocos", { p_ids }).then(conferir);
  }
  if (tabela === "itens" && blocoId) {
    return supabase.rpc("reordenar_itens", { p_bloco_id: blocoId, p_ids }).then(conferir);
  }
  if (tabela === "guia_vacinas") {
    return supabase.rpc("reordenar_guia_vacinas", { p_ids }).then(conferir);
  }
  throw new Error("Não foi possível identificar a lista para reordenar.");
};
