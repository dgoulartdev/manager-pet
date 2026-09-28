import { applyDecorators } from '@nestjs/common';
import { IsDateString, Matches } from 'class-validator';

/**
 * Data sem hora, no formato YYYY-MM-DD (o `format: date` da OpenAPI).
 *
 * O `@IsDateString()` sozinho também aceita data com hora
 * ("2024-06-15T23:00:00-03:00"), que ao virar Date em UTC pode cair no dia
 * seguinte. O modo `strict` rejeita datas impossíveis, como 2024-02-30.
 */
export function IsDateOnly() {
  return applyDecorators(
    Matches(/^\d{4}-\d{2}-\d{2}$/, {
      message: '$property deve estar no formato YYYY-MM-DD',
    }),
    IsDateString({ strict: true }),
  );
}
