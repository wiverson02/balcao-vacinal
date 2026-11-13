# Balcão Vacinal

Consulta rápida de vacinas para o farmacêutico vacinador: o paciente informa a idade (ou a data de nascimento) e o app mostra as vacinas da faixa, na rede privada (SBIm 2026/27) e no SUS (PNI), com os nomes comerciais disponíveis na rede Pague Menos.

## Rodar no computador
Precisa do Node.js 18+ (https://nodejs.org).

    npm install
    npm run dev      # abre em http://localhost:5173
    npm test         # testes automatizados
    npm run build    # gera a pasta dist/ (site pronto para publicar)

## Instalar como app (PWA) e uso offline
- Depois de publicado em HTTPS (Vercel já serve), abra o site no celular: no Android/Chrome use "Instalar app"; no iPhone/Safari use Compartilhar > "Adicionar à Tela de Início".
- O app inteiro (telas e dados) fica guardado no aparelho depois do primeiro acesso com internet e abre sem conexão.
- Atualização automática: ao abrir com internet, baixa a versão nova e passa a usá-la na abertura seguinte. Quem não abrir com internet continua na versão antiga, então confira a data dos dados no rodapé.
- Ícones em `public/icons/`; nome, cores e opções do app em `vite.config.js`.
- A fonte Outfit vem do Google Fonts e fica em cache depois do primeiro acesso; sem ela o app usa a fonte do sistema.

## Estrutura
    src/data/calendario.json   calendários: privada (criança por faixa + grupos), sus, regras de atraso
    src/data/produtos.json     nomes comerciais da rede (CN), fichas (FI) e vacinas fora do calendário (EX)
    src/data/intervalos.json   intervalos de referência da calculadora
    src/data/materiais.json    links dos PDFs oficiais
    src/data/fontes.json       registro dos documentos-fonte (SBIm, PNI, Anvisa, tabela da rede)
    src/data/meta.json         data dos dados (rodapé) e fonte de cada seção
    docs/                      como atualizar os dados e registro de decisões
    src/lib.js                 idade em meses, faixas e grupos
    src/components/Card.jsx    cartão de vacina (com etiqueta da rede)
    src/views/                 uma tela por arquivo (Inicio, Calendario, Guia, Intervalos, Caderneta, Materiais)
    src/App.jsx                navegação por abas (#inicio, #privada, #sus, ...)
    src/styles.css             identidade visual
    src/App.test.jsx           testes das telas
    src/lib.test.js            testes de idade, faixas e grupos (lib.js)
    src/dados.test.js          validação dos JSONs de src/data (rode ao editar qualquer dado)

## Como atualizar os dados (sem mexer em código)
Passo a passo completo em `docs/COMO-ATUALIZAR-DADOS.md`. Resumo:
- Novo calendário da SBIm: edite `src/data/calendario.json` e o texto do rodapé em `src/App.jsx`.
- Tabela da Pague Menos: edite `src/data/produtos.json` (chave = nome da vacina no calendário).
- Cada vacina é uma lista `[nome, protege contra, esquema]`. Esquemas "Só no SUS: ..." aparecem na caderneta como encaminhamento à UBS.

## Publicar (grátis)
- **Vercel**: suba o projeto no GitHub, em vercel.com clique em "Add New Project", escolha o repositório (Vite é detectado sozinho).
- **Netlify**: rode `npm run build` e arraste a pasta `dist` em app.netlify.com/drop.
- **GitHub Pages**: rode `npm run build` e publique o conteúdo de `dist` (o `base: "./"` já está configurado).

## Antes de abrir ao público
- Peça autorização à SBIm (o conteúdo vem dos calendários dela) e à Pague Menos (nome, cores e tabela).
- Os dados foram conferidos com os PDFs SBIm 2026/27 (versões de junho/2026) e com a tabela da rede de 07/05/2026. A SBIm revisa todo ano.
- O app não guarda dado de paciente: tudo roda no navegador.
