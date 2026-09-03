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