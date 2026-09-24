# Checklist — MeuPaciente (MVP)

## 0. Setup do monorepo
- [x] Criar repo Git
- [x] Inicializar Turborepo (`apps/backend`, `apps/frontend`, `packages/shared`)
- [x] Configurar TypeScript compartilhado (tsconfig base)
- [x] Configurar lint/prettier no monorepo
- [x] Configurar `.env` e `.env.example`
- [x] Subir PostgreSQL local (Docker)

## 1. Banco de dados
- [x] Instalar Prisma no `apps/backend`
- [x] Criar `schema.prisma` (criado na arquitetura v1.3.0; hoje em v1.5.0)
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
- [x] `GET /users/me`
- [x] `PATCH /users/me`
- [x] `PATCH /users/me/password`

## 4. Módulo Tutors
- [x] `GET /tutors` (paginado + busca)
- [x] `POST /tutors`
- [x] `GET /tutors/:id`
- [x] `PATCH /tutors/:id`
- [x] `DELETE /tutors/:id` (bloquear se tiver pacientes)

## 5. Módulo Locations
- [x] `GET /locations`
- [x] `POST /locations`
- [x] `GET /locations/:id`
- [x] `PATCH /locations/:id`
- [x] `DELETE /locations/:id` (bloquear se referenciado)

## 6. Módulo Patients
- [x] `GET /patients` (paginado, busca, filtro por tutor)
- [x] `POST /patients`
- [x] `GET /patients/:id`
- [x] `PATCH /patients/:id`
- [x] `DELETE /patients/:id` (cascade em atendimentos)
- [x] `PUT /patients/:id/photo`
- [x] `DELETE /patients/:id/photo`
- [x] Definir estratégia de storage de foto (mesmo que temporária) — ADR-007

## 7. Módulo Appointments
- [x] `GET /appointments` (paginado, filtros: patient_id, location_id, date_from/to)
- [x] `POST /appointments`
- [x] `GET /appointments/:id`
- [x] `PATCH /appointments/:id`
- [x] `DELETE /appointments/:id`
- [x] Validar regras de `location_type` (REGISTERED/AD_HOC/HOME_VISIT)

## 7.1 Módulo Vaccines
- [x] `GET /vaccines` (paginado, filtro por patient_id)
- [x] `POST /vaccines`
- [x] `GET /vaccines/:id`
- [x] `PATCH /vaccines/:id`
- [x] `DELETE /vaccines/:id`
- [x] Validar que `appointment_id`, quando informado, pertence ao mesmo paciente da vacina

## 8. Validação e erros transversais
- [x] `ValidationPipe` global
- [x] Exception filter no formato RFC 7807 (catch-all + mapeamento Prisma)
- [x] Checagem de ownership (`user_id`) em todas as queries
- [x] Rejeitar `null` em campos obrigatórios no PATCH (`@IsOptionalNotNull`)
- [x] Aceitar apenas datas `YYYY-MM-DD` (`@IsDateOnly`)
- [x] Mapear violação de FK (Prisma P2003) para 409

## 8.1 Pendências do backend
- [ ] Integrar provedor de e-mail no `forgot-password` (hoje o token só é logado fora de produção)
- [ ] Rotina de limpeza de refresh/reset tokens expirados (ADR-006)

## 9. Testes
- [x] Testes unitários dos services críticos (auth, appointments, vaccines)
- [x] Testes unitários de validação de DTOs e do filtro RFC 7807
- [x] Testes e2e dos fluxos principais (register→login→CRUD→logout)
- [ ] Testes unitários dos services de users, tutors, locations e patients
- [ ] Testes e2e de vacinas, foto do paciente, `/users/me` e forgot/reset de senha

## 10. Frontend (PWA)
- [x] Setup do projeto React + PWA (rotas, tokens do DS, fontes offline, ícone do manifest)
- [x] Tipos/DTOs importados de `packages/shared`
- [x] Cliente HTTP com refresh automático do access token e tratamento de erros RFC 7807
- [x] Telas: login/registro
- [ ] Telas: esqueci minha senha / redefinir senha
- [x] Estrutura do app (barra lateral, trilho no tablet, abas no mobile)
- [x] Tela: lista de pacientes + busca (API passou a incluir o resumo do tutor)
- [x] Tela: cadastro de paciente (espécie Cão/Gato/Outra, foto, criação de tutor sem sair do formulário)
- [ ] Edição de paciente (a partir do prontuário)
- [x] Tela: prontuário do paciente (dados, timeline de atendimentos, pesagens, foto, exclusão)
- [ ] Tela: novo atendimento
- [x] Tela: vacinas do paciente (carteira com situação + registro)
- [ ] Vacinas: editar/excluir e vínculo a um atendimento
- [ ] Tela: tutores e locais (CRUD simples)
- [ ] Tela: perfil do usuário (dados + troca de senha)

## 11. Pré-lançamento
- [ ] Redigir documentos legais (termos de uso e política de privacidade/LGPD) — ainda não existem no repositório
- [ ] Definir provedor de hosting (backend + banco + storage de fotos persistente — ADR-007)
- [ ] Definir provedor de e-mail transacional
- [ ] Deploy de staging
- [ ] Teste real com sua namorada (usuária piloto)
