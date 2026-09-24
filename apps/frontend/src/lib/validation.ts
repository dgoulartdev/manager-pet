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

export function meetsPasswordRule(value: string): boolean {
  return value.length >= PASSWORD_MIN_LENGTH && PASSWORD_PATTERN.test(value);
}
