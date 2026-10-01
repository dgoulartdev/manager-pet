const REQUIRED_ENV = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
] as const;

// Com SMTP_HOST definido, o envio por SMTP precisa da conta (ADR-011).
const REQUIRED_WITH_SMTP = ['SMTP_USER', 'SMTP_PASSWORD'] as const;

function isMissing(config: Record<string, unknown>, key: string): boolean {
  const value = config[key];
  return value === undefined || value === '';
}

/**
 * Valida variáveis de ambiente obrigatórias no boot (fail-fast).
 * Sem isso, um segredo ausente só quebraria na primeira request.
 */
export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const required: readonly string[] = isMissing(config, 'SMTP_HOST')
    ? REQUIRED_ENV
    : [...REQUIRED_ENV, ...REQUIRED_WITH_SMTP];
  const missing = required.filter((key) => isMissing(config, key));

  if (missing.length > 0) {
    throw new Error(
      `Variáveis de ambiente obrigatórias ausentes: ${missing.join(', ')}`,
    );
  }

  return config;
}
