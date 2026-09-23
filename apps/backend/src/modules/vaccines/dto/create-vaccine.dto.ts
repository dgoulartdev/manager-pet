import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { CreateVaccineRequest } from '@meupaciente/shared';

export class CreateVaccineDto implements CreateVaccineRequest {
  @IsUUID()
  patient_id!: string;

  @IsOptional()
  @IsUUID()
  appointment_id?: string | null;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  manufacturer?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  batch?: string | null;

  @IsDateString()
  application_date!: string;

  @IsOptional()
  @IsDateString()
  next_dose_date?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
