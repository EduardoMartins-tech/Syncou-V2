<p align="center">
  <img src="public/favicon.svg" height="120" alt="Syncou Logo"/>
</p>

# 🚀 Syncou

<p align="center">
  <b>Plataforma inteligente de agendamentos e reuniões online sincronizada com o Google Agenda.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-em%20desenvolvimento-yellow" alt="Status" />
  <img src="https://img.shields.io/badge/version-1.0-blue" alt="Version" />
  <img src="https://img.shields.io/badge/TypeScript-Language-blue" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-Frontend-61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Node.js-Backend-339933" alt="Node.js" />
  <img src="https://img.shields.io/badge/PostgreSQL-Database-336791" alt="PostgreSQL" />
</p>

---

## 📌 Sobre o Projeto

O **Syncou** é uma plataforma web desenvolvida para **modernizar e simplificar a gestão de agendamentos para profissionais autônomos e empresas**.

A proposta é centralizar em um único sistema:

- 👥 Página pública de agendamentos personalizada
- 📅 Gestão de disponibilidade e horários de trabalho
- 🏢 Gerenciamento completo de serviços prestados
- 🔄 Sincronização e integração bidirecional com Google Calendar
- 💬 Facilidade de comunicação com clientes via templates de WhatsApp

---

## 🎯 Objetivos

### 🔹 Objetivo Geral
Criar uma plataforma eficiente e acessível para a gestão de agendamentos, promovendo **organização, otimização de tempo e uma melhor experiência para os clientes**.

### 🔹 Objetivos Específicos

- 📊 Centralizar a agenda do profissional
- 💬 Melhorar comunicação com clientes sobre remarcações e cancelamentos
- 🔐 Garantir gestão segura de horários, prevenindo conflitos (overbooking)
- ⚙️ Automatizar a sincronização com ferramentas de terceiros (Google Calendar)
- 🌍 Fornecer uma interface moderna, amigável e responsiva

---

## 🧰 Tecnologias

<p align="center">

| Tecnologia | Uso |
|-----------|-----|
| React + Vite | Front-end e interface interativa |
| TypeScript | Tipagem estática e segurança do código |
| Tailwind CSS | Estilização, Design System e responsividade |
| Node.js / Express | Back-end e APIs REST |
| PostgreSQL | Banco de dados relacional (via biblioteca `pg`) |
| Google Calendar API | Autenticação e sincronização de eventos |

</p>

## 🌟 Funcionalidades Principais

- ✅ **Página Pública Personalizada**: Link exclusivo (`/p/:slug`) onde clientes visualizam serviços e agendam horários de forma totalmente intuitiva.
- 🔄 **Sincronização com o Google Calendar**: Conexão segura permitindo adição automática de eventos e prevenção de conflitos.
- 📅 **Gestão Inteligente de Disponibilidade**: 
  - Regras de dias úteis e horários recorrentes
  - Permissão ou bloqueio automático de agendamentos em feriados nacionais
  - Gestão de folgas e overrides
- 📦 **Múltiplos Serviços**: Cadastro de serviços com duração, buffer de horários restritos e variação de preço.
- 🚫 **Prevenção de Conflitos (Overbooking)**: Checagem server-side que assegura agendamentos sem colisão.
- 💬 **Comunicação por WhatsApp**: Templates rápidos guiando clientes e avisando em caso de alterações via interface.
- 📊 **Exportação de Dados**: Geração e download de relatórios em formato CSV.

---

## 🏗️ Arquitetura do Sistema

O projeto foi construído utilizando uma arquitetura Full-Stack onde o código-fonte de frontend e backend coexistem para garantir velocidade de prototipação.

```text
Syncou/
├── public/                 # Assets estáticos (ícones, favicons)
├── src/                    # Código do Frontend (React)
│   ├── components/         # Componentes isolados e reutilizáveis (UI)
│   ├── contexts/           # Gestão de contexto global (ex: AuthContext)
│   ├── lib/                # Arquivos utilitários (cn, etc)
│   └── pages/              # Páginas da aplicação
│       ├── DashboardHome.tsx      # Visão geral de dashboard
│       ├── DashboardCalendar.tsx  # Visão de calendário e agendamentos
│       ├── DashboardSettings.tsx  # Configurações do serviço
│       ├── LandingPage.tsx        # Tela inicial de marketing/login
│       └── ProviderPage.tsx       # Página pública do profissional
├── server.ts               # Servidor Backend (API Express + Vite Middleware)
├── vite.config.ts          # Configurações do empacotador Frontend
├── package.json            # Dependências e scripts de automação
└── README.md
```

### Como o Agendamento Funciona (Regra de Negócio)

1. O cliente acessa a **Página do Provedor** (`/p/:slug`).
2. O sistema filtra os dias disponíveis baseado nas configurações do profissional (horários de rotina, folgas, feriados).
3. Ao selecionar um dia, os "slots" de horário consideram a duração de fato e o tempo de pausa (buffer), consultando o PostgreSQL para bloqueio em tempo real.
4. O cliente informa os dados de contato e finaliza.
5. Uma chamada assíncrona reserva o horário definitivamente na base e tenta a criação via Google Calendar (caso conectado).

---

## 💻 Como rodar localmente

### Passo a passo

```bash
# Clone ou baixe o repositório do projeto
# Acesse a pasta do diretório via terminal

# 1. Instale as dependências
npm install

# 2. Inicie o servidor de desenvolvimento e Vite (Frontend + Backend)
npm run dev

# 3. Compile para produção (Opcional)
npm run build

# 4. Rode a versão de produção gerada (Opcional)
npm run start
```
<p align="center">Acesse no navegador: <code>http://localhost:3000/</code></p>

---

## 📐 Guia de Alta Escala, Performance e Segurança (Perspectiva Sênior)

Como Engenheiro de Software Sênior, Analista de Infraestrutura e Arquiteto de Dados, estruturei e implementei políticas de segurança e escala no **Syncou** para transformá-lo em uma solução robusta, imune a ataques de degradação e pronta para lidar com altos volumes concorrentes de tráfego. Abaixo detalho a arquitetura inserida e o plano de escala sugerido:

---

### 🛡️ 1. Segurança & Blindagem de Secrets (Implementado)
Em aplicações full-stack, um dos vetores mais fáceis de vazamento de credenciais decorre do empacotamento de variáveis de ambiente no build estático do cliente pelo Vite.
* **Solução**: Removemos a injeção estática do `define` das configurações do Vite (como o `GEMINI_API_KEY`).
* **Implementação Segura**: Toda chamada de terceiros (integração de API de Calendário, e-mails SMTP ou IA) ocorre estritamente **no lado do servidor** (`server.ts`). Chaves secretas permanecem restritas à memória segura do ambiente do container NodeJS (`process.env`) e nunca chegam aos arquivos distribuídos no front-end.

---

### 🚦 2. Defesa Ativa Contra DDoS, Brute-Force e Spam (Implementado)
Buscando impedir que agentes maliciosos usem robôs para congestionar nosso banco de dados enviando milhares de agendamentos fictícios, gerando dezenas de e-mails de spam (ataques de fadiga de custos) ou forçando logins repetitivos, implementamos um sistema de **Rate Limiting Slide-Window**:
* **Algoritmo de Sliding-Window (Janela Deslizante em Memória)**: Desenvolvemos um controle modular em `/server/rateLimiter.ts` que monitora as requisições em milissegundos por IP. Diferente de limitadores de janela fixa (que reiniciam de tempos em tempos e permitem burlar o limite atacando nos segundos finais e iniciais do frame), o Sliding-Window valida a exatidão retrospectiva do tempo total de forma cirúrgica.
* **Divisão de Políticas Defensivas**:
  1. **Global Rate Limiter (Geral)**: Limita todas as requisições gerais a **180 por minuto** por IP, protegendo a integridade geral do servidor HTTP de ataques de flooding.
  2. **Auth & Register Limiter (Segurança de Conta)**: Limita tentativas em rotas de autenticação, registro e login com Google à marca restrita de **10 requisições a cada 5 minutos**. Ideal para prevenir ataques de força bruta visando obter credenciais de profissionais do ecossistema.
  3. **OTP Spam Limiter (Prevenção de Flood de OTP)**: Protege a geração de OTPs em `/api/auth/send-otp` limitando a **5 tentativas a cada 5 minutos** por IP. Isso evita que robôs utilizem a API para bombardear caixas de entrada de e-mails com códigos falsos.
  4. **Booking Spam Limiter (Sequestro de Agenda)**: Limita os agendamentos públicos (`/api/provider/:slug/book`) a no máximo **8 conclusões a cada 10 minutos** por IP. Isso impede de forma proativa que scripts maliciosos façam centenas de reservas e esgotem instantaneamente todos os horários livres de um profissional.

---

### 💾 3. Modelagem de Dados e Indexação de Alta Performance (Implementado)
Operações de agendamento exigem validações frequentes de sobreposição espacial de horários (`SELECT ... WHERE start_at < B AND end_at > A`). Sem a indexação adequada, o PostgreSQL realiza um *Sequential Full Table Scan* — varrendo sequencialmente todos os registros armazenados do banco — degradando exponencialmente a performance do agendamento com a escala do app.
* **Solução**: Introduzimos índices compostos em árvore Balanceada (B-Tree):
  ```sql
  CREATE INDEX IF NOT EXISTS idx_services_provider ON services (provider_id);
  CREATE INDEX IF NOT EXISTS idx_appointments_provider_dates ON appointments (provider_id, start_at, end_at);
  ```
* **Impacto**: O algoritmo de checagem e prevenção de overbooking de horários agora opera em tempo logarítmico **$O(\log N)$** em vez de **$O(N)$**. Consultas que demorariam segundos em bancos populosos agora retornam em milissegundos.

---

### 📈 4. Planejamento de Escala Horizontal (Próximos Passos)

Em cenários onde um provedor com alta relevância social compartilha o link `/p/:slug` em sua rede, picos gigantescos de acessos concorrentes podem sobrecarregar um único servidor. Para escalar, desenhamos o ecossistema distribuído a seguir:

```text
               ┌───────────────────────┐
               │    Cloudflare WAF     │ <-- Filtro DDoS L3/L4/L7 na Edge (Borda)
               └───────────┬───────────┘
                           │
               ┌───────────▼───────────┐
               │     Load Balancer     │ <-- Distribuidor de Carga Round-Robin
               └───────────┬───────────┘
                           │
      ┌────────────────────┼────────────────────┐
      │                    │                    │
┌─────▼───────┐      ┌─────▼───────┐      ┌─────▼───────┐
│ Express Node│      │ Express Node│      │ Express Node│ <-- Stateless Containers (Cloud Run)
└─────┬───────┘      └─────┬───────┘      └─────┬───────┘
      │                    │                    │
      └────────────┬───────┴────────────┬───────┘
                   │                    │
             ┌─────▼─────┐        ┌─────▼─────┐
             │ Redis CACHE│        │ pgBouncer │ <-- Pooling de Conexões Externas
             └───────────┘        └─────┬─────┘
                                        │
                                  ┌─────▼─────┐
                                  │ PostgreSQL│ <-- Estrutura Multizona com Réplicas
                                  └───────────┘
```

#### A. Servidores Stateless & Proxy Redis para Limitações
* **Nós de Aplicação Sem Estado**: Os contêineres Express devem rodar de forma completamente descentralizada em ambientes com auto-escalonamento horizontal baseado em demanda (como Cloud Run ou AWS ECS).
* **Distribuição Centralizada de Estado**: No momento em que múltiplos servidores entram em jogo, a memória volátil local é dividida. Para unificar o Sliding-Window de rate limit, substitui-se o Map local por um cluster distribuído de **Redis** (`ioredis` conectado ao middleware), consolidando a contagem de requisições instantâneas de toda a infraestrutura em um único hub ultrarrápido em memória.

#### B. Alta Capacidade de Banco de Dados
* **Uso de pgBouncer**: Para impedir picos excessivos que estouram o limite de processos do PostgreSQL, o pgBouncer atua como um multiplexador de conexões, reusando canais abertos e contendo a latência.
* **Divisão de Leitura e Escrita**:
  * **Master DB Node (Escrita)**: Exclusivo para operações DML/transações (criar ou cancelar agendamentos).
  * **Replica DB Nodes (Leitura)**: Grades de horários e listagem de serviços públicos consultam apenas as réplicas de leitura, que possuem replicação assíncrona, eliminando sobrecarga no nó master de gravação.

#### C. Cache em Borda e Caching Geral
* **Edge Proxy (Cloudflare)**: Cacheia todos os estáticos compilados na ponta e atua filtrando ataques volumétricos SYN/UDP flood de forma inteligente na borda da internet.
* **Cache de Grade de Slots**: As listagens dos horários de profissionais podem ser cacheadas no Redis com expiração passiva inteligente (limpa-se o cache quando um profissional agenda ou redefine suas configurações), garantindo que picos de carregamento de páginas usem praticamente zero processamento local do backend. 

