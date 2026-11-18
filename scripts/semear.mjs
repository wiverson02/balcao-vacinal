// Carga inicial: copia o que já está em src/data para o banco do painel. Rode uma vez.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { conectar } from "./entrar.js";
import { semearBanco } from "./lib/banco.js";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "data");
try {
  const client = await conectar();
  const r = await semearBanco(client, dir);
  console.log(`Pronto: ${r.fontes} fontes, ${r.blocos} blocos e ${r.itens} itens enviados.`);
} catch (e) {
  console.error(`\nErro: ${e.message}`);
  process.exit(1);
}
