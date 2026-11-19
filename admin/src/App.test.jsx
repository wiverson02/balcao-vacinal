import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";

const api = vi.hoisted(() => ({
  configurado: true,
  erroConfiguracao: "Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.",
  sessaoAtual: vi.fn(),
  aoMudarSessao: vi.fn(() => () => {}),
  entrar: vi.fn(),
  sair: vi.fn(),
  ehEditor: vi.fn(),
  listarFontes: vi.fn(),
  listarBlocos: vi.fn(),
  listarItens: vi.fn(),
  listarTodosItens: vi.fn(),
  contarItens: vi.fn(),
  criarItem: vi.fn(),
  atualizarItem: vi.fn(),
  apagarItem: vi.fn(),
  listarGuiaVacinas: vi.fn(),
  criarGuiaVacina: vi.fn(),
  atualizarGuiaVacina: vi.fn(),
  apagarGuiaVacina: vi.fn(),
  gravarOrdens: vi.fn(),
  criarBloco: vi.fn(), atualizarBloco: vi.fn(), apagarBloco: vi.fn(),
  criarFonte: vi.fn(), atualizarFonte: vi.fn(), apagarFonte: vi.fn(),
  listener: null,
}));
vi.mock("./api", () => api);

import App from "./App";

const sessao = { user: { id: "u1", email: "eu@x.com" } };
const blocos = [
  { id: "b1", rede: "privada", tipo: "faixa", rotulo: "Ao nascer", idade_min_meses: 0, ordem: 1, atualizado_em: "2026-11-18T13:40:00Z" },
  { id: "b2", rede: "privada", tipo: "grupo", rotulo: "Adulto", idade_min_meses: null, ordem: 1 },
];
const itens = [
  { id: "i1", bloco_id: "b1", nome: "BCG", protege: "Tuberculose", esquema: "Dose única", fonte_id: "f1", pagina: null, trecho: null, status: "aprovado", ordem: 1 },
  { id: "i2", bloco_id: "b1", nome: "Hepatite B", protege: "Hepatite B", esquema: "1ª dose", fonte_id: null, pagina: null, trecho: null, status: "rascunho", ordem: 2 },
];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.clearAllMocks();
  api.configurado = true;
  api.listener = null;
  api.aoMudarSessao.mockImplementation((fn) => {
    api.listener = fn;
    return () => { api.listener = null; };
  });
  api.sessaoAtual.mockResolvedValue(sessao);
  api.ehEditor.mockResolvedValue(true);
  api.listarFontes.mockResolvedValue([{ id: "f1", ordem: 1, instituicao: "SBIm", titulo: "Criança", url: "https://example.org/fonte", conferido_em: null, atualizado_em: "2026-11-18T13:40:00Z" }]);
  api.listarBlocos.mockResolvedValue(blocos);
  api.listarItens.mockResolvedValue(itens);
  api.listarTodosItens.mockResolvedValue(itens);
  api.contarItens.mockResolvedValue({ b1: { aprovado: 1, rascunho: 1, arquivado: 0 } });
  api.criarFonte.mockResolvedValue(null);
  api.atualizarFonte.mockResolvedValue(null);
  api.apagarFonte.mockResolvedValue(null);
  api.criarBloco.mockResolvedValue(null);
  api.atualizarBloco.mockResolvedValue(null);
  api.apagarBloco.mockResolvedValue(null);
  api.criarItem.mockResolvedValue(null);
  api.atualizarItem.mockResolvedValue(null);
  api.apagarItem.mockResolvedValue(null);
  api.listarGuiaVacinas.mockResolvedValue([]);
  api.criarGuiaVacina.mockResolvedValue(null);
  api.atualizarGuiaVacina.mockResolvedValue(null);
  api.apagarGuiaVacina.mockResolvedValue(null);
  api.gravarOrdens.mockResolvedValue([]);
});

describe("entrada", () => {
  it("mostra a configuração ausente sem iniciar a autenticação", () => {
    api.configurado = false;
    render(<App />);
    expect(screen.getByText(/VITE_SUPABASE_URL/)).toBeTruthy();
    expect(api.sessaoAtual).not.toHaveBeenCalled();
  });

  it("sem sessão mostra o login e entra com o e-mail sem espaços", async () => {
    api.sessaoAtual.mockResolvedValue(null);
    api.entrar.mockResolvedValue();
    render(<App />);
    fireEvent.change(await screen.findByLabelText("E-mail"), { target: { value: " eu@x.com " } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "segredo" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() => expect(api.entrar).toHaveBeenCalledWith("eu@x.com", "segredo"));
  });

  it("senha errada mostra o erro", async () => {
    api.sessaoAtual.mockResolvedValue(null);
    api.entrar.mockRejectedValue(new Error("E-mail ou senha incorretos."));
    render(<App />);
    fireEvent.change(await screen.findByLabelText("E-mail"), { target: { value: "a@b.c" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect((await screen.findByRole("alert")).textContent).toContain("incorretos");
  });

  it("conta que não é editora vê 'Sem permissão' e nenhuma tela de edição", async () => {
    api.ehEditor.mockResolvedValue(false);
    render(<App />);
    expect(await screen.findByText("Sem permissão")).toBeTruthy();
    expect(api.listarItens).not.toHaveBeenCalled();
  });

  it("mostra erro se não consegue recuperar a sessão", async () => {
    api.sessaoAtual.mockRejectedValue(new Error("Falha ao recuperar sessão."));
    render(<App />);
    expect(await screen.findByText("Falha ao recuperar sessão.")).toBeTruthy();
  });

  it("volta ao login quando a sessão expira", async () => {
    render(<App />);
    await screen.findByText("BCG");
    api.listener(null, "SIGNED_OUT");
    expect(await screen.findByLabelText("E-mail")).toBeTruthy();
  });

  it("ignora uma verificação de editor que termina depois do logout", async () => {
    let resolver;
    api.ehEditor.mockImplementation(() => new Promise((resolve) => { resolver = resolve; }));
    render(<App />);
    await waitFor(() => expect(api.ehEditor).toHaveBeenCalled());
    api.listener(null, "SIGNED_OUT");
    expect(await screen.findByLabelText("E-mail")).toBeTruthy();
    resolver(true);
    await waitFor(() => expect(screen.getByLabelText("E-mail")).toBeTruthy());
  });

  it("informa falha ao sair em vez de rejeitar uma promise sem tratamento", async () => {
    api.sair.mockRejectedValue(new Error("Falha ao sair."));
    render(<App />);
    await screen.findByText("BCG");
    fireEvent.click(screen.getByRole("button", { name: "Sair" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Falha ao sair.");
  });
});

describe("tela de vacinas", () => {
  it("mostra o primeiro bloco com os itens, status e fonte", async () => {
    render(<App />);
    expect(await screen.findByText("BCG")).toBeTruthy();
    expect(screen.getByText("Hepatite B", { selector: "b" })).toBeTruthy();
    expect(screen.getByText("sem fonte")).toBeTruthy();
    expect(screen.getByText("aprovado", { selector: ".chip" })).toBeTruthy();
    expect(screen.getByText("rascunho", { selector: ".chip" })).toBeTruthy();
  });

  it("editar e aprovar manda os campos sem espaços e vazio vira nulo após confirmação", async () => {
    render(<App />);
    await screen.findByText("BCG");
    fireEvent.click(screen.getAllByRole("button", { name: "Editar" })[0]);
    fireEvent.change(screen.getByLabelText("Esquema"), { target: { value: "  Dose única, ao nascer  " } });
    fireEvent.change(screen.getByLabelText("Página"), { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: "Revisar e aprovar" }));
    expect(api.atualizarItem).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar aprovação" }));
    await waitFor(() => expect(api.atualizarItem).toHaveBeenCalledWith("i1", {
      nome: "BCG", protege: "Tuberculose", esquema: "Dose única, ao nascer",
      fonte_id: "f1", pagina: null, trecho: null, status: "aprovado", extras: [],
    }));
  });

  it("salva os blocos extras do item como lista estruturada", async () => {
    render(<App />);
    await screen.findByText("BCG");
    fireEvent.click(screen.getAllByRole("button", { name: "Editar" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "+ Adicionar bloco" }));
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "  Atenção  " } });
    fireEvent.change(screen.getByLabelText("Conteúdo"), { target: { value: "  Orientação  " } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar rascunho" }));
    await waitFor(() => expect(api.atualizarItem).toHaveBeenCalledWith("i1", expect.objectContaining({
      extras: [{ tipo: "nota", titulo: "Atenção", conteudo: "Orientação" }],
    })));
  });

  it("erro do banco aparece no formulário e o formulário continua aberto", async () => {
    api.atualizarItem.mockRejectedValue(new Error("Para aprovar um item é preciso escolher a fonte."));
    render(<App />);
    await screen.findByText("BCG");
    fireEvent.click(screen.getAllByRole("button", { name: "Editar" })[1]);
    fireEvent.click(screen.getByRole("button", { name: "Salvar rascunho" }));
    expect((await screen.findByRole("alert")).textContent).toContain("escolher a fonte");
    expect(screen.getByLabelText("Nome da vacina")).toBeTruthy();
  });

  it("aprova uma vacina rascunho somente após revisar e confirmar", async () => {
    render(<App />);
    await screen.findByText("BCG");
    fireEvent.click(screen.getAllByRole("button", { name: "Editar" })[1]);
    fireEvent.change(screen.getByLabelText("Fonte"), { target: { value: "f1" } });
    fireEvent.click(screen.getByRole("button", { name: "Revisar e aprovar" }));
    expect(screen.getByRole("region", { name: "Resumo da ação" })).toBeTruthy();
    expect(api.atualizarItem).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar aprovação" }));
    await waitFor(() => expect(api.atualizarItem).toHaveBeenCalledWith("i2", expect.objectContaining({
      fonte_id: "f1",
      status: "aprovado",
    })));
  });

  it("arquiva uma vacina sem excluí-la", async () => {
    render(<App />);
    await screen.findByText("BCG");
    fireEvent.click(screen.getAllByRole("button", { name: "Editar" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Arquivar item" }));
    expect(api.atualizarItem).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar arquivamento" }));
    await waitFor(() => expect(api.atualizarItem).toHaveBeenCalledWith("i1", expect.objectContaining({
      status: "arquivado",
    })));
  });

  it("não envia para o banco a aprovação de um item sem fonte", async () => {
    render(<App />);
    await screen.findByText("BCG");
    fireEvent.click(screen.getAllByRole("button", { name: "Editar" })[1]);
    fireEvent.click(screen.getByRole("button", { name: "Revisar e aprovar" }));
    expect((await screen.findByRole("alert")).textContent).toContain("escolha uma fonte");
    expect(api.atualizarItem).not.toHaveBeenCalled();
  });

  it("mostra a fonte conferível e atualiza o preview enquanto edita", async () => {
    render(<App />);
    await screen.findByText("BCG");
    fireEvent.click(screen.getAllByRole("button", { name: "Editar" })[0]);

    const conferencia = screen.getByLabelText("Card de Conferência da Fonte");
    expect(within(conferencia).getByText("SBIm")).toBeTruthy();
    expect(within(conferencia).getByText("Criança")).toBeTruthy();
    expect(within(conferencia).getByRole("link", { name: /Abrir documento oficial/ }).getAttribute("href")).toBe("https://example.org/fonte");
    expect(within(conferencia).getByText("Ainda não conferida")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Página"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText(/Trecho literal/), { target: { value: "Esquema recomendado" } });
    expect(within(conferencia).getByText("p. 4 · Esquema recomendado")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Nome da vacina"), { target: { value: "BCG atualizada" } });
    const preview = screen.getByLabelText("Preview ao vivo");
    expect(within(preview).getByText("BCG atualizada")).toBeTruthy();
    fireEvent.click(within(preview).getByRole("button", { name: "Tema Claro" }));
    expect(preview.className).toContain("tema-claro");
    fireEvent.click(within(preview).getByRole("button", { name: "Tema Escuro" }));
    expect(preview.className).toContain("tema-escuro");
  });

  it("descer o primeiro item grava só a nova ordem dos dois", async () => {
    render(<App />);
    await screen.findByText("BCG");
    fireEvent.click(screen.getByRole("button", { name: "Descer BCG" }));
    await waitFor(() => expect(api.gravarOrdens).toHaveBeenCalledWith("itens", [["i2", 1], ["i1", 2]], "b1"));
  });

  it("nova vacina entra como rascunho no fim do bloco", async () => {
    render(<App />);
    await screen.findByText("BCG");
    fireEvent.click(screen.getByRole("button", { name: "+ Nova vacina neste bloco" }));
    fireEvent.change(screen.getByLabelText("Nome da vacina"), { target: { value: "Nova" } });
    fireEvent.change(screen.getByLabelText("Protege contra"), { target: { value: "X" } });
    fireEvent.change(screen.getByLabelText("Esquema"), { target: { value: "Y" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar rascunho" }));
    await waitFor(() => expect(api.criarItem).toHaveBeenCalledWith(expect.objectContaining({ nome: "Nova", status: "rascunho", bloco_id: "b1", ordem: 3 })));
  });

  it("exclui uma vacina apenas após confirmação", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<App />);
    await screen.findByText("BCG");
    fireEvent.click(screen.getAllByRole("button", { name: "Editar" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    await waitFor(() => expect(api.apagarItem).toHaveBeenCalledWith("i1"));
  });

  it("trocar para o grupo Adulto carrega os itens do outro bloco", async () => {
    render(<App />);
    await screen.findByText("BCG");
    fireEvent.click(screen.getByRole("button", { name: /Grupo: Adulto/ }));
    await waitFor(() => expect(api.listarItens).toHaveBeenLastCalledWith("b2"));
  });
});

describe("tela de fontes", () => {
  async function abrirFontes() {
    render(<App />);
    fireEvent.click(await screen.findByRole("tab", { name: "Fontes" }));
    expect(await screen.findByText("Criança")).toBeTruthy();
  }

  it("cadastra uma fonte", async () => {
    await abrirFontes();
    fireEvent.click(screen.getByRole("button", { name: "+ Nova fonte" }));
    fireEvent.change(screen.getByLabelText("Instituição"), { target: { value: "Instituição teste" } });
    fireEvent.change(screen.getByLabelText("Título do documento"), { target: { value: "Documento teste" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(api.criarFonte).toHaveBeenCalledWith(expect.objectContaining({
      id: "instituicao-teste-documento-teste",
      instituicao: "Instituição teste",
      titulo: "Documento teste",
      ordem: 2,
    })));
  });

  it("edita uma fonte existente", async () => {
    await abrirFontes();
    const linha = screen.getByText("Criança").closest("li");
    expect(within(linha).getByText(/Atualizado em/)).toBeTruthy();
    fireEvent.click(within(linha).getByRole("button", { name: "Editar" }));
    fireEvent.change(screen.getByLabelText("Título do documento"), { target: { value: "Título atualizado" } });
    fireEvent.click(within(linha).getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(api.atualizarFonte).toHaveBeenCalledWith("f1", expect.objectContaining({
      titulo: "Título atualizado",
    })));
  });

  it("exclui uma fonte após confirmação", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await abrirFontes();
    const linha = screen.getByText("Criança").closest("li");
    fireEvent.click(within(linha).getByRole("button", { name: "Excluir" }));
    await waitFor(() => expect(api.apagarFonte).toHaveBeenCalledWith("f1"));
  });
});

describe("tela de blocos", () => {
  async function abrirBlocos() {
    render(<App />);
    fireEvent.click(await screen.findByRole("tab", { name: "Estrutura" }));
    expect(await screen.findByText("Ao nascer")).toBeTruthy();
  }

  it("cadastra um bloco com tipo e idade", async () => {
    await abrirBlocos();
    fireEvent.click(screen.getAllByRole("button", { name: "+ Novo bloco" })[0]);
    fireEvent.change(screen.getByLabelText("Nome do bloco"), { target: { value: "12 meses" } });
    fireEvent.change(screen.getByLabelText("Idade mínima (meses)"), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(api.criarBloco).toHaveBeenCalledWith(expect.objectContaining({
      rede: "privada",
      tipo: "faixa",
      rotulo: "12 meses",
      idade_min_meses: 12,
      ordem: 2,
    })));
  });

  it("edita um bloco existente", async () => {
    await abrirBlocos();
    const linha = screen.getByText("Ao nascer").closest("li");
    expect(within(linha).getByText(/Atualizado em/)).toBeTruthy();
    fireEvent.click(within(linha).getByRole("button", { name: "Editar" }));
    fireEvent.change(screen.getByLabelText("Nome do bloco"), { target: { value: "Nascimento" } });
    fireEvent.click(within(linha).getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(api.atualizarBloco).toHaveBeenCalledWith("b1", expect.objectContaining({
      rotulo: "Nascimento",
      idade_min_meses: 0,
    })));
  });

  it("exclui um bloco após confirmação", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await abrirBlocos();
    const linha = screen.getByText("Ao nascer").closest("li");
    fireEvent.click(within(linha).getByRole("button", { name: "Excluir" }));
    await waitFor(() => expect(api.apagarBloco).toHaveBeenCalledWith("b1"));
  });
});

describe("tela do guia de vacinas", () => {
  async function abrirGuia() {
    render(<App />);
    fireEvent.click(await screen.findByRole("tab", { name: "Guia clínico" }));
    expect(await screen.findByRole("heading", { name: "Guia clínico-comercial" })).toBeTruthy();
  }

  it("mostra a data de atualização das fichas do Guia", async () => {
    api.listarGuiaVacinas.mockResolvedValue([{
      id: "g1",
      slug: "vacina-guia",
      nome: "Vacina Guia",
      status: "rascunho",
      rede: "privada",
      fonte_id: null,
      atualizado_em: "2026-11-18T13:40:00Z",
    }]);
    await abrirGuia();
    const linha = screen.getByText("Vacina Guia").closest("li");
    expect(within(linha).getByText(/Atualizado em/)).toBeTruthy();
  });

  it("cria um registro de guia como rascunho e transforma listas em arrays", async () => {
    await abrirGuia();
    fireEvent.click(screen.getByRole("button", { name: "+ Nova vacina no guia" }));
    fireEvent.change(screen.getByLabelText("Nome da vacina"), { target: { value: "Vacina teste" } });
    fireEvent.change(screen.getByLabelText(/Indicações/), { target: { value: "Indicação A\nIndicação B" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar rascunho" }));
    await waitFor(() => expect(api.criarGuiaVacina).toHaveBeenCalledWith(expect.objectContaining({
      slug: "vacina-teste",
      nome: "Vacina teste",
      status: "rascunho",
      fonte_id: null,
      indicacoes: ["Indicação A", "Indicação B"],
      extras: [],
    })));
  });

  it("não aprova um registro de guia sem fonte", async () => {
    await abrirGuia();
    fireEvent.click(screen.getByRole("button", { name: "+ Nova vacina no guia" }));
    fireEvent.change(screen.getByLabelText("Nome da vacina"), { target: { value: "Vacina teste" } });
    fireEvent.click(screen.getByRole("button", { name: "Revisar e aprovar" }));
    expect((await screen.findByRole("alert")).textContent).toContain("escolha uma fonte");
    expect(api.criarGuiaVacina).not.toHaveBeenCalled();
  });

  it("exibe resumo e só aprova a ficha do Guia após confirmação", async () => {
    await abrirGuia();
    fireEvent.click(screen.getByRole("button", { name: "+ Nova vacina no guia" }));
    fireEvent.change(screen.getByLabelText("Nome da vacina"), { target: { value: "Vacina teste" } });
    fireEvent.change(screen.getByLabelText("Fonte"), { target: { value: "f1" } });
    const conferencia = screen.getByLabelText("Card de Conferência da Fonte");
    expect(within(conferencia).getByText("SBIm")).toBeTruthy();
    expect(within(conferencia).getByText("Não suportado no cadastro do Guia.")).toBeTruthy();
    const preview = screen.getByLabelText("Preview ao vivo");
    expect(within(preview).getByText("Vacina teste", { selector: "b" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Revisar e aprovar" }));
    expect(screen.getByRole("region", { name: "Resumo da aprovação" })).toBeTruthy();
    expect(api.criarGuiaVacina).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar aprovação" }));
    await waitFor(() => expect(api.criarGuiaVacina).toHaveBeenCalledWith(expect.objectContaining({
      slug: "vacina-teste",
      status: "aprovado",
      fonte_id: "f1",
    })));
  });
});

describe("prontidão, busca e filtros globais", () => {
  it("mostra as contagens do semáforo e filtra os blocos sem item aprovado", async () => {
    render(<App />);
    fireEvent.click(await screen.findByText("Prontidão para publicar"));
    expect(screen.getByRole("button", { name: "1 bloco sem itens aprovados (bloqueante)" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "1 aprovado sem fonte conferida" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "1 rascunho pendente" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "1 bloco sem itens aprovados (bloqueante)" }));

    const resultados = screen.getByRole("region", { name: "Resultados globais" });
    expect(within(resultados).getByText("Adulto")).toBeTruthy();
    expect(within(resultados).queryByText("Ao nascer")).toBeNull();
  });

  it("filtra rascunhos, aprovados e itens aprovados sem fonte conferida", async () => {
    render(<App />);
    const resultados = async () => screen.findByRole("region", { name: "Resultados globais" });

    fireEvent.click(await screen.findByText("Filtros rápidos"));
    fireEvent.click(screen.getByRole("button", { name: "Rascunhos" }));
    let area = await resultados();
    expect(within(area).getByText("Hepatite B")).toBeTruthy();
    expect(within(area).queryByText("BCG")).toBeNull();

    fireEvent.click(screen.getByText("Filtro: Rascunhos"));
    fireEvent.click(screen.getByRole("button", { name: "Aprovados" }));
    area = await resultados();
    expect(within(area).getByText("BCG")).toBeTruthy();
    expect(within(area).queryByText("Hepatite B")).toBeNull();

    fireEvent.click(screen.getByText("Filtro: Aprovados"));
    fireEvent.click(screen.getByRole("button", { name: "Sem fonte conferida" }));
    area = await resultados();
    expect(within(area).getByText("BCG")).toBeTruthy();
    expect(within(area).queryByText("Hepatite B")).toBeNull();
  });

  it("busca globalmente blocos e fontes e foca o campo com Ctrl+K", async () => {
    api.listarFontes.mockResolvedValue([
      { id: "f1", ordem: 1, instituicao: "SBIm", titulo: "Documento localizável", conferido_em: null },
    ]);
    render(<App />);
    const busca = await screen.findByRole("searchbox", { name: "Buscar em tudo" });
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(document.activeElement).toBe(busca);
    fireEvent.change(busca, { target: { value: "localizável" } });

    const resultados = await screen.findByRole("region", { name: "Resultados globais" });
    expect(within(resultados).getByText("Documento localizável")).toBeTruthy();
  });

  it("busca uma ficha do Guia e abre sua edição ao selecionar o resultado", async () => {
    api.listarGuiaVacinas.mockResolvedValue([{
      id: "g1",
      slug: "vacina-pesquisa",
      nome: "Vacina Pesquisa",
      status: "rascunho",
      fonte_id: null,
      rede: "privada",
      indicacoes: ["termo de busca"],
      extras: [],
    }]);
    render(<App />);
    const busca = await screen.findByRole("searchbox", { name: "Buscar em tudo" });
    fireEvent.change(busca, { target: { value: "termo de busca" } });
    const resultados = await screen.findByRole("region", { name: "Resultados globais" });
    fireEvent.click(within(resultados).getByRole("button", { name: /Vacina Pesquisa/ }));

    const guiaTab = await screen.findByRole("tab", { name: "Guia clínico" });
    expect(guiaTab.getAttribute("aria-selected")).toBe("true");
    expect(await screen.findByLabelText("Slug")).toBeTruthy();
  });

  it("marca a aba ativa como selecionada para tecnologia assistiva", async () => {
    render(<App />);
    const tablist = await screen.findByRole("tablist", { name: "Seções do painel" });
    expect(within(tablist).getByRole("tab", { name: "Calendário" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(within(tablist).getByRole("tab", { name: "Guia clínico" }));
    expect(within(tablist).getByRole("tab", { name: "Guia clínico" }).getAttribute("aria-selected")).toBe("true");
  });
});
