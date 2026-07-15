import { IsEmail } from 'class-validator';
import type { ForgotPasswordRequest } from '@felino/shared';

export class ForgotPasswordDto implements ForgotPasswordRequest {
  @IsEmail()
  email!: string;
}
