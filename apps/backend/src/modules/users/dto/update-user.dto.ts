import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import type { UpdateUserRequest } from '@meupaciente/shared';
import { NormalizeEmail } from '../../../common/decorators/normalize-email.decorator';
import { IsOptionalNotNull } from '../../../common/decorators/is-optional-not-null.decorator';

export class UpdateUserDto implements UpdateUserRequest {
  @IsOptionalNotNull()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptionalNotNull()
  @NormalizeEmail()
  @IsEmail()
  email?: string;

  // Só é exigida (no service) quando o e-mail muda de fato.
  @IsOptionalNotNull()
  @IsString()
  current_password?: string;
}
