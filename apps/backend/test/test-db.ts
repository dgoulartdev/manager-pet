// Isola os testes e2e num schema Postgres dedicado (mesmo banco do docker-compose),
// pra não sujar/depender dos dados de desenvolvimento em `public`.
export const E2E_SCHEMA = 'test_e2e';

export function buildTestDatabaseUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set('schema', E2E_SCHEMA);
  return url.toString();
}
