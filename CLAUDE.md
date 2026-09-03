# Contexto do Projeto Syncou

Plataforma SaaS de agendamentos para prestadores de serviço (manicures, 
barbeiros, personal trainers, etc). Backend Node.js/Express + PostgreSQL 
no Railway. Frontend React/Vite (PWA). Usado tanto em desktop quanto mobile 
— responsividade mobile é PRIORIDADE em qualquer mudança de UI.

## Regras de trabalho (sempre seguir)
- Sempre mostrar o diff/plano ANTES de aplicar qualquer mudança, e esperar 
  aprovação explícita — mesmo que a mudança pareça pequena ou óbvia.
- Nunca misturar mudanças de autenticação e banco de dados na mesma leva.
- Ao investigar um bug, mostrar o código real (não descrever de memória) 
  antes de propor a correção.
- Testar sempre em produção real após deploy, não confiar só em ambiente 
  de preview.

## O que já foi feito (não repetir)
- Auditoria de segurança completa (10 pontos): rate limiting, proteção 
  IDOR, validação Zod, mensagens de erro genéricas, logging estruturado 
  em JSON com alertas via Discord webhook (com threshold anti-spam).
- TTL de expiração de agendamentos pendentes, reCAPTCHA v3, constraint 
  EXCLUDE USING gist no Postgres (previne race condition de horário), 
  notificações push via Firebase Cloud Messaging.
- Corrigido bug no rate limiter global: `server.ts` registrava o mesmo
  limiter duas vezes (uma escopada a `/api/`, outra global), contando
  cada requisição de API em dobro contra o limite de 180/min.
- Redesign "Órbita Âmbar" (histórico): tipografia Outfit + Plus Jakarta
  Sans, roxo como base + âmbar como cor de assinatura. **Descontinuado
  após auditoria visual** — âmbar nunca virou token de tema (ficou como
  hex cru espalhado) e competia com o roxo (`--primary` real) como cor de
  ação em telas diferentes. Decisão: violeta é a única cor primária.
  Âmbar foi removido de todos os CTAs (Landing, Dashboard, Onboarding,
  ProviderPage) — ver commit `996eb6f`.
- Redesign visual "Ficha de Agendamento" (histórico, ver `PROGRESS.md`):
  identidade tinta/pergaminho/latão pras páginas públicas, tipografia
  Bitter + IBM Plex. **Descartado antes de ir pra produção** — o usuário
  achou o resultado "dourado demais", não o tom escuro/sóbrio que
  esperava. Substituído pelo redesign abaixo.
- **Redesign completo "Índigo & Laranja"** (concluído neste worktree, ver
  `PROGRESS.md`): identidade nova do zero pra **plataforma inteira**
  (páginas públicas + Dashboard, não só o público) — modo claro em vez do
  escuro que a plataforma sempre teve. Roxo/índigo elétrico (`--primary`,
  `#7C3AED`) carrega marca/estrutura/seleção; laranja (`--cta` /
  `--cta-strong`) é reservado exclusivamente para o botão de conversão —
  nunca decoração, nunca estrutura. Regra 60 (neutro) / 30 (identidade) /
  10 (ação). Verde/âmbar seguem só como cor de status (livre/pendência),
  nunca como cor de marca. Tipografia: Plus Jakarta Sans (já era a fonte
  do Dashboard) + IBM Plex Mono pra dados tabulares (horário, preço,
  duração). Decisão registrada: violeta e laranja são cores distintas de
  propósito — a antiga regra "violeta é a única cor de ação" foi revista
  porque o laranja agora está escopado estritamente ao componente
  `Button variant="cta"`, sem repetir o problema do âmbar solto em hex
  cru que motivou aquela regra originalmente.
- Corrigidos bugs funcionais reais encontrados durante o redesign: botão 
  de editar serviço que não existia (faltava rota PUT no backend), switch 
  "Ativo" que ficou fora da tag <form> e sempre salvava inativo, WhatsApp 
  abrindo automaticamente ao confirmar/remarcar agendamento (desacoplado — 
  agora é ação manual e separada).
- Analytics: em andamento — separando faturamento "Realizado" (Concluídos) 
  de "Previsto" (Confirmados), taxa de cancelamento, filtro de período, 
  ranking de Top Serviços.
- Auditoria de UI/UX pós-redesign (relatório completo em `UI_UX_AUDIT.md`):
  3 rodadas (quick wins de consistência, itens estruturais — prop
  `loading` no `Button`, utilitário `.focus-ring`, área de toque 44px —
  e polish/microinteração), seguidas de uma passada de motion dedicada
  (`prefers-reduced-motion` global, stagger da aba Analytics reduzido,
  `--ease-snappy` estendido). Ver `PROGRESS.md` pra detalhe por rodada.
- Auditoria funcional + visual da página **Loja** (raio-x antes do diff,
  metodologia registrada em `PROGRESS.md`): upload de foto/logo era
  código morto (terceiro caso desse padrão — nunca fica implícito,
  sempre checar se um handler/estado importado tem UI de verdade
  conectada) e foi movido de `DashboardAccount.tsx` (onde funcionava mas
  estava fora de lugar) pra `DashboardSettings.tsx`; adicionado botão de
  desconectar o Google Calendar (não existia); rótulo de debug "Testar
  (F5)" corrigido; botões que reinventavam variants do `Button` na mão
  corrigidos pra usar `variant="destructive"`/`"secondary"` de verdade.
  Pendente de validação visual real: dois pontos de mobile (calendário
  de seleção múltipla, prefixo do slug) só receberam correção defensiva,
  sem confirmação — Dashboard logado não é testável localmente (sem
  Postgres).
- Curadoria das skills do Claude Code instaladas no projeto: removidas
  11 que não se aplicam ao Syncou (a `hyperframes-animation`, feita pra
  motion-graphics de vídeo, não pra UI de app real; e 10 da família
  "Caveman Cloud", que dependem de um gateway de observabilidade de LLM
  que este projeto não usa — o Syncou não tem nenhuma chamada de LLM em
  produção).

## Identidade visual atual

Sistema de tokens vigente (fonte da verdade: `src/index.css`, bloco
`@theme inline` + `:root` + `.dark`; variantes de botão em
`components/ui/button.tsx`). Consultar aqui antes de qualquer trabalho
de UI para não perder ou reinventar o que já existe:

- **`--primary`** (`#7C3AED` claro / `#8B5CF6` escuro) — roxo/índigo,
  cor de marca/estrutura/seleção. Usado em foco de input, item de nav
  ativo, ícones de destaque, `Button` (variant padrão).
- **`--cta` / `--cta-strong`** (`#F97316`/`#EA580C` claro,
  `#FB923C`/`#F97316` escuro) — laranja, reservado **exclusivamente**
  para `Button variant="cta"` (o botão de conversão). Nunca decoração,
  nunca estrutura — essa restrição é a regra viva que substituiu a
  antiga "violeta é a única cor de ação" (ver histórico do âmbar acima).
- **`--secondary`** (`#F1EEFC` claro / `#1E1B2E` escuro) — superfície
  neutra para ações secundárias via `Button variant="secondary"`.
  Corrigido em `DashboardSettings.tsx` (auditoria da Loja); outros
  arquivos ainda podem ter esse mesmo padrão de `bg-muted` cru
  reinventando o variant — checar ao mexer.
- **`--destructive`** (`oklch(0.577 0.245 27.325)` claro /
  `oklch(0.704 0.191 22.216)` escuro) — via `Button variant="destructive"`
  (ações destrutivas "pesadas", ex. botão que apaga algo) ou
  `text-destructive hover:bg-destructive/10` (ações destrutivas
  "leves", estilo ghost, ex. remover um item de uma lista). Corrigido em
  `DashboardSettings.tsx`, que tinha `red-500`/`red-600` cru do Tailwind
  em vez do token — inclusive um caso onde `variant="destructive"` já
  estava no botão mas uma `className` sobrescrevia silenciosamente com a
  cor errada. Os textos de erro de validação de formulário (Zod) na
  mesma tela ainda usam `red-600`/`red-400` cru — não fazia parte do
  escopo revisado, mesma correção se aplica quando for mexer neles.
- **Verde/âmbar** (`emerald-*`, `amber-*`) — só como cor de **status**
  semântico (livre/conectado = verde, pendência = âmbar), nunca como
  cor de marca ou de CTA. Não reintroduzir âmbar como identidade.
- **Tipografia**: Plus Jakarta Sans (`--font-sans`, texto geral) + IBM
  Plex Mono (`--font-mono`, dados tabulares — horário, preço, duração,
  slug/URL).
- **`--ease-snappy`** (`cubic-bezier(0.16, 1, 0.3, 1)`) — curva de
  easing única do produto; toda transição/hover de controle interativo
  deve usar essa classe em vez do easing padrão do navegador.
- **Proporção 60/30/10**: 60% neutro (`background`/`muted`/`border`),
  30% identidade (`primary`), 10% ação (`cta`).

## Pendências conhecidas
- Rastreamento de "No-show" (cliente não compareceu, distinto de 
  cancelamento) — escopo futuro, não confundir com cancelamento comum.
- Revisão fina de `motion`/animações genéricas repetidas — ainda não feita.
- Ambiente local não tem Postgres — fluxos que dependem de banco (cadastro,
  login, reserva) só podem ser testados de verdade após deploy no Railway.
  O redesign "Índigo & Laranja" foi verificado localmente via Playwright
  (Landing desktop/mobile, 404) sem erros de console; o Dashboard e o
  fluxo de reserva completo do ProviderPage ainda precisam de validação
  visual real pós-deploy.