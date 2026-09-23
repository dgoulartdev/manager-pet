import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Sex, type UpdatePatientRequest } from '@meupaciente/shared';
import { IsOptionalNotNull } from '../../../common/decorators/is-optional-not-null.decorator';

export class UpdatePatientDto implements UpdatePatientRequest {
  @IsOptionalNotNull()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

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
