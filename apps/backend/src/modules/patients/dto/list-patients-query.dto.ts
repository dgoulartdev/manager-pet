import { IsISO8601, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ListPatientsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsUUID()
  tutor_id?: string;

  // Cadastrados a partir deste instante. Pede data com hora e fuso porque o
  // "início do mês" depende do fuso do aparelho do veterinário, não do servidor.
  @IsOptional()
  @Matches(/T.*(Z|[+-]\d{2}:\d{2})$/, {
    message: '$property deve ser data e hora com fuso (ex.: 2026-09-01T03:00:00Z)',
  })
  @IsISO8601({ strict: true })
  created_from?: string;
}
