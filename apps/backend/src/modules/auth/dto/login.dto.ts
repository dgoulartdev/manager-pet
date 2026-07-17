import { IsEmail, IsString } from 'class-validator';
import type { LoginRequest } from '@felino/shared';
import { NormalizeEmail } from '../../../common/decorators/normalize-email.decorator';

export class LoginDto implements LoginRequest {
  @NormalizeEmail()
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
