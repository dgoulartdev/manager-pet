import { IsEmail } from 'class-validator';
import type { ForgotPasswordRequest } from '@felino/shared';
import { NormalizeEmail } from '../../../common/decorators/normalize-email.decorator';

export class ForgotPasswordDto implements ForgotPasswordRequest {
  @NormalizeEmail()
  @IsEmail()
  email!: string;
}
