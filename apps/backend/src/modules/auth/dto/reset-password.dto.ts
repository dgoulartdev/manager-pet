import { IsString, Matches, MinLength } from 'class-validator';
import type { ResetPasswordRequest } from '@felino/shared';

export class ResetPasswordDto implements ResetPasswordRequest {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'A senha deve ter pelo menos 1 letra e 1 número',
  })
  new_password!: string;
}
