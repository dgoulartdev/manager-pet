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
- [x] `POST /auth/register` (com `SIGNUP_ALLOWED_EMAILS` definida, só os e-mails da lista; os demais, 403 — ADR-010)
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
- [x] `PATCH /users/me` (trocar o e-mail exige a senha atual; 10 requisições/min)
- [x] `PATCH /users/me/password` (senha atual errada = 422 no campo; 5 tentativas/min)

## 4. Módulo Tutors
- [x] `GET /tutors` (paginado + busca, com os pacientes de cada tutor)
- [x] `POST /tutors`
- [x] `GET /tutors/:id`
- [x] `PATCH /tutors/:id`
- [x] `DELETE /tutors/:id` (bloquear se tiver pacientes)

## 5. Módulo Locations
- [x] `GET /locations` (paginado + busca, com a contagem de atendimentos)
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
- [x] Fotos persistentes em produção no Vercel Blob (disco local no desenvolvimento) e reduzidas no navegador antes do envio — ADR-007
- [ ] Criar o Vercel Blob, conectar ao projeto da API e testar um envio real

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
- [x] Integrar provedor de e-mail no `forgot-password` (SMTP ou Resend, atrás de `EmailSender`; sem nenhum, o link vai para o log — ADR-011)
- [ ] Criar a conta Gmail do app (verificação em duas etapas + senha de app) e configurar `SMTP_*` na hospedagem
- [x] Rotina de limpeza de refresh/reset tokens expirados (ADR-006: Vercel Cron diário às 3h de Brasília, `GET /cron/token-cleanup` com `CRON_SECRET`)

## 9. Testes
- [x] Testes unitários dos services críticos (auth, appointments, vaccines)
- [x] Testes unitários de validação de DTOs e do filtro RFC 7807
- [x] Testes e2e dos fluxos principais (register→login→CRUD→logout)
- [ ] Testes unitários dos services de users, tutors, locations e patients
- [x] Testes e2e de `/users/me` e da troca de senha
- [x] Testes e2e de forgot/reset de senha e dos filtros de vacinas
- [ ] Testes e2e do CRUD de vacinas e da foto do paciente

## 10. Frontend (PWA)
- [x] Setup do projeto React + PWA (rotas, tokens do DS, fontes offline, ícone do manifest)
- [x] Tipos/DTOs importados de `packages/shared`
- [x] Cliente HTTP com refresh automático do access token e tratamento de erros RFC 7807
- [x] Telas: login/registro
- [x] Telas: esqueci minha senha / redefinir senha
- [x] Estrutura do app (barra lateral, trilho no tablet, abas no mobile)
- [x] Tela: início (total de pacientes e novos no mês, vacinas para acompanhar, últimos atendimentos; primeiros passos sem pacientes)
- [x] Tela: lista de pacientes + busca (API passou a incluir o resumo do tutor)
- [x] Tela: cadastro de paciente (espécie Cão/Gato/Outra, foto, criação de tutor sem sair do formulário)
- [x] Edição de paciente (a partir do prontuário; o tutor não muda depois do cadastro)
- [x] Tela: prontuário do paciente (dados, timeline de atendimentos, pesagens, foto, exclusão)
- [x] Tela: novo atendimento (local cadastrado/avulso/domicílio, peso, avaliação e conduta)
- [x] Editar e excluir atendimento (a partir do histórico)
- [x] Tela: vacinas do paciente (carteira com situação + registro)
- [x] Vacinas: editar/excluir e vínculo a um atendimento (visível na carteira e no histórico)
- [x] Tela: tutores e locais (lista com busca, cadastro, edição e exclusão respeitando os vínculos)
- [x] Tela: perfil do usuário (dados + troca de senha, mantendo a sessão deste aparelho)

## 11. Pré-lançamento
- [ ] Redigir documentos legais (termos de uso e política de privacidade/LGPD) — ainda não existem no repositório
- [ ] Definir provedor de hosting (backend + banco + storage de fotos persistente — ADR-007)
- [x] Definir provedor de e-mail transacional (SMTP com Gmail; Resend quando houver domínio próprio — ADR-011)
- [x] Restringir o cadastro a e-mails autorizados (ADR-010) — no deploy, definir `SIGNUP_ALLOWED_EMAILS` e criar a conta da piloto logo em seguida
- [ ] Deploy de staging
- [ ] Teste real com sua namorada (usuária piloto)
