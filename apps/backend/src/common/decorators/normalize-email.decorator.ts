import { Transform } from 'class-transformer';

/**
 * Normaliza e-mail antes da validação: remove espaços e converte para minúsculas.
 * Evita cadastros duplicados por caixa e login que falha por diferença de maiúsculas.
 */
export function NormalizeEmail() {
  return Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
}
