// Publicar: lê o banco do painel e atualiza os JSONs de src/data (só itens aprovados). Depois roda os testes.
import fs from "node:fs";
import path from "node:path";
import { execFileSync, execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { conectar } from "./entrar.js";
import { publicarDoBanco, substituirArquivosAtomico } from "./lib/banco.js";

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(raiz, "src", "data");
const nomesArquivos = ["calendario.json", "fontes.json", "guia_vacinas.json", "meta.json"];

function exigirDadosPublicosLimpos() {
  const estado = execFileSync("git", ["status", "--porcelain", "--", "src/data"], {
    cwd: raiz,
    encoding: "utf8",
  });
  if (estado.trim()) {
    throw new Error("Há alterações locais em src/data. Preserve ou conclua essas alterações antes de publicar.");
  }
}

function capturarDadosPublicos() {
  return nomesArquivos.map((nome) => ({
    caminho: path.join(dir, nome),
    conteudo: fs.readFileSync(path.join(dir, nome)),
  }));
}

async function main() {
  let arquivosOriginais = null;
  let podeRestaurar = false;
  try {
    exigirDadosPublicosLimpos();
    const client = await conectar();
    arquivosOriginais = capturarDadosPublicos();
    const antesDeEscrever = () => {
      exigirDadosPublicosLimpos();
      podeRestaurar = true;
    };
    const r = await publicarDoBanco(client, dir, undefined, antesDeEscrever);
    if (!r.ok) {
      console.error(
        "\nPublicação bloqueada; os JSONs públicos não foram alterados. Corrija no painel:\n- " +
        r.problemas.join("\n- "),
      );
      process.exitCode = 1;
      return;
    }

    const alterados = Object.entries(r.mudou).filter(([, mudou]) => mudou).map(([nome]) => `${nome}.json`);
    console.log(`Banco: ${r.totais.aprovados} itens aprovados, ${r.totais.rascunhos} rascunhos (rascunhos não são publicados).`);
    if (!alterados.length) {
      console.log("Nada mudou: os arquivos de src/data já estão iguais ao banco.");
      return;
    }

    console.log(`Arquivos atualizados: ${alterados.join(", ")}\nRodando os testes...\n`);
    execSync("npm test", { cwd: raiz, stdio: "inherit" });
    podeRestaurar = false;
    console.log("\nTestes OK. Agora revise git diff src/data antes de commitar e enviar para a develop.");
  } catch (erro) {
    let mensagem = erro.message;
    if (podeRestaurar && arquivosOriginais) {
      try {
        substituirArquivosAtomico(arquivosOriginais);
        mensagem += "\nOs JSONs públicos originais foram restaurados.";
      } catch (erroRestauracao) {
        mensagem += `\nFalha ao restaurar os JSONs originais: ${erroRestauracao.message}`;
      }
    }
    console.error(`\nErro: ${mensagem}`);
    process.exitCode = 1;
  }
}

await main();
