# Auditoria UI/UX — Syncou

Varredura do código-fonte real (`src/`, `components/ui/`) no estado atual do
branch `worktree-syncou-redesign-ficha` (commit `973d469`), sistema de
design "Índigo & Laranja". Achados com arquivo:linha exato e correção em
código. Nada aqui é opinião estética solta — cada item tem uma causa técnica
citável (token, classe, ratio WCAG).

---

## 1. Diagnóstico Cru

### O que funciona
- `src/index.css` tem uma escala de radius de verdade (`--radius: 0.625rem`
  multiplicado por fator fixo em `sm/md/lg/xl/2xl/3xl/4xl`), não valores
  soltos — isso é raro de ver bem feito.
- `--cta` separado de `--primary` como token, e a variante `cta` no
  `Button` (`components/ui/button.tsx:23`) é a forma certa de resolver
  "cor de ação vs. cor de identidade" — evita o erro clássico de sobrecarregar
  um único token pra dois papéis semânticos.
- Dark mode aplicado via classe global em `<html>` (`src/contexts/ThemeContext.tsx`)
  em vez de escopado — decisão correta, porque `DialogPortal` (`components/ui/dialog.tsx:29`)
  renderiza em `document.body`, fora de qualquer wrapper local.

### O que quebra o sistema

**1.1 — Radius do `Card` não bate com os "cards" feitos à mão.**
`components/ui/card.tsx:15` define `rounded-xl` (14px) como o radius
canônico de qualquer `<Card>`. Mas em `src/pages/DashboardHome.tsx:729,
841-845, 855, 904, 940`, `src/pages/LandingPage.tsx:223, 282` e
`src/pages/TermsPage.tsx:30`, superfícies visualmente idênticas a cards
(banner de conectar Google, skeletons, hero de faturamento, tiles de
métrica, CTA final) são `<div>` cru com `rounded-2xl` (18px) — 4px de
diferença que o olho pega em qualquer tela com os dois lado a lado (ex:
`DashboardHome.tsx` linha 729 vs. os `<Card>` reais da mesma tela).

```tsx
// DashboardHome.tsx:729 — antes
className="bg-card border border-border rounded-2xl p-5 ..."
// depois — bate com components/ui/card.tsx
className="bg-card border border-border rounded-xl p-5 ..."
```
Aplicar em todas as ocorrências acima. Se a intenção era um radius maior
de propósito pra hero cards, então declare isso como token
(`--radius-hero` ou use `rounded-2xl` também dentro do `Card` via prop),
não deixe dois valores concorrendo sem nome.

**1.2 — `transition-all` em 30 lugares** (`grep -rc transition-all`).
`transition-all` faz o browser observar TODA propriedade animável, não só
cor/opacidade/transform — se qualquer ancestral disparar reflow durante a
transição (ex: um Skeleton trocando de altura), a página recalcula layout
a cada frame da transição em vez de só compositar. Nenhum desses 30 casos
precisa de "tudo": são hovers de cor/bg (`DashboardLayout.tsx:106`, botões
de tab) ou glow de sombra (`LandingPage.tsx`, cards de serviço). Tailwind
já resolve isso com a classe `transition` pura (anima só
color/background-color/border-color/box-shadow/transform/opacity —
exatamente o subconjunto seguro):

```tsx
// antes
className="... transition-all duration-300 ..."
// depois — mesmo efeito visual, sem observar layout inteiro
className="... transition duration-300 ..."
```

**1.3 — Zero easing customizado em CSS puro; Framer Motion usa uma curva
que o CSS nunca vê.** As animações de entrada com `motion.div` usam
consistentemente `ease: [0.16, 1, 0.3, 1]` (expo-out — ex:
`LandingPage.tsx:196`, `DashboardHome.tsx:754`). Mas todo `transition-colors
duration-200` em hover (`grep -rhoE "duration-[0-9]+"` → só 4 valores
distintos, 0 `cubic-bezier`) cai no `ease` padrão do browser
(`cubic-bezier(0.25, 0.1, 0.25, 1)`), uma curva mais "molenga" e genérica.
O resultado: a entrada de página tem uma sensação de acabamento que os
hovers do dia a dia não têm — dá pra sentir a diferença entre os dois
sistemas de animação convivendo sem se falar.

```css
/* src/index.css — dentro de @theme inline */
--ease-snappy: cubic-bezier(0.16, 1, 0.3, 1);
```
Isso gera a utilitária `ease-snappy` automaticamente no Tailwind v4. Troque
`transition duration-200` por `transition duration-200 ease-snappy` nos
elementos interativos primários (botões `cta`/`default`, cards clicáveis
do `ProviderPage.tsx`) pra alinhar com a curva que já é a "personalidade"
de movimento do produto.

**1.4 — Três padrões diferentes de "botão carregando" no mesmo produto.**
- `DashboardSettings.tsx:611` — o texto some, sobra só o ícone girando:
  `{loading ? <RefreshCw className="animate-spin" /> : "Salvar Alterações"}`.
  O botão muda de largura e o usuário perde a referência do que estava
  fazendo.
- `LandingPage.tsx:462` / `Onboarding.tsx:258` — ícone + texto junto
  (`<Loader2 /> Processando...`), o padrão certo.
- `DashboardAccount.tsx:271` / `ProviderPage.tsx:542` — só troca o texto,
  sem ícone nenhum: `{loading ? 'Salvando...' : 'Salvar Alterações'}`.

Três semânticas visuais pro mesmo estado. Padronize num único componente:

```tsx
// components/ui/button.tsx — ou um wrapper local
function SubmitLabel({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </span>
  );
}
// uso: <SubmitLabel loading={loading}>{loading ? 'Salvando...' : 'Salvar Alterações'}</SubmitLabel>
```
Ícone sempre presente (ocupa espaço reservado via `gap-2` mesmo
escondido, se quiser zero layout shift use `opacity-0` em vez de
`{loading && ...}`), nunca substitui o texto sozinho.

**1.5 — Contraste de placeholder abaixo de AA em 16 lugares.**
`components/ui/input.tsx:12` faz certo: `placeholder:text-muted-foreground`
sem opacidade — `#475569` sobre `#FFFFFF` dá **7.58:1**, passa até AAA.
Mas 16 inputs/textareas com className solta reintroduzem opacidade:
`placeholder:text-muted-foreground/70` (`DashboardHome.tsx:1011,1420`,
`DashboardSettings.tsx:454,477,489` e mais 11 ocorrências) e
`/50` (`DashboardHome.tsx:1308`). Contraste calculado pra `/70`:
`#475569` misturado a 70% sobre branco ≈ `#7E88 96`, luminância relativa
0.243 → **3.59:1** contra o fundo — abaixo dos 4.5:1 exigidos pra texto
normal (WCAG 2.1, critério 1.4.3). O `/50` fica ainda pior, ~2.9:1.

```tsx
// antes (DashboardSettings.tsx:489, e as outras 15 ocorrências)
className="... placeholder:text-muted-foreground/70"
// depois — mesmo valor que o Input.tsx já usa certo
className="... placeholder:text-muted-foreground"
```
Busca e troca em massa: nenhuma dessas opacidades tem motivo de design
documentado, é herança de quando a paleta era escura e precisava
"apagar" o placeholder pra não competir com o fundo — no claro, o token
sozinho já resolve.

---

## 2. Usabilidade & UX (Fricção e Fluxo)

**2.1 — O funil de agendamento (a tela que converte) não mostra progresso.**
`ProviderPage.tsx` tem 4 passos reais (`step: 1 | 2 | 3 | 4`, linha 55) —
serviços → data/hora → dados → confirmação — mas o `<header>` (linha ~300)
só renderiza um botão de voltar quando `step > 1`. Não existe "Etapa 2 de
3", não existe barra, não existe nem um conjunto de bolinhas. Em mobile,
onde cada passo é uma tela cheia sem scroll simultâneo dos outros passos,
o usuário não tem ideia de quanto falta — isso é fricção medida (abandono
de formulário sobe quando não há indicação de progresso, é o motivo de
toda checkout de e-commerce ter barra de passos). Correção mínima, sem
mexer na lógica de step:

```tsx
// Dentro do <header>, ao lado do botão de voltar — ProviderPage.tsx ~329
{step < 4 && (
  <div className="flex gap-1.5 ml-auto">
    {[1, 2, 3].map((s) => (
      <div
        key={s}
        className={`h-1 rounded-full transition-all duration-300 ${
          s <= step ? 'w-6 bg-primary' : 'w-3 bg-muted'
        }`}
      />
    ))}
  </div>
)}
```
3 segmentos porque o passo 4 é a tela de sucesso, não faz parte da
progressão que o usuário precisa acompanhar.

**2.2 — 17 `<button>` crus sem `focus-visible` explícito, contra um
`Button` component que trata isso bem.** `components/ui/button.tsx:7` tem
`focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50`
embutido — ótimo. Só que ele não é usado em todo controle interativo:
contei via `grep -rn "<button"` 17 ocorrências cruas em
`DashboardLayout.tsx` (1), `DashboardCalendar.tsx` (4 — toolbar inteira),
`DashboardHome.tsx` (6 — tabs e filtros de status), `DashboardSettings.tsx`
(2 — toggle de dias da semana), `LandingPage.tsx` (3 — tabs do modal de
auth), `ProviderPage.tsx` (1). Nenhum tem `focus-visible:` na className.
O browser desenha o outline default dele (varia por engine/OS), que não
tem nada a ver com o anel violeta que o resto do produto usa — quem
navega por teclado sente a inconsistência primeiro que qualquer usuário
de mouse.

```tsx
// aplicar em todo <button> cru — ex: DashboardCalendar.tsx toolbar
className="... focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
```
Se preferir não repetir isso 17 vezes, extraia pra uma classe utilitária
em `index.css`:
```css
@layer utilities {
  .focus-ring {
    @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background;
  }
}
```
e aplica `className="... focus-ring"` nos 17 lugares.

**2.3 — Alvos de toque abaixo de 44px em ações destrutivas/de edição no
mobile.** `DashboardHome.tsx:1157` (`h-8 px-2`, cancelar), `:1176/:1209`
(`h-8 px-2`, cancelar inline), `:1225` (`h-8 w-8`, editar — 32px), `:1358`
(`h-9 w-9`, editar serviço — 36px), `:1361` (`h-9 w-9`, excluir serviço).
CLAUDE.md do próprio projeto declara "responsividade mobile é PRIORIDADE",
e são exatamente os botões de **excluir e cancelar** — os que mais
penalizam um toque errado — que ficam abaixo do mínimo de 44×44px (WCAG
2.5.5 nível AAA, mas é o piso de facto em qualquer guia de HIG/Material
pra ação destrutiva). Trocar a altura visual quebraria o ritmo da linha
da lista; a correção certa é aumentar a área de toque sem aumentar o
ícone:

```tsx
// DashboardHome.tsx:1361 — antes
<Button variant="ghost" size="icon" className="h-9 w-9 ..." onClick={...}>
// depois — hit area de 44px, ícone/borda visual continuam do tamanho atual
<Button variant="ghost" size="icon" className="h-9 w-9 relative before:absolute before:inset-[-4px] ..." onClick={...}>
```
`before:inset-[-4px]` em cima de um `h-9` (36px) dá 44px de área
clicável real sem alterar a caixa visual que define o ritmo da lista.

**2.4 — Hierarquia: o card de "Conectar Google Calendar" e a lista de
agendamentos competem pelo mesmo peso visual.** `DashboardHome.tsx:729`
usa `shadow-lg` (a sombra mais pesada da tela) num banner que é
secundário — a primeira coisa que o olho bate ao abrir o Dashboard não é
"Visão Geral" nem os agendamentos pendentes, é esse banner de setup. Se a
intenção é chamar atenção só quando desconectado (`!currentUser?.googleAccessToken`,
linha 725), tudo bem ser destacado — mas `shadow-lg` compete com o resto
da tela que usa uniformemente `shadow-sm`. Baixe pra `shadow-sm` e deixe o
`animate-ping` do indicador (linha 736, já existe) fazer o trabalho de
chamar atenção — é mais preciso que "sombra grande".

---

## 3. Microinterações & Animações

**3.1 — Cards de serviço no `ProviderPage.tsx` (linha ~372) não têm
feedback de elevação no hover, só troca de borda.** Atualmente:
```tsx
className={`... border ${isSelected ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-primary/40 hover:bg-muted'}`}
```
É uma lista de serviços com preço — o usuário está decidindo o que
comprar, esse é o momento pra dar peso tátil. Adicionar uma elevação sutil
no hover (sem exagerar, é lista, não hero):
```tsx
className={`... transition duration-200 ease-snappy ${
  isSelected
    ? 'border-primary ring-1 ring-primary shadow-sm'
    : 'border-border hover:border-primary/40 hover:bg-muted hover:-translate-y-0.5 hover:shadow-md'
}`}
```
`-translate-y-0.5` + `shadow-md` só no hover dá a sensação de "o card
saiu do papel" sem animação de bounce nenhuma — 2px de elevação já
resolve.

**3.2 — Botão de tema (Sol/Lua) na sidebar troca de ícone sem transição —
é um corte seco.** `DashboardLayout.tsx` (botão de tema, seção que criei
com `theme === 'dark' ? <Sun /> : <Moon />`). Ícone que muda de estado
merece uma rotação de saída/entrada, não substituição instantânea:
```tsx
<AnimatePresence mode="wait" initial={false}>
  <motion.span
    key={theme}
    initial={{ rotate: -90, opacity: 0 }}
    animate={{ rotate: 0, opacity: 1 }}
    exit={{ rotate: 90, opacity: 0 }}
    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    className="mr-3 inline-flex"
  >
    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
  </motion.span>
</AnimatePresence>
```
200ms, mesma curva expo-out que o resto do produto já usa em entrada de
página — consistência de "assinatura de movimento", não decoração nova.

**3.3 — Toast de sucesso/erro (`sonner`) não tem tratamento visual
próprio — usa o default da lib.** Não achei nenhuma customização de
`Toaster` em `src/main.tsx:137` além do `<Toaster />` sem props. É a
única superfície de feedback assíncrono do produto inteiro (confirmação
de agendamento, erro de rede, sucesso de salvar) e está com a cara
genérica da lib, destoando da paleta Índigo & Laranja:
```tsx
// main.tsx
<Toaster
  theme="system"
  toastOptions={{
    classNames: {
      success: '!bg-card !border-emerald-500/30 !text-foreground',
      error: '!bg-card !border-red-500/30 !text-foreground',
      icon: 'text-primary',
    },
  }}
/>
```

---

## 4. Plano de Ação

### Quick Wins (~30 min cada, sem tocar lógica)
1. `rounded-2xl` → `rounded-xl` nas 9 ocorrências fora do `<Card>` real
   (item 1.1).
2. `transition-all` → `transition` nas 30 ocorrências (item 1.2) — busca e
   troca, zero risco.
3. Remover `/50` e `/70` de todo `placeholder:text-muted-foreground` (item
   1.5) — 16 ocorrências, busca e troca.
4. `shadow-lg` → `shadow-sm` no banner de Google Calendar (item 2.4).
5. Adicionar `--ease-snappy` ao `@theme` (item 1.3) — 1 linha, habilita
   uso incremental depois.

### Refatorações Estruturais
1. Componente `SubmitLabel` (ou variante `loading` no `Button`) unificando
   os 3 padrões de estado de carregamento (item 1.4) — toca 5 arquivos.
2. Indicador de progresso no `ProviderPage` (item 2.1) — é lógica de UI
   nova, ainda que pequena, dentro do fluxo mais importante do produto.
3. Classe utilitária `.focus-ring` + aplicação nos 17 botões crus (item
   2.2) — mecânico, mas espalhado por 6 arquivos.
4. Áreas de toque de 44px nos ícones de ação da lista de agendamentos
   (item 2.3) — 6 ocorrências em `DashboardHome.tsx`.
