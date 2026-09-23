import { ValidateIf } from 'class-validator';

/**
 * Campo opcional que, quando enviado, não pode ser `null`.
 *
 * O `@IsOptional()` pula a validação tanto para `undefined` quanto para `null`.
 * Em colunas obrigatórias isso deixava o `null` chegar ao banco: erro 500 em
 * campos de texto e data 1970-01-01 em campos de data (`new Date(null)`).
 * Aqui só a ausência do campo pula a validação; `null` é validado e rejeitado.
 */
export function IsOptionalNotNull() {
  return ValidateIf((_object, value) => value !== undefined);
}
