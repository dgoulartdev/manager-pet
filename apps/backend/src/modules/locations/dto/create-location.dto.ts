import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { CreateLocationRequest } from '@felino/shared';

export class CreateLocationDto implements CreateLocationRequest {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;
}
