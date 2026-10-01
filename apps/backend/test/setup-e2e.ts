import { execSync } from 'node:child_process';
import { buildTestDatabaseUrl } from './test-db';

export default function setup(): void {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    throw new Error(
      'DATABASE_URL ausente. Rode via `npm run test:e2e` (carrega o .env da raiz).',
    );
  }

  const testUrl = buildTestDatabaseUrl(baseUrl);
  // Muta process.env: os workers do Jest herdam esse valor ao subir a AppModule.
  process.env.DATABASE_URL = testUrl;
  // Os testes cadastram e-mails aleatórios: a lista de cadastro do .env não vale aqui.
  delete process.env.SIGNUP_ALLOWED_EMAILS;

  execSync('npx prisma migrate deploy --schema src/prisma/schema.prisma', {
    cwd: __dirname + '/..',
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: 'inherit',
  });
}
