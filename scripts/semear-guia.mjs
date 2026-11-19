import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { conectar } from "./entrar.js";
import { semearGuiaVacinas } from "./lib/banco.js";

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const produtos = JSON.parse(fs.readFileSync(path.join(raiz, "src", "data", "produtos.json"), "utf8"));

try {
  const client = await conectar();
  const resultado = await semearGuiaVacinas(client, produtos);
  console.log(
    `Guia importado como rascunho: ${resultado.inseridos} novos registros; ` +
    `${resultado.existentes} slugs já existentes foram preservados.`,
  );
} catch (erro) {
  console.error(`\nErro ao importar o guia: ${erro.message}`);
  process.exit(1);
}
