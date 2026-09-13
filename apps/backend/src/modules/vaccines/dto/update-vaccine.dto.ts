import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import type { UpdateVaccineRequest } from '@meupaciente/shared';

export class UpdateVaccineDto implements UpdateVaccineRequest {
  @IsOptional()
  @IsUUID()
  appointment_id?: string | null;

  @IsOptional()
  @IsString()
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

  @IsOptional()
  @IsDateString()
  application_date?: string;

  @IsOptional()
  @IsDateString()
  next_dose_date?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
