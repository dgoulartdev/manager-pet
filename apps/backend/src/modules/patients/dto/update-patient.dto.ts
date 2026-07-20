import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Sex, type UpdatePatientRequest } from '@felino/shared';

export class UpdatePatientDto implements UpdatePatientRequest {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  species?: string | null;

  @IsOptional()
  @IsEnum(Sex)
  sex?: Sex;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  breed?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  color?: string | null;

  @IsOptional()
  @IsDateString()
  birth_date?: string | null;
}
