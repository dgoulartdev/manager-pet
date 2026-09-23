import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Sex, type CreatePatientRequest } from '@meupaciente/shared';
import { IsOptionalNotNull } from '../../../common/decorators/is-optional-not-null.decorator';

export class CreatePatientDto implements CreatePatientRequest {
  @IsUUID()
  tutor_id!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  species?: string | null;

  @IsOptionalNotNull()
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
