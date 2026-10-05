# MeuPaciente

Prontuário veterinário digital para profissionais autônomos, com suporte inicial a pacientes cães e gatos. Centraliza cadastro de pacientes, tutores, locais de atendimento, vacinas, pesagens e o histórico clínico completo (timeline de atendimentos), independente de onde a consulta aconteceu.

**Estado:** MVP concluído e em produção na Vercel, pronto para o uso piloto. Detalhe item a item em [`docs/checklist.md`](docs/checklist.md).

## Objetivo

Substituir o controle fragmentado de pacientes (WhatsApp, planilhas, PDFs, sistemas de clínicas parceiras) por um prontuário único, portátil, que o veterinário carrega para qualquer local de atendimento (clínica parceira, consultório próprio ou domicílio).

Público-alvo: veterinário autônomo que atende cães e gatos. Financeiro, estoque, agenda e gestão de equipe estão fora do escopo do MVP (ver `docs/architecture.md`).

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Backend | NestJS 10 + TypeScript |
| Banco de dados | PostgreSQL 16 (local) / Neon (produção) |
| ORM | Prisma 6 |
| Frontend | React 18 + TypeScript + Vite, instalável como PWA |
| Monorepo | Turborepo + npm workspaces |
| Testes | Jest + Supertest |
| Hospedagem | Vercel (API e app), Vercel Blob (fotos), Vercel Cron (tarefa diária) |
| E-mail | SMTP (Gmail com senha de app); Mailpit no desenvolvimento |

## Documentação

| Documento | Conteúdo |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | Escopo, schema, padrões de API e decisões (ADR-001 a ADR-012) |
| [`docs/openapi.yaml`](docs/openapi.yaml) | Contrato completo da API (OpenAPI 3.1, 37 endpoints) |
| [`docs/checklist.md`](docs/checklist.md) | Progresso do MVP item a item |

## Estrutura de pastas

```
meupaciente/
├── apps/
│   ├── backend/                 # API NestJS
│   │   ├── src/
│   │   │   ├── common/          # decorators, filtro RFC 7807, mappers, paginação
│   │   │   ├── config/          # validação de env no boot
│   │   │   ├── modules/         # auth, users, tutors, patients, locations, appointments,
│   │   │   │                    # vaccines, email, token-cleanup
│   │   │   ├── prisma/          # schema.prisma, migrations, seed
│   │   │   └── main.ts
│   │   ├── test/                # testes e2e
│   │   └── vercel.json          # região, migrations em produção e agenda do Cron
│   └── frontend/                # PWA React
│       ├── src/
│       │   ├── auth/            # sessão e renovação do token
│       │   ├── components/      # peças do Design System
│       │   ├── lib/             # cliente da API, datas, formatação, validação, fotos
│       │   ├── pages/           # uma pasta por tela
│       │   └── styles/          # tokens do Design System
│       └── vercel.json          # rotas da SPA
├── packages/
│   └── shared/                  # DTOs e enums compartilhados (@meupaciente/shared)
├── docs/
├── docker-compose.yml           # Postgres e Mailpit locais
└── .env.example
```

## Como executar o projeto localmente

Pré-requisitos: Node.js 20+, npm, Docker.

```bash
# 1. Instalar dependências (também compila o packages/shared e gera o Prisma Client)
npm install

# 2. Criar o .env a partir do exemplo
cp .env.example .env

# 3. Subir o Postgres e o Mailpit
docker compose up -d

# 4. Rodar as migrations
cd apps/backend
npm run db:migrate

# 5. (Opcional) popular dados de teste — usuário teste@meupaciente.com / teste123
npm run db:seed

# 6. Voltar à raiz e subir backend e frontend juntos
cd ../..
npm run dev
```

O backend fica em http://localhost:3000/v1 e o app em http://localhost:5173 (porta fixa: o CORS libera só ela).

## Serviços locais (Docker)

`docker compose up -d` sobe:

- **PostgreSQL 16** (`meupaciente-db`) na porta `5432`, com dados no volume `meupaciente_pgdata`.
- **Mailpit** (`meupaciente-mail`): recebe por SMTP na porta `1025` os e-mails que o backend envia, sem entregar a ninguém, e mostra as mensagens em http://localhost:8025. Para usá-lo, `SMTP_HOST=localhost` e `SMTP_PORT=1025` no `.env`.

Para parar: `docker compose down` (o volume não é removido).

## Testes

```bash
# Em apps/backend — unitários (não precisam de banco)
npm test

# Em apps/backend — e2e (precisam do Postgres no ar; rodam no schema isolado `test_e2e`)
npm run test:e2e

# Em apps/frontend — tipos, lint e build
npx tsc --noEmit -p tsconfig.json && npx eslint "src/**/*.{ts,tsx}" && npx vite build
```

## Variáveis de ambiente

Arquivo `.env` único na raiz do projeto (copiar de `.env.example`), lido pelo backend e pelo frontend:

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | Sim | String de conexão PostgreSQL usada pelo Prisma |
| `JWT_ACCESS_SECRET` | Sim | Segredo do access token JWT |
| `JWT_REFRESH_SECRET` | Sim | Segredo do refresh token JWT |
| `JWT_ACCESS_EXPIRES_IN` | Não | Validade do access token (padrão `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Não | Validade do refresh token (padrão `7d`) |
| `PORT` | Não | Porta do backend (padrão `3000`) |
| `CORS_ORIGIN` | Não | Origens permitidas no CORS, separadas por vírgula (ausente = libera todas) |
| `SIGNUP_ALLOWED_EMAILS` | Não | E-mails que podem criar conta, separados por vírgula (ausente = cadastro aberto; ADR-010) |
| `APP_URL` | Não | Endereço do app, usado no link de redefinição de senha |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | Não | Envio de e-mail por SMTP; com `SMTP_HOST`, usuário e senha passam a ser obrigatórios (ADR-011) |
| `RESEND_API_KEY` | Não | Alternativa ao SMTP (exige domínio próprio verificado no Resend) |
| `EMAIL_FROM` | Não | Remetente (padrão: `MeuPaciente <SMTP_USER>`) |
| `CRON_SECRET` | Não | Segredo exigido pela rota da limpeza diária de tokens |
| `BLOB_READ_WRITE_TOKEN` | Não | Vercel Blob para as fotos; ausente = fotos em disco local |
| `PUBLIC_URL` | Não | Base das URLs de fotos em disco local (padrão `http://localhost:$PORT`) |
| `VITE_API_URL` | Não | URL base da API consumida pelo frontend |

Sem nenhum provedor de e-mail configurado, o e-mail de recuperação de senha sai no log do backend. As variáveis obrigatórias são validadas no boot: o backend não sobe se faltar alguma.

## Deploy (Vercel)

Detalhes e motivos no ADR-012.

- **Dois projetos do mesmo repositório:** a API (pasta `apps/backend`, NestJS detectado sem configuração, que vira uma função na região São Paulo) e o app (pasta `apps/frontend`, Vite).
- **Banco:** Neon, criado pela integração da Vercel na região São Paulo.
- **Fotos:** Vercel Blob público, com endereço aleatório (ADR-007).
- **Monorepo:** o `npm install` compila o `packages/shared` (`prepare`) e gera o Prisma Client (`postinstall`).
- **Migrations:** rodam no `installCommand` de `apps/backend/vercel.json`, só no deploy de produção e pela URL direta do Neon (`DATABASE_URL_UNPOOLED`). Prévias de branch não tocam o banco.
- **Tarefa diária:** o Vercel Cron chama `GET /v1/cron/token-cleanup` às 3h (horário de Brasília), protegido por `CRON_SECRET` (ADR-006).
- **Atualizações:** cada push na `main` publica uma versão nova; o PWA se atualiza sozinho na próxima abertura.

## Funcionalidades da API

| Módulo | Endpoints (`/v1`) |
|---|---|
| Auth | `POST /auth/register`, `/login`, `/refresh`, `/logout`, `/forgot-password`, `/reset-password` |
| Users | `GET/PATCH /users/me`, `PATCH /users/me/password` |
| Tutors | CRUD `/tutors` — busca por nome, e-mail ou telefone; remoção bloqueada se houver pacientes |
| Locations | CRUD `/locations` — remoção bloqueada se houver atendimentos |
| Patients | CRUD `/patients` — busca por paciente, tutor ou telefone; `PUT/DELETE /patients/:id/photo` |
| Appointments | CRUD `/appointments` — filtros `patient_id`, `location_id`, `date_from`, `date_to` |
| Vaccines | CRUD `/vaccines` — filtro `patient_id`; vínculo opcional a um atendimento do mesmo paciente |
| Cron | `GET /cron/token-cleanup` — limpeza diária de tokens, só com `CRON_SECRET` |

### Convenções da API

- Erros no formato RFC 7807 (`application/problem+json`); validação responde 422 com `errors[]` por campo.
- Toda query é filtrada pelo `user_id` do token; recurso de outro usuário responde 404.
- Datas trafegam como `YYYY-MM-DD`; data com hora é rejeitada.
- PATCH é parcial: campo ausente não muda, `null` limpa campos anuláveis e é rejeitado em campos obrigatórios.

### Autenticação e segurança

| Rota | Auth necessária | Limite |
|---|---|---|
| `POST /auth/register` | Não | 5/min |
| `POST /auth/login` | Não | 10/min |
| `POST /auth/refresh` | Não | 20/min |
| `POST /auth/forgot-password` | Não | 5/min |
| `POST /auth/reset-password` | Não | 5/min |
| `POST /auth/logout` | Sim | 20/min |
| `PATCH /users/me` | Sim | 10/min |
| `PATCH /users/me/password` | Sim | 5/min |

- **Access e refresh tokens são JWTs com segredos separados.** O refresh token também tem o hash SHA-256 persistido (ADR-006): o `/auth/refresh` verifica assinatura **e** banco antes de rotacionar o par.
- **Logout, troca e redefinição de senha revogam todas as sessões** do usuário.
- **Cadastro restrito:** com `SIGNUP_ALLOWED_EMAILS`, só os e-mails da lista criam conta; os demais recebem 403, antes da checagem de e-mail já usado (ADR-010).
- **Recuperação de senha por e-mail:** a resposta é sempre 200 (não revela quem tem conta); o link vale 1 hora e só uma vez. O envio sai por SMTP e passa pelo `waitUntil` da Vercel, que senão pausaria a função ao responder (ADR-011).
- **Trocar o e-mail da conta exige a senha atual.**
- **Os limites contam por IP de quem acessa:** atrás da Vercel, o backend confia no `X-Forwarded-For` (`trust proxy`).
- **`JwtAuthGuard` é global** (`APP_GUARD`); rotas públicas usam `@Public()`.

### Outras decisões de implementação

- **Fotos de paciente atrás da interface `PatientPhotoStorage`** (ADR-007): Vercel Blob em produção e disco local no desenvolvimento. O app reduz a foto no navegador antes de enviar (lado maior até 1280 px, JPEG), por causa do limite de 4,5 MB por requisição da Vercel.
- **Vacinas são um model próprio** com `appointment_id` opcional (ADR-009): remover um atendimento não apaga a vacina.
- **Prisma fixado em 6.x, não 7.x**: a v7 remove `datasource.url` no `schema.prisma` (exige adapters de driver), o que quebraria a sintaxe aprovada na arquitetura.
- **`bcryptjs` em vez de `bcrypt`**: implementação pura em JS, sem compilação nativa.
- **`.env` único na raiz do monorepo**, compartilhado entre backend e frontend.

## Próximos passos

1. **Backup diário criptografado do banco** — o Neon gratuito só volta 6 horas no tempo.
2. **Atualizar dependências** com vulnerabilidades conhecidas.
3. **Ícones PNG do PWA** — o iPhone ignora o ícone em SVG.
4. **Testes que faltam** — unitários de users, tutors, locations e patients; e2e de vacinas e foto.
5. **Pós-MVP** — módulo de documentos e exames (ADR-005), termos de uso e política de privacidade antes de abrir o cadastro, domínio próprio.
