import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { LocationType } from '@meupaciente/shared';
import { AppModule } from '../src/app.module';
import { ProblemDetailsFilter } from '../src/common/filters/problem-details.filter';
import { validationExceptionFactory } from '../src/common/validation-exception-factory';
import { EMAIL_SENDER, EmailMessage } from '../src/modules/email/email-sender';

// Fluxo principal completo: register -> login -> CRUD (tutor/local/paciente/
// atendimento) -> logout. Roda contra o schema Postgres isolado
// `test_e2e` (ver test/setup-e2e.ts) — mesmo banco do docker-compose.
describe('Fluxo principal (e2e)', () => {
  let app: INestApplication;

  const email = `e2e-${Date.now()}@example.com`;
  const otherEmail = `other-${Date.now()}@example.com`;
  const password = 'senha123';
  const newPassword = 'novaSenha456';

  let accessToken: string;
  let refreshToken: string;
  let tutorId: string;
  let locationId: string;
  let patientId: string;
  let appointmentId: string;
  // E-mails "enviados" no teste: nada sai pelo provedor real, mesmo com a chave no .env.
  const sentEmails: EmailMessage[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EMAIL_SENDER)
      .useValue({ send: async (message: EmailMessage) => void sentEmails.push(message) })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        exceptionFactory: validationExceptionFactory,
      }),
    );
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registra um novo usuário e devolve tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ name: 'Tutor E2E', email, password })
      .expect(201);

    expect(res.body.access_token).toEqual(expect.any(String));
    expect(res.body.refresh_token).toEqual(expect.any(String));
    expect(res.body.user.email).toBe(email);

    accessToken = res.body.access_token;
    refreshToken = res.body.refresh_token;
  });

  it('rejeita registro com e-mail já usado (409)', async () => {
    await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ name: 'Tutor E2E', email, password })
      .expect(409);
  });

  it('faz login com as credenciais criadas', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email, password })
      .expect(200);

    accessToken = res.body.access_token;
    refreshToken = res.body.refresh_token;
  });

  it('rejeita login com senha errada (401)', async () => {
    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email, password: 'senha-errada1' })
      .expect(401);
  });

  it('rejeita acesso a rota protegida sem token (401)', async () => {
    await request(app.getHttpServer()).get('/v1/tutors').expect(401);
  });

  it('cria um tutor', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/tutors')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Maria Tutora', phone: '11999999999' })
      .expect(201);

    tutorId = res.body.id;
    expect(tutorId).toEqual(expect.any(String));
  });

  it('cria um local', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/locations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Clínica Central', address: 'Rua X, 123' })
      .expect(201);

    locationId = res.body.id;
  });

  it('cria um paciente vinculado ao tutor', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/patients')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ tutor_id: tutorId, name: 'Miau', species: 'Gato' })
      .expect(201);

    patientId = res.body.id;
  });

  it('lista pacientes com o resumo do tutor', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/patients?q=Miau')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].tutor).toEqual({
      id: tutorId,
      name: 'Maria Tutora',
      phone: '11999999999',
    });
  });

  it('conta pacientes cadastrados a partir de um instante (data e hora com fuso)', async () => {
    const since = (value: string) =>
      request(app.getHttpServer())
        .get(`/v1/patients?per_page=1&created_from=${encodeURIComponent(value)}`)
        .set('Authorization', `Bearer ${accessToken}`);

    expect((await since('2000-01-01T00:00:00-03:00').expect(200)).body.pagination.total).toBe(1);
    expect((await since('2999-01-01T00:00:00Z').expect(200)).body.pagination.total).toBe(0);
    await since('2026-09-01').expect(422);
  });

  it('lista tutores com os pacientes vinculados, buscando pelo nome do paciente', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/tutors?q=miau')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      id: tutorId,
      patients_count: 1,
      patients: [{ id: patientId, name: 'Miau' }],
    });
  });

  it('não remove tutor com pacientes vinculados (409)', async () => {
    await request(app.getHttpServer())
      .delete(`/v1/tutors/${tutorId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(409);
  });

  it('rejeita atendimento REGISTERED sem location_id (422)', async () => {
    await request(app.getHttpServer())
      .post('/v1/appointments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        patient_id: patientId,
        date: '2026-07-20',
        location_type: LocationType.REGISTERED,
      })
      .expect(422);
  });

  it('cria um atendimento REGISTERED', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/appointments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        patient_id: patientId,
        date: '2026-07-20',
        location_type: LocationType.REGISTERED,
        location_id: locationId,
        chief_complaint: 'Check-up',
      })
      .expect(201);

    appointmentId = res.body.id;
    expect(res.body.location_id).toBe(locationId);
  });

  it('lista locais com a contagem de atendimentos, com busca', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/locations?q=central')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      id: locationId,
      appointments_count: 1,
    });

    const none = await request(app.getHttpServer())
      .get('/v1/locations?q=inexistente')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(none.body.data).toHaveLength(0);
  });

  it('não remove local usado em atendimento (409)', async () => {
    await request(app.getHttpServer())
      .delete(`/v1/locations/${locationId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(409);
  });

  it('lista atendimentos filtrando por paciente, com o resumo do paciente', async () => {
    const res = await request(app.getHttpServer())
      .get(`/v1/appointments?patient_id=${patientId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination.total).toBe(1);
    expect(res.body.data[0].patient).toEqual({
      id: patientId,
      name: 'Miau',
      species: 'Gato',
      photo_url: null,
      tutor: { id: tutorId, name: 'Maria Tutora', phone: '11999999999' },
    });
  });

  it('lista reforços pendentes só com a dose mais recente de cada vacina', async () => {
    const register = (body: Record<string, unknown>) =>
      request(app.getHttpServer())
        .post('/v1/vaccines')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ patient_id: patientId, ...body })
        .expect(201);

    // 1ª dose com reforço vencido, mas já reforçada: não conta como pendente.
    await register({ name: 'V4', application_date: '2025-07-01', next_dose_date: '2025-08-01' });
    // Mesmo nome com outra caixa e espaços: é o reforço, e este vence no prazo.
    const booster = await register({
      name: ' v4 ',
      application_date: '2025-08-01',
      next_dose_date: '2026-08-01',
    });
    // Reforço fora do prazo e vacina sem próxima dose: ficam de fora.
    await register({ name: 'Antirrábica', application_date: '2026-07-01', next_dose_date: '2027-07-01' });
    await register({ name: 'Giárdia', application_date: '2026-07-01' });

    const pending = await request(app.getHttpServer())
      .get('/v1/vaccines?latest_only=true&next_dose_to=2026-10-28')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(pending.body.data.map((vaccine: { id: string }) => vaccine.id)).toEqual([
      booster.body.id,
    ]);
    expect(pending.body.data[0].patient).toMatchObject({
      id: patientId,
      name: 'Miau',
      tutor: { id: tutorId, name: 'Maria Tutora' },
    });

    const all = await request(app.getHttpServer())
      .get(`/v1/vaccines?patient_id=${patientId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(all.body.pagination.total).toBe(4);
  });

  it('atualiza o atendimento', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/v1/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ diagnosis: 'Saudável' })
      .expect(200);

    expect(res.body.diagnosis).toBe('Saudável');
  });

  it('rejeita date = null no PATCH sem alterar o atendimento (422)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/v1/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ date: null })
      .expect(422);

    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'date' })]),
    );

    const detail = await request(app.getHttpServer())
      .get(`/v1/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(detail.body.date).not.toBe('1970-01-01');
  });

  it('busca o paciente com o tutor aninhado no detalhe', async () => {
    const res = await request(app.getHttpServer())
      .get(`/v1/patients/${patientId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.tutor.id).toBe(tutorId);
  });

  it('não enxerga recurso de outro usuário (ownership)', async () => {
    const other = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ name: 'Outro Usuário', email: otherEmail, password })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/v1/patients/${patientId}`)
      .set('Authorization', `Bearer ${other.body.access_token}`)
      .expect(404);
  });

  it('remove o atendimento criado', async () => {
    await request(app.getHttpServer())
      .delete(`/v1/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);
  });

  it('remove o local depois que nenhum atendimento o usa', async () => {
    await request(app.getHttpServer())
      .delete(`/v1/locations/${locationId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);
  });

  it('faz refresh do token', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refresh_token: refreshToken })
      .expect(200);

    expect(res.body.access_token).toEqual(expect.any(String));
    accessToken = res.body.access_token;
    refreshToken = res.body.refresh_token;
  });

  it('faz logout', async () => {
    await request(app.getHttpServer())
      .post('/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);
  });

  it('rejeita refresh token revogado após logout (401)', async () => {
    await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refresh_token: refreshToken })
      .expect(401);
  });

  it('entra de novo para testar o perfil', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email, password })
      .expect(200);

    accessToken = res.body.access_token;
    refreshToken = res.body.refresh_token;
  });

  it('devolve e atualiza o perfil do usuário autenticado', async () => {
    const me = await request(app.getHttpServer())
      .get('/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(me.body).toMatchObject({ email, name: 'Tutor E2E' });

    const updated = await request(app.getHttpServer())
      .patch('/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Veterinária E2E' })
      .expect(200);
    expect(updated.body).toMatchObject({ email, name: 'Veterinária E2E' });
  });

  it('rejeita no perfil o e-mail de outra conta (409)', async () => {
    await request(app.getHttpServer())
      .patch('/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: otherEmail })
      .expect(409);
  });

  it('rejeita troca de senha com a senha atual errada (422 no campo, sem derrubar a sessão)', async () => {
    const res = await request(app.getHttpServer())
      .patch('/v1/users/me/password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ current_password: 'errada123', new_password: newPassword })
      .expect(422);

    expect(res.body.errors).toEqual([
      expect.objectContaining({ field: 'current_password' }),
    ]);
  });

  it('troca a senha e revoga as sessões abertas', async () => {
    await request(app.getHttpServer())
      .patch('/v1/users/me/password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ current_password: password, new_password: newPassword })
      .expect(204);

    await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refresh_token: refreshToken })
      .expect(401);
  });

  it('entra com a nova senha e não mais com a antiga', async () => {
    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email, password: newPassword })
      .expect(200);

    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email, password })
      .expect(401);
  });
  it('pede a recuperação de senha e envia o link só para e-mail cadastrado', async () => {
    const answer = (value: string) =>
      request(app.getHttpServer()).post('/v1/auth/forgot-password').send({ email: value }).expect(200);

    const unknown = await answer(`ninguem-${Date.now()}@example.com`);
    const known = await answer(email);

    // Mesma resposta nos dois casos: não revela quais e-mails têm conta.
    expect(unknown.body).toEqual(known.body);
    await new Promise((resolve) => setImmediate(resolve));
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].to).toBe(email);
  });

  it('redefine a senha pelo link do e-mail, uma vez só', async () => {
    const token = sentEmails[0].text.match(/redefinir-senha\?token=([0-9a-f]+)/)?.[1];
    expect(token).toBeDefined();
    const resetPassword = 'redefinida789';

    await request(app.getHttpServer())
      .post('/v1/auth/reset-password')
      .send({ token, new_password: resetPassword })
      .expect(200);

    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email, password: resetPassword })
      .expect(200);

    // O link já foi usado.
    await request(app.getHttpServer())
      .post('/v1/auth/reset-password')
      .send({ token, new_password: 'outra12345' })
      .expect(401);
  });
});
