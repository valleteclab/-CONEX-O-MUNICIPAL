# CONEXÃO MUNICIPAL — Software Design Document (SDD)

> **Portal Inteligente de Negócios e Capacitação Empresarial**
> Município: Luís Eduardo Magalhães — BA
> Versão: **2.0** | Abril 2026 | Classificação: Confidencial  
> *v2.0: inclusão do **ERP empresarial nativo** (MEI e pequenas empresas) — estoque, financeiro, fiscal NF-e/NFC-e (SEFAZ), ondas de entrega A/B/C.*

---

## Sumário

1. [Introdução](#1-introdução)
2. [Visão Geral do Sistema](#2-visão-geral-do-sistema)
3. [Objetivos e Escopo](#3-objetivos-e-escopo)
4. [Arquitetura do Sistema](#4-arquitetura-do-sistema)
5. [Modelagem de Dados](#5-modelagem-de-dados)
   - [5.4 Modelagem ERP (schema tenant)](#54-modelagem-erp-schema-tenant)
6. [Especificação dos Módulos](#6-especificação-dos-módulos)
   - [6.7 Módulo: ERP Empresarial Nativo](#67-módulo-erp-empresarial-nativo)
7. [Integração de Inteligência Artificial](#7-integração-de-inteligência-artificial)
8. [Perfis de Usuário e Controle de Acesso (RBAC)](#8-perfis-de-usuário-e-controle-de-acesso-rbac)
9. [Requisitos Não-Funcionais](#9-requisitos-não-funcionais)
10. [Design System e UI/UX](#10-design-system-e-uiux)
11. [Integrações Externas](#11-integrações-externas)
12. [Estratégia de Testes](#12-estratégia-de-testes)
13. [Plano de Deploy e Infraestrutura](#13-plano-de-deploy-e-infraestrutura)
14. [Roadmap e Plano de Tarefas](#14-roadmap-e-plano-de-tarefas)
15. [Métricas de Sucesso (KPIs)](#15-métricas-de-sucesso-kpis)
16. [Riscos e Mitigações](#16-riscos-e-mitigações)
17. [Glossário](#17-glossário)

---

## 1. Introdução

### 1.1 Propósito do Documento

Este Software Design Document (SDD) descreve a arquitetura, especificações técnicas, módulos funcionais e plano de tarefas do sistema **Conexão Municipal**. Serve como fonte única de verdade para o time de desenvolvimento, stakeholders e gestores do projeto.

### 1.2 Escopo do Documento

Cobre todos os aspectos técnicos e funcionais do sistema: arquitetura multitenant, modelagem de dados, APIs, módulos de negócio, integrações de IA, design system, infraestrutura e roadmap de implementação.

### 1.3 Público-Alvo

- Equipe de desenvolvimento (frontend, backend, DevOps)
- Product Owner / Gestão de Produto
- Prefeitura Municipal de Luís Eduardo Magalhães
- Stakeholders e parceiros técnicos

### 1.4 Definições e Convenções

| Convenção | Significado |
|-----------|-------------|
| `[P0]` | Prioridade crítica — bloqueia outras entregas |
| `[P1]` | Prioridade alta — essencial para o MVP |
| `[P2]` | Prioridade média — necessário para lançamento completo |
| `[P3]` | Prioridade baixa — desejável, pode ser pós-lançamento |
| `MUST` | Obrigatório para a fase indicada |
| `SHOULD` | Recomendado, importante mas não bloqueante |
| `COULD` | Desejável se houver tempo |
| `WON'T` | Fora do escopo atual |

### 1.5 Referências

- Documento de Descrição do Sistema v1.0 (Março 2026)
- Repositório Git: `conexao-municipal/`
- Next.js 14 Documentation
- NestJS Documentation
- PostgreSQL 16 Documentation
- Anthropic Claude API Documentation

---

## 2. Visão Geral do Sistema

### 2.1 Descrição

O Conexão Municipal é uma plataforma digital multitenant, integrada com Inteligência Artificial, que funciona como ecossistema central de negócios para municípios. Conecta cidadãos, microempreendedores individuais (MEI), empresas locais e gestão pública em um único ambiente digital inteligente.

### 2.2 Problema

| # | Problema | Impacto |
|---|----------|---------|
| 1 | Cidadãos não encontram prestadores de serviços locais qualificados | Fuga de receita para outros municípios |
| 2 | MEIs e pequenas empresas não têm vitrine digital | Invisibilidade comercial |
| 3 | Cotação e contratação de serviços é desorganizada | Desperdício de tempo e dinheiro |
| 4 | Falta de treinamentos empresariais acessíveis | Baixa capacitação profissional |
| 5 | Dados econômicos dispersos e sem inteligência | Gestão pública sem embasamento |

### 2.3 Solução — 5 Pilares

```
┌──────────────────────────────────────────────────────────────────┐
│                      CONEXÃO MUNICIPAL                          │
├──────────┬──────────┬──────────┬──────────┬─────────────────────┤
│Diretório │ Central  │ Academia │ Painel   │ Assistente IA       │
│Inteligent│ Cotações │Empresar. │Inteligên.│ Municipal           │
│          │          │          │          │                     │
│Catálogo  │Solicitar │Cursos e  │Dashboard │Chatbot 24/7         │
│MEI/Emp   │orçamentos│trilhas   │analítico │Portal+WhatsApp      │
│Busca IA  │Comparar  │adaptativ.│tempo real│Orientação           │
│Avaliações│propostas │certificad│predições │multicanal           │
└──────────┴──────────┴──────────┴──────────┴─────────────────────┘
         ▲                                           ▲
         │        ┌─────────────────────┐            │
         └────────│  Inteligência       │────────────┘
                  │  Artificial (IA)    │
                  │  NLP · Recomendação │
                  │  Análise Sentimento │
                  │  Predição · Geração │
                  └─────────────────────┘
```

### 2.4 Stakeholders

| Stakeholder | Papel | Interesse |
|-------------|-------|-----------|
| Prefeitura Municipal LEM | Sponsor / Cliente | Desenvolvimento econômico, dados |
| Cidadãos | Usuário final | Encontrar serviços, solicitar cotações |
| MEIs | Usuário/Beneficiário | Visibilidade, clientes, capacitação |
| Empresas | Usuário/Beneficiário | Cotações, treinamentos, dados |
| SEBRAE / SENAI | Parceiro potencial | Conteúdo educacional |
| Time de Desenvolvimento | Executor | Entregar software de qualidade |

---

## 3. Objetivos e Escopo

### 3.1 Objetivos do Projeto

| ID | Objetivo | Métrica de Sucesso |
|----|----------|--------------------|
| OBJ-01 | Criar catálogo digital de negócios do município | 500+ negócios em 6 meses |
| OBJ-02 | Facilitar contratação de serviços locais | 200+ cotações/mês em 6 meses |
| OBJ-03 | Capacitar empreendedores com treinamentos | 300+ alunos ativos em 6 meses |
| OBJ-04 | Fornecer inteligência econômica à gestão pública | Dashboard ativo com 10+ indicadores |
| OBJ-05 | Atendimento 24/7 via IA | >75% resolução pelo chatbot |
| OBJ-06 | Arquitetura replicável para outros municípios | Provisionar novo tenant em <1h |
| OBJ-07 | ERP nativo para MEI e pequenas empresas no portal | Uso ativo do módulo ERP por 100+ empresas em 12 meses; NF-e emitida via plataforma conforme meta Onda B |

### 3.2 Dentro do Escopo

- Portal web responsivo (PWA)
- API REST com Swagger
- Banco de dados multitenant (PostgreSQL)
- Cinco pilares de negócio do portal (diretório, cotações, academia, painel público, assistente IA) — ver §6.1–6.6
- **ERP empresarial nativo** para perfis MEI e Empresa no **schema do tenant**: cadastros (produtos, serviços, clientes, fornecedores), **estoque** (movimentações, inventário, alertas), **vendas e pedidos**, **compras**, **financeiro** (contas a pagar/receber, fluxo de caixa), **fiscal** NF-e/NFC-e com integração **SEFAZ** — entregue em **ondas A/B/C** (ver §6.7)
- Integração com IA (Anthropic Claude)
- Chatbot WhatsApp
- Painel administrativo (município) + **área ERP** (empresa)
- Documentação técnica

### 3.3 Fora do Escopo ou Fase Posterior

- Aplicativo nativo iOS/Android (será PWA)
- Processamento de pagamentos (PIX será fase futura; integração a definir após ERP financeiro)
- Integração com sistemas legados da prefeitura
- Módulo de licitações governamentais completo
- App desktop
- **Obrigações acessórias completas** (SPED Fiscal/Contábil, eSocial em todos os cenários) — **fora** da primeira entrega do ERP; evolução por roadmap
- **NFS-e municipal** de serviços: **Onda C** (API por município ou agregador); não bloqueia Ondas A e B de produto NFC-e/NF-e estadual

---

## 4. Arquitetura do Sistema

### 4.1 Visão Arquitetural

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTES                             │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  ┌───────────┐  │
│  │ Browser │  │  Mobile  │  │ WhatsApp  │  │   Admin   │  │
│  │  (PWA)  │  │  (PWA)   │  │  Business │  │  Console  │  │
│  └────┬────┘  └────┬─────┘  └─────┬─────┘  └─────┬─────┘  │
└───────┼────────────┼──────────────┼───────────────┼────────┘
        │            │              │               │
        ▼            ▼              ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                      CDN / NGINX                            │
│              (Load Balancer + SSL + Cache)                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
│   FRONTEND   │  │   BACKEND    │  │   WORKERS        │
│   Next.js 14 │  │   NestJS     │  │   (Bull/Redis)   │
│              │  │              │  │                  │
│ - SSR/SSG    │  │ - REST API   │  │ - Email queue    │
│ - React 18   │  │ - Swagger    │  │ - SMS queue      │
│ - Tailwind   │  │ - JWT Auth   │  │ - AI processing  │
│ - TypeScript │  │ - RBAC       │  │ - Reports gen    │
│              │  │ - Middleware │  │ - Notifications  │
│              │  │   Multitenant│  │                  │
└──────────────┘  └──────┬───────┘  └────────┬─────────┘
                         │                    │
        ┌────────────────┼────────────────────┤
        ▼                ▼                    ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
│  PostgreSQL  │  │    Redis     │  │  Elasticsearch   │
│      16      │  │      7       │  │     8.12         │
│              │  │              │  │                  │
│ - public     │  │ - Sessions   │  │ - Full-text      │
│   (global)   │  │ - Cache      │  │   search         │
│ - tenant_*   │  │ - Queues     │  │ - Autocomplete   │
│   (isolado)  │  │ - Rate limit │  │ - Geo queries    │
└──────────────┘  └──────────────┘  └──────────────────┘
        │
        ▼
┌──────────────────────────────────────────┐
│          SERVIÇOS EXTERNOS               │
│  ┌──────────┐ ┌───────┐ ┌─────────────┐ │
│  │Anthropic │ │ S3 /  │ │  WhatsApp   │ │
│  │Claude API│ │Storage│ │ Business API│ │
│  └──────────┘ └───────┘ └─────────────┘ │
└──────────────────────────────────────────┘
```

### 4.2 Stack Tecnológico

| Camada | Tecnologia | Versão | Justificativa |
|--------|-----------|--------|---------------|
| **Frontend** | Next.js | 14.x | SSR/SSG, App Router, RSC |
| **Frontend** | React | 18.x | Component model, hooks |
| **Frontend** | TypeScript | 5.x | Type safety |
| **Frontend** | Tailwind CSS | 3.4 | Utility-first, design system |
| **Backend** | NestJS | 10.x | Modular, TypeScript-native, DI |
| **Backend** | TypeORM | 0.3 | PostgreSQL ORM com decorators |
| **Backend** | Passport.js | 0.7 | JWT authentication |
| **Database** | PostgreSQL | 16 | Multitenant schemas, JSON, FTS |
| **Cache** | Redis | 7 | Sessions, cache, queues |
| **Search** | Elasticsearch | 8.12 | Full-text search, geo |
| **IA** | Anthropic Claude | Sonnet 4 | NLP, geração, análise |
| **Infra** | Docker | 24.x | Containerização |
| **Infra** | Nginx | 1.25 | Reverse proxy, SSL |

### 4.3 Arquitetura Multitenant

**Estratégia: Schema-per-Tenant (PostgreSQL)**

```
PostgreSQL Database: conexao_municipal
│
├── Schema: public (GLOBAL)
│   ├── tenants              → Cadastro de municípios
│   ├── users                → Usuários (auth global)
│   ├── user_tenants         → Relação N:N user ↔ tenant
│   ├── refresh_tokens       → JWT refresh tokens
│   └── plans                → Planos de assinatura
│
├── Schema: tenant_luis_eduardo_magalhaes
│   ├── businesses           → Negócios (MEIs + empresas)
│   ├── categories           → Categorias de negócios
│   ├── business_gallery     → Fotos/portfólio
│   ├── business_services    → Serviços oferecidos
│   ├── reviews              → Avaliações
│   ├── quotations           → Solicitações de cotação
│   ├── quotation_proposals  → Propostas de fornecedores
│   ├── courses              → Cursos da academia
│   ├── lessons              → Aulas
│   ├── enrollments          → Matrículas
│   ├── notifications        → Notificações
│   ├── chat_messages        → Histórico chatbot IA
│   └── activity_log         → Log de atividades
│
├── Schema: tenant_barreiras (FUTURO)
│   └── (mesma estrutura clonada via função)
│
└── Schema: tenant_template
    └── (template base para novos tenants)
```

**Resolução de Tenant (ordem de prioridade):**
1. Header `X-Tenant-ID`
2. Subdomínio (ex: `luiseduardo.conexaomunicipal.com.br`)
3. Query parameter `?tenant=slug`

**Provisioning de novo tenant:**
```sql
SELECT public.create_tenant_schema('nome_do_municipio');
```

### 4.4 Estrutura do Repositório

```
conexao-municipal/
├── apps/
│   ├── web/                          # Frontend Next.js
│   │   ├── src/
│   │   │   ├── app/                  # App Router (pages)
│   │   │   │   ├── auth/             # Login, registro, recuperação
│   │   │   │   ├── dashboard/        # Dashboard do usuário
│   │   │   │   ├── diretorio/        # Módulo Diretório
│   │   │   │   ├── cotacoes/         # Módulo Cotações
│   │   │   │   ├── academia/         # Módulo Academia
│   │   │   │   ├── painel/           # Módulo Painel Inteligência
│   │   │   │   ├── layout.tsx        # Root layout
│   │   │   │   └── page.tsx          # Landing page
│   │   │   ├── components/
│   │   │   │   ├── ui/               # Componentes base (Button, Input, Card...)
│   │   │   │   ├── layout/           # Header, Footer, Sidebar, Nav
│   │   │   │   └── shared/           # Componentes reutilizáveis
│   │   │   ├── lib/                  # Utils, API client, helpers
│   │   │   ├── hooks/                # Custom React hooks
│   │   │   ├── styles/               # CSS global, tokens
│   │   │   └── types/                # TypeScript types locais
│   │   ├── public/                   # Assets estáticos
│   │   ├── tailwind.config.js
│   │   ├── next.config.js
│   │   └── package.json
│   │
│   └── api/                          # Backend NestJS
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/             # Autenticação e autorização
│       │   │   │   ├── auth.module.ts
│       │   │   │   ├── auth.controller.ts
│       │   │   │   ├── auth.service.ts
│       │   │   │   ├── dto/
│       │   │   │   ├── guards/
│       │   │   │   └── strategies/
│       │   │   ├── tenants/          # Gestão de tenants
│       │   │   ├── users/            # Gestão de usuários
│       │   │   ├── businesses/       # Diretório de negócios
│       │   │   ├── quotations/       # Central de cotações
│       │   │   ├── academy/          # Academia empresarial
│       │   │   └── analytics/        # Painel de inteligência
│       │   ├── common/
│       │   │   ├── middleware/        # Tenant resolver
│       │   │   ├── decorators/       # Custom decorators
│       │   │   ├── guards/           # Auth, Role guards
│       │   │   ├── interceptors/     # Logging, transform
│       │   │   ├── pipes/            # Validation
│       │   │   └── filters/          # Exception filters
│       │   ├── database/
│       │   │   ├── entities/         # TypeORM entities
│       │   │   ├── migrations/       # DB migrations
│       │   │   └── seeds/            # Seed data
│       │   ├── config/               # Environment config
│       │   ├── app.module.ts
│       │   └── main.ts
│       ├── test/
│       └── package.json
│
├── packages/
│   └── shared/
│       └── src/
│           └── types.ts              # Tipos compartilhados
│
├── infra/
│   ├── docker/
│   │   └── init.sql                  # Schema initialization
│   └── nginx/
│       └── nginx.conf
│
├── docs/                             # Documentação
│   └── SDD.md                        # Este documento
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## 5. Modelagem de Dados

### 5.1 Diagrama de Entidades (Schema Público)

```
┌──────────────────────┐      ┌──────────────────────┐
│       TENANTS         │      │        PLANS          │
├──────────────────────┤      ├──────────────────────┤
│ id          UUID PK  │      │ id          UUID PK  │
│ name        VARCHAR   │      │ name        VARCHAR   │
│ slug        VARCHAR U │      │ slug        VARCHAR U │
│ domain      VARCHAR   │      │ price_monthly DECIMAL │
│ state       CHAR(2)   │      │ features    JSONB     │
│ city        VARCHAR   │      │ max_users   INT       │
│ logo_url    TEXT      │      │ max_businesses INT    │
│ primary_color VARCHAR │      │ is_active   BOOL      │
│ secondary_color VARCH │      └──────────────────────┘
│ plan        VARCHAR   │
│ is_active   BOOL      │
│ settings    JSONB     │
│ created_at  TIMESTAMPTZ│
│ updated_at  TIMESTAMPTZ│
└──────────┬───────────┘
           │ 1:N
           ▼
┌──────────────────────┐      ┌──────────────────────┐
│    USER_TENANTS       │      │   REFRESH_TOKENS      │
├──────────────────────┤      ├──────────────────────┤
│ id          UUID PK  │      │ id          UUID PK  │
│ user_id     UUID FK  │──┐   │ user_id     UUID FK  │──┐
│ tenant_id   UUID FK  │  │   │ token       VARCHAR U │  │
│ role        VARCHAR   │  │   │ expires_at  TIMESTAMPTZ│  │
│ is_active   BOOL      │  │   └──────────────────────┘  │
│ joined_at   TIMESTAMPTZ│  │                             │
└──────────────────────┘  │                             │
                          ▼                             ▼
                 ┌──────────────────────┐
                 │        USERS          │
                 ├──────────────────────┤
                 │ id          UUID PK  │
                 │ email       VARCHAR U │
                 │ phone       VARCHAR   │
                 │ password_hash VARCHAR │
                 │ full_name   VARCHAR   │
                 │ avatar_url  TEXT      │
                 │ role        VARCHAR   │
                 │ is_active   BOOL      │
                 │ email_verified BOOL   │
                 │ phone_verified BOOL   │
                 │ last_login  TIMESTAMPTZ│
                 │ metadata    JSONB     │
                 │ created_at  TIMESTAMPTZ│
                 │ updated_at  TIMESTAMPTZ│
                 └──────────────────────┘
```

### 5.2 Diagrama de Entidades (Schema Tenant)

```
┌────────────────────┐    ┌──────────────────┐     ┌──────────────────┐
│    CATEGORIES       │    │  BUSINESSES       │     │    REVIEWS        │
├────────────────────┤    ├──────────────────┤     ├──────────────────┤
│ id       UUID PK   │◄──│ id       UUID PK │──►  │ id       UUID PK │
│ name     VARCHAR    │    │ user_id  UUID FK │     │ business_id FK   │
│ slug     VARCHAR    │    │ type     VARCHAR  │     │ user_id  UUID FK │
│ icon     VARCHAR    │    │ trade_name VARCH  │     │ rating   INT 1-5 │
│ color    VARCHAR    │    │ legal_name VARCH  │     │ comment  TEXT     │
│ parent_id UUID FK   │    │ cnpj     VARCHAR U│     │ reply    TEXT     │
│ sort_order INT      │    │ description TEXT  │     │ ai_sentiment VAR │
└────────────────────┘    │ category_id FK   │     │ ai_sent_score DEC│
                          │ phone    VARCHAR  │     │ is_verified BOOL │
┌────────────────────┐    │ whatsapp VARCHAR  │     │ created_at TS    │
│ BUSINESS_GALLERY    │    │ address_* VARCHAR │     └──────────────────┘
├────────────────────┤    │ lat/lng  DECIMAL  │
│ id       UUID PK   │    │ working_hours JSNB│     ┌──────────────────┐
│ business_id FK     │◄──│ tags     TEXT[]   │     │BUSINESS_SERVICES  │
│ image_url TEXT     │    │ is_verified BOOL  │──►  ├──────────────────┤
│ caption   VARCHAR   │    │ avg_rating DECIMAL│     │ id       UUID PK │
│ sort_order INT      │    │ total_reviews INT │     │ business_id FK   │
└────────────────────┘    │ ai_quality_score  │     │ name     VARCHAR  │
                          │ created_at TS     │     │ description TEXT  │
                          └──────────────────┘     │ price_min DECIMAL │
                                                    │ price_max DECIMAL │
                                                    │ price_type VARCHAR│
                                                    └──────────────────┘

┌────────────────────┐    ┌──────────────────────┐
│    QUOTATIONS       │    │ QUOTATION_PROPOSALS   │
├────────────────────┤    ├──────────────────────┤
│ id       UUID PK   │──►│ id          UUID PK  │
│ requester_id FK    │    │ quotation_id UUID FK │
│ title    VARCHAR    │    │ business_id  UUID FK │
│ description TEXT   │    │ price       DECIMAL  │
│ category_id FK     │    │ description  TEXT    │
│ budget_min DECIMAL │    │ estimated_days INT   │
│ budget_max DECIMAL │    │ warranty_days INT    │
│ deadline   DATE    │    │ status      VARCHAR  │
│ urgency   VARCHAR   │    │ is_selected BOOL     │
│ status    VARCHAR   │    │ ai_value_score DEC   │
│ ai_structured JSONB │    │ created_at  TS       │
│ ai_suggested_price  │    └──────────────────────┘
│ total_proposals INT │
│ created_at TS       │
└────────────────────┘

┌────────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│     COURSES         │    │     LESSONS       │    │   ENROLLMENTS     │
├────────────────────┤    ├──────────────────┤    ├──────────────────┤
│ id       UUID PK   │──►│ id       UUID PK │    │ id       UUID PK │
│ title    VARCHAR    │    │ course_id FK     │    │ user_id  UUID FK │
│ slug     VARCHAR    │    │ title    VARCHAR  │    │ course_id FK     │
│ description TEXT   │    │ content  TEXT     │    │ progress_pct DEC │
│ category VARCHAR    │    │ video_url TEXT   │    │ completed_lessons│
│ difficulty VARCHAR  │    │ duration_min INT │    │ status   VARCHAR  │
│ duration_hrs DEC   │    │ sort_order INT   │    │ certificate_url  │
│ instructor_name    │    │ is_free_preview  │    │ started_at TS    │
│ is_free   BOOL      │    └──────────────────┘    │ completed_at TS  │
│ total_enrolled INT  │                            └──────────────────┘
│ avg_rating DECIMAL  │
└────────────────────┘

┌────────────────────┐    ┌──────────────────┐
│  NOTIFICATIONS      │    │   CHAT_MESSAGES   │
├────────────────────┤    ├──────────────────┤
│ id       UUID PK   │    │ id       UUID PK │
│ user_id  UUID FK   │    │ user_id  UUID FK │
│ type     VARCHAR    │    │ session_id VARCH │
│ title    VARCHAR    │    │ role     VARCHAR  │
│ body     TEXT       │    │ content  TEXT     │
│ data     JSONB      │    │ metadata JSONB   │
│ is_read  BOOL       │    │ created_at TS    │
│ created_at TS       │    └──────────────────┘
└────────────────────┘

┌────────────────────┐
│   ACTIVITY_LOG      │
├────────────────────┤
│ id       UUID PK   │
│ user_id  UUID FK   │
│ action   VARCHAR    │
│ entity_type VARCHAR │
│ entity_id UUID     │
│ metadata JSONB     │
│ ip_address INET    │
│ created_at TS      │
└────────────────────┘
```

### 5.3 Índices Críticos

| Tabela | Índice | Tipo | Justificativa |
|--------|--------|------|---------------|
| businesses | `trade_name + description + short_description` | GIN (tsvector) | Full-text search em português |
| businesses | `tags` | GIN | Busca por tags |
| businesses | `avg_rating DESC` | B-tree | Ordenação por avaliação |
| businesses | `is_active WHERE true` | Partial | Filtrar apenas ativos |
| reviews | `business_id` | B-tree | Lookup por negócio |
| quotations | `status` | B-tree | Filtrar por status |
| notifications | `user_id, is_read` | Composite | Notificações não lidas |
| activity_log | `user_id, created_at DESC` | Composite | Timeline de atividades |

### 5.4 Modelagem ERP (schema tenant)

Todas as entidades abaixo residem no **schema do tenant** (`tenant_*`), vinculadas ao `business_id` ou empresa quando aplicável. Relacionamento com `users` do schema `public` via FK lógica (`user_id` UUID) para responsáveis e audit trail.

**Cadastros e catálogo**

| Entidade | Campos principais | Notas |
|----------|-------------------|--------|
| `erp_products` | sku, name, ncm, cfop default, unit, cost, price, min_stock, business_id | Produto ou serviço cadastrável para venda |
| `erp_parties` | type (customer/supplier), name, document (CPF/CNPJ), address JSONB | Clientes e fornecedores |
| `erp_price_lists` | name, valid_from, rules JSONB | Opcional: tabelas de preço |

**Estoque**

| Entidade | Campos principais | Notas |
|----------|-------------------|--------|
| `erp_stock_locations` | name, is_default | Lojas, depósitos |
| `erp_stock_balances` | product_id, location_id, quantity | Saldo atual |
| `erp_stock_movements` | type (in/out/adjust), product_id, qty, ref_type, ref_id, user_id, created_at | Movimentações; `ref` pode apontar pedido, NF, inventário |

**Vendas e compras**

| Entidade | Campos principais | Notas |
|----------|-------------------|--------|
| `erp_sales_orders` | status, party_id, totals, business_id | Pedido de venda |
| `erp_sales_order_items` | order_id, product_id, qty, unit_price | Itens |
| `erp_purchase_orders` | status, supplier_party_id | Pedidos de compra |

**Financeiro**

| Entidade | Campos principais | Notas |
|----------|-------------------|--------|
| `erp_accounts_receivable` | party_id, due_date, amount, status, link_ref | Contas a receber |
| `erp_accounts_payable` | party_id, due_date, amount, status, link_ref | Contas a pagar |
| `erp_cash_entries` | type, amount, category, occurred_at | Fluxo de caixa simplificado |

**Fiscal (NF-e / NFC-e)**

| Entidade | Campos principais | Notas |
|----------|-------------------|--------|
| `erp_fiscal_documents` | model (55/65), serie, number, status, xml_storage_key, chave_nfe, business_id, environment (homolog/prod) | Cabeçalho documento fiscal |
| `erp_fiscal_events` | document_id, event_type (authorize/cancel/cce/contingency), payload_ref, created_at | Auditoria e integração SEFAZ |

**Índices recomendados (ERP):** `erp_stock_movements (product_id, created_at)`, `erp_fiscal_documents (chave_nfe UNIQUE)`, `erp_fiscal_documents (business_id, status)`, `erp_parties (document)`.

---

## 6. Especificação dos Módulos

### 6.1 Módulo: Autenticação e Autorização `[P0]`

**Endpoint Base:** `/api/v1/auth`

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| `POST` | `/register` | Registro de novo usuário | Não |
| `POST` | `/login` | Login com email/senha | Não |
| `POST` | `/refresh` | Renovar access token | Refresh Token |
| `POST` | `/logout` | Invalidar tokens | JWT |
| `POST` | `/forgot-password` | Solicitar reset de senha | Não |
| `POST` | `/reset-password` | Resetar senha com token | Token |
| `POST` | `/verify-email` | Verificar e-mail | Token |
| `GET` | `/me` | Dados do usuário logado | JWT |

**Regras de Negócio:**
- Senhas: mínimo 8 caracteres, 1 maiúscula, 1 número
- Access Token: JWT RS256, expira em 15 minutos
- Refresh Token: UUID, expira em 7 dias, rotação obrigatória
- Rate limit: 5 tentativas de login por IP em 15 min
- LGPD: consentimento obrigatório no registro

**DTOs:**

```typescript
// RegisterDTO
{
  fullName: string;       // min: 3, max: 200
  email: string;          // valid email
  phone: string;          // formato: (XX) XXXXX-XXXX
  password: string;       // min: 8
  role: 'citizen' | 'mei' | 'company';
  acceptTerms: boolean;   // MUST be true
}

// LoginDTO
{
  email: string;
  password: string;
}

// AuthResponse
{
  accessToken: string;
  refreshToken: string;
  user: UserPublic;
}
```

---

### 6.2 Módulo: Diretório Inteligente de Negócios `[P1]`

**Endpoint Base:** `/api/v1/businesses`

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| `GET` | `/` | Listar negócios (paginado, filtros) | Não |
| `GET` | `/search` | Busca inteligente (NLP) | Não |
| `GET` | `/featured` | Negócios em destaque | Não |
| `GET` | `/categories` | Listar categorias | Não |
| `GET` | `/:id` | Detalhes de um negócio | Não |
| `POST` | `/` | Criar perfil de negócio | JWT + MEI/Company |
| `PUT` | `/:id` | Atualizar perfil | JWT + Owner |
| `DELETE` | `/:id` | Desativar negócio | JWT + Owner/Admin |
| `POST` | `/:id/gallery` | Upload de imagem | JWT + Owner |
| `POST` | `/:id/services` | Adicionar serviço | JWT + Owner |
| `GET` | `/:id/reviews` | Listar avaliações | Não |
| `POST` | `/:id/reviews` | Criar avaliação | JWT + Citizen |
| `POST` | `/:id/reviews/:reviewId/reply` | Responder avaliação | JWT + Owner |
| `POST` | `/:id/verify` | Solicitar verificação | JWT + Owner |
| `PUT` | `/:id/verify/approve` | Aprovar verificação | JWT + Manager/Admin |

**Filtros de Busca:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `q` | string | Busca textual (full-text search) |
| `category` | UUID | Filtrar por categoria |
| `type` | enum | `mei` ou `company` |
| `rating_min` | number | Avaliação mínima (1-5) |
| `verified` | boolean | Apenas verificados |
| `neighborhood` | string | Filtrar por bairro |
| `lat` / `lng` / `radius` | number | Busca geográfica |
| `sort` | enum | `rating`, `reviews`, `recent`, `name` |
| `page` / `per_page` | number | Paginação |

**Busca Inteligente (IA):**

```
POST /api/v1/businesses/search
{
  "query": "preciso de um eletricista urgente para instalar ar-condicionado",
  "location": { "lat": -12.09, "lng": -45.79 }
}

→ A IA:
  1. Extrai intenção: categoria="construção/elétrica", urgência="alta"
  2. Filtra negócios relevantes
  3. Rankeia por: relevância + rating + proximidade + disponibilidade
  4. Retorna top 10 com score de relevância
```

**Telas do Frontend:**

| Tela | Rota | Descrição |
|------|------|-----------|
| Listagem | `/diretorio` | Grid de negócios com filtros, busca, categorias |
| Perfil do Negócio | `/diretorio/:slug` | Detalhes completos, galeria, serviços, avaliações, mapa |
| Cadastro/Edição | `/dashboard/meu-negocio` | Formulário completo multi-step |
| Admin: Verificação | `/painel/verificacoes` | Fila de aprovação de selos |

---

### 6.3 Módulo: Central de Cotações `[P1]`

**Endpoint Base:** `/api/v1/quotations`

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| `GET` | `/` | Listar cotações (filtros) | JWT |
| `GET` | `/available` | Cotações abertas (para fornecedores) | JWT + MEI/Company |
| `GET` | `/:id` | Detalhes da cotação | JWT |
| `POST` | `/` | Criar solicitação de cotação | JWT |
| `PUT` | `/:id` | Editar cotação | JWT + Owner |
| `PUT` | `/:id/cancel` | Cancelar cotação | JWT + Owner |
| `GET` | `/:id/proposals` | Listar propostas recebidas | JWT + Owner |
| `POST` | `/:id/proposals` | Enviar proposta | JWT + MEI/Company |
| `PUT` | `/:id/proposals/:proposalId/select` | Selecionar proposta | JWT + Owner |
| `GET` | `/:id/compare` | Comparativo IA das propostas | JWT + Owner |

**Fluxo de Estados:**

```
  ┌─────────┐    propostas     ┌─────────────┐    3+ propostas   ┌───────────┐
  │  OPEN   │ ──────────────► │ IN_PROGRESS  │ ────────────────► │ COMPARING │
  └────┬────┘                 └──────────────┘                   └─────┬─────┘
       │                                                               │
       │ cancelar                                          selecionar  │
       ▼                                                               ▼
  ┌───────────┐                                              ┌───────────┐
  │ CANCELLED │                                              │ COMPLETED │
  └───────────┘                                              └───────────┘
```

**IA na Cotação:**

| Funcionalidade | Input | Output |
|---------------|-------|--------|
| Estruturar solicitação | Texto livre do usuário | Especificações técnicas organizadas |
| Distribuição inteligente | Specs + categorias | Top N fornecedores mais relevantes |
| Comparativo de propostas | Lista de propostas | Tabela comparativa com score |
| Sugestão de preço justo | Categoria + specs + histórico | Faixa de preço estimada |

---

### 6.4 Módulo: Academia Empresarial `[P2]`

**Endpoint Base:** `/api/v1/academy`

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| `GET` | `/courses` | Listar cursos disponíveis | Não |
| `GET` | `/courses/featured` | Cursos em destaque | Não |
| `GET` | `/courses/:slug` | Detalhes do curso + aulas | Não |
| `POST` | `/courses/:id/enroll` | Matricular-se | JWT |
| `GET` | `/my-courses` | Meus cursos e progresso | JWT |
| `PUT` | `/my-courses/:id/progress` | Atualizar progresso | JWT |
| `POST` | `/my-courses/:id/complete` | Concluir curso | JWT |
| `GET` | `/my-courses/:id/certificate` | Gerar certificado | JWT |
| `GET` | `/trail/recommended` | Trilha recomendada (IA) | JWT |
| `POST` | `/courses` | Criar curso (admin) | JWT + Admin |
| `PUT` | `/courses/:id` | Editar curso | JWT + Admin |

**Áreas de Conteúdo:**

| Área | Exemplos de Curso | Nível |
|------|-------------------|-------|
| Gestão Financeira | Fluxo de caixa para MEI, Precificação | Iniciante |
| Marketing Digital | Redes sociais, Google Meu Negócio | Iniciante/Intermediário |
| Gestão de Negócios | Planejamento estratégico, Atendimento | Intermediário |
| Legalização | Abertura MEI, LGPD, Obrigações fiscais | Iniciante |
| Tecnologia | IA para negócios, Automação | Intermediário/Avançado |
| Agronegócio | Gestão rural, Tecnologia agrícola | Todos |

**Gamificação:**

| Elemento | Regra |
|----------|-------|
| XP (pontos) | +10 por aula concluída, +50 por curso completo |
| Badges | "Primeiro Passo", "Maratonista", "Expert" |
| Ranking mensal | Top 10 por XP no município |
| Streak | Dias consecutivos de estudo |

---

### 6.5 Módulo: Painel de Inteligência `[P2]`

**Endpoint Base:** `/api/v1/analytics`

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| `GET` | `/dashboard` | Dashboard completo | JWT + Manager/Admin |
| `GET` | `/businesses/stats` | Estatísticas de negócios | JWT + Manager |
| `GET` | `/quotations/stats` | Estatísticas de cotações | JWT + Manager |
| `GET` | `/academy/stats` | Estatísticas da academia | JWT + Manager |
| `GET` | `/sectors/analysis` | Análise setorial (IA) | JWT + Manager |
| `GET` | `/trends` | Tendências e predições (IA) | JWT + Manager |
| `GET` | `/reports/generate` | Gerar relatório PDF (IA) | JWT + Manager |
| `GET` | `/heatmap` | Mapa de calor de demanda | JWT + Manager |

**Indicadores do Dashboard:**

| KPI | Cálculo | Atualização |
|-----|---------|-------------|
| Total de negócios ativos | COUNT businesses WHERE is_active | Tempo real |
| Novos MEIs no mês | COUNT businesses WHERE type='mei' AND created_at > mês | Diário |
| Cotações abertas | COUNT quotations WHERE status='open' | Tempo real |
| Volume transacionado | SUM proposals.price WHERE is_selected | Diário |
| Alunos ativos | COUNT enrollments WHERE status='active' | Diário |
| NPS da plataforma | Pesquisa periódica | Semanal |
| Taxa de resolução chatbot | Mensagens resolvidas / total | Diário |
| Setores em crescimento | IA trend analysis | Semanal |

---

### 6.6 Módulo: Assistente IA Municipal `[P2]`

**Endpoint Base:** `/api/v1/assistant`

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| `POST` | `/chat` | Enviar mensagem ao chatbot | JWT (opcional) |
| `GET` | `/chat/history` | Histórico de conversas | JWT |
| `POST` | `/whatsapp/webhook` | Webhook WhatsApp Business | Webhook Token |

**Capacidades do Assistente:**

| Contexto | Capacidade | Exemplo |
|----------|-----------|---------|
| Cidadão | Buscar serviços | "Preciso de um eletricista" |
| Cidadão | Solicitar cotação via chat | "Quero orçamento de pintura" |
| MEI | Dúvidas fiscais | "Como emitir nota fiscal?" |
| MEI | Gestão do perfil | "Atualizar meu horário" |
| Gestor | Consultar dados | "Quantos MEIs abriram este mês?" |
| Gestor | Gerar relatório | "Relatório do setor de construção" |
| Todos | FAQ do portal | "Como funciona a cotação?" |

**Prompt Engineering:**
- System prompt contextualizado com dados do município
- RAG (Retrieval-Augmented Generation) com base de conhecimento local
- Guardrails para manter o assistente no escopo municipal
- Fallback para atendimento humano quando necessário

---

### 6.7 Módulo: ERP Empresarial Nativo `[P1–P2]`

**Público:** usuários com perfil **MEI** ou **Empresa** (e papéis delegados abaixo), por **negócio** (`business_id`) dentro do tenant municipal.

**Endpoint base (proposto):** `/api/v1/erp`

**Visão:** ERP **nativo** na plataforma — sem substituuir o contador, mas permitindo operação diária (estoque, vendas, financeiro) e **emissão de documentos fiscais eletrônicos** conforme legislação, com integração aos webservices da **SEFAZ** (NF-e modelo 55, NFC-e modelo 65) por **UF** do emitente.

#### 6.7.1 Personas e papéis (extensão RBAC)

| Papel | Descrição |
|-------|-----------|
| `empresa_owner` | Dono do negócio — acesso total ao ERP do seu `business_id` |
| `empresa_operador` | Operação (estoque, vendas) sem configuração fiscal crítica |
| `empresa_financeiro` | Contas a pagar/receber, caixa, conciliação básica |
| `empresa_fiscal` | Emissão/cancelamento/CC-e, parametrização fiscal, certificado |
| `contador` *(opcional, fase posterior)* | Visão leitura ou aprovação fiscal — vínculo por convite |

#### 6.7.2 Capacidades por área

| Área | Capacidades MUST (produto final) |
|------|----------------------------------|
| Cadastros | Produtos/serviços (NCM/CFOP padrão), clientes e fornecedores (CPF/CNPJ), categorias |
| Estoque | Múltiplos locais, saldos, entradas/saídas, ajustes, inventário, alertas de mínimo |
| Vendas | Pedidos de venda, faturamento, vínculo com documento fiscal quando aplicável |
| Compras | Pedidos de compra, entrada de estoque |
| Financeiro | Contas a pagar/receber, fluxo de caixa, status (aberto/pago/atrasado) |
| Fiscal NF-e/NFC-e | Geração XML, assinatura digital, envio SEFAZ, autorização, cancelamento dentro do prazo, carta de correção, contingência, consulta situação, armazenamento XML/PDF |
| Relatórios | Curva ABC estoque, vendas por período, títulos em aberto *(mínimo viável)* |

#### 6.7.3 Endpoints REST (representativos)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET/POST` | `/erp/products` | CRUD produtos |
| `GET/POST` | `/erp/parties` | Clientes/fornecedores |
| `GET/POST` | `/erp/stock/movements` | Movimentações |
| `GET` | `/erp/stock/balances` | Saldos por local/produto |
| `GET/POST` | `/erp/sales-orders` | Pedidos de venda |
| `GET/POST` | `/erp/finance/ap` | Contas a pagar |
| `GET/POST` | `/erp/finance/ar` | Contas a receber |
| `POST` | `/erp/fiscal/nfe/emit` | Solicitar emissão NF-e |
| `POST` | `/erp/fiscal/nfce/emit` | Solicitar emissão NFC-e |
| `POST` | `/erp/fiscal/:id/cancel` | Cancelamento com justificativa |
| `POST` | `/erp/fiscal/:id/cce` | Carta de correção |
| `GET` | `/erp/fiscal/:id/xml` | Download XML autorizado |

*Autenticação:* JWT + escopo `business_id` + roles `empresa_*`.

#### 6.7.4 Ondas de entrega (aceite incremental)

| Onda | Conteúdo | Critério de aceite (resumo) |
|------|----------|----------------------------|
| **A — Núcleo operacional** | Cadastros, estoque, pedidos venda/compra, financeiro básico **sem** autorização SEFAZ em produção | Empresa consegue cadastrar produtos, movimentar estoque, registrar pedido e títulos; *opcional:* documento fiscal em modo **rascunho/simulação** |
| **B — Fiscal NF-e/NFC-e** | Integração **homologação** e depois **produção** SEFAZ; certificado A1 no servidor; filas assíncronas (Bull) para envio/consulta | NF-e/NFC-e autorizada com chave de acesso; cancelamento e CC-e conforme regras; logs em `erp_fiscal_events` |
| **C — NFS-e serviços** | Integração com **prefeitura** do tomador/prestador conforme API municipal disponível | Especificação **por cidade**; LEM a definir em ADR |

#### 6.7.5 Requisitos não-funcionais específicos (ERP)

- **Rastreabilidade:** todo documento fiscal com trilha de eventos e usuário responsável.
- **Segurança:** certificado e chaves em cofre (env/secret manager); segregação rigorosa por `business_id`.
- **Disponibilidade fiscal:** filas com retry e dead-letter para falhas SEFAZ; modo contingência documentado.
- **LGPD:** dados financeiros e de terceiros (clientes) com base legal e exportação sob solicitação.

---

## 7. Integração de Inteligência Artificial

### 7.1 Mapa de Uso da IA por Módulo

| Módulo | Recurso IA | Modelo | Input | Output |
|--------|-----------|--------|-------|--------|
| Diretório | Busca NLP | Claude Sonnet | Query natural | Negócios rankeados |
| Diretório | Categorização automática | Claude Sonnet | Descrição do negócio | Categoria sugerida |
| Diretório | Análise de sentimento | Claude Sonnet | Texto da review | Sentimento + score |
| Cotações | Estruturar solicitação | Claude Sonnet | Texto livre | Specs técnicas JSON |
| Cotações | Comparar propostas | Claude Sonnet | Lista propostas | Análise comparativa |
| Cotações | Preço justo | Claude Sonnet | Histórico + specs | Faixa de preço |
| Academia | Trilha adaptativa | Claude Sonnet | Perfil do aluno | Cursos recomendados |
| Academia | Tutor virtual | Claude Sonnet | Dúvida + contexto | Explicação |
| Academia | Geração de conteúdo | Claude Sonnet | Tema + nível | Resumo / flashcards |
| Painel | Relatórios automáticos | Claude Sonnet | Dados agregados | Relatório narrativo |
| Painel | Detecção de gaps | Claude Sonnet | Dados setoriais | Oportunidades |
| Painel | Predições | Claude Sonnet | Séries temporais | Tendências |
| Assistente | Chat multicanal | Claude Sonnet | Mensagem usuário | Resposta contextual |
| ERP | Sugestão de compra / reposição | Claude Sonnet | Estoque + vendas | Alertas e quantidades sugeridas |
| ERP | Classificação fiscal assistida *(assistida)* | Claude Sonnet | Descrição produto | Sugestão NCM (validação humana obrigatória) |
| ERP | Resumo gerencial | Claude Sonnet | Dados agregados ERP | Texto para gestor |

### 7.2 Controle de Custos IA

| Plano Tenant | Queries IA/mês | Fallback |
|-------------|---------------|----------|
| Starter | 100 | Busca tradicional |
| Professional | 5.000 | Cache de respostas |
| Enterprise | 50.000 | Sem limite prático |

**Estratégias de otimização:**
- Cache de respostas IA (Redis, TTL 1h para buscas similares)
- Embeddings pré-computados para busca semântica
- Batch processing para análises de sentimento
- Modelo menor (Haiku) para tarefas simples (classificação, sentimento)

---

## 8. Perfis de Usuário e Controle de Acesso (RBAC)

### 8.1 Matriz de Permissões

| Recurso | Cidadão | MEI | Empresa | Gestor | Admin |
|---------|---------|-----|---------|--------|-------|
| Buscar negócios | ✅ | ✅ | ✅ | ✅ | ✅ |
| Criar avaliação | ✅ | ✅ | ✅ | ✅ | ✅ |
| Solicitar cotação | ✅ | ✅ | ✅ | ✅ | ✅ |
| Criar perfil negócio | ❌ | ✅ | ✅ | ❌ | ✅ |
| Responder cotação | ❌ | ✅ | ✅ | ❌ | ✅ |
| Acessar cursos básicos | ✅ | ✅ | ✅ | ✅ | ✅ |
| Acessar cursos premium | ❌ | ✅ | ✅ | ✅ | ✅ |
| Dashboard pessoal | ✅ | ✅ | ✅ | ✅ | ✅ |
| Painel de inteligência | ❌ | ❌ | ❌ | ✅ | ✅ |
| Aprovar verificações | ❌ | ❌ | ❌ | ✅ | ✅ |
| Gerenciar cursos | ❌ | ❌ | ❌ | ✅ | ✅ |
| Gerenciar usuários | ❌ | ❌ | ❌ | ❌ | ✅ |
| Configurar tenant | ❌ | ❌ | ❌ | ❌ | ✅ |
| Gerenciar tenants | ❌ | ❌ | ❌ | ❌ | ✅ (super) |
| ERP — cadastros/estoque/vendas *(próprio negócio)* | ❌ | ✅ | ✅ | ❌ | ✅ |
| ERP — financeiro AP/AR | ❌ | ✅ | ✅ | ❌ | ✅ |
| ERP — emissão fiscal NF-e/NFC-e | ❌ | ✅ | ✅ | ❌ | ✅ |
| ERP — relatórios do negócio | ❌ | ✅ | ✅ | ❌ | ✅ |
| Painel público: métricas agregadas ERP *(anonimizadas)* | ❌ | ❌ | ❌ | ✅ | ✅ |

*Papéis finos (`empresa_operador`, `empresa_financeiro`, `empresa_fiscal`) refinam as células acima em implementação; matriz detalhada no módulo ERP.*

### 8.2 Implementação

```typescript
// Guard decorator
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('manager', 'admin')
@Get('/analytics/dashboard')
getDashboard() { ... }
```

---

## 9. Requisitos Não-Funcionais

| Requisito | Meta | Estratégia | Prioridade |
|-----------|------|-----------|------------|
| Disponibilidade | 99,9% uptime | Multi-AZ, failover automático | P0 |
| Performance | < 2s tempo de resposta | CDN, cache Redis, query optimization | P0 |
| Escalabilidade | 100.000 usuários simultâneos | Auto-scaling horizontal | P1 |
| Segurança | OWASP Top 10 | WAF, input sanitization, HTTPS | P0 |
| LGPD | Conformidade total | Consentimento, portabilidade, exclusão | P0 |
| Acessibilidade | WCAG 2.1 AA | Semântica HTML, alto contraste, leitor de tela | P1 |
| SEO | Core Web Vitals "Good" | SSR, otimização LCP/FID/CLS | P1 |
| Backup | RPO < 1h, RTO < 4h | Backup automático PostgreSQL, S3 | P0 |
| Monitoramento | Alertas em < 5min | Logs centralizados, health checks | P1 |
| i18n | pt-BR primário | Estrutura preparada para multi-idioma | P3 |

---

## 10. Design System e UI/UX

### 10.1 Identidade Visual

**Princípio:** Design humano, institucional mas acessível. NÃO parecer feito por IA — nada de gradientes roxos genéricos, Inter/Roboto, ou layouts cookie-cutter.

### 10.2 Tipografia

| Uso | Fonte | Fallback | Peso |
|-----|-------|----------|------|
| Títulos (h1, h2, h3) | DM Serif Display | Georgia, serif | 400, 700 |
| Corpo / Interface | Source Sans 3 | Segoe UI, sans-serif | 300-700 |
| Código / Mono | JetBrains Mono | monospace | 400 |

### 10.3 Paleta de Cores

| Token | Hex | Uso |
|-------|-----|-----|
| `municipal-600` | `#00a28d` | Primária — botões, links, destaques |
| `municipal-700` | `#058172` | Hover da primária |
| `marinha-900` | `#102a43` | Títulos, texto principal |
| `marinha-500` | `#627d98` | Texto secundário |
| `cerrado-500` | `#f59e0b` | Accent — estrelas, badges, CTAs especiais |
| `cerrado-600` | `#d97706` | Hover accent |
| `sucesso-500` | `#10b981` | Estados de sucesso |
| `alerta-500` | `#ef4444` | Erros, alertas |
| Background | `#fafcfe` | Background geral |
| Card background | `#ffffff` | Cards e containers |

### 10.4 Componentes Base

| Componente | Variantes | Descrição |
|-----------|-----------|-----------|
| `Button` | primary, secondary, accent, ghost, danger | Border-radius 12px, com ícone opcional |
| `Input` | text, search, select, textarea | Border 2px, focus ring teal |
| `Card` | default, featured, compact | Shadow suave, hover elevation |
| `Badge` | category (cores dinâmicas), status, verified | Pill shape |
| `CategoryPill` | com emoji + label | Hover com scale do emoji |
| `BusinessCard` | full, compact | Color strip top, rating badge |
| `Modal` | default, confirm, form | Backdrop blur |
| `Toast` | success, error, info, warning | Auto-dismiss 5s |
| `Avatar` | sm, md, lg | Com fallback de iniciais |
| `Rating` | display, input | Estrelas amarelas |
| `Pagination` | default | Botões numerados |
| `Skeleton` | text, card, avatar | Loading states |

### 10.5 Responsividade

| Breakpoint | Largura | Layout |
|-----------|---------|--------|
| Mobile | < 640px | 1 coluna, nav bottom |
| Tablet | 640-1024px | 2 colunas, nav lateral colapsável |
| Desktop | > 1024px | 3-4 colunas, nav top fixa |

---

## 11. Integrações Externas

| Integração | Uso | Fase |
|-----------|-----|------|
| **Anthropic Claude API** | Chatbot, NLP, análise, geração | Fase 1 |
| **WhatsApp Business API** | Chatbot WhatsApp | Fase 1 |
| **SMTP (e-mail)** | Transacional (verificação, notificações) | Fase 1 |
| **AWS S3 / R2** | Storage de imagens e documentos | Fase 1 |
| **Google Maps API** | Mapa de localização de negócios | Fase 2 |
| **Receita Federal API** | Validação de CNPJ | Fase 2 |
| **IBGE API** | Dados demográficos municipais | Fase 3 |
| **PIX / Gateway Pagamento** | Planos premium, certificados | Fase 4 |
| **SEFAZ (NF-e / NFC-e)** | Autorização, cancelamento, CC-e, contingência — webservices estaduais | Onda B ERP |
| **Certificado digital (ICP-Brasil)** | A1 (arquivo) ou nuvem conforme ADR — assinatura XML | Onda B ERP |
| **NFS-e (prefeitura)** | Emissão de serviços — API municipal / agregador | Onda C ERP |

---

## 12. Estratégia de Testes

| Tipo | Ferramenta | Cobertura Alvo | Responsável |
|------|-----------|---------------|-------------|
| Unitário (backend) | Jest | > 80% services/utils | Backend dev |
| Unitário (frontend) | Jest + RTL | > 70% components | Frontend dev |
| Integração (API) | Supertest | Todos os endpoints | Backend dev |
| E2E | Playwright | Fluxos críticos (auth, busca, cotação) | QA |
| Performance | k6 | < 2s p95, 1000 req/s | DevOps |
| Segurança | OWASP ZAP | OWASP Top 10 | DevOps/Security |

---

## 13. Plano de Deploy e Infraestrutura

### 13.1 Ambientes

| Ambiente | URL | Banco | Deploy |
|----------|-----|-------|--------|
| Local | localhost:3000/3001 | Docker local | Manual |
| Development | dev.conexaomunicipal.com.br | PostgreSQL dev | Auto (push main) |
| Staging | staging.conexaomunicipal.com.br | Clone produção | Auto (tag release) |
| Production | conexaomunicipal.com.br | PostgreSQL produção | Manual (aprovação) |

### 13.2 CI/CD Pipeline

```
Push → Lint → Tests → Build → Deploy (dev)
Tag  → Lint → Tests → Build → Deploy (staging) → Aprovação → Deploy (prod)
```

### 13.3 Docker Compose (Desenvolvimento)

```yaml
Services:
  - postgres:16-alpine  (porta 5432)
  - redis:7-alpine      (porta 6379)
  - elasticsearch:8.12  (porta 9200)
```

---

## 14. Roadmap e Plano de Tarefas

### FASE 1 — Fundação + MVP (Meses 1-3) `[P0]`

#### Sprint 1-2: Infraestrutura e Auth (2 semanas)

| # | Tarefa | Tipo | Estimativa | Deps |
|---|--------|------|-----------|------|
| 1.1 | Configurar Docker Compose (PG + Redis + ES) | DevOps | 4h | — |
| 1.2 | Executar SQL de inicialização do banco | Backend | 2h | 1.1 |
| 1.3 | Implementar TenantMiddleware (resolver tenant) | Backend | 8h | 1.2 |
| 1.4 | Testes do middleware multitenant | Backend | 4h | 1.3 |
| 1.5 | Módulo Auth: register endpoint + validações | Backend | 8h | 1.2 |
| 1.6 | Módulo Auth: login + JWT + refresh token | Backend | 8h | 1.5 |
| 1.7 | Módulo Auth: forgot/reset password | Backend | 6h | 1.6 |
| 1.8 | Módulo Auth: verify email flow | Backend | 4h | 1.6 |
| 1.9 | Guards: JwtAuthGuard + RolesGuard | Backend | 6h | 1.6 |
| 1.10 | Swagger documentation do módulo auth | Backend | 2h | 1.9 |
| 1.11 | Frontend: Design System — componentes base (Button, Input, Card) | Frontend | 12h | — |
| 1.12 | Frontend: Layout principal (Header, Footer, Sidebar) | Frontend | 8h | 1.11 |
| 1.13 | Frontend: Tela de Login | Frontend | 6h | 1.12 |
| 1.14 | Frontend: Tela de Registro (multi-step) | Frontend | 8h | 1.12 |
| 1.15 | Frontend: Tela de recuperação de senha | Frontend | 4h | 1.12 |
| 1.16 | Frontend: API client (Axios + interceptors + React Query) | Frontend | 6h | — |
| 1.17 | Frontend: Context de autenticação (AuthProvider) | Frontend | 6h | 1.16 |
| 1.18 | Integração frontend ↔ backend auth completa | Full Stack | 8h | 1.10, 1.17 |
| 1.19 | Testes E2E: fluxo completo de registro e login | QA | 6h | 1.18 |
| **Total Sprint 1-2** | | | **~104h** | |

#### Sprint 3-4: Diretório Inteligente (2 semanas)

| # | Tarefa | Tipo | Estimativa | Deps |
|---|--------|------|-----------|------|
| 2.1 | Entity: Business, Category, Gallery, Service | Backend | 6h | 1.9 |
| 2.2 | CRUD Businesses (create, read, update, deactivate) | Backend | 12h | 2.1 |
| 2.3 | Endpoint: GET /businesses com filtros e paginação | Backend | 8h | 2.2 |
| 2.4 | Full-text search PostgreSQL (tsvector, unaccent) | Backend | 8h | 2.3 |
| 2.5 | CRUD Categories (admin) | Backend | 4h | 2.1 |
| 2.6 | Upload de imagens (galeria + logo) para S3 | Backend | 8h | 2.2 |
| 2.7 | CRUD Business Services (serviços oferecidos) | Backend | 4h | 2.2 |
| 2.8 | Endpoint: GET /businesses/featured | Backend | 2h | 2.3 |
| 2.9 | Swagger docs do módulo businesses | Backend | 2h | 2.8 |
| 2.10 | Frontend: Página do Diretório (listagem + filtros + busca) | Frontend | 16h | 1.18 |
| 2.11 | Frontend: Card de negócio (com rating, verified badge, categoria) | Frontend | 6h | 1.11 |
| 2.12 | Frontend: Página de perfil do negócio (detalhe completo) | Frontend | 12h | 2.11 |
| 2.13 | Frontend: Filtros avançados (sidebar/modal) | Frontend | 8h | 2.10 |
| 2.14 | Frontend: Formulário de cadastro de negócio (multi-step) | Frontend | 12h | 1.14 |
| 2.15 | Frontend: Upload de imagens (drag & drop) | Frontend | 6h | 2.14 |
| 2.16 | Integração frontend ↔ backend diretório | Full Stack | 8h | 2.9, 2.13 |
| 2.17 | Seed: 50+ negócios fake para demo | Backend | 4h | 2.2 |
| 2.18 | Testes unitários services do diretório | Backend | 6h | 2.8 |
| **Total Sprint 3-4** | | | **~122h** | |

#### Sprint 5-6: Reviews + Busca IA + Chatbot MVP (2 semanas)

| # | Tarefa | Tipo | Estimativa | Deps |
|---|--------|------|-----------|------|
| 3.1 | CRUD Reviews (criar, responder, listar) | Backend | 8h | 2.2 |
| 3.2 | Cálculo automático avg_rating / total_reviews | Backend | 4h | 3.1 |
| 3.3 | Análise de sentimento via IA (reviews) | Backend | 8h | 3.1 |
| 3.4 | Endpoint: POST /businesses/search (busca NLP) | Backend | 12h | 2.4 |
| 3.5 | IA: categorização automática de negócios | Backend | 6h | 2.2 |
| 3.6 | Módulo Assistente IA: endpoint POST /chat | Backend | 12h | 1.9 |
| 3.7 | Assistente IA: system prompt contextualizado LEM | Backend | 6h | 3.6 |
| 3.8 | Assistente IA: integração WhatsApp webhook | Backend | 12h | 3.6 |
| 3.9 | Frontend: Componente de avaliação (estrelas + form) | Frontend | 6h | 2.12 |
| 3.10 | Frontend: Lista de avaliações no perfil do negócio | Frontend | 4h | 3.9 |
| 3.11 | Frontend: Widget do chatbot IA (floating) | Frontend | 12h | 1.12 |
| 3.12 | Frontend: Busca inteligente no hero (integrar IA) | Frontend | 6h | 3.4 |
| 3.13 | Testes de integração IA (mock + real) | Backend | 6h | 3.8 |
| 3.14 | Landing page final com dados reais | Frontend | 8h | 2.17 |
| **Total Sprint 5-6** | | | **~110h** | |

> **MARCO: Lançamento beta público — Diretório + Busca IA + Chatbot**

---

### FASE 2 — Expansão (Meses 4-6) `[P1]`

#### Sprint 7-8: Central de Cotações (2 semanas)

| # | Tarefa | Tipo | Estimativa | Deps |
|---|--------|------|-----------|------|
| 4.1 | Entity: Quotation, QuotationProposal | Backend | 4h | 1.9 |
| 4.2 | CRUD Quotations (criar, editar, cancelar, listar) | Backend | 10h | 4.1 |
| 4.3 | Endpoint: GET /quotations/available (para fornecedores) | Backend | 6h | 4.2 |
| 4.4 | CRUD Proposals (enviar, listar, selecionar) | Backend | 8h | 4.2 |
| 4.5 | IA: estruturar solicitação de cotação | Backend | 8h | 4.2 |
| 4.6 | IA: comparativo inteligente de propostas | Backend | 8h | 4.4 |
| 4.7 | IA: sugestão de preço justo | Backend | 6h | 4.4 |
| 4.8 | Notificações: nova cotação, nova proposta, seleção | Backend | 8h | 4.4 |
| 4.9 | Frontend: Tela de solicitação de cotação | Frontend | 10h | 1.18 |
| 4.10 | Frontend: Lista de minhas cotações (tabs por status) | Frontend | 8h | 4.9 |
| 4.11 | Frontend: Tela de cotações disponíveis (fornecedor) | Frontend | 8h | 4.9 |
| 4.12 | Frontend: Enviar proposta (formulário) | Frontend | 6h | 4.11 |
| 4.13 | Frontend: Tela de comparativo de propostas | Frontend | 10h | 4.6 |
| 4.14 | Integração frontend ↔ backend cotações | Full Stack | 8h | 4.13 |
| 4.15 | Testes E2E: fluxo completo de cotação | QA | 8h | 4.14 |
| **Total Sprint 7-8** | | | **~116h** | |

#### Sprint 9-10: Notificações + Dashboard Pessoal + Polish (2 semanas)

| # | Tarefa | Tipo | Estimativa | Deps |
|---|--------|------|-----------|------|
| 5.1 | Sistema de notificações (CRUD + push + email) | Backend | 12h | 1.9 |
| 5.2 | Integração email transacional (SMTP) | Backend | 6h | 5.1 |
| 5.3 | Frontend: Dashboard pessoal do MEI/Empresa | Frontend | 16h | 1.18 |
| 5.4 | Frontend: Centro de notificações (bell icon + dropdown) | Frontend | 8h | 5.1 |
| 5.5 | Frontend: Editar perfil do usuário | Frontend | 6h | 1.18 |
| 5.6 | Frontend: Editar perfil do negócio (atualização) | Frontend | 6h | 2.14 |
| 5.7 | SEO: Meta tags, sitemap, structured data | Frontend | 8h | 3.14 |
| 5.8 | PWA: Service worker, manifest, offline support | Frontend | 8h | 5.7 |
| 5.9 | Performance: otimização de imagens, lazy load, cache | Frontend | 6h | 5.8 |
| 5.10 | Acessibilidade: audit WCAG 2.1 AA + correções | Frontend | 8h | 5.9 |
| 5.11 | Testes de performance (k6, load test) | DevOps | 6h | 5.9 |
| **Total Sprint 9-10** | | | **~90h** | |

> **MARCO: 1.000 negócios cadastrados — Diretório + Cotações + Mobile**

---

### FASE 3 — Academia Empresarial (Meses 7-10) `[P2]`

#### Sprint 11-14: Academia Completa (4 semanas)

| # | Tarefa | Tipo | Estimativa | Deps |
|---|--------|------|-----------|------|
| 6.1 | Entity: Course, Lesson, Enrollment | Backend | 4h | 1.9 |
| 6.2 | CRUD Courses + Lessons (admin) | Backend | 10h | 6.1 |
| 6.3 | Enrollment: matrícula, progresso, conclusão | Backend | 8h | 6.2 |
| 6.4 | Certificado digital: geração PDF + QR code | Backend | 10h | 6.3 |
| 6.5 | IA: trilha adaptativa por perfil do aluno | Backend | 10h | 6.3 |
| 6.6 | IA: tutor virtual (Q&A sobre conteúdo) | Backend | 8h | 3.6 |
| 6.7 | IA: geração de resumos e flashcards | Backend | 6h | 6.2 |
| 6.8 | Gamificação: XP, badges, ranking | Backend | 10h | 6.3 |
| 6.9 | Frontend: Catálogo de cursos | Frontend | 10h | 1.18 |
| 6.10 | Frontend: Página do curso (detalhes + aulas) | Frontend | 10h | 6.9 |
| 6.11 | Frontend: Player de aula (vídeo + conteúdo + progresso) | Frontend | 12h | 6.10 |
| 6.12 | Frontend: Meus cursos + progresso | Frontend | 8h | 6.9 |
| 6.13 | Frontend: Certificado digital (view + download) | Frontend | 6h | 6.4 |
| 6.14 | Frontend: Gamificação UI (badges, ranking, streak) | Frontend | 10h | 6.8 |
| 6.15 | Admin: Painel de criação/edição de cursos | Frontend | 12h | 6.2 |
| 6.16 | Criação de 10+ cursos iniciais (conteúdo) | Conteúdo | 40h | 6.2 |
| 6.17 | Testes E2E: fluxo academia completo | QA | 8h | 6.15 |
| **Total Sprint 11-14** | | | **~172h** | |

> **MARCO: 500 alunos ativos na Academia**

---

### FASE 4 — Inteligência e Maturidade (Meses 11-12) `[P2-P3]`

#### Sprint 15-18: Painel + Refinamentos (4 semanas)

| # | Tarefa | Tipo | Estimativa | Deps |
|---|--------|------|-----------|------|
| 7.1 | Analytics: agregações e views materializadas | Backend | 10h | 1.9 |
| 7.2 | Dashboard API: todos os KPIs | Backend | 10h | 7.1 |
| 7.3 | IA: análise setorial + gaps de mercado | Backend | 8h | 7.2 |
| 7.4 | IA: relatórios automáticos narrativos | Backend | 10h | 7.2 |
| 7.5 | IA: predições de tendência | Backend | 8h | 7.2 |
| 7.6 | Mapa de calor de demanda | Backend | 6h | 7.2 |
| 7.7 | Frontend: Dashboard analítico completo | Frontend | 20h | 7.2 |
| 7.8 | Frontend: Gráficos interativos (Recharts) | Frontend | 12h | 7.7 |
| 7.9 | Frontend: Mapa de calor visual | Frontend | 8h | 7.6 |
| 7.10 | Frontend: Geração/download de relatórios | Frontend | 6h | 7.4 |
| 7.11 | Admin: Painel de gestão de tenants | Frontend | 10h | 1.9 |
| 7.12 | Admin: Moderação de conteúdo | Frontend | 8h | 1.9 |
| 7.13 | Integração Receita Federal (validação CNPJ) | Backend | 6h | 2.2 |
| 7.14 | Rate limiting global + por tenant | Backend | 6h | 1.3 |
| 7.15 | Audit trail completo (activity_log) | Backend | 6h | 1.9 |
| 7.16 | LGPD: exportação de dados + exclusão de conta | Backend | 8h | 1.9 |
| 7.17 | Documentação final da API (Swagger completo) | Backend | 6h | 7.16 |
| 7.18 | Security audit + penetration test | DevOps | 12h | 7.17 |
| 7.19 | Otimização final de performance | DevOps | 8h | 7.18 |
| 7.20 | Deploy produção + monitoramento | DevOps | 10h | 7.19 |
| **Total Sprint 15-18** | | | **~178h** | |

> **MARCO: Plataforma completa em produção**

---

### 14.1 Resumo de Esforço por Fase

| Fase | Duração | Horas Estimadas | Entregas |
|------|---------|----------------|----------|
| Fase 1 — MVP | 3 meses (6 sprints) | ~336h | Auth, Diretório, Busca IA, Chatbot |
| Fase 2 — Expansão | 2 meses (4 sprints) | ~206h | Cotações, Notificações, PWA |
| Fase 3 — Academia | 2 meses (4 sprints) | ~172h | Cursos, Gamificação, Certificados |
| Fase 4 — Inteligência | 2 meses (4 sprints) | ~178h | Dashboard, Relatórios IA, Admin |
| Fase 5 — ERP Onda A | 2 meses (4 sprints) | ~240h *(est.)* | Cadastros, estoque, vendas/compras, financeiro básico (sem SEFAZ prod) |
| Fase 6 — ERP Onda B | 2 meses (4 sprints) | ~320h *(est.)* | NF-e/NFC-e homolog+prod, certificado A1, filas, cancelamento/CC-e |
| Fase 7 — ERP Onda C | 1–2 meses (2–4 sprints) | ~120–200h *(est.)* | NFS-e municipal conforme escopo LEM |
| **TOTAL** | **~16–18 meses** *(ordem de grandeza)* | **~1.900–2.100h** *(892 + ERP)* | **Portal + ERP nativo completo** |

*As fases 5–7 podem **sobrepor** parcialmente a Fase 4 em calendário real se houver equipe paralela; a dependência técnica mínima é **Auth + tenant + negócio** estáveis.*

### 14.2 Marcos e dependências do ERP

1. **Pré-requisito:** módulos **Auth** (§6.1) e vínculo usuário ↔ negócio (`business_id`) funcionando.
2. **Onda A** não exige SEFAZ; permite homologação de processos com dados reais de estoque/financeiro.
3. **Onda B** exige **certificado digital**, cadastro fiscal do emitente (CSC NFC-e, etc.) e **homologação SEFAZ** antes de produção.
4. **Onda C** depende de **lei municipal** e disponibilidade de API da prefeitura de LEM (ou integrador).

---

## 15. Métricas de Sucesso (KPIs)

| KPI | Meta 3 meses | Meta 6 meses | Meta 12 meses |
|-----|-------------|-------------|--------------|
| Negócios cadastrados | 200+ | 500+ | 2.000+ |
| Usuários ativos mensais | 1.000+ | 3.000+ | 15.000+ |
| Cotações realizadas/mês | 50+ | 200+ | 1.000+ |
| Alunos capacitados | — | 300+ | 1.500+ |
| NPS (satisfação) | > 60 | > 70 | > 80 |
| Taxa resolução chatbot | > 60% | > 75% | > 90% |
| Tempo médio de resposta API | < 2s | < 1.5s | < 1s |
| Uptime | > 99% | > 99.5% | > 99.9% |
| Cursos disponíveis | — | 10+ | 50+ |
| Empresas com ERP ativo *(cadastro produto + movimento estoque)* | — | 50+ | 300+ |
| NF-e/NFC-e emitidas via plataforma *(acumulado)* | — | 500+ | 10.000+ |
| Taxa sucesso autorização SEFAZ *(documentos)* | — | > 98% | > 99,5% |

---

## 16. Riscos e Mitigações

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|-------|--------------|---------|-----------|
| R1 | Baixa adesão de MEIs ao cadastro | Média | Alto | Campanha presencial + parceria SEBRAE |
| R2 | Custo elevado de API de IA | Média | Médio | Cache agressivo + modelo menor para tarefas simples |
| R3 | Complexidade do multitenant | Baixa | Alto | Schema-per-tenant bem testado + template |
| R4 | Performance com muitos negócios | Baixa | Médio | Elasticsearch + índices otimizados |
| R5 | Dados falsos/spam no diretório | Média | Médio | Verificação municipal + IA anti-spam |
| R6 | Resistência da gestão pública | Baixa | Alto | Dashboards com valor imediato + treinamento |
| R7 | Disponibilidade de internet | Média | Médio | PWA com cache offline |
| R8 | LGPD: vazamento de dados | Baixa | Crítico | Criptografia, audit, DPO, pentests |
| R9 | Escalabilidade para outros municípios | Baixa | Médio | Tenant provisioning automatizado |
| R10 | Atraso no cronograma | Média | Médio | Sprints curtos, MVP iterativo |
| R11 | Complexidade fiscal (SEFAZ, certificado, contingência) | Alta | Alto | Homologação longa; especialista fiscal; filas e monitoramento; testes em ambiente de homologação obrigatórios |
| R12 | NFS-e multi-município (Onda C) | Média | Médio | Escopo por cidade; priorizar LEM antes de generalizar |

---

## 17. Glossário

| Termo | Definição |
|-------|-----------|
| **MEI** | Microempreendedor Individual — pessoa que trabalha por conta própria, faturamento até R$81k/ano |
| **Tenant** | Inquilino — cada município é um tenant isolado no sistema |
| **Schema** | Esquema do PostgreSQL — namespace que isola as tabelas de cada tenant |
| **NLP** | Natural Language Processing — processamento de linguagem natural |
| **RAG** | Retrieval-Augmented Generation — técnica que combina busca + IA generativa |
| **RBAC** | Role-Based Access Control — controle de acesso por perfil |
| **JWT** | JSON Web Token — token de autenticação |
| **PWA** | Progressive Web App — app web com capacidades offline |
| **SSR** | Server-Side Rendering — renderização no servidor |
| **FTS** | Full-Text Search — busca textual completa |
| **LEM** | Luís Eduardo Magalhães — município-alvo do MVP |
| **SDD** | Software Design Document — este documento |
| **NF-e / NFC-e** | Nota Fiscal eletrônica (modelo 55) / NFC-e (modelo 65) — documentos fiscais eletrônicos |
| **SEFAZ** | Secretaria da Fazenda estadual — autorizadora dos documentos fiscais de produto |
| **NFS-e** | Nota Fiscal de Serviços eletrônica — regras em geral municipais |
| **SPED** | Sistema Público de Escrituração Digital — obrigação acessória (fora do escopo inicial do ERP) |

---

> **Documento elaborado para o projeto Conexão Municipal**
> Prefeitura de Luís Eduardo Magalhães — BA
> Versão **2.0** — Abril 2026
