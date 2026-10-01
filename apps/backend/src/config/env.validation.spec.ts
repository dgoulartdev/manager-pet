import { validateEnv } from './env.validation';

const minimal = {
  DATABASE_URL: 'postgresql://localhost:5432/meupaciente',
  JWT_ACCESS_SECRET: 'segredo-access',
  JWT_REFRESH_SECRET: 'segredo-refresh',
};

describe('validateEnv', () => {
  it('aceita a configuração mínima', () => {
    expect(validateEnv(minimal)).toBe(minimal);
  });

  it('acusa todas as obrigatórias ausentes de uma vez', () => {
    expect(() => validateEnv({ DATABASE_URL: minimal.DATABASE_URL })).toThrow(
      'Variáveis de ambiente obrigatórias ausentes: JWT_ACCESS_SECRET, JWT_REFRESH_SECRET',
    );
  });

  it('com SMTP_HOST, exige o usuário e a senha da conta SMTP', () => {
    expect(() => validateEnv({ ...minimal, SMTP_HOST: 'smtp.gmail.com' })).toThrow(
      'Variáveis de ambiente obrigatórias ausentes: SMTP_USER, SMTP_PASSWORD',
    );
  });

  it('com SMTP_HOST vazio, não exige a conta SMTP', () => {
    const config = { ...minimal, SMTP_HOST: '' };

    expect(validateEnv(config)).toBe(config);
  });
});
