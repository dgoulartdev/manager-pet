# Arquitetura — Gerenciamento Felinos

**Versão:** 1.3.0
**Data:** 2026-07-05
**Status:** Aprovado — pronto para implementação

---

## 1. Visão Geral do Produto

Sistema de prontuário veterinário focado em profissionais autônomos especialistas em felinos. O veterinário registra e consulta o histórico completo dos seus pacientes, independente do local onde o atendimento foi realizado.

**Problema resolvido:** Veterinários autônomos gerenciam informações de pacientes de forma fragmentada (WhatsApp, planilhas, PDFs, sistemas de clínicas parceiras). O sistema centraliza tudo em um prontuário próprio e portátil.

**Público-alvo inicial:** Veterinário autônomo especialista em felinos que atende em clínicas parceiras, consultórios e domicílios.

---

## 2. Escopo do MVP

### Incluído

- Autenticação (cadastro, login, recuperação de senha)
- Cadastro de pacientes (felinos) com foto
- Cadastro de tutores (donos dos animais)
- Cadastro de locais de atendimento
- Registro de atendimentos veterinários completos
- Timeline de atendimentos por paciente
- Busca por nome do paciente, tutor e telefone

### Explicitamente fora do MVP

Financeiro, estoque, agenda, gestão de clínica, funcionários, portal do tutor, integração com WhatsApp, IA, upload de documentos/exames.

**Nota:** O módulo de documentos de exames está planejado para a primeira iteração pós-MVP. A tabela `Document` já está reservada no schema para evitar migration traumática com dados em produção.

---

## 3. Stack Tecnológica

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Backend | NestJS + TypeScript | Estrutura modular nativa, DI, decorators — ideal para Modular Monolith |
| Banco de dados | PostgreSQL | ACID, relacional, suporte a JSON, maturidade |
| ORM | Prisma | Type-safety, migrations, DX superior para TypeScript |
| Frontend | React + TypeScript (PWA) | Familiaridade do time, PWA para uso mobile em clínicas |
| Monorepo | Turborepo | Compartilhamento de DTOs e enums entre backend e frontend |
| API | REST + OpenAPI 3.1 | Contratos versionados, geração de tipos automática |

---

## 4. Arquitetura: Modular Monolith

### Diagrama

```
┌─────────────────────────────────────────────────────────────┐
│                     Turborepo Monorepo                       │
│                                                              │
│  ┌──────────────────────┐    ┌──────────────────────────┐   │
│  │   apps/backend        │    │   apps/frontend           │   │
│  │   (NestJS)            │    │   (React PWA)             │   │
│  │                       │    │                           │   │
│  │  ┌────────────────┐   │    │  Consome REST API /v1     │   │
│  │  │ AuthModule     │   │    └──────────────────────────┘   │
│  │  ├────────────────┤   │                                    │
│  │  │ UsersModule    │   │    ┌──────────────────────────┐   │
│  │  ├────────────────┤   │    │   packages/shared         │   │
│  │  │ TutorsModule   │◄──┼────┤   DTOs, Enums, Types      │   │
│  │  ├────────────────┤   │    └──────────────────────────┘   │
│  │  │ PatientsModule │   │                                    │
│  │  ├────────────────┤   │                                    │
│  │  │ LocationsModule│   │                                    │
│  │  ├────────────────┤   │                                    │
│  │  │ AppointmentsM. │   │                                    │
│  │  └────────────────┘   │                                    │
│  │          │             │                                    │
│  │    ┌─────▼──────┐      │                                   │
│  │    │   Prisma   │      │                                   │
│  │    └─────┬──────┘      │                                   │
│  └──────────┼─────────────┘                                   │
│             │                                                  │
│      ┌──────▼──────┐                                          │
│      │  PostgreSQL  │                                          │
│      └─────────────┘                                          │
└─────────────────────────────────────────────────────────────┘
```

### Estrutura de pastas

```
gerenciamento-felinos/
├── apps/
│   ├── backend/
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── auth/
│   │       │   ├── users/
│   │       │   ├── tutors/
│   │       │   ├── patients/
│   │       │   ├── locations/
│   │       │   └── appointments/
│   │       ├── prisma/
│   │       │   └── schema.prisma
│   │       └── main.ts
│   └── frontend/
│       └── src/
└── packages/
    └── shared/
        ├── dtos/
        └── enums/
```

---

## 5. Módulos e Responsabilidades

| Módulo | Responsabilidade |
|---|---|
| `AuthModule` | Registro, login, refresh token, recuperação de senha, logout |
| `UsersModule` | Perfil do veterinário autenticado, alteração de senha |
| `TutorsModule` | CRUD de tutores (donos dos animais) |
| `PatientsModule` | CRUD de pacientes, upload de foto |
| `LocationsModule` | CRUD de locais de atendimento pré-cadastrados |
| `AppointmentsModule` | Registro e histórico de atendimentos, timeline por paciente |

---

## 6. Schema Prisma

```prisma
// schema.prisma
// Gerenciamento Felinos — v1.2.0

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ---------------------------------------------------------------------------
// ENUMS
// ---------------------------------------------------------------------------

enum Sex {
  MALE
  FEMALE
  UNKNOWN
}

enum LocationType {
  REGISTERED   // Local pré-cadastrado (FK para Location)
  AD_HOC       // Local avulso informado na hora
  HOME_VISIT   // Atendimento domiciliar
}

// ---------------------------------------------------------------------------
// MODELS
// ---------------------------------------------------------------------------

model User {
  id         String   @id @default(uuid())
  name       String
  email      String   @unique
  password   String   // bcrypt hash
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  // Relações (isolamento multitenant via user_id)
  tutors          Tutor[]
  patients        Patient[]
  locations       Location[]
  appointments    Appointment[]
  documents       Document[]
  refresh_tokens  RefreshToken[]

  @@map("users")
}

model Tutor {
  id         String   @id @default(uuid())
  user_id    String
  name       String
  phone      String?
  email      String?
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  user     User      @relation(fields: [user_id], references: [id])
  patients Patient[]

  @@index([user_id])
  @@map("tutors")
}

model Patient {
  id         String    @id @default(uuid())
  user_id    String
  tutor_id   String
  name       String
  species    String?
  sex        Sex       @default(UNKNOWN)
  breed      String?
  color      String?
  birth_date DateTime?
  photo_url  String?
  created_at DateTime  @default(now())
  updated_at DateTime  @updatedAt

  user         User          @relation(fields: [user_id], references: [id])
  tutor        Tutor         @relation(fields: [tutor_id], references: [id])
  appointments Appointment[]

  @@index([user_id])
  @@index([tutor_id])
  @@map("patients")
}

model Location {
  id         String   @id @default(uuid())
  user_id    String
  name       String
  address    String?
  phone      String?
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  user         User          @relation(fields: [user_id], references: [id])
  appointments Appointment[]

  @@index([user_id])
  @@map("locations")
}

model Appointment {
  id                   String       @id @default(uuid())
  user_id              String
  patient_id           String
  location_type        LocationType
  location_id          String?      // preenchido se location_type = REGISTERED
  ad_hoc_location_name String?      // preenchido se location_type = AD_HOC
  home_address         String?      // opcional se location_type = HOME_VISIT
  date                 DateTime
  weight_kg            Decimal?     @db.Decimal(5, 2)
  chief_complaint      String?
  history              String?      @db.Text
  diagnosis            String?      @db.Text
  treatment            String?      @db.Text
  prescription         String?      @db.Text
  notes                String?      @db.Text
  created_at           DateTime     @default(now())
  updated_at           DateTime     @updatedAt

  user      User      @relation(fields: [user_id], references: [id])
  patient   Patient   @relation(fields: [patient_id], references: [id], onDelete: Cascade)
  location  Location? @relation(fields: [location_id], references: [id])
  documents Document[]

  @@index([user_id])
  @@index([patient_id])
  @@index([location_id])
  @@index([date])
  @@map("appointments")
}

// ---------------------------------------------------------------------------
// SEGURANÇA — Refresh tokens persistidos para invalidação real no logout.
// token_hash armazena o hash do token (nunca o valor bruto).
// ---------------------------------------------------------------------------

model RefreshToken {
  id         String   @id @default(uuid())
  user_id    String
  token_hash String   @unique  // SHA-256 do refresh token, nunca o token bruto
  expires_at DateTime
  revoked    Boolean  @default(false)
  created_at DateTime @default(now())

  user User @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id])
  @@map("refresh_tokens")
}

// ---------------------------------------------------------------------------
// RESERVADO — Módulo de documentos/exames (pós-MVP)
// Tabela criada agora para evitar migration com dados em produção no futuro.
// Nenhum endpoint exposto no MVP.
// ---------------------------------------------------------------------------

model Document {
  id             String      @id @default(uuid())
  user_id        String
  appointment_id String
  name           String
  type           String?     // "exame_sangue", "raio_x", "laudo", etc.
  url            String      // URL do arquivo no storage externo (S3/R2)
  created_at     DateTime    @default(now())

  user        User        @relation(fields: [user_id], references: [id])
  appointment Appointment @relation(fields: [appointment_id], references: [id], onDelete: Cascade)

  @@index([user_id])
  @@index([appointment_id])
  @@map("documents")
}
```

---

## 7. Padrões de API

- **Versionamento:** prefixo `/v1/` em todos os endpoints desde o dia zero
- **Erros:** RFC 7807 (`application/problem+json`) com campos `type`, `title`, `status`, `detail`, `errors[]`
- **Paginação:** offset-based com `page`, `per_page`, `total`, `total_pages`
- **Rotas planas com query params:** ex. `/appointments?patient_id=X` em vez de `/patients/:id/appointments`
- **Convenção de nomes:** `snake_case` nos JSON, alinhado com Prisma
- **Spec completa:** `docs/specs/openapi.yaml` (OpenAPI 3.1, 27 endpoints, 6 módulos)

---

## 8. Multitenancy

Estratégia: **isolamento por `user_id`** em todas as entidades.

Todos os models possuem `user_id` com FK para `User`. Toda query no backend filtra por `user_id` derivado do JWT. Nenhum veterinário acessa dados de outro.

Esta abordagem foi escolhida para preparar o sistema para múltiplos usuários sem construir infraestrutura multi-tenant completa prematuramente. Quando necessário, a extração para schemas separados ou row-level security no PostgreSQL é viável sem reescrita.

---

## 9. ADRs — Decisões de Arquitetura

### ADR-001: Modular Monolith em vez de Microserviços

**Status:** Aceito

**Contexto:**
Projeto desenvolvido por uma pessoa só, sem deadline fixo, com potencial de crescimento futuro para SaaS multi-usuário.

**Decisão:**
Adotar Modular Monolith com fronteiras de módulo bem definidas no NestJS.

**Consequências positivas:**
- Zero overhead operacional de microserviços (sem service discovery, sem mensageria)
- Deploy simples de uma única aplicação
- Fronteiras limpas permitem extração futura de módulos

**Consequências negativas:**
- Escala vertical tem limite (aceitável para o estágio atual)
- Disciplina necessária para não violar fronteiras entre módulos

**Alternativas rejeitadas:**
- Microserviços: complexidade operacional incompatível com time solo
- Monolito sem modularização: acúmulo de dívida técnica rapidamente

---

### ADR-002: PostgreSQL + Prisma como banco de dados

**Status:** Aceito

**Contexto:**
Dados relacionais com múltiplas entidades interligadas (usuário → tutor → paciente → atendimento). Necessidade de type-safety no acesso ao banco.

**Decisão:**
PostgreSQL como banco principal, Prisma como ORM.

**Consequências positivas:**
- ACID compliance para integridade dos dados clínicos
- Prisma gera tipos TypeScript automaticamente do schema
- Migrations versionadas e rastreáveis

**Consequências negativas:**
- Prisma adiciona uma camada de abstração (workarounds para queries muito complexas)

**Alternativas rejeitadas:**
- MongoDB: modelo relacional forte torna documento sem vantagem
- TypeORM: DX inferior ao Prisma para TypeScript

---

### ADR-003: Turborepo como monorepo

**Status:** Aceito

**Contexto:**
Backend e frontend precisam compartilhar DTOs e enums para evitar duplicação e inconsistência de contratos.

**Decisão:**
Turborepo com `packages/shared` para tipos compartilhados.

**Consequências positivas:**
- DTOs e enums definidos uma vez, usados em ambos os lados
- Build cache acelera CI no futuro

**Consequências negativas:**
- Curva inicial de configuração do monorepo

**Alternativas rejeitadas:**
- Repositórios separados: sincronização manual de tipos é fonte de bugs
- NPM package privado: overhead desnecessário para projeto solo

---

### ADR-004: Rotas planas com query params em vez de rotas aninhadas

**Status:** Aceito

**Contexto:**
Atendimentos se relacionam com pacientes. A convenção REST comum seria `/patients/:id/appointments`, mas isso limita filtros futuros.

**Decisão:**
Usar `/appointments?patient_id=X` para todos os filtros relacionais.

**Consequências positivas:**
- Flexibilidade para combinar filtros (`?patient_id=X&location_id=Y&date_from=Z`)
- Consistência — um único endpoint de listagem por recurso

**Consequências negativas:**
- Menos "explícito" visualmente que rotas aninhadas

---

### ADR-005: Tabela `Document` reservada no MVP sem endpoints expostos

**Status:** Aceito

**Contexto:**
Upload de documentos e exames está fora do MVP, mas é a primeira funcionalidade planejada para pós-MVP. Adicionar a tabela depois com dados em produção exige migration com risco.

**Decisão:**
Criar a tabela `Document` no schema Prisma desde o início, sem nenhum endpoint ou módulo NestJS associado no MVP.

**Consequências positivas:**
- Migration futura é simples (apenas novo módulo, tabela já existe)
- Sem risco de alterar schema com dados de produção

**Consequências negativas:**
- Tabela "vazia" em produção durante o MVP (sem impacto real)

---

### ADR-006: Refresh tokens persistidos no banco com hash

**Status:** Aceito

**Contexto:**
Logout sem persistência de refresh token é ineficaz — o token continua válido até expirar mesmo após o usuário sair. Em caso de dispositivo roubado ou comprometido, não há mecanismo de revogação.

**Decisão:**
Persistir o hash SHA-256 de cada refresh token na tabela `refresh_tokens`. O valor bruto nunca é armazenado. No logout, o token é marcado como `revoked = true`. No uso do refresh, verifica-se existência, validade e `revoked = false` antes de emitir novo access token.

**Consequências positivas:**
- Logout real: token invalidado imediatamente no banco
- Suporte futuro a "revogar todos os dispositivos" (revogar todos os tokens do usuário)
- Token bruto nunca exposto em caso de vazamento do banco

**Consequências negativas:**
- Uma query extra no banco a cada uso do refresh token (custo desprezível)
- Necessidade de job de limpeza de tokens expirados (simples de implementar)

**Alternativas rejeitadas:**
- Refresh token stateless (apenas JWT): logout não invalida o token de verdade
- Armazenar o token bruto: desnecessário e mais arriscado em caso de vazamento do banco

---

## 10. Visão de Produto e Princípios de Desenvolvimento

### 10.1 Problema que o sistema resolve

Veterinários autônomos gerenciam informações de pacientes de forma fragmentada — WhatsApp, planilhas, PDFs, anotações pessoais e sistemas das clínicas onde atendem. Isso gera dificuldade para consultar histórico clínico rapidamente, acompanhar a evolução do paciente e manter um prontuário próprio independente do local de atendimento.

O Gerenciamento Felinos centraliza o prontuário no profissional, não na clínica. O veterinário carrega sua base de pacientes para onde for.

### 10.2 Posicionamento de produto

O sistema **não compete** com plataformas completas de gestão veterinária (hospitais, clínicas com múltiplos funcionários, controle financeiro e estoque). O foco é o profissional independente que precisa de uma ferramenta enxuta, portátil e especializada.

Esse posicionamento é uma diretriz ativa: qualquer nova funcionalidade deve ser avaliada contra esse princípio antes de entrar no roadmap.

### 10.3 Trajetória de evolução planejada

As decisões arquiteturais do MVP foram tomadas antecipando a seguinte evolução:

| Fase | Expansão planejada |
|---|---|
| MVP | Veterinário autônomo felino, usuário único |
| Pós-MVP imediato | Upload de documentos e exames (tabela `Document` já reservada) |
| Futuro | Outras espécies além de felinos |
| Futuro | Multiusuários — equipes veterinárias pequenas |
| Futuro | Recursos avançados (agenda, financeiro básico, portal do tutor) |

Decisões que já refletem essa trajetória: `user_id` em todas as entidades (multitenancy), tabela `Document` reservada, fronteiras de módulo limpas no NestJS (extração futura viável).

### 10.4 Princípios de desenvolvimento

Estes princípios governam decisões cotidianas e devem ser consultados antes de qualquer nova feature ou mudança arquitetural:

**Simplicidade primeiro.** Adicionar complexidade só quando um problema real exigir. Nenhuma funcionalidade entra sem validar se resolve uma dor concreta do usuário.

**Boa experiência para o profissional autônomo.** O veterinário usa o sistema sozinho, muitas vezes em movimento, entre atendimentos. Fluxos devem ser rápidos e sem fricção desnecessária.

**Arquitetura preparada para crescimento, não prematuramente complexa.** Preparar o terreno (como `user_id` universal e tabelas reservadas) é diferente de construir infraestrutura que não será usada no MVP.

**Fronteiras de módulo são contratos.** Módulos NestJS só se comunicam via interfaces públicas. Violações de fronteira criam acoplamento que dificulta a extração futura para serviços independentes.

---

## 11. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Scope creep no MVP | Alta | Alto | Lista "fora do MVP" documentada e revisada antes de cada nova feature |
| Fronteiras de módulo violadas | Média | Médio | Code review pessoal antes de merge; módulos só se comunicam via interfaces públicas |
| Storage para fotos sem definição | Baixa | Baixo | MVP pode usar URL externa ou base64 temporariamente; storage real é pós-MVP |
| Migration traumática pós-MVP | Baixa | Alto | Tabelas reservadas (Document, RefreshToken) e `user_id` em todas as entidades desde o início |
| Logout ineficaz / token roubado | Baixa | Alto | Refresh tokens persistidos com hash; revogação imediata no logout (ADR-006) |
