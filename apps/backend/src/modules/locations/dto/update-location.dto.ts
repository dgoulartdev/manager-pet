import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { UpdateLocationRequest } from '@felino/shared';

export class UpdateLocationDto implements UpdateLocationRequest {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;
}
