# MeuPaciente

Prontuário veterinário digital para profissionais autônomos, com suporte inicial a pacientes cães e gatos. Centraliza cadastro de pacientes, tutores, locais de atendimento, vacinas e o histórico clínico completo (timeline de atendimentos), independente de onde a consulta aconteceu.

## Objetivo

Substituir o controle fragmentado de pacientes (WhatsApp, planilhas, PDFs, sistemas de clínicas parceiras) por um prontuário único, portátil, que o veterinário carrega para qualquer local de atendimento (clínica parceira, consultório próprio ou domicílio).

Público-alvo: veterinário autônomo que atende cães e gatos. Financeiro, estoque, agenda e gestão de equipe estão fora do escopo do MVP (ver `docs/architecture.md`).

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Backend | NestJS 10 + TypeScript |
| Banco de dados | PostgreSQL 16 |
| ORM | Prisma 6 |
| Frontend | React 18 + TypeScript + Vite (PWA) — em desenvolvimento |
| Monorepo | Turborepo + npm workspaces |
| Testes | Jest + Supertest |
| Hash de senha | bcryptjs |

## Documentação

| Documento | Conteúdo |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | Escopo, schema, padrões de API e ADRs |
| [`docs/openapi.yaml`](docs/openapi.yaml) | Contrato completo da API (OpenAPI 3.1, 36 endpoints) |
| [`docs/checklist.md`](docs/checklist.md) | Progresso do MVP item a item |

## Estrutura de pastas

```
meupaciente/
├── apps/
│   ├── backend/                 # API NestJS
│   │   ├── src/
│   │   │   ├── common/          # decorators, filtro RFC 7807, mappers, paginação
│   │   │   ├── config/          # validação de env no boot
│   │   │   ├── modules/         # auth, users, tutors, patients, locations, appointments, vaccines
│   │   │   ├── prisma/          # schema.prisma, migrations, seed
│   │   │   └── main.ts
│   │   └── test/                # testes e2e
│   └── frontend/                # PWA React (esqueleto: Vite + vite-plugin-pwa)
├── packages/
│   └── shared/                  # DTOs e enums compartilhados (@meupaciente/shared)
├── docs/
├── docker-compose.yml
└── .env.example
```

## Como executar o projeto localmente

Pré-requisitos: Node.js 20+, npm, Docker.

```bash
# 1. Instalar dependências do monorepo
npm install

# 2. Criar o .env a partir do exemplo
cp .env.example .env

# 3. Subir o banco de dados
docker compose up -d

# 4. Rodar migrations (gera também o Prisma Client)
cd apps/backend
npm run db:migrate

# 5. (Opcional) popular dados de teste — usuário teste@meupaciente.com / teste123
npm run db:seed

# 6. Iniciar o backend em modo dev (http://localhost:3000/v1)
npm run dev
```

Na raiz, `npm run dev` sobe backend e frontend juntos via Turborepo (o `packages/shared` é compilado antes).

## Como iniciar o banco de dados com Docker

Na raiz do projeto:

```bash
docker compose up -d
```

Isso sobe um container PostgreSQL 16 (`meupaciente-db`) na porta `5432`, com dados persistidos no volume `meupaciente_pgdata`. Para parar: `docker compose down` (o volume não é removido).

## Testes

Dentro de `apps/backend`:

```bash
# Unitários (não precisam de banco)
npm test

# e2e (precisam do Postgres no ar; rodam no schema isolado `test_e2e`)
npm run test:e2e
```

## Variáveis de ambiente

Arquivo `.env` na raiz do projeto (copiar de `.env.example`):

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | Sim | String de conexão PostgreSQL usada pelo Prisma |
| `JWT_ACCESS_SECRET` | Sim | Segredo do access token JWT |
| `JWT_REFRESH_SECRET` | Sim | Segredo do refresh token JWT |
| `JWT_ACCESS_EXPIRES_IN` | Não | Validade do access token (padrão `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Não | Validade do refresh token (padrão `7d`) |
| `PORT` | Não | Porta do backend (padrão `3000`) |
| `CORS_ORIGIN` | Não | Origens permitidas no CORS, separadas por vírgula (ausente = libera todas) |
| `PUBLIC_URL` | Não | Base pública para montar a URL das fotos de pacientes (padrão `http://localhost:$PORT`) |
| `NODE_ENV` | Não | Em `production`, o token de recuperação de senha deixa de ser logado |
| `VITE_API_URL` | Não | URL base da API consumida pelo frontend |

As variáveis obrigatórias são validadas no boot: o backend não sobe se faltar alguma. O `.env` fica na raiz do monorepo e é carregado pelos scripts do backend via `dotenv-cli`.

## Estado atual

**Backend completo para o MVP; frontend ainda não iniciado.** Detalhe item a item em [`docs/checklist.md`](docs/checklist.md).

| Módulo | Endpoints (`/v1`) |
|---|---|
| Auth | `POST /auth/register`, `/login`, `/refresh`, `/logout`, `/forgot-password`, `/reset-password` |
| Users | `GET/PATCH /users/me`, `PATCH /users/me/password` |
| Tutors | CRUD `/tutors` — busca por nome, e-mail ou telefone; remoção bloqueada se houver pacientes |
| Locations | CRUD `/locations` — remoção bloqueada se houver atendimentos |
| Patients | CRUD `/patients` — busca por paciente, tutor ou telefone; `PUT/DELETE /patients/:id/photo` |
| Appointments | CRUD `/appointments` — filtros `patient_id`, `location_id`, `date_from`, `date_to` |
| Vaccines | CRUD `/vaccines` — filtro `patient_id`; vínculo opcional a um atendimento do mesmo paciente |

### Convenções da API

- Erros no formato RFC 7807 (`application/problem+json`); validação responde 422 com `errors[]` por campo.
- Toda query é filtrada pelo `user_id` do token; recurso de outro usuário responde 404.
- Datas trafegam como `YYYY-MM-DD`; data com hora é rejeitada.
- PATCH é parcial: campo ausente não muda, `null` limpa campos anuláveis e é rejeitado em campos obrigatórios.

### Decisões do módulo Auth

| Rota | Auth necessária | Rate limit |
|---|---|---|
| `POST /auth/register` | Não | 5/min |
| `POST /auth/login` | Não | 10/min |
| `POST /auth/refresh` | Não | 20/min |
| `POST /auth/forgot-password` | Não | 5/min |
| `POST /auth/reset-password` | Não | 5/min |
| `POST /auth/logout` | Sim (Bearer access token) | 20/min |

- **Access e refresh tokens são JWTs assinados com segredos separados.** O refresh token também tem o hash SHA-256 persistido em `refresh_tokens` (ADR-006): o `/auth/refresh` verifica assinatura **e** banco antes de rotacionar (o token usado é revogado e um novo par é emitido).
- **Logout revoga todos os refresh tokens ativos do usuário.** A rota não recebe corpo, então não há como indicar uma sessão específica. Troca e redefinição de senha fazem o mesmo.
- **`PasswordResetToken`** segue o padrão do `RefreshToken`: só o hash fica no banco, e o token é marcado `used` após o reset (validade de 1h).
- **`/auth/forgot-password` ainda não envia e-mail** — não há provedor configurado. Sempre responde 200 (não revela se o e-mail existe) e, fora de produção, loga o token no console para uso manual. **Em produção a recuperação de senha não funciona até um provedor de e-mail ser integrado.**
- **`JwtAuthGuard` é global** (`APP_GUARD`). Rotas públicas usam `@Public()`; `@CurrentUser()` expõe o usuário autenticado.
- **Rate limiting (`@nestjs/throttler`) é aplicado só no `AuthController`.**

### Outras decisões de implementação

- **Foto de paciente em disco local** (`apps/backend/uploads/`, servido em `/uploads/`), atrás da interface `PatientPhotoStorage` (ADR-007). Em PaaS sem volume persistente a foto some no redeploy; migrar para R2/S3 é trocar um provider.
- **Vacinas são um model próprio** com `appointment_id` opcional (ADR-009): remover um atendimento não apaga a vacina.
- **Prisma fixado em 6.x, não 7.x**: a v7 remove `datasource.url` no `schema.prisma` (exige adapters de driver), o que quebraria a sintaxe aprovada na arquitetura.
- **Schema em `apps/backend/src/prisma/schema.prisma`**, mantendo tudo do Prisma dentro do backend.
- **`bcryptjs` em vez de `bcrypt`**: implementação pura em JS, sem compilação nativa (evita falhas com node-gyp).
- **`.env` único na raiz do monorepo**, compartilhado entre backend e frontend.

## Próximos passos

1. **Frontend (PWA)** — cliente HTTP com refresh automático, telas de autenticação, pacientes, atendimentos, vacinas, tutores/locais e perfil.
2. **Pendências do backend** — provedor de e-mail para recuperação de senha, limpeza de tokens expirados e testes que faltam.
3. **Pré-lançamento** — hosting (com storage persistente para fotos), documentos legais, deploy de staging e teste com usuária piloto.
