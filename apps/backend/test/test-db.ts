// Isola os testes e2e num schema Postgres dedicado (mesmo banco do docker-compose),
// pra não sujar/depender dos dados de desenvolvimento em `public` nem tocar banco remoto.
export const E2E_SCHEMA = 'test_e2e';

const LOCAL_DEFAULT_DB_URL =
  'postgresql://meupaciente:meupaciente@localhost:5432/meupaciente';

// Segredo da rota do Vercel Cron nos testes (o setup o põe no process.env).
export const E2E_CRON_SECRET = 'segredo-do-cron-no-e2e';

export function buildTestDatabaseUrl(baseUrl: string): string {
  const parsed = new URL(baseUrl);
  // Se o .env estiver apontando para o banco da nuvem (ex.: Neon), os testes e2e
  // usam o Postgres local do docker-compose para nunca tocar o banco real.
  const target = ['localhost', '127.0.0.1'].includes(parsed.hostname)
    ? parsed
    : new URL(process.env.TEST_DATABASE_URL || LOCAL_DEFAULT_DB_URL);
  target.searchParams.set('schema', E2E_SCHEMA);
  return target.toString();
}
