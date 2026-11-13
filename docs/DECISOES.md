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

## Proposto, a confirmar ao iniciar o painel
- Painel de edição com **Supabase** (login, banco e storage), **sem Fastify e sem Prisma** no começo.
- O app público **não fala com o Supabase**: um botão "Publicar" gera os mesmos JSONs de hoje, roda os testes e dispara o deploy.
- Leitura de PDF por IA como **rascunho com página e trecho literal**, mostrando o que mudou em relação ao calendário atual.

## Em aberto
- Fastify + Prisma: só entram se surgir lógica que o Supabase não resolva sozinho.
- Migração para TypeScript (começar por `lib.js`).
- Correção da atualização automática do PWA (hoje a versão nova só vale na abertura seguinte).
- Pasta `fontes/` fora do Git; avaliar o Supabase Storage para guardar os PDFs.
