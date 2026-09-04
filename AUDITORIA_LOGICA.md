# Auditoria Lógica — Syncou

Varredura do backend (`server.ts`) e dos fluxos de agendamento no frontend
(`src/pages/ProviderPage.tsx`, `src/pages/DashboardHome.tsx`,
`src/contexts/AuthContext.tsx`) procurando furos de lógica e incoerências —
"o que faz ou não faz sentido", não estética.

**Estado auditado:** commit `6ce33ad`.
**Corrigido em:** `600798c` (autenticação, leva isolada) e `e8f5220`
(coerência de agenda e validação de entrada).

As linhas citadas abaixo são as do commit auditado. Depois das correções elas
mudaram de lugar — a referência serve para entender o achado, não para navegar
o código atual.

---

## 1. Diagnóstico cru

### O que já estava bem resolvido

- A constraint `EXCLUDE USING gist` em `appointments` é a forma correta de
  impedir sobreposição de horário: resolve no banco a corrida entre dois
  clientes reservando o mesmo horário ao mesmo tempo, que validação em
  aplicação não resolve sozinha.
- Rate limiting segmentado por natureza de rota (`authLimiter`, `otpLimiter`,
  `bookingLimiter`, `globalLimiter`) em vez de um limite único global.
- `/api/provider/:slug/appointments` devolve apenas `startAt`, `endAt` e
  `status` — a grade pública consegue calcular disponibilidade sem que o
  endpoint exponha nome, serviço ou preço de quem já agendou.
- O `verifyCronSecret` falha fechado em produção quando `CRON_SECRET` não
  está configurado, em vez de liberar o endpoint.

### O que estava furado

O padrão que se repete: **a mesma regra de negócio escrita em mais de um
lugar, com valores diferentes** — e nenhuma delas sendo a fonte da verdade.
Foi assim com os status de agendamento (três definições de "horário
ocupado"), e assim com a identidade do cliente (telefone obrigatório em um
lugar, opcional em outro).

---

## 2. Crítico

### 2.1 — `/api/auth/google` não verificava nada (bypass total de login)

`server.ts:571-599`. O endpoint lia `email` do corpo da requisição e emitia
um JWT de 7 dias para aquele e-mail. Não havia verificação de token do Google
em lugar nenhum do caminho:

```js
const { email, displayName } = req.body;
if (!email) return res.status(400).json({ error: 'Email não encontrado' });
// ...busca ou cria o usuário com esse e-mail...
const token = jwt.sign({ id, email }, JWT_SECRET, { expiresIn: '7d' });
```

Consequência: uma requisição com `{"email":"vitima@gmail.com"}` devolvia um
token com acesso completo à conta — agenda, clientes, configurações. Funcionava
inclusive contra contas criadas por e-mail/senha, porque a busca era só por
e-mail, o que tornava a senha decoração. Se a conta não existisse, o endpoint
a criava. O `authLimiter` não protegia: bastava uma requisição.

**Correção:** o endpoint passou a exigir um ID token do Firebase, validá-lo com
`firebase-admin` (`getFirebaseAuth(adminApp).verifyIdToken`) e extrair o e-mail
do token assinado. Quando o Firebase Admin não está disponível, recusa com 503
em vez de cair para o comportamento antigo — falha fechada. O frontend passou a
mandar `result.user.getIdToken()` (`src/lib/firebase.ts`) em vez do e-mail.

### 2.2 — `JWT_SECRET` com fallback publicado

`server.ts:146` caía em `'syncou-super-secret-key-has-to-be-secure-1234'`
quando a variável não estava configurada — e esse mesmo valor estava commitado
em `.env.example:15`. Com o segredo conhecido, qualquer pessoa forja um token
válido para qualquer usuário. `DATABASE_URL` e `RECAPTCHA_SECRET_KEY` já tinham
guarda de produção; essa não tinha.

**Correção:** sem a variável, o segredo passa a ser aleatório por boot
(`randomBytes(48)`) com log de erro alto. As sessões morrem a cada reinício —
sintoma visível e barulhento — mas ninguém forja token. O `.env.example` não
publica mais um valor utilizável.

---

## 3. Alto

### 3.1 — Plano pago autoconcedido

`server.ts:696-708`. `POST /api/subscription/upgrade` com `{plan:"gold"}`
gravava o plano Ouro sem qualquer verificação de pagamento. Nenhuma tela do
frontend chamava esse endpoint nem o de downgrade.

**Correção:** ambos removidos. Quando existir cobrança, o upgrade deve ser
consequência de pagamento confirmado (webhook do provedor), nunca de um POST
que o próprio usuário dispara.

### 3.2 — `clientPhone` opcional, sendo a chave de identidade

`server.ts:1355` declarava `clientPhone` como `.optional().nullable()` no
`bookingSchema`, num endpoint público. Duas consequências:

- O limite de 2 agendamentos pendentes (`server.ts:1389`) compara
  `client_phone = $2`; com `null`, a comparação nunca casa e o limite
  **nunca se aplicava**.
- A trava de um-nome-por-telefone começa com `if (clientPhone)` — sem
  telefone, some.

Quem chamasse a API direto, sem passar pelo formulário, escapava das duas.

**Correção:** campo obrigatório, validado como 10 a 15 dígitos. O formulário
público já exigia WhatsApp com máscara, então não houve mudança de UX.

### 3.3 — Agendamento público podia nascer confirmado

`server.ts:1543` inseria `status || 'Pendente'`, com `status` vindo do corpo da
requisição. Uma requisição com `status: 'Confirmado'` criava um agendamento que
pulava a confirmação do prestador — e passava a ser incluído nos lembretes como
compromisso firmado.

**Correção:** o insert grava `'Pendente'` sempre; o campo saiu da
desestruturação do corpo.

### 3.4 — `PUT /api/appointments/:id` aceitava qualquer status

O handler lia `status` direto de `req.body` sem validação, então qualquer string
era gravada. Um valor fora do conjunto esperado quebra silenciosamente todo
filtro, contador e badge que dependem desses nomes.

**Correção:** validação Zod contra o conjunto canônico
`Pendente | Confirmado | Concluído | Cancelado`.

---

## 4. Incoerências de regra de negócio

### 4.1 — Três definições diferentes de "horário ocupado"

Este é o achado central da auditoria.

| Onde | Regra | `Concluído` bloqueava? |
|---|---|---|
| Constraint do banco (`server.ts:353`) | `status IN ('Pendente','Confirmado','scheduled','confirmed',…)` | ❌ não |
| Validação do servidor (`server.ts:1508`) | `status NOT IN ('cancelled','Cancelado')` | ✅ sim |
| Grade do frontend (`ProviderPage.tsx:193`) | `status IN ('Pendente','Confirmado','scheduled','confirmed')` | ❌ não |

Pior que a divergência de status: a grade aplicava uma **tolerância de 5
minutos** (`ProviderPage.tsx:189-194`) que não existia nas outras duas camadas.
Um atendimento terminando às 17:31 fazia a grade oferecer o horário das 17:30;
o cliente clicava e o servidor recusava. E quando a recusa vinha da constraint
do banco (código `23P01`), a mensagem exibida era *"Este horário acabou de ser
reservado, escolha outro"* — que nunca foi verdade: aquele horário era
impossível de reservar, sempre. O cliente batia num beco sem saída sem
entender por quê.

**Correção:** as três camadas passaram a usar a mesma regra — só `Cancelado`
libera o horário — e a tolerância foi removida da grade. `Concluído` bloqueia
em todas: o atendimento aconteceu, o horário foi usado.

Também foi removido um filtro em `ProviderPage.tsx:77` que descartava os
`Concluído` da lista local logo após o fetch, o que fazia a grade oferecer
horário que o servidor recusaria.

### 4.2 — Valores de status em português, inglês e minúsculas

`Pendente`, `Confirmado`, `Concluído`, `Cancelado`, `scheduled`, `confirmed`,
`cancelled`, `completed`, `pendente`, `confirmado` conviviam na mesma coluna.
Toda consulta listava as variantes na mão, e é exatamente dessa listagem manual
que saía o item 4.1.

**Correção:** migração normaliza os valores legados para o conjunto canônico e
o servidor define esse conjunto em um lugar só (`APPOINTMENT_STATUSES`).

As ~40 checagens defensivas do frontend (`a.status === 'confirmed' || a.status
=== 'Confirmado'`) foram **mantidas de propósito**: com os dados normalizados
elas viraram redundantes, mas continuam corretas, e reescrever 40 pontos sem
ambiente local para validar é como se quebra produção.

### 4.3 — Migração era um bloco único (falha em cascata)

`server.ts:340-392` executava dezenas de statements num único `client.query()`.
Em Postgres isso roda numa transação implícita: um statement com erro derrubava
**todos os outros do bloco** por rollback. Como o bloco continha o
`DROP`/`ADD CONSTRAINT` junto da criação de tabelas, um problema na constraint
podia impedir a criação da tabela `clients` — silenciosamente, porque o `catch`
externo só logava e seguia.

**Correção:** a migração virou uma lista de passos nomeados, cada um com sua
própria guarda. Um passo que falha é logado com o nome e não afeta os demais.
O par `DROP`/`ADD` da constraint continua no mesmo passo de propósito: se o
`ADD` falha, o rollback desfaz o `DROP` e a constraint antiga permanece — em vez
de a tabela ficar sem proteção nenhuma contra sobreposição.

### 4.4 — Agendamento expirava em silêncio

`server.ts:58-63` cancelava todo `Pendente` criado há mais de 24h **sem olhar a
data do atendimento**. Quem agendava para dali a três semanas e não era
confirmado em 24h tinha o horário cancelado, e ninguém era avisado: nem o
cliente, que seguia achando que tinha horário marcado, nem o prestador, que não
sabia que a agenda tinha vagado.

**Correção:** só expira agendamento ainda no futuro (cancelar como "expirado"
algo que já passou não faz sentido — aquele horário foi ou não foi usado, não
expirou), e o prestador recebe push com a contagem. A janela de 24h foi mantida:
mudá-la é decisão de produto.

### 4.5 — Lembrete dizia "te aguardamos" para agendamento não confirmado

`server.ts:93-100` selecionava tudo que não estivesse cancelado, incluindo
`Pendente` e `Concluído`, e mandava *"Este é um lembrete do seu agendamento […]
Te aguardamos!"*.

**Correção:** só agendamento `Confirmado` gera lembrete.

**Limitação que permanece:** o lembrete só sai para quem informou e-mail, que é
campo opcional — na prática o alcance é baixo. Resolver isso exige canal pago
(SMS ou WhatsApp Business API); ver seção 6.

### 4.6 — Janela de busca perdia atendimento em curso

`server.ts:1355` filtrava `start_at >= inicio AND start_at <= fim`. Um
atendimento que começou antes do início da janela e ainda estava em curso não
era devolvido, então a grade podia oferecer um horário já ocupado.

**Correção:** o filtro passou a usar `end_at > inicio AND start_at <= fim`.

### 4.7 — `slug` sem validação de formato

`server.ts:857-862` checava apenas duplicidade. Formato — espaço, barra,
acento, maiúscula, nome colidindo com rota — ficava por conta do frontend, que
não é validação para quem chama a API direto. O slug vai para a URL pública
(`/p/:slug`).

**Correção:** schema Zod com normalização (trim + minúscula), formato
`^[a-z0-9]+(?:-[a-z0-9]+)*$`, 3 a 40 caracteres e lista de palavras reservadas.

### 4.8 — Campo opcional não podia ser apagado

`server.ts:876-903` montava o `UPDATE` com `COALESCE($n, valor_atual)` e passava
`data.campo ?? null`. Enviar `null` para limpar a bio, o WhatsApp ou o template
de mensagem mantinha silenciosamente o valor antigo — o usuário salvava, a tela
dizia sucesso, e nada mudava.

**Correção:** o `SET` é montado a partir das chaves realmente presentes no
corpo. A lista de colunas permitidas continua explícita — `plan` e `role` ficam
de fora de propósito, para não virarem escalada de privilégio.

---

## 5. Menor

- **`cors()` sem restrição de origem** (`server.ts:180`). O SPA e a API são
  servidos pela mesma origem (`express.static` + fallback do `index.html`), então
  CORS não era necessário no uso normal. Passou a ser mesma-origem por padrão,
  com `ALLOWED_ORIGINS` para exceção.
- **`GET /api/appointments` sem limite** (`server.ts:959`): devolvia o histórico
  inteiro, sempre. Ganhou `from`/`to` opcionais, mas **as telas ainda pedem
  tudo** — migrá-las é trabalho de frontend que merece leva própria.
- **Cron in-process e também exposto por HTTP.** Com mais de uma instância no
  Railway, executa duplicado. É decisão de topologia, não correção de código.

---

## 6. Pendências que exigem decisão de produto

Itens identificados que **não** foram corrigidos porque a escolha não é técnica:

1. **Checagens de plano seguem comentadas** (`// Disable plan checks for now`)
   em pelo menos três pontos: limite de serviços, limite mensal de agendamentos
   e Google Calendar. O tier pago existe no banco, na UI e nos endpoints, e não
   restringe nada. Reativar limites para usuários que hoje usam sem limite é
   decisão de produto.
2. **Alcance dos lembretes.** Só chega em quem informou e-mail. Verificação e
   notificação por telefone (SMS ou WhatsApp Business API) são serviços pagos
   por mensagem — o custo é por uso, sem mensalidade, mas é despesa pura, sem
   receita associada (diferente do sinal via Pix, onde o custo vem junto com
   dinheiro entrando).
3. **Telefone com DDI.** `11978065974` e `5511978065974` são clientes
   diferentes hoje. Normalizar exige heurística que pode errar em número real.
4. **Janela de 24h da expiração.** Mantida como estava; encurtar ou alongar é
   decisão de negócio.

---

## 7. O que verificar depois do deploy

Em ordem de risco:

1. **Login com Google.** É a mudança mais arriscada da leva. Se
   `FIREBASE_SERVICE_ACCOUNT_BASE64` não estiver correto no Railway, o login
   agora responde 503 em vez de autenticar — falha fechada, de propósito.
2. **`JWT_SECRET` configurado no Railway.** Se não estiver, o log grita e todas
   as sessões caem a cada reinício.
3. **Log do deploy**, procurando `[MIGRATION] Falha no passo`. Se a base tiver
   algum `Concluído` sobreposto a outro agendamento, o passo da constraint falha
   sozinho e a constraint antiga permanece; o resto da migração sobe normal.
4. **Agendar pela página pública.** Grade e servidor devem concordar: todo
   horário oferecido tem que ser reservável.
5. **CORS.** Se algum consumidor externo da API parar de funcionar, é aqui —
   resolve listando a origem em `ALLOWED_ORIGINS`.
