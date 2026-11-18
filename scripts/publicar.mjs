// Publicar: lê o banco do painel e atualiza os JSONs de src/data (só itens aprovados). Depois roda os testes.
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { conectar } from "./entrar.js";
import { publicarDoBanco } from "./lib/banco.js";

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
try {
  const client = await conectar();
  const r = await publicarDoBanco(client, path.join(raiz, "src", "data"));
  if (!r.ok) {
    console.error("\nNão publiquei. Corrija no painel:\n- " + r.problemas.join("\n- "));
    process.exit(1);
  }
  const alterados = Object.entries(r.mudou).filter(([, v]) => v).map(([k]) => `${k}.json`);
  console.log(`Banco: ${r.totais.aprovados} itens aprovados, ${r.totais.rascunhos} rascunhos (rascunhos não são publicados).`);
  if (!alterados.length) {
    console.log("Nada mudou: os arquivos de src/data já estão iguais ao banco.");
    process.exit(0);
  }
  console.log(`Arquivos atualizados: ${alterados.join(", ")}\nRodando os testes...\n`);
  try {
    execSync("npm test", { cwd: raiz, stdio: "inherit" });
  } catch {
    console.error("\nOs testes falharam. Para desfazer: git restore src/data");
    process.exit(1);
  }
  console.log("\nTestes OK. Agora: git diff src/data, commit e push na develop.");
} catch (e) {
  console.error(`\nErro: ${e.message}`);
  process.exit(1);
}
