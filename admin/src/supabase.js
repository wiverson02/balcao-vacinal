import { createClient } from "@supabase/supabase-js";
import { validarConfiguracaoSupabase } from "./validarConfiguracao";

const url = (import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const chave = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "").trim();
export const erroConfiguracao = validarConfiguracaoSupabase(url, chave);

export const supabase = erroConfiguracao
  ? null
  : createClient(url, chave, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
