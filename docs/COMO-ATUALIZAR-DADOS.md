# Como atualizar os dados do Balcão Vacinal

Todos os dados ficam em `src/data/`. Não é preciso mexer em código para atualizá-los.

## Antes de começar
1. Trabalhe na branch `develop`, nunca direto na `main`.
2. Guarde os PDFs oficiais na pasta `fontes/` do seu computador. Ela não vai para o Git.

## O que editar em cada caso

| O que mudou | Arquivo | Formato |
|---|---|---|
| Vacina, esquema ou faixa de idade | `calendario.json` | faixa da criança: `["2 meses", [vacinas...], 2]` (rótulo, vacinas, idade mínima em meses). Vacina: `["Nome", "Protege contra", "Esquema"]` |
| Nome comercial ou disponibilidade na rede | `produtos.json` | a chave é o nome da vacina exatamente como está no calendário |
| Intervalo mínimo entre doses | `intervalos.json` | `["Nome", dias, "texto"]` |
| Links dos PDFs oficiais | `materiais.json` | `["url", "título", "descrição"]` |
| Um documento novo ou nova versão | `fontes.json` | ver abaixo |

## Registrar a fonte (sempre que mexer em conteúdo)
1. Se o documento é novo, acrescente uma entrada em `fontes.json` com `id`, `instituicao`, `titulo` e, se tiver, `arquivo` (nome exato do PDF em `fontes/`) e `url`.
2. Em `meta.json`, na seção correspondente, coloque o `id` da fonte (por exemplo `"privada.grupos.Adulto": ["sbim-adulto-2026-27"]`).
3. Depois de conferir o conteúdo contra o PDF, preencha `conferidoEm` da fonte com a data (`AAAA-MM-DD`).
4. Atualize `atualizadoEm` em `meta.json` para a data da alteração. É essa data que aparece no rodapé do app.

## Conferir e publicar
1. `npm test` precisa passar. Os testes de `src/dados.test.js` apontam a vacina ou a faixa com problema.
2. `git add` apenas dos arquivos alterados, commit e `git push` na `develop`.
3. Abra o preview da Vercel e confira no celular: Início, Calendário, Caderneta e o rodapé.
4. Pull Request de `develop` para `main`. A Vercel publica sozinha.

## Atualização anual da SBIm
1. Baixe os PDFs novos em https://sbim.org.br/calendarios-de-vacinacao e coloque em `fontes/`.
2. Atualize `fontes.json` (arquivos e títulos) e os links em `materiais.json`.
3. Compare cada PDF com a seção correspondente do `calendario.json`, uma de cada vez (criança, adolescente, adulto, idoso, gestante), e preencha `conferidoEm`.
4. Revise os textos que citam o ano (rodapé em `App.jsx` e aviso em `Materiais.jsx`).
5. Siga o "Conferir e publicar".

## Pendências conhecidas
- `intervalos.json` e `produtos.json` (fichas `FI`) ainda não têm fonte declarada em `meta.json`.
- As bulas (`bula_*.pdf`), as cartilhas, o ebook de administração e o treinamento em imunização, que estão em `fontes/`, ainda não foram identificados nem registrados em `fontes.json`.
- O resumo do SUS cita a nota técnica do Espírito Santo, que não está registrada em `fontes.json`.
- Nenhum item ainda aponta para página do PDF; hoje a fonte é por seção.
