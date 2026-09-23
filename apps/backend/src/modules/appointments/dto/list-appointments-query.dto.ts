import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { IsDateOnly } from '../../../common/decorators/is-date-only.decorator';

export class ListAppointmentsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  patient_id?: string;

  @IsOptional()
  @IsUUID()
  location_id?: string;

  @IsOptional()
  @IsDateOnly()
  date_from?: string;

  @IsOptional()
  @IsDateOnly()
  date_to?: string;
}
