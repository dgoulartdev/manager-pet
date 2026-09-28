import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { UpdateLocationRequest } from '@meupaciente/shared';
import { IsOptionalNotNull } from '../../../common/decorators/is-optional-not-null.decorator';

export class UpdateLocationDto implements UpdateLocationRequest {
  @IsOptionalNotNull()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;
}
