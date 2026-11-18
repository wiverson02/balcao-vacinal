// Traduz as mensagens do banco para algo que dê para entender na tela.
const REGRAS = [
  [/row-level security|permission denied/i, "Sem permissão: sua conta não está na lista de editores."],
  [/itens_check/, "Para aprovar um item é preciso escolher a fonte."],
  [/itens_bloco_id_fkey/, "Este bloco ainda tem itens. Mova ou apague os itens primeiro."],
  [/itens_fonte_id_fkey/, "Esta fonte ainda é usada por itens."],
  [/blocos_rede_tipo_rotulo_key/, "Já existe um bloco com esse nome nessa rede."],
  [/blocos_check/, "Faixa precisa de idade mínima em meses; grupo não leva idade."],
  [/fontes_pkey/, "Já existe uma fonte com esse id."],
  [/fontes_id_check/, "O id da fonte só aceita letras minúsculas, números e hífen."],
  [/fontes_url_check/, "O link precisa começar com https://"],
  [/fontes_arquivo_check/, "O nome do arquivo precisa terminar em .pdf"],
  [/_check/, "Algum campo está vazio ou inválido."],
];

export function traduzirErro(mensagem = "") {
  for (const [regra, texto] of REGRAS) if (regra.test(mensagem)) return texto;
  return mensagem || "Erro desconhecido.";
}
