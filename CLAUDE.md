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
- Redesign visual "Órbita Âmbar": tipografia Outfit (títulos) + Plus 
  Jakarta Sans (corpo), roxo como base + âmbar (#F5A623) como cor de 
  assinatura quente. Aplicado em: Landing Page, Dashboard (sidebar, 
  banner de sincronização Google Calendar, cards de agendamento), 
  Loja/Serviços.
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
- Página "Conta" ainda não recebeu o redesign Órbita Âmbar.