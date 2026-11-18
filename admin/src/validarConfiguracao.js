function papelDaChave(chave) {
  const payload = chave.split(".")[1];
  if (!payload) return null;

  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
    return JSON.parse(atob(base64)).role ?? null;
  } catch {
    return null;
  }
}

export function validarConfiguracaoSupabase(url, chave) {
  if (!url || !chave) {
    return "Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no arquivo admin/.env.local.";
  }

  if (url.includes("projeto-exemplo") || chave.includes("EXEMPLO_NAO_E_CREDENCIAL")) {
    return "Substitua os valores de exemplo no arquivo admin/.env.local.";
  }

  let endereco;
  try {
    endereco = new URL(url);
  } catch {
    return "VITE_SUPABASE_URL precisa ser uma URL válida do projeto.";
  }

  const local = ["localhost", "127.0.0.1", "[::1]"].includes(endereco.hostname);
  if (endereco.protocol !== "https:" && !(local && endereco.protocol === "http:")) {
    return "A URL do Supabase precisa usar HTTPS (HTTP só é permitido para desenvolvimento local).";
  }

  if (endereco.pathname !== "/" || endereco.search || endereco.hash) {
    return "VITE_SUPABASE_URL deve ser a URL raiz do projeto, sem caminhos como /rest/v1.";
  }

  const papel = papelDaChave(chave);
  if (chave.startsWith("sb_secret_") || papel === "service_role") {
    return "Chave secreta/service_role não pode ser usada no painel. Use a chave publicável.";
  }

  if (!chave.startsWith("sb_publishable_") && papel !== "anon") {
    return "Use uma chave publicável sb_publishable_ ou uma chave anon legada do Supabase.";
  }

  return null;
}
