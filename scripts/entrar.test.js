import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createClient = vi.hoisted(() => vi.fn());
vi.mock("@supabase/supabase-js", () => ({ createClient }));

import { conectar } from "./entrar.js";

const cliente = {
  auth: {
    signInWithPassword: vi.fn(),
  },
};

const tokenServiceRole = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(
  JSON.stringify({ role: "service_role" }),
).toString("base64url")}.assinatura`;

beforeEach(() => {
  vi.stubEnv("VITE_SUPABASE_URL", "https://bv-teste.supabase.co");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_teste");
  vi.stubEnv("EDITOR_EMAIL", "editor@example.test");
  vi.stubEnv("EDITOR_PASSWORD", "senha-de-teste");
  createClient.mockReset().mockReturnValue(cliente);
  cliente.auth.signInWithPassword.mockReset().mockResolvedValue({ error: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("conectar", () => {
  it.each([
    ["chave secreta", "sb_secret_teste"],
    ["JWT service_role", tokenServiceRole],
  ])("recusa %s antes de criar o cliente Supabase", async (_descricao, chave) => {
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", chave);

    await expect(conectar()).rejects.toThrow(/não pode ser usada no painel|service_role/i);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("aceita chave publicável e autentica com o usuário editor", async () => {
    await expect(conectar()).resolves.toBe(cliente);
    expect(createClient).toHaveBeenCalledWith(
      "https://bv-teste.supabase.co",
      "sb_publishable_teste",
      { auth: { persistSession: false } },
    );
    expect(cliente.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "editor@example.test",
      password: "senha-de-teste",
    });
  });
});
