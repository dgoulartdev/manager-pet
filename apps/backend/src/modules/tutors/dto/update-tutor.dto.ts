import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { UpdateTutorRequest } from '@meupaciente/shared';
import { IsOptionalNotNull } from '../../../common/decorators/is-optional-not-null.decorator';

export class UpdateTutorDto implements UpdateTutorRequest {
  @IsOptionalNotNull()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @IsOptional()
  @IsEmail()
  email?: string | null;
}
