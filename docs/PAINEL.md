# Painel de edição (Supabase)

O painel é uma bancada de edição. O app público **não lê o Supabase**: ele continua lendo os JSONs de `src/data/`. O caminho é:

```
Painel (admin/) → Supabase → npm run publicar → JSONs em src/data → commit/push → Vercel
```

Só itens com status **aprovado** vão para o app. Rascunho e arquivado ficam no banco.

## Regra de ouro
Depois da carga inicial, **vacinas e fontes são editadas só pelo painel**. O `npm run publicar` reescreve `calendario.json` (campos `crianca` e `grupos`), `fontes.json` e as seções de `meta.json` a partir do banco; uma edição feita à mão nesses trechos seria perdida. Continuam à mão: `produtos.json`, `intervalos.json`, `materiais.json`, `resgateCrianca` e `resgateGrupos` (dentro de `calendario.json`).

## Configurar uma vez

1. **Projeto Supabase.** Crie um projeto (um só basta, porque o app público não depende dele). Anote a URL e a chave publicável em Project Settings > API.
2. **Cadastro fechado.** Em Authentication > Sign In / Providers, desligue "Allow new users to sign up".
3. **Tabelas.** No SQL Editor, cole e rode o conteúdo de `supabase/migrations/20261113000000_painel_inicial.sql`.
4. **Seu usuário.** Em Authentication > Users > Add user, crie o seu e-mail e senha (marque auto confirm). Depois rode no SQL Editor, trocando o e-mail:
   ```sql
   insert into public.editores (user_id)
   select id from auth.users where email = 'SEU_EMAIL';
   ```
5. **Variáveis.** Copie `admin/.env.example` para `admin/.env.local` e preencha URL, chave publicável, e-mail e senha do editor. O painel lê esse arquivo; `EDITOR_EMAIL` e `EDITOR_PASSWORD` são usados apenas pelos scripts locais.
6. **Compatibilidade dos scripts.** `npm run semear` e `npm run publicar` aceitam as variáveis desse `admin/.env.local`. Também continuam aceitando `.env.local` na raiz com os nomes `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `EDITOR_EMAIL` e `EDITOR_PASSWORD`.
7. **Dependências e comandos novos** (na raiz do projeto):
   ```
   npm install -D @supabase/supabase-js dotenv
   npm pkg set scripts.semear="node scripts/semear.mjs" scripts.publicar="node scripts/publicar.mjs"
   cd admin
   npm install
   ```
8. **Carga inicial** (uma vez, na raiz): `npm run semear`. Copia calendário, faixas e fontes atuais para o banco, com tudo já aprovado.

## Dia a dia

1. `cd admin` e `npm run dev`. Abra o endereço que aparecer (normalmente http://localhost:5173) e entre.
2. Edite em **Vacinas**, **Blocos** e **Fontes**. Item novo nasce como rascunho. Para aprovar é preciso ter fonte.
3. Na raiz do projeto: `npm run publicar`. O script atualiza os JSONs, avisa se algum bloco ficou sem item aprovado e roda os testes.
4. `git diff src/data` para conferir o que mudou, commit e push na `develop`. Confira o preview e faça o Pull Request para a `main`.

## Segurança
- A chave publicável pode ficar no painel porque as permissões são do banco (RLS): só quem está em `public.editores` lê ou escreve.
- O painel valida URL e formato da chave e recusa chaves `sb_secret_` e `service_role`; essa checagem no navegador é uma proteção adicional, não substitui RLS.
- A chave secreta (`service_role`) não é usada em lugar nenhum. Não a coloque nos `.env`.
- `.env`, `.env.local` e arquivos `.env.*.local` são ignorados pelo Git. Use somente exemplos fictícios em arquivos `.env.example`.
- O painel roda só no seu computador por enquanto. Publicá-lo na internet exige um segundo projeto na Vercel apontando para a pasta `admin`.
- Projetos gratuitos do Supabase podem ser pausados por inatividade; dá para reativar pelo painel do Supabase.

## O que ainda não está no painel
`produtos.json`, `intervalos.json`, `materiais.json`, textos de resgate e a leitura de PDF por IA (rascunhos com página e trecho literal). O banco já tem os campos `status`, `pagina` e `trecho` para isso.
