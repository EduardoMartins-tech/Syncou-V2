# Progress — Redesign visual do Syncou

## Onde este trabalho está

Worktree isolado: `E:\Syncou\Syncou-V2\.claude\worktrees\syncou-redesign-ficha`,
branch `worktree-syncou-redesign-ficha`, criada a partir de `origin/main`
(commit `996eb6f`). **Nada desta leva foi commitado ainda.**

## O que foi feito

### 1. Auditoria visual completa (Landing, Dashboard, ProviderPage, etc.)

Identificado o problema central: violeta (`#8B5CF6`, token real `--primary`)
e âmbar (`#F5A623`, citado no CLAUDE.md como cor de assinatura mas nunca
virou token) competiam como cor de ação principal em telas diferentes — às
vezes na mesma tela. Catalogados também os clichês visuais recorrentes: orbs
de blur ambiente, hero com giro infinito, bento grid decorativo, badges com
dot pulsante, glow-shadow em excesso. Relatório completo publicado como
artifact (screenshots reais incluídos para Landing e 404; Dashboard/Onboarding
só por leitura de código — sem Postgres local pra testar login).

### 2. Correções já commitadas em `origin/main`

- `d30f286` — `fix: remove duplicate global rate limiter registration`.
  `server.ts` registrava o `globalLimiter` duas vezes (uma escopada a
  `/api/`, outra global), contando cada requisição de API em dobro contra o
  limite de 180/min — o que travava até carregamento normal de página.
- `342ac88` — `chore: sync package-lock.json with package.json`.
- `996eb6f` — `fix(design): consolidate violet as the single primary color
  and cut unmotivated decoration`. Resolveu o conflito violeta/âmbar em 7
  arquivos (LandingPage, NotFound, Onboarding, DashboardLayout,
  DashboardHome, DashboardSettings, ProviderPage) — violeta venceu por
  decisão do usuário. Removidos: orbs de blur, giro infinito do hero,
  gradiente de texto no "404". Âmbar não é mais usado em nenhum CTA.

### 3. Redesign completo das páginas públicas (neste worktree, não commitado)

Por pedido do usuário: identidade visual nova do zero (não evolução da
"Órbita"), escopo limitado a Landing Page + páginas públicas primeiro
(Dashboard fica pra depois), efeito visual restrito a um único momento de
assinatura.

**Conceito: "Ficha de Agendamento"** — a interface se comporta como um
ficha/livro de horários físico com uma senha de fila, em vez da metáfora
abstrata de órbita.

- **Paleta nova** (tokens `ledger-*` adicionados em `src/index.css`, sem
  remover os tokens antigos que o Dashboard ainda usa): tinta `#17140F`,
  pergaminho `#EFE6D2`, latão `#B08D57` (cor de ação), vinho `#7A2E2E`
  (só o carimbo de confirmação), musgo `#4B5D45`, pedra `#8A8371`.
- **Tipografia nova**: Bitter (display/headlines), IBM Plex Sans (corpo),
  IBM Plex Mono (horários, preços, dados tabulares) — carregadas via Google
  Fonts em `index.html`.
- **Elemento de assinatura**: uma senha de fila rasgando ao meio na hero —
  um lado "aguardando resposta no WhatsApp", o outro vira o link de
  agendamento confirmado. Animação única no carregamento, sem repetir.
- **Escopo**: `LandingPage.tsx`, `NotFound.tsx`, `ProviderPage.tsx`. Ajustes
  mínimos em `Onboarding.tsx`/`TermsPage.tsx` só pra não quebrar o logo (ver
  bug abaixo). Dashboard continua na identidade violeta atual — dois
  sistemas visuais coexistem por enquanto (público vs. logado).
- **`ProviderPage.tsx`** foi re-vestida sem tocar na lógica de reserva:
  técnica de escopo via CSS custom properties (sobrescreve `--primary`,
  `--card`, `--border` etc. só dentro da página via `style` inline no
  container raiz), então Button/Card/Calendar/Badge herdam a paleta nova
  automaticamente sem precisar trocar classe por classe.
- **Bug corrigido**: `src/components/Logo.tsx` tinha `text-purple-500`
  hardcoded no próprio componente, ignorando qualquer cor passada via
  `className` — por isso o logo continuava roxo mesmo depois de passar
  `text-ledger-brass`. Removido o hardcode; os 3 call-sites que dependiam do
  default (`Onboarding.tsx` x2, `TermsPage.tsx`) receberam `text-primary`
  explícito pra não perder a cor atual.

**Verificado visualmente**: Landing (desktop + mobile), 404, estado "não
encontrado" do ProviderPage. **Não verificado**: fluxo completo de reserva do
ProviderPage (precisa de Postgres acessível — sem instância local; usuário
não roda Postgres na própria máquina, só no Railway).

`tsc --noEmit` limpo em todas as etapas.

## Próximos passos

1. Revisar o redesign neste worktree e decidir: commitar + push/merge pra
   `main`, ou ajustar algo antes.
2. Itens da auditoria original ainda não atacados (fora do escopo desta
   leva): cores do calendário (`DashboardCalendar.tsx`) fora do tema, revisão
   fina de `motion`/animações genéricas repetidas.
3. Se o redesign for aprovado: decidir se o conceito "Ficha" se estende pro
   Dashboard também, ou se os dois sistemas visuais (público novo / logado
   antigo) convivem por mais tempo.
4. Testar o fluxo de reserva do ProviderPage de verdade — depende de
   Postgres acessível (local, se o usuário decidir configurar, ou direto
   depois do próximo deploy no Railway).

## Arquivos relevantes

| Arquivo | O que tem |
|---|---|
| `src/index.css` | Tokens de tema — os antigos (Dashboard) e os novos `ledger-*` |
| `index.html` | Fontes Google (Outfit/Plus Jakarta Sans antigas + Bitter/IBM Plex novas) |
| `src/pages/LandingPage.tsx` | Redesign completo — hero, ficha pautada, CTA final, modal de auth |
| `src/pages/NotFound.tsx` | Redesign completo |
| `src/pages/ProviderPage.tsx` | Re-vestida via escopo de CSS vars, lógica de reserva intacta |
| `src/components/Logo.tsx` | Bug de cor hardcoded corrigido |
| `server.ts` | Rate limiter corrigido (~linha 183-213) |
| `.claude/worktrees/syncou-redesign-ficha/` | Worktree onde este trabalho vive |
