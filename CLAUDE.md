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
- **Redesign visual "Ficha de Agendamento"** (em andamento, ver
  `PROGRESS.md` no worktree ativo): identidade nova do zero pras páginas
  públicas (Landing, 404, ProviderPage) — paleta tinta/pergaminho/latão,
  tipografia Bitter + IBM Plex, conceito de ficha/senha de fila em vez de
  "órbita". Dashboard segue com a identidade violeta atual por enquanto;
  os dois sistemas visuais coexistem até decisão de estender o redesign
  pro Dashboard ou não.
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
- Página "Conta" ainda não recebeu nenhum dos dois redesigns.
- Cores do `DashboardCalendar.tsx` (eventos) ainda fora do tema — hardcoded
  via CSS-in-JS, não pelos tokens.
- Revisão fina de `motion`/animações genéricas repetidas — ainda não feita.
- Redesign "Ficha de Agendamento" só cobre Landing/404/ProviderPage até
  agora; decisão pendente sobre estender pro Dashboard.
- Ambiente local não tem Postgres — fluxos que dependem de banco (cadastro,
  login, reserva) só podem ser testados de verdade após deploy no Railway.