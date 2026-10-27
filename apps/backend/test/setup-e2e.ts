import { execSync } from 'node:child_process';
import { buildTestDatabaseUrl, E2E_CRON_SECRET } from './test-db';

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
  // Garante que os testes e2e nunca enviem arquivos para o Vercel Blob real.
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.BLOB_STORE_ID;
  delete process.env.DOCUMENTS_BLOB_READ_WRITE_TOKEN;
  delete process.env.DOCUMENTS_BLOB_STORE_ID;
  // Segredo próprio do e2e para a rota do Vercel Cron, independente do .env.
  process.env.CRON_SECRET = E2E_CRON_SECRET;

  execSync('npx prisma migrate deploy --schema src/prisma/schema.prisma', {
    cwd: __dirname + '/..',
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: 'inherit',
  });
}
