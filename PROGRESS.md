# Progress — Redesign visual do Syncou

## Onde este trabalho está

Worktree isolado: `E:\Syncou\Syncou-V2\.claude\worktrees\syncou-redesign-ficha`,
branch `worktree-syncou-redesign-ficha`. `main` remoto está em `46d9d9a`
(fast-forward direto, sem PR, a pedido do usuário, em toda leva desde o
commit `9e0cca9`) — já em **produção** no Railway.

Nota sobre os dois checkouts no PC do usuário: `E:\Syncou\Syncou-V2` (a
raiz) e este worktree são o **mesmo repositório Git** com dois diretórios
de trabalho — recurso nativo do `git worktree`, não uma cópia separada.
Os dois compartilham um único remoto (`origin`); um `git push` daqui
chega no GitHub/Railway normalmente. O que não é automático: um push
feito aqui **não atualiza os arquivos do checkout em `E:\Syncou\Syncou-V2`**
— aquele checkout só reflete o estado atual depois de um `git pull` ali.
Sessões futuras: nunca redirecionar comandos git pra esse outro caminho
(`git -C`/`cd`) — o ambiente bloqueia isso de propósito, já que uma
sessão isolada em worktree deve operar só no seu próprio diretório.

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

## Auditoria de UI/UX pós-redesign (`UI_UX_AUDIT.md`)

Depois do redesign inicial, uma auditoria completa foi rodada sobre o
código real da plataforma (não só visual — usabilidade, microinteração,
consistência de design system), com achados citando arquivo:linha e
razão de contraste WCAG. Relatório completo em `UI_UX_AUDIT.md`, na raiz
do worktree. Execução em 3 rodadas, todas commitadas e em produção:

1. **Quick wins**: `rounded-2xl` → `rounded-xl` (consistência de raio),
   `transition-all` → `transition` (performance/especificidade),
   contraste de placeholder, sombra do banner do Google Calendar,
   token `--ease-snappy`.
2. **Estruturais**: prop `loading` no `Button` compartilhado (spinner +
   `aria-busy` + disable automático), utilitário `.focus-ring`
   (`focus-visible`, não `focus:`), expansão de área de toque pra 44px
   via `before:absolute before:inset-[-4px]` em botões de ação de linha.
3. **Polish/microinteração**: barra de progresso de 3 segmentos no fluxo
   de reserva (`ProviderPage.tsx`), elevação de hover nos cards de
   serviço não selecionados, ícone Sol/Lua animado no toggle de tema,
   `Toaster` (sonner) estilizado com os tokens do tema.

Depois, uma passada de motion dedicada (usando a skill `improve-animations`,
descartando a `hyperframes-animation` por ser pra renderização de vídeo,
não pra UI de app real — ver decisão de curadoria de skills abaixo):
suporte a `prefers-reduced-motion` (`MotionConfig reducedMotion="user"` +
fallback CSS global — nada no app respeitava isso antes), stagger da aba
Analytics do Dashboard cortado de ~900ms pra ~400ms, `--ease-snappy`
estendido aos botões que ainda usavam o easing padrão do navegador.

**Curadoria de skills do Claude Code**: das 21 skills instaladas no
worktree, 11 foram removidas por não se aplicarem ao projeto — a
`hyperframes-animation` (skill de motion-graphics/vídeo, contrato de
runtime incompatível com uma SPA React real) e 10 da família
"Caveman Cloud" (gateway/observabilidade de LLM; o Syncou não tem
nenhuma chamada de LLM em produção pra observar). Ficaram as que batem
com o projeto: `improve-animations`, `investigate-first`, `migration`,
`safe-refactor`, `surgical-patch`, `lean-build`, `verify-and-stop`,
`cavecrew`, `caveman-commit`, `caveman-explore`, `caveman-review`.

## Auditoria funcional + visual — página Loja (`/dashboard/settings`)

Mesma metodologia (raio-x antes de qualquer diff, depois execução
direta) aplicada especificamente à página "Loja" da sidebar — distinta
da aba Serviços do Dashboard, já coberta na rodada acima.

**Funcional:**
1. Upload de foto/logo era código morto: `handleFileUpload`, `uploading`
   e o import de `Upload` existiam prontos mas nunca foram conectados a
   nenhum `<input type="file">` ou botão — a página que se descreve como
   "gerencie seu perfil público" não tinha como trocar a foto. Era o
   terceiro caso desse padrão encontrado no projeto (depois do botão de
   editar serviço sem rota e do switch "Ativo" fora do `<form>`). Movido
   de `DashboardAccount.tsx` (onde já funcionava, mas fora de lugar) pra
   `DashboardSettings.tsx`; `DashboardAccount.tsx` agora só mostra a foto
   em modo leitura com um aviso apontando pra Loja.
3. Não existia forma de desconectar o Google Calendar depois de
   conectado. Adicionada rota `DELETE /api/users/google-token` +
   botão "Desconectar".
4. Rótulo de botão "Testar (F5)" (copy de debug vazada) trocado por
   "Enviar evento de teste".

**Visual (consistência com os tokens já documentados em `CLAUDE.md` →
Identidade visual atual):**
5-6. Botões que reimplementavam variantes já existentes do `Button`
   compartilhado na mão (`bg-red-500`/`bg-muted` cru em vez de
   `variant="destructive"`/`variant="secondary"`) — incluindo um caso
   onde `variant="destructive"` já estava presente mas sobrescrito por
   classes conflitantes, tornando o variant decorativo/inerte.
7. Sombra arbitrária (`shadow-[0_-4px_20px_-15px_...]`) na barra fixa de
   salvar trocada pelo token `shadow-lg`.
8. Checkbox "Não trabalharei" usava `focus:` (mostra anel em clique de
   mouse) em vez de `focus-visible:` via `.focus-ring` — mesma classe de
   bug já corrigida nos outros toggles da mesma página numa rodada
   anterior, que tinha passado batida nesse elemento.
9. **Não corrigido de propósito**: thumb branco cru (`bg-white`) do
   switch de feriados. Troca pro token mais óbvio (`bg-background`)
   ficaria quase invisível no modo escuro (thumb quase preto sobre
   trilha `bg-muted` também escura) — decisão de design maior do que um
   fix de token, deixada pro usuário decidir.

**Mobile**: dois pontos sinalizados como "a verificar" (calendário de
seleção múltipla podendo estourar horizontalmente, prefixo do slug
espremendo o input em telas estreitas) receberam correções só
**defensivas** (`overflow-x-auto`, `min-w-0`, padding responsivo) — não
foi possível confirmar visualmente sem Postgres local pra logar no
Dashboard. Precisam de teste real em viewport estreito pós-deploy.

## Próximos passos

1. Validar em produção real (Railway) os itens desta leva: upload de
   foto, desconexão do Google Calendar, e os dois pontos de mobile
   sinalizados como não confirmados visualmente.
2. Validar Dashboard logado e fluxo de reserva real após deploy (ainda
   pendente desde o redesign inicial).
3. Itens fora do escopo: rastreamento de "No-show", achado 9 da Loja
   (cor do thumb do switch), e replicar esta mesma auditoria
   funcional+visual nas outras telas do Dashboard que ainda não
   passaram por ela isoladamente (Calendário, Conta).

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
