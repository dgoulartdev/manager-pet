import { IsString, Matches, MinLength } from 'class-validator';
import type { ChangePasswordRequest } from '@felino/shared';

export class ChangePasswordDto implements ChangePasswordRequest {
  @IsString()
  current_password!: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'A senha deve ter pelo menos 1 letra e 1 número',
  })
  new_password!: string;
}
