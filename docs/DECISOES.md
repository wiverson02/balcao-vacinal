# Decisões do projeto

Registro curto do que foi decidido e do que está em aberto. Atualize quando mudar de ideia.

## Decidido
- **Reaproveitar o front atual** (React + Vite), sem reescrever as telas.
- **Continuar como PWA estático** no curto prazo: abre offline na farmácia, sem custo de servidor e sem dado de paciente.
- **Não guardar dados de paciente.** A caderneta é um simulador que roda só no navegador.
- **Dois ambientes via Git:** `develop` (preview da Vercel) e `main` (produção). Nada vai para a `main` sem passar pelos testes e pelo preview.
- **Segredos fora do Git.** Nenhuma chave de banco ou de IA no front.
- **Dados com fonte:** cada seção do calendário aponta para um documento de `fontes.json`, e a data dos dados aparece no rodapé.
- **Testes protegem os dados:** `src/dados.test.js` valida os JSONs antes de qualquer publicação.
- **A IA nunca publica sozinha:** tudo que ela extrair de um PDF é rascunho até revisão humana.

## Painel de edição (decidido em 13/11/2026)
- Painel com login via **Supabase**, **sem Fastify e sem Prisma** por enquanto.
- O app público **não fala com o Supabase**. `npm run publicar` gera os JSONs de hoje a partir dos itens aprovados e roda os testes antes de qualquer deploy.
- Um único projeto Supabase basta enquanto o app não ler do banco.
- Item aprovado exige fonte (regra no banco). Rascunho e arquivado não vão para o app.
- Acesso só para quem está em `public.editores`; cadastro aberto desligado. Detalhes em `docs/PAINEL.md`.

## Proposto, a confirmar
- Leitura de PDF por IA como **rascunho com página e trecho literal**, mostrando o que mudou em relação ao calendário atual.

## Em aberto
- Fastify + Prisma: só entram se surgir lógica que o Supabase não resolva sozinho.
- Painel para `produtos.json`, `intervalos.json`, `materiais.json` e textos de resgate.
- Migração para TypeScript (começar por `lib.js`).
- Correção da atualização automática do PWA (hoje a versão nova só vale na abertura seguinte).
- Pasta `fontes/` fora do Git; avaliar o Supabase Storage para guardar os PDFs.
