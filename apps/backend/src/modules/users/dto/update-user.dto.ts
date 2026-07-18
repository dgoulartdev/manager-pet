import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { UpdateUserRequest } from '@felino/shared';
import { NormalizeEmail } from '../../../common/decorators/normalize-email.decorator';

export class UpdateUserDto implements UpdateUserRequest {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @NormalizeEmail()
  @IsEmail()
  email?: string;
}
