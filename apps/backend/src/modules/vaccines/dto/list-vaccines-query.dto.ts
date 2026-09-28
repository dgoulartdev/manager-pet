import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { IsDateOnly } from '../../../common/decorators/is-date-only.decorator';

export class ListVaccinesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  patient_id?: string;

  // Só a aplicação mais recente de cada vacina de cada paciente: as anteriores
  // já foram reforçadas e não contam como pendentes.
  @IsOptional()
  // Na query string tudo é texto: só "true" e "false" viram booleano.
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  latest_only?: boolean;

  // Próxima dose prevista até esta data (inclusive), já vencidas incluídas.
  @IsOptional()
  @IsDateOnly()
  next_dose_to?: string;
}
