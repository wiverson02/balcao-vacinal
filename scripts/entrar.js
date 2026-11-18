// Conexão com o Supabase para os scripts que rodam no seu computador.
// Entra com o e-mail e a senha de editor, então as mesmas regras do painel (RLS) valem aqui.
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { validarConfiguracaoSupabase } from "../admin/src/validarConfiguracao.js";

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(raiz, "admin", ".env.local") });
dotenv.config({ path: path.join(raiz, ".env.local") });

export async function conectar() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const chave = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  const { EDITOR_EMAIL, EDITOR_PASSWORD } = process.env;
  const faltando = [];
  if (!url) faltando.push("VITE_SUPABASE_URL (ou SUPABASE_URL)");
  if (!chave) faltando.push("VITE_SUPABASE_PUBLISHABLE_KEY (ou SUPABASE_PUBLISHABLE_KEY)");
  if (!EDITOR_EMAIL) faltando.push("EDITOR_EMAIL");
  if (!EDITOR_PASSWORD) faltando.push("EDITOR_PASSWORD");
  if (faltando.length) {
    throw new Error(`Falta preencher no arquivo admin/.env.local ou .env.local: ${faltando.join(", ")}`);
  }
  const erroConfiguracao = validarConfiguracaoSupabase(url, chave);
  if (erroConfiguracao) {
    throw new Error(`Configuração inválida para os scripts: ${erroConfiguracao}`);
  }
  const client = createClient(url, chave, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email: EDITOR_EMAIL, password: EDITOR_PASSWORD });
  if (error) throw new Error(`Não consegui entrar: ${error.message}`);
  return client;
}
