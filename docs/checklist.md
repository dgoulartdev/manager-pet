# Checklist — Gerenciamento Felinos (MVP)

## 0. Setup do monorepo
- [ ] Criar repo Git
- [ ] Inicializar Turborepo (`apps/backend`, `apps/frontend`, `packages/shared`)
- [ ] Configurar TypeScript compartilhado (tsconfig base)
- [ ] Configurar lint/prettier no monorepo
- [ ] Configurar `.env` e `.env.example`
- [ ] Subir PostgreSQL local (Docker)

## 1. Banco de dados
- [x] Instalar Prisma no `apps/backend`
- [x] Criar `schema.prisma` (a partir da arquitetura v1.3.0)
- [x] Rodar primeira migration
- [x] Popular seed básico (usuário de teste, opcional)

## 2. Módulo Auth
- [x] `POST /auth/register`
- [x] `POST /auth/login`
- [x] `POST /auth/refresh`
- [x] `POST /auth/logout`
- [x] `POST /auth/forgot-password`
- [x] `POST /auth/reset-password`
- [x] Guard JWT global + estratégia refresh token com hash
- [x] Rate limiting nos endpoints de auth
- [x] Testar fluxo completo (curl — ver `docs/architecture.md`/README)

## 3. Módulo Users
- [ ] `GET /users/me`
- [ ] `PATCH /users/me`
- [ ] `PATCH /users/me/password`

## 4. Módulo Tutors
- [ ] `GET /tutors` (paginado + busca)
- [ ] `POST /tutors`
- [ ] `GET /tutors/:id`
- [ ] `PATCH /tutors/:id`
- [ ] `DELETE /tutors/:id` (bloquear se tiver pacientes)

## 5. Módulo Locations
- [ ] `GET /locations`
- [ ] `POST /locations`
- [ ] `GET /locations/:id`
- [ ] `PATCH /locations/:id`
- [ ] `DELETE /locations/:id` (bloquear se referenciado)

## 6. Módulo Patients
- [ ] `GET /patients` (paginado, busca, filtro por tutor)
- [ ] `POST /patients`
- [ ] `GET /patients/:id`
- [ ] `PATCH /patients/:id`
- [ ] `DELETE /patients/:id` (cascade em atendimentos)
- [ ] `PUT /patients/:id/photo`
- [ ] `DELETE /patients/:id/photo`
- [ ] Definir estratégia de storage de foto (mesmo que temporária)

## 7. Módulo Appointments
- [ ] `GET /appointments` (paginado, filtros: patient_id, location_id, date_from/to)
- [ ] `POST /appointments`
- [ ] `GET /appointments/:id`
- [ ] `PATCH /appointments/:id`
- [ ] `DELETE /appointments/:id`
- [ ] Validar regras de `location_type` (REGISTERED/AD_HOC/HOME_VISIT)

## 8. Validação e erros transversais
- [ ] `ValidationPipe` global
- [ ] Exception filter no formato RFC 7807
- [ ] Checagem de ownership (`user_id`) em todas as queries

## 9. Testes
- [ ] Testes unitários dos services críticos (auth, appointments)
- [ ] Testes e2e dos fluxos principais (register→login→CRUD→logout)

## 10. Frontend (PWA)
- [ ] Setup do projeto React + PWA
- [ ] Tipos/DTOs importados de `packages/shared`
- [ ] Telas: login/registro
- [ ] Tela: lista de pacientes + busca
- [ ] Tela: cadastro/edição de paciente
- [ ] Tela: timeline de atendimentos do paciente
- [ ] Tela: novo atendimento
- [ ] Tela: tutores e locais (CRUD simples)
- [ ] Tela: perfil do usuário

## 11. Pré-lançamento
- [ ] Preencher placeholders dos documentos legais (e-mail, cidade, data, hosting)
- [ ] Definir provedor de hosting (backend + banco + storage de fotos)
- [ ] Deploy de staging
- [ ] Teste real com sua namorada (usuária piloto)
