import { IsEmail, IsString } from 'class-validator';
import type { LoginRequest } from '@felino/shared';

export class LoginDto implements LoginRequest {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
