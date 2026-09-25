import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { LocationType } from '@meupaciente/shared';
import { AppModule } from '../src/app.module';
import { ProblemDetailsFilter } from '../src/common/filters/problem-details.filter';
import { validationExceptionFactory } from '../src/common/validation-exception-factory';

// Fluxo principal completo: register -> login -> CRUD (tutor/local/paciente/
// atendimento) -> logout. Roda contra o schema Postgres isolado
// `test_e2e` (ver test/setup-e2e.ts) — mesmo banco do docker-compose.
describe('Fluxo principal (e2e)', () => {
  let app: INestApplication;

  const email = `e2e-${Date.now()}@example.com`;
  const password = 'senha123';

  let accessToken: string;
  let refreshToken: string;
  let tutorId: string;
  let locationId: string;
  let patientId: string;
  let appointmentId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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

  it('lista atendimentos filtrando por paciente', async () => {
    const res = await request(app.getHttpServer())
      .get(`/v1/appointments?patient_id=${patientId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination.total).toBe(1);
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
      .send({ name: 'Outro Usuário', email: `other-${Date.now()}@example.com`, password })
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
});
