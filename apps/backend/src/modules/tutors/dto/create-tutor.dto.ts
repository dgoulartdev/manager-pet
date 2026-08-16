import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { CreateTutorRequest } from '@meupaciente/shared';

export class CreateTutorDto implements CreateTutorRequest {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @IsOptional()
  @IsEmail()
  email?: string | null;
}
