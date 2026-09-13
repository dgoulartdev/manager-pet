import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ListVaccinesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  patient_id?: string;
}
