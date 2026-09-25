const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Mesma regra da API: pelo menos uma letra e um número.
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).+$/;

export const PASSWORD_MIN_LENGTH = 8;

export function validateEmail(value: string): string | undefined {
  const email = value.trim();
  if (!email) return 'Informe seu e-mail.';
  if (!EMAIL_PATTERN.test(email)) return 'Informe um e-mail válido, com domínio completo.';
  return undefined;
}

/** Telefone é opcional; quando informado, precisa de DDD (10 ou 11 dígitos). */
export function validatePhone(value: string): string | undefined {
  const digits = value.replace(/\D/g, '');
  if (digits && digits.length < 10) return 'Informe o DDD e o número, com 10 ou 11 dígitos.';
  return undefined;
}

export function meetsPasswordRule(value: string): boolean {
  return value.length >= PASSWORD_MIN_LENGTH && PASSWORD_PATTERN.test(value);
}
