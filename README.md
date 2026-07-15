# Gerenciamento Felinos

Prontuário veterinário digital para profissionais autônomos especialistas em felinos. Centraliza cadastro de pacientes, tutores, locais de atendimento e o histórico clínico completo (timeline de atendimentos), independente de onde a consulta aconteceu.

## Objetivo

Substituir o controle fragmentado de pacientes (WhatsApp, planilhas, PDFs, sistemas de clínicas parceiras) por um prontuário único, portátil, que o veterinário carrega para qualquer local de atendimento (clínica parceira, consultório próprio ou domicílio).

Público-alvo: veterinário autônomo especialista em felinos. Financeiro, estoque, agenda e gestão de equipe estão fora do escopo do MVP (ver `docs/architecture.md`).

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Backend | NestJS + TypeScript |
| Banco de dados | PostgreSQL 16 |
| ORM | Prisma 6 |
| Frontend | React + TypeScript (PWA) — ainda não iniciado |
| Monorepo | Turborepo + npm workspaces |
| Hash de senha | bcryptjs |

## Estrutura de pastas

```
gerenciamento-felinos/
├── apps/
│   ├── backend/
│   │   ├── package.json
│   │   ├── prisma/migrations gerenciadas em src/prisma/migrations
│   │   └── src/
│   │       ├── app.module.ts
│   │       ├── main.ts
│   │       └── prisma/
│   │           ├── schema.prisma
│   │           ├── seed.ts
│   │           └── migrations/
│   └── frontend/          # placeholder, setup ainda não iniciado
├── packages/
│   └── shared/            # DTOs e enums compartilhados (ainda não populado)
├── docs/
│   ├── architecture.md
│   ├── checklist.md
│   └── openapi.yaml
├── docker-compose.yml
└── .env / .env.example
```

## Como executar o projeto localmente

Pré-requisitos: Node.js 20+, npm, Docker.

```bash
# 1. Instalar dependências do monorepo
npm install

# 2. Subir o banco de dados (ver seção abaixo)
docker compose up -d

# 3. Rodar migrations
cd apps/backend
npm run db:migrate

# 4. (Opcional) popular dados de teste
npm run db:seed

# 5. Iniciar o backend em modo dev
npm run dev
```

## Como iniciar o banco de dados com Docker

Na raiz do projeto:

```bash
docker compose up -d
```

Isso sobe um container PostgreSQL 16 (`gerenciamento-felinos-db`) na porta `5432`, com dados persistidos no volume `felino_pgdata`. Para parar: `docker compose down` (o volume não é removido).

## Variáveis de ambiente

Arquivo `.env` na raiz do projeto (copiar de `.env.example`):

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | String de conexão PostgreSQL usada pelo Prisma |
| `JWT_ACCESS_SECRET` | Segredo do access token JWT |
| `JWT_REFRESH_SECRET` | Segredo do refresh token JWT |
| `JWT_ACCESS_EXPIRES_IN` | Validade do access token (ex: `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Validade do refresh token (ex: `7d`) |
| `PORT` | Porta do backend NestJS |
| `VITE_API_URL` | URL base da API consumida pelo frontend |

O `.env` fica na raiz do monorepo e é carregado pelos scripts do backend via `dotenv-cli` (os comandos `db:*` do `apps/backend` já apontam para `../../.env`).

## O que já foi implementado

- [x] Monorepo Turborepo (`apps/backend`, `apps/frontend`, `packages/shared`)
- [x] PostgreSQL local via Docker Compose
- [x] Prisma instalado no `apps/backend` (v6.19.3 — schema em `src/prisma/schema.prisma`)
- [x] `schema.prisma` completo com os modelos da arquitetura v1.3.0 (`User`, `Tutor`, `Patient`, `Location`, `Appointment`, `RefreshToken`, `Document` reservado)
- [x] Primeira migration (`init`) aplicada no banco
- [x] Seed básico com usuário, tutor e paciente de teste
- [x] **Módulo Auth completo** — register, login, refresh, logout, forgot/reset-password, guard JWT global, rate limiting (ver detalhes abaixo)

### Módulo Auth

Endpoints (`/v1/auth/*`, todos conforme `docs/openapi.yaml`):

| Rota | Auth necessária | Rate limit |
|---|---|---|
| `POST /auth/register` | Não | 5/min |
| `POST /auth/login` | Não | 10/min |
| `POST /auth/refresh` | Não | 20/min |
| `POST /auth/forgot-password` | Não | 5/min |
| `POST /auth/reset-password` | Não | 5/min |
| `POST /auth/logout` | Sim (Bearer access token) | — |

Decisões desta etapa:

- **`PasswordResetToken` — tabela nova, não prevista na arquitetura v1.3.0.** O schema aprovado não tinha onde persistir o token de recuperação de senha. Foi criada seguindo o mesmo padrão do `RefreshToken` (ADR-006): só o hash SHA-256 do token fica no banco, nunca o valor bruto, e o token é marcado `used` após o reset. Decisão confirmada com o usuário antes da migration.
- **Access e refresh tokens são JWTs assinados com segredos separados** (`JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`, já previstos no `.env.example`). O refresh token, além de assinado, tem seu hash persistido em `refresh_tokens` — o `/auth/refresh` verifica a assinatura **e** a existência/validade no banco antes de rotacionar (token antigo é revogado, um novo é emitido).
- **`/auth/logout` revoga todos os refresh tokens ativos do usuário.** A rota não recebe corpo na spec (`docs/openapi.yaml`), então não há como indicar "qual" sessão encerrar — encerrar todas é o comportamento mais seguro para o MVP (single-user).
- **`/auth/reset-password` também revoga todos os refresh tokens do usuário** ao trocar a senha, por segurança (uma sessão previamente aberta não sobrevive à troca de senha).
- **`/auth/forgot-password` não envia e-mail de verdade** — não há provedor de e-mail configurado ainda no MVP. Sempre responde 200 (para não revelar se o e-mail existe, conforme a spec) e, se o e-mail existir, loga o link/token no console do backend para uso manual em desenvolvimento.
- **`JwtAuthGuard` é global** (`APP_GUARD`), registrado dentro do próprio `AuthModule`. Rotas públicas usam `@Public()`; `@CurrentUser()` expõe o usuário autenticado (id extraído do JWT) nos controllers.
- **Rate limiting (`@nestjs/throttler`) é aplicado só no `AuthController`**, não globalmente — os demais módulos ainda não têm requisitos de rate limit definidos.
- **`ValidationPipe` global + filtro RFC 7807 (`application/problem+json`)** foram adicionados como pré-requisito para o Auth responder no formato definido em `docs/openapi.yaml` (erros com `type`/`title`/`status`/`detail`/`errors[]`). Cobre todo o app, não só Auth — é infraestrutura transversal mínima necessária, o hardening completo do item 8 do checklist (ownership, etc.) continua pendente.

### Decisões arquiteturais anteriores

- **Prisma fixado em 6.19.3, não 7.x**: a v7 remove o suporte a `datasource.url` diretamente no `schema.prisma` (exige adapters de driver), quebrando a sintaxe já aprovada em `docs/architecture.md` v1.3.0. Fixar em 6.x evita reescrever a arquitetura aprovada por causa de uma dependência.
- **Schema em `apps/backend/src/prisma/schema.prisma`**: segue a estrutura de pastas definida em `docs/architecture.md`, mantendo tudo relativo ao Prisma dentro do módulo de backend.
- **`bcryptjs` em vez de `bcrypt`**: `bcrypt` exige compilação nativa (node-gyp), com risco de falha em ambientes Windows sem toolchain de build. `bcryptjs` é implementação pura em JS, mesma API, zero dependência nativa — sem downside relevante nesta escala.
- **`.env` único na raiz do monorepo**: compartilhado entre backend e frontend (já era a convenção existente); os scripts `db:*` do backend usam `dotenv-cli` para carregá-lo, evitando duplicar variáveis por app.

## Próximos passos

Com base no restante de `docs/checklist.md`:

1. **Módulo Users** — perfil do usuário autenticado.
2. **Módulo Tutors** — CRUD completo.
3. **Módulo Locations** — CRUD completo.
4. **Módulo Patients** — CRUD, foto, estratégia de storage.
5. **Módulo Appointments** — CRUD, regras de `location_type`.
6. **Validação e erros transversais** — checagem de ownership em todas as queries (o `ValidationPipe` global e o exception filter RFC 7807 já foram implementados junto com o Auth).
7. **Testes** — unitários (auth, appointments) e e2e dos fluxos principais.
8. **Frontend (PWA)** — setup React, telas de login, pacientes, atendimentos, tutores/locais, perfil.
9. **Pré-lançamento** — placeholders legais, hosting, deploy de staging, teste piloto.
