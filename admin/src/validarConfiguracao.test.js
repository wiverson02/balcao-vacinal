import { describe, expect, it } from "vitest";
import { validarConfiguracaoSupabase } from "./validarConfiguracao";

describe("validarConfiguracaoSupabase", () => {
  it("orienta a configurar as duas variáveis sem revelar valores", () => {
    expect(validarConfiguracaoSupabase("", "")).toContain("admin/.env.local");
    expect(validarConfiguracaoSupabase(
      "https://projeto-exemplo.supabase.co",
      "sb_publishable_EXEMPLO_NAO_E_CREDENCIAL",
    )).toContain("Substitua os valores de exemplo");
  });

  it("recusa URL inválida ou não segura fora do desenvolvimento local", () => {
    expect(validarConfiguracaoSupabase("não é URL", "sb_publishable_exemplo")).toContain("URL válida");
    expect(validarConfiguracaoSupabase("http://projeto.supabase.co", "sb_publishable_exemplo")).toContain("HTTPS");
    expect(validarConfiguracaoSupabase("https://projeto.supabase.co/rest/v1/", "sb_publishable_exemplo")).toContain("URL raiz");
  });

  it("recusa chaves secretas e aceita apenas chaves públicas suportadas", () => {
    expect(validarConfiguracaoSupabase("https://projeto.supabase.co", "sb_secret_exemplo")).toContain("Chave secreta");
    const payload = btoa(JSON.stringify({ role: "service_role" })).replace(/=/g, "");
    expect(validarConfiguracaoSupabase("https://projeto.supabase.co", `eyJ.${payload}.assinatura`)).toContain("service_role");
    expect(validarConfiguracaoSupabase("https://projeto.supabase.co", "qualquer-outro-valor")).toContain("chave publicável");
    expect(validarConfiguracaoSupabase("https://projeto.supabase.co", "sb_publishable_exemplo")).toBeNull();
  });
});
