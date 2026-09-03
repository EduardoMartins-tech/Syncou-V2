# Progress — Redesign visual do Syncou

## Onde este trabalho está

Worktree isolado: `E:\Syncou\Syncou-V2\.claude\worktrees\syncou-redesign-ficha`,
branch `worktree-syncou-redesign-ficha`. Todo o trabalho desta leva está
no commit `9e0cca9`, commitado e já em **produção**: o usuário pediu push
direto pra `main` (fast-forward a partir de `28e4168`, sem PR) pra testar
no ambiente real do Railway. O checkout local de `main` em
`E:\Syncou\Syncou-V2` ainda não recebeu esse `git pull`.

## Histórico da direção visual (3 tentativas)

1. **"Órbita Âmbar"** (descontinuada) — roxo + âmbar como cor de
   assinatura. Âmbar nunca virou token, ficou como hex cru espalhado e
   competia com o roxo como cor de ação. Ver `996eb6f`.
2. **"Ficha de Agendamento"** (descartada antes de produção) — identidade
   tinta/pergaminho/latão, tipografia Bitter + IBM Plex, só nas páginas
   públicas (commit `8980df2`, já em `main`). O usuário viu o resultado
   rodando e achou "dourado demais" — o fundo era escuro, mas o latão
   (única cor de destaque, usada em botões/ícones/bordas/links/foco)
   dominava a leitura da página inteira. Não reverte o commit já mergeado
   em `main`; a direção seguinte substitui esse trabalho neste worktree.
3. **"Índigo & Laranja"** (atual, ver abaixo) — especificação vinda
   diretamente do usuário, agindo como product/UI designer sênior:
   paleta vibrante, regra 60/30/10, roxo como identidade e laranja
   reservado só pra ação de conversão.

## O que foi feito nesta leva (Índigo & Laranja)

### 1. Proposta visual (artifact, aprovada antes de mexer em código)

Publicado um mockup do sistema de design (paleta, tipografia, tela de
agendamento mobile) pra validação antes da implementação real. Decisões
tomadas como lead: primária `#7C3AED` (mais contraste que `#6366F1`
sugerido), laranja em vez de coral pro CTA (coral colide com o vermelho
de erro), `#EA580C` nos botões sólidos pra fechar contraste AA com texto
branco (`#F97316` puro não fecha).

### 2. Fundação de tokens

- `src/index.css`: tokens do tema inteiro trocados de escuro pra claro
  (`--background: #F8FAFC`, `--card: #FFFFFF`, `--primary: #7C3AED`).
  Tokens `ledger-*` da Ficha removidos por completo. Novos tokens
  `--cta` / `--cta-strong` / `--cta-foreground` adicionados — **cor de
  ação separada da cor primária**, ao contrário do sistema antigo onde
  violeta fazia os dois papéis.
- `index.html`: fontes trocadas pra só Plus Jakarta Sans + IBM Plex Mono
  (removidas Outfit, Bitter, IBM Plex Sans — não usadas mais).
- `vite.config.ts`: `theme_color`/`background_color` do manifest PWA
  atualizados de navy escuro pra `#F8FAFC` (status bar mobile combinando
  com o novo app claro).
- `components/ui/button.tsx`: nova variante `variant="cta"` no Button
  compartilhado — usada em todo botão de conversão real (criar conta,
  confirmar reserva, agendar agora), reutilizável em vez de hardcodar
  classe por classe.

### 3. Escopo: a plataforma inteira, não só o público

Diferente da Ficha, esta leva **inverte o Dashboard inteiro de escuro
pra claro** — ele nunca tinha recebido nenhum redesign antes e estava
inteiro hardcoded em hex cru (não em tokens), então não era só trocar
valor de token: cada classe `bg-[#...]`/`text-[#...]`/`border-[#...]`
precisou ser reescrita.

Arquivos alterados: `LandingPage.tsx`, `NotFound.tsx`, `ProviderPage.tsx`
(removido o scoping de CSS vars que a Ficha usava — não precisa mais,
todo o app compartilha os mesmos tokens agora), `Onboarding.tsx`,
`TermsPage.tsx`, `ResetPassword.tsx`, `DashboardLayout.tsx`,
`DashboardHome.tsx`, `DashboardSettings.tsx`, `DashboardAccount.tsx`
(primeira vez recebendo qualquer redesign), `DashboardCalendar.tsx`.

### 4. Correção de convenção de cor no Dashboard

`DashboardCalendar.tsx` usava verde/âmbar pros eventos "Confirmado" /
"Pendente", enquanto `DashboardHome.tsx` já usava violeta (primary) /
âmbar pro mesmo par de status em outro lugar da mesma tela — duas
convenções diferentes pro mesmo dado. Unificado: Confirmado = primary
(violeta), Pendente = âmbar, em toda a Dashboard.

### 5. Bugs reais corrigidos durante a conversão (não cosméticos)

- Inputs de horário/data com `[&::-webkit-calendar-picker-indicator]:invert`
  — truque que invertia o ícone do calendário nativo pra ficar visível
  em fundo escuro. Em fundo claro isso o deixava branco-sobre-branco
  (invisível). Removido em 3 arquivos (`DashboardSettings.tsx`,
  `DashboardHome.tsx`).
- Vários textos de status/erro em `red-400`/`emerald-400`/`amber-500`
  (tom claro, pensado pra contraste sobre fundo escuro) não fechavam
  contraste AA sobre branco — ajustados pra `-600`/`-700`.
- Um botão em `DashboardAccount.tsx` ficou com `bg-primary` + texto
  escuro depois de uma troca em lote — corrigido pra `text-primary-foreground`.

### 6. Verificação

- `tsc --noEmit` limpo em cada fase.
- Servidor local rodado com Playwright: Landing (desktop 1280px e mobile
  390px) e 404 (mobile) — sem erros de console, paleta e responsividade
  conferidas visualmente.
- **Não verificado**: Dashboard logado e fluxo de reserva completo do
  ProviderPage — dependem de Postgres, que não existe no ambiente local
  (só testável de verdade após deploy no Railway, conforme já registrado
  no `CLAUDE.md`).

### 7. Dark mode

Adicionado depois do redesign inicial, a pedido do usuário ("botão de
dark mode na sidebar"):

- `src/index.css`: bloco `.dark` deixou de duplicar os valores claros e
  ganhou uma paleta escura de verdade (fundo `#0B0A12`, cards `#15131F`,
  primária `#8B5CF6`). CTA fica mais claro no escuro (`#FB923C`/`#F97316`)
  e o texto do botão de ação vira quase-preto em vez de branco — laranja
  claro com texto branco não fecha contraste AA.
- `src/contexts/ThemeContext.tsx` (novo): provider com `theme`/`toggleTheme`,
  persiste em `localStorage` (`syncou-theme`), aplica a classe `.dark` no
  `<html>` — **global**, não só no Dashboard, porque os modais (Dialog)
  usam portal pra `document.body`, fora de qualquer wrapper local; alterar
  a classe num elemento dentro da árvore deixaria os modais presos no
  tema errado.
- `index.html`: script inline síncrono antes do React montar, pra não ter
  flash de tema claro em quem já escolheu escuro.
- `src/components/DashboardLayout.tsx`: botão de alternância (ícone
  Sol/Lua) na sidebar desktop e no menu mobile — é o único lugar com o
  controle, mas a preferência vale pro app inteiro.
- Auditoria de cores literais do Tailwind (não-token) que eu tinha usado
  pra status/erro durante a conversão pro claro (`emerald-600`,
  `amber-600/700`, `red-600/700`, `rose-600`, `slate-500/600`) — todas
  ganharam par `dark:*-400` pra manter contraste no escuro. Também achei
  e corrigi 2 bugs de contraste que tinham passado batido no modo claro
  (`text-red-400` sobre fundo branco em `DashboardAccount.tsx`, e
  `hover:text-red-300` sobre fundo rosa claro em `DashboardSettings.tsx`).

**Verificado**: `tsc --noEmit` limpo; Landing renderizada em dark mode via
Playwright (forçando `localStorage.syncou-theme=dark`) — re-tematizou
sozinha, sem precisar tocar em nenhum componente, porque tudo já usa os
tokens. **Não verificado**: o botão em si dentro do Dashboard logado
(depende de Postgres/login, só no Railway).

## Próximos passos

1. Revisão do usuário no worktree — decidir commitar + push/merge pra
   `main`, ou ajustar algo antes.
2. Validar Dashboard logado e fluxo de reserva real após deploy.
3. Itens fora do escopo desta leva: rastreamento de "No-show", revisão
   fina de `motion`/animações repetidas.

## Arquivos relevantes

| Arquivo | O que tem |
|---|---|
| `src/index.css` | Tokens de tema únicos pra toda a plataforma (claro) + `--cta`/`--cta-strong` |
| `index.html` | Fontes Google — só Plus Jakarta Sans + IBM Plex Mono |
| `vite.config.ts` | Cores do manifest PWA atualizadas |
| `components/ui/button.tsx` | Variante `cta` nova, reutilizável |
| `src/pages/LandingPage.tsx` | Hero com preview real do widget de agendamento como elemento de assinatura |
| `src/pages/ProviderPage.tsx` | Fluxo de reserva na paleta nova, sem scoping de CSS vars |
| `src/pages/Dashboard*.tsx` | Dashboard inteiro invertido de escuro pra claro |
| `.claude/worktrees/syncou-redesign-ficha/` | Worktree onde este trabalho vive |
