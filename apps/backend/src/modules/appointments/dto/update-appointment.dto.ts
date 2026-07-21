import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { LocationType, type UpdateAppointmentRequest } from '@felino/shared';

export class UpdateAppointmentDto implements UpdateAppointmentRequest {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsEnum(LocationType)
  location_type?: LocationType;

  @IsOptional()
  @IsUUID()
  location_id?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  ad_hoc_location_name?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  home_address?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(30)
  weight_kg?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  chief_complaint?: string | null;

  @IsOptional()
  @IsString()
  history?: string | null;

  @IsOptional()
  @IsString()
  diagnosis?: string | null;

  @IsOptional()
  @IsString()
  treatment?: string | null;

  @IsOptional()
  @IsString()
  prescription?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
