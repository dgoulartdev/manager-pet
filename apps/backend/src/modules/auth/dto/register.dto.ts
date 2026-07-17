import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import type { RegisterRequest } from '@felino/shared';
import { NormalizeEmail } from '../../../common/decorators/normalize-email.decorator';

export class RegisterDto implements RegisterRequest {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @NormalizeEmail()
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'A senha deve ter pelo menos 1 letra e 1 número',
  })
  password!: string;
}
