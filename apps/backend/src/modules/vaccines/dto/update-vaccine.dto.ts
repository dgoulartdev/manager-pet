import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { UpdateVaccineRequest } from '@meupaciente/shared';
import { IsOptionalNotNull } from '../../../common/decorators/is-optional-not-null.decorator';

export class UpdateVaccineDto implements UpdateVaccineRequest {
  @IsOptional()
  @IsUUID()
  appointment_id?: string | null;

  @IsOptionalNotNull()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  manufacturer?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  batch?: string | null;

  @IsOptionalNotNull()
  @IsDateString()
  application_date?: string;

  @IsOptional()
  @IsDateString()
  next_dose_date?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
