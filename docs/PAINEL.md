# Painel de edição (Supabase)

O painel é uma bancada de edição. O app público **não lê o Supabase**: ele continua lendo os JSONs de `src/data/`. O caminho é:

```
Painel (admin/) → Supabase → npm run publicar → JSONs em src/data → commit/push → Vercel
```

Só itens com status **aprovado** vão para o app. Rascunho e arquivado ficam no banco.

## Acesso em produção

O painel está publicado em [https://balcao-vacinal-d68k.vercel.app/](https://balcao-vacinal-d68k.vercel.app/). A tela de login fica na raiz do endereço; não há uma rota `/admin` ou `/login`.

O painel é uma aplicação Vercel separada do site público e usa o mesmo projeto Supabase. A implantação deve receber `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`; nunca configure uma chave `service_role`/`sb_secret_` ou a senha do editor na Vercel. O acesso aos dados continua protegido pela autenticação, pela tabela `public.editores` e pelas políticas RLS.

## Regra de ouro
Depois da carga inicial, **vacinas, blocos, fontes e o Guia são editados pelo painel**. O `npm run publicar` reescreve `calendario.json` (campos `crianca` e `grupos`), `fontes.json`, `guia_vacinas.json` e as seções de `meta.json` a partir do banco; uma edição feita à mão nesses trechos seria perdida. Os blocos adicionais dos cards também são publicados no quarto campo opcional da tupla do calendário. `produtos.json` continua servindo como conteúdo legado/fallback até que as fichas editoriais aprovadas o substituam; `intervalos.json`, `materiais.json`, `resgateCrianca` e `resgateGrupos` (dentro de `calendario.json`) permanecem mantidos à mão.

## Desenvolvimento e produção com um Supabase

As branches `develop` e `main` usam o **mesmo projeto Supabase** quando o painel ou os scripts são executados com as credenciais locais deste projeto. Não há banco separado por branch. O app público continua independente do Supabase e lê apenas os JSONs de `src/data/`.

Use `admin/.env.local` como configuração local canônica para o painel e os scripts. Esse arquivo é ignorado pelo Git e permanece local ao trocar de branch; não o copie nem versione. Os scripts ainda aceitam `.env.local` na raiz como fallback legado. Se precisar desse fallback, use credenciais do mesmo projeto Supabase — não configure um segundo banco. Os arquivos `.env.example` são apenas modelos fictícios.

Builds e testes (`npm run build`, `npm --prefix admin run build`, `npm test` e `npm --prefix admin test`) não executam seed, publicação nem migrations. A troca de branch também não executa essas operações. Mantenha `npm run semear`, `npm run semear-guia`, `npm run publicar` e a aplicação de migrations como ações sempre explícitas e manuais; não os conecte a hooks, scripts `prebuild`/`postbuild` ou etapas automáticas de CI.

O seed inicial grava no banco compartilhado e só deve ser usado uma vez, após conferir que as tabelas `fontes`, `blocos` e `itens` estão vazias. `npm run semear-guia` é uma importação complementar: exige a migration nova e preserva registros existentes por slug, sem sobrescrever edições. `publicar` lê um snapshot do banco pela RPC `exportar_editorial` e altera os JSONs locais, mas não grava no banco. Antes de escrever, o comando exige que `src/data/` esteja limpo; se a exportação ou os testes falharem, tenta restaurar os arquivos originais sem usar `git restore`. Migrations também afetam o banco compartilhado: revise a ordem e compatibilidade com o código das branches antes de aplicá-las manualmente; não as execute apenas por trocar de branch ou compilar. Preserve RLS e `SECURITY INVOKER`.

## Configurar uma vez

1. **Projeto Supabase.** Crie um projeto (um só basta, porque o app público não depende dele). Anote a URL e a chave publicável em Project Settings > API.
2. **Cadastro fechado.** Em Authentication > Sign In / Providers, desligue "Allow new users to sign up".
3. **Tabelas e carga segura.** Em uma instalação nova, aplique no SQL Editor, uma única vez e nesta ordem, `supabase/migrations/20261113000000_painel_inicial.sql`, `supabase/migrations/20261118134000_semear_atomico.sql` e `supabase/migrations/20261118213413_guia_vacinas_e_reordenacao.sql`. Se as migrations iniciais já foram aplicadas, não as execute novamente: aplique somente a nova migration, que adiciona o espelho dos extras, a tabela do Guia e as RPCs de reordenação/importação idempotente.
4. **Seu usuário.** Em Authentication > Users > Add user, crie o seu e-mail e senha (marque auto confirm). Depois rode no SQL Editor, trocando o e-mail:
   ```sql
   insert into public.editores (user_id)
   select id from auth.users where email = 'SEU_EMAIL';
   ```
5. **Variáveis.** Copie `admin/.env.example` para `admin/.env.local` e preencha URL, chave publicável, e-mail e senha do editor. O painel lê esse arquivo; `EDITOR_EMAIL` e `EDITOR_PASSWORD` são usados apenas pelos scripts locais.
6. **Compatibilidade dos scripts.** `npm run semear` e `npm run publicar` aceitam as variáveis desse `admin/.env.local` (preferencial). Também continuam aceitando `.env.local` na raiz como fallback, com os nomes `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `EDITOR_EMAIL` e `EDITOR_PASSWORD`; use sempre o mesmo projeto Supabase.
7. **Dependências e comandos novos** (na raiz do projeto):
   ```
   npm install -D @supabase/supabase-js dotenv
   npm pkg set scripts.semear="node scripts/semear.mjs" scripts.publicar="node scripts/publicar.mjs"
   cd admin
   npm install
   ```
8. **Carga inicial** (uma vez, na raiz): `npm run semear`. O preflight exige que `fontes`, `blocos` e `itens` estejam vazias, e a RPC grava as três tabelas em uma única transação PostgreSQL. Se qualquer inserção falhar, a transação inteira é revertida. Execute a carga antes de começar a editar pelo painel; não rode o comando novamente depois que houver conteúdo.
9. **Importar o Guia** (opcional, após aplicar a migration nova): `npm run semear-guia`. Os dados legados de `produtos.json` entram como rascunhos sem fonte; revise cada ficha e vincule a fonte antes de aprová-la. Reexecutar o comando não sobrescreve os registros com slug já existente.

Antes do primeiro seed, o smoke test SQL opcional `supabase/tests/seed_editorial.sql` valida permissões, autorização, rollback e inserção numa transação revertida. Rode-o apenas numa instância de desenvolvimento descartável, vazia e com um editor cadastrado; nunca em produção.

## Dia a dia

1. Acesse o painel de produção acima ou, para desenvolvimento local, execute `cd admin` e `npm run dev` (normalmente abre em http://localhost:5173).
2. Edite em **Vacinas**, **Guia**, **Blocos** e **Fontes**. Itens e fichas novas nascem como rascunho; para aprovar é preciso vincular uma fonte.
3. Na raiz de um checkout local na branch `develop`, execute `npm run publicar`. O script atualiza os JSONs, avisa se algum bloco ficou sem item aprovado e roda os testes.
4. Revise `git diff src/data`, envie as alterações pela `develop`, confira o preview e faça o Pull Request para a `main`. O painel não publica os JSONs automaticamente.

## Segurança
- A chave publicável pode ficar no painel porque as permissões são do banco (RLS): só quem está em `public.editores` lê ou escreve.
- O painel valida URL e formato da chave e recusa chaves `sb_secret_` e `service_role`; essa checagem no navegador é uma proteção adicional, não substitui RLS.
- A chave secreta (`service_role`) não é usada em lugar nenhum. Não a coloque nos `.env`.
- `.env`, `.env.local` e arquivos `.env.*.local` são ignorados pelo Git. Use somente exemplos fictícios em arquivos `.env.example`.
- O painel está publicado em https://balcao-vacinal-d68k.vercel.app/ como projeto Vercel separado; isso não exige um segundo projeto Supabase.
- Projetos gratuitos do Supabase podem ser pausados por inatividade; dá para reativar pelo painel do Supabase.

## O que ainda não está no painel
`intervalos.json`, `materiais.json`, textos de resgate e a leitura de PDF por IA (rascunhos com página e trecho literal). Os dados originais de `produtos.json` permanecem no app como fallback para manter o conteúdo existente até a revisão editorial do Guia.
